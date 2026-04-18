# Offering Pipeline PRD — Phase 18

> **문서코드:** FX-PLAN-018
> **버전:** 1.0
> **작성일:** 2026-04-06
> **기반 문서:** FX-Skill-Agent-Architecture v2.1, 사업기획서 Skill v0.5, KOAMI Template v0.5
> **Phase:** 18 — Offering Pipeline
> **Sprint 범위:** 165~174 (10개 Sprint)

---

## 1. 배경 및 목적

### 1-1. 현황

AX BD팀의 6단계 사업개발 프로세스 중 **1. 수집 → 2. 발굴**은 Foundry-X에서 이미 자동화되어 있다:
- `ax-bd-discovery` v8.2 (발굴 오케스트레이터)
- `ai-biz` 11종 (시장/고객/경쟁/재무 등 분석 스킬)
- `ogd-*` 3-agent (O-G-D 품질 루프)
- `shaping-*` 3-agent (형상화 O-G-D)
- `six-hats-moderator` + `expert-5` (교차검증)

그러나 **3. 형상화** 단계는 수동 작업에 의존한다:
- 발굴 산출물(DiscoveryPackage)에서 사업기획서로의 변환이 수작업
- 표준 포맷(HTML/PPTX)이 존재하나 스킬로 자동화되지 않음
- 기존 O-G-D 인프라가 형상화 품질 검증에 재활용되지 않음

### 1-2. 목적

Phase 18은 **형상화 단계의 전체 파이프라인을 자동화**한다:
1. 발굴 산출물 → 사업기획서(HTML/PPTX) 자동 생성 스킬
2. 목적별 톤 변환 (보고용/제안용/검토용) 콘텐츠 어댑터
3. 기존 O-G-D + Six Hats + Expert Agent 재활용 품질 검증
4. 프로토타입 빌더 연동 (Phase 16 F351~F356 기반)
5. 디자인 토큰 정규화 → 실시간 커스터마이징 Web 에디터
6. 발굴→형상화 자동 전환 파이프라인 (EventBus 활용)

### 1-3. 핵심 원칙

- **"만들지 말라 → 기존 기준과 정렬하라"** — 기존 16 Agent + 16 Skill 재활용 극대화
- **Phase 12 Skill Unification 존중** — 물리 이동 점진적, 논리 매핑 즉시
- **Git이 진실, Foundry-X는 렌즈** — 모든 Offering 이력은 Git에 존재

---

## 2. 요구사항 목록 (F363~F382)

### 2-1. Foundation — Skill 등록 + 디자인 토큰 (Sprint 165~166)

| F# | 요구사항 | REQ | P | Sprint |
|----|---------|-----|---|--------|
| F363 | offering-html SKILL.md 등록 — 사업기획서 Skill v0.5를 SKILL.md 표준 구조로 변환, `docs/specs/axbd/shape/` 디렉토리 생성, INDEX.md 작성 | FX-REQ-355 | P0 | 165 |
| F364 | HTML 템플릿 + 컴포넌트 분리 — KOAMI v0.5 HTML에서 base.html + 17종 컴포넌트 분리, examples/ 등록 | FX-REQ-356 | P0 | 165 |
| F365 | 디자인 토큰 Phase 1 (MD) — 컬러/타이포/레이아웃 토큰을 design-tokens.md로 문서화 | FX-REQ-357 | P1 | 165 |
| F366 | F275 Skill Registry 연동 — offering-html 스킬을 기존 Skill Registry에 등록, evolution 필드(DERIVED) 선언 | FX-REQ-358 | P1 | 165 |
| F367 | offering-pptx SKILL.md 등록 — PPT 사업기획서 스킬 정의, Cowork pptx 연동 구조 설계 | FX-REQ-359 | P1 | 166 |
| F368 | ax-bd-offering-agent 확장 — shaping-orchestrator 기반, 6가지 capability (format_selection, content_adapter, structure_crud, design_management, validate_orchestration, version_guide) | FX-REQ-360 | P0 | 166 |

### 2-2. API + D1 — Offerings 데이터 레이어 (Sprint 167~168)

| F# | 요구사항 | REQ | P | Sprint |
|----|---------|-----|---|--------|
| F369 | D1 마이그레이션 — offerings, offering_versions, offering_sections, offering_design_tokens 테이블 | FX-REQ-361 | P0 | 167 |
| F370 | Offerings CRUD API — POST/GET/PUT/DELETE + Zod 스키마 + 서비스 레이어 (기존 패턴 준수) | FX-REQ-362 | P0 | 167 |
| F371 | Offering Sections API — 18섹션 표준 목차 CRUD, 필수/선택 토글, 커스텀 목차 지원 | FX-REQ-363 | P0 | 167 |
| F372 | Offering Export API — GET /offerings/:id/export (HTML/PDF), base.html + 컴포넌트 조합 렌더링 | FX-REQ-364 | P0 | 168 |
| F373 | Offering Validate API — POST /offerings/:id/validate, 기존 O-G-D Loop(F335) 호출, GAN 교차검증 결과 저장 | FX-REQ-365 | P0 | 168 |

### 2-3. Web — Full UI (Sprint 169~170)

| F# | 요구사항 | REQ | P | Sprint |
|----|---------|-----|---|--------|
| F374 | Offerings 목록 페이지 — /app/offerings, Kanban 뷰(F337 패턴), 상태별 필터, 버전 히스토리 | FX-REQ-366 | P0 | 169 |
| F375 | Offering 생성 위자드 — /app/offerings/new, 발굴 아이템 연결 + 목적(보고/제안/검토) + 포맷(HTML/PPTX) + 목차 선택 | FX-REQ-367 | P0 | 169 |
| F376 | 섹션 에디터 + HTML 프리뷰 — /app/offerings/:id, 실시간 HTML 프리뷰, 섹션별 편집, 마크다운/리치텍스트 | FX-REQ-368 | P0 | 170 |
| F377 | 교차검증 대시보드 — GAN 추진론/반대론 시각화, Six Hats 결과, Expert 리뷰 결과 통합 표시 | FX-REQ-369 | P1 | 170 |

### 2-4. 콘텐츠 어댑터 + 파이프라인 통합 (Sprint 171~172)

| F# | 요구사항 | REQ | P | Sprint |
|----|---------|-----|---|--------|
| F378 | 콘텐츠 어댑터 — DiscoveryPackage에서 목적별 톤 자동 변환 (보고용: executive, 제안용: technical, 검토용: critical), UI 전환 지원 | FX-REQ-370 | P0 | 171 |
| F379 | discover → shape 자동 전환 파이프라인 — EventBus(F334) 활용, 발굴 완료 시 DiscoveryPackage → Offering 프리필 자동화 | FX-REQ-371 | P0 | 171 |
| F380 | offering-pptx 구현 — PPTX 생성 엔진, 사업기획서 표준 목차 PPTX 변환, 슬라이드 템플릿 | FX-REQ-372 | P1 | 172 |

### 2-5. Prototype 연동 + 디자인 토큰 고도화 + E2E (Sprint 173~174)

| F# | 요구사항 | REQ | P | Sprint |
|----|---------|-----|---|--------|
| F381 | 디자인 토큰 Phase 2+3 — JSON 정규 포맷 + API GET/PUT + Web 실시간 에디터 + CSS 커스터마이징 프리뷰 | FX-REQ-373 | P1 | 173 |
| F382 | prototype-builder 연동 — Offering 시나리오/데이터 → Phase 16 Builder 자동 호출, 프로토타입 대시보드 확장 | FX-REQ-374 | P1 | 173 |
| F383 | 발굴→형상화→검증 E2E 파이프라인 테스트 + Offering 메트릭 수집 (F274+F278 BD ROI 연동) | FX-REQ-375 | P1 | 174 |

---

## 3. Sprint 로드맵

### 3-1. Sprint 그룹 개요

```
Sprint 165~166: Foundation ──── Skill 등록 + Agent 확장 + 디자인 토큰 Phase 1
Sprint 167~168: Data Layer ──── D1 + API CRUD + Export + Validate
Sprint 169~170: Full UI ─────── 목록 + 위자드 + 에디터 + 교차검증 대시보드
Sprint 171~172: Integration ─── 콘텐츠 어댑터 + 파이프라인 + PPTX
Sprint 173~174: Polish ──────── 디자인 토큰 Phase 3 + Prototype + E2E + 메트릭
```

### 3-2. 의존성 그래프

```
F363 (SKILL.md) ──→ F366 (Registry) ──→ F368 (Agent)
F364 (Template) ──→ F372 (Export API)
F365 (Tokens MD) ──→ F381 (Tokens JSON+Web)
F367 (PPTX SKILL) ──→ F380 (PPTX 구현)
F368 (Agent) ──→ F373 (Validate API) ──→ F377 (검증 대시보드)
F369 (D1) ──→ F370 (CRUD) ──→ F371 (Sections) ──→ F374 (목록 UI)
F370 (CRUD) ──→ F375 (위자드) ──→ F376 (에디터)
F370 (CRUD) ──→ F378 (어댑터) ──→ F379 (파이프라인)
F376 (에디터) + F381 (토큰) → F383 (E2E)
F372 (Export) + F382 (Prototype) → F383 (E2E)
```

### 3-3. 배치 구성 (병렬 가능 Sprint)

| 배치 | Sprint | 병렬 가능 | 비고 |
|------|--------|----------|------|
| 1 | 165, 166 | ✅ F363~F365 병렬 가능, F366~F368은 F363 의존 | Foundation |
| 2 | 167, 168 | ✅ F369~F371 순차, F372~F373 병렬 | Data Layer |
| 3 | 169, 170 | ✅ F374~F375 병렬, F376~F377은 F375 의존 | Full UI |
| 4 | 171, 172 | ✅ F378~F379 병렬, F380 독립 | Integration |
| 5 | 173, 174 | ✅ F381~F382 병렬, F383 마지막 | Polish |

---

## 4. 기존 인프라 활용 맵

| 기존 자산 | Phase 18 활용 | F-item |
|----------|--------------|--------|
| shaping-orchestrator (Agent) | Offering Agent 확장 기반 | F368 |
| ogd-orchestrator/generator/discriminator | Offering 교차검증 | F373, F377 |
| six-hats-moderator | Offering 6색 모자 토론 | F373, F377 |
| expert-ta~qa (5종) | Offering 전문가 리뷰 | F373, F377 |
| EventBus (F334) | discover → shape 자동 전환 | F379 |
| Kanban Dashboard (F337) | Offerings 목록 뷰 패턴 | F374 |
| Orchestration Loop (F335) | Validate API | F373 |
| Skill Registry (F275) | offering-html 등록 | F366 |
| BD ROI (F278) | Offering 메트릭 | F383 |
| Prototype Builder (F351~F356) | Offering→Prototype 연동 | F382 |
| Agent Adapter (F336) | Offering Agent YAML 태깅 | F368 |

---

## 5. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| Offering 생성 시간 | < 5분/건 (HTML) | execution_events 집계 |
| O-G-D 재활용 성공 | 기존 O-G-D 100% 동작 | F335 Loop 호출 로그 |
| 포맷 커버리지 | HTML + PPTX (2종) | Skill Registry |
| 톤 변환 정확도 | 3가지 톤 모두 생성 가능 | E2E 테스트 |
| 파이프라인 자동화 | discover→shape 100% 자동 전환 | EventBus 이벤트 로그 |
| 디자인 커스텀 | ≥ 1건 고객별 토큰 적용 | offerings 테이블 |
| 검증 자동화율 | GAN + Six Hats + Expert 모두 자동 | Agent 호출 로그 |
| E2E 커버리지 | 발굴→형상화→검증 전체 경로 | Playwright |

---

## 6. 리스크

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R1 | PPTX 생성 엔진 선택 — 브라우저/Node.js에서 PPTX 생성이 복잡 | 🟡 | pptxgenjs 또는 python-pptx subprocess 평가 후 결정 |
| R2 | 콘텐츠 어댑터 톤 변환 품질 — LLM 기반 톤 변환의 일관성 | 🟡 | O-G-D Loop로 품질 게이팅, few-shot 예시 제공 |
| R3 | 10 Sprint 범위 과다 — 21개 F-item이 10 Sprint에 배분 | 🟢 | Sprint별 2~3 F-item으로 분산, P1은 후순위 조정 가능 |
| R4 | 디자인 토큰 Phase 3 복잡도 — 실시간 CSS 커스터마이징 구현 난이도 | 🟡 | CSS Variables + iframe 격리로 단순화 |

---

## 7. 참조 문서

| 문서 | 경로 |
|------|------|
| Skill & Agent Architecture v2.1 | `docs/specs/FX-Skill-Agent-Architecture/FX-Skill-Agent-Architecture-v2.md` |
| 사업기획서 Skill v0.5 | `docs/specs/FX-Skill-Agent-Architecture/AX_BD팀_사업기획서_Skill_v0.5_260404.md` |
| KOAMI Template v0.5 | `docs/specs/FX-Skill-Agent-Architecture/03_AX Discovery_사업기획서_KOAMI_v0.5_260404.html` |
| self-evolving-harness-strategy v3.0 | `docs/specs/self-evolving-harness-strategy.md` |
| Prototype Auto-Gen PRD | `docs/specs/prototype-auto-gen/prd-final.md` |
