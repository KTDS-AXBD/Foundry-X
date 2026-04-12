---
code: FX-DSGN-S213
title: "Sprint 213 — F441 파일 업로드 인프라 + F442 문서 파싱 엔진"
version: 1.0
status: Active
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S213]]"
---

# Sprint 213: F441 파일 업로드 인프라 + F442 문서 파싱 엔진

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F441 (파일 업로드 인프라) + F442 (문서 파싱 엔진) |
| Sprint | 213 |
| Phase | 25-A — Discovery Pipeline v2 |
| 핵심 전략 | R2 Presigned URL + D1 메타 + Workers 파싱 (PPTX/DOCX=JSZip, PDF=워크어라운드) |
| 참조 PRD | [[FX-SPEC-PRD-DISC-V2]] |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 분석 시 기존 자료(PDF/PPT/DOCX)를 활용할 방법이 없음 |
| Solution | R2 Presigned URL로 직접 업로드 + Workers에서 텍스트 추출 |
| Function UX Effect | FileUploadZone drag-and-drop → 파싱 완료까지 진행바 표시 |
| Core Value | F443(자료 기반 발굴)의 기반 — Sprint 214 선행 조건 해소 |

---

## 1. 아키텍처 설계

### 1.1 파일 업로드 흐름

```
[Browser]
  1. POST /api/files/presign {filename, mime_type, biz_item_id}
        ↓ R2.createPresignedUrl()
  2. ← {presigned_url, file_id}
  3. PUT {presigned_url} (R2 direct upload, no Workers proxy)
  4. POST /api/files/confirm {file_id}
        ↓ uploaded_files UPDATE status=uploaded
  5. ← {file_id, status: "uploaded"}
  6. POST /api/files/:id/parse (trigger parsing)
        ↓ document-parser-service
  7. parsed_documents INSERT
  8. ← {status: "parsed", page_count}
```

### 1.2 D1 스키마

**`0117_uploaded_files.sql`:**
```sql
CREATE TABLE IF NOT EXISTS uploaded_files (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  biz_item_id TEXT,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  r2_key      TEXT NOT NULL UNIQUE,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending|uploaded|parsing|parsed|error
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_tenant ON uploaded_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_biz_item ON uploaded_files(biz_item_id);
```

**`0118_parsed_documents.sql`:**
```sql
CREATE TABLE IF NOT EXISTS parsed_documents (
  id                 TEXT PRIMARY KEY,
  file_id            TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  content_text       TEXT NOT NULL,
  content_structured TEXT,  -- JSON: {slides:[{index,text}]} or {paragraphs:[...]}
  page_count         INTEGER NOT NULL DEFAULT 0,
  parsed_at          INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_file ON parsed_documents(file_id);
```

---

## 2. F441: 파일 업로드 인프라

### 2.1 wrangler.toml 추가

```toml
[[r2_buckets]]
binding = "FILES_BUCKET"
bucket_name = "foundry-x-files"
```
(dev/staging 환경에도 동일하게 추가)

### 2.2 env.ts 추가

```typescript
FILES_BUCKET: R2Bucket;
```

### 2.3 파일 스키마 (`core/files/schemas/file.ts`)

```typescript
import { z } from "zod";

export const PresignFileSchema = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  biz_item_id: z.string().optional(),
  size_bytes: z.number().int().positive().max(50 * 1024 * 1024), // 50MB
});

export const ConfirmFileSchema = z.object({
  file_id: z.string(),
});
```

### 2.4 파일 서비스 (`core/files/services/file-service.ts`)

주요 메서드:
- `presign(env, tenantId, input)` → `{presigned_url, file_id, r2_key}`
- `confirm(env, tenantId, fileId)` → `{status: "uploaded"}`
- `list(env, tenantId, bizItemId?)` → `UploadedFile[]`
- `delete(env, tenantId, fileId)` → void (R2 + D1 삭제)

R2 Presigned URL 생성:
```typescript
const presignedUrl = await env.FILES_BUCKET.createPresignedUrl("PUT", r2Key, {
  expiresIn: 3600,  // 1시간
});
```

### 2.5 파일 라우트 (`core/files/routes/files.ts`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/files/presign` | Presigned URL 발급 |
| POST | `/api/files/confirm` | 업로드 완료 확인 |
| GET | `/api/files` | 파일 목록 (tenant 필터) |
| GET | `/api/files?biz_item_id=X` | 아이템별 파일 목록 |
| DELETE | `/api/files/:id` | 파일 삭제 (R2 + D1) |
| POST | `/api/files/:id/parse` | 파싱 트리거 |
| GET | `/api/files/:id/parsed` | 파싱 결과 조회 |

### 2.6 FileUploadZone 컴포넌트 (`web/src/components/features/FileUploadZone.tsx`)

Props:
```typescript
interface FileUploadZoneProps {
  bizItemId?: string;
  onUploadComplete?: (fileId: string) => void;
  accept?: string[];  // 기본: [".pdf", ".pptx", ".docx"]
  maxSize?: number;   // 기본: 50MB
}
```

상태 흐름:
1. `idle` → drag-and-drop 영역 표시
2. `uploading` → 진행바 (R2 직접 PUT의 onprogress)
3. `parsing` → "텍스트 추출 중..." 스피너
4. `done` → 파일명 + 체크 아이콘
5. `error` → 에러 메시지 + 재시도 버튼

---

## 3. F442: 문서 파싱 엔진

### 3.1 파싱 서비스 (`core/files/services/document-parser-service.ts`)

```typescript
export class DocumentParserService {
  async parse(env: Env, fileId: string): Promise<ParseResult> {
    // 1. R2에서 파일 다운로드
    const obj = await env.FILES_BUCKET.get(r2Key);
    const buffer = await obj.arrayBuffer();

    // 2. MIME 타입별 파싱
    switch (mimeType) {
      case "application/pdf":
        return this.parsePdf(buffer);
      case "...presentationml...":
        return this.parsePptx(buffer);
      case "...wordprocessingml...":
        return this.parseDocx(buffer);
    }
  }

  private parsePptx(buffer: ArrayBuffer): ParseResult {
    // JSZip으로 pptx 압축 해제 → ppt/slides/slide*.xml 파싱
    // 각 슬라이드의 <a:t> 태그 텍스트 추출
  }

  private parseDocx(buffer: ArrayBuffer): ParseResult {
    // JSZip으로 docx 압축 해제 → word/document.xml 파싱
    // <w:t> 태그 텍스트 추출
  }

  private parsePdf(buffer: ArrayBuffer): ParseResult {
    // pdf-parse 라이브러리 (Workers 환경 주의: cpu-time 128ms 제한)
    // 실패 시 Workers AI (toAi().run("@cf/meta/llama-3-text-extract")) fallback
  }
}
```

### 3.2 파싱 결과 구조

```typescript
interface ParseResult {
  content_text: string;         // 전체 텍스트 (줄 구분)
  content_structured: {
    type: "slides" | "paragraphs" | "pages";
    items: Array<{
      index: number;
      text: string;
      title?: string;           // 슬라이드 제목 (PPTX만)
    }>;
  };
  page_count: number;
}
```

### 3.3 파싱 패키지 선택

| 포맷 | 패키지 | Workers 호환 | 비고 |
|------|--------|-------------|------|
| PPTX | JSZip (직접 XML) | ✅ | mammoth은 Node.js only |
| DOCX | JSZip (직접 XML) | ✅ | mammoth은 Node.js only |
| PDF | pdf-parse → AI fallback | △ | CPU 제한 주의 |

**Workers AI fallback** (PDF 파싱 실패 시):
```typescript
const result = await env.AI.run("@cf/facebook/bart-large-cnn", {
  input_text: base64Content,
  max_length: 4096,
});
```

---

## 4. 테스트 설계

### 4.1 API 테스트 (`core/files/routes/__tests__/files.test.ts`)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | POST /files/presign 정상 | presigned_url + file_id 반환 |
| 2 | POST /files/presign 크기 초과 | 400 에러 |
| 3 | POST /files/presign 잘못된 MIME | 400 에러 |
| 4 | POST /files/confirm | status=uploaded 업데이트 |
| 5 | GET /files | 파일 목록 반환 (tenant 격리) |
| 6 | DELETE /files/:id | R2 + D1 삭제 |
| 7 | POST /files/:id/parse | parsing 트리거 → parsed status |
| 8 | GET /files/:id/parsed | 파싱 결과 반환 |

### 4.2 파싱 서비스 테스트 (`core/files/services/__tests__/document-parser.test.ts`)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | PPTX 파싱 | 슬라이드별 텍스트 추출 정확성 |
| 2 | DOCX 파싱 | 단락별 텍스트 추출 정확성 |
| 3 | 빈 파일 처리 | 에러 없이 빈 결과 반환 |
| 4 | 잘못된 파일 형식 | 명확한 에러 메시지 |

---

## 5. Worker 파일 매핑

| Worker | 담당 F-item | 주요 파일 |
|--------|------------|----------|
| Worker A | F441 | `0117_*.sql`, `core/files/schemas/file.ts`, `core/files/services/file-service.ts`, `core/files/routes/files.ts`, `env.ts`, `wrangler.toml`, `web/src/components/features/FileUploadZone.tsx`, `__tests__/files.test.ts` |
| Worker B | F442 | `0118_*.sql`, `core/files/services/document-parser-service.ts`, `core/files/schemas/parsed-document.ts`, 라우트 parse 엔드포인트 추가, `__tests__/document-parser.test.ts` |

---

## 6. Gap Analysis 기준 (체크리스트)

### F441 체크리스트
- [ ] D1 `uploaded_files` 테이블 마이그레이션
- [ ] R2 바인딩 `FILES_BUCKET` (wrangler.toml + env.ts)
- [ ] `POST /api/files/presign` — presigned_url + file_id 반환
- [ ] `POST /api/files/confirm` — status=uploaded
- [ ] `GET /api/files` — 목록 (tenant 격리)
- [ ] `DELETE /api/files/:id` — R2 + D1 동시 삭제
- [ ] FileUploadZone 컴포넌트 — drag-and-drop + 진행바
- [ ] 파일 크기 50MB 제한 검증
- [ ] MIME 타입 제한 (pdf/pptx/docx만)
- [ ] API 단위 테스트 (8건)

### F442 체크리스트
- [ ] D1 `parsed_documents` 테이블 마이그레이션
- [ ] PPTX 파싱 (JSZip + XML — <a:t> 태그)
- [ ] DOCX 파싱 (JSZip + XML — <w:t> 태그)
- [ ] PDF 파싱 (pdf-parse 또는 Workers AI fallback)
- [ ] `content_text` + `content_structured` JSON 저장
- [ ] `POST /api/files/:id/parse` — 파싱 트리거
- [ ] `GET /api/files/:id/parsed` — 파싱 결과 조회
- [ ] `uploaded_files.status` → `parsed` 업데이트
- [ ] 파싱 서비스 단위 테스트 (4건)
