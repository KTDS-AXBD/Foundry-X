---
title: AI Foundry Phase 1 W18 합의 회의 안건 1-Pager
subtitle: 5/4(일)~5/10(토) W18 임원·코어 합의 회의용 1쪽 결재 자료
version: v1 (2026-05-04)
owner: Sinclair Seo
audience: KTDS-AXBD 임원 + 서민원 + 모듈 코어 후보 5명
classification: 기업비밀 II급
based_on:
  - 08_build_plan_v1.md (4 결정사항 D1~D4)
  - 02_ai_foundry_phase1_v0.3.md §7.6 (H1~H6 가설)
  - SPEC.md §3 (Foundry-X Phase 46 100% literal 종결, 2026-05-04)
---

# AI Foundry Phase 1 — W18 합의 회의 안건 1-Pager

> **이 회의에서 결정해야 할 것**: (1) 4 핵심 결정사항 D1~D4 confirm, (2) 5 모듈 코어 인력 명단 sign-off, (3) H1~H6 가설 점검 결과로 Phase 2 fallback 신호(Green/Yellow/Red) 사전 결정.
>
> **결정 안 되면 무엇이 위험한가**: Phase 2(6월) 자동 1주 지연 시작 → 8월 G5(임원 종합 보고) 도미노 → 4Q Lighthouse 1호 계약 위협.

---

## 1. 4 핵심 결정사항 (Sign-Off 필요)

| # | 결정 안건 | 권고안 | 근거 | Sign-Off |
|---|----------|--------|------|----------|
| **D1** | Foundry-X 동결 — Control Plane Lead Agent | **동의** (이미 LIVE 95%+, 2026-05-04 Phase 46 100% literal 종결 달성) | services/agent 0 도달, fx-agent 81 routes, 14 세션 연속 성공(Match 95~100%), v1.9.0 마일스톤 태그 | ☐ 임원 ☐ 서민원 |
| **D2** | Guard-X·Launch-X — Phase 2 mock → Phase 3 β | **동의** (G3 통과 본질은 5-Layer E2E, 둘 다 인터페이스만) | 둘 다 To-Do, mock으로 Coordinator 끊김 회피 | ☐ 임원 |
| **D3** | Decode-X v1.3 Phase 1 + 본 Phase 2 통합 | **동의 + 일정 합의 필요** (이중 트랙 방지) | AIF-REQ-035 IN_PROGRESS, Sprint 3 말 기술 Gate(5월 말). 통합 일정 W19 안에 합의 | ☐ Decode-X 팀 ☐ Sinclair |
| **D4** | AXIS-DS agentic-ui — HITL Console·Diagnostic Card 단일 UI 표준 | **동의** (시연 UI 외주 비용 절감) | v1.1.1 stable, 디자인 토큰 동결 | ☐ UI/UX 코어 ☐ 서민원 |

---

## 2. 5 모듈 코어 인력 슬롯 (임원 직권 지정 요청)

| Layer | 책임 범위 | FTE 요구 | 후보 / 지정자 | Sign-Off |
|-------|----------|----------|--------------|----------|
| **Layer 1·2 (Data + Ontology)** | Decode-X svc-ingestion·extraction·ontology, Knowledge Map(파일+Git+PostgreSQL 전환) | 1.0 × 18주 | (지정 필요) | ☐ |
| **Layer 3 (LLM)** | Triple Extractor, Multi-Evidence Triangulation(E1·E2·E3), Tier 1~3 Router | 1.0 × 18주 | (지정 필요) | ☐ |
| **Layer 4 (Workflow + HITL)** | Foundry-X Workflow Coord, AXIS-DS HITL Console, audit log bus, Diagnostic Runner | 1.0 × 18주 | (지정 필요) | ☐ |
| **Layer 5 (Agent + Skill)** | Foundry-X Skill Runtime, ax-plugin +6 신규(diagnostic/hitl/cross-org), Guard-X·Launch-X 인터페이스 | 1.0 × 18주 | (지정 필요) | ☐ |
| **시그니처 (4대 진단 + Cross-Org)** | Decode-X Phase 2-E 흡수, 4그룹 분류, 가상 도메인 ground truth | 1.0 × 18주 | (지정 필요) | ☐ |
| **통합 PM** | RACI 모든 활동 A/R | 1.0 × 18주 | **Sinclair Seo** (확정) | ✅ |
| **시스템 책임** | 8월 데모 시나리오·β2 빌드·임원 시연 | 1.0 × 18주 | **서민원** (확정) | ☐ Sign-Off |
| **UI/UX** | AXIS-DS v1.2·v1.3 | 0.5 × 18주 | (지정 필요) | ☐ |

> **R-06 Risk** (Critical/Med): 모듈 코어 5명 지정 지연 → §RACI 실행 불가 → Prototype 품질 저하 (H5 가설 깨짐). **W18 회의에서 5명 명단 sign-off 미완료 시 Yellow 신호 사전 발동**.

---

## 3. H1~H6 가설 점검 사전 결과

| 가설 | 검증 방법 | 사전 신호 (2026-05-04) | 판정 |
|------|----------|------------------------|------|
| **H1** — 5월 4주 안에 정의서 합의 | W18 회의 일정 사전 확정 | 본 회의 W18 일정 확정 + 02 v0.3 + 08 빌드 계획 회람 완료 | 🟢 **Green** |
| **H2** — 6월 4주 안에 5-Layer Prototype | 신규 vs 재사용 비율 정확 | Foundry-X 95%+ + Decode-X 30% + AXIS-DS v1.1.1 stable + ax-plugin 24 skill — 재사용 50%+ 충족 | 🟢 **Green** (잠정) |
| **H3** — 7월 1개 실제 도메인 확정 | KT 본부 카운터파트 W18~W22 지정 | **W18 회의 안건**, 미지정 | 🟡 **Yellow** |
| **H4** — 도메인 데이터 1개월 내 접근 | NDA·내부 승인 표준 일정 | 미착수, H3 결정 후 가능 | 🟡 **Yellow** |
| **H5** — 5 모듈 코어 시간 50%+ 확보 | W18 인력 지정 시 시간 보장 | **W18 회의 안건**, 미지정 | 🟡 **Yellow** |
| **H6** — Phase 3 진입 임원 결재 | G4(7월 W29) 시점 사전 세팅 | Phase 1 시작 단계, 미세팅 | 🔵 **Blue (이른 단계)** |

### 종합 신호 (Phase 2 Prototype 범위 결정)

> **현재 Yellow 신호 우세** (H3·H4·H5 미해소). W18 회의에서 H3·H5가 Green 전환되지 않으면 Phase 2 fallback **Yellow 정책 사전 발동** (5-Layer E2E + 4대 진단 Missing+Inconsistency만 + Cross-Org mock).

---

## 4. 임원 결재 요청 사항 (3건)

| # | 요청 | 결재 시점 | 미결재 시 영향 |
|---|------|----------|---------------|
| **A1** | KT 금융사업본부 + 공공사업본부 카운터파트 직권 지정 | **W18 종료 전 (5/10)** | H3 Yellow 고착, 4Q Lighthouse 위협 |
| **A2** | 5 모듈 코어 인력 명단 sign-off + 시간 50%+ 보장 | **W18 종료 전 (5/10)** | H5 Yellow 고착, Prototype 품질 저하 |
| **A3** | Phase 2 fallback 정책 (Green/Yellow/Red) 사전 공감대 | W18 회의 당일 | 6월 중 fallback 발동 시 "범위 축소 = 실패" 오해 |

---

## 5. W18 다음 1주 액션 (Sinclair · 회의 후)

- [ ] 본 안건 + 08 빌드 계획 + 02 v0.3 정의서 → 서민원·코어 후보 5명·AXBD 임원 회람 (회의 사전 자료)
- [ ] **Decode-X v1.3 Phase 1 진행 상태 + 본 Phase 2 통합 일정 합의 초안** (Decode-X 팀과 비동기 합의 시작)
- [ ] AXIS-DS v1.2 컴포넌트 백로그 초안 (UI/UX 코어와)
- [ ] ax-plugin GOV-016~020 초안 작성 시작 (W19부터 본격, W18 골격만)
- [ ] **5월 W19 BeSir 차기 미팅** 일정 + 본 빌드 §3.5 Phase 4 트랙 사전 공유 옵션 검토
- [ ] H3·H4·H5 후속 행동 계획 (본부 컨택 → NDA → 데이터 협조 일정 트리)

---

## 6. 회의 외 사전 회람 자료 (Pre-read Pack)

| 우선순위 | 자료 | 페이지 | 대상 |
|---------|------|-------|------|
| **필수** | 08_build_plan_v1.md (본 빌드 마스터) | 全 | 임원 + 모듈 코어 + 서민원 |
| **필수** | 02_ai_foundry_phase1_v0.3.md §0~§7.6 (정의서 + Phase별 산출물) | 0.1~7.6 | 임원 + 모듈 코어 |
| **권장** | 06_architecture_alignment_with_besir_v1.md (BeSir 정합성 P0) | 全 | 모듈 코어 + 서민원 |
| **권장** | 05_executive_one_pager_v2.md/pdf | 1쪽 | 임원 (시간 부족 시 본 자료만) |
| **참고** | 07_ai_foundry_os_target_architecture.md (3-Plane + Side Rail) | 全 | Layer 4·5 코어 |

---

## 7. 회의 진행 시간표 (60분 안)

| 시간 | 안건 | 진행 |
|------|------|------|
| 0~10 분 | 본 1-Pager 공유 + Foundry-X v1.9.0 마일스톤 보고 (D1 근거) | Sinclair |
| 10~25 분 | D1~D4 4 결정사항 confirm | 서민원 + 임원 |
| 25~40 분 | 5 모듈 코어 명단 sign-off (A2 결재) | 임원 직권 |
| 40~50 분 | H1~H6 점검 → Phase 2 fallback 정책 합의 (A3 결재) | 전원 |
| 50~60 분 | A1 본부 카운터파트 결재 + W19 BeSir 미팅 사전 공유 | 임원 |

---

## 8. 결정 추적

| 결정 | 결재자 | 일시 | 비고 |
|------|--------|------|------|
| D1 Foundry-X 동결 | (회의 후 기록) | | |
| D2 Guard-X·Launch-X mock | | | |
| D3 Decode-X 통합 | | | |
| D4 AXIS-DS 단일 UI | | | |
| A1 본부 카운터파트 | | | |
| A2 5 모듈 코어 명단 | | | |
| A3 Phase 2 fallback | | | |

---

> **다음 단계**: 본 안건이 W18 회의에서 sign-off 되면, W19부터 모듈 스펙 v0.1 작성 + Decode-X 통합 일정 + BeSir 미팅 + AXIS-DS v1.2 백로그 동시 진행. G1+G2 통합 게이트(W21 5/25~31)까지 5-Layer 모듈 스펙 v1.0 + 인터페이스 카탈로그 v1.0 + 가상 도메인 1·2 사양 모두 sign-off 필요.
