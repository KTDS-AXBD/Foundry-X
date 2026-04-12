---
code: FX-DSGN-S236
title: "Sprint 236 — F483 웹 평가결과서 뷰어 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-09
updated: 2026-04-09
author: Claude
---

# Sprint 236 Design — F483 웹 평가결과서 뷰어

## 1. 개요

Discovery 상세 페이지에 "평가결과서" 탭을 추가하여, F481 스킬이 생성한 HTML 평가결과서를 조회·공유할 수 있게 한다.

### 핵심 흐름
```
F481 스킬(HTML 생성) → API PUT /html → D1 저장 → Web GET /html → iframe 렌더링
                                                      └→ 공유 토큰 → 공개 URL
```

## 2. DB 스키마 변경

### 2-1. D1 마이그레이션 `0122_report_html.sql`
```sql
ALTER TABLE ax_discovery_reports ADD COLUMN report_html TEXT;
```

### 2-2. mock-d1.ts 동기화
`ax_discovery_reports` 테이블 정의에 `report_html TEXT` 컬럼 추가 (line ~702, shared_token 다음).

## 3. API 설계

### 3-1. HTML 저장 — `PUT /api/ax-bd/discovery-reports/:itemId/html`

**인증**: 필수 (tenant middleware)
**Request Body**:
```json
{ "html": "<html>...</html>" }
```
**Validation**: Zod `SaveReportHtmlSchema` — html: string, min(1), max(5_000_000)
**Logic**:
1. `ax_discovery_reports`에 해당 itemId row 존재 확인
2. 없으면 INSERT (id, item_id, org_id, report_html), 있으면 UPDATE report_html
3. 응답: `{ data: { itemId, updatedAt } }`

**Status Codes**: 200 OK, 400 Invalid, 404 Item not found

### 3-2. HTML 조회 — `GET /api/ax-bd/discovery-reports/:itemId/html`

**인증**: 필수 (tenant middleware)
**Logic**:
1. `ax_discovery_reports` WHERE item_id = :itemId
2. report_html이 NULL이면 404
3. 응답: `{ data: { html, updatedAt } }`

**Status Codes**: 200 OK, 404 Not found / No HTML

### 3-3. 공유 HTML 조회 — `GET /api/ax-bd/discovery-reports/share/:token`

**인증**: 없음 (공개 URL)
**Logic**:
1. `ax_discovery_reports` WHERE shared_token = :token
2. report_html이 있으면 HTML 직접 반환 (Content-Type: text/html)
3. 없으면 report_json으로 fallback JSON 응답

**Status Codes**: 200 OK, 404 Invalid token

## 4. 서비스 메서드 추가

### DiscoveryReportService 확장

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `saveHtml` | `(itemId: string, orgId: string, html: string) => Promise<{ updatedAt: string }>` | report_html upsert |
| `getHtml` | `(itemId: string) => Promise<{ html: string; updatedAt: string } \| null>` | report_html 조회 |
| `getHtmlByToken` | `(token: string) => Promise<string \| null>` | 공유 토큰으로 HTML 조회 |

## 5. Web 컴포넌트

### 5-1. EvaluationReportViewer.tsx (신규)

**Props**:
```typescript
interface EvaluationReportViewerProps {
  bizItemId: string;
}
```

**상태**:
- `html: string | null` — HTML 콘텐츠
- `loading: boolean` — 로딩 상태
- `sharing: boolean` — 공유 링크 생성 중
- `shareUrl: string | null` — 생성된 공유 URL

**렌더링**:
1. **Loading**: Loader2 + "평가결과서 로딩 중..."
2. **Empty**: "등록된 평가결과서가 없어요" + 안내 텍스트
3. **Content**:
   - 헤더: FileBarChart 아이콘 + "발굴단계완료 평가결과서" + 날짜 배지
   - 버튼: "새 창에서 보기" + "공유 링크" (클립보드 복사)
   - iframe: `srcDoc={html}`, `sandbox="allow-same-origin"`, 자동 높이 조정

**패턴**: BusinessPlanViewer.tsx 동일 구조 (iframe srcdoc)

### 5-2. discovery-detail.tsx 수정

**변경사항**:
1. import 추가: `EvaluationReportViewer`
2. TabsTrigger 추가: `<TabsTrigger value="evaluation">평가결과서</TabsTrigger>` (files 탭 뒤)
3. TabsContent 추가:
```tsx
<TabsContent value="evaluation" className="mt-4">
  <EvaluationReportViewer bizItemId={item.id} />
</TabsContent>
```

### 5-3. api-client.ts 함수 추가

| 함수 | 시그니처 | 설명 |
|------|----------|------|
| `fetchEvaluationReportHtml` | `(itemId: string) => Promise<string>` | HTML 문자열 반환 |
| `saveEvaluationReportHtml` | `(itemId: string, html: string) => Promise<void>` | HTML 저장 |
| `shareEvaluationReport` | `(itemId: string) => Promise<string>` | 공유 토큰 반환 |

## 6. 검증 항목 (Gap Analysis 기준)

### API (8항목)
| # | 항목 | 검증 방법 |
|---|------|----------|
| A1 | 0122 마이그레이션 파일 존재 | 파일 확인 |
| A2 | mock-d1.ts report_html 컬럼 | 파일 확인 |
| A3 | PUT html 엔드포인트 | 테스트 |
| A4 | PUT html — upsert (생성+갱신) | 테스트 |
| A5 | GET html 엔드포인트 | 테스트 |
| A6 | GET html — null이면 404 | 테스트 |
| A7 | GET share/:token HTML 반환 | 테스트 |
| A8 | SaveReportHtmlSchema Zod 검증 | 테스트 |

### Web (8항목)
| # | 항목 | 검증 방법 |
|---|------|----------|
| W1 | EvaluationReportViewer.tsx 파일 존재 | 파일 확인 |
| W2 | loading 상태 표시 | 컴포넌트 테스트 |
| W3 | HTML 렌더링 (iframe srcDoc) | 컴포넌트 테스트 |
| W4 | empty 상태 표시 | 컴포넌트 테스트 |
| W5 | "새 창에서 보기" 버튼 | 컴포넌트 테스트 |
| W6 | "공유 링크" 버튼 | 컴포넌트 테스트 |
| W7 | discovery-detail 탭 추가 | 파일 확인 |
| W8 | api-client 함수 3개 | 파일 확인 |

### Integration (2항목)
| # | 항목 | 검증 방법 |
|---|------|----------|
| I1 | PUT → GET 라운드트립 | 통합 테스트 |
| I2 | 공유토큰 생성 → 토큰으로 HTML 조회 | 통합 테스트 |

**합계: 18항목**

## 7. 파일 변경 매핑

| # | 파일 | 변경 유형 | 검증 항목 |
|---|------|----------|----------|
| 1 | `packages/api/src/db/migrations/0122_report_html.sql` | 신규 | A1 |
| 2 | `packages/api/src/__tests__/helpers/mock-d1.ts` | 수정 | A2 |
| 3 | `packages/api/src/core/discovery/schemas/discovery-report-schema.ts` | 수정 | A8 |
| 4 | `packages/api/src/core/discovery/services/discovery-report-service.ts` | 수정 | A3~A7 |
| 5 | `packages/api/src/core/discovery/routes/discovery-reports.ts` | 수정 | A3~A7 |
| 6 | `packages/api/src/__tests__/discovery-reports.test.ts` | 수정 | A3~A8, I1~I2 |
| 7 | `packages/web/src/components/feature/discovery/EvaluationReportViewer.tsx` | 신규 | W1~W6 |
| 8 | `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 수정 | W7 |
| 9 | `packages/web/src/lib/api-client.ts` | 수정 | W8 |
| 10 | `packages/web/src/components/feature/discovery/__tests__/EvaluationReportViewer.test.tsx` | 신규 | W2~W6 |
