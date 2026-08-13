import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const SOURCE_BUCKET = Deno.env.get("BR02_SOURCE_BUCKET") || "remodel-source-private";
export const RESULT_BUCKET = Deno.env.get("BR02_RESULT_BUCKET") || "remodel-results-private";
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function corsHeaders(req: Request): Record<string, string> {
  const requestedOrigin = req.headers.get("origin") || "";
  const configured = (Deno.env.get("BR02_ALLOWED_ORIGIN") || "https://aicapitalventures.github.io")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const origin = configured.includes(requestedOrigin) ? requestedOrigin : configured[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  return null;
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SERVER_CONFIG_MISSING");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser(req: Request): Promise<{ userId: string; service: SupabaseClient }> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) throw new Error("NOT_AUTHORIZED");
  const token = auth.slice(7).trim();
  const url = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !publishable) throw new Error("SERVER_CONFIG_MISSING");
  const caller = createClient(url, publishable, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.auth.getUser(token);
  if (error || !data.user) throw new Error("NOT_AUTHORIZED");
  return { userId: data.user.id, service: serviceClient() };
}

export async function assertProjectOwner(service: SupabaseClient, projectId: string, userId: string) {
  const { data, error } = await service
    .from("remodel_projects")
    .select("id,owner_user_id,status,retention_expires_at")
    .eq("id", projectId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("NOT_FOUND");
  return data;
}

export function sanitizeText(value: unknown, max = 2000): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function stringArray(value: unknown, maxItems = 20, maxChars = 120): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((v) => sanitizeText(v, maxChars))
    .filter(Boolean);
}

export async function sha256Hex(input: ArrayBuffer | Uint8Array | string): Promise<string> {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input instanceof Uint8Array
      ? input
      : new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacIpHash(req: Request): Promise<string | null> {
  const raw = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "")
    .split(",")[0]
    .trim();
  const salt = Deno.env.get("BR02_IP_HASH_SALT") || "";
  if (!raw || !salt) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  throw new Error("INVALID_UPLOAD");
}

export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

export function normalizedError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || "");
  const allowed = new Set([
    "INVALID_UPLOAD", "UPLOAD_NOT_READY", "GENERATION_DISABLED", "RATE_LIMITED",
    "BUDGET_LIMIT_REACHED", "MODERATION_BLOCKED", "GENERATION_TIMEOUT",
    "GENERATION_FAILED", "NOT_AUTHORIZED", "NOT_FOUND", "SERVER_CONFIG_MISSING",
  ]);
  return allowed.has(msg) ? msg : "GENERATION_FAILED";
}
