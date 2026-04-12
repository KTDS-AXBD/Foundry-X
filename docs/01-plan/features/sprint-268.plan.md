---
id: FX-PLAN-268
type: plan
sprint: 268
phase: 38
features: [F517, F518, F520]
status: active
date: 2026-04-12
---

# Sprint 268 Plan — MSA Walking Skeleton

## 목표

Foundry-X API를 도메인별 독립 Worker로 점진적 분리하는 **Walking Skeleton** 구현.
- F517: API 게이트웨이 Worker (fx-gateway) 신규 생성
- F518: Discovery 도메인을 독립 Worker로 추출
- F520: Discovery 전용 D1 바인딩 격리

## F-item 요약

| F | REQ | 제목 | 핵심 |
|---|-----|------|------|
| F517 | FX-REQ-545 | API 게이트웨이 Worker | `fx-gateway` Worker 신규, Service Binding 라우팅, 하위 호환 |
| F518 | FX-REQ-546 | Discovery 도메인 분리 | `core/discovery` 10 routes + 25 services → 독립 Worker |
| F520 | FX-REQ-548 | D1 스키마 격리 | Discovery 전용 D1 바인딩, cross-domain JOIN 대체 |

## 현황 분석

### 기존 구조
```
Web/CLI → foundry-x-api (단일 Worker) → foundry-x-db (단일 D1)
          ├── core/discovery (10 routes, 25 services)
          ├── core/shaping
          ├── core/offering
          └── modules/* (auth/portal/gate/launch 등)
```

### 목표 구조
```
Web/CLI → fx-gateway (신규 Worker)
          ├── Service Binding: fx-discovery → foundry-x-discovery-db
          └── Service Binding: foundry-x-api (잔여 도메인) → foundry-x-db
```

### 선례 참조
- `packages/gate-x/` — 이미 독립 Worker 패턴 구현됨 (wrangler.toml 구조 참조)

## 구현 순서

### 단계 1: F518 — Discovery Worker 패키지 생성
1. `packages/fx-discovery/` 신규 패키지 생성 (gate-x 구조 미러)
2. `packages/api/src/core/discovery/` 코드를 **복사**(이동 아님 — 하위 호환 유지)
3. Discovery Worker 전용 `wrangler.toml` 작성
4. Discovery Worker `src/index.ts` — Hono 앱 + discovery routes만 등록
5. D1 바인딩은 임시로 기존 `foundry-x-db` 사용 (F520에서 격리)

### 단계 2: F517 — Gateway Worker 패키지 생성
1. `packages/fx-gateway/` 신규 패키지 생성
2. `wrangler.toml` — DISCOVERY, MAIN_API 두 Service Binding 선언
3. `src/index.ts` — 경로 기반 라우팅:
   - `/api/discovery/*` → DISCOVERY.fetch()
   - `/api/*` → MAIN_API.fetch()
4. Web의 `VITE_API_URL`은 gateway endpoint로 변경

### 단계 3: F520 — D1 격리
1. Discovery 전용 D1 생성 (MCP 또는 wrangler 사용)
2. Discovery 관련 테이블 migration SQL 작성 (`0127_discovery_isolation.sql`)
3. `fx-discovery/wrangler.toml`에서 DB 바인딩을 새 D1으로 교체
4. Cross-domain JOIN 필요 구간 확인 및 API 레벨 조합으로 대체

## TDD 적용

- **F518/F517**: 새 Worker Entry Point → API 테스트 (Hono `app.request()`)
- **F520**: D1 바인딩 격리 후 기존 discovery 테스트 PASS 유지 확인
- 면제: Discovery 코드 복사 (기존 테스트 재활용)

## 검증 기준

- [ ] `fx-discovery` Worker — `pnpm typecheck` PASS
- [ ] `fx-gateway` Worker — Gateway 라우팅 단위 테스트 PASS
- [ ] 기존 discovery 관련 API tests (`packages/api/__tests__/`) PASS 유지
- [ ] `turbo build` 전체 빌드 성공
- [ ] Gate Match Rate ≥ 90%

## 리스크

| 리스크 | 대응 |
|--------|------|
| 도메인 간 순환 의존성 | import 분석 선행, shared 타입만 허용 |
| D1 마이그레이션 데이터 정합성 | 옵션 B(바인딩 제한)로 Walking Skeleton 시작, 완전 격리는 후속 |
| Service Binding local dev 복잡도 | wrangler.toml `[dev]` 환경 분리 |

## 완료 정의

Sprint 268 종료 시:
- fx-gateway, fx-discovery 두 패키지 존재 + `pnpm build` 통과
- Discovery API 호출이 Gateway → Discovery Worker 경로로 동작 증명
- D1 바인딩 분리 전략 결정 및 migration 작성
- Gap Match Rate ≥ 90%
