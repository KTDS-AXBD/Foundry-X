---
code: FX-PLAN-S170
title: "Sprint 170 Plan — Full UI: 섹션 에디터 + 교차검증 대시보드"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-018]], [[FX-DSGN-S168]]"
---

# Sprint 170 Plan: Full UI — 섹션 에디터 + 교차검증 대시보드

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F376 섹션 에디터 + HTML 프리뷰, F377 교차검증 대시보드 |
| Sprint | 170 |
| Phase | 18-C (Full UI) |
| 기간 | 2026-04-06 |
| 선행 | Sprint 167 (F371 Sections API), Sprint 168 (F372 Export, F373 Validate) |

### Value Delivered 4-관점

| 관점 | 내용 |
|------|------|
| Problem | 발굴→형상화 과정에서 사업기획서 섹션을 편집하고 검증 결과를 확인하는 UI가 없음 |
| Solution | 섹션별 마크다운 에디터 + 실시간 HTML 프리뷰 + GAN/SixHats/Expert 교차검증 대시보드 |
| Function UX Effect | 섹션 편집 즉시 HTML 프리뷰 반영, 검증 결과를 한눈에 파악하는 통합 대시보드 |
| Core Value | 형상화 작업 효율 극대화 — 편집↔프리뷰↔검증 사이클을 단일 페이지에서 완결 |

## 2. 요구사항

### F376: 섹션 에디터 + HTML 프리뷰 (FX-REQ-368, P0)

- **라우트**: `/shaping/offering/:id/edit`
- **좌우 분할 레이아웃**: 왼쪽 = 섹션 리스트 + 에디터, 오른쪽 = HTML 프리뷰 (iframe)
- **섹션 리스트**: 드래그&드롭 순서 변경, 포함/제외 토글, 제목 인라인 편집
- **섹션 에디터**: textarea 기반 마크다운 편집, 저장 버튼(PUT /offerings/:id/sections/:sectionId)
- **HTML 프리뷰**: iframe으로 GET /offerings/:id/export?format=html 결과 렌더링
- **자동 갱신**: 섹션 저장 후 프리뷰 자동 리로드

### F377: 교차검증 대시보드 (FX-REQ-369, P1)

- **라우트**: `/shaping/offering/:id/validate` (에디터 페이지 내 탭 또는 별도 페이지)
- **검증 실행**: "검증 시작" 버튼 → POST /offerings/:id/validate
- **결과 표시**:
  - GAN Score: 진행 바 + 수치 + 추진론/반대론 텍스트
  - Six Hats: 6색 카드 그리드 (각 모자별 요약)
  - Expert: 5종 전문가 리뷰 카드 (TA/AA/CA/DA/QA)
  - Overall Score: 종합 점수 + 상태 배지
- **히스토리**: GET /offerings/:id/validations 목록 표시

## 3. 기술 접근

### 3-1. 기존 API 활용 (코드 변경 없음)

| API | 용도 | Sprint |
|-----|------|--------|
| GET /offerings/:id/sections | 섹션 목록 조회 | 167 |
| PUT /offerings/:id/sections/:sectionId | 섹션 내용 수정 | 167 |
| PUT /offerings/:id/sections/reorder | 순서 변경 | 167 |
| GET /offerings/:id/export?format=html | HTML 프리뷰 | 168 |
| POST /offerings/:id/validate | 검증 실행 | 168 |
| GET /offerings/:id/validations | 검증 히스토리 | 168 |

### 3-2. 신규 Web 파일

| 파일 | 역할 |
|------|------|
| `routes/offering-editor.tsx` | F376 섹션 에디터 + HTML 프리뷰 페이지 |
| `routes/offering-validate.tsx` | F377 교차검증 대시보드 페이지 |
| `components/feature/offering-editor/section-list.tsx` | 섹션 리스트 컴포넌트 |
| `components/feature/offering-editor/section-editor.tsx` | 마크다운 에디터 컴포넌트 |
| `components/feature/offering-editor/html-preview.tsx` | iframe HTML 프리뷰 컴포넌트 |
| `components/feature/offering-validate/validation-card.tsx` | GAN/SixHats/Expert 카드 |
| `components/feature/offering-validate/score-bar.tsx` | 점수 진행 바 |

### 3-3. 라우터 등록

```
/shaping/offering/:id/edit → offering-editor.tsx
/shaping/offering/:id/validate → offering-validate.tsx
```

## 4. 리스크

| # | 리스크 | 대응 |
|---|--------|------|
| R1 | iframe HTML 프리뷰 CORS — API 도메인과 Pages 도메인 다름 | srcdoc 속성으로 HTML 문자열 직접 주입 (CORS 무관) |
| R2 | 드래그&드롭 라이브러리 의존 | HTML5 native drag 또는 간단한 위/아래 버튼으로 대체 |
| R3 | GAN/SixHats/Expert 데이터가 JSON string으로 저장됨 | JSON.parse로 파싱 후 구조화 표시 |

## 5. 검증 계획

- typecheck: `turbo typecheck` 통과
- lint: `turbo lint` 통과
- test: 기존 테스트 regression 없음
- E2E: offering-editor, offering-validate 라우트 접근 확인
