---
code: FX-PLAN-S102
title: "Sprint 102 — ax-bd-discovery v8.2 O-G-D 통합"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-265]]"
---

# Sprint 102: ax-bd-discovery v8.2 O-G-D 통합

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F273 — ax-bd-discovery v8.2 O-G-D 통합 |
| Sprint | 102 |
| 우선순위 | P1 |
| 의존성 | F270~F272 선행 (Sprint 101 완료, O-G-D Agent Loop) |
| Design | docs/02-design/features/sprint-102.design.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | O-G-D 에이전트 3종이 독립적으로 존재하나 BD 발굴 프로세스와 미연결 — 팀원이 2-5 Commit Gate 등에서 품질 보증 루프를 수동으로 구성해야 함 |
| Solution | SKILL.md에 O-G-D 트리거 가이드 통합 + references/에 단계별 Rubric 커스터마이징 문서 추가 |
| Function UX Effect | 2-5 Commit Gate에서 `/ogd-orchestrator` 자동 안내, 2-3/2-7에서 선택적 품질 검증 |
| Core Value | BD 발굴 산출물 품질 일관성 확보 — "사람이 검증"에서 "AI 적대적 루프가 검증 + 사람이 확인"으로 전환 |

## 배경

Sprint 101(F270~F272)에서 O-G-D(Orchestrator-Generator-Discriminator) Agent Loop를 완성했어요:
- **ogd-orchestrator**: GAN Training Loop 조율자 (Opus)
- **ogd-generator**: Rubric 기반 BD 산출물 생성자 (Sonnet)
- **ogd-discriminator**: 적대적 품질 판별자 (Sonnet)
- **Rubric v1.1**: 7항목(R1~R7) 가중치 채점 기준
- **GIVC chatGIVC 데모**: 0.82→0.89 CONVERGED, Match 95%

이번 Sprint에서는 이 O-G-D 루프를 ax-bd-discovery 스킬(v8.2)의 특정 단계에 "접합(seam)"해요.

## 작업 목록

### 1. SKILL.md 수정 — O-G-D 통합 섹션 추가

| # | 변경 | 설명 |
|---|------|------|
| 1-1 | §O-G-D 통합 섹션 신설 | "사업성 판단 체크포인트 종합" 뒤에 O-G-D 품질 검증 가이드 추가 |
| 1-2 | 2-5 Commit Gate 강화 | 기존 4질문 + O-G-D 루프 필수 트리거 안내 |
| 1-3 | 2-3/2-7 선택적 연동 | 경쟁·자사 분석(2-3), BM 정의(2-7)에서 O-G-D 선택적 사용 안내 |
| 1-4 | Gotchas 갱신 | O-G-D 관련 주의사항 추가 |

### 2. references/ 추가 — 단계별 O-G-D 가이드

| # | 파일 | 설명 |
|---|------|------|
| 2-1 | `references/ogd-commit-gate.md` | 2-5 Commit Gate 전용 O-G-D 실행 가이드 — Rubric 항목 매핑 + 트리거 조건 + 산출물 기대 형식 |
| 2-2 | `references/ogd-stage-rubrics.md` | 2-3/2-7 선택적 적용 시 Rubric 가중치 오버라이드 가이드 |

### 3. stages-detail.md 갱신

| # | 변경 | 설명 |
|---|------|------|
| 3-1 | 2-3 경쟁·자사 분석 | O-G-D 선택적 적용 안내 추가 (경쟁 분석 보고서 품질 검증) |
| 3-2 | 2-5 핵심 아이템 선정 | O-G-D 필수 트리거 + Commit Gate 연동 설명 추가 |
| 3-3 | 2-7 BM 정의 | O-G-D 선택적 적용 안내 추가 (BMC/수익 모델 검증) |

## 변경 파일 목록

| 파일 | 동작 | 변경 범위 |
|------|------|-----------|
| `.claude/skills/ax-bd-discovery/SKILL.md` | 수정 | O-G-D 통합 섹션 + 2-5/2-3/2-7 연동 + Gotchas |
| `.claude/skills/ax-bd-discovery/references/ogd-commit-gate.md` | 신규 | Commit Gate O-G-D 가이드 |
| `.claude/skills/ax-bd-discovery/references/ogd-stage-rubrics.md` | 신규 | 단계별 Rubric 오버라이드 |
| `.claude/skills/ax-bd-discovery/references/stages-detail.md` | 수정 | 2-3, 2-5, 2-7에 O-G-D 안내 추가 |

## 성공 기준

| 기준 | 목표 |
|------|------|
| SKILL.md O-G-D 섹션 | 2-5 필수 + 2-3/2-7 선택적 가이드 포함 |
| Commit Gate 가이드 | Rubric R1~R7 ↔ Commit Gate 4질문 매핑 완료 |
| 단계별 Rubric | 2-3/2-7 가중치 오버라이드 정의 완료 |
| stages-detail.md | 3개 단계에 O-G-D 안내 추가 |
| 기존 기능 무영향 | SKILL.md 기존 구조(2-0~2-7, 강도 매트릭스, 산출물 형식) 유지 |

## 비고

- 코드 변경 없음 (API/Web/CLI 수정 없음) — 스킬 문서만 변경
- O-G-D 에이전트 `.claude/agents/*.md` 자체는 수정하지 않음 (Sprint 101에서 완성)
- Rubric v1.1 (`references/ogd-rubric-bd.md`)은 그대로 유지, 단계별 오버라이드만 별도 문서화
