---
code: FX-PLAN-018
title: "Phase 18: Offering Pipeline — AX BD 형상화 자동화"
version: 1.0
status: Active
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
feature: offering-pipeline
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | AX BD 6단계 중 3단계(형상화)가 수동 — 발굴 산출물에서 사업기획서로의 변환이 수작업이고, 기존 O-G-D 검증 인프라가 재활용되지 않음 |
| **Solution** | offering-html/pptx 스킬 + Offering Agent(shaping-orchestrator 확장) + Full-Stack UI(위자드/에디터/프리뷰) + 콘텐츠 어댑터 + discover→shape 자동 전환 파이프라인 |
| **Function UX Effect** | 발굴 완료 → 사업기획서 자동 생성(< 5분) → GAN 교차검증 → 전문가 리뷰 → 최종본, 목적별 톤 전환(보고/제안/검토), 디자인 커스터마이징 |
| **Core Value** | 기존 16 Agent + 16 Skill 재활용 극대화 — 신규 Agent 1종 확장만으로 형상화 전체 자동화 |

## 1. 배경 및 목표

### 1.1 배경
- Phase 17(Sprint 164)까지 발굴 자동화 완료: ax-bd-discovery v8.2 + ai-biz 11종 + O-G-D 3모드 + Six Hats + Expert 5인
- 사업기획서 Skill v0.5 + KOAMI Template v0.5가 MD/HTML로 존재하나 Foundry-X에 미통합
- FX-Skill-Agent-Architecture v2.1에서 통합 아키텍처 설계 완료
- Phase 16 Prototype Auto-Gen(F351~F356) 완료 — Offering→Prototype 연동 기반 확보

### 1.2 목표
- AX BD 형상화 3단계 **전체 파이프라인** 자동화
- HTML + PPTX 2종 포맷 지원
- 콘텐츠 어댑터: 보고용/제안용/검토용 3가지 톤 자동 전환
- 디자인 토큰 3단계 승격: MD → JSON → Web 실시간 에디터
- discover → shape 자동 전환 (EventBus F334 활용)
- Phase 16 Prototype Builder 연동

### 1.3 범위

**In Scope:**
- Skill: offering-html, offering-pptx, prototype-builder 연동
- Agent: ax-bd-offering-agent (shaping-orchestrator 확장)
- API: offerings CRUD + sections + export + validate + design-tokens
- Web: 목록/위자드/에디터/프리뷰/교차검증 대시보드/디자인 토큰 에디터
- Pipeline: discover → shape EventBus 연동
- 콘텐츠 어댑터: 3가지 톤 변환
- E2E: 발굴→형상화→검증 전체 경로 테스트

**Out of Scope:**
- 기존 스킬 물리 폴더 이동 (논리 매핑만)
- ax-bd-discovery v8.2 수정
- PDF 네이티브 렌더링 (HTML→PDF 브라우저 인쇄로 대체)

## 2. F-item 목록 (F363~F383)

### Phase 18-A: Foundation (Sprint 165~166)

| F# | 제목 | REQ | P | Sprint | 의존성 |
|----|------|-----|---|--------|--------|
| F363 | offering-html SKILL.md 등록 + ax-bd/shape/ 디렉토리 + INDEX.md | FX-REQ-355 | P0 | 165 | — |
| F364 | HTML 템플릿 분리 — base.html + 17종 컴포넌트 + examples/KOAMI | FX-REQ-356 | P0 | 165 | — |
| F365 | 디자인 토큰 Phase 1 — design-tokens.md (컬러/타이포/레이아웃) | FX-REQ-357 | P1 | 165 | — |
| F366 | F275 Skill Registry 연동 — evolution: DERIVED 선언 | FX-REQ-358 | P1 | 165 | F363 선행 |
| F367 | offering-pptx SKILL.md 등록 + Cowork 연동 설계 | FX-REQ-359 | P1 | 166 | — |
| F368 | ax-bd-offering-agent — shaping-orchestrator 확장, 6 capability | FX-REQ-360 | P0 | 166 | F363 선행 |

### Phase 18-B: Data Layer (Sprint 167~168)

| F# | 제목 | REQ | P | Sprint | 의존성 |
|----|------|-----|---|--------|--------|
| F369 | D1 마이그레이션 — offerings / offering_versions / offering_sections / offering_design_tokens | FX-REQ-361 | P0 | 167 | — |
| F370 | Offerings CRUD API — POST/GET/PUT/DELETE + Zod 스키마 + 서비스 | FX-REQ-362 | P0 | 167 | F369 선행 |
| F371 | Offering Sections API — 18섹션 CRUD + 필수/선택 토글 | FX-REQ-363 | P0 | 167 | F369 선행 |
| F372 | Offering Export API — HTML/PDF export, base.html + 컴포넌트 렌더링 | FX-REQ-364 | P0 | 168 | F364, F370 선행 |
| F373 | Offering Validate API — O-G-D Loop(F335) + Six Hats + Expert 호출 | FX-REQ-365 | P0 | 168 | F368, F370 선행 |

### Phase 18-C: Full UI (Sprint 169~170)

| F# | 제목 | REQ | P | Sprint | 의존성 |
|----|------|-----|---|--------|--------|
| F374 | Offerings 목록 페이지 — Kanban 뷰, 상태 필터, 버전 히스토리 | FX-REQ-366 | P0 | 169 | F370 선행 |
| F375 | Offering 생성 위자드 — 발굴 연결 + 목적/포맷/목차 선택 | FX-REQ-367 | P0 | 169 | F370 선행 |
| F376 | 섹션 에디터 + HTML 프리뷰 — 실시간 프리뷰, 섹션별 편집 | FX-REQ-368 | P0 | 170 | F371, F372 선행 |
| F377 | 교차검증 대시보드 — GAN 추진론/반대론 + Six Hats + Expert 시각화 | FX-REQ-369 | P1 | 170 | F373 선행 |

### Phase 18-D: Integration (Sprint 171~172)

| F# | 제목 | REQ | P | Sprint | 의존성 |
|----|------|-----|---|--------|--------|
| F378 | 콘텐츠 어댑터 — 3가지 톤 변환 (executive/technical/critical) + UI | FX-REQ-370 | P0 | 171 | F370 선행 |
| F379 | discover → shape 자동 전환 — EventBus(F334) 이벤트 발행/소비 | FX-REQ-371 | P0 | 171 | F370 선행 |
| F380 | offering-pptx 구현 — PPTX 생성 엔진 + 표준 목차 슬라이드 변환 | FX-REQ-372 | P1 | 172 | F367 선행 |

### Phase 18-E: Polish (Sprint 173~174)

| F# | 제목 | REQ | P | Sprint | 의존성 |
|----|------|-----|---|--------|--------|
| F381 | 디자인 토큰 Phase 2+3 — JSON 정규 + API + Web 실시간 에디터 | FX-REQ-373 | P1 | 173 | F365, F376 선행 |
| F382 | prototype-builder 연동 — Offering→Phase 16 Builder 자동 호출 | FX-REQ-374 | P1 | 173 | F372 선행 |
| F383 | E2E 파이프라인 테스트 + BD ROI 메트릭 수집 (F274+F278) | FX-REQ-375 | P1 | 174 | 전체 선행 |

## 3. Sprint 로드맵

```
Phase 18-A: Foundation          Phase 18-B: Data Layer
Sprint 165 ─── Sprint 166      Sprint 167 ─── Sprint 168
F363 SKILL.md   F367 PPTX      F369 D1        F372 Export
F364 Template   F368 Agent     F370 CRUD      F373 Validate
F365 Tokens MD                 F371 Sections
F366 Registry

Phase 18-C: Full UI             Phase 18-D: Integration
Sprint 169 ─── Sprint 170      Sprint 171 ─── Sprint 172
F374 목록       F376 에디터     F378 어댑터    F380 PPTX 구현
F375 위자드     F377 검증대시   F379 파이프라인

Phase 18-E: Polish
Sprint 173 ─── Sprint 174
F381 토큰 에디터  F383 E2E + 메트릭
F382 Prototype
```

### 3.1 배치 구성 (병렬 Sprint)

| 배치 | Sprint | 병렬 후보 | 충돌 영역 |
|------|--------|----------|----------|
| 1 | 165+166 | F363~F365 ↔ F367 병렬 가능 | `.claude/skills/` (독립 디렉토리) → 안전 |
| 2 | 167+168 | F369~F371 순차, F372+F373 병렬 | `packages/api/src/routes/` (독립 파일) → 안전 |
| 3 | 169+170 | F374+F375 병렬, F376+F377 병렬 | `packages/web/src/routes/` (독립 페이지) → 안전 |
| 4 | 171+172 | F378+F379 병렬, F380 독립 | EventBus 연동(F379)만 주의 |
| 5 | 173+174 | F381+F382 병렬, F383 마지막 | F383은 전체 의존 → 단독 |

### 3.2 D1 마이그레이션 계획

```sql
-- 0110_offerings.sql
CREATE TABLE offerings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  discovery_item_id TEXT REFERENCES discovery_items(id),
  title TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'report',   -- report | proposal | review
  format TEXT NOT NULL DEFAULT 'html',       -- html | pptx
  status TEXT NOT NULL DEFAULT 'draft',      -- draft | reviewing | validated | final
  version TEXT NOT NULL DEFAULT 'v0.1',
  design_token_override TEXT,                -- JSON
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 0111_offering_versions.sql
CREATE TABLE offering_versions (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL REFERENCES offerings(id),
  version TEXT NOT NULL,
  snapshot TEXT NOT NULL,  -- JSON: 전체 섹션 스냅샷
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 0112_offering_sections.sql
CREATE TABLE offering_sections (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL REFERENCES offerings(id),
  section_key TEXT NOT NULL,    -- hero, exec-summary, background, ...
  title TEXT NOT NULL,
  content TEXT,                 -- Markdown/HTML
  sort_order INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 0113_offering_design_tokens.sql
CREATE TABLE offering_design_tokens (
  id TEXT PRIMARY KEY,
  offering_id TEXT REFERENCES offerings(id),
  name TEXT NOT NULL,            -- 'default' | 'koami-brand' | ...
  tokens TEXT NOT NULL,          -- JSON: DesignTokens schema
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

## 4. 기존 인프라 활용 맵

| 기존 자산 (Phase/F-item) | Phase 18 활용 | 연결 F-item |
|--------------------------|--------------|------------|
| shaping-orchestrator (P14 F333) | Offering Agent 확장 기반 | F368 |
| ogd-orchestrator/generator/discriminator (P14 F335) | Offering 교차검증 O-G-D 호출 | F373 |
| six-hats-moderator (P10 F282) | Offering 6색 모자 토론 | F373, F377 |
| expert-ta~qa 5종 (P10 F282) | Offering 전문가 리뷰 | F373, F377 |
| EventBus (P14 F334) | discover→shape 자동 전환 이벤트 | F379 |
| Kanban Dashboard (P14 F337) | Offerings 목록 뷰 패턴 | F374 |
| Orchestration Loop (P14 F335) | Validate API | F373 |
| Skill Registry (P10 F275) | offering-html/pptx 등록 | F366 |
| BD ROI Metrics (P10 F278) | Offering 생성 비용 메트릭 | F383 |
| Prototype Builder (P16 F351~F356) | Offering→Prototype 연동 | F382 |
| Agent Adapter + Registry (P14 F336) | Offering Agent YAML 태깅 | F368 |

## 5. 리스크 및 대응

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R1 | PPTX 생성 엔진 선택 불확실 | 🟡 중간 | Sprint 166(F367)에서 pptxgenjs vs python-pptx 평가, Sprint 172(F380)에서 구현 |
| R2 | 콘텐츠 어댑터 톤 변환 품질 | 🟡 중간 | O-G-D Loop + few-shot 예시 + ConvergenceCriteria(≥0.85) |
| R3 | 10 Sprint 범위 과다 (21 F-items) | 🟢 낮음 | Sprint당 2~3 F-item, P1은 후순위 조정 가능 |
| R4 | 디자인 토큰 Phase 3 실시간 에디터 복잡도 | 🟡 중간 | CSS Variables + iframe 격리로 단순화 |
| R5 | D1 마이그레이션 4개 동시 추가 | 🟢 낮음 | Sprint 167 단일 Sprint에서 순차 적용 |

## 6. 성공 지표

| 지표 | 목표 | 측정 |
|------|------|------|
| Offering 생성 시간 | < 5분/건 (HTML) | execution_events |
| O-G-D 재활용 성공 | 100% 호출 성공 | Agent 로그 |
| 포맷 커버리지 | HTML + PPTX (2종) | Skill Registry |
| 톤 변환 | 3가지 모두 생성 | E2E 테스트 |
| 파이프라인 자동화 | discover→shape 100% 자동 | EventBus 로그 |
| 디자인 커스텀 | ≥ 1건 고객별 적용 | offerings 테이블 |
| 검증 자동화 | GAN+SixHats+Expert 모두 자동 | Agent 호출 로그 |
| E2E 커버리지 | 발굴→형상화→검증 전체 경로 | Playwright |

## 7. 참조 문서

| 문서 | 경로 |
|------|------|
| Skill & Agent Architecture v2.1 | `docs/specs/FX-Skill-Agent-Architecture/FX-Skill-Agent-Architecture-v2.md` |
| Offering Pipeline PRD | `docs/specs/fx-offering-pipeline/prd-final.md` |
| 사업기획서 Skill v0.5 | `docs/specs/FX-Skill-Agent-Architecture/AX_BD팀_사업기획서_Skill_v0.5_260404.md` |
| KOAMI Template v0.5 | `docs/specs/FX-Skill-Agent-Architecture/03_AX Discovery_사업기획서_KOAMI_v0.5_260404.html` |
| self-evolving-harness-strategy v3.0 | `docs/specs/self-evolving-harness-strategy.md` |
| Prototype Auto-Gen PRD | `docs/specs/prototype-auto-gen/prd-final.md` |
