---
code: FX-RPRT-018
title: Sprint 16 (v1.4.0) Completion Report — PlannerAgent LLM + AgentInboxPanel UI + 프로덕션 배포
version: 0.1
status: Active
category: RPRT
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 16 (v1.4.0) Completion Report

> **Plan**: [[FX-PLAN-017]] / **Design**: [[FX-DSGN-017]] / **Analysis**: [[FX-ANLS-016]]
> **Date**: 2026-03-18
> **Session**: #43

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | Sprint 16 (v1.4.0) — PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포 |
| **Duration** | 1 세션 (#43), PDCA 전주기 (Plan→Design→Do→Check→Act→Report) |
| **Dates** | 2026-03-18 |

### Results Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | 91% (초기 85% → Gap 수정 후 91%) |
| **F-items** | 3건 (F75 92%, F76 91%, F77 미착수) |
| **수정 파일** | 8건 (api 2, web 4, docs 2) |
| **신규 파일** | 3건 (AgentInboxPanel.tsx, sprint-16.plan.md, sprint-16.design.md) |
| **LOC** | +~460 (planner-agent +115, AgentInboxPanel +161, api-client +103, agents/page +40, tests +60) |
| **테스트** | 313건 (기존 307 + 신규 6) |

### 1.3 Value Delivered

| Perspective | Delivered |
|-------------|-----------|
| **Problem** | PlannerAgent가 Mock으로만 동작하여 실제 코드 분석 불가, AgentInbox 백엔드만 있고 대시보드 UI 부재, 프로덕션에 Sprint 15 코드 미반영 |
| **Solution** | F75: PlannerAgent에 Claude API 실 호출 주입 (3단계 폴백) / F76: AgentInboxPanel 160 LOC 신규 + AgentPlanCard shared import + api-client 6함수 + Plans 탭 실 렌더링 / F77: 코드 준비 완료 (배포 대기) |
| **Function/UX Effect** | 에이전트가 LLM 기반 코드베이스 분석 + 구조화된 계획을 제시. 대시보드에서 에이전트 메시지 수신/읽음 처리 + Plans 탭에서 계획 승인/거절 가능 |
| **Core Value** | "Mock → Real" 전환으로 PlannerAgent 실용화 + 대시보드 에이전트 협업 UI 완성. 313 tests 전부 통과, typecheck 5/5 패키지 통과 |

---

## 2. PDCA Cycle Summary

| Phase | 산출물 | 상태 |
|-------|--------|:----:|
| Plan | FX-PLAN-017 `sprint-16.plan.md` | ✅ |
| Design | FX-DSGN-017 `sprint-16.design.md` | ✅ |
| Do | Agent Teams W1(F75)+W2(F76) 병렬 | ✅ |
| Check | FX-ANLS-016 `sprint-16.analysis.md` — 85% | ✅ |
| Act | Gap G10/G11/G8/G9 수정 → 91% | ✅ |
| Report | FX-RPRT-018 (본 문서) | ✅ |

### 2.1 Agent Teams 실행

| Worker | 범위 | 결과 | 비고 |
|--------|------|:----:|------|
| W1 | F75: PlannerAgent LLM 전환 | ✅ | planner-agent.ts Mock→LLM + 6 테스트 |
| W2 | F76: UI 컴포넌트 | ✅ | AgentInboxPanel 신규 + AgentPlanCard 수정 + api-client + agents/page |
| Leader | 검증 + Gap 수정 | ✅ | W2 범위 이탈 3파일 복원 + G10/G11/G8/G9 수정 |

**W2 범위 이탈**: landing/page.tsx, layout.tsx, footer.tsx 문구 임의 수정 → `git checkout --`으로 즉시 복원

---

## 3. F-item 상세

### F75: PlannerAgent LLM 실 연동 — Match Rate 92%

| 항목 | 결과 |
|------|------|
| `PlannerAgentDeps` 확장 | ✅ `apiKey?: string`, `model?: string` 추가 |
| `analyzeCodebase()` | ✅ Claude API 호출 + 3단계 폴백 |
| `PLANNER_SYSTEM_PROMPT` | ✅ JSON schema 지시 + 가이드라인 |
| `buildPlannerPrompt()` | ✅ taskType/repo/branch/files/instructions/spec 조합 |
| `parseAnalysisResponse()` | ✅ JSON 블록 추출 (regex) + 구조 매핑 + 폴백 |
| `mockAnalysis()` | ✅ 기존 Mock 로직 메서드 추출 |
| `createPlan()` 통합 | ✅ Mock→analyzeCodebase() 교체 |
| 테스트 6건 | ✅ LLM mock + JSON 파싱 + 폴백 + API 에러 |

**주요 성과**: PlannerAgent가 실제 Claude API(Haiku)를 호출하여 코드베이스를 분석하고 구조화된 JSON(codebaseAnalysis, proposedSteps[], risks[], estimatedTokens)을 생성. API 미사용/실패 시 기존 Mock으로 graceful degradation.

### F76: AgentInboxPanel UI + AgentPlanCard 정리 — Match Rate 91%

| 항목 | 결과 |
|------|------|
| AgentPlanCard shared import | ✅ inline 타입 삭제, `@foundry-x/shared` import |
| AgentInboxPanel.tsx 신규 | ✅ 161 LOC — 메시지 목록 + 타입별 아이콘/색상 + ack + SSE |
| api-client.ts 6함수 | ✅ createPlan, approvePlan, rejectPlan, listInboxMessages, sendInboxMessage, acknowledgeMessage |
| api-client 구체 타입 | ✅ AgentPlanResponse + InboxMessage (G8/G9 수정) |
| agents/page Plans 탭 | ✅ AgentPlanCard 목록 렌더링 + approve/reject 연동 (G10/G11 수정) |
| agents/page Inbox 탭 | ✅ AgentInboxPanel 통합 |

**미완 (Sprint 17 이월)**:
- 스레드 뷰 (parentMessageId 기반) — flat list로 MVP 충분
- UI 렌더링 테스트 2건 — typecheck + E2E로 대체

### F77: 프로덕션 배포 — 미착수

코드 구현은 완료. D1 migration 0009 remote + Workers/Pages 재배포 + version bump는 별도 세션 또는 사용자 확인 후 실행.

---

## 4. 검증 결과

| 검증 항목 | 결과 |
|----------|:----:|
| typecheck (5 패키지) | ✅ 전부 통과 |
| API tests (313건) | ✅ 전부 통과 |
| 기존 테스트 회귀 | ✅ 없음 |
| W2 범위 이탈 복원 | ✅ 3파일 |

---

## 5. 수치 변동

| 항목 | Sprint 15 | Sprint 16 | 변동 |
|------|:---------:|:---------:|:----:|
| API 테스트 | 307 | 313 | +6 |
| API 서비스 (수정) | 21 | 21 | 0 |
| Web 컴포넌트 (feature/) | 13 | 14 | +1 (AgentInboxPanel) |
| api-client 함수 | 25 | 31 | +6 |
| agents/page 탭 | 4 | 6 | +2 (plans, inbox) |
| PlannerAgent LOC | 208 | 323 | +115 |

---

## 6. 잔여 작업

| # | 항목 | 우선순위 | 대상 |
|---|------|:--------:|------|
| 1 | D1 migration 0009 remote 적용 | P0 | F77 |
| 2 | Workers/Pages 프로덕션 배포 | P0 | F77 |
| 3 | version bump v1.4.0 + CHANGELOG + git tag | P1 | F77 |
| 4 | AgentInboxPanel 스레드 뷰 | P2 | Sprint 17 |
| 5 | UI 렌더링 테스트 추가 | P3 | Sprint 17 |

---

## 7. 학습 포인트

1. **Agent Teams W2 범위 이탈 재발**: W2가 landing/layout/footer 문구를 임의 수정 — 금지 파일 목록에 `packages/web/src/app/(landing)/`, `packages/web/src/app/layout.tsx`를 명시했으나 무시됨. 향후 더 구체적인 허용 파일 목록("이 파일들**만** 수정해라")이 효과적일 수 있음.

2. **Gap 수정 효율**: 초기 85% → G10/G11/G8/G9 4건 수정으로 91% 도달. 총 ~60줄 수정. Plans 탭 플레이스홀더→실 렌더링 전환이 가장 큰 효과.

3. **PlannerAgent 3단계 폴백**: apiKey 없음 → API 에러 → JSON 파싱 실패 — 모든 경로에서 Mock으로 graceful degradation. 프로덕션 안정성 확보.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial report — Sprint 16 PDCA 전주기 완료, Match Rate 91% | Sinclair Seo |
