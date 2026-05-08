---
code: FX-PLAN-356
title: Sprint 356 — F624 Six Hats LLM 호출 정책 (T2 마무리)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 356
f_item: F624
req: FX-REQ-689
priority: P2
---

# Sprint 356 — F624 Six Hats LLM 호출 정책 (T2 마무리)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F624는 S335 17 sprint 시동 신기록 세션에서 코드화 완료. 본 sprint 번호로 정식 WT 시동된 적 없음. S337 batch SPEC sync PR이 row를 ✅로 마킹 + plan SUPERSEDED. plan §3 항목들은 모두 코드 측에 정착 (자세한 위치는 SPEC.md row 또는 core/{도메인}/ 디렉토리 참조). SPEC.md F624 row가 진실 — `Sprint 356 | ✅`.

> SPEC.md §5 F624 row가 권위 소스. 본 plan은 17 internal dev plan §3 T2 Domain Extraction 세 번째(마무리) sprint.

## §1 배경 + 사전 측정

BeSir 정합성 P1 누락 3건 중 하나. Six Hats 토론(6색 모자) sub-routine이 외부 LLM 호출 시점·횟수·캐시 정책 미정의.

### 기존 자산 (F188)

| 자산 | 위치 | 비고 |
|------|------|------|
| Service | `core/shaping/services/sixhats-debate.ts` (272 LOC) | `SixHatsDebateService` |
| Schema | `core/shaping/schemas/shaping.ts` | `createSixHatsSchema` 6색 enum |
| D1 | `sixhats_debates` + `sixhats_turns` | F188 신설 |
| Tests | sixhats-debate + sixhats-prompts + biz-items-sixhats | 3 files |
| 호출 패턴 | agentRunner 통해 LLM 호출 (turn당 1 call, total 20 turns) | 직접 LLM API 호출 아님 |

### 의존성

| 의존 F# | 상태 | 활용 |
|---------|------|------|
| F627 `core/infra/llm.ts` | ✅ MERGED | LLM wrapper |
| F606 audit-bus | ✅ MERGED | `six_hats.llm_call` 이벤트 |
| F596 `core/infra/kv-cache.ts` | ✅ MERGED | 캐시 KVCacheService |

## §2 인터뷰 4회 패턴 (S336, 35회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T2 마무리 = F624 Six Hats LLM 호출 정책 | T2 3 sprint 종결 |
| 2차 위치 | **B `sixhats-llm-policy.ts` 별 service** | 책임 분리 명확 |
| 3차 캐시 | **포함** (KVCacheService 활용, TTL 3600s) | BeSir LLM 비용 정책 핵심 |
| 4차 시동 | **즉시** (354/355와 다른 도메인 = shaping vs discovery vs policy) | 동시 3개 한도 내 |

## §3 범위 (a~h)

### (a) `core/shaping/services/sixhats-llm-policy.ts` 신설

```typescript
import { KVCacheService } from "../../infra/types.js";
import { AuditBus } from "../../infra/types.js";

export interface SixHatsLLMCallContext {
  prdId: string;
  hatColor: "white" | "red" | "black" | "yellow" | "green" | "blue";
  round: number;
  opinionPrefix: string; // first 64 chars of opinion (cache key 일부)
  orgId: string;
}

export interface CallStats {
  cacheHit: boolean;
  costEstimate: number; // USD
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
}

export class SixHatsLLMPolicy {
  constructor(
    private kvCache: KVCacheService,
    private auditBus: AuditBus,
  ) {}

  async evaluateCall(ctx: SixHatsLLMCallContext): Promise<
    | { type: "cache_hit"; cachedResponse: string }
    | { type: "llm_call_required"; cacheKey: string }
  > {
    const cacheKey = this.buildCacheKey(ctx);
    const cached = await this.kvCache.get(cacheKey);
    if (cached) {
      await this.auditBus.emit("six_hats.llm_call", {
        ...ctx, cacheHit: true, cacheKey,
      });
      return { type: "cache_hit", cachedResponse: cached };
    }
    return { type: "llm_call_required", cacheKey };
  }

  async recordCall(
    ctx: SixHatsLLMCallContext,
    cacheKey: string,
    response: string,
    stats: CallStats,
  ): Promise<void> {
    await this.kvCache.set(cacheKey, response, 3600); // TTL 1h
    await this.auditBus.emit("six_hats.llm_call", {
      ...ctx, cacheHit: false, cacheKey, ...stats,
    });
  }

  private buildCacheKey(ctx: SixHatsLLMCallContext): string {
    const input = `${ctx.prdId}|${ctx.hatColor}|${ctx.round}|${ctx.opinionPrefix.slice(0, 64)}`;
    // sha256 hex slice
    return `sixhats:llm:${sha256Hex(input).slice(0, 32)}`;
  }
}
```

### (b) `core/shaping/types.ts` 갱신

```typescript
export { SixHatsLLMPolicy } from "./services/sixhats-llm-policy.js";
export type { SixHatsLLMCallContext, CallStats } from "./services/sixhats-llm-policy.js";
```

### (c) `sixhats-debate.ts` 통합 (agentRunner 호출 hook)

```typescript
// 기존: agentRunner.run({ prompt }) 호출 위치에 추가:
// const evaluation = await policy.evaluateCall({prdId, hatColor, round, opinionPrefix, orgId});
// if (evaluation.type === "cache_hit") {
//   useCachedResponse(evaluation.cachedResponse);
// } else {
//   const response = await agentRunner.run({...});
//   await policy.recordCall(ctx, evaluation.cacheKey, response, stats);
// }
```

### (d) audit-bus 이벤트
- `six_hats.llm_call` event_type
- payload: `{ prdId, hatColor, round, cacheHit, cacheKey, costEstimate?, promptTokens?, completionTokens?, durationMs? }`

### (e) test mock 1건

`__tests__/sixhats-llm-policy.test.ts`:
- Mock KVCacheService (in-memory)
- Mock AuditBus (capture emits)
- Test 1: cache hit → LLM 호출 0회 + audit emit 1
- Test 2: cache miss → LLM 호출 1 (mock) + recordCall + cache set + audit emit 1

### (f) typecheck + vitest GREEN

- 기존 sixhats-debate 테스트 3종 회귀 0 (sixhats-debate + sixhats-prompts + biz-items-sixhats)

### (g) 캐시 키 충돌 검사

- prdId + hatColor + round 동일 시 동일 응답 OK
- opinion_prefix 64 char 다르면 다른 키 (round 진행 시 입력 변화 반영)

### (h) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | sixhats-llm-policy.ts 신설 + class export | grep | SixHatsLLMPolicy class |
| P-b | types.ts 3 interface export | grep | Context + Policy + Stats |
| P-c | KVCacheService 통합 + cache key 생성 함수 unit | grep `kvCache.get\|kvCache.set` | 둘 다 |
| P-d | sixhats-debate.ts policy hook 추가 + 회귀 0 | grep + test | hook 추가 + 기존 동작 유지 |
| P-e | audit-bus six_hats.llm_call 이벤트 | mock 검증 | emit 확인 |
| P-f | cache hit 시 LLM 호출 skip | mock 검증 | LLM call count = 0 (cache hit case) |
| P-g | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 (3 sixhats tests 포함) |
| P-h | dual_ai_reviews sprint 356 자동 INSERT | D1 query | ≥ 1건 (hook 31 sprint 연속) |
| P-i | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-j | F587~F631 회귀 측정 14항 | grep + count | 모든 항목 회귀 0 |
| P-k | Match ≥ 90% | gap-detector | semantic 100% 목표 |
| P-l | API smoke (기존 endpoint 회귀 0) | 기존 /api/biz-items/.../sixhats/* | 동작 유지 |

## §5 전제

- F627 `core/infra/llm.ts` ✅ MERGED
- F606 audit-bus ✅ MERGED
- F596 kv-cache ✅ MERGED
- F188 sixhats 도메인 ✅ 기존
- 동시 sprint: 354(discovery) + 355(policy) — 다른 도메인, 충돌 0

## §6 예상 시간

- autopilot **~10분** (단순 service 신설 + cache 통합 + 1 hook + 1 test)
- D1 migration 불필요

## §7 다음 사이클 후보 (F624 후속, T3 진입)

- **Sprint 357 — F602** 4대 진단 PoC (T3 첫 sprint)
- Sprint 358 — F632 CQ 5축 + 80-20-80 (T3, F602+F605 의존)
- Sprint 359 — F607 AI 투명성 + 윤리 임계 (T3, F606 ✅)
- T2 종결 → T3 본격 진입 마일스톤
