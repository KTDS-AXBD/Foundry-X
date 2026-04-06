---
code: FX-PLAN-S166
title: "Sprint 166: Foundation — Agent 확장 + PPTX 설계"
version: 1.0
status: Active
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
feature: sprint-166
phase: "[[FX-PLAN-018]]"
sprint: 166
f_items: [F367, F368]
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | Sprint 166 — Foundation: Agent 확장 + PPTX 설계 |
| 시작일 | 2026-04-06 |
| F-items | F367 (offering-pptx SKILL.md), F368 (ax-bd-offering-agent 6 capability) |
| 의존성 | F363 (offering-html SKILL.md, Sprint 165 ✅) 선행 |

### Value Delivered (4-Perspective)

| 관점 | 설명 |
|------|------|
| **Problem** | 형상화 단계에서 PPTX 스킬이 stub 상태이고, 발굴→형상화를 총괄하는 에이전트가 부재 |
| **Solution** | offering-pptx SKILL.md 본구현 + ax-bd-offering-agent 6 capability 에이전트 정의 |
| **Function UX Effect** | PPTX 생성 프로세스가 정의되고, 형상화 전체 라이프사이클을 단일 에이전트가 오케스트레이션 |
| **Core Value** | Phase 18 후속 Sprint(167~174)가 안정적으로 API/UI를 구현할 수 있는 에이전트·스킬 기반 확보 |

---

## 1. 개요

Phase 18 Offering Pipeline의 두 번째 Sprint. Sprint 165에서 구축한 offering-html 기반 위에
PPTX 스킬을 본구현하고, 형상화 전체 라이프사이클을 관리하는 에이전트를 정의한다.
코드(API/Web) 변경 없이 `.claude/skills/` + `.claude/agents/` 인프라에 집중한다.

### 1.1 F-item 범위

| F# | 제목 | REQ | P | 비고 |
|----|------|-----|---|------|
| F367 | offering-pptx SKILL.md 등록 + Cowork 연동 설계 | FX-REQ-359 | P1 | |
| F368 | ax-bd-offering-agent — shaping-orchestrator 확장, 6 capability | FX-REQ-360 | P0 | F363 선행 |

### 1.2 변경 영역

```
.claude/skills/ax-bd/shape/
├── offering-pptx/
│   └── SKILL.md               # F367 — stub → 본구현
└── INDEX.md                    # F368 agent 설명 갱신 (이미 반영됨)

.claude/agents/
└── ax-bd-offering-agent.md     # F368 — 🆕 신규 에이전트 정의

packages/api/src/               # F368 Skill Registry 연동 테스트
└── (기존 test 확장 — offering-pptx 등록 테스트 1건)
```

### 1.3 의존성

```
Sprint 165 (완료)
├── F363 offering-html SKILL.md ──→ F367 offering-pptx SKILL.md (동일 구조 대칭)
├── F363 INDEX.md ──────────────→ F368 agent 참조 (이미 선언됨)
└── F365 design-tokens.md ─────→ F367 PPTX 디자인 토큰 매핑

기존 에이전트
├── shaping-orchestrator ───────→ F368 확장 기반 (Phase C O-G-D 루프)
├── ogd-orchestrator/gen/disc ──→ F368 validate_orchestration 호출 대상
├── six-hats-moderator ────────→ F368 validate_orchestration 호출 대상
└── expert-ta~qa (5종) ────────→ F368 validate_orchestration 호출 대상
```

---

## 2. 구현 계획

### Phase A: offering-pptx SKILL.md 본구현 (F367)

기존 stub(v0.1)을 offering-html SKILL.md와 대칭 구조로 확장한다.

1. **frontmatter 갱신**: version "0.1" → "1.0", status: stub → Active
2. **When 섹션**: PPTX 포맷이 필요한 3가지 시나리오 명시
   - 대외 제안용 사업기획서 (고객/파트너 제출용)
   - 경영회의 보고용 (본부장/대표 보고)
   - 팀 내부 검토용 (진행상황 공유)
3. **How 섹션**: 8단계 생성 프로세스 (offering-html과 동일 단계, PPTX 특화)
   - [1] 아이템 확인 → [2] 슬라이드 목차 확정 → [3] 핵심 정보 수집
   - [4] 초안 생성 → [5] 피드백 반영 → [6] 교차검증
   - [7] 보고용 마무리 → [8] 최종 확정
4. **표준 슬라이드 목차**: 18섹션 → 슬라이드 매핑 테이블
   - 1 섹션 = 1~3 슬라이드 원칙 (총 25~40 슬라이드)
   - Hero → 표지, Exec Summary → 요약 2슬라이드, 본문 → 섹션당 2~3장
5. **Cowork PPTX 연동 설계**: 공유·편집 워크플로우 정의
   - Cowork MCP 연동 인터페이스 (향후 구현 시 참조 구조)
   - PPTX 버전 관리 (v0.1~v1.0 흐름)
6. **PPTX 엔진 비교표**: pptxgenjs vs python-pptx 의사결정 연기 사유 + 비교 매트릭스
   - 최종 선택은 Sprint 172 F380 (Risk R1)
7. **Output Format**: `AX Discovery_사업기획서_{고객명}_v{버전}_{YYMMDD}.pptx`

### Phase B: ax-bd-offering-agent 에이전트 정의 (F368)

shaping-orchestrator를 기반으로 형상화 전체 라이프사이클을 관리하는 신규 에이전트를 정의한다.

1. **에이전트 메타데이터**:
   - name: ax-bd-offering-agent
   - model: opus
   - tools: Read, Write, Edit, Glob, Grep, Agent, Bash, WebSearch
   - role: orchestrator (shaping-orchestrator와 동일 역할군)
2. **6 Capability 정의**:

| # | Capability | 입력 | 출력 | 호출 대상 |
|---|-----------|------|------|----------|
| C1 | format_selection | OfferingConfig + context | format decision | 내부 로직 |
| C2 | content_adapter | DiscoveryPackage + purpose | 톤 변환된 섹션 콘텐츠 | LLM (톤 프롬프트) |
| C3 | structure_crud | offering_id + section_toggle | 섹션 목록 CRUD | (Sprint 167+ API) |
| C4 | design_management | DesignTokens + overrides | 브랜드 커스텀 적용 | design-tokens.md |
| C5 | validate_orchestration | offering draft | 검증 결과 | ogd + six-hats + expert |
| C6 | version_guide | offering + feedback | 버전 업 가이드 | 내부 로직 |

3. **실행 프로토콜**:
   - Phase 0: DiscoveryPackage 로드 + OfferingConfig 파싱
   - Phase 1: format_selection → content_adapter → structure_crud
   - Phase 2: design_management → 초안 생성 (offering-html 또는 offering-pptx 스킬 호출)
   - Phase 3: validate_orchestration (O-G-D Loop + Six Hats + Expert)
   - Phase 4: version_guide (피드백 반영 → 재생성 루프)
4. **기존 에이전트 위임 관계**:
   - shaping-orchestrator: Phase C O-G-D 루프 (변경 없음, 그대로 호출)
   - ogd-orchestrator: Offering 품질 검증 시 호출 (validate_orchestration)
   - six-hats-moderator: Offering 교차검증 토론 (validate_orchestration)
   - expert-ta~qa: 5인 전문가 리뷰 (validate_orchestration)
5. **에러 처리**: 각 capability별 실패 시 fallback + 사용자 에스컬레이션 규칙

### Phase C: Skill Registry 연동 + 테스트 (F367 + F368)

1. offering-pptx Skill Registry 등록 테스트 추가
   - `packages/api/src/__tests__/skill-registry-offering-pptx.test.ts` (신규)
   - POST /api/skill-registry + GET + category filter + search 4건
2. INDEX.md agent 섹션이 F368 반영 여부 확인 (이미 Sprint 165에서 선언됨)
3. 기존 offering-html Skill Registry 테스트와 일관성 확인

### Phase D: 검증 + 문서 정합성

1. typecheck: `turbo typecheck` (테스트 파일 포함)
2. test: `pnpm test -- --grep "offering-pptx"` (Registry 테스트)
3. SPEC.md F367, F368 상태 갱신 (📋 → ✅)
4. INDEX.md, SKILL.md 상호 참조 정합성 확인

---

## 3. 구현 순서 (Worker 매핑)

**단일 구현** — API/Web 코드 변경이 최소(테스트 1건)이므로 Worker 분할 없이 직접 구현.

```
순서:
1. F367 offering-pptx SKILL.md 본구현 (Phase A)
2. F368 ax-bd-offering-agent.md 신규 생성 (Phase B)
3. Skill Registry 테스트 (Phase C)
4. 검증 + 문서 정합성 (Phase D)
```

예상 소요: 20~30분 (스킬/에이전트 정의 중심, 코드 변경 최소)

---

## 4. 리스크

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R1 | PPTX 엔진 미확정 | 🟢 | F367에서 비교표만 작성, 선택은 F380(Sprint 172)으로 연기 |
| R2 | Agent 정의가 후속 Sprint API에 영향 | 🟢 | Agent는 스킬 파일(SKILL.md)만 호출, API 직접 의존 없음 |
| R3 | Cowork PPTX 연동 사양 미확정 | 🟡 | 인터페이스 구조만 설계, 실구현은 Cowork 팀 확인 후 |

---

## 5. 참조 문서

| 문서 | 경로 |
|------|------|
| Phase 18 PRD | `docs/specs/fx-offering-pipeline/prd-final.md` |
| offering-html SKILL.md | `.claude/skills/ax-bd/shape/offering-html/SKILL.md` |
| offering-pptx SKILL.md (stub) | `.claude/skills/ax-bd/shape/offering-pptx/SKILL.md` |
| shaping-orchestrator Agent | `.claude/agents/shaping-orchestrator.md` |
| INDEX.md (Shape Stage) | `.claude/skills/ax-bd/shape/INDEX.md` |
| design-tokens.md | `.claude/skills/ax-bd/shape/offering-html/design-tokens.md` |
| Sprint 165 Plan | `docs/01-plan/features/sprint-165.plan.md` |
