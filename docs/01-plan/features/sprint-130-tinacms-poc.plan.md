---
code: FX-PLAN-S130
title: "Sprint 130 — F310 TinaCMS 호환성 PoC"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 130
f_items: [F310]
---

# FX-PLAN-S130 — Sprint 130: TinaCMS 호환성 PoC

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F310 TinaCMS 호환성 PoC |
| Sprint | 130 |
| REQ | FX-REQ-302 (P2) |
| 목표 | TinaCMS가 기존 Vite 8 + React Router 7 + Cloudflare Pages 스택과 충돌 없이 동작하는지 검증 |
| 기간 | ~4h |
| 의존성 | 없음 (F309와 병렬 가능) |
| PRD | FX-PLAN-013 v1.2 §4.3 Step 1 |

## Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | TinaCMS + React Router 7 호환성이 미검증 — 공식 지원은 Vite까지이고, RR7 파일 기반 라우팅과 /admin 충돌 가능성 있음 |
| Solution | 별도 브랜치(feat/tinacms-poc)에서 최소 설치 + 5개 검증 항목 확인 → Go/No-Go 판정 |
| Function UX Effect | PoC 통과 시 F311 본구현 안전 착수. 실패 시 대안(DecapCMS) 또는 연기로 리스크 차단 |
| Core Value | 사전 검증으로 ~16h 본구현의 실패 리스크 제거 — 기술 부채 없는 의사결정 |

## §1 목표

### F310: TinaCMS 호환성 PoC

**Go/No-Go 게이트 — 5개 검증 항목:**

| # | 검증 항목 | 통과 기준 | 실패 시 |
|---|----------|----------|---------|
| G1 | `pnpm dev` + TinaCMS local 동시 기동 | Vite dev server 정상 + TinaCMS GraphQL 서버 정상 | Phase B 연기 |
| G2 | `/admin` 경로 접근 | TinaCMS 관리 UI 렌더링 | /admin 충돌 → 3중 방어 검토 |
| G3 | 기존 라우트 미영향 | `/dashboard`, `/wiki`, `/discovery` 등 기존 라우트 정상 | RR7 호환 불가 → DecapCMS 전환 |
| G4 | `pnpm build` + `pnpm typecheck` | 에러 0건 | 타입 충돌 → 추가 조사 |
| G5 | `pnpm e2e` | 전체 통과 (회귀 0건) | 회귀 발생 → 충돌 원인 분석 |

**판정 기준:**
- **Go**: G1~G5 전체 PASS → F311 본구현 진행
- **Conditional Go**: G2만 실패 (나머지 PASS) → /admin 경로 대안 검토 후 진행
- **No-Go**: G1, G3, G4 중 하나라도 실패 → Phase B 연기, Phase A(Marker.io)만 운영

## §2 범위

### 변경 파일

| # | 파일 | 변경 내용 | 신규 |
|---|------|-----------|:----:|
| 1 | `packages/web/package.json` | `tinacms`, `@tinacms/cli` devDependencies 추가 | |
| 2 | `packages/web/tina/config.ts` | TinaCMS 최소 설정 (1 collection: sample) | ✅ |
| 3 | `packages/web/content/sample/hello.md` | PoC 테스트용 최소 Markdown 파일 | ✅ |
| 4 | `packages/web/.gitignore` | `tina/__generated__` 추가 | |

### 변경하지 않는 영역
- API 서버 — 변경 없음
- D1 마이그레이션 — 변경 없음
- shared 패키지 — 변경 없음
- 기존 React 컴포넌트 — PoC에서 useTina hook 미적용 (본구현에서 적용)
- AppLayout / LandingLayout — 수정 없음

### PoC 브랜치 전략
- 브랜치: `feat/tinacms-poc` (master 기반)
- **Go 시**: 브랜치를 F311 본구현의 베이스로 활용
- **No-Go 시**: 브랜치 삭제, Phase B 연기 기록

## §3 기술 설계 요약

### TinaCMS 최소 설정

```ts
// packages/web/tina/config.ts
import { defineConfig } from 'tinacms';

export default defineConfig({
  branch: process.env.TINA_BRANCH ?? 'master',
  clientId: process.env.VITE_TINA_CLIENT_ID ?? '',
  token: process.env.TINA_TOKEN ?? '',
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  schema: {
    collections: [
      {
        name: 'sample',
        label: 'Sample',
        path: 'content/sample',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Title', isTitle: true, required: true },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },
    ],
  },
});
```

### PoC 테스트 콘텐츠

```md
<!-- packages/web/content/sample/hello.md -->
---
title: "PoC Test"
---

TinaCMS 호환성 PoC 테스트 콘텐츠입니다.
```

### .gitignore 추가

```
# TinaCMS generated
tina/__generated__
```

## §4 구현 순서

| 단계 | 작업 | 검증 |
|------|------|------|
| 1 | `feat/tinacms-poc` 브랜치 생성 | `git checkout -b feat/tinacms-poc` |
| 2 | `pnpm add -D tinacms @tinacms/cli` | package.json 갱신 확인 |
| 3 | `tina/config.ts` + `content/sample/hello.md` 작성 | 파일 존재 확인 |
| 4 | `.gitignore`에 `tina/__generated__` 추가 | — |
| 5 | **G1 검증**: `npx tinacms dev -c "pnpm dev"` | Vite + TinaCMS 동시 기동 |
| 6 | **G2 검증**: 브라우저에서 `localhost:3000/admin` 접근 | TinaCMS UI 렌더링 |
| 7 | **G3 검증**: 기존 라우트 5개 이상 접근 확인 | 정상 렌더링 |
| 8 | **G4 검증**: `pnpm build && pnpm typecheck` | 에러 0건 |
| 9 | **G5 검증**: `pnpm e2e` | 전체 통과 |
| 10 | 판정 기록 + 결과 커밋 | Go/Conditional Go/No-Go |

> **주의**: PoC는 로컬 검증만 수행. TinaCloud 연동은 F311 본구현에서 진행.

## §5 성공 지표

| 지표 | 목표 |
|------|------|
| G1~G5 검증 항목 | 5/5 PASS (Go) |
| 기존 typecheck 에러 | 0건 증가 |
| 기존 E2E 회귀 | 0건 |
| PoC 총 소요 시간 | ≤ 4h |

## §6 리스크

| # | 리스크 | 확률 | 대응 |
|---|--------|:----:|------|
| R1 | tinacms 패키지가 Vite 8 미지원 | 낮 | 공식 Vite 가이드 존재 확인됨 (tina.io/docs/frameworks/vite/) |
| R2 | React Router 7 라우트 충돌 | 중 | /admin은 app/(app)/ 외부라 fall-through. 충돌 시 _redirects 방어 |
| R3 | tinacms 번들 사이즈로 빌드 시간 증가 | 낮 | devDependencies 설치, production 빌드에는 /admin 정적 파일만 포함 |
| R4 | tina/__generated__ 타입 충돌 | 중 | tsconfig exclude에 추가하여 격리 |

## §7 Fallback 계획

| 판정 | 대응 |
|------|------|
| **Go** (5/5 PASS) | F311 Sprint 131 진행. feat/tinacms-poc 브랜치를 베이스로 활용 |
| **Conditional Go** (G2 실패) | /admin 대신 /cms 경로로 변경 후 재검증. 통과 시 F311 진행 |
| **No-Go** (G1/G3/G4 실패) | Phase B 연기. SPEC.md F311 상태를 `⏸️` 보류로 변경. DecapCMS 대안 검토는 별도 F-item |
