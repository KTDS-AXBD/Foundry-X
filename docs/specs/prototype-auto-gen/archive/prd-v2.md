<!-- CHANGED: 버전 갱신 (v1 → v2) -->
# PRD → Prototype 자동 생성 & 배포 — 현황 분석 및 구현 계획 (v2)

> **문서 ID**: FX-PLAN-PROTO-001
> **작성일**: 2026-04-05
> **기준**: Foundry-X Phase 9 (Sprint 98) + AX-BD-Process-Alignment-Plan
> **대상 Feature**: F278 (Prototype 자동 생성)
> **Phase**: 10-B → 10-D 연계

---

## 1. 현황 분석 요약

### 1.1 이미 구현된 것 (✅)

Foundry-X에는 PRD까지 이어지는 **파이프라인 상류**가 이미 구축되어 있음.

| 영역 | 구현 현황 | 위치 |
|------|-----------|------|
| 발굴 2-0~2-8 파이프라인 | ✅ 완료 (11개 ai-biz 서브스킬) | `.claude/skills/ax-bd-discovery/`, `api/services/` |
| PRD 자동 생성 | ✅ F185 (Sprint 53) | Discovery → PRD 템플릿 매핑 |
| 멀티 AI 리뷰 | ✅ F186~F188 (Sprint 55~56) | ChatGPT/Gemini/DeepSeek 교차 검토 |
| 8 페르소나 평가 | ✅ F188 | TA/AA/CA/DA/QA 등 병렬 |
| BMC 관리 | ✅ F197~F200 | BMCService CRUD |
| Agent Plan API | ✅ F82 | createPlanAndWait, executePlan |
| Harness Builders | ✅ Phase 1 | architecture/constitution/claude/agents 생성 |
| Cloudflare 인프라 | ✅ Workers + Pages + D1 | wrangler 배포 체계 |

### 1.2 아직 없는 것 (❌ — GAP)

**PRD → Prototype** 구간이 완전히 비어 있음. 구체적으로:

| GAP | 설명 | 심각도 |
|-----|------|--------|
| **G1. 코드 생성 엔진 없음** | PRD를 입력받아 React/HTML 코드로 변환하는 서비스 없음 | 🔴 Critical |
| **G2. Claude Code CLI 연동 없음** | 서버에서 Claude Code CLI를 subprocess로 호출하는 패턴 없음 | 🔴 Critical |
| **G3. 빌드/배포 파이프라인 없음** | 생성된 코드의 자동 빌드 + Cloudflare Pages 배포 자동화 없음 | 🔴 Critical |
| **G4. O-G-D 루프 미구현** | Orchestrator-Generator-Discriminator 설계만 존재 (harness-gan-agent-architecture.md) | 🟡 High |
| **G5. Prototype 프리뷰 인프라 없음** | 생성된 Prototype을 iframe/URL로 미리보기하는 기능 없음 | 🟡 High |
| **G6. 프로젝트 템플릿 없음** | React SPA 기본 스캐폴딩 템플릿 미보유 | 🟡 Medium |
| **G7. 알림 연동 없음** | 완료/실패 시 Slack/이메일 알림 없음 | 🟢 Low |

<!-- CHANGED: GAP 분석의 현실성, 실사용자 피드백 루프 부재 보완 -->
#### ⚠️ 추가 현실적 GAP

| GAP | 설명 | 심각도 |
|-----|------|--------|
| **G8. 실사용자 피드백 루프 부재** | 생성된 Prototype에 대한 BD팀/디자이너 등 실제 사용자 피드백을 체계적으로 수집·반영하는 프로세스가 없음 | 🔴 Critical |
| **G9. 자동 QA/테스트 부재** | 빌드 성공만으로 품질을 판단, UI/UX, 모바일 대응, 접근성 등 자동화된 QA 프로세스가 없음 | 🟡 High |
| **G10. PRD 전처리 실패시 fallback 부재** | PRD가 모호하거나 checklist 추출 실패 시, 수동 개입/보완, 또는 graceful degradation 흐름 없음 | 🟡 Medium |
| **G11. 운영/배포 장애 감지·복구 미흡** | Slack 알림 외의 장애 실시간 감지, 자동/반자동 복구 플로우 부재 | 🟡 High |
| **G12. 리소스 격리/보안 미흡** | 모든 작업이 단일 서버/디렉토리에서 실행되어, 파일 충돌, 보안 사고, 개인정보 노출 위험 존재 | 🔴 Critical |

### 1.3 기존 설계 문서 참조

| 문서 | 핵심 내용 |
|------|-----------|
| `AX-BD-Process-Alignment-Plan.md` | F278: Sprint 104, PRD 기반 HTML/React Prototype 자동 생성 |
| `harness-gan-agent-architecture.md` | O-G-D 패턴 — Generator/Discriminator 적대적 품질 루프 |
| `FX-Unified-Integration-Plan.md` | 2-layer loop (Hook + Orchestration), TaskState enum |
| `ECC-to-FX-Analysis-Plan.md` | Sprint 99~102 로드맵, 3 custom agents |

---

## 2. 아키텍처 설계

### 2.1 핵심 설계 원칙

**"구독 계정 기반, API 과금 ZERO"** — Claude Code CLI를 Max 구독 계정으로 서버 백단에서 실행하여 별도 API 토큰 비용 없이 Prototype을 생성함.

<!-- CHANGED: 강한 결합, 단일 장애점, 리소스 격리, 운영 자동화/복구 구조 미흡 보완 -->
#### ⚠️ 추가 설계 원칙 및 한계

- **장애 복원력**: Prototype Builder Server 단일 장애 시 전체 파이프라인이 중단될 수 있으므로, 향후 **수평 확장/Active-Standby** 구조, **헬스체크/자동 복구**(systemd/pm2) 및 **운영자 개입 플로우** 설계 필요.
- **리소스 격리**: 각 Prototype 생성 Job은 **Docker 컨테이너 등 격리 환경**에서 실행하는 구조를 단계적 도입해 파일 충돌/보안위험/재현성 확보 필요.
- **Fallback 경로 명확화**: Claude CLI 경로 장애/정책변경 시 표준 Claude API(유료) 기반 대체 플로우를 명확히 정의해야 함(설계 후반부 별도 명시).

```
┌──────────────────────────────────────────────────────────┐
│                    Foundry-X Web/API                      │
│                                                          │
│  PRD 완성 ──→ PrototypeJobService ──→ Queue (D1)        │
│                                                          │
└──────────────────────┬───────────────────────────────────┘
                       │ Webhook / Polling
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Prototype Builder Server (Linux)             │
│                                                          │
│  JobPoller ──→ PRD 파싱 ──→ Claude Code CLI 실행         │
│                    │         (Max 구독 계정)              │
│                    ▼                                      │
│  ┌─────────────────────────────────────────┐             │
│  │  Claude Code Session                     │             │
│  │                                          │             │
│  │  1. PRD → 화면 설계 도출                  │             │
│  │  2. React SPA 코드 생성                   │             │
│  │  3. 빌드 검증 (vite build)                │             │
│  │  4. 자동 수정 (lint/typecheck 오류 fix)    │             │
│  │  5. 최종 빌드 산출물 → dist/              │             │
│  └─────────────────────────────────────────┘             │
│                    │                                      │
│                    ▼                                      │
│  wrangler pages deploy dist/ ──→ Cloudflare Pages        │
│                    │                                      │
│  결과 URL ──→ API Callback ──→ Slack 알림                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

<!-- CHANGED: Polling 기반 상태관리 한계, 정교한 State Machine, 복구 로직 필요 명시 -->
**참고**: Polling(30초) 방식은 실시간성이 낮고, status 필드 불일치 등 복구 메커니즘이 약함. **정교한 State Machine 도입, dead-letter queue, timeout-based rollback** 등 설계 확장이 필요함.

### 2.2 Claude Code CLI 실행 구조

**핵심**: API 호출이 아닌 **Claude Code CLI(`claude`)를 subprocess로 실행**. Max 구독 계정이 인증된 서버에서 구동하므로 토큰 비용 없음.

<!-- CHANGED: 운영 리스크, 리소스 격리, 에러 상황 대응 구조 명시 -->
- **리소스 격리**: 각 작업은 별도 작업 디렉토리, 추후 Docker 컨테이너 기반으로 확장 예정.
- **에러 상황/타임아웃**: CLI subprocess가 5분 이상 무응답 시 강제 종료 및 Job status=failed 처리, 로그/에러 저장→운영 알림.
- **Fallback 경로**: CLI 실행이 실패할 경우, 표준 Claude API(유료)로 대체 수행하는 옵션 추가 예정.

```typescript
// Prototype Builder Server — core execution
import { spawn } from 'child_process';

interface PrototypeJob {
  jobId: string;
  prdContent: string;        // PRD 마크다운 전문
  projectName: string;       // e.g. "damage-assessment-prototype"
  designHints?: string;      // 디자인 가이드라인 (선택)
}

async function executePrototypeGeneration(job: PrototypeJob): Promise<string> {
  const workDir = `/workspace/prototypes/${job.projectName}`;

  // 1. 작업 디렉토리 + 기본 템플릿 준비
  await setupTemplate(workDir, job);

  // 2. PRD를 CLAUDE.md에 주입 (Claude Code가 컨텍스트로 읽음)
  await writeFile(`${workDir}/CLAUDE.md`, buildClaudeMd(job));
  await writeFile(`${workDir}/PRD.md`, job.prdContent);

  // 3. Claude Code CLI 실행 (비대화형 모드)
  const claude = spawn('claude', [
    '--print',                              // 비대화형, 결과만 출력
    '--dangerously-skip-permissions',       // 서버 환경에서 자동 승인
    '--max-turns', '30',                    // 최대 턴 수 제한
    '--model', 'sonnet',                    // 비용 효율적 모델
    '--prompt', buildPrompt(job),           // 생성 프롬프트
  ], { cwd: workDir });

  // 4. 실행 결과 수집 + 빌드 검증
  const result = await collectOutput(claude);

  // 5. 빌드 성공 시 배포
  if (result.buildSuccess) {
    const url = await deployToPages(workDir, job.projectName);
    return url;
  }

  throw new Error(`Build failed: ${result.errors}`);
}
```

### 2.3 프롬프트 설계 (Claude Code에 전달)

```typescript
function buildPrompt(job: PrototypeJob): string {
  return `
PRD.md 파일을 읽고, 이 사업 아이템의 인터랙티브 데모 Prototype을 만들어줘.

## 요구사항
1. React 18 + Vite + TailwindCSS SPA로 생성
2. PRD의 핵심 기능을 시각적으로 보여주는 데모 페이지 구성
3. 실제 데이터 대신 목업 데이터 사용 (realistic)
4. 모바일 반응형 필수
5. shadcn/ui 컴포넌트 활용
6. 한국어 UI (kt ds 사업개발용)

## 생성 순서
1. PRD.md 분석 → 핵심 화면 3~5개 도출
2. 컴포넌트 구조 설계
3. 코드 생성 (src/ 하위)
4. \`npm run build\` 실행하여 빌드 성공 확인
5. 빌드 실패 시 오류 수정 후 재빌드 (최대 3회)

## 제약
- 외부 API 호출 금지 (모든 데이터는 로컬 목업)
- node_modules 외 파일만 생성
- dist/ 폴더가 최종 배포 산출물
  `.trim();
}
```

### 2.4 프로젝트 템플릿

서버에 미리 준비해두는 React SPA 기본 스캐폴딩:

```
prototype-template/
├── package.json          # react, vite, tailwindcss, shadcn/ui
├── vite.config.ts        # 기본 Vite 설정
├── tailwind.config.ts    # TailwindCSS 설정
├── tsconfig.json         # TypeScript 설정
├── index.html            # 엔트리 HTML
├── src/
│   ├── main.tsx          # React 엔트리
│   ├── App.tsx           # 라우터 셸
│   ├── components/ui/    # shadcn/ui 컴포넌트 사전 설치
│   └── lib/utils.ts      # cn() 유틸
├── CLAUDE.md             # ← PRD + 생성 지시사항 주입
└── PRD.md                # ← 원본 PRD 주입
```

<!-- CHANGED: 템플릿/프롬프트 유지보수 비용, 버전업/보안패치 필요성 언급 -->
> **유지보수 주의**: 템플릿의 프레임워크/라이브러리(shadcn/ui, Tailwind, Vite 등)는 버전업·보안패치 시 자동화 루틴의 품질에 영향을 주므로 **정기적 리뷰 및 테스트/패치** 체계를 마련 필요.

---

## 3. 시스템 구성요소

### 3.1 Foundry-X API 측 (기존 인프라 확장)

```
packages/api/src/
├── routes/prototype.ts           # POST /prototypes, GET /prototypes/:id
├── services/PrototypeService.ts  # Job 생성, 상태 추적, 결과 저장
├── schemas/prototype.ts          # Zod: CreatePrototype, PrototypeStatus
└── db/migrations/0080_prototypes.sql  # D1 테이블
```

**D1 테이블 설계:**

```sql
CREATE TABLE prototypes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prd_id TEXT,                    -- 연관 PRD (nullable, 수동 생성 시)
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',  -- queued | building | deploying | live | failed
  prd_content TEXT NOT NULL,
  deploy_url TEXT,                -- Cloudflare Pages URL
  preview_screenshot TEXT,        -- 스크린샷 URL (선택)
  build_log TEXT,                 -- Claude Code 실행 로그
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 3.2 Prototype Builder Server (신규)

**독립 서비스** — Foundry-X API와 분리된 Linux 서버에서 구동.

```
prototype-builder/
├── src/
│   ├── index.ts              # 메인 엔트리
│   ├── poller.ts             # API 폴링 → 새 Job 감지
│   ├── executor.ts           # Claude Code CLI subprocess 실행
│   ├── deployer.ts           # wrangler pages deploy 실행
│   ├── notifier.ts           # Slack/Email 알림
│   ├── template-manager.ts   # 프로젝트 템플릿 관리
│   └── health.ts             # 헬스체크 + 큐 상태
├── templates/
│   └── react-spa/            # 기본 React SPA 템플릿
├── package.json
└── Dockerfile                # 컨테이너 배포 시
```

<!-- CHANGED: 리소스 격리, 장애 복구, 상태관리 취약성, 컨테이너 기반 격리 필요 명시 -->
> **운영 주의**: 단일 서버/디렉토리 기반은 파일 충돌, 자원 고갈, 보안사고 위험이 있으므로 **각 Job을 Docker 컨테이너 등 격리 환경에서 실행**하는 구조로 확장 필요. 장애 시 Job 상태 복구, dead-letter queue 관리 로직도 강화 필요.

**핵심 실행 흐름:**

```
┌─── Poller Loop (30초 간격) ──────────────────────────────┐
│                                                          │
│  1. GET /api/prototypes?status=queued                    │
│  2. Job 존재 → PATCH status=building                     │
│  3. 템플릿 복사 → 작업 디렉토리 생성                       │
│  4. CLAUDE.md + PRD.md 주입                              │
│  5. `claude --print` 실행 (Max 구독 계정)                 │
│  6. 빌드 검증: `npm run build`                            │
│  7. 성공 → `wrangler pages deploy` → URL 획득             │
│  8. PATCH status=live, deploy_url=<url>                   │
│  9. Slack 알림 발송                                       │
│                                                          │
│  실패 시 → PATCH status=failed, error_message=<log>       │
│  ─→ Slack 실패 알림                                       │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Web 대시보드 연동

```
packages/web/src/app/(app)/prototype/
├── page.tsx              # Prototype 목록 페이지
├── [id]/page.tsx         # 상세 페이지 (상태 + 로그 + 프리뷰)
└── components/
    ├── PrototypeCard.tsx  # 목록 카드 (상태 배지 + URL)
    ├── BuildLog.tsx       # 실시간 빌드 로그 뷰어
    └── PreviewFrame.tsx   # iframe 프리뷰
```

<!-- CHANGED: 실사용자 피드백 루프, QA, 보안/접근제어 구조 보완 -->
> **확장 예정**: 생성된 Prototype 상세 페이지에서 **BD팀/디자이너 실사용자 피드백 입력 및 자동 Loop 반영, QA 체크(자동/수동), 배포 URL 접근제어(비공개/공개 전환)** 등 실무적 활용 및 품질 개선 루프 연동 필요.

---

## 4. Claude Code CLI 서버 환경 구성

### 4.1 서버 요구사항

| 항목 | 요구사항 |
|------|----------|
| OS | Ubuntu 22.04+ (Linux) |
| Node.js | 20 LTS |
| Claude Code CLI | 최신 버전 (`npm install -g @anthropic-ai/claude-code`) |
| 인증 | Max 구독 계정으로 `claude login` 완료 상태 |
| wrangler | Cloudflare Workers CLI (`npm install -g wrangler`) |
| 디스크 | 50GB+ (프로젝트 생성/삭제 사이클) |
| 메모리 | 8GB+ (Claude Code CLI + 빌드 동시 실행) |
| 네트워크 | Anthropic API + Cloudflare API 접근 가능 |

<!-- CHANGED: Claude CLI의 프로덕션 서버 사용 가능성, 공식 정책 확인, fallback 필요성 명시 -->
> **정책 확인 필요**: Anthropic이 **프로덕션 서버/자동화 환경에서 CLI 사용을 공식 허용하는지**, Max 구독 rate limit·동시성 정책이 정식 문서로 확인되어야 함. 정책 변경/CLI 기능 제한시 **즉시 fallback(Claude API 경로)로 운영 전환**이 필요함.

### 4.2 인증 방식 (구독 계정 기반)

```bash
# 서버 초기 설정 (1회)
claude login                    # Max 구독 계정 브라우저 인증
wrangler login                  # Cloudflare 계정 인증

# 인증 상태 확인
claude --version                # CLI 버전 확인
claude --print "hello"          # 구독 인증 동작 확인
wrangler whoami                 # Cloudflare 인증 확인
```

**주의**: Claude Code CLI의 Max 구독 사용 시 **사용량 제한(rate limit)**이 있을 수 있음. 하루 가능한 Prototype 생성 건수를 모니터링해야 함.

### 4.3 동시성 관리

Max 구독 계정의 rate limit을 고려한 **단일 큐 + 순차 실행** 방식:

<!-- CHANGED: 동시성, 큐 관리, 고급 큐/우선순위, 타임아웃/강제종료/복구 필요성 명시 -->
- **고급 큐 관리**: 장시간 Job 블로킹/우선순위 처리/타임아웃 강제종료/Dead-letter queue 등 큐 확장 설계 필요.
- **운영 자동화**: 작업 실패시 운영팀 알림+재시도/수동 개입 흐름 설계.

```typescript
class JobQueue {
  private processing = false;

  async processNext(): Promise<void> {
    if (this.processing) return;  // 1개씩 순차 처리
    this.processing = true;

    try {
      const job = await this.fetchNextJob();
      if (job) {
        await this.execute(job);       // Claude Code CLI 실행
        await this.cleanup(job);       // 작업 디렉토리 정리
      }
    } finally {
      this.processing = false;
    }
  }
}
```

---

## 5. 전체 E2E 플로우

```
사용자(Web) ──→ "Prototype 생성" 버튼 클릭
    │
    ▼
Foundry-X API ──→ POST /api/prototypes
    │                { prdId, projectId }
    │                PRD 내용 자동 로딩
    ▼
D1 prototypes 테이블 ──→ status: "queued"
    │
    ▼  (Poller 감지, ~30초 이내)
Builder Server ──→ status: "building"
    │
    ├── 1. 템플릿 복사 + PRD/CLAUDE.md 주입
    ├── 2. claude --print --dangerously-skip-permissions
    │       --max-turns 30 --model sonnet
    │       --prompt "PRD.md 읽고 Prototype 만들어줘"
    ├── 3. npm install && npm run build
    ├── 4. 빌드 실패 시 → claude로 자동 수정 (최대 3회)
    │
    ▼  빌드 성공
Builder Server ──→ status: "deploying"
    │
    ├── wrangler pages deploy dist/
    │     --project-name=proto-{projectName}
    │     --branch=main
    │
    ▼  배포 완료
Builder Server ──→ status: "live"
    │   deploy_url: "https://proto-{name}.pages.dev"
    │
    ├── Slack 알림: "✅ {프로젝트명} Prototype 배포 완료"
    │               "🔗 https://proto-{name}.pages.dev"
    │
    ▼
사용자(Web) ──→ Prototype 상세 페이지에서 iframe 프리뷰
              ──→ 배포 URL로 직접 접속 가능
```

<!-- CHANGED: 실사용자 피드백/QA Loop, 장애/운영 알림, 접근제어 흐름 추가 -->
> **확장 플로우**:
> - 생성된 Prototype에 대해 BD팀/디자이너가 **피드백 작성** → Loop에 반영(자동/반자동 재생성 옵션)
> - **QA 체크리스트 자동화**: 빌드 성공과 별개로, UI/UX, 모바일, 접근성 등 QA 자동화/수동 체크 후 배포
> - **운영 장애 감지/재시도**: 배포 실패/빌드 hang시 운영자 실시간 알림, 수동 재배포/Job rollback
> - **Prototype 접근제어**: 필요시 비공개 모드(접근 권한 제한), 개인정보 포함시 자동 노출 차단

---

## 6. 구현 로드맵

### Phase A: Foundation (Sprint 99~100) — 2주

| 작업 | 상세 | 산출물 |
|------|------|--------|
| React SPA 템플릿 준비 | Vite + React 18 + Tailwind + shadcn/ui 기본 프로젝트 | `templates/react-spa/` |
| Builder Server 스캐폴딩 | Node.js 서비스 뼈대 (poller, executor, deployer) | `prototype-builder/` |
| Claude Code CLI 서버 설치 | Linux 서버에 claude CLI + wrangler + Node.js 20 설치 | 인프라 |
| 구독 인증 테스트 | `claude --print` 비대화형 모드 동작 확인 | 검증 완료 |

### Phase B: Core Pipeline (Sprint 101~102) — 2주

| 작업 | 상세 | 산출물 |
|------|------|--------|
| D1 마이그레이션 | 0080_prototypes.sql | DB 스키마 |
| API 엔드포인트 | POST/GET/PATCH /api/prototypes | 3개 라우트 |
| PrototypeService | Job 생성/조회/상태 업데이트 | 서비스 |
| Executor 핵심 로직 | Claude Code CLI subprocess + 빌드 검증 | executor.ts |
| Deployer 로직 | wrangler pages deploy 자동화 | deployer.ts |
| **검증**: 수동 PRD → Prototype 1건 E2E 테스트 | | |

### Phase C: Web 통합 (Sprint 103) — 1주

| 작업 | 상세 | 산출물 |
|------|------|--------|
| Prototype 목록 페이지 | 카드 UI + 상태 배지 | page.tsx |
| Prototype 상세 페이지 | 빌드 로그 + iframe 프리뷰 | [id]/page.tsx |
| SSE 실시간 상태 | 빌드 진행 중 실시간 로그 스트리밍 | sse-client 확장 |
| Slack 알림 연동 | 완료/실패 Webhook | notifier.ts |

### Phase D: 품질 고도화 (Sprint 104~106) — 선택적

| 작업 | 상세 |
|------|------|
| O-G-D 루프 도입 | Generator(Claude Code) + Discriminator(별도 claude 세션으로 품질 평가) |
| 재시도/자가 수정 | 빌드 실패 시 에러 로그를 Claude Code에 피드백 → 자동 수정 |
| 스크린샷 자동 캡처 | Puppeteer로 완성된 Prototype 스크린샷 저장 |
| 프롬프트 최적화 | 생성 품질 개선 위한 프롬프트 반복 실험 |

<!-- CHANGED: 인력 투입, 운영 리소스, 유지보수 비용 명시 -->
#### ⚠️ 인력/운영 리소스(Phase별)

| Phase | 필요 인력/운영 리소스 |
|-------|-----------------------|
| A~B   | Node.js BE 1, DevOps 1, FE 1, PM 0.5 |
| C     | FE 1, QA 0.5, PM 0.5 |
| D     | Prompt Engineer 1, QA 1, AI/ML 0.5, 운영(모니터링) 0.5 |
| **공통 유지보수** | 템플릿/프롬프트 업데이트, 보안패치, 정책변경 대응(DevOps 0.5 상시), 장애 운영(운영팀 0.5), 실사용자 피드백 수렴(기획/BD 0.5) |

---

## 7. 비용 분석

| 항목 | 비용 | 비고 |
|------|------|------|
| Claude Max 구독 | ~$100/월 (기존) | 추가 과금 없음 (단, 정책변경/Rate Limit 발생 가능) |
| Builder Server | ~$20~50/월 | VPS 또는 기존 서버 활용 |
| Cloudflare Pages | 무료 (500 deploys/월) | 프로젝트당 무료 |
| Cloudflare Workers | 기존 플랜 내 | API 변경분 |
| **API 토큰 비용** | **$0** | **구독 계정 기반 — 핵심** |
| **Fallback(Claude API)** | **$2~5/건** | CLI 정책변경/장애시 발생 가능 |

<!-- CHANGED: API 비용 $0 논리적 근거 한계, fallback 비용/운영 리스크 추가 -->
**비용 주의**:
- Max 구독 기반은 단기적으로 $0이나, **정책변경/Rate Limit/CLI 기능 제한** 발생 시 **Claude API(유료)로 fallback**하는 구조 필요. 이 경우 월간 20건 기준 $40~100 추가 비용.
- 운영비(DevOps, QA, 장애 복구 등)가 누락되지 않도록 상시 예산 반영 필요.

---

## 8. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| Max 구독 rate limit | Prototype 생성 건수 제한 | 큐 기반 순차 처리 + 야간 배치 |
| Claude Code CLI 비대화형 모드 한계 | 복잡한 프로젝트 생성 실패 | 프롬프트 최적화 + 템플릿 사전 준비로 난이도 감소 |
| 빌드 실패율 | 생성 코드가 빌드 안 됨 | 자동 수정 루프 (최대 3회) + 에러 분석 피드백 |
| 서버 장애 | Prototype 생성 중단 | 헬스체크 + 자동 재시작 (systemd/pm2) |
| 구독 정책 변경 | CLI 서버 사용 제한 가능 | API 키 기반 fallback 준비 (비용 발생) |
| 생성 품질 편차 | PRD에 따라 품질 들쭉날쭉 | 디자인 시스템 템플릿 표준화 + O-G-D 루프 도입 |
<!-- CHANGED: 리소스 격리, 보안, 운영 자동화, 장애 복구, 실사용자 Loop, QA, PRD 표준화 등 추가 -->
| 강한 결합/단일 장애점 | Prototype Builder Server 장애 시 전체 중단 | Active-Standby 구조, 장애 감지/운영자 수동 failover |
| 리소스 격리/보안 취약 | 파일 충돌, 개인정보 노출, 계정 탈취 | Docker 컨테이너 기반 격리, 최소권한, 접근제어, 개인정보/민감정보 자동 감지·차단 |
| Polling 상태관리 한계 | status 불일치, 영구 building hang 등 | 정교한 상태머신(State Machine), dead-letter queue, timeout rollback 도입 |
| O-G-D 루프 검증 부족 | Discriminator·Generator 품질 불확실 | Dry-run 다양화, 각 단계 성능 모니터링, 실사용자/QA 평가 루프 추가 |
| PRD 전처리 자동화 실패 | checklist 누락, 기능 map 오류 | 수동 개입 fallback, 전처리 실패시 운영자 알림, PRD 표준화/유효성 검사 |
| 장애/에러 실시간 감지 부재 | 운영팀 개입 지연, 문제 장기화 | 실시간 대시보드, 장애 자동 감지/운영자 알림, 자동 재시도/rollback |
| 다양한 PRD 케이스 대응 | 복잡한 PRD, 대형 프로젝트 품질 저하 | fail-safe, rollback, multi-round QA 및 수동 리뷰 옵션 |
| QA 자동화 부재 | 빌드 성공≠업무 적합성, 모바일/접근성 결함 | QA 체크리스트 자동화, UI/UX e2e 테스트, 접근성 도구 연계 |
| 실사용자 피드백/Loop 부재 | 실제 업무 적합성 미확보 | Web UI에 피드백 입력→Loop 자동 반영(Generator input 추가) |
| 템플릿/프롬프트 drift | 버전업, API 변화, 효과 저하 | 정기적 품질 점검, 자동 테스트, drift 감지 후 즉시 보완 |
| CLI 정책/구독 변경 | CLI 경로 불가시 전체 중단 | Claude API(유료) fallback 경로, 예산 승인 후 즉시 전환 |
| 데이터 일관성 | Job 중단/복구시 DB-실행상태 불일치 | 분산 트랜잭션, 보상 트랜잭션, 주기적 정합성 검사 |
| 인프라 운영 복잡성 | 신규 서버, 모니터링, 백업 등 | DevOps 자동화, 표준화된 운영 매뉴얼, 장애훈련 실시 |

---

## 9. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| Prototype 생성 성공률 | ≥ 80% | 빌드 성공 + 배포 완료 비율 |
| 평균 생성 시간 | ≤ 10분 | queued → live 소요 시간 |
| 빌드 자동 수정률 | ≥ 60% | 1차 실패 후 자동 수정으로 성공한 비율 |
| 월간 API 비용 | $0 (구독 내) | 별도 API 토큰 비용 없음 |
| 사용자 만족도 | ≥ 3.5/5 | BD팀 피드백 |
<!-- CHANGED: 실사용자 피드백 Loop, QA 자동화, 장애 자동감지 등 실운영 지표 추가 -->
| 실사용자 피드백 루프 반영률 | ≥ 80% | 피드백 → Loop → Generator 재생성 비율 |
| QA 자동화 적용률 | ≥ 70% | 빌드 성공+UI/UX+모바일/접근성 자동검증 통과율 |
| 장애 자동감지/복구율 | ≥ 90% | 장애 발생→운영자 알림/자동 복구 비율 |
| PRD 전처리 성공률 | ≥ 95% | PRD→체크리스트 자동 생성 성공 건수 |

---

## 10. 의존성 체크리스트

구현 시작 전 확인 필요:

- [ ] Claude Code CLI `--print` + `--dangerously-skip-permissions` 플래그 서버 환경 동작 확인
- [ ] Max 구독 계정의 비대화형 CLI 사용 허용 여부 공식문서 확인 및 Anthropic 문의
- [ ] Max 구독의 일일/시간당 rate limit 확인 (Prototype 건당 ~30턴 소요 추정)
- [ ] Builder Server 호스팅 환경 결정 (자체 서버 vs VPS vs 사내 인프라), 보안/격리 설계 필수
- [ ] Cloudflare Pages 프로젝트 자동 생성 API 권한 확인, 배포 실패시 rollback 플로우
- [ ] Slack Webhook URL 발급, 장애/실패 실시간 알림 연동
- [ ] Docker 기반 Job 격리 실행 환경 설계 및 PoC
- [ ] PRD 표준화/유효성 검사 자동화 및 전처리 실패시 수동 fallback 플로우 설계

---

## 11. Dry-Run 테스트 결과 (2026-04-05 실행)

### 11.1 테스트 환경

| 항목 | 값 |
|------|-----|
| Claude Code CLI | v2.1.87 |
| Node.js | v22.22.0 |
| 실행 환경 | Linux sandbox (Cowork 세션) |
| 인증 | Claude 구독 계정 (자동 인증) |
| PRD | 손해사정 AI 의사결정 지원 시스템 (4개 기능) |
| 산출물 형식 | 단일 HTML (TailwindCSS + Chart.js CDN) |

### 11.2 O-G-D 루프 실행 기록

#### Round 0 (Generator, Haiku, max-turns=5)
- **실행 시간**: ~90초
- **산출물**: index.html (457줄, 17KB)
- **구현 범위**: 대시보드 탭만 완성, 나머지 3탭은 "준비 중" 플레이스홀더
- **CLI 플래그**: `claude --print --dangerously-skip-permissions --model haiku --max-turns 5`

#### Round 0 → Discriminator (Haiku, max-turns=3)
- **판정**: `MAJOR_ISSUE` / quality_score: **0.45**
- **Critical 4건**: 청구 건 분석 미구현, 보상액 산정 미구현, 보고서 미구현, PRD 75% 누락
- **Major 2건**: 상태 필터 없음, 인터랙션 부족
- **Minor 2건**: 모바일 테이블 UX, 차트 데이터 정적

#### Round 1 (Generator, Haiku, max-turns=8)
- **전략**: 기존 파일 수정이 아닌 **v2.html로 전체 재생성** (Approach Shift)
- **실행 시간**: ~180초
- **산출물**: v2.html (793줄, ~30KB)
- **구현 범위**: 4개 탭 전체 구현 (대시보드/분석/보상액/보고서)

#### Round 1 → Discriminator (Haiku, max-turns=5)
- **판정**: `MINOR_FIX` / quality_score: **~0.72**
- **잔여 이슈 9건** (Critical 0, Major 3, Minor 6):
  - AI 자동 분류 로직 미구현 (수동 드롭다운만)
  - 보상액 항목이 PRD와 불일치 (수리비/휴차료 vs 치료비/위자료/휴업손해)
  - AI 추천 vs 기존 기준 비교표 불완전
  - 보고서 양식 분류가 PRD와 다름
  - 텍스트 오타, 필터 초기화, 판례 동적 연동 등

### 11.3 핵심 발견사항

#### ✅ 검증된 것 (계획 유지)

| 항목 | 결과 |
|------|------|
| `--print --dangerously-skip-permissions` 동작 | ✅ 비대화형 자동 승인 모드 정상 |
| 구독 인증 기반 CLI 실행 | ✅ 별도 API 키 없이 실행됨 |
| 단일 HTML 생성 품질 | ✅ TailwindCSS + Chart.js 조합으로 완성도 높은 UI |
| O-G-D 루프 시뮬레이션 | ✅ Generator→Discriminator→Generator 피드백 루프 동작 확인 |
| Haiku 모델 충분성 | ✅ 코드 생성 품질 양호, Sonnet 대비 속도 우위 |

#### ⚠️ 계획 수정 필요

| 항목 | 발견 | 수정안 |
|------|------|--------|
| **파일 수정 vs 재생성** | 기존 파일 Edit이 대규모 변경 시 타임아웃 발생 | Generator Round N은 **항상 새 파일로 전체 재생성** (incremental edit 금지) |
| **max-turns 설정** | 5턴으로는 대시보드만, 8턴으로 4탭 전체 가능 | 기본 `--max-turns 15` (여유 확보), 복잡한 PRD는 20 |
| **모델 선택** | Haiku가 코드 생성에 충분, Sonnet은 느리지만 더 정확 | Generator: **Haiku** (속도), Discriminator: **Haiku** (비용), 최종 Round만 **Sonnet** (품질) |
| **PRD 정합성** | PRD 텍스트를 그대로 주면 세부 항목 누락 발생 | **PRD → 기능 체크리스트 전처리** 단계 추가 (Orchestrator가 수행) |
| **실행 시간** | Round당 90~180초, 전체 O-G-D(3라운드) 예상: 8~15분 | 목표 10분 이내 달성 가능 확인 |
| **Approach Shift 전략** | 기존 파일 수정 실패 시 전체 재생성이 더 효과적 | Orchestrator의 `strategy: approach_shift`에서 **새 파일 생성** 기본값 채택 |

#### ❌ 새로 발견된 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| CLI subprocess 타임아웃 | 긴 작업(>4분) 시 프로세스 강제 종료 | 서버에서는 timeout 300초+ 설정, 단계 분할(탭별 생성) |
| Discriminator 컨텍스트 한계 | 큰 HTML 파일 분석 시 max-turns 소진 | Discriminator에 **PRD 체크리스트** + **HTML 주요 구조만** 전달 |
| Round 간 컨텍스트 단절 | 각 CLI 실행이 독립 세션 — 이전 피드백 기억 안 함 | 피드백을 **파일로 저장** → 다음 Generator 프롬프트에 포함 |

### 11.4 O-G-D 실전 적용 설계 (Dry-Run 기반 수정)

Dry-run 결과를 반영한 **실전 O-G-D 파이프라인**:

```
┌─── Orchestrator (Node.js 프로세스) ──────────────────────┐
���                                                          │
│  1. PRD 수신                                              │
│  2. PRD → 기능 체크리스트 변환 (전처리)                    │
│     예: "☐ 대시보드: KPI 3개, 차트, 필터, 테이블"          │
│         "☐ 분석: 입력폼, 과실게이지, 판례3건"              │
│  3. CLAUDE.md + checklist.md + PRD.md → 작업 디렉토리      │
│                                                          │
│  ┌─── Round Loop (max 3) ─────────────────────────────┐  │
│  │                                                     │  │
│  │  Generator (claude --print, Haiku/Sonnet):          │  │
│  │    - Round 0: 전체 생성 (max-turns 15)              │  │
│  │    - Round N: 새 파일로 전체 재생성 (Edit 금지)      │  │
│  │    - 입력: PRD + checklist + feedback_{N-1}.md      │  │
│  │    - 출력: prototype_v{N}.html                      │  │
│  │                                                     │  │
│  │  Discriminator (claude --print, Haiku):              │  │
│  │    - 입력: prototype_v{N}.html + checklist.md       │  │
│  │    - 출력: feedback_{N}.md (verdict + findings[])   │  │
│  │    - 체크리스트 항목별 Pass/Fail 판정               │  │
│  │                                                     │  │
│  │  수렴 판정:                                          │  │
│  │    - PASS (quality ≥ 0.85) → 탈출                   │  │
│  │    - MINOR_FIX → targeted fix (재생성)               │  │
│  │    - MAJOR_ISSUE → approach shift (재생성)           │  │
│  │    - Round ≥ 3 → 최고 점수 산출물 채택               │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  4. 최종 산출물 → 빌드 검증 → 배포                        │
│  5. 결과 콜백 + 알림                                      │
└──────────────────────────────────────────────────────────┘
```

### 11.5 예상 비용/시간 (Dry-Run 실측 기반)

| 항목 | Round 0 | Round 1 | Round 2 (예상) | 합계 |
|------|---------|---------|----------------|------|
| Generator 시간 | 90초 | 180초 | 180초 | ~7.5분 |
| Discriminator 시간 | 60초 | 60초 | 60초 | ~3분 |
| **라운드 합계** | 2.5분 | 4분 | 4분 | **~10.5분** |
| API 비용 | $0 | $0 | $0 | **$0** |

→ **목표(≤10분)에 근접**, 서버 환경에서는 타임아웃 없이 더 안정적일 것으로 예상.

---

## 부록 A: CLAUDE.md 템플릿 (Prototype 프로젝트용)

```markdown
# Prototype Project — {projectName}

## 목적
이 프로젝트는 Foundry-X에서 자동 생성된 사업 아이템 데모 Prototype입니다.
PRD.md 파일에 정의된 사업 아이템을 시각적으로 보여주는 인터랙티브 데모를 만드세요.

## 기술 스택 (변경 금지)
- React 18 + TypeScript
- Vite 6
- TailwindCSS 3 + shadcn/ui
- React Router 7

## 디자인 가이드
- kt ds 브랜드 컬러: #E4002B (주), #1A1A1A (보조)
- 폰트: Pretendard
- 모바일 반응형 필수 (breakpoint: 768px)
- 다크모드 불필요

## 생성 규칙
1. PRD.md를 먼저 읽고 핵심 기능/화면을 파악하세요
2. 3~5개 주요 페이지를 구성하세요
3. 목�� 데이터는 현실적으로 (한국어, 실제 업무 시나리오)
4. 모든 코드는 src/ 하위에 작��
5. 완성 후 반드시 `npm run build` 실행하여 빌드 성공 확인
6. 빌드 실패 시 에러를 읽고 수정 후 재빌드

## 빌드 명령
npm install && npm run build
```

## 부록 B: 기존 로드맵과의 정합

| 기존 계획 (AX-BD-Process-Alignment-Plan) | 본 문서 제안 | 변경 사항 |
|------------------------------------------|-------------|-----------|
| F278: Sprint 104 (Phase 10-B 마지막) | Sprint 99~103 (Phase A~C) | **4 Sprint 앞당김** — Prototype이 핵심 기능이므로 우선순위 상향 |
| O-G-D 루프: Sprint 109~110 (Phase 10-D) | Sprint 104~106 (Phase D) | **3 Sprint 앞당김** — Foundation 완료 후 바로 품질 루프 도입 |
| 간단한 HTML 시작 | React SPA + Cloudflare Pages | **스코프 확장** — 템���릿 기반으로 초기부터 완성도 높은 산출물 |