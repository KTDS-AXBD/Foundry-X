---
code: FX-PLAN-IA
title: "IA 구조 개선 — 사이드바/메뉴 재구조화 + 온보딩 강화"
version: 1.0
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# Foundry-X IA 구조 개선 Planning Document

> **Summary**: AX BD 사업개발 프로세스 6단계 기반으로 사이드바/메뉴 재구조화 + 온보딩 강화 + UI/UX 개선
>
> **Project**: Foundry-X
> **Version**: Sprint 82~84
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 사이드바가 개발자 관점으로 구성되어 있어, AX BD 실무자가 프로세스 단계별 업무 동선을 직관적으로 따라가기 어려움. Phase 7에서 추가된 4개 페이지(pipeline, ir-proposals, offering-packs, mvp-tracking)가 네비게이션에 누락. Discovery 관련 페이지 3곳 분산. |
| **Solution** | AX BD 사업개발 프로세스 6단계(수집→발굴→형상화→검증/공유→제품화→GTM)를 사이드바 1차 그룹으로 매핑. 개발자 도구는 관리/설정 하위로 이동. 각 단계 진입 시 온보딩 가이드 제공. AXIS DS 기반 UI 개선. |
| **Function/UX Effect** | 실무자가 사이드바만 보고 현재 프로세스 위치를 파악하고, 다음 할 일을 자연스럽게 찾을 수 있음. 신규 팀원도 각 단계 설명을 통해 자기 주도 학습 가능. |
| **Core Value** | "프로세스가 곧 네비게이션" — AX BD 사업개발 표준 프로세스를 플랫폼 IA에 내재화하여, 도구 사용이 곧 프로세스 학습이 되는 환경 구축. |

---

## 1. Overview

### 1.1 Purpose

Foundry-X 웹 대시보드의 Information Architecture(IA)를 AX BD 사업개발 프로세스 6단계에 맞춰 재구조화하여, 실무자가 프로세스 동선대로 자연스럽게 플랫폼을 사용할 수 있게 함.

### 1.2 Background

- Phase 7(Sprint 79~81)에서 BD Pipeline E2E 기능 9건(F232~F240)이 구현되었으나, 사이드바에는 기존 구조를 유지한 채 일부만 반영됨
- 현재 28개 페이지 중 사이드바에 ~18개만 노출, Phase 7 신규 4개 페이지 누락
- Discovery 관련 페이지가 3곳(`/discovery`, `/ax-bd/discovery`, `/discovery-progress`)에 분산
- 사이드바 그룹이 "SR관리 / 개발 / 현황 / AX BD" — 개발자 관점이며, AX BD 프로세스와 대응 관계 불명확
- 신규 팀원 6명 온보딩(F114) 예정 — 프로세스 이해 없이 도구만 보여주면 활용도 저하

### 1.3 Related Documents

- AX BD 프로세스 v8.2: `docs/specs/axbd/`
- BD Pipeline PRD: `docs/specs/fx-bd-v1/prd-final.md`
- AX BD A-to-Z PRD: `docs/specs/ax-bd-atoz/prd-final.md`
- 현재 사이드바: `packages/web/src/components/sidebar.tsx`

---

## 2. Scope

### 2.1 In Scope

- [ ] **F241**: 사이드바 IA 재구조화 — 프로세스 6단계 기반 메뉴 그룹 재배치 + 누락 페이지 통합
- [ ] **F242**: 프로세스 단계별 온보딩 가이드 — 각 단계 진입 시 설명 카드 + Agent 안내
- [ ] **F243**: 대시보드 홈 재설계 — 프로세스 진행률 중심 뷰 + 단계별 퀵 액션
- [ ] **F244**: AXIS DS 기반 UI 컴포넌트 개선 — 사이드바 + 카드 + 레이아웃 리디자인

### 2.2 Out of Scope

- 페이지 라우트 경로 변경 (기존 URL 유지, 사이드바 그룹핑만 변경)
- 신규 API 엔드포인트 추가 (기존 API 활용)
- 모바일 전용 레이아웃 (반응형은 기존 Sheet 기반 유지)
- AXIS DS npm 패키지 직접 의존 (현재 Tailwind + shadcn/ui에 AXIS 토큰만 반영)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사이드바를 프로세스 6단계 그룹으로 재구성 | High | Pending |
| FR-02 | 누락 페이지 4건(pipeline, ir-proposals, offering-packs, mvp-tracking) 네비게이션 통합 | High | Pending |
| FR-03 | Discovery 관련 3개 페이지를 "발굴" 단계 하위로 통합 | High | Pending |
| FR-04 | 개발자 도구 페이지(에이전트, 아키텍처, 토큰 비용)를 "관리" 그룹으로 이동 | Medium | Pending |
| FR-05 | 각 프로세스 단계 첫 진입 시 온보딩 설명 카드 표시 | Medium | Pending |
| FR-06 | 대시보드 홈을 프로세스 파이프라인 진행률 뷰로 재설계 | Medium | Pending |
| FR-07 | Getting Started 페이지를 6단계 프로세스 가이드로 재설계 | Medium | Pending |
| FR-08 | AXIS DS 디자인 토큰(색상, 타이포, 간격) 적용 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 사이드바 렌더링 < 50ms (기존과 동일) | React DevTools Profiler |
| Accessibility | 키보드 네비게이션 유지, aria-label 보존 | 수동 테스트 |
| Compatibility | 기존 URL 북마크/링크 동작 유지 | E2E 테스트 |

---

## 4. Page-to-Process Mapping

### 4.1 현재 페이지 → 프로세스 6단계 매핑

```
┌─────────────────────────────────────────────────────────────────┐
│ 프로세스 단계          │ 기존 페이지              │ 신규/이동    │
├────────────────────────┼──────────────────────────┼──────────────┤
│ 📥 1. 수집             │ /sr (SR 목록)            │              │
│                        │ /discovery/collection    │              │
│                        │                          │ /ir-proposals│
│                        │                          │  (IR Bottom-up)│
├────────────────────────┼──────────────────────────┼──────────────┤
│ 🔍 2. 발굴             │ /ax-bd/discovery         │              │
│                        │ /ax-bd/ideas             │              │
│                        │ /ax-bd/bmc               │              │
│                        │ /discovery-progress      │              │
├────────────────────────┼──────────────────────────┼──────────────┤
│ 📐 3. 형상화           │ /spec-generator          │              │
│                        │                          │ /offering-packs│
├────────────────────────┼──────────────────────────┼──────────────┤
│ ✅ 4. 검증/공유        │ (Six Hats, AI 검토 등    │              │
│                        │  ax-bd 하위 기능)        │              │
├────────────────────────┼──────────────────────────┼──────────────┤
│ 🚀 5. 제품화           │                          │ /mvp-tracking│
├────────────────────────┼──────────────────────────┼──────────────┤
│ 📈 6. GTM              │                          │ /pipeline    │
├────────────────────────┼──────────────────────────┼──────────────┤
│ ⚙️ 관리               │ /agents                  │              │
│                        │ /architecture            │              │
│                        │ /tokens                  │              │
│                        │ /analytics               │              │
│                        │ /methodologies           │              │
│                        │ /settings                │              │
│                        │ /workspace               │              │
│                        │ /projects                │              │
├────────────────────────┼──────────────────────────┼──────────────┤
│ 🔗 외부 서비스         │ /discovery (Discovery-X) │              │
│                        │ /foundry (AI Foundry)    │              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 새 사이드바 구조 (확정)

```
📋 시작하기                    → /getting-started
🏠 홈                         → /dashboard
─────────────────────────────
📥 1. 수집
  ├─ SR 목록                  → /sr
  ├─ 수집 채널                → /discovery/collection
  └─ IR Bottom-up             → /ir-proposals
─────────────────────────────
🔍 2. 발굴
  ├─ Discovery 프로세스       → /ax-bd/discovery
  ├─ 아이디어 관리            → /ax-bd/ideas
  ├─ BMC                      → /ax-bd/bmc
  └─ 진행률                   → /discovery-progress
─────────────────────────────
📐 3. 형상화
  ├─ Spec 생성                → /spec-generator
  ├─ 사업제안서               → /ax-bd (BDP 편집)
  └─ Offering Pack            → /offering-packs
─────────────────────────────
✅ 4. 검증/공유
  ├─ 의사결정 (ORB/PRB)       → /ax-bd (게이트 기능)
  ├─ 산출물 공유              → /ax-bd (공유 링크)
  └─ 파이프라인               → /pipeline
─────────────────────────────
🚀 5. 제품화
  └─ MVP 추적                 → /mvp-tracking
─────────────────────────────
📈 6. GTM
  └─ IR 제안서                → /ir-proposals (별도 뷰)
─────────────────────────────
📚 지식
  ├─ 지식베이스               → /wiki
  └─ 방법론 관리              → /methodologies
─────────────────────────────
⚙️ 관리
  ├─ 프로젝트 현황            → /projects
  ├─ Analytics                → /analytics
  ├─ 에이전트                 → /agents
  ├─ 토큰 비용                → /tokens
  ├─ 아키텍처                 → /architecture
  └─ 설정                     → /settings, /workspace
─────────────────────────────
🔗 외부
  ├─ Discovery-X              → /discovery
  └─ AI Foundry               → /foundry
─────────────────────────────
❓ 도움말                     → /getting-started
```

---

## 5. Sprint 분배 계획

### Sprint 82: 사이드바 IA 재구조화 (F241)

**범위**: 사이드바 컴포넌트 재작성 + 누락 페이지 통합
**변경 파일**:
- `packages/web/src/components/sidebar.tsx` — 전면 재작성
- E2E 테스트 업데이트

**핵심 작업**:
1. `sidebar.tsx`의 `navGroups` 배열을 프로세스 6단계 기반으로 재구성
2. Phase 7 페이지 4건(pipeline, ir-proposals, offering-packs, mvp-tracking) 네비게이션 추가
3. Discovery 관련 페이지 통합 (발굴 그룹 하위)
4. 개발자 도구 → 관리 그룹 이동
5. 기존 E2E 테스트 업데이트

### Sprint 83: 온보딩 가이드 강화 (F242 + F243)

**범위**: 단계별 온보딩 + 대시보드 홈 재설계
**변경 파일**:
- `packages/web/src/components/feature/ProcessStageGuide.tsx` — 신규
- `packages/web/src/app/(app)/dashboard/page.tsx` — 재설계
- `packages/web/src/app/(app)/getting-started/page.tsx` — 6단계 기반 재구성

**핵심 작업**:
1. 프로세스 단계 진입 시 표시할 온보딩 카드 컴포넌트 제작
2. 각 단계별 "이 단계에서는..." 설명 + "Agent가 도와주는 일" 안내
3. 대시보드 홈: SDD Triangle → 프로세스 파이프라인 진행률 뷰 전환
4. Getting Started: 6단계 프로세스 흐름도 + 단계별 시작 버튼

### Sprint 84: AXIS DS 기반 UI/UX 개선 (F244)

**범위**: 디자인 토큰 + 컴포넌트 리디자인
**변경 파일**:
- `packages/web/tailwind.config.ts` — AXIS DS 토큰 반영
- `packages/web/src/components/sidebar.tsx` — 비주얼 개선
- 주요 페이지 카드/레이아웃 리디자인

**핵심 작업**:
1. AXIS DS 디자인 토큰(색상 팔레트, 타이포그래피, 간격 시스템) 정의
2. 사이드바 비주얼 개선 (아이콘 + 프로세스 단계 번호 뱃지)
3. 카드 컴포넌트 리디자인 (일관된 elevation, border-radius)
4. 대시보드 / 주요 페이지 레이아웃 정리

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] 사이드바가 프로세스 6단계 기반으로 동작
- [ ] 모든 28개 페이지가 사이드바에서 접근 가능
- [ ] 기존 URL 북마크/링크 정상 동작 (라우트 변경 없음)
- [ ] 각 프로세스 단계 진입 시 온보딩 가이드 표시
- [ ] 대시보드 홈에서 프로세스 진행률 조회 가능
- [ ] E2E 테스트 통과
- [ ] typecheck + lint 통과

### 6.2 Quality Criteria

- [ ] 기존 E2E 테스트 깨지지 않음
- [ ] 사이드바 그룹 open/close 상태 localStorage 영속 유지
- [ ] 모바일 Sheet 사이드바 정상 동작

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 라우트 변경 시 기존 북마크 깨짐 | High | Low | 라우트 변경 없이 사이드바 그룹핑만 변경 |
| E2E 테스트 data-tour 속성 의존 | Medium | Medium | data-tour 속성은 유지하며 그룹 key만 변경 |
| AXIS DS 토큰 미확정 | Medium | Medium | Sprint 84로 분리, 토큰 확정 후 진행 |
| 온보딩 가이드가 기존 사용자에게 방해 | Low | Medium | "다시 보지 않기" 옵션 + localStorage 기억 |

---

## 8. Architecture Considerations

### 8.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 8.2 Key Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 라우트 변경 여부 | 변경 없음 | 기존 URL 호환성 + 최소 변경 원칙 |
| 사이드바 구현 | 기존 sidebar.tsx 리팩토링 | 구조 동일, 데이터만 변경 |
| 온보딩 저장 | localStorage | 서버 저장 불필요, 기존 패턴 재사용 |
| AXIS DS 연동 | Tailwind 토큰 레벨 | npm 직접 의존 대신 디자인 토큰만 반영 |

---

## 9. Next Steps

1. [ ] SPEC.md에 F241~F244 등록
2. [ ] Design 문서 작성 (`ia-restructure.design.md`)
3. [ ] Sprint 82 시작 (사이드바 IA 재구조화)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-30 | Initial draft | Sinclair Seo |
