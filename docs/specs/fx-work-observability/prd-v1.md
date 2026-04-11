# fx-work-observability PRD

**버전:** v1
**날짜:** 2026-04-12
**작성자:** AX BD팀 (S260 `/ax:req-interview` dogfood)
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
S258~S260 dogfood chain 에서 드러난 "작업 관찰성 부재" 문제를 해결하기 위해, Walking Skeleton 수준의 4-채널(Web UI + JSON API + CLI + Live feed) Work Management view를 Hotfix 기간(4~8시간) 내에 구축하고, 자연어 입력을 REQ-NNN으로 자동 분류하는 파이프라인을 Claude inline call로 부트스트랩한다.

**배경:**
Foundry-X task orchestrator의 C-track 30+건(C18~C31)이 S258~S260에 걸쳐 실행됐으나, Backlog/요구사항/Task/Sprint/Epic을 한눈에 보는 사람용 view가 부재하여 사용자가 "지금 확인할 수 있는 곳이 없어"라고 호소했다. Phase 32(F501~F508)로 backend 인프라(`scripts/board/*`, `scripts/epic/*`, `/ax:todo`/`/ax:req-manage`/`/ax:gov-retro` skill)는 구축됐지만 **4-layer 단절**(SPEC.md 2000줄, GitHub Projects `read:project` scope 부족, ax skill 온디맨드 CLI 한정, Web UI에 task view 부재)로 observability가 끊겼다.

**목표:**
Walking Skeleton 4개 기능 (M1~M4) 실행 가능 + 사용자가 "아 이제 보인다" 인지 경험.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- SPEC.md가 ground truth이지만 **2000+ 줄 텍스트 1차원 문서** (grep/scroll 수동 필요)
- Phase 32(F501~F508) **backend 인프라는 구축**됐으나 사용자 view layer 부재
- GitHub Projects board 존재 가능성 있으나 `gh auth` `read:project` scope 부족으로 접근 차단 (S260 C25에서 actionable error 추가했지만 refresh는 미실행)
- `/ax:todo`, `/ax:req-manage`, `/ax:gov-retro` ax skill은 **온디맨드 CLI 쿼리** — 대시보드 아님
- Foundry-X Web UI 40+ route 존재하지만 **task/backlog/sprint 전용 페이지 없음** (orchestration.tsx는 Phase 14 agent용)
- 대화 중 사용자 자연어 발화가 **REQ로 자동 등록되지 않음** — Claude가 내부 판단으로 수동 처리
- 4가지 baseline 지표가 아무도 측정하지 않음:
  - 세션당 SPEC.md 수동 grep/scroll 횟수
  - 세션 resume 후 맥락 복원 소요 시간 (분)
  - C-track task당 수동 개입 횟수 (Enter blast, 수동 commit 등)
  - Board UI 부재로 "모르는 채" 진행한 결정 건수

### 2.2 목표 상태 (To-Be)

- 단일 view(4-채널)에서 **Backlog / 요구사항 / Task / Sprint / Epic(Phase)** 통합 표시
- **자연어 입력 → REQ-NNN 자동 분류 파이프라인** (Claude inline classification)
- **4-persona 동심원**(본인 → Claude AI → 미래 팀원 → 보고 대상)이 각자 적합한 채널로 접근
- Walking Skeleton 수준 MVP 4~8시간 내 완성 후 Should Have로 점진 확장

### 2.3 시급성

- **Hotfix** — 다음 dogfood chain 시작 전까지 반드시
- S258~S260 구체적 실패 사례 누적:
  - C25 `board-sync-spec scope 부족` 에러
  - C29 `self-kill` 사고 (daemon phase_cleanup primary sweep으로 master pane %7 소실)
  - C30 `inject bracket paste 대기` (Enter blast 수동 구제 필요)
- 혼자 개발 모드에서 세션 경계 넘나들 때 맥락 복원이 매번 비싼 cost
- 팀/외부 공유 시 "보여줄 것 없음"
- 미래 팀 확장에 대비한 선행 투자

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자 (4-동심원)

| 구분 | 설명 | 주요 니즈 |
|------|------|----------|
| 1차: 본인 (primary) | 해월사 현재 Master 운영자, Claude Code + tmux fx35a 원격 운용 | Resume 후 맥락 즉시 복원, 작업 위치 잊어버림 방지 |
| 2차: Claude AI | 이 대화의 AI 에이전트, Bash/Read로 상태 파악 | JSON 구조화 데이터, 짧은 context (~2000 토큰), 이벤트 기반 streaming |
| 3차: 미래 팀원 | 다중 협업 확장 시 개발자/PM | Web UI 직관적 접근, 상태 변경 UI |
| 4차: 보고 대상 | 임원/고객/투자자 | 진행 상황 URL, 랜딩 섹션 |

### 3.2 이해관계자

혼자 개발 모드 — 저항자 / 외부 승인자 / 컴플라이언스 이해관계자 **없음**. 향후 팀 확장 시 재평가 대상.

### 3.3 사용 환경 (4-채널)

| 채널 | 대상 persona | 우선순위 |
|------|-------------|----------|
| Web UI (`fx.minu.best/work-management`) | 본인, 팀원, 보고 대상 | P0 (M2) |
| JSON API endpoint (`/api/work/*`) | Claude AI, 자동화 스크립트 | P0 (M1) |
| CLI 쿼리 (`fx backlog` 또는 기존 `scripts/board/*`) | 본인, Claude 세션 내 Bash | P0 (M3) |
| Terminal live feed (Monitor tail + daemon log) | 본인 (모니터링 중), Claude | P0 (기 구축, M3에서 재사용) |

---

## 4. 기능 범위

### 4.1 Must Have — Walking Skeleton 수준 (각각 "최소 동작 demo 가능" 선)

| # | 기능 | Walking Skeleton 정의 | 우선순위 |
|---|------|----------------------|----------|
| **M1** | **Backlog 집계 (Aggregator)** | `SPEC.md §5~§6 파서` + `/tmp/task-signals/*.log` + `git log` + `gh pr list`를 하나의 JSON 객체로 집계. top-level count(backlog N / in_progress M / done_today K) + 항목 배열. 단일 API endpoint `/api/work/snapshot` 응답. | P0 |
| **M2** | **시각화 (Kanban/테이블)** | Web UI `/work-management` route 신규. **static HTML table** with 4 컬럼(PLANNED / IN_PROGRESS / DONE / CLOSED_EMPTY). Drag/drop 없음. 5초 polling으로 M1 JSON fetch. | P0 |
| **M3** | **Context 복원** | Resume 전용 섹션 — 최근 10 커밋 + 현재 WT 상태(worktree list) + daemon log 최근 5 이벤트 + "다음 가능 action" 후보 리스트. 한 화면에 표시. | P0 |
| **M4** | **자연어 → REQ 파이프라인** | 사용자 자연어 한 줄 입력 → Claude API(Sonnet) inline call → track(F/B/C/X) + priority(P0~P3) + 요약 title 반환 → task-start.sh 호출 준비 (자동 실행은 Should Have). | P0 |

### 4.2 Should Have — 정공 버전 (S261+)

- **M1.a** Aggregator에 burndown / velocity chart (시간축)
- **M2.a** Kanban drag-and-drop, 상태 변경 UI
- **M3.a** Baseline 지표 자동 측정 (grep 횟수, resume 시간 등)
- **M4.a** 자연어 분류 후 자동으로 task-start.sh 호출 + 실패 시 interview 모드 전환
- **Real-time WebSocket push** — Monitor #1 이벤트를 Web UI로 stream
- **/ax:req-interview skill auto-invoke** — 이 대화에서 수동 호출한 skill을 자연어 trigger로 자동 호출
- **RBAC / multi-tenant** — 팀 확장 시점

### 4.3 Out of Scope (Walking Skeleton 단계)

- ❌ **편집 / CRUD UI** — Web UI는 read-only만. 상태 변경은 CLI 또는 SPEC.md Edit.
- ❌ **RBAC / multi-tenant / 인증** — 혼자 개발 모드 가정. `everyone is admin` 스탠스.

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|---------|---------|
| GitHub API (Issues / Projects / Milestones) | `gh` CLI 서브프로세스 | 필수 (M1) |
| SPEC.md 파서 | 파일 read + regex 파싱 | 필수 (M1) |
| `/tmp/task-signals/*.log` | 파일 read / tail | 필수 (M1, M3) |
| daemon retry queue (`/tmp/task-retry/*.json`) | 파일 read | 필수 (M3) |
| Claude API (Anthropic Sonnet) | `.dev.vars` `ANTHROPIC_API_KEY` inline call | M4 용 |
| Cloudflare Workers + D1 | 기존 `packages/api` | 선택 (새 테이블 0126 허용) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI) — Walking Skeleton 단계

| 지표 | 현재값 | Walking Skeleton 목표 | 측정 방법 |
|------|--------|----------------------|-----------|
| M1 aggregator 응답 | N/A | JSON endpoint 200 응답 + 최소 1 필드 포함 | `curl .../api/work/snapshot | jq` |
| M2 Kanban 렌더 | 없음 | Web UI `/work-management` 접속 시 4 컬럼 DOM 존재 | 브라우저 접속 (또는 Playwright e2e 1건) |
| M3 Context 섹션 | 없음 | "최근 N 커밋 + WT 상태 + daemon 이벤트" 한 화면에 렌더 | 브라우저 접속 |
| M4 분류 결과 | 없음 | 샘플 1건 이상 `{track, priority, title}` 반환 | CLI 또는 API call 1회 |

### 5.2 MVP 최소 기준

- [ ] M1 aggregator 가 JSON 응답 제공 (형식 어떻든 상관없음)
- [ ] M2 Kanban 또는 요약 테이블이 Web UI에 렌더
- [ ] M3 Context 섹션이 "지금 상황"을 보여줌
- [ ] M4 분류 파이프라인이 최소 1 샘플 처리 (Claude API 또는 regex fallback)
- [ ] **End-to-end 시나리오 S1 완주** (§5.2.1 참조)
- [ ] **주관**: 다음 resume 후 사용자가 "아 이제 보인다" 인지 확인

### 5.2.1 End-to-end 시나리오 S1 — "자연어 한 줄 → 뷰 반영" (Round 1 ChatGPT flaw high 반영)

Phase 2 Round 1에서 ChatGPT가 지적한 severity=high flaw("성공 기준이 주관적 인지로 끝남")를 해소하기 위한 구체적 실행 시나리오. 이 시나리오 1개가 한 번이라도 end-to-end 돌면 Walking Skeleton 성공으로 판정한다.

**시나리오**:

1. 사용자가 Claude 세션에 자연어 한 줄 입력 — 예: `"작업 관찰성 view에 burndown chart 추가 필요"`
2. **M4** 분류 파이프라인이 `.dev.vars ANTHROPIC_API_KEY`로 Claude Sonnet inline call → `{track: "F", priority: "P1", title: "burndown chart 추가", req_code: "FX-REQ-NNN"}` 반환
3. 분류 결과 CLI 출력 + 사용자 확인 프롬프트 (자동 `task-start.sh` 호출은 Should Have M4.a로 이관)
4. 사용자 승인 → `bash scripts/task/task-start.sh F "burndown chart 추가" "..."` 실행 → SPEC.md 새 F-item 등록
5. **M1** aggregator 재실행 (polling 주기 후) → 새 F-item 포함된 JSON snapshot 생성
6. **M2** Web UI `/work-management` 새로고침 → `PLANNED` 컬럼에 새 row 표시
7. **M3** Context 섹션에 "최근 이벤트: F-NNN 신규 등록" 로그 표시

**통과 기준**:
- 7단계 중 5단계 이상 자동 진행 (사용자 개입은 step 3 승인만 허용)
- 각 단계 타임스탬프 기록 (audit trail)
- 실패 시 어느 M이 block 됐는지 명확히 식별

**이 시나리오 실패 시 fallback** (§5.3 정책에 연결):
- M4 LLM 실패 → regex fallback으로 step 2 수행 (정확도 낮아도 진행)
- M2 Web UI block → M1 JSON API `curl` 호출로 step 6 대체 ("화면에 보임" 대신 "JSON에 나타남")

**타이밍 측정** (baseline 지표와 연결):
- step 1 → step 7 전체 소요 시간 1분 이내 (목표)
- step 2 M4 inline call 단독 ≤ 10초
- step 5 M1 aggregator refresh ≤ 3초

### 5.3 실패/중단 조건 — Fallback 우선

**중단보다 대체 경로 선호:**

1. **M4 LLM 분류가 Claude API 에러/비용/조상함(context overflow) 사유로 막히면**
    → regex fallback으로 축소 (`C-track $` 감지 등 heuristic 70% 커버)
2. **packages/web 빌드/테스트 반복 실패 시**
    → API+D1만 완성, Web UI는 다음 세션으로 후퇴 (M1/M3/M4는 JSON endpoint로 동작 확인)
3. (위 두 fallback 실행 후에도) **4~8시간 내 M1 한 가지조차 동작 불가** → 중단, MEMORY에 실패 기록

### 5.4 비기능 요구사항 (Walking Skeleton 단계)

- **성능**: M1 aggregator 응답 ≤ 1s (polling 간격 5~10s 허용)
- **안정성**: Web UI 500 에러 없음 (빈 상태는 정상 렌더, 에러는 UI에 표시)
- **AI reader 친화성**: M1 JSON이 Claude 2000 토큰 이내로 요약 가능해야 함 (field 이름은 영문 key + 한글 value 허용)

---

## 6. 제약 조건

### 6.1 일정

- **목표 완료**: 4~8시간 (1 세션 온전)
- **마일스톤**: M1 → M2 → M3 → M4 순차 (각 1~2시간), 각 M 완료 시 사용자 리뷰 포인트

### 6.2 기술 스택

- **프론트엔드**: 기존 `packages/web` (Vite 8 + React 18 + React Router 7 + Zustand)
- **백엔드**: 기존 `packages/api` (Hono + Cloudflare Workers)
- **공용 타입**: `packages/shared` (새 `work-observability/` 네임스페이스 허용)
- **신규 package 허용**: `packages/work-observability/` 가능 (단 기존 구조 우선)
- **D1**: 새 테이블 `0126_work_observability.sql` 허용 (baseline 지표 캐시)
- **Claude API inline 호출 허용**: `.dev.vars` `ANTHROPIC_API_KEY` 사용, Sonnet 4.x 모델

### 6.3 인력/예산

- **투입 인원**: 사용자 본인 + Claude Code 세션 (Opus 4.6)
- **Claude API 비용**: M4 분류 호출당 ~$0.01 (Sonnet 기준), 하루 ~$1 미만 예상
- **Cloudflare Workers**: 기존 무료 tier 내
- **시간**: 4~8시간 1 세션

### 6.4 컴플라이언스

- **KT DS 내부 정책**: 해당 없음 (혼자 개발)
- **보안**: Out-of-scope (혼자 모드, RBAC 제외)
- **외부 규제**: 없음

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | GitHub Projects board 실존 여부 확인 필요 (`gh auth refresh -s read:project,project` 수동 실행 필요) | 사용자 | Hotfix 시작 전 |
| 2 | Walking Skeleton 완료 후 Should Have 우선순위 재평가 (특히 M4 auto-invoke) | AX BD팀 | 다음 세션 |
| 3 | M4 자연어 분류 정확도 측정 방법 (사람 검증? A/B 샘플?) | [미정] | 정공 버전 |
| 4 | 이 PRD 자체를 SPEC.md F-item으로 등록 시 Phase 33으로 분류할지, Phase 32-F로 붙일지 결정 | 사용자 | Phase 6(SPEC 등록) 단계 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-12 | 최초 작성 (`/ax:req-interview` dogfood, S260) | - |

---

*이 문서는 `/ax:req-interview` 스킬에 의해 자동 생성되었다. interview-log.md에 원본 Q&A 기록이 있다.*
