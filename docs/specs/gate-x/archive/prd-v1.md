# Gate-X PRD

**버전:** v1
**날짜:** 2026-04-07
**작성자:** AX BD팀
**상태:** :arrows_counterclockwise: 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X의 검증(Gate) 도메인을 harness-kit 기반 독립 Cloudflare Workers 서비스로 분리하여, BD팀 내부 + KT DS 사내 팀 + 외부 고객사가 검증 파이프라인을 API/Web으로 활용할 수 있게 한다.

**배경:**
Foundry-X는 Phase 20에서 모듈화를 완료했다 (118개 라우트를 9개 도메인으로 분리). Gate 모듈(검증)은 `modules/gate/`로 이미 격리되어 있고, harness-kit 패키지가 독립 서비스 scaffold를 제공한다. Phase 20 F400에서 Gate-X scaffold PoC까지 완료했다. 하지만 현재 gate 기능은 Foundry-X API 안에 묶여 있어 외부에서 독립적으로 사용할 수 없다.

**목표:**
Gate-X를 독립 서비스로 배포하여 (1) BD팀이 검증 파이프라인을 독립 운영하고, (2) 외부 개발자가 API로 통합하고, (3) 향후 SaaS 모델로 확장 가능한 기반을 만든다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- Gate(검증) 기능이 Foundry-X 모놀리스 API에 포함되어 있음
- 외부 팀/고객이 검증 기능만 사용하려면 Foundry-X 전체를 배포해야 함
- 7개 라우트 + 7개 서비스 + 6개 스키마 = 2,279줄이 `modules/gate/` 하위에 격리됨
- harness-kit 패키지가 독립 서비스 인프라(JWT, CORS, D1, EventBus, scaffold)를 제공
- F400 Gate-X scaffold PoC가 완료되어 독립 Workers 구조가 검증됨

### 2.2 목표 상태 (To-Be)
- Gate-X가 독립 Cloudflare Workers로 배포되어 `gate-x-api.ktds-axbd.workers.dev`에서 서비스
- REST API로 검증 파이프라인 기능을 외부에 제공
- Web UI 대시보드로 BD팀이 검증 프로세스를 운영
- Foundry-X와는 이벤트 버스(D1EventBus)로 느슨하게 연결
- 멀티테넌시로 팀/고객별 데이터 격리

### 2.3 시급성
- Phase 20에서 모듈화 + harness-kit + scaffold PoC까지 완료하여 기술적 준비 완료
- BD팀 데모 시연(세션 #217)에서 검증 파이프라인 독립 수요 확인
- 외부 고객사 제공을 위해 분리가 선행 조건

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| BD팀원 | AX BD팀 7명 | Web UI로 검증 파이프라인 운영, 결과 리포트 확인 |
| 외부 개발자 | KT DS 사내 팀 + 고객사 개발자 | REST API로 자사 서비스에 검증 기능 통합 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| BD팀장 | 의사결정, 사업 방향 | 높음 |
| KT DS 사내 팀 | 내부 고객, 재사용 | 중간 |
| 외부 고객사 | 외부 고객 | 중간 |

### 3.3 사용 환경
- 기기: PC (Web UI) + 서버 (API 연동)
- 네트워크: 인터넷 (Cloudflare Workers)
- 기술 수준: BD팀(비개발자~준개발자), 외부(개발자)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | Gate 모듈 추출 | modules/gate/의 7 routes + 7 services + 6 schemas를 독립 Workers로 추출 | P0 |
| 2 | 독립 D1 스키마 | Gate-X 전용 D1 데이터베이스 + 마이그레이션 셋업 | P0 |
| 3 | JWT 인증 | harness-kit 기반 독립 JWT 인증 (API Key 방식 병행) | P0 |
| 4 | REST API | 검증 파이프라인 CRUD + O-G-D 루프 실행 + 리포트 조회 | P0 |
| 5 | CI/CD 파이프라인 | GitHub Actions: D1 마이그레이션 + Workers deploy + smoke test | P0 |
| 6 | Foundry-X 이벤트 연동 | D1EventBus로 Foundry-X와 검증 이벤트 교환 | P1 |
| 7 | Web UI 대시보드 | 검증 파이프라인 운영 UI (Vite + React, 별도 Pages 또는 FX 내 임베드) | P1 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | 다중 AI 모델 | O-G-D 루프에서 다양한 LLM 모델(Anthropic, OpenAI, Google 등) 선택 가능 | P1 |
| 2 | 커스텀 검증 룰 | 사용자가 검증 기준/루브릭을 직접 정의하는 룰 엔진 | P1 |
| 3 | 외부 웹훅 연동 | 검증 완료/실패 시 외부 시스템에 자동 알림 (Slack, Teams, HTTP) | P2 |
| 4 | 멀티테넌시 격리 | 팀/고객별 데이터 격리 + RBAC + 테넌트 관리 | P2 |
| 5 | 과금 체계 | API 호출 기반 과금 — 사용량 추적 + 요금제(Free/Pro/Enterprise) | P2 |
| 6 | SDK/CLI 클라이언트 | Gate-X API를 쉽게 사용하는 TypeScript SDK + CLI 도구 | P2 |

### 4.3 제외 범위 (Out of Scope)
- Foundry-X 코어 기능 (CLI, SDD Engine, 오케스트레이션) — FX에 유지
- 다른 모듈 분리 (auth, portal, launch) — Gate-X만 집중
- 모바일 앱 — Web UI로 충분
- 기존 Foundry-X 사용자 마이그레이션 — 새 서비스는 별도 시작

### 4.4 외부 연동
| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Foundry-X API | D1EventBus (이벤트 기반) | 필수 |
| LLM APIs | REST API (Anthropic, OpenAI, Google AI) | 필수 |
| Cloudflare D1 | D1 바인딩 | 필수 |
| Slack/Teams | Webhook | 선택 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)
| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 독립 배포 성공 | 미배포 | Workers 배포 완료 | wrangler deploy 성공 |
| API 응답시간 (p95) | N/A | < 500ms | Workers analytics |
| API 가용성 | N/A | > 99.5% | Cloudflare dashboard |
| gate 기능 동등성 | 0% | 100% | E2E 테스트 통과율 |

### 5.2 MVP 최소 기준
- [ ] Gate-X가 독립 Workers로 배포되어 API 호출 가능
- [ ] 검증 파이프라인 CRUD + O-G-D 루프 실행이 API로 동작
- [ ] JWT 인증으로 API 접근 제어
- [ ] Foundry-X modules/gate/의 기존 기능과 동등한 결과

### 5.3 실패/중단 조건
- Cloudflare Workers 제약(CPU time, D1 row limit)으로 검증 파이프라인 실행 불가 시
- O-G-D 루프의 LLM 호출이 Workers 환경에서 timeout 발생 시 → Durable Objects 또는 Queue 대안 검토

---

## 6. 제약 조건

### 6.1 일정
- 목표 완료일: [미정] — Sprint 단위로 점진적 진행
- 마일스톤:
  - M1: 코어 API 추출 + 독립 배포 (P0)
  - M2: 이벤트 연동 + Web UI (P1)
  - M3: 확장 기능 — 다중 모델 + 커스텀 룰 + 웹훅 (P1~P2)
  - M4: SaaS 기반 — 멀티테넌시 + 과금 + SDK (P2)

### 6.2 기술 스택
- 백엔드: TypeScript, Hono, Cloudflare Workers, D1
- 프론트엔드: Vite + React 18 + React Router 7 (별도 Pages 또는 FX 내 임베드)
- 인프라: Cloudflare Workers + D1 + Pages
- 서비스 인프라: harness-kit 패키지 (JWT, CORS, RBAC, EventBus, scaffold)
- 기존 시스템 의존: Foundry-X API (이벤트 버스 연동), LLM APIs

### 6.3 인력/예산
- 투입 가능 인원: 1명 + AI 에이전트 (Sinclair + Claude)
- 예산: Cloudflare Workers Free/Paid tier

### 6.4 컴플라이언스
- KT DS 내부 정책: API Key 관리, 고객 데이터 격리
- 보안 요구사항: JWT + RBAC + CORS + 테넌트 격리
- 외부 규제: 외부 고객 데이터 처리 시 개인정보 관련 검토 필요

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | D1 전략: 새 DB vs Shared DB + Strangler proxy | Sinclair | PRD R1 |
| 2 | 인증: 독립 JWT vs FX SSO Hub Token 연동 | Sinclair | PRD R1 |
| 3 | Web UI: 별도 Pages 배포 vs Foundry-X 내 임베드 | Sinclair | M2 |
| 4 | Workers CPU time 제한으로 O-G-D LLM 호출 가능 여부 | Sinclair | M1 PoC |
| 5 | 외부 고객 제공 시 SLA/약관 검토 | BD팀장 | M4 |
| 6 | 과금 모델 상세 (Free tier 범위, Pro 가격 등) | BD팀장 | M4 |

### 7.1 D1 전략 트레이드오프 분석

| 방안 | 장점 | 단점 |
|------|------|------|
| **A: 새 D1 DB** | 완전 독립, 마이그레이션 깔끔, 외부 제공 시 깨끗한 시작 | 기존 FX 데이터 마이그레이션 필요, 초기 공백 |
| **B: Shared DB + Strangler** | Phase 20 설계 활용, 점진적 전환, 기존 데이터 즉시 사용 | 결합도 유지, 외부 고객에게 FX DB 노출 위험 |

**권장:** 방안 A (새 D1 DB) — 외부 제공 목적이 핵심이므로 깨끗한 분리가 더 적합. 기존 데이터는 마이그레이션 스크립트로 선택적 이전.

### 7.2 인증 전략 트레이드오프 분석

| 방안 | 장점 | 단점 |
|------|------|------|
| **A: 독립 JWT + API Key** | 완전 독립, 외부 고객에게 깔끔한 인증 체험 | FX와 별도 사용자 관리 |
| **B: FX SSO Hub Token 연동** | Single Sign-On, 사내 팀 편의 | 외부 고객에게는 FX 계정 필요 → 부적합 |
| **C: 하이브리드** | 사내 = SSO, 외부 = API Key | 복잡도 증가 |

**권장:** 방안 A (독립 JWT + API Key) — M1~M2는 API Key 중심, M3 이후 OAuth2 추가 검토.

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-07 | 인터뷰 기반 최초 작성 | - |

---

*이 문서는 ax:req-interview 스킬에 의해 자동 생성 및 관리됩니다.*
