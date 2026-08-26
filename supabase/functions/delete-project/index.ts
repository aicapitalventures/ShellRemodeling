import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertProjectOwner, json, preflight, requireVerifiedUser } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireVerifiedUser(req);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    if (!projectId) return json(req, 400, { error: "INVALID_REQUEST" });
    await assertProjectOwner(service, projectId, userId);

    const { data: assets, error: assetsError } = await service.from("remodel_assets")
      .select("bucket,object_path").eq("project_id", projectId).eq("owner_user_id", userId);
    if (assetsError) throw assetsError;

    const byBucket = new Map<string, string[]>();
    for (const asset of assets || []) {
      const list = byBucket.get(asset.bucket) || [];
      list.push(asset.object_path);
      byBucket.set(asset.bucket, list);
    }
    for (const [bucket, paths] of byBucket) {
      if (!paths.length) continue;
      const { error: removeError } = await service.storage.from(bucket).remove(paths);
      if (removeError) return json(req, 503, { error: "DELETE_STORAGE_FAILED" });
    }

    // Remove detailed lifecycle events before retaining only the minimal tombstone.
    await service.from("audit_events").delete().eq("subject_project_id", projectId);
    const { error: deleteError } = await service.from("remodel_projects")
      .delete().eq("id", projectId).eq("owner_user_id", userId);
    if (deleteError) throw deleteError;

    await service.from("audit_events").insert({
      subject_project_id: projectId,
      owner_user_id: null,
      event_type: "project_deleted_tombstone",
      metadata: { deletion_mode: "owner_request", retention_class: "minimal_non_pii_12_month_max" },
    });

    return json(req, 200, { project_id: projectId, status: "deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    if (message === "NOT_FOUND") return json(req, 404, { error: "NOT_FOUND" });
    return json(req, 500, { error: "DELETE_PROJECT_FAILED" });
  }
});
