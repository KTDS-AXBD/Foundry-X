---
code: FX-DSGN-S235
title: "Sprint 235 Design — Discovery 동기화 파이프라인 (F481+F482)"
version: 1.0
status: Active
category: design
created: 2026-04-09
updated: 2026-04-09
author: Claude Opus 4.6
system-version: "0.1.0"
refs: ["[[FX-PLAN-S235]]"]
---

# Sprint 235 Design — Discovery 동기화 파이프라인

## 1. 개요

Sprint 235는 F478/F479(이미 구현 완료)를 검증하고, F481(평가결과서 HTML 스킬) + F482(bd_artifacts 자동 등록 API)를 신규 구현한다.

## 2. F478 STATUS_CONFIG 매핑 보완 — ✅ 구현 완료 확인

### 2-1. 현재 상태
- `business-plan-list.tsx:15-25`: STATUS_CONFIG에 classifying/classified/evaluating/evaluated 포함 ✅
- `discovery-detail.tsx:50-55`: STATUS_LABELS에 classifying/classified/evaluating/evaluated 포함 ✅

### 2-2. 검증 항목
| # | 검증 | 기대값 | 파일:라인 |
|---|------|--------|-----------|
| V1 | STATUS_CONFIG에 classifying 존재 | `{ label: "분류 중", color: "bg-blue-100..." }` | business-plan-list.tsx:17 |
| V2 | STATUS_CONFIG에 classified 존재 | `{ label: "분류 완료", color: "bg-indigo-100..." }` | business-plan-list.tsx:18 |
| V3 | STATUS_CONFIG에 evaluating 존재 | `{ label: "평가 중", color: "bg-blue-100..." }` | business-plan-list.tsx:21 |
| V4 | STATUS_CONFIG에 evaluated 존재 | `{ label: "평가 완료", color: "bg-purple-100..." }` | business-plan-list.tsx:22 |
| V5 | STATUS_LABELS에 동일 4종 존재 | 한국어 라벨 일치 | discovery-detail.tsx:50-55 |

## 3. F479 분석 완료 → pipeline 자동 전환 — ✅ 구현 완료 확인

### 3-1. 현재 상태
- `biz-items.ts:320-330`: evaluate 완료 시 discovery_stages 2-2 completed + pipeline REGISTERED→DISCOVERY 전환 ✅

### 3-2. 검증 항목
| # | 검증 | 기대값 | 파일:라인 |
|---|------|--------|-----------|
| V6 | evaluate 라우트에서 DiscoveryStageService.updateStage 호출 | `updateStage(id, orgId, "2-2", "completed")` | biz-items.ts:323 |
| V7 | evaluate 라우트에서 PipelineService.advanceStage 호출 | REGISTERED→DISCOVERY 전환 | biz-items.ts:329 |
| V8 | 전환 조건: currentStage === "REGISTERED" 확인 | 조건부 전환 (이미 DISCOVERY면 스킵) | biz-items.ts:327 |

## 4. F481 평가결과서 HTML 자동 생성 스킬

### 4-1. 목적
PRD-final.md를 파싱하여 `03_AX사업개발_발굴단계완료(안).html` 포맷의 평가결과서 HTML을 자동 생성하는 Claude Code 스킬 커맨드.

### 4-2. 산출물

#### 4-2-1. generate-evaluation-report.md (커맨드)
**경로**: `docs/specs/axbd-skill/CLAUDE_AXBD/.claude/commands/generate-evaluation-report.md`

**커맨드 구조**:
- 입력: PRD markdown 파일 경로 (또는 현재 아이템의 prd-final.md 자동 탐색)
- 출력: `outputs/{날짜}_{아이템명}/04_발굴단계완료_{아이템명}.html`
- 처리: PRD 섹션 파싱 → 9탭 매핑 → HTML 템플릿 렌더링

**PRD → 9탭 매핑 규칙**:
| 탭 | PRD 섹션 키워드 | 추출 대상 |
|----|----------------|-----------|
| 2-1 레퍼런스 | Pain Points, 솔루션 개요, 기술 비교, 레퍼런스 | 경쟁사 분석, 3-Layer Deconstruction |
| 2-2 수요 시장 | TAM, SAM, SOM, 시장 규모, 성장률, Why Now | 시장 규모 표, 성장 차트 데이터 |
| 2-3 경쟁·자사 | 경쟁 환경, SWOT, 비대칭 우위, Porter, 해자 | SWOT 그리드, 경쟁 비교 테이블 |
| 2-4 아이템 도출 | 솔루션, 기능 백로그, 엘리베이터 피치, Value Chain | 솔루션 카드, 기능 목록 |
| 2-5 아이템 선정 | 성공 기준, 리스크, Commit Gate, 우선순위 | 스코어링 표, 리스크 매트릭스 |
| 2-6 타겟 고객 | 페르소나, 사용자 스토리, JTBD, 고객 여정 | 페르소나 카드, 여정 맵 |
| 2-7 비즈니스 모델 | BMC, 투자, 매출, 수익성, 원가, Unit Economics | BMC 그리드, 재무 표 |
| 2-8 패키징 | 실행 계획, GTM, Discovery Summary, 로드맵 | Executive Summary, 타임라인 |
| 2-9 멀티 페르소나 | AI 평가, 페르소나 점수, 8인 평가 | 레이더 차트, 평가 카드 |

**커맨드 실행 흐름**:
1. PRD 파일 읽기 (경로 인자 또는 `outputs/` 하위 자동 탐색)
2. 마크다운 섹션별 파싱 (## 헤딩 기준)
3. 매핑 규칙에 따라 9탭 데이터 구조체 생성
4. HTML 템플릿에 데이터 삽입 (참조: `references/03_AX사업개발_발굴단계완료(안).html`)
5. 파일 저장 + 완료 메시지

#### 4-2-2. evaluation-report-template.html (CSS 템플릿)
**경로**: `docs/specs/axbd-skill/CLAUDE_AXBD/references/evaluation-report-template.html`

기존 `03_AX사업개발_발굴단계완료(안).html`의 CSS/JS 구조를 기반으로 하되, **데이터 플레이스홀더**를 포함하는 범용 템플릿.

**구조**:
```
<!DOCTYPE html>
<html lang="ko">
<head>
  - Pretendard Variable 폰트
  - Chart.js CDN
  - CSS (기존 03_ 파일과 동일한 디자인 시스템)
</head>
<body>
  <div class="wrap">
    <header> — 아이템명, 유형, 날짜 플레이스홀더 </header>
    <nav class="tab-bar"> — 9탭 버튼 </nav>
    <div class="tab-panel" id="tab1"> — 2-1 레퍼런스 </div>
    ...
    <div class="tab-panel" id="tab9"> — 2-9 멀티 페르소나 </div>
  </div>
  <script> — 탭 전환 JS + Chart.js 렌더링 </script>
</body>
</html>
```

**디자인 토큰** (기존 `03_` 파일에서 추출):
- `--bg:#f7f8fa`, `--card:#fff`, `--border:#e5e8eb`
- 색상: mint, blue, amber, red, purple (5색)
- 폰트: Pretendard Variable
- 컴포넌트: `.card`, `.metric`, `.insight-box`, `.swot-grid`, `.bmc-grid`, `.persona-card`

### 4-3. 검증 항목
| # | 검증 | 기대값 |
|---|------|--------|
| D1 | generate-evaluation-report.md 존재 | CLAUDE_AXBD/.claude/commands/ 하위 |
| D2 | 커맨드에 PRD 파싱 지침 포함 | ## 헤딩 기반 섹션 추출 로직 명시 |
| D3 | 커맨드에 9탭 매핑 규칙 포함 | 2-1~2-9 매핑 테이블 |
| D4 | evaluation-report-template.html 존재 | references/ 하위 |
| D5 | 템플릿에 9탭 tab-panel 구조 포함 | tab1~tab9 ID |
| D6 | 템플릿에 Pretendard 폰트 + Chart.js CDN | link + script 태그 |
| D7 | 템플릿에 기존 03_ 파일과 동일한 CSS 변수 | --bg, --card, --border 등 |
| D8 | 커맨드에 출력 경로 지정 | `outputs/{날짜}_{아이템명}/04_발굴단계완료_{아이템명}.html` |

## 5. F482 bd_artifacts 자동 등록 파이프라인

### 5-1. API 설계

#### POST /biz-items/:id/sync-artifacts

**Request**:
```typescript
// Zod 스키마: syncArtifactsSchema
{
  stages: Array<{
    stage: string;     // "2-1" ~ "2-10"
    outputText: string; // 분석 결과 텍스트
    skillId: string;    // 사용된 스킬 ID
  }>;
  source: string;       // "claude-skill" | "manual"
}
```

**Response (200)**:
```typescript
{
  synced: number;           // 동기화된 artifact 수
  stagesUpdated: number;    // 갱신된 discovery_stages 수
  statusChanged: boolean;   // biz_items.status 변경 여부
  artifacts: Array<{
    id: string;
    stageId: string;
    skillId: string;
    version: number;
  }>;
}
```

**에러 응답**:
- 400: 스키마 검증 실패
- 404: biz_item 미존재
- 500: DB 에러

### 5-2. artifact-sync-service.ts

**경로**: `packages/api/src/core/discovery/services/artifact-sync-service.ts`

**클래스**: `ArtifactSyncService`

```typescript
class ArtifactSyncService {
  constructor(private db: D1Database) {}

  async syncFromSkill(
    bizItemId: string,
    orgId: string,
    userId: string,
    stages: Array<{ stage: string; outputText: string; skillId: string }>,
    source: string
  ): Promise<SyncResult>
}
```

**로직**:
1. 각 stage에 대해:
   - `BdArtifactService.getNextVersion(bizItemId, skillId)` → 버전 자동 증가
   - `BdArtifactService.create()` → artifact 생성 (status: pending)
   - `BdArtifactService.updateStatus(id, "completed", { outputText })` → 완료 처리
   - `DiscoveryStageService.updateStage(bizItemId, orgId, stage, "completed")` → 단계 완료
2. 전체 완료 후:
   - 2-8 이상 단계가 completed면 `BizItemService.updateStatus(bizItemId, "evaluated")` 호출
3. 결과 반환

### 5-3. artifact-sync.ts (Zod 스키마)

**경로**: `packages/api/src/core/discovery/schemas/artifact-sync.ts`

```typescript
export const syncArtifactStageSchema = z.object({
  stage: z.string().regex(/^2-(?:10|[0-9])$/),
  outputText: z.string().min(1).max(50000),
  skillId: z.string().min(1).max(100),
});

export const syncArtifactsSchema = z.object({
  stages: z.array(syncArtifactStageSchema).min(1).max(11),
  source: z.enum(["claude-skill", "manual"]).default("claude-skill"),
});
```

### 5-4. skill-execution.md 수정

**수정 위치**: `CLAUDE_AXBD/.claude/rules/skill-execution.md` 끝에 섹션 추가

**추가 내용**:
```markdown
## Foundry-X 자동 동기화

각 단계(2-1~2-10) 분석 완료 시, Foundry-X API를 호출하여 결과를 자동 등록한다.

### API 호출 방법
POST {FOUNDRY_X_API_URL}/api/ax-bd/biz-items/{bizItemId}/sync-artifacts

### 요청 형식
{
  "stages": [
    { "stage": "2-1", "outputText": "분석 결과...", "skillId": "competitor-analysis" }
  ],
  "source": "claude-skill"
}

### 호출 시점
- 각 단계 분석 완료 후 즉시 (개별 단계별 호출)
- 또는 여러 단계를 한꺼번에 배치 호출 가능
```

### 5-5. 검증 항목
| # | 검증 | 기대값 |
|---|------|--------|
| D9 | sync-artifacts 라우트 존재 | `POST /biz-items/:id/sync-artifacts` |
| D10 | 스키마 검증 (stages.stage 형식) | `2-0` ~ `2-10` regex |
| D11 | 스키마 검증 (source enum) | "claude-skill" or "manual" |
| D12 | artifact 생성 (version 자동 증가) | getNextVersion + create |
| D13 | artifact 상태 completed 갱신 | updateStatus("completed", { outputText }) |
| D14 | discovery_stages completed 갱신 | DiscoveryStageService.updateStage |
| D15 | 2-8 이상 완료 시 status → evaluated | 조건부 biz_items.status 전환 |
| D16 | artifact-sync-service.ts 존재 | core/discovery/services/ 하위 |
| D17 | artifact-sync.ts 스키마 존재 | core/discovery/schemas/ 하위 |
| D18 | skill-execution.md에 API 호출 지침 추가 | "Foundry-X 자동 동기화" 섹션 |
| D19 | 라우트에서 Zod 스키마 검증 | syncArtifactsSchema.safeParse |
| D20 | 응답에 synced 카운트 포함 | { synced, stagesUpdated, statusChanged, artifacts } |
| D21 | biz_item 미존재 시 404 | item 조회 후 null 체크 |

## 6. 테스트 설계

### 6-1. F482 통합 테스트 (Vitest)

**파일**: `packages/api/src/__tests__/biz-items-sync-artifacts.test.ts` (기존 테스트 패턴 준수 — route + service 통합)

| # | 테스트 | 기대 |
|---|--------|------|
| T1 | sync-artifacts 정상 요청 (stage 1개) | 200 + artifact 생성 + stage completed |
| T2 | sync-artifacts 정상 요청 (stage 3개) | 200 + artifact 3개 + stages 3개 completed |
| T3 | 잘못된 stage 형식 ("3-1") | 400 에러 |
| T4 | 빈 stages 배열 | 400 에러 |
| T5 | 존재하지 않는 biz_item | 404 에러 |
| T6 | 중복 호출 시 version 증가 | version 1 → version 2 |
| T7 | 단일 stage 동기화 — synced/stagesUpdated 카운트 | T1과 통합 (route E2E로 service 로직 커버) |
| T8 | 여러 stage 동기화 — 카운트 일치 | T2와 통합 |
| T9 | 2-8 포함 시 status → evaluated 전환 | statusChanged: true |
| T10 | 2-7까지만 시 status 미전환 | statusChanged: false |

## 7. 파일 목록 총정리

| # | 파일 | 동작 | F-item |
|---|------|------|--------|
| 1 | `docs/specs/axbd-skill/CLAUDE_AXBD/.claude/commands/generate-evaluation-report.md` | 신규 | F481 |
| 2 | `docs/specs/axbd-skill/CLAUDE_AXBD/references/evaluation-report-template.html` | 신규 | F481 |
| 3 | `packages/api/src/core/discovery/routes/biz-items.ts` | 수정 | F482 |
| 4 | `packages/api/src/core/discovery/services/artifact-sync-service.ts` | 신규 | F482 |
| 5 | `packages/api/src/core/discovery/schemas/artifact-sync.ts` | 신규 | F482 |
| 6 | `docs/specs/axbd-skill/CLAUDE_AXBD/.claude/rules/skill-execution.md` | 수정 | F482 |
| 7 | `packages/api/src/__tests__/biz-items-sync-artifacts.test.ts` | 신규 | F482 |
| 8 | `packages/api/src/__tests__/helpers/mock-d1.ts` | 수정 (biz_item_classifications 테이블 추가) | F482 |
