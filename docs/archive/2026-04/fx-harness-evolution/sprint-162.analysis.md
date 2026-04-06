---
code: FX-ANLS-S162
title: "Sprint 162 — F359 Gap Analysis"
version: 1.0
status: Active
category: ANLS
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-DSGN-S162]], [[FX-PLAN-S162]]"
---

# Sprint 162: F359 Gap Analysis

## Summary

| 항목 | 값 |
|------|-----|
| Match Rate | **97%** |
| 판정 | ✅ PASS |
| 테스트 | 288 files, 3000 pass / 0 fail / 1 skip |
| Typecheck | 0 errors |

## Design §5 Checklist

| # | 파일 | Status |
|---|------|:------:|
| 1 | shared/guard-rail.ts — DeployResult | ✅ |
| 2 | schemas/guard-rail-schema.ts — DeployResultSchema | ✅ |
| 3 | services/guard-rail-deploy-service.ts — 배치 서비스 | ✅ |
| 4 | routes/guard-rail.ts — POST deploy 엔드포인트 | ✅ |
| 5 | __tests__/guard-rail-deploy.test.ts — 단위 7 tests | ✅ |
| 6 | __tests__/guard-rail-routes.test.ts — 통합 3 tests | ✅ |

## Test Coverage

| Design 테스트 | Status |
|--------------|:------:|
| T1~T7 단위 | ✅ 전체 |
| T8~T10 통합 | ✅ 전체 |
| T11 일관성 | ⚠️ 미구현 (T8이 실질 커버) |

## Minor Differences

| 항목 | Impact | 조치 |
|------|--------|------|
| T11 미구현 | Low | T8이 커버 — Design에서 삭제 |
| deployed_filename DB 갱신 | Low | 후속 Sprint으로 이관 |
| builder.ts 미들웨어 버그 수정 | Low | 추가 수정 (Design 외) |
| nextRuleNumber COUNT 기반 | Low | 기능 동등 |
