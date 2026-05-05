# 16. 14·15 검증 보고서 v1

**버전:** v1
**날짜:** 2026-05-04 (24h 재-fetch 시점 동일)
**작성자:** Sinclair Seo (KTDS-AXBD AX컨설팅팀, PM 겸 프로그래머)
**검증 대상:** 14_repo_status_audit_v1.md + 15_msa_implementation_plan_v1.md (둘 다 2026-05-04 작성)
**검증 방식:** ① 14·15 × prd-final.md 조항별 cross-check ② 14·15 × 09~12 dev plan(2026-05-02) 정합 cross-check ③ 5 repo 핵심 수치 24시간 재-fetch
**분류:** 기업비밀 II급
**다음 액션:** 본 16의 v1.1 patch 권고 10건을 사용자 승인 후 14·15에 반영 (또는 14_v1.1·15_v1.1 신규 파일)

---

## 0. 한 줄 결론

14·15 v1은 **구조적으로는 PRD-final + 09~12 dev plan과 정합**(sub-app 위치·contract·Sprint 매핑 모두 일치)이지만, **24시간 안에 Foundry-X가 Phase 47/Sprint 335로 진입**하면서 14의 baseline이 1건 stale가 됐고, **PRD §4.2 P1 항목 3건(Six Hats / CQ 5축 / /ax:domain-init)과 §6.4 윤리 AI 임계 정책이 14·15 어디에도 반영되지 않음**. dev plan과의 정합은 좋지만 F-item 번호 역매핑·multi-tenant/audit-bus 동등 dev plan 신규·contract 다이어그램 확장 등 **v1.1 patch 권고 10건**이 식별됨. **14·15 v1 자체는 유지하고 16을 보조 SSOT로 두면서 v1.1 patch는 W18~W19 안에 처리**가 권고.

---

## 1. 24h 드리프트 (2026-05-03 → 2026-05-04 raw)

| Repo | pushed_at | last commit | 24h 변화 | 14·15 stale 여부 |
|---|---|---|---|---|
| Foundry-X | 2026-05-04 09:54 | `58761ac0` docs: CHANGELOG [Unreleased] F584~F589 + F586 P-m 진정 충족 (S326) | **Sprint 331→335 (+4) / Phase 46→47 / S306~S326 19연속 성공 / F584~F589 6 F-item Unreleased 누적 / services/ 루트 40→26 도메인화** | **stale** — 14 §2.1·foundry_os_architecture 메모리 모두 Phase 46/Sprint 331로 표기 |
| Decode-X | 2026-05-04 09:44 | `8b56c469` docs: 세션 264 — CHANGELOG 추가 (F407 + F356-B + TD-61 + F360 4건 종결) | 세션 261→264 (+3) / **TD-61 Queue consumer fix 포함** / fxSpec FX-SPEC-002→003 통일 | stale — 14·메모리 세션 261 표기 |
| Discovery-X | 2026-03-18 04:29 | `87ead279` docs: F51 인프라 이전 (DX-REQ-021) | 변동 없음 (47→48일 무활동) | 일치 (정체 지속) |
| AXIS-Design-System | 2026-02-01 14:02 | `03089f41` chore(web) 템플릿 레지스트리 타임스탬프 갱신 | 변동 없음 (93→94일 무활동) / **PR #55 14일째 미머지** | 일치 (정체 지속) |
| ax-plugin | 2026-05-04 06:26 | `cbf184e8` feat(session-start): Phase 5d 신규 Sprint Monitor 자동 시작 | 신규 commit +1 (**Phase 5d sprint-ops Rule #1 위반 해소 + Sprint Monitor 자동화**) / Issue 동일 | stale — 메타 드리프트 해소 진행 중 |

**핵심 함의:**
- **Foundry-X Phase 47 진입**이 가장 중요. 14·15가 가정한 baseline에서 **+1 phase, +4 sprint, +6 F-item**. Decode-X TD-61 Queue consumer fix는 15 §2.3 Audit-Bus 설계와 직결.
- Discovery-X·AXIS-DS 정체는 **여전히 단일 최대 리스크** (R-X3·R-X6 강화).
- ax-plugin Phase 5d Sprint Monitor 신규는 14 §2.5 "메타 드리프트 해소" 액션을 사용자가 이미 일부 진행 중인 신호.

---

## 2. PRD-final × 14·15 정합 Cross-Check (조항별)

### 2.1 P0 8개 (PRD §4.1)

| P0 | PRD 매핑 | 14 매핑 | 15 매핑 | 정합 |
|---|---|---|---|---|
| #1 5-Layer 통합 운영 | 02 §3 + 09~12 dev plan | Foundry-X 15% (★) | core/* 5 sub-app 통합 (§2.1) | ✅ |
| #2 Multi-Tenant PG + RBAC + SSO | **12 dev plan §5** | Foundry-X 20% (★) | **core/multi-tenant/ 신규 sub-app으로 끌어올림 (§2.1.1, §2.2)** | ⚠️ PRD 매핑(12 §5)과 15 매핑(별도 sub-app) 불일치 — 15 쪽이 더 명확하나 PRD 보강 필요 |
| #3 4대 진단 자동 실행 | 11 dev plan | Decode-X 60% / Foundry-X 45% (★ Decode-X) | core/diagnostic/ + Decode-X publisher (§2.1.1) | ✅ |
| #4 Cross-Org + default-deny | 12 dev plan §2.4 | Decode-X 40% / Foundry-X 0% (★ Decode-X) | core/cross-org/ + F612 (§2.1.4) | ✅ |
| #5 KPI 대시보드 | AXIS-DS v1.2 + KPI 위젯 | AXIS-DS 20% (★) | F637 + AXIS-DS v1.2 (§3 W26) | ⚠️ **KPI 8개 산정 코드/UI 매핑 미상세** |
| #6 HITL Console | AXIS-DS v1.2 agentic-ui | AXIS-DS 55% (★) | F637 (§3 W26) | ✅ |
| #7 Audit Log Bus | 09~12 공통 | Foundry-X 25% (★) | **§2.3 audit-bus 횡단 신규** | ✅ |
| #8 AI 에이전트 투명성 | §4.6.3 | Foundry-X 50% (★) | F635 trace_id chain + F636 HMAC (§2.3) | ✅ |

**평가:** 8건 중 6건 ✅, 2건 ⚠️ (P0-2·P0-5).

### 2.2 P1 7개 (PRD §4.2) — **3건 누락 발견**

| P1 | 14·15 반영 |
|---|---|
| Discovery-X handoff BC 카드 export | ✅ 14 §2.3·15 §3 W23 (F634) |
| Guard-X β | ✅ 15 §2.1.1 core/guard/ + F605~F607 |
| Launch-X β Type 1 | ⚠️ 15 §2.1.1 core/launch/ + F620~F622 (Type 1/2 분기 미명시) |
| /ax:domain-init β | **❌ 14·15 누락** — ax-plugin 신규 5 스킬 후보에 없음 |
| Six Hats 외부 LLM 호출 패턴 (자동화 P2) | **❌ 14·15 누락** |
| CQ 5축 운영 검증 | **❌ 14·15 누락** — BeSir 정합성(02 v0.3 §4.6) 핵심인데 빠짐 |
| Discovery-X handoff BC 카드 export | (중복) |

### 2.3 KPI 8개 (PRD §5.1) — **산정 메커니즘 부재**

8개 KPI(본부 동시 운영 수 / Critical inconsistency / 자산 재사용률 / 진단 시간 단축 / 5-Layer E2E 성공률 / HITL 평균 처리 / API p95 / **core_differentiator default-deny 차단율**) 모두 **14·15에 측정 코드/UI 매핑이 1:1로 없음**. 15 §2.1.1 core/diagnostic/services/auto-trigger.ts에 "기존 DiagnosticCollector 재사용" 명시 + AXIS-DS v1.2 KPI 위젯 4종(KPI Tile/Sparkline/MetricGrid/TrendArrow) 신규 권고 — **이 둘이 8 KPI 어떤 것을 어떻게 산정하는지 표가 없음**.

### 2.4 §5.2 MVP 5 + §5.3 실패/중단 조건

- ✅ MVP 5건 모두 14·15에 부분 매핑
- ⚠️ §5.3 "core_diff 차단율 < 100% → 외부 제안 중단"은 15 §2.1.1 core/cross-org/services/default-deny-policy.ts에 매핑되나 **차단율 측정 코드 부재**

### 2.5 §6.2 기술 스택 + §6.3 인력

- ✅ "신규 sub-app `core/{guard,launch,diagnostic,cross-org,multi-tenant}/`" — 15 §2.1.1과 정확 일치
- ✅ "Cloudflare Workers + D1 + PG + Git + Redis" — 15 §2.2 PG 옵션 A 일치, **단 Redis 미반영**
- ✅ 1.0 FTE Sinclair + AI 100% — 14·15 일치

### 2.6 §6.4 컴플라이언스 — **윤리 AI 임계 정책 누락**

- ✅ "기업비밀 II급 / core_diff default-deny / audit append-only + SIEM / KT DS SSO + RBAC 5역" — 15 §2.2~2.3 일치
- ⚠️ "**윤리 AI: LLM audit + confidence < 0.7 HITL + false positive 주간 측정 + 오분류 즉시 중단**" — **14·15 미반영**, AuditEventSchema에 confidence·FP 컬럼 부재, HITL escalation 룰 부재
- ⚠️ "PIPA 적용 (산업 인증 out)" — 14·15 미반영
- ✅ "PII Guard 이중 (Layer 1 + Guard-X)" — 09 dev plan §1.2와 일치

### 2.7 §7 리스크 + §8 오픈이슈

| | PRD | 14 | 15 |
|---|---|---|---|
| §7.1 본부 4 안건 | 4건 (도메인 2/core_diff 워크샵/Approver RBAC/KPI 베이스라인) | §6 R-X3 / §5.2 액션 #5 | §3 W19·W23, §7 Conditional |
| §7.2 신규 리스크 7건 (R-X1~R-X7) | 7건 | §6에 R-X1·R-X3·R-X6 인용 + R-X8·R-X9·R-X10 신규 | §6에 R-X1~R-X7 모두 + R-X8·R-X9·R-X10 신규 |
| §8 오픈이슈 9건 | 9건 | §5 액션 15건에 8건 매핑 | §9 액션 7건에 6건 매핑 |

**누락:**
- 오픈이슈 **#5 외부 자료 마스킹 가이드 v2 (W26)** — 14·15 모두 미반영
- 오픈이슈 **#6 BeSir MCP Tools 통합 시점 (W19 BeSir 미팅)** — 15 §3 W19에 미명시
- 오픈이슈 **#9 본부 비개발자 교육 영상 외주 (W20)** — 14·15 모두 미반영

### 2.8 §0.2 Conditional 4건

✅ 14·15 모두 C-1~C-4 트래킹 일치.

---

## 3. 09~12 Dev Plan × 15 정합 Cross-Check

### 3.1 매트릭스 (3 dev plan × 6 항목, Guard-X는 §3.2에서 별도)

| 항목 | 10 Launch-X | 11 Diagnostic | 12 Cross-Org |
|---|---|---|---|
| Sub-app 위치 (`core/{name}/`) | ✅ LX-S01 명시 | ✅ DG-S01 명시 | ✅ CO-S01 명시 |
| F-item 매핑 | F620 ↔ LX-S01·S02 / F621 ↔ S04·S05·I02·I06 / F622 ↔ S08·I03·I07·O06 (1:N, **dev plan에 F-item 번호 미표기**) | F615 ↔ DG-S01·S02 / F616 ↔ I05 / F617 ↔ S05·S06·S10·S11·I02·I06 / F618 ↔ S12·I12·O04 | F610 ↔ CO-S01·S02 / F611 ↔ S04·S05·S06 / F612 ↔ S07·S11·I07·I08 / F613 ↔ O02 |
| Contract 의존 | 부분 일치 + 확장. **15 §2.1.2가 빈약**: dev plan은 Guard-X / Skill Registry / Skill Runtime / Object Store / Audit Bus / Eval Rail 7+개 의존 | 부분 일치 + 확장. dev plan은 Workflow Coord(I01) / LLMSemanticChecker(I02) / Discovery-X BC(I07) / Guard-X(I09) 등 7+개 의존 | 부분 일치 + 확장. dev plan은 Launch-X(I07) / **Cross-Org ↔ Diagnostic 양방향 hook(I08)** / AXIS-DS Cross-Org Card(I05) / Discovery-X BC(I06) 등 6+개 의존 |
| Sprint 정합 | dev plan W주차 미표기. 15 §3 launch=W24~W27. **잠재 충돌 없음** but LX-O05 BeSir MCP Tools(W19 미팅)는 15 §3 W19에 미반영 | dev plan W주차 미표기. 15 §3 diagnostic=W22~W25. **잠재 충돌**: DG-I05 Decode-X 2-E 흡수가 XL인데 빡빡 | dev plan W주차 미표기. 15 §3 cross-org=W22~W24. CO-S12 라이선스 초안(W19~W21)이 15 §3에 미반영 |
| 15 누락 핵심 결정 | **L1~L4 4 결정** (Type 1/2 분리, mock 범위, Skill Registry 차용, MCP Tools 후순위) — type1_static vs type2_runtime 분기 15에 부재 | **DG1~DG5 5 결정** (Policy Triple, 결정적 vs LLM 분리, Multi-Evidence 의무, severity YAML, 2-E 흡수). **Multi-Evidence E1·E2·E3 0.4/0.4/0.2 가중치 + Lifecycle 7 상태 머신 + SAT solver(Z3) + Mann-Whitney/chi-square** 모두 15 미반영 | **CO1~CO5 5 결정** (R-14 회피, default-deny 강제, 합성 데이터, HITL 의무, 라이선스 초안). **5단계 보호 매트릭스 + 4그룹 임계 룰 + 자산 가치 누적 곡선 + 단일 조직 모드** 모두 15에 미흡수 |
| 15에는 있으나 dev plan에 없음 | **multi-tenant Tenant contract** (Solo·Integration 단계 tenant_id 부재) / **Audit-Bus AuditEventSchema** 준수 명시 부재 | **multi-tenant Tenant contract** 부재 / **Audit-Bus AuditEventSchema** 미언급 / **trace_id chain 5종 규칙** 부재 | **multi-tenant Tenant contract** 부재 / **PG schema 격리 + RLS** 미설계 / **Audit-Bus 표준 schema** 미준수 |

### 3.2 09 Guard-X dev plan vs 15 (별도)

- ✅ Sub-app 위치·types.ts contract·Hono mount 패턴 모두 15와 일치
- ✅ Audit Log Bus 어댑터(GX-S04) 15 §2.3 정합
- ✅ Multi-Tenant Guard(GX-O04) 15 core/multi-tenant 통합과 일치
- ⚠️ **G1~G4 4 결정** (mock=echo, 동기 차단형 X, Policy Check 두 갈래, Hono sub-app) — 15 미반영
- ⚠️ **HMAC 서명(GX-S03) + Sensitivity Matrix(public/internal/confidential/restricted)** — 15에 부분만 (HMAC은 §2.3.5에 audit 측만)
- ⚠️ F605~F607이 GX-S/I/O 22 task에 1:N 매핑인데 dev plan에 F-item 번호 부재

### 3.3 핵심 발견 5건 (dev plan cross-check)

1. **F-item 번호 dev plan 미표기** — 09~12 v1(2026-05-02) 시점에 F-item 체계 미존재. 15(2026-05-04) 신설 후 역매핑 필수.
2. **Multi-Tenant 횡단이 dev plan 4건 모두에 빠짐** — 15가 1순위 sub-app으로 끌어올림. dev plan 부재 정합.
3. **Audit Bus event schema 표준 불일치** — dev plan은 `EVENT name { ... }` 형식, 15는 zod AuditEventSchema 14필드.
4. **15 §2.1.2 contract 화살표 빈약** — 실제 dev plan은 7+개 의존인데 15는 6개만 표기.
5. **Cross-Org ↔ Diagnostic 양방향 hook(CO-I08)이 핵심인데 15에 미반영** — DG-O03이 받는 양방향 contract.

---

## 4. 종합 누락/충돌/모순 표

### 4.1 PRD 측 누락 (14·15가 PRD 명시를 못 잡은 것)

| # | 누락 | 출처 | 권고 |
|---|---|---|---|
| L1 | P1 /ax:domain-init β | PRD §4.2 | ax-plugin 신규 5 스킬에 추가 |
| L2 | P1 Six Hats 외부 LLM 호출 패턴 | PRD §4.2 | 15 §2.1.1 core/agent/ 또는 신규 sub-app 추가 검토 |
| L3 | P1 CQ 5축 운영 검증 | PRD §4.2 + 02 v0.3 §4.6 | core/diagnostic 또는 신규 core/cq/ 검토 |
| L4 | KPI 8개 산정 코드/UI 매핑 표 | PRD §5.1 | 15 §2.1.1 core/diagnostic + AXIS-DS v1.2 위젯 4종 1:1 매핑 |
| L5 | core_diff 차단율 측정 코드 | PRD §5.3 | core/cross-org/services/default-deny-policy.ts에 metric emit |
| L6 | Redis 의존 명시 | PRD §6.2 | 15 §2.2 또는 §1.5 |
| L7 | 윤리 AI 임계 (confidence<0.7 HITL + FP 주간 + 오분류 즉시 중단) | PRD §6.4 | AuditEventSchema confidence/FP 컬럼 + HITL escalation 룰 |
| L8 | PIPA 적용 명시 | PRD §6.4 | 15 §6 또는 §1 |
| L9 | 오픈이슈 #5 외부 마스킹 가이드 v2 (W26) | PRD §8 | 15 §3 W26에 액션 추가 |
| L10 | 오픈이슈 #6 BeSir MCP Tools 통합 시점 (W19) | PRD §8 | 15 §3 W19에 BeSir 미팅 명시 |
| L11 | 오픈이슈 #9 본부 비개발자 교육 영상 외주 (W20) | PRD §8 | 15 §3 W20에 액션 추가 |

### 4.2 Dev Plan 측 누락 (09~12에 있지만 15에 안 들어간 것)

| # | 누락 | 출처 | 권고 |
|---|---|---|---|
| D1 | Launch-X type1_static vs type2_runtime 분기 | 10 dev plan L1·L2 | 15 §2.1.1 launch types.ts 보강, F623 신설 |
| D2 | Diagnostic Multi-Evidence E1·E2·E3 0.4/0.4/0.2 가중치 + Lifecycle 7 상태 + SAT solver(Z3) + 통계 검정 | 11 dev plan DG3·DG4·S05~S11 | 15 §2.1.1 diagnostic services 분해, F619 신설 |
| D3 | Cross-Org 5단계 보호 매트릭스 + 4그룹 임계 룰(commonality/variance/documentation_rate/business_impact) + 자산 가치 누적 곡선 + 단일 조직 모드 | 12 dev plan CO §2.5·O01·O06 | 15 §2.1.1 cross-org services 보강, F614 신설 |
| D4 | Guard-X HMAC 서명 + Sensitivity Matrix (public/internal/confidential/restricted) + ApprovalManager 24h SLA | 09 dev plan GX-S03·S06·O02 | 15 §2.1.1 guard 보강 |
| D5 | Cross-Org ↔ Diagnostic 양방향 hook (CO-I08 / DG-O03) | 12 + 11 | 15 §2.1.2 contract 다이어그램에 양방향 화살표 추가 |
| D6 | Discovery-X diagnosis BC 차단 카드 생성 (GX-I04, CO-I06, DG-I07) | 09·11·12 공통 | 15 §3 W23~W24 액션에 명시 |

### 4.3 신규 dev plan 필요 (15가 끌어올렸으나 sub-app dev plan 없는 것)

| # | 신규 dev plan | 우선 |
|---|---|---|
| N1 | **17_dev_plan_multi_tenant_v1.md** — F600~F604 5건 WBS 분해, KT DS SSO 어댑터·RBAC 5역할·PG schema·RLS 정책·tenant-resolver | ★★★ (1순위 sub-app) |
| N2 | **18_dev_plan_audit_bus_v1.md** — F630~F636 7건 WBS 분해, Cloudflare Queue 셋업·AuditEventSchema·trace_id chain 5종 규칙·HMAC·Decode-X·Discovery-X publisher 어댑터 | ★★★ (횡단 SSOT) |

### 4.4 24h 드리프트로 인한 stale (3건)

| # | stale | 영향 |
|---|---|---|
| S1 | Foundry-X Phase 46→47 / Sprint 331→335 / F584~F589 6 F-item Unreleased | 14 §2.1·foundry_os_architecture 메모리 갱신 + 15 §3 W18 baseline 보정 |
| S2 | Decode-X 세션 261→264 (TD-61 Queue consumer fix 등 4건 종결) | 14 §2.2 stale 1건 — TD-61은 15 §2.3 Audit-Bus 설계와 직결 |
| S3 | ax-plugin Phase 5d Sprint Monitor 자동 시작 신규 | 14 §2.5 메타 드리프트 해소 액션이 일부 진행 중 — 14 §5.1 액션 #3 일부 완료 |

---

## 5. v1.1 Patch 권고 (10건, 우선순위 정렬)

| # | Patch | 영향 문서 | 우선순위 | 노력 |
|---|---|---|---|---|
| P1 | **PRD §4.2 P1 누락 3건(L1·L2·L3) 14·15에 inject** + ax-plugin 신규 5 스킬에 /ax:domain-init 추가 | 14·15·ax-plugin | ★★★ | S |
| P2 | **PRD §6.4 윤리 AI 임계(L7) 15 §2.3 AuditEventSchema 확장** — confidence/FP/오분류 컬럼 + HITL escalation 룰 | 15 | ★★★ | M |
| P3 | **24h 드리프트 3건(S1·S2·S3) 14·메모리 갱신** | 14·foundry_os_architecture·project_agentic_ai_platform | ★★★ | S |
| P4 | **15 §2.1.2 contract 다이어그램 v1.1 확장** — launch/diagnostic/cross-org 7+개 의존 + cross-org ↔ diagnostic 양방향(D5) | 15 | ★★ | S |
| P5 | **dev plan 09~12 v1.1 헤더에 F-item 매핑표 추가** + W주차 컬럼 | 09·10·11·12 | ★★ | M (4건) |
| P6 | **17_dev_plan_multi_tenant_v1.md 신규** (N1) — F600~F604 WBS | 신규 17 | ★★★ | L |
| P7 | **18_dev_plan_audit_bus_v1.md 신규** (N2) — F630~F636 WBS | 신규 18 | ★★★ | L |
| P8 | **KPI 8개 × 측정 코드 × UI 위젯 1:1 매핑 표** (L4·L5) | 15 §2.1.1 + AXIS-DS | ★★ | M |
| P9 | **PRD §8 누락 오픈이슈 3건(L9·L10·L11) 15 §3 액션 inject** | 15 §3 | ★★ | S |
| P10 | **F-item 신설 3건(F614·F619·F623) + Dev plan 누락 D1~D4 15 §2.1.1 services 분해 보강** | 15 | ★★ | M |

**총 노력 추정:** S 4건 + M 4건 + L 2건 ≈ 1.5주 풀타임 (Sinclair + AI). W18~W19 안에 P1·P2·P3·P4·P9 처리 → W20에 P5·P8·P10 → W21까지 P6·P7 신규 dev plan 완성 일정 가능.

---

## 6. 결론 및 권고

### 6.1 14·15 v1 자체는 그대로 유지 가능?

**YES.** 14·15 v1은 **구조적 정합 + Critical path 12주 매핑**의 SSOT로서 그대로 유지하고, 본 16이 보조 SSOT(검증·patch·v1.1 권고)로 동작.

### 6.2 v1.1로 patch 해야 하는가?

**WEAK YES.** P1~P3는 W18 안에 처리 권고 (Phase 47 진입 stale + 윤리 AI 임계 누락이 거버넌스 영향). P4~P10은 W19~W21에 분산 처리.

### 6.3 신규 dev plan 2건 (multi-tenant + audit-bus) 작성 시점

W19 Conditional C-2(본부 4 안건 서면 확약) 통과와 동시에 17·18 작성 시작. 09~12와 동등 수준 dev plan 형식. F-item 5건+8건 WBS 분해.

### 6.4 다음 단계 (권고)

1. **본 16 사용자 승인** → P1·P2·P3 즉시 (W18 안)
2. **14_v1.1 + 15_v1.1 신규 작성 vs 14·15 in-place patch** 결정
3. **17_dev_plan_multi_tenant_v1 + 18_dev_plan_audit_bus_v1 작성** (W19~W21)
4. **09~12 v1.1 헤더 patch** (F-item 매핑 + W주차 컬럼) — 별도 PR로 일괄
5. **메모리 보정** (foundry_os_architecture v3로 Phase 47/Sprint 335 반영)

---

*본 16 문서는 14·15 v1의 검증 라운드 결과. v1.1 patch 적용 후 본 16도 v2로 갱신 (또는 archive). 24h 드리프트 검증은 매 Sprint 시작 전 반복 권고 (14·15 baseline 유지 정책).*
