---
id: FX-DESIGN-311
title: Sprint 311 Design — F560 Discovery 완전 이관 + F566 MSA Roadmap v2
sprint: 311
date: 2026-04-19
status: active
---

# Sprint 311 Design

## F560 — Discovery 완전 이관

### §1 설계 배경

F538 원래 타겟: 10개 route 그룹 (3 clean + 7 proxy)
- F538: discovery/discovery-report/discovery-reports 3개 순수 이관
- F539c: bizItems 3 + discoveryStages 2 + discoveryPipeline 2 = 7개 이관 ✅

**Sprint 311 이전 상태**: 원래 10개 route → fx-discovery 100% 완료. 4개 추가 파일(ax-bd-artifacts/ax-bd-discovery/discovery-shape-pipeline/discovery-stage-runner)이 `api/src/core/discovery/routes/`에 잔존.

### §2 구현 전략

| 파일 | 현재 위치 | 이전 목적지 | 이유 |
|------|----------|------------|------|
| ax-bd-artifacts.ts | api/core/discovery | fx-shaping | gateway `/api/ax-bd/*` → SHAPING, BdArtifactService 이미 fx-shaping에 존재 |
| ax-bd-discovery.ts | api/core/discovery | fx-shaping | gateway `/api/ax-bd/*` → SHAPING, 도메인 소유자는 shaping |
| discovery-shape-pipeline.ts | api/core/discovery | MAIN_API 명시적 라우팅 | OfferingService 의존성 (F562 shared-contracts 이후 분리) |
| discovery-stage-runner.ts | api/core/discovery | MAIN_API 명시적 라우팅 | agent 도메인 의존성 (F571 agent 분리 이후) |

### §3 Stage 3 Exit 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 | ax-bd-artifacts: BdArtifactService 1곳. ax-bd-discovery: DiscoveryXIngestService 1곳. shape-pipeline: gateway 라우트 추가. |
| D2 | 식별자 계약 | ArtifactListQuery (orgId + bizItemId 조합) — @foundry-x/shared 타입 공유 |
| D3 | Breaking change | ax-bd-artifacts/discovery: URL 패턴 불변 (gateway /api/ax-bd/* → SHAPING 이미 동작 중) |
| D4 | TDD Red 파일 | packages/fx-shaping/src/__tests__/ax-bd-artifacts.test.ts, ax-bd-discovery.test.ts |

### §4 테스트 계약 (TDD Red Target)

#### ax-bd-artifacts (fx-shaping)
```
GET /api/ax-bd/artifacts?bizItemId=xxx → { data: BdArtifact[], total: number, page: number }
GET /api/ax-bd/artifacts/:id → BdArtifact | 404
GET /api/ax-bd/biz-items/:bizItemId/artifacts → { data: BdArtifact[] }
GET /api/ax-bd/artifacts/:bizItemId/:skillId/versions → { versions: [...], total: number }
```
- 인증 필수 (JWT): 401 테스트
- 잘못된 orgId: 404 테스트

#### ax-bd-discovery (fx-shaping)
```
POST /api/ax-bd/discovery/ingest → { ok: true, received: number }
GET /api/ax-bd/discovery/status → DiscoveryStatus
POST /api/ax-bd/discovery/sync → { ok: true }
```
- 인증 필수: 401 테스트
- 잘못된 payload: 400 테스트

#### discovery-shape-pipeline (gateway 라우팅)
- fx-gateway: `app.all("/api/pipeline/*", ...)` → MAIN_API 추가
- 코드 변경 최소화, 라우팅 명시화만

#### discovery-stage-runner (gateway 라우팅)
- fx-gateway: `/api/biz-items/:id/discovery-stage/:stage/*` → MAIN_API 추가
- fx-gateway: `/api/biz-items/:id/discovery-graph/*` → MAIN_API 추가
- 기존 `/api/biz-items/:id/discovery-stage` (exact) → DISCOVERY 유지

### §5 파일 매핑 (구현 대상)

#### 신규 생성

| 파일 | 역할 |
|------|------|
| `packages/fx-shaping/src/routes/ax-bd-artifacts.ts` | BdArtifactService 기반 4개 endpoint |
| `packages/fx-shaping/src/routes/ax-bd-discovery.ts` | DiscoveryXIngestService 기반 3개 endpoint |
| `packages/fx-shaping/src/services/discovery-x-ingest.service.ts` | stub 서비스 (collection domain 분리 전 임시) |
| `packages/fx-shaping/src/schemas/artifact.schema.ts` | artifactListQuerySchema |
| `packages/fx-shaping/src/__tests__/ax-bd-artifacts.test.ts` | TDD Red |
| `packages/fx-shaping/src/__tests__/ax-bd-discovery.test.ts` | TDD Red |

#### 수정

| 파일 | 변경 내용 |
|------|----------|
| `packages/fx-shaping/src/app.ts` | axBdArtifactsRoute + axBdDiscoveryRoute 등록 |
| `packages/fx-gateway/src/app.ts` | /api/pipeline/* + /biz-items/:id/discovery-stage/:stage/* + /biz-items/:id/discovery-graph/* 명시적 MAIN_API 라우팅 |

### §6 게이트웨이 라우팅 변경 상세

```typescript
// 추가할 fx-gateway 라우트 (app.ts)
// 주의: 기존 /api/biz-items/:id/discovery-stage (exact) 라우트보다 뒤에 등록

// discovery-stage-runner: 하위 경로 명시
app.post("/api/biz-items/:id/discovery-stage/:stage/run", (c) => c.env.MAIN_API.fetch(c.req.raw));
app.post("/api/biz-items/:id/discovery-stage/:stage/confirm", (c) => c.env.MAIN_API.fetch(c.req.raw));
app.patch("/api/biz-items/:id/discovery-stage/:stage", (c) => c.env.MAIN_API.fetch(c.req.raw));

// discovery-graph
app.post("/api/biz-items/:id/discovery-graph/run-all", (c) => c.env.MAIN_API.fetch(c.req.raw));
app.get("/api/biz-items/:id/discovery-graph/sessions", (c) => c.env.MAIN_API.fetch(c.req.raw));

// discovery-shape-pipeline
app.post("/api/pipeline/shape/trigger", (c) => c.env.MAIN_API.fetch(c.req.raw));
app.get("/api/pipeline/shape/status", (c) => c.env.MAIN_API.fetch(c.req.raw));
```

**등록 순서 중요**: MAIN_API 명시 라우트는 DISCOVERY 라우트보다 뒤에 등록. 기존 `/api/biz-items/:id/discovery-stage` (POST)는 DISCOVERY 라우트 유지.

### §7 Cross-domain 검증 계획

```bash
# (c) 항목 검증
grep -rn "core/discovery" packages/fx-shaping/src/ # → 0건 예상
grep -rn "core/discovery" packages/fx-offering/src/ # → 0건 예상 (comment 제외)
```

### §8 Phase Exit P1~P4

| # | 항목 | 검증 방법 |
|---|------|----------|
| P1 | Dogfood 1회 실행 | PR merge 후 프로덕션 URL로 KOAMI smoke |
| P2 | 실측 산출물 | GET /api/discovery/health + GET /api/shaping/health → 200 |
| P3 | 6축 메트릭 | /api/ax-bd/artifacts → 200 (인증 후) |
| P4 | 회고 작성 | docs/04-report/features/sprint-311-f560-report.md |

---

## F566 — MSA Separation Roadmap v2

### §1 출력 파일

`docs/specs/fx-msa-roadmap-v2/prd-final.md` — Phase 45 섹션 추가 (v2 발행)

### §2 추가할 섹션

- §9: Phase 45 Sprint 311~318 배치 근거 (각 도메인 → Sprint 매핑)
- §10: 6 도메인 분리 우선순위 + 리소스/일정/롤백 시나리오
- §11: Phase 46+ 예측 로드맵

### §3 파일 매핑

| 파일 | 변경 |
|------|------|
| `docs/specs/fx-msa-roadmap-v2/prd-final.md` | §9~§11 추가 |

---

## TDD 계획

1. **Red Phase**: test 파일 생성 → FAIL 확인
2. **Green Phase**: 구현 코드 작성 → PASS 확인
3. **Refactor**: cleanup
