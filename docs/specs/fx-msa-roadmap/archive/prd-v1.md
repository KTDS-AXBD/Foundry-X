# fx-msa-roadmap PRD

**버전:** v1
**날짜:** 2026-04-12
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X 모노리포의 API 레이어를 비즈니스 도메인 단위로 점진적 MSA 전환하여, BD팀 전체가 독립적으로 개발·배포할 수 있는 구조를 확보한다.

**배경:**
Foundry-X는 현재 pnpm workspace + Turborepo 기반 모노리포(8개 패키지)로 운영 중이다. 패키지 간 import 방향은 건강하고(금지방향 0건), shared는 타입 중심 24파일 3.7K줄로 비대하지 않다. 그러나 api 패키지 내부에 10개 도메인(Discovery, Shaping, Offering, Agent, Harness, Collection, Auth, Portal, Gate, Launch)이 단일 Workers에 묶여 있어, 향후 팀 확장 시 배포 충돌과 장애 전파 리스크가 있다.

**목표:**
1~2주 Walking Skeleton으로 도메인별 독립 배포 가능한 구조를 증명하고, 팀별 독립 개발이 가능한 서비스 경계를 확립한다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- **단일 API Workers**: 10개 도메인 × 115+ routes × 250+ services가 하나의 `foundry-x-api` Worker에 번들
- **단일 D1 데이터베이스**: 모든 도메인의 테이블이 `foundry-x-db` 하나에 혼재 (126+ migrations)
- **shared 변경 영향**: shared 타입 변경 시 api/web/cli 전체 리빌드 트리거
- **배포 단위**: api 전체가 한 번에 배포 — 한 도메인 수정이 전체 배포를 유발
- **현재 Pain 수준**: LOW — 단독 개발이라 충돌 없음. 그러나 팀 확장 시 HIGH로 상승 예상

### 2.2 목표 상태 (To-Be)

- **도메인별 Workers**: 최소 2~3개 독립 Worker로 분리 (Phase 1 Walking Skeleton)
- **API 게이트웨이**: 단일 진입점에서 도메인별 Worker로 라우팅
- **DB 스키마 격리**: 도메인별 D1 바인딩 또는 테이블 그룹 분리
- **독립 배포**: 각 도메인 Worker가 독립적으로 배포/롤백 가능
- **팀별 개발**: 다른 도메인에 영향 없이 자기 도메인만 수정·배포

### 2.3 시급성

선제적 계획이다. 현재 심각한 장애나 충돌은 없으나:
- BD팀 전체 활용 시나리오가 구체화되면 구조 전환 비용이 기하급수적으로 증가
- gate-x가 이미 독립 Worker로 분리된 선례가 있어 패턴 검증 완료
- 1~2주 Walking Skeleton으로 리스크를 최소화하면서 구조를 증명할 수 있음

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair (개발자) | 현재 단독 개발자 + AI 에이전트 | 도메인별 독립 배포로 배포 리스크 축소 |
| BD팀 개발자 (향후) | 각 도메인 담당 개발자 | 다른 도메인 영향 없이 독립 작업 |
| AI 에이전트 | Claude Code, Sprint autopilot | 서비스 경계 명확화로 자율 작업 범위 정의 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair Seo | 아키텍트 + 개발자 | 높음 |
| AX BD팀 | 최종 사용자 + 향후 개발자 | 높음 |

### 3.3 사용 환경
- 기기: PC (개발 환경)
- 네트워크: 인터넷 (Cloudflare Workers)
- 기술 수준: 개발자

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M1 | API 게이트웨이 Worker | 단일 진입점 Worker → 도메인별 Worker로 Service Binding 라우팅 | P0 |
| M2 | 파일럿 도메인 분리 (Discovery) | `core/discovery` 를 독립 Worker로 추출. 12 routes + 18 services + D1 테이블 그룹 | P0 |
| M3 | shared 타입 슬리밍 | 도메인 전용 타입을 각 Worker 내부로 이동, shared에는 크로스도메인 계약 타입만 유지 | P0 |
| M4 | D1 스키마 격리 설계 | 도메인별 D1 바인딩 분리 또는 테이블 prefix/namespace 전략 확정 | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| S1 | 2차 도메인 분리 (Shaping) | Shaping 도메인을 독립 Worker로 추출 (Discovery와 의존성 있음) | P1 |
| S2 | 서비스 간 통신 계약 | Worker 간 Service Binding 인터페이스 + 에러 핸들링 표준 | P1 |
| S3 | CI/CD 분리 | 도메인별 독립 deploy.yml 또는 paths-filter 기반 선택적 배포 | P1 |
| S4 | 모니터링/옵저버빌리티 | 도메인별 독립 로깅 + 분산 트레이싱 기초 | P1 |

### 4.3 제외 범위 (Out of Scope)

- **CLI 분리**: CLI는 로컬 도구이므로 MSA 대상이 아님
- **Web 분리**: Web은 이미 Pages로 독립 배포 중. API 호출만 하므로 게이트웨이 도입 후 URL 변경만 필요
- **gate-x 재통합**: 이미 독립 Worker로 분리 완료. 현 상태 유지
- **전체 10개 도메인 분리**: Walking Skeleton 범위는 1~2개 파일럿 도메인만. 나머지는 후속 Phase
- **Kubernetes/컨테이너화**: Cloudflare Workers 생태계 유지. K8s 전환 없음
- **이벤트 드리븐 아키텍처**: 도메인 간 비동기 통신은 Phase 2 이후 (현재는 Service Binding 동기 호출)

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Cloudflare Workers | Service Binding (Worker-to-Worker) | 필수 |
| Cloudflare D1 | 도메인별 바인딩 | 필수 |
| Cloudflare KV | 캐시 공유 또는 도메인별 분리 | 선택 |
| Cloudflare R2 | 파일 스토리지 (현재 api에 바인딩) | 선택 |
| GitHub Actions | CI/CD 파이프라인 | 필수 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 독립 배포 가능 도메인 수 | 0 (전체 묶음) | 2+ (Discovery + Gateway) | `wrangler deploy` 개별 실행 |
| 도메인 간 import 누수 | 미측정 | 0건 | ESLint 커스텀 룰 |
| 파일럿 도메인 배포 시간 | ~3분 (전체) | <1분 (도메인 단독) | CI 로그 |
| shared 타입 파일 수 | 24 | 15 이하 | `ls packages/shared/src/` |

### 5.2 MVP 최소 기준

- [ ] API 게이트웨이 Worker가 `/api/discovery/*` 요청을 Discovery Worker로 라우팅
- [ ] Discovery Worker가 독립적으로 `wrangler deploy` 가능
- [ ] Discovery 관련 D1 테이블이 별도 바인딩으로 접근
- [ ] 기존 Web/CLI 클라이언트가 게이트웨이 경유로 동일하게 동작 (하위 호환)

### 5.3 실패/중단 조건

- Cloudflare Service Binding의 latency overhead가 p99 > 500ms일 경우 (현재 단일 Worker 내부 호출 ~0ms)
- Walking Skeleton에서 도메인 간 순환 의존성이 해소 불가능할 경우
- 1~2주 내 MVP 최소 기준 1개도 달성 못할 경우

---

## 6. 제약 조건

### 6.1 일정

- 목표 완료일: 2026-04-26 (2주)
- 마일스톤:
  - Week 1: M1 게이트웨이 + M2 Discovery 분리 + M4 D1 설계
  - Week 2: M3 shared 슬리밍 + S1 Shaping 분리 + S2 통신 계약

### 6.2 기술 스택

- 프론트엔드: Vite + React (변경 없음, API URL만 게이트웨이로 전환)
- 백엔드: Hono + Cloudflare Workers (도메인별 독립 Worker)
- 인프라: Cloudflare Workers + D1 + KV + R2 + Service Binding
- 기존 시스템: harness-kit (공유 미들웨어, 각 Worker에서 import)
- 혼합 가능: 필요 시 AWS Lambda/RDS 등 다른 클라우드

### 6.3 인력/예산

- 투입 가능 인원: 1명 (Sinclair) + AI 에이전트
- 예산 규모: Cloudflare Workers Free/Paid 플랜 범위 내

### 6.4 컴플라이언스

- KT DS 내부 정책: 해당 사항 없음 (내부 도구)
- 보안: 기존 JWT + RBAC 유지, Worker 간 인증은 Service Binding 내부 신뢰
- 외부 규제: 해당 없음

---

## 7. 기술 설계 방향 (Walking Skeleton)

### 7.1 대상 아키텍처

```
                    ┌─────────────────┐
                    │   Web (Pages)   │
                    │   CLI (Local)   │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  API Gateway    │  ← 신규 Worker
                    │  (fx-gateway)   │
                    └──┬──────┬───────┘
           Service     │      │    Service
           Binding     │      │    Binding
                ┌──────▼──┐ ┌─▼──────────┐
                │Discovery│ │  Main API   │  ← 기존 Worker (잔여 도메인)
                │ Worker  │ │  Worker     │
                └────┬────┘ └─────┬──────┘
                     │            │
              ┌──────▼──┐  ┌─────▼──────┐
              ���D1:disco- │  │D1:foundry- │
              │very-db   │  │x-db        │
              └──────────┘  └────────────┘
```

### 7.2 도메인 분리 우선순위

| 순위 | 도메인 | 이유 |
|------|--------|------|
| 1 | **Discovery** | 경계 명확, 외부 의존 최소, 12 routes / 18 services / 7 D1 테이블 |
| 2 | **Shaping** | Discovery 다음 파이프라인 단계, 14 routes / 23 services |
| 3 | **Offering** | Shaping 다음 단계, 12 routes / 23 services |
| 4 | **Auth** | modules/auth 이미 분리, 5 routes |
| 5+ | Agent, Harness, Portal, Gate, Launch | 복잡도 높음, Phase 2 이후 |

**Discovery 선택 근거:**
- `core/discovery/`가 다른 도메인에 대한 import가 최소 (biz_items 중심)
- D1 테이블이 명확히 그룹화 (biz_items, discovery_*, pipeline_events)
- gate-x 분리 선례와 유사한 패턴
- Walking Skeleton으로 전체 패턴을 증명하기에 적합한 규모

### 7.3 Service Binding 패턴

```typescript
// fx-gateway/src/index.ts (게이트웨이)
type Env = {
  DISCOVERY: Fetcher;  // Service Binding
  MAIN_API: Fetcher;   // Service Binding (잔여)
};

app.all('/api/discovery/*', async (c) => {
  const url = new URL(c.req.url);
  return c.env.DISCOVERY.fetch(url.toString(), c.req.raw);
});

app.all('/api/*', async (c) => {
  return c.env.MAIN_API.fetch(c.req.url, c.req.raw);
});
```

### 7.4 D1 분리 전략

**옵션 A: 별도 D1 데이터베이스** (권장)
- Discovery 전용 `foundry-x-discovery-db` 생성
- 기존 테이블 데이터 마이그레이션 필요
- 장점: 완전한 격리, 독립 백업/복원
- 단점: 크로스 도메인 JOIN 불가 (API 레벨 조합 필요)

**옵션 B: 동일 DB + 바인딩 제한**
- 같은 `foundry-x-db`를 사용하되 Worker별로 접근 테이블을 규약으로 제한
- 장점: 마이그레이션 불필요, 크로스 JOIN 가능
- 단점: 규약 위반 감지 어려움, 진정한 격리가 아님

---

## 8. 리스크

| # | 리스크 | 심각도 | 완화 전략 |
|---|--------|--------|-----------|
| R1 | Service Binding latency overhead | HIGH | Walking Skeleton에서 p99 벤치마크 선행 |
| R2 | 도메인 간 순환 의존성 발견 | MEDIUM | 진단에서 import 건강 확인됨, 런타임 의존성만 추가 확인 |
| R3 | D1 마이그레이션 데이터 정합성 | MEDIUM | 옵션 B(동일 DB)로 시작하여 리스크 최소화, 이후 옵션 A 전환 |
| R4 | 1~2주 일정 초과 | LOW | Walking Skeleton 범위를 M1+M2로 최소화, S1~S4는 후속 |
| R5 | 기존 E2E 테스트 호환성 | MEDIUM | 게이트웨이가 하위 호환 보장, E2E는 게이트웨이 URL로 전환 |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Service Binding latency 벤치마크 필요 | Sinclair | Week 1 |
| 2 | D1 분리 전략 최종 결정 (옵션 A vs B) | Sinclair | Week 1 |
| 3 | shared 타입 중 크로스도메인 계약 타입 목록 확정 | Sinclair | Week 1 |
| 4 | Agent/Harness 도메인의 크로스커팅 의존성 해소 방안 | [미정] | Phase 2 |
| 5 | 모니터링/로깅 표준 (도메인별 독립 로그 vs 통합) | [미정] | Phase 2 |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-12 | 최초 작성 (인터뷰 + 코드베이스 진단 기반) | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
