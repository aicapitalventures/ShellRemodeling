import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hmacIpHash, json, normalizedError, preflight, requireUser, RESULT_BUCKET, sha256Hex } from "../_shared/core.ts";
import { compileRemodelPrompt } from "../_shared/prompt.ts";

const MAX_CONCEPTS = 4;
const USER_DAILY_LIMIT = 8;
const IP_HOURLY_LIMIT = 3;
const MODEL = "gpt-image-2";
const QUALITY = "medium";
const IMAGE_SIZE = "1536x1024";
const TOTAL_OPENAI_DEADLINE_MS = 120_000;
const RESERVED_COST = Number(Deno.env.get("BR02_RESERVED_COST_PER_CALL_USD") || "0.08");
const MONTHLY_BUDGET = Number(Deno.env.get("BR02_MONTHLY_BUDGET_USD") || "20");

function sinceIso(ms: number) { return new Date(Date.now() - ms).toISOString(); }
function monthStartIso() { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); }
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function sourceName(mime: string) { return mime === "image/png" ? "source.png" : mime === "image/webp" ? "source.webp" : "source.jpg"; }

async function callOpenAI(apiKey: string, source: Blob, sourceMime: string, prompt: string) {
  const deadlineAt = Date.now() + TOTAL_OPENAI_DEADLINE_MS;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 1500) throw new Error("GENERATION_TIMEOUT");

    const form = new FormData();
    form.append("model", MODEL);
    form.append("image", source, sourceName(sourceMime));
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("size", IMAGE_SIZE);
    form.append("quality", QUALITY);
    form.append("output_format", "webp");
    form.append("output_compression", "85");
    form.append("moderation", "auto");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: controller.signal,
      });
      lastStatus = response.status;
      const requestId = response.headers.get("x-request-id");
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return { payload, requestId };

      const upstreamCode = String(payload?.error?.code || "");
      if (upstreamCode === "moderation_blocked") throw new Error("MODERATION_BLOCKED");
      const transient = response.status === 429 || response.status >= 500;
      if (transient && attempt < 2) {
        const delay = 500 * (2 ** attempt) + Math.floor(Math.random() * 250);
        if (Date.now() + delay + 1500 < deadlineAt) { await sleep(delay); continue; }
        throw new Error("GENERATION_TIMEOUT");
      }
      throw new Error("GENERATION_FAILED");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw new Error("GENERATION_TIMEOUT");
      if (err instanceof Error && ["MODERATION_BLOCKED", "GENERATION_TIMEOUT", "GENERATION_FAILED"].includes(err.message)) throw err;
      const transient = lastStatus === 429 || lastStatus >= 500;
      if (transient && attempt < 2) {
        const delay = 500 * (2 ** attempt) + Math.floor(Math.random() * 250);
        if (Date.now() + delay + 1500 < deadlineAt) { await sleep(delay); continue; }
      }
      throw new Error("GENERATION_FAILED");
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("GENERATION_FAILED");
}

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  let conceptId: string | null = null;
  let projectId: string | null = null;
  let userId: string | null = null;
  let service: any = null;
  try {
    const auth = await requireUser(req); userId = auth.userId; service = auth.service;
    const enabled = Deno.env.get("BR02_OPENAI_ENABLED") === "true";
    const killSwitch = Deno.env.get("BR02_KILL_SWITCH") !== "false";
    if (!enabled || killSwitch) return json(req, 503, { error: "GENERATION_DISABLED" });
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json(req, 503, { error: "GENERATION_DISABLED" });

    const body = await req.json();
    projectId = String(body.project_id || "");
    const sourceAssetId = String(body.source_asset_id || "");
    const ordinal = Number(body.ordinal || 0);
    const conceptDirection = String(body.concept_direction || "").trim().slice(0, 160);
    if (!projectId || !sourceAssetId || !Number.isInteger(ordinal) || ordinal < 1 || ordinal > 4 || !conceptDirection) {
      return json(req, 400, { error: "INVALID_REQUEST" });
    }

    const { data: project, error: projectError } = await service.from("remodel_projects")
      .select("id,owner_user_id,project_type,planning_budget,timing,property_status,source_truth,preserve_items,change_items,must_have_items,design_direction,vision_notes,accessibility_requirements")
      .eq("id", projectId).eq("owner_user_id", userId).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return json(req, 404, { error: "NOT_FOUND" });

    const { data: sourceAsset, error: sourceError } = await service.from("remodel_assets")
      .select("id,bucket,object_path,mime_type,validation_status")
      .eq("id", sourceAssetId).eq("project_id", projectId).eq("owner_user_id", userId).eq("kind", "source").maybeSingle();
    if (sourceError) throw sourceError;
    if (!sourceAsset) return json(req, 404, { error: "NOT_FOUND" });
    if (sourceAsset.validation_status !== "ready") return json(req, 409, { error: "UPLOAD_NOT_READY" });

    const { count: conceptCount, error: countError } = await service.from("remodel_concepts")
      .select("id", { count: "exact", head: true }).eq("project_id", projectId);
    if (countError) throw countError;
    if ((conceptCount || 0) >= MAX_CONCEPTS) return json(req, 429, { error: "RATE_LIMITED" });

    const ipHash = await hmacIpHash(req);
    const { count: userAttempts, error: userRateError } = await service.from("generation_events")
      .select("id", { count: "exact", head: true }).eq("owner_user_id", userId).eq("event_type", "attempt").gte("created_at", sinceIso(24 * 60 * 60 * 1000));
    if (userRateError) throw userRateError;
    if ((userAttempts || 0) >= USER_DAILY_LIMIT) return json(req, 429, { error: "RATE_LIMITED" });
    if (ipHash) {
      const { count: ipAttempts, error: ipRateError } = await service.from("generation_events")
        .select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("event_type", "attempt").gte("created_at", sinceIso(60 * 60 * 1000));
      if (ipRateError) throw ipRateError;
      if ((ipAttempts || 0) >= IP_HOURLY_LIMIT) return json(req, 429, { error: "RATE_LIMITED" });
    }

    const { data: monthRows, error: monthError } = await service.from("generation_events")
      .select("reserved_cost_usd").eq("event_type", "attempt").gte("created_at", monthStartIso());
    if (monthError) throw monthError;
    const reservedMonth = (monthRows || []).reduce((sum: number, row: any) => sum + Number(row.reserved_cost_usd || 0), 0);
    if (reservedMonth + RESERVED_COST > MONTHLY_BUDGET) return json(req, 402, { error: "BUDGET_LIMIT_REACHED" });

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

    conceptId = crypto.randomUUID();
    const { error: conceptError } = await service.from("remodel_concepts").insert({
      id: conceptId, project_id: projectId, owner_user_id: userId, source_asset_id: sourceAssetId,
      ordinal, concept_direction: conceptDirection, model: MODEL, quality: QUALITY, image_size: IMAGE_SIZE,
      prompt_version: compiled.version, prompt_hash: compiled.hash, status: "generating",
    });
    if (conceptError) throw conceptError;

    await service.from("generation_events").insert({
      project_id: projectId, owner_user_id: userId, concept_id: conceptId, ip_hash: ipHash,
      event_type: "attempt", reserved_cost_usd: RESERVED_COST,
    });

    const { data: sourceBlob, error: downloadError } = await service.storage.from(sourceAsset.bucket).download(sourceAsset.object_path);
    if (downloadError || !sourceBlob) throw new Error("UPLOAD_NOT_READY");

    const { payload, requestId } = await callOpenAI(apiKey, sourceBlob, sourceAsset.mime_type, compiled.prompt);
    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64 || typeof b64 !== "string") throw new Error("GENERATION_FAILED");
    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const digest = await sha256Hex(binary);
    const resultAssetId = crypto.randomUUID();
    const resultPath = `${userId}/${projectId}/concept/${resultAssetId}.webp`;
    const { error: uploadError } = await service.storage.from(RESULT_BUCKET).upload(resultPath, binary, {
      contentType: "image/webp", upsert: false, cacheControl: "0",
    });
    if (uploadError) throw uploadError;

    const { error: assetInsertError } = await service.from("remodel_assets").insert({
      id: resultAssetId, project_id: projectId, owner_user_id: userId, kind: "concept", bucket: RESULT_BUCKET,
      object_path: resultPath, mime_type: "image/webp", size_bytes: binary.byteLength, sha256: digest, validation_status: "ready",
    });
    if (assetInsertError) {
      await service.storage.from(RESULT_BUCKET).remove([resultPath]);
      throw assetInsertError;
    }

    await service.from("remodel_concepts").update({
      result_asset_id: resultAssetId, openai_request_id: requestId, status: "completed", error_code: null,
    }).eq("id", conceptId);
    await service.from("remodel_projects").update({
      status: "concepts_ready",
      retention_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", projectId);
    await service.from("generation_events").insert({
      project_id: projectId, owner_user_id: userId, concept_id: conceptId, ip_hash: ipHash,
      event_type: "completed", normalized_code: null, reserved_cost_usd: 0,
    });
    await service.from("audit_events").insert({
      subject_project_id: projectId, owner_user_id: userId, event_type: "concept_generated",
      metadata: { concept_id: conceptId, ordinal, model: MODEL, quality: QUALITY, image_size: IMAGE_SIZE, prompt_version: compiled.version, prompt_hash: compiled.hash },
    });

    return json(req, 201, { concept_id: conceptId, ordinal, status: "completed", result_asset_id: resultAssetId, model: MODEL, quality: QUALITY, image_size: IMAGE_SIZE });
  } catch (err) {
    const code = normalizedError(err);
    if (service && conceptId) {
      await service.from("remodel_concepts").update({ status: code === "MODERATION_BLOCKED" ? "blocked" : "failed", error_code: code }).eq("id", conceptId);
      await service.from("generation_events").insert({
        project_id: projectId, owner_user_id: userId, concept_id: conceptId,
        event_type: code === "MODERATION_BLOCKED" ? "blocked" : "failed", normalized_code: code, reserved_cost_usd: 0,
      });
    }
    const status = code === "NOT_AUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "RATE_LIMITED" ? 429 : code === "BUDGET_LIMIT_REACHED" ? 402 : code === "MODERATION_BLOCKED" ? 400 : code === "GENERATION_TIMEOUT" ? 504 : code === "UPLOAD_NOT_READY" ? 409 : 500;
    return json(req, status, { error: code });
  }
});
