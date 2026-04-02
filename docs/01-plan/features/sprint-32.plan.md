---
code: FX-PLAN-032
title: "Sprint 32 — PRD v5 잔여 작업 점검 + Phase 4→5 전환"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# Sprint 32 Planning Document

> **Summary**: PRD v5 통합플랫폼 잔여 작업 점검 + Phase 4→5 전환 로드맵 수립
>
> **Project**: Foundry-X
> **Version**: cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-22
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 31에서 Phase 4 Conditional Go를 획득했으나, PRD v5의 전체 기능 범위 대비 잔여/미완료 항목의 명확한 현황 파악이 되어 있지 않다. Phase 5 착수 시점과 순서가 불분명한 상태이다. |
| **Solution** | PRD v5 ↔ 구현 완전성을 체계적으로 점검(G1~G12 갭, Phase 3~4 전 F-item)하고, Phase 5 착수 로드맵을 온보딩 4주 데이터 수집 기간과 연동하여 수립한다. |
| **Function/UX Effect** | 프로젝트의 현재 위치와 남은 경로가 명확해지며, Phase 5 착수 시 불필요한 탐색 시간 없이 바로 구현에 착수할 수 있다. |
| **Core Value** | Phase 4 Conditional Go 이후 "무엇을 해야 하는가"의 불확실성을 제거하고, 온보딩 대기 기간을 생산적으로 활용할 수 있는 로드맵을 확보한다. |

---

## 1. Overview

### 1.1 Purpose

Sprint 31에서 Phase 4 Conditional Go 판정을 획득했다. 기술적으로는 100% 완료 상태이며, 남은 조건은 "내부 5명 실제 온보딩 → 4주 데이터 수집 → 최종 Go/Pivot/Kill 판정"이다.

이 Sprint의 목적:
1. **PRD v5 완전성 점검** — Gap 항목 12건(G1~G12) + Phase 3~4 전체 F-item의 구현 완료 검증
2. **Phase 5 로드맵** — Agent Evolution Track A/B + KT DS SR 시나리오의 실행 순서와 착수 조건을 문서화
3. **온보딩 추적 계획** — 4주 데이터 수집 항목, 측정 방법, 판정 기준을 구체화

### 1.2 Background

- **PRD**: v5 (2026-03-20) — 통합 플랫폼 비전, Phase 3~5 + Agent Evolution
- **현재 상태**: Sprint 31 완료, 111 endpoints, 583 API tests, D1 33 tables
- **Phase 4 판정**: Conditional Go — 기술 완료, 온보딩 데이터 대기
- **Agent Evolution PRD**: Final (2026-03-22) — Six Hats 20턴 토론 완료, Track A/B 분리

### 1.3 Related Documents

- PRD: `docs/specs/prd-v5.md` (v5: 통합 플랫폼 비전)
- Agent Evolution PRD: `docs/specs/agent-evolution/prd-final.md`
- Track B Plan: `docs/01-plan/features/track-b-dev-tools.plan.md`
- Sprint 30 Go 판정: `docs/03-analysis/sprint-30.analysis.md` (Phase 4 Conditional Go 근거)
- 온보딩 킥오프: Sprint 31 F132 결과물

---

## 2. Scope

### 2.1 In Scope

- [x] **F156**: PRD v5 ↔ 구현 완전성 점검 — G1~G12 갭 + Phase 3~4 F-item 완료 검증 + Phase 5 미착수 항목 분류
- [ ] **F157**: Phase 4→5 전환 로드맵 — 온보딩 4주 추적 계획 + Phase 5 착수 기준 + Track A/B 실행 순서 + KT DS SR 시나리오 연동
- [ ] SPEC.md §2/§5/§6 Sprint 32 반영
- [ ] MEMORY.md 동기화

### 2.2 Out of Scope

- Track B 실 설치 (F153/F154/F155) — 별도 Sprint 또는 Track B Plan에서 실행
- Track A 구현 (F135~F139) — Phase 5 보안 승인 후
- 온보딩 프로세스 실행 (사람 대상) — 별도 프로세스로 진행 중
- GitLab 지원 (F112) — P3, 수요 확인 후

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | PRD v5 G1~G12 갭 항목 12건의 현재 구현 상태를 SPEC F-item과 1:1 매핑하여 검증 | High | Pending |
| FR-02 | Phase 3 범위 A~D의 전체 산출물 완료 여부를 코드베이스와 대조 확인 | High | Pending |
| FR-03 | Phase 4 범위 A~F의 전체 산출물 완료 여부를 코드베이스와 대조 확인 | High | Pending |
| FR-04 | Phase 5 미착수 F-item(F116/F117/F118/F135~F155) 실행 순서 및 의존성 정리 | High | Pending |
| FR-05 | 온보딩 4주 추적 KPI 항목(K7/K8/K9/K12) 측정 방법과 데이터 소스를 구체화 | Medium | Pending |
| FR-06 | Phase 4 최종 Go/Pivot/Kill 판정 임계값과 판정 일정을 문서화 | Medium | Pending |
| FR-07 | Agent Evolution Track B 즉시 착수 가능 항목과 Track A 착수 전제조건을 명시 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 정합성 | PRD v5 ↔ SPEC ↔ 코드 3-way 일치 | 수동 검증 + SPEC drift 0건 |
| 추적 가능성 | 모든 미착수 항목에 착수 조건/시점이 명시됨 | Plan 문서 검토 |

---

## 4. PRD v5 완전성 점검 (F156)

### 4.1 G1~G12 Gap 항목 상태

| Gap | 설명 | F-item | Sprint | 상태 | 비고 |
|-----|------|--------|--------|:----:|------|
| G1 | Git↔D1 Reconciliation | F99 | 27 | ✅ | Cron 6h 자동 정합성 |
| G2 | GitLab API 지원 | F112 | — | 📋 | P3, 수요 확인 후 |
| G3 | Plumb Track B 판정 | F105 | 28 | ✅ | Stay Track A (ADR-001) |
| G4 | Jira 연동 | F110 | 24 | ✅ | WebhookRegistry + JiraAdapter |
| G5 | 모노리포→멀티리포 분리 | F118 | — | 📋 | P3, 고객 배포 요구 시 |
| G6 | KPI 측정 인프라 | F100 | 27 | ✅ | KpiLogger + Cron |
| G7 | 에이전트 자동 수정 | F101 | 27 | ✅ | AutoFix 2회 → escalation |
| G8 | 에이전트 자동 rebase | F102 | 28 | ✅ | AutoRebase 3회 → escalation |
| G9 | 고객 파일럿 준비 | F117 | — | 📋 | Phase 5, SR 성공 후 |
| G10 | 내부 5명 온보딩 | F114 | 29 | 🔧 | 기술 완료, 프로세스 진행 중 |
| G11 | Semantic Linting | F103 | 28 | ✅ | ESLint 3종 커스텀 룰 |
| G12 | (PRD에 미정의) | — | — | — | PRD v5에 G12 미기술 |

**결과: 12건 중 9건 완료, 1건 진행 중(G10), 2건 미착수(G2/G5 — P3 수요 대기), G9은 Phase 5 전제**

### 4.2 Phase 3 산출물 검증

| 범위 | 항목 | F-item | 상태 | 검증 방법 |
|------|------|--------|:----:|-----------|
| A. 멀티테넌시 | Organizations + RLS + roleGuard | F83~F86 | ✅ | D1 org* 테이블 + 테스트 존재 |
| A. GitHub 동기화 | Issues/PR 양방향 | F84, F93 | ✅ | github-sync 서비스 + webhook |
| A. Slack 통합 | Interactive + 채널별 알림 | F85, F94 | ✅ | slack 서비스 + D1 0014 |
| A. PlannerAgent | LLM 실연동 + 테스트 | F95 | ✅ | planner-agent 서비스 |
| B. Reconciliation (G1) | Cron 기반 정합성 | F99 | ✅ | reconciliation 서비스 |
| B. KPI 인프라 (G6) | 측정 + 대시보드 | F100 | ✅ | kpi-logger 서비스 |
| B. AutoFix (G7) | 자동 수정 루프 | F101 | ✅ | auto-fix 서비스 |
| B. AutoRebase (G8) | 자동 rebase | F102 | ✅ | auto-rebase 서비스 |
| B. Semantic Linting (G11) | 커스텀 ESLint | F103 | ✅ | eslint-rules/ 3종 |
| C. AXIS DS 전환 | shadcn→AXIS DS | F104 | ✅ | @axis-ds/* 3패키지 |
| D. Plumb 판정 | Track A/B 결정 | F105 | ✅ | ADR-001 Stay Track A |

**Phase 3 결과: 11/11 항목 완료 ✅**

### 4.3 Phase 4 산출물 검증

| 범위 | 항목 | F-item | 상태 | 검증 방법 |
|------|------|--------|:----:|-----------|
| A. 프론트엔드 통합 | iframe + 네비게이션 | F106, F124 | ✅ | service-proxy, postMessage 6종 |
| B. 인증/테넌시 통합 | SSO Hub Token | F108 | ✅ | sso 서비스 + D1 테이블 |
| C. API 점진적 통합 | BFF 프록시 | F109 | ✅ | proxy 라우트 |
| D. 데이터 통합 | D1 entity_registry | F111 | ✅ | entity-registry + entity-sync |
| E-1. Jira (G4) | WebhookRegistry | F110 | ✅ | jira-adapter 서비스 |
| E-2. GitLab (G2) | GitLab API | F112 | 📋 | P3, 수요 확인 후 |
| F-1. 온보딩 기술 | 가이드 UI + 피드백 + 체크리스트 | F120~F122 | ✅ | onboarding 라우트 3개 |
| F-2. 온보딩 프로세스 | 5명 실제 진행 | F114 | 🔧 | 킥오프 문서(F132) 완료, 실행 대기 |
| Go 판정 | Conditional Go | F125 | ✅ | KPI 대시보드 + 판정 문서 |
| 배포 동기화 | Workers + D1 remote | F123, F129 | ✅ | Workers fe2f72a7 |
| 품질 보강 | E2E + Match Rate | F128, F131 | ✅ | E2E ~55, Match 90%+ |

**Phase 4 결과: 11/12 항목 완료, 1건 수요 대기(G2 GitLab), 온보딩 프로세스 진행 중**

---

## 5. Phase 4→5 전환 로드맵 (F157)

### 5.1 온보딩 4주 추적 계획

| 주차 | 활동 | 측정 항목 | 데이터 소스 |
|:----:|------|-----------|-------------|
| W1 | 킥오프 + 환경 설정 | 참여자 수, 환경 구성 완료율 | 체크리스트(F122) |
| W2 | 코어 플로우 사용 | WAU(K7), 에이전트 완료율(K8) | Cloudflare Analytics + D1 |
| W3 | 심층 사용 + 피드백 | 서비스 전환 없는 비율(K9), NPS 중간 | 피드백 API(F121) |
| W4 | 최종 판정 데이터 | NPS(K12), "개별 복귀" 의사 | 피드백 API + 인터뷰 |

### 5.2 Phase 4 최종 판정 기준 (PRD v5 §Phase 4 판정)

| 판정 | 조건 | 임계값 |
|------|------|--------|
| **Go** | NPS 6+ (K12) 또는 WAU 60%+ (K7) 또는 "복귀 싫다" 2명+ | 하나 이상 충족 |
| **Pivot** | 일부 서비스만 통합 유지 / API 연동으로 회귀 | Go 조건 미달 + Kill 미해당 |
| **Kill** | 통합이 복잡성만 증가, 가치 부재 | NPS 3 미만 또는 전원 복귀 요청 |

**예상 판정 시점**: 온보딩 킥오프(F132) 실행일 + 4주

### 5.3 Phase 5 미착수 F-item 로드맵

#### Layer 1: 즉시 가능 (외부 조건 무관)

| F# | 제목 | 우선순위 | 의존성 | 예상 작업량 |
|----|------|:--------:|--------|:-----------:|
| F155 | OpenRouter API 키 발급 | P0 | 없음 | 0.5h |
| F153 | gstack 스킬 설치 | P0 | 없음 | 2h |
| F154 | claude-code-router 설정 | P1 | F155 | 2h |

#### Layer 2: Phase 4 Go 판정 후 (Track A 핵심)

| F# | 제목 | 우선순위 | 의존성 | 예상 작업량 |
|----|------|:--------:|--------|:-----------:|
| F135 | OpenRouter 게이트웨이 통합 | P0 | F155, Go 판정 | 1 Sprint |
| F136 | 태스크별 모델 라우팅 | P0 | F135 | 1 Sprint |
| F137 | Evaluator-Optimizer 패턴 | P0 | F135 | 1 Sprint |
| F138 | ArchitectAgent | P0 | F135, F136 | 1 Sprint |
| F139 | TestAgent | P0 | F135, F136 | 1 Sprint |

#### Layer 3: Track A 보조 + KT DS SR

| F# | 제목 | 우선순위 | 의존성 | 예상 작업량 |
|----|------|:--------:|--------|:-----------:|
| F116 | KT DS SR 시나리오 구체화 | P1 | Go 판정 | 1 Sprint |
| F140 | SecurityAgent | P1 | F135 | 1 Sprint |
| F141 | QAAgent | P1 | F135 | 1 Sprint |
| F144 | Fallback 체인 | P1 | F135 | 0.5 Sprint |
| F143 | 모델 비용/품질 대시보드 | P1 | F135, F136 | 1 Sprint |

#### Layer 4: 수요 기반 / 장기

| F# | 제목 | 우선순위 | 착수 조건 |
|----|------|:--------:|-----------|
| F112 | GitLab API | P3 | 고객사 GitLab 사용 확인 |
| F117 | 외부 고객사 파일럿 | P1 | KT DS SR 성공 (F116) |
| F118 | 멀티리포 분리 | P3 | 고객 배포 요구 |
| F149 | 프라이빗 프롬프트 게이트웨이 | P1 | 보안팀 요구 시 P0 승격 검토 |
| F142 | Sprint 워크플로우 템플릿 | P1 | F137 Evaluator + F138 Architect |
| F145~F148, F150~F152 | 장기 기능 (P2) | P2 | Layer 2~3 완료 후 |

### 5.4 Phase 5 실행 타임라인 (예상)

```
온보딩 킥오프
  │
  ├─ W1~W4: 온보딩 데이터 수집 ─── 이 기간에 Track B(Layer 1) 병행 가능
  │
  └─ W4: Phase 4 최종 판정
       │
       ├─ Go → Phase 5a: Track A P0 (F135~F139) — 2~3 Sprints
       │       Phase 5b: KT DS SR (F116) + P1 기능 — 2~3 Sprints
       │       Phase 5c: 외부 파일럿 (F117)
       │
       ├─ Pivot → 범위 축소 후 재계획
       │
       └─ Kill → 학습 문서화 + 개별 서비스 독립 운영
```

---

## 6. Success Criteria

### 6.1 Definition of Done

- [x] PRD v5 G1~G12 전체 항목의 현재 상태가 F-item과 매핑되어 검증됨
- [x] Phase 3 전체 산출물 완료 확인 (11/11)
- [x] Phase 4 전체 산출물 완료 확인 (11/12, G2 수요 대기 확인)
- [ ] Phase 5 미착수 F-item의 Layer 1~4 분류 및 의존성 문서화
- [ ] 온보딩 4주 추적 계획의 KPI 항목 + 데이터 소스 구체화
- [ ] SPEC.md §2/§5/§6에 Sprint 32 결과 반영
- [ ] MEMORY.md 동기화

### 6.2 Quality Criteria

- [ ] PRD v5 ↔ SPEC ↔ 코드 3-way drift 0건
- [ ] 모든 미착수 항목에 착수 조건이 명시됨
- [ ] Phase 4 최종 판정 기준이 수치로 정의됨

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 온보딩 대상자 5명 확보 지연 | 최종 판정 지연 | Medium | F132 킥오프 문서 기반으로 즉시 진행, 최소 3명으로 축소 가능 |
| Track A 보안 승인 불발 | Phase 5 착수 불가 | Medium | Track B(개발 환경 강화)로 즉시 가치 확보, 프라이빗 게이트웨이(F149) 우선 검토 |
| 1인 개발로 Phase 5 전체 구현 비현실적 | 일정 초과 | High | Layer 분류 + 우선순위 기반 선별 구현, AI 에이전트(gstack/claude-code-router) 생산성 활용 |

---

## 8. Architecture Considerations

### 8.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

기존 모노리포 (pnpm workspace + Turborepo) + Cloudflare Workers/Pages/D1 아키텍처 유지.

### 8.2 이번 Sprint 특이사항

이번 Sprint은 **코드 구현이 아닌 문서/거버넌스 Sprint**이다.
- 신규 코드: 없음
- 신규 테스트: 없음
- SPEC.md / MEMORY.md / Plan 문서 갱신이 주요 산출물

---

## 9. Next Steps

1. [x] Plan 문서 작성 (본 문서)
2. [ ] SPEC.md §5에 F156/F157 등록 + §6 Execution Plan Sprint 32 추가
3. [ ] PRD v5 ↔ SPEC 정합성 최종 검증 (코드베이스 대조)
4. [ ] SPEC.md §2 Sprint 32 반영
5. [ ] MEMORY.md 동기화

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-22 | Initial draft — PRD v5 완전성 점검 + Phase 5 로드맵 | Sinclair Seo |
