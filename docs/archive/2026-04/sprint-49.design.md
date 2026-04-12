---
code: FX-DSGN-049
title: Sprint 49 — 대시보드 IA 재설계 + 인터랙티브 온보딩 투어 Design
version: 0.1
status: Draft
category: DSGN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# Sprint 49 Design Document

> Plan: [[FX-PLAN-049]]

---

## 1. 컴포넌트 설계

### 1.1 sidebar.tsx — 그룹 메뉴 구조

**데이터 구조:**
```typescript
interface NavItem { href: string; label: string; icon: LucideIcon; }
interface NavGroup { key: string; label: string; icon: LucideIcon; items: NavItem[]; }
```

**구성:**
- `topItems`: 시작하기, 홈 (그룹 없이 최상단)
- `navGroups[3]`: SR 관리 / 개발 / 현황 (collapsible)
- `utilItems`: 지식베이스, 아키텍처, 내 작업 (그룹 없이 중간)
- `serviceGroup`: 외부 서비스 (collapsible)
- 도움말: 하단 고정

**Collapsible 로직:**
- `useGroupState()` — Set<string> + localStorage 영속
- 활성 경로가 포함된 그룹은 자동 펼침
- `data-tour="..."` 속성으로 투어 타게팅 지원

**AXIS DS 적용:**
- 기존 sidebar CSS 변수 (`--sidebar-*`) 활용
- 그룹 하위 아이템: `border-l border-border/40` 인덴트 라인
- ChevronRight → 90° 회전으로 펼침/접힘 표현

### 1.2 OnboardingTour.tsx — 인터랙티브 투어

**아키텍처:** react-joyride 대신 순수 React + AXIS DS 자체 구현
- `SpotlightOverlay`: SVG mask로 타겟 엘리먼트 하이라이트
- `TourTooltip`: axis-glass 스타일 + fade-in-up 애니메이션
- `createPortal(document.body)`로 z-index 격리

**6스텝:**
1. 시작하기 → 2. 홈 → 3. SR 관리 → 4. 개발 → 5. 현황 → 6. 완료

**트리거:** `localStorage('fx-tour-completed')` 없으면 첫 로그인 시 800ms 후 자동 시작

### 1.3 Getting Started 페이지 업데이트

- 기존 5개 FeatureCard → 3대 동선 WorkflowQuickstart 카드 + 3개 보조 카드
- WelcomeBanner에 "투어 다시 보기" 버튼 추가
- AXIS 시맨틱 컬러 적용 (axis-primary, axis-accent, axis-green)

---

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `packages/web/src/components/sidebar.tsx` | 수정 | 그룹 메뉴 구조 재편 |
| `packages/web/src/components/feature/OnboardingTour.tsx` | 신규 | 인터랙티브 투어 컴포넌트 |
| `packages/web/src/app/(app)/layout.tsx` | 수정 | OnboardingTour 마운트 |
| `packages/web/src/app/(app)/getting-started/page.tsx` | 수정 | 3대 동선 퀵스타트 + 투어 재시작 |
| `packages/web/e2e/dashboard.spec.ts` | 수정 | 사이드바 레이블 한국어 동기화 |

---

## 3. URL 경로 변경 없음

기존 라우트 `/dashboard`, `/sr`, `/agents` 등 전체 유지.
사이드바의 시각적 그룹핑과 레이블만 변경.

---

## 4. 테스트 전략

- Web 단위 테스트: 기존 74개 전체 통과 확인
- E2E: dashboard.spec.ts 레이블 동기화
- 수동 검증: 첫 로그인 투어 동작 + 그룹 접기/펼치기 + localStorage 영속

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | 초안 — 구현 기반 역설계 | Sinclair Seo |
