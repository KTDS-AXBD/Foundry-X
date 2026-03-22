---
code: FX-PLAN-030
title: "Sprint 30 — 프로덕션 배포 동기화 + Phase 4 Go 판정 준비 + 품질 강화"
version: 0.1
status: Draft
category: PLAN
system-version: 2.2.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 30 — 프로덕션 배포 동기화 + Phase 4 Go 판정 준비 + 품질 강화

> **Summary**: Sprint 27~28에서 구현된 KPI 인프라, Reconciliation, AutoRebase 등의 기능을 프로덕션에 반영하고, Phase 4 Go 판정을 위한 KPI 추적 UI와 판정 문서를 준비하며, 통합 경로 E2E 테스트와 에러 핸들링 표준화로 프로덕션 품질을 확보한다.
>
> **Project**: Foundry-X
> **Version**: v2.4 (목표)
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 30 — 배포 동기화 + Go 판정 + 품질 강화 (F123~F128) |
| **시작** | 2026-03-21 |
| **목표 버전** | v2.4 |
| **F-items** | 6개 (F123 배포, F124 프론트엔드 개선, F125 Go 판정, F126 Harness Rules, F127 정합성, F128 E2E+에러) |

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 27~28의 핵심 기능(KPI, Reconciliation, AutoRebase, SemanticLinting)이 프로덕션 미반영으로 D1 drift 위험. Phase 4 Go 판정에 필요한 KPI 추적 UI와 판정 문서가 부재. 프론트엔드 통합(F106)이 85% 수준으로 네비게이션/데이터 공유에 한계. 통합 경로(iframe SSO, BFF, entity_registry) E2E 테스트 부재. |
| **Solution** | (1) D1 0018 remote + Workers v2.2.0 배포로 프로덕션 동기화, (2) /analytics 대시보드에 K7/K8/K9 추적 UI + Go 판정 문서, (3) iframe postMessage 데이터 공유 확장 + 서브앱 네비게이션 통합, (4) Harness Evolution Rules 자동 감지 서비스, (5) PRD MVP 체크리스트 갱신 + codegen-core 판정, (6) 통합 경로 E2E + ErrorResponse 스키마 통일 |
| **Function/UX Effect** | 프로덕션에서 KPI 수집·Cron Reconciliation·AutoRebase가 실제 동작. 대시보드에서 K7 WAU, K8 에이전트 완료율, K9 서비스 전환율을 한눈에 확인. 통합 경로 E2E로 iframe→SSO→BFF→D1 전체 흐름 검증 완료. |
| **Core Value** | Phase 4 Go 판정을 위한 기술적 준비 완료 — 프로덕션 배포 + KPI 추적 가능 + 품질 근거 확보 → "Go/Pivot/Kill 판정에 필요한 모든 데이터 제공" |

---

## 1. Overview

### 1.1 Purpose

Sprint 30은 3가지 축으로 구성:

**축 1: 배포 + Phase 4 마무리**
- D1 migration 0018 remote 적용 (Sprint 27~28 스키마)
- Workers v2.2.0 프로덕션 배포 + smoke test
- F106 프론트엔드 통합 개선 (85%→ 목표 92%+)
- Phase 4 Go 판정 준비 (KPI 대시보드 + 판정 문서)

**축 2: 기술 부채 / 누락 해소**
- Q6 Harness Evolution Rules 자동 감지 (규칙 문서화만 완료, 자동 감지 미구현)
- PRD v5 MVP 체크리스트 갱신 (대부분 ✅이지만 문서 미반영)
- codegen-core 재활용 판정 (PRD §9 "Phase 4에서 검토" 명시)

**축 3: 프로덕션 품질 강화**
- Phase 4 통합 경로 E2E 테스트 (iframe SSO + BFF + entity_registry)
- API 에러 응답 표준화 (ErrorResponse 스키마 통일 + 에러 코드 체계)

### 1.2 Background

**현재 상태 (Sprint 28 완료):**
- API 108 endpoints, 43 services, 550 API tests + CLI 112 + Web 48
- D1 30 테이블, 18 migrations (0018: kpi_events + reconciliation_runs, **로컬만 적용**)
- Workers v2.1.0 배포 상태 (v2.2.0 코드 프로덕션 미반영)
- F106 프론트엔드 통합: 85% (iframe + postMessage SSO 기본 동작)
- KPI 인프라: KpiLogger + /analytics 4 endpoints (프로덕션 미배포)
- Reconciliation: Cron 6h + ReconciliationService (프로덕션 미배포)
- Phase 3 완전 종결, Phase 4 Go 판정 미실시

**Phase 4 Go 조건 (PRD v5 §7.10):**
- NPS 6+ (K12) — 실사용자 미참여로 측정 불가
- WAU 60%+ (K7) — KPI 인프라 배포 후 측정 가능
- "개별 서비스로 돌아가고 싶지 않다" 피드백 2명+ — 실사용자 필요

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V5]] §4 성공 지표, §7.10 Phase 4 판정, §7.12 기술 스택 통일
- SPEC: [[FX-SPEC-001]] v5.8
- Sprint 27 Report: [[FX-RPRT-028]] (F99/F100/F101, Match Rate 94%)
- Sprint 28 Report: [[FX-RPRT-029]] (F102/F103/F105, Match Rate 93%)
- Sprint 26 Report: [[FX-RPRT-027]] (F106/F108/F109/F111, Match Rate 94%)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F123**: 프로덕션 배포 동기화 — D1 0018 remote + Workers v2.2.0 배포 + smoke test
- [ ] **F124**: 프론트엔드 통합 개선 — 서브앱 네비게이션 통합 + postMessage 데이터 공유 확장
- [ ] **F125**: Phase 4 Go 판정 준비 — KPI 대시보드(K7/K8/K9) 추적 UI + Go 판정 문서
- [ ] **F126**: Harness Evolution Rules 자동 감지 — 위반 패턴 감지 + SSE 경고 알림
- [ ] **F127**: PRD↔구현 정합성 갱신 — MVP 체크리스트 + codegen-core 재활용 판정
- [ ] **F128**: E2E 테스트 보강 + 에러 핸들링 — 통합 경로 E2E + API 에러 응답 표준화

### 2.2 Out of Scope

- F114/F120~F122 실사용자 온보딩 — Sprint 29 (별도)
- F116 KT DS SR 시나리오 구체화 — Phase 5
- F112 GitLab API 지원 — 수요 미확인
- 인프라 변경 (Workers 아키텍처/D1 분산) — 불필요
- 대규모 리팩토링 — 기존 코드 안정성 유지

---

## 3. Feature Details

### 3.1 F123 — 프로덕션 배포 동기화 (P0)

**선행 조건**: 모든 다른 F-item의 기반

#### 3.1.1 D1 Migration 0018 Remote 적용

```bash
cd packages/api
wrangler d1 migrations apply foundry-x-db --remote
# 확인: kpi_events + reconciliation_runs 테이블 생성
wrangler d1 execute foundry-x-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

#### 3.1.2 Workers v2.2.0 배포

```bash
cd packages/api
wrangler deploy  # Workers 프로덕션 배포
```

검증 사항:
- `/api/health` 200 OK
- `/api/analytics/summary` 응답 (KPI 인프라)
- Cron Trigger 동작 확인 (`wrangler tail` 로그)
- AutoRebase 서비스 로드 확인 (health endpoint에 service 목록)

#### 3.1.3 Smoke Test

기존 E2E 프로덕션 config (`playwright.prod.config.ts`) 활용:
- 랜딩 페이지 로딩
- 대시보드 접근 (인증 포함)
- API health check

### 3.2 F124 — 프론트엔드 통합 개선 (P1)

**PRD 근거**: v5 §7.10 Phase 4-A "프론트엔드 통합", F106 Match 85%→ 개선

#### 3.2.1 현재 한계 (F106, 85%)

| 항목 | 현재 | 개선 목표 |
|------|------|-----------|
| 서브앱 네비게이션 | iframe 내부에서만 동작, Foundry-X 사이드바와 불연속 | 사이드바에 서브앱 메뉴 통합, iframe 내 네비게이션 시 상위 URL도 동기화 |
| 데이터 공유 | postMessage SSO 토큰만 | postMessage로 현재 프로젝트 컨텍스트, 사용자 설정, 테마 정보도 공유 |
| 로딩 상태 | iframe 로딩 시 빈 화면 | 로딩 스켈레톤 + 에러 바운더리 (서브앱 로딩 실패 시 안내) |
| 서브앱 상태 | 각 iframe 독립 | Zustand store에서 활성 서브앱 상태 관리, 탭 전환 시 상태 유지 |

#### 3.2.2 postMessage 프로토콜 확장

```typescript
// 현재: SSO 토큰만
type FoundryMessage = { type: 'sso-token'; token: string };

// 확장
type FoundryMessage =
  | { type: 'sso-token'; token: string }
  | { type: 'context-sync'; projectId: string; orgId: string }
  | { type: 'theme-sync'; theme: 'light' | 'dark' }
  | { type: 'navigate'; path: string }  // 서브앱→부모 네비게이션 요청
  | { type: 'ready' }                    // 서브앱 로딩 완료 신호
  | { type: 'error'; message: string };  // 서브앱 에러 보고
```

#### 3.2.3 서브앱 컨테이너 컴포넌트 리팩토링

**수정 파일**: `packages/web/src/components/feature/SubAppContainer.tsx` (기존)

- 로딩 스켈레톤 + 에러 바운더리 추가
- postMessage 이벤트 리스너 확장
- 사이드바 메뉴와 iframe URL 동기화 로직

### 3.3 F125 — Phase 4 Go 판정 준비 (P1)

**PRD 근거**: v5 §7.10 Phase 4 판정 "Go 조건 (하나 이상)"

#### 3.3.1 KPI 추적 대시보드 UI

**수정 파일**: `packages/web/src/app/(app)/analytics/` (기존 analytics 라우트 확장)

기존 `/analytics` 페이지에 Phase 4 KPI 섹션 추가:

| KPI | 데이터 소스 | 시각화 |
|-----|-------------|--------|
| K7 WAU | kpi_events `page_view` 이벤트, 주간 unique user | 주간 막대 차트 |
| K8 에이전트 완료율 | agent_tasks `completed` / `total` | 도넛 차트 + 트렌드 |
| K9 서비스 전환율 | kpi_events `service_switch` vs `integrated_workflow` | 비율 표시 |

API 확장:
- `GET /api/analytics/phase4-kpi` — K7/K8/K9 집계 데이터 반환

#### 3.3.2 Go 판정 문서

**새 파일**: `docs/specs/phase-4-go-decision.md`

구조:
1. Phase 4 Go 조건 (PRD v5 인용)
2. 현재 달성 현황 (KPI 데이터 기반)
3. 기술적 준비 상태 (통합 Step 1~5 완료 현황)
4. 미달 항목 + 대응 방안
5. 판정: Go / Conditional Go / Pivot

### 3.4 F126 — Harness Evolution Rules 자동 감지 (P2)

**PRD 근거**: v5 Q6 "Harness Evolution Rules 위반 시 처리 방식 — 부분 해소"

#### 3.4.1 HarnessRulesService

**새 파일**: `packages/api/src/services/harness-rules.ts`

| 메서드 | 설명 |
|--------|------|
| `checkRules(projectId)` | 프로젝트의 하네스 파일(.foundry-x/) 규칙 위반 검사 |
| `detectViolations(files)` | 파일 목록 대비 규칙 위반 감지 (placeholder 잔존, 일관성 깨짐) |
| `emitViolationAlert(violations)` | SSE 이벤트로 위반 알림 전송 |
| `getViolationHistory(projectId)` | kpi_events에서 위반 이력 조회 |

#### 3.4.2 규칙 정의

기존 `packages/cli/src/harness/verify.ts`의 검증 로직을 API 서비스로 확장:

| 규칙 | 위반 조건 | 심각도 |
|------|-----------|--------|
| placeholder-check | `.foundry-x/` 파일에 `TODO`, `PLACEHOLDER` 잔존 | warning |
| consistency-check | CLAUDE.md ↔ AGENTS.md 불일치 | error |
| freshness-check | 마지막 갱신이 7일 이상 | info |
| schema-drift | SPEC.md F-item과 실 코드 불일치 | warning |

#### 3.4.3 라우트

- `GET /api/harness/rules/:projectId` — 규칙 검사 실행 + 결과 반환
- `GET /api/harness/violations/:projectId` — 위반 이력 조회

### 3.5 F127 — PRD↔구현 정합성 갱신 (P2)

#### 3.5.1 PRD v5 MVP 체크리스트 갱신

현재 PRD v5 §4 MVP 최소 기준:

| 항목 | PRD 상태 | 실제 상태 |
|------|----------|-----------|
| 기술 스택 점검 스프린트(Sprint 0) 완료 | `- [ ]` | ✅ F98 (Sprint 25, Kill→Go) |
| KPI 측정 인프라 구축 | `- [ ]` | ✅ F100 (Sprint 27) |
| AXIS DS UI 전환 완료 | `- [ ]` | ✅ F104 (Sprint 25) |
| Plumb Track B 판정 완료 | `- [ ]` | ✅ F105 (Sprint 28, Stay Track A) |
| 에이전트 자동 수정/rebase 구현 | `- [ ]` | ✅ F101/F102 (Sprint 27~28) |
| Git↔D1 Reconciliation 동작 | `- [ ]` | ✅ F99 (Sprint 27) |

→ PRD v5 파일에서 `- [ ]` → `- [x]` 6건 갱신

#### 3.5.2 codegen-core 재활용 판정

PRD v5 §9: "codegen-core | Phase 4에서 검토 | AI Foundry 통합 시 | AST/파일 생성 로직 재활용 가능"

판정 문서 작성 (Go 판정 문서 §3에 포함):
- AI Foundry codegen-core 코드베이스 확인
- Foundry-X MCP 경유 패턴과의 호환성 분석
- 재활용 범위 결정 (재활용 / 부분 참고 / 재구현)

### 3.6 F128 — E2E 테스트 보강 + 에러 핸들링 (P1)

#### 3.6.1 Phase 4 통합 경로 E2E

**새 파일**: `packages/web/e2e/integration-path.spec.ts`

| 시나리오 | 검증 흐름 |
|----------|-----------|
| iframe SSO | 대시보드 → 서브앱 iframe 로드 → SSO 토큰 postMessage → 서브앱 인증 상태 |
| BFF 프록시 | 서브앱 API 호출 → Foundry-X BFF → 서비스 API → 응답 |
| 엔티티 레지스트리 | 크로스 서비스 검색 → entity_registry 쿼리 → 결과 표시 |
| 에러 시나리오 | 서브앱 로딩 실패 → 에러 바운더리 → 안내 메시지 |

#### 3.6.2 API 에러 응답 표준화

**새 파일**: `packages/api/src/schemas/error.ts`

```typescript
// ErrorResponse 통일 스키마
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),        // 'AUTH_001', 'VALIDATION_002' 등
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
```

**수정 파일**: 기존 라우트들의 에러 응답을 `errorResponseSchema` 기반으로 통일

에러 코드 체계:

| 범위 | 도메인 | 예시 |
|------|--------|------|
| AUTH_0xx | 인증/인가 | AUTH_001 토큰 만료, AUTH_002 권한 부족 |
| VALIDATION_0xx | 입력 검증 | VALIDATION_001 필수 필드 누락 |
| RESOURCE_0xx | 리소스 | RESOURCE_001 Not Found |
| INTEGRATION_0xx | 외부 연동 | INTEGRATION_001 GitHub API 실패 |
| INTERNAL_0xx | 서버 내부 | INTERNAL_001 예기치 않은 에러 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] F123: D1 0018 remote 적용 + Workers v2.2.0 배포 + smoke test 통과
- [ ] F123: Cron Trigger 동작 확인 (wrangler tail 로그)
- [ ] F124: 서브앱 네비게이션 사이드바 통합 + 로딩 스켈레톤
- [ ] F124: postMessage 프로토콜 5종 타입 + 양방향 통신
- [ ] F125: /analytics/phase4-kpi 엔드포인트 + UI 차트 3종
- [ ] F125: Phase 4 Go 판정 문서 작성 (PRD 조건 대비 현황)
- [ ] F126: HarnessRulesService + 2 endpoints + SSE 위반 알림
- [ ] F127: PRD v5 MVP 체크리스트 6건 ✅ 갱신 + codegen-core 판정
- [ ] F128: 통합 경로 E2E 4개 시나리오 + 에러 바운더리
- [ ] F128: ErrorResponse 스키마 + 에러 코드 체계 정의
- [ ] 전체 typecheck 통과 + 기존 테스트 통과
- [ ] 새 테스트 추가 (F124 ~8건, F125 ~6건, F126 ~10건, F128 ~12건)

### 4.2 Quality Criteria

- [ ] Test coverage: 신규 서비스 80%+
- [ ] Zero lint errors (커스텀 룰 포함)
- [ ] E2E 통합 경로 4개 시나리오 전부 green
- [ ] ErrorResponse 스키마 기존 라우트 20+ 적용

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| D1 0018 remote 적용 실패 | High | Low | 로컬에서 검증 완료, `--dry-run` 먼저 실행 |
| Workers 배포 후 기존 기능 회귀 | High | Low | smoke test + E2E prod config 실행 |
| iframe postMessage 브라우저 호환 | Medium | Low | postMessage는 표준 API, origin 검증 필수 |
| KPI 데이터 부족 (실사용자 미참여) | Medium | High | Go 판정 문서에 "기술적 준비 완료, 실사용 데이터 대기" 명시 |
| codegen-core 코드베이스 접근 불가 | Low | Medium | Git 기반 분석, 접근 불가 시 "재활용 보류" 판정 |
| ErrorResponse 마이그레이션 범위 과대 | Medium | Medium | 핵심 라우트(auth, agent, spec) 우선, 나머지는 점진적 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

기존 모노리포 + Hono API + Next.js 대시보드 아키텍처 유지. 새 패키지나 인프라 변경 없음.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| KPI UI 위치 | 별도 페이지 / 기존 analytics 확장 | **기존 analytics 확장** | F100에서 이미 analytics 라우트 구축, 재활용 |
| 에러 코드 체계 | 숫자 코드 / 문자열 코드 | **문자열 코드** | 가독성 + 확장성 (DOMAIN_NNN 형식) |
| Harness 감지 방식 | Cron / On-demand / 양방향 | **On-demand + webhook 트리거** | Cron은 불필요한 부하, 코드 변경 시만 검사 |
| postMessage 보안 | origin 화이트리스트 / 서명 | **origin 화이트리스트** | 단순 + 효과적, 서명은 과잉 |
| D1 migration 추가 | 필요 / 불필요 | **불필요** | kpi_events 재활용 + 기존 테이블로 충분 |

### 6.3 Worker 배분 (Agent Team)

```
┌─────────────────────────────────────────────────┐
│ Worker 1 (W1): 배포 + 프론트엔드                  │
│   F123: D1 0018 remote + Workers 배포 + smoke    │
│   F124: SubAppContainer 리팩토링 + postMessage    │
│   Web: analytics/phase4-kpi UI (F125 UI 부분)    │
├─────────────────────────────────────────────────┤
│ Worker 2 (W2): 품질 + 기술부채                    │
│   F126: harness-rules.ts 서비스 + 2 endpoints    │
│   F128: ErrorResponse 스키마 + 에러 코드 체계      │
│   F128: integration-path.spec.ts E2E             │
└─────────────────────────────────────────────────┘

리더 담당:
  - F125: /analytics/phase4-kpi API + Go 판정 문서
  - F127: PRD v5 MVP 갱신 + codegen-core 판정
  - 공유 파일 충돌 관리 (shared 타입 등)
  - 최종 typecheck + lint + 전체 테스트 검증
  - SPEC.md 갱신
```

### 6.4 파일 충돌 분석

| 파일 | W1 | W2 | 리더 | 충돌 위험 |
|------|:--:|:--:|:----:|:---------:|
| D1 remote (CLI 작업) | ✅ | — | — | 없음 |
| `SubAppContainer.tsx` | ✅ | — | — | 없음 |
| `analytics/page.tsx` | ✅ | — | ✅ | **중간** — 순차 |
| `harness-rules.ts` (신규) | — | ✅ | — | 없음 |
| `schemas/error.ts` (신규) | — | ✅ | — | 없음 |
| `integration-path.spec.ts` (신규) | — | ✅ | — | 없음 |
| PRD v5 + Go 판정 문서 | — | — | ✅ | 없음 |
| `packages/shared/types.ts` | ✅ | ✅ | ✅ | **중간** — 순차 커밋 |

W1(프론트엔드)과 W2(백엔드+테스트)는 거의 독립 파일이므로 **병렬 실행 가능**.

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions ✅

- [x] CLAUDE.md 코딩 컨벤션
- [x] ESLint flat config + 커스텀 룰 3종 (Sprint 28 F103)
- [x] TypeScript strict mode
- [x] Vitest + app.request() 테스트 패턴
- [x] Zod 스키마 + OpenAPI createRoute 패턴
- [x] PostMessage SSO 패턴 (Sprint 26 F106)
- [x] KpiLogger 이벤트 기록 패턴 (Sprint 27 F100)

### 7.2 New Conventions

| Category | Rule |
|----------|------|
| ErrorResponse | 모든 API 에러는 `{ error: { code, message, details? } }` 형식 |
| 에러 코드 | `DOMAIN_NNN` 문자열 (예: AUTH_001, VALIDATION_002) |
| postMessage | origin 화이트리스트 + type 필드 필수, unknown type은 무시 |
| Harness 감지 | On-demand 방식, 결과는 kpi_events에 기록 |

### 7.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| (신규 없음) | — | — |

기존 환경변수 재활용: `ANTHROPIC_API_KEY`, `JWT_SECRET`, `GITHUB_TOKEN`, `WEBHOOK_SECRET`

---

## 8. Implementation Order

### Phase 1: 배포 (F123, 최우선)

1. D1 migration 0018 remote 적용
2. Workers v2.2.0 프로덕션 배포
3. Smoke test (health + analytics + Cron 확인)

### Phase 2: 핵심 기능 (W1 + W2 병렬)

4. **W1**: SubAppContainer 리팩토링 — postMessage 프로토콜 확장 + 로딩 스켈레톤 (F124)
5. **W1**: analytics/phase4-kpi UI — K7/K8/K9 차트 (F125 UI)
6. **W2**: ErrorResponse 스키마 + 에러 코드 체계 정의 (F128)
7. **W2**: harness-rules.ts 서비스 + 라우트 2개 (F126)
8. **리더**: GET /analytics/phase4-kpi API 엔드포인트 (F125 API)

### Phase 3: 테스트 + 문서 (W2 + 리더)

9. **W2**: integration-path.spec.ts E2E 4개 시나리오 (F128)
10. **W2**: 기존 라우트 ErrorResponse 마이그레이션 (auth, agent, spec 우선)
11. **리더**: PRD v5 MVP 체크리스트 갱신 (F127)
12. **리더**: codegen-core 재활용 판정 (F127)
13. **리더**: Phase 4 Go 판정 문서 작성 (F125)

### Phase 4: 마무리

14. **리더**: SPEC.md F123~F128 상태 갱신
15. **리더**: 공유 파일 통합 + typecheck + lint + 전체 테스트 검증
16. **리더**: Workers v2.4.0 배포 (Sprint 30 코드 포함)

---

## 9. Dependencies

### 9.1 Sprint 27~28 의존성

| 항목 | 의존도 | 상태 |
|------|:------:|------|
| F100 KPI 인프라 (kpi_events) | 강함 | ✅ 코드 완료, 배포 대기 |
| F99 Reconciliation (Cron) | 강함 | ✅ 코드 완료, 배포 대기 |
| F106 프론트엔드 통합 (iframe) | 강함 | ✅ 기본 구현, 개선 대상 |
| F103 Semantic Linting | 약함 | ✅ 완료 |
| D1 migration 0018 | 강함 | ✅ 로컬 적용, remote 대기 |

### 9.2 외부 의존성

| 항목 | 상태 |
|------|------|
| Cloudflare Workers deploy | ✅ PAT 인증 설정 완료 |
| Cloudflare D1 remote | ✅ 접근 가능 |
| Claude API | ✅ 기존 설정 |
| codegen-core 코드베이스 | ⚠️ 접근 확인 필요 |

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`sprint-30.design.md`)
2. [ ] SPEC.md F123~F128 상태 📋→🔧 전환
3. [ ] D1 0018 remote 적용 (F123 착수)
4. [ ] Agent Team 2-worker 실행
5. [ ] Phase 4 Go 판정 문서 완성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
