import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertProjectOwner, json, preflight, requireUser } from "../_shared/core.ts";

const PURPOSE = "studio_pass";

function enabledConfig() {
  const enabled = Deno.env.get("STRIPE_TEST_MODE_ENABLED") === "true";
  const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const priceId = Deno.env.get("STRIPE_STUDIO_PRICE_ID") || "";
  const amount = Number(Deno.env.get("STRIPE_STUDIO_AMOUNT_CENTS") || "0");
  const allowance = Number(Deno.env.get("STRIPE_STUDIO_ALLOWANCE") || "0");
  if (!enabled || !secret.startsWith("sk_test_") || !priceId.startsWith("price_") ||
      !Number.isInteger(amount) || amount <= 0 || !Number.isInteger(allowance) || allowance < 1 || allowance > 20) {
    throw new Error("PAYMENT_DISABLED");
  }
  return { secret, priceId, amount, allowance };
}

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const config = enabledConfig();
    const { userId, service } = await requireUser(req);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    const clientRequestId = String(body.client_request_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(projectId) || !/^[0-9a-f-]{36}$/i.test(clientRequestId)) {
      return json(req, 400, { error: "INVALID_REQUEST" });
    }
    await assertProjectOwner(service, projectId, userId);

    const { data: entitlement } = await service.from("studio_entitlements")
      .select("id,status,allowance,used").eq("project_id", projectId)
      .in("status", ["active", "exhausted"]).maybeSingle();
    if (entitlement) return json(req, 409, { error: "ENTITLEMENT_EXISTS" });

    const { data: existing } = await service.from("payment_orders")
      .select("id,status,checkout_url,stripe_checkout_session_id")
      .eq("owner_user_id", userId).eq("client_request_id", clientRequestId).maybeSingle();
    if (existing?.checkout_url && existing?.stripe_checkout_session_id) {
      return json(req, 200, { order_id: existing.id, status: existing.status, checkout_url: existing.checkout_url });
    }

    const orderId = existing?.id || crypto.randomUUID();
    if (!existing) {
      const { error: orderError } = await service.from("payment_orders").insert({
        id: orderId, owner_user_id: userId, project_id: projectId, purpose: PURPOSE,
        amount_cents: config.amount, allowance: config.allowance,
        client_request_id: clientRequestId, stripe_price_id: config.priceId,
      });
      if (orderError) throw orderError;
    }

    const origin = (Deno.env.get("STRIPE_CHECKOUT_ORIGIN") || "https://shellremodeling.com").replace(/\/$/, "");
    if (origin !== "https://shellremodeling.com") throw new Error("PAYMENT_DISABLED");
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/?studio_payment=success&session_id={CHECKOUT_SESSION_ID}#studio`);
    params.set("cancel_url", `${origin}/?studio_payment=canceled#studio`);
    params.set("line_items[0][price]", config.priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[order_id]", orderId);
    params.set("metadata[purpose]", PURPOSE);
    params.set("metadata[project_id]", projectId);
    params.set("payment_intent_data[metadata][order_id]", orderId);
    params.set("payment_intent_data[metadata][purpose]", PURPOSE);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `shell-studio-${orderId}`,
      },
      body: params,
    });
    const session = await stripeResponse.json().catch(() => ({}));
    if (!stripeResponse.ok || session?.livemode !== false || session?.mode !== "payment" || !session?.id || !session?.url) {
      await service.from("payment_orders").update({ status: "failed" }).eq("id", orderId);
      return json(req, 502, { error: "PAYMENT_PROVIDER_FAILED" });
    }
    const { error: updateError } = await service.from("payment_orders").update({
      status: "checkout_created", stripe_checkout_session_id: session.id, checkout_url: session.url,
    }).eq("id", orderId).eq("owner_user_id", userId);
    if (updateError) throw updateError;
    return json(req, 201, { order_id: orderId, status: "checkout_created", checkout_url: session.url });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PAYMENT_DISABLED") return json(req, 503, { error: "PAYMENT_DISABLED" });
    if (code === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    if (code === "NOT_FOUND") return json(req, 404, { error: "NOT_FOUND" });
    return json(req, 500, { error: "PAYMENT_FAILED" });
  }
});
