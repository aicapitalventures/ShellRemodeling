import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight, requireUser } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireUser(req);
    const body = await req.json();
    const conceptId = String(body.concept_id || "");
    if (!conceptId) return json(req, 400, { error: "INVALID_REQUEST" });

    const { data: concept, error } = await service.from("remodel_concepts")
      .select("id,project_id,ordinal,concept_direction,status,model,quality,image_size,result_asset_id")
      .eq("id", conceptId).eq("owner_user_id", userId).maybeSingle();
    if (error) throw error;
    if (!concept) return json(req, 404, { error: "NOT_FOUND" });
    if (concept.status !== "completed" || !concept.result_asset_id) return json(req, 409, { error: "RESULT_NOT_READY" });

    const { data: asset, error: assetError } = await service.from("remodel_assets")
      .select("bucket,object_path,mime_type,size_bytes,sha256,validation_status")
      .eq("id", concept.result_asset_id).eq("owner_user_id", userId).eq("kind", "concept").maybeSingle();
    if (assetError) throw assetError;
    if (!asset || asset.validation_status !== "ready") return json(req, 409, { error: "RESULT_NOT_READY" });

    const configured = Number(Deno.env.get("BR02_RESULT_URL_TTL_SECONDS") || "60");
    const ttl = Math.min(300, Math.max(30, Number.isFinite(configured) ? configured : 60));
    const { data: signed, error: signedError } = await service.storage.from(asset.bucket).createSignedUrl(asset.object_path, ttl);
    if (signedError || !signed?.signedUrl) throw signedError || new Error("SIGNED_RESULT_FAILED");

    return json(req, 200, {
      concept: {
        id: concept.id, project_id: concept.project_id, ordinal: concept.ordinal,
        direction: concept.concept_direction, status: concept.status, model: concept.model,
        quality: concept.quality, image_size: concept.image_size,
      },
      result: { signed_url: signed.signedUrl, expires_in_seconds: ttl, mime_type: asset.mime_type, size_bytes: asset.size_bytes, sha256: asset.sha256 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    return json(req, 500, { error: "RESULT_RETRIEVAL_FAILED" });
  }
});
