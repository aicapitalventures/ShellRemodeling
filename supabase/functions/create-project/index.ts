import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight, requireUser, sanitizeText, stringArray } from "../_shared/core.ts";

const BUDGETS = new Set(["Under $5,000", "$5,000–$10,000", "$10,000–$20,000", "$20,000–$35,000", "$35,000+", "Not sure yet"]);

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireUser(req);
    const body = await req.json();
    const projectType = sanitizeText(body.project_type, 120);
    if (!projectType) return json(req, 400, { error: "INVALID_PROJECT" });
    const planningBudget = BUDGETS.has(body.planning_budget) ? body.planning_budget : "Not sure yet";

    const record = {
      owner_user_id: userId,
      project_type: projectType,
      planning_budget: planningBudget,
      timing: sanitizeText(body.timing, 120) || null,
      property_status: sanitizeText(body.property_status, 120) || null,
      source_truth: sanitizeText(body.source_truth, 2000),
      preserve_items: stringArray(body.preserve_items),
      change_items: stringArray(body.change_items),
      must_have_items: stringArray(body.must_have_items),
      design_direction: sanitizeText(body.design_direction, 120) || "Clean Modern",
      vision_notes: sanitizeText(body.vision_notes, 2000),
      accessibility_requirements: sanitizeText(body.accessibility_requirements, 1000),
      status: "draft",
    };

    const { data, error } = await service.from("remodel_projects")
      .insert(record).select("id,status,retention_expires_at,created_at").single();
    if (error) throw error;
    await service.from("audit_events").insert({
      subject_project_id: data.id, owner_user_id: userId, event_type: "project_created",
      metadata: { proof_mode: true },
    });
    return json(req, 201, { project: data });
  } catch (err) {
    const code = err instanceof Error && err.message === "NOT_AUTHORIZED" ? "NOT_AUTHORIZED" : "CREATE_PROJECT_FAILED";
    return json(req, code === "NOT_AUTHORIZED" ? 401 : 500, { error: code });
  }
});
