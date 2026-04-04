---
code: FX-RPRT-S131
title: "Sprint 131 — F311 TinaCMS 인라인 에디팅 본구현 완료 보고서"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 131
f_items: [F311]
---

# FX-RPRT-S131 — Sprint 131 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F311 TinaCMS 인라인 에디팅 본구현 |
| Sprint | 131 |
| 기간 | 2026-04-04 (1회 autopilot) |
| Match Rate | **100%** (10/10 PASS) |

### Results

| 지표 | 값 |
|------|-----|
| Match Rate | 100% |
| 검증 항목 | 10건 |
| 변경 파일 | 7건 (수정 4 + 신규 3) |
| 삭제 파일 | 1건 (PoC content/sample/) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 콘텐츠 수정이 개발자를 경유해야 함 |
| Solution | TinaCMS 인라인 에디팅으로 브라우저에서 직접 수정 → GitHub PR 자동 생성 |
| Function UX Effect | /admin에서 WYSIWYG 편집, 빌드타임 콘텐츠 로드 + fallback |
| Core Value | 콘텐츠 관리 자율성 — 비개발자 병목 제거 |

## 변경 사항

### 신규 파일

| 파일 | 용도 |
|------|------|
| `packages/web/content/landing/hero.md` | Landing Hero 콘텐츠 (tagline, phase, stats) |
| `packages/web/content/wiki/intro.md` | Wiki 소개 콘텐츠 |
| `packages/web/src/lib/content-loader.ts` | Markdown frontmatter 파서 유틸리티 |
| `packages/web/src/vite-env.d.ts` | Vite ?raw import 타입 선언 |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `packages/web/tina/config.ts` | sample → landing+wiki 2 collections |
| `packages/web/src/routes/landing.tsx` | SITE_META/stats를 hero.md에서 로드 + fallback |
| `packages/web/public/_redirects` | /admin 리다이렉트 규칙 추가 |
| `.github/workflows/deploy.yml` | VITE_TINA_CLIENT_ID secret env 주입 |

### 삭제 파일

| 파일 | 사유 |
|------|------|
| `packages/web/content/sample/hello.md` | PoC 샘플 정리 |

## 기술 결정

### Vite ?raw + parseFrontmatter vs TinaCMS Generated Client

TinaCMS의 `__generated__/client`는 `npx tinacms build` 후에만 존재. TinaCloud 미설정 상태에서도 동작해야 하므로, Vite의 `?raw` import + 자체 frontmatter 파서로 **빌드타임 콘텐츠 로드**를 구현. TinaCloud 설정 후에도 이 패턴은 fallback으로 유지.

### Fallback 패턴

```tsx
const SITE_META = {
  phase: heroContent.data.phase ?? SITE_META_FALLBACK.phase,
  // ...
};
```

TinaCMS 콘텐츠 파싱 실패 시 기존 하드코딩 값으로 자동 fallback. 프로덕션 안정성 보장.

## 검증 결과

- **typecheck**: 에러 0건
- **build**: 704ms, landing chunk 26.58kB (메인 번들 미영향)
- **E2E**: 170 passed / 4 failed(기존) / 5 skipped — 회귀 0건

## 수동 후속 작업

1. TinaCloud 가입 (tina.io, Free Plan)
2. GitHub App 설치 (KTDS-AXBD/Foundry-X)
3. GitHub Secrets: VITE_TINA_CLIENT_ID, TINA_TOKEN
4. Editor 초대 (비개발자 이메일)
5. `gh workflow run deploy.yml` (수동 배포 트리거)
