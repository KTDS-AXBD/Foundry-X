---
code: FX-ANLS-114
title: Sprint 114 Gap Analysis — Route Namespace 마이그레이션 (F290)
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 114
f-items: F290
phase: "Phase 11-A"
refs: FX-DSGN-114
---

# Sprint 114 Gap Analysis — F290 Route Namespace 마이그레이션

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | F290 — Route Namespace 마이그레이션 |
| **Sprint** | 114 |
| **Match Rate** | **100%** (22/22 PASS) |
| **Changed Files** | 30개 (src 16 + e2e 14) |
| **Changed Lines** | +155 / -118 |

---

## Gap Analysis Matrix

### 1. router.tsx — 프로세스 경로 전환 (22건)

| # | Design 명세 | 구현 상태 | PASS/FAIL |
|:-:|-------------|----------|:---------:|
| 1 | `sr` → `collection/sr` | ✅ | PASS |
| 2 | `sr/:id` → `collection/sr/:id` | ✅ | PASS |
| 3 | `discovery/collection` → `collection/field` | ✅ | PASS |
| 4 | `ir-proposals` → `collection/ideas` | ✅ | PASS |
| 5 | `ax-bd/discovery` → `discovery/items` | ✅ | PASS |
| 6 | `ax-bd/discovery/:id` → `discovery/items/:id` | ✅ | PASS |
| 7 | `ax-bd/ideas-bmc` → `discovery/ideas-bmc` | ✅ | PASS |
| 8 | `ax-bd/discover-dashboard` → `discovery/dashboard` | ✅ | PASS |
| 9 | `discovery-progress` → `discovery/progress` | ✅ | PASS |
| 10 | `spec-generator` → `shaping/prd` | ✅ | PASS |
| 11 | `ax-bd` → `shaping/proposal` | ✅ | PASS |
| 12 | `ax-bd/shaping` → `shaping/review` | ✅ | PASS |
| 13 | `ax-bd/shaping/:runId` → `shaping/review/:runId` | ✅ | PASS |
| 14 | `offering-packs` → `shaping/offering` | ✅ | PASS |
| 15 | `offering-packs/givc-pitch` → `shaping/offering/givc-pitch` | ✅ | PASS |
| 16 | `offering-packs/:id` → `shaping/offering/:id` | ✅ | PASS |
| 17 | `pipeline` → `validation/pipeline` | ✅ | PASS |
| 18 | `mvp-tracking` → `product/mvp` | ✅ | PASS |
| 19 | `projects` → `gtm/projects` | ✅ | PASS |
| 20 | `discovery` → `external/discovery-x` | ✅ | PASS |
| 21 | `foundry` → `external/foundry` | ✅ | PASS |
| 22 | ax-bd 하위 13건 유지 | ✅ | PASS |

### 2. Redirect 등록 (16건)

| # | from → to | 구현 | PASS/FAIL |
|:-:|-----------|------|:---------:|
| 1 | `/sr` → `/collection/sr` | ✅ `<Navigate replace>` | PASS |
| 2 | `/discovery/collection` → `/collection/field` | ✅ | PASS |
| 3 | `/ir-proposals` → `/collection/ideas` | ✅ | PASS |
| 4 | `/ax-bd/discovery` → `/discovery/items` | ✅ | PASS |
| 5 | `/ax-bd/ideas-bmc` → `/discovery/ideas-bmc` | ✅ | PASS |
| 6 | `/ax-bd/discover-dashboard` → `/discovery/dashboard` | ✅ | PASS |
| 7 | `/discovery-progress` → `/discovery/progress` | ✅ | PASS |
| 8 | `/spec-generator` → `/shaping/prd` | ✅ | PASS |
| 9 | `/ax-bd` → `/shaping/proposal` | ✅ | PASS |
| 10 | `/ax-bd/shaping` → `/shaping/review` | ✅ | PASS |
| 11 | `/offering-packs` → `/shaping/offering` | ✅ | PASS |
| 12 | `/pipeline` → `/validation/pipeline` | ✅ | PASS |
| 13 | `/mvp-tracking` → `/product/mvp` | ✅ | PASS |
| 14 | `/projects` → `/gtm/projects` | ✅ | PASS |
| 15 | `/discovery` → `/external/discovery-x` | ✅ | PASS |
| 16 | `/foundry` → `/external/foundry` | ✅ | PASS |

### 3. sidebar.tsx href 갱신 (16건)

| 항목 | 구현 | PASS/FAIL |
|------|------|:---------:|
| 수집 3건 (sr, field, ideas) | ✅ | PASS |
| 발굴 3건 (items, ideas-bmc, dashboard) | ✅ | PASS |
| 형상화 4건 (prd, proposal, review, offering) | ✅ | PASS |
| 검증 1건 (pipeline) | ✅ | PASS |
| 제품화 1건 (mvp) | ✅ | PASS |
| GTM 1건 (projects) | ✅ | PASS |
| 외부서비스 2건 (discovery-x, foundry) | ✅ | PASS |

### 4. ProcessStageGuide.tsx (6 stages)

| Stage | paths 갱신 | nextAction 갱신 | PASS/FAIL |
|:-----:|:----------:|:--------------:|:---------:|
| 1-수집 | ✅ | ✅ `/discovery/items` | PASS |
| 2-발굴 | ✅ | ✅ `/shaping/prd` | PASS |
| 3-형상화 | ✅ | ✅ `/validation/pipeline` | PASS |
| 4-검증 | ✅ | ✅ `/product/mvp` | PASS |
| 5-제품화 | ✅ | ✅ `/gtm/projects` | PASS |
| 6-GTM | ✅ | `/dashboard` (변경 없음) | PASS |

### 5. 컴포넌트 내부 링크 갱신

| 파일 | 변경 항목 | PASS/FAIL |
|------|----------|:---------:|
| dashboard.tsx | quickActions 3건 | PASS |
| getting-started.tsx | workflowCards 3건 | PASS |
| MemberQuickStart.tsx | href 1건 | PASS |
| AdminQuickGuide.tsx | href 1건 | PASS |
| CoworkSetupGuide.tsx | href 1건 | PASS |
| ax-bd/progress.tsx | Link 1건 | PASS |
| ax-bd/discovery-detail.tsx | Link 1건 | PASS |
| ax-bd/shaping-detail.tsx | Link 1건 | PASS |
| ax-bd/bdp-detail.tsx | Link 1건 | PASS |
| offering-pack-detail.tsx | Link 1건 | PASS |
| offering-pack-givc-pitch.tsx | Link 1건 | PASS |
| sr-detail.tsx | Link 1건 | PASS |
| ax-bd/ontology.tsx | Link 1건 (Design 외 추가 발견) | PASS |

### 6. E2E 테스트 경로 갱신

| spec 파일 | 변경 건수 | PASS/FAIL |
|-----------|:---------:|:---------:|
| spec-generator.spec.ts | 2건 | PASS |
| pipeline-dashboard.spec.ts | 4건 | PASS |
| ax-bd-hub.spec.ts | 2건 | PASS |
| conflict-resolution.spec.ts | 3건 | PASS |
| share-links.spec.ts | 1건 | PASS |
| bd-demo-walkthrough.spec.ts | 1건 | PASS |
| discovery-tour.spec.ts | 3건 | PASS |
| prod/critical-path.spec.ts | 1건 | PASS |
| auth-flow.spec.ts | 1건 | PASS |
| hitl-review.spec.ts | 4건 | PASS |
| help-agent.spec.ts | 4건 | PASS |
| shaping.spec.ts | 5건 | PASS |
| discovery-wizard.spec.ts | 4건 | PASS |
| uncovered-pages.spec.ts | 3건 | PASS |

### 7. 품질 검증

| 검증 항목 | 결과 | PASS/FAIL |
|----------|------|:---------:|
| `pnpm typecheck` | 에러 0건 | PASS |
| `pnpm test` | 287/287 pass | PASS |
| `pnpm build` | 성공 (501ms) | PASS |

---

## Summary

- **Total Items**: 22
- **PASS**: 22
- **FAIL**: 0
- **Match Rate**: **100%**
- **추가 발견**: ontology.tsx의 `/ax-bd` 링크도 `/shaping/proposal`로 갱신 (Design 명세에 없었으나 sweep에서 발견)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial analysis — Match 100% | Sinclair Seo |
