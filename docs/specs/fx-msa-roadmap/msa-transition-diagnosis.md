# MSA 전환 현황 진단 + 로드맵

**날짜:** 2026-04-14
**작성자:** Sinclair Seo + AI Agent
**기준:** Phase 39 Walking Skeleton 완료 후, Phase 42 HyperFX Deep Integration 진행 중
**PRD:** `docs/specs/fx-msa-roadmap/prd-final.md`

---

## 1. 현재 상태 진단 (As-Is)

### 1.1 패키지 구조

| 패키지 | 파일 수 | 역할 | MSA 상태 |
|--------|---------|------|----------|
| **api** | 1,139 | 통합 API 백엔드 (10개 도메인) | 모놀리식 (핵심 문제) |
| **fx-gateway** | 4 | API Gateway (Service Binding 라우팅) | ✅ Walking Skeleton |
| **fx-discovery** | 10 | Discovery 독립 Worker | ✅ Walking Skeleton |
| **web** | 443 | 프론트엔드 (Vite + React) | Pages 독립 배포 |
| **cli** | 84 | CLI 도구 | 로컬 독립 |
| **shared** | 27 | 공유 타입 (3.7K줄) | 슬리밍 필요 |
| **harness-kit** | 28 | 공유 미들웨어 | 각 Worker에서 import |
| **gate-x** | 69 | Gate 검증 (독립 Worker 선례) | ✅ 분리 완료 |
| **gate-x-sdk** | 8 | Gate SDK | 라이브러리 |
| **gate-x-web** | 16 | Gate UI | 프론트엔드 |

### 1.2 api 패키지 내부 도메인별 현황

| 도메인 | core/ 파일 수 | routes | services | D1 migrations | 분리 난이도 |
|--------|--------------|--------|----------|---------------|------------|
| **Discovery** | 48 | 12 | 18 | 57 (43%) | 낮음 (경계 명확) |
| **Agent** | 107 | — | — | — | 높음 (횡단 의존) |
| **Harness** | 97 | — | 25 | — | 높음 (품질/검증 횡단) |
| **Offering** | 61 | 12 | 23 | 11 | 중간 |
| **Shaping** | 51 | 14 | 23 | 16 | 중간 (Discovery 의존) |
| **Collection** | 15 | — | — | — | 낮음 (소규모) |
| **Files** | 7 | — | — | — | 낮음 |
| **Auth** | modules/auth | 5 | — | — | 낮음 (이미 모듈화) |

### 1.3 Walking Skeleton 달성 현황 (Phase 39)

| PRD 항목 | 상태 | 상세 |
|----------|------|------|
| M1: API 게이트웨이 Worker | ✅ 구조 완성 | fx-gateway → Service Binding 라우팅 |
| M2: Discovery 분리 | ⚠️ 부분 완성 | fx-discovery 10파일, biz-item API만. 전체 12 routes/18 services 중 일부 |
| M3: shared 타입 슬리밍 | ❌ 미착수 | 여전히 27파일 유지 |
| M4: D1 스키마 격리 | ⚠️ 설계만 | 옵션 A(별도 DB) vs B(동일 DB 규약) 미결정 |

| PRD 항목 | 상태 | 상세 |
|----------|------|------|
| S1: Shaping 분리 | ❌ 미착수 | |
| S2: 서비스 간 통신 계약 | ⚠️ 기초만 | ServiceProxy 패턴 존재, 표준화 미완 |
| S3: CI/CD 분리 | ❌ 미착수 | 전체 단일 deploy.yml |
| S4: 모니터링/옵저버빌리티 | ❌ 미착수 | |

### 1.4 모놀리식 잔존 영역 (핵심 문제)

1. **app.ts**: 160+ 라우트가 단일 Hono 인스턴스에 등록 — 모든 도메인이 한 Worker에 번들
2. **services/**: 30개 서비스 중 횡단 관심사(conflict-detector, merge-queue, pr-pipeline)와 도메인 로직 혼재
3. **routes/**: work.ts(412줄), spec.ts(237줄) 등 대형 라우트가 복수 도메인 로직 처리
4. **D1**: 133개 migration이 단일 DB에 모두 적용, 도메인별 격리 없음

### 1.5 서비스 간 통신 현황

```
Client (Web/CLI)
  │ HTTPS
  ▼
fx-gateway (Service Binding 라우팅)
  ├─ /api/discovery/* → fx-discovery Worker (분리됨)
  └─ /api/* → foundry-x-api Worker (나머지 전체)

내부 통신:
  foundry-x-api → ServiceProxy → DX/AIF 서비스 (Hub Token 기반)
```

- **동적 Service Discovery**: 없음 (정적 라우팅)
- **이벤트 기반 통신**: 없음 (동기 호출만)
- **분산 트레이싱**: 없음

---

## 2. 미결정 기술 이슈 (PRD 오픈 이슈)

| # | 이슈 | 영향도 | 권장 결정 |
|---|------|--------|----------|
| 1 | Service Binding latency 벤치마크 | HIGH | k6/Artillery로 p99 측정 선행 — 500ms 초과 시 전략 재검토 |
| 2 | D1 분리 전략 (옵션 A vs B) | HIGH | **옵션 B(동일 DB + 규약)** 권장 — 마이그레이션 비용 최소화, ESLint 룰로 접근 제한 |
| 3 | shared 크로스도메인 계약 타입 목록 | MEDIUM | Discovery/Shaping/Offering 간 공유 타입만 유지, 나머지 도메인 내부 이동 |
| 4 | Agent/Harness 횡단 의존성 | HIGH | Phase 2 이후 — 현재 가장 복잡한 영역, 섣부른 분리 위험 |
| 5 | 모니터링 표준 | LOW | Cloudflare Workers Analytics + Logpush 기초 도입 |
| 6 | CI/CD 분리 방식 | MEDIUM | paths-filter 기반 선택적 배포 (deploy.yml 1개 유지, job 분기) |

---

## 3. 다음 단계 로드맵

### 3.1 단계 정의

현재 Phase 42(HyperFX Deep Integration)가 진행 중이므로, MSA 전환은 **Phase 43+**에서 재개.

```
Phase 39 (완료)          Phase 43 (다음)          Phase 44              Phase 45+
Walking Skeleton  →  Production Ready    →  2차 도메인 분리    →  Full MSA
─────────────────    ────────────────────    ─────────────────    ──────────
fx-gateway 구조       Discovery 완전 분리     Shaping 분리          나머지 도메인
fx-discovery 시작     D1 격리 실행            Offering 분리         이벤트 드리븐
                      shared 슬리밍           CI/CD 분리            분산 트레이싱
                      latency 벤치마크        통신 계약 표준        Service Registry
```

### 3.2 Phase 43: MSA Production Ready (예상 2~3주)

Walking Skeleton을 실제 프로덕션에서 동작하는 수준으로 완성.

| # | F-item 후보 | 설명 | 예상 Sprint |
|---|------------|------|------------|
| 1 | Discovery 완전 분리 | fx-discovery에 12 routes / 18 services 전체 이전 + 기존 api에서 제거 | 1 Sprint |
| 2 | D1 격리 실행 | 옵션 B 적용 — ESLint 룰로 도메인별 테이블 접근 제한 + migration 분리 태깅 | 1 Sprint |
| 3 | shared 슬리밍 | Discovery 전용 타입을 fx-discovery 내부로 이동, shared 27→15 파일 목표 | 0.5 Sprint |
| 4 | latency 벤치마크 | Service Binding p99 측정 + 결과에 따른 Go/No-Go 판정 | 0.5 Sprint |
| 5 | 게이트웨이 프로덕션 배포 | fx-gateway를 실제 프로덕션에 배포 + Web/CLI URL 전환 + 롤백 스위치 | 1 Sprint |

**전제조건**: Phase 42 완료 후 착수 (F531~F533 순차 의존 체인)

### 3.3 Phase 44: 2차 도메인 분리 (예상 3~4주)

| # | 작업 | 설명 |
|---|------|------|
| 1 | Shaping 분리 | Discovery 다음 파이프라인 단계, 14 routes / 23 services → 독립 Worker |
| 2 | Offering 분리 | Shaping 다음 단계, 12 routes / 23 services → 독립 Worker |
| 3 | CI/CD 분리 | deploy.yml에 paths-filter 적용, 도메인별 선택적 배포 |
| 4 | 서비스 간 통신 계약 | Worker 간 Service Binding 인터페이스 + 에러 핸들링 표준 문서화 |

### 3.4 Phase 45+: Full MSA (장기)

- Auth, Agent, Harness, Collection 등 나머지 도메인 분리
- 이벤트 드리븐 아키텍처 (Cloudflare Queues/Durable Objects 활용)
- 동적 Service Registry 패턴
- 분산 트레이싱 + 옵저버빌리티

---

## 4. 리스크 재평가

| 리스크 | PRD 심각도 | 현재 평가 | 사유 |
|--------|-----------|----------|------|
| Service Binding latency | HIGH | **미검증** | 벤치마크 미실시 — Phase 43에서 선행 필수 |
| 도메인 간 순환 의존성 | HIGH | **MEDIUM** | Discovery는 의존성 적음 확인, Agent/Harness는 높음 |
| D1 마이그레이션 정합성 | HIGH | **MEDIUM** | 옵션 B(규약 분리) 채택 시 마이그레이션 불필요 |
| 1~2주 일정 초과 | LOW | **LOW** | Walking Skeleton 범위가 작아 리스크 낮음 |
| 기존 E2E 호환성 | HIGH | **MEDIUM** | 게이트웨이 경유 시 URL 변경만, E2E 273건 기존 통과 |
| 팀 확장 전 미완료 | NEW | **MEDIUM** | Q2 팀 확장 일정 대비 Phase 43까지 완료해야 의미 있음 |

---

## 5. 권장 사항

1. **Phase 42 우선 완료**: F533(MetaAgent 실전 검증)까지 마무리 후 MSA 재개
2. **D1 옵션 B 확정**: 별도 DB 생성(옵션 A)보다 규약 분리가 현실적 — 마이그레이션 비용 0
3. **latency 벤치마크 선행**: Phase 43 첫 Sprint에서 k6로 p99 측정 → Go/No-Go
4. **Agent/Harness 분리 보류**: 횡단 의존성이 높아 섣부른 분리는 위험 — Phase 45+ 이후
5. **Q2 팀 확장 전 최소 Phase 43 완료**: Discovery 완전 분리 + 게이트웨이 프로덕션 배포가 팀 병렬 개발의 최소 조건

---

*이 문서는 Phase 39 PRD(`prd-final.md`) + 코드베이스 진단 결과를 기반으로 작성됨.*
