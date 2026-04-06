---
code: FX-DSGN-S183
title: "Sprint 183 Design — F397 Gate+Launch 모듈 분리"
version: 1.0
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
planning_doc: "[[FX-PLAN-S183]]"
---

# Sprint 183 Design — Gate + Launch 모듈 분리

## 1. Overview

Gate(검증) 도메인 7 routes + 7 services + 6 schemas = 20개 파일을 `modules/gate/`로,
Launch(제품화/GTM) 도메인 8 routes + 14 services + 8 schemas = 30개 파일을 `modules/launch/`로 이동한다.
Sprint 181~182에서 확립한 모듈 분리 패턴(git mv + re-export + app.ts 리팩토링)을 동일하게 적용한다.

---

## 2. Gate Module — File Mapping

### 2.1 Routes (7개)

| # | 원본 (routes/) | 이동 후 (modules/gate/routes/) | Export Name |
|---|---------------|-------------------------------|-------------|
| 1 | ax-bd-evaluations.ts | ax-bd-evaluations.ts | axBdEvaluationsRoute |
| 2 | decisions.ts | decisions.ts | decisionsRoute |
| 3 | evaluation-report.ts | evaluation-report.ts | evaluationReportRoute |
| 4 | gate-package.ts | gate-package.ts | gatePackageRoute |
| 5 | team-reviews.ts | team-reviews.ts | teamReviewsRoute |
| 6 | validation-meetings.ts | validation-meetings.ts | validationMeetingsRoute |
| 7 | validation-tier.ts | validation-tier.ts | validationTierRoute |

### 2.2 Services (7개)

| # | 원본 (services/) | 이동 후 (modules/gate/services/) |
|---|-----------------|--------------------------------|
| 1 | decision-service.ts | decision-service.ts |
| 2 | evaluation-criteria.ts | evaluation-criteria.ts |
| 3 | evaluation-report-service.ts | evaluation-report-service.ts |
| 4 | evaluation-service.ts | evaluation-service.ts |
| 5 | gate-package-service.ts | gate-package-service.ts |
| 6 | meeting-service.ts | meeting-service.ts |
| 7 | validation-service.ts | validation-service.ts |

### 2.3 Schemas (6개)

| # | 원본 (schemas/) | 이동 후 (modules/gate/schemas/) |
|---|----------------|-------------------------------|
| 1 | decision.schema.ts | decision.schema.ts |
| 2 | evaluation.schema.ts | evaluation.schema.ts |
| 3 | evaluation-report.schema.ts | evaluation-report.schema.ts |
| 4 | gate-package.schema.ts | gate-package.schema.ts |
| 5 | team-review-schema.ts | team-review-schema.ts |
| 6 | validation.schema.ts | validation.schema.ts |

### 2.4 modules/gate/index.ts

```typescript
// modules/gate — Gate module (Phase 20-A: F397, Sprint 183)
// 검증 도메인: 평가, 의사결정, 게이트 패키지, 팀 리뷰, 검증 미팅/티어
// 7 routes: ax-bd-evaluations, decisions, evaluation-report, gate-package,
//           team-reviews, validation-meetings, validation-tier
export { axBdEvaluationsRoute } from "./routes/ax-bd-evaluations.js";
export { decisionsRoute } from "./routes/decisions.js";
export { evaluationReportRoute } from "./routes/evaluation-report.js";
export { gatePackageRoute } from "./routes/gate-package.js";
export { teamReviewsRoute } from "./routes/team-reviews.js";
export { validationMeetingsRoute } from "./routes/validation-meetings.js";
export { validationTierRoute } from "./routes/validation-tier.js";
```

---

## 3. Launch Module — File Mapping

### 3.1 Routes (8개)

| # | 원본 (routes/) | 이동 후 (modules/launch/routes/) | Export Name |
|---|---------------|--------------------------------|-------------|
| 1 | gtm-customers.ts | gtm-customers.ts | gtmCustomersRoute |
| 2 | gtm-outreach.ts | gtm-outreach.ts | gtmOutreachRoute |
| 3 | mvp-tracking.ts | mvp-tracking.ts | mvpTrackingRoute |
| 4 | offering-packs.ts | offering-packs.ts | offeringPacksRoute |
| 5 | pipeline.ts | pipeline.ts | pipelineRoute |
| 6 | pipeline-monitoring.ts | pipeline-monitoring.ts | pipelineMonitoringRoute |
| 7 | poc.ts | poc.ts | pocRoute |
| 8 | share-links.ts | share-links.ts | shareLinksRoute |

### 3.2 Services (14개)

| # | 원본 (services/) | 이동 후 (modules/launch/services/) |
|---|-----------------|----------------------------------|
| 1 | gtm-customer-service.ts | gtm-customer-service.ts |
| 2 | gtm-outreach-service.ts | gtm-outreach-service.ts |
| 3 | mvp-tracking-service.ts | mvp-tracking-service.ts |
| 4 | offering-pack-service.ts | offering-pack-service.ts |
| 5 | outreach-proposal-service.ts | outreach-proposal-service.ts |
| 6 | pipeline-checkpoint-service.ts | pipeline-checkpoint-service.ts |
| 7 | pipeline-error-handler.ts | pipeline-error-handler.ts |
| 8 | pipeline-notification-service.ts | pipeline-notification-service.ts |
| 9 | pipeline-permission-service.ts | pipeline-permission-service.ts |
| 10 | pipeline-service.ts | pipeline-service.ts |
| 11 | pipeline-state-machine.ts | pipeline-state-machine.ts |
| 12 | poc-env-service.ts | poc-env-service.ts |
| 13 | poc-service.ts | poc-service.ts |
| 14 | share-link-service.ts | share-link-service.ts |

### 3.3 Schemas (8개)

| # | 원본 (schemas/) | 이동 후 (modules/launch/schemas/) |
|---|----------------|--------------------------------|
| 1 | gtm-customer.schema.ts | gtm-customer.schema.ts |
| 2 | gtm-outreach.schema.ts | gtm-outreach.schema.ts |
| 3 | mvp-tracking.schema.ts | mvp-tracking.schema.ts |
| 4 | offering-pack.schema.ts | offering-pack.schema.ts |
| 5 | pipeline.schema.ts | pipeline.schema.ts |
| 6 | pipeline-monitoring.schema.ts | pipeline-monitoring.schema.ts |
| 7 | poc.schema.ts | poc.schema.ts |
| 8 | share-link.schema.ts | share-link.schema.ts |

### 3.4 modules/launch/index.ts

```typescript
// modules/launch — Launch module (Phase 20-A: F397, Sprint 183)
// 제품화/GTM 도메인: 파이프라인, PoC, MVP 추적, GTM, Offering Pack, 공유 링크
// 8 routes: gtm-customers, gtm-outreach, mvp-tracking, offering-packs,
//           pipeline, pipeline-monitoring, poc, share-links
export { gtmCustomersRoute } from "./routes/gtm-customers.js";
export { gtmOutreachRoute } from "./routes/gtm-outreach.js";
export { mvpTrackingRoute } from "./routes/mvp-tracking.js";
export { offeringPacksRoute } from "./routes/offering-packs.js";
export { pipelineRoute } from "./routes/pipeline.js";
export { pipelineMonitoringRoute } from "./routes/pipeline-monitoring.js";
export { pocRoute } from "./routes/poc.js";
export { shareLinksRoute } from "./routes/share-links.js";
```

---

## 4. modules/index.ts 갱신

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

// Sprint 183: gate 모듈 (검증 → Gate-X)
export {
  axBdEvaluationsRoute, decisionsRoute, evaluationReportRoute,
  gatePackageRoute, teamReviewsRoute, validationMeetingsRoute,
  validationTierRoute,
} from "./gate/index.js";

// Sprint 183: launch 모듈 (제품화/GTM → Launch-X)
export {
  gtmCustomersRoute, gtmOutreachRoute, mvpTrackingRoute,
  offeringPacksRoute, pipelineRoute, pipelineMonitoringRoute,
  pocRoute, shareLinksRoute,
} from "./launch/index.js";

// Sprint 184: infra 모듈 (예정)
```

---

## 5. app.ts 변경

### 5.1 Import 제거 (15개 라인)

아래 import를 제거하고, modules/index.ts에서 통합 import:

```typescript
// 제거 대상 (Gate)
import { axBdEvaluationsRoute } from "./routes/ax-bd-evaluations.js";     // line 42
import { decisionsRoute } from "./routes/decisions.js";                   // line 56
import { evaluationReportRoute } from "./routes/evaluation-report.js";    // line 92
import { gatePackageRoute } from "./routes/gate-package.js";              // line 59
import { teamReviewsRoute } from "./routes/team-reviews.js";              // line 116
import { validationMeetingsRoute } from "./routes/validation-meetings.js"; // line 90
import { validationTierRoute } from "./routes/validation-tier.js";        // line 89

// 제거 대상 (Launch)
import { gtmCustomersRoute } from "./routes/gtm-customers.js";           // line 95
import { gtmOutreachRoute } from "./routes/gtm-outreach.js";             // line 96
import { mvpTrackingRoute } from "./routes/mvp-tracking.js";             // line 62
import { offeringPacksRoute } from "./routes/offering-packs.js";         // line 61
import { pipelineRoute } from "./routes/pipeline.js";                    // line 53
import { pipelineMonitoringRoute } from "./routes/pipeline-monitoring.js"; // line 100
import { pocRoute } from "./routes/poc.js";                               // line 94
import { shareLinksRoute } from "./routes/share-links.js";               // line 54
```

### 5.2 Import 추가 (modules/index.ts 확장)

기존 modules/portal/index.js import에 gate + launch를 추가:

```typescript
import {
  // auth (Sprint 181)
  authRoute, ssoRoute, tokenRoute, profileRoute, adminRoute,
  // portal (Sprint 182)
  orgRoute, orgSharedRoute, kpiRoute, metricsRoute, wikiRoute,
  onboardingRoute, inboxRoute, notificationsRoute, npsRoute,
  feedbackRoute, feedbackQueueRoute, slackRoute, githubRoute,
  jiraRoute, webhookRoute, webhookRegistryRoute, webhookInboundRoute,
  projectOverviewRoute, partySessionRoute, reconciliationRoute,
  // gate (Sprint 183)
  axBdEvaluationsRoute, decisionsRoute, evaluationReportRoute,
  gatePackageRoute, teamReviewsRoute, validationMeetingsRoute,
  validationTierRoute,
  // launch (Sprint 183)
  gtmCustomersRoute, gtmOutreachRoute, mvpTrackingRoute,
  offeringPacksRoute, pipelineRoute, pipelineMonitoringRoute,
  pocRoute, shareLinksRoute,
} from "./modules/index.js";
```

### 5.3 app.route() 등록

`app.route()` 호출은 변경 없음 — 변수명이 동일하므로 import 소스만 바뀜.

---

## 6. Import 경로 수정

### 6.1 Gate 내부 참조 (서비스 ↔ 스키마)

이동된 파일 내부의 상대 import 경로를 `../../services/` → `../services/`, `../../schemas/` → `../schemas/` 등으로 수정.
단, 모듈 외부(core 등) 파일을 참조하는 경우는 `../../../services/` 형태로 역참조.

### 6.2 Launch 내부 참조

동일 패턴 적용.

### 6.3 외부 → Gate/Launch 참조

다른 모듈이나 core에서 gate/launch 서비스를 직접 import하는 경우가 있으면 경로 수정.
`no-cross-module-import` ESLint 룰에 의해 모듈 간 직접 참조는 경고 발생 — 허용 가능한 범위에서만.

---

## 7. Verification Checklist

- [ ] G-1: `modules/gate/` 디렉토리 생성 (routes/ + services/ + schemas/)
- [ ] G-2: Gate 7 routes `git mv` 완료
- [ ] G-3: Gate 7 services `git mv` 완료
- [ ] G-4: Gate 6 schemas `git mv` 완료
- [ ] G-5: `modules/gate/index.ts` 생성 (7 route export)
- [ ] L-1: `modules/launch/` 디렉토리 생성 (routes/ + services/ + schemas/)
- [ ] L-2: Launch 8 routes `git mv` 완료
- [ ] L-3: Launch 14 services `git mv` 완료
- [ ] L-4: Launch 8 schemas `git mv` 완료
- [ ] L-5: `modules/launch/index.ts` 생성 (8 route export)
- [ ] M-1: `modules/index.ts` 갱신 (gate + launch export)
- [ ] A-1: app.ts import 15개 제거 + modules/ 통합 import 확장
- [ ] I-1: 이동 파일 내부 import 경로 수정 (상대 경로 조정)
- [ ] I-2: 외부 → gate/launch 참조 경로 수정
- [ ] V-1: `turbo typecheck` 통과
- [ ] V-2: `pnpm test` 통과 (api 패키지)
- [ ] V-3: `turbo lint` 통과
