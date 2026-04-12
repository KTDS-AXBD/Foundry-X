---
code: FX-ANLS-034
title: "Sprint 34 — F135 OpenRouter Runner Gap Analysis"
version: 1.0
status: Active
category: ANLS
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: F135
sprint: 34
matchRate: 97
references:
  - "[[FX-DSGN-034]]"
---

## 1. Gap Analysis Summary

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 95% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 97% | ✅ |
| Test Coverage | 100% | ✅ |
| **Overall Match Rate** | **97%** | ✅ |

## 2. Design vs Implementation Comparison

### 2.1 execution-types.ts (§3.1.1)

| 항목 | Design | Implementation | Match |
|------|--------|---------------|:-----:|
| `"openrouter"` 타입 추가 | ✅ | ✅ | ✅ |
| 하위 호환 유지 | ✅ | ✅ | ✅ |

### 2.2 prompt-utils.ts (§3.1.2)

| 항목 | Design | Implementation | Match |
|------|--------|---------------|:-----:|
| UIHINT_INSTRUCTION 이전 | ✅ | ✅ | ✅ |
| TASK_SYSTEM_PROMPTS 이전 (7종) | ✅ | ✅ | ✅ |
| DEFAULT_LAYOUT_MAP 이전 | ✅ | ✅ | ✅ |
| buildUserPrompt 함수 | ✅ | ✅ | ✅ |
| import from execution-types.js | ✅ | ✅ | ✅ |

### 2.3 openrouter-runner.ts (§3.1.3)

| 항목 | Design | Implementation | Match |
|------|--------|---------------|:-----:|
| AgentRunner 인터페이스 구현 | ✅ | ✅ | ✅ |
| type = "openrouter" | ✅ | ✅ | ✅ |
| constructor(apiKey, model, baseUrl) | ✅ | ✅ | ✅ |
| DEFAULT_MODEL = anthropic/claude-sonnet-4 | ✅ | ✅ | ✅ |
| DEFAULT_BASE_URL = openrouter.ai/api/v1 | ✅ | ✅ | ✅ |
| REQUEST_TIMEOUT_MS = 30000 | ✅ | ✅ | ✅ |
| OpenAI 호환 요청 포맷 | ✅ | ✅ | ✅ |
| Authorization Bearer 헤더 | ✅ | ✅ | ✅ |
| HTTP-Referer + X-Title 헤더 | ✅ | ✅ | ✅ |
| 응답 변환 (choices[0].message.content) | ✅ | ✅ | ✅ |
| tokensUsed = prompt + completion | ✅ | ✅ | ✅ |
| AbortController 30s 타임아웃 | ✅ | ✅ | ✅ |
| JSON 파싱 실패 → partial | ✅ | ✅ | ✅ |
| API 에러 → failed | ✅ | ✅ | ✅ |
| uiHint 추출 (F60 호환) | ✅ | ✅ | ✅ |
| usage null-safety (optional chaining) | ✅ | ⚠️→✅ | ✅ (수정) |

### 2.4 agent-runner.ts 팩토리 (§3.1.4)

| 항목 | Design | Implementation | Match |
|------|--------|---------------|:-----:|
| OpenRouterRunner import | ✅ | ✅ | ✅ |
| env 파라미터 확장 (3 keys) | ✅ | ✅ | ✅ |
| 우선순위: OpenRouter > Claude > Mock | ✅ | ✅ | ✅ |
| OPENROUTER_DEFAULT_MODEL 전달 | ✅ | ✅ | ✅ |

### 2.5 claude-api-runner.ts 마이그레이션 (§3.1.5)

| 항목 | Design | Implementation | Match |
|------|--------|---------------|:-----:|
| TASK_SYSTEM_PROMPTS re-export | ✅ | ✅ | ✅ |
| UIHINT_INSTRUCTION re-export | ✅ | ✅ | ✅ |
| DEFAULT_LAYOUT_MAP re-export | ✅ | ✅ | ✅ |
| buildUserPrompt re-export | ✅ | ⚠️→✅ | ✅ (수정) |
| buildUserPrompt import 사용 | ✅ | ✅ | ✅ |
| private buildUserPrompt 제거 | ✅ | ✅ | ✅ |

### 2.6 테스트 (§4)

| 항목 | Design | Implementation | Match |
|------|--------|---------------|:-----:|
| openrouter-runner.test.ts 15건 | ✅ | ✅ (15건) | ✅ |
| agent-runner-factory.test.ts 5건 | ✅ | ✅ (5건) | ✅ |
| 기존 테스트 회귀 0건 | ✅ | ✅ (603 통과) | ✅ |

### 2.7 추가 발견 (Design 외)

| 항목 | 설명 | 조치 |
|------|------|------|
| Zod 스키마 누락 | `schemas/agent.ts`의 AgentRunnerInfoSchema에 `"openrouter"` 미포함 | ✅ 리더가 직접 수정 |

## 3. Gap 목록

| # | Gap | Severity | Status |
|---|-----|----------|--------|
| G1 | `buildUserPrompt` re-export 누락 (claude-api-runner.ts) | Low | ✅ 수정 완료 |
| G2 | `usage` null-safety 미적용 (openrouter-runner.ts) | Low | ✅ 수정 완료 |
| G3 | Constants export (설계=private, 구현=export) | None | 허용 (테스트 편의) |
| G4 | Timeout error: DOMException vs Error | None | 허용 (Workers 호환) |

## 4. 검증 결과

| 항목 | 결과 |
|------|------|
| typecheck | ✅ 에러 0건 |
| 테스트 | ✅ 603/603 통과 |
| 신규 테스트 | ✅ 20건 (15 + 5) |
| lint | ⏭️ API 패키지 eslint 미설정 (기존) |
| File Guard | ✅ 0건 이탈 |

## 5. 결론

**Match Rate 97%** — Critical/High gap 없이 Design과 Implementation이 잘 일치. Low severity 2건은 즉시 수정 완료. `/pdca report sprint-34`로 진행 가능.
