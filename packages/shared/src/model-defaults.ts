/**
 * Central Claude model ID constants — **Single Source of Truth (SSOT)**.
 *
 * Anthropic Direct API는 undated alias(`claude-sonnet`, `claude-haiku`)를
 * 지원하지 않고 구체 family 버전(`claude-sonnet-4-6`)이 필요하다.
 * 따라서 이 파일이 프로젝트 전체 SDK 호출의 SSOT 역할을 한다.
 *
 * ## 업그레이드 절차 (Anthropic이 새 minor release 공표 시)
 * 1. 이 파일의 버전 번호 1곳만 수정 (예: `claude-sonnet-4-6` → `claude-sonnet-4-7`)
 * 2. `pnpm typecheck` — import consumer 전파 확인
 * 3. `/ax:daily-check` "모델 버전 drift" 항목 통과 확인
 * 4. `.claude/MEMORY.md`의 "모델 업그레이드 절차" feedback 참조
 *
 * ## CLI 경로 (별도 관리)
 * Claude Code CLI는 `--model sonnet` alias 지원 → CLI 스크립트는
 * `sonnet`/`opus`/`haiku` alias 사용으로 자동 현행화.
 *
 * ## 소비자 목록 (grep으로 감지; 추가 시 이 주석 갱신)
 * - `packages/api/src/services/llm.ts`
 * - `packages/api/src/core/agent/specs/*.agent.yaml`
 * - `packages/gate-x/src/services/llm/providers/anthropic.ts`
 * - `packages/fx-shaping/src/agent/services/{model-router,openrouter-runner}.ts`
 *   (OpenRouter 경로 — `OR_MODEL_*` 사용)
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
