import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.0.0";
import { json, serviceClient, sha256Hex } from "../_shared/core.ts";

const HANDLED = new Set([
  "checkout.session.completed", "checkout.session.expired",
  "charge.refunded", "charge.dispute.created",
]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });
  const enabled = Deno.env.get("STRIPE_TEST_MODE_ENABLED") === "true";
  const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const signature = req.headers.get("Stripe-Signature") || "";
  if (!enabled || !secret.startsWith("sk_test_") || !webhookSecret.startsWith("whsec_") || !signature) {
    return json(req, 401, { error: "NOT_AUTHORIZED" });
  }

  const raw = await req.text();
  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, signature, webhookSecret, undefined, Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return json(req, 400, { error: "INVALID_SIGNATURE" });
  }
  if (event.livemode || !HANDLED.has(event.type)) return json(req, 200, { received: true, handled: false });

  const service = serviceClient();
  const payloadHash = await sha256Hex(raw);
  await service.from("payment_events").upsert({
    stripe_event_id: event.id, event_type: event.type, livemode: false,
    payload_sha256: payloadHash, processing_status: "received",
  }, { onConflict: "stripe_event_id", ignoreDuplicates: true });

  const { data: claimed } = await service.from("payment_events")
    .update({ processing_status: "processing", attempts: 1 })
    .eq("stripe_event_id", event.id).in("processing_status", ["received", "failed"])
    .select("stripe_event_id").maybeSingle();
  if (!claimed) return json(req, 200, { received: true, duplicate: true });

  try {
    let order: any = null;
    if (event.type.startsWith("checkout.session.")) {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = String(session.metadata?.order_id || "");
      const { data } = await service.from("payment_orders").select("*").eq("id", orderId).maybeSingle();
      order = data;
      if (!order || order.mode !== "test" || order.purpose !== "studio_pass" ||
          session.livemode || session.mode !== "payment" || session.currency !== order.currency ||
          session.amount_total !== order.amount_cents) throw new Error("EVENT_MISMATCH");

      if (event.type === "checkout.session.completed") {
        if (session.payment_status !== "paid") throw new Error("PAYMENT_NOT_PAID");
        await service.from("payment_orders").update({
          status: "paid", stripe_payment_intent_id: String(session.payment_intent || "") || null,
          paid_at: new Date().toISOString(),
        }).eq("id", order.id);
        await service.from("studio_entitlements").upsert({
          owner_user_id: order.owner_user_id, project_id: order.project_id,
          order_id: order.id, allowance: order.allowance, status: "active",
        }, { onConflict: "order_id" });
      } else {
        await service.from("payment_orders").update({ status: "canceled" }).eq("id", order.id).neq("status", "paid");
      }
    } else {
      const charge = event.data.object as Stripe.Charge;
      const intentId = String(charge.payment_intent || "");
      const { data } = await service.from("payment_orders").select("*").eq("stripe_payment_intent_id", intentId).maybeSingle();
      order = data;
      if (!order || order.mode !== "test") throw new Error("ORDER_NOT_FOUND");
      const status = event.type === "charge.refunded" ? "refunded" : "disputed";
      await service.from("payment_orders").update({ status }).eq("id", order.id);
      await service.from("studio_entitlements").update({ status }).eq("order_id", order.id);
    }
    await service.from("payment_events").update({
      order_id: order?.id || null, processing_status: "processed", normalized_code: null,
      processed_at: new Date().toISOString(),
    }).eq("stripe_event_id", event.id);
    return json(req, 200, { received: true, processed: true });
  } catch {
    await service.from("payment_events").update({
      processing_status: "failed", normalized_code: "EVENT_PROCESSING_FAILED",
    }).eq("stripe_event_id", event.id);
    return json(req, 500, { error: "EVENT_PROCESSING_FAILED" });
  }
});
