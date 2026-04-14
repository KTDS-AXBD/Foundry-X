# fx-msa-roadmap-v2 PRD

**버전:** v1
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
- **fx-gateway 프로덕션 전환**: 트래픽 전환 안 함. Walking Skeleton 상태 유지
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
| Sprint 병렬 충돌 발생 | — | 0건 | merge conflict 로그 (원칙 준수 Sprint 간) |

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
- 예외: `packages/api/src/core/Y/types.ts` (contract)만 허용

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
| R1 | 원칙이 F534 개발 속도를 30%+ 저해 | HIGH | warn 수준 fallback + 주간 속도 측정 |
| R2 | 기존 코드에서 원칙 위반 대량 발견 → false positive | MEDIUM | 신규 파일(F534 이후 커밋)에만 룰 적용 — 기존은 exemption |
| R3 | SKU 경계 결정이 GTM 제안서 작성 일정과 충돌 | MEDIUM | W+3 초안으로 충분, W+4 확정은 최후 |
| R4 | AI 에이전트가 원칙 자체를 모름 → Sprint WT에서 위반 발생 | MEDIUM | Sprint autopilot 프롬프트에 원칙 요약 주입 + CLAUDE.md에 추가 |
| R5 | Agent/Harness 신규 기능이 MSA 경계와 순환 유발 | LOW | Agent/Harness 도메인 변경은 이 PRD 범위 외 |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | ESLint 커스텀 룰 구현 상세 (AST 패턴) | Sinclair | W+1 |
| 2 | `types.ts` 외 contract 형태 허용 범위 (e.g. `interfaces/`, `contracts/`) | Sinclair | W+1 |
| 3 | SKU 경계 테이블 3종의 실제 *-X 서비스 할당 기준 | Sinclair | W+3 |
| 4 | CLAUDE.md에 원칙 추가 + Sprint autopilot 프롬프트 반영 | Sinclair | W+2 시작 전 |
| 5 | S3 대시보드 구현 범위 (work management와 별개 뷰? 통합?) | [미정] | W+6 |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-14 | 최초 작성 (인터뷰 + 참조 문서 2종 기반) | - |

---

## 11. 참조 문서

- `docs/specs/fx-msa-roadmap/prd-final.md` — Phase 39 Walking Skeleton PRD (이 PRD의 전제)
- `docs/specs/fx-msa-roadmap/msa-transition-diagnosis.md` — 현재 상태 진단
- `docs/specs/fx-msa-roadmap/enterprise-blueprint-v3.html` — 사업 Blueprint (GTM 일정 + 6 *-X 서비스 비전)
- `SPEC.md §5` — F534~F536 F-item 정의 (Phase 43)

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
