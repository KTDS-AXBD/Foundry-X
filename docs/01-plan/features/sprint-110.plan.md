---
code: FX-PLAN-S110
title: "Sprint 110 — F282+F283 BD 형상화 Phase A+B+C"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-274]], [[FX-REQ-275]], [[FX-BD-SHAPING-001]]"
---

# Sprint 110: F282+F283 BD 형상화 Phase A+B+C

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F282: BD 형상화 Phase A — 입력 점검 & 갭 분석 / F283: Phase B+C — req-interview 연동 + O-G-D 형상화 루프 |
| Sprint | 110 |
| 우선순위 | P0 (F282, F283 모두) |
| 의존성 | 없음 (Sprint 108 BD 데모 시딩과 **병렬 가능**, 파일 충돌 0%) |
| Design | docs/02-design/features/sprint-110.design.md |
| PRD | docs/specs/prd-shaping-v1.md (6 Phase 파이프라인) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 2단계 발굴 산출물 → 3단계 형상화가 수동으로 이루어져 반복 검토-수정이 비효율적 |
| Solution | ax-bd-shaping 스킬 + 입력 점검 체크리스트 + req-interview 연동 + O-G-D 형상화 루프 (3 에이전트) |
| Function UX Effect | `/ax:ax-bd-shaping` 한 번 호출로 2단계 PRD → 3단계 PRD 자동 생성 |
| Core Value | BD 형상화 파이프라인의 핵심 엔진 구축 → Sprint 111(D+E) / Sprint 112(F) 전제 조건 |

## 구현 범위

### F282: Phase A — 입력 점검 & 갭 분석

#### 1. ax-bd-shaping 스킬 메인 (SKILL.md)

- `.claude/skills/ax-bd-shaping/SKILL.md` — 형상화 파이프라인 진입점
- 사용자로부터 2단계 발굴 산출물 경로를 입력받아 Phase A → B → C 순차 실행
- 산출물은 `_workspace/shaping/{run-id}/` 디렉토리에 저장 (세션 종료 시 `docs/shaping/`으로 이동)

#### 2. Phase A 입력 점검 체크리스트

PRD §3.1 기반 10항목 체크리스트:

| # | 카테고리 | 항목 | 필수/선택 |
|---|----------|------|-----------|
| 1 | 시장 | 타겟 시장 정의 + TAM/SAM/SOM | 필수 |
| 2 | 시장 | 경쟁사 분석 (3사 이상) | 필수 |
| 3 | 고객 | 페르소나 정의 (1개 이상) | 필수 |
| 4 | 고객 | Pain Point + Jobs-to-be-Done | 필수 |
| 5 | 가치 | Value Proposition 명시 | 필수 |
| 6 | 가치 | BMC 캔버스 (9블록 완성) | 필수 |
| 7 | 기술 | 핵심 기술 요소 식별 | 필수 |
| 8 | 기술 | 기술 실현가능성 초기 판단 | 선택 |
| 9 | 수익 | 수익 모델 초안 | 선택 |
| 10 | 리스크 | 주요 리스크 식별 (3개 이상) | 선택 |

#### 3. 갭 분석 보고서 생성

- 각 항목에 대해 존재 여부 + 품질 점수 (0~1.0) 산정
- 필수 항목 충족률 → 80% 이상이면 Phase B 진행, 50% 미만이면 반려
- 갭 처리 전략:
  - 필수 항목 누락 → Phase B 인터뷰에서 보강 질문 포함
  - 선택 항목 누락 → Phase C Generator가 자동 보강
- 산출물: `_workspace/shaping/{run-id}/phase-a-gap-report.md`

### F283: Phase B+C — req-interview 연동 + O-G-D 형상화 루프

#### 4. Phase B — req-interview 연동

- 기존 `/ax:req-interview` 스킬을 프로그래매틱 호출
- Phase A 갭 분석 결과를 컨텍스트로 주입하여 갭 항목 중심 인터뷰 유도
- 인터뷰 결과를 구조화된 YAML/JSON으로 저장:
  - `business_requirements[]` — 사업 요구사항
  - `technical_constraints[]` — 기술 제약사항
  - `success_criteria[]` — 성공 기준
  - `open_questions[]` — 미해결 질문 (Phase C Generator가 가정 기반 처리)
- 산출물: `_workspace/shaping/{run-id}/phase-b-interview.md`

#### 5. Phase C — O-G-D 형상화 루프

기존 O-G-D 패턴을 형상화 도메인에 특화:

**신규 에이전트 3종:**

| 에이전트 | 파일 | 역할 |
|----------|------|------|
| shaping-orchestrator | `.claude/agents/shaping-orchestrator.md` | 형상화 루프 조율 — Rubric 로드, 수렴 판정, Phase C↔D↔E 회귀 관리 |
| shaping-generator | `.claude/agents/shaping-generator.md` | 3단계 PRD 전체 생성 — 아키텍처, 기능 명세, NFR, 마일스톤, 리스크 매트릭스 |
| shaping-discriminator | `.claude/agents/shaping-discriminator.md` | 품질 검증 + 리스크 경고 — Rubric 기반 5차원 평가 + 결함 분류 |

**Rubric 5차원:**

| 차원 | 가중치 | 평가 기준 |
|------|--------|-----------|
| 사업 타당성 | 0.25 | 시장 규모 근거, 경쟁 우위, 수익 모델 구체성 |
| 기술 실현성 | 0.25 | 아키텍처 완성도, 기술 스택 적합성, PoC 가능성 |
| 요구사항 추적성 | 0.20 | BR→Feature 매핑, TC→아키텍처 반영, SC→KPI 연결 |
| 리스크 커버리지 | 0.15 | 기술/시장/조직 리스크 식별, 완화 전략 구체성 |
| 문서 완성도 | 0.15 | 섹션 완전성, 용어 일관성, 참조 무결성 |

**수렴 조건:** Quality Score ≥ 0.85, Critical 결함 0건, max_rounds=3

**산출물:**
- `_workspace/shaping/{run-id}/phase-c-prd-v{N}.md` — 각 라운드별 PRD
- `_workspace/shaping/{run-id}/phase-c-rubric-scores.yaml` — 라운드별 Rubric 점수
- `_workspace/shaping/{run-id}/phase-c-final.md` — 수렴된 최종 PRD

#### 6. 참조 파일

| 파일 | 용도 |
|------|------|
| `.claude/skills/ax-bd-shaping/references/rubric-shaping.md` | 형상화 전용 Rubric 정의 |
| `.claude/skills/ax-bd-shaping/references/checklist-phase-a.md` | Phase A 점검 체크리스트 상세 |
| `.claude/skills/ax-bd-shaping/references/interview-context-template.md` | Phase B 인터뷰 컨텍스트 주입 템플릿 |

## 파일 변경 예상

### 신규 생성 (14개)

```
.claude/agents/
├── shaping-orchestrator.md      # 형상화 O-G-D 조율자
├── shaping-generator.md         # 3단계 PRD 생성자
└── shaping-discriminator.md     # 품질 검증 + 리스크 경고

.claude/skills/ax-bd-shaping/
├── SKILL.md                     # 형상화 스킬 메인 (Phase A→B→C 오케스트레이션)
└── references/
    ├── rubric-shaping.md        # 형상화 전용 Rubric 5차원
    ├── checklist-phase-a.md     # Phase A 입력 점검 체크리스트 상세
    └── interview-context-template.md  # Phase B 인터뷰 컨텍스트 템플릿
```

### 기존 파일 수정 (0개)

- Sprint 110은 **스킬/에이전트만 신규 생성** → 기존 코드 수정 없음
- D1 마이그레이션, API 엔드포인트, Web 페이지는 Sprint 112(F287) 범위

### Sprint 108과의 충돌 영역

| Sprint 108 (F279+F280) | Sprint 110 (F282+F283) | 충돌 |
|------------------------|------------------------|------|
| `packages/api/src/services/seed-*.ts` | `.claude/agents/shaping-*.md` | ❌ 없음 |
| `packages/api/src/routes/demo-*.ts` | `.claude/skills/ax-bd-shaping/` | ❌ 없음 |
| `packages/api/src/db/migrations/` | 없음 | ❌ 없음 |

## 테스트 전략

Sprint 110은 스킬/에이전트 파일만 생성하므로 **API 테스트는 없음**.

검증 방식:
1. **스킬 구문 검증** — SKILL.md frontmatter 유효성 + 참조 파일 존재
2. **에이전트 구문 검증** — 에이전트 MD frontmatter (name, description, model, tools) 유효성
3. **E2E 수동 테스트** — 실제 2단계 발굴 산출물을 입력으로 Phase A→B→C 실행 (데모 데이터 활용)
4. **Rubric 점수 수렴 확인** — O-G-D 루프 실행 후 Quality Score ≥ 0.85 달성 여부

## 성공 기준

| 기준 | 목표 |
|------|------|
| 파일 생성 | 에이전트 3종 + 스킬 1종 + 참조 3종 = 7개 |
| Phase A | 10항목 체크리스트 → 갭 분석 보고서 정상 생성 |
| Phase B | req-interview 컨텍스트 주입 → 구조화된 인터뷰 결과 |
| Phase C | O-G-D 수렴 (Quality ≥ 0.85, max 3 rounds) |
| Gap Analysis Match Rate | ≥ 90% |
