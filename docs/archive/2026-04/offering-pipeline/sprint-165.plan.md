---
code: FX-PLAN-S165
title: "Sprint 165: Foundation — Skill 등록 + 디자인 토큰"
version: 1.0
status: Active
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
feature: sprint-165
phase: "[[FX-PLAN-018]]"
sprint: 165
f_items: [F363, F364, F365, F366]
---

## 1. 개요

Phase 18 Offering Pipeline의 첫 Sprint. 형상화(3단계) 스킬의 기반을 구축한다.
코드(API/Web) 변경 없이 `.claude/skills/` 인프라 + Skill Registry 연동에 집중한다.

### 1.1 F-item 범위

| F# | 제목 | REQ | P | 비고 |
|----|------|-----|---|------|
| F363 | offering-html SKILL.md 등록 + ax-bd/shape/ 디렉토리 + INDEX.md | FX-REQ-355 | P0 | |
| F364 | HTML 템플릿 분리 — base.html + 17종 컴포넌트 + examples/KOAMI | FX-REQ-356 | P0 | |
| F365 | 디자인 토큰 Phase 1 — design-tokens.md | FX-REQ-357 | P1 | |
| F366 | F275 Skill Registry 연동 — evolution: DERIVED 선언 | FX-REQ-358 | P1 | F363 선행 |

### 1.2 변경 영역

```
.claude/skills/ax-bd/shape/           # 🆕 신규 디렉토리 트리
├── INDEX.md                           # F363
├── offering-html/
│   ├── SKILL.md                       # F363
│   ├── design-tokens.md               # F365
│   ├── templates/
│   │   ├── base.html                  # F364
│   │   └── components/               # F364 (17종)
│   └── examples/
│       └── KOAMI_v0.5.html            # F364
├── offering-pptx/                     # F363 (stub만)
│   └── SKILL.md                       # stub
└── prototype-builder/                 # F363 (stub만)
    └── SKILL.md                       # stub

packages/api/src/                      # F366 (기존 API 활용)
└── (기존 skill-registry routes/services 활용 — 신규 파일 없음)
```

---

## 2. 구현 계획

### Phase A: 디렉토리 구조 + SKILL.md (F363)

1. `.claude/skills/ax-bd/shape/` 디렉토리 생성
2. `INDEX.md` 작성 — 형상화 Stage 오케스트레이터 + I/O 스키마
3. `offering-html/SKILL.md` 작성 — 사업기획서 Skill v0.5 → SKILL.md 변환
   - frontmatter: name, domain, stage, version, input_schema, output_schema, upstream, downstream, agent, evolution
   - When / How / Output Format / Examples 4섹션
4. `offering-pptx/SKILL.md` stub 생성 (Sprint 166 F367에서 본구현)
5. `prototype-builder/SKILL.md` stub 생성 (Phase 16 연동 참조)

### Phase B: HTML 템플릿 분리 (F364)

1. KOAMI v0.5 HTML에서 CSS 디자인 시스템 → `base.html` 추출
   - `:root` CSS variables + 공통 스타일 + nav + footer + IntersectionObserver JS
2. 17종 컴포넌트를 `templates/components/` 개별 파일로 분리
   - 각 컴포넌트: 재사용 가능한 HTML snippet + 필요 CSS
   - 목록: nav, hero, section-header, kpi-card, compare-grid, ba-grid, silo-grid, trend-grid, scenario-card, step-block, flow-diagram, impact-list, option-card, vuln-list, roadmap-track, bottom-note, cta
3. `examples/KOAMI_v0.5.html` — 실제 KOAMI 사업기획서 전문 (참조 구현체)

### Phase C: 디자인 토큰 Phase 1 (F365)

1. KOAMI v0.5 CSS에서 토큰 추출 → `design-tokens.md` 작성
2. 3카테고리: color (10종) + typography (6종) + layout (4종)
3. 토큰-CSS variable 매핑 테이블
4. 향후 Phase 2(JSON)/Phase 3(Web Editor) 승격 경로 명시

### Phase D: Skill Registry 연동 (F366)

1. 기존 Skill Registry API(`POST /api/skills`) 활용
2. offering-html 스킬 등록 — evolution: DERIVED 선언
3. API 테스트 작성 — offering-html Registry 등록/조회 검증

---

## 3. 의존성

| 의존 대상 | F-item | 유형 |
|----------|--------|------|
| 사업기획서 Skill v0.5 | F363 | Input (MD 문서) |
| KOAMI Template v0.5 | F364 | Input (HTML 구현체) |
| FX-Skill-Agent-Architecture v2.1 | F363 | 아키텍처 규격 |
| Skill Registry (F275, Sprint 104) | F366 | 기존 인프라 |

## 4. 리스크

| # | 리스크 | 대응 |
|---|--------|------|
| R1 | KOAMI HTML이 현재 리포에 없음 (docs/specs/GIVC/ 에만 v0.1/v0.2 존재) | v0.5 기준 사업기획서 Skill MD에서 컴포넌트 사양 추출 |
| R2 | 17종 컴포넌트 분리 기준 모호 | Design 문서의 2.1 디렉토리 구조 기준 준수 |

## 5. 완료 기준

- [ ] `.claude/skills/ax-bd/shape/` 디렉토리 트리 완성 (INDEX.md + 3 skill dirs)
- [ ] `offering-html/SKILL.md` SKILL.md 표준 구조 준수 (frontmatter + 4섹션)
- [ ] `templates/base.html` + `components/` 17종 개별 파일 존재
- [ ] `examples/KOAMI_v0.5.html` 실제 HTML 완본 존재
- [ ] `design-tokens.md` 20+ 토큰 문서화
- [ ] Skill Registry에 offering-html 등록 API 테스트 PASS
- [ ] typecheck / lint PASS
