import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertStaff, json, preflight, requireVerifiedUser, sanitizeText } from "../_shared/core.ts";

const REVIEW_STATUSES = new Set(["green", "yellow", "red"]);

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, service } = await requireVerifiedUser(req);
    await assertStaff(service, userId, ["reviewer", "admin"]);

    const body = await req.json();
    const conceptId = String(body.concept_id || "");
    const status = String(body.status || "").toLowerCase();
    const notes = sanitizeText(body.notes, 3000);
    if (!conceptId || !REVIEW_STATUSES.has(status)) return json(req, 400, { error: "INVALID_REQUEST" });

    const { data: concept, error: conceptError } = await service.from("remodel_concepts")
      .select("id,project_id,status").eq("id", conceptId).maybeSingle();
    if (conceptError) throw conceptError;
    if (!concept || concept.status !== "completed") return json(req, 404, { error: "NOT_FOUND" });

    const { data: review, error } = await service.from("buildability_reviews").upsert({
      project_id: concept.project_id,
      concept_id: concept.id,
      reviewer_user_id: userId,
      status,
      notes,
    }, { onConflict: "concept_id" }).select("id,project_id,concept_id,status,notes,updated_at").single();
    if (error) throw error;
    await service.from("remodel_projects").update({ status: "reviewed" }).eq("id", concept.project_id);
    await service.from("audit_events").insert({
      subject_project_id: concept.project_id,
      owner_user_id: null,
      event_type: "human_buildability_reviewed",
      metadata: { concept_id: concept.id, review_id: review.id, status },
    });

    return json(req, 200, {
      review,
      meaning: status === "green"
        ? "appears feasible pending field verification"
        : status === "yellow"
          ? "measurement / trade / code verification needed"
          : "likely impractical / not recommended as rendered",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    return json(req, 500, { error: "REVIEW_FAILED" });
  }
});
