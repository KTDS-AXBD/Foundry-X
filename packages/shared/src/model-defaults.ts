/**
 * Central Claude model ID constants.
 * Undated aliases auto-route to the latest version within the family.
 * Update HERE when upgrading model generations.
 *
 * @example
 *   // Direct Anthropic API
 *   new MetaAgent({ model: MODEL_SONNET });
 *   // OpenRouter
 *   fetch(url, { body: { model: OR_MODEL_HAIKU } });
 */

// ── Direct Anthropic API ──────────────────────────────────────
export const MODEL_SONNET = "claude-sonnet-4-6" as const;
export const MODEL_HAIKU = "claude-haiku-4-5" as const;

// ── OpenRouter-prefixed ───────────────────────────────────────
export const OR_MODEL_SONNET = `anthropic/${MODEL_SONNET}` as const;
export const OR_MODEL_HAIKU = `anthropic/${MODEL_HAIKU}` as const;
