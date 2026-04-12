---
title: Sprint 224 — F459+F460 Gap 보강 (pdca-iterator)
version: 1.0
status: active
phase: Phase 26-D (iterate)
f_items: F459, F460
sprint: 224
created: 2026-04-08
---

# Sprint 224: Portfolio Gap 보강

## 목적

Sprint 223 Gap Analysis (Match 53%) 누락 항목 4건 보강.

## 보강 대상 (High/Medium만)

| # | 항목 | 영향도 | 구현 내용 |
|---|------|--------|-----------|
| 1 | **Portfolio List API** | High | `GET /biz-items/portfolio-list` — 전체 목록 + coverage 요약 (hasEvaluation, prdCount, offeringCount 등) |
| 2 | **Reverse Lookup API** | Medium | `GET /biz-items/by-artifact?type=prd&id=xxx` — 산출물 ID로 연결된 아이템 조회 |
| 3 | **ArtifactPreview 컴포넌트** | High | PRD/사업기획서/Offering 요약 미리보기 (R2 대용량은 메타만, D1 내용은 처음 500자) |
| 4 | **편집 링크** | Medium | PortfolioGraph 각 노드에 편집 페이지 URL 연결 (/offering-editor, /biz-items/:id/business-plan 등) |

## 제외 (Low / 다음 Phase)

- Dashboard 위젯: discovery 탭 접근으로 충분
- E2E 테스트: 별도 E2E 감사 세션에서 처리

## 구현 파일

| 파일 | 변경 |
|------|------|
| `packages/api/src/core/discovery/services/portfolio-service.ts` | listWithCoverage(), findByArtifact() 추가 |
| `packages/api/src/core/discovery/routes/biz-items.ts` | 2개 endpoint 추가 |
| `packages/api/src/core/discovery/schemas/portfolio.ts` | PortfolioListItem, ArtifactLookup 스키마 추가 |
| `packages/web/src/components/feature/discovery/ArtifactPreview.tsx` | 신규 |
| `packages/web/src/components/feature/discovery/PortfolioGraph.tsx` | 편집 링크 추가 |
| `packages/web/src/lib/api-client.ts` | 2개 API 함수 추가 |
| `packages/api/src/__tests__/portfolio-iterate.test.ts` | 보강 테스트 |

## 성공 기준

- [ ] Portfolio List API: 4건 목록 + coverage 반환
- [ ] Reverse Lookup: PRD ID로 아이템 조회 성공
- [ ] ArtifactPreview: PRD 요약 미리보기 렌더링
- [ ] 편집 링크: 그래프 노드 클릭 → 편집 페이지 이동
- [ ] Match Rate ≥ 90%
