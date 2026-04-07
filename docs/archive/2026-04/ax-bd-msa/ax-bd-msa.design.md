# AX BD MSA 재조정 Design Document

> **Summary**: Foundry-X 118 라우트를 7개 모듈로 분류하고, 단일 Workers 내 디렉토리 모듈화 + harness-kit 패키지를 설계
>
> **Project**: Foundry-X
> **Version**: Phase 20 (api 0.1.0)
> **Author**: Sinclair Seo (AX BD팀)
> **Date**: 2026-04-07
> **Status**: Draft
> **Planning Doc**: [ax-bd-msa.plan.md](../../01-plan/features/ax-bd-msa.plan.md)
> **PRD**: [prd-final.md](../../specs/ax-bd-msa/prd-final.md)

---

## 1. Overview

### 1.1 Design Goals

1. 118 라우트 / 252 서비스 / 133 스키마를 7개 모듈로 분류
2. 단일 Workers + 단일 D1 유지하면서 코드 경계만 분리 (Phase 20-A)
3. harness-kit 패키지로 새 서비스 scaffold 자동 생성 기반 구축 (Phase 20-B)
4. 모든 E2E(263) + API 테스트 100% 통과 유지

### 1.2 Design Principles

- **점진적 이동**: 1개 모듈씩, Sprint마다 git revert 가능한 단위로 이동
- **단일 진입점 유지**: `packages/api/src/index.ts`의 Hono app 구조 변경 없음
- **ESLint 경계 강화**: 모듈 간 직접 import 금지 — 서비스 레이어 통해서만 접근
- **테스트 먼저**: 이동 전/후 테스트 통과 확인 필수

---

## 2. Architecture

### 2.1 현행 구조 (As-Is)

```
packages/api/src/
├── routes/      # 118 파일 (flat)
├── services/    # 252 파일 (flat)
├── schemas/     # 133 파일 (flat)
├── db/          # D1 migrations (0001~0113)
├── middleware/   # auth, cors, tenant 등
└── index.ts     # Hono app (모든 라우트 등록)
```

### 2.2 목표 구조 (To-Be)

```
packages/api/src/
├── core/                         # Foundry-X 잔류 (2~3단계)
│   ├── discovery/                # 발굴 (2-0~2-10)
│   │   ├── routes/
│   │   ├── services/
│   │   └── schemas/
│   └── shaping/                  # 형상화 (BMC/BDP/Offering/PRD/Prototype)
│       ├── routes/
│       ├── services/
│       └── schemas/
├── modules/                      # 이관 대상 (Phase 20 이후 별도 서비스로)
│   ├── auth/                     # → AI Foundry
│   │   ├── routes/
│   │   ├── services/
│   │   └── schemas/
│   ├── portal/                   # → AI Foundry
│   │   ├── routes/
│   │   ├── services/
│   │   └── schemas/
│   ├── gate/                     # → Gate-X
│   │   ├── routes/
│   │   ├── services/
│   │   └── schemas/
│   ├── launch/                   # → Launch-X
│   │   ├── routes/
│   │   ├── services/
│   │   └── schemas/
│   └── infra/                    # 공통 인프라 (Agent Orchestration 등)
│       ├── routes/
│       ├── services/
│       └── schemas/
├── shared/                       # 모듈 간 공유 (최소화)
│   ├── middleware/               # auth, cors, tenant (공통)
│   ├── utils/                    # 공통 유틸리티
│   └── types/                    # 공통 타입
├── db/                           # D1 migrations (변경 없음)
└── index.ts                      # Hono app (라우트 등록 방식만 변경)
```

### 2.3 라우트 등록 구조 변경

```typescript
// Before (현행): packages/api/src/index.ts
import { authRoutes } from './routes/auth';
import { discoveryRoutes } from './routes/discovery';
// ... 118개 import

// After (목표): packages/api/src/index.ts
import { coreRoutes } from './core';        // core/index.ts가 discovery + shaping 묶음
import { moduleRoutes } from './modules';    // modules/index.ts가 auth + portal + gate + launch + infra 묶음

app.route('/api', coreRoutes);
app.route('/api', moduleRoutes);
```

> 외부에서 보는 API 경로는 변경 없음. 내부 코드 구조만 변경.

---

## 3. 라우트 분류 (118개 → 7개 모듈)

### 3.1 core/discovery — 발굴 (38개)

BD 프로세스 2단계 발굴(2-0~2-10) 관련 라우트.

| # | Route File | 설명 |
|---|-----------|------|
| 1 | ax-bd-discovery | 발굴 메인 |
| 2 | ax-bd-skills | 스킬 카탈로그 |
| 3 | ax-bd-progress | 진행 추적 |
| 4 | ax-bd-viability | 사업성 체크포인트 |
| 5 | ax-bd-persona-eval | 페르소나 평가 |
| 6 | ax-bd-evaluations | 평가 결과 |
| 7 | ax-bd-artifacts | BD 산출물 |
| 8 | ax-bd-history | BD 이력 |
| 9 | ax-bd-ideas | 아이디어 |
| 10 | ax-bd-insights | 인사이트 |
| 11 | ax-bd-comments | BD 댓글 |
| 12 | ax-bd-links | BD 링크 |
| 13 | ax-bd-kg | 지식 그래프 |
| 14 | ax-bd-agent | BD 에이전트 |
| 15 | biz-items | 사업 아이템 |
| 16 | collection | 수집 |
| 17 | discovery | 발굴 공통 |
| 18 | discovery-pipeline | 발굴 파이프라인 |
| 19 | discovery-report | 발굴 리포트 (단수) |
| 20 | discovery-reports | 발굴 리포트 (복수) |
| 21 | discovery-stages | 발굴 단계 |
| 22 | discovery-shape-pipeline | 발굴→형상화 전환 |
| 23 | evaluation-report | 평가 결과서 |
| 24 | help-agent | 도움 에이전트 |
| 25 | hitl-review | HITL 리뷰 |
| 26 | ir-proposals | IR 제안 |
| 27 | persona-configs | 페르소나 설정 |
| 28 | persona-evals | 페르소나 평가 |
| 29 | team-reviews | 팀 리뷰 |
| 30 | skill-metrics | 스킬 메트릭 |
| 31 | skill-registry | 스킬 레지스트리 |
| 32 | derived-engine | DERIVED 엔진 |
| 33 | captured-engine | CAPTURED 엔진 |
| 34 | roi-benchmark | ROI 벤치마크 |
| 35 | methodology | 방법론 |
| 36 | sr | 서비스 요청 |
| 37 | entities | 엔티티 |
| 38 | share-links | 공유 링크 |

### 3.2 core/shaping — 형상화 (26개)

BD 프로세스 3단계 형상화(BMC/BDP/Offering/PRD/Prototype) 관련 라우트.

| # | Route File | 설명 |
|---|-----------|------|
| 1 | ax-bd-bmc | BMC 캔버스 |
| 2 | ax-bd-prototypes | 프로토타입 |
| 3 | bdp | 사업계획서 |
| 4 | shaping | 형상화 메인 |
| 5 | offerings | Offering CRUD |
| 6 | offering-sections | Offering 섹션 |
| 7 | offering-export | Offering 내보내기 |
| 8 | offering-validate | Offering 검증 |
| 9 | offering-packs | Offering Pack |
| 10 | offering-metrics | Offering 메트릭 |
| 11 | offering-prototype | Offering 프로토타입 연동 |
| 12 | content-adapter | 콘텐츠 어댑터 |
| 13 | design-tokens | 디자인 토큰 |
| 14 | builder | Prototype Builder |
| 15 | prototype-jobs | Prototype 빌드 작업 |
| 16 | prototype-feedback | Prototype 피드백 |
| 17 | prototype-usage | Prototype 사용량 |
| 18 | ogd-generic | O-G-D 범용 루프 |
| 19 | ogd-quality | O-G-D 품질 |
| 20 | quality-dashboard | 품질 대시보드 |
| 21 | automation-quality | 자동화 품질 |
| 22 | guard-rail | Guard Rail |
| 23 | spec | 스펙 변환 |
| 24 | spec-library | 스펙 라이브러리 |
| 25 | expansion-pack | 확장 팩 |
| 26 | user-evaluations | 사용자 평가 |

### 3.3 modules/auth — 인증/SSO (5개) → AI Foundry

| # | Route File | 설명 |
|---|-----------|------|
| 1 | auth | 인증 메인 (login/signup/refresh) |
| 2 | sso | SSO Hub Token |
| 3 | token | 토큰 관리 |
| 4 | profile | 사용자 프로필 |
| 5 | admin | 관리자 |

### 3.4 modules/portal — 포털 (19개) → AI Foundry

| # | Route File | 설명 |
|---|-----------|------|
| 1 | org | 조직 관리 |
| 2 | org-shared | 조직 공유 |
| 3 | kpi | KPI 메트릭 |
| 4 | metrics | 일반 메트릭 |
| 5 | wiki | 위키 |
| 6 | onboarding | 온보딩 |
| 7 | inbox | Agent Inbox |
| 8 | notifications | 알림 |
| 9 | nps | NPS 피드백 |
| 10 | feedback | 피드백 |
| 11 | feedback-queue | 피드백 큐 |
| 12 | slack | Slack 연동 |
| 13 | github | GitHub 연동 |
| 14 | jira | Jira 연동 |
| 15 | webhook | Webhook |
| 16 | webhook-registry | Webhook 레지스트리 |
| 17 | project-overview | 프로젝트 개요 |
| 18 | party-session | 파티 세션 |
| 19 | reconciliation | 리콘실리에이션 |

### 3.5 modules/gate — 검증 (4개) → Gate-X

| # | Route File | 설명 |
|---|-----------|------|
| 1 | decisions | 의사결정 (Go/Hold/Drop) |
| 2 | gate-package | 게이트 패키지 (ORB/PRB) |
| 3 | validation-meetings | 검증 미팅 |
| 4 | validation-tier | 2-tier 검증 |

### 3.6 modules/launch — 제품화/GTM (5개) → Launch-X

| # | Route File | 설명 |
|---|-----------|------|
| 1 | pipeline | 파이프라인 뷰 |
| 2 | mvp-tracking | MVP 추적 |
| 3 | poc | PoC 관리 |
| 4 | gtm-customers | GTM 고객 |
| 5 | gtm-outreach | GTM 아웃리치 |

### 3.7 modules/infra — 공통 인프라 (21개)

| # | Route File | 설명 |
|---|-----------|------|
| 1 | agent | Agent 관리 |
| 2 | agent-adapters | Agent 어댑터 |
| 3 | agent-definition | Agent 정의 |
| 4 | orchestration | 오케스트레이션 루프 |
| 5 | task-state | 태스크 상태 머신 |
| 6 | execution-events | 실행 이벤트 |
| 7 | pipeline-monitoring | 파이프라인 모니터링 |
| 8 | command-registry | 커맨드 레지스트리 |
| 9 | context-passthrough | 컨텍스트 패스쓰루 |
| 10 | governance | 거버넌스 |
| 11 | requirements | 요구사항 |
| 12 | integrity | 정합성 |
| 13 | freshness | 신선도 |
| 14 | harness | 하네스 |
| 15 | health | 헬스체크 |
| 16 | mcp | MCP 연동 |
| 17 | proxy | 프록시 |
| 18 | shard-doc | 문서 샤딩 |
| 19 | backup-restore | 백업/복구 |
| 20 | audit | 감사 로그 |
| 21 | workflow | 워크플로 |

### 3.8 분류 요약

| 모듈 | 라우트 수 | 비율 | 이관 대상 |
|------|----------|------|-----------|
| core/discovery | 38 | 32% | 잔류 |
| core/shaping | 26 | 22% | 잔류 |
| modules/auth | 5 | 4% | → AI Foundry |
| modules/portal | 19 | 16% | → AI Foundry |
| modules/gate | 4 | 3% | → Gate-X |
| modules/launch | 5 | 4% | → Launch-X |
| modules/infra | 21 | 18% | 공통 (잔류 or 포털) |
| **합계** | **118** | **100%** | |

> **Foundry-X 코어**: 64개 (54%) — 발굴 38 + 형상화 26
> **이관 대상**: 33개 (28%) — auth 5 + portal 19 + gate 4 + launch 5
> **인프라/공통**: 21개 (18%)

---

## 4. D1 테이블 소유권 매핑

### 4.1 크로스 서비스 공유 키

| 테이블.컬럼 | 참조하는 모듈 | 전략 |
|------------|-------------|------|
| `users.id` | 전 모듈 (FK 또는 created_by) | 공유 키 유지, 이벤트 동기화 준비 |
| `orgs.id` | 전 모듈 (tenant_id) | 공유 키 유지 |
| `biz_items.id` | discovery, shaping, gate, launch | 공유 키 유지, 핵심 FK |

### 4.2 서비스별 테이블 소유권 원칙

- 각 테이블은 **단 하나의 모듈**이 소유 (쓰기 권한)
- 다른 모듈은 **읽기만 가능** (향후 API 호출로 전환)
- ESLint 룰로 소유권 위반 감지

---

## 5. harness-kit 패키지 설계

### 5.1 패키지 구조

```
packages/harness-kit/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # 패키지 진입점
│   ├── scaffold/             # 서비스 scaffold 템플릿
│   │   ├── wrangler.toml.template
│   │   ├── src/
│   │   │   ├── index.ts.template
│   │   │   ├── app.ts.template
│   │   │   └── middleware/
│   │   ├── package.json.template
│   │   └── deploy.yml.template
│   ├── middleware/            # 공유 미들웨어
│   │   ├── auth.ts           # JWT 검증 + RBAC
│   │   ├── cors.ts           # CORS 설정
│   │   ├── tenant.ts         # 멀티테넌트 가드
│   │   └── error-handler.ts  # 표준 에러 처리
│   ├── events/               # 이벤트 인터페이스
│   │   ├── event-bus.ts      # EventBus 추상 인터페이스
│   │   ├── d1-event-store.ts # D1 기반 이벤트 저장소
│   │   └── types.ts          # 이벤트 타입 정의
│   ├── d1/                   # D1 유틸리티
│   │   ├── migration.ts      # 마이그레이션 헬퍼
│   │   └── schema-tag.ts     # 테이블 소유권 태깅
│   └── cli/                  # CLI 도구
│       └── create.ts         # `harness create <name>` 명령
├── templates/                # scaffold 원본 템플릿
│   └── service/
└── tests/
```

### 5.2 harness-kit 범위 원칙

| 포함 | 미포함 |
|------|--------|
| Workers scaffold (Hono) | 비즈니스 로직 |
| D1 setup + migration 헬퍼 | 도메인별 스키마 |
| JWT/RBAC 미들웨어 | 서비스별 인증 정책 |
| CORS 설정 | 서비스별 CORS 도메인 |
| 이벤트 인터페이스 | 이벤트 핸들러 구현 |
| CI/CD 템플릿 (deploy.yml) | 서비스별 배포 설정 |
| ESLint 룰 (크로스모듈 접근 금지) | 서비스별 ESLint 설정 |
| 표준 에러 처리 | 도메인별 에러 코드 |

### 5.3 `harness create` CLI

```bash
# 사용법
harness create gate-x

# 생성 결과
gate-x/
├── wrangler.toml          # Workers 설정 (D1 바인딩 포함)
├── package.json           # pnpm workspace 호환
├── tsconfig.json          # strict mode
├── src/
│   ├── index.ts           # Workers 진입점
│   ├── app.ts             # Hono app + harness-kit 미들웨어
│   └── middleware/         # 로컬 미들웨어
├── .github/
│   └── workflows/
│       └── deploy.yml     # D1 migration + Workers deploy + smoke
└── tests/
    └── setup.ts           # D1 mock 설정
```

---

## 6. 이벤트 카탈로그 (8종)

### 6.1 이벤트 스키마

```typescript
// packages/shared/events/types.ts
interface BaseEvent {
  id: string;
  type: string;
  source: string;        // 발행 모듈 (e.g., 'core/discovery')
  timestamp: string;     // ISO 8601
  payload: Record<string, unknown>;
  metadata: {
    correlationId: string;
    causationId?: string;
  };
}
```

### 6.2 이벤트 카탈로그

| # | Event Type | Source | Consumer | Trigger |
|---|-----------|--------|----------|---------|
| 1 | `item.collected` | modules/portal (수집) | core/discovery | 새 아이템 등록 |
| 2 | `item.screened` | core/discovery | core/discovery | 스크리닝 통과 → 발굴 시작 |
| 3 | `discovery.completed` | core/discovery | modules/gate, modules/portal | 발굴 2-8 완료 |
| 4 | `shaping.completed` | core/shaping | modules/gate, modules/portal | 형상화 산출물 완료 |
| 5 | `prototype.deployed` | core/shaping | modules/portal, modules/launch | Prototype 배포 완료 |
| 6 | `validation.decided` | modules/gate | modules/portal, modules/launch | Go/Hold/Drop 결정 |
| 7 | `offering-pack.created` | modules/launch | modules/portal | Offering Pack 완성 |
| 8 | `eval.scored` | modules/infra | modules/portal | 평가 점수 산출 |

### 6.3 EventBus 구현 (D1 기반)

```sql
-- D1 Event Table
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload TEXT NOT NULL,     -- JSON
  metadata TEXT NOT NULL,    -- JSON
  status TEXT DEFAULT 'pending',  -- pending | processing | done | failed
  created_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(type);
```

Cron Trigger (6시간마다 또는 즉시 폴링):
```typescript
// 각 모듈이 자신이 소비하는 이벤트 타입을 폴링
const events = await db.prepare(
  "SELECT * FROM events WHERE type IN (?) AND status = 'pending' ORDER BY created_at LIMIT 10"
).bind(subscribedTypes).all();
```

---

## 7. ESLint 크로스모듈 접근 금지 룰

### 7.1 룰 설계

```javascript
// packages/api/eslint-rules/no-cross-module-import.js
// modules/auth/ 파일에서 core/discovery/ 직접 import 금지
// core/discovery/ 파일에서 modules/gate/ 직접 import 금지
// 허용: shared/ 디렉토리의 공통 타입/미들웨어

const MODULE_BOUNDARIES = {
  'core/discovery': ['core/discovery', 'shared'],
  'core/shaping': ['core/shaping', 'shared', 'core/discovery'], // biz_items FK
  'modules/auth': ['modules/auth', 'shared'],
  'modules/portal': ['modules/portal', 'shared'],
  'modules/gate': ['modules/gate', 'shared'],
  'modules/launch': ['modules/launch', 'shared'],
  'modules/infra': ['modules/infra', 'shared'],
};
```

### 7.2 기존 ESLint 룰과의 관계

| 기존 룰 | 용도 | Phase 20 변경 |
|---------|------|--------------|
| `no-direct-db-in-route` | 라우트에서 DB 직접 접근 금지 | 유지 |
| `require-zod-schema` | 라우트에 Zod 스키마 필수 | 유지 |
| `no-orphan-plumb-import` | Plumb import 제한 | 유지 |
| **`no-cross-module-import`** (신규) | 모듈 간 직접 import 금지 | **추가** |

---

## 8. Strangler Fig 프록시 설계

### 8.1 프록시 미들웨어

```typescript
// packages/api/src/shared/middleware/strangler-proxy.ts
// 이관 대상 라우트를 외부 서비스로 프록시할 수 있는 미들웨어
// Phase 20에서는 프록시 대상 없음 (모든 라우트가 단일 Workers에서 동작)
// 향후 Gate-X 서비스가 생성되면:
//   /api/decisions/* → gate-x.workers.dev/api/decisions/*
```

### 8.2 라우팅 레이어 분리

```typescript
// packages/api/src/index.ts (목표)
const app = new Hono();

// Phase 20-A: 모듈별 라우트 그룹
app.route('/api', coreRoutes);      // core/discovery + core/shaping
app.route('/api', authRoutes);      // modules/auth
app.route('/api', portalRoutes);    // modules/portal
app.route('/api', gateRoutes);      // modules/gate
app.route('/api', launchRoutes);    // modules/launch
app.route('/api', infraRoutes);     // modules/infra

// Phase 20-B: Strangler 프록시 (미래)
// app.route('/api/decisions', stranglerProxy('gate-x'));
```

---

## 9. 테스트 전략

### 9.1 테스트 분류

| 타입 | 현재 | Phase 20 목표 |
|------|------|--------------|
| API 단위 테스트 | 전체 통과 | 모듈별 태깅 + 전체 통과 |
| E2E 테스트 | 263개 (257 pass, 6 skip) | 모듈별 태깅 + 전체 통과 |
| ESLint | 3 커스텀 룰 | 4 커스텀 룰 (+no-cross-module-import) |
| TypeCheck | 전체 통과 | 전체 통과 |

### 9.2 Sprint별 검증 체크리스트

각 Sprint(모듈 이동) 완료 시:
- [ ] `turbo test` 전체 통과
- [ ] `turbo typecheck` 전체 통과
- [ ] `turbo lint` 전체 통과
- [ ] `pnpm e2e` 263개 통과 (또는 skip 6개 유지)
- [ ] Production deploy + smoke test

---

## 10. Security Considerations

- [x] JWT + RBAC 인증 체계 유지 (harness-kit 공통 미들웨어)
- [x] 기존 Secrets 7종 서비스별 분배 계획 (harness-kit에 가이드)
- [ ] 모듈 간 직접 DB 접근 금지 (ESLint 룰)
- [ ] 이벤트 페이로드에 민감 정보 미포함 원칙
- [ ] harness-kit scaffold에 보안 기본값 설정 (CORS strict, rate limit)

---

## 11. Implementation Order

### Phase 20-A: 모듈화 (Sprint 179~184)

| 순서 | Sprint | 작업 | 파일 변경 예상 | 롤백 전략 |
|------|--------|------|-------------|-----------|
| 1 | 179 | 118 라우트 분류 문서 확정 + D1 태깅 | 문서만, 코드 변경 없음 | N/A |
| 2 | 180 | harness-kit 패키지 생성 + ESLint 룰 | +50 파일 (신규 패키지) | `git rm packages/harness-kit` |
| 3 | 181 | auth 5 라우트 + 관련 서비스/스키마 이동 | ~15 파일 이동 | `git revert` |
| 4 | 182 | portal 19 라우트 + 관련 서비스/스키마 이동 | ~55 파일 이동 | `git revert` |
| 5 | 183 | gate 4 + launch 5 라우트 이동 | ~25 파일 이동 | `git revert` |
| 6 | 184 | infra 21 라우트 이동 + core 정리 | ~60 파일 이동 | `git revert` |

### Phase 20-B: 분리 준비 (Sprint 185~188) — 이벤트 + 프록시 + IA 개편

| 순서 | Sprint | 작업 | 파일 변경 예상 |
|------|--------|------|-------------|
| 7 | 185 | 이벤트 카탈로그 + EventBus PoC + **Web IA 개편** (sidebar 서비스 경계 그룹, `/ax-bd/*` redirect, "이관 예정" 라벨, 코어 메뉴 정리) | +20 파일 + sidebar.tsx + router.tsx |
| 8 | 186 | Strangler 프록시 + harness-kit 이벤트 | +10 파일 |
| 9 | 187 | E2E 태깅 + IA E2E 검증 + Gate-X scaffold PoC | ~30 파일 수정 |
| 10 | 188 | Production 배포 + 문서화 | 문서 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-07 | Plan 기반 초안 — 118 라우트 7모듈 분류 + harness-kit + 이벤트 + ESLint 설계 | Sinclair Seo |
