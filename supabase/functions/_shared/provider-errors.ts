export type ProviderFailureCode =
  | "MODERATION_BLOCKED"
  | "GENERATION_TIMEOUT"
  | "GENERATION_FAILED";

export function normalizeProviderFailure(status: number, upstreamCode: string): ProviderFailureCode {
  if (upstreamCode === "moderation_blocked") return "MODERATION_BLOCKED";
  if (status === 408 || status === 504) return "GENERATION_TIMEOUT";
  return "GENERATION_FAILED";
}
