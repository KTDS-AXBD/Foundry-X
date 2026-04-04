---
code: FX-DSGN-S128
title: "Sprint 128 Design — F307+F308 SkillEnrichedView + 통합 QA"
version: 1.0
status: Active
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
refs:
  - "[[FX-PLAN-S128]]"
---

# Sprint 128 Design — F307 대시보드 + F308 통합 QA

## 1. F307: SkillEnrichedView 대시보드

### 1.1 라우�� 구조

`packages/web/src/router.tsx`에 추가:
```typescript
{ path: "ax-bd/skill-catalog/:skillId", lazy: () => import("@/routes/ax-bd/skill-detail") },
```

### 1.2 상세 페이지

`packages/web/src/routes/ax-bd/skill-detail.tsx`:

```typescript
import { useParams } from "react-router";
import SkillEnrichedView from "@/components/feature/ax-bd/SkillEnrichedView";

export default function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>();
  if (!skillId) return <div>스킬 ID가 없어요.</div>;
  return <SkillEnrichedView skillId={skillId} />;
}
```

### 1.3 SkillEnrichedView 컴포넌트

`packages/web/src/components/feature/ax-bd/SkillEnrichedView.tsx`:

**구조**:
```
SkillEnrichedView
├── Header (이름, 카테고리, 상태, 안전등급)
├── SkillMetricsCards (4 stat 카드)
│   ├── 총 실행 횟수
│   ├── 성공률 (%)
│   ├── 평균 비용 ($)
│   └── 평균 응답시간 (ms)
├── SkillLineageTree (계보 시각화)
│   ├── 부모 노드들
│   ├── ���재 스킬 (중앙, 강조)
│   └── 자식 노드들
├── SkillVersionHistory (버전 이력)
│   └── 테이블 (버전, 날짜, 모델, changelog)
└── Actions
    ├── Deploy SKILL.md (admin만)
    └── 카탈로그로 돌아가기
```

**데이터 ��스**: `useSkillEnriched(skillId)` hook (F303에서 구현됨)
- `enriched.registry` → 기본 정보
- `enriched.metrics` → 메트릭 카드
- `enriched.versions` → 버전 이력
- `enriched.lineage` → 계보 트리

### 1.4 SkillMetricsCards

`packages/web/src/components/feature/ax-bd/SkillMetricsCards.tsx`:

```typescript
interface Props {
  metrics: SkillMetricSummary | null;
}

// 4개 stat 카드: totalExecutions, successRate, tokenCostAvg, avgDurationMs
// 메트릭 없으면 "데이터 없음" placeholder
```

### 1.5 SkillLineageTree

`packages/web/src/components/feature/ax-bd/SkillLineageTree.tsx`:

```
부모 노드들          현재 스킬           자식 노드들
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ parent-1 │���───▶│ current skill│────▶│ child-1  │
└──────────┘     │ (강조 표시)   │     └──────────┘
┌──────────┐     └──────────────┘     ┌──────────┐
│ parent-2 │────▶                ────▶│ child-2  │
└──────────┘                          └──────────┘
```

- CSS flex 기반 3-column 레이아웃 (D3.js 불필요)
- 각 노드: skillId + derivationType (manual/derived/captured) 배지
- 노드 클릭 → `/ax-bd/skill-catalog/${skillId}` 이동
- 빈 lineage → "파생 관계가 없어요" 안내

### 1.6 SkillVersionHistory

`packages/web/src/components/feature/ax-bd/SkillVersionHistory.tsx`:

- versions 배열을 테이블로 표시
- 컬럼: 버전, 모델, maxTokens, changelog, 날짜
- 빈 versions → "버전 이력이 없어요"

### 1.7 SkillCatalog 연동

기존 `SkillCatalog.tsx`에서 카드 클릭 동작 변경:
- 기존: `setSelectedSkill(skill)` → Sheet 오픈
- 변경: `navigate(`/ax-bd/skill-catalog/${skill.skillId}`)` → 상세 페이지 이동
- SkillDetailSheet는 유지 (폴백 모드에서 사용)

## 2. F308: 통합 QA + 데모 데이터

### 2.1 데모 시딩 스크립트

`scripts/skill-demo-seed.sh`:

```bash
#!/usr/bin/env bash
# Skill Unification 데모 데이터 시딩
set -euo pipefail

API_URL="${1:-https://foundry-x-api.ktds-axbd.workers.dev/api}"
TOKEN="${2:-$FOUNDRY_X_TOKEN}"

# 1. 샘플 스킬 벌크 등록 (10건)
curl -s -X POST "${API_URL}/skills/registry/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
  "skills": [
    {"skillId":"cost-model","name":"AI 비용 모델 분석","category":"analysis","tags":["ai-biz","cost"],"sourceType":"marketplace"},
    {"skillId":"feasibility-study","name":"실현 가능성 검토","category":"analysis","tags":["ai-biz","feasibility"],"sourceType":"marketplace"},
    {"skillId":"market-sizing","name":"시장 규모 추정","category":"analysis","tags":["pm-skills","market"],"sourceType":"marketplace"},
    {"skillId":"competitor-analysis","name":"경쟁사 분석","category":"analysis","tags":["pm-skills","competitor"],"sourceType":"marketplace"},
    {"skillId":"value-proposition","name":"가치 제안 설계","category":"bd-process","tags":["pm-skills","value"],"sourceType":"marketplace"},
    {"skillId":"bmc-canvas","name":"BMC 캔버스 작성","category":"bd-process","tags":["pm-skills","bmc"],"sourceType":"marketplace"},
    {"skillId":"risk-assessment","name":"리스크 평가","category":"validation","tags":["management","risk"],"sourceType":"marketplace"},
    {"skillId":"roi-calculator","name":"ROI 계산기","category":"analysis","tags":["ai-biz","roi"],"sourceType":"marketplace"},
    {"skillId":"pitch-deck","name":"피치 덱 생성","category":"generation","tags":["pm-skills","pitch"],"sourceType":"marketplace"},
    {"skillId":"tech-review","name":"기술 검토 스킬","category":"validation","tags":["ai-framework","review"],"sourceType":"marketplace"}
  ]
}'

# 2. 메트릭 시딩 (각 스킬에 3~5건 실행 기록)
for skill in cost-model feasibility-study market-sizing competitor-analysis value-proposition; do
  for i in 1 2 3; do
    DURATION=$((RANDOM % 5000 + 1000))
    curl -s -X POST "${API_URL}/skills/metrics/record" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${TOKEN}" \
      -d "{
        \"skillId\": \"${skill}\",
        \"status\": \"completed\",
        \"durationMs\": ${DURATION},
        \"model\": \"claude-sonnet-4-20250514\",
        \"inputTokens\": $((RANDOM % 2000 + 500)),
        \"outputTokens\": $((RANDOM % 3000 + 1000)),
        \"costUsd\": 0.$(printf '%02d' $((RANDOM % 10 + 1)))
      }" > /dev/null 2>&1
  done
done

echo "✅ Demo seed complete: 10 skills + ~15 execution records"
```

### 2.2 E2E 테스트

#### skill-catalog.spec.ts

```typescript
test("스킬 카탈로그 페이지 렌더링", async ({ authenticatedPage: page }) => {
  await page.goto("/ax-bd/skill-catalog");
  await expect(page.getByRole("heading", { name: /BD 스킬 카탈로그/i })).toBeVisible();
});

test("검색 입력 표시", async ({ authenticatedPage: page }) => {
  await page.goto("/ax-bd/skill-catalog");
  await expect(page.getByPlaceholder(/스킬 검색/i)).toBeVisible();
});

test("카테고리 필터 배지 표시", async ({ authenticatedPage: page }) => {
  await page.goto("/ax-bd/skill-catalog");
  await expect(page.getByText("전체")).toBeVisible();
});
```

#### skill-detail.spec.ts

```typescript
test("스킬 상세 페이지 렌더링", async ({ authenticatedPage: page }) => {
  await page.goto("/ax-bd/skill-catalog/cost-model");
  // enriched 데이터 또는 404/로딩 확인
  await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
});
```

## 3. 구현 순서 (autopilot용)

```
1. [F307-A] router.tsx에 skill-detail 라우트 추가
2. [F307-B] SkillMetricsCards 컴포넌트 생성
3. [F307-C] SkillLineageTree 컴포넌트 생성
4. [F307-D] SkillVersionHistory 컴포넌트 생성
5. [F307-E] SkillEnrichedView 통합 컴포넌트 생성
6. [F307-F] skill-detail.tsx 라우��� 페이지 생성
7. [F307-G] SkillCatalog 카드 클릭 → 상세 페이지 이동
8. [F308-A] skill-demo-seed.sh 데모 시딩 스크립트
9. [F308-B] skill-catalog.spec.ts E2E 테스트
10. [F308-C] skill-detail.spec.ts E2E 테스트
11. typecheck + lint + test + E2E 전체 통과 확인
```
