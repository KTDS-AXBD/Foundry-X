---
code: FX-PLAN-S123
title: "Sprint 123 — F301 BD 산출물 UX 연결성 개선"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Claude Opus 4.6
sprint: 123
f_items: [F301]
---

# FX-PLAN-S123 — Sprint 123: BD 산출물 UX 연결성 개선

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F301 BD 산출물 UX 연결성 개선 |
| Sprint | 123 |
| REQ | FX-REQ-293 (P2) |
| 목표 | BD 산출물(artifacts)이 흩어진 화면 간 연결 동선을 개선하여, 발굴 상세→산출물, 파이프라인→상세, MVP→원본 아이템 탐색을 자연스럽게 연결 |
| 기간 | 2026-04-03 |
| 의존성 | 없음 (F300과 병렬 가능) |

## Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | discovery-detail 페이지에 산출물 정보가 없고, pipeline 카드 클릭이 URL 직접 이동, MVP 테이블에서 원본 biz_item으로 돌아갈 수 없음 |
| Solution | 3-Phase UX 연결: 산출물 섹션 삽입 + 카드 드릴다운(React Router navigate) + 역링크 |
| Function UX Effect | 발굴 상세에서 산출물 즉시 확인, 파이프라인에서 SPA 탐색, MVP에서 원본 아이템 1-click 접근 |
| Core Value | BD 업무 동선 단축 — 페이지 전환 없이 관련 정보를 컨텍스트 내에서 탐색 |

## §1 목표

### F301: BD 산출물 UX 연결성 개선

**Phase 1 — discovery-detail 산출물 섹션**
- `discovery-detail.tsx`에 해당 biz_item의 산출물 목록(ArtifactList) + 프로세스 진행률(ProcessProgress) 컴포넌트 추가
- API: `GET /ax-bd/biz-items/:bizItemId/artifacts` (이미 존재)

**Phase 2 — Pipeline 카드 드릴다운**
- `pipeline.tsx`의 `handleItemClick`을 `window.location.href` → `useNavigate()` SPA 네비게이션으로 전환
- 이동 대상: `/ax-bd/:id` (discovery-detail)

**Phase 3 — MVP 역링크**
- `mvp-tracking.tsx` 테이블의 "Biz Item" 컬럼을 클릭 가능한 `<Link>` 로 전환
- 이동 대상: `/ax-bd/:bizItemId` (discovery-detail)

## §2 범위

### 변경 파일

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 산출물 섹션 + 프로세스 진행률 추가 |
| 2 | `packages/web/src/routes/pipeline.tsx` | useNavigate 전환, import 추가 |
| 3 | `packages/web/src/routes/mvp-tracking.tsx` | bizItemId 컬럼을 Link로 전환 |
| 4 | `packages/web/src/components/feature/ax-bd/artifact-list.tsx` | (신규) 산출물 목록 컴포넌트 |
| 5 | `packages/web/src/components/feature/ax-bd/process-progress.tsx` | (신규) 7단계 프로세스 진행률 바 |
| 6 | `packages/web/src/lib/api-client.ts` | fetchBizItemArtifacts 함수 추가 |

### 변경하지 않는 영역
- API 서버 (기존 엔드포인트 활용)
- D1 마이그레이션 (스키마 변경 없음)
- shared 패키지

## §3 기술 설계 요약

### ArtifactList 컴포넌트
- `fetchApi<BdArtifact[]>("/ax-bd/biz-items/:bizItemId/artifacts")` 호출
- 산출물을 skillId별로 그룹핑하여 카드 형태로 표시
- 각 카드: skillId, stageId, version, status, createdAt 표시
- 빈 상태: "아직 산출물이 없어요" 안내 메시지

### ProcessProgress 컴포넌트
- 7단계 프로세스 바: REGISTERED → DISCOVERY → FORMALIZATION → REVIEW → DECISION → OFFERING → MVP
- 현재 단계 하이라이트 (item.status 또는 currentStage 기반)
- `STAGE_LABELS` + `STAGE_COLORS` 재사용 (item-card.tsx에서 export)

### Pipeline 드릴다운
- `window.location.href` → `useNavigate("/ax-bd/" + id)` 전환
- SPA 전환으로 상태 유지 + 빠른 탐색

### MVP 역링크
- `{item.bizItemId ?? "-"}` → `<Link to={"/ax-bd/" + item.bizItemId}>{item.bizItemId}</Link>`
- bizItemId가 없는 경우 "-" 유지

## §4 테스트 전략

- Web 컴포넌트 테스트: ArtifactList, ProcessProgress 단위 테스트
- 기존 테스트 회귀: `pnpm test` (packages/web)
- 타입체크: `pnpm typecheck`

## §5 완료 기준

1. discovery-detail에서 산출물 목록이 렌더링됨
2. discovery-detail에서 프로세스 진행률 바가 표시됨
3. pipeline 카드 클릭 시 SPA 네비게이션으로 discovery-detail 이동
4. mvp-tracking 테이블에서 bizItemId 클릭 시 discovery-detail 이동
5. typecheck + lint + test 통과
