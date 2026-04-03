---
code: FX-PLAN-S111
title: "Sprint 111 — F284+F285 BD 형상화 Phase D+E"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-276]], [[FX-REQ-277]], [[FX-BD-SHAPING-001]]"
---

# Sprint 111: F284+F285 BD 형상화 Phase D+E

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F284: BD 형상화 Phase D — 다중 AI 모델 교차 검토 + Six Hats 토론 / F285: Phase E — 전문가 AI 페르소나 리뷰 5종 |
| Sprint | 111 |
| 우선순위 | P1 (F284, F285 모두) |
| 의존성 | F283 선행 (Sprint 110 ✅ 완료) |
| Design | docs/02-design/features/sprint-111.design.md |
| PRD | docs/specs/prd-shaping-v1.md §3.4 (Phase D), §3.5 (Phase E) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Phase C O-G-D 루프의 단일 모델 편향 + 전문 분야별 깊이 검증 부재로 PRD 품질 상한선 존재 |
| Solution | 3모델 교차 검토 + Six Hats 6관점 토론 (Phase D) + TA/AA/CA/DA/QA 5종 전문가 리뷰 (Phase E) |
| Function UX Effect | Phase C 완료 후 자동으로 D→E 파이프라인 실행, 합의 매트릭스와 통합 리뷰 보고서 생성 |
| Core Value | 다층 품질 게이트 완성 → Sprint 112(Phase F HITL) 진입 전제 조건 확보 |

## 구현 범위

### F284: Phase D — 다중 AI 모델 교차 검토 + Six Hats 토론

#### 1. six-hats-moderator 에이전트

- 파일: `.claude/agents/six-hats-moderator.md`
- 역할: Blue Hat 진행자 — 토론 조율 및 결론 도출
- 입력: Phase C 최종 PRD + 교차 검토 불일치 항목
- 실행 프로토콜:
  - Round 1: 각 모자별 독립 의견 수집 (Fan-out, 병렬 아님 — 단일 에이전트가 6역할 순회)
  - Round 2: 상충 의견에 대한 반론 교환
  - Round 3: 합의안 도출 + 미합의 항목 정리
- 산출물: `_workspace/shaping/{run-id}/phase-d-six-hats.md`

#### 2. Phase D 교차 검토 로직 (SKILL.md Step 4)

- Phase C 최종 PRD를 3가지 관점으로 독립 검토:
  - **기술 실현성 중심** — 아키텍처, 기술 스택, 성능 요구사항
  - **사업성 중심** — 수익 모델, 시장 분석, 경쟁 전략
  - **사용자 경험 중심** — UX 흐름, 페르소나 적합성, 채택 장벽
- OpenRouter 다중 모델 호출 (OPENROUTER_API_KEY 활용):
  - 3개 관점을 서로 다른 모델에 할당
  - 각 모델의 검토 결과를 합의 매트릭스로 집계
  - 2/3 이상 동의 항목 → 확정
  - 불일치 항목 → Six Hats 토론으로 이관
- 산출물: `_workspace/shaping/{run-id}/phase-d-cross-review.md`

#### 3. Six Hats 토론 프로토콜 참조 파일

- 파일: `.claude/skills/ax-bd-shaping/references/six-hats-protocol.md`
- 내용: 6색 모자 정의, 라운드 프로토콜, 수렴 기준 (5/6 수용 → 통과)
- Blue Hat이 참조하는 진행 가이드

#### 4. Phase D 수렴 기준

- 6개 관점 중 5개 이상 "수용 가능" → Phase E 진행
- 4개 이하 → Phase C로 회귀 (shaping-orchestrator가 피드백 통합)

### F285: Phase E — 전문가 AI 페르소나 리뷰

#### 5. 전문가 에이전트 5종

| 에이전트 파일 | 역할 | 리뷰 초점 |
|---------------|------|-----------|
| `.claude/agents/expert-ta.md` | Technical Architect | 시스템 아키텍처, 확장성, 통합 전략 |
| `.claude/agents/expert-aa.md` | Application Architect | API 설계, 모듈 분리, 데이터 흐름 |
| `.claude/agents/expert-ca.md` | Cloud Architect | 인프라, 배포 전략, 비용 최적화 |
| `.claude/agents/expert-da.md` | Data Architect | 데이터 모델, 파이프라인, 개인정보보호 |
| `.claude/agents/expert-qa.md` | Quality Assurance | 테스트 전략, 품질 기준, NFR |

각 에이전트 공통 구조:
- model: haiku (비용 효율, 5종 병렬)
- tools: Read, Grep, Glob (읽기 전용)
- 입력: Phase D 통과 PRD + 해당 영역 Rubric
- 출력: 영역별 리뷰 보고서 (findings[], quality_score)

#### 6. Phase E 리뷰 프로세스 (SKILL.md Step 5)

- Step 1: 병렬 독립 리뷰 (Fan-out) — Agent 도구 5개 병렬 호출
- Step 2: 교차 영향 분석 — 5종 리뷰 결과를 종합하여 교차 영향 매트릭스 생성
- Step 3: 통합 리뷰 보고서 생성 — severity 분류, 통합 권고사항
- Phase C 회귀 판정: Major 이슈 1건 이상 → Phase C로 회귀

#### 7. 전문가 리뷰 가이드 참조 파일

- 파일: `.claude/skills/ax-bd-shaping/references/expert-review-guide.md`
- 내용: 5종 Rubric 상세 (TA 4항목, AA 4항목, CA 4항목, DA 4항목, QA 4항목)
- severity 분류 기준: Critical / Major / Minor / Info

#### 8. Phase E 수렴 기준

- 전 영역 Major 이슈 0건 + Quality Score ≥ 0.85 → Phase F 진행 가능
- 미달 시 Phase C로 회귀 (shaping-orchestrator가 전문가 피드백 통합)

### 공통: SKILL.md + shaping-orchestrator 확장

#### 9. SKILL.md Phase D+E 단계 추가

- Step 4 (Phase D) + Step 5 (Phase E) 추가
- Phase C→D→E 순차 실행 오케스트레이션
- Phase D/E 실패 시 Phase C 회귀 루프

#### 10. shaping-orchestrator 확장

- Phase C 완료 후 Phase D 트리거 로직 추가
- Phase D 완료 후 Phase E 트리거 로직 추가
- 회귀 시 Phase C의 피드백에 D/E 결과 주입

## 파일 변경 예상

### 신규 생성 (8개)

```
.claude/agents/
├── six-hats-moderator.md       # Six Hats 토론 진행자 (Blue Hat)
├── expert-ta.md                # Technical Architect 페르소나
├── expert-aa.md                # Application Architect 페르소나
├── expert-ca.md                # Cloud Architect 페르소나
├── expert-da.md                # Data Architect 페르소나
└── expert-qa.md                # Quality Assurance 페르소나

.claude/skills/ax-bd-shaping/references/
├── six-hats-protocol.md        # Six Hats 토론 프로토콜
└── expert-review-guide.md      # 전문가 리뷰 가이드 + 5종 Rubric
```

### 기존 파일 수정 (2개)

```
.claude/skills/ax-bd-shaping/SKILL.md         # Step 4 (Phase D) + Step 5 (Phase E) 추가
.claude/agents/shaping-orchestrator.md         # Phase D/E 트리거 + 회귀 로직
```

### 기존 코드 수정 없음

- Sprint 111은 **스킬/에이전트만** 생성/수정 → API/Web/DB 변경 없음
- D1 마이그레이션 (shaping_six_hats, shaping_expert_reviews)은 Sprint 112(F287) 범위

### Sprint 106과의 충돌 영역

| Sprint 106 (F277) | Sprint 111 (F284+F285) | 충돌 |
|--------------------|------------------------|------|
| `.claude/skills/` (CAPTURED 엔진) | `.claude/skills/ax-bd-shaping/` | ❌ 없음 (별도 스킬) |
| `.claude/agents/` (CAPTURED 에이전트) | `.claude/agents/six-hats-*.md, expert-*.md` | ❌ 없음 (별도 파일) |

## 테스트 전략

Sprint 111은 스킬/에이전트 파일만 생성/수정하므로 **API 테스트는 없음**.

검증 방식:
1. **에이전트 구문 검증** — frontmatter (name, description, model, tools, color) 유효성
2. **참조 파일 존재** — SKILL.md에서 참조하는 references/ 파일 전수 확인
3. **SKILL.md 흐름 검증** — Step 0~5 전체 오케스트레이션 정합성
4. **E2E 수동 테스트** — Phase C 완료 후 D→E 파이프라인 실행 (데모 데이터 활용)

## 성공 기준

| 기준 | 목표 |
|------|------|
| 파일 생성 | 에이전트 6종 + 참조 2종 = 8개 신규 |
| 파일 수정 | SKILL.md + shaping-orchestrator.md = 2개 |
| Phase D | 3모델 교차 검토 → 합의 매트릭스 → Six Hats 토론 정상 실행 |
| Phase E | 5종 전문가 병렬 리뷰 → 교차 영향 분석 → 통합 리뷰 보고서 |
| Gap Analysis Match Rate | ≥ 90% |

## 구현 순서

1. 참조 파일 2개 생성 (six-hats-protocol.md, expert-review-guide.md)
2. six-hats-moderator 에이전트 생성
3. expert-{ta,aa,ca,da,qa} 에이전트 5종 생성
4. SKILL.md Step 4 (Phase D) 추가
5. SKILL.md Step 5 (Phase E) 추가
6. shaping-orchestrator.md Phase D/E 트리거 + 회귀 로직 확장
7. 전체 흐름 검증
