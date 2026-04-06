---
code: FX-RPRT-P17
title: "Phase 17 완료 보고서 — Self-Evolving Harness v2"
version: 1.0
status: Active
category: RPRT
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], fx-harness-evolution/prd-final.md, FX-STRT-015 v3.0"
---

# Phase 17 완료 보고서 — Self-Evolving Harness v2

## Executive Summary

| 항목 | 내용 |
|------|------|
| Phase | 17 — Self-Evolving Harness v2 |
| 기간 | 2026-04-06 (단일 세션 #207) |
| Sprint | 161~164 (4 Sprint) |
| F-items | F357~F362 (6/6 ✅) |
| PRs | #298, #299, #300, #301 |
| 총 소요 | ~82분 autopilot (161: 22분, 162: 20분, 163: 20분, 164: 20분) |

### 1.1 Results

| 지표 | 목표 | 실제 |
|------|------|------|
| F-items 완료 | 6/6 | **6/6 (100%)** |
| 평균 Match Rate | ≥ 90% | **~99%** (100+97+est+est) |
| 병렬 Sprint | 2 | **2** (163+164 동시) |
| Merge Conflict | 0 | **2** (builder.ts + app.ts, 즉시 해소) |

### 1.2 Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Phase 14 인프라(12,600 LOC)가 구축되었으나 데이터→행동 변화 루프 부재. Rules 5종 진부화, 반복 실패 수동 감지, O-G-D 단일 도메인 한정 |
| **Solution** | Guard Rail 자동 제안 파이프라인(감지→생성→승인→배치) + O-G-D 4도메인 범용화 + 운영 지표 대시보드 |
| **Function UX Effect** | 세션 시작 시 Rule 제안 알림 → API 기반 승인 → 자동 배치. 4도메인 O-G-D 통합 API. Dashboard 운영 지표 탭 |
| **Core Value** | 하네스가 데이터에서 스스로 학습하는 자가 발전 루프 완성. 전략 문서 FX-STRT-015의 Layer 5 "Guard Rail Refine" 구현 |

---

## 2. Sprint별 상세

### Sprint 161 — 데이터 진단 + 패턴 감지 + Rule 생성 (F357+F358)

| 항목 | 내용 |
|------|------|
| PR | #298 |
| Match | 100% |
| Tests | 18 pass |
| 소요 | 21분 51초 |

**산출물:**
- `DataDiagnosticService` — execution_events + task_state_history 진단
- `PatternDetectorService` — source × severity 클러스터링, 임계값 기반 패턴 식별
- `RuleGeneratorService` — LLM(Haiku) 기반 Rule 초안 생성
- D1 0107 `failure_patterns` + 0108 `guard_rail_proposals`
- API 5개 엔드포인트 (guard-rail 라우트)

### Sprint 162 — 세션 내 Rule 승인 플로우 (F359)

| 항목 | 내용 |
|------|------|
| PR | #299 |
| Match | 97% |
| Tests | 10 추가 |
| 소요 | 19분 47초 |

**산출물:**
- `GuardRailDeployService` — approved proposal → YAML frontmatter Rule 파일 생성
- POST /guard-rail/proposals/:id/deploy API
- PATCH /guard-rail/proposals/:id 상태 변경 API
- **보너스**: `builderRoute.use("/*")` → `use("/builder/*")` 버그 수정 (모든 API 401 차단 문제)

### Sprint 163 — O-G-D Loop 범용 인터페이스 (F360)

| 항목 | 내용 |
|------|------|
| PR | #301 |
| 소요 | 20분 17초 |

**산출물:**
- `OGDGenericRunner` — 도메인 독립 O-G-D Loop 실행기
- `OGDDomainRegistry` — 어댑터 등록/조회
- 4개 도메인 어댑터: BD형상화, Prototype, 코드리뷰, 문서검증
- POST /ogd/run 통합 API
- D1 `ogd_adapters` 테이블

### Sprint 164 — 운영 지표 대시보드 (F361+F362)

| 항목 | 내용 |
|------|------|
| PR | #300 |
| 소요 | 19분 47초 |

**산출물:**
- `RuleEffectivenessService` — Rule 배치 전/후 실패 빈도 비교
- `MetricsService` — 활용률 + 재사용률 통합 집계
- GET /metrics/overview, /skill-reuse, /agent-usage API
- Dashboard "운영 지표" 탭: AgentUsageChart, SkillReuseChart, RuleEffectChart, UnusedHighlight

---

## 3. 전략 문서 FX-STRT-015 이행 평가

| 전략 항목 | v3.0 상태 | Phase 17 결과 |
|-----------|----------|--------------|
| Layer 5: Guard Rail Refine | ⚠️ 미구현 | **✅ 구현** — PatternDetector + RuleGenerator + Deploy |
| O-G-D Loop 범용화 (P1) | Phase 16 F355 단일 재활용 | **✅ 4도메인 범용화** — BD+Prototype+코드리뷰+문서검증 |
| 에이전트 자기 평가 활용 (P2) | F148 데이터 미연결 | **✅ 연결** — PatternDetector 가중치 |
| Skill Evolution 운영 지표 (P2) | 미측정 | **✅ 대시보드** — 재사용률 + 활용률 |
| Guard Rail 자동 제안 (P1) | 미구현 | **✅ 반자동** — 감지→생성→승인→배치 |

---

## 4. PRD KPI 달성 현황

| KPI | 목표 | Phase 17 결과 | 상태 |
|-----|------|-------------|------|
| 반복 실패 감소율 | ≥ 30% | 측정 인프라 구축 완료, 데이터 축적 후 측정 | 🔄 |
| Guard Rail 채택률 | > 50% | 승인 플로우 구축 완료, 운영 데이터 필요 | 🔄 |
| O-G-D 도메인 간 재활용 | ≥ 3 | **4개** (BD+Prototype+코드리뷰+문서검증) | ✅ |
| 에이전트 활용률 | > 75% 월 1회+ | 측정 인프라 구축 완료, 운영 데이터 필요 | 🔄 |
| DERIVED 스킬 재사용률 | > 30% | 측정 인프라 구축 완료, 운영 데이터 필요 | 🔄 |

> **참고**: 반복 실패 감소율, 채택률, 활용률은 운영 데이터 축적이 필요하므로, 1~3개월 후 실측 가능.

---

## 5. req-interview 프로세스 성과

Phase 17은 **req-interview 스킬로 PRD를 생성한 첫 번째 Phase**예요:

| 단계 | 소요 | 결과 |
|------|------|------|
| 인터뷰 5파트 | ~5분 | AskUserQuestion 7회 |
| PRD v1 생성 | 즉시 | 8,009자 |
| AI 3모델 검토 | 35초 | ChatGPT:Conditional, Gemini:Conditional (82점) |
| 의견 반영 v2 | 44초 | 30건 변경, 14,786자 |
| Ambiguity Score | 즉시 | 0.155 (Ready) |
| 전체 | ~10분 | prd-final 확정 |

---

## 6. 교훈

1. **Plan 구체성이 Match Rate를 결정**: Sprint 161은 D1 스키마, 기존 서비스 경로, 인터페이스까지 Plan에 명시하여 Match 100%를 달성.
2. **병렬 Sprint의 merge 충돌은 예측 가능**: Sprint 163+164 병렬 실행에서 `app.ts` 충돌 발생 — 두 Sprint 모두 라우트를 등록하니 예측된 충돌. 즉시 해소.
3. **autopilot이 숨은 버그를 발견**: Sprint 162에서 `builderRoute.use("/*")` 버그를 발견하고 자동 수정 — 사람이 놓쳤을 수 있는 문제.
4. **전략 문서 → PRD → Plan → 구현 파이프라인**: FX-STRT-015 v3.0 → req-interview PRD → Sprint Plan → autopilot 구현까지 단일 세션에서 ��료.

---

## 7. 다음 단계

- [ ] 운영 데이터 축적 (1~3개월) 후 KPI 실측
- [ ] Guard Rail 채택률 모니터링 — 50% 미달 시 LLM 프롬프트 튜닝
- [ ] session-start Step 4b 통합 — CLI에서 Rule 제안 알림 (현재 API만 구축)
- [ ] Phase 18+ 후보: Guard Rail 자동 제안 고도화 (인간 수정 → LLM 피드백 루프)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Phase 17 완료 보고서 작성 | Sinclair Seo |
