import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight, serviceClient } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  const expected = Deno.env.get("BR02_CLEANUP_SECRET") || "";
  const supplied = req.headers.get("x-br02-cleanup-secret") || "";
  if (!expected || supplied !== expected) return json(req, 401, { error: "NOT_AUTHORIZED" });

  const service = serviceClient();
  const now = new Date().toISOString();
  const { data: projects, error } = await service.from("remodel_projects")
    .select("id").lt("retention_expires_at", now).neq("status", "deleted").limit(50);
  if (error) return json(req, 500, { error: "PURGE_QUERY_FAILED" });

  const results: Array<{ project_id: string; status: string }> = [];
  for (const project of projects || []) {
    try {
      const { data: assets, error: assetsError } = await service.from("remodel_assets")
        .select("bucket,object_path").eq("project_id", project.id);
      if (assetsError) throw assetsError;
      const grouped = new Map<string, string[]>();
      for (const asset of assets || []) {
        const paths = grouped.get(asset.bucket) || []; paths.push(asset.object_path); grouped.set(asset.bucket, paths);
      }
      for (const [bucket, paths] of grouped) {
        if (!paths.length) continue;
        const { error: removeError } = await service.storage.from(bucket).remove(paths);
        if (removeError) throw removeError;
      }
      await service.from("audit_events").delete().eq("subject_project_id", project.id);
      const { error: deleteError } = await service.from("remodel_projects").delete().eq("id", project.id);
      if (deleteError) throw deleteError;
      await service.from("audit_events").insert({
        subject_project_id: project.id,
        owner_user_id: null,
        event_type: "project_deleted_tombstone",
        metadata: { deletion_mode: "retention_expired", retention_class: "minimal_non_pii_12_month_max" },
      });
      results.push({ project_id: project.id, status: "deleted" });
    } catch {
      results.push({ project_id: project.id, status: "retry_required" });
    }
  }

  return json(req, 200, { processed: results.length, results });
});
