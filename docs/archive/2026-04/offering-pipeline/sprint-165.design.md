---
code: FX-DSGN-S165
title: "Sprint 165: Foundation — Skill 등록 + 디자인 토큰 Design"
version: 1.0
status: Active
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
feature: sprint-165
plan: "[[FX-PLAN-S165]]"
sprint: 165
f_items: [F363, F364, F365, F366]
---

## 1. 설계 개요

Sprint 165는 Phase 18 Offering Pipeline의 기반 Sprint로, `.claude/skills/ax-bd/shape/` 디렉토리 구조와 offering-html 스킬을 구축한다. 코드(API/Web) 변경은 F366 Registry 연동 테스트에 한정된다.

### 1.1 변경 범위

| 영역 | 변경 | F# |
|------|------|-----|
| `.claude/skills/ax-bd/shape/INDEX.md` | 신규 | F363 |
| `.claude/skills/ax-bd/shape/offering-html/SKILL.md` | 신규 | F363 |
| `.claude/skills/ax-bd/shape/offering-html/templates/base.html` | 신규 | F364 |
| `.claude/skills/ax-bd/shape/offering-html/templates/components/*.html` | 신규 (17종) | F364 |
| `.claude/skills/ax-bd/shape/offering-html/examples/KOAMI_v0.5.html` | 신규 | F364 |
| `.claude/skills/ax-bd/shape/offering-html/design-tokens.md` | 신규 | F365 |
| `.claude/skills/ax-bd/shape/offering-pptx/SKILL.md` | 신규 (stub) | F363 |
| `.claude/skills/ax-bd/shape/prototype-builder/SKILL.md` | 신규 (stub) | F363 |
| `packages/api/src/__tests__/skill-registry-offering.test.ts` | 신규 | F366 |

---

## 2. F363: SKILL.md 등록 + 디렉토리 구조

### 2.1 INDEX.md

```markdown
# ax-bd/shape — 형상화 (3단계)

AX BD 프로세스 6단계 중 3단계: 발굴 산출물 → 사업기획서 형상화

## Agent
- ax-bd-offering-agent (shaping-orchestrator 확장, Sprint 166 F368)

## Skills

| # | Skill | Input | Output | Format | Status |
|---|-------|-------|--------|--------|--------|
| 3-1 | offering-html | DiscoveryPackage + OfferingConfig | OfferingHTML | HTML | ✅ Active |
| 3-2 | offering-pptx | DiscoveryPackage + OfferingConfig | OfferingPPTX | PPTX | 📋 Stub |
| 3-P | prototype-builder | OfferingArtifact + PrototypeConfig | Prototype | React/HTML | 📋 Stub |

## OfferingConfig Schema

| 필드 | 타입 | 설명 |
|------|------|------|
| purpose | "report" \| "proposal" \| "review" | 콘텐츠 어댑터 톤 결정 |
| format | "html" \| "pptx" | 출력 포맷 |
| sections | SectionToggle[] | 18섹션 필수/선택 토글 |
| designTokenOverrides | Partial<DesignTokens> | 고객별 브랜드 커스텀 (선택) |

## DiscoveryPackage Schema

발굴 단계(2-0~2-8)의 산출물 종합:
- item_overview: 아이템 개요, 고객, 도메인
- reference_analysis: 비즈니스 모델, 동향
- market_validation: TAM/SAM/SOM, Pain Point
- competition_analysis: 경쟁 구도, KT 그룹 시너지
- item_derivation: 사업 아이템 체크리스트
- core_selection: KT 방향성 기반 숏리스트
- customer_profile: 고객 페르소나, 가치
- business_model: BM, 수익 시뮬레이션
- packaging: 형상화 Input Deck
```

### 2.2 offering-html/SKILL.md

frontmatter:

```yaml
---
name: offering-html
domain: ax-bd
stage: shape
version: "1.0"
description: "AX BD팀 사업기획서(HTML) 생성 스킬 — 발굴 산출물 기반 18섹션 표준 목차"
input_schema: DiscoveryPackage + OfferingConfig
output_schema: OfferingHTML
upstream: [ax-bd/discover/packaging]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
triggers:
  - 사업기획서
  - offering
  - 형상화 HTML
  - business proposal
evolution:
  track: DERIVED
  registry_id: null
---
```

본문 4섹션:
1. **When** — 발굴 2-8 Packaging 완료 후, 형상화 3단계 진입 시
2. **How** — 8단계 생성 프로세스 (아이템확인→목차확정→정보수집→초안→피드백→검증→최종)
3. **Output Format** — HTML 파일 (`AX Discovery_사업기획서_{고객명}_v{버전}_{YYMMDD}.html`)
4. **Examples** — KOAMI v0.5 참조 (`examples/KOAMI_v0.5.html`)

### 2.3 Stub 스킬

**offering-pptx/SKILL.md:**
```yaml
---
name: offering-pptx
domain: ax-bd
stage: shape
version: "0.1"
description: "AX BD팀 사업기획서(PPTX) 생성 스킬 — Sprint 166 F367에서 본구현"
status: stub
---
```

**prototype-builder/SKILL.md:**
```yaml
---
name: prototype-builder
domain: ax-bd
stage: shape
version: "0.1"
description: "Offering → Prototype 자동 빌드 — Phase 16 F351~F356 연동"
status: stub
---
```

---

## 3. F364: HTML 템플릿 + 17종 컴포넌트 분리

### 3.1 base.html

KOAMI v0.5 CSS 디자인 시스템을 추출한 기반 HTML:
- `:root` CSS variables (20종 — color, spacing)
- 공통 스타일: reset, body, nav, section, fade-in
- IntersectionObserver JS (스크롤 애니메이션)
- Pretendard 폰트 CDN 링크
- `<!-- COMPONENT: {name} -->` 주석으로 컴포넌트 삽입 위치 표시

### 3.2 17종 컴포넌트 목록

| # | 파일명 | CSS 클래스 | 용도 | 사용 섹션 |
|---|--------|-----------|------|----------|
| 1 | nav.html | `nav`, `.brand` | 상단 고정 네비게이션 | 전체 |
| 2 | hero.html | `#hero`, `.hero-tags` | Hero 제목 + 태그 | §0 |
| 3 | section-header.html | `.section-label`, `.section-title`, `.section-sub` | 섹션 제목 블록 | 전체 |
| 4 | kpi-card.html | `.track-grid`, `.track-card` | KPI 수치 카드 (4열) | §0.5, §04-2 |
| 5 | compare-grid.html | `.compare-grid`, `.compare-col` | 2열 비교 (현황/목표) | §02-5, §04-5 |
| 6 | ba-grid.html | `.ba-grid`, `.ba-card` | Before/After 비교 | §03-1 |
| 7 | silo-grid.html | `.silo-boxes`, `.silo-box` | 사일로 박스 (현재 상태) | §03-1 |
| 8 | trend-grid.html | `.trend-grid` (capability-grid 변형) | 트렌드/역량 카드 (3~4열) | §02-6 |
| 9 | scenario-card.html | `.scenario-card`, `.scenario-badge` | 시나리오/Use Case 카드 | §03-2 |
| 10 | step-block.html | `.step-blocks` | 가로 흐름 단계 | §04-1 |
| 11 | flow-diagram.html | `.flow-row`, `.flow-node`, `.flow-arrow` | 데이터 흐름 다이어그램 | §03-2 |
| 12 | impact-list.html | `.impact-list`, `.impact-bar` | 영향도 바 차트 | §04-6 |
| 13 | option-card.html | `.option-cards` (3열) | 대응 옵션 비교 | §03-2 |
| 14 | vuln-list.html | `.vuln-card` | 리스크/취약점 목록 | §04-5 |
| 15 | roadmap-track.html | `.roadmap-track` | 타임라인 로드맵 | §03-3 |
| 16 | bottom-note.html | `.bottom-note` | 섹션 하단 요약 (좌측 검정 보더) | 다수 |
| 17 | cta.html | `.cta-box` (블랙 박스) | CTA/추진목적/기대효과 요약 | §01, §04-6 |

### 3.3 각 컴포넌트 파일 구조

```html
<!-- Component: {name}
     Usage: {사용 섹션}
     Variables: {치환 가능한 변수 목록}
-->
<div class="{css-class}">
  <!-- 재사용 가능한 HTML 구조 -->
  <!-- {{variable}} 형식으로 치환점 표시 -->
</div>
```

### 3.4 examples/KOAMI_v0.5.html

기존 `docs/specs/GIVC/koami_pitch_v0.2_260330.html`을 기반으로:
- 사업기획서 Skill v0.5의 18섹션 표준 목차에 맞게 재구성
- 모든 17종 컴포넌트 사용 예시 포함
- "KOAMI Ontology 기반 산업 공급망 인과 예측 엔진" 실제 사업기획서

---

## 4. F365: 디자인 토큰 Phase 1

### 4.1 design-tokens.md 구조

3카테고리 × 20+ 토큰:

**Color Tokens (10종):**

| Token | CSS Variable | Value | 용도 |
|-------|-------------|-------|------|
| color.text.primary | `--black` | `#111` | 본문, 제목 |
| color.text.secondary | `--gray-600` | `#666` | 서브텍스트 |
| color.text.muted | `--gray-400` | `#999` | 라벨, 각주 |
| color.bg.default | `--white` | `#fff` | 기본 배경 |
| color.bg.alt | `--gray-50` | `#f8f9fa` | 교차 배경 |
| color.bg.subtle | `--gray-100` | `#f0f0f0` | 카드 내부 |
| color.border.default | `--gray-200` | `#e5e5e5` | 기본 보더 |
| color.border.strong | `--black` | `#111` | 강조 보더 |
| color.data.positive | `--green` | `#16a34a` | 데이터 배지 (긍정) |
| color.data.negative | `--red` | `#dc2626` | 데이터 배지 (부정) |
| color.data.warning | `--orange` | `#ea580c` | 데이터 배지 (주의) |

**Typography Tokens (6종):**

| Token | Font | Size | Weight | Extra |
|-------|------|------|--------|-------|
| typography.hero | Pretendard | 48px | 900 | ls: -0.04em, lh: 1.35 |
| typography.section | Pretendard | 36px | 800 | ls: -0.03em, lh: 1.3 |
| typography.subsection | Pretendard | 17px | 400 | lh: 1.7 |
| typography.body | Pretendard | 15px | 400 | lh: 1.7 |
| typography.card-title | Pretendard | 14px | 700 | — |
| typography.label | Pretendard | 12px | 600 | uppercase, ls: 0.08em |

**Layout Tokens (4종):**

| Token | Value | 용도 |
|-------|-------|------|
| layout.maxWidth | 1200px | 콘텐츠 최대 폭 |
| layout.sectionPadding | 120px 40px 80px | 섹션 여백 |
| layout.cardRadius | 16px | 카드 모서리 반경 |
| layout.breakpoint | 900px | 반응형 전환점 |

### 4.2 승격 경로 (Phase 2~3)

```
Phase 1 (Sprint 165, F365):  design-tokens.md      → MD 문서
Phase 2 (Sprint 173, F381):  design-tokens.json     → JSON 정규 포맷 + API
Phase 3 (Sprint 173, F381):  Web Token Editor        → 실시간 CSS 커스터마이징
```

---

## 5. F366: Skill Registry 연동

### 5.1 등록 데이터

기존 `POST /api/skills` API를 활용하여 offering-html 스킬 등록:

```json
{
  "skill_id": "offering-html",
  "name": "Offering HTML",
  "description": "AX BD팀 사업기획서(HTML) 생성 — 18섹션 표준 목차, 디자인 토큰 기반",
  "category": "generation",
  "tags": "offering,html,shape,business-proposal",
  "source_type": "derived",
  "source_ref": ".claude/skills/ax-bd/shape/offering-html/SKILL.md",
  "model_preference": "opus",
  "max_tokens": 8192
}
```

### 5.2 테스트 설계

`packages/api/src/__tests__/skill-registry-offering.test.ts`:

| # | 테스트 | 검증 내용 |
|---|--------|----------|
| 1 | POST /api/skills — offering-html 등록 | 201, skill_id 유니크 |
| 2 | GET /api/skills/:id — 등록 후 조회 | source_type: "derived" |
| 3 | GET /api/skills?category=generation — 카테고리 필터 | offering-html 포함 |
| 4 | GET /api/skills/search?q=offering — 검색 | offering-html 히트 |

---

## 6. 비구현 항목 (설계 범위 밖)

| 항목 | 사유 | 구현 Sprint |
|------|------|------------|
| offering-pptx 본구현 | Sprint 166 F367 | 166 |
| ax-bd-offering-agent.md | Sprint 166 F368 | 166 |
| D1 마이그레이션 (offerings 테이블 등) | Sprint 167 F369 | 167 |
| Web UI (목록, 위자드, 에디터) | Sprint 169~170 | 169~170 |
| 콘텐츠 어댑터 | Sprint 171 F378 | 171 |

---

## 7. 검증 기준

| # | 검증 항목 | 방법 | 기대 결과 |
|---|----------|------|----------|
| V1 | 디렉토리 구조 완성 | `find .claude/skills/ax-bd/shape/ -type f` | 24+ 파일 |
| V2 | SKILL.md frontmatter 유효성 | YAML parse | name, domain, stage, evolution 필드 존재 |
| V3 | base.html CSS variables | grep `:root` | 20+ CSS variables |
| V4 | 17종 컴포넌트 개별 파일 | `ls templates/components/*.html \| wc -l` | 17 |
| V5 | KOAMI 예시 HTML 완본 | 파일 크기 > 10KB | 18섹션 구조 |
| V6 | design-tokens.md 토큰 수 | grep 행수 | 20+ 토큰 |
| V7 | Skill Registry 테스트 | vitest | 4/4 PASS |
| V8 | typecheck | `turbo typecheck` | PASS |
