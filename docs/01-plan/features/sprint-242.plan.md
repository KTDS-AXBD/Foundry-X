---
code: FX-PLAN-S242
title: "Sprint 242 Plan — F493 Phase 30 발굴 평가결과서 v2"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-09
updated: 2026-04-09
author: Claude Opus 4.6 (master)
sprint: 242
f_items: [F493]
---

# Sprint 242 Plan — F493 Phase 30 발굴 평가결과서 v2

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 242 |
| F-items | F493 |
| REQ | FX-REQ-485 |
| 우선순위 | P1 |
| 의존성 | 독립 (F296 레거시만 in-place 재작성) |
| 목표 | `/discovery/report` 페이지 전면 개편 — AX BD 9단계 발굴 리치 리포트 |
| 샘플 | `docs/specs/axbd-skill/CLAUDE_AXBD/references/03_AX사업개발_발굴단계완료(안).html` |
| 배경 | 세션 #244 DEBUG 제보 — 3개 아이템(KOAMI/XR Studio/IRIS) 평가결과서 필요 |

## 문제 정의

### 현재 상태 (F296, Sprint 117)
- `/discovery/report` = `EvaluationReportService`가 `bd_artifacts.output_text.length / 500 * 100`으로 score를 산출하는 **플레이스홀더 수준**
- 저장 스키마: `skillScores: Record<string, {score, label, summary200자}>` — 9단계 풍부한 콘텐츠 담기 불가
- 프론트: 간단한 카드 + 막대 + 목록. 샘플 HTML의 카드/표/BMC/SWOT/insight-box/Chart.js와 괴리
- 3개 타겟 biz_item에 `bd_artifacts` 산출물이 0건 → 현 서비스로 생성 시도해도 의미 있는 스코어 불가

### 목표 상태 (F493, Sprint 242)
- `/discovery/report` 경로 그대로 유지하되 콘텐츠가 샘플 HTML 수준의 **9탭 리치 리포트**
- 3개 아이템 수동 fixture 시드 (KOAMI/XR Studio/IRIS, 각각 9단계 콘텐츠)
- `evaluation_reports` 스키마를 확장해 구조화 JSON 저장
- React 컴포넌트로 9탭 렌더링 (카드/메트릭/표/BMC/SWOT/insight-box/next-step)
- 최소 1개 Chart.js 그래프 (react-chartjs-2)

## 범위

### Sprint 242 IN-SCOPE
1. **D1 Migration**: `evaluation_reports.report_data TEXT` 컬럼 추가 (JSON blob, nullable)
2. **Schema (Zod)**: `DiscoveryReportDataSchema` 9탭 구조 정의
3. **API 재작성**: `EvaluationReportService.generateFromFixture(bizItemId)` — fixture 파일 로드 → DB 저장. 기존 `generate()`는 deprecated 유지 (호환)
4. **Fixture JSON 3종**: `packages/api/src/fixtures/discovery-reports/{bi-koami-001,bi-xr-studio-001,bi-iris-001}.json`. 샘플 HTML을 참조한 한국어 콘텐츠
5. **Frontend v2**: `evaluation-report.tsx` 전면 재작성 — 9탭 `Tabs` + 탭별 React 컴포넌트
6. **Tab 컴포넌트 9개**: 단순화 버전 (카드/표/insight-box), 최소 1개 탭에 Chart.js
7. **Seed script**: `scripts/seed-discovery-reports.sh` — 3개 fixture를 prod D1에 insert (idempotent `INSERT OR REPLACE`)
8. **Tests**: 
   - API: service unit test (fixture 로드 + DB insert)
   - Web: evaluation-report.tsx render test (3개 탭 전환)
   - E2E: smoke test (`/discovery/report` → 목록 3건 → 상세 진입 → 9탭 표시)

### OUT-OF-SCOPE (Phase 31+ 이월)
- AI 실시간 생성 파이프라인 (`/generate` 엔드포인트)
- PDF export
- 팀 검토(`ax_team_reviews`) 연동
- 버전 관리 (`trafficLightHistory`는 유지하되 수동 기록만)

## 산출물 체크리스트

- [ ] (F493 🔧) `packages/api/src/db/migrations/0123_evaluation_reports_v2.sql`
- [ ] (F493 🔧) `packages/api/src/modules/gate/schemas/evaluation-report.schema.ts` 확장 (`DiscoveryReportData` Zod)
- [ ] (F493 🔧) `packages/api/src/modules/gate/services/evaluation-report-service.ts` `generateFromFixture()` 추가
- [ ] (F493 🔧) `packages/api/src/fixtures/discovery-reports/bi-koami-001.json`
- [ ] (F493 🔧) `packages/api/src/fixtures/discovery-reports/bi-xr-studio-001.json`
- [ ] (F493 🔧) `packages/api/src/fixtures/discovery-reports/bi-iris-001.json`
- [ ] (F493 🔧) `packages/web/src/routes/ax-bd/evaluation-report.tsx` v2
- [ ] (F493 🔧) `packages/web/src/components/feature/discovery/report-v2/tabs/*.tsx` (9개)
- [ ] (F493 🔧) `packages/web/package.json` `react-chartjs-2` + `chart.js` 추가
- [ ] (F493 🔧) API service test + Web render test + E2E smoke
- [ ] (F493 🔧) `scripts/seed-discovery-reports.sh` — prod D1 seed
- [ ] (F493 🔧) prod D1에 3개 row 적용 확인 + `/discovery/report` 수동 검증

## 수용 기준 (Acceptance)

1. prod `/discovery/report` 접속 시 3개 아이템 목록 렌더 ("KOAMI", "XR Studio", "IRIS")
2. 각 항목 클릭 → 9탭 리치 리포트 진입, 모든 탭 클릭 가능
3. 최소 1개 탭(2-2 시장 검증)에 Chart.js 그래프 표시
4. Match rate ≥ 90%
5. Lint/typecheck/test 전부 통과

## 의존성

- F296 (기존 EvaluationReport) — **in-place 재작성**, deprecation 주석만 남김
- F482 (`bd_artifacts` 동기화) — 향후 AI 파이프라인에서 활용 예정, 이번엔 fixture만
- 공유 org `org_452b33c1` — 3개 biz_item 소유 org

## 리스크 & 완화

| 리스크 | 완화 |
|--------|------|
| Chart.js 번들 크기 증가 | lazy import + 필요한 탭에만 로드 |
| fixture 작성 시간 과다 | 샘플 HTML을 구조 참고만, 콘텐츠는 biz_item 실제 배경 기반 요약 |
| D1 migration drift | `0123_` 번호 확정 전 `ls migrations/*.sql | sort | tail -1`로 확인 |
| prod D1 idempotency | `INSERT OR REPLACE` + `id = 'eval-{biz_item_id}-v1'` 고정 |

## 다음 단계

1. Sprint 242 WT 생성 (`bash -i -c "sprint 242"`)
2. Autopilot 주입 (ccs --model sonnet → /ax:sprint-autopilot)
3. Design은 이미 사전 작성됨 → Do + Analyze 단계 자동 실행
4. Master에서 주기적 tmux capture-pane 모니터링
5. 완료 시 `/ax:sprint merge 242`
