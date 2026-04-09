---
code: FX-PLAN-241
title: "Sprint 241 — F492 FileUploadZone API 경로 drift 수정"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-09
updated: 2026-04-09
author: Claude Sonnet 4.6
---

# Sprint 241 Plan — F492 FileUploadZone API 경로 drift 수정

## 1. 목표

`FileUploadZone` 컴포넌트가 `apiBaseUrl=""` 기본값으로 상대경로를 구성하여 Pages 오리진(`fx.minu.best`)에서 405 에러가 발생하는 버그를 수정한다.

- **REQ**: FX-REQ-484 (P1 Bug)
- **GitHub Issue**: #414
- **영향 범위**: 파일 업로드 파이프라인 전체 (F441~F443) 무력화 상태

## 2. 근본 원인

```
FileUploadZone.tsx:54
  fetch(`${apiBaseUrl}/api/files/presign`, ...)
  → apiBaseUrl = ""  →  "/api/files/presign"  (상대경로)
  → Pages 오리진에서 POST 미지원 → 405
```

`api-client.ts`의 `BASE_URL = import.meta.env.VITE_API_URL || "/api"` 표준을 우회하는 자체 fetch 구현이 문제의 핵심.

## 3. 수정 전략

| 변경 파일 | 변경 내용 |
|-----------|-----------|
| `FileUploadZone.tsx` | `apiBaseUrl` prop 제거, `BASE_URL` import로 대체, `/api/files/xxx` → `/files/xxx` |
| `AttachedFilesPanel.tsx` | `apiBaseUrl` prop 인터페이스 + 전달 제거 |

## 4. 검증 계획

1. 타입체크 (`turbo typecheck`)
2. 단위 테스트 (`turbo test`)
3. E2E 시나리오 4종 추가:
   - PDF 업로드 성공
   - PPTX 업로드 성공
   - DOCX 업로드 성공
   - PNG 업로드 거부 (지원 안 되는 형식)

## 5. 완료 기준

- `FileUploadZone`에서 `apiBaseUrl` prop 완전 제거
- `BASE_URL` 직접 import 적용
- E2E 4종 추가 (회귀 방지)
- typecheck + test 통과
