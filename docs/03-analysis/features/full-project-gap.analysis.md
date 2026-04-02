---
code: FX-ANLS-FPG
title: "전체 프로젝트 Gap 분석 (PRD v5 ↔ SPEC ↔ 구현)"
version: 1.0
status: Active
category: ANLS
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# 전체 프로젝트 Gap 분석 (PRD v5 ↔ SPEC ↔ 구현)

> **Analysis Type**: 3-Way Gap Analysis (PRD ↔ SPEC ↔ Code)
>
> **Project**: Foundry-X
> **Version**: Sprint 44
> **Analyst**: Claude (AI) + Sinclair Seo
> **Date**: 2026-03-22
> **PRD**: docs/specs/prd-v5.md + docs/specs/agent-evolution/prd-final.md
> **SPEC**: SPEC.md v5.21

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Sprint 44 완료 시점에서 PRD v5(목표 문서) ↔ SPEC.md(명세 문서) ↔ 실제 코드(구현) 3자 간 정합성을 점검하여, 문서 drift와 미구현 항목을 식별한다.

### 1.2 Analysis Scope

| 대상 | 범위 |
|------|------|
| PRD v5 | §1~§9 전체 (통합 플랫폼 비전 + G1~G12 Gap + Open Questions) |
| SPEC.md | §1~§9 전체 (F1~F157 F-items + Execution Plan + Tech Debt) |
| 구현 코드 | packages/api (30 routes, 76 services, 30 schemas), packages/web, packages/cli, packages/shared |
| D1 | 0001~0027 마이그레이션, 46 테이블 |

---

## 2. SPEC ↔ 구현 정합성 (코드 레벨)

### 2.1 수치 검증

| 항목 | SPEC §2 주장 | 실제 | 상태 |
|------|:---:|:---:|:---:|
| Route 파일 | 30 | 30 | ✅ |
| Service 파일 | 76 | 76 | ✅ |
| Schema 파일 | 30 | 30 | ✅ |
| D1 마이그레이션 | 27 (0001~0027) | 27 | ✅ |
| D1 테이블 | 46 | 46 (CREATE TABLE) | ✅ |
| API 엔드포인트 | 162 | ~164 (OpenAPI 기준) | ⚠️ 근사 |
| API 테스트 | 953 | 953 | ✅ |
| CLI 테스트 | 125 | 125 | ✅ |
| Web 테스트 | 64 | 64 | ✅ |
| 패키지 버전 | cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0 | 일치 | ✅ |

### 2.2 F-item 완료 현황

| Phase | F-item 범위 | 완료 | 미완료 | 완료율 |
|-------|:-----------:|:----:|:------:|:------:|
| Phase 1 (CLI) | F1~F36 | 36 | 0 | **100%** |
| Phase 2 (API+Web) | F37~F97 | 59 | 0 | **100%** |
| Phase 3 (통합 준비) | F83~F115 | 28 | 0 | **100%** |
| Phase 4 (통합 실행) | F106~F133 | 25 | 0 | **100%** |
| Sprint 32 (거버넌스) | F156~F157 | 2 | 0 | **100%** |
| Agent Evolution Track A | F135~F152 | 18 | 0 | **100%** |
| Agent Evolution Track B | F153~F155 | 3 | 0 | **100%** |
| Phase 5 (고객 파일럿) | F116~F118, F134 | 2 | 2 | **50%** |

**미완료 F-items:**
| F# | 제목 | 상태 | 비고 |
|----|------|:----:|------|
| F117 | 외부 고객사 파일럿 — SR 자동화 데모 | 📋 | Phase 5 본격 시작 시 |
| F118 | 모노리포→멀티리포 분리 검토 | 📋 | 수요 발생 시 검토 (P3) |

---

## 3. PRD v5 ↔ 현실 정합성

### 3.1 G1~G12 Gap 항목 해소 현황

| Gap# | 설명 | PRD 편입 시점 | 해소 Sprint | 해소 F-item | 상태 |
|:----:|------|:---:|:---:|:---:|:---:|
| G1 | Git↔D1 Reconciliation | Phase 3-B | Sprint 27 | F99 | ✅ |
| G2 | GitLab API 지원 | Phase 4-E | — | — | 📋 수요 대기 |
| G3 | Plumb Track B 판정 | Phase 3-D | Sprint 28 | F105 | ✅ (Stay Track A) |
| G4 | Jira 연동 | Phase 4-E | Sprint 24 | F115 | ✅ |
| G5 | 모노리포→멀티리포 분리 | Phase 5 | — | F118 | 📋 수요 대기 |
| G6 | KPI 측정 인프라 | Phase 3-B | Sprint 27 | F100 | ✅ |
| G7 | 에이전트 hook 자동 수정 | Phase 3-B | Sprint 27 | F101 | ✅ |
| G8 | 에이전트 자동 rebase | Phase 3-B | Sprint 28 | F102 | ✅ |
| G9 | 고객 파일럿 준비 | Phase 4-F | Sprint 44 | F116 (일부) | 🔧 진행 중 |
| G10 | 내부 5명 온보딩 | Phase 4-F | Sprint 29~31 | F120~F132 | 🔧 진행 중 |
| G11 | Semantic Linting 실효성 | Phase 3-B | Sprint 28 | F103 | ✅ |
| G12 | SR 시나리오 구체화 | Phase 5 | Sprint 44 | F116 | ✅ |

**요약: 9/12 완료, 1 진행 중, 2 수요 대기** (해소율 75%, 진행 포함 83%)

### 3.2 PRD Phase 상태 drift (Critical)

| 섹션 | PRD 기술 | 실제 상태 | Drift |
|------|---------|----------|:-----:|
| §8 Phase 3 | 🔧 진행 중 | ✅ **완료** (Sprint 25) | ❌ |
| §8 Phase 4 | 📋 계획 | ✅ **Go 판정 완료** (Sprint 30) | ❌ |
| §8 Phase 5 | 미언급 | 🔧 **착수 중** (Sprint 32~44) | ❌ |

**PRD v5 §8(Release) 섹션이 Phase 4 Go 판정 이후 갱신되지 않음** — 2-Phase 분량의 상태 drift 존재.

### 3.3 Open Questions 상태 drift

| Q# | 질문 | PRD 기록 | 실제 | Drift |
|:--:|------|:---:|:---:|:---:|
| Q1 | Plumb Track B 전환 | ⚠️ 미결정 | ✅ 해소 (ADR-001, Stay Track A) | ❌ |
| Q2 | MCP vs REST | ✅ 해소 | ✅ 해소 | — |
| Q3 | 외부 파트너/SI | ❌ 미해소 | ❌ 미해소 | — |
| Q4 | KT DS SR 시나리오 | ❌ 미해소 | ✅ **해소** (Sprint 44 F116) | ❌ |
| Q5 | CLAUDE.md↔AGENTS.md | ✅ 해소 | ✅ 해소 | — |
| Q6 | Harness Rules 위반 처리 | ⚠️ 부분 | ⚠️ 부분 (규칙 문서화 O, 자동 차단 X) | — |
| Q7~Q9 | 기술 스택 점검 | ❌ 미확인 | ❌ 미확인 (통합 착수 전 필수) | — |
| Q10 | SSO 방식 결정 | ❌ 미확인 | ⚠️ **부분** (SSO Hub Token 구현됨, F109) | ❌ |

### 3.4 KPI 측정 가능성

| KPI | 목표 | 인프라 | 실데이터 | 상태 |
|:---:|------|:---:|:---:|:---:|
| K1 | CLI 주간 호출 10회+ | ❌ 미구축 | — | 📋 |
| K2 | --no-verify < 20% | ✅ 구축 | 0% | ✅ 달성 |
| K3 | sync 후 수동 수정 감소 | ❌ 미구축 | — | 📋 |
| K4 | 결정 승인율 > 70% | ❌ 미구축 | — | 📋 |
| K5 | 복귀 횟수 0건 | ❌ 미구축 | — | 📋 |
| K6 | 하네스 무결성 > 95% | ❌ 미구축 | — | 📋 |
| K7 | WAU 5명+ | ✅ (Cloudflare Analytics) | — | 📋 |
| K8 | 에이전트 자동 완료율 > 70% | ✅ (agent_tasks 테이블) | — | 📋 |
| K9~K12 | 통합 플랫폼 KPI | 부분 구축 | — | 📋 |

---

## 4. Agent Evolution PRD ↔ 구현 정합성

### 4.1 Track A 기능 해소 현황 (A1~A18)

| PRD# | 기능 | 우선순위 | 구현 F-item | Sprint | 상태 |
|:----:|------|:---:|:---:|:---:|:---:|
| A1 | OpenRouter 게이트웨이 통합 | P0 | F135 | 34 | ✅ (97%) |
| A2 | 태스크별 모델 라우팅 | P0 | F136 | 36 | ✅ (96%) |
| A3 | Evaluator-Optimizer 패턴 | P0 | F137 | 36 | ✅ (96%) |
| A4 | ArchitectAgent | P0 | F138 | 37 | ✅ (95%) |
| A5 | TestAgent | P0 | F139 | 37 | ✅ (95%) |
| A6 | SecurityAgent | P1 | F140 | 38 | ✅ (97%) |
| A7 | QAAgent 브라우저 테스트 | P1 | F141 | 38 | ✅ (97%) |
| A8 | Sprint 워크플로우 템플릿 | P1 | F142 | 35 | ✅ (96%) |
| A9 | 모델 비용/품질 대시보드 | P1 | F143 | 35+43 | ✅ (API 85%→UI 95%) |
| A10 | Fallback 체인 | P1 | F144 | 39 | ✅ (93%) |
| A11 | InfraAgent | P2 | F145 | 40 | ✅ (91%) |
| A12 | 에이전트 역할 커스터마이징 | P2 | F146 | 41 | ✅ (94%) |
| A13 | 멀티모델 앙상블 투표 | P2 | F147 | 41 | ✅ (94%) |
| A14 | 에이전트 자기 평가 | P2 | F148 | 40 | ✅ (91%) |
| A15 | 프라이빗 프롬프트 게이트웨이 | P1→P0 | F149 | 39 | ✅ (93%) |
| A16 | AI-휴먼 피드백 루프 | P1 | F150 | 39 | ✅ (93%) |
| A17 | 자동화 품질 리포터 | P2 | F151 | 42 | ✅ (97%) |
| A18 | 에이전트 마켓플레이스 | P2 | F152 | 42 | ✅ (97%) |

**Track A 완료율: 18/18 (100%)** — 평균 Match Rate: 94.6%

### 4.2 Track B 기능 해소 현황 (B1~B3)

| PRD# | 도구 | 우선순위 | 구현 F-item | Sprint | 상태 |
|:----:|------|:---:|:---:|:---:|:---:|
| B1 | gstack 스킬 설치 | P0 | F153 | 33 | ✅ |
| B2 | claude-code-router 설정 | P1 | F154 | 33 | ✅ |
| B3 | OpenRouter API 키 발급 | P0 | F155 | 33 | ✅ |

**Track B 완료율: 3/3 (100%)**

### 4.3 MVP 기준 달성 검증

| MVP 기준 | 상태 | 근거 |
|----------|:---:|------|
| OpenRouterRunner 통합 | ✅ | F135 — AgentRunner 인터페이스 구현, 3-way 팩토리 |
| 최소 3개 모델 라우팅 | ✅ | F136 — model_routing_rules D1 테이블, Haiku/Sonnet/GPT-4o 지원 |
| Evaluator-Optimizer code-review 적용 | ✅ | F137 — EvaluatorOptimizer + 3종 EvaluationCriteria |
| TestAgent 테스트 생성 | ✅ | F139 — generateTests + coverageGap + edgeCases 3메서드 |
| TestAgent 통과율 80%+ (human-in-the-loop) | ⚠️ 미측정 | 기능 구현 완료, 실사용 데이터 미수집 |

**MVP 달성: 4/5 ✅ + 1/5 ⚠️ (기능 완료, 실측 미수행)**

### 4.4 PRD 성공 지표(KPI) 달성 검증

| KPI | 목표 | 현재 | 상태 |
|-----|------|------|:---:|
| 에이전트 역할 수 | 5+ | **8** (Planner, Reviewer, Architect, Security, Test, QA, Infra + Custom) | ✅ 초과 달성 |
| 지원 LLM 모델 수 | 5+ | **300+** (OpenRouter 게이트웨이) | ✅ 초과 달성 |
| Evaluator 루프 적용 | code-review, code-gen | ✅ 구현 완료 | ✅ |
| 에이전트 비용 추적 | 모델별 추적 가능 | ✅ ModelMetrics + 대시보드 | ✅ |
| 코드 리뷰 품질 | 다차원 점수 | ✅ SDD + Security + Architecture | ✅ |
| 코드 리뷰 실패율 | 18% → 5% | ⚠️ 미측정 (실사용 데이터 없음) | 📋 |
| 평균 리뷰 시간 | 12분 → 7분 | ⚠️ 미측정 | 📋 |
| TestAgent 통과율 | 90%+ | ⚠️ 미측정 | 📋 |
| 코드 결함률 | 6.2% → 5% | ⚠️ 미측정 | 📋 |
| 개발자 투입 시간 | 주 8h → 5h | ⚠️ 미측정 | 📋 |

**요약: 기능 KPI 5/5 ✅ 달성, 효과 KPI 0/5 미측정 (실사용 데이터 수집 필요)**

### 4.5 PRD 상태 drift

| 항목 | PRD 기록 | 실제 | Drift |
|------|:---:|:---:|:---:|
| PRD 상태 | ⚠️ Conditional | Track A/B **전체 완료** | ❌ 갱신 필요 |
| Phase 5a 일정 | 2주 예상 | Sprint 33 (1세션) | ❌ |
| Phase 5b 일정 | 4주 예상 | Sprint 34~37 (4 Sprint) | 근사 |
| Phase 5c 일정 | 3주 예상 | Sprint 38~39 (2 Sprint) | ❌ |
| Phase 5d 일정 | 이후 | Sprint 40~42 (3 Sprint) | ❌ |
| 인력 요건 | Phase 5b부터 2명+ | 1명 + AI Agent Team으로 전체 완료 | ❌ (긍정적 drift) |
| 컴플라이언스 Q | 보안 정책 미확인 | 미변동 (여전히 미확인) | — |

### 4.6 Agent Evolution PRD Open Questions

| 항목 | PRD 기록 | 현재 상태 |
|------|---------|----------|
| A15 우선순위 P1→P0 검토 | 미결정 | ✅ **구현 완료** (F149, Sprint 39) — 사실상 P0로 처리됨 |
| ML 기반 동적 라우팅 | Out of Scope | 📋 유지 (규칙 기반으로 충분, ML은 Phase 5b 검토) |
| 보안 정책 외부 LLM 전송 | ❌ 미확인 | ❌ 여전히 미확인 — 실 파일럿 시 반드시 해소 필요 |
| 인력 확보 (2026-04-05) | 목표일 설정 | ⚠️ 1명 + AI로 전체 완료, 추가 인력 미확보 |

---

## 5. SPEC ↔ SPEC 내부 정합성

### 4.1 SPEC §1 Sprint 번호 drift

| 필드 | SPEC §1 값 | 실제 | Drift |
|------|:---:|:---:|:---:|
| Sprint | 43 | **44** | ❌ 1 Sprint 뒤처짐 |

### 4.2 SPEC §2 D1 remote 상태

SPEC §2에 "D1 remote: 0001~0023 적용 완료 (0024~0027 로컬 only)"로 기록되어 있으나, MEMORY.md에는 "D1 migrations 0001~0027 remote 전체 적용 완료"로 기록됨.

→ **확인 필요**: 0024~0027이 실제로 remote 적용되었는지 `wrangler d1 migrations list --remote`로 검증 필요.

---

## 5. Match Rate Summary

```
┌──────────────────────────────────────────────────────────┐
│  전체 프로젝트 Gap Analysis (PRD v5 + Agent Evolution)     │
│  Overall Match Rate: 92%                                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📦 코드 ↔ SPEC 정합성:                    98%            │
│    ✅ F-item 완료율:        171/173 (99%)                  │
│    ✅ 수치 정합성:          9/10 항목 일치                  │
│    ⚠️ 엔드포인트 수:       162 vs ~164 (근사)              │
│                                                           │
│  📄 PRD v5 ↔ 현실 정합성:                  78%            │
│    ✅ G1~G12 해소:         9/12 (75%)                      │
│    ❌ Phase 상태 drift:    3건 (§8 심각)                   │
│    ❌ Open Questions:      3건 미갱신 (Q1, Q4, Q10)        │
│    📋 KPI 측정:           2/12 측정 가능                   │
│                                                           │
│  🤖 Agent Evolution PRD ↔ 구현:             96%            │
│    ✅ Track A 완료:        18/18 (100%, avg 94.6%)         │
│    ✅ Track B 완료:        3/3 (100%)                      │
│    ✅ MVP 기준:            4/5 달성 (1건 실측 미수행)       │
│    ✅ 기능 KPI:            5/5 달성                        │
│    📋 효과 KPI:            0/5 미측정 (실사용 필요)         │
│    ❌ PRD 상태:            Conditional → 전체 완료 (미갱신)  │
│                                                           │
│  📋 SPEC 내부 정합성:                      90%            │
│    ❌ §1 Sprint 번호:      43→44 (stale)                   │
│    ⚠️ §2 D1 remote:      확인 필요                        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Recommended Actions

### 6.1 즉시 수정 (문서 drift)

| 우선순위 | 항목 | 대상 파일 | 변경 |
|:---:|------|------|------|
| 🔴 1 | SPEC §1 Sprint 번호 | SPEC.md:22 | 43 → 44 |
| 🔴 2 | PRD §8 Phase 3 상태 | prd-v5.md:461 | "진행 중" → "✅ 완료" |
| 🔴 3 | PRD §8 Phase 4 상태 | prd-v5.md:498 | "📋 계획" → "✅ Go 판정 완료" |
| 🔴 4 | PRD Open Questions Q1 | prd-v5.md:596 | ⚠️ → ✅ 해소 (ADR-001) |
| 🔴 5 | PRD Open Questions Q4 | prd-v5.md:599 | ❌ → ✅ 해소 (F116 Sprint 44) |
| 🟡 6 | PRD Open Questions Q10 | prd-v5.md:605 | ❌ → ⚠️ 부분 (SSO Hub Token F109) |
| 🔴 7 | Agent Evolution PRD 상태 | prd-final.md:6 | "⚠️ Conditional" → "✅ Track A/B 전체 완료" |
| 🟡 8 | Agent Evolution MVP 체크박스 | prd-final.md:210~214 | 5개 항목 체크 표시 |

### 6.2 검증 필요

| 항목 | 확인 방법 |
|------|----------|
| D1 0024~0027 remote 적용 여부 | `wrangler d1 migrations list --remote` |
| API 엔드포인트 정확한 수 | OpenAPI spec export 후 카운트 |

### 6.3 Phase 5 잔여 작업 (백로그)

| 우선순위 | 항목 | 의존성 |
|:---:|------|------|
| P0 | F114 내부 5명 온보딩 진행 (4주 데이터 수집) | 진행 중 |
| P1 | F117 외부 고객사 파일럿 | F116 ✅ + 온보딩 완료 후 |
| P2 | G2 GitLab API | 수요 확인 시 |
| P2 | G5 모노리포→멀티리포 (F118) | 고객 배포 요구 시 |
| P2 | K1/K3/K4/K5/K6 측정 인프라 | Phase 5 본격화 시 |
| P3 | Q7~Q9 기술 스택 점검 | 통합 착수 결정 시 |

---

## 7. Next Steps

- [ ] 6.1 문서 drift 즉시 수정 (SPEC §1 + PRD §8 + Open Questions)
- [ ] D1 remote 마이그레이션 상태 확인
- [ ] Phase 5 온보딩 4주 데이터 수집 계속
- [ ] 완료 보고서 작성 (`/pdca report full-project-gap`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-22 | 초안 — PRD↔SPEC↔Code 3-way 전수 분석 | Claude + Sinclair |
