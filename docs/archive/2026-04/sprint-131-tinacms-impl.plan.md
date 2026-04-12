---
code: FX-PLAN-S131
title: "Sprint 131 — F311 TinaCMS 인라인 에디팅 본구현"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 131
f_items: [F311]
---

# FX-PLAN-S131 — Sprint 131: TinaCMS 인라인 에디팅 본구현

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F311 TinaCMS 인라인 에디팅 본구현 |
| Sprint | 131 |
| REQ | FX-REQ-303 (P3) |
| 목표 | 비개발자 팀원이 fx.minu.best 페이지의 텍스트를 브라우저에서 클릭→수정 → GitHub PR 자동 생성 |
| 기간 | ~16h |
| 의존성 | F310 PoC Go 판정 ✅ (G1~G5 전체 PASS, 2026-04-04) |
| PRD | FX-PLAN-013 v1.2 §4 |

## Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 콘텐츠 수정(오탈자, 텍스트 변경)이 개발자를 경유해야 함 — 비개발자는 직접 수정 불가 |
| Solution | TinaCMS 인라인 에디팅으로 브라우저에서 직접 수정 → content/edit-{timestamp} 브랜치에 자동 커밋 → GitHub PR 생성 |
| Function UX Effect | 콘텐츠 수정→PR 생성 < 5분. /admin에서 WYSIWYG 편집. 개발자 개입 없는 수정 비율 ≥ 70% |
| Core Value | 콘텐츠 관리 자율성 — 비개발자가 직접 콘텐츠를 관리하여 개발자 병목 제거 |

## §1 목표

### F311: TinaCMS 인라인 에디팅 본구현

F310 PoC에서 검증된 기반 위에 6단계로 구현:

1. **tina/config.ts 확장** — sample → landing/wiki 2개 collection
2. **콘텐츠 디렉터리 구조화** — 하드코딩 텍스트 → Markdown 파일 추출
3. **React 컴포넌트 useTina 연결** — 기존 컴포넌트에서 Markdown 콘텐츠 렌더링
4. **/admin 라우팅 3중 방어** — _redirects + RR7 fall-through + Vite public/
5. **TinaCloud 연동** — Free Plan(2 users) + Editor 권한 + 편집 브랜치 자동 생성
6. **배포 + E2E 검증** — CI/CD 환경변수 + 빌드 + 전체 테스트

## §2 범위

### 변경 파일

| # | 파일 | 변경 내용 | 신규 |
|---|------|-----------|:----:|
| 1 | `packages/web/tina/config.ts` | collection 2개 추가 (landing, wiki) | |
| 2 | `packages/web/content/landing/hero.md` | 랜딩 Hero 섹션 텍스트 | ✅ |
| 3 | `packages/web/content/landing/features.md` | 랜딩 Features 섹션 텍스트 | ✅ |
| 4 | `packages/web/content/wiki/intro.md` | Wiki 소개 페이지 콘텐츠 | ✅ |
| 5 | `packages/web/src/routes/landing.tsx` | 하드코딩 → Markdown import + useTina (조건부) |  |
| 6 | `packages/web/src/components/landing/*.tsx` | Hero/Features 섹션에서 content props 수용 |  |
| 7 | `packages/web/public/_redirects` | /admin → /admin/index.html 200 규칙 추가 |  |
| 8 | `.github/workflows/deploy.yml` | VITE_TINA_CLIENT_ID secret env 주입 |  |

### 변경하지 않는 영역
- API 서버 — 변경 없음
- D1 마이그레이션 — 스키마 변경 없음
- shared 패키지 — 타입 변경 없음
- 기존 Wiki API 연동 — TinaCMS 콘텐츠와 병행 (즉시 전환하지 않음)

### MVP 범위 제한 (PRD §4.3 준수)
- **2페이지만 대상**: landing(Hero+Features) + wiki(intro)
- 나머지 페이지는 Phase B 트리거 충족 확인 후 확대

## §3 기술 설계 요약

### Phase 1: tina/config.ts 확장

PoC의 sample collection을 landing + wiki로 교체:

```ts
collections: [
  {
    name: "landing",
    label: "Landing Pages",
    path: "content/landing",
    format: "md",
    fields: [
      { type: "string", name: "title", label: "Title", isTitle: true, required: true },
      { type: "string", name: "section", label: "Section" },
      { type: "rich-text", name: "body", label: "Body", isBody: true },
    ],
  },
  {
    name: "wiki",
    label: "Wiki Pages",
    path: "content/wiki",
    format: "md",
    fields: [
      { type: "string", name: "title", label: "Title", isTitle: true, required: true },
      { type: "string", name: "category", label: "Category" },
      { type: "rich-text", name: "body", label: "Body", isBody: true },
    ],
  },
]
```

### Phase 2: 콘텐츠 마이그레이션

landing.tsx 등에서 하드코딩된 텍스트를 `content/landing/hero.md`, `content/landing/features.md`로 추출.

```md
<!-- content/landing/hero.md -->
---
title: "Foundry-X"
section: "hero"
---

AI 에이전트와 함께 만드는 조직 협업 플랫폼
```

### Phase 3: useTina hook 연결

landing 컴포넌트에서 콘텐츠를 props로 수용하도록 리팩토링:

```tsx
import { useTina } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
```

> **중요**: useTina는 TinaCMS dev 모드에서만 라이브 편집이 가능. 프로덕션에서는 빌드 시점의 정적 콘텐츠가 서빙됨. 따라서 프로덕션 빌드에서도 content/*.md를 읽어 렌더링하는 fallback이 필요.

### Phase 4: /admin 라우팅 3중 방어

`packages/web/public/_redirects` 수정:

```
/admin    /admin/index.html  200
/admin/*  /admin/index.html  200
/api/*    https://foundry-x-api.ktds-axbd.workers.dev/api/:splat  200
/*        /index.html   200
```

- /admin 규칙을 /* catch-all보다 **앞에** 배치 (Cloudflare Pages는 상위 우선)
- React Router는 app/(app)/ 하위만 처리하므로 /admin에 자연스럽게 fall-through

### Phase 5: TinaCloud 연동 (수동 작업)

| 작업 | 설명 |
|------|------|
| TinaCloud 가입 | tina.io — ktds.axbd@gmail.com (Free Plan, 2 users) |
| GitHub App 설치 | KTDS-AXBD/Foundry-X 권한 부여 |
| Client ID + Token 획득 | TinaCloud 대시보드에서 복사 |
| GitHub Secret 등록 | `VITE_TINA_CLIENT_ID`, `TINA_TOKEN` |
| deploy.yml 환경변수 | web build 단계에 env 주입 |
| Editor 초대 | 비개발자 이메일 → Editor 권한 |

### Phase 6: 배포 + 검증

```bash
# 빌드 검증
npx tinacms build        # tina/__generated__ + public/admin/
pnpm build               # Vite 프로덕션 빌드
pnpm typecheck
pnpm e2e                 # 전체 통과 확인

# CI/CD 배포 (master push 시 자동)
```

## §4 구현 순서

| 단계 | 작업 | 파일 | 검증 |
|:----:|------|------|------|
| 1 | tina/config.ts: sample → landing+wiki | tina/config.ts | `npx tinacms dev` 정상 기동 |
| 2 | content/landing/{hero,features}.md 작성 | content/landing/*.md | 파일 존재 + TinaCMS UI에서 표시 |
| 3 | content/wiki/intro.md 작성 | content/wiki/intro.md | TinaCMS UI에서 표시 |
| 4 | landing 컴포넌트 리팩토링 — content props 수용 | routes/landing.tsx, components/landing/*.tsx | 기존 렌더링 유지 |
| 5 | useTina hook 연결 (landing MVP) | routes/landing.tsx | TinaCMS dev 모드에서 인라인 편집 |
| 6 | _redirects: /admin 규칙 추가 | public/_redirects | 빌드 후 /admin 접근 정상 |
| 7 | sample collection + content 정리 | tina/config.ts, content/sample/ | PoC 파일 제거 |
| 8 | typecheck + build + E2E | — | 전체 통과 |
| 9 | (수동) TinaCloud 가입 + GitHub App + secrets | — | /admin에서 TinaCloud 로그인 성공 |
| 10 | (수동) deploy.yml env 주입 + CI/CD 배포 | .github/workflows/deploy.yml | fx.minu.best/admin 정상 |

## §5 성공 지표

| 지표 | 목표 |
|------|------|
| /admin 접속 시 TinaCloud 로그인 → 편집 화면 | ✅ |
| 텍스트 수정 후 저장 시 GitHub PR 자동 생성 | ✅ (< 5분) |
| PR에서 turbo build CI 통과 | ✅ |
| pnpm e2e 전체 통과 (회귀 0건) | ✅ |
| 비개발자 1명 이상 독립 콘텐츠 수정 성공 | ✅ |

## §6 리스크

| # | 리스크 | 확률 | 대응 |
|---|--------|:----:|------|
| R1 | useTina hook + 기존 컴포넌트 통합 복잡성 | 중 | MVP 2페이지만 대상, 점진적 확대 |
| R2 | _redirects /admin 규칙이 /* catch-all에 가려짐 | 중 | /admin 규칙을 파일 최상단에 배치 |
| R3 | TinaCloud Free Plan 제한 (2 users) | 낮 | 초기 팀 규모 2명이면 충분, 필요 시 Team $29/월 |
| R4 | 프로덕션 빌드에서 tinacms 번들 사이즈 증가 | 중 | tinacms는 /admin 정적 파일에만 포함, 메인 번들 미영향 |
| R5 | content/*.md 수정 시 CI 빌드 필요 | 낮 | TinaCloud가 자동으로 PR 생성 → CI 트리거 |
