import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertStaff, json, preflight, requireVerifiedUser, sanitizeText } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireVerifiedUser(req);
    await assertStaff(service, userId, ["admin"]);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    const stage = String(body.stage || "");
    const allowance = Number(body.allowance);
    if (!projectId || !["planning", "active_project"].includes(stage) || !Number.isInteger(allowance)) {
      return json(req, 400, { error: "INVALID_REQUEST" });
    }
    const { data, error } = await service.rpc("br03_grant_studio_access", {
      p_project_id: projectId,
      p_staff_user_id: userId,
      p_stage: stage,
      p_allowance: allowance,
      p_reason_code: sanitizeText(body.reason_code, 240) || null,
    }).single();
    if (error) throw error;
    if (!data?.grant_id) return json(req, 403, { error: data?.error_code || "STAFF_NOT_AUTHORIZED" });
    return json(req, 201, { grant_id: data.grant_id, stage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (["NOT_AUTHORIZED", "VERIFIED_EMAIL_REQUIRED", "EMAIL_REQUIRED_FOR_STUDIO", "STAFF_NOT_AUTHORIZED"].includes(message)) {
      return json(req, 401, { error: message });
    }
    return json(req, 500, { error: "STUDIO_ACCESS_GRANT_FAILED" });
  }
});
