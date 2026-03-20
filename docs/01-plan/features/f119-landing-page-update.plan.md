# F119 — Foundry-X 정체성 및 소개 페이지 업데이트 Planning Document

> **Summary**: PRD v5 통합 플랫폼 비전에 맞춰 랜딩 페이지의 데이터·구조·서비스 소개·로드맵을 전면 업데이트
>
> **Project**: Foundry-X
> **Version**: v2.0.0
> **Author**: AX BD팀
> **Date**: 2026-03-20
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 랜딩 페이지가 PRD v4 시점(v1.3.0)의 데이터를 표시 — 버전·수치·Phase 구조·생태계 비전 전부 현재와 불일치 |
| **Solution** | PRD v5 통합 플랫폼 비전 반영 + 서비스별 소개/링크 섹션 신설 + 동적 버전 관리 체계 도입 |
| **Function/UX Effect** | 방문자가 Foundry-X의 현재 상태와 통합 비전을 정확히 파악하고, 각 서비스로 바로 이동 가능 |
| **Core Value** | 팀 방향성·로드맵·성과가 항상 최신 상태로 유지되는 "살아있는 소개 페이지" |

---

## 1. Overview

### 1.1 Purpose

랜딩 페이지가 PRD v4 → v5 전환(독립 3서비스 연동 → 루트 앱 통합 플랫폼)을 반영하지 못하고 있어, 방문자에게 오래된 정보를 전달하는 문제를 해결한다.

### 1.2 Background

- **F74**(Sprint 14)에서 정체성 페이지를 처음 전면 개편했으나, 이후 8개 스프린트(Sprint 15~22) 동안 API·서비스·테스트가 크게 증가
- PRD v5(2026-03-20)에서 비전이 "연동"에서 "통합"으로 근본 전환됨
- 팀이 지속적으로 방향을 수정하므로, **수동 하드코딩 → 동적/중앙관리형** 데이터 구조가 필요

### 1.3 현재 vs 목표 갭 분석

| 항목 | 현재 (page.tsx) | 실제 (SPEC.md/MEMORY.md) | 갭 |
|------|----------------|------------------------|-----|
| 버전 배지 | v1.3.0 · Phase 2 Complete | v2.0.0 · Phase 3 진행 중 | ❌ |
| API Endpoints | 57 | 97 | ❌ |
| Services | 19 | 39 | ❌ |
| Tests | 450+ | 689+ | ❌ |
| Sprints | 15 | 24 | ❌ |
| D1 Tables | 12 | 27 | ❌ |
| Phase 구조 | 4 Phases (v4 기반) | 5 Phases (v5 통합 비전) | ❌ |
| 생태계 설명 | "세 서비스의 지식이 수렴" | "루트 앱 통합 플랫폼" | ❌ |
| 서비스 소개 링크 | Footer에만 간략히 | 없음 (신설 필요) | ❌ |
| Footer 버전 | v1.3.0 · Phase 3 | v2.0.0 | ❌ |

### 1.4 Related Documents

- PRD: `docs/specs/prd-v5.md`
- F74 (선행): 정체성 페이지 전면 개편
- SPEC.md §5, §6: 현재 Phase·수치

---

## 2. Scope

### 2.1 In Scope

- [ ] **데이터 갱신**: 버전·수치·Phase 구조를 현재 상태로 업데이트
- [ ] **생태계 비전 재작성**: PRD v5 "루트 앱 통합" 비전 반영
- [ ] **서비스 소개 섹션 신설**: Discovery-X / AI Foundry / AXIS DS 각각의 소개·링크·상태
- [ ] **로드맵 5-Phase 재구성**: Phase 1~5 (통합 비전 포함)
- [ ] **아키텍처 레이어 업데이트**: 현재 수치 반영 (97 endpoints, 39 services 등)
- [ ] **데이터 중앙 관리**: 하드코딩된 수치를 `const` 객체로 분리, 향후 API 연동 가능 구조
- [ ] **Footer 버전 동적화**: package.json 또는 상수에서 버전 읽기
- [ ] **Navbar 링크 업데이트**: Services 섹션 추가

### 2.2 Out of Scope

- API 호출로 실시간 수치 fetching (Phase 4에서 F100 KPI 인프라와 함께)
- 서비스 개별 상세 페이지 (각 서비스 랜딩 → 해당 서비스 자체 사이트로 링크)
- 다국어 지원
- 애니메이션/인터랙션 리디자인 (기존 유지)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Hero 섹션: 버전 배지를 v2.0.0 + Phase 3 진행 중으로 업데이트 | High | Pending |
| FR-02 | Stats bar: 수치를 97 endpoints / 39 services / 689+ tests / 24 sprints로 갱신 | High | Pending |
| FR-03 | Core Pillars: PRD v5 통합 비전 반영 (3가지 차별점 재정의) | High | Pending |
| FR-04 | Ecosystem 섹션: "독립 연동" → "루트 앱 통합" 비전으로 재작성 | High | Pending |
| FR-05 | Services 섹션 신설: Discovery-X / AI Foundry / AXIS DS 각각 소개 카드 + 링크 + 상태 배지 | High | Pending |
| FR-06 | 로드맵: 4 Phase → 5 Phase 재구성 (Sprint 0, Phase 3-B/C/D, Phase 4, Phase 5) | High | Pending |
| FR-07 | 아키텍처 레이어: 수치 업데이트 (97 endpoints, 39 services, 27 tables 등) | Medium | Pending |
| FR-08 | Footer: 버전 표시를 상수 기반으로 동적화 | Medium | Pending |
| FR-09 | Navbar: Services 앵커 링크 추가 | Low | Pending |
| FR-10 | 데이터 중앙 관리: 수치·버전을 별도 상수 파일이나 페이지 상단 const로 분리 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 기존 Lighthouse 점수 유지 (90+) | Lighthouse CI |
| Accessibility | 새 섹션에 aria-label, alt 속성 포함 | 수동 검증 |
| 반응형 | 기존 모바일 레이아웃 유지 (md breakpoint) | Playwright viewport |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 페이지의 모든 수치가 SPEC.md/MEMORY.md와 일치
- [ ] 서비스 소개 섹션에 3개 서비스 카드 렌더링
- [ ] 로드맵이 5-Phase 구조로 표시
- [ ] 생태계 설명이 "통합 플랫폼" 비전 반영
- [ ] E2E 스모크 테스트 통과 (landing-page.spec.ts)
- [ ] typecheck / lint 통과

### 4.2 Quality Criteria

- [ ] 하드코딩 수치 0건 (상수 객체에서 관리)
- [ ] 기존 E2E 테스트 깨지지 않음
- [ ] Build 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| E2E 스모크 테스트가 텍스트 매칭으로 검증 중이면 수정 필요 | Medium | Medium | 기존 E2E spec 사전 확인 후 필요시 함께 수정 |
| Footer/Navbar 수정이 대시보드 레이아웃에도 영향 | Low | Low | (landing) route group 내에서만 적용되므로 격리됨 |
| 서비스 외부 링크가 아직 준비 안 된 경우 | Low | Medium | Discovery-X는 `#` (준비 중 표시), AI Foundry/AXIS DS는 GitHub 링크 |

---

## 6. Architecture Considerations

### 6.1 수정 대상 파일

| 파일 | 변경 | 난이도 |
|------|------|:------:|
| `packages/web/src/app/(landing)/page.tsx` | 데이터 갱신 + Services 섹션 + 로드맵 재구성 | ★★★ |
| `packages/web/src/components/landing/navbar.tsx` | navLinks에 "Services" 추가 | ★ |
| `packages/web/src/components/landing/footer.tsx` | 버전 동적화 + Ecosystem 링크 업데이트 | ★★ |
| `packages/web/e2e/` (해당 spec 있으면) | 텍스트 매칭 수정 | ★ |

### 6.2 데이터 구조 설계

현재 `page.tsx` 상단에 `pillars`, `ecosystem`, `architecture`, `roadmap`, `stats` 5개 const가 있어요.
이 패턴을 유지하되:

```typescript
// 버전/수치를 한 곳에서 관리
const SITE_META = {
  version: "v2.0.0",
  phase: "Phase 3",
  phaseStatus: "진행 중",
} as const;

const stats = [
  { value: "97", label: "API Endpoints" },
  { value: "39", label: "Services" },
  { value: "689+", label: "Tests" },
  { value: "24", label: "Sprints" },
];
```

### 6.3 Services 섹션 데이터 구조

```typescript
const services = [
  {
    name: "Discovery-X",
    tagline: "관찰 → 실험 → 기록",
    desc: "신사업 발굴과 실험 관리 플랫폼. 데이터 기반으로 기회를 발견하고 검증해요.",
    status: "80%",
    color: "axis-green",
    link: "#", // 준비 중
    icon: Compass, // lucide
  },
  {
    name: "AI Foundry",
    tagline: "요구사항 → 스펙 → 코드",
    desc: "SI 산출물을 AI Skill로 전환하는 파이프라인. MCP로 Foundry-X 에이전트에 도구를 제공해요.",
    status: "90%",
    color: "axis-violet",
    link: "https://github.com/IDEA-on-Action/AI-Foundry",
    icon: Cpu,
  },
  {
    name: "AXIS Design System",
    tagline: "디자인 토큰 + React 컴포넌트",
    desc: "팀 공통 UI/UX 체계. 일관된 사용자 경험을 보장해요.",
    status: "준비 완료",
    color: "axis-blue",
    link: "https://github.com/IDEA-on-Action/AXIS-Design-System",
    icon: Palette,
  },
];
```

### 6.4 로드맵 5-Phase 구조

```typescript
const roadmap = [
  { phase: "Phase 1", title: "CLI + Plumb Engine", version: "v0.1→v0.5", status: "done",
    items: ["CLI 3커맨드", "Ink TUI", "4 Builders", "106 테스트"] },
  { phase: "Phase 2", title: "API + Web + Agent", version: "v0.6→v1.5", status: "done",
    items: ["79 API 엔드포인트", "MCP 프로토콜", "PlannerAgent", "에이전트 자동 PR"] },
  { phase: "Phase 3", title: "통합 준비", version: "v1.6→v2.0", status: "current",
    items: ["멀티테넌시", "GitHub/Slack 연동", "AXIS DS UI 전환", "기술 스택 점검"] },
  { phase: "Phase 4", title: "통합 실행", version: "v2.1→v2.2", status: "planned",
    items: ["프론트엔드 통합", "인증 SSO", "API 통합", "데이터 통합"] },
  { phase: "Phase 5", title: "고객 파일럿", version: "v3.0", status: "planned",
    items: ["KT DS SR 시나리오", "외부 고객 파일럿", "엔터프라이즈 배포"] },
];
```

---

## 7. Implementation Order

### Step 1: 데이터 갱신 (FR-01, FR-02, FR-07, FR-10)
- `SITE_META` 상수 추출 + stats/architecture 수치 업데이트
- 예상 변경량: ~30줄

### Step 2: 생태계 비전 재작성 (FR-04)
- `ecosystem` const + `EcosystemDiagram` 컴포넌트 텍스트 수정
- "수렴" → "통합 플랫폼" 비전
- 예상 변경량: ~20줄

### Step 3: Core Pillars 업데이트 (FR-03)
- `pillars` const 내용을 PRD v5 핵심 5축 기반으로 재정의
- 예상 변경량: ~20줄

### Step 4: Services 섹션 신설 (FR-05)
- `services` const + `ServiceCards` 컴포넌트 신규 작성
- Ecosystem 섹션과 Services 섹션 순서 배치
- 예상 변경량: ~80줄

### Step 5: 로드맵 5-Phase (FR-06)
- `roadmap` const를 5-Phase 구조로 재작성
- `md:grid-cols-4` → `md:grid-cols-5` (또는 2행 구성)
- 예상 변경량: ~30줄

### Step 6: Navbar + Footer (FR-08, FR-09)
- navbar: navLinks에 `{ href: "#services", label: "Services" }` 추가
- footer: 버전 상수 참조 + Ecosystem 링크 업데이트
- 예상 변경량: ~15줄

### Step 7: E2E 테스트 수정 (해당 시)
- 랜딩 페이지 스모크 테스트의 텍스트 매칭 업데이트
- 예상 변경량: ~10줄

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`f119-landing-page-update.design.md`)
2. [ ] 팀 리뷰 및 승인
3. [ ] 구현 시작 (Step 1~7 순서)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-20 | Initial draft | AX BD팀 |
