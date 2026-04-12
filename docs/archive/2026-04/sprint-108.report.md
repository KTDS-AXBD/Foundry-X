---
code: FX-RPRT-108
title: Sprint 108 — BD 데모 시딩 완료 보고서
version: 1.0
status: Active
category: RPRT
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
---

# Sprint 108 — BD 데모 시딩 완료 보고서

> **Summary**: D1 마이그레이션 0082로 BD 데모 데이터 104 rows 시딩 완료. Match Rate 100%.

---

## Executive Summary

| Item | Value |
|------|-------|
| **Feature** | F279 (BD 데모 시드 데이터) + F280 (bd_artifacts 한글 콘텐츠) |
| **Sprint** | 108 |
| **Date** | 2026-04-02 |
| **Duration** | ~15분 (autopilot) |
| **Match Rate** | **100%** (17/17 검증 항목 통과) |
| **Files** | 1 (0082_bd_demo_seed.sql) |
| **Rows** | 104 rows across 18 tables |
| **Tests** | API 2311/2311 + Typecheck 5/5 |

| Perspective | Content |
|-------------|---------|
| **Problem** | BD 파이프라인 전체 6단계를 보여줄 데모 데이터가 Production에 없어 팀 시연 불가 |
| **Solution** | D1 마이그레이션 0082로 헬스케어AI + GIVC 2개 아이디어를 18 테이블에 104 rows INSERT |
| **Function/UX Effect** | fx.minu.best 접속 시 즉시 6단계 워크쓰루 가능, 각 단계에 분석 결과/산출물/의사결정 이력 |
| **Core Value** | BD팀 온보딩의 결정적 요소 — "빈 도구"가 아닌 "살아있는 시스템" 인식 전환 |

---

## 1. Deliverables

### 1.1 산출물

| # | 산출물 | 경로 | 상태 |
|---|--------|------|------|
| 1 | D1 마이그레이션 | `packages/api/src/db/migrations/0082_bd_demo_seed.sql` | ✅ |
| 2 | Plan 문서 | `docs/01-plan/features/sprint-108.plan.md` | ✅ (기존) |
| 3 | Design 문서 | `docs/02-design/features/sprint-108.design.md` | ✅ (기존) |
| 4 | Analysis 문서 | `docs/03-analysis/features/sprint-108.analysis.md` | ✅ |
| 5 | Report 문서 | `docs/04-report/features/sprint-108.report.md` | ✅ |

### 1.2 데모 아이디어

| 아이디어 | 파이프라인 | 발굴 단계 | O-G-D 점수 | Commit Gate |
|----------|-----------|-----------|-----------|-------------|
| AI 의료기기 품질 예측 (MediQA) | 7단계 완주 (→MVP) | 2-0~2-10 (11단계) | 0.875 | commit |
| 공급망 인과관계 예측 (chatGIVC) | 5단계 (→DECISION) | 2-0~2-6 (7단계) | 0.89 | commit |

### 1.3 테이블별 Row Count

| 테이블 | 헬스케어AI | GIVC | 소계 |
|--------|:---------:|:----:|:----:|
| organizations + users + org_members | 3 (공유) | - | 3 |
| biz_items | 1 | 1 | 2 |
| biz_item_classifications | 1 | 1 | 2 |
| biz_item_starting_points | 1 | 1 | 2 |
| biz_evaluations + scores | 4 | 4 | 8 |
| biz_discovery_criteria | 9 | 9 | 18 |
| pipeline_stages | 7 | 5 | 12 |
| biz_item_discovery_stages | 11 | 7 | 18 |
| ax_viability_checkpoints | 7 | 5 | 12 |
| ax_commit_gates | 1 | 1 | 2 |
| bd_artifacts | 8 | 8 | 16 |
| bdp_versions | 2 | 1 | 3 |
| offering_packs + items | 5 | 0 | 5 |
| mvp_tracking | 1 | 0 | 1 |
| **합계** | **61** | **43** | **104** |

---

## 2. Quality Metrics

| Metric | Result |
|--------|--------|
| Match Rate | **100%** |
| API Tests | 2311/2311 passed |
| Typecheck | 5/5 packages |
| D1 Commands | 105 executed, 0 errors |
| INSERT OR IGNORE | 전체 적용 |
| FK 정합성 | 검증 완료 |

---

## 3. Decisions & Changes

| 항목 | 원래 계획 | 변경 | 사유 |
|------|----------|------|------|
| Migration 번호 | 0081 | **0082** | Sprint 104 F275에서 0081 사용 완료 |
| org_members INSERT | id 컬럼 포함 | **id 컬럼 제거** | 실제 스키마에 id 컬럼 없음 (복합 PK) |

---

## 4. Next Steps

- [ ] **Sprint 109 F281**: Production 배포 (`wrangler d1 migrations apply --remote`) + E2E 검증
- [ ] BD팀 데모 시연 — fx.minu.best에서 6단계 워크쓰루
- [ ] Sprint 110 F282+F283: BD 형상화 Phase A+B+C (병렬 가능)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-02 | Sprint 108 완료 보고 — Match 100% | Sinclair Seo |
