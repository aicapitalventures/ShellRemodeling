import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertProjectOwner, json, preflight, requireUser } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireUser(req);
    const projectId = String((await req.json()).project_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return json(req, 400, { error: "INVALID_REQUEST" });
    await assertProjectOwner(service, projectId, userId);
    const { data, error } = await service.from("studio_entitlements")
      .select("status,allowance,used")
      .eq("project_id", projectId).eq("owner_user_id", userId)
      .in("status", ["active", "exhausted"]).maybeSingle();
    if (error) throw error;
    return json(req, 200, { entitled: data?.status === "active" && data.used < data.allowance, status: data?.status || "none", allowance: data?.allowance || 0, used: data?.used || 0 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return json(req, code === "NOT_AUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : 500, { error: code === "NOT_AUTHORIZED" || code === "NOT_FOUND" ? code : "ACCESS_CHECK_FAILED" });
  }
});
