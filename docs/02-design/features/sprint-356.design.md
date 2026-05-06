---
code: FX-DESIGN-356
title: Sprint 356 — F624 Six Hats LLM 호출 정책 Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 356
f_item: F624
req: FX-REQ-689
priority: P2
---

# Sprint 356 — F624 Six Hats LLM 호출 정책 Design

## §1 목적

Six Hats 토론 sub-routine의 LLM 호출 시점·횟수·캐시 정책 명시.
`SixHatsLLMPolicy` 서비스를 별도 분리하여 책임을 명확히 한다.

## §2 의존성 검증

| 의존 | 파일 | 상태 |
|------|------|------|
| KVCacheService | `core/infra/kv-cache.ts` | ✅ MERGED (F596) |
| AuditBus | `core/infra/audit-bus.ts` | ✅ MERGED (F606) |
| sixhats-debate.ts | `core/shaping/services/sixhats-debate.ts` | ✅ F188 기존 |
| `Env.CACHE` | `src/env.ts` | ✅ `KVNamespace` 바인딩 존재 |
| `Env.AUDIT_HMAC_KEY` | `src/env.ts` | ✅ optional string |

## §3 구조 결정 (Stage 3 Exit: D1~D4)

### D1 주입 사이트 전수 검증

`SixHatsDebateService` 인스턴스화 위치 3곳:
- `core/discovery/routes/biz-items.ts` startDebate route → **policy 주입** (LLM 호출 경로)
- `core/discovery/routes/biz-items.ts` getDebate route → policy 미주입 (**의식적 결정**: read-only 조회, LLM 미호출)
- `core/discovery/routes/biz-items.ts` listDebates route → policy 미주입 (**의식적 결정**: 동일 이유)

> Gap 분석 역동기화 (2026-05-06): listDebates/getDebate는 LLM 미호출 경로라 policy 주입 불필요. 불필요한 KVCache/AuditBus 인스턴스화 방지.

### D2 식별자 계약

Cache key 포맷: `sixhats:llm:{sha256(prdId|hatColor|round|opinionPrefix64).slice(0,32)}`
- 생산자: `SixHatsLLMPolicy.buildCacheKey()` (async, Web Crypto sha256)
- 소비자: `kvCache.get()` / `kvCache.set()` — 동일 메서드, 동일 포맷

### D3 Breaking change 영향도

`SixHatsDebateService` 생성자에 optional 3번째 파라미터 추가:
```typescript
constructor(db: D1Database, env: {...}, policy?: SixHatsLLMPolicy)
```
- 기존 테스트(`sixhats-debate.test.ts`, `biz-items-sixhats.test.ts`) policy 미전달 → 기존 동작 유지
- 기존 `biz-items.ts` 3곳 변경 필요

### D4 TDD Red 파일

`packages/api/src/__tests__/sixhats-llm-policy.test.ts` — 3 test cases (cache miss / cache hit / recordCall)

## §4 파일 매핑 (§5 Worker 파일 매핑)

| # | 작업 | 파일 | 유형 |
|---|------|------|------|
| 1 | **신설** | `core/shaping/services/sixhats-llm-policy.ts` | Service |
| 2 | **수정** | `core/shaping/types.ts` | Re-export 추가 |
| 3 | **수정** | `core/shaping/services/sixhats-debate.ts` | Policy hook 통합 |
| 4 | **수정** | `core/discovery/routes/biz-items.ts` | 3곳 인스턴스화 갱신 |
| 5 | **신설** | `src/__tests__/sixhats-llm-policy.test.ts` | TDD Test |

## §5 sixhats-llm-policy.ts 인터페이스

```typescript
export interface SixHatsLLMCallContext {
  prdId: string;
  hatColor: "white" | "red" | "black" | "yellow" | "green" | "blue";
  round: number;
  opinionPrefix: string;  // user prompt 첫 64 chars
  orgId: string;
}

export interface CallStats {
  costEstimate: number;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
}

export class SixHatsLLMPolicy {
  constructor(kvCache: KVCacheService, auditBus: AuditBus)
  evaluateCall(ctx): Promise<{type:"cache_hit";cachedResponse:string} | {type:"llm_call_required";cacheKey:string}>
  recordCall(ctx, cacheKey, response, stats): Promise<void>
  buildCacheKey(ctx): Promise<string>  // public (테스트용)
}
```

## §6 sixhats-debate.ts 통합 패턴

```typescript
// before runner.execute():
let cacheKey: string | undefined;
let cachedContent: string | undefined;
if (this.policy) {
  const evalResult = await this.policy.evaluateCall({ prdId, hatColor, round: turnNumber, opinionPrefix: user.slice(0, 64), orgId });
  if (evalResult.type === "cache_hit") cachedContent = evalResult.cachedResponse;
  else cacheKey = evalResult.cacheKey;
}

// runner.execute() or cache hit:
if (cachedContent !== undefined) {
  content = cachedContent; turnTokens = 0;
} else {
  // runner.execute() ...
  if (this.policy && cacheKey) await this.policy.recordCall(...);
}
```

## §7 audit event payload

```json
{
  "prdId": "...",
  "hatColor": "red",
  "round": 3,
  "opinionPrefix": "...",
  "orgId": "...",
  "cacheHit": true/false,
  "cacheKey": "sixhats:llm:...",
  "costEstimate?": 0.001,
  "promptTokens?": 0,
  "completionTokens?": 50,
  "durationMs?": 200
}
```

## §8 Phase Exit 체크리스트

| ID | 항목 |
|----|------|
| P-a | `sixhats-llm-policy.ts` 신설 + `SixHatsLLMPolicy` class export |
| P-b | `types.ts` 3 interface export (SixHatsLLMCallContext + CallStats + SixHatsLLMPolicy) |
| P-c | KVCacheService 통합 — `kvCache.get` + `kvCache.set` |
| P-d | `sixhats-debate.ts` policy hook + 기존 3 tests 회귀 0 |
| P-e | audit-bus `six_hats.llm_call` 이벤트 mock 검증 |
| P-f | cache hit 시 LLM 호출 skip (mock call count = 0) |
| P-g | typecheck + tests GREEN |
| P-h | dual_ai_reviews sprint 356 ≥ 1건 |
| P-i | baseline=0 회귀 0 |
| P-j | 기존 sixhats 3종 테스트 회귀 0 |
| P-k | Match ≥ 90% |
| P-l | 기존 `/api/biz-items/.../sixhats/*` 동작 유지 |
