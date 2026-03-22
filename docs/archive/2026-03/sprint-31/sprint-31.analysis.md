---
code: FX-ANLS-031
title: "Sprint 31 Gap Analysis — 프로덕션 동기화 + SPEC 보정 + Match Rate 보강 + 온보딩 킥오프"
version: 0.1
status: Active
category: ANLS
system-version: 2.4.0
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# Sprint 31 Gap Analysis

## Overall Match Rate: 95%

| F# | 제목 | Match Rate | 비고 |
|----|------|:----------:|------|
| F129 | 프로덕션 완전 동기화 | 100% | D1 0019 + Workers v2.4.0 + smoke test |
| F130 | SPEC 정합성 보정 | 95% | §1~§9 갱신, F-item 상태는 PDCA 후 갱신 |
| F131 | Match Rate 보강 | 90% | E2E +6, ServiceContainer FX_NAVIGATE 연결 |
| F132 | 온보딩 킥오프 | 95% | S1~S5 + Go/Kill 기준 초과 구현 |
| **Overall** | | **95%** | |

---

## Gap 목록

| # | F# | Design 명세 | 구현 | Impact | 상태 |
|---|:--:|------------|------|:------:|:----:|
| G1 | F130 | F129~F132 완료 시 ✅ 전환 | 📋 유지 | Low | 의도적 (PDCA 후 일괄) |
| G2 | F131 | ErrorResponse `{ error: { code, message } }` nested | `{ error: "string" }` flat | Medium | 실제 API 동작에 맞게 조정 |

---

## F129 분석 (100%)

- D1 migrations: `d1_migrations` 테이블 확인 — 0001~0019 전체 적용
- Workers: v2.4.0 배포 (fe2f72a7), 1375KB, Cron `0 */6 * * *`
- Smoke: Pages 200 OK, Protected API 401 (정상), D1 onboarding tables 존재 확인
- 환경변수: JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY 설정 완료

## F130 분석 (95%)

**갱신 완료 (17/18 항목):**
- SPEC frontmatter: v5.9, system-version 2.4.0
- §1 Phase: "Phase 4 Conditional Go — Sprint 26~30 완료"
- §2 tests: 583, D1 remote 0001~0019, Workers v2.4.0
- §3 마일스톤: v2.3.0 ✅, v2.4.0 ✅
- §5 F-items: Sprint 31 섹션 (F129~F132)
- §6 Execution Plan: Sprint 29/30 전체 [x], Sprint 31 추가
- §9: v5.9 변경 이력
- MEMORY.md: Workers/D1/검증수치/다음작업 보정

**Gap G1**: F129~F132 상태 📋 유지 — Sprint 31 PDCA 완료 확정 후 일괄 ✅ 전환 예정

## F131 분석 (90%)

**ServiceContainer.tsx (100% Match):**
- `useRouter` from `next/navigation` 추가
- `serviceName?` prop + breadcrumb `${serviceName} / ${title}`
- `FX_NAVIGATE` → `router.push(data.path)` 연결 (path.startsWith('/') 검증)

**E2E (+6 tests, Design +4 대비 초과):**
- integration-path.spec.ts: ErrorResponse 검증, Harness Rules API, KPI 대시보드 (+3)
- onboarding-flow.spec.ts: feature cards/FAQ, NPS form, checklist progress (+3 신규 파일)

**Gap G2**: ErrorResponse 스키마 — Design은 nested object, 구현은 flat string. 실제 API가 `{ error: "message" }` 반환하므로 구현이 현실적.

## F132 분석 (95%)

**문서 완성도 (Design 초과):**
- 시나리오 S1~S5: 절차/기대결과/KPI이벤트/예상소요 상세화
- Go 판정 기준: NPS 6+, WAU 5+, 에이전트 완료율 70%+
- Kill 신호: 이전 서비스 사용 30%+, 문의 50건/주, NPS 3 미만
- 지원 체계: Slack + 주간 설문 + 1:1 인터뷰
- 킥오프 일정: Week 0~4

---

## 산출물 요약

| 유형 | 파일 | 변경 |
|------|------|------|
| 수정 | SPEC.md | v5.8→5.9, §1~§9 보정, F129~F132 등록, Sprint 29/30 체크박스 |
| 수정 | MEMORY.md | Workers/D1/검증수치/다음작업 |
| 수정 | ServiceContainer.tsx | +useRouter, +serviceName, FX_NAVIGATE 연결 |
| 수정 | integration-path.spec.ts | +3 E2E 시나리오 |
| 신규 | onboarding-flow.spec.ts | 3 E2E 테스트 |
| 신규 | onboarding-kickoff.md | 온보딩 시나리오 5종 + 킥오프 체크리스트 |
| 배포 | Workers v2.4.0 | fe2f72a7, D1 0019 포함 |
