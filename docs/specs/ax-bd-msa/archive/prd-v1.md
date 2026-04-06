# AX BD MSA 재조정 PRD

**버전:** v1
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

### 2.2 목표 상태 (To-Be)

| 항목 | 목표값 |
|------|--------|
| Foundry-X Routes | ~60~70개 (2~3단계 전용) |
| Foundry-X 전담 | 발굴(2-0~2-10) + 형상화(BMC/BDP/Offering/PRD/Prototype) |
| 이관 대상 | Auth/SSO, Dashboard/KPI, Wiki, 검증, 제품화, GTM, 평가 |
| harness-kit | 새 서비스 scaffold 1분 내 생성 가능 |
| 테스트 | 분리된 E2E 통과 + Production smoke 정상 |

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

### 5.3 실패/중단 조건

- 기존 E2E 테스트 통과율이 90% 미만으로 하락
- 분리 작업으로 인한 Production 장애 발생
- 8 Sprint 초과 시 범위 재조정 검토

---

## 6. 제약 조건

### 6.1 일정

- 목표: Phase 20 — 8~10 Sprint (~2~2.5개월)
- Sprint 번호: 179~188 (Phase 19 Builder Evolution Sprint 175~178 이후)

### 6.2 기술 스택

| 영역 | 기술 |
|------|------|
| API | TypeScript, Hono, Cloudflare Workers |
| DB | Cloudflare D1 (SQLite) |
| Web | Vite 8, React 18, React Router 7 |
| 인프라 | Cloudflare Workers + Pages + D1 |
| CI/CD | GitHub Actions (deploy.yml) |
| 패키지 | pnpm workspace + Turborepo |

### 6.3 인력/예산

- 투입: AX BD팀 (AI Agent 기반 1인 개발, Sprint Worktree 병렬)
- 예산: Cloudflare Free/Pro 범위 내 (D1 추가 DB 생성 무료)

### 6.4 컴플라이언스

- JWT + RBAC 인증 체계 유지
- Cloudflare Workers 보안 정책 준수
- 기존 Secrets(7종) 서비스별 분배 필요

---

## 7. F268~F391 서비스 배정표 (증분 124건)

> 기존 설계서(F1~F267)에 추가하여, Sprint 99~178에서 구현된 F-items의 서비스별 배정

### S0. AI Foundry 포털 — 이관 대상 (증분)

| F# | 기능명 | Phase | 비고 |
|----|--------|-------|------|
| F288 | Role-based sidebar + Admin 분리 | Phase 11 | 포털 UI |
| F289 | 사이드바 리브랜딩 + 메뉴 재배치 | Phase 11 | 포털 UI |
| F290 | Route namespace 마이그레이션 | Phase 11 | 포털 구조 |
| F309 | Marker.io 비주얼 피드백 통합 | 독립 | 포털 도구 |
| F310 | TinaCMS 호환성 PoC | 독립 | 포털 CMS |
| F311 | TinaCMS 인라인 에디팅 본구현 | 독립 | 포털 CMS |
| F318 | 팀 도구 가이드 페이지 | 독립 | 포털 도구 |
| F319 | Marker.io 피드백 Webhook + D1 큐 | 독립 | 포털 피드백 |
| F320 | 피드백 자동 처리 Agent + PR 생성 | 독립 | 포털 피드백 |
| F321 | TinaCMS 네비게이션 동적 관리 | 독립 | 포털 CMS |
| F322 | 사이드바 구조 재설계 (25→12 메뉴) | Phase 13 | 포털 IA |
| F323 | 대시보드 ToDo + 업무 가이드 | Phase 13 | 대시보드 |
| F328 | 시작하기 통합 + 공통 메뉴 정리 | Phase 13 | 포털 UX |
| F329 | Blueprint 랜딩 페이지 전환 | 독립 | 포털 UI |
| F332 | 랜딩 콘텐츠 리뉴얼 | 독립 | 포털 마케팅 |
| **소계** | **15건** | | |

### S3. Foundry-X 잔류 — 2~3단계 발굴 + 형상화 (증분)

| F# | 기능명 | Phase | 비고 |
|----|--------|-------|------|
| F269 | 발굴 IA & Page 정리 | Phase 9 | 발굴 UX |
| F270-F273 | O-G-D 에이전트 루프 | Phase 10 | 발굴/형상화 엔진 |
| F274-F278 | Skill Evolution 5-Track | Phase 10 | 발굴 스킬 |
| F279-F281 | BD 데모 시딩 + 콘텐츠 + E2E | Phase 10 | 데모 데이터 |
| F282-F287 | BD 형상화 Phase A~F | Phase 10 | 형상화 6단계 |
| F292 | 사업계획서 HITL 고도화 | Phase 11 | 형상화 BDP |
| F293 | 초도 미팅용 Offering | Phase 11 | 형상화 Offering |
| F296 | 통합 평가 결과서 생성 | Phase 11 | 발굴 리포트 |
| F297 | Prototype HITL 고도화 | Phase 11 | 형상화 Proto |
| F301 | BD 산출물 UX 연결성 | 독립 | 발굴 UX |
| F303-F308 | Skill Unification | Phase 12 | 발굴 스킬 통합 |
| F312-F315 | 파이프라인 자동화 | Phase 14 | 발굴→형상화 오케 |
| F316 | Discovery E2E 테스트 | Phase 14 | 테스트 |
| F324 | 발굴 탭 통합 (3탭) | Phase 13 | 발굴 UI |
| F325 | 형상화 재구성 + 버전관리 | Phase 13 | 형상화 UI |
| F342-F350 | Discovery UI/UX v2 (9건) | Phase 15 | 발굴 고도화 |
| F351-F356 | Prototype Auto-Gen (6건) | Phase 16 | 형상화 Proto |
| F357-F362 | Self-Evolving Harness (6건) | Phase 17 | 인프라 (잔류) |
| F363-F383 | Offering Pipeline (21건) | Phase 18 | 형상화 Offering |
| F384-F391 | Builder Evolution (8건) | Phase 19 | 형상화 Proto |
| **소계** | **~85건** | | |

### S4. Gate-X — 이관 대상 (증분)

| F# | 기능명 | Phase | 비고 |
|----|--------|-------|------|
| F294 | 2-tier 검증 + Pre-PRB 분리 | Phase 11 | 검증 워크플로 |
| F295 | 전문가 인터뷰/미팅 관리 | Phase 11 | 검증 오프라인 |
| F326 | 검증 탭 통합 (4탭) | Phase 13 | 검증 UI |
| **소계** | **3건** | | |

### S5. Launch-X — 이관 대상 (증분)

| F# | 기능명 | Phase | 비고 |
|----|--------|-------|------|
| F298 | PoC 관리 분리 | Phase 11 | 제품화 PoC |
| F299 | 대고객 선제안 GTM | Phase 11 | GTM |
| F327 | 제품화 탭 통합 (2탭) | Phase 13 | 제품화 UI |
| **소계** | **3건** | | |

### S1. Discovery-X — 이관 대상 (증분)

| F# | 기능명 | Phase | 비고 |
|----|--------|-------|------|
| F291 | Discovery-X Agent 자동 수집 | Phase 11 | 수집 Agent |
| **소계** | **1건** | | |

### 인프라/공통 (서비스 공통 또는 harness-kit 흡수)

| F# | 기능명 | Phase | 비고 |
|----|--------|-------|------|
| F268 | ax-config Plugin 전환 | Phase 9 | 개발 도구 (서비스 외부) |
| F300 | E2E 테스트 종합 정비 | 독립 | 테스트 인프라 |
| F302 | E2E 상세 페이지 커버리지 | 독립 | 테스트 인프라 |
| F317 | 데이터 백업/복구 + 운영 계획 | Phase 14 | 운영 (서비스 공통) |
| F330 | rules/ 5종 신규 작성 | 독립 | 개발 도구 |
| F331 | PreToolUse git guard | 독립 | 개발 도구 |
| F333-F337 | Agent Orchestration Infra (5건) | Phase 14 | 서비스 공통 인프라 |
| F338-F341 | 운영 이슈 4건 | 독립 | 인프라 수정 |
| **소계** | **~16건** | | |

### 배정 요약 (F268~F391)

| 서비스 | 증분 F-items | 기존(F1~F267) | 합계 |
|--------|-------------|---------------|------|
| AI Foundry (포털) | 15건 | 42건 | 57건 |
| Discovery-X | 1건 | 6건 | 7건 |
| **Foundry-X (잔류)** | **~85건** | **43건** | **~128건** |
| Gate-X | 3건 | 4건 | 7건 |
| Launch-X | 3건 | 6건 | 9건 |
| Eval-X | 0건 | 2건+2신규 | 4건 |
| 인프라/공통 | ~16건 | ~56건 | ~72건 |
| **합계** | **~124건** | **~159건** | **~284건** |

---

## 8. 마일스톤 구성 (8~10 Sprint)

### M1: 분류 + harness-kit 기반 (Sprint 179~180)

| Sprint | 작업 | 핵심 산출물 |
|--------|------|------------|
| 179 | (1) 전체 라우트/서비스/스키마 서비스별 태깅 (2) D1 테이블 서비스 경계 정의 (3) F268~F391 배정 확정 | 서비스 매핑 문서 + 태깅 완료 |
| 180 | (1) harness-kit 패키지 생성 (Workers scaffold + D1 setup + JWT 미들웨어 + CORS + CI/CD) (2) `harness create` CLI 명령 | `packages/harness-kit/` npm 패키지 |

### M2: Foundry-X 모듈 경계 분리 (Sprint 181~184)

| Sprint | 작업 | 핵심 산출물 |
|--------|------|------------|
| 181 | Auth/SSO 모듈 분리 — 인증 관련 라우트/서비스/미들웨어를 `modules/auth/`로 이동 | 모듈 경계 명확화, 테스트 통과 |
| 182 | Dashboard/KPI + Workspace/Wiki 모듈 분리 | `modules/portal/` 분리 |
| 183 | 검증(Gate) + 제품화/GTM(Launch) 모듈 분리 | `modules/gate/` + `modules/launch/` |
| 184 | Foundry-X 코어(발굴+형상화) 정리 — 불필요한 의존성 제거 + 순수 2~3단계 코드만 잔류 확인 | 축소된 Foundry-X |

### M3: 이벤트 계약 + 프록시 레이어 (Sprint 185~186)

| Sprint | 작업 | 핵심 산출물 |
|--------|------|------------|
| 185 | 이벤트 카탈로그 8종 스키마 확정 + EventBus 인터페이스 | `packages/shared/events/` |
| 186 | Strangler Fig 프록시 레이어 — 이관 대상 라우트를 프록시 가능하게 라우팅 분리 | 프록시 미들웨어 |

### M4: 통합 검증 + Production 배포 (Sprint 187~188)

| Sprint | 작업 | 핵심 산출물 |
|--------|------|------------|
| 187 | E2E 서비스별 태깅 + 전체 회귀 테스트 | 263 E2E pass |
| 188 | Production 배포 + smoke test + harness-kit 문서화 | Production 정상 + 문서 |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | D1 테이블 크로스 서비스 FK — 분리 시 데이터 무결성 전략 결정 필요 (참조 무결성 vs 이벤트 기반 동기화) | Sinclair | M1 완료 전 |
| 2 | 이관 대상 기능의 "분리 but 유지" 기간 — Foundry-X에서 모듈 분리 후 별도 서비스로 이관 전까지 동일 Workers에서 동작해야 함 | Sinclair | M2 시작 전 |
| 3 | harness-kit의 D1 migration 자동화 수준 — 서비스별 D1 DB 생성 시 migration 번호 충돌 방지 전략 | Sinclair | M1 |
| 4 | F338~F341 운영이슈 4건 — Phase 20과 별도로 처리할지 병합할지 | Sinclair | M1 |
| 5 | packages/harness-kit 이미 untracked으로 존재 — 기존 scaffold 상태 확인 필요 | Sinclair | 즉시 |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안(v1) | 2026-04-07 | 인터뷰 기반 최초 작성 + F268~F391 서비스 배정 | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
