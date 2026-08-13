import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ALLOWED_MIME, assertProjectOwner, extensionForMime, json, MAX_UPLOAD_BYTES, preflight, requireUser, SOURCE_BUCKET } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireUser(req);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    const mimeType = String(body.mime_type || "").toLowerCase();
    const declaredSize = Number(body.size_bytes || 0);
    if (!projectId || !ALLOWED_MIME.has(mimeType) || !Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > MAX_UPLOAD_BYTES) {
      return json(req, 400, { error: "INVALID_UPLOAD" });
    }
    await assertProjectOwner(service, projectId, userId);

    const assetId = crypto.randomUUID();
    const ext = extensionForMime(mimeType);
    const objectPath = `${userId}/${projectId}/source/${assetId}.${ext}`;
    const { error: insertError } = await service.from("remodel_assets").insert({
      id: assetId,
      project_id: projectId,
      owner_user_id: userId,
      kind: "source",
      bucket: SOURCE_BUCKET,
      object_path: objectPath,
      mime_type: mimeType,
      size_bytes: declaredSize,
      validation_status: "pending",
    });
    if (insertError) throw insertError;

    const { data, error } = await service.storage.from(SOURCE_BUCKET).createSignedUploadUrl(objectPath, { upsert: false });
    if (error || !data) {
      await service.from("remodel_assets").delete().eq("id", assetId);
      throw error || new Error("SIGNED_UPLOAD_FAILED");
    }

    await service.from("audit_events").insert({
      subject_project_id: projectId, owner_user_id: userId, event_type: "source_upload_authorized",
      metadata: { asset_id: assetId, mime_type: mimeType, declared_size_bytes: declaredSize },
    });

    return json(req, 200, {
      asset_id: assetId,
      bucket: SOURCE_BUCKET,
      path: data.path || objectPath,
      token: data.token,
      signed_url: data.signedUrl,
      max_bytes: MAX_UPLOAD_BYTES,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    if (message === "NOT_FOUND") return json(req, 404, { error: "NOT_FOUND" });
    return json(req, 500, { error: "UPLOAD_AUTHORIZATION_FAILED" });
  }
});
