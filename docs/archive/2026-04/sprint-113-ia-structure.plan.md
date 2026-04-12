---
code: FX-PLAN-113
title: Sprint 113 — IA 구조 기반 (Role-based Sidebar + 리브랜딩)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 113
f-items: F288, F289
phase: "Phase 11-A"
---

# Sprint 113 — IA 구조 기반 (Role-based Sidebar + 리브랜딩)

> **Summary**: Figma v0.92 정합을 위한 사이드바 구조 개편 — Role-based visibility + 메뉴 리브랜딩/재배치
>
> **Project**: Foundry-X
> **Version**: Sprint 113
> **Author**: Sinclair Seo
> **Date**: 2026-04-03
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | BD 팀원(Member)에게 개발자 전용 메뉴(tokens/agents/architecture 등)가 노출되어 혼란 유발. 메뉴 명칭이 Figma v0.92 설계와 불일치. multi-persona/spec-generator 위치 부적절 |
| **Solution** | NavItem.visibility 속성 기반 Role 필터링 + Figma v0.92 명칭 정합 + 메뉴 재배치 (multi-persona→발굴, spec-generator→형상화 PRD) |
| **Function/UX Effect** | Member는 BD 프로세스 6단계에만 집중 (24메뉴), Admin은 전체 접근 (34메뉴). 신규 팀원 UX 대폭 개선 |
| **Core Value** | BD 팀원이 플랫폼 기능에 압도되지 않고 사업개발 워크플로에 집중할 수 있는 역할 기반 네비게이션 |

---

## 1. Overview

### 1.1 Purpose

FX-IA-Change-Plan-v1.1 문서의 17개 갭 중 **구조적 기반 5건**(S1+S2+G2+G3+S4+S5)을 해소한다.
이 Sprint에서 사이드바의 **데이터 모델**(NavItem 인터페이스)과 **필터링 로직**을 변경하여,
이후 Sprint 114(Route namespace migration)의 기반을 마련한다.

### 1.2 Background

- Figma v0.92 "사업개발 체계"와 현행 FX 프로덕션 사이드바 비교 결과 13개 갭 + 3개 보완사항 도출
- F269(Sprint 100)에서 발굴 섹션 메뉴 10→3 정리를 수행했으나, Role-based visibility와 전체 리브랜딩은 미착수
- 현재 sidebar.tsx에는 role 필터링 없이 모든 그룹이 전체 사용자에게 노출 중
- `useUserRole` hook은 이미 존재 (JWT에서 role 추출) — 사이드바에 연결만 하면 됨

### 1.3 Related Documents

- 기준 문서: [[FX-IA-Change-Plan-v1.1]] (`docs/specs/IA-renewal_v2/FX-IA-Change-Plan-v1.1.docx`)
- SPEC: [[FX-SPEC-001]] §5 Phase 11 — F288, F289
- 선행: F252 (역할별 온보딩 투어 분기 — admin 11스텝 / member 8스텝)
- 선행: F269 (발굴 IA & Page 정리 — 메뉴 10→3)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F288**: NavItem 인터페이스에 `visibility` 속성 추가 (`all` | `admin` | `conditional`)
- [ ] **F288**: `useUserRole` hook을 사이드바에 연결하여 role 기반 메뉴 필터링
- [ ] **F288**: Admin 전용 메뉴 분리 — tokens, workspace, agents, architecture, methodologies, wiki, nps-dashboard, ontology
- [ ] **F288**: 설정(settings) 메뉴 차등 노출 — Member: 개인 설정만 / Admin: 조직 전체
- [ ] **F289**: 1단계 수집 리브랜딩 — "IR Bottom-up" → "IDEA Portal", "수집 채널" → "Field 수집"
- [ ] **F289**: spec-generator를 3단계 형상화 "PRD" 메뉴로 흡수 (label 변경)
- [ ] **F289**: 시작하기(/getting-started) 조건부 숨김 — 온보딩 체크리스트 100% 완료 시 관리 그룹으로 이동
- [ ] 기존 테스트 통과 확인 (Web 265 + E2E 35 specs)

### 2.2 Out of Scope

- Route 경로(URL) 변경 → Sprint 114 (F290)
- 신규 페이지 추가 (Discovery-X, Offering, 2-tier 검증 등) → Phase 11-B
- API 변경 없음 — 프론트엔드 전용 Sprint
- multi-persona 페이지 자체 구현 → 현재 미존재, Phase 11-B에서 처리
- 301 리다이렉트 등록 → Sprint 114

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|:--------:|:------:|
| FR-01 | NavItem 인터페이스에 `visibility: 'all' \| 'admin' \| 'conditional'` 필드 추가 | High | Pending |
| FR-02 | NavGroup에도 `visibility` 적용 — 그룹 전체가 admin 전용일 수 있음 | High | Pending |
| FR-03 | sidebar.tsx에서 `useUserRole()` 호출하여 role에 따라 navItems 필터링 | High | Pending |
| FR-04 | Admin 전용 메뉴: tokens, agents, architecture, workspace, methodologies, wiki, analytics, nps, ontology | High | Pending |
| FR-05 | 1단계 수집 리브랜딩: "수집 채널"→"Field 수집", "IR Bottom-up"→"IDEA Portal" | Medium | Pending |
| FR-06 | 3단계 형상화: "Spec 생성"→"PRD" (spec-generator 흡수) | Medium | Pending |
| FR-07 | 시작하기 조건부 노출: onboarding_progress < 100이면 상단, 100이면 관리 그룹 | Medium | Pending |
| FR-08 | `conditional` visibility: 조건 함수 지원 (시작하기 온보딩 상태 기반) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 사이드바 렌더링 시간 변화 없음 (useMemo 활용) | 수동 확인 |
| Compatibility | 기존 E2E 35 specs 전체 통과 | `pnpm e2e` |
| UX | Member가 보는 메뉴 수 ~24개 이하 | 수동 카운트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] NavItem/NavGroup에 visibility 속성 추가 완료
- [ ] Member 로그인 시 Admin 전용 메뉴 미노출 확인
- [ ] Admin 로그인 시 전체 메뉴 노출 확인
- [ ] 리브랜딩 명칭 Figma v0.92 정합 확인
- [ ] 시작하기 조건부 숨김 동작 확인
- [ ] 기존 Web 테스트 265건 통과
- [ ] 기존 E2E 35 specs 통과

### 4.2 Quality Criteria

- [ ] TypeScript 타입 에러 0건
- [ ] ESLint 에러 0건
- [ ] 빌드 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| E2E 테스트가 admin 메뉴 접근 시 실패 | Medium | Medium | E2E fixture가 admin 역할인지 확인, 필요 시 role 설정 추가 |
| localStorage에 저장된 그룹 상태와 visibility 충돌 | Low | Low | 숨겨진 그룹의 openGroups 상태는 무시하도록 처리 |
| 온보딩 진행률 API 호출 추가로 사이드바 렌더링 지연 | Low | Medium | 초기값 true(노출)로 시작, API 응답 후 조건부 숨김 |

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** — Vite 8 + React 18 + React Router 7 + Zustand (기존 스택 유지)

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| visibility 모델 | NavItem 속성 | 가장 간단. 별도 config 파일이나 context 불필요 |
| role 데이터 소스 | `useUserRole()` hook (JWT 디코딩) | 이미 구현됨. 추가 API 호출 없음 |
| conditional 구현 | `condition?: (user) => boolean` 콜백 | 시작하기 온보딩 상태 등 동적 조건 지원 |
| 필터링 위치 | sidebar.tsx 내부 useMemo | 컴포넌트 단일 책임 유지, 별도 hook 불필요 |

### 6.3 변경 대상 파일

```
packages/web/src/
├── components/
│   └── sidebar.tsx          ← 핵심 변경 (NavItem/NavGroup 인터페이스 + 필터링 로직 + 리브랜딩)
├── hooks/
│   └── useUserRole.ts       ← 변경 없음 (기존 그대로 사용)
└── lib/stores/
    └── auth-store.ts        ← 변경 없음 (기존 그대로 사용)
```

### 6.4 NavItem 인터페이스 변경안

```typescript
// Before
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// After
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  visibility?: 'all' | 'admin' | 'conditional'; // default: 'all'
  condition?: (ctx: { isAdmin: boolean; onboardingComplete: boolean }) => boolean;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  stageColor?: string;
  visibility?: 'all' | 'admin' | 'conditional'; // 그룹 레벨 visibility
}
```

---

## 7. Implementation Order

### Step 1: NavItem/NavGroup 인터페이스 확장 (FR-01, FR-02)

`sidebar.tsx`의 `NavItem`, `NavGroup` 인터페이스에 `visibility` + `condition` 필드 추가.
기존 항목은 기본값 `'all'`로 동작하므로 기존 코드 변경 최소화.

### Step 2: Admin 전용 메뉴 마킹 (FR-04)

기존 `adminGroup`, `knowledgeGroup`, `externalGroup`의 항목에 `visibility: 'admin'` 추가.
`processGroups`는 모두 `'all'` 유지.

```
Admin 전용으로 전환할 항목:
- adminGroup 전체 (analytics, agents, tokens, architecture, workspace, settings)
- knowledgeGroup 중: wiki, methodologies, ontology (스킬 카탈로그는 all 유지)
- externalGroup 전체 (Discovery-X, AI Foundry)
```

### Step 3: 필터링 로직 추가 (FR-03)

sidebar.tsx에서 `useUserRole()` 호출 → `useMemo`로 필터링된 메뉴 생성.

```typescript
const { isAdmin } = useUserRole();

const filteredGroups = useMemo(() => {
  const filterItems = (items: NavItem[]) =>
    items.filter(item => {
      if (!item.visibility || item.visibility === 'all') return true;
      if (item.visibility === 'admin') return isAdmin;
      if (item.visibility === 'conditional' && item.condition) {
        return item.condition({ isAdmin, onboardingComplete });
      }
      return true;
    });
  // ... 각 그룹에 적용
}, [isAdmin, onboardingComplete]);
```

### Step 4: 리브랜딩 (FR-05, FR-06)

| 현행 label | 변경 후 label | 위치 |
|-----------|-------------|------|
| "수집 채널" | "Field 수집" | processGroups[0] collect |
| "IR Bottom-up" | "IDEA Portal" | processGroups[0] collect |
| "Spec 생성" | "PRD" | processGroups[2] shape |

### Step 5: 시작하기 조건부 노출 (FR-07, FR-08)

onboarding_progress 확인을 위해 auth-store의 user 객체에 `onboardingComplete` 필드가 있는지 확인.
없으면 API 호출 (`/api/onboarding/progress`) 또는 localStorage 캐시 활용.

### Step 6: 테스트 확인

```bash
cd packages/web
pnpm test          # 265 tests
pnpm e2e           # 35 specs
pnpm typecheck     # tsc --noEmit
```

---

## 8. 변경 전후 메뉴 수 비교

| 구분 | as-is | to-be (Member) | to-be (Admin) |
|------|:-----:|:--------------:|:-------------:|
| 상단 (대시보드+시작하기 등) | 4 | 3~4 (조건부) | 4 |
| 1. 수집 | 3 | 3 | 3 |
| 2. 발굴 | 3 | 3 | 3 |
| 3. 형상화 | 4 | 4 | 4 |
| 4. 검증/공유 | 1 | 1 | 1 |
| 5. 제품화 | 1 | 1 | 1 |
| 6. GTM | 1 | 1 | 1 |
| 지식 | 4 | 1 (스킬 카탈로그만) | 4 |
| 관리 | 6 | 1 (설정만) | 6 |
| 외부 서비스 | 2 | 0 | 2 |
| **총계** | **~29** | **~18** | **~29** |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`sprint-113-ia-structure.design.md`)
2. [ ] Sprint 113 Worktree 생성 후 구현
3. [ ] Gap Analysis → Match Rate 90%+ 확인
4. [ ] Sprint 114 (F290 Route namespace migration) Plan 작성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F288+F289 Sprint 113 Plan | Sinclair Seo |
