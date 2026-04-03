---
code: FX-PLAN-114
title: Sprint 114 — Route Namespace 마이그레이션 (F290)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 114
f-items: F290
phase: "Phase 11-A"
---

# Sprint 114 — Route Namespace 마이그레이션 (F290)

> **Summary**: flat 라우트 경로를 BD 6단계 계층 구조로 전환하고, 기존 경로에 대한 301 redirect를 등록하여 북마크/딥링크 호환성을 유지한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 114
> **Author**: Sinclair Seo
> **Date**: 2026-04-03
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 URL 구조가 flat(/sr, /spec-generator, /pipeline 등)하여 BD 6단계 프로세스 소속을 URL만으로 알 수 없음. sidebar 그룹과 URL 네임스페이스 불일치로 사용자 혼란 + ProcessStageGuide 경로 매핑이 하드코딩 |
| **Solution** | 6단계 namespace prefix 도입 (/collection/*, /discovery/*, /shaping/*, /validation/*, /product/*, /gtm/*) + React Router `<Navigate>` 기반 14건 redirect + ProcessStageGuide paths 갱신 |
| **Function/UX Effect** | URL만으로 현재 프로세스 단계 직관적 파악. 기존 북마크/딥링크는 자동 redirect로 끊김 없음. E2E 테스트 경로 갱신으로 CI 안정성 유지 |
| **Core Value** | BD 6단계 라이프사이클이 URL 구조에 1:1 반영되어 정보 구조(IA) 일관성 달성 — "경로를 보면 단계가 보인다" |

---

## 1. Overview

### 1.1 Purpose

SPEC F290(FX-REQ-282, P1) — flat 경로를 BD 6단계 프로세스 계층 구조로 전환한다.
Sprint 113(F288+F289)에서 사이드바 Role-based visibility + 리브랜딩을 완료했으므로,
이제 URL 구조를 사이드바 메뉴 그룹과 정합시키는 단계이다.

### 1.2 Background

- Sprint 113에서 사이드바 메뉴를 6단계(수집/발굴/형상화/검증·공유/제품화/GTM)로 그룹화 완료
- 그러나 URL은 여전히 flat: `/sr`, `/spec-generator`, `/pipeline` 등 루트 레벨
- ProcessStageGuide의 `paths` 배열이 하드코딩되어 있어 URL 변경 시 함께 갱신 필요
- E2E 17개 spec 파일에서 기존 경로를 `page.goto()`로 직접 참조 중
- FX-IA-Change-Plan-v1.1 기준 "S3: Route namespace migration" 해소 대상

### 1.3 Related Documents

- 기준 문서: [[FX-IA-Change-Plan-v1.1]] (`docs/specs/IA-renewal_v2/FX-IA-Change-Plan-v1.1.docx`)
- SPEC: [[FX-SPEC-001]] §5 Phase 11 — F290
- 선행: Sprint 113 F288+F289 (Role-based sidebar + 리브랜딩) ✅
- Plan: [[FX-PLAN-113]] Sprint 113 — IA 구조 기반

---

## 2. Scope

### 2.1 In Scope

- [ ] **F290-1**: router.tsx에서 프로세스 6단계 경로를 namespace prefix로 전환
- [ ] **F290-2**: sidebar.tsx의 모든 href를 새 경로로 갱신
- [ ] **F290-3**: ProcessStageGuide의 `STAGES[].paths` + `nextAction.href`를 새 경로로 갱신
- [ ] **F290-4**: `<Navigate>` 기반 redirect 14건 등록 (기존 경로 → 새 경로)
- [ ] **F290-5**: 컴포넌트 내 `<Link to=...>`, `navigate()` 등 내부 링크 일괄 갱신 (~34파일 107건)
- [ ] **F290-6**: E2E 테스트 경로 갱신 (17개 spec 파일)
- [ ] **F290-7**: dashboard.tsx 등 컴포넌트 내 하드코딩된 경로 갱신
- [ ] **F290-8**: 기존 Web 테스트 + E2E 전체 통과 확인

### 2.2 Out of Scope

- API 경로 변경 없음 — 프론트엔드 라우팅만 변경
- 새 페이지 추가 없음 (Phase 11-B F291~F296)
- 라우트 파일 물리적 이동/리네이밍 — 파일 이름은 유지, router.tsx path만 변경
- 서버사이드 리다이렉트 — SPA이므로 클라이언트 측 `<Navigate>` 사용

---

## 3. Requirements

### 3.1 Route Mapping Table (핵심)

#### 1단계 수집 (collection)

| as-is | to-be | 라우트 파일 |
|-------|-------|------------|
| `/sr` | `/collection/sr` | sr.tsx |
| `/sr/:id` | `/collection/sr/:id` | sr-detail.tsx |
| `/discovery/collection` | `/collection/field` | discovery-collection.tsx |
| `/ir-proposals` | `/collection/ideas` | ir-proposals.tsx |

#### 2단계 발굴 (discovery)

| as-is | to-be | 라우트 파일 |
|-------|-------|------------|
| `/ax-bd/discovery` | `/discovery/items` | ax-bd/discovery.tsx |
| `/ax-bd/discovery/:id` | `/discovery/items/:id` | ax-bd/discovery-detail.tsx |
| `/ax-bd/ideas-bmc` | `/discovery/ideas-bmc` | ax-bd/ideas-bmc.tsx |
| `/ax-bd/discover-dashboard` | `/discovery/dashboard` | ax-bd/discover-dashboard.tsx |
| `/discovery-progress` | `/discovery/progress` | discovery-progress.tsx |

#### 3단계 형상화 (shaping)

| as-is | to-be | 라우트 파일 |
|-------|-------|------------|
| `/spec-generator` | `/shaping/prd` | spec-generator.tsx |
| `/ax-bd` (사업제안서) | `/shaping/proposal` | ax-bd/index.tsx |
| `/ax-bd/shaping` | `/shaping/review` | ax-bd/shaping.tsx |
| `/ax-bd/shaping/:runId` | `/shaping/review/:runId` | ax-bd/shaping-detail.tsx |
| `/offering-packs` | `/shaping/offering` | offering-packs.tsx |
| `/offering-packs/givc-pitch` | `/shaping/offering/givc-pitch` | offering-pack-givc-pitch.tsx |
| `/offering-packs/:id` | `/shaping/offering/:id` | offering-pack-detail.tsx |

#### 4단계 검증/공유 (validation)

| as-is | to-be | 라우트 파일 |
|-------|-------|------------|
| `/pipeline` | `/validation/pipeline` | pipeline.tsx |

#### 5단계 제품화 (product)

| as-is | to-be | 라우트 파일 |
|-------|-------|------------|
| `/mvp-tracking` | `/product/mvp` | mvp-tracking.tsx |

#### 6단계 GTM (gtm)

| as-is | to-be | 라우트 파일 |
|-------|-------|------------|
| `/projects` | `/gtm/projects` | projects.tsx |

#### 비프로세스 경로 (변경 없음)

| 경로 | 비고 |
|------|------|
| `/dashboard` | 홈 — 유지 |
| `/getting-started` | 시작하기 — 유지 |
| `/team-shared` | 팀 공유 — 유지 |
| `/ax-bd/demo` | 데모 — 유지 |
| `/login`, `/invite` | 인증 — 유지 |
| `/wiki`, `/methodologies`, `/ax-bd/skill-catalog`, `/ax-bd/ontology` | 지식 — 유지 |
| `/analytics`, `/agents`, `/tokens`, `/architecture`, `/workspace`, `/settings/*` | 관리 — 유지 |
| `/discovery`, `/foundry` | 외부 서비스 — 유지 |
| `/ax-bd/ideas`, `/ax-bd/ideas/:id`, `/ax-bd/bmc`, `/ax-bd/bmc/*`, `/ax-bd/bdp/*` | 발굴 상세 — ax-bd 하위 유지 또는 discovery 하위 이전 (아래 Decision 참조) |
| `/ax-bd/artifacts`, `/ax-bd/artifacts/:id`, `/ax-bd/progress` | BD 부속 — 유지 |

### 3.2 Redirect 목록 (14건)

| # | from | to | 유형 |
|---|------|----|------|
| 1 | `/sr` | `/collection/sr` | Navigate replace |
| 2 | `/discovery/collection` | `/collection/field` | Navigate replace |
| 3 | `/ir-proposals` | `/collection/ideas` | Navigate replace |
| 4 | `/ax-bd/discovery` | `/discovery/items` | Navigate replace |
| 5 | `/ax-bd/ideas-bmc` | `/discovery/ideas-bmc` | Navigate replace |
| 6 | `/ax-bd/discover-dashboard` | `/discovery/dashboard` | Navigate replace |
| 7 | `/discovery-progress` | `/discovery/progress` | Navigate replace |
| 8 | `/spec-generator` | `/shaping/prd` | Navigate replace |
| 9 | `/ax-bd/shaping` | `/shaping/review` | Navigate replace |
| 10 | `/offering-packs` | `/shaping/offering` | Navigate replace |
| 11 | `/pipeline` | `/validation/pipeline` | Navigate replace |
| 12 | `/mvp-tracking` | `/product/mvp` | Navigate replace |
| 13 | `/projects` | `/gtm/projects` | Navigate replace |
| 14 | `/ax-bd` | `/shaping/proposal` | Navigate replace |

### 3.3 ax-bd 하위 라우트 결정

현재 `/ax-bd/ideas`, `/ax-bd/bmc`, `/ax-bd/bdp` 등은 발굴 단계 상세 페이지이다.
이 Sprint에서는 **사이드바에 직접 노출되는 프로세스 경로만** namespace 전환하고,
상세/부속 페이지(ideas/:id, bmc/:id, bdp/:bizItemId 등)는 현행 유지한다.

> 이유: 상세 페이지까지 전환하면 API 응답의 링크, 컴포넌트 간 navigate() 호출이 대폭 증가하여 리스크 커짐.
> Phase 11-B에서 개별 기능 확장 시 점진적으로 전환.

### 3.4 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Compatibility | 기존 Web 265+ tests 전체 통과 | `pnpm test` |
| Compatibility | E2E 35 specs 전체 통과 (경로 갱신 후) | `pnpm e2e` |
| Performance | 라우터 번들 크기 변화 < 1KB | 빌드 후 확인 |
| UX | 기존 경로 접근 시 새 경로로 자동 이동 | 수동 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] router.tsx에서 프로세스 6단계 경로가 namespace prefix 적용
- [ ] sidebar.tsx의 모든 href가 새 경로와 일치
- [ ] ProcessStageGuide의 paths + nextAction이 새 경로와 일치
- [ ] Redirect 14건이 정상 동작 (기존 URL → 새 URL 자동 이동)
- [ ] 내부 컴포넌트의 Link/navigate 경로가 새 경로로 갱신
- [ ] E2E 17개 관련 spec의 경로가 갱신되어 통과
- [ ] Web 테스트 전체 통과
- [ ] TypeScript 타입 에러 0건 + ESLint 에러 0건

### 4.2 Quality Criteria

- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] `pnpm build` 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| E2E 테스트 경로 누락으로 CI 실패 | High | Medium | 변경 전 `grep -r "goto\|page.goto" e2e/` 로 전수 조사 후 일괄 치환 |
| 컴포넌트 내 하드코딩된 경로 누락 | Medium | High | `grep -rn "to=\"/" src/` 전수 조사 + redirect fallback으로 2중 보호 |
| /ax-bd 하위 상세 페이지 링크 깨짐 | Medium | Low | 이 Sprint에서 상세 페이지 경로는 변경하지 않으므로 위험 낮음 |
| ProcessStageGuide 경로 불일치로 단계 가이드 미표시 | Low | Medium | paths 배열 갱신 + 수동 테스트 확인 |
| 외부 서비스(/discovery, /foundry) 경로와 namespace 충돌 | Medium | Low | /discovery → 2단계 발굴 namespace, 기존 외부 서비스 /discovery는 admin 전용이므로 분리 검토 필요 |

### 5.1 /discovery 경로 충돌 해소

현재 두 개의 `/discovery` 관련 경로가 있다:
1. **외부 서비스** (admin 전용): `/discovery` → Discovery-X 외부 링크 페이지
2. **프로세스 2단계**: `/ax-bd/discovery` → 발굴 목록 페이지

namespace 전환 후:
- 2단계 발굴: `/discovery/items`, `/discovery/ideas-bmc`, `/discovery/dashboard`, `/discovery/progress`
- 외부 서비스 `/discovery`: **`/external/discovery-x`로 이전** (admin 전용, 사용 빈도 낮음)

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** — Vite 8 + React 18 + React Router 7 + Zustand

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| Redirect 구현 | React Router `<Navigate replace>` | SPA이므로 서버사이드 불필요. replace로 히스토리 오염 방지 |
| 경로 중앙 관리 | 상수 객체 `ROUTES` 도입 검토 | 하드코딩 경로 34개 파일 분산 → 중앙 상수로 추후 변경 용이. 단, 이 Sprint에서는 직접 치환만 수행 (YAGNI) |
| 라우트 파일 위치 | 물리적 파일 이동 없음 | import 경로 변경 최소화. router.tsx의 `path` 속성만 변경 |
| /discovery 충돌 | 외부 서비스를 /external/* 로 이전 | 프로세스 단계가 우선, 외부 서비스는 admin 전용이므로 이전 부담 적음 |
| ax-bd 상세 페이지 | 현행 유지 | 이 Sprint 범위 제한. Phase 11-B에서 점진 전환 |

### 6.3 변경 대상 파일 (영향 범위)

```
packages/web/src/
├── router.tsx                              ← 핵심: path 속성 전환 + redirect 등록
├── components/
│   ├── sidebar.tsx                         ← href 전체 갱신
│   └── feature/
│       ├── ProcessStageGuide.tsx           ← STAGES[].paths + nextAction 갱신
│       ├── AnalysisPathStepper.tsx         ← 내부 링크 확인
│       ├── ServiceContainer.tsx            ← 내부 링크 확인
│       ├── OrgSwitcher.tsx                 ← 내부 링크 확인
│       ├── InviteForm.tsx                  ← 내부 링크 확인
│       └── ax-bd/
│           ├── IdeaDetailPage.tsx          ← navigate 경로 확인
│           ├── BmcListPage.tsx             ← Link 경로 확인
│           ├── BmcEditorPage.tsx           ← Link 경로 확인
│           └── ArtifactDetail.tsx          ← Link 경로 확인
├── routes/
│   ├── dashboard.tsx                       ← 내부 링크 갱신
│   ├── landing.tsx                         ← CTA 링크 확인
│   └── ...                                ← 각 라우트 내 navigate() 확인
├── __tests__/
│   ├── components.test.tsx                 ← 테스트 경로 확인
│   ├── test-agent-panel.test.tsx           ← 테스트 경로 확인
│   └── model-quality.test.tsx             ← 테스트 경로 확인
└── e2e/                                    ← 17개 spec 파일 경로 갱신
    ├── spec-generator.spec.ts
    ├── pipeline-dashboard.spec.ts
    ├── ax-bd-hub.spec.ts
    ├── discovery-wizard.spec.ts
    ├── shaping.spec.ts
    └── ... (12개 추가)
```

---

## 7. Implementation Order

### Step 1: router.tsx — namespace 경로 전환 + redirect 등록

1. 프로세스 6단계 경로를 namespace prefix 적용
2. 기존 경로에 `<Navigate to="..." replace />` redirect 14건 등록
3. /discovery 외부 서비스를 /external/discovery-x로 이전
4. /foundry 외부 서비스를 /external/foundry로 이전

```typescript
// Before
{ path: "sr", lazy: () => import("@/routes/sr") },
// After
{ path: "collection/sr", lazy: () => import("@/routes/sr") },
{ path: "sr", element: <Navigate to="/collection/sr" replace /> },
```

### Step 2: sidebar.tsx — href 갱신

processGroups, knowledgeGroup, externalGroup의 모든 href를 새 경로로 변경.
topItems와 adminGroup은 변경 없음 (비프로세스 경로).

### Step 3: ProcessStageGuide.tsx — paths + nextAction 갱신

STAGES 배열의 paths와 nextAction.href를 새 경로로 갱신.

```typescript
// Before
paths: ["/sr", "/discovery/collection", "/ir-proposals"],
// After
paths: ["/collection/sr", "/collection/field", "/collection/ideas"],
```

### Step 4: 내부 링크 일괄 갱신

`grep -rn` 으로 기존 프로세스 경로를 참조하는 모든 컴포넌트를 찾아 갱신.
주요 패턴: `to="/"`, `href="/"`, `navigate("/"`, `goto("/"`

### Step 5: E2E 테스트 경로 갱신

17개 spec 파일의 `page.goto()` 경로를 새 경로로 변경.
redirect가 있으므로 기존 경로도 동작하지만, 테스트는 최종 URL을 직접 사용해야 안정적.

### Step 6: 테스트 확인

```bash
cd packages/web
pnpm typecheck     # tsc --noEmit
pnpm test          # vitest (265+ tests)
pnpm build         # 빌드 확인
pnpm e2e           # Playwright (35 specs)
```

---

## 8. Redirect 동작 검증 체크리스트

| # | 입력 URL | 기대 결과 |
|---|----------|----------|
| 1 | `/sr` | → `/collection/sr` (즉시 이동, 히스토리 미추가) |
| 2 | `/sr/123` | → 404 또는 현행 유지 (상세 페이지는 이 Sprint 대상 아님) |
| 3 | `/spec-generator` | → `/shaping/prd` |
| 4 | `/pipeline` | → `/validation/pipeline` |
| 5 | `/projects` | → `/gtm/projects` |
| 6 | `/ax-bd` | → `/shaping/proposal` |
| 7 | `/discovery/collection` | → `/collection/field` |
| 8 | `/offering-packs` | → `/shaping/offering` |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`sprint-114-route-namespace.design.md`)
2. [ ] Sprint 114 Worktree 생성 후 구현
3. [ ] Gap Analysis → Match Rate 90%+ 확인
4. [ ] Sprint 115~ (Phase 11-B) 기능 확장 계획

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F290 Route namespace 마이그레이션 | Sinclair Seo |
