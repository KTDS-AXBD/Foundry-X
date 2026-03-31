---
code: FX-DSGN-S93
title: "Sprint 93 — GIVC PoC 2차 (이벤트 연쇄 시나리오 MVP) + 추가 BD 아이템 탐색"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S93]], [[FX-DSGN-S92]], [[FX-SPEC-001]]"
---

# Sprint 93 Design: GIVC PoC 2차 — 이벤트 연쇄 시나리오 MVP

## $1 개요

Sprint 92의 KG 인프라(노드/엣지 CRUD + BFS 영향 전파) 위에 **복수 이벤트 동시 시뮬레이션** 레이어를 추가한다.
핵심: 여러 글로벌 이벤트(중동분쟁, 일본규제 등)가 동시에 발생했을 때 공급 체인을 따라 전파되는 영향을 합산하고, 복수 이벤트가 교차하는 **핫스팟 노드**를 식별하는 시나리오 시뮬레이션 엔진.

## $2 API 서비스 설계

### 2.1 KgScenarioService (`services/kg-scenario.ts`)

기존 `KgQueryService.propagateImpact()`를 재활용하여 복수 이벤트 시뮬레이션을 구현한다.

```typescript
export interface ScenarioPreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  eventNodeIds: string[];
  category: "petrochemical" | "semiconductor" | "compound";
}

export interface ScenarioInput {
  eventNodeIds: string[];       // 시뮬레이션할 이벤트 노드 ID 목록
  decayFactor?: number;          // 감쇠 계수 (default 0.7)
  threshold?: number;            // 임계값 (default 0.1)
  maxDepth?: number;             // 최대 탐색 깊이 (default 5)
}

export interface HotspotNode {
  id: string;
  type: KgNodeType;
  name: string;
  nameEn?: string;
  combinedScore: number;         // 합산 영향도 (cap 1.0)
  impactLevel: ImpactLevel;
  eventContributions: Array<{
    eventId: string;
    eventName: string;
    score: number;
  }>;
  eventCount: number;            // 영향받는 이벤트 수
  isHotspot: boolean;            // eventCount >= 2
}

export interface ScenarioResult {
  events: Array<{ id: string; name: string; nameEn?: string }>;
  affectedNodes: HotspotNode[];
  hotspots: HotspotNode[];       // isHotspot === true 인 노드만
  totalAffected: number;
  hotspotCount: number;
  byLevel: { high: number; medium: number; low: number };
}
```

**알고리즘:**
1. 각 이벤트 노드에 대해 `KgQueryService.propagateImpact()` 독립 실행
2. 이벤트의 AFFECTED_BY 엣지 대상 노드를 시작점으로 영향 전파 (이벤트 자체는 SUPPLIES 관계가 없으므로, AFFECTED_BY로 연결된 첫 번째 품목들에서 SUPPLIES 체인으로 전파)
3. 결과를 노드 ID 기준으로 병합:
   - 같은 노드에 여러 이벤트 영향 → `combinedScore = min(1.0, sum(scores))`
   - `eventCount >= 2` → `isHotspot = true`
4. combinedScore 기준 impactLevel 재산출

| 메서드 | 설명 |
|--------|------|
| `simulateScenario(input, orgId)` | 복수 이벤트 동시 시뮬레이션 |
| `getPresets()` | 프리셋 시나리오 3개 반환 |
| `getPresetById(id)` | 프리셋 상세 |

### 2.2 프리셋 시나리오 (하드코딩)

| ID | 이름 | 이벤트 | 카테고리 |
|----|------|--------|---------|
| `preset-petrochem-crisis` | 석유화학 위기 | 중동분쟁 + EU CBAM | petrochemical |
| `preset-semi-shortage` | 반도체 공급난 | 일본수출규제 + 대만지진 | semiconductor |
| `preset-compound-crisis` | 복합 위기 | 중동분쟁 + 일본수출규제 + 미중반도체규제 | compound |

## $3 API 라우트 확장

`routes/ax-bd-kg.ts`에 시나리오 엔드포인트 추가:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/ax-bd/kg/scenario/simulate` | 시나리오 시뮬레이션 실행 |
| GET | `/ax-bd/kg/scenario/presets` | 프리셋 시나리오 목록 |
| GET | `/ax-bd/kg/scenario/presets/:id` | 프리셋 상세 |

### simulate 요청 바디
```json
{
  "eventNodeIds": ["e-mideast", "e-japan-export"],
  "decayFactor": 0.7,
  "threshold": 0.1,
  "maxDepth": 5
}
```

## $4 Zod 스키마 추가

`schemas/kg-ontology.schema.ts`에 추가:

```typescript
export const scenarioSimulateSchema = z.object({
  eventNodeIds: z.array(z.string().min(1)).min(1).max(5),
  decayFactor: z.number().min(0.1).max(1.0).default(0.7),
  threshold: z.number().min(0).max(1).default(0.1),
  maxDepth: z.number().int().min(1).max(10).default(5),
});
```

## $5 Web UI 설계

### 5.1 ontology.tsx 탭 구조

기존 단일 뷰에서 2탭 구조로 전환:
- **탭 1: 노드 탐색기** (기존 UI 그대로)
- **탭 2: 시나리오 시뮬레이션** (신규)

### 5.2 KgScenarioPanel 컴포넌트

```
packages/web/src/components/feature/kg/KgScenarioPanel.tsx
```

**레이아웃:**
1. **프리셋 카드 3개**: 석유화학 위기 / 반도체 공급난 / 복합 위기
   - 카드 클릭 → 해당 프리셋 자동 시뮬레이션
   - 카테고리별 아이콘 + 색상 (석유화학=amber, 반도체=blue, 복합=red)
2. **결과 영역**:
   - 요약 바: 전체 영향 노드 수, 핫스팟 수, HIGH/MEDIUM/LOW 분포
   - 핫스팟 섹션 (isHotspot=true 노드만, 빨간 강조)
   - 전체 영향 노드 리스트 (기여 이벤트별 분해 표시)

### 5.3 API Client 확장

`lib/api-client.ts`에 추가:
```typescript
export function getScenarioPresets(): Promise<ScenarioPreset[]>
export function simulateScenario(input: ScenarioInput): Promise<ScenarioResult>
```

## $6 테스트 설계

### API 테스트 (`__tests__/kg-scenario.test.ts`, ~15개)

| 그룹 | 테스트 | 수 |
|------|--------|---|
| getPresets | 3개 프리셋 반환 | 1 |
| getPresetById | 존재하는 ID / 없는 ID | 2 |
| simulateScenario | 단일 이벤트 전파 | 1 |
| | 복수 이벤트 병합 | 1 |
| | 핫스팟 식별 (2개 이벤트 교차) | 1 |
| | combinedScore cap 1.0 | 1 |
| | eventContributions 분해 | 1 |
| | decayFactor/threshold 옵션 | 2 |
| | 빈 이벤트 목록 에러 | 1 |
| | 존재하지 않는 이벤트 ID | 1 |
| Route 통합 | POST simulate 정상 | 1 |
| | GET presets | 1 |
| | GET presets/:id 404 | 1 |

### Web 테스트 (`__tests__/KgScenarioPanel.test.tsx`, ~8개)

| 테스트 | 내용 |
|--------|------|
| renders preset cards | 3개 프리셋 카드 표시 |
| clicking preset triggers simulation | 프리셋 클릭 시 API 호출 |
| shows loading state | 로딩 스피너 표시 |
| shows simulation result | 결과 리스트 렌더링 |
| highlights hotspots | 핫스팟 노드 빨간 강조 |
| shows event contributions | 이벤트별 기여도 표시 |
| shows summary bar | HIGH/MEDIUM/LOW 카운트 |
| empty state | 결과 없을 때 메시지 |

## $7 구현 순서

| 순서 | 작업 | 의존성 |
|------|------|--------|
| 1 | API: `kg-scenario.ts` 서비스 | kg-query.ts (기존) |
| 2 | API: `kg-ontology.schema.ts` 시나리오 스키마 추가 | 없음 |
| 3 | API: `ax-bd-kg.ts` 시나리오 라우트 추가 | 1, 2 |
| 4 | API: `kg-scenario.test.ts` 테스트 | 1, 3 |
| 5 | Web: `api-client.ts` 시나리오 API 함수 추가 | 3 |
| 6 | Web: `KgScenarioPanel.tsx` 컴포넌트 | 5 |
| 7 | Web: `ontology.tsx` 탭 구조 전환 | 6 |
| 8 | Web: `KgScenarioPanel.test.tsx` 테스트 | 6 |

## $8 Worker 파일 매핑

단일 구현 (파일 간 의존성이 높음):

| 파일 그룹 | 예상 파일 수 | 설명 |
|----------|-----------|------|
| API Service | 1 | kg-scenario.ts |
| API Schema | 1 (수정) | kg-ontology.schema.ts |
| API Route | 1 (수정) | ax-bd-kg.ts |
| API Test | 1 | kg-scenario.test.ts |
| Web Component | 1 | KgScenarioPanel.tsx |
| Web Page | 1 (수정) | ontology.tsx |
| Web API Client | 1 (수정) | api-client.ts |
| Web Test | 1 | KgScenarioPanel.test.tsx |
| **합계** | **8** (4 신규 + 4 수정) | |
