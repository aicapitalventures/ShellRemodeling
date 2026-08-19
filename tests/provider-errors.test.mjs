import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProviderFailure } from "../supabase/functions/_shared/provider-errors.ts";

test("moderation details normalize without exposing an upstream body", () => {
  assert.equal(normalizeProviderFailure(400, "moderation_blocked"), "MODERATION_BLOCKED");
});

test("provider timeouts normalize to a bounded public code", () => {
  assert.equal(normalizeProviderFailure(408, ""), "GENERATION_TIMEOUT");
  assert.equal(normalizeProviderFailure(504, "upstream_timeout_detail"), "GENERATION_TIMEOUT");
});

test("unknown provider failures collapse to the generic public code", () => {
  assert.equal(normalizeProviderFailure(429, "provider_rate_limit_detail"), "GENERATION_FAILED");
  assert.equal(normalizeProviderFailure(500, "secret_internal_detail"), "GENERATION_FAILED");
});
