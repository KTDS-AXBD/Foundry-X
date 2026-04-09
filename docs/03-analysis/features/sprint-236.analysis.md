---
code: FX-ANLS-S236
title: "Sprint 236 — F483 Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-09
updated: 2026-04-09
author: Claude
---

# Sprint 236 Gap Analysis — F483 웹 평가결과서 뷰어

## 결과 요약

| 항목 | 값 |
|------|-----|
| Match Rate | **100%** (18/18 PASS) |
| API | 8/8 PASS |
| Web | 8/8 PASS |
| Integration | 2/2 PASS |
| Test 결과 | API 13 pass, Web 5 pass |

## 상세 검증

### API (8항목)

| # | 항목 | 상태 | 근거 |
|---|------|------|------|
| A1 | 0122 마이그레이션 파일 | PASS | `0122_report_html.sql` ALTER TABLE 확인 |
| A2 | mock-d1.ts report_html 컬럼 | PASS | line 703 `report_html TEXT` 추가 |
| A3 | PUT html 엔드포인트 | PASS | discovery-reports.ts PUT route 존재 |
| A4 | PUT html upsert 로직 | PASS | saveHtml에서 existing 체크 + INSERT/UPDATE 분기 |
| A5 | GET html 엔드포인트 | PASS | discovery-reports.ts GET route 존재 |
| A6 | GET html null → 404 | PASS | getHtml에서 report_html null 시 null 반환 → 라우트에서 404 |
| A7 | GET share/:token HTML 반환 | PASS | c.html(html) Content-Type: text/html |
| A8 | SaveReportHtmlSchema | PASS | z.string().min(1).max(5_000_000) |

### Web (8항목)

| # | 항목 | 상태 | 근거 |
|---|------|------|------|
| W1 | EvaluationReportViewer.tsx | PASS | 파일 존재 |
| W2 | loading 상태 | PASS | Loader2 + "평가결과서 로딩 중..." |
| W3 | iframe srcDoc | PASS | sandbox="allow-same-origin" + srcDoc={html} |
| W4 | empty 상태 | PASS | "등록된 평가결과서가 없어요" |
| W5 | 새 창에서 보기 | PASS | handleNewTab → Blob → window.open |
| W6 | 공유 링크 | PASS | shareEvaluationReport + clipboard.writeText |
| W7 | discovery-detail 탭 | PASS | TabsTrigger "평가결과서" + TabsContent + EvaluationReportViewer |
| W8 | api-client 함수 3개 | PASS | fetchEvaluationReportHtml, saveEvaluationReportHtml, shareEvaluationReport |

### Integration (2항목)

| # | 항목 | 상태 | 근거 |
|---|------|------|------|
| I1 | saveHtml → getHtml 라운드트립 | PASS | 테스트 존재 + 통과 |
| I2 | 공유토큰 → HTML 조회 | PASS | 테스트 존재 + 통과 |
