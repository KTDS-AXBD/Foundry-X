---
code: FX-PLAN-S129
title: "Sprint 129 — F309 Marker.io 비주얼 피드백 통합"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 129
f_items: [F309]
---

# FX-PLAN-S129 — Sprint 129: Marker.io 비주얼 피드백 통합

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F309 Marker.io 비주얼 피드백 통합 |
| Sprint | 129 |
| REQ | FX-REQ-301 (P1) |
| 목표 | 비개발자 팀원이 fx.minu.best 브라우저에서 화면에 직접 피드백 핀 → GitHub Issues 자동 생성 파이프라인 구축 |
| 기간 | ~4h |
| 의존성 | 없음 (F310과 병렬 가능) |
| PRD | FX-PLAN-013 v1.2 §3 |

## Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 비개발자 피드백이 구두/텍스트 메시지로만 전달 — 맥락(화면 위치, 브라우저 정보) 누락으로 재현·수정 비용 소모 |
| Solution | Marker.io 위젯으로 화면 위 직접 어노테이션 → 스크린샷 + 메타데이터 포함 GitHub Issue 자동 생성 |
| Function UX Effect | 피드백 접수→Issue 생성 < 2분. 비개발자 계정 불필요(Guest 링크). 기술 메타데이터 자동 캡처 |
| Core Value | 팀 전체 피드백 루프 자동화 — 맥락 있는 이슈로 개발자 재현 비용 제거 |

## §1 목표

### F309: Marker.io 비주얼 피드백 통합

**Phase A — Marker.io 계정 & 프로젝트 설정 (수동)**
- Marker.io 가입: ktds.axbd@gmail.com (14일 Free Trial)
- 프로젝트 생성: "Foundry-X Web"
- GitHub 리포 연동: KTDS-AXBD/Foundry-X
- Issue 라벨 설정: `visual-feedback`, `ux`, `bug`

**Phase B — 위젯 스크립트 삽입**
- `MarkerWidget.tsx` React 컴포넌트 작성
- 환경변수 `VITE_MARKER_PROJECT_ID` 설정
- AppLayout에 `<MarkerWidget />` 삽입 (로그인 후 화면에서만 활성화)

**Phase C — 배포 & 온보딩**
- Cloudflare Pages 환경변수 설정 + CI/CD 자동 배포
- 팀 온보딩: Guest 링크 전송 + 1페이지 사용 가이드

## §2 범위

### 변경 파일

| # | 파일 | 변경 내용 | 신규 |
|---|------|-----------|:----:|
| 1 | `packages/web/src/components/MarkerWidget.tsx` | Marker.io shim.js 동적 로드 + cleanup | ✅ |
| 2 | `packages/web/src/layouts/AppLayout.tsx` | `<MarkerWidget />` 삽입 (1줄) | |
| 3 | `packages/web/.env.example` | `VITE_MARKER_PROJECT_ID` 항목 추가 | |

### 변경하지 않는 영역
- API 서버 (packages/api) — 변경 없음
- D1 마이그레이션 — 스키마 변경 없음
- shared 패키지 — 타입 변경 없음
- LandingLayout — 비로그인 랜딩 페이지에는 위젯 미삽입 (내부 팀 도구)

## §3 기술 설계 요약

### MarkerWidget 컴포넌트

```tsx
// packages/web/src/components/MarkerWidget.tsx
import { useEffect } from 'react';

export function MarkerWidget() {
  useEffect(() => {
    const id = import.meta.env.VITE_MARKER_PROJECT_ID;
    if (!id) return;

    // Marker.io 글로벌 설정
    (window as any).markerConfig = { project: id, source: 'snippet' };

    // shim.js 동적 로드
    const s = document.createElement('script');
    s.src = 'https://edge.marker.io/latest/shim.js';
    s.async = true;
    document.head.appendChild(s);

    return () => {
      s.remove();
      delete (window as any).markerConfig;
    };
  }, []);

  return null;
}
```

### AppLayout 삽입 위치

```tsx
// packages/web/src/layouts/AppLayout.tsx — return문 내부
<MarkerWidget />
```

- `AppLayout`은 로그인 후 대시보드 영역에만 적용되므로, 랜딩 페이지에는 위젯이 표시되지 않음
- 환경변수 `VITE_MARKER_PROJECT_ID`가 없으면 위젯 미로드 (개발 환경 대응)

### 환경변수

| 변수 | 위치 | 값 |
|------|------|-----|
| `VITE_MARKER_PROJECT_ID` | Cloudflare Pages 환경변수 | Marker.io 프로젝트 ID (계정 생성 후 획득) |

### GitHub Issues 연동 (Marker.io 설정)

| 설정 | 값 |
|------|-----|
| Repository | KTDS-AXBD/Foundry-X |
| Issue Title | `[Visual Feedback] {페이지URL} — {피드백 요약}` |
| Labels | `visual-feedback` |
| 자동 첨부 | 스크린샷 + 브라우저/OS/URL 메타데이터 |

## §4 구현 순서

| 단계 | 작업 | 검증 |
|------|------|------|
| 1 | `MarkerWidget.tsx` 컴포넌트 작성 | typecheck 통과 |
| 2 | `AppLayout.tsx`에 import + 삽입 | `pnpm dev`에서 위젯 미표시 확인 (환경변수 없으므로) |
| 3 | `.env.example`에 `VITE_MARKER_PROJECT_ID` 추가 | — |
| 4 | `turbo build` 전체 빌드 통과 | 기존 테스트/typecheck 회귀 없음 |

> **수동 작업 (Sprint 외):** Marker.io 계정 생성 + GitHub 연동 + Pages 환경변수 설정 + 팀 온보딩은 코드 구현 후 별도 진행.

## §5 성공 지표

| 지표 | 목표 |
|------|------|
| typecheck + build 통과 | ✅ |
| 기존 E2E 회귀 | 0건 |
| 환경변수 미설정 시 위젯 미로드 | ✅ (graceful degradation) |
| 환경변수 설정 후 피드백 핀 → GitHub Issue | < 2분 |

## §6 리스크

| # | 리스크 | 확률 | 대응 |
|---|--------|:----:|------|
| R1 | Marker.io shim.js CSP 차단 | 낮 | Cloudflare Pages CSP 헤더에 `edge.marker.io` 추가 |
| R2 | Free Trial 종료 후 비용 판단 | 중 | 4주 사용량 기반 결정, 대안: Feedbucket($29/월) |
