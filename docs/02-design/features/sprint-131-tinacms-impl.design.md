---
code: FX-DSGN-S131
title: "Sprint 131 — F311 TinaCMS 인라인 에디팅 본구현 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 131
f_items: [F311]
---

# FX-DSGN-S131 — Sprint 131: TinaCMS 인라인 에디팅 본구현

## §1 설계 목표

F310 PoC 기반 위에 실제 콘텐츠를 TinaCMS로 관리. MVP 범위: landing(hero 텍스트) + wiki(intro). API/DB 변경 없음.

## §2 기존 자산 분석

| 자산 | 위치 | 활용 |
|------|------|------|
| `tina/config.ts` | `packages/web/tina/config.ts` | PoC sample → landing+wiki collection으로 확장 |
| `content/sample/hello.md` | `packages/web/content/sample/` | 삭제 (landing/wiki로 대체) |
| `tina/__generated__` | `packages/web/tina/__generated__/` | .gitignore 등록 완료 ✅ (PoC) |
| `public/admin/index.html` | `packages/web/public/admin/` | TinaCMS 관리 UI (PoC에서 생성됨) |
| `_redirects` | `packages/web/public/_redirects` | /admin 규칙 추가 필요 |
| `landing.tsx` | `packages/web/src/routes/landing.tsx` | SITE_META 텍스트를 content/landing/hero.md에서 가져오도록 변경 |
| `wiki.tsx` | `packages/web/src/routes/wiki.tsx` | API 기반 유지 — TinaCMS 전환은 MVP 범위 외 (wiki intro만 대상) |
| `tinacms`, `@tinacms/cli` | `packages/web/package.json` devDeps | PoC에서 설치 완료 ✅ |

### Landing 페이지 콘텐츠 분석

landing.tsx의 데이터 구조 유형:

| 데이터 | 유형 | TinaCMS 마이그레이션 |
|--------|------|:-------------------:|
| `SITE_META` (tagline, phase) | 단순 텍스트 | ✅ hero.md로 추출 |
| `stats` (수치 배열) | 텍스트+숫자 | ✅ hero.md frontmatter |
| `pillars` (아이콘+색상+텍스트) | 복합 객체 | ❌ 코드 유지 (Lucide 아이콘 참조) |
| `agents` (아이콘+텍스트) | 복합 객체 | ❌ 코드 유지 |
| `architecture`, `roadmap` | 복합 객체 | ❌ 코드 유지 |
| `processSteps` (아이콘+텍스트) | 복합 객체 | ❌ 코드 유지 |

> **설계 결정**: Lucide 아이콘/색상 참조가 포함된 복합 객체는 Markdown으로 추출 불가. **SITE_META + stats만 MVP 대상**.

## §3 상세 설계

### Phase 1: tina/config.ts 확장

**파일**: `packages/web/tina/config.ts`

```ts
import { defineConfig } from "tinacms";

export default defineConfig({
  branch: process.env.TINA_BRANCH ?? "master",
  clientId: process.env.VITE_TINA_CLIENT_ID ?? "",
  token: process.env.TINA_TOKEN ?? "",
  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  schema: {
    collections: [
      {
        name: "landing",
        label: "Landing Pages",
        path: "content/landing",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "string", name: "section", label: "Section" },
          { type: "string", name: "tagline", label: "Tagline" },
          { type: "string", name: "phase", label: "Current Phase" },
          { type: "string", name: "phaseTitle", label: "Phase Title" },
          {
            type: "object",
            name: "stats",
            label: "Stats",
            list: true,
            fields: [
              { type: "string", name: "value", label: "Value" },
              { type: "string", name: "label", label: "Label" },
            ],
          },
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
    ],
  },
});
```

### Phase 2: 콘텐츠 파일 생성

**파일 1**: `packages/web/content/landing/hero.md`

```md
---
title: "Foundry-X Hero"
section: "hero"
tagline: "AX 사업개발 AI 오케스트레이션 플랫폼"
phase: "Phase 5f 완료"
phaseTitle: "AX BD 사업개발 체계 수립"
stats:
  - value: "304"
    label: "API Endpoints"
  - value: "135"
    label: "Services"
  - value: "2,032+"
    label: "Tests"
  - value: "60"
    label: "D1 Migrations"
  - value: "71"
    label: "Sprints"
---

AI 에이전트와 사람이 함께 만드는 조직 협업 플랫폼.
Git이 진실, Foundry-X는 렌즈.
```

**파일 2**: `packages/web/content/wiki/intro.md`

```md
---
title: "Foundry-X 소개"
category: "getting-started"
---

Foundry-X는 AX 사업개발 업무의 전체 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼이에요.
```

**PoC 정리**: `content/sample/` 디렉터리 삭제

### Phase 3: landing.tsx 리팩토링

**변경 범위**: SITE_META와 stats를 hero.md에서 가져오도록 변경.

```tsx
// packages/web/src/routes/landing.tsx — 상단에 추가
import heroData from "../../content/landing/hero.md";

// SITE_META를 content 기반으로 교체
const SITE_META = {
  sprint: "Sprint 71",  // 유지 (자동 감지 영역)
  phase: heroData.phase ?? "Phase 5f 완료",
  phaseTitle: heroData.phaseTitle ?? "AX BD 사업개발 체계 수립",
  tagline: heroData.tagline ?? "AX 사업개발 AI 오케스트레이션 플랫폼",
} as const;

const stats = heroData.stats?.length
  ? heroData.stats
  : [/* 기존 하드코딩 fallback */];
```

> **Fallback 패턴**: TinaCMS 콘텐츠 로드 실패 시 기존 하드코딩 값으로 fallback. 프로덕션 안정성 보장.

**주의**: `import heroData from "../../content/landing/hero.md"` — Vite의 raw import 또는 TinaCMS의 `useTina` hook을 사용해야 함. 정적 import보다 TinaCMS GraphQL 클라이언트를 사용하는 것이 정석:

```tsx
import { client } from "../../tina/__generated__/client";

// getStaticProps 대안 — Vite에서는 useEffect로 처리
const [heroContent, setHeroContent] = useState(SITE_META_FALLBACK);

useEffect(() => {
  client.queries.landing({ relativePath: "hero.md" })
    .then((res) => {
      const data = res.data.landing;
      setHeroContent({
        tagline: data.tagline ?? SITE_META_FALLBACK.tagline,
        phase: data.phase ?? SITE_META_FALLBACK.phase,
        phaseTitle: data.phaseTitle ?? SITE_META_FALLBACK.phaseTitle,
      });
    })
    .catch(() => { /* fallback 유지 */ });
}, []);
```

### Phase 4: _redirects 수정

**파일**: `packages/web/public/_redirects`

```
/admin    /admin/index.html  200
/admin/*  /admin/index.html  200
/api/*    https://foundry-x-api.ktds-axbd.workers.dev/api/:splat  200
/*        /index.html   200
```

- `/admin` 규칙을 `/api/*`와 `/*` 사이에 배치 (최상단 우선)

### Phase 5: deploy.yml 환경변수

**파일**: `.github/workflows/deploy.yml` — deploy-web job의 build 단계

```yaml
      - run: pnpm --filter @foundry-x/web build
        env:
          VITE_MARKER_PROJECT_ID: ${{ secrets.VITE_MARKER_PROJECT_ID }}
          VITE_TINA_CLIENT_ID: ${{ secrets.VITE_TINA_CLIENT_ID }}
```

### Phase 6: PoC 정리

- `content/sample/` 디렉터리 삭제
- `tina/config.ts`에서 sample collection 제거

## §4 구현 순서

| 단계 | 파일 | 작업 | 검증 |
|:----:|------|------|------|
| 1 | `tina/config.ts` | sample → landing+wiki collection | `npx tinacms dev` 정상 |
| 2 | `content/landing/hero.md` | Hero 콘텐츠 작성 | TinaCMS UI에서 표시 |
| 3 | `content/wiki/intro.md` | Wiki intro 콘텐츠 작성 | TinaCMS UI에서 표시 |
| 4 | `content/sample/` | 삭제 | — |
| 5 | `routes/landing.tsx` | SITE_META fallback + TinaCMS client 연결 | 기존 렌더링 유지 |
| 6 | `public/_redirects` | /admin 규칙 추가 | — |
| 7 | `.github/workflows/deploy.yml` | VITE_TINA_CLIENT_ID env 추가 | — |
| 8 | 전체 검증 | `pnpm typecheck && pnpm build && pnpm e2e` | 에러 0건 + E2E 전체 통과 |

## §5 검증 체크리스트

- [ ] tina/config.ts: landing+wiki 2 collections
- [ ] content/landing/hero.md 존재 + TinaCMS UI 편집 가능
- [ ] content/wiki/intro.md 존재 + TinaCMS UI 편집 가능
- [ ] content/sample/ 삭제됨
- [ ] landing.tsx: SITE_META fallback 동작 (TinaCMS 미기동 시에도 기존 렌더링 유지)
- [ ] _redirects: /admin 규칙 존재 (/* 보다 앞)
- [ ] deploy.yml: VITE_TINA_CLIENT_ID env 존재
- [ ] `pnpm typecheck` 에러 0건
- [ ] `pnpm build` 성공
- [ ] `pnpm e2e` 전체 통과 (회귀 0건)

## §6 수동 작업 (Sprint 후)

| # | 작업 | 설명 |
|---|------|------|
| 1 | TinaCloud 가입 | tina.io — ktds.axbd@gmail.com (Free Plan) |
| 2 | GitHub App 설치 | KTDS-AXBD/Foundry-X 권한 부여 |
| 3 | GitHub Secrets 등록 | `VITE_TINA_CLIENT_ID`, `TINA_TOKEN` |
| 4 | Editor 초대 | 비개발자 이메일 → Editor 권한 |
| 5 | `gh workflow run deploy.yml` | 수동 배포 트리거 (secrets 반영) |
