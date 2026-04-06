# AX BD MSA 재조정 PRD

**버전:** v3
**날짜:** 2026-04-07
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X 모놀리스를 BD 프로세스 2~3단계(발굴+형상화) 전용 서비스로 축소하고, 새 서비스 창건을 위한 harness-kit 공통 기반 패키지를 생성하여 AX BD 서비스 그룹 MSA 전환의 토대를 마련한다.

**배경:**
Foundry-X는 F1~F391(19개 Phase, 178 Sprint)를 거치며 BD 프로세스 전체를 담당하는 모놀리스로 성장했다. 현재 118 routes, 252 services, 133 schemas, D1 마이그레이션 113건 규모이며, Auth/SSO부터 수집, 발굴, 형상화, 검증, 제품화, GTM, 평가까지 BD 6+1단계 전체를 포함한다. BD 프로세스 각 단계의 독립적 배포/운영/진화를 위해 MSA 전환이 필요하다.

**목표:**
1. Foundry-X를 2~3단계(발굴+형상화) 전용 서비스로 한정
2. 비핵심 기능(Auth, Dashboard, Wiki, 검증, 제품화, GTM 등)을 이관 가능 상태로 분리
3. harness-kit 공통 패키지로 새 서비스 창건 기반 확보

**이관과 분리의 정의:**
- **분리(Separation):** 기존 Foundry-X 모놀리스에서 비핵심 기능(예: Auth/SSO, Dashboard 등)을 코드/디렉토리/패키지 경계 기준으로 명확히 분리하여, 서비스별 모듈화 및 독립 배포 준비 상태로 만든다. 이 때 Foundry-X 내에서는 해당 기능이 '분리된 모듈'로 남아 있으나, 실제 삭제되지는 않는다.
- **이관(Migration):** 분리된 모듈을 신규 독립 서비스(예: Gate-X, Launch-X 등)로 완전히 옮기고, Foundry-X에서는 해당 기능을 실제로 제거한다. 이관이 완료되기 전까지는 '분리 but 유지' 상태(Foundry-X 내 분리 모듈로 동작)를 유지한다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

| 항목 | 현재값 |
|------|--------|
| 총 F-items | F1~F391 (267건 구현 완료, 4건 📋) |
| API Routes | 118개 (단일 Workers) |
| Services | 252개 (단일 패키지) |
| Schemas | 133개 |
| D1 Migrations | 0001~0113 (단일 DB) |
| E2E Tests | 263개 (단일 테스트 스위트) |
| 패키지 구조 | cli / api / web / shared (4개 모노리포) |

**문제점:**
- BD 프로세스 6+1단계가 단일 Workers에 혼재 — 단계별 독립 배포 불가
- 단일 D1 데이터베이스에 모든 테이블 — 서비스 간 데이터 경계 불명확
- Auth/SSO, Dashboard, Wiki 등 포털 기능이 BD 엔진과 같은 코드베이스 — 관심사 분리 실패
- 118 routes × 단일 Workers — 콜드스타트/메모리 압박 증가 추세

**서비스 경계의 현황:**
- 현재 서비스 간의 코드, 데이터, API 명확한 경계 정의가 부족하여, 기능별로 분리 이후에도 종속성이 남아있는 상황이다. 특히 데이터베이스 스키마와 서비스별 책임 범위, 공통 컴포넌트 사용 규칙이 불명확하다.

### 2.2 목표 상태 (To-Be)

| 항목 | 목표값 |
|------|--------|
| Foundry-X Routes | ~60~70개 (2~3단계 전용) |
| Foundry-X 전담 | 발굴(2-0~2-10) + 형상화(BMC/BDP/Offering/PRD/Prototype) |
| 이관 대상 | Auth/SSO, Dashboard/KPI, Wiki, 검증, 제품화, GTM, 평가 |
| harness-kit | 새 서비스 scaffold 1분 내 생성 가능 |
| 테스트 | 분리된 E2E 통과 + Production smoke 정상 |

**To-Be 아키텍처 원칙:**
- 서비스별 책임과 데이터 경계를 명확히 정의한다.  
- D1 DB는 서비스별로 테이블을 태깅하여, 점진적 분할 및 마이그레이션을 가능하게 한다.  
- 서비스 간 통신은 기본적으로 REST(동기)로 시작하되, 이벤트(EventBus) 기반 비동기 통신을 병행하여 데이터 일관성을 확보한다.
- 인증/인가(RBAC)는 harness-kit 기반 공통 미들웨어로 통합, 서비스별로 JWT 검증 로직을 제공한다.
- harness-kit 및 shared 패키지의 의존성은 명시적 버전 관리 및 하위 호환성 정책을 따른다.

### 2.3 시급성

- Phase 20으로 즉시 착수 (우선순위 1위)
- BD 프로세스 단계별 독립 서비스 운영이 향후 서비스 확장의 전제 조건
- 모놀리스 복잡도가 지속 증가하여 조기 분리가 유리

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| AX BD팀 개발자 | 7명, AI Agent 기반 개발 | 서비스별 독립 개발/배포/테스트 |
| AX BD팀 사업개발자 | 7명, BD 프로세스 사용자 | 기존 기능 회귀 없이 안정적 사용 |

**도입 장벽 및 수용 가능성:**
- 개발자: 논리적/기술적 분리와 새로운 MSA 구조에 대한 러닝커브가 존재하므로, 전환 가이드, harness-kit 문서, 변경관리 프로세스가 필요하다.
- 사업개발자: UI/UX 및 프로세스 변화에 대한 사전 커뮤니케이션이 필요하다.

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair (BD팀장) | 기술 방향 결정, 아키텍처 승인 | 높음 |
| BD팀 전원 | 일상 사용자, 피드백 제공 | 중간 |

### 3.3 사용 환경

- 기기: PC (사내 개발 환경)
- 네트워크: 인터넷 (Cloudflare Workers/Pages)
- 기술 수준: 개발자 (AI Agent 활용)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | **Foundry-X 2~3단계 한정** | 발굴(2-0~2-10) + 형상화(BMC/BDP/Offering/PRD/Prototype) 기능만 잔류 | P0 |
| 2 | **이관 대상 기능 분리** | Auth/SSO, Dashboard, Wiki, 검증, 제품화, GTM 기능을 모듈 경계로 분리 (제거는 아님, 분리 후 별도 서비스 이관 준비) | P0 |
| 3 | **harness-kit 패키지 생성** | 새 서비스의 공통 기반: Workers scaffold + D1 setup + JWT 검증 미들웨어 + CORS + 이벤트 계약 + CI/CD 템플릿 | P0 |
| 4 | **D1 스키마 경계 정의** | 테이블을 서비스별로 태깅하여 향후 D1 분리 준비. 크로스 서비스 FK 식별 | P0 |
| 5 | **F268~F391 서비스 배정** | 124건 증분 F-item을 서비스별로 분류하여 설계서 업데이트 | P0 |

**harness-kit 범위 명확화:**
- harness-kit은 서비스별 Workers scaffold, D1 스키마/마이그레이션 템플릿, JWT 인증/인가 미들웨어, CORS, 이벤트 계약(EventBus), 표준 오류 처리, 공통 로깅/모니터링, 그리고 CI/CD 템플릿까지 포함한다.
- harness-kit은 비즈니스 로직은 포함하지 않으며, 서비스 간 공통 인프라/운영/보안 프레임워크 제공에 한정한다.

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 6 | **이벤트 계약 정의** | 서비스 간 통신 이벤트 카탈로그(8종) 스키마 확정 | P1 |
| 7 | **Strangler Fig 프록시** | 이관 대상 라우트를 프록시로 전환 가능하게 라우팅 레이어 분리 | P1 |
| 8 | **harness-kit CLI 도구** | `harness create <service-name>` 명령으로 서비스 scaffold 자동 생성 | P1 |
| 9 | **서비스별 E2E 분리** | E2E 테스트를 서비스 경계에 맞게 태깅/분류 | P1 |
| 10 | **통합 배포 파이프라인** | 서비스별 독립 deploy.yml + 크로스 서비스 smoke test | P1 |

### 4.3 제외 범위 (Out of Scope)

| 항목 | 이유 |
|------|------|
| AI Foundry 포털 서비스 구현 | harness-kit 기반 별도 프로젝트로 계획 |
| Discovery-X 서비스 구현 | 기존 리포(KTDS-AXBD/Discovery-X) 별도 진행 |
| Gate-X / Launch-X / Eval-X 구현 | harness-kit 기반 별도 프로젝트로 계획 |
| Recon-X 리네임 | 별도 프로젝트(AX-BD-Team/AI-Foundry) |
| AXIS Design System 확장 | 독립 프로젝트(IDEA-on-Action/AXIS-Design-System) |
| Foundry-X에서 기능 실제 삭제 | Phase 20에서는 분리만, 삭제는 이관 대상 서비스 구축 후 |

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Cloudflare Workers | Wrangler deploy | 필수 |
| Cloudflare D1 | Migrations | 필수 |
| Cloudflare Pages | Vite build + deploy | 필수 |
| GitHub Actions | CI/CD deploy.yml | 필수 |
| harness-kit (신규) | npm 패키지 의존 | 필수 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| Foundry-X 라우트 수 | 118 | ~60~70 | `ls packages/api/src/routes/*.ts \| wc -l` |
| Foundry-X 서비스 수 | 252 | ~130~150 | `ls packages/api/src/services/*.ts \| wc -l` |
| 이관 대상 라우트 분류율 | 0% | 100% | 모든 라우트에 서비스 태그 부여 |
| harness-kit scaffold 생성 | 불가 | 1분 내 가능 | `harness create test-service` 실행 검증 |
| E2E 회귀 테스트 | 263 pass | 263 pass | `pnpm e2e` (이관 기능 제외 후에도 통과) |
| API 단위 테스트 | 전체 pass | 전체 pass | `turbo test` |
| Production smoke | 정상 | 정상 | deploy.yml smoke test |

### 5.2 MVP 최소 기준

- [ ] Foundry-X의 모든 라우트/서비스가 서비스별로 태깅됨
- [ ] harness-kit 패키지가 존재하고, Workers scaffold를 생성할 수 있음
- [ ] 이관 대상 기능이 모듈 경계로 분리됨 (디렉토리/파일 수준)
- [ ] 기존 E2E + API 테스트가 전체 통과
- [ ] Production 배포 후 정상 동작
- [ ] **분리/이관 과정에서 장애/오류 발생 시, 서비스별 롤백 및 장애 복구 시나리오(아래 11장 참조)에 따라 운영상 안전성 확보**

### 5.3 실패/중단 조건

- 기존 E2E 테스트 통과율이 90% 미만으로 하락
- 분리 작업으로 인한 Production 장애 발생
- 8 Sprint 초과 시 범위 재조정 검토
- **운영 중단/서비스 장애 시, 롤백/복구 전략 미적용 또는 실패**

---

## 6. 제약 조건

### 6.1 일정

- 목표: Phase 20 — 8~10 Sprint (~2~2.5개월)
- Sprint 번호: 179~188 (Phase 19 Builder Evolution Sprint 175~178 이후)
- **리스크:** "AI Agent 기반 1인 개발"로 8~10 Sprint 내 완성 목표는 대규모 MSA 전환의 현실적 난이도를 감안할 때 매우 도전적임. 인력 추가 투입, 병렬 작업, 일정 재조정의 가능성을 고려한 예비 계획(Contingency Plan)을 수립해야 함.

### 6.2 기술 스택

| 영역 | 기술 |
|------|------|
| API | TypeScript, Hono, Cloudflare Workers |
| DB | Cloudflare D1 (SQLite) |
| Web | Vite 8, React 18, React Router 7 |
| 인프라 | Cloudflare Workers + Pages + D1 |
| CI/CD | GitHub Actions (deploy.yml) |
| 패키지 | pnpm workspace + Turborepo |

**인증/인가 아키텍처:**
- 모든 서비스는 harness-kit 제공 JWT + RBAC 인증 미들웨어를 필수로 적용한다.
- 인증 공통 컴포넌트는 harness-kit 내에 구현, 서비스별 RBAC 정책은 config로 설정한다.

### 6.3 인력/예산

- 투입: AX BD팀 (AI Agent 기반 1인 개발, Sprint Worktree 병렬)
- 예산: Cloudflare Free/Pro 범위 내 (D1 추가 DB 생성 무료)
- **리스크:** 1인 개발 체계에서 병렬 작업, 코드 리뷰, 장애 대응 등 실질적 병목이 발생할 수 있으며, 일정 지연/품질 저하 우려가 있다. 필요시 외부 지원 또는 내부 리소스 추가 투입 방안 검토.

### 6.4 컴플라이언스

- JWT + RBAC 인증 체계 유지
- Cloudflare Workers 보안 정책 준수
- 기존 Secrets(7종) 서비스별 분배 필요

---

## 7. F268~F391 서비스 배정표 (증분 124건)

> 기존 설계서(F1~F267)에 추가하여, Sprint 99~178에서 구현된 F-items의 서비스별 배정

### S0. AI Foundry 포털 — 이관 대상 (증분)
...

(이하 표, 내용 동일 — 변경 없음)

---

## 7b. 2단계 접근법 (Phase 20 핵심 전략)

> DeepSeek Round 1 권장사항 채택: "모듈화 → 실제 분리" 2단계 접근

### Phase 20-A: 모듈화 (Sprint 179~184) — 단일 Workers 내 모듈 경계 분리

**목표:** Foundry-X 모놀리스 내에서 서비스별 모듈 경계를 코드/디렉토리 수준으로 분리하되, 단일 Workers + 단일 D1에서 계속 동작.

**왜 이렇게 하는가:**
- 실제 서비스 분리(별도 Workers/D1) 전에 경계를 검증할 수 있음
- 분리 실패 시 롤백 비용이 0에 가까움 (코드 구조 변경만, 인프라 변경 없음)
- 기존 E2E/API 테스트가 변경 없이 통과해야 하므로 회귀 검증이 단순

**디렉토리 구조 목표:**
```
packages/api/src/
├── core/                    # Foundry-X 코어 (2~3단계)
│   ├── discovery/           # 발굴 (routes, services, schemas)
│   └── shaping/             # 형상화 (routes, services, schemas)
├── modules/                 # 이관 대상 모듈 (Phase 20-A에서 분리)
│   ├── auth/                # Auth/SSO → AI Foundry 이관 대상
│   ├── portal/              # Dashboard/KPI/Wiki/Workspace
│   ├── gate/                # 검증 → Gate-X 이관 대상
│   ├── launch/              # 제품화/GTM → Launch-X 이관 대상
│   └── infra/               # Agent Orchestration, 공통 인프라
├── routes/                  # 기존 라우트 (점진적으로 core/modules로 이동)
├── services/                # 기존 서비스 (점진적으로 core/modules로 이동)
└── index.ts                 # 단일 진입점 유지
```

**검증 기준:** E2E 263개 + API 전체 테스트 100% 통과 + Production 정상 동작

### Phase 20-B: 실제 분리 준비 (Sprint 185~188) — harness-kit + 프록시 + 이벤트

**목표:** 모듈화가 완료된 상태에서, 실제 서비스 분리를 위한 인프라(harness-kit, 이벤트, 프록시)를 구축.

**이 단계에서는 실제로 별도 Workers를 만들지 않음.** 단, 다음 Phase에서 `harness create gate-x` 한 번으로 Gate-X 서비스를 생성하고, `modules/gate/`의 코드를 옮겨서 즉시 배포할 수 있는 상태를 목표로 함.

---

## 7c. D1 데이터 분리 전략 (아키텍처 결정)

> 오픈 이슈 #1에 대한 사전 결정 — M1(Sprint 179)에서 확정

### 7c.1 현황 분석

현재 D1 `foundry-x-db`에 113건 마이그레이션, 약 50+ 테이블이 존재. 서비스별 주요 테이블:

| 서비스 | 핵심 테이블 | FK 의존성 |
|--------|------------|-----------|
| Auth (→ AI Foundry) | users, orgs, org_members, sessions | users.id → 거의 모든 테이블 참조 |
| 발굴 (잔류) | ax_discovery_*, ax_skill_*, biz_items | biz_items.id → 형상화 테이블 참조 |
| 형상화 (잔류) | bmc_*, bdp_*, offerings, prototypes | biz_items_id FK → 발굴 |
| 검증 (→ Gate-X) | validation_*, decision_*, gate_packages | biz_items_id FK |
| 제품화 (→ Launch-X) | pipeline_*, mvp_*, offering_pack_* | biz_items_id FK |

### 7c.2 전략 선택: Shared DB + 논리적 분리 (Phase 20 범위)

**Phase 20에서는 물리적 DB 분리를 하지 않는다.** 대신:

1. **테이블 소유권 태깅**: 각 테이블에 `-- @service: foundry-x | portal | gate-x | launch-x` 주석을 마이그레이션 파일에 추가
2. **크로스 서비스 FK 식별 및 문서화**: `users.id`, `biz_items.id` 등 공유 키를 명시
3. **서비스별 접근 정책**: 모듈 간 직접 테이블 접근 금지, 서비스 레이어를 통해서만 접근 (ESLint 룰 확장)
4. **이벤트 기반 동기화 패턴 준비**: `biz_items` 상태 변경 시 EventBus로 이벤트 발행 — 실제 DB 분리 시 이 이벤트가 서비스 간 통신의 기반이 됨

### 7c.3 물리적 DB 분리 전략 (Phase 20 이후, 참조용)

물리적 D1 분리는 각 서비스가 harness-kit으로 독립 생성된 이후에 실행:

1. **공유 키(users.id, biz_items.id)**: 이벤트 기반 eventual consistency — 서비스별 로컬 캐시 + 이벤트 동기화
2. **데이터 마이그레이션**: 서비스별 `harness migrate` 명령으로 해당 테이블만 추출하여 새 D1로 이전
3. **이중 쓰기(Dual Write)**: 전환기에 기존 DB + 신규 DB 동시 쓰기, 일치 검증 후 기존 DB 참조 제거
4. **롤백**: 전환기 동안 기존 D1을 ReadOnly로 유지, 문제 발생 시 즉시 기존 DB로 트래픽 복원

### 7c.4 Cloudflare Workers 환경 특화 사항

| 항목 | Cloudflare 특성 | 대응 |
|------|----------------|------|
| 이벤트 버스 | Workers 간 직접 통신 불가 | Cloudflare Queue 또는 D1 기반 Event Table + Cron Trigger 폴링 |
| 분산 트랜잭션 | D1은 단일 Write 리더 | Saga 패턴 대신 이벤트 기반 보상 트랜잭션 |
| 서비스 디스커버리 | Workers는 URL로 직접 호출 | Custom Domain 기반 서비스 레지스트리 (wrangler.toml) |
| Cold Start | Workers 분리 시 개별 Cold Start | 각 Workers 경량화로 Cold Start 최소화 (목표: <50ms) |

---

## 8. 마일스톤 구성 (8~10 Sprint)

### Phase 20-A: 모듈화 (Sprint 179~184) — 단일 Workers 내 분리

#### M1: 분류 + 아키텍처 결정 + harness-kit (Sprint 179~180)

| Sprint | 작업 | 핵심 산출물 |
|--------|------|------------|
| 179 | (1) 전체 118 라우트/252 서비스 서비스별 태깅 (2) D1 50+ 테이블 소유권 태깅 + 크로스 서비스 FK 목록 (3) F268~F391 배정 확정 (4) §7c D1 분리 전략 확정 문서화 | 서비스 매핑 문서 + 아키텍처 결정서(ADR) |
| 180 | (1) harness-kit 패키지 생성: Workers scaffold + D1 setup + JWT 미들웨어 + CORS + 이벤트 인터페이스 + CI/CD 템플릿 + ESLint 크로스서비스 접근 금지 룰 (2) `harness create` CLI 명령 PoC | `packages/harness-kit/` npm 패키지 |

#### M2: 코드 모듈화 (Sprint 181~184)

| Sprint | 작업 | 핵심 산출물 | 롤백 전략 |
|--------|------|------------|-----------|
| 181 | Auth/SSO 모듈 분리 → `modules/auth/` | 라우트/서비스/미들웨어 이동, 테스트 통과 | git revert (코드 이동만) |
| 182 | Dashboard/KPI + Workspace/Wiki → `modules/portal/` | 포털 기능 분리 | git revert |
| 183 | 검증 → `modules/gate/` + 제품화/GTM → `modules/launch/` | 4단계+5~6단계 분리 | git revert |
| 184 | Foundry-X 코어(core/discovery + core/shaping) 정리 — 의존성 정리 + 순수 2~3단계만 잔류 | 축소된 Foundry-X | git revert |

**Phase 20-A 완료 기준:**
- 단일 Workers + 단일 D1에서 모든 기능이 기존과 동일하게 동작
- E2E 263개 + API 전체 테스트 100% 통과
- Production 배포 + smoke test 정상
- 모든 라우트/서비스가 core/ 또는 modules/ 디렉토리에 분류됨

### Phase 20-B: 분리 준비 (Sprint 185~188) — 인프라 + 이벤트 + 문서화

#### M3: 이벤트 계약 + ESLint 경계 강화 (Sprint 185~186)

| Sprint | 작업 | 핵심 산출물 |
|--------|------|------------|
| 185 | (1) 이벤트 카탈로그 8종 TypeScript 스키마 확정 (2) EventBus 인터페이스 — D1 Event Table + Cron Trigger 폴링 PoC (3) ESLint 크로스모듈 접근 금지 룰 활성화 | `packages/shared/events/` + ESLint 룰 |
| 186 | (1) Strangler Fig 프록시 레이어 — 이관 대상 라우트를 프록시 가능하게 라우팅 미들웨어 분리 (2) harness-kit에 이벤트 발행/구독 유틸리티 추가 | 프록시 미들웨어 + harness-kit v2 |

#### M4: 통합 검증 + Production 배포 + 문서화 (Sprint 187~188)

| Sprint | 작업 | 핵심 산출물 |
|--------|------|------------|
| 187 | (1) E2E 서비스별 태깅 + 전체 회귀 테스트 (2) harness-kit으로 Gate-X 서비스 scaffold 생성 PoC (3) modules/gate/ 코드를 Gate-X scaffold에 복사하여 독립 동작 검증 | PoC 서비스 1개 동작 확인 |
| 188 | (1) Production 배포 + smoke test (2) harness-kit 문서화 (3) 개발자 가이드 + 마이그레이션 가이드 작성 | Production 정상 + 문서 완성 |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | D1 테이블 크로스 서비스 FK — 분리 시 데이터 무결성 전략 결정 필요 (참조 무결성 vs 이벤트 기반 동기화) <br> **→ M1 단계에서 아키텍처 결정/문서화 필수** | Sinclair | M1 완료 전 |
| 2 | 이관 대상 기능의 "분리 but 유지" 기간 — Foundry-X에서 모듈 분리 후 별도 서비스로 이관 전까지 동일 Workers에서 동작해야 함 <br> **→ 운영 시나리오 및 장애/동기화 대응책 M1 단계에서 확정** | Sinclair | M2 시작 전 |
| 3 | harness-kit의 D1 migration 자동화 수준 — 서비스별 D1 DB 생성 시 migration 번호 충돌 방지 전략 | Sinclair | M1 |
| 4 | F338~F341 운영이슈 4건 — Phase 20과 별도로 처리할지 병합할지 | Sinclair | M1 |
| 5 | packages/harness-kit 이미 untracked으로 존재 — 기존 scaffold 상태 확인 필요 | Sinclair | 즉시 |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안(v1) | 2026-04-07 | 인터뷰 기반 최초 작성 + F268~F391 서비스 배정 | - |
| v2 | 2026-04-07 | Round 1 AI 의견 자동 반영: 서비스 경계, 이관/분리 정의, harness-kit 범위 명확화, 아키텍처 결정 사전화, 롤백/운영/테스트/커뮤니케이션/일정 리스크 보완 | 76 |
| R2 | 2026-04-07 | Round 2 검토: 3AI Conditional 유지 (79점) — D1 분리 전략/2단계 접근법/Cloudflare 특화 구현 상세 요구 | 79 |
| v3 | 2026-04-07 | 핵심 3가지 직접 보강: §7b 2단계 접근법(모듈화→실제분리), §7c D1 데이터 분리 전략(Shared DB + 논리적 분리), Cloudflare Workers 특화 이벤트/통신 설계, 마일스톤을 Phase 20-A/20-B로 재구성, Sprint별 롤백 전략 명시 | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*

---


### 11.1 롤백 및 복구 전략

- 각 마일스톤별로 서비스/모듈 분리 및 배포 이후, 즉각적인 장애/성능 저하/데이터 무결성 오류 발생 시, 
  - (1) 기존 모놀리스 코드/DB 상태로 롤백할 수 있는 git tag/DB snapshot을 사전 확보한다.
  - (2) harness-kit 기반 신규 서비스의 배포/롤백을 GitHub Actions에서 atomic하게 관리한다.
  - (3) 분리 후에도 2주간 "shadow traffic" 혹은 "dual-write" 방식으로 신규/구 서비스를 병행 운영, 이상 징후 발생 시 롤백한다.

### 11.2 운영 및 모니터링 체계

- 서비스별 Cloudflare Logs, Sentry(또는 동급 APM), DB 모니터링, 이벤트 트래픽/지연/실패율 대시보드를 설정한다.
- harness-kit에는 표준 로깅/에러 트래킹/서비스 헬스체크/슬랙 알림 연동 기능을 내장한다.
- 분산 트랜잭션/이벤트 실패시 자동 재시도 및 운영팀 알림 체계를 구성한다.

### 11.3 커뮤니케이션/변경관리

- 서비스/기능별 분리, harness-kit 구조, 배포/롤백 프로세스에 대한 개발자용 가이드/워크샵을 Sprint 179~180에 제공한다.
- 모든 구조 변경(경계, 데이터, API)은 PRD/아키텍처 문서, Notion, 슬랙 등을 통한 동시 공지 및 교육을 실시한다.
- 주요 장애/이슈 발생 시, RCA(원인 분석) 및 재발 방지 대책을 문서화하여 팀 전원이 공유한다.

### 11.4 테스트 커버리지/품질관리

- 서비스별 E2E/단위 테스트를 harness-kit 표준에 따라 자동화, 커버리지 90% 이상을 목표로 한다.
- 데이터 분리, 모듈화, 이관 등 구조 변경 시점마다 전체 회귀 테스트/스모크 테스트를 필수로 실행한다.
- 분리/이관 이후에도 기존 회귀 테스트가 100% 통과되는지 지속적으로 검증한다.

### 11.5 인력/일정/운영 리스크 관리

- 병목 발생 시, 외부 개발 리소스 추가 투입(예비 인력 pool) 또는 Sprint별 일정 조정 가능성을 사전에 팀 내 공유한다.
- AI Agent 지원만으로 커버 불가한 아키텍처/운영/장애 대응 업무는 리더 및 베테랑 개발자에게 Escalation Route를 명시한다.
- 분산 시스템 운영 경험 부족 시, 외부 컨설팅 또는 SaaS 기반 Observability 도구 도입을 고려한다.

---


| # | 리스크 | 영향도 | 완화/대응 방안 |
|---|--------|--------|--------------|
| 1 | 데이터 분리/마이그레이션 실패, D1 분할 난이도 과소평가 | 매우 높음 | 단계별 DB snapshot, dual-write, 이벤트 기반 분리, 마이그레이션 dry-run 사전 실시 |
| 2 | "분리 but 유지" 기간 중 동기화/데이터 무결성 이슈 | 높음 | EventBus 기반 실시간 동기화, 장애 시 fallback/롤백, shadow traffic 병행 운영 |
| 3 | 서비스 경계/책임 모호로 인한 의존성 꼬임 | 높음 | 서비스별 책임/데이터 경계 PRD 내 명시, 코드리뷰 강화, harness-kit 의존성 명확화 |
| 4 | harness-kit 의존성 관리/하위 호환 리스크 | 높음 | SemVer 도입, 변경알림/업그레이드 가이드, backward-compatible 정책 유지 |
| 5 | 인증/인가 미들웨어 불일치/보안 취약점 | 높음 | harness-kit 내 일관된 JWT/RBAC 미들웨어 적용, 보안 테스트 자동화 |
| 6 | 분산 트랜잭션/데이터 일관성 미보장 | 높음 | 이벤트 소싱, eventual consistency 패턴, 운영 모니터링 및 경보 체계 구축 |
| 7 | 운영 복잡도 증가, 장애 대응 어려움 | 높음 | 표준 모니터링/로그/알림 체계, 운영가이드, 팀 교육 강화 |
| 8 | 테스트 커버리지 저하/품질 저하 | 높음 | E2E/단위/회귀 테스트 자동화, 커버리지 기준 명시(90% 이상) |
| 9 | 1인 개발+AI Agent 체계의 일정/품질 한계 | 높음 | 인력 추가 예비계획, 일정 조정, 병렬 작업 강화, Escalation Route 명시 |
| 10 | 커뮤니케이션/변경관리 미흡 | 중간 | 워크샵/가이드/문서화, Notion/슬랙 병행 공지 |
| 11 | 운영 중 장애/배포 실패시 롤백/복구 미흡 | 높음 | 11.1항 롤백 프로세스 적용, git tag/DB snapshot 사전 확보, 자동화 스크립트 |
| 12 | 시장/사용자 관점 미반영 | 중간 | 사용자 피드백 루프, 단계별 UX 검증, 운영/보안/일관성 요구사항 반영 |

---


| 항목 | 사유/요청자 |
|------|-------------|
| 신규 서비스(Gate-X, Launch-X 등) 상세 설계/개발 | 본 PRD 범위 외, 별도 프로젝트에서 수행 |
| AI Foundry Portal 신규 기능 설계/개발 | harness-kit 기반 별도 프로젝트에서 수행 |
| Discovery-X, Eval-X, Recon-X 등 리네임/확장 | 별도 리포지토리/프로젝트에서 수행 |
| AXIS Design System 확장/운영 | 별도(IDEA-on-Action/AXIS-Design-System) |
| 신규 보안/컴플라이언스 정책 확정 | 보안팀/인프라팀과 별도 협의 필요 |
| 대규모 데이터 마이그레이션 자동화 도구 개발 | 추후 별도 검토 |
| 분산 트랜잭션 프레임워크 도입 | 현 PRD에서는 이벤트 기반 eventual consistency까지만 다룸 |

---