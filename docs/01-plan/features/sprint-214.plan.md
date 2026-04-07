---
code: FX-PLAN-S214
title: Sprint 214 Plan — F443 자료 기반 발굴 입력
version: 1.0
status: Active
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
sprint: 214
f-items: F443
phase: 25-A
---

# Sprint 214 Plan — F443 자료 기반 발굴 입력

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 214 |
| F-item | F443 |
| Phase | 25-A (Discovery Pipeline v2) |
| 선행 Sprint | 213 (F441 파일 업로드 + F442 문서 파싱) |
| 목표 | 파싱된 문서를 아이템 등록 + 발굴 분석 컨텍스트로 자동 연결 |

## 1. 배경 및 목적

Sprint 213(F441+F442)에서 R2 파일 업로드 인프라와 문서 파싱 엔진이 완성되었다.
Sprint 214(F443)는 그 결과물을 **실제 발굴 플로우에 통합**하는 연결 레이어다.

파싱된 텍스트를 활용해:
1. 아이템 제목/설명을 AI가 자동 제안
2. 분석 실행 시 문서 내용을 컨텍스트로 주입
3. 아이템 상세 페이지에서 첨부 자료를 관리

## 2. 구현 범위

### 2.1 API (packages/api)

| 컴포넌트 | 파일 | 내용 |
|----------|------|------|
| 문서 기반 아이템 추출 서비스 | `core/files/services/document-extract-service.ts` | 파싱 텍스트 → AI 요약으로 title/description 추출 |
| 아이템 추출 API | `core/files/routes/files.ts` 추가 | `POST /api/files/extract-item` |
| 분석 컨텍스트 주입 | `core/discovery/routes/biz-items.ts` 수정 | 분석 실행 시 `uploaded_files + parsed_documents` 컨텍스트 조회 |

### 2.2 Web (packages/web)

| 컴포넌트 | 파일 | 내용 |
|----------|------|------|
| 온보딩 위저드 확장 | `routes/getting-started.tsx` 수정 | Step 0.5: 자료 업로드 (선택) 추가 |
| 첨부 자료 패널 | `components/feature/discovery/AttachedFilesPanel.tsx` 신규 | 파일 목록 + 파싱 상태 표시 |
| 아이템 상세 탭 추가 | `routes/ax-bd/discovery-detail.tsx` 수정 | "첨부 자료" 4번째 탭 추가 |
| api-client 확장 | `lib/api-client.ts` 수정 | extractItemFromDocuments, fetchFiles 함수 추가 |

## 3. 선행 조건

| 조건 | 상태 |
|------|------|
| F441: 파일 업로드 인프라 (uploaded_files D1 테이블, presign API) | ✅ Sprint 213 |
| F442: 문서 파싱 엔진 (parsed_documents D1 테이블, /parse API) | ✅ Sprint 213 |
| FileUploadZone 컴포넌트 | ✅ Sprint 213 |

## 4. 제약 사항

- Workers AI 사용 (외부 AI API 없이 Cloudflare Workers AI로 요약)
- 자료 업로드는 온보딩 위저드에서 **선택(optional)** — 건너뛰기 가능
- 분석 컨텍스트 주입은 기존 분석 실행 API 수정 (신규 API 아님)

## 5. 완료 기준 (Definition of Done)

- [ ] `POST /api/files/extract-item` — 파싱 결과 → AI 제목/설명 추출
- [ ] 분석 실행 시 첨부 파일 파싱 결과 컨텍스트 자동 포함
- [ ] getting-started.tsx에 자료 업로드 스텝 (건너뛰기 가능)
- [ ] discovery-detail.tsx에 "첨부 자료" 탭 추가
- [ ] typecheck + test 통과

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| Workers AI 응답 지연 | extract-item은 비동기 제안 (blocking 아님) |
| 파싱 결과 없는 경우 | 컨텍스트 주입 시 graceful fallback (빈 배열) |
