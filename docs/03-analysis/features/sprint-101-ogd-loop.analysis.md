---
code: FX-ANLS-OGD-001
title: Sprint 101 O-G-D Agent Loop — Gap Analysis
version: "1.0"
status: Active
category: ANLS
created: 2026-04-02
updated: 2026-04-02
author: gap-detector
feature: F270~F272
match-rate: 95
---

# Sprint 101 O-G-D Agent Loop — Gap Analysis Report

> **Analysis Type**: PRD vs Implementation Gap Analysis
> **Project**: Foundry-X | **Date**: 2026-04-02
> **PRD**: `docs/specs/harness-gan/prd-ogd-loop.md` (v1.1)
> **Analyst**: gap-detector

---

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F270~F272 O-G-D Agent Loop (Sprint 101) |
| Match Rate | **95%** |
| Must-Have | 11/11 = **100%** |
| Should-Have | 4/5 = **80%** (R-08은 Sprint 102 계획적 연기) |
| 파일 구조 | 13/14 = **93%** |
| 초과 구현 | 3건 (모두 Positive) |

### Value Delivered (4-perspective)

| 관점 | 내용 |
|------|------|
| **Problem** | BD 발굴 보고서의 품질 검증이 수동적이고 주관적 → 체계적 품질 게이트 부재 |
| **Solution** | GAN 적대적 루프(O-G-D)를 Claude Code 에이전트로 구현하여 자동 품질 검증 |
| **Function UX Effect** | Generator가 보고서 생성 → Discriminator가 Rubric 기반 교차 검증 → 자동 수렴 (0.82→0.89) |
| **Core Value** | BD 보고서 품질 점수 +8.5% 자동 향상 + SAM 예산 오류 같은 Critical 결함 자동 탐지 |

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Must-Have Match (11개) | **100%** | ✅ |
| Should-Have Match (5개) | **80%** | ✅ |
| File Structure (14개) | **93%** | ⚠️ |
| Demo Criteria (7개) | **71%** | ⚠️ |
| **Overall** | **95%** | ✅ |

---

## Must-Have 요구사항 대조 (11/11 = 100%)

| ID | 요구사항 | 일치 | 핵심 근거 |
|----|---------|:----:|----------|
| R-01 | O-G-D 루프 프레임워크 | ✅ | O→G→D→피드백 전체 흐름 + 실행 2라운드 수렴 |
| R-02 | MAX_ROUNDS 설정 (기본 2) | ✅ | 범위 1~5, 기본 2. state.yaml `max_rounds: 2` |
| R-03 | 모델 선택 가능 | ✅ | O=opus, G/D=sonnet frontmatter |
| R-04 | _workspace/ 파일 기반 통신 | ✅ | round-{N}/ + .gitignore 등록 |
| R-05 | Discriminator YAML 피드백 | ✅ | verdict + quality_score + findings[] 완전 일치 |
| R-06 | 수렴 판정 로직 | ✅ | PASS/MINOR_FIX/MAJOR_ISSUE + FORCED_STOP |
| R-07 | BD 발굴 Rubric 7항목 | ✅ | R1~R7 + 가중치 + 5단계 채점 가이드 |
| R-09 | 품질 보고서 (Markdown+YAML) | ✅ | 라운드 변화 + 항목별 점수 + 잔여 이슈 |
| R-13 | 피드백 우선순위 규정 | ✅ | Critical>Major>Minor>Suggestion + 모순 에스컬레이션 |
| R-14 | 에러 핸들링 프로토콜 | ✅ | 4가지 시나리오 커버 |
| R-15 | 상태 관리 (ogd-state.yaml) | ✅ | PRD 스키마 일치 + converged 상태 |

## Should-Have 요구사항 대조 (4/5 = 80%)

| ID | 요구사항 | 일치 | 근거 |
|----|---------|:----:|------|
| R-08 | v8.2 통합 | ⏳ | Sprint 102 계획적 연기 |
| R-10 | Mode Collapse 감지 | ✅ | 3중 감지 (점수 정체/피드백 반복/구조 유사도) |
| R-11 | Quality Regression 방지 | ✅ | best_score 추적 + rollback_and_refine |
| R-12 | Rubric 진화 | ✅ | 가중치 동적 조정 + normalize |
| R-16 | 산업 템플릿 오버라이드 | ✅ | 3개 템플릿 (규제/기술/유통) |

## 데모 성공 기준 vs 실측

| 기준 | 목표 | 실측 | 판정 |
|------|------|------|:----:|
| 루프 정상 동작 | Round 0→N→수렴 | 0→1→CONVERGED | ✅ |
| 품질 점수 향상 | >= +0.15 | +0.07 (시작 0.82 고점) | ⚠️ |
| 피드백 구체성 | 100% recommendation | 11/11 | ✅ |
| 라운드 이력 추적 | round-N/ + state | 정상 | ✅ |
| 실행 시간 | <= 7분 | ~45분 (WebSearch 집약적) | ⚠️ |
| 에러 복구 | 자동 복구 | 에러 0건 | — |
| 보고서 가독성 | BD 담당자 가독 | 한글+표+변화추적 | ✅ |

## 초과 구현 (3건, Positive)

| 항목 | 설명 |
|------|------|
| `prev_feedback_addressed` | 이전 피드백 해소 여부 YAML 추적 |
| `rubric_version` | Rubric 버전 명시 |
| 프로세스 메트릭 | 에이전트 호출/WebSearch/Mode Collapse 추적 |

## Recommended Actions (Sprint 102)

1. R-08 v8.2 통합 — SKILL.md O-G-D 품질 게이트 섹션 + 2-5 Commit Gate 연결
2. 실행 시간 최적화 — WebSearch 횟수 제한 또는 캐싱
3. PRD v1.2 — 초과 구현 필드 정규화 + 데모 기준 현실화
