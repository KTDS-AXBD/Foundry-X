# Foundry-X PRD

**버전:** v3 (Round 1 다중 AI 검토 반영)
**날짜:** 2026-03-16
**작성자:** AX BD팀
**상태:** 🔄 검토 반영 완료, 착수 판단 대기
**태그라인:** 동료와 에이전트가 함께 만드는 곳

---

## v2 → v3 변경 요약

| # | 변경 | 지적 출처 | 핵심 |
|---|------|----------|------|
| 1 | MVP 범위 70% 축소 | Grok, Gemini, ChatGPT | CLI 3개 커맨드만. 웹/API/오케스트레이션 전부 Phase 2로 |
| 2 | 멀티리포 → 모노리포 시작 | Gemini, ChatGPT | 안정화 후 분리 |
| 3 | Plumb 2트랙 전략 | Gemini, Grok, Claude | Track A(래퍼) 즉시 + Track B(자체 구현) 대기 |
| 4 | 하드 마일스톤 도입 | Grok | 3개월 Go/Kill 판정 |
| 5 | 현실 지표 전환 | Grok | CLI 호출 수, --no-verify 비율 등 |
| 6 | KT DS 특화 시나리오 | Gemini | SM 변경 요청(SR) 처리 자동화 |
| 7 | 에이전트 충돌 전략 확정 | Claude, ChatGPT | 브랜치 기반 격리 |
| 8 | Git↔DB 정합성 전략 | Claude | Git 우선, DB 비동기 동기화 |
| 9 | NL→Spec 변환 계층 명시 | ChatGPT | Phase 2, human-in-the-loop 필수 |
| 10 | SDD↔API 통신 계약 | Claude | Phase 1은 직접 호출, Phase 2에서 OpenAPI |

---

## 1. 요약

**한 줄 정의:**
Foundry-X는 사람과 AI 에이전트가 동등한 팀원으로서 함께 소프트웨어를 만드는 조직 협업 플랫폼이다.

**배경:**
AI 코딩 에이전트의 역량이 급격히 발전하면서, 엔지니어의 역할이 "코드 작성"에서 "환경 설계 + 의도 명시 + 피드백 루프 구축"으로 전환되고 있다. 그러나 현재 조직에는 이 전환을 체계적으로 수행할 플랫폼이 없다. 요구사항은 채팅과 문서에 흩어져 있고, 에이전트가 만든 결정사항은 명세에 반영되지 않으며, 명세와 코드와 테스트는 시간이 지나면서 동기화를 잃는다.

**목표:**
하네스 엔지니어링과 Spec-Driven Development Triangle을 기반으로, 명세↔코드↔테스트가 상시 동기화되는 환경을 제공한다. 비기술자도 자연어로 참여할 수 있으며, AI 에이전트가 조직의 동료로서 병렬로 작업을 수행한다.

---

## 2. Contacts

| 역할 | 담당 | 비고 |
|------|------|------|
| Product Owner | AX BD팀 | 요구사항 정의, 우선순위 결정 |
| Architect | AX BD팀 | 하네스 설계, 기술 결정 |
| Development | AX BD팀 + 외부 파트너/SI | 구현 |
| Stakeholder | KT DS 내부 팀 + 외부 고객사 | 사용자 피드백 |

---

## 3. Background

### 왜 지금인가?

하네스 엔지니어링의 등장이 이 프로젝트의 배경이다. OpenAI Codex 팀은 사람이 직접 작성한 코드 없이 100만 줄 이상의 프로덕션 소프트웨어를 구축했다. 핵심은 에이전트 자체가 아니라, 에이전트가 안정적으로 일할 수 있는 환경(하네스)이었다.

동시에, Spec-Driven Development가 부상하고 있다. Drew Breunig의 SDD Triangle은 명세, 코드, 테스트 간의 지속적 동기화가 에이전트 시대의 핵심 과제임을 보여준다. GitHub Spec Kit, Kiro(AWS), OpenSpec 등 SDD 도구가 등장하고 있으나, 하네스 엔지니어링과 조직 협업을 결합한 플랫폼은 아직 초기 단계다.

### Discovery-X → AI Foundry → Foundry-X

- **Discovery-X**: 관찰→실험→기록 사이클의 신사업 발굴 플랫폼. "탐색과 발견"의 정신.
- **AI Foundry**: 요구사항→스펙→코드 자동 생성 파이프라인. "구축"의 정신.
- **Foundry-X**: 두 프로젝트의 합류. 탐색하고, 구축하고, 동기화하는 — 그 전 과정을 동료와 에이전트가 함께 수행하는 플랫폼.

### 경쟁 환경 (Gemini 검토 반영)

| 도구 | 핵심 가치 | Foundry-X 차별점 |
|------|----------|-----------------|
| GitHub Spec Kit | 개발자 개인 SDD 워크플로우 | Foundry-X는 조직 단위 협업 + 하네스 |
| Kiro (AWS) | IDE 내 스펙 관리 | Foundry-X는 Git 중심 SSOT + CLI |
| Plumb | SDD Triangle PoC 도구 | Foundry-X는 Plumb을 핵심 엔진으로 확장 |
| Augment Code Intent | 에이전트 오케스트레이션 | Foundry-X는 SDD + 하네스 + 협업 통합 |

**Foundry-X의 독자적 위치:** 코드 생성 도구가 아니라 "스펙과 하네스를 자산화"하는 조직 협업 플랫폼. 개별 개발자 도구와 달리 팀/조직 단위 운영을 전제로 설계.

---

## 4. Objective

### 목표

조직 내에서 사람과 AI 에이전트가 동등한 팀원으로 협업하며, 명세↔코드↔테스트가 항상 동기화된 상태로 소프트웨어를 만들 수 있는 환경을 제공한다.

### 성공 지표 (v3: 현실 측정 가능 지표로 전환)

#### 핵심 KPI

| # | 지표 | 현재 | 목표 | 측정 방법 |
|---|------|------|------|-----------|
| K1 | CLI 주간 호출 횟수 / 사용자 | 0 | 주 10회+ | foundry-x 실행 로그 |
| K2 | `--no-verify` 우회 비율 | N/A | < 20% | Git hook 로그 |
| K3 | sync 후 수동 수정 파일 수 | N/A | 감소 추세 | SDD 리포트 diff |
| K4 | 결정 승인/거부 비율 | N/A | 승인 > 70% | Plumb decisions.jsonl |
| K5 | "기존 방식으로 복귀" 횟수 | N/A | 0건 | 사용자 주간 인터뷰 |

#### 보조 지표 (장기)

| # | 지표 | 목표 | 측정 시점 |
|---|------|------|----------|
| L1 | PoC 구축 시간 단축 | 2~4주 → < 1일 | Phase 3+ |
| L2 | 팀 협업 효율성 | 커뮤니케이션 왕복 50% 감소 | Phase 3+ |
| L3 | 에이전트 신뢰도 | 테스트 통과율 > 90% | Phase 2+ |

### 전략 정렬

KT DS의 AX(AI Transformation) 사업과 직접 연결. **첫 타겟 시나리오: SM 변경 요청(SR) 처리 자동화** — KT DS 내부에서 가장 반복적이고 규모가 큰 업무로, 성공 시 즉시 ROI 입증 가능.

---

## 5. Market Segment(s)

### 주 사용자 세그먼트

| 세그먼트 | 페르소나 | JTBD | 기술 수준 |
|---------|---------|------|-----------|
| 의도 설계자 | PM, 기획자, 영업 | 자연어로 요구사항을 전달하면 의도대로 동작하는 결과물을 받고 싶다 | 비기술자 (Phase 2~) |
| 에이전트 지휘자 | 개발자, 아키텍트 | 에이전트에게 작업을 지시하고, 하네스를 설계하여 안정적 결과를 얻고 싶다 | 기술자 (Phase 1 주 사용자) |
| 검증자 | 아키텍트, QA, 리뷰어 | 명세↔코드↔테스트가 동기화되어 있는지 확인하고, 품질을 보장하고 싶다 | 기술자 |
| AI 에이전트 | Codex, Claude Code 등 | 명확한 컨텍스트와 제약 조건 내에서 코드를 생성하고 테스트를 실행하고 싶다 | N/A (자동화) |

### Phase 1 집중 사용자

**개발자 5명** — CLI를 실제 프로젝트에서 3주 이상 사용하는 것이 Phase 1의 핵심 목표. 비기술자 참여는 Phase 2로 명시적 이관.

---

## 6. Value Proposition(s)

### 에이전트 지휘자 (Phase 1 주 사용자)

- **What before**: 에이전트를 쓰면 코드는 나오지만, 명세와 코드가 점점 어긋남. 에이전트가 내린 결정이 어디에도 기록되지 않음.
- **How**: `foundry-x init`으로 하네스를 구축하면, 매 커밋마다 결정사항이 자동 추출되어 명세에 반영. `foundry-x sync`로 동기화 상태를 즉시 확인.
- **What after**: 명세가 항상 코드와 일치하고, "왜 이 코드가 존재하는가?"에 대한 답이 리포에 있음.
- **Alternatives**: Claude Code/Codex 단독 사용 (명세 드리프트 불가피)

### 의도 설계자 (Phase 2)

- **What before**: 요구사항을 PPT와 구두로 전달하면 의도가 왜곡됨
- **How**: 자연어로 의도를 입력하면 구조화된 명세로 자동 변환, SDD Triangle이 동기화 보장
- **What after**: 내가 말한 것이 그대로 동작하는 프로토타입

---

## 7. Solution

### 7.1 설계 원칙

**"Git이 진실, Foundry-X는 렌즈"**

- 모든 명세, 코드, 테스트, 결정 이력은 **Git 리포에 존재** (SSOT)
- Foundry-X는 이를 읽고, 분석하고, 시각화하고, 동기화를 강제하는 **레이어**
- DB(PostgreSQL)에는 메타데이터만 저장, **Git이 항상 승리** (정합성 충돌 시)
- 에이전트는 Git 리포에 직접 작업하고, Foundry-X는 그 결과를 관찰

### 7.2 핵심 5축

#### 축 1: 하네스 구축
- 리포지토리 구조, 규칙, 린터, CI 설정 등 에이전트가 안정적으로 일할 수 있는 환경
- CLAUDE.md / AGENTS.md / CONSTITUTION.md 관리
- `foundry-x init`으로 표준 하네스 스캐폴딩

#### 축 2: SDD Triangle (Spec-Driven Development Triangle)
- **명세(Spec)**: Markdown으로 관리. Phase 2에서 자연어→Spec 자동 변환 추가
- **코드(Code)**: 에이전트가 명세 기반으로 구현
- **테스트(Test)**: 명세에서 테스트 추적 + 커버리지 분석
- **동기화 메커니즘**: Git pre-commit 훅으로 결정사항 자동 추출 → 명세 업데이트 → 커버리지 갭 보고
- **엔진**: Plumb 기반 (2트랙 전략, 아래 7.5 참조)

#### 축 3: 에이전트 오케스트레이션 (Phase 2)
- Phase 1은 단일 에이전트만 지원
- Phase 2에서 병렬 작업, 충돌 해결, 상태 추적 추가
- **충돌 전략**: 브랜치 기반 격리 — 에이전트별 feature branch → PR → SDD 검증 → merge

#### 축 4: 지식 공유 (SSOT)
- Git 리포 = 단일 진실 공급원
- 에이전트 관점에서 접근할 수 없는 것은 존재하지 않는 것
- Spec/Test/Code 모두 1급 시민

#### 축 5: 협업 워크스페이스 (Phase 2)
- Phase 1은 CLI만
- Phase 2에서 웹 대시보드 추가 (SDD Triangle 시각화, 에이전트 모니터)

### 7.3 시스템 아키텍처 (Phase별)

#### Phase 1: CLI + Plumb (최소 구조)

```
┌─────────────────────────────────────┐
│         개발자 (5명)                 │
│                                      │
│  ┌──────────────┐  ┌─────────────┐  │
│  │ foundry-x    │  │ AI Agent    │  │
│  │ CLI          │  │ (Claude     │  │
│  │ (npm)        │  │  Code 등)   │  │
│  └──────┬───────┘  └──────┬──────┘  │
│         │                  │         │
│         ▼                  ▼         │
│  ┌──────────────────────────────┐   │
│  │     Git Repository (SSOT)    │   │
│  │  specs/ code/ tests/ .plumb/ │   │
│  └──────────────┬───────────────┘   │
│                 │                    │
│         ┌───────▼────────┐          │
│         │ Plumb Engine   │          │
│         │ (Python,       │          │
│         │  subprocess)   │          │
│         └────────────────┘          │
└─────────────────────────────────────┘
```

- **CLI가 Plumb를 subprocess로 직접 호출** — API Server 없음
- 저장소: Git(SSOT)만. PostgreSQL/Redis 불필요
- 에이전트는 동일 리포에서 독립적으로 작업

#### Phase 2: API Server + Web Dashboard 추가

```
┌──────────────────────────────────────────┐
│  ┌────────────┐ ┌────────────┐ ┌──────┐ │
│  │ CLI        │ │ Web        │ │Agent │ │
│  └─────┬──────┘ └─────┬──────┘ └──┬───┘ │
│        └──────────────┼───────────┘     │
│                       │ REST + SSE      │
│  ┌────────────────────┼────────────────┐│
│  │         API Server (Hono)           ││
│  │  ┌──────────┐  ┌────────────────┐  ││
│  │  │ Git      │  │ SDD Engine     │  ││
│  │  │ Provider │  │ (OpenAPI 3.1   │  ││
│  │  │ (GH/GL)  │  │  계약 기반)    │  ││
│  │  └──────────┘  └────────────────┘  ││
│  └────────────────────┬────────────────┘│
│  ┌────────────┐ ┌─────┴──────┐          │
│  │ PostgreSQL │ │ Redis      │          │
│  │ (메타데이터)│ │ (캐시/큐)   │          │
│  └────────────┘ └────────────┘          │
└──────────────────────────────────────────┘
```

- API Server 도입 시 SDD Engine과의 통신 계약(OpenAPI 3.1) 선 작성 필수
- Git↔PostgreSQL 정합성: Git 우선, DB 비동기 동기화, reconciliation job (5분 주기)
- NL→Spec 변환 레이어: LLM → Spec Markdown → human 리뷰 → Git commit

### 7.4 기술 스택

#### Phase 1 (최소)

| 컴포넌트 | 기술 | 근거 |
|---------|------|------|
| **CLI** | TypeScript, Commander + Ink, Node.js 20 | npm 배포, 개발자 접근성 |
| **SDD Engine** | Python, Plumb (subprocess) | SDD Triangle 핵심 |
| **SSOT** | Git (GitHub/GitLab) | 설계 원칙 |
| **배포** | `npm install -g foundry-x` + `pip install plumb-dev` | 즉시 시작 |

#### Phase 2 추가

| 컴포넌트 | 기술 | 근거 |
|---------|------|------|
| **API Server** | TypeScript, Hono + Drizzle | 경량, 타입 안전 |
| **Web Dashboard** | Next.js 14 + shadcn/ui + Zustand | 비기술자 UI |
| **DB** | PostgreSQL 16 | 메타데이터 |
| **캐시/큐** | Redis 7 + BullMQ | 실시간, 작업 큐 |
| **Git 연동** | octokit + GitLab API | 두 플랫폼 추상화 |
| **인증** | JWT + RBAC (admin/member/viewer) | 기존 shared-auth 참조 |

### 7.5 Plumb 2트랙 전략 (검토 반영)

```
Track A (즉시 실행):
- Plumb를 CLI의 subprocess로 호출하는 래퍼
- `foundry-x sync` = `plumb review` + 메타데이터 수집
- 사전 요구사항: pip install plumb-dev
- Plumb의 한계가 드러나면 Track B로 전환

Track B (대기):
- Plumb의 핵심 알고리즘(결정 추출, 명세 업데이트)을 이해
- TypeScript로 재구현하여 Python 의존성 제거
- Track A에서 실사용 데이터를 충분히 모은 후 판단 (Month 2~3)
- 전환 기준: Plumb 버그로 인한 장애 주 2회 이상
```

### 7.6 에이전트 충돌 해결 전략 (Claude E-01 반영)

```
전략: 브랜치 기반 격리 (Optimistic Concurrency)

Phase 1: 단일 에이전트 → 충돌 없음
Phase 2+: 에이전트별 독립 브랜치
  1) 각 에이전트 작업 = 별도 feature branch 생성
  2) 작업 완료 → main에 PR 생성
  3) SDD sync 검증 (명세↔코드↔테스트 동기화 확인)
  4) 검증 통과 → auto-merge 또는 reviewer 승인
  5) 충돌 발생 → 에이전트 자동 rebase (최대 3회)
  6) rebase 실패 → PR에 "충돌 해결 필요" 라벨 → human escalation

Git hook 실패 시 에이전트 복구 (Claude E-02 반영):
  1) hook 실패 사유를 에이전트에게 전달
  2) 에이전트 자동 수정 시도 (최대 2회)
  3) 실패 시 --no-verify로 우회하지 않고 human escalation
  4) 우회 비율 모니터링 (KPI K2)
```

### 7.7 Git ↔ PostgreSQL 정합성 (Claude S-03 반영)

```
원칙: Git이 항상 승리

정상 흐름:
  Git push → webhook → API Server → DB 업데이트

실패 복구:
  DB 업데이트 실패 → 재시도 3회 (exponential backoff)
  → 실패 시 reconciliation queue에 적재

Reconciliation Job (5분 주기):
  1) Git 리포 상태 스캔 (latest commits, branches)
  2) DB 메타데이터와 비교
  3) 불일치 발견 → Git 기준으로 DB 덮어쓰기
  4) 불일치 리포트 생성 → 감사 로그 기록
```

### 7.8 NL → Spec 변환 계층 (ChatGPT 반영)

```
Phase 2에서 구현:

자연어 입력 (웹 채팅 UI)
    ↓
NL-to-Spec Layer (LLM: Claude/GPT)
    ↓
Spec Markdown 초안 생성
    ↓
사람 리뷰/승인 (human-in-the-loop 필수)
    ↓
승인 시 Git commit
    ↓
SDD Engine 동기화 검증

핵심 규칙:
- 자동 커밋 절대 금지
- LLM 생성 Spec은 반드시 사람이 확인
- 기존 명세와 충돌 시 → 충돌 표시 + 사용자 선택
```

### 7.9 리포지토리 구조 (v3: 모노리포)

```
foundry-x/
├── packages/
│   ├── cli/                    # foundry-x CLI (TypeScript)
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts     # 하네스 스캐폴딩
│   │   │   │   ├── sync.ts     # SDD 동기화 검사
│   │   │   │   └── status.ts   # 동기화 상태 표시
│   │   │   ├── plumb/
│   │   │   │   └── bridge.ts   # Plumb subprocess 래퍼
│   │   │   └── index.ts
│   │   └── package.json
│   └── shared/                 # 공유 타입, 설정
│       └── package.json
├── templates/                  # 하네스 스타터 킷
│   ├── default/
│   │   ├── CLAUDE.md
│   │   ├── AGENTS.md
│   │   ├── CONSTITUTION.md
│   │   ├── specs/
│   │   │   └── .gitkeep
│   │   └── .plumb/
│   │       └── config.json
│   └── kt-ds-sr/              # KT DS SR 처리 특화 템플릿
├── examples/
│   └── sample-project/
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   └── guides/
├── package.json               # 루트 (pnpm workspace)
├── pnpm-workspace.yaml
└── turbo.json
```

### 7.10 Assumptions (검증 필요)

| # | 가정 | 리스크 | 검증 방법 | 검증 시점 |
|---|------|--------|-----------|----------|
| A1 | 개발자가 pre-commit 훅을 수용한다 | High | --no-verify 비율 < 20% | Month 1 |
| A2 | Plumb가 실제 프로젝트 규모에서 동작한다 | High | Track A 실사용 | Month 1~2 |
| A3 | SDD 동기화가 개발 속도를 저해하지 않는다 | Medium | sync 소요 시간 측정 | Month 1 |
| A4 | 비기술자가 자연어로 의미 있는 명세를 만들 수 있다 | High | PM 대상 테스트 | Phase 2 |
| A5 | 조직이 "에이전트를 동등한 팀원"으로 받아들인다 | Medium | 파일럿 팀 관찰 | Phase 2~3 |

---

## 8. Release

### 마일스톤 (v3: 하드 데드라인)

#### Month 1 (4주): CLI MVP + 내부 온보딩

```
범위:
- foundry-x CLI: init, sync, status (3개 커맨드)
- Plumb Track A 통합 (subprocess 래퍼)
- KT DS SR 처리 특화 템플릿 1종
- 내부 개발자 5명 강제 온보딩

산출물:
- npm publish 가능한 CLI 패키지
- 하네스 스타터 킷 (CLAUDE.md, specs/ 구조)
- 사용자 가이드

Kill 조건:
- CLI 완성 불가
- 온보딩 대상자 5명 확보 불가
```

#### Month 2~3 (8주): 실사용 + 피드백 + 개선

```
범위:
- 개발자 5명이 실제 프로젝트에서 일상적으로 사용
- 주간 피드백 인터뷰 (매주 금요일 30분)
- CLI 개선 (피드백 기반)
- Plumb Track A/B 판단

핵심 지표 모니터링:
- CLI 주간 호출 횟수 (목표: 주 10회+/인)
- --no-verify 비율 (목표: < 20%)
- sync 후 수동 수정 수 (목표: 감소 추세)
- 결정 승인 비율 (목표: > 70%)

Kill 조건:
- 주간 CLI 사용률 30% 미만 (5명 중 2명 미만 활성)
```

#### Month 3 판정: Go / Pivot / Kill

```
Go 조건 (하나 이상):
- NPS 6+ (5명 대상)
- CLI 주간 사용률 60%+
- "이거 없으면 불편하다"는 피드백 2명 이상

Pivot:
- Plumb 포크 + SDD 실험 도구로 축소
- 플랫폼 비전은 보류, 개인 도구로 전환

Kill:
- 채택 실패 인정
- 학습 문서화 후 종료
```

#### Phase 2 (Go 판정 후): API + Web + 에이전트 오케스트레이션

```
- API Server (Hono) + SDD Engine (OpenAPI 3.1 계약)
- Web Dashboard (Next.js, SDD Triangle 시각화)
- 자연어→Spec 변환 (LLM, human-in-the-loop)
- 에이전트 병렬 작업 + 브랜치 기반 충돌 해결
- PostgreSQL + Redis 도입
```

#### Phase 3: 확장

```
- 멀티테넌시 (조직 단위)
- 외부 도구 연동 (Jira, Slack)
- MCP(Model Context Protocol) 지원
- 모노리포 → 멀티리포 분리 (필요 시)
```

#### Phase 4: 고객 파일럿

```
- 외부 고객사 파일럿
- KT DS SR 자동화 성공 사례 기반 제안
```

### 핵심 리스크 대응

- **최대 리스크**: 사용자 채택 실패
- **대응 1**: Phase 1부터 실사용자 5명 강제 온보딩, 주간 인터뷰
- **대응 2**: Month 3에 Go/Kill 하드 판정으로 좀비 프로젝트 방지
- **대응 3**: 현실 지표(CLI 호출, --no-verify 비율)로 "착각 방지"

---

## 9. 기존 코드베이스 재활용

| 기존 자산 | 판정 | 이관 대상 | 비고 |
|----------|------|----------|------|
| shared-auth (JWT/RBAC) | Phase 2에서 검증 후 재활용 | foundry-x API | 에이전트 서비스 계정 지원 여부 검증 필요 (Claude R-03) |
| shared-events (Redis) | Phase 2에서 참조 | foundry-x API | 이벤트 패턴만 참조 |
| PostgreSQL DDL | Phase 2에서 부분 재활용 | foundry-x API | users/projects 테이블 + 마이그레이션 전략 필요 |
| codegen-core | 부분 재활용 검토 | foundry-x SDD | AST/파일 생성 로직 재활용 가능 (Claude R-01) |
| Neo4j/Qdrant/MinIO | 폐기 (Phase 1) | - | 필요 시 Phase 3에서 재검토 |

---

## Open Questions

| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| Q1 | Plumb Track A에서 성능/안정성 이슈 발생 시 Track B 전환 기준 | 아키텍트 | Month 2 |
| Q2 | 에이전트 오케스트레이션 프로토콜 (MCP vs REST) | 아키텍트 | Phase 2 전 |
| Q3 | 외부 파트너/SI 범위 및 역할 분담 | PM | Phase 2 전 |
| Q4 | KT DS SR 시나리오 상세 요구사항 (어떤 SR 유형부터?) | PM | Month 1 |
