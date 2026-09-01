import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertStaff, json, preflight, requireVerifiedUser, sanitizeText } from "../_shared/core.ts";

const LEAD_ROLES = ["reviewer", "admin"];
const LIST_LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNERS = new Set(["bernard", "elijah"]);
const METHODS = new Set(["phone", "text", "email"]);
const OUTCOMES = new Set(["connected", "no_response"]);
const QUALIFICATIONS = new Set(["qualified", "unqualified"]);
const SITE_REVIEWS = new Set(["recommended", "scheduled", "completed", "declined"]);
const ESTIMATES = new Set(["preparing", "sent", "accepted", "declined"]);

function validUuid(value: unknown): value is string { return typeof value === "string" && UUID.test(value); }
function dateValue(value: unknown): string | null { if (typeof value !== "string" || !value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function defaults() { return { lead_owner: null, contact_status: "not_attempted", contact_attempt_count: 0, first_contact_at: null, last_contact_at: null, last_contact_method: null, qualification_status: "pending", disposition_reason: null, site_review_status: "not_needed", site_review_at: null, estimate_status: "not_started", estimate_follow_up_at: null, notes: "", created_at: null, updated_at: null }; }

async function assertInquiry(service: ReturnType<typeof requireVerifiedUser> extends Promise<infer Result> ? Result["service"] : never, inquiryId: string) {
  const { data, error } = await service.from("public_project_inquiries").select("id,status").eq("id", inquiryId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("NOT_FOUND");
  return data;
}

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return json(req, 415, { error: "INVALID_REQUEST" });
  try {
    const { userId, service } = await requireVerifiedUser(req);
    await assertStaff(service, userId, LEAD_ROLES);
    const body = await req.json();
    if (body?.action === "list") {
      const { data: inquiries, error: inquiryError } = await service.from("public_project_inquiries").select("id,name,phone,email,project_zip,project_type,planning_budget,desired_timing,property_status,project_message,status,created_at,source,utm_source,utm_medium,utm_campaign,gclid,landing_page").not("status", "in", "(spam,deleted)").order("created_at", { ascending: false }).limit(LIST_LIMIT);
      if (inquiryError) throw inquiryError;
      const inquiryIds = (inquiries || []).map((inquiry) => inquiry.id);
      const { data: operations, error: operationsError } = inquiryIds.length ? await service.from("lead_operations").select("inquiry_id,lead_owner,contact_status,contact_attempt_count,first_contact_at,last_contact_at,last_contact_method,qualification_status,disposition_reason,site_review_status,site_review_at,estimate_status,estimate_follow_up_at,notes,created_at,updated_at").in("inquiry_id", inquiryIds) : { data: [], error: null };
      if (operationsError) throw operationsError;
      const byInquiry = new Map((operations || []).map((operation) => [operation.inquiry_id, operation]));
      const leads = (inquiries || []).map((inquiry) => ({ inquiry: { id: inquiry.id, name: inquiry.name, phone: inquiry.phone, email: inquiry.email, project_zip: inquiry.project_zip, project_type: inquiry.project_type, planning_budget: inquiry.planning_budget, desired_timing: inquiry.desired_timing, property_status: inquiry.property_status, project_message: inquiry.project_message, status: inquiry.status, created_at: inquiry.created_at }, attribution: { source: inquiry.source, utm_source: inquiry.utm_source, utm_medium: inquiry.utm_medium, utm_campaign: inquiry.utm_campaign, gclid: inquiry.gclid, landing_page: inquiry.landing_page }, operations: byInquiry.get(inquiry.id) || defaults(), first_response_due_at: new Date(new Date(inquiry.created_at).getTime() + 15 * 60_000).toISOString() }));
      return json(req, 200, { leads, count: leads.length });
    }
    if (!validUuid(body?.inquiry_id)) return json(req, 400, { error: "INVALID_REQUEST" });
    const inquiry = await assertInquiry(service, body.inquiry_id);
    if (body.action === "assign") {
      if (!OWNERS.has(body.lead_owner)) return json(req, 400, { error: "INVALID_REQUEST" });
      const { error } = await service.from("lead_operations").upsert({ inquiry_id: body.inquiry_id, lead_owner: body.lead_owner }, { onConflict: "inquiry_id" }); if (error) throw error;
    } else if (body.action === "contact_attempt") {
      if (!METHODS.has(body.method) || !OUTCOMES.has(body.outcome)) return json(req, 400, { error: "INVALID_REQUEST" });
      const { data: current, error: currentError } = await service.from("lead_operations").select("contact_attempt_count,first_contact_at").eq("inquiry_id", body.inquiry_id).maybeSingle(); if (currentError) throw currentError;
      const now = new Date().toISOString(); const { error } = await service.from("lead_operations").upsert({ inquiry_id: body.inquiry_id, contact_attempt_count: (current?.contact_attempt_count || 0) + 1, first_contact_at: current?.first_contact_at || now, last_contact_at: now, last_contact_method: body.method, contact_status: body.outcome }, { onConflict: "inquiry_id" }); if (error) throw error;
      if (inquiry.status === "new") { const { error: statusError } = await service.from("public_project_inquiries").update({ status: "contacted" }).eq("id", body.inquiry_id); if (statusError) throw statusError; }
    } else if (body.action === "qualify") {
      if (!QUALIFICATIONS.has(body.result)) return json(req, 400, { error: "INVALID_REQUEST" });
      const reason = sanitizeText(body.reason, 500); if (body.result === "unqualified" && !reason) return json(req, 400, { error: "INVALID_REQUEST" });
      const { error } = await service.from("lead_operations").upsert({ inquiry_id: body.inquiry_id, qualification_status: body.result, disposition_reason: reason || null }, { onConflict: "inquiry_id" }); if (error) throw error;
      const { error: statusError } = await service.from("public_project_inquiries").update({ status: body.result === "qualified" ? "qualified" : "closed" }).eq("id", body.inquiry_id); if (statusError) throw statusError;
    } else if (body.action === "site_review") {
      if (!SITE_REVIEWS.has(body.status) || (body.scheduled_at && !dateValue(body.scheduled_at))) return json(req, 400, { error: "INVALID_REQUEST" });
      const { error } = await service.from("lead_operations").upsert({ inquiry_id: body.inquiry_id, site_review_status: body.status, site_review_at: dateValue(body.scheduled_at) }, { onConflict: "inquiry_id" }); if (error) throw error;
    } else if (body.action === "estimate") {
      if (!ESTIMATES.has(body.status) || (body.follow_up_at && !dateValue(body.follow_up_at))) return json(req, 400, { error: "INVALID_REQUEST" });
      const { error } = await service.from("lead_operations").upsert({ inquiry_id: body.inquiry_id, estimate_status: body.status, estimate_follow_up_at: dateValue(body.follow_up_at) }, { onConflict: "inquiry_id" }); if (error) throw error;
    } else if (body.action === "note") {
      if (typeof body.notes !== "string" || body.notes.length > 4000) return json(req, 400, { error: "INVALID_REQUEST" });
      const { error } = await service.from("lead_operations").upsert({ inquiry_id: body.inquiry_id, notes: sanitizeText(body.notes, 4000) }, { onConflict: "inquiry_id" }); if (error) throw error;
    } else return json(req, 400, { error: "INVALID_REQUEST" });
    return json(req, 200, { updated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_AUTHORIZED" || message === "STAFF_NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    if (message === "NOT_FOUND") return json(req, 404, { error: "NOT_FOUND" });
    return json(req, 500, { error: "LEAD_OPERATIONS_FAILED" });
  }
});