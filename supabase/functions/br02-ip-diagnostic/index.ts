import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hmacIpHash } from "../_shared/core.ts";

function jsonHeaders(): Headers {
  return new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: jsonHeaders() });
  }

  const cfConnectingIpPresent = Boolean(req.headers.get("cf-connecting-ip"));
  const xForwardedForPresent = Boolean(req.headers.get("x-forwarded-for"));
  const saltAvailable = Boolean(Deno.env.get("BR02_IP_HASH_SALT"));
  const ipHashPresent = Boolean(await hmacIpHash(req));

  return new Response(JSON.stringify({
    cf_connecting_ip_present: cfConnectingIpPresent,
    x_forwarded_for_present: xForwardedForPresent,
    salt_available: saltAvailable,
    ip_hash_present: ipHashPresent,
  }), { status: 200, headers: jsonHeaders() });
});
