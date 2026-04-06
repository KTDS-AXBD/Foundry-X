---
code: FX-DSGN-018
title: "Phase 18: Offering Pipeline Design"
version: 1.0
status: Active
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
feature: offering-pipeline
plan: "[[FX-PLAN-018]]"
---

## 1. 설계 개요

Phase 18 Offering Pipeline의 전체 구현 설계.
기존 16 Agent + 16 Skill + EventBus + O-G-D Loop 인프라를 재활용하며, 신규 생성을 최소화한다.

### 1.1 설계 원칙
1. **기존 패턴 준수** — API routes/services/schemas 3계층, Web routes/components/hooks 분리
2. **기존 Agent 확장** — shaping-orchestrator 확장, 신규 Agent 최소
3. **점진적 디자인 토큰** — MD(P1) → JSON(P2) → Web Editor(P3)

### 1.2 변경 영역 개요

```
.claude/
├── skills/ax-bd/shape/          # 🆕 3 skills (offering-html, offering-pptx, prototype-builder)
│   ├── INDEX.md
│   ├── offering-html/SKILL.md + templates/ + examples/
│   ├── offering-pptx/SKILL.md
│   └── prototype-builder/SKILL.md
├── agents/
│   └── ax-bd-offering-agent.md  # 🆕 (shaping-orchestrator 확장)

packages/api/src/
├── db/migrations/               # 🆕 4 migrations (0110~0113)
├── routes/                      # 🆕 offerings.ts, offering-sections.ts, offering-tokens.ts
├── services/                    # 🆕 offerings.ts, offering-sections.ts, offering-export.ts,
│                                #     offering-validate.ts, offering-tokens.ts, content-adapter.ts
├── schemas/                     # 🆕 offerings.ts, offering-sections.ts, offering-tokens.ts

packages/web/src/
├── routes/(app)/offerings/      # 🆕 index.tsx, new.tsx, [id].tsx, [id]/validate.tsx
├── components/offerings/        # 🆕 OfferingList, OfferingWizard, SectionEditor,
│                                #     HtmlPreview, ValidationDashboard, TokenEditor
├── hooks/                       # 🆕 useOfferings, useOfferingSections, useDesignTokens
├── lib/stores/                  # 🆕 offeringStore.ts (Zustand)
```

---

## 2. Skill 설계 (F363~F367)

### 2.1 디렉토리 구조

```
.claude/skills/ax-bd/shape/
├── INDEX.md                          # Stage 오케스트레이터 + I/O 스키마
├── offering-html/
│   ├── SKILL.md                      # 사업기획서 Skill v0.5 → SKILL.md 변환
│   ├── design-tokens.md              # Phase 1: 컬러/타이포/레이아웃
│   ├── templates/
│   │   ├── base.html                 # CSS 디자인 시스템 + 레이아웃
│   │   └── components/              # 17종 HTML 컴포넌트
│   │       ├── nav.html
│   │       ├── hero.html
│   │       ├── section-header.html
│   │       ├── kpi-card.html
│   │       ├── compare-grid.html
│   │       ├── ba-grid.html
│   │       ├── silo-grid.html
│   │       ├── trend-grid.html
│   │       ├── scenario-card.html
│   │       ├── step-block.html
│   │       ├── flow-diagram.html
│   │       ├── impact-list.html
│   │       ├── option-card.html
│   │       ├── vuln-list.html
│   │       ├── roadmap-track.html
│   │       ├── bottom-note.html
│   │       └── cta.html
│   └── examples/
│       └── KOAMI_v0.5.html           # 실제 구현 예시
├── offering-pptx/
│   ├── SKILL.md
│   └── templates/
│       └── base-slide.md             # 슬라이드 구조 정의
└── prototype-builder/
    └── SKILL.md                       # Phase 16 F351~F356 연동
```

### 2.2 SKILL.md 표준 구조 (offering-html)

```yaml
---
name: offering-html
domain: ax-bd
stage: shape
version: "1.0"
input_schema: DiscoveryPackage + OfferingConfig
output_schema: OfferingHTML
upstream: [ax-bd/discover/packaging]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
evolution:
  track: DERIVED
  registry_id: null  # F275 등록 후 부여
---
```

### 2.3 INDEX.md 스키마

```markdown
# ax-bd/shape/INDEX.md

## Stage: 형상화 (3단계)
## Agent: ax-bd-offering-agent

| # | Skill | Input | Output | Format |
|---|-------|-------|--------|--------|
| 3-1 | offering-html | DiscoveryPackage + OfferingConfig | OfferingHTML | HTML |
| 3-2 | offering-pptx | DiscoveryPackage + OfferingConfig | OfferingPPTX | PPTX |
| 3-P | prototype-builder | OfferingArtifact + PrototypeConfig | Prototype | React/HTML |

## OfferingConfig Schema
- purpose: "report" | "proposal" | "review"
- format: "html" | "pptx"
- sections: SectionToggle[]
- designTokenOverrides?: Partial<DesignTokens>
```

### 2.4 디자인 토큰 Phase 1 (design-tokens.md)

KOAMI v0.5 CSS에서 추출한 토큰을 MD로 문서화:

| 카테고리 | 토큰 | 값 |
|----------|------|-----|
| color.text.primary | `--text-primary` | `#111` |
| color.text.secondary | `--text-secondary` | `#666` |
| color.text.muted | `--text-muted` | `#999` |
| color.bg.default | `--bg-default` | `#fff` |
| color.bg.alt | `--bg-alt` | `#f8f9fa` |
| color.data.red | `--data-red` | `#dc2626` |
| color.data.orange | `--data-orange` | `#ea580c` |
| color.data.green | `--data-green` | `#16a34a` |
| color.border.default | `--border-default` | `#e5e5e5` |
| color.border.strong | `--border-strong` | `#111` |
| typography.hero | font: Pretendard | 48px / 900 |
| typography.section | font: Pretendard | 36px / 800 |
| typography.body | font: Pretendard | 15px / 400 / lh 1.7 |
| typography.label | font: Pretendard | 12px / 600 / uppercase / ls 0.08em |
| layout.maxWidth | — | 1200px |
| layout.sectionPadding | — | 120px 40px 80px |
| layout.cardRadius | — | 16px |
| layout.breakpoint | — | 900px |

---

## 3. Agent 설계 (F368)

### 3.1 ax-bd-offering-agent.md

```yaml
name: ax-bd-offering-agent
extends: shaping-orchestrator
role: 형상화 단계 전체 라이프사이클 관리
model: opus (구조 판단) / sonnet (콘텐츠 생성)
tools: [Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch]

capabilities:
  - format_selection       # 목적별 포맷 추천
  - content_adapter        # 3가지 톤 변환
  - structure_crud         # 18섹션 필수/선택 토글
  - design_management      # 디자인 토큰 적용
  - validate_orchestration # ogd-* + six-hats + expert-5 호출
  - version_guide          # v0.1→v0.5→v1.0 진행 관리
```

### 3.2 Agent 호출 흐름

```
사용자 요청: "KOAMI 사업기획서 생성해줘"
  │
  ▼
ax-bd-offering-agent
  │
  ├─ [1] format_selection
  │   └─ 목적 확인 (보고/제안/검토) → 포맷 결정 (HTML/PPTX)
  │
  ├─ [2] DiscoveryPackage 로드
  │   └─ discovery_items 테이블에서 해당 아이템의 분석 결과 조합
  │
  ├─ [3] content_adapter
  │   └─ purpose에 따라 톤 결정:
  │       report   → executive (경영 언어, exec-summary 강조)
  │       proposal → technical (기술 상세, 솔루션 강조)
  │       review   → critical  (리스크 중심, no-go 기준)
  │
  ├─ [4] structure_crud
  │   └─ 18섹션 중 필수/선택 결정 → offering_sections에 저장
  │
  ├─ [5] offering-html SKILL 실행
  │   └─ 8단계 생성 프로세스 (아이템확인→목차확정→정보수집→초안→피드백→검증→최종)
  │   └─ base.html + 17종 컴포넌트 조합 → Draft v0.1
  │
  ├─ [6] validate_orchestration (자동 호출)
  │   ├─ ogd-orchestrator → GAN 교차검증 (7개 표준 질문)
  │   ├─ six-hats-moderator → 6색 모자 토론
  │   └─ expert-ta~qa → 전문가 5인 리뷰
  │
  └─ [7] version_guide
      └─ 검증 통과 → v0.5+, 최종 확정 → v1.0
```

---

## 4. API 설계 (F369~F373)

### 4.1 D1 테이블 설계

#### offerings

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT | PK | ULID |
| tenant_id | TEXT | FK tenants(id), NOT NULL | |
| discovery_item_id | TEXT | FK discovery_items(id), NULL | 발굴 아이템 연결 (없을 수도 있음) |
| title | TEXT | NOT NULL | 사업기획서 제목 |
| purpose | TEXT | NOT NULL, DEFAULT 'report' | report / proposal / review |
| format | TEXT | NOT NULL, DEFAULT 'html' | html / pptx |
| status | TEXT | NOT NULL, DEFAULT 'draft' | draft → reviewing → validated → final |
| version | TEXT | NOT NULL, DEFAULT 'v0.1' | v0.1 → v0.5 → v1.0 |
| design_token_override | TEXT | NULL | JSON: DesignTokens 오버라이드 |
| created_by | TEXT | NULL | 생성자 user_id |
| created_at | INTEGER | NOT NULL, DEFAULT unixepoch() | |
| updated_at | INTEGER | NOT NULL, DEFAULT unixepoch() | |

#### offering_versions

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT | PK | ULID |
| offering_id | TEXT | FK offerings(id), NOT NULL | |
| version | TEXT | NOT NULL | v0.1, v0.2, ... |
| snapshot | TEXT | NOT NULL | JSON: 전체 섹션 스냅샷 |
| created_by | TEXT | NULL | |
| created_at | INTEGER | NOT NULL, DEFAULT unixepoch() | |

#### offering_sections

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT | PK | ULID |
| offering_id | TEXT | FK offerings(id), NOT NULL | |
| section_key | TEXT | NOT NULL | hero, exec-summary, background, ... |
| title | TEXT | NOT NULL | 섹션 제목 |
| content | TEXT | NULL | Markdown 또는 HTML |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 표시 순서 |
| required | INTEGER | NOT NULL, DEFAULT 1 | 필수(1) / 선택(0) |
| enabled | INTEGER | NOT NULL, DEFAULT 1 | 활성(1) / 비활성(0) |
| created_at | INTEGER | NOT NULL, DEFAULT unixepoch() | |
| updated_at | INTEGER | NOT NULL, DEFAULT unixepoch() | |

#### offering_design_tokens

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT | PK | ULID |
| offering_id | TEXT | FK offerings(id), NULL | NULL = 전역 기본 토큰 |
| name | TEXT | NOT NULL | 'default', 'koami-brand', ... |
| tokens | TEXT | NOT NULL | JSON: DesignTokens |
| is_default | INTEGER | NOT NULL, DEFAULT 0 | |
| created_at | INTEGER | NOT NULL, DEFAULT unixepoch() | |
| updated_at | INTEGER | NOT NULL, DEFAULT unixepoch() | |

### 4.2 API 엔드포인트

#### offerings 기본 CRUD (F370)

| Method | Path | 설명 | 스키마 |
|--------|------|------|--------|
| POST | `/api/offerings` | Offering 생성 | CreateOfferingSchema |
| GET | `/api/offerings` | 목록 조회 (tenant 필터, 페이지네이션) | ListOfferingsSchema |
| GET | `/api/offerings/:id` | 상세 조회 (sections 포함) | GetOfferingSchema |
| PUT | `/api/offerings/:id` | 수정 | UpdateOfferingSchema |
| DELETE | `/api/offerings/:id` | 삭제 (soft delete) | — |

#### offering sections (F371)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/offerings/:id/sections` | 섹션 목록 |
| PUT | `/api/offerings/:id/sections/:sectionId` | 섹션 수정 |
| PATCH | `/api/offerings/:id/sections/toggle` | 필수/선택 토글 배치 |
| POST | `/api/offerings/:id/sections/reorder` | 순서 변경 |

#### offering export (F372)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/offerings/:id/export` | HTML export (query: format=html\|pdf) |
| GET | `/api/offerings/:id/preview` | HTML 프리뷰 (iframe용) |

#### offering validate (F373)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/offerings/:id/validate` | O-G-D + Six Hats + Expert 교차검증 |
| GET | `/api/offerings/:id/validations` | 검증 결과 목록 |
| GET | `/api/offerings/:id/validations/:validationId` | 검증 상세 |

#### offering design tokens (F381)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/offerings/design-tokens` | 전역 토큰 목록 |
| GET | `/api/offerings/:id/design-tokens` | Offering별 토큰 |
| PUT | `/api/offerings/:id/design-tokens` | 토큰 오버라이드 저장 |

### 4.3 Zod 스키마 (주요)

```typescript
// packages/api/src/schemas/offerings.ts

export const CreateOfferingSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.enum(['report', 'proposal', 'review']).default('report'),
  format: z.enum(['html', 'pptx']).default('html'),
  discoveryItemId: z.string().optional(),
  designTokenOverride: z.record(z.unknown()).optional(),
});

export const UpdateOfferingSchema = CreateOfferingSchema.partial().extend({
  status: z.enum(['draft', 'reviewing', 'validated', 'final']).optional(),
  version: z.string().optional(),
});

export const ListOfferingsSchema = z.object({
  status: z.enum(['draft', 'reviewing', 'validated', 'final']).optional(),
  format: z.enum(['html', 'pptx']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### 4.4 서비스 계층

| 서비스 파일 | 역할 | 의존 |
|------------|------|------|
| `offerings.ts` | CRUD + 상태 전환 + 버전 관리 | D1 |
| `offering-sections.ts` | 섹션 CRUD + 토글 + 재정렬 | D1 |
| `offering-export.ts` | HTML 렌더링 (base.html + 컴포넌트 조합) | offering-sections, design-tokens |
| `offering-validate.ts` | O-G-D Loop 호출 + 결과 저장 | orchestration-loop (F335) |
| `offering-tokens.ts` | 디자인 토큰 CRUD | D1 |
| `content-adapter.ts` | DiscoveryPackage → 목적별 톤 변환 | LLM (Haiku/Sonnet) |

### 4.5 콘텐츠 어댑터 설계 (F378)

```typescript
// packages/api/src/services/content-adapter.ts

type Purpose = 'report' | 'proposal' | 'review';

interface AdapterConfig {
  purpose: Purpose;
  tone: 'executive' | 'technical' | 'critical';
  emphasis: string[];  // 강조할 섹션 키
}

const ADAPTER_CONFIGS: Record<Purpose, AdapterConfig> = {
  report: {
    purpose: 'report',
    tone: 'executive',
    emphasis: ['exec-summary', 'cross-validation', 'expected-impact'],
  },
  proposal: {
    purpose: 'proposal',
    tone: 'technical',
    emphasis: ['solution-overview', 'poc-scenario', 'data-strategy'],
  },
  review: {
    purpose: 'review',
    tone: 'critical',
    emphasis: ['cross-validation', 'risk', 'no-go-criteria'],
  },
};

// adaptContent(discoveryPackage, purpose) → AdaptedContent
// - LLM 호출로 톤 변환 (Haiku: 속도 우선, Sonnet: 품질 필요 시)
// - O-G-D Loop(F335)로 변환 품질 검증 (ConvergenceCriteria ≥ 0.85)
```

### 4.6 discover → shape 파이프라인 (F379)

```typescript
// EventBus(F334) 활용 — 기존 ExecutionEventService 확장

// 1. 발굴 완료 이벤트 발행 (기존 discovery 코드에 추가)
await eventService.emit({
  type: 'discovery.completed',
  payload: { discoveryItemId, tenantId, packageSummary },
});

// 2. 이벤트 소비 → Offering 자동 생성
eventService.on('discovery.completed', async (event) => {
  const offering = await offeringsService.create({
    tenantId: event.payload.tenantId,
    discoveryItemId: event.payload.discoveryItemId,
    title: `${event.payload.packageSummary.itemName} 사업기획서`,
    purpose: 'report',  // 기본값, 사용자가 변경 가능
    format: 'html',
    status: 'draft',
  });
  // 18섹션 초기화 (DiscoveryPackage 기반 프리필)
  await offeringSectionsService.initFromDiscovery(offering.id, event.payload.discoveryItemId);
});
```

---

## 5. Web 설계 (F374~F377, F381)

### 5.1 라우트 구조

```
packages/web/src/routes/(app)/offerings/
├── index.tsx          # F374: 목록 (Kanban 뷰)
├── new.tsx            # F375: 생성 위자드
├── [id].tsx           # F376: 에디터 + 프리뷰
└── [id]/
    └── validate.tsx   # F377: 교차검증 대시보드
```

### 5.2 컴포넌트 설계

```
packages/web/src/components/offerings/
├── OfferingList.tsx          # Kanban 보드 (draft/reviewing/validated/final)
├── OfferingCard.tsx          # 카드 (제목, 포맷 배지, 버전, 상태)
├── OfferingWizard.tsx        # 3단계 위자드:
│   ├── Step1-SelectItem.tsx  #   1. 발굴 아이템 선택 (or 수동)
│   ├── Step2-Configure.tsx   #   2. 목적 + 포맷 + 목차 토글
│   └── Step3-Review.tsx      #   3. 미리보기 + 생성 확인
├── SectionEditor.tsx         # 섹션별 편집기 (Markdown textarea)
├── SectionList.tsx           # 좌측 섹션 목록 (drag-reorder, 토글)
├── HtmlPreview.tsx           # iframe 기반 HTML 실시간 프리뷰
├── ValidationDashboard.tsx   # 교차검증 결과 종합
│   ├── GanResult.tsx         #   GAN 추진론/반대론 (7질문 × 판정배지)
│   ├── SixHatsResult.tsx     #   6색 모자 의견 요약
│   └── ExpertResult.tsx      #   전문가 5인 리뷰 결과
├── TokenEditor.tsx           # 디자인 토큰 실시간 에디터
│   ├── ColorPicker.tsx       #   컬러 선택
│   ├── TypographyControl.tsx #   폰트/크기/무게
│   └── LayoutControl.tsx     #   여백/반응형
└── ContentAdapterToggle.tsx  # 보고용/제안용/검토용 톤 전환 버튼
```

### 5.3 주요 화면 레이아웃

#### 에디터 (F376) — 3패널 레이아웃

```
┌───────────────────────────────────────────────────────┐
│ Toolbar: [Save] [Export HTML] [Export PDF] [Validate]  │
│ Purpose: [보고용|제안용|검토용]  Version: v0.1 → v0.5  │
├──────────┬─────────────────────┬──────────────────────┤
│ Sections │ Section Editor      │ HTML Preview         │
│          │                     │                      │
│ ☑ Hero   │ ## Executive Summary│ ┌─────────────────┐  │
│ ☑ Exec   │                     │ │  [실시간 HTML]    │  │
│ ☑ 추진배경│ 이 사업은 KT 전략과  │ │  [iframe 렌더링]  │  │
│ ☑ 시장기회│ 고객 수요를 연결해...│ │                   │  │
│ ☐ Gap분석│                     │ │                   │  │
│ ☑ 제안방향│ [Markdown Editor]   │ │                   │  │
│ ...      │                     │ │                   │  │
│          │                     │ └─────────────────┘  │
│ [Reorder]│                     │ [Token Editor ▼]     │
└──────────┴─────────────────────┴──────────────────────┘
```

### 5.4 상태 관리 (Zustand)

```typescript
// packages/web/src/lib/stores/offeringStore.ts

interface OfferingState {
  offerings: Offering[];
  currentOffering: Offering | null;
  sections: OfferingSection[];
  validationResult: ValidationResult | null;
  designTokens: DesignTokens;

  // Actions
  fetchOfferings: (params?: ListParams) => Promise<void>;
  fetchOffering: (id: string) => Promise<void>;
  createOffering: (data: CreateOfferingInput) => Promise<Offering>;
  updateSection: (sectionId: string, content: string) => Promise<void>;
  toggleSection: (sectionId: string, enabled: boolean) => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;
  exportHtml: (id: string) => Promise<string>;
  validate: (id: string) => Promise<ValidationResult>;
  updateDesignTokens: (tokens: Partial<DesignTokens>) => Promise<void>;
  switchPurpose: (purpose: Purpose) => Promise<void>;
}
```

### 5.5 디자인 토큰 에디터 (F381)

```
┌────────────────────────────────┐
│ Design Token Editor            │
├────────────────────────────────┤
│ Colors                         │
│ ┌──────────┬──────────┐        │
│ │ Primary  │ [#111  ]▪│        │
│ │ Secondary│ [#666  ]▪│        │
│ │ BG       │ [#fff  ]▪│        │
│ │ BG Alt   │ [#f8f9fa]▪│       │
│ └──────────┴──────────┘        │
│                                │
│ Typography                     │
│ Hero:    [48px] [900]          │
│ Section: [36px] [800]          │
│ Body:    [15px] [400]          │
│                                │
│ Layout                         │
│ Max Width: [1200px]            │
│ Card Radius: [16px]            │
│                                │
│ [Reset to Default] [Apply]     │
└────────────────────────────────┘
```

구현: CSS Variables를 iframe `contentWindow.document.documentElement.style.setProperty()`로 실시간 반영.

---

## 6. PPTX 설계 (F367, F380)

### 6.1 엔진 선택

| 후보 | 장점 | 단점 | 판정 |
|------|------|------|------|
| **pptxgenjs** | Node.js 네이티브, Workers 호환 가능 | 복잡한 레이아웃 한계 | ✅ 1순위 |
| python-pptx | 풍부한 기능, 기존 Python 인프라 | subprocess 필요, Workers 미지원 | 2순위 |

**결정:** pptxgenjs 우선 시도. Workers 환경에서 동작 확인 후, 불가 시 python-pptx subprocess fallback.

### 6.2 슬라이드 구조

18섹션 → 슬라이드 매핑:

| 섹션 | 슬라이드 수 | 레이아웃 |
|------|------------|---------|
| Hero | 1 | Title Slide (제목 + 서브타이틀 + 날짜) |
| Executive Summary | 1 | Bullet Layout (5~6 불릿) |
| 추진배경 (3축) | 1 | 3-Column Card |
| 시장기회 (02-1~02-6) | 2~3 | Content + Compare Table |
| 제안방향 (03-1~03-3) | 2 | BA Grid + Roadmap |
| 추진계획 (04-1~04-6) | 3~4 | TAM/SAM/SOM + Table + 검증 결과 |
| GTM 전략 | 1 | Step Flow + Table |
| **합계** | **12~15** | |

---

## 7. Prototype 연동 설계 (F382)

Phase 16 Builder(F351~F356) 연동:

```typescript
// Offering Export 후 Prototype 자동 생성 트리거

// 1. Offering 상태가 'validated' 또는 'final'로 전환될 때
await eventService.emit({
  type: 'offering.validated',
  payload: { offeringId, tenantId, scenarios: extractedScenarios },
});

// 2. Prototype Builder가 이벤트 소비
eventService.on('offering.validated', async (event) => {
  // Phase 16 CLI --bare API 호출
  // 시나리오 + 데이터 구조를 기반으로 프로토타입 생성
  await prototypeService.createFromOffering({
    offeringId: event.payload.offeringId,
    scenarios: event.payload.scenarios,
    mode: 'bare',  // --bare PoC 모드
  });
});
```

---

## 8. 테스트 전략 (F383)

### 8.1 단위 테스트

| 대상 | 파일 | 주요 케이스 |
|------|------|------------|
| offerings service | `offerings.test.ts` | CRUD, 상태 전환, 버전 관리 |
| offering-sections service | `offering-sections.test.ts` | 18섹션 초기화, 토글, 재정렬 |
| content-adapter service | `content-adapter.test.ts` | 3가지 톤 변환 검증 |
| offering-export service | `offering-export.test.ts` | HTML 렌더링, 컴포넌트 조합 |
| offering-validate service | `offering-validate.test.ts` | O-G-D 호출, 결과 저장 |
| offering-tokens service | `offering-tokens.test.ts` | 토큰 CRUD, 오버라이드 머지 |

### 8.2 API 통합 테스트

| 라우트 | 케이스 수 (예상) |
|--------|-----------------|
| offerings CRUD | 8~10 |
| offering sections | 6~8 |
| offering export | 3~4 |
| offering validate | 4~5 |
| offering tokens | 4~5 |
| **합계** | **25~32** |

### 8.3 E2E 테스트 (F383)

| 시나리오 | 경로 |
|---------|------|
| 발굴→형상화 자동 전환 | discovery complete → offering auto-created |
| Offering 생성 위자드 | /offerings/new → 3단계 완료 → 목록 표시 |
| 섹션 편집 + 프리뷰 | /offerings/:id → 섹션 수정 → HTML 프리뷰 갱신 |
| 교차검증 실행 | /offerings/:id → Validate → 결과 대시보드 |
| 톤 전환 | 보고용→제안용 전환 → 콘텐츠 변경 확인 |
| 디자인 토큰 커스텀 | 토큰 에디터 → 프리뷰 즉시 반영 |
| PPTX export | /offerings/:id → Export PPTX → 파일 다운로드 |

---

## 9. 구현 순서 체크리스트

### Sprint 165: Foundation (F363~F366)
- [ ] `ax-bd/shape/` 디렉토리 생성
- [ ] `INDEX.md` 작성
- [ ] `offering-html/SKILL.md` 변환 (사업기획서 Skill v0.5 기반)
- [ ] `templates/base.html` 분리 (KOAMI HTML에서 CSS + 레이아웃)
- [ ] `templates/components/` 17종 HTML 컴포넌트 분리
- [ ] `examples/KOAMI_v0.5.html` 등록
- [ ] `design-tokens.md` 작성
- [ ] F275 Skill Registry 연동 확인

### Sprint 166: Agent + PPTX (F367~F368)
- [ ] `ax-bd-offering-agent.md` 작성 (shaping-orchestrator 확장)
- [ ] Agent 6가지 capability 정의
- [ ] `offering-pptx/SKILL.md` 작성
- [ ] pptxgenjs 기술 평가 (Workers 호환성)

### Sprint 167: D1 + CRUD (F369~F371)
- [ ] `0110_offerings.sql` 마이그레이션
- [ ] `0111_offering_versions.sql`
- [ ] `0112_offering_sections.sql`
- [ ] `0113_offering_design_tokens.sql`
- [ ] `routes/offerings.ts` (CRUD 5개 엔드포인트)
- [ ] `services/offerings.ts`
- [ ] `schemas/offerings.ts` (Zod)
- [ ] `routes/offering-sections.ts` (4개 엔드포인트)
- [ ] `services/offering-sections.ts`
- [ ] 테스트 helper SQL 동기화
- [ ] 단위 + 통합 테스트

### Sprint 168: Export + Validate (F372~F373)
- [ ] `services/offering-export.ts` (HTML 렌더링 엔진)
- [ ] `routes/offerings.ts` export/preview 엔드포인트 추가
- [ ] `services/offering-validate.ts` (O-G-D Loop 호출)
- [ ] `routes/offerings.ts` validate 엔드포인트 추가
- [ ] 검증 결과 D1 저장 (기존 execution_events 활용)
- [ ] 테스트

### Sprint 169: 목록 + 위자드 (F374~F375)
- [ ] `/app/offerings/index.tsx` — Kanban 목록
- [ ] `OfferingList.tsx` + `OfferingCard.tsx`
- [ ] `/app/offerings/new.tsx` — 3단계 위자드
- [ ] `OfferingWizard.tsx` (Step1~Step3)
- [ ] `offeringStore.ts` (Zustand)
- [ ] `useOfferings.ts` hook

### Sprint 170: 에디터 + 검증 대시보드 (F376~F377)
- [ ] `/app/offerings/[id].tsx` — 3패널 에디터
- [ ] `SectionEditor.tsx` + `SectionList.tsx`
- [ ] `HtmlPreview.tsx` (iframe)
- [ ] `/app/offerings/[id]/validate.tsx`
- [ ] `ValidationDashboard.tsx` (GAN + SixHats + Expert)

### Sprint 171: 어댑터 + 파이프라인 (F378~F379)
- [ ] `services/content-adapter.ts`
- [ ] `ContentAdapterToggle.tsx` UI
- [ ] EventBus `discovery.completed` 이벤트 추가
- [ ] `offering.auto-create` 이벤트 소비 핸들러
- [ ] `offering-sections.initFromDiscovery()` 프리필 로직

### Sprint 172: PPTX 구현 (F380)
- [ ] pptxgenjs 통합 (또는 python-pptx fallback)
- [ ] 18섹션 → 12~15 슬라이드 매핑
- [ ] Export PPTX 엔드포인트
- [ ] PPTX 프리뷰 (Web)

### Sprint 173: 토큰 에디터 + Prototype (F381~F382)
- [ ] `offering-tokens` API 엔드포인트
- [ ] `TokenEditor.tsx` (ColorPicker + Typography + Layout)
- [ ] CSS Variables iframe 실시간 반영
- [ ] `offering.validated` EventBus 이벤트
- [ ] Phase 16 Builder 호출 연동

### Sprint 174: E2E + 메트릭 (F383)
- [ ] E2E 테스트 7개 시나리오
- [ ] BD ROI 메트릭 연동 (F274+F278)
- [ ] Offering 생성 시간 측정
- [ ] 전체 파이프라인 E2E 검증

---

## 10. 참조

| 문서 | 경로 |
|------|------|
| Plan | `docs/01-plan/features/offering-pipeline.plan.md` |
| PRD | `docs/specs/fx-offering-pipeline/prd-final.md` |
| Architecture v2.1 | `docs/specs/FX-Skill-Agent-Architecture/FX-Skill-Agent-Architecture-v2.md` |
| 사업기획서 Skill v0.5 | `docs/specs/FX-Skill-Agent-Architecture/AX_BD팀_사업기획서_Skill_v0.5_260404.md` |
| KOAMI Template v0.5 | `docs/specs/FX-Skill-Agent-Architecture/03_AX Discovery_사업기획서_KOAMI_v0.5_260404.html` |
