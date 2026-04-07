---
code: FX-RPRT-S213
title: Sprint 213 완료 보고서 — F441+F442 파일 업로드 + 문서 파싱
version: 1.0
status: Active
category: RPRT
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
system-version: 0.5.0
---

# Sprint 213 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F441 (파일 업로드 인프라) + F442 (문서 파싱 엔진) |
| Sprint | 213 |
| Phase | 25-A — Discovery Pipeline v2 |
| Match Rate | **100%** (20/20 항목) |
| 테스트 | 13 tests (13 pass / 0 fail) |
| 신규 파일 | 11개 신규 / 4개 수정 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 분석 시 기존 자료(PDF/PPT/DOCX)를 입력으로 활용할 방법 없음 |
| Solution | R2 Presigned URL 기반 직접 업로드 + Workers 텍스트 추출 엔진 |
| Function UX Effect | FileUploadZone drag-and-drop → 자동 파싱 → F443에서 분석 컨텍스트 활용 |
| Core Value | Sprint 214 F443(자료 기반 발굴 입력) 선행 조건 완전 해소 |

---

## Gap Analysis 결과 (100%)

### F441: 파일 업로드 인프라

| # | 항목 | 상태 |
|---|------|------|
| 1 | D1 `uploaded_files` 테이블 마이그레이션 (0117) | ✅ PASS |
| 2 | R2 바인딩 `FILES_BUCKET` (wrangler.toml) | ✅ PASS |
| 3 | `env.ts` `FILES_BUCKET: R2Bucket` 타입 | ✅ PASS |
| 4 | `POST /api/files/presign` — presigned_url + file_id | ✅ PASS |
| 5 | `POST /api/files/confirm` — status=uploaded | ✅ PASS |
| 6 | `GET /api/files` — 파일 목록 (tenant 격리) | ✅ PASS |
| 7 | `DELETE /api/files/:id` — R2 + D1 동시 삭제 | ✅ PASS |
| 8 | `FileUploadZone` 컴포넌트 (drag-and-drop + 진행바) | ✅ PASS |
| 9 | 파일 크기 50MB 제한 검증 | ✅ PASS |
| 10 | MIME 타입 제한 (pdf/pptx/docx만) | ✅ PASS |
| 11 | API 단위 테스트 (9건) | ✅ PASS |

**F441 Match Rate: 11/11 = 100%**

### F442: 문서 파싱 엔진

| # | 항목 | 상태 |
|---|------|------|
| 1 | D1 `parsed_documents` 테이블 마이그레이션 (0118) | ✅ PASS |
| 2 | PPTX 파싱 (JSZip + XML — `<a:t>` 태그) | ✅ PASS |
| 3 | DOCX 파싱 (JSZip + XML — `<w:t>` 태그) | ✅ PASS |
| 4 | PDF 파싱 (BT/ET 텍스트 스트림 + Workers AI fallback) | ✅ PASS |
| 5 | `content_text` + `content_structured` JSON 저장 | ✅ PASS |
| 6 | `POST /api/files/:id/parse` — 파싱 트리거 | ✅ PASS |
| 7 | `GET /api/files/:id/parsed` — 파싱 결과 조회 | ✅ PASS |
| 8 | `uploaded_files.status` → `parsed` 업데이트 | ✅ PASS |
| 9 | 파싱 서비스 단위 테스트 (4건) | ✅ PASS |

**F442 Match Rate: 9/9 = 100%**

---

## 신규 파일 목록

| 파일 | F-item | 설명 |
|------|--------|------|
| `packages/api/src/db/migrations/0117_uploaded_files.sql` | F441 | 파일 메타 D1 테이블 |
| `packages/api/src/db/migrations/0118_parsed_documents.sql` | F442 | 파싱 결과 D1 테이블 |
| `packages/api/src/core/files/index.ts` | F441+F442 | 모듈 export |
| `packages/api/src/core/files/schemas/file.ts` | F441 | Zod 스키마 + MIME 상수 |
| `packages/api/src/core/files/schemas/parsed-document.ts` | F442 | 파싱 결과 타입 |
| `packages/api/src/core/files/services/file-service.ts` | F441 | presign/confirm/list/delete |
| `packages/api/src/core/files/services/document-parser-service.ts` | F442 | PDF/PPTX/DOCX 파서 |
| `packages/api/src/core/files/routes/files.ts` | F441+F442 | 7개 API 엔드포인트 |
| `packages/api/src/core/files/routes/__tests__/files.test.ts` | F441+F442 | 라우트 테스트 9건 |
| `packages/api/src/core/files/services/__tests__/document-parser.test.ts` | F442 | 파서 테스트 4건 |
| `packages/web/src/components/feature/FileUploadZone.tsx` | F441 | 업로드 UI 컴포넌트 |

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/wrangler.toml` | R2 바인딩 3개 환경 추가 |
| `packages/api/src/env.ts` | `FILES_BUCKET: R2Bucket` 추가 |
| `packages/api/src/core/index.ts` | `filesRoute` export 추가 |
| `packages/api/src/app.ts` | `filesRoute` import + route 등록 |

---

## 테스트 결과

```
Test Files: 2 passed (2)
Tests: 13 passed (13) / 0 failed
- files.test.ts (9 tests) ✅
- document-parser.test.ts (4 tests) ✅
```

---

## 기술 결정 사항

1. **R2 Presigned URL**: Workers R2 바인딩의 `createPresignedUrl` 사용 (타입 단언 필요 — TypeScript 타입에 미포함)
2. **PDF 파싱 전략**: 외부 라이브러리 없이 BT/ET 텍스트 스트림 직접 파싱 → Workers CPU 128ms 제한 대응. 실패 시 Workers AI fallback
3. **PPTX/DOCX**: JSZip + XML 직접 파싱 (mammoth은 Node.js only)
4. **캐스케이드 삭제**: `parsed_documents.file_id REFERENCES uploaded_files(id) ON DELETE CASCADE` — 파일 삭제 시 파싱 결과 자동 삭제

---

## 다음 단계

- **Sprint 214**: F443 자료 기반 발굴 입력 — 파싱 결과를 분석 컨텍스트로 주입
- **D1 마이그레이션**: PR merge 후 CI/CD가 자동 적용 (`0117`, `0118`)
- **R2 버킷 생성**: 프로덕션 배포 전 `foundry-x-files` 버킷 생성 필요 (MCP 또는 wrangler)
