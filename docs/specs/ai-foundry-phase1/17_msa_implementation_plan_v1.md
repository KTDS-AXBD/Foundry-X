# 15. MSA 적용 구현 계획서 v1

**버전:** v1
**날짜:** 2026-05-04
**작성자:** Sinclair Seo (KTDS-AXBD AX컨설팅팀, PM 겸 프로그래머)
**기반 문서:** prd-final.md (2026-05-02) + 02_ai_foundry_phase1_v0.3.md + 07_ai_foundry_os_target_architecture.md + 08_build_plan_v1.md + **09 dev_plan_guard_x / 10 dev_plan_launch_x / 11 dev_plan_diagnostic / 12 dev_plan_cross_org** + **14_repo_status_audit_v1.md** (선행)
**조사 방식:** 14 문서 5 repo 라이브 분석 결과 + 기존 09~12 dev plan 4개 흡수 + Foundry-X 기존 MSA 원칙(`core/{domain}/` 전용, types.ts contract, Hono sub-app) 준용
**적용 범위 (사용자 선택):** ① Foundry-X core/{guard,launch,diagnostic,cross-org,multi-tenant}/ sub-app 5개 신설 ② Multi-Tenant PostgreSQL schema 격리 + RBAC 5역할 + KT DS SSO ③ Audit Log Bus + Event Driven 통합
**기존 문서와의 관계:** 09~12 dev plan은 4 sub-app 개별 dev spec + WBS. 본 15는 (a) 14 라이브 검증 결과 반영 (b) **multi-tenant 5번째 sub-app + Audit-Bus 횡단 dev plan을 신규 추가** (c) 5 sub-app + 2 횡단을 W18~W29 통합 sprint 매핑. 09~12는 본 15의 §2.1.4 우선순위표 안에 sub-app 단위로 흡수됨.
**분류:** 기업비밀 II급 — 사내 코어팀 한정

---

## 0. 한 줄 결론

7월 MVP까지 12주 안에 PRD MVP 8개 P0를 다 채우려면, **MSA 신규 작업은 Foundry-X 단일 모노리포 안의 5개 신규 sub-app과 그것들이 공유할 3개 횡단 레이어(PG schema 격리, KT DS SSO, Audit Log Bus)로 응집**해야 한다. Foundry-X는 이미 15 packages × 10 sub-app + Strangler MSA가 진행 중이므로 **신규 패턴이 아니라 기존 패턴 위 5개 추가**이고, 가장 큰 외부 의존성은 PostgreSQL 인프라(D1→PG 전환) 의사결정 1건이다. 12주 일정 안에서 가장 위험한 critical path는 **W19까지 Conditional C-1·C-2·C-4 게이트 통과 → W20~W22 5 sub-app 스캐폴드 + PG PoC → W22~W26 5-Layer α1~α4 통합 빌드 + Cross-Org default-deny 코드 강제**의 3단계.

---

## 1. 적용 원칙 (5가지)

### 1.1 Foundry-X MSA 원칙 그대로 준수
- `core/{domain}/` 전용 디렉토리, 도메인 간 직접 import **금지**
- 도메인 간 통신은 **types.ts contract**(zod schema)로만
- Hono sub-app 패턴 (`new Hono()` 인스턴스를 mount)
- 기존 10 sub-app(agent/collection/decode-bridge/discovery/events/files/harness/offering/shaping/verification)과 동등한 위계로 5개 추가

### 1.2 Strangler Fig 점진 전환
- 기존 middleware(role-guard, constraint-guard, tenant)는 신규 core/guard, core/multi-tenant로 **흡수 후 제거**
- 한 번에 갈아엎지 않고 라우트 단위로 전환
- 각 sub-app은 **자체 Wrangler binding + types.ts**

### 1.3 Contract First
- 5 sub-app은 코드 작성 전에 **types.ts + OpenAPI(zod-openapi) 먼저** 합의
- Contract는 PR 1건으로 분리 머지 → 5 repo 외부 합의(Decode-X·Discovery-X·AXIS-DS·ax-plugin 측) 가능

### 1.4 Default-Deny
- 모든 신규 sub-app은 **거부가 기본**, 명시적 RBAC 권한 부여로만 접근
- 특히 cross-org/core_differentiator는 코드 레벨 default-deny (PRD §4.1 #4)

### 1.5 PRD §6.2 기존 결정 준수
- AXIS-DS v1.2(React 19/Tailwind 4) / Foundry-X 모노리포 packages/api / Cloudflare Workers + D1 + **PG** + Git + Redis / 다중 LLM Tier Router / Knowledge Map = 파일+Git+PG (Graph/Vector DB 미사용)
- 단, D1은 기존 BD 파이프라인 운영 유지, **신규 본부별 데이터만 PG**로 — 동시 운영(dual storage) 패턴

---

## 2. 영역별 설계 상세

### 2.1 Foundry-X `core/{guard,launch,diagnostic,cross-org,multi-tenant}/` 5 Sub-App 설계

#### 2.1.1 디렉토리 구조 (신규)

```
packages/api/src/core/
├── (기존 10 sub-app: agent/ collection/ decode-bridge/ discovery/
│   events/ files/ harness/ offering/ shaping/ verification/)
├── guard/                          [NEW]
│   ├── index.ts                    Hono sub-app entry (mount: /api/v1/guard)
│   ├── types.ts                    GuardDecision, GuardPolicy, ConstraintRule (zod)
│   ├── routes/
│   │   ├── evaluate.ts             POST /evaluate — 정책 평가
│   │   ├── policies.ts             CRUD constraint policies
│   │   └── audit.ts                GET /audit — 차단 이력
│   ├── services/
│   │   ├── default-deny.ts         RBAC 미부여 시 거부
│   │   ├── core-diff-guard.ts      core_differentiator 보호 (cross-org와 contract)
│   │   └── pii-mask.ts             기존 middleware/pii-masker 흡수
│   └── tests/
├── launch/                         [NEW]
│   ├── index.ts                    mount: /api/v1/launch
│   ├── types.ts                    LaunchArtifact, LaunchManifest, RolloutPolicy
│   ├── routes/
│   │   ├── package.ts              POST /package — zip 패키징 (정책팩)
│   │   ├── rollout.ts              POST /rollout — blue-green
│   │   └── rollback.ts             POST /rollback — < 30초 (PRD §4.5)
│   ├── services/
│   │   ├── packager.ts             skill-package zip
│   │   ├── canary.ts               type-1 canary
│   │   └── rollback-runner.ts      zip 교체
│   └── tests/
├── diagnostic/                     [NEW]
│   ├── index.ts                    mount: /api/v1/diagnostic
│   ├── types.ts                    DiagnosisFinding, DiagnosisSeverity (Decode-X와 contract)
│   ├── routes/
│   │   ├── findings.ts             GET/POST findings
│   │   ├── trigger.ts              POST /trigger — 4대 진단 자동 실행
│   │   └── kpi.ts                  GET /kpi — 일자별 카드 집계
│   ├── services/
│   │   ├── ingest-from-decode.ts   Decode-X analysis.completed 수신·정규화
│   │   ├── 4-diagnoses.ts          missing/duplicate/overspec/inconsistency 통합
│   │   └── auto-trigger.ts         기존 DiagnosticCollector(F530/F537/F582) 재사용
│   └── tests/
├── cross-org/                      [NEW]
│   ├── index.ts                    mount: /api/v1/cross-org
│   ├── types.ts                    ServiceGroup(4 enum), CrossOrgComparison, ComparisonItem
│   ├── routes/
│   │   ├── compare.ts              POST /compare — 본부 간 정책 비교
│   │   ├── classify.ts             POST /classify — 4그룹 분류
│   │   └── core-diff.ts            GET /core-diff — core_differentiator 자산 (Guard 협조)
│   ├── services/
│   │   ├── classifier.ts           common_standard / org_specific / tacit_knowledge / core_differentiator
│   │   ├── default-deny-policy.ts  core_diff export 차단 (Guard에 결정 위임)
│   │   └── threshold.ts            본부 SME 임계 워크샵 결과 적용
│   └── tests/
└── multi-tenant/                   [NEW]
    ├── index.ts                    mount: /api/v1/multi-tenant
    ├── types.ts                    Tenant, TenantPolicy, RbacRole(5 enum)
    ├── routes/
    │   ├── tenants.ts              CRUD 본부 인스턴스
    │   ├── members.ts              본부별 사용자/역할
    │   └── sso-callback.ts         KT DS SSO OIDC/SAML 콜백
    ├── services/
    │   ├── tenant-resolver.ts      X-Tenant-Id header → schema 결정
    │   ├── rbac.ts                 5역할(Admin/Reviewer/Approver/Operator/Auditor)
    │   ├── pg-schema.ts            본부별 PostgreSQL schema 라우팅
    │   └── sso-adapter.ts          KT DS SSO (arctic 또는 자체)
    └── tests/
```

#### 2.1.2 도메인 간 Contract (types.ts 의존)

```
guard ──── (GuardDecision contract) ──── cross-org
guard ──── (TenantContext contract) ──── multi-tenant
diagnostic ──── (DiagnosisFinding contract) ──── decode-bridge ←Decode-X
launch ──── (LaunchArtifact contract) ──── offering / shaping
cross-org ──── (ServiceGroup contract) ──── decode-bridge ←Decode-X
multi-tenant ──── (Tenant contract) ──── 모든 sub-app (요청 컨텍스트)
```

- 화살표는 contract 의존 방향만 표시. **런타임 코드 import는 없음.**
- types.ts 파일은 `packages/shared-contracts/`에 미러링 (cross-repo 사용 시 — Decode-X·Discovery-X·AXIS-DS가 npm 의존)

#### 2.1.3 Hono Mount 패턴 (예시)

```typescript
// packages/api/src/index.ts
import { Hono } from "hono";
import guard from "./core/guard";
import launch from "./core/launch";
import diagnostic from "./core/diagnostic";
import crossOrg from "./core/cross-org";
import multiTenant from "./core/multi-tenant";

const app = new Hono();

// 기존 10 sub-app mount 생략

app.route("/api/v1/guard", guard);
app.route("/api/v1/launch", launch);
app.route("/api/v1/diagnostic", diagnostic);
app.route("/api/v1/cross-org", crossOrg);
app.route("/api/v1/multi-tenant", multiTenant);

// 모든 라우트 공통: tenant-resolver middleware (multi-tenant/services에서 export)
app.use("*", tenantResolver, defaultDenyGuard);

export default app;
```

#### 2.1.4 우선순위 + Sprint 매핑

| Sub-app | 우선순위 | Sprint | F-item 후보 | 의존 |
|---|---|---|---|---|
| **multi-tenant** | 1 (모든 sub-app 컨텍스트) | W20~W22 | F600 multi-tenant scaffold + tenant-resolver / F601 RBAC 5역할 / F602 KT DS SSO PoC | PG (§2.2) |
| **guard** | 2 (default-deny 코드 강제) | W21~W23 | F605 guard scaffold + default-deny / F606 core-diff-guard / F607 기존 middleware 흡수 | multi-tenant |
| **cross-org** | 3 (4그룹 분류) | W22~W24 | F610 cross-org scaffold / F611 4 enum + classifier / F612 core_diff default-deny 정책 | guard, decode-bridge |
| **diagnostic** | 4 (4대 진단 통합) | W22~W25 | F615 diagnostic scaffold / F616 ingest-from-decode / F617 4-diagnoses 통합 / F618 KPI 집계 | decode-bridge |
| **launch** | 5 (정책팩 export) | W24~W27 | F620 launch scaffold / F621 packager / F622 canary + rollback | guard, cross-org |

---

### 2.2 Multi-Tenant PostgreSQL Schema 격리 + RBAC 5역할 + KT DS SSO

#### 2.2.1 PG 인프라 의사결정 — 옵션 비교

PRD 오픈 이슈 #2 ("RDS multi-schema vs 별도 DB"). 본 계획은 **옵션 A (RDS multi-schema)**를 권고.

| 옵션 | 설명 | 장점 | 단점 | 권고 |
|---|---|---|---|---|
| **A. Cloudflare Hyperdrive + 외부 PostgreSQL multi-schema** | 단일 PG 인스턴스, 본부별 schema (`ax`, `public`, `finance`, `enterprise`) | 비용 효율 / 운영 단순 / Hyperdrive 캐싱 | RLS 설계 필수, 운영 사고 시 영향도 | **★ 권고** |
| B. 본부별 별도 PG 인스턴스 | tenant마다 분리 DB | 강한 격리 / 권한 사고 0 | 비용 4배 / 본부 추가 시 인프라 작업 | Phase 4 이후 fallback |
| C. D1 유지 (논리적 격리만) | 현재 D1 + tenant_id 컬럼 | 인프라 변경 0 | PRD §6.2와 충돌 / KT DS SSO·SQL 표준 부재 | 비권고 (PRD 위반) |

#### 2.2.2 옵션 A 상세 설계

```
PostgreSQL (단일 인스턴스, 외부 RDS 또는 사내)
├── schema: ax              (Platform Owner — AX컨설팅팀)
├── schema: tenant_finance  (금융사업본부)
├── schema: tenant_public   (공공사업본부)
└── schema: tenant_enterprise (기업사업본부, MVP fallback)

각 schema 동일 테이블 셋:
- decisions / policies / diagnoses / comparisons / audit_log / users / role_assignments

연결:
Cloudflare Workers → Hyperdrive 게이트 → RDS PostgreSQL (TLS, IP 제한)
```

**RLS (Row-Level Security)** 정책:
```sql
-- 모든 테이블 RLS 활성화
ALTER TABLE finance.decisions ENABLE ROW LEVEL SECURITY;

-- 본부 외 사용자 SELECT 금지 (Auditor 예외)
CREATE POLICY tenant_isolation ON finance.decisions
  FOR ALL
  USING (
    current_setting('app.tenant_id') = 'finance'
    OR current_setting('app.role') IN ('admin', 'auditor')
  );
```

**Connection Pooling**: Hyperdrive (Workers 30 conns 제한 대응) + PgBouncer (RDS 측 1k conns 풀)

#### 2.2.3 RBAC 5역할 (PRD §6.4 명시)

| 역할 | 권한 범위 | 위임 주체 | 자동/수동 |
|---|---|---|---|
| **Admin** | 전 본부 + 인프라 + RBAC 부여 | AX컨설팅팀장 | 수동 (소수) |
| **Reviewer** | 자기 본부 진단 결과 1차 결정 | 본부장 | 수동 |
| **Approver** | 자기 본부 정책팩 승인 | 본부장 (Conditional C-2 4번 안건) | 수동 |
| **Operator** | 자기 본부 SME — 정책팩 작성 | 본부장 위임 | 수동 |
| **Auditor** | 전 본부 read-only + audit log | AXBD 임원 | 수동 (감사 기간 한정) |

**Default-Deny**: 사용자가 어떤 RBAC role도 없으면 모든 API에서 401. multi-tenant/services/rbac.ts에서 강제.

#### 2.2.4 KT DS SSO 어댑터

**프로토콜**: KT DS Identity Provider 사양에 맞춰 OIDC 우선, SAML fallback.

**구현 흐름**:
```
1. 사용자가 fx.minu.best 접근 → 미인증
2. /api/v1/multi-tenant/sso-login → KT DS IdP 리다이렉트
3. IdP에서 SSO → /api/v1/multi-tenant/sso-callback (state + code)
4. arctic 라이브러리로 token 검증 → IdP user_id + 부서 코드
5. 부서 코드 → tenant_resolver.ts에서 schema 결정 (예: '금융사업본부' → tenant_finance)
6. JWT 발급 (X-Tenant-Id, X-Role 포함) + Cookie 세팅
7. 모든 후속 요청은 multi-tenant middleware에서 JWT 검증 → app.tenant_id, app.role PG SET
```

**라이브러리 후보**: `arctic` (Discovery-X에서 이미 사용 중) 또는 KT DS 사내 SDK.

#### 2.2.5 Migration Path (D1 → PG)

| 시점 | 작업 | 보존 |
|---|---|---|
| W20 | 신규 테이블만 PG에 (decisions, audit_log, user_role) | 기존 D1 BD 파이프라인 그대로 |
| W22 | core/multi-tenant + core/guard + core/diagnostic의 데이터는 PG 사용 시작 | D1 + PG dual storage |
| W26 (Prototype 시연) | Cross-Org core_diff 데이터 PG로 통일 | D1 = BD 파이프라인 / PG = AI Foundry MVP |
| W31~ (Phase 3) | 필요 시 BD 파이프라인 일부 PG 이전 검토 | (Phase 4 결정) |

---

### 2.3 Audit Log Bus + Event Driven 통합

#### 2.3.1 현황 (08 §2.x 기반)

| Repo | 발행자/수신자 | 현재 상태 |
|---|---|---|
| Decode-X | 발행 (analysis.completed, diagnosis.completed) | 스키마 정의 + extraction.completed → runAnalysis 자동 발행 검증 |
| Discovery-X | 발행 (event_logs, EVENT_TYPE_MAP 30종) | 내부 audit 구현 + 외부 Bus 발행 어댑터 부재 |
| Foundry-X | 수신 (dual_ai_reviews, agent_run_metrics) | 모듈별 로깅 / **통합 trace_id chain 부재** |
| AXIS-DS | — | 해당 없음 |
| ax-plugin | 발행 (sprint·session 이벤트 가능) | 명시 없음, 후보 |

#### 2.3.2 Bus 아키텍처

```
┌─────────────────┐    publish    ┌──────────────────────┐
│ Decode-X        │──────────────▶│ Cloudflare Queue     │
│ (svc-extraction)│               │ (audit-bus-queue)    │
└─────────────────┘               │                      │
                                   │  partition by trace  │
┌─────────────────┐               │                      │
│ Discovery-X     │──────────────▶│                      │
│ (event-emitter) │               └──────────┬───────────┘
└─────────────────┘                          │
                                              │ consume
                                              ▼
                                   ┌──────────────────────┐
                                   │ Foundry-X            │
                                   │ core/events/         │
                                   │ (audit-bus-consumer) │
                                   └──────────┬───────────┘
                                              │ persist
                                              ▼
                              ┌────────────────────────────┐
                              │ PostgreSQL ax.audit_log    │
                              │ (append-only, partitioned) │
                              └────────────────────────────┘
                                              │
                                              ▼ (옵션)
                              ┌────────────────────────────┐
                              │ 사외 SIEM (R-X1 회피)       │
                              └────────────────────────────┘
```

#### 2.3.3 Event Schema v1 (zod, types.ts)

```typescript
export const AuditEventSchema = z.object({
  // Identity
  event_id: z.string().uuid(),
  trace_id: z.string().uuid(),                  // chain root
  parent_event_id: z.string().uuid().nullable(), // chain parent

  // Source
  source_repo: z.enum(["foundry-x", "decode-x", "discovery-x", "axis-ds", "ax-plugin"]),
  source_module: z.string(),                    // "svc-extraction", "core/diagnostic" 등
  source_version: z.string(),                   // semver

  // Event
  event_type: z.string(),                       // "analysis.completed", "policy.exported" 등 (controlled vocabulary)
  event_category: z.enum(["domain", "audit", "system", "security"]),
  severity: z.enum(["info", "warning", "critical"]).default("info"),

  // Tenant + Actor
  tenant_id: z.string().nullable(),             // multi-tenant context
  actor_id: z.string().nullable(),              // user_id or "system"
  actor_role: z.string().nullable(),

  // Payload
  payload: z.record(z.unknown()),               // type별 payload (별도 스키마)
  payload_hash: z.string(),                     // SHA-256 무결성 (HMAC 서명도 옵션)

  // Time
  emitted_at: z.string().datetime(),            // ISO 8601 UTC
  received_at: z.string().datetime().optional(),

  // Compliance
  pii_redacted: z.boolean().default(false),     // PII Guard 처리 여부
  retention_days: z.number().default(2555),     // 7년 (감사 요건)
});
```

#### 2.3.4 trace_id Chain 전파 규칙

1. **HTTP**: 모든 fetch/route handler에서 `X-Trace-Id`, `X-Parent-Event-Id` header 전파 (Hono middleware)
2. **Queue Producer**: enqueue 시 trace_id를 message attribute에 명시
3. **Cron/Scheduled**: cron 시작 시 새 trace_id root 생성
4. **LLM Call**: Anthropic/OpenRouter 호출 전후 audit emit (event_type: `llm.invoked`, `llm.completed`)
5. **HITL Approval**: Reviewer/Approver 결정도 audit emit (event_type: `hitl.approved`, `hitl.rejected`)

#### 2.3.5 Append-Only + 무결성

- PG `ax.audit_log` 테이블: INSERT만 허용 (UPDATE/DELETE는 superuser 전용)
- 파티션: `emitted_at` 월별 파티션 (PostgreSQL native partitioning)
- HMAC: payload_hash + 서명 (선택, 외부 감사 대비)
- 백업: RPO 24h / RTO 4h (PRD §4.5)

#### 2.3.6 Sprint 매핑 + F-item

| 단계 | Sprint | F-item 후보 | 비고 |
|---|---|---|---|
| 스키마 v1 합의 | W21 (G1+G2 게이트 안) | F630 audit-bus contract v1 | shared-contracts 패키지 |
| Cloudflare Queue 셋업 | W22 | F631 audit-bus queue infra | wrangler.toml |
| Foundry-X consumer | W22~W23 | F632 core/events/audit-bus-consumer | 신규 sub-app은 아님, events/ 안 추가 |
| Decode-X publisher 어댑터 | W22 | F633 svc-extraction audit-bus producer | Decode-X repo 작업 |
| Discovery-X publisher 어댑터 | W23 (47일 정체 깨기 트리거) | F634 event-emitter → audit-bus | Discovery-X repo 작업 |
| trace_id chain header propagation | W22 | F635 hono middleware + fetch wrapper | api 전체 |
| HMAC + RLS 정책 | W25 | F636 audit append-only + 서명 | 보안 |
| AXIS-DS audit log viewer (HITL Console 일부) | W26 | F637 agentic-ui AuditTrailCard | AXIS-DS v1.2 |

---

## 3. Sprint 매핑 (W18~W29 마스터)

PRD §6.1 일정 (Phase 1 W21 → Phase 2 W26 → MVP W29 → Phase 3 W34)에 정합. 본 계획은 **W18~W29 (12주)**까지만 상세, W30 이후는 별도.

| 주차 | 게이트/마일스톤 | MSA 작업 | Conditional 트래킹 | 본부 협의 |
|---|---|---|---|---|
| **W18** (5/4~5/10) | Pre-착수 PoC | C-1 PoC 환경 셋업 (Foundry-X agentic 자동화) / ax-plugin 메타 드리프트 해소 | **C-1 측정 시작** | C-2 안건 회의 준비 |
| **W19** (5/11~5/17) | C-1·C-2·C-4 게이트 | F600~F602 multi-tenant scaffold (PG 옵션 A 인프라 결정) / ax-plugin 5 신규 스킬 후보 등록 / F-item 8 P0 issue 분해 | **C-1 통과 / C-2 서면 / C-4 측정 시작** | 4 안건 sign-off |
| **W20** (5/18~5/24) | KPI 베이스라인 측정 종료 | F605~F607 guard scaffold / Hyperdrive 셋업 / KT DS SSO 어댑터 PoC | C-3 (자동화 범위 명확화) PRD §6.3.1 보강 | 베이스라인 결과 본부 공유 |
| **W21** (5/25~5/31) | **G1+G2 게이트** (정의서 v1.0 + 5-Layer 모듈 스펙 v1.0) | F610~F612 cross-org scaffold / F615~F618 diagnostic / F630 audit-bus contract v1 | C-4 결과 PRD 반영 | Sprint 1 배정 sign-off |
| **W22** (6/1~6/7) | Phase 2 Prototype α1 시작 | F620~F622 launch scaffold / F631~F633 audit-bus 인프라 + Decode-X publisher / D1→PG dual storage 시작 | (Conditional 종료) | Decode-X 도메인 1건 실측 시작 |
| **W23** (6/8~6/14) | α2 | F634 Discovery-X publisher (47일 정체 깨기) / F635 trace_id chain | — | core_diff 임계 워크샵 (PRD §7.1) |
| **W24** (6/15~6/21) | α3 | core_diff default-deny 코드 강제 / 5 sub-app 통합 테스트 (5-Layer E2E 80% 게이트) | — | — |
| **W25** (6/22~6/28) | α4 | F636 audit append-only + HMAC / 보안 테스트 (core_diff 100% 차단 시뮬레이션) | — | — |
| **W26** (6/29~7/5) | **G3 게이트** (Prototype 시연) | F637 AXIS-DS AuditTrailCard / KPI 대시보드 한 화면 1차 완성 | — | 2 본부 인스턴스 가동 검증 |
| **W27** (7/6~7/12) | Phase 3 진입 정비 | 외부 GTM 자료 1차 (영상·1쪽·PDF) 5 repo 마스킹 | — | 첫 실제 도메인 1개 확정 (PRD §6.1) |
| **W28** (7/13~7/19) | — | 부하 테스트 (k6 1.5초 p95 게이트) / 백업 RPO/RTO 테스트 | — | 데이터 NDA 사인 |
| **W29** (7/20~7/26) | **G4 게이트 (MVP W29)** | 운영·지원 체계 검증 (PRD §4.5 — 장애 4h response, 롤백 < 30초) | — | 인력 배정 sign-off |

**Critical Path**: W19 Conditional 게이트 → W20~W22 multi-tenant + guard 기반 마련 → W22~W24 cross-org default-deny + audit-bus → W26 G3 시연. 이 4개 노드 중 1개라도 미달이면 PRD §5.3 fallback 발동.

---

## 4. F-item 후보 종합 (Foundry-X SPEC.md 등록용)

기존 Foundry-X F560~F584 다음 번호. 본 계획은 **F600~F637**(38건) 사용.

| F-item | 영역 | Sub-app | 우선 | 의존 |
|---|---|---|---|---|
| F600 | Sub-app | multi-tenant scaffold + tenant-resolver | ★★★ | — |
| F601 | RBAC | multi-tenant: 5역할 | ★★★ | F600 |
| F602 | SSO | multi-tenant: KT DS SSO 어댑터 | ★★★ | F600 |
| F603 | PG | multi-tenant: pg-schema 라우팅 | ★★★ | F600 + Hyperdrive |
| F604 | PG | multi-tenant: RLS 정책 | ★★★ | F603 |
| F605 | Sub-app | guard scaffold + default-deny | ★★ | F600 |
| F606 | Sub-app | guard: core-diff-guard | ★★ | F605, F610 |
| F607 | Cleanup | guard: 기존 middleware 흡수 | ★★ | F605 |
| F610 | Sub-app | cross-org scaffold | ★★ | F600 |
| F611 | Sub-app | cross-org: 4 enum + classifier | ★★ | F610 |
| F612 | Sub-app | cross-org: core_diff default-deny 정책 | ★★★ | F611, F605 |
| F613 | Sub-app | cross-org: 임계 워크샵 결과 적용 | ★ | F611, 본부 워크샵 |
| F615 | Sub-app | diagnostic scaffold | ★★ | F600 |
| F616 | Sub-app | diagnostic: ingest-from-decode | ★★ | F615, Decode-X publisher |
| F617 | Sub-app | diagnostic: 4-diagnoses 통합 | ★★ | F615 |
| F618 | Sub-app | diagnostic: KPI 집계 | ★★ | F617 |
| F620 | Sub-app | launch scaffold | ★★ | F600 |
| F621 | Sub-app | launch: packager (zip) | ★★ | F620 |
| F622 | Sub-app | launch: canary + rollback < 30초 | ★★ | F621 |
| F630 | Contract | audit-bus event schema v1 | ★★★ | — |
| F631 | Infra | Cloudflare Queue audit-bus 셋업 | ★★★ | F630 |
| F632 | Sub-app | core/events/audit-bus-consumer | ★★★ | F631 |
| F633 | Cross-repo | Decode-X svc-extraction publisher | ★★ | F630 (Decode-X side) |
| F634 | Cross-repo | Discovery-X event-emitter publisher | ★★ | F630 (Discovery-X side) |
| F635 | Hono | trace_id chain header propagation | ★★★ | F630 |
| F636 | Security | audit append-only + HMAC 서명 | ★★ | F632 |
| F637 | UI | AXIS-DS AuditTrailCard (agentic-ui v1.2) | ★ | F632, AXIS-DS v1.2 |

**합계 28 F-item** (+ ax-plugin 신규 5 스킬 + AXIS-DS v1.2 KPI 위젯 4종 + Discovery-X handoff 어댑터 1종 = 약 38건).

---

## 5. 의존성 그래프 (한눈에)

```
W18 ─────► C-1 PoC ────────────────────────────────┐
                                                     │
W19 ─────► C-2 4 안건 + C-4 KPI 베이스라인 ────────┤
                                                     │
            ┌─ multi-tenant (F600~F604) ◄───────────┘
            │     │
            │     └─► PG schema + RLS + SSO
            │
            ├─► guard (F605~F607) ──┐
            │                        │
            └─► cross-org (F610~F613)─┴─► core_diff default-deny (F612 ★★★)
                          │
                          └─► diagnostic (F615~F618)
                                  │
                                  └─► launch (F620~F622)
                                              │
                                              └─► AXIS-DS v1.2 KPI/HITL 위젯
                                                          │
                                                          └─► W26 G3 Prototype 시연

[횡단]
audit-bus (F630~F636) ─────► 모든 sub-app + Decode-X + Discovery-X publisher
                              │
                              └─► AXIS-DS AuditTrailCard (F637)
```

---

## 6. 리스크 매핑 (PRD §7 + 08 §6 통합)

| ID | 리스크 | MSA 계획상 완화 | Owner | Trigger |
|---|---|---|---|---|
| R-X1 | 본부 간 core_diff 공유 거부 | F612 default-deny 코드 강제 + Cross-Org 4그룹 명시 + 본부장 sign-off | Sinclair + 본부장 | core_diff export 시도 시 |
| R-X2 | Sinclair + AI bus factor 1 | F635 trace_id chain으로 모든 작업 audit 투명화 + 백업 인력 트리거 | AXBD 임원 | Sinclair 부재 ≥ 2주 |
| R-X3 | 7월 deadline + Multi-Tenant 동시 | Sub-app 우선순위(multi-tenant→guard→cross-org→diagnostic→launch) 단계 진행 + Phase 2 fallback (Yellow/Red) | Sinclair | W21 G1+G2 미달 |
| R-X4 | KPI 베이스라인 부재 | W19~W20 측정 의무 + F618 KPI 집계 | 본부 SME + Sinclair | C-4 미달 |
| R-X5 | AI 산출물 임원 sign-off 신뢰 부족 | F635/F636 audit + dual_ai_reviews 16건+ 누적 | Sinclair | W26 시연 직전 |
| R-X6 | AI 에이전트 자동화 한계 | C-1 PoC 직접 측정 (Sinclair < 10%) | Sinclair + AXBD 임원 | < 80% 시 백업 즉시 |
| R-X7 | 본부 비개발자 학습 곡선 | AXIS-DS v1.2 단순 UI + AuditTrailCard / 영상 가이드 | UI/UX + AX | UAT 시점 |
| R-X8 (신규) | 5 repo 외부 노출 정책 위반 | Discovery-X Issue #21 마스킹 / 외부 자료 5 repo 명칭 → 추상 5-Layer 명칭 강제 | Sinclair | 외부 자료 sign-off 직전 |
| R-X9 (신규) | 메모리 9건 stale 의사결정 오류 | 08 §4 메모리 보정표 적용 + 본 09 문서를 새 SSOT | Sinclair | 의사결정 회의 직전 |
| R-X10 (신규) | PG 인프라 결정 지연 | W19까지 옵션 A vs B 결정 강제 / 미결정 시 옵션 C(D1 유지) fallback (PRD 위반 감수) | Sinclair + 인프라 | W19 PG 인프라 sign-off |

---

## 7. Conditional 4건 트래킹 (PRD §0.2)

| ID | 조건 | 본 계획 측정 시점 | 본 계획 게이트 |
|---|---|---|---|
| **C-1** | Pre-착수 PoC 통과 (Sinclair 개입 < 10%) | W18~W19 (Foundry-X agentic 자동화 PoC) | F600 등록 전 |
| **C-2** | 본부 4 안건 서면 확약 | W19 (도메인 본부 2개·core_diff 워크샵·Approver RBAC·KPI 베이스라인) | Sprint 1 배정 전 (W21) |
| **C-3** | AI 에이전트 자동화 범위·한계 명확화 | W20 (PRD §6.3.1 보강) | F-item 등록 시 (W19~W20) |
| **C-4** | KPI 베이스라인 측정 결과 PRD 반영 | W19~W20 측정 | Sprint 1 시작 전 (W21) |

C-1~C-4 모두 미달 시 → **즉시 백업 인력 0.5 FTE 투입 또는 Phase 2 fallback**. 본 09 계획은 W21 G1+G2 게이트에서 4건 일괄 sign-off 가정.

---

## 8. 외부 인터페이스 (5 repo 마스킹)

PRD §9 외부 GTM 자료에 5 repo 명칭 → 추상 5-Layer로 매핑. 본 09 MSA 계획상 sub-app 명칭도 외부에는 마스킹.

| 내부 명칭 (5 repo) | 외부 추상 명칭 (PRD §3.1) |
|---|---|
| Foundry-X core/multi-tenant | Layer 5: Multi-Tenant Foundation |
| Foundry-X core/guard | Layer 4: Policy Guard |
| Foundry-X core/diagnostic + Decode-X svc-* | Layer 3: Decision Diagnosis Engine |
| Foundry-X core/cross-org + Decode-X classifier | Layer 2: Cross-Org Asset Classifier |
| Foundry-X core/launch + AXIS-DS agentic-ui | Layer 1: Decision Asset Launcher + UI |
| Discovery-X | (외부 미공개 — 내부 발견 도구) |
| ax-plugin | (외부 미공개 — 사내 운영 도구) |

---

## 9. 다음 단계 (W18 즉시 실행)

PRD §11 + 08 §5와 정합:

1. **C-1 PoC 즉시 시작** — Foundry-X agentic 자동화 (Missing 진단 + Cross-Org + KPI 1건). 5/8까지 Sinclair 개입률 측정.
2. **PG 인프라 옵션 A vs B 의사결정 회의** — W18 안. 최소 인프라 견적 + 보안 검토.
3. **Foundry-X에 본 09 문서를 docs/ 디렉토리에 commit + F600~F637 SPEC.md 등록** — 28 F-item 일괄 등록.
4. **ax-plugin 메타 드리프트 해소 + 5 신규 스킬 가칭 명세 등록** — `/ax:multi-tenant-provision`, `/ax:guard-runtime`, `/ax:cross-org-sync`, `/ax:diagnostic-trace`, `/ax:launch-rollout`.
5. **AXIS-DS v1.2 게이트 정의 별도 문서** — KPI 위젯 4종(KPI Tile, Sparkline, MetricGrid, TrendArrow) + HITL Console 컴포지션. 93일 정체 회복 트리거.
6. **Discovery-X 47일 정체 회복 액션** — F51(Foundry-X 연동) Issue