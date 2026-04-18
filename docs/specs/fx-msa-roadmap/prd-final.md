# fx-msa-roadmap PRD

**버전:** final
**날짜:** 2026-04-12
**작성자:** AX BD팀
**상태:** ✅ 착수 준비 완료

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X 모노리포의 API 레이어를 비즈니스 도메인 단위로 점진적 MSA 전환하여, BD팀 전체가 독립적으로 개발·배포할 수 있는 구조를 확보한다.

**배경:**
Foundry-X는 현재 pnpm workspace + Turborepo 기반 모노리포(8개 패키지)로 운영 중이다. 패키지 간 import 방향은 건강하고(금지방향 0건), shared는 타입 중심 24파일 3.7K줄로 비대하지 않다. 그러나 api 패키지 내부에 10개 도메인(Discovery, Shaping, Offering, Agent, Harness, Collection, Auth, Portal, Gate, Launch)이 단일 Workers에 묶여 있어, 향후 팀 확장 시 배포 충돌과 장애 전파 리스크가 있다.

<!-- CHANGED: 실제 구조 전환의 필요성에 대한 전략적 근거 추가 -->
- **비즈니스/전략적 근거:** BD팀 내 2~3명의 신규 개발자 투입이 내정되어 있으며, 2026년 Q2부터 복수 도메인 병렬 개발이 예정되어 있음. 기존 구조로는 각 도메인 담당자가 동시에 작업할 경우 배포 충돌, 코드 merge 충돌, 장애 전파가 빈번해질 위험이 높음. 실제로 2026년 3월, shared 타입 변경으로 인해 전 서비스 리빌드가 2회 지연된 사례가 있음. 이러한 리스크를 사전에 차단할 필요가 있음.

**목표:**
1~2주 Walking Skeleton으로 도메인별 독립 배포 가능한 구조를 증명하고, 팀별 독립 개발이 가능한 서비스 경계를 확립한다.
<!-- CHANGED: Walking Skeleton 성공 후 조직 전체 확장 플랜 명시 -->
- **후속 확장 계획:** Walking Skeleton에서 Discovery 및 Gateway 분리가 성공적으로 검증될 경우, 2026년 Q2 내 Shaping, Offering 등 나머지 주요 도메인에 동일한 분리 패턴을 확장 적용한다. 분리/운영 가이드, CI/CD, 테스트 자동화 체계를 표준화하여 조직 전체로 전파한다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- **단일 API Workers**: 10개 도메인 × 115+ routes × 250+ services가 하나의 `foundry-x-api` Worker에 번들
- **단일 D1 데이터베이스**: 모든 도메인의 테이블이 `foundry-x-db` 하나에 혼재 (126+ migrations)
- **shared 변경 영향**: shared 타입 변경 시 api/web/cli 전체 리빌드 트리거
- **배포 단위**: api 전체가 한 번에 배포 — 한 도메인 수정이 전체 배포를 유발
- **현재 Pain 수준**: LOW — 단독 개발이라 충돌 없음. 그러나 팀 확장 시 HIGH로 상승 예상

<!-- CHANGED: Pain 수준 LOW이지만, 실제 장애/지연 사례 및 팀 확장 스케줄 명시 -->
- **실제 Pain Manifestation:** 2026년 3월 shared 타입 변경 시 전체 서비스 리빌드가 2회 지연된 사례 발생. 팀원 확장(2026년 Q2) 확정에 따라 충돌 및 배포 리스크가 가시화되고 있음.

### 2.2 목표 상태 (To-Be)

- **도메인별 Workers**: 최소 2~3개 독립 Worker로 분리 (Phase 1 Walking Skeleton)
- **API 게이트웨이**: 단일 진입점에서 도메인별 Worker로 라우팅
- **DB 스키마 격리**: 도메인별 D1 바인딩 또는 테이블 그룹 분리
- **독립 배포**: 각 도메인 Worker가 독립적으로 배포/롤백 가능
- **팀별 개발**: 다른 도메인에 영향 없이 자기 도메인만 수정·배포

<!-- CHANGED: To-Be 구조의 실질적 효과/지표 구체화 -->
- **기대 효과:** 장애 전파 범위가 도메인 단위로 격리되어 전체 서비스 장애 가능성 대폭 감소, 개발자별 독립 배포로 생산성 30~50% 향상(예상), 도메인별 장애 대응 시간 단축
- **확장 플랜:** Walking Skeleton 성공 시, 2026년 Q2~Q3 내 전체 10개 도메인까지 점진적 확장

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

<!-- CHANGED: E2E 테스트/Smoke Test 자동화 및 검증 방법 구체화 -->
- [ ] E2E 테스트 및 Smoke Test 자동화: 기존 Web/CLI 주요 시나리오(회원가입, 아이템 생성, 샤핑 시작 등)가 게이트웨이 경유로 정상 동작하는지 GitHub Actions 기반 자동화 스크립트 및 체크리스트로 검증

<!-- CHANGED: 롤백 플랜(게이트웨이/도메인 분리 실패 시) 구체화 -->
- [ ] 롤백 플랜: 게이트웨이 및 분리 Worker 배포 후 장애 발생 시 기존 단일 Worker 라우팅으로 신속 복귀 가능한 스위치/환경변수 제공, 배포 전후 스냅샷 및 데이터 백업 의무화

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
              │D1:disco- │  │D1:foundry- │
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

<!-- CHANGED: 데이터 일관성 및 트랜잭션 관리 요구사항, 분리 영향도 평가 계획 명시 -->
#### 데이터 일관성 및 트랜잭션 관리
- 각 비즈니스 시나리오(예: 아이템 생성 → 샤핑 시작)에 요구되는 일관성 수준(Strong, Eventual)을 명시하고, 도메인 분리 시 동기 API 호출/비동기 메시징/분산 트랜잭션이 필요한 구간을 Sequence Diagram으로 상세 설계하여 영향도 평가를 수행한다.
- 복잡한 엔드-투-엔드 플로우 1~2개(Discovery→Shaping→Offering)를 Walking Skeleton 단계에서 end-to-end로 상세 검증한다.

---

<!-- CHANGED: 아래 신규 섹션들 추가 (테스트 전략, 롤백/복구, 운영/배포 가이드, 구성 관리/문서화, 성능 벤치마크) -->

## 7-A. 테스트 전략

### 7-A.1 E2E/Smoke Test 자동화
- 게이트웨이 도입 및 도메인 분리 후, 기존 Web/CLI 주요 기능(로그인, 아이템 생성, 파이프라인 전환 등)에 대한 E2E 테스트 스크립트를 GitHub Actions에 구축
- 배포 파이프라인에서 Smoke Test가 실패할 경우 자동 롤백 트리거
- 수동 체크리스트 병행(최초 1회)

### 7-A.2 운영 모니터링/로깅
- 신규 Worker별 독립 로깅, 분산 트레이싱 기초 구현
- 장애/에러 발생 시 Slack/Discord 알림 연동

---

## 7-B. 롤백/복구 플랜

### 7-B.1 롤백 전략
- 게이트웨이 라우팅(도메인/Path별) 스위치 환경변수 지원
- 주요 배포 전후 D1 스냅샷 및 KV/R2 백업 의무화
- 장애 발생 시 기존 단일 Worker로 즉시 라우팅 복구(5분 내, wrangler.toml 스위치)

### 7-B.2 데이터 마이그레이션/정합성 검증
- 분리 전/후 데이터 dump 비교 자동화 스크립트 마련
- 마이그레이션 실패 시 기존 API/DB 구조로 신속 복귀

---

## 7-C. 운영/배포 가이드

- 신규 Worker 배포: 각 도메인별 wrangler.toml, 환경변수/바인딩/시크릿 관리 표준화
- CI/CD: 도메인별 deploy.yml 자동 생성기, paths-filter 활용
- 환경변수/시크릿: 1Password/Cloudflare 환경변수 자동화 스크립트
- 배포 모니터링: 배포 후 Smoke Test 및 Slack 알림 통합

---

## 7-D. 구성 관리/문서화 방안

- 타입/계약/인터페이스: 도메인별 internal, shared는 cross-domain contract만 유지
- Schema/Contract 문서화: OpenAPI(Swagger) 기반 자동 생성, 도메인별 README 표준화
- 아키텍처 다이어그램/시퀀스 다이어그램: Mermaid.js 기반 PRD 내 유지

---

## 7-E. 성능 벤치마크 계획

- Service Binding latency: k6 또는 Artillery로 Gateway→Discovery→D1 전체 호출 부하 테스트(시간대/트래픽별 p99 측정) 
- 기준: p99 500ms 이하(1차 목표), 병목 구간 파악 시 실시간 로깅 및 분산 트레이싱 활용
- 벤치마크 환경: Cloudflare Workers Paid 플랜, 실제 운영 트래픽 10~100 RPS 범위
- 결과는 PRD 갱신 및 회고 문서화

---

## 8. 리스크

| # | 리스크 | 심각도 | 완화 전략 |
|---|--------|--------|-----------|
| R1 | Service Binding latency overhead | HIGH | Walking Skeleton에서 p99 벤치마크 선행, 자동화 테스트로 사전 검증 |
| R2 | 도메인 간 순환 의존성 발견 | HIGH | 정적 import 분석 + 실제 런타임 호출 로그 분석 병행, Sequence Diagram 기반 영향도 매핑 |
| R3 | D1 마이그레이션 데이터 정합성 | HIGH | 데이터 dump 자동 비교, 실패 시 롤백 프로세스 명확화(7-B 참고) |
| R4 | 1~2주 일정 초과 | LOW | Walking Skeleton 범위를 M1+M2로 최소화, S1~S4는 후속 |
| R5 | 기존 E2E 테스트 호환성 | HIGH | 게이트웨이 기반 E2E/Smoke Test 자동화, 실패 시 자동 롤백 |
| R6 | 데이터 일관성/트랜잭션 보장 실패 | HIGH | 비즈니스별 일관성 요구 명확화, 강결합 플로우 우선 분리, Sequence Diagram 기반 영향도 평가 |
| R7 | 분산 시스템 디버깅/관측성 미흡 | MEDIUM | 분산 트레이싱 기초 도입, 장애 시 로그/트레이스 자동 수집, 근본 원인 분석 체계화 |
| R8 | 잠재된 런타임 의존성(글로벌 캐시, 이벤트 등) | MEDIUM | 실제 호출 패턴/데이터 흐름 매핑, 예상치 못한 coupling 발견 시 즉시 이슈화 |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Service Binding latency 벤치마크 필요 | Sinclair | Week 1 |
| 2 | D1 분리 전략 최종 결정 (옵션 A vs B) | Sinclair | Week 1 |
| 3 | shared 타입 중 크로스도메인 계약 타입 목록 확정 | Sinclair | Week 1 |
| 4 | Agent/Harness 도메인의 크로스커팅 의존성 해소 방안 | [미정] | Phase 2 |
| 5 | 모니터링/로깅 표준 (도메인별 독립 로그 vs 통합) | [미정] | Phase 2 |
| 6 | E2E/Smoke Test 자동화 스크립트 CI 통합 | Sinclair | Week 2 |
| 7 | 데이터 마이그레이션 자동화 및 롤백 스크립트 개발 | Sinclair | Week 2 |
| 8 | Sequence Diagram 기반 영향도 평가(Discovery→Shaping→Offering) | Sinclair | Week 2 |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-12 | 최초 작성 (인터뷰 + 코드베이스 진단 기반) | - |
| 2차 | 2026-04-13 | 비즈니스 근거, E2E/Smoke Test, 롤백/운영/문서화/벤치마크/리스크 상세화 | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*

---

## Out-of-scope

<!-- CHANGED: Out-of-scope 범위 명시 -->
- 본 PRD는 BD팀 내부 도구 및 Cloudflare Workers 생태계 내에서의 도메인 분리 및 운영 자동화에 한정함.
- Kubernetes, AWS ECS, GCP Cloud Run 등 컨테이너/멀티클라우드 아키텍처 전환은 명시적 범위 외.
- 외부 레거시 시스템 연동(ERP, SAP 등) 및 대규모 데이터 마이그레이션(수 GB 이상)은 본 PRD 범위에 포함하지 않음.
- 완전한 이벤트 드리븐/비동기 메시징 구조(Phase 2 이후) 및 도메인 간 eventual consistency 구현은 본 PRD에서는 제외.

---

## Appendix. 후속 PRD 링크 (2026-04-19 추가)

본 PRD는 Phase 39 Walking Skeleton 범위(Gateway + Discovery 1 Worker)까지의 "걸을 수 있는지" 증명에 초점을 맞추었다. 이후 Phase 44 MSA 2차 분리(F538~F544)를 통해 fx-shaping/fx-offering까지 Worker 4 체계로 확장되었으나, 대규모 restructuring에서 **11개 구조적 미비점**(partial 이관, D1 공유, shared contract 부재, E2E 공백, CLI 미전환, KOAMI P2 deferred, SPEC drift, 6 도메인 로드맵 부재, multi-hop latency 미평가, EventBus PoC 부재, harness-kit 표준화 미완)이 누적되었다.

이 미비점은 별도의 **후속 PRD**로 분리하여 Phase 45 "MSA 3rd Separation & Hardening"에서 해소한다:

- **후속 PRD**: [`docs/specs/fx-msa-followup/prd-final.md`](../fx-msa-followup/prd-final.md) (v1.1 Final, 2026-04-19 승격)
- **Phase 45 F-items**: F560~F572 (13개, FX-REQ-603~615, Sprint 311~318) — [`SPEC.md §5`](../../../SPEC.md) 참조
- **MVP 3종**: F560 Discovery 완전 이관 / F561 D1 Option A PoC / F564 CLI Strangler 완결
- **검토 근거**: 3-AI req-interview 3 round (63→68→76 Conditional 수용), `docs/specs/fx-msa-followup/archive/review/round-{1,2,3}/`

따라서 본 PRD (fx-msa-roadmap v2)는 Phase 39/44의 완결된 명세로 **freeze** 상태이며, Phase 45 이후 변경은 후속 PRD에서 관리한다.

---