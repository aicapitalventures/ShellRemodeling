import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hmacIpHash, json, normalizedError, preflight, requireVerifiedUser, RESULT_BUCKET, sha256Hex } from "../_shared/core.ts";
import { compileRemodelPrompt } from "../_shared/prompt.ts";
import { normalizeProviderFailure } from "../_shared/provider-errors.ts";

const MODEL = "gpt-image-2";
const QUALITY = "medium";
const IMAGE_SIZE = "1536x1024";
const TOTAL_OPENAI_DEADLINE_MS = 120_000;
const RESERVED_COST = Number(Deno.env.get("BR02_RESERVED_COST_PER_CALL_USD") || "0.08");
const MONTHLY_BUDGET = Number(Deno.env.get("BR02_MONTHLY_BUDGET_USD") || "20");
const GENERATION_ENABLED = Deno.env.get("BR03_STUDIO_GENERATION_ENABLED") === "true";
const KILL_SWITCH_OPEN = Deno.env.get("BR03_STUDIO_KILL_SWITCH") === "false";
const FOUNDER_REVIEW_EMAILS = new Set(["elijah@shellremodeling.com", "bernard@shellremodeling.com"]);

function logStage(stage: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event: "generate_concept_stage", stage, ...extra }));
}
function sourceName(mime: string) { return mime === "image/png" ? "source.png" : mime === "image/webp" ? "source.webp" : "source.jpg"; }

async function callOpenAI(apiKey: string, source: Blob, sourceMime: string, prompt: string) {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("image[]", source, sourceName(sourceMime));
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", IMAGE_SIZE);
  form.append("quality", QUALITY);
  form.append("output_format", "webp");
  form.append("output_compression", "85");
  form.append("moderation", "auto");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOTAL_OPENAI_DEADLINE_MS);
  try {
    logStage("provider_start");
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const requestId = response.headers.get("x-request-id");
    const payload = await response.json().catch(() => ({}));
    const upstreamCode = String(payload?.error?.code || "");
    logStage("provider_response", { status: response.status, upstream_code: upstreamCode || null, request_id_present: Boolean(requestId) });
    if (response.ok) return { payload, requestId };
    throw new Error(normalizeProviderFailure(response.status, upstreamCode));
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new Error("GENERATION_TIMEOUT");
    if (err instanceof Error && ["MODERATION_BLOCKED", "GENERATION_TIMEOUT", "GENERATION_FAILED"].includes(err.message)) throw err;
    throw new Error("GENERATION_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });

  let conceptId: string | null = null;
  let projectId: string | null = null;
  let userId: string | null = null;
  let service: any = null;
  let resultPath: string | null = null;
  let resultAssetId: string | null = null;
  let founderReview = false;

  try {
    const auth = await requireVerifiedUser(req);
    userId = auth.userId;
    service = auth.service;
    founderReview = FOUNDER_REVIEW_EMAILS.has(auth.email);
    logStage("authenticated", { founder_review: founderReview });

    if ((!GENERATION_ENABLED || !KILL_SWITCH_OPEN) && !founderReview) {
      return json(req, 503, { error: "GENERATION_DISABLED" });
    }
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      logStage("missing_openai_key", { founder_review: founderReview });
      return json(req, 503, { error: "GENERATION_DISABLED" });
    }

    const body = await req.json();
    projectId = String(body.project_id || "");
    let sourceAssetId = String(body.source_asset_id || "");
    const accessStage = String(body.access_stage || "");
    const conceptDirection = String(body.concept_direction || "").trim().slice(0, 160);

    if (!projectId || !["pre_contract", "active_project"].includes(accessStage) || !conceptDirection || (!sourceAssetId && !founderReview)) {
      logStage("invalid_request", {
        has_project: Boolean(projectId),
        has_source: Boolean(sourceAssetId),
        access_stage: accessStage || null,
        has_direction: Boolean(conceptDirection),
        founder_review: founderReview,
      });
      return json(req, 400, { error: "INVALID_REQUEST" });
    }
    logStage("request_validated", { founder_review: founderReview, access_stage: accessStage, source_supplied: Boolean(sourceAssetId) });

    const { data: project, error: projectError } = await service.from("remodel_projects")
      .select("id,owner_user_id,project_type,planning_budget,timing,property_status,source_truth,preserve_items,change_items,must_have_items,design_direction,vision_notes,accessibility_requirements")
      .eq("id", projectId).eq("owner_user_id", userId).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return json(req, 404, { error: "NOT_FOUND" });

    let sourceAsset: any = null;
    if (sourceAssetId) {
      const { data, error } = await service.from("remodel_assets")
        .select("id,bucket,object_path,mime_type,validation_status")
        .eq("id", sourceAssetId).eq("project_id", projectId).eq("owner_user_id", userId).eq("kind", "source").maybeSingle();
      if (error) throw error;
      sourceAsset = data;
    } else if (founderReview) {
      const { data, error } = await service.from("remodel_assets")
        .select("id,bucket,object_path,mime_type,validation_status")
        .eq("project_id", projectId)
        .eq("owner_user_id", userId)
        .eq("kind", "source")
        .eq("validation_status", "ready")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      sourceAsset = data;
      sourceAssetId = data?.id || "";
      logStage("source_recovered", { founder_review: true, recovered: Boolean(sourceAssetId) });
    }

    if (!sourceAsset) return json(req, 404, { error: "NOT_FOUND" });
    if (sourceAsset.validation_status !== "ready") return json(req, 409, { error: "UPLOAD_NOT_READY" });
    logStage("source_ready", { founder_review: founderReview });

    const ipHash = await hmacIpHash(req);
    logStage("ip_hash_checked", { founder_review: founderReview, ip_hash_present: Boolean(ipHash) });
    if (!ipHash && !founderReview) return json(req, 503, { error: "GENERATION_DISABLED" });

    const compiled = await compileRemodelPrompt({
      projectType: project.project_type,
      sourceTruth: project.source_truth,
      preserve: project.preserve_items,
      change: project.change_items,
      mustHave: project.must_have_items,
      designDirection: project.design_direction,
      visionNotes: project.vision_notes,
      accessibilityRequirements: project.accessibility_requirements,
      conceptDirection,
    });
    logStage("prompt_compiled", { founder_review: founderReview });

    const { data: reservation, error: reservationError } = await service.rpc("br03_reserve_generation", {
      p_project_id: projectId,
      p_owner_user_id: userId,
      p_source_asset_id: sourceAssetId,
      p_access_stage: accessStage,
      p_concept_direction: conceptDirection,
      p_model: MODEL,
      p_quality: QUALITY,
      p_image_size: IMAGE_SIZE,
      p_prompt_version: compiled.version,
      p_prompt_hash: compiled.hash,
      p_ip_hash: ipHash,
      p_reserved_cost: RESERVED_COST,
      p_monthly_budget: MONTHLY_BUDGET,
    }).single();
    if (reservationError) throw reservationError;
    if (!reservation?.concept_id) throw new Error(String(reservation?.error_code || "GENERATION_FAILED"));
    conceptId = reservation.concept_id;
    logStage("reserved", { founder_review: founderReview, credit_source: reservation.credit_source || null });

    const { data: sourceBlob, error: downloadError } = await service.storage.from(sourceAsset.bucket).download(sourceAsset.object_path);
    if (downloadError || !sourceBlob) throw new Error("UPLOAD_NOT_READY");
    logStage("source_downloaded", { founder_review: founderReview });

    const { payload, requestId } = await callOpenAI(apiKey, sourceBlob, sourceAsset.mime_type, compiled.prompt);
    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64 || typeof b64 !== "string") throw new Error("GENERATION_FAILED");

    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const digest = await sha256Hex(binary);
    resultAssetId = crypto.randomUUID();
    resultPath = `${userId}/${projectId}/concept/${resultAssetId}.webp`;

    const { error: uploadError } = await service.storage.from(RESULT_BUCKET).upload(resultPath, binary, {
      contentType: "image/webp", upsert: false, cacheControl: "0",
    });
    if (uploadError) throw uploadError;

    const { error: assetInsertError } = await service.from("remodel_assets").insert({
      id: resultAssetId,
      project_id: projectId,
      owner_user_id: userId,
      kind: "concept",
      bucket: RESULT_BUCKET,
      object_path: resultPath,
      mime_type: "image/webp",
      size_bytes: binary.byteLength,
      sha256: digest,
      validation_status: "ready",
    });
    if (assetInsertError) {
      await service.storage.from(RESULT_BUCKET).remove([resultPath]);
      throw assetInsertError;
    }

    const { data: settled, error: settlementError } = await service.rpc("br03_finalize_generation_success", {
      p_concept_id: conceptId,
      p_result_asset_id: resultAssetId,
      p_openai_request_id: requestId,
    }).single();
    if (settlementError || settled?.status !== "completed") {
      throw new Error(String(settled?.error_code || "GENERATION_FAILED"));
    }

    logStage("completed", { founder_review: founderReview });
    return json(req, 201, {
      concept_id: conceptId,
      ordinal: reservation.ordinal,
      access_stage: reservation.access_stage,
      status: "completed",
      result_asset_id: resultAssetId,
      model: MODEL,
      quality: QUALITY,
      image_size: IMAGE_SIZE,
      founder_review: founderReview,
    });
  } catch (err) {
    const code = normalizedError(err);
    logStage("failed", { founder_review: founderReview, code, concept_reserved: Boolean(conceptId) });
    if (service && conceptId) {
      await service.rpc("br03_finalize_generation_failure", { p_concept_id: conceptId, p_error_code: code });
      if (resultPath) await service.storage.from(RESULT_BUCKET).remove([resultPath]);
      if (resultAssetId) await service.from("remodel_assets").delete().eq("id", resultAssetId).eq("owner_user_id", userId);
    }
    const status = code === "NOT_AUTHORIZED" || code === "VERIFIED_EMAIL_REQUIRED" || code === "EMAIL_REQUIRED_FOR_STUDIO" ? 401
      : code === "NOT_FOUND" ? 404
      : code === "RATE_LIMITED" ? 429
      : code === "BUDGET_LIMIT_REACHED" ? 402
      : code === "MODERATION_BLOCKED" ? 400
      : code === "GENERATION_TIMEOUT" ? 504
      : code === "UPLOAD_NOT_READY" ? 409
      : code === "GENERATION_DISABLED" ? 503
      : 500;
    return json(req, status, { error: code });
  }
});