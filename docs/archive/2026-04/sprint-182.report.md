---
code: FX-RPRT-S182
title: "Sprint 182 Completion Report — Portal 모듈 분리 (F396)"
version: 1.0
status: Active
category: RPRT
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 182 Completion Report

## Executive Summary

| Item | Value |
|------|-------|
| **Feature** | F396 — Dashboard/KPI/Wiki → `modules/portal/` 모듈 분리 |
| **Sprint** | 182 |
| **Phase** | Phase 20-A (AX BD MSA 재조정 — 코드 모듈화) |
| **Duration** | 1 session |
| **Match Rate** | 100% (11/11 PASS) |
| **Test Result** | 309 files, 3161 passed, 1 skipped, 0 failed |
| **Files Changed** | 59 moved + 52 import path fixes = 111 total |

| Perspective | Content |
|-------------|---------|
| **Problem** | Portal 19개 라우트(Dashboard/KPI/Wiki/통합 등)가 flat `routes/`에 혼재 — 도메인 경계 없음 |
| **Solution** | 19 routes + 23 services + 17 schemas를 `modules/portal/`로 이동, 인덱스 파일로 단일 진입점, app.ts 리팩토링 |
| **Function/UX Effect** | Portal 도메인 독립 개발/테스트 가능, 기존 API 경로 100% 호환 유지, 미들웨어 순서 완전 보존 |
| **Core Value** | MSA 전환 2단계 완성 — Auth(5) + Portal(19) = 24개 라우트 모듈화 완료, AI Foundry 서비스 분리 기반 확립 |

---

## 1. Scope Delivered

### 1.1 Portal Module (modules/portal/)

| Layer | Files | Contents |
|-------|-------|----------|
| routes/ | 19 | org, org-shared, kpi, metrics, wiki, onboarding, inbox, notifications, nps, feedback, feedback-queue, slack, github, jira, webhook, webhook-registry, project-overview, party-session, reconciliation |
| services/ | 23 | org, org-shared-service, kpi-service, kpi-logger, metrics-service, wiki-sync, onboarding-progress, notification-service, nps-service, feedback, feedback-loop-context, feedback-queue-service, slack, slack-notification-service, github, github-sync, github-review, jira-adapter, jira-sync, webhook-registry, project-overview, party-session, reconciliation |
| schemas/ | 17 | org, org-shared, kpi, metrics-schema, wiki, onboarding, inbox, nps, feedback, feedback-queue, slack, github, jira, webhook, party-session, reconciliation, notification.schema |
| index.ts | 1 | 19 route re-exports |
| **Total** | **60** | |

### 1.2 Supporting Changes

- `modules/index.ts` — portal exports 추가 (auth + portal)
- `app.ts` — 19개 import 소스를 `./routes/X.js` → `./modules/portal/index.js`로 변경, 등록 순서 유지
- `modules/auth/routes/auth.ts` — OrgService/OrgSchema 경로를 `../../portal/`로 수정
- `scheduled.ts` — github, reconciliation, kpi-logger 경로 수정
- 8개 root services — portal 서비스 참조 경로 수정
- 6개 root routes — portal 서비스 참조 경로 수정
- 19+ test files — import 경로 + vi.mock 경로 수정
- ESLint `no-cross-module-import` — auth↔portal 상호 참조 허용 (AI Foundry 동일 대상)

### 1.3 Out of Scope (as designed)

- Gate/Launch 모듈 이동 → Sprint 183
- Infra 모듈 이동 → Sprint 184
- Core 정리 → Sprint 183~184

---

## 2. Progress Summary

### Phase 20-A 모듈화 진행률

| Module | Routes | Status | Sprint |
|--------|--------|--------|--------|
| modules/auth | 5 | ✅ 완료 | 181 |
| modules/portal | 19 | ✅ 완료 | 182 |
| modules/gate | 4 | 📋 예정 | 183 |
| modules/launch | 5 | 📋 예정 | 183 |
| modules/infra | 21 | 📋 예정 | 184 |
| core/discovery | 38 | 📋 예정 | 183~184 |
| core/shaping | 26 | 📋 예정 | 183~184 |
| **Total** | **118** | **24/118 (20%)** | |

---

## 3. Lessons Learned

1. **크로스모듈 의존성 발견**: auth → portal (OrgService), root services → portal services. Design에서 예상하지 못한 파급 효과가 있었음
2. **vi.mock 경로 주의**: 정적 import뿐 아니라 vi.mock, 동적 import 경로도 모두 수정 필요
3. **notification.schema.ts 발견**: Design의 파일 목록에 없었으나, 실제로 notifications 라우트가 사용하는 스키마 파일 존재 (17번째 스키마)
4. **shared 패키지 빌드**: Worktree에서 `packages/shared`의 dist가 없으면 `@foundry-x/shared` import 실패 → `pnpm build` 선행 필요
