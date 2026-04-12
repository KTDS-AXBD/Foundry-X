---
code: FX-DSGN-S129
title: "Sprint 129 — F309 Marker.io 비주얼 피드백 통합 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 129
f_items: [F309]
---

# FX-DSGN-S129 — Sprint 129: Marker.io 비주얼 피드백 통합

## §1 설계 목표

Marker.io 위젯을 AppLayout에 삽입하여 로그인 후 화면에서 비주얼 피드백 수집. API/DB 변경 없이 Web 패키지만 수정.

## §2 기존 자산 분석

| 자산 | 위치 | 활용 |
|------|------|------|
| `AppLayout` | `packages/web/src/layouts/AppLayout.tsx` | 위젯 삽입 대상 (line 27, `</div>` 직전) |
| `LandingLayout` | `packages/web/src/layouts/LandingLayout.tsx` | 미수정 — 비로그인 영역 제외 |
| `FeedbackWidget` | `packages/web/src/components/feature/FeedbackWidget.tsx` | 기존 NPS 피드백과 공존 (충돌 없음) |
| `.env` | `packages/web/.env` | 빌드 환경변수 파일 존재 확인 ✅ |
| `.env.production` | `packages/web/.env.production` | Production 환경변수 (Pages에서 오버라이드) |

## §3 상세 설계

### 파일 1: MarkerWidget.tsx (신규)

**경로**: `packages/web/src/components/MarkerWidget.tsx`

```tsx
import { useEffect } from "react";

declare global {
  interface Window {
    markerConfig?: { project: string; source: string };
  }
}

export function MarkerWidget() {
  useEffect(() => {
    const projectId = import.meta.env.VITE_MARKER_PROJECT_ID;
    if (!projectId) return;

    window.markerConfig = { project: projectId, source: "snippet" };

    const script = document.createElement("script");
    script.src = "https://edge.marker.io/latest/shim.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      script.remove();
      delete window.markerConfig;
    };
  }, []);

  return null;
}
```

**설계 결정:**
- `declare global` — TypeScript strict 모드에서 `window.markerConfig` 타입 에러 방지
- `useEffect` cleanup — SPA 전환 시 스크립트 중복 로드 방지
- 환경변수 미설정 시 early return — 개발 환경에서 자연스럽게 비활성화

### 파일 2: AppLayout.tsx (수정)

**경로**: `packages/web/src/layouts/AppLayout.tsx`

**변경 내용 (2줄):**

```diff
 import { HelpAgentPanel } from "@/components/feature/HelpAgentPanel";
+import { MarkerWidget } from "@/components/MarkerWidget";
 import { useCallback, useState } from "react";
```

```diff
       <HelpAgentPanel />
+      <MarkerWidget />
     </div>
```

**삽입 위치**: `<HelpAgentPanel />` 다음, `</div>` 직전 (line 28)
- 기존 위젯(OnboardingTour, FeedbackWidget, NpsSurveyTrigger, HelpAgentPanel)과 동일 레벨
- `return null`이므로 DOM 영향 없음

### 파일 3: .env (환경변수)

`packages/web/.env`에 추가:

```
# Marker.io 비주얼 피드백 (계정 생성 후 설정)
# VITE_MARKER_PROJECT_ID=
```

주석 처리 — 계정 생성 전까지 비활성 상태 유지. Pages 환경변수에서 실제 값 설정.

## §4 구현 순서

| 단계 | 파일 | 작업 | 검증 |
|:----:|------|------|------|
| 1 | `MarkerWidget.tsx` | 신규 파일 생성 | `pnpm typecheck` 통과 |
| 2 | `AppLayout.tsx` | import + JSX 삽입 (2줄) | `pnpm typecheck` 통과 |
| 3 | `.env` | 주석 처리된 변수 추가 | — |
| 4 | 전체 검증 | `turbo build && pnpm e2e` | 빌드 통과 + E2E 회귀 0건 |

## §5 검증 체크리스트

- [ ] `pnpm typecheck` — 에러 0건
- [ ] `turbo build` — 빌드 성공
- [ ] `pnpm dev` — 위젯 미표시 확인 (환경변수 미설정)
- [ ] 기존 E2E 회귀 — 0건
