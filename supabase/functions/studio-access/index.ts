import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight, requireVerifiedUser } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireVerifiedUser(req);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    if (!projectId) return json(req, 400, { error: "INVALID_REQUEST" });
    const { data, error } = await service.rpc("br03_get_access_snapshot", {
      p_project_id: projectId,
      p_owner_user_id: userId,
    });
    if (error) throw error;
    if (data?.error_code === "NOT_FOUND") return json(req, 404, { error: "NOT_FOUND" });
    return json(req, 200, { access: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (["NOT_AUTHORIZED", "VERIFIED_EMAIL_REQUIRED", "EMAIL_REQUIRED_FOR_STUDIO"].includes(message)) {
      return json(req, 401, { error: message });
    }
    return json(req, 500, { error: "ACCESS_SNAPSHOT_FAILED" });
  }
});
