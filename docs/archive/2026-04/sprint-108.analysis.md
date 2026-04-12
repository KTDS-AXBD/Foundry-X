---
code: FX-ANLS-108
title: Sprint 108 — BD 데모 시딩 Gap Analysis
version: 1.0
status: Active
category: ANLS
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
---

# Sprint 108 — BD 데모 시딩 Gap Analysis

> **Match Rate: 100%**
>
> **Design**: [[FX-DSGN-108]] sprint-108.design.md
> **Implementation**: `packages/api/src/db/migrations/0082_bd_demo_seed.sql`
> **Sprint**: 108 (F279+F280)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | Sprint 108 — BD 데모 시딩 (F279+F280) |
| **Date** | 2026-04-02 |
| **Duration** | 1 session |
| **Match Rate** | **100%** |
| **Items** | 17/17 검증 항목 통과 |
| **Files** | 1 file (0082_bd_demo_seed.sql) |
| **Rows** | 104 rows across 18 tables |

| Perspective | Content |
|-------------|---------|
| **Problem** | BD 파이프라인 데모용 실제감 있는 시드 데이터 부재 |
| **Solution** | D1 마이그레이션 0082로 2개 아이디어 × 18 테이블 104 rows INSERT |
| **Function/UX Effect** | fx.minu.best 접속 시 즉시 6단계 워크쓰루 가능 |
| **Core Value** | BD팀 온보딩 + 내부 채택의 "살아있는 시스템" 인식 전환 |

---

## V-01 ~ V-17 검증 결과

| # | 검증 항목 | Status | 비고 |
|---|----------|:------:|------|
| V-01 | 마이그레이션 파일 존재 | ✅ | 0082 (의도적 변경, 0081은 skill_registry) |
| V-02 | biz_items 2건 | ✅ | hc-001, gv-001 ID/title/description/status 일치 |
| V-03 | biz_item_classifications 2건 | ✅ | confidence 0.92/0.87, 3-turn 답변 포함 |
| V-04 | biz_item_starting_points 2건 | ✅ | hc: tech(0.91), gv: market(0.88) |
| V-05 | biz_evaluations 2건 + scores 6건 | ✅ | 3 persona × 8차원, hc avg 8.2, gv avg 7.8 |
| V-06 | biz_discovery_criteria 18건 | ✅ | hc: 9 completed, gv: 7 completed + 2 pending |
| V-07 | pipeline_stages 12건 | ✅ | hc: 7단계 완주, gv: 5단계 |
| V-08 | biz_item_discovery_stages 18건 | ✅ | hc: 11(2-0~2-10), gv: 7(2-0~2-6) |
| V-09 | ax_viability_checkpoints 12건 | ✅ | 전부 go, question+reason 상세 |
| V-10 | ax_commit_gates 2건 | ✅ | 4 Q&A + final_decision=commit |
| V-11 | bd_artifacts 16건 | ✅ | 8hc+8gv, Markdown 한글, 구체적 수치 |
| V-12 | bdp_versions 3건 | ✅ | hc v1+v2(final), gv v1 |
| V-13 | offering_packs 1건 + items 4건 | ✅ | hc만, 4종 아이템 |
| V-14 | mvp_tracking 1건 | ✅ | hc만, released |
| V-15 | INSERT OR IGNORE 전체 적용 | ✅ | 105 commands 전부 |
| V-16 | D1 local apply 성공 | ✅ | 에러 0건 |
| V-17 | API 기존 테스트 통과 | ✅ | 2311/2311 pass |

---

## 테이블별 Row Count 대조

| 테이블 | Design | Impl | Match |
|--------|:------:|:----:|:-----:|
| organizations | 1 | 1 | ✅ |
| users | 1 | 1 | ✅ |
| org_members | 1 | 1 | ✅ |
| biz_items | 2 | 2 | ✅ |
| biz_item_classifications | 2 | 2 | ✅ |
| biz_item_starting_points | 2 | 2 | ✅ |
| biz_evaluations | 2 | 2 | ✅ |
| biz_evaluation_scores | 6 | 6 | ✅ |
| biz_discovery_criteria | 18 | 18 | ✅ |
| pipeline_stages | 12 | 12 | ✅ |
| biz_item_discovery_stages | 18 | 18 | ✅ |
| ax_viability_checkpoints | 12 | 12 | ✅ |
| ax_commit_gates | 2 | 2 | ✅ |
| bd_artifacts | 16 | 16 | ✅ |
| bdp_versions | 3 | 3 | ✅ |
| offering_packs | 1 | 1 | ✅ |
| offering_pack_items | 4 | 4 | ✅ |
| mvp_tracking | 1 | 1 | ✅ |
| **합계** | **104** | **104** | ✅ |

---

## 의도적 변경

| 항목 | Design | Implementation | 사유 |
|------|--------|----------------|------|
| Migration 번호 | 0081 | 0082 | Sprint 104 F275에서 0081 사용 완료 |

---

## 품질 검증

| 항목 | 결과 |
|------|------|
| API Tests | 2311/2311 passed ✅ |
| Typecheck | 5/5 packages passed ✅ |
| D1 Local Apply | 105 commands, 0 errors ✅ |
| INSERT OR IGNORE | 전체 적용 ✅ |
| FK 의존성 순서 | 준수 ✅ |
| 한글 콘텐츠 | 16건 실무 수준 ✅ |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-02 | Initial analysis — Match 100% | Sinclair Seo |
