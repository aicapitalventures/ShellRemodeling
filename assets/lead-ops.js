const CONFIG = Object.freeze({ url: "https://mlxboidajkqyayxjdcvh.supabase.co", key: "sb_publishable_fA2sw0bUz0DipHRI07y1bA_gbLEwz5L" });
const state = { session: null, leads: [], filter: "needs_contact" };
const $ = (selector) => document.querySelector(selector);

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem("shellco_studio_auth") || "null");
    if (saved?.access_token && saved?.user?.id && saved?.user?.email_confirmed_at) state.session = saved;
  } catch {
    localStorage.removeItem("shellco_studio_auth");
  }
}

function saveSession() { localStorage.setItem("shellco_studio_auth", JSON.stringify(state.session)); }
function setAuthStatus(text, error = false) { const element = $("#leadAuthStatus"); element.textContent = text; element.className = error ? "auth-status error" : "auth-status"; }
function setStatus(text, error = false) { const element = $("#queueStatus"); element.textContent = text; element.className = error ? "notice error" : "notice"; }

async function auth(email, code) {
  const endpoint = code ? "/auth/v1/verify" : "/auth/v1/otp";
  const body = code ? { email, token: code, type: "email" } : { email, create_user: true };
  const response = await fetch(CONFIG.url + endpoint, { method: "POST", headers: { apikey: CONFIG.key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (code && !data.access_token)) throw new Error(data.error_code || "VERIFIED_EMAIL_REQUIRED");
  if (code) { state.session = data; saveSession(); }
}

async function api(body) {
  const response = await fetch(`${CONFIG.url}/functions/v1/lead-operations`, {
    method: "POST",
    headers: { apikey: CONFIG.key, Authorization: `Bearer ${state.session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "REQUEST_FAILED");
  return data;
}

function display(value, fallback = "Not provided") { return value || fallback; }
function dateTime(value) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not provided"; }
function age(value) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function sla(lead) { const due = new Date(lead.first_response_due_at).getTime(); const contacted = lead.operations.first_contact_at; if (contacted) return { text: "First response logged", type: "met" }; const remaining = Math.ceil((due - Date.now()) / 60000); return remaining > 0 ? { text: `${remaining} min remaining`, type: "pending" } : { text: `${Math.abs(remaining)} min overdue`, type: "overdue" }; }
function localDateTimeValue(value) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const pad = (number) => String(number).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function dateTimeToIso(value) { return value ? new Date(value).toISOString() : null; }

function matchesFilter(lead) {
  const operations = lead.operations;
  if (state.filter === "needs_contact") return !operations.first_contact_at && lead.inquiry.status !== "closed";
  if (state.filter === "qualified") return operations.qualification_status === "qualified";
  if (state.filter === "site_review") return operations.site_review_status !== "not_needed";
  if (state.filter === "estimate") return operations.estimate_status !== "not_started";
  return lead.inquiry.status === "closed" || operations.qualification_status === "unqualified";
}

function option(value, label, selected) { const element = document.createElement("option"); element.value = value; element.textContent = label; element.selected = value === selected; return element; }
function selectControl(options, selected) { const element = document.createElement("select"); options.forEach(([value, label]) => element.append(option(value, label, selected))); return element; }
function labeled(label, control) { const wrapper = document.createElement("label"); wrapper.textContent = label; wrapper.append(control); return wrapper; }
function button(text) { const element = document.createElement("button"); element.type = "button"; element.className = "button outline-button"; element.textContent = text; return element; }

function facts(entries) {
  const list = document.createElement("dl"); list.className = "lead-facts";
  entries.forEach(([term, detail]) => { const dt = document.createElement("dt"); dt.textContent = term; const dd = document.createElement("dd"); dd.textContent = display(detail); list.append(dt, dd); });
  return list;
}

function section(title, content) { const element = document.createElement("section"); element.className = "operation-section"; const heading = document.createElement("h3"); heading.textContent = title; element.append(heading, content); return element; }

function actionHandler(lead, action, getBody) {
  return async () => {
    try {
      await api({ action, inquiry_id: lead.inquiry.id, ...getBody() });
      setStatus("Lead operations updated.");
      await loadQueue();
    } catch (error) {
      setStatus(error.message === "NOT_AUTHORIZED" ? "This account is not authorized for lead operations." : "The update could not be saved.", true);
    }
  };
}

function renderLead(lead) {
  const operations = lead.operations;
  const card = document.createElement("article"); card.className = "lead-card";
  const top = document.createElement("div"); top.className = "lead-top";
  const title = document.createElement("div"); const heading = document.createElement("h2"); heading.textContent = lead.inquiry.name; const received = document.createElement("p"); received.textContent = `Received ${dateTime(lead.inquiry.created_at)} (${age(lead.inquiry.created_at)} ago)`; title.append(heading, received);
  const slaState = sla(lead); const badge = document.createElement("span"); badge.className = `sla ${slaState.type}`; badge.textContent = slaState.text; top.append(title, badge); card.append(top);
  card.append(facts([["Phone", lead.inquiry.phone], ["Email", lead.inquiry.email], ["ZIP", lead.inquiry.project_zip], ["Project", lead.inquiry.project_type], ["Budget", lead.inquiry.planning_budget], ["Timing", lead.inquiry.desired_timing], ["Property", lead.inquiry.property_status], ["Inquiry status", lead.inquiry.status]]));
  const message = document.createElement("p"); message.className = "project-message"; message.textContent = lead.inquiry.project_message || "No additional project details provided."; card.append(message);
  const attribution = document.createElement("details"); attribution.className = "attribution"; const summary = document.createElement("summary"); summary.textContent = "Lead attribution"; attribution.append(summary, facts([["Source", lead.attribution.utm_source || lead.attribution.source], ["Medium", lead.attribution.utm_medium], ["Campaign", lead.attribution.utm_campaign], ["GCLID", lead.attribution.gclid || "Not provided"], ["Landing page", lead.attribution.landing_page]])); card.append(attribution);

  const owner = selectControl([["", "Unassigned"], ["bernard", "Bernard"], ["elijah", "Elijah"]], operations.lead_owner || ""); owner.options[0].disabled = true; const ownerSave = button("Save owner"); ownerSave.addEventListener("click", () => { if (!owner.value) { setStatus("Choose Bernard or Elijah before saving an owner.", true); return; } actionHandler(lead, "assign", () => ({ lead_owner: owner.value }))(); }); const ownerControls = document.createElement("div"); ownerControls.className = "control-row"; ownerControls.append(labeled("Lead owner", owner), ownerSave); card.append(section("Ownership", ownerControls));
  const method = selectControl([["phone", "Phone"], ["text", "Text"], ["email", "Email"]], operations.last_contact_method || "phone"); const outcome = selectControl([["connected", "Connected"], ["no_response", "No response"]], operations.contact_status === "connected" ? "connected" : "no_response"); const contactSave = button("Log contact attempt"); contactSave.addEventListener("click", actionHandler(lead, "contact_attempt", () => ({ method: method.value, outcome: outcome.value }))); const contactControls = document.createElement("div"); contactControls.className = "control-row"; contactControls.append(labeled("Method", method), labeled("Outcome", outcome), contactSave); card.append(section(`Contact attempts: ${operations.contact_attempt_count}`, contactControls));
  const qualification = selectControl([["pending", "Pending"], ["qualified", "Qualified"], ["unqualified", "Unqualified"]], operations.qualification_status); const reason = document.createElement("input"); reason.maxLength = 500; reason.value = operations.disposition_reason || ""; reason.placeholder = "Required when unqualified"; const qualifySave = button("Save qualification"); qualifySave.addEventListener("click", () => { if (qualification.value === "pending") { setStatus("Choose Qualified or Unqualified before saving.", true); return; } if (qualification.value === "unqualified" && !reason.value.trim()) { setStatus("An unqualified lead requires a disposition reason.", true); return; } actionHandler(lead, "qualify", () => ({ result: qualification.value, reason: reason.value }))(); }); const qualificationControls = document.createElement("div"); qualificationControls.className = "control-row"; qualificationControls.append(labeled("Qualification", qualification), labeled("Disposition reason", reason), qualifySave); card.append(section("Qualification", qualificationControls));
  const siteStatus = selectControl([["not_needed", "Not started"], ["recommended", "Recommended"], ["scheduled", "Scheduled"], ["completed", "Completed"], ["declined", "Declined"]], operations.site_review_status); const scheduledAt = document.createElement("input"); scheduledAt.type = "datetime-local"; scheduledAt.value = localDateTimeValue(operations.site_review_at); const siteSave = button("Save site review"); siteSave.addEventListener("click", () => { if (siteStatus.value === "not_needed") { setStatus("Choose a site review status before saving.", true); return; } actionHandler(lead, "site_review", () => ({ status: siteStatus.value, scheduled_at: dateTimeToIso(scheduledAt.value) }))(); }); const siteControls = document.createElement("div"); siteControls.className = "control-row"; siteControls.append(labeled("Site review", siteStatus), labeled("Scheduled for", scheduledAt), siteSave); card.append(section("Site review", siteControls));
  const estimateStatus = selectControl([["not_started", "Not started"], ["preparing", "Preparing"], ["sent", "Sent"], ["accepted", "Accepted"], ["declined", "Declined"]], operations.estimate_status); const followUp = document.createElement("input"); followUp.type = "datetime-local"; followUp.value = localDateTimeValue(operations.estimate_follow_up_at); const estimateSave = button("Save estimate"); estimateSave.addEventListener("click", () => { if (estimateStatus.value === "not_started") { setStatus("Choose an estimate status before saving.", true); return; } actionHandler(lead, "estimate", () => ({ status: estimateStatus.value, follow_up_at: dateTimeToIso(followUp.value) }))(); }); const estimateControls = document.createElement("div"); estimateControls.className = "control-row"; estimateControls.append(labeled("Estimate", estimateStatus), labeled("Follow up", followUp), estimateSave); card.append(section("Estimate", estimateControls));
  const notes = document.createElement("textarea"); notes.rows = 3; notes.maxLength = 4000; notes.value = operations.notes || ""; const noteSave = button("Save private note"); noteSave.addEventListener("click", actionHandler(lead, "note", () => ({ notes: notes.value }))); const noteControls = document.createElement("div"); noteControls.className = "notes-row"; noteControls.append(labeled("Private operations notes", notes), noteSave); card.append(section("Notes", noteControls));
  return card;
}

function renderQueue() {
  const queue = $("#leadQueue"); queue.replaceChildren(); const visible = state.leads.filter(matchesFilter);
  if (!visible.length) { const empty = document.createElement("p"); empty.className = "empty-queue"; empty.textContent = "No leads match this queue view."; queue.append(empty); return; }
  visible.forEach((lead) => queue.append(renderLead(lead)));
}

async function loadQueue() {
  setStatus("Loading private lead operations...");
  try { const data = await api({ action: "list" }); state.leads = data.leads || []; renderQueue(); setStatus(`${state.leads.length} recent lead${state.leads.length === 1 ? "" : "s"} loaded.`); }
  catch (error) { setStatus(error.message === "NOT_AUTHORIZED" ? "This account is not authorized for lead operations." : "The private lead queue is unavailable.", true); }
}

$("#leadAuthForm").addEventListener("submit", async (event) => { event.preventDefault(); try { await auth($("#leadEmail").value.trim().toLowerCase()); $("#leadAuthForm").hidden = true; $("#leadVerifyForm").hidden = false; $("#leadCode").focus(); setAuthStatus("Check your inbox for a one-time verification code."); } catch { setAuthStatus("Verification could not be started. Use your approved staff email.", true); } });
$("#leadVerifyForm").addEventListener("submit", async (event) => { event.preventDefault(); try { await auth($("#leadEmail").value.trim().toLowerCase(), $("#leadCode").value.trim()); openDashboard(); } catch { setAuthStatus("That code could not be verified.", true); } });
$("#changeLeadEmail").addEventListener("click", () => { $("#leadAuthForm").hidden = false; $("#leadVerifyForm").hidden = true; });
$("#leadSignOut").addEventListener("click", () => { localStorage.removeItem("shellco_studio_auth"); location.reload(); });
$("#refreshLeads").addEventListener("click", loadQueue);
document.querySelectorAll("[data-filter]").forEach((filter) => filter.addEventListener("click", () => { state.filter = filter.dataset.filter; document.querySelectorAll("[data-filter]").forEach((buttonElement) => buttonElement.classList.toggle("active", buttonElement === filter)); renderQueue(); }));
function openDashboard() { $("#leadEntry").hidden = true; $("#leadDashboard").hidden = false; $("#leadSignOut").hidden = false; loadQueue(); }
loadSession(); if (state.session) openDashboard();