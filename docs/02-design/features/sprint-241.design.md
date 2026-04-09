---
code: FX-DSGN-241
title: "Sprint 241 — F492 FileUploadZone API 경로 drift 수정 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-09
updated: 2026-04-09
author: Claude Sonnet 4.6
---

# Sprint 241 Design — F492 FileUploadZone API 경로 drift 수정

## §1. 변경 목록

### FileUploadZone.tsx

**Before**:
```tsx
import { useState, useRef, useCallback, ... } from "react";

interface FileUploadZoneProps {
  apiBaseUrl?: string;   // ← 제거
  bizItemId?: string;
  onUploadComplete?: (fileId: string) => void;
}

export function FileUploadZone({ apiBaseUrl = "", ... }: FileUploadZoneProps) {
  const presignRes = await fetch(`${apiBaseUrl}/api/files/presign`, ...);
  const confirmRes = await fetch(`${apiBaseUrl}/api/files/confirm`, ...);
  const parseRes = await fetch(`${apiBaseUrl}/api/files/${file_id}/parse`, ...);
}
```

**After**:
```tsx
import { useState, useRef, useCallback, ... } from "react";
import { BASE_URL } from "@/lib/api-client";   // ← 추가

interface FileUploadZoneProps {
  // apiBaseUrl 제거
  bizItemId?: string;
  onUploadComplete?: (fileId: string) => void;
}

export function FileUploadZone({ bizItemId, onUploadComplete }: FileUploadZoneProps) {
  const presignRes = await fetch(`${BASE_URL}/files/presign`, ...);   // /api 중복 제거
  const confirmRes = await fetch(`${BASE_URL}/files/confirm`, ...);
  const parseRes = await fetch(`${BASE_URL}/files/${file_id}/parse`, ...);
}
```

### AttachedFilesPanel.tsx

**Before**:
```tsx
interface AttachedFilesPanelProps {
  bizItemId: string;
  apiBaseUrl?: string;  // ← 제거
}

export default function AttachedFilesPanel({ bizItemId, apiBaseUrl = "" }: AttachedFilesPanelProps) {
  ...
  <FileUploadZone
    apiBaseUrl={apiBaseUrl}   // ← 제거
    bizItemId={bizItemId}
    ...
  />
}
```

**After**:
```tsx
interface AttachedFilesPanelProps {
  bizItemId: string;
  // apiBaseUrl 제거
}

export default function AttachedFilesPanel({ bizItemId }: AttachedFilesPanelProps) {
  ...
  <FileUploadZone
    // apiBaseUrl 없음
    bizItemId={bizItemId}
    ...
  />
}
```

## §2. E2E 테스트 추가

파일: `packages/web/e2e/file-upload.spec.ts` (신규)

```typescript
// 4종 시나리오
test("PDF 파일 업로드 성공", ...)
test("PPTX 파일 업로드 성공", ...)
test("DOCX 파일 업로드 성공", ...)
test("PNG 파일 업로드 거부 — 지원 안 되는 형식 오류 표시", ...)
```

## §3. Worker 파일 매핑

단일 구현 (Worker 없음 — 변경 파일 2개, 간단한 prop 제거):

| 파일 | 작업 |
|------|------|
| `packages/web/src/components/feature/FileUploadZone.tsx` | `apiBaseUrl` prop 제거, `BASE_URL` import |
| `packages/web/src/components/feature/discovery/AttachedFilesPanel.tsx` | `apiBaseUrl` prop 제거 |
| `packages/web/e2e/file-upload.spec.ts` | E2E 4종 신규 작성 |

## §4. 검증 체크리스트

- [ ] `FileUploadZone`에서 `apiBaseUrl` prop 흔적 없음
- [ ] `BASE_URL` import 추가, fetch 경로에서 `/api` 중복 없음
- [ ] `AttachedFilesPanel`에서 `apiBaseUrl` 전달 없음
- [ ] E2E file-upload.spec.ts 4개 test 존재
- [ ] `turbo typecheck` 통과
- [ ] `turbo test` 통과
