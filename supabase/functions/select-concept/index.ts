import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight, requireUser } from "../_shared/core.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireUser(req);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    const conceptId = String(body.concept_id || "");
    if (!projectId || !conceptId) return json(req, 400, { error: "INVALID_REQUEST" });

    const { data: concept, error } = await service.from("remodel_concepts")
      .select("id,status,project_id").eq("id", conceptId).eq("project_id", projectId).eq("owner_user_id", userId).maybeSingle();
    if (error) throw error;
    if (!concept) return json(req, 404, { error: "NOT_FOUND" });
    if (concept.status !== "completed") return json(req, 409, { error: "RESULT_NOT_READY" });

    const { data: project, error: updateError } = await service.from("remodel_projects")
      .update({ selected_concept_id: conceptId, status: "selected" })
      .eq("id", projectId).eq("owner_user_id", userId)
      .select("id,selected_concept_id,status").single();
    if (updateError) throw updateError;
    await service.from("audit_events").insert({
      subject_project_id: projectId, owner_user_id: userId, event_type: "concept_selected",
      metadata: { concept_id: conceptId },
    });
    return json(req, 200, { project });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    return json(req, 500, { error: "CONCEPT_SELECTION_FAILED" });
  }
});
