---
id: FX-PLAN-267
title: Sprint 267 — F516 대시보드 현행화
sprint: 267
f_items: [F516]
req: FX-REQ-544
date: 2026-04-12
status: done
---

# Sprint 267 Plan — F516 대시보드 현행화

## 목표

Foundry-X 서비스 실제 범위(2단계 발굴 + 3단계 형상화)에 맞게 대시보드를 현행화한다.
구 6단계 UI(수집~GTM)를 제거하고, 현행 라우트 기반 퀵 액션과 2단계 파이프라인으로 교체한다.

## 배경

- router.tsx에서 1/4/5/6단계는 이미 /discovery로 리다이렉트 처리됨(F434)
- Sprint Status / SDD Triangle / Harness Health / Freshness 위젯은 개발 내부 지표로 프로덕션 대시보드와 무관
- 퀵 액션 4개 중 2개(SR등록/파이프라인)가 존재하지 않는 라우트를 가리킴

## 변경 범위

| 파일 | 변경 |
|------|------|
| `ProcessStageGuide.tsx` | STAGES 6개 → 2개(발굴/형상화) |
| `dashboard.tsx` | 퀵 액션 교체, 내부 위젯 4개 삭제, 업무가이드→Wiki 링크 |
| `TodoSection.tsx` | 빈 상태 메시지, NEXT_ACTIONS, stageColors 2단계 기준 |

## 검증 계획

- `turbo typecheck` PASS
- `turbo test` PASS
- E2E: `pnpm e2e --grep dashboard` (있으면)
