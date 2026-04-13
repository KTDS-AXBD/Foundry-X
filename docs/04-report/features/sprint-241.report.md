---
code: FX-RPRT-241
title: "Sprint 241 완료 보고서 — F492 FileUploadZone API 경로 drift 수정"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-09
updated: 2026-04-09
author: Claude Sonnet 4.6
---

# Sprint 241 완료 보고서

## 요약

| 항목 | 내용 |
|------|------|
| Sprint | 241 |
| F-item | F492 |
| REQ | FX-REQ-484 (P1 Bug) |
| Match Rate | **100%** |
| typecheck | 11/11 ✅ |
| test | 3436 passed ✅ |

## 문제 및 해결

**근본 원인**: `FileUploadZone.tsx`가 `apiBaseUrl=""` 기본값으로 `/api/files/presign` 상대경로를 구성하여, Pages(`fx.minu.best`) 오리진에서 `POST` 미지원 → 405 반환. `api-client.ts`의 `BASE_URL` 표준을 우회하는 자체 fetch 구현.

**수정**:
1. `FileUploadZone.tsx`: `apiBaseUrl` prop 제거, `BASE_URL` import 추가, fetch 경로 `/api/files/*` → `/files/*` (BASE_URL에 `/api` 포함)
2. `AttachedFilesPanel.tsx`: `apiBaseUrl` prop 인터페이스 + 전달 제거

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `packages/web/src/components/feature/FileUploadZone.tsx` | `apiBaseUrl` prop 제거, `BASE_URL` import, 3개 fetch 경로 수정 |
| `packages/web/src/components/feature/discovery/AttachedFilesPanel.tsx` | `apiBaseUrl` prop 인터페이스 + 전달 제거 |
| `packages/web/e2e/file-upload.spec.ts` | F492 회귀 방지 E2E 4종 신규 추가 (PDF/PPTX/DOCX 성공 + PNG 거부) |
| `docs/01-plan/features/sprint-241.plan.md` | Plan 문서 |
| `docs/02-design/features/sprint-241.design.md` | Design 문서 |

## 교훈

- **drift 패턴 재발**: `api-client` 표준을 우회하는 자체 fetch 구현 (#243 offering legacy fetcher와 동일 축)
- **예방**: 신규 컴포넌트에서 `fetch()`를 직접 호출할 때 `BASE_URL` import 필수 — `apiBaseUrl` prop 패턴은 금지
