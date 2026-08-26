import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight, requireVerifiedUser, sanitizeText, sha256Hex, stringArray } from "../_shared/core.ts";

const BUDGETS = new Set(["Under $5,000", "$5,000–$10,000", "$10,000–$20,000", "$20,000–$35,000", "$35,000+", "Not sure yet"]);

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const { userId, email, service } = await requireVerifiedUser(req);
    const body = await req.json();
    const unlockToken = typeof body.studio_unlock_token === "string" ? body.studio_unlock_token.trim() : "";
    if (!unlockToken) return json(req, 400, { error: "NOT_AUTHORIZED" });
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
      business_stage: "studio_unlocked",
      status: "draft",
    };

    const { data, error } = await service.from("remodel_projects")
      .insert(record).select("id,status,business_stage,retention_expires_at,created_at").single();
    if (error) throw error;
    const tokenHash = await sha256Hex(unlockToken);
    const { data: claim, error: claimError } = await service.rpc("br03_claim_inquiry_studio_access", {
      p_token_hash: tokenHash,
      p_project_id: data.id,
      p_owner_user_id: userId,
      p_verified_normalized_email: email,
    }).single();
    if (claimError || !claim?.entitlement_id) {
      await service.from("remodel_projects").delete().eq("id", data.id).eq("owner_user_id", userId);
      throw new Error(String(claim?.error_code || "NOT_AUTHORIZED"));
    }
    await service.from("audit_events").insert({
      subject_project_id: data.id, owner_user_id: userId, event_type: "project_created",
      metadata: { claim_method: "verified_inquiry" },
    });
    return json(req, 201, { project: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const code = ["NOT_AUTHORIZED", "VERIFIED_EMAIL_REQUIRED", "EMAIL_REQUIRED_FOR_STUDIO"].includes(message) ? message : "CREATE_PROJECT_FAILED";
    return json(req, code === "NOT_AUTHORIZED" || code === "VERIFIED_EMAIL_REQUIRED" || code === "EMAIL_REQUIRED_FOR_STUDIO" ? 401 : 500, { error: code });
  }
});
