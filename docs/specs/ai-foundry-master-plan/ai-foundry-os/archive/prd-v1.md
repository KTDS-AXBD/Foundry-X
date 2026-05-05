# AI Foundry OS PRD

**버전:** v1
**날짜:** 2026-05-02
**작성자:** Sinclair Seo (KTDS-AXBD AX컨설팅팀, PM 겸 프로그래머)
**상태:** 🔄 검토 중 (Phase 2 외부 LLM 자동 검토 + Six Hats 토론 대기)
**코드네임:** `ai-foundry-os`
**기반 문서:** 02_ai_foundry_phase1_v0.3.md (외부 정의서) + 07_ai_foundry_os_target_architecture.md (사내 운영 아키텍처) + 08_build_plan_v1.md (마스터 빌드 플랜)
**분류:** 기업비밀 II급

---

## 1. 요약 (Executive Summary)

**한 줄 정의**: KTDS-AXBD 4 본부(AX·공공·금융·기업)가 자기 의사결정을 자산화·진단·재사용하는 사내 통합 Agentic AI 플랫폼. **외부 고객 적용 전 자체 레퍼런스 + 사내 KPI 입증의 1순위 인스턴스**.

**배경**:
KT DS는 5개 사내 repo (Foundry-X·Decode-X·Discovery-X·AXIS-DS·ax-plugin)를 이미 보유하고 있지만, 이들이 사업본부 단위로 통합 운영되는 그림·표준·자산 재사용 루프가 없음. 외부 고객 제안 시 "KT DS 자체 운영 사례"가 결정적 신뢰 근거인데, 그 레퍼런스가 부재. AI Foundry OS는 본 5개 자산을 4 본부에 동시 적용해 **외부 GTM의 자체 입증**을 제공함.

**목표**:
2026년 7월 안에 AX(Platform Owner) + 공공·금융·기업(Domain Tenants 3개)으로 5-Layer 통합 운영, "4 본부 동시 운영 / N개 critical inconsistency 발견 / X% 자산 재사용 / Y시간 단축"을 한 화면 KPI 대시보드로 입증, 외부 고객 제안 자료의 핵심 백본 확보. **Sinclair + AI 에이전트 100%**로 구축해 AI Foundry 자체 철학(에이전트가 에이전트 플랫폼을 만든다)을 dogfooding.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

KT DS는 5개 사내 repo가 부분적으로 이미 운영 중이거나 (Foundry-X 🟢LIVE 85% / Discovery-X 🟡Pilot 60%), Scaffold 상태(Decode-X ⚪30%)거나, 미착수(Guard-X·Launch-X 🔴To-Do)임. 본부별로 다음 문제를 동일하게 겪음:

- **머릿속에만 있는 결정**: 베테랑 컨설턴트·BD·심사자의 노하우가 명문화·자산화 안 됨
- **추적되지 않는 근거**: 결정의 근거가 사내 시스템에 분산
- **반복 재발생**: 같은 고객 유형, 같은 프로세스를 본부마다 처음부터 다시 함
- **평가되지 않는 결과**: 의사결정 효과 측정 시스템 없음

추가로 본부 단위에서:
- 5 repo가 사업본부 통합 그림 없음 (07 사내 아키텍처는 사내 코어팀 한정 회람)
- AX 자산을 공공·금융·기업 본부가 어떻게 재사용할지 표준 X
- 본부별 Cross-Org 비교 분석 부재 → 공통 표준화 가능 자산 식별 X

### 2.2 목표 상태 (To-Be)

7월 시점에:
- **3 본부 동시 운영**: AX(Platform Owner) + 도메인 본부 2개(공공·금융 또는 공공·기업)가 같은 플랫폼에서 각자 도메인 인스턴스로 운영
- **4대 진단 자동 실행**: 본부별 정책팩에 Missing/Duplicate/Overspec/Inconsistency 진단 자동
- **Cross-Org 4그룹 분류**: 본부 간 공통 표준 식별 + core_differentiator default-deny 보호
- **KPI 대시보드**: "N개 critical inconsistency / X% 자산 재사용 / Y시간 단축" 한 화면
- **외부 GTM 자료**: 자체 운영 영상 + KPI 보고서 + 한 장 시각화 (외부 5개 repo 명칭 추상화)

### 2.3 시급성

**deadline: 2026년 7월** — 마스터 플랜 v1보다 1개월 공격적.

이유:
- 외부 (KT 본부·고객사) 첫 제안 시점이 7월 W27~W30 (마스터 플랜 v1 §3.3 Phase 3 진입 정비)
- 외부 도메인 확정(R-13 Critical/High)이 늦어지더라도 KT DS 자체가 확정된 first instance로 동작
- 7월에 외부 제안 드라이런 가능 → 8월 G5 임원 보고에서 "사업 적용 시작" 메시지 확정
- 사용자 자신감(혼자 + AI 100%)으로 일정 압축 가능

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|---|---|---|
| **AX (Platform Owner)** | AX컨설팅팀 (서민원·김기욱·남윤서·이응주 + Sinclair) | 4 본부의 도구·온톨로지·정책팩 템플릿 제공·운영. 도메인 무관 표준화 |
| **공공 (Domain Tenant 1)** | 공공사업본부 영업·BD·심사자 | 공공조달·국감 자료 정책팩 자산화. core_differentiator 보호 |
| **금융 (Domain Tenant 2)** | 금융사업본부 도메인 SME | 여신·심사·통제 정책팩 자산화. core_differentiator 보호 |
| **기업 (Domain Tenant 3, MVP fallback)** | 기업사업본부 솔루션 영업 | 사업 제안·견적 정책팩 자산화. Phase 4 ferrying 가능 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|---|---|---|
| AXBD 임원 | 본 PRD 결재·G5 임원 보고 receiver | 높음 |
| 공공·금융·기업 본부장 | core_differentiator 분류 sign-off + Approver RBAC | 높음 |
| KT 본부 카운터파트 (외부 고객 sourcing) | 7월 외부 제안 receiver | 중간 (간접) |
| Decode-X 코어팀 | Phase 2-E 알고리즘 흡수 협업 | 중간 |
| BeSir | MCP Tools 통합 (Phase 2~3) | 중간 |
| 외부 고객 (잠재) | 7월 외부 제안 자료의 청중 | 낮음 (직접 사용자 X) |

### 3.3 사용 환경

- **기기**: PC 우선 (Foundry-X Web 기반), 모바일은 out-of-scope
- **네트워크**: 사내망 + 인터넷 (Cloudflare Workers 글로벌 + KT cloud)
- **기술 수준**: 비개발자(BD·영업·SME) 우선 + 개발자(AX팀) 혼합 → AXIS-DS @axis-ds/agentic-ui 컴포넌트가 UX 결정적

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|---|---|---|
| 1 | **5-Layer 통합 운영** | Layer 1 Data + L2 Ontology(파일+Git+PG) + L3 LLM(Tier Router) + L4 Workflow(HITL) + L5 Agent(Skill Package). 가상 도메인 1·2 + 실 도메인 1~2개 E2E | P0 |
| 2 | **Multi-Tenant 본부별 격리** | 본부별 PostgreSQL schema 분리 + RBAC 5역할 + KT DS SSO. AX는 schema 간 read-only view, Domain Tenant는 자기 schema만 | P0 |
| 3 | **4대 진단 자동 실행** | Missing·Duplicate·Overspec·Inconsistency. 본부별 정책팩에 주기적·이벤트 기반. 11_dev_plan v1 그대로 | P0 |
| 4 | **Cross-Org 4그룹 분류** | 본부 3개 정책 비교 → common_standard / org_specific / tacit_knowledge / core_differentiator. **core_differentiator default-deny 코드 강제**. 12_dev_plan v1 그대로 | P0 |
| 5 | **KPI 대시보드** | "4 본부 동시 운영 / N개 critical inconsistency / X% 자산 재사용 / Y시간 단축" 한 화면. AXIS-DS v1.2 Diagnostic Card + KPI 위젯 | P0 |
| 6 | **HITL Console** | Reviewer/Approver 워크플로우. AXIS-DS v1.2 agentic-ui (Reviewer Card + Approver Modal + Audit Trail Viewer) | P0 |
| 7 | **Audit Log Bus** | 전 모듈 audit trail append-only. trace_id로 cross-module join | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|---|---|---|
| 1 | Six Hats 토론 자동화 | 정책팩 변경 시 Six Thinking Hats 6관점 다각 토론. ax-plugin /ax:diagnostic-run 보조 | P1 |
| 2 | Discovery-X handoff BC 외부 카드 export | 외부 GTM 자료용 카드 자동 생성 (5 repo 명칭 자동 마스킹) | P1 |
| 3 | Guard-X β 운영 (mock → 실 정책 검증) | 09_dev_plan §7.2 Integration | P1 |
| 4 | Launch-X β Type 1 Delivery | 10_dev_plan §7.2 Integration. 외부 제안용 정책팩 zip export | P1 |
| 5 | ax-plugin /ax:domain-init β | 신규 도메인 dry-run ≤ 1일. 4번째 본부(MVP fallback) 진입 시 사용 | P1 |
| 6 | CQ 5축 운영 검증 (02 §4.6) | 호출 단위 자동 평가, 90점 핸드오프 | P2 |

### 4.3 제외 범위 (Out of Scope)

08 §7.5.2 그대로:

- 외부 마켓플레이스 UI/Backend (Phase 4)
- 결제·라이선스 풀 시스템 (Phase 4)
- SLA 보장형 SaaS 운영 모드 (Phase 4)
- 다국어 지원 (영어 외) (Phase 4+)
- 모바일 앱 (Phase 4+)
- 실시간 스트림 처리 GA (배치 + 준실시간만)
- 외부 ID 연동 풀 (KT DS SSO 기본만)
- 산업별 표준 인증 (금감원·국정원 등) (Phase 4)
- AXBD 외 다른 KT DS 본부 (운영·HR 등) — Phase 4

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|---|---|---|
| KT DS SSO (사내 IdP) | OIDC | 필수 |
| Cloudflare Workers + D1 (현행 운영) | API | 필수 |
| PostgreSQL (사내 또는 RDS) | DB 직결 | 필수 |
| Git 저장소 (사내 GitHub Enterprise) | 파일 메타 자산 | 필수 |
| Anthropic / OpenAI / OpenRouter (LLM) | API (Tier Router) | 필수 |
| AXIS-DS @axis-ds (npm) | npm package | 필수 |
| ax-plugin 24+신규 6 스킬 | Claude Code Plugin | 필수 |
| BeSir (MCP Tools) | MCP 양방향 | 선택 (Phase 2~3) |
| Eval Rail 측정 데이터 저장소 | 시계열 DB (사내 또는 InfluxDB) | 선택 (Phase 3+) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 (7월) | 측정 방법 |
|---|---|---|---|
| **본부 동시 운영 수** | 0 | **3 본부** (AX+도메인 2) | Foundry-X 인스턴스 카운트 |
| **Critical inconsistency 발견 N건** | 0 | **본부당 ≥ 5건 시연 가능** | 4대 진단 결과 카드 |
| **자산 재사용률** | 0% | **≥ 30%** (본부 간 common_standard 정책 재사용) | Cross-Org 4그룹 분포 |
| **진단 시간 단축** | 베이스라인 측정 필요 | **≥ 50%** (수기 검토 vs 4대 진단 자동) | HITL audit log timing |
| **5-Layer E2E 성공률** | 측정 안됨 | **≥ 80%** | Foundry-X E2E 테스트 |
| **HITL 평균 처리** | N/A | **≤ 24시간** | Workflow Coord audit log |
| **API p95** | 현행 | **≤ 1.5초** | 호출 로그 |
| **core_differentiator default-deny 차단율** | N/A | **100% (필수)** | export 시도 audit log |

### 5.2 MVP 최소 기준 (7월 deadline 마지막 선)

- [ ] **3 본부 동시 운영** (AX + 도메인 본부 2개 — 공공·금융 또는 공공·기업)
- [ ] **핵심 KPI 3개 측정 가능**: critical inconsistency 발견 N건 / 자산 재사용률 ≥ X% / 진단 시간 단축 X%
- [ ] **Cross-Org 4그룹 분류 동작** (N=2 도메인 비교 가능)
- [ ] **AXIS-DS v1.2 KPI 대시보드 한 화면 시연 가능**
- [ ] **외부 제안 자료 1차 sign-off** (5 repo 명칭 추상화 마스킹 완료)

미달 시 → "외부 적용 연기" 신호 → 4번째 본부 추가는 Phase 4로 ferrying

### 5.3 실패/중단 조건

- 7월 W27까지 **3 본부 중 2 본부도 운영 불가** → Phase 2 Yellow/Red fallback 발동 (08 §3.2.1 매트릭스)
- core_differentiator **default-deny 차단율 < 100%** → R-X1 critical, 외부 제안 중단
- **R-X2 (Sinclair bus factor 1)** 실현 (사용자 부재 ≥ 2주) → 즉시 인력 재배치 + 인터뷰 v2

---

## 6. 제약 조건

### 6.1 일정

- **목표 완료일**: 2026년 7월 (deadline)
- **마일스톤** (마스터 플랜 v1 §3 기반 + 1개월 압축):
  - Phase 1 끝: 5월 W21 (G1+G2)
  - Phase 2 α1~α4: 6월 W22~W26 (G3) — Multi-Tenant 앞당김 포함
  - **본 PRD MVP**: 7월 W29 (외부 제안 드라이런 시점)
  - Phase 3 1차 마감: 8월 W34 (G5)

### 6.2 기술 스택

- **프론트엔드**: AXIS-DS @axis-ds/ui-react + agentic-ui v1.2 (React 19 + Tailwind 4)
- **백엔드**: Foundry-X 모노리포 packages/api (Hono on Cloudflare Workers + 신규 sub-app `core/{guard,launch,diagnostic,cross-org,multi-tenant}/`)
- **인프라**: Cloudflare Workers + D1 + Object Store + PostgreSQL (사내 또는 RDS) + Git (사내 GitHub Enterprise) + Redis 캐시
- **LLM**: 다중 공급자 (Anthropic·OpenAI·OpenRouter) + Tier Router + Cost Governor
- **Knowledge Map**: 파일 + Git + PostgreSQL (Graph DB·Vector DB 미사용, 02 §3.4.1 결정 그대로)

### 6.3 인력/예산

- **투입 가능 인원**: **1.0 FTE (Sinclair)** + AI 에이전트 (Foundry-X agentic 기능 전체 활용)
- 마스터 플랜 v1의 7.3 FTE × 18주 가설은 본 PRD에서 **폐기** (인력 가설 H5 무효화)
- 외주 가능: 시연 영상 편집·HITL Console UI 폴리싱 (선택)
- 예산: 사내 인프라 자산 재사용 + LLM 비용 Cost Governor (Tier 1 hard cap, 도메인당 일일 예산)

### 6.4 컴플라이언스

- **KT DS 내부 정책**:
  - 분류: 기업비밀 II급 (외부 회람 시 5 repo 명칭 마스킹 의무)
  - core_differentiator default-deny 코드 수준 강제 (R-X1 완화)
  - audit log append-only + SIEM 연계 IF
- **보안 요구사항**:
  - KT DS SSO + RBAC 5역할 (02 §3.6.0)
  - 본부별 PostgreSQL schema 격리
  - PII Guard (Layer 1 + Guard-X 이중)
  - HMAC 서명 (Guard-X check_id)
- **외부 규제**: PIPA (개인정보보호법) — Layer 1 PII Guard + sensitivity_label 전파 적용. 산업별 인증(금감원·국정원)은 out-of-scope

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|---|---|---|
| 1 | 도메인 본부 2개 사전 합의 (공공·금융 vs 공공·기업) | Sinclair + 본부장 | 5월 W19 |
| 2 | 본부별 PostgreSQL schema 격리 인프라 결정 (RDS multi-schema vs 별도 DB) | Sinclair + 인프라 | 5월 W20 |
| 3 | core_differentiator 분류 임계 도메인별 보정 워크샵 일정 | Sinclair + 본부 SME | 6월 W22 |
| 4 | Sinclair + AI 100% 모델의 임원 결재 라인 합의 (R-X2 완화) | Sinclair + AXBD 임원 | 5월 W18 |
| 5 | 외부 제안 자료 5 repo 명칭 추상화 가이드 v2 | Sinclair | 6월 W26 |
| 6 | BeSir MCP Tools 통합 시점 (Phase 2 vs Phase 3) | Sinclair + BeSir | 5월 W19 BeSir 미팅 |
| 7 | KPI 베이스라인 측정 (현재 본부별 의사결정 시간) | 본부 SME | 5월 W20 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|---|---|---|---|
| 초안 | 2026-05-02 | 최초 작성 — Sinclair 인터뷰 + 02 v0.3 + 07 + 08 통합 | - |
| R1 | (Phase 2 검토 후) | (자동 채우기) | (자동) |

---

## 신규 리스크 (마스터 플랜 v1 R 외 추가)

| ID | 리스크 | 심각도/가능성 | 완화책 |
|---|---|---|---|
| **R-X1** | 본부 간 core_differentiator 공유 거부 (R-14 사내판) | High/Med | 12 dev plan §2.4 default-deny 코드 강제 + 본부장 sign-off 의무 + 분류 임계 도메인별 보정 |
| **R-X2** | Sinclair + AI 100% 모델의 bus factor 1 | High/High | 모든 산출물 Git 단일 진실의 원본 + AI 에이전트 세션 기록 audit log + 인터뷰 v2 트리거 (사용자 부재 ≥ 2주) |
| **R-X3** | 7월 deadline + Multi-Tenant 앞당김 동시 압박 | High/Med | Phase 2 fallback (08 §7.6.1) Yellow/Red 매트릭스 사전 발동 + 4번째 본부 Phase 4 ferrying |
| **R-X4** | 본부 KPI 베이스라인 부재로 단축률 측정 불가 | Med/High | 5월 W20까지 본부별 베이스라인 측정 의무 (오픈 이슈 #7) |
| **R-X5** | AI 에이전트 산출물의 임원 sign-off 신뢰 부족 | Med/Med | audit log 완전 투명화 + Sinclair 1차 검토 의무 + 임원 보고 시 AI 에이전트 사용 명시 |

---

*이 문서는 ax-plugin /req-interview 스킬에 의해 자동 생성. Phase 2 외부 LLM 자동 검토 및 Six Hats 토론 대기 중.*
