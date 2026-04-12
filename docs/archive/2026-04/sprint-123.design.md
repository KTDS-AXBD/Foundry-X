---
code: FX-DSGN-S123
title: "Sprint 123 — F301 BD 산출물 UX 연결성 개선 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Claude Opus 4.6
sprint: 123
f_items: [F301]
---

# FX-DSGN-S123 — Sprint 123: BD 산출물 UX 연결성 개선

## §1 설계 목표

discovery-detail ↔ pipeline ↔ mvp-tracking 간 UX 동선 연결. 기존 컴포넌트·API 최대 재활용.

## §2 기존 자산 분석

| 자산 | 위치 | 재사용 |
|------|------|--------|
| `ArtifactList` | `components/feature/ax-bd/ArtifactList.tsx` | ✅ bizItemId prop으로 discovery-detail에 삽입 |
| `getDiscoveryProgress()` | `lib/api-client.ts:1418` | ✅ 7단계 진행률 데이터 (StageProgress[]) |
| `STAGE_LABELS`, `STAGE_COLORS` | `components/feature/pipeline/item-card.tsx` | ✅ 프로세스 바 색상·라벨 |
| `fetchBizItemDetail()` | `lib/api-client.ts:1590` | ✅ 이미 discovery-detail에서 사용 중 |
| `GET /ax-bd/biz-items/:id/artifacts` | `routes/ax-bd-artifacts.ts:32` | ✅ ArtifactList 내부에서 호출 |

## §3 상세 설계

### Phase 1: discovery-detail 산출물 섹션

**파일**: `packages/web/src/routes/ax-bd/discovery-detail.tsx`

변경사항:
1. `import ArtifactList from "@/components/feature/ax-bd/ArtifactList"`
2. `import { getDiscoveryProgress, type DiscoveryProgress } from "@/lib/api-client"`
3. `import { STAGE_LABELS, STAGE_COLORS } from "@/components/feature/pipeline/item-card"`
4. `useState<DiscoveryProgress | null>` 추가
5. `useEffect`에서 `getDiscoveryProgress(id)` 병렬 호출
6. JSX: 기존 grid 아래에 2개 섹션 추가:
   - **프로세스 진행률**: 가로 스텝 바 (7단계, currentStage 하이라이트)
   - **산출물 목록**: `<ArtifactList bizItemId={id} />`

**프로세스 진행률 인라인 UI**:
```
[등록] → [발굴] → [형상화] → [리뷰] → [의사결정] → [Offering] → [MVP]
  ✅      ✅       🔵        ○         ○            ○          ○
```
- 완료 단계: 초록 배경 + 체크
- 현재 단계: 파랑 배경 + 펄스 애니메이션
- 미진행: 회색 테두리

### Phase 2: Pipeline 카드 드릴다운

**파일**: `packages/web/src/routes/pipeline.tsx`

변경사항:
1. `import { useNavigate } from "react-router-dom"`
2. `const navigate = useNavigate()` 추가
3. `handleItemClick`: `window.location.href = ...` → `navigate("/ax-bd/" + id)`

### Phase 3: MVP 역링크

**파일**: `packages/web/src/routes/mvp-tracking.tsx`

변경사항:
1. `import { Link } from "react-router-dom"` (이미 존재 확인 → 없으면 추가)
2. Biz Item 컬럼 셀: `{item.bizItemId ?? "-"}` → 조건부 Link
   ```tsx
   {item.bizItemId ? (
     <Link to={`/ax-bd/${item.bizItemId}`} className="text-blue-600 hover:underline font-mono text-xs">
       {item.bizItemId.slice(0, 8)}...
     </Link>
   ) : "-"}
   ```

## §4 테스트 전략

| # | 대상 | 방법 |
|---|------|------|
| 1 | discovery-detail 산출물 렌더링 | web 단위 테스트: ArtifactList + progress 바 |
| 2 | pipeline navigate 전환 | 기존 테스트 회귀 확인 |
| 3 | mvp-tracking Link | 기존 테스트 회귀 확인 |
| 4 | typecheck + lint | `turbo typecheck && turbo lint` |

## §5 변경 파일 매핑

| # | 파일 | 액션 | LOC 예상 |
|---|------|------|----------|
| 1 | `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 수정 | +60 |
| 2 | `packages/web/src/routes/pipeline.tsx` | 수정 | +3, -2 |
| 3 | `packages/web/src/routes/mvp-tracking.tsx` | 수정 | +8, -2 |

**신규 파일 없음** — 기존 ArtifactList + api-client 재사용.
