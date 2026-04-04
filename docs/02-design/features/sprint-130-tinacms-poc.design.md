---
code: FX-DSGN-S130
title: "Sprint 130 — F310 TinaCMS 호환성 PoC Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 130
f_items: [F310]
---

# FX-DSGN-S130 — Sprint 130: TinaCMS 호환성 PoC

## §1 설계 목표

`feat/tinacms-poc` 브랜치에서 TinaCMS 최소 설치 + 5개 Go/No-Go 게이트 검증. 기존 코드 수정 최소화, PoC 전용 파일만 추가.

## §2 기존 자산 분석

| 자산 | 위치 | 영향 |
|------|------|------|
| `vite.config.ts` | `packages/web/vite.config.ts` | 수정 불필요 — TinaCMS는 Vite plugin이 아닌 별도 CLI로 동작 |
| `react-router` routes | `packages/web/src/routes/` | 수정 불필요 — /admin은 public/ 정적 파일로 서빙 |
| `tsconfig.json` | `packages/web/tsconfig.json` | `tina/__generated__` exclude 추가 필요 여부 확인 |
| `package.json` | `packages/web/package.json` | devDependencies 추가: `tinacms`, `@tinacms/cli` |

## §3 상세 설계

### 파일 1: tina/config.ts (신규)

**경로**: `packages/web/tina/config.ts`

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
        name: "sample",
        label: "Sample",
        path: "content/sample",
        format: "md",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
          },
        ],
      },
    ],
  },
});
```

**설계 결정:**
- `outputFolder: "admin"` — TinaCMS 관리 UI가 `public/admin/`에 빌드됨
- `publicFolder: "public"` — Vite의 public 디렉터리와 일치
- `clientId`/`token` 빈 문자열 — PoC에서는 TinaCloud 미연동 (local mode)
- 1개 collection(`sample`)만 — 최소 검증 범위

### 파일 2: content/sample/hello.md (신규)

**경로**: `packages/web/content/sample/hello.md`

```md
---
title: "PoC Test"
---

TinaCMS 호환성 PoC 테스트 콘텐츠.
```

### 파일 3: .gitignore 추가

**경로**: 루트 `.gitignore` 또는 `packages/web/.gitignore` (존재하지 않으므로 루트에 추가)

```
# TinaCMS generated
packages/web/tina/__generated__
```

### 파일 4: package.json (의존성 추가)

```bash
cd packages/web && pnpm add -D tinacms @tinacms/cli
```

### tsconfig.json 수정 여부

`tina/__generated__`의 타입이 기존 tsconfig `include` 범위에 포함되면 충돌 가능:
- PoC에서 확인: `pnpm typecheck` 실패 시 `tsconfig.json`의 `exclude`에 `"tina/__generated__"` 추가
- 사전 추가하지 않음 — 실패해야 할 조건을 미리 숨기면 PoC 의미 감소

## §4 구현 순서 + 검증 스크립트

| 단계 | 작업 | 명령어 | 기대 결과 |
|:----:|------|--------|----------|
| 0 | 브랜치 생성 | `git checkout -b feat/tinacms-poc` | 브랜치 생성 |
| 1 | 의존성 설치 | `cd packages/web && pnpm add -D tinacms @tinacms/cli` | package.json 갱신 |
| 2 | 파일 생성 | tina/config.ts + content/sample/hello.md + .gitignore | 3파일 생성 |
| 3 | **G1**: 동시 기동 | `cd packages/web && npx tinacms dev -c "pnpm dev"` | Vite + TinaCMS 동시 기동 |
| 4 | **G2**: /admin 접근 | 브라우저 `http://localhost:3000/admin` | TinaCMS UI 렌더링 |
| 5 | **G3**: 기존 라우트 | 브라우저 `/dashboard`, `/wiki`, `/discovery/items` | 정상 렌더링 |
| 6 | TinaCMS 종료 + 단독 검증 | Ctrl+C 후 별도 실행 | — |
| 7 | **G4**: 빌드+타입 | `pnpm build && pnpm typecheck` | 에러 0건 |
| 8 | **G5**: E2E | `pnpm e2e` | 전체 통과 |
| 9 | 결과 기록 | PoC 결과를 커밋 메시지에 기록 | Go/Conditional Go/No-Go |

### 검증 자동화 참고

단계 3~5는 수동 브라우저 확인이 필요하므로 autopilot에서 완전 자동화가 어려워요. 대안:
- G1: `npx tinacms dev -c "pnpm dev"` 실행 후 3초 대기 → 프로세스 정상 기동 확인
- G2/G3: `curl -s http://localhost:3000/admin | grep -q "TinaCMS"` 로 간접 확인 가능
- G4/G5: 완전 자동화 가능

## §5 Go/No-Go 판정 매트릭스

| G1 | G2 | G3 | G4 | G5 | 판정 | 후속 |
|:--:|:--:|:--:|:--:|:--:|:----:|------|
| ✅ | ✅ | ✅ | ✅ | ✅ | **Go** | F311 Sprint 131 착수 |
| ✅ | ❌ | ✅ | ✅ | ✅ | **Conditional** | /admin → /cms 경로 변경 후 재검증 |
| ❌ | — | — | — | — | **No-Go** | Phase B 연기, feat/tinacms-poc 삭제 |
| — | — | ❌ | — | — | **No-Go** | RR7 호환 불가, DecapCMS 검토 |
| — | — | — | ❌ | — | **No-Go** | 타입 충돌, 추가 조사 필요 |

## §6 검증 체크리스트

- [ ] `feat/tinacms-poc` 브랜치 생성
- [ ] `tinacms`, `@tinacms/cli` devDependencies 설치
- [ ] `tina/config.ts` + `content/sample/hello.md` 생성
- [ ] `.gitignore`에 `tina/__generated__` 추가
- [ ] G1: `npx tinacms dev -c "pnpm dev"` 동시 기동 성공
- [ ] G2: `/admin` TinaCMS UI 렌더링
- [ ] G3: 기존 라우트 5개 이상 정상
- [ ] G4: `pnpm build && pnpm typecheck` 에러 0건
- [ ] G5: `pnpm e2e` 전체 통과
- [ ] 판정 기록: Go / Conditional Go / No-Go
