# AI Foundry OS Sprint Plan

**날짜:** 2026-05-02
**기반:** prd-final.md + 08_build_plan_v1.md + 09~12 dev plan
**대상 SPEC:** Foundry-X 모노리포 (또는 별도 ai-foundry-os repo)
**Phase 6 — SPEC F-item·Sprint 등록 가이드**

---

## 0. F-item 등록 위치 결정

본 PRD는 **Foundry-X 모노리포 packages/api 안에 sub-app으로 들어가는 패턴** (09~12 dev plan §0.4 결정).

| 옵션 | 위치 | 권장 |
|---|---|---|
| A | Foundry-X SPEC.md에 F-item 추가 | ✅ **(Recommended)** Foundry-X 운영팀이 본 sub-app도 같은 Sprint 사이클로 관리 |
| B | 신규 ai-foundry-os repo + 별도 SPEC.md | ❌ 5 repo 외부 노출 + Multi-Tenant 인프라 격리 어려움 |
| C | 사용자 개인 repo + private SPEC | ❌ Bus factor 1 R-X2 악화 |

→ **옵션 A** — Foundry-X SPEC.md 확장.

---

## 1. F-item 후보 (총 14건)

마지막 F번호 확인 (메모리 기준 Foundry-X Sprint 319) → 다음 F번호는 **F263+** (07 문서 기준 추정).

### 1.1 P0 Must Have (8건) — Sprint 1~3 내 완료 의무

| F-item | REQ 코드 | 제목 | 매핑 |
|---|---|---|---|
| **F263** | AIF-REQ-260 | Multi-Tenant 본부별 PostgreSQL schema 격리 + RBAC 5역 + KT DS SSO | 12 dev plan §5 |
| **F264** | AIF-REQ-261 | Audit Log Bus 신설 (전 모듈 trace_id chain) + HMAC 서명 | 09 §5.1·§7.1 |
| **F265** | AIF-REQ-262 | Guard-X Solo 단계 — `core/guard/` sub-app + types.ts + Policy Check stub + ULID+HMAC | 09 dev plan §7.1 (GX-S01~S09) |
| **F266** | AIF-REQ-263 | Launch-X Solo 단계 — `core/launch/` sub-app + Type 1/2 stub | 10 dev plan §7.1 |
| **F267** | AIF-REQ-264 | 4대 진단 알고리즘 PoC — `core/diagnostic/` + Missing·Duplicate 결정적 + 가상 데이터 | 11 dev plan §7.1 (DG-S01~S07) |
| **F268** | AIF-REQ-265 | Cross-Org 분류 PoC — `core/cross-org/` + 가상 3 본부 + default-deny | 12 dev plan §7.1 (CO-S01~S07) |
| **F269** | AIF-REQ-266 | AXIS-DS v1.2 — HITL Console + Diagnostic Card + KPI 위젯 | 08 §2.4 + AXIS-DS 코어 |
| **F270** | AIF-REQ-267 | AI 에이전트 투명성 — LLM trace + HITL escalation (confidence < 0.7) + "Why?" evidence chain | PRD §4.6.3 |

### 1.2 P1 Should Have (5건) — Sprint 4~5

| F-item | REQ 코드 | 제목 | 매핑 |
|---|---|---|---|
| F271 | AIF-REQ-268 | Guard-X Integration — Workflow hook + 룰셋 v1.0 + diagnosis BC 연결 | 09 §7.2 (GX-I01~I04) |
| F272 | AIF-REQ-269 | Launch-X Integration — Skill Registry + Object Store + Type 1/2 E2E | 10 §7.2 |
| F273 | AIF-REQ-270 | 4대 진단 Integration — Multi-Evidence E1/E2/E3 + Decode-X Phase 2-E 흡수 | 11 §7.2 (DG-I04·I05) |
| F274 | AIF-REQ-271 | Cross-Org Integration — LLM 임베딩 + Expert HITL + Launch-X 차단 신호 | 12 §7.2 (CO-I01·I04·I07) |
| F275 | AIF-REQ-272 | KPI 대시보드 통합 — 4 본부 동시 운영 metric collector + 한 화면 시각화 | PRD §4.1 #5 |

### 1.3 운영·교육·문서 (1건)

| F-item | REQ 코드 | 제목 | 매핑 |
|---|---|---|---|
| F276 | AIF-REQ-273 | 운영·QA·교육 패키지 — 운영 SOP + 본부별 시나리오 UAT + 4 그룹 교육 자료 + 변경관리 룰 | PRD §4.5·§4.6·§4.7 |

---

## 2. Sprint 배정 (예상 5 Sprint)

7월 deadline 압축, Sinclair + AI 100% 자신감 반영. Foundry-X Sprint 사이클 기준 (1 Sprint ≈ 1주).

### Sprint 1 (5월 W19) — Pre-착수 + Foundation

**진입 조건**: C-1 PoC 통과 (Sinclair 개입 < 10%), C-2 본부 4 안건 서면 확약, C-4 KPI 베이스라인 측정 시작.

| F-item | 작업 |
|---|---|
| F263 | Multi-Tenant scaffold (PG schema 분리 결정 + RBAC 골격) |
| F264 | Audit Log Bus 신설 + trace_id 표준 + HMAC 키 관리 |
| F265 (Solo 부분) | Guard-X scaffold + types.ts |
| F266 (Solo 부분) | Launch-X scaffold + types.ts |

**산출물**: Foundation 4 sub-app + types.ts contract 동결 + audit log E2E 1건

### Sprint 2 (5월 W20~6월 W22) — Solo 단계 완료 + α1

| F-item | 작업 |
|---|---|
| F265 (Solo 완료) | Guard-X 단위 테스트 + RuleEngine 골격 |
| F266 (Solo 완료) | Launch-X manifest + Decision Logger |
| F267 | 4대 진단 — Missing·Duplicate 결정적 PoC + 가상 데이터 |
| F268 | Cross-Org — 가상 3 본부 + default-deny 골격 |
| F269 (1차) | AXIS-DS v1.2-rc1 — HITL Card + Diagnostic Card |
| α1 마일스톤 | Layer 1+2 통합 + 가상 도메인 1 입력 → 9-Type |

### Sprint 3 (6월 W23~W24) — α2 + α3 + Integration 시작

| F-item | 작업 |
|---|---|
| F271 | Guard-X Integration — Workflow hook |
| F273 | 4대 진단 — Multi-Evidence + Decode-X Phase 2-E 흡수 |
| F270 | AI 투명성 — LLM trace + HITL escalation |
| α2~α3 마일스톤 | Layer 3 Triple + Layer 4 HITL Console 동작 |

### Sprint 4 (6월 W25~7월 W27) — α4 + Integration 마무리 + MVP 도달

| F-item | 작업 |
|---|---|
| F272 | Launch-X — Skill Registry + Type 1/2 E2E |
| F274 | Cross-Org Integration — LLM 임베딩 + Expert HITL + Launch-X 차단 신호 |
| F275 | KPI 대시보드 통합 (한 화면) |
| F269 (1.2 완성) | AXIS-DS v1.2 정식 + 본부 SME 첫 dry-run |
| **MVP 게이트** (W27) | 3 본부 동시 운영 + KPI 3개 측정 + Cross-Org 분류 + 외부 자료 1차 |

### Sprint 5 (7월 W28~W29) — 외부 GTM 자료 + Phase 5 마감

| F-item | 작업 |
|---|---|
| F276 | 운영·QA·교육 패키지 (SOP + UAT + 영상 + 변경관리) |
| 외부 GTM | 영상 5~10분 + 1쪽 시각화 + KPI PDF (5 repo 마스킹) |
| **PRD 본 deadline (W29)** | 외부 제안 드라이런 + 임원 sign-off |

### Sprint 6+ (Phase 3 8월) — 마스터 플랜 v1 G5 합류

이후는 마스터 플랜 v1 §3.4 그대로 — Phase 3 도메인 인스턴스화 (8월 W30~W34).

---

## 3. 의존성 그래프

```
F263 Multi-Tenant ──┬─► F265 Guard-X ──┬─► F271 Guard-X Int
                    ├─► F266 Launch-X ─┬─► F272 Launch-X Int
F264 Audit Log Bus ─┤                  │
                    │                  │
                    ├─► F267 4대 진단 ──► F273 진단 Int (E1/E2/E3)
                    └─► F268 Cross-Org ─► F274 Cross-Org Int
                                        │  (LX 차단 신호 연결)
F269 AXIS-DS v1.2 ──────────────────────┴─► F275 KPI 대시보드
                                            │
F270 AI 투명성 (병렬) ──────────────────────┴─► MVP 게이트 W27
                                            │
                                            └─► F276 운영·교육
```

---

## 4. RACI

| 활동 | Sinclair | AI 에이전트 | AXBD 임원 | 본부 SME | UI/UX | 인프라 |
|---|---|---|---|---|---|---|
| F263 Multi-Tenant 설계 | A/R | C | I | I | I | C |
| F264 Audit Log Bus | A/R | R | I | I | I | C |
| F265~F268 Solo 단계 | A/R | R | I | I | I | I |
| F269 AXIS-DS v1.2 | A | C | I | I | R | I |
| F271~F274 Integration | A/R | R | I | C | C | C |
| F275 KPI 대시보드 | A/R | R | I | C | R | I |
| F270 AI 투명성 | A/R | R | I | I | I | I |
| F276 운영·교육 | A/R | C | I | R | R | C |
| C-1 PoC | A/R | (대상) | C | I | I | I |
| C-2 서면 확약 | R | I | A | A | I | I |
| C-4 KPI 베이스라인 | C | I | I | A/R | I | I |

---

## 5. 등록 명령 (사용자 본인 컴퓨터)

ax-plugin `/ax:req-manage` + `/ax:sprint` 사용:

```bash
# 1. 사내 Foundry-X 모노리포로 이동
cd ~/path/to/Foundry-X

# 2. 본 prd-final.md 사본을 docs/prds/ai-foundry-os/에 저장
mkdir -p docs/prds/ai-foundry-os
cp ~/path/to/workspace/ai-foundry-os/prd-final.md docs/prds/ai-foundry-os/

# 3. SPEC.md F-item 14건 등록 (수동 또는 ax-plugin 활용)
# ax-plugin 사용 시:
# /ax:req-manage new --reqs "AIF-REQ-260,AIF-REQ-261,...,AIF-REQ-273" --prd docs/prds/ai-foundry-os/prd-final.md

# 4. SPEC.md §5 (F-items)에 F263~F276 추가 + Sprint 91~95 (예시 번호) 매핑
# 4.1. 등록 후 즉시 commit + push (S149 교훈 — WT 생성 전 필수)
git add SPEC.md docs/prds/ai-foundry-os/
git commit -m "feat(spec): AIF-REQ-260~273 등록 (ai-foundry-os PRD final)"
git push origin main

# 5. Sprint 1 시작
/ax:sprint start --sprint 91 --reqs AIF-REQ-260,AIF-REQ-261,AIF-REQ-262,AIF-REQ-263

# 6. C-1 PoC 실행 (Pre-착수)
# Foundry-X agentic 자동화 능력 PoC 시나리오 작성 + 측정
```

---

## 6. Conditional 4 조건 트래킹 (Sprint별)

| 게이트 | 조건 | Sprint | 측정 방법 |
|---|---|---|---|
| **C-1** Pre-착수 PoC | Sinclair 개입 < 10% | Sprint 1 진입 전 | git log + audit log |
| **C-2** 본부 4 안건 서면 확약 | 도메인 본부 2개 + core_diff 워크샵 + Approver RBAC + KPI 베이스라인 | Sprint 1 진입 전 | 회의록 + sign-off |
| **C-3** AI 자동화 범위·한계 PRD 보강 | C-1 결과 반영해 prd-final.md §6.3.1 갱신 | Sprint 2 시작 전 | PRD diff |
| **C-4** KPI 베이스라인 측정 결과 | X·N 변수 확정 (PRD §5.1) | Sprint 2 시작 전 | 본부 SME 측정 데이터 |

게이트 미달 시 Sprint 시작 X. 백업 인력 0.5 FTE 즉시 (R-X2 강화).

---

## 7. 외부 노출 가이드

본 sprint-plan.md는 **사내 코어팀 + AXBD 임원 + Foundry-X 운영팀**까지만 회람. 외부 회람 시 5 repo 명칭 마스킹 (08 §10.2 변환표).

---

*이 문서는 ax-plugin /req-interview Phase 6 가이드 (옵션 A — Foundry-X SPEC.md 확장). 실제 등록은 사용자 본인 컴퓨터에서.*
