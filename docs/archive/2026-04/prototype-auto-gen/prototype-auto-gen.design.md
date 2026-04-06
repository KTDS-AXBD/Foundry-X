# Prototype Auto-Gen Design Document

> **Summary**: PRD→Prototype 자동 생성 파이프라인의 상세 설계 — Builder Server, O-G-D Loop, API, 대시보드
>
> **Project**: Foundry-X
> **Version**: Phase 16 (Sprint 158~160)
> **Author**: AX BD팀
> **Date**: 2026-04-06
> **Status**: Draft
> **Planning Doc**: [prototype-auto-gen.plan.md](../../01-plan/features/prototype-auto-gen.plan.md)
> **PRD**: [prd-final.md](../../specs/prototype-auto-gen/prd-final.md)

---

## 1. Overview

### 1.1 Design Goals

- PRD 텍스트 입력 → 10분 이내 배포 가능한 React SPA Prototype 생성
- Claude Code CLI `--bare` 모드 + API 키 기반 서버 자동화
- O-G-D 품질 루프로 자동 품질 검증 (quality ≥ 0.85 수렴)
- Docker 격리 + 3단계 Fallback으로 안정성 확보
- BD팀 피드백 → 재생성 Loop 자동화

### 1.2 Design Principles

- **격리 우선**: 각 Job은 독립 Docker 컨테이너에서 실행 (파일/프로세스 충돌 방지)
- **비용 최적화**: Haiku 주력 (~$0.5/건), Sonnet은 최종 Round만
- **Fail-safe**: CLI→API→앙상블 3단계 Fallback + State Machine dead-letter
- **기존 인프라 활용**: Foundry-X API(Hono) + Web(React Router 7) + D1 확장

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Foundry-X Web (fx.minu.best)                │
│                                                              │
│  PrototypeListPage ──→ PrototypeDetailPage ──→ FeedbackForm │
│                            │ iframe preview                  │
│                            │ build log (SSE)                 │
└─────────────────┬──────────┴────────────────────────────────┘
                  │ REST API
                  ▼
┌──────────────────────────���──────────────────────────────────┐
│            Foundry-X API (Workers)                            │
│                                                              │
│  POST /api/prototypes  ──→ PrototypeService ──→ D1          │
│  GET  /api/prototypes      (Job 생성/조회/상태)               │
│  PATCH /api/prototypes/:id                                   │
│  GET  /api/prototypes/:id/log (SSE)                          │
│  POST /api/prototypes/:id/feedback                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ Polling (30초) 또는 Webhook
                  ▼
┌──────────────���──────────────────────────────────────────────┐
│           Prototype Builder Server (VPS/Linux)                │
│                                                              │
│  ┌───────────┐  ┌──────────────┐  ┌─��─────────────────┐     │
│  │ JobPoller  │→│ Orchestrator │→│ Docker Container   │     │
│  │ (30s loop)│  │ (O-G-D Loop) │  │ (격리 실행)        │     │
│  └───────────┘  └──────────────┘  │                    │     │
│                                    │  claude --bare -p  │     │
│  ┌─────────────┐                  │  + template copy   │     │
│  │ CostTracker │                  │  + vite build      │     │
│  │ (비용 모니터)│                  │  + wrangler deploy │     │
│  └─────────────┘                  └───────────────────┘     │
│                                                              │
│  ┌───────────┐  ┌───────────┐                               │
│  │ Deployer  │  │ Notifier  │                               │
│  │ (Pages)   │  │ (Slack)   │                               │
│  └───��───────┘  └──────��────┘                               │
└───────────���───────────────────────────���─────────────────────┘
```

### 2.2 Data Flow

```
1. BD팀: "Prototype 생성" 클릭 (Web)
2. Web → POST /api/prototypes { prdId, projectId }
3. API: PrototypeService.create() → D1 INSERT (status: queued)
4. Builder: JobPoller 감지 → PATCH status=building
5. Builder: Docker 컨테이너 생성 → 템플릿 복사 → PRD/CLAUDE.md 주입
6. Builder: O-G-D Loop (max 3 rounds)
   6a. Generator: claude --bare -p (Haiku) → prototype_v{N}.html
   6b. Discriminator: claude --bare -p → feedback_{N}.md (quality score)
   6c. quality ≥ 0.85 → 탈출 / 미달 → 재생성
7. Builder: vite build → 성공 → wrangler pages deploy
8. Builder: PATCH status=live, deploy_url=<url>
9. Builder: Slack 알림 → BD팀 확인
10. BD팀: 피드백 입력 → POST /api/prototypes/:id/feedback
11. Builder: 피드백 감지 → 재생성 Loop (6번으로)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Builder Server | `ANTHROPIC_API_KEY` | Claude CLI/API 인증 |
| Builder Server | `CLOUDFLARE_API_TOKEN` | Pages 배포 |
| Builder Server | Foundry-X API | Job 큐 폴링 + 상태 갱신 |
| Foundry-X API | D1 | prototypes 테이블 |
| Foundry-X Web | API | Prototype CRUD + SSE |
| Docker 컨테이너 | Node.js 20 + Claude CLI | 코드 생성 + 빌드 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// packages/shared/src/types/prototype.ts
export interface Prototype {
  id: string;
  projectId: string;
  prdId: string | null;
  name: string;
  status: PrototypeStatus;
  prdContent: string;
  deployUrl: string | null;
  previewScreenshot: string | null;
  buildLog: string | null;
  errorMessage: string | null;
  qualityScore: number | null;     // O-G-D 최종 점수
  ogdRounds: number;               // O-G-D 실행 라운드 수
  modelUsed: string;               // haiku / sonnet
  apiCost: number;                 // 총 API 비용 ($)
  feedbackContent: string | null;  // BD팀 피드백
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type PrototypeStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'live'
  | 'failed'
  | 'deploy_failed'
  | 'dead_letter'
  | 'feedback_pending';   // 피드백 대기 (재생성 예정)
```

### 3.2 Database Schema (D1)

```sql
-- migrations/0100_prototypes.sql
CREATE TABLE prototypes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prd_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  prd_content TEXT NOT NULL,
  deploy_url TEXT,
  preview_screenshot TEXT,
  build_log TEXT,
  error_message TEXT,
  quality_score REAL,
  ogd_rounds INTEGER DEFAULT 0,
  model_used TEXT DEFAULT 'haiku',
  api_cost REAL DEFAULT 0,
  feedback_content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_prototypes_status ON prototypes(status);
CREATE INDEX idx_prototypes_project ON prototypes(project_id);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/prototypes` | Prototype 생성 (Job 큐잉) | Required |
| GET | `/api/prototypes` | Prototype 목록 (프로젝트별) | Required |
| GET | `/api/prototypes/:id` | Prototype 상세 | Required |
| PATCH | `/api/prototypes/:id` | 상태 갱신 (Builder→API) | API Token |
| GET | `/api/prototypes/:id/log` | 빌드 로그 SSE 스트림 | Required |
| POST | `/api/prototypes/:id/feedback` | BD팀 피드백 제출 | Required |

### 4.2 Detailed Specification

#### `POST /api/prototypes`

**Request:**
```json
{
  "projectId": "string (required)",
  "prdId": "string (optional — null이면 prdContent 직접 전달)",
  "prdContent": "string (required — PRD 마크다운 전문)",
  "name": "string (required — 프로토타입 이름)"
}
```

**Response (201):**
```json
{
  "id": "proto_abc123",
  "status": "queued",
  "name": "손해사정-AI-데모",
  "createdAt": "2026-04-06T10:00:00Z"
}
```

#### `PATCH /api/prototypes/:id` (Builder Server 전용)

**Request:**
```json
{
  "status": "building | deploying | live | failed | dead_letter",
  "deployUrl": "https://proto-name.pages.dev (live 시)",
  "buildLog": "string (append)",
  "errorMessage": "string (failed 시)",
  "qualityScore": 0.85,
  "ogdRounds": 2,
  "modelUsed": "haiku",
  "apiCost": 0.73
}
```

#### `POST /api/prototypes/:id/feedback`

**Request:**
```json
{
  "content": "대시보드의 차트가 PRD와 다릅니다. KPI 3개가 아니라 2개만 표시됩니다."
}
```

**Response (200):** `{ "status": "feedback_pending" }`
→ Builder가 다음 폴링에서 감지하여 재생성 Loop 실행

---

## 5. Builder Server 상세 설계

### 5.1 모듈 구조

```
prototype-builder/
├── src/
│   ├── index.ts              # 메인 엔트리 (Express health + poller start)
│   ├── poller.ts             # 30초 간격 API 폴링
│   ├── executor.ts           # Docker 컨테이너 실행 + CLI 호출
│   ├── orchestrator.ts       # O-G-D 루프 제어
│   ├── deployer.ts           # wrangler pages deploy
│   ├── notifier.ts           # Slack Webhook
│   ├── cost-tracker.ts       # API 비용 추적 + 예산 알림
│   ├── state-machine.ts      # 상태 전환 규칙 + dead-letter
│   └── fallback.ts           # CLI→API 자동 전환
├── templates/
│   └── react-spa/            # Vite+React18+TailwindCSS+shadcn/ui
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           └── components/ui/  # shadcn/ui 사전 설치
├── docker/
│   ├── Dockerfile.generator  # Generator 컨테이너 이미지
│   └── docker-compose.yml
├── package.json
└── tsconfig.json
```

### 5.2 State Machine 전환 규칙

```typescript
// state-machine.ts
const TRANSITIONS: Record<PrototypeStatus, PrototypeStatus[]> = {
  queued:           ['building'],
  building:         ['deploying', 'failed'],
  deploying:        ['live', 'deploy_failed'],
  live:             ['feedback_pending'],
  failed:           ['queued', 'dead_letter'],    // 재시도 또는 dead-letter
  deploy_failed:    ['deploying', 'dead_letter'],
  dead_letter:      [],                            // 수동 개입만
  feedback_pending: ['building'],                  // 재생성
};

const TIMEOUT_MS: Record<string, number> = {
  building: 15 * 60 * 1000,    // 15분 (O-G-D 3라운드)
  deploying: 5 * 60 * 1000,    // 5분
};
// timeout 초과 → dead_letter 자동 전환 (Cron 1분 간격)
```

### 5.3 CLI 실행 명령

```typescript
// executor.ts — Primary 경로
function buildCliArgs(job: PrototypeJob, round: number): string[] {
  return [
    '--bare',                                     // 서버용 최소 모드
    '-p', buildGeneratorPrompt(job, round),        // 프롬프트
    '--allowedTools', 'Bash,Read,Edit,Write',      // 도구 권한
    '--model', round < 2 ? 'haiku' : 'sonnet',    // 비용 최적화
    '--max-turns', '15',                           // 턴 제한
    '--output-format', 'json',                     // 구조화된 출력
  ];
}

// Fallback 경로 (CLI 실패 시)
async function fallbackToApi(job: PrototypeJob): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    messages: [{ role: 'user', content: buildApiPrompt(job) }],
  });
  return response.content[0].text;
}
```

### 5.4 O-G-D Orchestrator

```typescript
// orchestrator.ts
async function runOgdLoop(job: PrototypeJob, maxRounds = 3): Promise<OgdResult> {
  let bestScore = 0;
  let bestOutput = '';

  for (let round = 0; round < maxRounds; round++) {
    // 1. Generator: PRD + checklist + 이전 feedback → 코드 생성
    const generated = await runGenerator(job, round);

    // 2. Discriminator: 생성물 + checklist → Pass/Fail 판정
    const evaluation = await runDiscriminator(job, generated, round);

    // 3. 비용 추적
    costTracker.record(job.id, round, evaluation.tokensUsed);

    // 4. 수렴 판정
    if (evaluation.qualityScore >= 0.85) {
      return { output: generated, score: evaluation.qualityScore, rounds: round + 1 };
    }

    if (evaluation.qualityScore > bestScore) {
      bestScore = evaluation.qualityScore;
      bestOutput = generated;
    }

    // 5. 피드백을 다음 Round 입력으로 저장
    await saveFeedback(job.workDir, round, evaluation.feedback);
  }

  // max rounds 도달 → 최고 점수 산출물 채택
  return { output: bestOutput, score: bestScore, rounds: maxRounds };
}
```

---

## 6. UI/UX Design

### 6.1 Screen Layout — Prototype 목록

```
┌────────────────────────────────────────────────────────────┐
│  Sidebar  │  Prototype 목록                                 │
│           │                                                 │
│  ...      │  ┌─────────────────┐  ┌─────────────────┐      │
│  발굴     │  │ 🟢 손해사정 AI  │  │ 🟡 헬스케어 AI  │      │
│  형상화   │  │ quality: 0.87   │  │ building...     │      │
│  **프로토** │  │ 3분 전 배포     │  │ Round 1/3       │      │
│  제품화   │  │ [열기] [피드백]  │  │ [로그 보기]      │      │
│           │  └─────────────────┘  └─────────────────┘      │
│           │                                                 │
│           │  [+ Prototype 생성]                              │
└───────────┴─────────────────────────────────────────────────┘
```

### 6.2 Screen Layout — Prototype 상세

```
┌────────────────────────────────────────────────────────────┐
│  ← 목록으로    손해사정 AI 의사결정 지원 데모               │
│                                                            │
│  상태: 🟢 Live    품질: 0.87/1.00    비용: $0.73           │
│  배포: https://proto-damage-ai.pages.dev                   │
│  O-G-D: 2 rounds (Haiku→Haiku)    시간: 8분 32초          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │            iframe Preview (배포된 URL)                │  │
│  │                                                      │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [빌드 로그]  [피드백 보내기]  [새 URL로 열기]              │
│                                                            │
│  ┌─ 피드백 입력 ─────────────────────────────────────────┐ │
│  │ 대시보드 KPI가 PRD와 다릅니다. 3개여야 하는데 2개...   │ │
│  │                                           [전송]      ��� │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────��──────────────────────┘
```

### 6.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `PrototypeListPage` | `web/src/routes/prototype/index.tsx` | 목록 페이지 + 생성 버튼 |
| `PrototypeDetailPage` | `web/src/routes/prototype/$id.tsx` | 상세 + 프리뷰 + 피드백 |
| `PrototypeCard` | `web/src/components/prototype/PrototypeCard.tsx` | 목록 카드 (상태 배지 + 품질) |
| `BuildLogViewer` | `web/src/components/prototype/BuildLogViewer.tsx` | SSE 실시간 빌드 로그 |
| `PreviewFrame` | `web/src/components/prototype/PreviewFrame.tsx` | iframe 프리뷰 |
| `FeedbackForm` | `web/src/components/prototype/FeedbackForm.tsx` | 피드백 입력 + 전송 |
| `CreatePrototypeDialog` | `web/src/components/prototype/CreatePrototypeDialog.tsx` | 생성 다이얼로그 (PRD 선택/입력) |
| `OgdProgressBar` | `web/src/components/prototype/OgdProgressBar.tsx` | O-G-D 라운드 진행 표시 |

---

## 7. Security Considerations

- [x] `ANTHROPIC_API_KEY`: Builder Server 환경변수, 코드에 하드코딩 금지
- [x] `CLOUDFLARE_API_TOKEN`: 최소 권한 (Pages Edit만)
- [x] Docker 격리: 각 Job 독립 컨테이너, 호스트 파일시스템 접근 차단
- [ ] PII Detection: PRD 내 개인정보 자동 탐지 → 경고 (Phase D)
- [ ] 접근제어: 배포된 URL 비공개 옵션 (Phase D)
- [x] Builder→API 인증: 전용 API Token (BUILDER_API_TOKEN)
- [x] Rate Limiting: API 엔드포인트별 요청 제한

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Sprint |
|------|--------|------|--------|
| Unit | State Machine, CostTracker, Orchestrator | Vitest | 158 |
| Integration | API 라우트 (POST/GET/PATCH) | Hono app.request() | 159 |
| E2E | PRD→생성→배포→URL 반환 전 과정 | 수동 + Playwright | 160 |
| Cost | Haiku/Sonnet 모델별 비용 실측 | 로그 분석 | 158 |

### 8.2 Test Cases

- [ ] **Happy path**: PRD 입력 → queued → building → deploying → live → URL 반환
- [ ] **O-G-D 수렴**: 3 라운드 이내 quality ≥ 0.85 도달
- [ ] **CLI Fallback**: CLI 실패 → API 직접 호출 → 생성 성공
- [ ] **State Machine**: 각 상태 전환 규칙 검증 + timeout→dead_letter
- [ ] **비용 추적**: 각 Job의 API 비용 정확 기록 + 월 예산 알림
- [ ] **Docker 격리**: 동시 2개 Job 실행 시 파일 충돌 없음
- [ ] **피드백 Loop**: 피드백 제출 → feedback_pending → building → 재생성
- [ ] **빌드 실패**: 생성 코드 빌드 실패 → 자동 수정 → 재빌드 (최대 3회)

---

## 9. Implementation Order

### Sprint 158 — Foundation (F351 + F352)

| # | 작업 | 파일 | 검증 기준 |
|---|------|------|-----------|
| 1 | `templates/react-spa/` 생성 | 템플릿 전체 | `npm run build` 성공 |
| 2 | Builder Server 스캐폴딩 | `prototype-builder/src/*.ts` | TypeScript 컴파일 |
| 3 | Dockerfile.generator | `docker/Dockerfile.generator` | Docker build 성공 |
| 4 | CLI `--bare` PoC | executor.ts | PRD→생성→빌드→배포 E2E |
| 5 | Haiku 비용 실측 | cost-tracker.ts | 5종 PRD 비용 로그 |

### Sprint 159 — Core Pipeline (F353 + F354)

| # | 작업 | 파�� | 검증 기준 |
|---|------|------|-----------|
| 1 | D1 마이그레이션 | `migrations/0100_prototypes.sql` | `wrangler d1 migrations apply` |
| 2 | Zod 스키마 | `api/src/schemas/prototype.ts` | typecheck 통과 |
| 3 | PrototypeService | `api/src/services/PrototypeService.ts` | 단위 테스트 |
| 4 | API 라우트 3개 | `api/src/routes/prototype.ts` | integration test |
| 5 | State Machine | `builder/src/state-machine.ts` | 전환 규칙 테스트 |
| 6 | Fallback + CostTracker | `builder/src/fallback.ts`, `cost-tracker.ts` | CLI 실패 → API 전환 테스트 |

### Sprint 160 — Integration (F355 + F356)

| # | 작업 | ���일 | 검증 기준 |
|---|------|------|-----------|
| 1 | O-G-D Orchestrator | `builder/src/orchestrator.ts` | 3 라운드 수렴 테스트 |
| 2 | Generator + Discriminator | executor 확장 | quality score 출력 |
| 3 | PrototypeListPage | `web/src/routes/prototype/index.tsx` | 카드 렌더링 |
| 4 | PrototypeDetailPage + PreviewFrame | `web/src/routes/prototype/$id.tsx` | iframe 표시 |
| 5 | BuildLogViewer (SSE) | `web/src/components/prototype/BuildLogViewer.tsx` | 실시간 로그 |
| 6 | FeedbackForm + Loop | `web/src/components/prototype/FeedbackForm.tsx` | 피드백→재생성 |
| 7 | Slack 알림 | `builder/src/notifier.ts` | Webhook 발송 확인 |
| 8 | E2E 통합 테스트 | `web/e2e/prototype.spec.ts` | 전 과정 통과 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-06 | Initial draft — Plan + PRD final 기반 | AX BD팀 |
