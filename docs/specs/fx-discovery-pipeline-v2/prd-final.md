---
code: FX-SPEC-PRD-DISC-V2
title: Discovery Pipeline v2 PRD
version: 1.0
status: Active
category: SPEC
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# Discovery Pipeline v2 — PRD

## 1. 배경 및 목적

Phase 24에서 아이템 등록→발굴 분석→사업기획서 생성까지 E2E 흐름이 완성되었다.
Phase 25는 이 파이프라인을 **실무 수준**으로 고도화한다:

1. **파일 업로드**: 사용자가 기존 자료(PDF/PPT/DOCX)를 업로드하면 자동으로 분석 입력으로 활용
2. **생성 고도화**: 사업기획서 편집, 템플릿 다양화, 내보내기 강화
3. **E2E 흐름 보완**: 전체 파이프라인 상태 추적 + 단계 간 자동 전환
4. **운영 품질**: 에러/로딩 UX + 반응형 + 접근성

## 2. 범위

### In Scope
- R2 기반 파일 업로드 인프라 (Presigned URL)
- 문서 파싱 (PDF/PPT/DOCX → 텍스트 추출)
- 파싱 결과를 발굴 분석 컨텍스트로 주입
- 사업기획서 섹션별 편집기 + AI 재생성
- 용도별 템플릿 3종 (내부보고/제안서/IR피치)
- 사업기획서 PDF/PPTX 내보내기
- 전체 파이프라인 진행률 시각화
- 단계 완료 시 다음 단계 자동 제안
- 공통 ErrorBoundary + LoadingSkeleton
- 모바일 반응형 + ARIA 접근성

### Out of Scope
- 실시간 협업 편집 (멀티커서)
- 외부 클라우드 스토리지 연동 (Google Drive, OneDrive)
- 이미지/동영상 분석
- 다국어 지원

## 3. F-item 상세

### Phase 25-A: 파일 업로드 + 자료 기반 분석 (M1, P0)

#### F441: 파일 업로드 인프라
- **목적**: 사용자가 PDF/PPT/DOCX 파일을 업로드할 수 있는 기반
- **구현 범위**:
  - R2 버킷 생성 + wrangler.toml 바인딩
  - Presigned URL 서명 API (`POST /api/files/presign`)
  - 파일 메타데이터 D1 테이블 (`uploaded_files`: id, tenant_id, biz_item_id, filename, mime_type, r2_key, size_bytes, status, created_at)
  - 파일 목록/삭제 API (`GET/DELETE /api/files`)
  - Web: FileUploadZone 컴포넌트 (drag-and-drop + 진행바)
- **제약**: 파일 크기 50MB 이하, 허용 MIME: pdf, pptx, docx
- **Sprint**: 213

#### F442: 문서 파싱 엔진
- **목적**: 업로드된 문서에서 텍스트와 구조를 추출
- **구현 범위**:
  - 파싱 서비스 (`document-parser-service.ts`)
  - PDF: pdf-parse 또는 Workers AI 활용
  - PPTX: JSZip + XML 파싱 (슬라이드별 텍스트)
  - DOCX: mammoth 또는 JSZip + XML
  - 파싱 결과 D1 저장 (`parsed_documents`: id, file_id, content_text, content_structured, page_count, parsed_at)
  - 비동기 처리: 업로드 완료 시 파싱 큐 실행
- **Sprint**: 213 (F441 병렬)

#### F443: 자료 기반 발굴 입력
- **목적**: 파싱 결과를 아이템 등록 + 분석 컨텍스트로 자동 주입
- **구현 범위**:
  - 온보딩 위저드 확장: "자료 업로드" 스텝 추가
  - 파싱된 텍스트에서 아이템 제목/설명 자동 추출 (AI 요약)
  - 분석 실행 시 파싱 결과를 컨텍스트로 주입 (`analysis_context.documents[]`)
  - 아이템 상세 페이지에 "첨부 자료" 탭 추가
- **선행**: F441 + F442
- **Sprint**: 214

### Phase 25-B: 생성 고도화 (M2, P0)

#### F444: 사업기획서 편집기
- **목적**: 생성된 기획서를 섹션별로 편집 + AI 재생성
- **구현 범위**:
  - 섹션별 인라인 편집 (Markdown 에디터)
  - "AI 재생성" 버튼: 해당 섹션만 AI로 다시 생성 (프롬프트 커스텀 가능)
  - 편집 이력 저장 (D1 `business_plan_versions`: id, plan_id, version, sections_json, created_at)
  - 버전 비교 diff UI
- **기반**: F440 사업기획서 생성 결과
- **Sprint**: 215

#### F445: 기획서 템플릿 다양화
- **목적**: 용도에 맞는 기획서 형식 선택
- **구현 범위**:
  - 템플릿 3종 정의:
    - **내부보고**: 요약 중심, 2~3페이지, 핵심 지표 강조
    - **제안서**: 고객 관점, 5~7페이지, 문제→해결→효과 구조
    - **IR피치**: 투자자 관점, 10슬라이드, 시장→제품→비즈모델→팀
  - 템플릿 선택 UI (생성 시작 시)
  - 톤/분량 파라미터 (formal/casual, short/medium/long)
  - D1 `plan_templates` 테이블
- **Sprint**: 215 (F444 병렬)

#### F446: 내보내기 강화
- **목적**: 사업기획서를 PDF/PPTX로 내보내기
- **구현 범위**:
  - 기존 offering-export 패턴 활용 (pptx-renderer, content-adapter)
  - 사업기획서 전용 PPTX 템플릿 (F445 템플릿별)
  - PDF 렌더링 (HTML → PDF via Puppeteer 또는 html-pdf)
  - 디자인 토큰 적용 (기존 design-token-service 활용)
  - 다운로드 버튼 UI
- **선행**: F444
- **Sprint**: 216

### Phase 25-C: E2E 흐름 보완 (M3, P1)

#### F447: 파이프라인 상태 추적
- **목적**: 아이템별 전체 진행 상태를 한눈에 파악
- **구현 범위**:
  - 파이프라인 단계 정의: 등록 → 발굴 분석 → 기획서 생성 → 형상화 → Offering
  - 상태 집계 API (`GET /api/biz-items/:id/pipeline-status`)
  - 스테퍼/타임라인 UI 컴포넌트 (아이템 상세 페이지 상단)
  - 아이템 목록에 진행률 뱃지 (예: "3/5 단계")
- **Sprint**: 217

#### F448: 단계 간 자동 전환
- **목적**: 한 단계 완료 시 다음 단계를 자동으로 안내
- **구현 범위**:
  - 분석 완료 시: "기획서 생성하기" CTA 버튼
  - 기획서 완료 시: "형상화 시작" CTA 버튼
  - 알림 토스트: "발굴 분석이 완료되었습니다. 사업기획서를 생성할까요?"
  - 자동 진행 옵션 (설정에서 on/off)
- **Sprint**: 217 (F447 병렬)

### Phase 25-D: 운영 품질 (M4, P1)

#### F449: 에러/로딩 UX
- **목적**: API 실패 시 사용자 경험 개선
- **구현 범위**:
  - 공통 ErrorBoundary: 에러 메시지 + 재시도 버튼 + 상세 접기
  - LoadingSkeleton: 페이지별 스켈레톤 UI (아이템 목록, 분석 결과, 기획서)
  - EmptyState: 데이터 없음 안내 + 시작 가이드 링크
  - API 재시도 로직: 네트워크 에러 시 3회 재시도 (exponential backoff)
- **Sprint**: 218

#### F450: 반응형 + 접근성
- **목적**: 모바일 환경 + 접근성 기본 대응
- **구현 범위**:
  - Discovery 관련 주요 페이지 반응형 (breakpoint: 768px, 1024px)
  - ARIA 라벨: 인터랙티브 요소, 폼 필드, 네비게이션
  - 키보드 내비게이션: Tab 순서 + Enter/Space 활성화 + Escape 닫기
  - 색상 대비: WCAG 2.1 AA 기준
- **Sprint**: 218 (F449 병렬)

## 4. 기술 아키텍처

### 파일 업로드 흐름
```
User → FileUploadZone → POST /api/files/presign → R2 Presigned URL
     → PUT R2 (direct upload) → POST /api/files/confirm
     → document-parser-service (async) → parsed_documents D1
```

### 사업기획서 편집 흐름
```
기획서 생성 (F440) → 섹션 편집 (F444) → AI 재생성 (OpenRouter)
                   → 버전 저장 (D1)    → 내보내기 (F446)
```

### D1 테이블 추가 (예상 3개)
- `uploaded_files` — 업로드 파일 메타
- `parsed_documents` — 파싱 결과
- `business_plan_versions` — 기획서 편집 이력

### 의존성
- R2 버킷 바인딩 (wrangler.toml)
- pdf-parse / mammoth / JSZip (문서 파싱)
- 기존 pptx-renderer + content-adapter 재활용

## 5. Sprint 배번

| Sprint | F-items | 비고 |
|--------|---------|------|
| 213 | F441 + F442 | 파일 업로드 + 파싱 (병렬) |
| 214 | F443 | 자료 기반 입력 (F441+F442 선행) |
| 215 | F444 + F445 | 편집기 + 템플릿 (병렬) |
| 216 | F446 | 내보내기 (F444 선행) |
| 217 | F447 + F448 | 파이프라인 추적 + 자동 전환 (병렬) |
| 218 | F449 + F450 | 운영 품질 (병렬) |

**예상 기간**: Sprint 6개 × ~30분 = ~3시간 (배치 병렬 시 단축 가능)

## 6. 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | Workers에서 PDF 파싱 제한 (CPU 128ms) | F442 지연 | Workers AI 또는 외부 API fallback |
| R2 | R2 Presigned URL CORS 이슈 | F441 지연 | Access-Control 헤더 + R2 CORS 설정 |
| R3 | PPTX 렌더링 Workers 호환성 | F446 지연 | 기존 pptx-renderer 패턴 활용 (검증 완료) |
