# fx-msa-roadmap-v2 PRD

**버전:** v2
**날짜:** 2026-04-14
**작성자:** AX BD팀 (Sinclair Seo)
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
W+1~W+7 기간 동안 **기존 api 코드는 건드리지 않고**, 신규로 도입되는 F-item(F534~)에만 MSA 친화 원칙을 적용하여 향후 *-X 서비스 분리 비용을 선제적으로 낮추는 점진적 하드닝 PRD.

**배경:**
Phase 39 Walking Skeleton으로 `fx-gateway` + `fx-discovery` 구조 증명은 완료. 그러나 `packages/api`는 여전히 1,139파일 모놀리식 상태. Enterprise Blueprint는 W+5 GTM 이후 W+14~W+16에 6 *-X 서비스 완전 분리를 목표로 하지만, **GTM 이전 구간(W+1~W+7)에 진행되는 신규 기능 F534~F536(Phase 43 HyperFX Activation)이 모놀리식으로 만들어지면 나중 분리 비용이 선형 증가**한다.

**목표:**
- 신규 F-item을 처음부터 독립 경계로 작성하여 기술부채 누적 방지
- GTM 일정(W+5)과 신규 기능 출시(W+2~W+5)에 **0의 지장**
- AI 에이전트 Sprint 병렬성 확보 — 도메인 경계 명확화로 충돌 감소

<!-- CHANGED: 비즈니스 성과와의 연결성 강화를 위해 비즈니스 가치 섹션 추가 -->
### 1.1 비즈니스 가치 (Business Value)

본 PRD를 통한 점진적 MSA 하드닝은 단순히 기술적인 개선을 넘어 다음의 비즈니스 성과에 직접적으로 기여합니다.

*   **GTM 일정 보호 및 가속화**: 신규 기능 개발 시점에 MSA 원칙을 적용하여, GTM 이후 발생할 수 있는 대규모 리팩토링 및 서비스 분리 비용을 최소화합니다. 이는 장기적으로 GTM 이후의 서비스 안정화 및 확장 일정을 단축시키는 효과를 가져옵니다.
*   **미래 유지보수 및 확장성 증대**: 도메인 경계가 명확해짐으로써 향후 새로운 비즈니스 요구사항에 대한 기능 추가 및 수정이 용이해지며, 특정 서비스의 장애가 전체 시스템에 미치는 영향을 최소화하여 안정적인 서비스 운영을 가능하게 합니다.
*   **고객 가치 증대**: 기술 부채 감소 및 아키텍처 개선은 개발 속도와 품질 향상으로 이어져, 고객에게 더 빠르고 안정적인 기능 제공을 가능하게 합니다. 장기적으로는 6개 *-X 서비스로의 분리를 통해 고객별 맞춤형 서비스 제공의 기반을 마련합니다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- **Walking Skeleton 완료**: `fx-gateway`(4파일) + `fx-discovery`(10파일) 구조 존재, 프로덕션 트래픽 없음
- **모놀리식 유지**: `packages/api` 1,139파일이 단일 Hono 인스턴스(`app.ts`)에 160+ 라우트 등록
- **도메인 경계 흐림**: `routes/work.ts`(412줄), `spec.ts`(237줄)가 복수 도메인 로직 혼재
- **신규 F-item 진입 임박**: Phase 43 HyperFX Activation(F534~F536)이 W+2~W+3에 구축 시작 — 패턴 미정 시 모놀리식 확대

### 2.2 목표 상태 (To-Be)

- **신규 F-item 원칙 준수**: 모든 신규 코드가 `core/{domain}/` 아래에만 배치, 도메인 간 직접 import 0건
- **Sub-app 패턴 정착**: `core/{domain}/routes/index.ts`에서 Hono sub-app으로 묶어 `app.ts`에 단일 mount
- **ESLint 룰 강제**: PR CI에서 경계 위반 자동 차단
- **SKU 경계 테이블**: HR/손해사정/문서처리 3종이 향후 어떤 *-X 서비스로 분리 가능한지 문서화

### 2.3 시급성

W+2 Sprint 287(F534 DiagnosticCollector 훅) 착수 이전에 원칙을 확정하지 못하면, 그 Sprint 산출물이 원칙 위반 상태로 merge되어 W+8+ MSA 진짜 분리 시 재작업 발생. **원칙 적용의 한계비용은 W+1(지금) = 0, W+8+ = 수 Sprint 재작업**.

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair (개발자) | 단독 개발자 + 오케스트레이터 | Sprint 병렬성, 경계 판단 자동화 |
| AI 에이전트 (Claude, autopilot) | Sprint WT 자율 실행자 | 도메인 경계가 명확해야 충돌 없이 병렬 작업 가능 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair | PRD 작성자 + 실행자 | 높음 |
| 본부장 | GTM 승인자 | **간접** — PRD 내용 자체는 관심 밖, GTM 일정 보호만 관심 |
| Type 1 첫 고객 (HR/손해사정/문서처리) | Type 1 SKU 사용자 | **간접** — 내부 구조 무관, SKU 동작만 관심 |

### 3.3 사용 환경

- 기기: PC (개발)
- 네트워크: 인터넷 (Cloudflare Workers)
- 기술 수준: 개발자 + AI 에이전트

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M1 | `core/{domain}/` 디렉토리 규약 | 모든 신규 F-item은 `packages/api/src/core/{domain}/` 하위에만 코드 추가. `routes/`, `services/` 루트 직접 추가 금지 | P0 |
| M2 | 도메인 간 import 금지 ESLint 룰 | `core/agent/*`는 `core/discovery/*` 내부 import 금지, contract(types)만 허용. 룰명 예: `no-cross-domain-import` | P0 |
| M3 | Hono sub-app mount 패턴 | `core/{domain}/routes/index.ts`에서 sub-app 구성 → `app.ts`에 `app.route('/api/{domain}', subApp)` 1줄만 등록 | P0 |
| M4 | Type 1 SKU 경계 테이블 | HR/손해사정/문서처리 3종이 각각 어떤 *-X 서비스(Discovery-X, Decode-X 등)로 분리 가능한지 매핑 문서 | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| S1 | D1 테이블 prefix 규약 (경량) | 신규 D1 테이블 생성 시 `agent_*`, `kg_*` 등 도메인 prefix 권장 (강제 룰은 아님) | P1 |
| S2 | Sprint 병렬성 가이드 문서 | AI 에이전트가 도메인 경계 기반으로 Sprint를 병렬 실행할 수 있는 패턴 정리 | P1 |
| S3 | 원칙 위반 탐지 대시보드 | ESLint 룰 위반 추이를 work management 대시보드에 표시 | P2 |

### 4.3 제외 범위 (Out of Scope)

- **기존 api 패키지 리팩토링**: 1,139파일 건드리지 않음. 기존 `routes/work.ts` 등은 원상태 유지
- **D1 분리 실행**: 별도 DB 생성 없음. 기존 `foundry-x-db` 단일 유지
- **fx-gateway 프로덕션 전환**: 트래픽 전환 안 함. Walking Skeleton 상태 유지. 실제 MSA 환경에서의 라우팅, 로드 밸런싱, 회로 차단기(circuit breaker) 등 API Gateway의 고급 기능 검증은 이 PRD의 범위가 아님.
- **Agent/Harness 도메인 분리**: 횡단 의존성 해소 없이 분리 금지 (Phase 45+ 이후)
- **latency 벤치마크**: fx-gateway 프로덕션 전환 전까지 불필요
- **Discovery 완전 분리**: fx-discovery에 남은 routes/services 이전 작업은 W+8+ 범위

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| ESLint | PR CI 연동 (`turbo lint`) | 필수 |
| Work Management Dashboard | S3 위반 탐지 표시 | 선택 (S3 구현 시) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 신규 F-item의 import 위반 건수 | — (룰 없음) | 0건 | ESLint `no-cross-domain-import` 결과 |
| SKU 경계 테이블 완성도 | 0% | 100% | 3종 SKU 모두 *-X 서비스 매핑 완료 |
| Phase 43 Sprint(F534~F536) 완료율 | 0% (진행 중) | 100% (지연 없이) | SPEC.md Sprint 상태 |
<!-- CHANGED: AI 에이전트 관련 성공 기준을 구체화하고 측정 방법을 명확히 함 -->
| Sprint 병렬 충돌 발생 (AI 에이전트 주도 Sprint 간) | — | 0건 | Git merge conflict 로그 및 Sprint 회고에서 병렬 작업 충돌 여부 확인 |

### 5.2 MVP 최소 기준

- [ ] M1~M3 원칙이 F534 이후 Sprint의 모든 신규 코드에 적용됨
- [ ] M4 SKU 경계 테이블 3종 완성
- [ ] ESLint 룰이 PR CI에 연입되어 위반이 자동 차단됨

### 5.3 실패/중단 조건

- **GTM 데모 지장**: W+4 데모 리허설에서 MSA 관련 변경이 동작을 망가뜨리면 즉시 해당 변경 revert + PRD 진행 보류
- **F534~F536 지연 30%+**: 원칙 준수 때문에 Phase 43 일정이 30% 이상 지연되면 원칙을 warn 수준으로 낮춤 (error → warn)
- **본부장 GTM 우선순위 재지정**: 상부에서 GTM 집중 지시 시 PRD 즉시 중단

---

## 6. 제약 조건

### 6.1 일정

- 시작일: 2026-04-14 (W+1 시작, Phase 42 완료 직후)
- 완료일: 2026-06-01 (W+7 종료)
- 마일스톤:
  - **W+1** (4/14~4/20): PRD 확정 + ESLint 룰 구현 + PR CI 연입
  - **W+2** (4/21~4/27): F534 DiagnosticCollector 훅에 원칙 최초 적용 (Sprint 287)
  - **W+3** (4/28~5/04): F535 Graph API+UI 적용 (Sprint 288) + SKU 경계 테이블 초안
  - **W+4** (5/05~5/11): F536 MetaAgent 훅 적용 (Sprint 289) + SKU 경계 테이블 확정
  - **W+5** (5/12~5/18): GTM 1차 외부 공개 — MSA는 관망
  - **W+6~W+7** (5/19~6/01): 원칙 누적 검증 + 대시보드(S3) 선택 구현

### 6.2 기술 스택

- 백엔드: Hono + Cloudflare Workers + D1 (변경 없음)
- 런타임 검증: ESLint (커스텀 룰 `no-cross-domain-import`, `no-direct-route-register`)
- 프론트엔드: 변경 없음 (Vite + React)
- 인프라: Cloudflare Workers (변경 없음 — 단일 Worker 유지)

### 6.3 인력/예산

- 투입 가능 인원: Sinclair 단독 + AI 에이전트 (Claude, autopilot)
- 예산: 기존 Cloudflare 플랜 범위 내 (추가 없음)

### 6.4 컴플라이언스

- KT DS 내부 정책: 해당 없음 (내부 도구)
- 보안: 기존 JWT + RBAC 유지
- 외부 규제: 해당 없음

<!-- CHANGED: Rollback/Hotfix 플랜 섹션 추가 -->
### 6.5 Rollback/Hotfix 플랜

- **ESLint 룰 관련**: 초기 ESLint 룰 적용 시, 예상치 못한 빌드 실패나 개발 흐름 방해가 발생할 경우, 해당 룰을 `warn` 수준으로 일시 하향 조정하거나, 특정 파일/디렉토리에 대한 예외 처리를 즉시 적용합니다.
- **기능 개발 관련**: MSA 원칙 적용으로 인해 GTM 일정에 영향을 미치는 심각한 버그나 지연이 발생할 경우, 해당 변경사항을 즉시 revert하고 이전 안정 버전으로 복구합니다. Hotfix는 기존 모놀리식 패턴을 우선 적용하여 긴급성을 해소하고, 사후에 MSA 원칙 재적용 여부를 검토합니다.

<!-- CHANGED: 테스트 전략 섹션 추가 -->
### 6.6 테스트 전략

- **Unit/Integration 테스트**: 신규 `core/{domain}/` 하위에 개발되는 모든 코드에 대해 충분한 Unit 및 Integration 테스트를 작성하여, 도메인 내부 로직의 견고성을 확보합니다.
- **CI/CD 연동**: ESLint 룰은 PR CI에 연동하여 코드 병합 전에 자동으로 위반 여부를 검사합니다.
- **Smoke Test**: 신규 기능 배포 시, 주요 비즈니스 흐름에 대한 최소한의 Smoke Test를 수행하여 MSA 원칙 적용으로 인한 회귀(Regression) 위험을 최소화합니다.

<!-- CHANGED: 변경 관리 및 커뮤니케이션 섹션 추가 -->
### 6.7 변경 관리 및 커뮤니케이션

- **주간 미팅**: Sinclair와 AI 에이전트 간 주간 Sprint 미팅을 통해 원칙 준수 현황, 발생 이슈, 진행 상황을 공유하고 조율합니다.
- **문서화**: 본 PRD 및 관련 가이드라인(CLAUDE.md, Sprint autopilot 프롬프트)을 지속적으로 업데이트하여 최신 정보를 유지합니다.
- **이해관계자 보고**: GTM 일정에 영향을 미칠 수 있는 중대한 변경이나 이슈 발생 시, 본부장 등 주요 이해관계자에게 즉시 보고합니다.

<!-- CHANGED: 모니터링 및 후속 검증 섹션 추가 -->
### 6.8 모니터링 및 후속 검증

- **KPI 추적**: 5.1에 정의된 KPI(import 위반 건수, SKU 경계 테이블 완성도, Sprint 완료율, 병렬 충돌 발생)를 주간 단위로 추적하고 검토합니다.
- **ESLint 룰 위반 모니터링**: S3 기능 구현 시 대시보드를 통해 ESLint 룰 위반 추이를 지속적으로 모니터링하고, 특정 도메인이나 개발자에게서 반복적인 위반이 발생할 경우 추가 교육이나 가이드라인 강화 조치를 취합니다.
- **Sprint 회고**: 각 Sprint 종료 후 회고를 통해 MSA 원칙 적용 과정에서의 성공 요인과 개선점을 도출하고 다음 Sprint에 반영합니다.

<!-- CHANGED: 가정 및 검증 섹션 추가 -->
### 6.9 가정 및 검증

| # | 가정 (Assumption) | 검증 (Verification) |
|---|------------------|--------------------|
| A1 | 신규 F-item (F534~F536)이 기존 모놀리식 코드의 핵심 로직과 강한 결합 없이 독립적인 도메인으로 설계될 수 있음 | F534~F536 기능 분석 및 도메인 분리 가능성 사전 검토. 개발 진행 중 의존성 발생 시 즉시 리스크 R9 완화 전략 적용 |
| A2 | ESLint 커스텀 룰(`no-cross-domain-import`, `no-direct-route-register`)이 신규 파일에만 정확히 적용되고, 기존 코드에 false positive를 발생시키지 않음 | W+1 내 PoC(Proof of Concept) 완성 및 실제 PR 흐름에 테스트 적용하여 동작 확인 |
| A3 | SKU 경계 테이블 초안이 조직 내 핵심 이해관계자(서비스 오너/PM/아키텍트)와 합의된 최소 버전으로 확정 가능함 | W+3 초안 작성 후 관련 이해관계자와 최소 1회 검토 및 피드백 반영 |
| A4 | AI 에이전트가 새로운 MSA 원칙과 패턴을 학습하고 적용하여 Sprint 병렬성에 기여할 수 있음 | CLAUDE.md 업데이트 및 Sprint autopilot 프롬프트에 원칙 주입 후, 실제 Sprint 수행 결과(merge conflict 로그, 생산성)로 검증 |

---

## 7. 기술 설계 방향

### 7.1 core/{domain}/ 구조

```
packages/api/src/
├── app.ts                    # sub-app mount만 담당
├── routes/                   # 🔒 기존 파일만 유지, 신규 추가 금지
├── services/                 # 🔒 기존 파일만 유지, 신규 추가 금지
└── core/
    ├── agent/                # 기존
    │   ├── routes/
    │   │   └── index.ts      # sub-app 구성
    │   ├── services/
    │   └── types.ts          # contract
    ├── discovery/            # 기존
    ├── ontology/             # 🆕 F535에서 신규 (예시)
    │   ├── routes/
    │   │   └── index.ts
    │   ├── services/
    │   └── types.ts
    └── meta-agent/           # 🆕 F536에서 신규 (예시)
        └── ...
```
<!-- CHANGED: 계층형 아키텍처의 한계에 대한 내용 추가 -->
> **참고**: `core/{domain}/services/` 구조는 도메인 내 계층형 아키텍처를 유도하며, 이는 도메인 주도 설계(DDD)의 애그리게이트 경계와 다를 수 있습니다. 현재는 점진적 하드닝을 위한 초기 단계로 이 구조를 채택하나, 향후 완전한 서비스 분리 시 내부 리팩토링이 필요할 수 있습니다.

### 7.2 app.ts 등록 패턴

```typescript
// Before (금지)
app.post('/api/ontology/extract', ontologyRoute);
app.get('/api/ontology/graph', graphRoute);

// After (필수)
import { ontologyApp } from './core/ontology/routes/index.js';
app.route('/api/ontology', ontologyApp);
```

### 7.3 ESLint 룰 설계

**룰 1: `no-cross-domain-import`**
- `packages/api/src/core/X/**` 파일에서 `packages/api/src/core/Y/**` import 차단
<!-- CHANGED: 공유 타입 관리 부재에 대한 개선 방안 반영 -->
- 예외: `packages/api/src/core/Y/types.ts` 또는 `packages/api/src/shared/contracts/**` (공통 contract)만 허용

**룰 2: `no-direct-route-register`** (선택 — S1)
- `packages/api/src/app.ts`에서 `app.{get|post|...}('/api/...')` 직접 호출 차단
- 필수: `app.route(prefix, subApp)` 패턴

### 7.4 SKU 경계 테이블 (초안, W+3에 확정)

| SKU | 필요 *-X 서비스 | 의존 도메인 | 분리 난이도 |
|-----|----------------|------------|------------|
| HR 반제품 | Discovery-X, Foundry-X | auth, files, workflow | 중간 |
| 손해사정 반제품 | Discovery-X, Decode-X, Guard-X | files, ontology | 높음 (Ontology 미완성) |
| 문서처리 반제품 | Foundry-X, Launch-X | files, templates | 낮음 |

---

## 8. 리스크

| # | 리스크 | 심각도 | 완화 전략 |
|---|--------|--------|----------|
<!-- CHANGED: R1 개발 속도 저해 리스크의 심각도와 구체적인 우려 반영 -->
| R1 | 원칙이 F534 개발 속도를 30%+ 저해 및 Sprint 딜레이 폭발적 발생 | HIGH | warn 수준 fallback 즉시 적용 + 주간 속도 측정 및 회고 + 초기 1-2 Sprint에 패턴 학습 시간 할당 |
| R2 | 기존 코드에서 원칙 위반 대량 발견 → false positive | MEDIUM | 신규 파일(F534 이후 커밋)에만 룰 적용 — 기존은 exemption |
<!-- CHANGED: R3 SKU 경계 결정 리스크의 구체적인 우려 반영 -->
| R3 | SKU 경계 결정 및 이해관계자 합의 지연이 구조 설계 자체의 근간을 흔들 수 있음 | MEDIUM | W+3 초안으로 충분, W+4 확정은 최후. 핵심 이해관계자와의 조기 커뮤니케이션 및 합의된 최소 버전으로 확정 노력 |
<!-- CHANGED: R4 AI 에이전트 이해도/적용성 리스크 강화 -->
| R4 | AI 에이전트가 원칙 자체를 모름 → Sprint WT에서 위반 발생 및 실제 적용 한계 | MEDIUM | Sprint autopilot 프롬프트에 원칙 요약 주입 + CLAUDE.md에 상세 가이드 추가 + 초기 Sprint 결과 모니터링 및 프롬프트 개선 반복 |
| R5 | Agent/Harness 신규 기능이 MSA 경계와 순환 유발 | LOW | Agent/Harness 도메인 변경은 이 PRD 범위 외 |
<!-- CHANGED: DeepSeek 의견 반영 - 계층형 아키텍처 한계에 대한 리스크 추가 -->
| R6 | `core/{domain}/services/` 구조가 향후 완전한 서비스 분리 시 내부 리팩토링 부담으로 작용 | LOW | 현재는 점진적 하드닝을 위한 허용 가능한 트레이드오프. W+8+ 완전 분리 시점에 리팩토링 계획 수립 |
<!-- CHANGED: DeepSeek 의견 반영 - API Gateway 역할 미비에 대한 리스크 추가 -->
| R7 | `fx-gateway`의 프로덕션 트래픽 부재로 실제 MSA 환경에서의 라우팅, 로드 밸런싱 등 API Gateway 검증이 미비 | MEDIUM | 이 PRD의 범위 외이나, GTM 이후 `fx-gateway` 프로덕션 전환 시점에 관련 검증 및 개선 계획 수립 |
<!-- CHANGED: ChatGPT 의견 반영 - ESLint 커스텀 룰 구현 난이도 리스크 추가 -->
| R8 | ESLint 커스텀 룰 구현 난이도 및 예상치 못한 복잡성 | MEDIUM | W+1 내 PoC(Proof of Concept) 완성 목표 + 필요시 외부 라이브러리/플러그인 활용 검토 |
<!-- CHANGED: ChatGPT 의견 반영 - 신규 도메인 간 실제 의존성 발생 시 우회/해결 전략 미흡 리스크 추가 -->
| R9 | 신규 도메인 간 불가피한 실제 의존성 발생 시 우회/해결 전략 미흡 | MEDIUM | 초기에는 `shared/contracts/`를 통한 간접 의존성만 허용. 구조적 순환 의존성 발생 시, 도메인 재설계 또는 특정 의존성 예외 처리 프로세스 수립 (장기 과제) |
<!-- CHANGED: DeepSeek 의견 반영 - 가짜 모듈화 위험 리스크 추가 -->
| R10 | 단일 코드베이스 내 디렉토리 분리만으로 가짜 모듈화(Fake Modularity)에 그쳐, 실제 서비스 분리 시 예상치 못한 복잡성 발생 | MEDIUM | 점진적 하드닝의 한계임을 인지. W+8+ 완전 분리 시점에서 네트워크 지연, 분산 트랜잭션, 독립 배포 등 실제 MSA 과제에 대한 상세 계획 수립 |
<!-- CHANGED: DeepSeek 의견 반영 - ESLint 룰 유지보수 부담 리스크 추가 -->
| R11 | ESLint 커스텀 룰의 코드베이스 진화에 따른 지속적인 유지보수 부담 | LOW | 룰 변경 발생 시 즉시 업데이트 및 문서화. 룰이 너무 엄격하거나 느슨해지는 경우 주간 Sprint 회고를 통해 조정 |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
<!-- CHANGED: ESLint 커스텀 룰 구현 상세 이슈에 PoC 완료 및 신규 파일 적용 확인 추가 -->
| 1 | ESLint 커스텀 룰 구현 상세 (AST 패턴) 및 PoC(Proof of Concept) 완료, 신규 파일에만 적용 확인 | Sinclair | W+1 |
<!-- CHANGED: contract 형태 허용 범위 이슈에 shared/contracts/ 레이어 검토 추가 -->
| 2 | `types.ts` 외 contract 형태 허용 범위 (e.g. `interfaces/`, `contracts/`, `shared/contracts/` 도입 검토)