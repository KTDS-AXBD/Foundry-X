---
code: FX-DSGN-FDU
title: "fx-discovery-ux — 발굴 프로세스 UX 개선 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-FDU]], [[FX-SPEC-FDU-PRD]]"
---

# fx-discovery-ux: 발굴 프로세스 UX 개선 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F263~F266 발굴 프로세스 UX 개선 (4 Must Have) |
| 기간 | Sprint 94~97 (2주) |
| 핵심 전략 | 기존 인프라(76스킬+프로세스가이드+SSE+온보딩) 재조합, 신규 코드 최소화 |
| PRD | docs/specs/fx-discovery-ux/prd-final.md |
| Plan | docs/01-plan/features/fx-discovery-ux.plan.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 메뉴 나열형 10+ 항목, 시작점 불명, 인터랙션 부재 → CC Cowork 주력 사용 |
| Solution | 위저드 스텝퍼 + Help Agent + 인터랙티브 온보딩 + HITL 패널 |
| Function UX Effect | 5분 내 프로세스 시작, AI 비서 컨텍스트 안내, 산출물 즉시 검토 |
| Core Value | 기존 76스킬 인프라 → 실사용 전환 |

---

## 1. 아키텍처 개요

### 1.1 기존 인프라 활용 전략

F263~F266은 새로운 백엔드 로직보다 **기존 인프라의 UX 재조합**에 초점:

| 기존 인프라 | F-item | 활용 방식 |
|------------|--------|-----------|
| `bd-process.ts` (2-0~2-10 단계 데이터) | F263 | 위저드 스텝퍼 데이터 소스 |
| `bd-skills.ts` (76개 스킬 메타) | F263, F264 | 단계별 추천 스킬, Help Agent 참조 |
| `bd-skill-executor.ts` (Anthropic 실행) | F266 | HITL 재생성 시 재호출 |
| `discovery-criteria.ts` (9기준 체크리스트) | F263 | 단계별 완료 조건 |
| `discovery-progress.ts` (포트폴리오 집계) | F263 | 위저드 진행 상태 |
| `sse-client.ts` + `sse-manager.ts` (F57) | F264 | Help Agent SSE 스트리밍 |
| `onboarding-progress.ts` (F252) | F265 | 온보딩 패턴 재사용 |
| `bd-artifact-service.ts` (F261) | F266 | 산출물 버전+상태 관리 |

### 1.2 데이터 흐름

```
[사용자] ──→ DiscoveryWizard (F263)
              │
              ├─ 단계 선택 ──→ StageContent (bd-process.ts 참조)
              │                  ├─ 추천 스킬 목록 (bd-skills.ts)
              │                  ├─ 체크포인트 상태 (discovery-criteria.ts)
              │                  └─ 스킬 실행 → 산출물 → HITL 패널 (F266)
              │
              ├─ Help Agent (F264) ──→ OpenRouter SSE
              │                        ├─ Hybrid: 단순질문 → 로컬 응답
              │                        └─ 복잡질문 → LLM 호출
              │
              └─ 온보딩 투어 (F265) ──→ 첫 방문 시 자동 실행
```

---

## 2. F263: 발굴 프로세스 단계별 안내 UI (Sprint 94)

### 2.1 컴포넌트 구조

```
discovery.tsx (기존 라우트)
├── DiscoveryWizard.tsx [신규]
│   ├── WizardStepper.tsx [신규] — 좌측 2-0~2-10 단계 네비게이션
│   │   └── StepItem.tsx [신규] — 개별 단계 (아이콘+제목+완료상태)
│   ├── StageContent.tsx [신규] — 우측 메인: 단계별 콘텐츠 패널
│   │   ├── StageHeader — 단계 목적 + 예상 산출물
│   │   ├── RecommendedSkills — 추천 스킬 카드 (bd-skills.ts 필터)
│   │   ├── CheckpointStatus — 체크포인트 질문 + 상태
│   │   └── StageActions — "스킬 실행" + "다음 단계" 버튼
│   └── BizItemSelector.tsx [신규] — 상단: biz-item 선택 드롭다운
├── HelpAgentChat.tsx (F264, Sprint 95)
└── HitlReviewPanel.tsx (F266, Sprint 96)
```

### 2.2 라우트 변경

기존 `/ax-bd/discovery` 페이지를 **모드 전환** 방식으로 확장:

```typescript
// routes/ax-bd/discovery.tsx
// 기존: 나열형 프로세스 뷰 (TypeRoutingMatrix + ProcessFlowV82)
// 변경: wizardMode 상태에 따라 전환
//   wizardMode=true  → DiscoveryWizard (스텝퍼 + 콘텐츠)
//   wizardMode=false → 기존 뷰 (하위 호환)
```

### 2.3 데이터 소스 (기존 활용)

위저드 데이터를 별도로 만들지 않고 기존 `bd-process.ts`를 그대로 활용:

```typescript
// packages/web/src/data/bd-process.ts 이미 포함:
// - stage.id (2-0 ~ 2-10)
// - stage.title, description
// - stage.methodologies[] — 활용 방법론
// - stage.checkpointQuestions[] — 사업성 체크포인트
// - stage.skills[] — 단계별 스킬 ID 목록

// packages/web/src/data/bd-skills.ts 이미 포함:
// - skill.applicableStages[] — 스킬별 적용 가능 단계
// → StageContent에서 현재 단계에 해당하는 스킬만 필터
```

### 2.4 Zustand Store

```typescript
// packages/web/src/lib/stores/discovery-wizard-store.ts [신규]
interface DiscoveryWizardState {
  // biz-item 컨텍스트
  selectedBizItemId: string | null;

  // 위저드 상태
  wizardMode: boolean;
  currentStage: string;  // '2-0' ~ '2-10'

  // 진행 상태 (API에서 로드)
  completedStages: string[];
  stageProgress: Record<string, number>;  // stage → 완료율 (0~100)

  // 액션
  setSelectedBizItem: (id: string) => void;
  setCurrentStage: (stage: string) => void;
  toggleWizardMode: () => void;
  loadProgress: (bizItemId: string) => Promise<void>;
}
```

### 2.5 API 변경

기존 `discovery-progress.ts` 서비스를 확장:

```typescript
// 기존 API 활용 (추가 엔드포인트 불필요):
// GET /ax-bd/progress/:bizItemId — biz-item별 진행 상태
// GET /ax-bd/artifacts?bizItemId=X — 단계별 산출물

// 신규 API 1건만:
// PATCH /ax-bd/progress/:bizItemId/stage
// → 현재 단계 업데이트 (위저드에서 단계 이동 시)
```

### 2.6 사이드바 변경

기존 "발굴" 메뉴를 간소화하고, 위저드 진입점을 강조:

```typescript
// packages/web/src/components/sidebar.tsx
// 변경 전: 9개 하위 메뉴 나열
// 변경 후:
{
  key: "discover",
  label: "2. 발굴",
  icon: Search,
  items: [
    { path: "/ax-bd/discovery", label: "🧭 발굴 위저드", highlight: true },
    { path: "/ax-bd/ideas", label: "아이디어" },
    { path: "/ax-bd/bmc", label: "BMC" },
    { path: "/ax-bd/skill-catalog", label: "스킬 카탈로그" },
    { path: "/ax-bd/progress", label: "진행 추적" },
    // process-guide, artifacts, ontology → 위저드 내에서 접근
  ]
}
```

---

## 3. F264: Help Agent (Sprint 95)

### 3.1 아키텍처

```
[Web] HelpAgentChat ──SSE──→ [Workers] /help-agent/chat
                                  │
                                  ├─ Hybrid Router
                                  │   ├─ 단순질문 → LocalKnowledge (bd-process.ts 기반)
                                  │   └─ 복잡질문 → OpenRouter API
                                  │
                                  └─ Context Builder
                                      ├─ 현재 biz-item 정보
                                      ├─ 현재 단계 (2-0~2-10)
                                      └─ 사용 가능 스킬 목록
```

### 3.2 API 설계

```typescript
// POST /api/help-agent/chat (SSE 스트리밍 응답)
// Request:
interface HelpAgentChatRequest {
  message: string;
  bizItemId?: string;
  currentStage?: string;  // '2-0' ~ '2-10'
  conversationId?: string;  // 이전 대화 이어가기
}

// Response: SSE stream
// data: {"type":"chunk","content":"..."}
// data: {"type":"suggestion","action":"execute_skill","skillId":"market-scan"}
// data: {"type":"done","conversationId":"xxx","tokensUsed":123}

// GET /api/help-agent/history?bizItemId=X&limit=20
// → 이전 대화 이력 조회
```

### 3.3 Hybrid 분기 로직

```typescript
// packages/api/src/services/help-agent-service.ts [신규]

// 단순질문 패턴 (LLM 호출 없이 즉시 응답):
const LOCAL_PATTERNS = [
  { pattern: /다음.*단계|next.*step/i, handler: getNextStageGuide },
  { pattern: /이.*단계.*뭐|what.*this.*stage/i, handler: getCurrentStageInfo },
  { pattern: /스킬.*추천|recommend.*skill/i, handler: getRecommendedSkills },
  { pattern: /체크포인트|checkpoint/i, handler: getCheckpointQuestions },
];

// 복잡질문 → OpenRouter 호출
// 시스템 프롬프트에 포함:
// - AX BD 발굴 프로세스 v8.2 요약
// - 현재 biz-item 제목+유형+단계
// - 현재 단계의 체크포인트 상태
// - 사용 가능 스킬 목록 (5개 이내)
```

### 3.4 OpenRouter 서비스

```typescript
// packages/api/src/services/openrouter-service.ts [신규]
interface OpenRouterConfig {
  apiKey: string;           // env.OPENROUTER_API_KEY
  model: string;            // 'anthropic/claude-sonnet-4-6' (기본)
  maxTokens: number;        // 1024 (Help Agent 응답)
  temperature: number;      // 0.7
}

// SSE 스트리밍: OpenRouter의 stream=true → Workers → 클라이언트 SSE 릴레이
// fetch() + ReadableStream.pipeTo() 패턴 (Workers에서 지원)
```

### 3.5 D1 마이그레이션 0078

```sql
-- packages/api/src/db/migrations/0078_help_agent.sql
CREATE TABLE IF NOT EXISTS help_agent_conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  biz_item_id TEXT,
  discovery_stage TEXT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  is_local_response INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_help_agent_conv ON help_agent_conversations(conversation_id, created_at);
CREATE INDEX idx_help_agent_biz ON help_agent_conversations(biz_item_id, created_at);
```

### 3.6 챗 UI 컴포넌트

```typescript
// packages/web/src/components/feature/discovery/HelpAgentChat.tsx [신규]
// 위치: 위저드 우측 하단 floating panel (접기/펼치기)

interface HelpAgentChatProps {
  bizItemId?: string;
  currentStage?: string;
}

// 기능:
// - SSE EventSource로 스트리밍 수신 (sse-client.ts 패턴 활용)
// - 타이핑 애니메이션 (chunk 단위 렌더링)
// - 제안 액션 버튼 (스킬 실행, 다음 단계 등)
// - 대화 이력 (최근 20건, 스크롤 로드)
// - 접기 시 미니 FAB (💬 아이콘)
```

### 3.7 Zustand Store

```typescript
// packages/web/src/lib/stores/help-agent-store.ts [신규]
interface HelpAgentState {
  messages: ChatMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  isExpanded: boolean;

  sendMessage: (text: string) => Promise<void>;
  toggleExpanded: () => void;
  loadHistory: (bizItemId: string) => Promise<void>;
}
```

---

## 4. F265: 발굴 온보딩 투어 (Sprint 94)

### 4.1 기존 F252 패턴 재사용

기존 `onboarding-progress.ts` 서비스의 **동일한 패턴**을 발굴 특화로 확장:

```typescript
// 기존 F252 5단계: view_dashboard → create_project → run_agent → check_spec → submit_feedback
// F265 5단계 (발굴 특화):
const DISCOVERY_TOUR_STEPS = [
  { id: 'select_item', title: '아이템 선택', target: '[data-tour="biz-item-selector"]' },
  { id: 'view_stage', title: '현재 단계 확인', target: '[data-tour="wizard-stepper"]' },
  { id: 'run_skill', title: '스킬 실행', target: '[data-tour="stage-actions"]' },
  { id: 'review_result', title: '결과 확인', target: '[data-tour="stage-content"]' },
  { id: 'next_stage', title: '다음 단계 이동', target: '[data-tour="next-stage-btn"]' },
];
```

### 4.2 컴포넌트

```typescript
// packages/web/src/components/feature/discovery/DiscoveryTour.tsx [신규]
// 라이브러리: react-joyride (기존 프로젝트에 없으면 추가) 또는 커스텀 tooltip

// 트리거 조건:
// - 발굴 위저드 페이지 첫 방문 (localStorage 'discovery-tour-completed' 없을 때)
// - 수동: "투어 다시 보기" 버튼

// 각 스텝:
// - 하이라이트 영역 + 설명 tooltip + 1/5 진행 표시
// - "다음" + "건너뛰기" 버튼
// - 완료 시 API 호출 (온보딩 진행률 기록)
```

### 4.3 API

```typescript
// 기존 PATCH /onboarding/progress 재사용
// step_id: 'discovery_tour_completed'
// → onboarding_progress 테이블에 기록
```

---

## 5. F266: HITL 인터랙션 패널 (Sprint 96)

### 5.1 사이드 드로어 구조

```
[DiscoveryWizard]
  └── [HitlReviewPanel] (사이드 드로어, 우측)
       ├── ArtifactViewer — 산출물 내용 표시 (마크다운 렌더링)
       ├── ReviewActions — ✅ 승인 / ✏️ 수정 / 🔄 재생성 / ❌ 거부
       ├── EditMode — 수정 모드 시 에디터 (textarea)
       └── ReviewHistory — 이 산출물의 리뷰 이력
```

### 5.2 트리거 흐름

```
스킬 실행 (SkillExecutionForm)
  → 결과 반환 (bd-skill-executor.ts)
  → HitlReviewPanel 자동 열림
  → 사용자 액션:
     ✅ 승인 → artifact status='approved' + 다음 단계 자동 연결
     ✏️ 수정 → 에디터 → 저장 (new version) → 승인 흐름
     🔄 재생성 → bd-skill-executor 재호출 → 새 결과로 교체
     ❌ 거부 → 사유 입력 → artifact status='rejected'
```

### 5.3 API 설계

```typescript
// POST /api/hitl/review
interface HitlReviewRequest {
  artifactId: string;
  action: 'approved' | 'modified' | 'regenerated' | 'rejected';
  reason?: string;          // 거부 시 필수
  modifiedContent?: string; // 수정 시 새 내용
}

// GET /api/hitl/history/:artifactId
// → 리뷰 이력 조회

// 승인 시 부수 효과:
// 1. artifact.status = 'approved'
// 2. 다음 단계의 입력 데이터로 자동 연결 (discovery_wizard_progress 갱신)
```

### 5.4 D1 마이그레이션 0079

```sql
-- packages/api/src/db/migrations/0079_hitl_reviews.sql
CREATE TABLE IF NOT EXISTS hitl_artifact_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('approved', 'modified', 'regenerated', 'rejected')),
  reason TEXT,
  modified_content TEXT,
  previous_version TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_hitl_artifact ON hitl_artifact_reviews(artifact_id, created_at);
```

---

## 6. 파일 변경 매트릭스

### Sprint 94 (F263 + F265)

| 유형 | 파일 | 변경 |
|------|------|------|
| 신규 | `web/src/components/feature/discovery/DiscoveryWizard.tsx` | 위저드 메인 컴포넌트 |
| 신규 | `web/src/components/feature/discovery/WizardStepper.tsx` | 좌측 스텝 네비게이션 |
| 신규 | `web/src/components/feature/discovery/StageContent.tsx` | 단계별 콘텐츠 패널 |
| 신규 | `web/src/components/feature/discovery/BizItemSelector.tsx` | biz-item 드롭다운 |
| 신규 | `web/src/components/feature/discovery/DiscoveryTour.tsx` | 온보딩 투어 |
| 신규 | `web/src/lib/stores/discovery-wizard-store.ts` | 위저드 상태 관리 |
| 수정 | `web/src/routes/ax-bd/discovery.tsx` | 위저드 모드 전환 추가 |
| 수정 | `web/src/components/sidebar.tsx` | 메뉴 간소화 + 위저드 강조 |
| 수정 | `api/src/routes/ax-bd-progress.ts` | PATCH stage 엔드포인트 추가 |
| 수정 | `api/src/services/discovery-progress.ts` | stage 업데이트 로직 |

### Sprint 95 (F264)

| 유형 | 파일 | 변경 |
|------|------|------|
| 신규 | `api/src/services/openrouter-service.ts` | OpenRouter SSE 프록시 |
| 신규 | `api/src/services/help-agent-service.ts` | 컨텍스트 조립 + Hybrid 분기 |
| 신규 | `api/src/routes/help-agent.ts` | POST /help-agent/chat, GET /help-agent/history |
| 신규 | `api/src/schemas/help-agent-schema.ts` | Zod 스키마 |
| 신규 | `api/src/db/migrations/0078_help_agent.sql` | 대화 이력 테이블 |
| 신규 | `web/src/components/feature/discovery/HelpAgentChat.tsx` | 챗 UI |
| 신규 | `web/src/lib/stores/help-agent-store.ts` | 챗 상태 관리 |
| 수정 | `api/src/index.ts` | help-agent 라우트 등록 |

### Sprint 96 (F266)

| 유형 | 파일 | 변경 |
|------|------|------|
| 신규 | `web/src/components/feature/discovery/HitlReviewPanel.tsx` | HITL 사이드 드로어 |
| 신규 | `api/src/services/hitl-review-service.ts` | 리뷰 기록 + 상태 전환 |
| 신규 | `api/src/routes/hitl-review.ts` | POST /hitl/review, GET /hitl/history |
| 신규 | `api/src/schemas/hitl-review-schema.ts` | Zod 스키마 |
| 신규 | `api/src/db/migrations/0079_hitl_reviews.sql` | 리뷰 이력 테이블 |
| 수정 | `web/src/components/feature/discovery/DiscoveryWizard.tsx` | HITL 패널 통합 |
| 수정 | `api/src/index.ts` | hitl-review 라우트 등록 |
| 수정 | `api/src/services/bd-artifact-service.ts` | approved/rejected 상태 추가 |

### Sprint 97 (통합 QA)

| 유형 | 파일 | 변경 |
|------|------|------|
| 신규 | `web/e2e/discovery-wizard.spec.ts` | 위저드 E2E |
| 신규 | `web/e2e/help-agent.spec.ts` | Help Agent E2E |
| 신규 | `api/src/**/__tests__/help-agent*.test.ts` | API 테스트 |
| 신규 | `api/src/**/__tests__/hitl-review*.test.ts` | API 테스트 |

---

## 7. 기술 결정

### 7.1 위저드 데이터: 기존 bd-process.ts 직접 사용 (vs 별도 데이터)

**결정: 기존 데이터 직접 사용**

`bd-process.ts`에 이미 단계별 title, description, methodologies, checkpointQuestions, skills가 정의되어 있음. 위저드 전용 데이터를 별도로 만들면 drift 발생 → 기존 데이터를 렌더링 관점에서 변환만.

### 7.2 Help Agent 모델: OpenRouter 경유 claude-sonnet-4-6

**결정: OpenRouter 경유**

PRD 인터뷰에서 확정. 직접 Anthropic API 호출 대신 OpenRouter를 거치면 멀티모델 전환 유연성 확보.
- 기존 `bd-skill-executor.ts`는 Anthropic 직접 호출 → Help Agent만 OpenRouter 사용
- 혼재하지만 역할이 다름: 스킬 실행(정확성 필수)=Anthropic, Help Agent(안내)=OpenRouter

### 7.3 투어 라이브러리: 커스텀 구현 (vs react-joyride)

**결정: 커스텀 구현**

- react-joyride는 무거움 (50KB+)
- 5스텝 정도면 `position: fixed` + `data-tour` selector로 충분
- 기존 프로젝트 패턴(Zustand + 순수 React)과 일관성

### 7.4 Help Agent 패널: Floating Panel (vs 사이드바 탭)

**결정: Floating Panel (접기/펼치기)**

- 위저드가 이미 좌(스텝퍼)+우(콘텐츠) 구조라 사이드바 공간 없음
- 우측 하단 FAB(💬) → 클릭 시 350px 패널 확장
- 모바일 고려 안 함(PC 전용)

### 7.5 HITL 패널: 사이드 드로어 (vs 모달)

**결정: 사이드 드로어**

- 메인 콘텐츠를 보면서 동시에 산출물 검토 가능
- 모달은 컨텍스트 단절 → 드로어가 UX 우수

---

## 8. 테스트 전략

### 8.1 단위 테스트

| 대상 | 테스트 내용 | 파일 |
|------|------------|------|
| help-agent-service | Hybrid 분기 로직 (로컬 패턴 매칭 vs LLM 호출) | `services/__tests__/help-agent-service.test.ts` |
| openrouter-service | SSE 스트리밍 릴레이 (mock fetch) | `services/__tests__/openrouter-service.test.ts` |
| hitl-review-service | 리뷰 CRUD + 상태 전환 | `services/__tests__/hitl-review-service.test.ts` |
| help-agent 라우트 | 인증 + 요청 검증 + 응답 포맷 | `routes/__tests__/help-agent.test.ts` |
| hitl-review 라우트 | 인증 + 리뷰 기록 + 이력 조회 | `routes/__tests__/hitl-review.test.ts` |

### 8.2 컴포넌트 테스트

| 대상 | 테스트 내용 |
|------|------------|
| DiscoveryWizard | 모드 전환, 단계 네비게이션, biz-item 선택 |
| HelpAgentChat | 메시지 전송, SSE 수신, 접기/펼치기 |
| HitlReviewPanel | 4개 액션(승인/수정/재생성/거부) 흐름 |
| DiscoveryTour | 스텝 진행, 완료 시 API 호출 |

### 8.3 E2E 시나리오 (Sprint 97)

1. **위저드 기본 흐름**: 아이템 선택 → 단계 탐색 → 스킬 실행 → 결과 확인
2. **Help Agent 질의**: "다음 뭐 해야 돼?" 입력 → 응답 수신 → 스킬 추천 클릭
3. **HITL 승인 흐름**: 스킬 실행 → 결과 패널 → 승인 → 다음 단계 자동 이동
4. **온보딩 투어**: 첫 방문 → 5스텝 완료 → 재방문 시 미표시

---

## 9. 리스크 대응

| 리스크 | 대응 | Sprint |
|--------|------|--------|
| OpenRouter 키 미발급 | Sprint 95 시작 전 확인, 미확보 시 Anthropic 직접 호출로 폴백 | 94 |
| 위저드 전환 시 기존 뷰 손실 | `wizardMode` 토글로 하위 호환 유지 | 94 |
| SSE Workers 릴레이 지연 | ReadableStream.pipeTo() 패턴, 타임아웃 30s | 95 |
| HITL 동시 편집 충돌 | MVP에서 단일 사용자 가정, Optimistic Locking은 P2 | 96 |

---

## 10. Workers Secret 추가

| Secret | 용도 | Sprint |
|--------|------|--------|
| `OPENROUTER_API_KEY` | Help Agent LLM 호출 | 95 |

---

## 11. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 |
|--------|------|--------------|
| 초안 | 2026-03-31 | 최초 작성 — 기존 인프라 탐색 기반 설계 |
