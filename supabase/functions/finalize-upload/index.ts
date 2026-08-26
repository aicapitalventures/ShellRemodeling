import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { detectImageMime, json, MAX_UPLOAD_BYTES, preflight, requireVerifiedUser, sha256Hex } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireVerifiedUser(req);
    const body = await req.json();
    const assetId = String(body.asset_id || "");
    if (!assetId) return json(req, 400, { error: "INVALID_UPLOAD" });

    const { data: asset, error } = await service.from("remodel_assets")
      .select("id,project_id,owner_user_id,bucket,object_path,mime_type,validation_status")
      .eq("id", assetId).eq("owner_user_id", userId).eq("kind", "source").maybeSingle();
    if (error) throw error;
    if (!asset) return json(req, 404, { error: "NOT_FOUND" });
    if (asset.validation_status === "ready") return json(req, 200, { asset_id: asset.id, status: "ready" });

    const { data: blob, error: downloadError } = await service.storage.from(asset.bucket).download(asset.object_path);
    if (downloadError || !blob) return json(req, 409, { error: "UPLOAD_NOT_READY" });
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const detectedMime = detectImageMime(bytes);
    const valid = bytes.byteLength > 0 && bytes.byteLength <= MAX_UPLOAD_BYTES && detectedMime === asset.mime_type;

    if (!valid) {
      await service.storage.from(asset.bucket).remove([asset.object_path]);
      await service.from("remodel_assets").update({
        validation_status: "rejected",
        rejection_code: bytes.byteLength > MAX_UPLOAD_BYTES ? "SIZE_LIMIT" : "SIGNATURE_MISMATCH",
        size_bytes: bytes.byteLength,
      }).eq("id", asset.id);
      await service.from("audit_events").insert({
        subject_project_id: asset.project_id, owner_user_id: userId, event_type: "source_upload_rejected",
        metadata: { asset_id: asset.id, reason: bytes.byteLength > MAX_UPLOAD_BYTES ? "SIZE_LIMIT" : "SIGNATURE_MISMATCH" },
      });
      return json(req, 400, { error: "INVALID_UPLOAD" });
    }

    const digest = await sha256Hex(buffer);
    const { error: updateError } = await service.from("remodel_assets").update({
      validation_status: "ready", rejection_code: null, size_bytes: bytes.byteLength, sha256: digest,
    }).eq("id", asset.id);
    if (updateError) throw updateError;
    await service.from("remodel_projects").update({ status: "source_ready" }).eq("id", asset.project_id).eq("owner_user_id", userId);
    await service.from("audit_events").insert({
      subject_project_id: asset.project_id, owner_user_id: userId, event_type: "source_upload_validated",
      metadata: { asset_id: asset.id, mime_type: detectedMime, size_bytes: bytes.byteLength, sha256: digest },
    });

    return json(req, 200, { asset_id: asset.id, status: "ready", mime_type: detectedMime, size_bytes: bytes.byteLength, sha256: digest });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    return json(req, 500, { error: "UPLOAD_FINALIZE_FAILED" });
  }
});
