---
code: FX-PLAN-S213
title: Sprint 213 Plan — F441+F442 파일 업로드 + 문서 파싱
version: 1.0
status: Active
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
system-version: 0.5.0
---

# Sprint 213 Plan — F441 파일 업로드 인프라 + F442 문서 파싱 엔진

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 213 |
| Phase | 25-A (Discovery Pipeline v2) |
| F-items | F441 (파일 업로드 인프라) + F442 (문서 파싱 엔진) |
| 전략 | 병렬 구현 (독립 모듈) |
| 목표 | R2 Presigned URL + D1 파일 메타 + FileUploadZone UI + PDF/PPTX/DOCX 파싱 |
| 참고 PRD | `docs/specs/fx-discovery-pipeline-v2/prd-final.md` |

## 목표 (Goal)

Phase 24에서 완성된 Discovery E2E 흐름(아이템 등록→발굴→기획서 생성)에
**파일 업로드 기반 자료 분석** 기능을 추가한다.

- **F441**: 사용자가 PDF/PPT/DOCX를 업로드할 수 있는 R2 기반 인프라
- **F442**: 업로드된 문서에서 텍스트/구조를 추출하는 파싱 엔진

두 F-item은 완전히 독립적이므로 병렬 구현한다.

## 현황 분석

### 기존 인프라
- D1 DB: migration 0116까지 적용 (최신: `0116_billing.sql`)
- R2: wrangler.toml에 바인딩 없음 → **신규 추가 필요**
- 파일 처리: 기존 코드 없음 → **신규 모듈 `core/files/`**
- Hono 패턴: `OpenAPIHono`, Zod 스키마 필수 (ESLint 룰)

### 의존성
- F441은 F442와 병렬 (독립)
- F443(Sprint 214)이 F441+F442에 의존 → Sprint 213이 선행 필수

## 작업 계획 (Task Breakdown)

### F441: 파일 업로드 인프라

| # | 작업 | 파일 |
|---|------|------|
| 1 | D1 마이그레이션 — `uploaded_files` 테이블 | `0117_uploaded_files.sql` |
| 2 | R2 바인딩 추가 | `wrangler.toml`, `env.ts` |
| 3 | 파일 스키마 (Zod) | `core/files/schemas/file.ts` |
| 4 | 파일 서비스 (CRUD + presign) | `core/files/services/file-service.ts` |
| 5 | 파일 라우트 (presign/confirm/list/delete) | `core/files/routes/files.ts` |
| 6 | app.ts에 route 등록 | `app.ts` |
| 7 | Web: FileUploadZone 컴포넌트 | `web/src/components/features/FileUploadZone.tsx` |
| 8 | 단위 테스트 | `core/files/routes/__tests__/files.test.ts` |

### F442: 문서 파싱 엔진

| # | 작업 | 파일 |
|---|------|------|
| 1 | D1 마이그레이션 — `parsed_documents` 테이블 | `0118_parsed_documents.sql` |
| 2 | 문서 파서 서비스 (PDF/PPTX/DOCX) | `core/files/services/document-parser-service.ts` |
| 3 | 파싱 스키마 | `core/files/schemas/parsed-document.ts` |
| 4 | 파싱 트리거 라우트 (`POST /api/files/:id/parse`) | `core/files/routes/files.ts`에 추가 |
| 5 | 파싱 결과 조회 라우트 (`GET /api/files/:id/parsed`) | 위 파일에 추가 |
| 6 | 단위 테스트 | `core/files/services/__tests__/document-parser.test.ts` |

## 기술 결정 사항

### R2 Presigned URL 전략
Workers 환경에서 R2 direct upload를 위해 Presigned URL을 생성한다:
1. `POST /api/files/presign` → R2 presigned PUT URL 반환
2. 클라이언트가 R2에 직접 PUT (Workers 용량 제한 우회)
3. `POST /api/files/confirm` → D1에 메타 저장

### 문서 파싱 전략 (Workers CPU 제한 고려)
- **PDF**: `pdf-parse` (Workers AI fallback 고려)
- **PPTX**: JSZip + XML 파싱 (슬라이드별 텍스트 추출)
- **DOCX**: `mammoth` 라이브러리 (HTML 변환 후 텍스트 추출)
- 파싱 결과: `content_text` (전체 텍스트) + `content_structured` (JSON: 섹션/슬라이드별)
- **비동기**: 업로드 확인 후 즉시 파싱 실행 (백그라운드 응답 후 처리)

### 파일 제약
- 크기: 50MB 이하
- MIME: `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## DoD (Definition of Done)

- [ ] D1 마이그레이션 2개 추가 (0117, 0118)
- [ ] R2 바인딩 wrangler.toml 추가
- [ ] `POST /api/files/presign` → presigned URL 반환
- [ ] `POST /api/files/confirm` → D1 파일 메타 저장
- [ ] `GET /api/files` → 파일 목록
- [ ] `DELETE /api/files/:id` → 파일 삭제
- [ ] `POST /api/files/:id/parse` → 파싱 트리거
- [ ] `GET /api/files/:id/parsed` → 파싱 결과 조회
- [ ] FileUploadZone 컴포넌트 (drag-and-drop + 진행바)
- [ ] typecheck + lint 통과
- [ ] 단위 테스트 작성

## 리스크

| # | 리스크 | 대응 |
|---|--------|------|
| R1 | R2 미생성 시 바인딩 에러 | MCP로 R2 버킷 생성 또는 로컬 mock |
| R2 | Workers에서 pdf-parse CPU 초과 | Workers AI 대체 경로 준비 |
| R3 | mammoth/JSZip Workers 호환성 | 경량 XML 파서로 fallback |
