# AI Foundry OS PRD

**버전:** v2 <!-- CHANGED: Round 1 검토 결과 P0+P1 9 안건 반영 -->
**날짜:** 2026-05-02
**작성자:** Sinclair Seo (KTDS-AXBD AX컨설팅팀, PM 겸 프로그래머)
**상태:** 🔄 Round 2 검토 대기 (Phase 2 자동 + Phase 4 통합 판정 후 → 착수 결정) <!-- CHANGED -->
**코드네임:** `ai-foundry-os`
**기반 문서:** 02_ai_foundry_phase1_v0.3.md (외부 정의서) + 07_ai_foundry_os_target_architecture.md (사내 운영 아키텍처) + 08_build_plan_v1.md (마스터 빌드 플랜) + Round 1 검토의견 (3 LLM Conditional)
**분류:** 기업비밀 II급

---

## 1. 요약 (Executive Summary)

**한 줄 정의**: KTDS-AXBD 4 본부(AX·공공·금융·기업)가 자기 의사결정을 자산화·진단·재사용하는 사내 통합 Agentic AI 플랫폼. **외부 고객 적용 전 자체 레퍼런스 + 사내 KPI 입증의 1순위 인스턴스**.

**배경**:
KT DS는 5개 사내 repo (Foundry-X·Decode-X·Discovery-X·AXIS-DS·ax-plugin)를 이미 보유하고 있지만, 이들이 사업본부 단위로 통합 운영되는 그림·표준·자산 재사용 루프가 없음. 외부 고객 제안 시 "KT DS 자체 운영 사례"가 결정적 신뢰 근거인데, 그 레퍼런스가 부재. AI Foundry OS는 본 5개 자산을 4 본부에 동시 적용해 **외부 GTM의 자체 입증**을 제공함.

**목표**:
2026년 7월 안에 AX(Platform Owner) + 공공·금융·기업(Domain Tenants 3개)으로 5-Layer 통합 운영, "4 본부 동시 운영 / N개 critical inconsistency 발견 / X% 자산 재사용 / Y시간 단축"을 한 화면 KPI 대시보드로 입증, 외부 고객 제안 자료의 핵심 백본 확보. **Sinclair + AI 에이전트 100%**로 구축해 AI Foundry 자체 철학(에이전트가 에이전트 플랫폼을 만든다)을 dogfooding.

<!-- CHANGED [P0-1]: Round 1 3 LLM 모두 1인 모델의 PoC 부재를 우려 — §6.3과 R-X2에서 PoC 절차·백업 인력 트리거 명시 -->

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

### 3.4 사용자 여정 (User Journey) <!-- CHANGED [P1-5]: Round 1 ChatGPT flaw + Gemini concern — 본부별 워크플로우 시각화 -->

본부별 신규 정책팩 자산화 → KPI 대시보드 반영의 표준 흐름:

```
[Domain Tenant 본부]
  1. 신규 정책 작성 (BD·SME가 AXIS-DS HITL Console에 입력)
       ↓
  2. Decode-X svc-policy → Triple 추출 + POL-* 코드 부여
       ↓
  3. Diagnostic Runner 자동 실행 (4대 진단)
       ↓
  4. 진단 결과 카드 → diagnosis BC (Discovery-X)
       ↓
  5. Reviewer 검토 (accept/reject/modify) — 본부 내부 RBAC
       ↓
  6. Cross-Org 4그룹 분류 자동 (본부 간 비교)
       ↓
  7. core_differentiator → default-deny 잠금 / common_standard → 공유 자산 등록
       ↓
  8. Guard-X 룰 검증 + Approver 승인 (본부장 sign-off)
       ↓
  9. Launch-X Type 1 export (zip + manifest) → 운영 등록
       ↓
 10. Decision Log entry → KPI 대시보드 자동 반영
       ↓
 11. AX (Platform Owner)는 monthly aggregated view → 본부 통합 KPI 보고
```

**시간 측정 포인트**: 단계 1 → 11 전체 소요 시간이 KPI "진단 시간 단축"의 측정 단위.

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
| 8 | **AI 에이전트 투명성** <!-- CHANGED [P1-4] --> | AI 산출물의 근거 추적 (LLM 호출 trace + prompt + response 모두 audit). HITL escalation 자동 트리거 (confidence < 0.7 시 사람 검토 강제). 사용자가 "왜 이 결정?" 클릭 시 evidence chain 표시 | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|---|---|---|
| 1 | Six Hats 토론 자동화 (외부 LLM 호출만, 내부 자동화는 Phase 4) <!-- CHANGED [P2-1] DeepSeek 지적: 내부 자동화는 복잡도 높음 → 외부 LLM 호출 패턴만 유지 --> | 정책팩 변경 시 Six Thinking Hats 6관점 외부 LLM 호출. ax-plugin /ax:diagnostic-run 보조 | P2 |
| 2 | Discovery-X handoff BC 외부 카드 export | 외부 GTM 자료용 카드 자동 생성 (5 repo 명칭 자동 마스킹) | P1 |
| 3 | Guard-X β 운영 (mock → 실 정책 검증) | 09_dev_plan §7.2 Integration | P1 |
| 4 | Launch-X β Type 1 Delivery | 10_dev_plan §7.2 Integration. 외부 제안용 정책팩 zip export | P1 |
| 5 | ax-plugin /ax:domain-init β | 신규 도메인 dry-run ≤ 1일. 4번째 본부(MVP fallback) 진입 시 사용 | P1 |
| 6 | CQ 5축 운영 검증 (02 §4.6) | 호출 단위 자동 평가, 90점 핸드오프 | P2 |

### 4.3 제외 범위 (Out of Scope)

08 §7.5.2 그대로 + Round 1 Gemini 지적 추가 명시:

- 외부 마켓플레이스 UI/Backend (Phase 4)
- 결제·라이선스 풀 시스템 (Phase 4)
- SLA 보장형 SaaS 운영 모드 (Phase 4)
- 다국어 지원 (영어 외) (Phase 4+)
- 모바일 앱 (Phase 4+)
- 실시간 스트림 처리 GA (배치 + 준실시간만)
- 외부 ID 연동 풀 (KT DS SSO 기본만)
- **산업별 표준 인증 (금감원·국정원·금융권 망분리·정보보안 강화) (Phase 4)** <!-- CHANGED [P2-2] -->
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

### 4.5 운영·지원 체계 <!-- CHANGED [P1-1]: Round 1 ChatGPT gap + DeepSeek risk - 운영 SOP 명시 -->

| 영역 | 정책 | SLA |
|---|---|---|
| **장애 대응** | Cloudflare Workers·D1·PostgreSQL 장애 → Sinclair + AI 에이전트 자동 incident report → AXBD 임원 알림. 평일 4시간/주말 24시간 내 1차 대응 | P0 incident 4h response |
| **백업·복구** | D1·PostgreSQL daily snapshot + Git 저장소 자동 push (모든 정책팩·온톨로지·System Knowledge) | RPO 24h / RTO 4h |
| **LLM API 장애·비용 초과** | Tier Router 자동 fallback (Tier 1 → Tier 2). 일일 예산 80% 도달 시 알람, 100% 도달 시 호출 거부 | 자동 |
| **정책팩 신규 추가/변경** | 본부 측 PR → AX HITL 검토 → Approver sign-off → Launch-X 발행 | PR 응답 24h |
| **롤백** | Launch-X RollbackManager — Type 1 zip 교체 / Type 2 blue/green 즉시 전환 | < 30초 |
| **응급 우회** | Sinclair 부재 시 (R-X2) audit log 완전 투명화 + AI 에이전트 자체 incident report → 임원 직접 결재 가능 | 자동 |

### 4.6 테스트·QA·교육 계획 <!-- CHANGED [P1-2, P1-4]: ChatGPT gap + Gemini gap + 투명성 -->

#### 4.6.1 테스트

| 종류 | 범위 | 책임 |
|---|---|---|
| Unit 테스트 | 4 모듈 (Guard-X·Launch-X·4대 진단·Cross-Org) 핵심 함수 | Sinclair + AI |
| 5-Layer E2E 테스트 | 가상 도메인 1·2 → 실 도메인 → KPI 대시보드 반영까지 자동 | Sinclair + AI |
| **본부별 시나리오 UAT** | 각 본부의 신규 정책팩 1건씩 실 데이터로 통과 시연 | 본부 SME + Sinclair |
| 부하 테스트 (k6) | 4 본부 동시 운영 시 API p95 ≤ 1.5초 | Sinclair + AI |
| 보안 테스트 | core_differentiator default-deny 차단 100% (export 시도 모두 audit) | 보안팀 합동 (오픈 이슈 #4 협조) |

#### 4.6.2 교육·온보딩

| 대상 | 자료 | 방식 |
|---|---|---|
| AX팀 (Platform Owner) | 운영 매뉴얼 + ax-plugin 신규 6 스킬 가이드 | 1회 60분 + Q&A |
| 본부 SME (비개발자) | HITL Console 사용 가이드 + Diagnostic Card 해석 가이드 | 본부별 1회 60분 + 영상 |
| 본부장 (Approver) | Approval Workflow 가이드 + Cross-Org 카드 해석 | 1회 30분 |
| 임원 | KPI 대시보드 해석 가이드 + 외부 GTM 자료 활용 | 1회 30분 |

#### 4.6.3 AI 에이전트 투명성·설명 가능성

- **trace_id chain**: 모든 LLM 호출 + prompt + response를 trace_id로 연결, audit log에 영구 보존
- **HITL escalation 트리거**: confidence < 0.7 또는 sensitivity_label = restricted 시 사람 검토 강제
- **"Why?" 클릭**: HITL Console에서 "왜 이 결정?" 클릭 시 evidence chain (E1/E2/E3) 시각화

### 4.7 변경관리·릴리즈 플랜 <!-- CHANGED [P1-3]: ChatGPT gap + DeepSeek concern -->

| 변경 종류 | 절차 | 승인 |
|---|---|---|
| 정책팩 신규/수정 | Decode-X svc-policy → Diagnostic → HITL → Cross-Org → Guard-X → Launch-X | 본부장 |
| 온톨로지 변경 | Git PR → DomainExpert review → AX 승인 → 적용 | AX팀 + DomainExpert |
| Skill Package 신규 | ax-plugin GOV 표준 준수 → Sinclair 직접 PR → Foundry-X Skill Registry | Sinclair |
| 인프라 변경 | Cloudflare/D1/PG schema migration → Git PR → 사내 인프라팀 합동 검토 | AX + 인프라 |
| 시스템 자체 (코드) | Git PR → Sinclair + AI 에이전트 자동 검증 → 본인 merge → CI deploy | Sinclair |

**롤백 정책**: 모든 release는 직전 버전 보존. Type 1 zip 교체 / Type 2 blue/green. RollbackManager 자동 / Sinclair 수동 모두 가능.

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI) <!-- CHANGED [P0-3]: ChatGPT flaw + Gemini gap — KPI 산정 방법·베이스라인 측정 의무 명시 -->

| 지표 | 정의 (산정 방법) | 베이스라인 측정 시점 | 목표값 (7월) | 측정 주기 |
|---|---|---|---|---|
| **본부 동시 운영 수** | Foundry-X 활성 인스턴스 카운트 + 최근 7일 정책팩 발행 ≥ 1건 본부 수 | (즉시 측정 가능) | **3 본부** | 일일 자동 |
| **Critical inconsistency 발견 N건** | 4대 진단 결과 중 severity=critical 카드 수 (본부당 누적) | 본부 합의 후 1주 (오픈 이슈 #1·#7) | **본부당 ≥ 5건 시연 가능** | 진단 실행 시 |
| **자산 재사용률** | 본부 간 common_standard 분류 정책 수 / 전체 정책 수 (Cross-Org 분류 결과) — **단위는 정책팩 단위 (POL-* 코드 기준)** | 본부 합의 후 4주 (Cross-Org 1차 실행) | **≥ 30%** | 주간 자동 |
| **진단 시간 단축** | (수기 검토 시간 - 4대 진단 자동 시간) / 수기 검토 시간 — **수기 검토 시간 베이스라인은 본부 SME 1주 측정 (오픈 이슈 #7)** | 본부 합의 후 2주 | **≥ 50%** | 진단 1건당 |
| **5-Layer E2E 성공률** | E2E 자동 테스트 통과 / 전체 실행 (Foundry-X CI) | (즉시 측정 가능) | **≥ 80%** | PR마다 |
| **HITL 평균 처리** | Reviewer 결정 timestamp - 카드 생성 timestamp 평균 (Workflow Coord audit log) | (즉시 측정 가능) | **≤ 24시간** | 일일 자동 |
| **API p95** | k6 부하 테스트 + 운영 호출 로그 (Foundry-X 모든 sub-app 합산) | (즉시 측정 가능) | **≤ 1.5초** | 주간 자동 |
| **core_differentiator default-deny 차단율** | export 시도 audit log에서 차단 / 시도 비율 | (시뮬레이션 가능) | **100% (필수)** | 일일 자동 |

> **베이스라인 측정 워크샵 (오픈 이슈 #7)**: 5월 W19~W20에 본부별 SME와 1주 측정 진행. 측정 안 되면 PRD §5.1 KPI 수치 X·Y는 "측정 후 확정"으로 명시.

### 5.2 MVP 최소 기준 (7월 deadline 마지막 선)

- [ ] **3 본부 동시 운영** (AX + 도메인 본부 2개 — 공공·금융 또는 공공·기업)
- [ ] **핵심 KPI 3개 측정 가능**: critical inconsistency 발견 N건 / 자산 재사용률 ≥ X% / 진단 시간 단축 X% (베이스라인 측정 후 X·N 확정)
- [ ] **Cross-Org 4그룹 분류 동작** (N=2 도메인 비교 가능)
- [ ] **AXIS-DS v1.2 KPI 대시보드 한 화면 시연 가능**
- [ ] **외부 제안 자료 1차 sign-off** (5 repo 명칭 추상화 마스킹 완료)
- [ ] **외부 제안 자료 형태 결정** (영상 ≥ 5분 + 1쪽 시각화 + KPI 보고서 PDF) <!-- CHANGED [P1-6] -->

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

### 6.3 인력/예산 <!-- CHANGED [P0-1]: Round 1 3 LLM 모두 1인 모델 우려 — PoC 절차·백업 트리거 명시 -->

- **투입 가능 인원**: **1.0 FTE (Sinclair)** + AI 에이전트 (Foundry-X agentic 기능 전체 활용)
- 마스터 플랜 v1의 7.3 FTE × 18주 가설은 본 PRD에서 **폐기** (인력 가설 H5 무효화)

#### 6.3.1 1인 + AI 100% 모델 PoC 검증 (착수 전 필수)

| Phase | PoC 검증 안건 | 통과 기준 | 책임 |
|---|---|---|---|
| **Pre-착수 (5월 W18~W19)** | Foundry-X agentic 자동화 능력 PoC: 4대 진단 1종(Missing) + Cross-Org 4그룹 분류 1건 + KPI 1건을 AI 에이전트로 100% 자동 실행 | Sinclair 개입 < 10% | Sinclair |
| Phase 2 시작 (W22) | AI 에이전트 임원 보고용 산출물 PoC: 1개 본부 mock data로 KPI 대시보드 자동 생성 | 임원 1차 검토 sign-off | Sinclair + AXBD 임원 |
| Phase 3 시작 (W30) | AI 에이전트 운영 안정성 PoC: 24시간 자동 운영 (장애·복구·rollback 시나리오 포함) | 무중단 + audit log 무결성 | Sinclair |

**PoC 미통과 시**: 즉시 백업 인력 0.5 FTE 투입 (사내 협조 — AXBD 임원 직권 지정).

#### 6.3.2 백업 인력 트리거 (R-X2 강화)

다음 신호 중 하나 발생 시 즉시 백업 인력 0.5~1.0 FTE 확보:
- Sinclair 부재 ≥ 2주 (계획되지 않은 결근)
- AI 에이전트 자동화 비율 < 80% (PoC에서 측정)
- 본부 협의 리드타임이 1 항목당 평균 ≥ 2주 (오픈 이슈 #1 측정)

- **외주 가능**: 시연 영상 편집·HITL Console UI 폴리싱 (선택)
- **예산**: 사내 인프라 자산 재사용 + LLM 비용 Cost Governor (Tier 1 hard cap, 도메인당 일일 예산)

### 6.4 컴플라이언스 <!-- CHANGED [P1-1, P1-4]: 보안 보강 + 윤리 AI 명시 -->

- **KT DS 내부 정책**:
  - 분류: 기업비밀 II급 (외부 회람 시 5 repo 명칭 마스킹 의무)
  - core_differentiator default-deny 코드 수준 강제 (R-X1 완화)
  - audit log append-only + SIEM 연계 IF
- **보안 요구사항**:
  - KT DS SSO + RBAC 5역할 (02 §3.6.0)
  - 본부별 PostgreSQL schema 격리
  - PII Guard (Layer 1 + Guard-X 이중)
  - HMAC 서명 (Guard-X check_id)
  - **장애 발생 시 incident report 자동 생성 (audit log 기반)**
- **윤리적 AI / 편향성 관리** <!-- CHANGED [P2-3] -->:
  - LLM 호출 시 prompt + response 모두 audit
  - confidence < 0.7 시 사람 개입 강제 (HITL escalation)
  - 본부별 정책 분류 결과의 false positive/negative 주간 측정
  - core_differentiator 오분류 발견 시 즉시 분류 중단 + 본부장 재검토
- **외부 규제**: PIPA (개인정보보호법) — Layer 1 PII Guard + sensitivity_label 전파 적용. 산업별 인증(금감원·국정원·금융권 망분리)은 out-of-scope (§4.3)

---

## 7. 리스크 상세 (RACI 포함) <!-- CHANGED [P0-2]: 신설 — 본부별 합의 리드타임 + R-X 종합 -->

### 7.1 본부별 합의 리드타임 (R-X1 강화)

| 안건 | 본부 | 측정 방법 | 7월 deadline 영향 |
|---|---|---|---|
| 도메인 본부 2개 사전 합의 | AXBD 임원 + 본부장 | 5월 W18 회의록 sign-off | 미달 시 7월 deadline 1주 이상 지연 |
| core_differentiator 분류 임계 보정 워크샵 | 본부 SME 3명 | 6월 W22~W23 워크샵 | 미달 시 R-X1 활성화, Cross-Org default-deny 정확도 미달 |
| Approver RBAC 권한 위임 | 본부장 + AXBD 임원 | 5월 W19 합의서 | 미달 시 Workflow 마비 |
| KPI 베이스라인 측정 (오픈 이슈 #7) | 본부 SME + AX | 5월 W19~W20 1주 측정 | 미달 시 KPI 변수(X·N) 확정 불가, 외부 제안 자료 약화 |

**서면 확약 의무**: 위 4 안건 모두 5월 W19 안에 sign-off. 1 안건이라도 슬립하면 7월 deadline 재조정 검토.

### 7.2 신규 리스크 종합 (마스터 플랜 v1 R 외)

| ID | 리스크 | 심각도/가능성 | 완화책 | Owner |
|---|---|---|---|---|
| **R-X1** | 본부 간 core_differentiator 공유 거부 (R-14 사내판) | High/Med | 12 dev plan §2.4 default-deny 코드 강제 + 본부장 sign-off 의무 + 분류 임계 도메인별 보정 (§7.1 워크샵) | Sinclair + 본부장 |
| **R-X2** | Sinclair + AI 100% 모델의 bus factor 1 | High/High | §6.3.1 PoC + §6.3.2 백업 트리거 + audit log 완전 투명화 | AXBD 임원 (백업 인력 결재) |
| **R-X3** | 7월 deadline + Multi-Tenant 앞당김 동시 압박 | High/Med | Phase 2 fallback (08 §7.6.1) Yellow/Red 매트릭스 사전 발동 + 4번째 본부 Phase 4 ferrying | Sinclair |
| **R-X4** | 본부 KPI 베이스라인 부재로 단축률 측정 불가 | Med/High | 5월 W19~W20 베이스라인 측정 의무 (오픈 이슈 #7) | 본부 SME + Sinclair |
| **R-X5** | AI 에이전트 산출물의 임원 sign-off 신뢰 부족 | Med/Med | audit log 완전 투명화 + Sinclair 1차 검토 의무 + 임원 보고 시 AI 에이전트 사용 명시 | Sinclair |
| **R-X6** <!-- CHANGED [P0-1, P1-4] --> | AI 에이전트 자동화 한계 | High/Med | §6.3.1 Pre-착수 PoC 의무. 자동화 < 80% 시 백업 인력 즉시 (§6.3.2) | Sinclair + AXBD 임원 |
| **R-X7** <!-- CHANGED [P1-2] --> | 본부 비개발자 사용자의 학습 곡선 | Med/Med | §4.6.2 교육 계획 + AXIS-DS 단순 UI 우선 + 본부별 영상 가이드 | UI/UX + AX |

---

## 8. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|---|---|---|
| 1 | 도메인 본부 2개 사전 합의 (공공·금융 vs 공공·기업) | Sinclair + 본부장 | **5월 W18** (앞당김) |
| 2 | 본부별 PostgreSQL schema 격리 인프라 결정 (RDS multi-schema vs 별도 DB) | Sinclair + 인프라 | 5월 W20 |
| 3 | core_differentiator 분류 임계 도메인별 보정 워크샵 일정 | Sinclair + 본부 SME | 6월 W22 |
| 4 | Sinclair + AI 100% 모델의 임원 결재 라인 합의 (R-X2 완화) | Sinclair + AXBD 임원 | 5월 W18 |
| 5 | 외부 제안 자료 5 repo 명칭 추상화 가이드 v2 | Sinclair | 6월 W26 |
| 6 | BeSir MCP Tools 통합 시점 (Phase 2 vs Phase 3) | Sinclair + BeSir | 5월 W19 BeSir 미팅 |
| 7 | KPI 베이스라인 측정 (현재 본부별 의사결정 시간) <!-- CHANGED [P0-3] 마감 앞당김 --> | 본부 SME | **5월 W19~W20** (1주) |
| 8 <!-- CHANGED [P0-1] --> | Pre-착수 PoC 검증 (Foundry-X agentic 자동화 능력) | Sinclair | 5월 W18~W19 |
| 9 <!-- CHANGED [P1-2] --> | 본부 비개발자 교육 영상 외주 가능 여부 | UI/UX + 외주 | 5월 W20 |

---

## 9. 외부 GTM 자료 형태 <!-- CHANGED [P1-6]: ChatGPT flaw + Gemini comment - 외부 자료 형태 구체화 -->

7월 외부 제안 시점에 다음 3 형태로 패키지:

| 형태 | 내용 | 활용 |
|---|---|---|
| **영상 (5~10분)** | 4 본부 동시 운영 시연 + 4대 진단 카드 + Cross-Org 결과 + KPI 대시보드. 5 repo 명칭 추상화 (08 §10.2 변환 표 적용) | 외부 고객 미팅 첫 5분 |
| **1쪽 시각화** | 3-Plane + Side Rail 그림 (07 사내 → 02 외부 변환) + KPI Top 4 + 차별화 메시지 "1명 + AI로 만든 플랫폼" | 외부 제안 1쪽 요약 |
| **KPI 보고서 PDF** | 본부별 베이스라인 vs 7월 측정 결과 + 자산 재사용 사례 3건 + 본부장 inception 인용문 | 외부 고객 후속 자료 |

**자료 검토 라인**: AXBD 임원 sign-off (1차) + 5 repo 명칭 마스킹 자동 검증 (Discovery-X handoff BC export 기능 활용)

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 | Ambiguity | 판정 |
|---|---|---|---|---|---|
| 초안 (v1) | 2026-05-02 | 최초 작성 — Sinclair 인터뷰 + 02 v0.3 + 07 + 08 통합 | 73/100 | 0.21 | ❌ 추가 라운드 |
| **v2** <!-- CHANGED --> | 2026-05-02 | Round 1 검토의견 P0+P1 9 안건 반영 — User Journey 신설 / KPI 산정 방법 명시 / 운영·QA·교육 계획 추가 / 변경관리 / AI 투명성 / Pre-착수 PoC / 본부 합의 리드타임 / 외부 GTM 자료 형태 / R-X6·R-X7 추가 | (Round 2 대기) | (재계산) | (재판정) |

---

*이 문서는 ax-plugin /req-interview 스킬 Phase 3 자동 반영 (Claude 직접 수행). Round 2 외부 LLM 자동 검토 대기 중. CHANGED 마커 12건 (P0:3 + P1:6 + P2:3).*
