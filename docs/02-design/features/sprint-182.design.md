---
code: FX-DSGN-S182
title: "Sprint 182 Design — F396 Portal 모듈 분리 (modules/portal/)"
version: 1.0
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
planning_doc: "[[FX-PLAN-S182]]"
---

# Sprint 182 Design — Portal 모듈 분리

## 1. Overview

Portal 도메인 19개 라우트 + 23개 서비스 + 16개 스키마를 `modules/portal/`로 이동한다.
Sprint 181에서 확립한 Auth 모듈 분리 패턴을 동일하게 적용한다.

---

## 2. File Mapping

### 2.1 Routes (19개)

| # | 원본 | 이동 후 | Export Name |
|---|------|---------|-------------|
| 1 | routes/org.ts | modules/portal/routes/org.ts | orgRoute |
| 2 | routes/org-shared.ts | modules/portal/routes/org-shared.ts | orgSharedRoute |
| 3 | routes/kpi.ts | modules/portal/routes/kpi.ts | kpiRoute |
| 4 | routes/metrics.ts | modules/portal/routes/metrics.ts | metricsRoute |
| 5 | routes/wiki.ts | modules/portal/routes/wiki.ts | wikiRoute |
| 6 | routes/onboarding.ts | modules/portal/routes/onboarding.ts | onboardingRoute |
| 7 | routes/inbox.ts | modules/portal/routes/inbox.ts | inboxRoute |
| 8 | routes/notifications.ts | modules/portal/routes/notifications.ts | notificationsRoute |
| 9 | routes/nps.ts | modules/portal/routes/nps.ts | npsRoute |
| 10 | routes/feedback.ts | modules/portal/routes/feedback.ts | feedbackRoute |
| 11 | routes/feedback-queue.ts | modules/portal/routes/feedback-queue.ts | feedbackQueueRoute |
| 12 | routes/slack.ts | modules/portal/routes/slack.ts | slackRoute |
| 13 | routes/github.ts | modules/portal/routes/github.ts | githubRoute |
| 14 | routes/jira.ts | modules/portal/routes/jira.ts | jiraRoute |
| 15 | routes/webhook.ts | modules/portal/routes/webhook.ts | webhookRoute |
| 16 | routes/webhook-registry.ts | modules/portal/routes/webhook-registry.ts | webhookRegistryRoute, webhookInboundRoute |
| 17 | routes/project-overview.ts | modules/portal/routes/project-overview.ts | projectOverviewRoute |
| 18 | routes/party-session.ts | modules/portal/routes/party-session.ts | partySessionRoute |
| 19 | routes/reconciliation.ts | modules/portal/routes/reconciliation.ts | reconciliationRoute |

### 2.2 Services (23개)

| # | 원본 | 이동 후 |
|---|------|---------|
| 1 | services/org.ts | modules/portal/services/org.ts |
| 2 | services/org-shared-service.ts | modules/portal/services/org-shared-service.ts |
| 3 | services/kpi-service.ts | modules/portal/services/kpi-service.ts |
| 4 | services/kpi-logger.ts | modules/portal/services/kpi-logger.ts |
| 5 | services/metrics-service.ts | modules/portal/services/metrics-service.ts |
| 6 | services/wiki-sync.ts | modules/portal/services/wiki-sync.ts |
| 7 | services/onboarding-progress.ts | modules/portal/services/onboarding-progress.ts |
| 8 | services/notification-service.ts | modules/portal/services/notification-service.ts |
| 9 | services/nps-service.ts | modules/portal/services/nps-service.ts |
| 10 | services/feedback.ts | modules/portal/services/feedback.ts |
| 11 | services/feedback-loop-context.ts | modules/portal/services/feedback-loop-context.ts |
| 12 | services/feedback-queue-service.ts | modules/portal/services/feedback-queue-service.ts |
| 13 | services/slack.ts | modules/portal/services/slack.ts |
| 14 | services/slack-notification-service.ts | modules/portal/services/slack-notification-service.ts |
| 15 | services/github.ts | modules/portal/services/github.ts |
| 16 | services/github-sync.ts | modules/portal/services/github-sync.ts |
| 17 | services/github-review.ts | modules/portal/services/github-review.ts |
| 18 | services/jira-adapter.ts | modules/portal/services/jira-adapter.ts |
| 19 | services/jira-sync.ts | modules/portal/services/jira-sync.ts |
| 20 | services/webhook-registry.ts | modules/portal/services/webhook-registry.ts |
| 21 | services/project-overview.ts | modules/portal/services/project-overview.ts |
| 22 | services/party-session.ts | modules/portal/services/party-session.ts |
| 23 | services/reconciliation.ts | modules/portal/services/reconciliation.ts |

### 2.3 Schemas (16개)

| # | 원본 | 이동 후 |
|---|------|---------|
| 1 | schemas/org.ts | modules/portal/schemas/org.ts |
| 2 | schemas/org-shared.ts | modules/portal/schemas/org-shared.ts |
| 3 | schemas/kpi.ts | modules/portal/schemas/kpi.ts |
| 4 | schemas/metrics-schema.ts | modules/portal/schemas/metrics-schema.ts |
| 5 | schemas/wiki.ts | modules/portal/schemas/wiki.ts |
| 6 | schemas/onboarding.ts | modules/portal/schemas/onboarding.ts |
| 7 | schemas/inbox.ts | modules/portal/schemas/inbox.ts |
| 8 | schemas/nps.ts | modules/portal/schemas/nps.ts |
| 9 | schemas/feedback.ts | modules/portal/schemas/feedback.ts |
| 10 | schemas/feedback-queue.ts | modules/portal/schemas/feedback-queue.ts |
| 11 | schemas/slack.ts | modules/portal/schemas/slack.ts |
| 12 | schemas/github.ts | modules/portal/schemas/github.ts |
| 13 | schemas/jira.ts | modules/portal/schemas/jira.ts |
| 14 | schemas/webhook.ts | modules/portal/schemas/webhook.ts |
| 15 | schemas/party-session.ts | modules/portal/schemas/party-session.ts |
| 16 | schemas/reconciliation.ts | modules/portal/schemas/reconciliation.ts |

### 2.4 없는 파일 (스키마/서비스)

- `schemas/notifications.ts` — 없음 (notifications 라우트는 인라인 스키마 사용)
- `schemas/project-overview.ts` — 없음 (project-overview 라우트는 인라인 스키마 사용)
- `services/inbox-*.ts` — 없음 (inbox 라우트는 직접 D1 쿼리)

---

## 3. Index Files

### 3.1 modules/portal/index.ts

```typescript
// modules/portal — Portal module (Phase 20-A: F396, Sprint 182)
// 19 routes: org, org-shared, kpi, metrics, wiki, onboarding, inbox,
//            notifications, nps, feedback, feedback-queue, slack, github,
//            jira, webhook, webhook-registry, project-overview, party-session, reconciliation
export { orgRoute } from "./routes/org.js";
export { orgSharedRoute } from "./routes/org-shared.js";
export { kpiRoute } from "./routes/kpi.js";
export { metricsRoute } from "./routes/metrics.js";
export { wikiRoute } from "./routes/wiki.js";
export { onboardingRoute } from "./routes/onboarding.js";
export { inboxRoute } from "./routes/inbox.js";
export { notificationsRoute } from "./routes/notifications.js";
export { npsRoute } from "./routes/nps.js";
export { feedbackRoute } from "./routes/feedback.js";
export { feedbackQueueRoute } from "./routes/feedback-queue.js";
export { slackRoute } from "./routes/slack.js";
export { githubRoute } from "./routes/github.js";
export { jiraRoute } from "./routes/jira.js";
export { webhookRoute } from "./routes/webhook.js";
export { webhookRegistryRoute, webhookInboundRoute } from "./routes/webhook-registry.js";
export { projectOverviewRoute } from "./routes/project-overview.js";
export { partySessionRoute } from "./routes/party-session.js";
export { reconciliationRoute } from "./routes/reconciliation.js";
```

### 3.2 modules/index.ts 갱신

```typescript
// modules/ — Phase 20-A 모듈화 (이관 대상, 향후 별도 서비스로)
// Sprint 181: auth 모듈
export { authRoute, ssoRoute, tokenRoute, profileRoute, adminRoute } from "./auth/index.js";

// Sprint 182: portal 모듈
export {
  orgRoute, orgSharedRoute, kpiRoute, metricsRoute, wikiRoute,
  onboardingRoute, inboxRoute, notificationsRoute, npsRoute,
  feedbackRoute, feedbackQueueRoute, slackRoute, githubRoute,
  jiraRoute, webhookRoute, webhookRegistryRoute, webhookInboundRoute,
  projectOverviewRoute, partySessionRoute, reconciliationRoute,
} from "./portal/index.js";

// Sprint 183: gate + launch 모듈 (예정)
// Sprint 184: infra 모듈 (예정)
```

---

## 4. app.ts Import 변경

### 4.1 삭제할 import 라인

`routes/` 직접 import 중 portal에 해당하는 19개 import를 삭제:
- wiki, kpi, metrics, org, org-shared, project-overview, webhook-registry, jira, webhook, inbox, slack, github, reconciliation, feedback, feedback-queue, onboarding, nps, notifications, party-session

### 4.2 추가할 import 라인

```typescript
// Sprint 182: Portal module (F396 — modules/portal/)
import {
  orgRoute, orgSharedRoute, kpiRoute, metricsRoute, wikiRoute,
  onboardingRoute, inboxRoute, notificationsRoute, npsRoute,
  feedbackRoute, feedbackQueueRoute, slackRoute, githubRoute,
  jiraRoute, webhookRoute, webhookRegistryRoute, webhookInboundRoute,
  projectOverviewRoute, partySessionRoute, reconciliationRoute,
} from "./modules/portal/index.js";
```

### 4.3 미들웨어 등록 순서 — 변경 없음

`app.route()` 호출 순서와 위치는 **완전히 동일하게 유지**한다.
import 소스만 `./routes/X.js` → `./modules/portal/index.js`로 변경.

---

## 5. Import 경로 수정 규칙

이동된 파일들의 상대 경로 수정:

| 참조 대상 | 원본 경로 | 이동 후 경로 |
|-----------|----------|-------------|
| db/index.js | `../db/index.js` | `../../../db/index.js` |
| db/schema.js | `../db/schema.js` | `../../../db/schema.js` |
| middleware/*.js | `../middleware/*.js` | `../../../middleware/*.js` |
| utils/*.js | `../utils/*.js` | `../../../utils/*.js` |
| env.js | `../env.js` | `../../../env.js` |
| 모듈 내 서비스 | `../services/*.js` | `../services/*.js` (변경 없음) |
| 모듈 내 스키마 | `../schemas/*.js` | `../schemas/*.js` (변경 없음) |
| 다른 모듈(auth) 서비스 | `../services/sso.js` | `../../auth/services/sso.js` (ESLint 경고) |

### 5.1 크로스모듈 의존성 확인 필요

Portal 라우트가 Auth 서비스를 직접 참조하는 경우가 있을 수 있다.
이 경우 `no-cross-module-import` ESLint 룰에 걸릴 수 있으므로, 공통 유틸(middleware, db, utils)을 통해 우회하거나, 허용 목록에 추가한다.

---

## 6. Test Impact

### 6.1 수정 필요한 테스트 파일

Portal 서비스를 import하는 테스트 파일의 경로 수정이 필요할 수 있다.
Sprint 181에서는 5개 테스트 파일 수정이 필요했다.

**확인 대상**: `grep -r "from.*services/(org|kpi|wiki|slack|github|jira|feedback|nps|reconciliation|notification|webhook-registry|onboarding|party-session|project-overview|metrics)" packages/api/src/__tests__/`

### 6.2 검증 기준

| 항목 | 기준 |
|------|------|
| typecheck | `turbo typecheck` 0 errors |
| test | `turbo test` — 기존 3161+ tests 전체 통과 |
| lint | `turbo lint` — no-cross-module-import 포함 통과 |

---

## 7. Checklist

- [ ] 19 route 파일을 modules/portal/routes/로 이동
- [ ] 23 service 파일을 modules/portal/services/로 이동
- [ ] 16 schema 파일을 modules/portal/schemas/로 이동
- [ ] modules/portal/index.ts — 19 route re-export
- [ ] modules/index.ts — portal exports 추가
- [ ] app.ts — import 소스 변경 (등록 순서 유지)
- [ ] 이동된 파일 내부 상대 경로 수정
- [ ] 테스트 파일 import 경로 수정
- [ ] typecheck 통과
- [ ] test 통과
- [ ] lint 통과
