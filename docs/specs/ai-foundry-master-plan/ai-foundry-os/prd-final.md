# AI Foundry OS PRD — Final

**버전:** Final (v2 → Final, CHANGED 마커 통합·정리)
**날짜:** 2026-05-02
**작성자:** Sinclair Seo (KTDS-AXBD AX컨설팅팀, PM 겸 프로그래머)
**상태:** ✅ 착수 결정 (사용자 권한, Conditional 4 조건 트래킹) <!-- 옵션 D -->
**코드네임:** `ai-foundry-os`
**기반 문서:** 02_ai_foundry_phase1_v0.3.md + 07_ai_foundry_os_target_architecture.md + 08_build_plan_v1.md + Round 1·2 검토 통합
**분류:** 기업비밀 II급
**판정 근거:** Scorecard 76 / 100 + Ambiguity **0.121** (≤ 0.2 Ready) + 3 LLM Conditional (PoC 미실행 사유, 실행 단계 검증 안건)

---

## 0. 착수 결정 메타

### 0.1 결정 사항

옵션 D — **사용자 권한 착수 결정**. Conditional 조건 4건은 Phase 5 진행 중 트래킹·만족 의무.

근거:
- PRD 자체 명료도 최상위 (Ambiguity 0.121, ≤ 0.2 Ready)
- Scorecard 76점은 PoC 미실행 페널티 (인터뷰로 못 채움)
- 7월 deadline 압박 — Round 3 인터뷰 시간을 PoC·본부 협의에 투입이 더 효율
- AI Foundry 자체 철학 dogfooding — Sinclair + AI 100% 모델이 Conditional 차단 요소를 실행으로 해소

### 0.2 Conditional 조건 트래킹 (Phase 5/6 sign-off 게이트)

| ID | 조건 | 출처 | 측정 시점 | 게이트 |
|---|---|---|---|---|
| **C-1** | Pre-착수 PoC 통과 (Sinclair 개입 < 10%) | 3 LLM 일치 | 5월 W19 | F-item 등록 전 |
| **C-2** | 본부 4 안건 서면 확약 (도메인 본부 2개·core_diff 워크샵·Approver RBAC·KPI 베이스라인) | Gemini + ChatGPT | 5월 W19 | Sprint 배정 전 |
| **C-3** | AI 에이전트 자동화 범위·한계 명확화 (PRD §6.3.1 보강) | Gemini + ChatGPT | C-1 PoC 결과 후 | F-item 등록 시 |
| **C-4** | KPI 베이스라인 측정 결과 PRD 반영 (X·N 확정) | ChatGPT + Gemini | 5월 W20 | Sprint 1 시작 전 |

C-1~C-4 모두 미달 시 → 즉시 백업 인력 0.5 FTE 투입 (R-X2 강화) 또는 Round 3.

---

## 1. 요약 (Executive Summary)

**한 줄 정의**: KTDS-AXBD 4 본부(AX·공공·금융·기업)가 자기 의사결정을 자산화·진단·재사용하는 사내 통합 Agentic AI 플랫폼. **외부 고객 적용 전 자체 레퍼런스 + 사내 KPI 입증의 1순위 인스턴스**.

**배경**: KT DS는 5개 사내 repo(Foundry-X·Decode-X·Discovery-X·AXIS-DS·ax-plugin)를 보유하고 있지만, 본부 단위 통합 운영·자산 재사용 루프 부재. 외부 고객 제안 시 "KT DS 자체 운영 사례"가 결정적 신뢰 근거. AI Foundry OS는 본 5개 자산을 4 본부에 동시 적용해 **외부 GTM의 자체 입증** 제공.

**목표**: 2026년 7월 안에 AX(Platform Owner) + 공공·금융·기업(Domain Tenants 3개) 5-Layer 통합 운영, "4 본부 동시 운영 / N개 critical inconsistency / X% 자산 재사용 / Y시간 단축" 한 화면 KPI 대시보드 입증, 외부 고객 제안 자료 백본 확보. **Sinclair + AI 에이전트 100%** 구축으로 AI Foundry 자체 철학 dogfooding.

---

## 2. 문제 정의

### 2.1 As-Is

본부별 동일 4가지 문제: 머릿속 결정·추적 안됨·반복 재발생·평가 안됨. 추가로 본부 단위 통합 그림·표준·재사용 부재.

### 2.2 To-Be (7월 시점)

3 본부 동시 운영 / 4대 진단 자동 / Cross-Org 4그룹 분류 / KPI 대시보드 / 외부 GTM 자료.

### 2.3 시급성

**deadline 7월** — 마스터 플랜 v1보다 1개월 공격적. 외부 도메인 R-13 회피 효과 + Sinclair + AI 자신감.

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|---|---|---|
| AX (Platform Owner) | AX컨설팅팀 5명 + Sinclair | 도구·온톨로지·정책팩 템플릿 운영 |
| 공공 (Domain Tenant 1) | 공공사업본부 BD·심사자 | 공공조달 정책팩 + core_diff 보호 |
| 금융 (Domain Tenant 2) | 금융사업본부 SME | 여신·심사 정책팩 + core_diff 보호 |
| 기업 (Domain Tenant 3, MVP fallback) | 기업사업본부 영업 | 사업 제안 정책팩 (Phase 4 ferrying 가능) |

### 3.2 이해관계자

AXBD 임원·본부장 (높음) / KT 본부 카운터파트·Decode-X 코어·BeSir (중간) / 외부 고객 (낮음 간접).

### 3.3 사용 환경

PC 우선 (모바일 out) / 사내망+인터넷 / 비개발자(SME) + 개발자(AX) 혼합 → AXIS-DS agentic-ui 결정적.

### 3.4 사용자 여정 (User Journey)

본부별 신규 정책팩 자산화 11단계: 작성 → Decode-X svc-policy → 4대 진단 → diagnosis BC 카드 → Reviewer 결정 → Cross-Org 분류 → Guard-X 룰 → Approver 승인 → Launch-X export → Decision Log → KPI 대시보드 반영. 단계 1→11 전체 시간이 KPI "진단 시간 단축" 단위.

---

## 4. 기능 범위

### 4.1 Must Have (P0)

| # | 기능 | 매핑 |
|---|---|---|
| 1 | 5-Layer 통합 운영 | 02 §3 + 09~12 dev plan |
| 2 | Multi-Tenant 본부별 PostgreSQL schema 격리 + RBAC 5역할 + KT DS SSO | 12 dev plan §5 |
| 3 | 4대 진단 자동 실행 (Missing/Duplicate/Overspec/Inconsistency) | 11 dev plan |
| 4 | Cross-Org 4그룹 분류 + core_differentiator default-deny 코드 강제 | 12 dev plan §2.4 |
| 5 | KPI 대시보드 (한 화면) | AXIS-DS v1.2 + KPI 위젯 |
| 6 | HITL Console (Reviewer/Approver) | AXIS-DS v1.2 agentic-ui |
| 7 | Audit Log Bus (전 모듈, trace_id chain) | 09~12 공통 |
| 8 | AI 에이전트 투명성 (LLM trace + HITL escalation + "Why?" evidence chain) | §4.6.3 |

### 4.2 Should Have (P1)

Discovery-X handoff BC 카드 export / Guard-X β / Launch-X β Type 1 / `/ax:domain-init` β / **Six Hats 외부 LLM 호출 패턴 (자동화는 P2)** / CQ 5축 운영 검증.

### 4.3 Out of Scope (Phase 4 이후)

마켓플레이스 / 결제 / SLA SaaS / 다국어 / 모바일 / 실시간 스트림 GA / 외부 ID 풀 / **산업별 표준 인증 (금감원·국정원·금융권 망분리)** / AXBD 외 본부.

### 4.4 외부 연동

KT DS SSO / Cloudflare Workers + D1 / PostgreSQL / Git Enterprise / Anthropic·OpenAI·OpenRouter / AXIS-DS npm / ax-plugin / BeSir MCP (선택) / Eval Rail 시계열 (선택).

### 4.5 운영·지원 체계 (P1-1)

장애 4h response / 백업 RPO 24h·RTO 4h / LLM Tier fallback + 80%/100% 알람 / 정책팩 PR 24h 응답 / 롤백 < 30초 / Sinclair 부재 시 응급 우회 자동.

### 4.6 테스트·QA·교육 계획 (P1-2, P1-4)

- **테스트**: Unit + 5-Layer E2E + 본부별 시나리오 UAT + k6 부하 + 보안 테스트 (core_diff 100% 차단)
- **교육**: AX 60분 + 본부 SME 60분+영상 + 본부장 30분 + 임원 30분
- **AI 투명성**: trace_id chain + HITL escalation (confidence < 0.7) + "Why?" evidence chain

### 4.7 변경관리·릴리즈 (P1-3)

5 종류 변경별 RACI / 롤백 정책 (zip 교체 / blue-green) / Sinclair + AI 자동 검증.

---

## 5. 성공 기준

### 5.1 KPI (산정 방법·베이스라인 시점·목표)

| 지표 | 정의 | 베이스라인 시점 | 목표 (7월) | 측정 주기 |
|---|---|---|---|---|
| 본부 동시 운영 수 | 활성 인스턴스 + 7일 정책팩 ≥ 1건 본부 | 즉시 | **3 본부** | 일일 |
| Critical inconsistency | severity=critical 카드 (본부 누적) | C-2 후 1주 | **본부당 ≥ 5건 시연** | 진단 시 |
| 자산 재사용률 | 본부 간 common_standard 정책팩 / 전체 (POL-* 단위) | C-2 후 4주 | **≥ 30%** | 주간 |
| 진단 시간 단축 | (수기 - 자동) / 수기 (수기 베이스라인 = 본부 SME 1주 측정) | C-4 후 2주 | **≥ 50%** | 진단 1건 |
| 5-Layer E2E 성공률 | E2E 자동 테스트 통과 / 전체 | 즉시 | **≥ 80%** | PR마다 |
| HITL 평균 처리 | Reviewer 결정 - 카드 생성 평균 | 즉시 | **≤ 24h** | 일일 |
| API p95 | k6 + 운영 호출 로그 | 즉시 | **≤ 1.5초** | 주간 |
| **core_differentiator default-deny 차단율** | export 시도에서 차단 / 시도 | 시뮬레이션 | **100% (필수)** | 일일 |

### 5.2 MVP 최소 기준 (7월 deadline)

- [ ] 3 본부 동시 운영 (AX + 도메인 2)
- [ ] 핵심 KPI 3개 측정 가능 (critical inconsistency + 자산 재사용률 + 진단 시간 단축)
- [ ] Cross-Org 4그룹 분류 동작 (N=2)
- [ ] AXIS-DS v1.2 KPI 대시보드 시연
- [ ] 외부 제안 자료 1차 sign-off (5 repo 명칭 마스킹)
- [ ] **외부 자료 형태**: 영상 ≥ 5분 + 1쪽 시각화 + KPI 보고서 PDF

미달 시 → "외부 적용 연기" + 4번째 본부 Phase 4 ferrying.

### 5.3 실패/중단 조건

7월 W27까지 3 본부 중 2 본부 운영 불가 → Phase 2 Yellow/Red fallback / core_diff 차단율 < 100% → 외부 제안 중단 / R-X2 실현 (Sinclair 부재 ≥ 2주) → 백업 인력 즉시.

---

## 6. 제약 조건

### 6.1 일정

목표 7월. Phase 1 W21 (G1+G2) → Phase 2 W26 (G3) → 본 PRD MVP W29 → Phase 3 W34 (G5).

### 6.2 기술 스택

AXIS-DS v1.2 (React 19/Tailwind 4) / Foundry-X 모노리포 packages/api (Hono/Workers) + 신규 sub-app `core/{guard,launch,diagnostic,cross-org,multi-tenant}/` / Cloudflare Workers + D1 + PG + Git + Redis / 다중 LLM Tier Router + Cost Governor / Knowledge Map = 파일+Git+PG (Graph/Vector DB 미사용).

### 6.3 인력/예산 (R-X2 강화)

**1.0 FTE Sinclair + AI 에이전트** (마스터 플랜 7.3 FTE 가설 폐기).

#### 6.3.1 Pre-착수 PoC (3 Phase) — **C-1 게이트**

| Phase | 안건 | 통과 기준 | 책임 |
|---|---|---|---|
| Pre-착수 W18~W19 | Foundry-X agentic 자동화 PoC: Missing 진단 + Cross-Org + KPI 1건 | Sinclair 개입 < 10% | Sinclair |
| Phase 2 W22 | AI 산출물 PoC: 1 본부 mock data → KPI 자동 | 임원 1차 sign-off | Sinclair + AXBD 임원 |
| Phase 3 W30 | AI 운영 안정성: 24h 자동 운영 (장애·복구·rollback) | 무중단 + audit log 무결 | Sinclair |

#### 6.3.2 백업 인력 트리거

3 신호 중 하나 → 백업 0.5~1.0 FTE 즉시: Sinclair 부재 ≥ 2주 / 자동화 < 80% / 본부 합의 ≥ 2주.

### 6.4 컴플라이언스

기업비밀 II급 / core_diff default-deny 코드 강제 / audit append-only + SIEM / KT DS SSO + RBAC 5역 / PG schema 격리 / PII Guard 이중 (Layer 1 + Guard-X) / HMAC 서명 / **윤리 AI**: LLM audit + confidence < 0.7 HITL + false positive 주간 측정 + 오분류 즉시 중단 / PIPA 적용 (산업 인증 out).

---

## 7. 리스크 상세 (RACI)

### 7.1 본부별 합의 리드타임 — **C-2 게이트**

| 안건 | 본부 | 측정 방법 | 7월 deadline 영향 |
|---|---|---|---|
| 도메인 본부 2개 사전 합의 | AXBD 임원 + 본부장 | W18 회의록 sign-off | 미달 시 1주+ 지연 |
| core_diff 임계 워크샵 | 본부 SME 3명 | W22~W23 워크샵 | Cross-Org 정확도 미달 |
| Approver RBAC 권한 위임 | 본부장 + AXBD 임원 | W19 합의서 | Workflow 마비 |
| KPI 베이스라인 측정 | 본부 SME + AX | W19~W20 1주 | KPI 변수(X·N) 확정 불가 |

서면 확약 의무: 4 안건 모두 5월 W19 안. 1 안건 슬립 → deadline 재조정.

### 7.2 신규 리스크

| ID | 리스크 | 심각도/가능성 | 완화 | Owner |
|---|---|---|---|---|
| R-X1 | 본부 간 core_diff 공유 거부 (R-14 사내판) | High/Med | 12 §2.4 default-deny 코드 + 본부장 sign-off + 임계 보정 | Sinclair + 본부장 |
| R-X2 | Sinclair + AI bus factor 1 | High/High | §6.3.1 PoC + §6.3.2 백업 트리거 + audit log 투명화 | AXBD 임원 |
| R-X3 | 7월 deadline + Multi-Tenant 동시 압박 | High/Med | Phase 2 fallback + 4번째 본부 ferrying | Sinclair |
| R-X4 | KPI 베이스라인 부재 | Med/High | W19~W20 측정 의무 | 본부 SME + Sinclair |
| R-X5 | AI 산출물 임원 sign-off 신뢰 부족 | Med/Med | audit 투명화 + Sinclair 1차 검토 + AI 사용 명시 | Sinclair |
| R-X6 | AI 에이전트 자동화 한계 | High/Med | §6.3.1 Pre-착수 PoC. < 80% 시 백업 즉시 | Sinclair + AXBD 임원 |
| R-X7 | 본부 비개발자 학습 곡선 | Med/Med | §4.6.2 교육 + AXIS-DS 단순 UI + 영상 가이드 | UI/UX + AX |

---

## 8. 오픈 이슈

| # | 이슈 | 담당 | 마감 | 게이트 |
|---|---|---|---|---|
| 1 | 도메인 본부 2개 사전 합의 (공공·금융 vs 공공·기업) | Sinclair + 본부장 | **5월 W18** | C-2 |
| 2 | PostgreSQL schema 격리 인프라 결정 (RDS multi-schema vs 별도 DB) | Sinclair + 인프라 | 5월 W20 | F-item 등록 전 |
| 3 | core_diff 분류 임계 워크샵 일정 | Sinclair + 본부 SME | 6월 W22 | Cross-Org 진입 |
| 4 | Sinclair + AI 임원 결재 라인 합의 | Sinclair + AXBD 임원 | 5월 W18 | C-2 |
| 5 | 외부 자료 5 repo 명칭 마스킹 가이드 v2 | Sinclair | 6월 W26 | 외부 제안 |
| 6 | BeSir MCP Tools 통합 시점 (Phase 2 vs 3) | Sinclair + BeSir | 5월 W19 BeSir 미팅 | (Sprint 1 후) |
| 7 | KPI 베이스라인 측정 (본부 SME 1주) | 본부 SME | **5월 W19~W20** | C-4 |
| 8 | Pre-착수 PoC 검증 (Foundry-X agentic) | Sinclair | 5월 W18~W19 | C-1 |
| 9 | 본부 비개발자 교육 영상 외주 | UI/UX + 외주 | 5월 W20 | Phase 2 시작 |

---

## 9. 외부 GTM 자료 형태

| 형태 | 내용 | 활용 |
|---|---|---|
| 영상 5~10분 | 4 본부 동시 운영 + 4대 진단 + Cross-Org + KPI (5 repo 마스킹) | 외부 미팅 첫 5분 |
| 1쪽 시각화 | 3-Plane + KPI Top 4 + "1명 + AI" 차별화 | 외부 1쪽 요약 |
| KPI 보고서 PDF | 본부별 베이스라인 vs 7월 + 자산 재사용 사례 3건 + 본부장 인용 | 외부 후속 자료 |

검토 라인: AXBD 임원 sign-off + Discovery-X handoff BC 자동 마스킹 검증.

---

## 10. 검토 이력

| 라운드 | 날짜 | Scorecard | Ambiguity | 판정 |
|---|---|---|---|---|
| 초안 v1 | 2026-05-02 | 73 / 100 | 0.21 (주의) | ❌ 추가 라운드 |
| v2 | 2026-05-02 | 76 / 100 | **0.121 (Ready ≤ 0.2)** | ❌ Scorecard 미달 / Ambiguity Ready |
| **Final** | 2026-05-02 | (사용자 권한 D) | (v2 그대로) | **✅ 착수 결정** (C-1~C-4 트래킹) |

---

## 11. 다음 단계 (Phase 6 — SPEC F-item·Sprint 등록)

본 prd-final.md 확정 후 즉시:

1. **archive/ 정리** (Phase 5 완료) — prd-v1·v2 / review/round-1·2 / debate/ 모두 archive로
2. **F-item 후보 등록 가이드** — sprint-plan.md 참조 (별도 문서)
3. **C-1 PoC 실행** (5월 W18~W19) — Foundry-X agentic 자동화 능력
4. **C-2 본부 4 안건 서면 확약** (5월 W19)
5. **C-4 KPI 베이스라인 측정** (5월 W19~W20)
6. **Sprint 1 시작** — F-item 등록 후 (`/ax:sprint start` 또는 본인 컴퓨터에서)

---

*이 문서는 ax-plugin /req-interview Phase 5 prd-final.md (옵션 D 사용자 권한 착수 결정). Conditional 4 조건 트래킹은 sprint-plan.md와 연동.*
