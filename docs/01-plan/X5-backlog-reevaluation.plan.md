---
code: FX-PLAN-X5
title: "장기 백로그 재평가 — F112 / F117 / F118 / F245"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-11
updated: 2026-04-11
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-SPEC-PRD-V8]], docs/specs/prd-v5.md, [[FX-PLAN-S32]], [[FX-PLAN-S92]], docs/specs/AX-BD-MSA-Restructuring-Plan.md"
---

# 장기 백로그 재평가 — F112 / F117 / F118 / F245

> **Summary**: SPEC.md §5에 📋(장기 보류)로 남아 있는 4건을 PRD v5 Grand Goal ↔ PRD v8 현행 비전 ↔ 실제 진척도 기준으로 재판정해요. 분석 전용 task (X-track), 코드 변경 없음.
>
> **Project**: Foundry-X
> **Task**: FX-REQ-506 (X5, task orchestrator)
> **Author**: Sinclair Seo
> **Date**: 2026-04-11 (Sprint 255 시점)
> **Status**: Draft — 판정 결과 본 문서 승인 후 SPEC.md §5 및 §9 반영 예정

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | SPEC.md §5에 장기 📋 상태로 4건(F112/F117/F118/F245)이 남아 있는데, 등록 시점(PRD v5, 2026-03-20 전후)의 전제가 다수 변경됐어요. 특히 F245는 이미 실행 완료된 하위 F-item(F255/F256/F272/F279)으로 분해되었음에도 원 F-item은 여전히 📋로 표기되어 있어 drift 상태예요. |
| **Solution** | 각 F-item을 **3축 판정 프레임**(외부 트리거 충족도 · 내부 선결 조건 · 전략 정합성)으로 재평가하고, **KEEP / UPGRADE / DEFER / ARCHIVE / CLOSE** 5분류로 처분해요. 그 결과를 SPEC.md §5와 §9에 반영해 백로그를 정리해요. |
| **Function/UX Effect** | SPEC.md §5에 남아 있는 "장기 대기" 항목이 1~2건으로 축소되고, Phase 5 외부 파일럿 준비 상태가 명확해져요. F245 drift가 해소돼 §5와 실제 구현 이력 간 정합성이 회복돼요. |
| **Core Value** | 백로그 위생 확보 + 장기 장식물 제거 + Phase 5 진입 조건 가시화. 분석 전용 작업이라 리스크 없음. |

---

## 1. 배경

### 1.1 재평가 트리거

SPEC.md §5에서 📋(장기) 상태로 남아 있는 4건:

| F# | 제목 | 등록 시점 | 현재 상태 | 원래 버전 |
|----|------|:---------:|:--------:|:--------:|
| F112 | GitLab API 지원 (octokit+GitLab 추상화) | 2026-03-20 (PRD v5) | 📋 | v2.2+ |
| F117 | 외부 고객사 파일럿 (SR 성공 사례 기반) | 2026-03-20 (PRD v5) | 📋 | v3.0 |
| F118 | 모노리포→멀티리포 분리 검토 | 2026-03-20 (PRD v5) | 📋 | v3.0+ |
| F245 | GIVC Ontology 산업 공급망 인과 예측 PoC | 2026-03-30 (Phase 8) | 📋 | — |

등록 이후 3주 이상 경과(2026-04-11 기준)했고, 그 사이 Phase 5~32 및 Sprint 44~255 진행으로 전제 조건이 상당 부분 변경되었어요. 세션 #5.68(2026-04-09)에서 req-integrity bulk close 오류로 F117/F112/F118 Issue #125/#126/#127가 reopen되면서 "장기 항목 📋 유지" 결정이 있었지만, 각 항목의 판정 근거는 그때 정리되지 않았어요.

### 1.2 PRD 시점별 Grand Goal 매핑

| F# | PRD v5 Grand Goal | PRD v5 위치 | PRD v8 대응 |
|----|-------------------|-------------|--------------|
| F112 | **G2** GitLab API 지원 | prd-v5.md:446, 519 | 명시적 Goal 없음 (Phase 5 "외부 고객사 파일럿" 내 필요시 대응으로 흡수) |
| F117 | **G9** 고객 파일럿 준비 | prd-v5.md:525, 558 | 핵심 메시지로 격상 — `prd-v8-final.md:57, 286~301` ("내부/외부 고객 파일럿 실증", Phase 5 진행 중) |
| F118 | **G5** 모노리포→멀티리포 분리 | prd-v5.md:559 | 명시적 Goal 없음. 대신 `docs/specs/AX-BD-MSA-Restructuring-Plan.md` (FX-DSGN-MSA-001 v4, Phase 20 Sprint 179~188)이 별도 분리 추진 중 |
| F245 | — (Phase 8 BD Pipeline 신규 항목) | SPEC.md 5.41 (2026-03-30) | Phase 9 하위 F255~F272로 분해 실행 완료 |

**핵심 관찰**: PRD v8(`prd-v8-final.md`)은 Grand Goal 레이블(G1~G12)을 유지하지 않아요. G-goal 체계는 PRD v5 유산이고, v8에서는 "실증 데이터 · Adoption 로드맵 · 고객 파일럿" 내러티브에 통합됐어요. 따라서 G-goal 근거만으로 백로그를 유지하는 것은 시대 지난 레거시예요.

---

## 2. 재평가 방법론 — 3축 판정 프레임

각 F-item을 3개 축으로 점검해요:

### 2.1 Axis A — 외부 트리거 충족도

- **정의**: 등록 시점에 명시된 외부 전제가 현실에서 발생했는가?
- **출처**: `docs/01-plan/features/sprint-32.plan.md:214~223` "Layer 4 수요 기반 / 장기"의 "착수 조건" 열
- **척도**: 충족 / 부분 충족 / 미충족 / 무관(재정의 필요)

### 2.2 Axis B — 내부 선결 조건

- **정의**: 해당 F-item을 실행하려면 먼저 완료되어 있어야 하는 내부 F-item이 다 끝났는가?
- **출처**: SPEC.md §5 F-item 테이블, Sprint 32/50 Plan 문서의 의존성 섹션
- **척도**: 전부 완료 / 부분 완료 / 미완료

### 2.3 Axis C — 전략 정합성 (PRD v8 기준)

- **정의**: PRD v8 현행 비전 및 실제 진행 중인 다른 계획(MSA, BD Pipeline 등)과 상충/중복/정렬 중 어느 상태인가?
- **척도**: 정렬 / 중립 / 상충·중복

### 2.4 판정 분류

| 판정 | 조건 | 조치 |
|:----:|------|------|
| **KEEP** | 외부 트리거 미충족 + 전략 정렬 + 재평가 주기 내 | 📋 유지, 단 "재평가 대상" 태깅 |
| **UPGRADE** | 외부 트리거 충족 or 곧 충족 + 내부 선결 대부분 완료 | 📋→🔧, 착수 조건 명시, Sprint 후보로 이관 |
| **DEFER** | 외부 트리거 미충족 + 전략 중립 + 내부 선결 미완 | 📋 유지, 버전 이관(v3.0+ → v4.0+ 등), Issue 상태 OPEN 유지 |
| **ARCHIVE** | 전략 상충/중복 or rationale 소멸 | 📋→🗑️ 또는 다른 계획으로 rationale 이관, Issue close |
| **CLOSE** | 실제로는 이미 다른 F-item 묶음으로 실행 완료 (drift) | 📋→✅, 하위 F-item 참조 추가, §9 정합성 보정 로그 |

---

## 3. F-item별 판정

### 3.1 F112 — GitLab API 지원 — **DEFER**

**등록 근거**: PRD v5 G2, "고객사 GitLab 사용 확인 후" 착수 (sprint-32.plan.md:218, 446)

| 축 | 평가 | 근거 |
|----|------|------|
| A 외부 트리거 | **미충족** | 현 시점 KT DS 내부+외부 파일럿 대상 중 GitLab 강제 사용 요구 보고된 바 없음. F117 외부 파일럿이 아직 착수 전이라 트리거 발생 자체가 물리적으로 불가 |
| B 내부 선결 | **부분 완료** | octokit 기반 Git 연동(F1~F50 시점)은 완성, 플랫폼 추상화 레이어는 미착수. 기술적으로 1 Sprint 분량으로 추정 |
| C 전략 정합성 | **중립** | PRD v8은 Git 플랫폼 다양성을 전략 메시지로 두지 않음. 상충 없음 |

**판정**: **DEFER**
- 버전 이관: v2.2+ → **v3.0+ (F117 외부 파일럿 후 재평가)**
- 근거: F117이 선행 조건이고, 실제로 GitLab 요구를 제시하는 고객사가 확보되어야 의미 있는 작업이 됨. 현 시점에 투자하면 over-engineering 위험.
- 유지할 것: GitHub Issue #125 OPEN 유지 (상태: DEFER 태그 추가), SPEC.md 📋 유지
- 재평가 주기: F117 판정(아래 3.2) 결과에 연동 — F117 UPGRADE 시 F112는 재점검

### 3.2 F117 — 외부 고객사 파일럿 — **UPGRADE (조건부)**

**등록 근거**: PRD v5 G9, "KT DS SR 성공(F116) 후" (sprint-32.plan.md:219)

| 축 | 평가 | 근거 |
|----|------|------|
| A 외부 트리거 | **충족 준비 단계** | F116 KT DS SR 시나리오 구체화 ✅(Sprint 44, Match 95%, SrClassifier+SrWorkflowMapper+5 endpoints). PRD v8 `prd-v8-final.md:57` "내부/외부 고객 파일럿 실증"이 핵심 검증 메커니즘으로 격상됨. 다만 타겟 외부 고객사 1개가 아직 지명되지 않음 |
| B 내부 선결 | **대부분 완료** | F121(피드백 시스템) ✅, F122(온보딩 체크리스트) ✅, F166(외부 API 거버넌스) ✅ Sprint 47, F170(Adoption KPI 대시보드) ✅ Sprint 48, F171(IA 재설계) ✅, F172(온보딩 투어) ✅, F173(셀프 온보딩) ✅, F174(인앱 피드백) ✅ Sprint 50. Phase 5 Conditional #4(기술 준비)는 실질 해소됨 |
| C 전략 정합성 | **강한 정렬** | PRD v8의 검증 메커니즘 그 자체. Phase 5(고객 파일럿, 진행 중)의 핵심 산출물 |

**판정**: **UPGRADE → Sprint 후보로 전환**
- 버전 이관: v3.0 → **Phase 5c (구체 Sprint 번호는 별도 계획)**
- 상태 전환: 📋 → 🔧 (단, 타겟 외부 고객사 지명이라는 비즈니스 선결 조건 명시)
- 재구조화 제안:
  - **F117-a**: 타겟 외부 고객사 1개 지명 + 파일럿 스코프 정의 (비즈니스 워크, 1주)
  - **F117-b**: 파일럿 환경 구성(SSO·네트워크·보안 체크리스트 대응, PRD v8 §6.3) — 기존 F166 자산 재활용
  - **F117-c**: 2개월 파일럿 실행 + 중간 결과(2개월/4개월) 수집 (PRD v8 §8 검증 루프)
- 즉시 착수는 아니지만 "착수 조건"이 내부→비즈니스(타겟 고객사 지명)로 이전됐다는 점을 명시해야 함. SPEC.md 비고에 "F116~F174 내부 준비 완료, 외부 고객사 지명 대기"로 갱신
- GitHub Issue #126: OPEN 유지, "Ready for business trigger" 라벨 추가 제안

### 3.3 F118 — 모노리포→멀티리포 분리 검토 — **ARCHIVE**

**등록 근거**: PRD v5 G5, "고객 배포 요구 시" (sprint-32.plan.md:220, 559)

| 축 | 평가 | 근거 |
|----|------|------|
| A 외부 트리거 | **미충족 + 사실상 무관** | "고객 배포 요구"가 발생한 사례 없음. 게다가 Cloudflare Workers+Pages 기반 배포 구조상 모노리포 유지가 배포 친화적 — 멀티리포 분리 시 오히려 pipeline 복잡도 증가 |
| B 내부 선결 | **무관** | 기술 선결 아닌 비즈니스 선결 항목 |
| C 전략 정합성 | **상충·중복** | `docs/specs/AX-BD-MSA-Restructuring-Plan.md` (FX-DSGN-MSA-001 v4)이 Phase 20 Sprint 179~188에 걸쳐 **AI Foundry 플랫폼을 Discovery-X/Recon-X/Foundry-X/Gate-X/Launch-X/Eval-X로 분해**하는 상위 전략 수립 중. F118의 "모노리포→멀티리포 분리"는 이 상위 MSA 계획에 완전히 흡수됨. F118을 별도 유지하면 duplicate rationale |

**판정**: **ARCHIVE**
- 상태 전환: 📋 → 🗑️ (Archive), SPEC.md §5 비고에 "AX-BD MSA Restructuring(FX-DSGN-MSA-001) Phase 20에 흡수"로 명시
- rationale 이관: G5 "멀티리포 분리" 근거는 MSA 재구조화 계획이 대체 — F118 원 rationale은 MSA 문서의 Section 1.2에 이미 반영됨(서비스 매트릭스)
- GitHub Issue #127: **CLOSE** + 링크(FX-DSGN-MSA-001) 코멘트로 대체 설명
- §9 변경이력 추가: "5.X X5 task — F118 ARCHIVE, MSA 재구조화 계획으로 흡수"

### 3.4 F245 — GIVC Ontology 산업 공급망 인과 예측 PoC — **CLOSE (drift 보정)**

**등록 근거**: Phase 8 BD Pipeline 신규 사업 아이템 (SPEC.md 5.41, 2026-03-30)

| 축 | 평가 | 근거 |
|----|------|------|
| A 외부 트리거 | **이미 충족** | 한국기계산업진흥회 chatGIVC 고도화 제안이라는 외부 비즈니스 맥락이 존재했고, 피치덱(`docs/specs/GIVC/koami_pitch_v0.1_260327.html`)까지 작성됨 |
| B 내부 선결 | **완료** | F255(Sprint 92, PR #229) + F256(Sprint 93, PR #230) + F272(Sprint 101) + F279(Sprint 108 D1 0082) 전부 ✅ |
| C 전략 정합성 | **완료된 드리프트** | F255 (Property Graph 3-테이블 + 16 API + KG 탐색기) ✅, F256 (KgScenarioService + 핫스팟 감지 + 프리셋 3개 이벤트 연쇄 시나리오 MVP) ✅, F272 (O-G-D 독립 루프 + chatGIVC 데모, Round 0→1 CONVERGED 0.82→0.89) ✅, F279 (BD 데모 시딩 GIVC 18테이블 104 rows) ✅ |

**판정**: **CLOSE — Drift 보정**
- 상태 전환: F245 📋 → ✅
- 비고 추가: "**F255(Sprint 92)+F256(Sprint 93)+F272(Sprint 101)+F279(Sprint 108)로 분해 실행 완료**. Round 0→1 CONVERGED 0.82→0.89, chatGIVC 데모 실행 완료. 원 F245의 4대 시나리오 중 1개(이벤트 연쇄) MVP는 F256에서 실현, 나머지 3개(대체 공급처·EWS 영향·리스크맵)는 향후 수주 성공 시 본 프로젝트로 승격"
- §9 변경이력 추가: "5.X X5 task — F245 drift 보정 (📋→✅), 하위 F255/F256/F272/F279 실행 이력 반영"
- 옵션: 잔여 3개 시나리오를 신규 F-item으로 분리 등록할지 여부는 별도 판단(**본 task에서는 분리 등록하지 않음** — 외부 수주 발생 시 BD Pipeline에서 재정의하는 것이 타당)

---

## 4. 종합 권고

### 4.1 판정 결과 요약

| F# | 판정 | 상태 전환 | Issue 조치 | SPEC.md 반영 |
|----|:----:|:---------:|-----------|--------------|
| F112 | **DEFER** | 📋 유지 | **#126** OPEN + DEFER 코멘트 | 비고: "F117 선행, v3.0+ 재평가" |
| F117 | **UPGRADE** | 📋 → 🔧 | **#125** OPEN + "Ready for business trigger" 코멘트 | 비고: "내부 준비 완료(F116~F174), 외부 고객사 지명 대기. Phase 5c" |
| F118 | **ARCHIVE** | 📋 → 🗑️ | **#127 CLOSED** (not planned) + FX-DSGN-MSA-001 링크 | 비고: "AX-BD MSA Restructuring Phase 20에 흡수" |
| F245 | **CLOSE** | 📋 → ✅ | N/A (원래 Issue 없음) | 비고: "F255+F256+F272+F279 분해 실행 완료, Round CONVERGED 0.82→0.89" |

### 4.2 정리 효과

- SPEC.md §5 장기 📋 항목: **4건 → 1건 (F112만)** 축소
- F-item drift: **1건 해소 (F245)**
- Phase 5 외부 파일럿 진입 조건: **기술 준비 완료 + 비즈니스 선결(타겟 고객사 지명)만 남음**으로 가시화
- 전략 중복 제거: F118 ↔ FX-DSGN-MSA-001 중복 rationale 해소

### 4.3 위험/주의

- **F117 UPGRADE 경량화**: 판정만으로는 착수 조건 성립 안 됨. 반드시 "타겟 외부 고객사 지명"이 병행되어야 Phase 5c 실제 착수 가능. 본 task는 상태 전환까지만 수행하고 지명 자체는 비즈니스 결정 영역
- **F245 CLOSE 시 §9 기록 필수**: drift 보정은 투명하게 남겨야 나중에 정합성 점검 시 혼선 방지
- **F118 Issue close**: close 전 MSA 계획 문서 링크를 comment로 남겨 rationale 이관 경로를 명확히 할 것

---

## 5. 실행 단계 (분석 전용 task의 실행이란)

본 task는 **문서 산출물 생성 + SPEC/Issue 반영**까지가 범위예요. 코드 변경은 없어요.

- [x] Step 1: SPEC.md §5에서 4건 상태/의존성 확인
- [x] Step 2: PRD v5 G2/G5/G9 위치 확인 (`docs/specs/prd-v5.md:446, 519, 525, 558, 559`)
- [x] Step 3: PRD v8 대응 점검 (G-goal 레이블 부재, Phase 5 내러티브로 통합 확인)
- [x] Step 4: F245 drift 발견 (F255/F256/F272/F279 완료 이력)
- [x] Step 5: F118 ↔ FX-DSGN-MSA-001 중복 rationale 확인
- [x] Step 6: 3축 판정 완료 (본 문서 §3)
- [x] Step 7: 본 문서 **승인** (2026-04-11)
- [x] Step 8: SPEC.md §5 갱신 — F112(v3.0+, 📋+DEFER 비고) / F117(Phase 5c, 🔧 UPGRADE) / F118(🗑️ ARCHIVE) / F245(Sprint 92~108, ✅ CLOSE drift 보정)
- [x] Step 9: SPEC.md §9 변경이력 5.74 기록
- [x] Step 10: GitHub Issue 조치 — #125(F117) DEFER→UPGRADE 코멘트 OPEN, #126(F112) DEFER 코멘트 OPEN, #127(F118) ARCHIVE 코멘트+**CLOSED** (not planned)
- [x] Step 11: `docs/INDEX.md`에 `FX-PLAN-X5` 등록
- [x] Step 12: SPEC.md X5 task 백로그 마커 DONE 처리

Step 8~12는 **본 문서 승인 후** 별도 커밋으로 진행해요. 승인 전에는 SPEC/Issue에 손대지 않아요.

---

## 6. 참고 자료

- SPEC.md §5 — F112(L1069), F117(L1118), F118(L1119), F245(L1297)
- SPEC.md 5.68 세션 이력(2026-04-09) — F112/F117/F118 Issue reopen 기록
- `docs/specs/prd-v5.md:446, 519, 525, 558, 559` — G2/G5/G9 등록 근거
- `docs/specs/prd-v8-final.md:57, 286~301` — 외부 고객사 파일럿 핵심 메시지 격상
- `docs/01-plan/features/sprint-32.plan.md:214~223` — Layer 4 수요 기반 / 장기 분류
- `docs/01-plan/features/sprint-92.plan.md` — F255 GIVC PoC 1차 (F245 구체화)
- `docs/specs/AX-BD-MSA-Restructuring-Plan.md` — FX-DSGN-MSA-001 v4, F118 rationale 흡수처
- 피치덱: `docs/specs/GIVC/koami_pitch_v0.1_260327.html`

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|:----:|------|----------|
| 1.0 | 2026-04-11 | 초안 작성 — F112 DEFER / F117 UPGRADE / F118 ARCHIVE / F245 CLOSE 판정 |
