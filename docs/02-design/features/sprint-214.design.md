---
code: FX-DSGN-S214
title: Sprint 214 Design — F443 자료 기반 발굴 입력
version: 1.0
status: Active
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
sprint: 214
f-items: F443
phase: 25-A
---

# Sprint 214 Design — F443 자료 기반 발굴 입력

## 1. 아키텍처 개요

F441(파일 업로드)+F442(파싱 엔진) 위에 **통합 레이어**를 추가한다.

```
[온보딩 위저드] --파일 업로드--> [F441 R2 + uploaded_files]
                                         |
                               [F442 parsed_documents]
                                         |
                    ┌────────────────────┴───────────────────┐
                    ↓                                         ↓
          POST /files/extract-item                 분석 실행 시 컨텍스트 주입
          (AI: 제목/설명 자동 추출)                (generate-business-plan,
                    ↓                              generate-prd에 docs[] 포함)
          getting-started Step 0.5                 
          자동 필드 채우기                           
                                         |
                            [아이템 상세 "첨부 자료" 탭]
                            (업로드 파일 목록 + 파싱 상태)
```

## 2. API 설계

### 2.1 신규: POST /api/files/extract-item

파싱된 문서에서 아이템 제목/설명을 AI로 추출한다.

**Request**:
```json
{ "biz_item_id": "optional-existing-item-id", "file_ids": ["uuid1", "uuid2"] }
```

**Response**:
```json
{
  "title": "AI 추출 제목",
  "description": "AI 추출 요약 설명",
  "confidence": 0.85
}
```

**구현**: `core/files/services/document-extract-service.ts`
- `parsed_documents` 조회 (file_ids 기준)
- Workers AI (`@cf/meta/llama-3.1-8b-instruct`) 호출
- 제목 (50자 이내), 설명 (200자 이내) 추출

### 2.2 수정: GET /api/files

기존 파라미터 `biz_item_id` 유지. 응답에 `parsed_status` 필드 추가:
```json
{
  "files": [
    {
      "id": "...", "filename": "...", "status": "parsed",
      "parsed_at": 1234567890, "page_count": 5
    }
  ]
}
```

파싱 결과 JOIN:
```sql
SELECT f.*, pd.parsed_at, pd.page_count
FROM uploaded_files f
LEFT JOIN parsed_documents pd ON pd.file_id = f.id
WHERE f.tenant_id = ? AND f.biz_item_id = ?
```

### 2.3 수정: POST /api/biz-items/:id/generate-business-plan

분석 실행 시 `parsed_documents` 자동 조회 후 LLM 프롬프트에 포함:

```typescript
// 기존 코드에 추가
const parsedDocs = await c.env.DB.prepare(`
  SELECT pd.content_text, f.filename
  FROM parsed_documents pd
  JOIN uploaded_files f ON f.id = pd.file_id
  WHERE f.biz_item_id = ? AND f.tenant_id = ?
  ORDER BY pd.parsed_at DESC LIMIT 3
`).bind(id, orgId).all();

const documentContext = parsedDocs.results.map(d => 
  `[${d.filename}]\n${String(d.content_text).slice(0, 2000)}`
);
```

`BpGenerationInput`에 `documentContext?: string[]` 필드 추가.
`refineWithLlm`의 instructions에 문서 컨텍스트 섹션 추가.

### 2.4 수정: POST /api/biz-items/:id/generate-prd

동일 패턴으로 `documentContext` 추가. `PrdGeneratorService.generate()`의 프롬프트에 반영.

## 3. Web 설계

### 3.1 getting-started.tsx 확장

기존: `["아이디어 입력", "AI 분석", "확인 & 등록"]` (3단계)
변경: `["자료 업로드", "아이디어 입력", "AI 분석", "확인 & 등록"]` (4단계, Step 0 = 자료 업로드)

**Step 0 동작**:
1. `FileUploadZone` 렌더 (bizItemId는 없으므로 파일만 업로드, 임시 file_ids 저장)
2. 업로드 완료 → `POST /api/files/extract-item` 호출
3. 추출된 `title/description`을 Step 1 입력 필드에 자동 채움
4. "건너뛰기" 버튼으로 Step 0 생략 가능

**State 추가**:
```typescript
const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
const [extractedTitle, setExtractedTitle] = useState("");
const [extractedDesc, setExtractedDesc] = useState("");
```

### 3.2 AttachedFilesPanel 컴포넌트 (신규)

`packages/web/src/components/feature/discovery/AttachedFilesPanel.tsx`

```
Props:
  bizItemId: string
  apiBaseUrl?: string

UI:
  [업로드 버튼]
  ┌──────────────────────────────┐
  │ 📄 문서명.pdf  ✅ 파싱 완료  │
  │ 📄 슬라이드.pptx  ⏳ 파싱 중 │
  │ [+ 파일 추가]                │
  └──────────────────────────────┘
  [파싱 완료 파일: N개]
```

**동작**:
- Mount 시 `GET /api/files?biz_item_id=:id` 조회
- 파일 클릭 → 파싱 결과 미리보기 (텍스트 요약)
- 삭제 버튼 → `DELETE /api/files/:id`

### 3.3 discovery-detail.tsx 탭 추가

기존 탭: `기본정보 | 발굴분석 | 형상화`
추가 탭: `기본정보 | 발굴분석 | 형상화 | 첨부 자료`

```tsx
<TabsTrigger value="files">첨부 자료</TabsTrigger>
...
<TabsContent value="files" className="mt-4">
  <AttachedFilesPanel bizItemId={id!} />
</TabsContent>
```

### 3.4 api-client.ts 추가 함수

```typescript
export interface UploadedFileMeta {
  id: string;
  filename: string;
  mime_type: string;
  status: string;
  size_bytes: number;
  created_at: number;
  parsed_at?: number;
  page_count?: number;
}

export async function fetchFiles(bizItemId: string): Promise<UploadedFileMeta[]>;
export async function deleteFile(fileId: string): Promise<void>;
export async function extractItemFromDocuments(fileIds: string[]): Promise<{
  title: string; description: string; confidence: number;
}>;
```

## 4. D1 변경

신규 마이그레이션 없음. 기존 `uploaded_files` + `parsed_documents` JOIN으로 충분.

## 5. Worker 파일 매핑

| Worker | 담당 파일 | 내용 |
|--------|-----------|------|
| W1 (API) | `core/files/services/document-extract-service.ts` (신규) | AI 추출 서비스 |
| W1 (API) | `core/files/routes/files.ts` | extract-item 엔드포인트 추가, GET /files JOIN 개선 |
| W1 (API) | `core/offering/services/business-plan-generator.ts` | documentContext 필드 + refineWithLlm 수정 |
| W1 (API) | `core/offering/services/business-plan-template.ts` | BpDataBundle에 documentContext 추가 |
| W1 (API) | `core/discovery/routes/biz-items.ts` | generate-business-plan + generate-prd 수정 |
| W2 (Web) | `routes/getting-started.tsx` | Step 0 자료 업로드 추가 |
| W2 (Web) | `components/feature/discovery/AttachedFilesPanel.tsx` (신규) | 첨부 자료 패널 |
| W2 (Web) | `routes/ax-bd/discovery-detail.tsx` | "첨부 자료" 탭 추가 |
| W2 (Web) | `lib/api-client.ts` | fetchFiles, deleteFile, extractItemFromDocuments 추가 |

## 6. 테스트 계획

| 대상 | 테스트 파일 | 케이스 |
|------|------------|--------|
| document-extract-service | `core/files/services/__tests__/document-extract.test.ts` | 텍스트 있음, 빈 텍스트, Workers AI mock |
| GET /files (JOIN) | `core/files/routes/__tests__/files.test.ts` | parsed_at/page_count 포함 응답 |
| POST /files/extract-item | `core/files/routes/__tests__/files.test.ts` | 정상 추출, 파일 없음 |

## 7. 갭 분석 체크리스트

| 항목 | 구현 대상 | 검증 방법 |
|------|-----------|-----------|
| extract-item API 존재 | files.ts POST /files/extract-item | curl 또는 테스트 |
| AI 제목/설명 추출 | document-extract-service.ts | 단위 테스트 |
| 온보딩 위저드 Step 0 | getting-started.tsx | UI 확인 (4단계) |
| 건너뛰기 버튼 | getting-started.tsx | UI 확인 |
| 첨부 자료 탭 | discovery-detail.tsx | UI 확인 (4번째 탭) |
| AttachedFilesPanel | AttachedFilesPanel.tsx | 파일 목록 렌더 |
| 분석 시 문서 컨텍스트 주입 | business-plan-generator.ts | 프롬프트 포함 여부 |
| typecheck 통과 | 전체 | turbo typecheck |
