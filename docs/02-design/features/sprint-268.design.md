---
id: FX-DESIGN-268
type: design
sprint: 268
phase: 38
features: [F517, F518, F520]
status: active
date: 2026-04-12
---

# Sprint 268 Design — MSA Walking Skeleton

## §1 목표

API Gateway + Discovery Worker 경계 선언으로 MSA Walking Skeleton을 증명한다.
Cross-domain 의존성이 방대하므로 **완전한 코드 분리 대신 경계 선언 + Gateway 패턴**을 구현한다.

## §2 핵심 발견사항 (코드베이스 진단)

Discovery 도메인은 **30개 이상 cross-domain import**를 가짐:
- shaping: BdArtifactService, BizPersonaEvaluator, ShapingOrchestratorService
- offering: PrdConfirmationService, PrdGeneratorService, OfferingService, ContentAdapterService
- agent: AgentRunner, SkillPipelineRunner, execution-types
- collection: DiscoveryXIngestService, discoveryIngestPayloadSchema
- harness: UpdateSignalValuationsInput

**결론**: 완전한 Discovery Worker 분리는 현재 코드베이스에서 Sprint 범위 초과.
Walking Skeleton = "Gateway가 Discovery를 독립 Worker로 라우팅 가능한 구조 증명"

## §3 설계 결정 (F517 ~ F520)

### 3.1 F517 — API Gateway Worker

**신규 패키지**: `packages/fx-gateway/`

```
Web/CLI
  → fx-gateway Worker (신규)
      ├── /api/discovery/* → DISCOVERY binding (현재: MAIN_API로 폴백 가능)
      └── /api/*           → MAIN_API binding (기존 foundry-x-api)
```

**wrangler.toml Service Binding 선언**:
```toml
name = "fx-gateway"
main = "src/index.ts"

[[services]]
binding = "MAIN_API"
service = "foundry-x-api"

# F518 완료 후 활성화
# [[services]]
# binding = "DISCOVERY"
# service = "fx-discovery"
```

**Gateway 라우팅 로직**:
```typescript
// /api/discovery/* → DISCOVERY (있으면) 또는 MAIN_API
// /api/*           → MAIN_API (항상)
```

**하위 호환**: Gateway가 없을 때도 기존 api URL로 직접 접근 가능 유지.

---

### 3.2 F518 — Discovery Worker (경계 선언)

**신규 패키지**: `packages/fx-discovery/`

Sprint 268 범위: **경계 선언 수준** (완전한 코드 이동 아님)
- `packages/fx-discovery/` 폴더 + 빌드 인프라 생성
- `src/index.ts` — Discovery-only Hono 앱 스텁 작성
- `wrangler.toml` — DB 바인딩 포함 (F520과 연동)
- 실제 routes 연결은 cross-domain 의존성 정리 후 Phase 38.2에서 완성

**이유**: 30개+ cross-domain import를 가진 Discovery를 Sprint 1개에서 완전히 분리하면
기존 테스트 전체가 깨지고 되돌리기 어려운 대규모 리팩토링이 필요.

**Walking Skeleton 증명 방법**:
- `fx-discovery` 패키지가 독립 빌드됨 ✅
- `fx-gateway`가 fx-discovery Service Binding 선언을 가짐 ✅
- Discovery stub endpoint (`/api/discovery/health`) PASS ✅

---

### 3.3 F520 — D1 바인딩 전략

**결정: 옵션 B (같은 DB + 바인딩 공유)**
이유:
- 완전한 DB 분리는 데이터 마이그레이션 + cross-JOIN 대체 로직 필요 → 대형 작업
- Walking Skeleton 목표는 "구조 증명" — DB 분리는 Phase 38.2 이후

`fx-discovery/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "foundry-x-db"          # 현재는 동일 DB
database_id = "6338688e-b050-4835-98a2-7101f9215c76"
# F520 Phase 2: foundry-x-discovery-db로 교체
```

**D1 격리 마이그레이션 파일**: `0127_discovery_worker_comment.sql`
- 테이블 변경 없음, Discovery 소유 테이블 주석 추가 (문서화 목적)

---

## §4 파일 변경 매핑

### F517 — fx-gateway (신규 파일 4개)

| 파일 | 설명 |
|------|------|
| `packages/fx-gateway/package.json` | 패키지 설정 |
| `packages/fx-gateway/wrangler.toml` | Service Binding 선언 |
| `packages/fx-gateway/src/env.ts` | Env 타입 (MAIN_API, DISCOVERY Fetcher) |
| `packages/fx-gateway/src/index.ts` | Gateway fetch handler |
| `packages/fx-gateway/tsconfig.json` | TypeScript 설정 |
| `pnpm-workspace.yaml` | fx-gateway 패키지 등록 |

### F518 — fx-discovery (신규 파일 4개)

| 파일 | 설명 |
|------|------|
| `packages/fx-discovery/package.json` | 패키지 설정 |
| `packages/fx-discovery/wrangler.toml` | DB 바인딩 (옵션 B) |
| `packages/fx-discovery/src/env.ts` | Env 타입 |
| `packages/fx-discovery/src/index.ts` | Discovery Worker stub (health endpoint) |
| `packages/fx-discovery/tsconfig.json` | TypeScript 설정 |

### F520 — D1 격리 (마이그레이션 1개)

| 파일 | 설명 |
|------|------|
| `packages/api/src/db/migrations/0127_discovery_worker_comment.sql` | Discovery 소유 테이블 주석 (옵션 B) |

### 기존 파일 수정 (1개)

| 파일 | 변경 내용 |
|------|-----------|
| `pnpm-workspace.yaml` | `packages/fx-gateway`, `packages/fx-discovery` 추가 |

---

## §5 테스트 계약 (TDD Red Target)

### F517 Gateway 라우팅 테스트

```typescript
// packages/fx-gateway/src/__tests__/gateway.test.ts
describe("F517: Gateway routing", () => {
  it("routes /api/discovery/* to DISCOVERY binding when available")
  it("falls back to MAIN_API when DISCOVERY binding absent")
  it("routes /api/* to MAIN_API")
  it("passes through request headers and body")
})
```

### F518 Discovery Worker 테스트

```typescript
// packages/fx-discovery/src/__tests__/health.test.ts
describe("F518: Discovery Worker", () => {
  it("returns 200 on GET /api/discovery/health")
  it("returns discovery domain info in health response")
})
```

---

## §6 Gap 판정 기준

| 항목 | 기대 | 검증 방법 |
|------|------|-----------|
| fx-gateway 패키지 존재 | packages/fx-gateway/ | ls |
| fx-gateway typecheck PASS | tsc --noEmit | turbo typecheck |
| fx-discovery 패키지 존재 | packages/fx-discovery/ | ls |
| fx-discovery typecheck PASS | tsc --noEmit | turbo typecheck |
| Gateway 라우팅 테스트 PASS | 4/4 test pass | vitest |
| Discovery health 테스트 PASS | 2/2 test pass | vitest |
| D1 migration 작성 완료 | 0127_*.sql | ls |
| 기존 api 테스트 PASS | regression 없음 | turbo test |

---

## §7 의도적 제외 (코드 불가 GAP)

| 항목 | 사유 |
|------|------|
| Discovery routes 완전 이동 | cross-domain import 30개+ — Phase 38.2 별도 Sprint |
| D1 완전 격리 (옵션 A) | 데이터 마이그레이션 + JOIN 대체 필요 — Phase 38.3 |
| fx-discovery → 실제 discovery routes 연결 | cross-domain 정리 선행 필요 |
| Service Binding 실제 트래픽 전환 | fx-discovery가 stub이므로 현재 불가 |

---

## §8 구현 주의사항

1. **pnpm-workspace.yaml 수정 시**: `packages/fx-gateway` + `packages/fx-discovery` 추가
2. **tsconfig.json**: `@cloudflare/workers-types` devDependency 필수
3. **Service Binding 로컬 테스트**: wrangler 4.75.0+에서 `wrangler dev` multi-worker 지원
4. **Cross-domain import 금지**: fx-discovery는 `packages/api/src/core/`를 import하면 안 됨 (독립성 파괴)
