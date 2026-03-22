---
code: FX-PLAN-031
title: "Sprint 31 — 프로덕션 완전 동기화 + SPEC 정합성 보정 + Phase 4 잔여 보강 + 온보딩 킥오프"
version: 0.1
status: Draft
category: PLAN
system-version: 2.4.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 31 — 프로덕션 완전 동기화 + SPEC 정합성 보정 + Phase 4 잔여 보강 + 온보딩 킥오프

> **Summary**: Sprint 29/30 코드를 프로덕션에 완전 반영(D1 0018~0019 + Workers v2.4.0)하고, SPEC.md drift 5건을 보정하며, Phase 4 잔여 Match Rate(F128 72%, F124 86%)를 90%+ 수준으로 끌어올리고, 내부 온보딩 프로세스 킥오프를 준비한다.
>
> **Project**: Foundry-X
> **Version**: v2.5 (목표)
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 31 — 프로덕션 동기화 + 정합성 + 보강 + 온보딩 킥오프 (F129~F132) |
| **시작** | 2026-03-21 |
| **목표 버전** | v2.5 |
| **F-items** | 4개 (F129 배포동기화, F130 SPEC보정, F131 Match보강, F132 온보딩킥오프) |

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 29/30에서 구현된 온보딩(F120~F122) + 품질 강화(F123~F128) 코드가 프로덕션에 미반영. D1 0018~0019 미적용으로 onboarding_feedback, onboarding_progress 테이블 부재. SPEC.md에 마일스톤·버전·Execution Plan 체크박스 drift 5건 존재. F128 E2E(72%), F124 프론트엔드(86%)가 90% 미달. 온보딩 실행을 위한 프로세스 문서·시나리오가 미정의. |
| **Solution** | (1) D1 0018~0019 remote 적용 + Workers v2.4.0 배포 + Pages 배포 확인 + smoke test, (2) SPEC §1/§2/§3 갱신 + Execution Plan 체크박스 동기화 + MEMORY 보정, (3) F128 E2E 추가 시나리오 + F124 네비게이션 일관성 보강, (4) 온보딩 시나리오 정의 + 내부 5명 초대 프로세스 + 피드백 자동화 확인 |
| **Function/UX Effect** | 프로덕션에서 온보딩 가이드(/getting-started), NPS 피드백 폼, 체크리스트가 실제 동작. 통합 경로 E2E 90%+ 신뢰도. SPEC이 실제 프로젝트 상태와 100% 일치. |
| **Core Value** | "만든 것을 실제로 동작시키고, 기록을 정확히 맞추고, 사람이 쓸 수 있게 준비한다" — Phase 4 Conditional Go에서 Final Go로 가기 위한 마지막 기술 준비 |

---

## 1. Overview

### 1.1 Purpose

Sprint 31은 코드 구현보다 **프로덕션 반영 + 문서 정합성 + 품질 보강 + 프로세스 준비**에 집중하는 스프린트.

**4가지 축:**

1. **프로덕션 완전 동기화** — Sprint 29/30 코드를 프로덕션에 완전 반영
2. **SPEC/문서 정합성 보정** — SPEC.md drift 5건 + MEMORY.md 보정
3. **Phase 4 잔여 Match Rate 보강** — F128(72%)와 F124(86%)를 90%+ 수준으로
4. **온보딩 프로세스 킥오프** — 내부 5명 온보딩 실행을 위한 시나리오·프로세스 정의

### 1.2 Background

- Phase 4 Conditional Go (Sprint 30, 2026-03-21) — 기술 기반 100% 완료
- 온보딩 시작 후 4주 데이터 수집 → Phase 4 최종 Go/Pivot/Kill 판정 예정
- 프로덕션에 Sprint 29/30 코드가 미반영된 상태로는 온보딩 진행 불가
- SPEC.md drift가 누적되면 이후 Phase 5 계획 수립 시 혼란 발생

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V5]] (`docs/specs/prd-v5.md`)
- SPEC: [[FX-SPEC-001]] (`SPEC.md` v5.8)
- Sprint 29 Report: [[FX-RPRT-030]] (archived)
- Sprint 30 Report: [[FX-RPRT-031]]
- Sprint 30 Design: `docs/02-design/features/sprint-30.design.md`

---

## 2. Scope

### 2.1 In Scope

- [x] F129: D1 0018~0019 remote 적용 + Workers v2.4.0 배포 + smoke test
- [ ] F130: SPEC.md §1/§2/§3 보정 + Execution Plan 체크박스 + MEMORY 동기화
- [ ] F131: F128 E2E 보강 (72%→90%+) + F124 프론트엔드 보강 (86%→90%+)
- [ ] F132: 온보딩 시나리오 정의 + 프로세스 문서 + 킥오프 체크리스트

### 2.2 Out of Scope

- 새로운 API 엔드포인트/서비스 추가 (기존 코드 보강만)
- Phase 5 (F116 SR 시나리오, F117 외부 파일럿) — 온보딩 데이터 확보 후
- F112 GitLab API 지원 — 수요 미확인
- UI 대규모 리디자인 — 기존 구현 보강만

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|:--------:|:------:|
| FR-01 | D1 migration 0018 remote 적용 (kpi_events, reconciliation_runs) | P0 | Pending |
| FR-02 | D1 migration 0019 remote 적용 (onboarding_feedback, onboarding_progress) | P0 | Pending |
| FR-03 | Workers v2.4.0 프로덕션 배포 (Sprint 29/30 전체 코드) | P0 | Pending |
| FR-04 | Workers + Pages smoke test (주요 API 엔드포인트 + 웹 페이지 접근 확인) | P0 | Pending |
| FR-05 | SPEC.md §1 Phase 설명 갱신 (Sprint 30까지 완료 반영) | P0 | Pending |
| FR-06 | SPEC.md §2 system-version 2.2.0 → 2.4.0 갱신 | P0 | Pending |
| FR-07 | SPEC.md §3 마일스톤 v2.3/v2.4.0 ✅ 처리 | P0 | Pending |
| FR-08 | Sprint 29/30 Execution Plan 체크박스 `[x]` 동기화 | P0 | Pending |
| FR-09 | SPEC.md §2 D1 remote 상태 보정 (0018~0019 적용 후) | P0 | Pending |
| FR-10 | F128 E2E 추가: iframe SSO→BFF→entity_registry 크로스 쿼리 시나리오 | P1 | Pending |
| FR-11 | F128 E2E 추가: 에러 응답 표준화 검증 시나리오 | P1 | Pending |
| FR-12 | F124 네비게이션: 서브앱 전환 시 breadcrumb/sidebar 일관성 | P1 | Pending |
| FR-13 | 온보딩 시나리오 5종 정의 (신규 사용자 → 첫 프로젝트 생성 → 에이전트 실행 → KPI 확인 → 피드백) | P1 | Pending |
| FR-14 | 온보딩 킥오프 체크리스트 문서 작성 (내부 5명 대상) | P1 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| 배포 안정성 | Workers v2.4.0 배포 후 /health 200 OK | wrangler deploy + curl |
| D1 정합성 | 32 테이블 전체 remote 적용 + 쿼리 정상 | wrangler d1 migrations list --remote |
| 문서 정합성 | SPEC ↔ MEMORY ↔ 실제 상태 100% 일치 | 수동 점검 |
| E2E 커버리지 | F128 Match Rate 90%+ (현재 72%) | gap-detector |
| 프론트엔드 품질 | F124 Match Rate 90%+ (현재 86%) | gap-detector |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] D1 0018~0019 remote 적용 완료 (`wrangler d1 migrations list --remote` 확인)
- [ ] Workers v2.4.0 프로덕션 배포 완료 + /health 200 OK
- [ ] Pages fx.minu.best 정상 접근 (getting-started 페이지 포함)
- [ ] SPEC.md drift 0건 (§1, §2, §3, Execution Plan 전부 현행화)
- [ ] MEMORY.md ↔ SPEC.md 일치
- [ ] F128 E2E Match Rate 90%+
- [ ] F124 프론트엔드 Match Rate 90%+
- [ ] 온보딩 시나리오 문서 완성
- [ ] typecheck 0 error + lint 0 error

### 4.2 Quality Criteria

- [ ] 기존 테스트 전체 통과 (API 583 + CLI 112 + Web 48)
- [ ] 추가 E2E 테스트 통과
- [ ] PDCA Match Rate 93%+

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| D1 0019 migration remote 적용 실패 | High | Low | wrangler d1 execute --remote --command 인라인 방식 폴백 |
| Workers 배포 후 CORS 에러 | Medium | Medium | CORS 미들웨어 확인 + NEXT_PUBLIC_API_URL 환경변수 점검 |
| 프로덕션 smoke test 실패 | High | Low | 로컬 재현 → 핫픽스 → 재배포 |
| F128 E2E 90% 달성 어려움 | Medium | Medium | 핵심 시나리오 우선 + 나머지 Sprint 32로 이관 |
| 온보딩 대상자 5명 확보 어려움 | Medium | Medium | 최소 3명으로 시작, 추후 확대 |

---

## 6. Architecture Considerations

### 6.1 Project Level

- **Selected**: Dynamic ✅ (기존 유지)
- 모노리포 4 패키지 (cli, shared, api, web)

### 6.2 Key Decisions

| Decision | 선택 | 근거 |
|----------|------|------|
| 배포 방식 | wrangler deploy + wrangler d1 migrations apply --remote | 기존 프로세스 유지 |
| E2E 보강 범위 | F128 핵심 시나리오만 | 전체 재작성 아닌 부분 보강 |
| SPEC 보정 방식 | 수동 Edit | 자동화 불필요 (1회성) |
| 온보딩 문서 위치 | docs/specs/onboarding-kickoff.md | PRD v5 §7.17 연계 |

---

## 7. Implementation Order

### Phase A: 프로덕션 동기화 (F129) — 최우선

1. `wrangler d1 migrations apply --remote` (0018, 0019)
2. `wrangler deploy` (Workers v2.4.0)
3. Pages 배포 확인 (GitHub 연동 자동 또는 수동)
4. Smoke test: /health + /api/auth/register + /getting-started

### Phase B: SPEC 정합성 보정 (F130)

1. SPEC.md §1, §2, §3 갱신
2. Sprint 29/30 Execution Plan 체크박스 동기화
3. MEMORY.md 보정
4. INDEX.md 확인

### Phase C: Match Rate 보강 (F131)

1. F128 E2E 추가 시나리오 구현
2. F124 네비게이션 일관성 보강
3. gap-detector로 Match Rate 재측정

### Phase D: 온보딩 킥오프 (F132)

1. 온보딩 시나리오 5종 정의
2. 킥오프 체크리스트 문서 작성
3. 프로덕션 환경에서 시나리오 수동 검증

---

## 8. F-items Summary

| F# | 제목 | REQ | Priority | 범위 |
|----|------|-----|:--------:|------|
| F129 | 프로덕션 완전 동기화 | FX-REQ-129 | P0 | D1 0018~0019 remote + Workers v2.4.0 + smoke test |
| F130 | SPEC/문서 정합성 보정 | FX-REQ-130 | P0 | SPEC §1/§2/§3 + Execution Plan + MEMORY |
| F131 | Phase 4 잔여 Match Rate 보강 | FX-REQ-131 | P1 | F128 E2E 72%→90%+ / F124 86%→90%+ |
| F132 | 온보딩 킥오프 체크리스트 | FX-REQ-132 | P1 | 시나리오 5종 + 프로세스 문서 + 킥오프 준비 |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`sprint-31.design.md`)
2. [ ] SPEC.md에 F129~F132 등록
3. [ ] 구현 착수 (Phase A → B → C → D 순서)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
