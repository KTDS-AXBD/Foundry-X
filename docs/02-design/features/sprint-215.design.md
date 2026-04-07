---
code: FX-DSGN-215
title: Sprint 215 Design — 사업기획서 편집기 + 템플릿 다양화
version: 1.0
status: Draft
category: DSGN
system-version: Sprint 215
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# Sprint 215 Design — 사업기획서 편집기 + 템플릿 다양화

## 1. 범위

- **F444**: 사업기획서 섹션별 인라인 편집 + AI 재생성 버튼 + 버전 이력 diff UI
- **F445**: 기획서 생성 시 템플릿 3종 선택 + 톤/분량 파라미터

## 2. 데이터 모델

### 2.1 신규 마이그레이션: `0117_bp_editor.sql`

```sql
-- 사업기획서 섹션별 편집 추적 (F444)
CREATE TABLE IF NOT EXISTS business_plan_sections (
  id           TEXT PRIMARY KEY,
  draft_id     TEXT NOT NULL,           -- business_plan_drafts.id 참조
  biz_item_id  TEXT NOT NULL,
  section_num  INTEGER NOT NULL,        -- 1~10 (BP_SECTIONS 순번)
  content      TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (draft_id) REFERENCES business_plan_drafts(id) ON DELETE CASCADE
);
CREATE INDEX idx_bp_sections_draft ON business_plan_sections(draft_id);
CREATE INDEX idx_bp_sections_item  ON business_plan_sections(biz_item_id);

-- 기획서 템플릿 (F445 — 사용자 정의 템플릿 저장용)
CREATE TABLE IF NOT EXISTS plan_templates (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  name          TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK(template_type IN ('internal','proposal','ir-pitch','custom')),
  tone          TEXT NOT NULL DEFAULT 'formal' CHECK(tone IN ('formal','casual')),
  length        TEXT NOT NULL DEFAULT 'medium' CHECK(length IN ('short','medium','long')),
  sections_json TEXT NOT NULL DEFAULT '[]',  -- 커스텀 섹션 구성 (JSON)
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_plan_templates_org ON plan_templates(org_id);
```

### 2.2 기존 테이블 활용

| 테이블 | 역할 |
|--------|------|
| `business_plan_drafts` | 기획서 버전별 전체 마크다운 저장 (불변) |
| `business_plan_sections` | 편집 중인 섹션별 내용 추적 (신규) |
| `plan_templates` | 사용자 정의 템플릿 저장 (신규, 기본 3종은 코드에 정의) |

## 3. API 설계

### 3.1 신규 엔드포인트 (F444)

| Method | Path | 역할 |
|--------|------|------|
| `GET` | `/api/biz-items/:id/business-plan` | 최신 기획서 조회 (기존) |
| `GET` | `/api/biz-items/:id/business-plan/versions` | 버전 목록 조회 (기존) |
| `GET` | `/api/biz-items/:id/business-plan/sections` | 현재 섹션별 내용 조회 |
| `PATCH` | `/api/biz-items/:id/business-plan/sections/:num` | 섹션 내용 업데이트 (편집) |
| `POST` | `/api/biz-items/:id/business-plan/sections/:num/regenerate` | AI로 섹션 재생성 |
| `POST` | `/api/biz-items/:id/business-plan/save` | 편집 결과를 새 버전으로 저장 |
| `GET` | `/api/biz-items/:id/business-plan/diff` | `?v1=N&v2=M` 두 버전 diff |

### 3.2 기존 엔드포인트 확장 (F445)

| Method | Path | 변경 |
|--------|------|------|
| `POST` | `/api/biz-items/:id/generate-business-plan` | `templateType`, `tone`, `length` 파라미터 추가 |

### 3.3 Zod 스키마 (`business-plan.schema.ts`)

```typescript
export const UpdateSectionSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const RegenerateSectionSchema = z.object({
  customPrompt: z.string().max(500).optional(),
});

export const SaveDraftSchema = z.object({
  // 섹션 변경사항 없이 "현재 섹션 내용으로 저장" 신호
  note: z.string().max(200).optional(),
});

export const GenerateBusinessPlanSchema = z.object({
  templateType: z.enum(['internal', 'proposal', 'ir-pitch']).default('internal'),
  tone: z.enum(['formal', 'casual']).default('formal'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
});
```

### 3.4 응답 타입

```typescript
// GET /business-plan/sections
interface SectionsResponse {
  draftId: string;
  sections: Array<{
    num: number;
    title: string;
    content: string;
    updatedAt: string | null;
  }>;
}

// GET /business-plan/diff?v1=1&v2=2
interface DiffResponse {
  v1: { version: number; generatedAt: string };
  v2: { version: number; generatedAt: string };
  sections: Array<{
    num: number;
    title: string;
    v1Content: string;
    v2Content: string;
    changed: boolean;
  }>;
}
```

## 4. 서비스 레이어

### 4.1 `BusinessPlanEditorService` (신규)

**파일**: `packages/api/src/core/offering/services/business-plan-editor-service.ts`

```typescript
export class BusinessPlanEditorService {
  constructor(private db: D1Database, private runner?: AgentRunner) {}

  // 섹션 목록 가져오기 (없으면 최신 draft에서 파싱)
  async getSections(bizItemId: string): Promise<Section[]>

  // 섹션 내용 업데이트 (DB에 저장)
  async updateSection(bizItemId: string, draftId: string, sectionNum: number, content: string): Promise<Section>

  // AI로 섹션 재생성
  async regenerateSection(bizItemId: string, sectionNum: number, customPrompt?: string): Promise<string>

  // 현재 섹션들을 조합해 새 버전으로 저장
  async saveDraft(bizItemId: string, note?: string): Promise<BusinessPlanDraft>

  // 두 버전 diff
  async diffVersions(bizItemId: string, v1: number, v2: number): Promise<DiffResponse>
}
```

**섹션 파싱 로직**: `business_plan_drafts.content` (마크다운)를 `## ` 헤더로 분리하여 섹션 추출. `BP_SECTIONS` 배열의 `section_num`과 매핑.

### 4.2 `business-plan-template.ts` 확장 (F445)

```typescript
// 기존 BP_SECTIONS는 'internal' 템플릿의 기본값
export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
  'internal': {
    name: '내부보고',
    sections: [1, 2, 3, 4, 5, 7, 9],   // 7섹션 (요약 중심)
    maxLength: 'short',
    focus: '핵심 지표 + 실행 가능성',
  },
  'proposal': {
    name: '제안서',
    sections: [1, 2, 3, 4, 5, 6, 7, 8], // 8섹션 (고객 관점)
    maxLength: 'medium',
    focus: '문제→해결→효과 구조',
  },
  'ir-pitch': {
    name: 'IR피치',
    sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // 10섹션 전체
    maxLength: 'long',
    focus: '시장→제품→비즈모델→팀 스토리',
  },
};

export type TemplateType = 'internal' | 'proposal' | 'ir-pitch';

export function getTemplateSections(templateType: TemplateType): typeof BP_SECTIONS[number][]
export function buildGenerationPrompt(templateType: TemplateType, tone: 'formal'|'casual', length: 'short'|'medium'|'long'): string
```

### 4.3 `BusinessPlanGeneratorService` 확장 (F445)

`generate()` 메서드에 파라미터 추가:
```typescript
async generate(input: BpGenerationInput & {
  templateType?: TemplateType;
  tone?: 'formal' | 'casual';
  length?: 'short' | 'medium' | 'long';
}): Promise<BusinessPlanDraft>
```

## 5. Worker 파일 매핑

| Worker | 담당 파일 |
|--------|----------|
| **Worker A (API)** | `0117_bp_editor.sql`, `business-plan.schema.ts`, `business-plan-editor-service.ts`, `business-plan.ts` (route), `biz-items.ts` (F445 파라미터), `business-plan-template.ts` (F445 템플릿), `business-plan-generator.ts` (F445 파라미터), 테스트 2파일 |
| **Worker B (Web)** | `SectionEditor.tsx`, `BusinessPlanEditor.tsx`, `VersionHistoryPanel.tsx`, `TemplateSelector.tsx`, `discovery-detail.tsx`, `api-client.ts` |

## 6. 프론트엔드 컴포넌트

### 6.1 `BusinessPlanEditor.tsx` (F444)

```
BusinessPlanEditor
  props: { bizItemId, plan: BdpVersion, onSaved: (newPlan) => void }
  state: { sections[], isDirty, isSaving, activeSection }
  
  render:
    ┌── 헤더: "편집 모드" 배지 + [저장] [취소] 버튼
    ├── SectionEditor[] (10개 또는 템플릿별 섹션 수)
    │     props: { sectionNum, title, content, onChange, onRegenerate }
    └── 저장 시: POST /business-plan/save → onSaved(newPlan) 호출
```

### 6.2 `SectionEditor.tsx`

```
SectionEditor
  props: { sectionNum, title, content, onChange, onRegenerate, isRegenerating }
  
  render:
    ┌── 섹션 헤더 (제목 + 번호 배지)
    ├── <textarea> — 내용 편집 (onChange로 parent state 갱신)
    └── [AI 재생성] 버튼 (isRegenerating 시 스피너)
```

### 6.3 `VersionHistoryPanel.tsx`

```
VersionHistoryPanel
  props: { bizItemId, currentVersion }
  state: { versions[], selectedV1, selectedV2, diff }
  
  render:
    ├── 버전 목록 (최신 5개)
    └── diff 선택 시: DiffViewer (섹션별 변경 전/후 비교)
        - changed 섹션은 강조 표시
        - 변경 없는 섹션은 접기
```

### 6.4 `TemplateSelector.tsx` (F445)

```
TemplateSelector
  props: { onSelect: (params) => void, onCancel: () => void }
  state: { selectedTemplate, tone, length }
  
  render:
    ├── 템플릿 3종 카드 선택
    │     [내부보고] [제안서] [IR피치]
    ├── 톤 선택: [공식] / [친근]
    ├── 분량: [짧게] / [보통] / [길게]
    └── [생성 시작] 버튼
```

### 6.5 `discovery-detail.tsx` 변경

```
기존:
  [사업기획서 생성] 버튼 → handleGenerateBusinessPlan() → POST /generate-business-plan
  <BusinessPlanViewer plan={plan} />

변경:
  [사업기획서 생성] 버튼 → setShowTemplateSelector(true)
  {showTemplateSelector && <TemplateSelector onSelect={handleGenerateWithTemplate} />}
  
  {plan && !editMode && (
    <>
      <BusinessPlanViewer plan={plan} />
      [편집] 버튼 → setEditMode(true)
      [버전 이력] 버튼 → setShowVersionPanel(true)
    </>
  )}
  {plan && editMode && (
    <BusinessPlanEditor bizItemId={id} plan={plan} onSaved={handleSaved} />
  )}
  {showVersionPanel && (
    <VersionHistoryPanel bizItemId={id} currentVersion={plan.versionNum} />
  )}
```

## 7. API Client 추가 메서드 (`api-client.ts`)

```typescript
// F444
export async function fetchBusinessPlanSections(bizItemId: string): Promise<SectionsResponse>
export async function updateBusinessPlanSection(bizItemId: string, sectionNum: number, content: string): Promise<void>
export async function regenerateBusinessPlanSection(bizItemId: string, sectionNum: number, customPrompt?: string): Promise<{ content: string }>
export async function saveBusinessPlanDraft(bizItemId: string, note?: string): Promise<BusinessPlanResult>
export async function fetchBusinessPlanDiff(bizItemId: string, v1: number, v2: number): Promise<DiffResponse>
export async function fetchBusinessPlanVersions(bizItemId: string): Promise<Array<{ version: number; generatedAt: string }>>

// F445 — 기존 generateBusinessPlan 교체
export async function generateBusinessPlan(
  bizItemId: string,
  params?: { templateType?: 'internal'|'proposal'|'ir-pitch'; tone?: 'formal'|'casual'; length?: 'short'|'medium'|'long' }
): Promise<BusinessPlanResult>
```

## 8. 테스트 설계

### 8.1 `business-plan-editor.test.ts`

| 테스트 | 검증 항목 |
|--------|----------|
| `getSections — draft에서 섹션 파싱` | 10섹션 추출, section_num 매핑 |
| `updateSection — DB 저장` | PATCH 후 content 갱신 확인 |
| `regenerateSection — LLM 없이 fallback` | skipLlmRefine=true 시 기존 content 반환 |
| `saveDraft — 새 버전 생성` | version+1, sections 조합 정확성 |
| `diffVersions — 변경 섹션 감지` | changed=true/false 정확도 |
| `GET /sections API` | 200 + 섹션 배열 반환 |
| `PATCH /sections/:num API` | 200 + 업데이트된 섹션 반환 |
| `POST /sections/:num/regenerate API` | 200 + content 반환 |
| `POST /save API` | 201 + 신규 버전 반환 |
| `GET /diff?v1=1&v2=2 API` | 200 + diff 구조 반환 |

### 8.2 `business-plan-template-types.test.ts`

| 테스트 | 검증 항목 |
|--------|----------|
| `internal 템플릿 — 7섹션 구성` | sections.length === 7 |
| `proposal 템플릿 — 8섹션 구성` | sections.length === 8 |
| `ir-pitch 템플릿 — 10섹션 전체` | sections.length === 10 |
| `getTemplateSections — 잘못된 타입` | 기본값(internal) 반환 |
| `buildGenerationPrompt — 톤 반영` | formal/casual 키워드 포함 여부 |
| `generate() with templateType` | 생성된 draft에 templateType 저장 |

## 9. 검증 기준 (Gap Analysis 대상)

| # | 항목 | 검증 방법 |
|---|------|----------|
| G1 | D1 마이그레이션 0117 적용 | `business_plan_sections` + `plan_templates` 테이블 존재 |
| G2 | GET /sections API | `bizItemId`로 섹션 목록 반환 |
| G3 | PATCH /sections/:num API | 섹션 내용 업데이트 저장 |
| G4 | POST /sections/:num/regenerate API | AI(또는 fallback) 재생성 응답 |
| G5 | POST /save API | 새 버전 생성 (`version` 증가) |
| G6 | GET /diff API | 두 버전 섹션별 diff 반환 |
| G7 | `BusinessPlanEditor` 컴포넌트 | `BusinessPlanViewer` 대신 편집 가능한 UI |
| G8 | `SectionEditor` 섹션별 textarea | 10개 (또는 템플릿별) 편집 필드 |
| G9 | AI 재생성 버튼 | 섹션별 "AI 재생성" 버튼 + 로딩 상태 |
| G10 | `VersionHistoryPanel` | 버전 목록 + diff 표시 |
| G11 | `TemplateSelector` 모달 | 3종 카드 + 톤/분량 선택 |
| G12 | `generateBusinessPlan` 파라미터 확장 | templateType/tone/length 전달 |
| G13 | `discovery-detail.tsx` 통합 | 편집 모드 전환 + 템플릿 선택 연결 |
| G14 | 테스트 all pass | `turbo test` 신규 테스트 14개 이상 |
