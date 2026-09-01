import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hmacIpHash, json, preflight, sanitizeText, serviceClient, sha256Hex } from "../_shared/core.ts";

const ALLOWED_PROJECT_TYPES = new Set([
  "Full Bathroom Remodel", "Shower / Tub", "Accessibility Upgrade",
  "Bathroom Tile / Finish Work", "Tile Flooring Outside Bathroom",
  "Repair / Smaller Bathroom Project",
]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+().\-\s]{7,40}$/;
const ZIP = /^[0-9A-Za-z -]{3,12}$/;
const INQUIRY_NOTIFICATION_RECIPIENTS = [
  "bernard@shellremodeling.com",
  "elijah@shellremodeling.com",
] as const;
const INQUIRY_NOTIFICATION_FROM = "Shell & Co Remodeling <inquiries@shellremodeling.com>";

function allowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") || "";
  const configured = [
    ...(Deno.env.get("BR02_ALLOWED_ORIGIN") || "").split(","),
    "https://aicapitalventures.github.io",
    "https://shellremodeling.com",
    "https://www.shellremodeling.com",
  ].map((value) => value.trim()).filter(Boolean);
  return configured.includes(origin);
}

function display(value: string, fallback = "Not provided"): string {
  return value || fallback;
}

async function sendInquiryNotification(inquiry: {
  name: string;
  phone: string;
  email: string;
  projectZip: string;
  projectType: string;
  planningBudget: string;
  desiredTiming: string;
  propertyStatus: string;
  projectMessage: string;
  marketingConsent: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  gclid: string;
  landingPage: string;
}): Promise<string> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("RESEND_CONFIG_MISSING");

  const subject = `New Shell & Co Inquiry — ${inquiry.projectType} — ${inquiry.name}`;
  const text = [
    "NEW NONBINDING PROJECT INQUIRY",
    "Shell & Co Remodeling",
    "",
    `Name: ${inquiry.name}`,
    `Phone: ${inquiry.phone}`,
    `Email: ${display(inquiry.email)}`,
    `Project ZIP: ${inquiry.projectZip}`,
    `Project type: ${inquiry.projectType}`,
    `Planning budget: ${inquiry.planningBudget}`,
    `Desired timing: ${inquiry.desiredTiming}`,
    `Property status: ${display(inquiry.propertyStatus)}`,
    `Marketing consent: ${inquiry.marketingConsent ? "Yes" : "No"}`,
    "",
    "Project details:",
    display(inquiry.projectMessage),
    "",
    "LEAD ATTRIBUTION",
    `Source: ${display(inquiry.utmSource)}`,
    `Medium: ${display(inquiry.utmMedium)}`,
    `Campaign: ${display(inquiry.utmCampaign)}`,
    `Google Click ID: ${display(inquiry.gclid)}`,
    `Landing page: ${display(inquiry.landingPage)}`,
    "",
    "This is a nonbinding inquiry submitted through shellremodeling.com. Review the project details and follow up using the contact information above.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: INQUIRY_NOTIFICATION_FROM,
      to: [...INQUIRY_NOTIFICATION_RECIPIENTS],
      subject,
      text,
      ...(inquiry.email ? { reply_to: inquiry.email } : {}),
      tags: [
        { name: "source", value: "shellremodeling_com" },
        { name: "type", value: "project_inquiry" },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = typeof payload?.message === "string" ? payload.message : `HTTP ${response.status}`;
    throw new Error(`RESEND_SEND_FAILED: ${providerError}`);
  }
  if (typeof payload?.id !== "string" || !payload.id) throw new Error("RESEND_SEND_FAILED: missing email id");
  return payload.id;
}

Deno.serve(async (req: Request) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== "POST") return json(req, 405, { error: "INVALID_REQUEST" });
  if (!allowedOrigin(req)) return json(req, 403, { error: "NOT_AUTHORIZED" });
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return json(req, 415, { error: "INVALID_REQUEST" });
  }

  try {
    const body = await req.json();
    const name = sanitizeText(body.name, 120);
    const phone = sanitizeText(body.phone, 40);
    const email = sanitizeText(body.email, 254).toLowerCase();
    const projectZip = sanitizeText(body.zip, 12);
    const projectType = sanitizeText(body.project_type, 120);
    const planningBudget = sanitizeText(body.planning_budget, 80) || "Not sure yet";
    const desiredTiming = sanitizeText(body.timing, 80) || "Just planning";
    const propertyStatus = sanitizeText(body.property_status, 160);
    const projectMessage = sanitizeText(body.message, 2000);
    const honeypot = sanitizeText(body.website, 200);
    const startedAt = Number(body.started_at);
    const marketingConsent = body.marketing_consent === true;
    const utmSource = sanitizeText(body.utm_source, 120);
    const utmMedium = sanitizeText(body.utm_medium, 120);
    const utmCampaign = sanitizeText(body.utm_campaign, 120);
    const gclid = sanitizeText(body.gclid, 255);
    const landingPage = sanitizeText(body.landing_page, 2048);

    if (honeypot) return json(req, 202, { received: true });
    if (!name || !PHONE.test(phone) || (email && !EMAIL.test(email)) || !ZIP.test(projectZip)) {
      return json(req, 400, { error: "INVALID_REQUEST" });
    }
    if (!ALLOWED_PROJECT_TYPES.has(projectType) || body.contact_consent !== true) {
      return json(req, 400, { error: "INVALID_REQUEST" });
    }
    if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500 || Date.now() - startedAt > 86_400_000) {
      return json(req, 400, { error: "INVALID_REQUEST" });
    }

    const ipHash = await hmacIpHash(req);
    if (!ipHash) return json(req, 503, { error: "SERVER_CONFIG_MISSING" });
    const service = serviceClient();
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count: recentCount, error: countError } = await service
      .from("public_project_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);
    if (countError) throw countError;
    if ((recentCount || 0) >= 5) return json(req, 429, { error: "RATE_LIMITED" });

    const dedupeHash = await sha256Hex([
      name.toLowerCase(), phone.replace(/\D/g, ""), email, projectZip.toLowerCase(),
      projectType.toLowerCase(), projectMessage.toLowerCase(),
    ].join("|"));
    const tenMinutesAgo = new Date(Date.now() - 600_000).toISOString();
    const { count: duplicateCount, error: duplicateError } = await service
      .from("public_project_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("dedupe_hash", dedupeHash)
      .gte("created_at", tenMinutesAgo);
    if (duplicateError) throw duplicateError;
    if ((duplicateCount || 0) > 0) return json(req, 409, { error: "DUPLICATE_INQUIRY" });

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const studioUnlockToken = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const studioUnlockTokenHash = await sha256Hex(studioUnlockToken);
    const studioUnlockExpiresAt = new Date(Date.now() + 3_600_000).toISOString();
    const { error: insertError } = await service.from("public_project_inquiries").insert({
      name, phone, email, project_zip: projectZip, project_type: projectType,
      planning_budget: planningBudget, desired_timing: desiredTiming,
      property_status: propertyStatus, project_message: projectMessage,
      contact_consent: true, marketing_consent: marketingConsent,
      dedupe_hash: dedupeHash, ip_hash: ipHash,
      studio_unlock_token_hash: studioUnlockTokenHash,
      studio_unlock_expires_at: studioUnlockExpiresAt,
      user_agent: sanitizeText(req.headers.get("user-agent"), 300),
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      gclid: gclid || null,
      landing_page: landingPage || null,
    });
    if (insertError) throw insertError;

    let notificationSent = false;
    try {
      const providerEmailId = await sendInquiryNotification({
        name, phone, email, projectZip, projectType, planningBudget, desiredTiming,
        propertyStatus, projectMessage, marketingConsent,
        utmSource, utmMedium, utmCampaign, gclid, landingPage,
      });
      notificationSent = true;
      console.log("submit-inquiry notification sent", { provider: "resend", providerEmailId });
    } catch (notificationError) {
      console.error(
        "submit-inquiry notification failed",
        notificationError instanceof Error ? notificationError.message : String(notificationError),
      );
    }

    return json(req, 201, {
      received: true,
      notification_sent: notificationSent,
      studio_unlock_token: studioUnlockToken,
      studio_unlock_expires_at: studioUnlockExpiresAt,
    });
  } catch (error) {
    console.error("submit-inquiry failed", error instanceof Error ? error.message : String(error));
    return json(req, 500, { error: "INQUIRY_FAILED" });
  }
});
