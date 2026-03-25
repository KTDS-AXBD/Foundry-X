---
code: FX-PLAN-062
title: "Sprint 62 — F199 BMCAgent 초안 자동 생성 + F200 BMC 버전 히스토리"
version: 1.0
status: Active
category: PLAN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 62
features: [F199, F200]
req: [FX-REQ-AX-004, FX-REQ-AX-002]
prd: docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md
depends-on: Sprint 61 (F197 BMC CRUD + F198 아이디어 등록)
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | BMC 캔버스를 처음부터 수작업으로 작성하면 시간이 오래 걸리고 블록 간 일관성이 부족하며, BMC 변경 이력을 추적할 수 없어 이전 버전으로 돌아갈 수 없음 |
| **Solution** | BMCAgent가 아이디어 한 줄 입력으로 9개 블록 초안을 15초 이내에 자동 생성하고, Git 커밋 기반 버전 히스토리로 모든 변경을 추적·복원 가능하게 함 |
| **Function UX Effect** | 아이디어 입력 → BMCAgent 초안 생성(15초) → 미리보기 → "에디터에 적용" → 수정 → 저장 → 버전 히스토리에서 이전 버전 비교·복원 |
| **Core Value** | AI 에이전트가 초안을 만들고 사람이 확정하는 Foundry-X 철학 구현. PromptGateway 마스킹으로 KT DS 보안 정책 준수하면서 외부 LLM 활용 |

| 항목 | 값 |
|------|-----|
| Feature | F199 BMCAgent 초안 자동 생성 + F200 BMC 버전 히스토리 |
| Sprint | 62 |
| PRD | FX-PLAN-AX-BD-001 v1.4 (Phase 1 — Ideation MVP) |
| 선행 조건 | Sprint 61 완료 (F197 BMC 테이블/라우트 + F198 아이디어) |
| Worker Plan | W1:F199(BMCAgent) W2:F200(버전히스토리) — 파일 겹침 없음 |
| 예상 산출물 | 2 services, 1 route 확장(ax-bd), 1 D1 migration, 2 schemas, 6+ endpoints, 1+ Web 컴포넌트, 40+ tests |

---

## 1. 배경 및 목표

### 1.1 Phase 5d — AX BD Ideation MVP (Sprint 62)

Sprint 61에서 BMC 캔버스 CRUD와 아이디어 관리 기반이 완성되면, Sprint 62에서는 **AI 에이전트를 통한 BMC 초안 자동 생성**과 **Git 기반 버전 관리**를 추가해요.

```
Phase 5d Sprint 로드맵
┌──────────────────────┐
│ Sprint 61 ✅          │  F197 BMC CRUD + F198 아이디어 등록
│  ↓ (기반 완성)        │
│ Sprint 62 (현재)      │  F199 BMCAgent + F200 버전히스토리
│  ↓ (에이전트 준비)     │
│ Sprint 63             │  F201 블록 인사이트 + F202 InsightAgent
│  ↓                    │
│ Sprint 64 (병렬 가능)  │  F203 아이디어-BMC 연결 + F204 댓글
└──────────────────────┘
```

### 1.2 Sprint 62 목표

1. **F199**: BMCAgent — 아이디어 한 줄로 9개 블록 초안 생성 (PromptGateway 마스킹 필수)
2. **F200**: BMC 버전 히스토리 — Git 커밋 단위 변경 이력 조회 + 특정 버전 복원

### 1.3 2-Worker 병렬 전략

| Worker | F-item | 범위 | 파일 |
|--------|--------|------|------|
| W1 | F199 | BMCAgent 서비스 + 라우트 + 테스트 | `services/bmc-agent.ts`, `routes/ax-bd.ts` (generate/suggest 엔드포인트), `schemas/bmc-agent.ts` |
| W2 | F200 | 버전히스토리 서비스 + 라우트 + Web UI | `services/bmc-history.ts`, `routes/ax-bd.ts` (history 엔드포인트), Web 컴포넌트 |

> ⚠️ `routes/ax-bd.ts` 파일을 양쪽이 수정하므로, **W1은 `/bmc/generate` 관련만, W2는 `/bmc/:id/history` 관련만** 수정하도록 Positive File Constraint를 세분화해야 해요. 또는 W2의 라우트를 별도 파일(`routes/ax-bd-history.ts`)로 분리.

---

## 2. F199 — BMCAgent 초안 자동 생성 (FX-REQ-AX-004, P0)

### 2.1 에이전트 스펙

| 항목 | 값 |
|------|-----|
| 이름 | `BMCAgent` |
| 트리거 | `POST /api/ax-bd/bmc/generate` |
| 입력 | `{ idea: string, context?: string }` (최대 500자) |
| 출력 | 9개 블록 텍스트 (각 블록 최대 200자) |
| 모델 | `claude-sonnet-4-6` (Foundry-X 모델 라우터 경유) |
| Rate Limit | 사용자당 분당 5회 |
| 보안 | PromptGateway(F149) 경유 마스킹 필수 |
| 응답 시간 목표 | < 15초 |

### 2.2 구현 계획

**Backend:**

1. `packages/api/src/services/bmc-agent.ts` — BMCAgent 서비스
   - `generateDraft(idea: string, context?: string): Promise<BmcDraftResult>`
   - 9개 블록 키: customerSegments, valuePropositions, channels, customerRelationships, revenueStreams, keyResources, keyActivities, keyPartnerships, costStructure
   - PromptGateway 경유: `promptGateway.process(prompt)` → 마스킹된 프롬프트 → model-router → 응답 → 언마스킹
   - `X-Gateway-Processed: true` 헤더 검증 (없으면 500 거부)
   - Rate Limit: `RateLimiterService` 재사용 (분당 5회)

2. `packages/api/src/schemas/bmc-agent.ts` — Zod 스키마
   - `GenerateBmcDraftSchema`: `{ idea: z.string().max(500), context: z.string().max(1000).optional() }`
   - `BmcDraftResultSchema`: 9개 블록 필드

3. `packages/api/src/routes/ax-bd.ts` — 라우트 확장 (Sprint 61 기반)
   - `POST /bmc/generate` — 초안 생성
   - Response: `{ draft: { [block]: string }, processingTimeMs: number }`

**테스트:**
- BMCAgent 서비스 단위 테스트 (mock LLM 응답)
- PromptGateway 마스킹 검증 테스트
- X-Gateway-Processed 헤더 거부 테스트
- Rate Limit 초과 테스트
- 라우트 통합 테스트

### 2.3 보안: PromptGateway 마스킹 파이프라인

```
사용자 입력 (idea)
  ↓
PromptGateway.process()
  ↓ (KT DS 고유명사/조직명/식별자 마스킹)
마스킹된 프롬프트 + X-Gateway-Processed 헤더
  ↓
ModelRouter → claude-sonnet-4-6
  ↓
응답 수신
  ↓
PromptGateway.unmask() (마스킹 복원)
  ↓
9개 블록 초안 반환
```

### 2.4 AC (PRD 기준)

```
Given BD 애널리스트가 아이디어 입력 필드에 "AI 기반 KT DS 내부 IT 자산 최적화 서비스"를 입력하고 "초안 생성" 버튼을 클릭했을 때
When BMCAgent가 응답을 반환하면 (목표 응답시간 < 15초)
Then 9개 블록 모두에 초안 텍스트가 채워진 미리보기가 표시된다.
  And "에디터에 적용" 버튼이 활성화된다.
  And 에디터에 적용하기 전까지 Git에 아무것도 저장되지 않는다.

Given BMCAgent 응답이 15초 초과 또는 오류인 경우
Then "잠시 후 다시 시도하세요" 메시지와 함께 에디터는 빈 상태로 유지된다.

Given BMCAgent가 외부 LLM 호출 직전
Then 요청 페이로드가 PromptGatewayService를 경유했음을 나타내는
  X-Gateway-Processed: true 헤더가 포함되어 있어야 한다.
  헤더가 없으면 LLM 라우터가 요청을 거부하고 500을 반환한다.
```

### 2.5 Match Rate 목표: 92%

---

## 3. F200 — BMC 버전 히스토리 조회 (FX-REQ-AX-002, P1)

### 3.1 구현 계획

**Backend:**

1. `packages/api/src/services/bmc-history.ts` — 버전 히스토리 서비스
   - `getHistory(bmcId: string): Promise<BmcVersion[]>` — Git 커밋 이력 조회
   - `getVersion(bmcId: string, commitSha: string): Promise<BmcSnapshot>` — 특정 버전 조회
   - `restoreVersion(bmcId: string, commitSha: string): Promise<BmcRestoreResult>` — 버전 복원 (새 커밋 생성)
   - D1 `ax_bmc_versions` 테이블: 커밋 해시, 작성자, 메시지, 타임스탬프 캐시 (Git이 SSOT, D1은 빠른 조회용)

2. `packages/api/src/db/migrations/0047_bmc_versions.sql` (또는 적절한 번호)
   ```sql
   CREATE TABLE IF NOT EXISTS ax_bmc_versions (
     id TEXT PRIMARY KEY,
     bmc_id TEXT NOT NULL REFERENCES ax_bmcs(id),
     commit_sha TEXT NOT NULL,
     author_id TEXT NOT NULL,
     message TEXT,
     snapshot JSON,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     UNIQUE(bmc_id, commit_sha)
   );
   CREATE INDEX idx_bmc_versions_bmc ON ax_bmc_versions(bmc_id);
   ```

3. `packages/api/src/routes/ax-bd.ts` — 라우트 확장
   - `GET /bmc/:id/history` — 커밋 이력 목록
   - `GET /bmc/:id/history/:commitSha` — 특정 버전 스냅샷
   - `POST /bmc/:id/history/:commitSha/restore` — 버전 복원

**Frontend (Web):**

4. `packages/web/src/components/feature/BmcVersionHistory.tsx`
   - 커밋 목록 (날짜, 작성자, 메시지)
   - 버전 선택 → 미리보기
   - "이 버전으로 복원" 버튼 + 확인 다이얼로그

**테스트:**
- 히스토리 목록 조회 테스트
- 특정 버전 스냅샷 조회 테스트
- 버전 복원 + 새 커밋 생성 테스트
- 히스토리 없는 BMC(신규) 테스트
- Web 컴포넌트 렌더링 테스트

### 3.2 AC (PRD 기준)

```
Given BMC 상세 페이지에서 "버전 히스토리" 탭을 열었을 때
When Git 커밋 이력이 있으면
Then 커밋 날짜·작성자·메시지 목록이 최신순으로 표시된다.

Given 특정 버전을 선택하고 "이 버전으로 복원"을 클릭했을 때
When 확인 다이얼로그에서 승인하면
Then 해당 버전 내용이 에디터에 불러와지고, 저장 시 새 커밋이 생성된다.

Given BMC 상세 페이지에서 "버전 히스토리" 탭을 열었을 때
When Git 커밋 이력이 없으면
Then "아직 저장된 버전이 없습니다" 안내 메시지가 표시된다.
```

### 3.3 Match Rate 목표: 93%

---

## 4. 구현 순서

### Phase A: Backend (W1+W2 병렬)

| # | W1 (F199 BMCAgent) | W2 (F200 버전히스토리) |
|---|-------------------|---------------------|
| 1 | `bmc-agent.ts` 서비스 (PromptGateway 연동) | `bmc-history.ts` 서비스 |
| 2 | `bmc-agent.ts` Zod 스키마 | D1 migration (`ax_bmc_versions`) |
| 3 | `ax-bd.ts` generate 라우트 추가 | `ax-bd.ts` history 라우트 추가 |
| 4 | BMCAgent 테스트 (15개+) | 히스토리 테스트 (10개+) |

### Phase B: Frontend (W2 담당)

| # | 작업 |
|---|------|
| 5 | `BmcVersionHistory.tsx` — 히스토리 탭 UI |
| 6 | api-client 메서드 추가 (history, restore) |
| 7 | Web 컴포넌트 테스트 |

> BMCAgent의 프론트엔드(미리보기 + "에디터에 적용" 버튼)는 Sprint 61의 BMC 에디터 UI에 통합될 수 있으므로, Sprint 61 구현 상태에 따라 W1이 FE도 담당하거나 리더가 통합.

---

## 5. 기존 코드 의존성

| 서비스 | 경로 | 용도 |
|--------|------|------|
| `PromptGatewayService` | `services/prompt-gateway.ts` | F149, 마스킹/언마스킹 |
| `ModelRouterService` | `services/model-router.ts` | claude-sonnet-4-6 라우팅 |
| `AgentRunnerService` | `services/agent-runner.ts` | 에이전트 실행 래퍼 |
| Sprint 61 ax-bd 라우트 | `routes/ax-bd.ts` | BMC CRUD 기반 |
| Sprint 61 D1 테이블 | `ax_bmcs`, `ax_bmc_blocks` | BMC 데이터 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|:------:|------|
| PromptGateway 마스킹 품질 | 중 | F149 기존 테스트 + BMCAgent 전용 마스킹 테스트 추가 |
| LLM 응답 시간 > 15초 | 중 | 타임아웃 15초 설정 + 에러 핸들링 + 재시도 안내 |
| BMCAgent 응답 품질 불균일 | 낮 | 시스템 프롬프트 튜닝 + 블록별 길이 제한 (200자) |
| ax-bd.ts 병렬 수정 충돌 | 낮 | Worker별 라우트 섹션 분리 또는 File Guard |

---

## 7. 검증 기준

| 항목 | 기준 |
|------|------|
| typecheck | 에러 0건 (기존 대비 증가 없음) |
| lint | 에러 0건 |
| API tests | 전부 통과 + 신규 25개+ |
| Web tests | 전부 통과 + 신규 5개+ |
| Match Rate | F199 ≥ 92%, F200 ≥ 93% |
| 보안 | X-Gateway-Processed 헤더 검증 테스트 통과 |
