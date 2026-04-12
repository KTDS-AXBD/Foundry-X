---
code: FX-ANLS-S129
title: "Sprint 129 — F309 Marker.io 비주얼 피드백 통합 Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 129
f_items: [F309]
---

# FX-ANLS-S129 — Sprint 129: Marker.io 비주얼 피드백 통합 Gap Analysis

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F309 Marker.io 비주얼 피드백 통합 |
| Sprint | 129 |
| Match Rate | **100%** (4/4 Design 항목 PASS + 보너스 2건) |
| 판정 | **PASS** |
| PR | #257 |

## 항목별 검증

| # | Design 항목 | 기대 | 실제 구현 | 결과 |
|:--:|------------|------|----------|:----:|
| 1 | `MarkerWidget.tsx` 신규 | `useEffect` + `declare global` + cleanup + env guard | `packages/web/src/components/MarkerWidget.tsx` — Design 코드와 100% 일치 | PASS |
| 2 | `AppLayout.tsx` 수정 | import 1줄 + JSX 1줄 (HelpAgentPanel 다음) | line 8 import + line 29 JSX — Design 위치와 일치 | PASS |
| 3 | `.env` 환경변수 | 주석 처리된 `VITE_MARKER_PROJECT_ID` | `.env.example`에 주석 추가 (개선: .env 대신 .env.example 사용) | PASS |
| 4 | 검증 체크리스트 | typecheck + build + E2E 회귀 0건 | typecheck 0 error, build 성공, E2E 회귀 0건 | PASS |

## Design 미기재 추가 구현 (보너스)

| # | 항목 | 설명 | 효과 |
|:--:|------|------|------|
| B1 | `deploy.yml` env 주입 | `VITE_MARKER_PROJECT_ID: ${{ secrets.VITE_MARKER_PROJECT_ID }}` | Vite 빌드타임 환경변수 CI/CD 주입 (Design 누락 보완) |
| B2 | Production 동작 확인 | fx.minu.best에서 위젯 표시 확인 | End-to-end 프로덕션 검증 완료 |

## Design 개선 제안

| # | 항목 | 내용 |
|:--:|------|------|
| 1 | deploy.yml 명시 | Vite `import.meta.env` 빌드타임 치환 특성상 CI/CD env 주입이 필수. Design에 deploy.yml 변경을 명시했으면 배포 시 트러블슈팅 시간 절약 가능 |
| 2 | .env → .env.example | 실제 값이 아닌 템플릿은 `.env.example`이 Git 관행상 적절. Design 표기 개선 권장 |

## 수동 검증 결과

| # | 항목 | 결과 |
|:--:|------|:----:|
| 1 | fx.minu.best 위젯 표시 | PASS (세션 #195 확인) |
| 2 | 피드백 제출 → GitHub Issue 생성 | PASS (visual-feedback 라벨) |
| 3 | Guest 제출 (계정 불필요) | PASS |
