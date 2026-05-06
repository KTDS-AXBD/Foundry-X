---
code: FX-DSGN-350
title: Sprint 350 — F627 llm + service-proxy infra 합류 설계
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 350
f_item: F627
req: FX-REQ-692
plan: FX-PLAN-350
---

# Sprint 350 Design — F627 llm + service-proxy → core/infra/

## §1 목표

`services/llm.ts` + `services/service-proxy.ts` 2 files를 `core/infra/` A2 평탄 구조에 합류.
F596 cluster 패턴 재현. services/ 루트 6→4 files.

## §2 변경 파일 매핑

### 이동 (git mv)

| 원본 | 목적지 |
|------|--------|
| `packages/api/src/services/llm.ts` | `packages/api/src/core/infra/llm.ts` |
| `packages/api/src/services/service-proxy.ts` | `packages/api/src/core/infra/service-proxy.ts` |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/core/infra/types.ts` | LLMService + ServiceProxy re-export 2 line 추가 |
| `packages/api/src/modules/portal/routes/github.ts` | import path 갱신 |
| `packages/api/src/modules/portal/routes/webhook.ts` | import path 갱신 |
| `packages/api/src/core/sr/routes/sr.ts` | import path 갱신 |
| `packages/api/src/core/sr/services/hybrid-sr-classifier.ts` | import path 갱신 |
| `packages/api/src/core/agent/services/mcp-sampling.ts` | import path 갱신 |
| `packages/api/src/core/agent/services/reviewer-agent.ts` | import path 갱신 |
| `packages/api/src/core/spec/routes/spec.ts` | import path 갱신 |
| `packages/api/src/core/harness/routes/mcp.ts` | import path 갱신 |
| `packages/api/src/routes/proxy.ts` | import path 갱신 |
| `packages/api/src/__tests__/hybrid-sr-classifier.test.ts` | import path 갱신 |
| `packages/api/src/__tests__/services/llm.test.ts` | import path 갱신 |
| `packages/api/src/__tests__/webhook-comment.test.ts` | vi.mock path 갱신 |
| `packages/api/src/__tests__/mcp-routes-prompts.test.ts` | vi.mock path 갱신 |

## §3 import path 변환 규칙

### production callers

| 위치 | 기존 | 신규 |
|------|------|------|
| `modules/portal/routes/*.ts` | `../../../services/llm.js` | `../../../core/infra/types.js` |
| `core/sr/routes/sr.ts` | `../../../services/llm.js` | `../../infra/types.js` |
| `core/sr/services/hybrid-sr-classifier.ts` | `../../../services/llm.js` | `../../infra/types.js` |
| `core/agent/services/*.ts` | `../../../services/llm.js` | `../../infra/types.js` |
| `core/spec/routes/spec.ts` | `../../../services/llm.js` | `../../infra/types.js` |
| `core/harness/routes/mcp.ts` | `../../../services/llm.js` | `../../infra/types.js` |
| `routes/proxy.ts` | `../services/service-proxy.js` | `../core/infra/types.js` |

### test callers

| 파일 | 기존 | 신규 |
|------|------|------|
| `__tests__/hybrid-sr-classifier.test.ts` | `../services/llm.js` | `../core/infra/llm.js` |
| `__tests__/services/llm.test.ts` | `../../services/llm.js` | `../../core/infra/llm.js` |
| `__tests__/webhook-comment.test.ts` (vi.mock) | `../services/llm.js` | `../core/infra/llm.js` |
| `__tests__/mcp-routes-prompts.test.ts` (vi.mock) | `../services/llm.js` | `../core/infra/llm.js` |

> 테스트는 직접 import (types.ts 배럴 아닌 llm.js 직접) — vi.mock 인터셉트 정합성 유지

## §4 TDD 적용 등급

면제 (git mv + path 갱신 — 로직 변경 없음, 회귀 테스트가 충분).
기존 test suite(llm.test.ts + webhook-comment + mcp-routes-prompts + hybrid-sr-classifier)가 GREEN 유지되면 충분.

## §5 Phase Exit 체크리스트

P-a: services/ llm.ts + service-proxy.ts = 0
P-b: core/infra/ *.ts = 6
P-c: services/ 루트 *.ts = 4
P-d: OLD import path grep = 0
P-e: typecheck + tests GREEN
