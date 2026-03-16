# Foundry-X 개발 투명성·협업·진행관리 스펙

**버전:** v1
**날짜:** 2026-03-16
**상태:** PRD v3 보충 스펙
**적용 시점:** Phase 1 Day 1부터

---

## 1. 설계 원칙

### 1.1 왜 이것이 필요한가

PRD v3의 Phase 1이 CLI 3개 커맨드에 집중하면서, "협업 플랫폼"의 핵심 속성인 **투명성(Transparency)·공유(Sharing)·추적(Tracking)**이 개발 프로세스 자체에서 빠져 있었다.

Foundry-X가 만드는 제품뿐 아니라, **Foundry-X를 만드는 과정 자체**가 협업 플랫폼의 첫 번째 레퍼런스여야 한다. "우리가 만드는 것을 우리가 먼저 쓴다" (Dogfooding).

### 1.2 원칙

| # | 원칙 | 설명 |
|---|------|------|
| T1 | **Day 1 공개** | 요구사항, 진행현황, 의사결정이 처음부터 모든 참여자에게 공개된다 |
| T2 | **단일 진입점** | GitHub가 모든 정보의 시작점. 흩어진 채널(Slack, 이메일, 회의록) 없이 GitHub에서 시작하고 끝난다 |
| T3 | **리뷰 가능한 스펙** | 모든 기술 스펙이 Wiki로 구성되어 누구나 읽고, 코멘트하고, 개선 제안할 수 있다 |
| T4 | **실시간 추적** | 전체 BluePrint와 Phase별 WBS가 GitHub Projects로 관리되어 진행률이 자동 갱신된다 |

---

## 2. GitHub 인프라 구성

### 2.1 전체 구조

```
github.com/AX-BD-Team/foundry-x/
│
├── 📋 GitHub Projects (3개)
│   ├── [1] Foundry-X BluePrint        ← 전체 Phase 조감도
│   ├── [2] Phase 1: CLI MVP           ← Phase 1 WBS (Sprint 단위)
│   └── [3] Backlog                    ← 미래 Phase 아이디어/요구사항
│
├── 📖 GitHub Wiki (스펙 허브)
│   ├── Home                           ← 진입점, 네비게이션
│   ├── Architecture/                  ← 아키텍처 스펙
│   ├── SDD-Triangle/                  ← SDD Triangle 스펙
│   ├── CLI-Commands/                  ← CLI 커맨드 스펙
│   ├── Harness-Templates/             ← 하네스 템플릿 스펙
│   ├── ADR/                           ← Architecture Decision Records
│   └── Glossary                       ← 용어 사전
│
├── 💬 GitHub Discussions (4개 카테고리)
│   ├── 📣 Announcements               ← 공지, 마일스톤 달성
│   ├── 💡 Ideas                       ← 요구사항, 기능 제안
│   ├── 🔍 Spec Review                 ← Wiki 스펙에 대한 리뷰 토론
│   └── ❓ Q&A                         ← 질문/답변
│
├── 🏷️ GitHub Issues (요구사항 + 작업)
│   └── Labels, Milestones, Assignees
│
└── 📁 Repository (코드 + 문서)
    ├── docs/                          ← 기술 문서 (Git 버전 관리)
    ├── specs/                         ← 명세 파일 (SDD Triangle)
    └── ...
```

### 2.2 GitHub Projects vs Wiki vs Discussions 역할 분담

| 도구 | 역할 | 누가 보는가 | 업데이트 빈도 |
|------|------|------------|-------------|
| **Projects** | 진행현황 추적, WBS, 마일스톤 | PM, 팀장, 전 구성원 | 실시간 (Issue 상태 연동) |
| **Wiki** | 기술 스펙 허브, 아키텍처 문서 | 개발자, 아키텍트, 리뷰어 | 스펙 변경 시 |
| **Discussions** | 요구사항 토론, 스펙 리뷰, Q&A | 전 구성원 (비기술자 포함) | 수시 |
| **Issues** | 구체적 작업 단위 (Story/Task/Bug) | 개발자, 담당자 | 매일 |
| **Repository docs/** | ADR, 기술 가이드 (Git 버전 관리) | 개발자, 아키텍트 | PR 기반 |

---

## 3. 요구사항 관리 (Day 1 공개)

### 3.1 요구사항 수집 플로우

```
[누구나] Discussions > 💡 Ideas에 자연어로 제안
    ↓
[PM] 검토 후 Issue로 전환 (라벨: requirement)
    ↓
[팀] Issue에서 토론, 수락 기준 정의
    ↓
[PM] GitHub Projects에 배치 (Phase/Sprint)
    ↓
[개발자] Issue에서 작업, PR 연결
    ↓
[자동] PR merge 시 Issue 자동 close → Projects 진행률 갱신
```

### 3.2 Issue 라벨 체계

| 카테고리 | 라벨 | 색상 | 용도 |
|---------|------|------|------|
| **유형** | `requirement` | 🟣 보라 | 요구사항 |
| | `story` | 🔵 파랑 | 사용자 스토리 |
| | `task` | 🟢 초록 | 개발 작업 |
| | `bug` | 🔴 빨강 | 결함 |
| | `spike` | 🟡 노랑 | 기술 조사 |
| | `adr` | ⚪ 흰색 | 아키텍처 결정 |
| **Phase** | `phase-1` | 진한 파랑 | Phase 1 범위 |
| | `phase-2` | 중간 파랑 | Phase 2 범위 |
| | `phase-3+` | 연한 파랑 | Phase 3 이후 |
| **축** | `harness` | 🟤 갈색 | 하네스 구축 |
| | `sdd-triangle` | 🟠 주황 | SDD Triangle |
| | `orchestration` | 🟣 보라 | 에이전트 오케스트레이션 |
| | `workspace` | 🔵 파랑 | 협업 워크스페이스 |
| **상태** | `blocked` | ⬛ 검정 | 차단됨 |
| | `needs-review` | 🟡 노랑 | 리뷰 필요 |
| | `ready-to-dev` | 🟢 초록 | 개발 착수 가능 |

### 3.3 Milestone 체계

| Milestone | 기간 | 완료 기준 |
|-----------|------|----------|
| `Month 1: CLI MVP` | Week 1~4 | CLI 3개 커맨드 npm publish + 5명 온보딩 |
| `Month 2: Real Usage` | Week 5~8 | 5명 실사용 + KPI 모니터링 시작 |
| `Month 3: Go/Kill` | Week 9~12 | 판정 기준 도달 여부 확인 |
| `Phase 2: API+Web` | TBD | Go 판정 후 계획 |

---

## 4. GitHub Wiki 구성 (스펙 허브)

### 4.1 Wiki 페이지 구조

```
📖 Foundry-X Wiki

Home
├── 🚀 Getting Started
│   ├── Quick Start Guide
│   ├── Installation
│   └── First Project Setup
│
├── 🏗️ Architecture
│   ├── Overview (5축 아키텍처)
│   ├── Design Principles ("Git이 진실")
│   ├── System Architecture Diagram
│   ├── Tech Stack
│   └── Repository Structure
│
├── 🔺 SDD Triangle
│   ├── Concept (Spec↔Code↔Test 동기화)
│   ├── Plumb Integration (Track A/B)
│   ├── Decision Extraction Flow
│   ├── Coverage Analysis
│   └── Triangle Health Score
│
├── ⌨️ CLI Commands
│   ├── foundry-x init
│   ├── foundry-x sync
│   ├── foundry-x status
│   └── Error Codes & Troubleshooting
│
├── 🧰 Harness Templates
│   ├── Default Template
│   ├── KT DS SR Template
│   ├── CLAUDE.md Guide
│   ├── AGENTS.md Guide
│   └── Creating Custom Templates
│
├── 📋 ADR (Architecture Decision Records)
│   ├── ADR-000: Document Supersession
│   ├── ADR-001 ~ ADR-006 (Phase 2 준비)
│   └── ADR Template
│
├── 📊 KPI & Metrics
│   ├── Dashboard (현재 수치)
│   ├── Measurement Methods
│   └── Go/Kill Criteria
│
├── 🗺️ Roadmap
│   ├── BluePrint (전체 조감도)
│   ├── Phase 1 WBS
│   ├── Phase 2 Plan (예정)
│   └── Phase 3+ Vision
│
└── 📚 Glossary
    └── 용어 사전 (하네스, SDD Triangle, SSOT 등)
```

### 4.2 Wiki 운영 규칙

| 규칙 | 설명 |
|------|------|
| **누구나 편집 가능** | 모든 참여자가 Wiki를 편집할 수 있음 (GitHub Wiki 기본 설정) |
| **변경 시 Discussion 알림** | 주요 스펙 변경 시 Discussions > 🔍 Spec Review에 변경 요약 포스팅 |
| **리뷰 요청 프로세스** | 새 스펙 작성 → Discussion에 리뷰 요청 → 2명 이상 승인 → Wiki 반영 |
| **버전 이력** | GitHub Wiki 자체가 Git 리포이므로 모든 변경 이력 자동 추적 |
| **깊은 기술 문서는 docs/** | Wiki는 개요/가이드, 코드와 밀접한 기술 문서는 리포 docs/에 배치 (PR 리뷰 가능) |

### 4.3 스펙 리뷰 프로세스

```
[작성자] Wiki에 스펙 초안 작성
    ↓
[작성자] Discussions > 🔍 Spec Review에 포스팅
  제목: "[Review Request] {스펙명}"
  내용: 변경 요약 + Wiki 링크 + 리뷰 포인트
    ↓
[리뷰어] Discussion에 코멘트로 피드백
    ↓
[작성자] 피드백 반영 후 Wiki 업데이트
    ↓
[리뷰어] 👍 반응으로 승인 (2명 이상)
    ↓
[PM] Discussion을 Resolved로 마킹
```

---

## 5. 전체 BluePrint (조감도)

### 5.1 GitHub Projects: "Foundry-X BluePrint"

**뷰 형식**: Board (칸반) + Table (타임라인)

**컬럼 구성:**

| 컬럼 | 내용 |
|------|------|
| **Vision** | 장기 비전 아이템 (Phase 3+) |
| **Phase 3: 확장** | 멀티테넌시, 외부 연동, MCP |
| **Phase 2: API+Web** | API Server, Web Dashboard, 에이전트 오케스트레이션 |
| **Phase 1: CLI MVP** | ← 현재 집중 (Month 1~3) |
| **Done** | 완료된 Phase/마일스톤 |

### 5.2 BluePrint 상세

```
┌─────────────────────────────────────────────────────────────┐
│                    Foundry-X BluePrint                        │
│                                                              │
│  Phase 1          Phase 2           Phase 3        Vision    │
│  CLI MVP          API+Web+Agent     확장           장기       │
│  (Month 1~3)      (Go 판정 후)      (Phase 2 후)             │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐ ┌──────┐ │
│  │ M1: CLI    │  │ API Server   │  │ 멀티테넌시  │ │ 고객사│ │
│  │ init/sync/ │→ │ (Hono)       │→ │ (조직 단위) │ │ 파일럿│ │
│  │ status     │  │              │  │            │ │      │ │
│  ├────────────┤  ├──────────────┤  ├────────────┤ │ 외부  │ │
│  │ M2: 실사용 │  │ Web Dashboard│  │ 외부 도구   │ │ 제품화│ │
│  │ 5명 온보딩 │  │ (Next.js)    │  │ 연동       │ │      │ │
│  │            │  │              │  │ (Jira,Slack)│ │ SDD  │ │
│  ├────────────┤  ├──────────────┤  ├────────────┤ │ 표준  │ │
│  │ M3: Go/Kill│  │ NL→Spec     │  │ MCP 지원   │ │      │ │
│  │ 판정       │  │ (LLM 연동)   │  │            │ │      │ │
│  │            │  │              │  │ Template   │ │      │ │
│  │ Plumb PoC  │  │ 에이전트     │  │ SDK        │ │      │ │
│  │ Track A    │  │ 오케스트레이션│  │            │ │      │ │
│  └────────────┘  └──────────────┘  └────────────┘ └──────┘ │
│                                                              │
│  ●━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━●━━━━━━━━━━━━━●            │
│  지금           Month 3          ~6개월         ~12개월       │
│                Go/Kill                                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Phase 전체 요약 테이블

| Phase | 기간 | 목표 | 핵심 산출물 | 성공 기준 | 전제 조건 |
|-------|------|------|-----------|----------|----------|
| **Phase 1** | Month 1~3 | CLI MVP 채택 검증 | CLI 3커맨드 + Plumb 통합 + SR 템플릿 | NPS 6+ 또는 사용률 60% | 팀 합의, Git provider 확정 |
| **Phase 2** | Go 후 ~3개월 | 플랫폼화 | API Server + Web + NL→Spec + 에이전트 | 비기술자 3명+ 참여 | Phase 1 Go 판정 |
| **Phase 3** | Phase 2 후 ~3개월 | 확장 | 멀티테넌시 + 외부 연동 + MCP | 조직 3개+ 사용 | Phase 2 안정화 |
| **Phase 4** | Phase 3 후 | 외부 확산 | 고객사 파일럿 + 제품화 | 외부 고객 1개+ 도입 | Phase 3 검증 |

---

## 6. Phase 1 WBS (Work Breakdown Structure)

### 6.1 GitHub Projects: "Phase 1: CLI MVP"

**뷰 형식**: Board (Sprint 단위) + Table (WBS 상세)

**컬럼:**

| 컬럼 | 설명 |
|------|------|
| **Backlog** | 미착수 |
| **Sprint N** | 현재 Sprint 작업 |
| **In Progress** | 진행 중 |
| **In Review** | PR 리뷰 중 |
| **Done** | 완료 |
| **Blocked** | 차단됨 |

### 6.2 Month 1 WBS (Week 1~4)

#### Week 1: 기반 구축

| ID | 작업 | 유형 | 담당 | 의존성 | 산출물 |
|----|------|------|------|--------|--------|
| W1-01 | GitHub 리포 생성 + Projects/Wiki/Discussions 초기 설정 | task | PM | 없음 | 리포 + 3개 Projects + Wiki Home |
| W1-02 | ADR-000: 기존 문서 대체 선언 | adr | 아키텍트 | 없음 | docs/adr/000-document-supersession.md |
| W1-03 | 모노리포 초기화 (pnpm + turbo + tsconfig + eslint) | task | 아키텍트 | W1-01 | package.json, turbo.json |
| W1-04 | packages/cli skeleton (Commander + Ink) | task | 백엔드 | W1-03 | src/index.ts, bin 설정 |
| W1-05 | packages/sdd skeleton (Python + Plumb 래퍼) | task | 백엔드 | W1-03 | plumb bridge, subprocess 래퍼 |
| W1-06 | .plumb 출력 형식 + decisions.jsonl 내부 계약 문서화 | spike | 아키텍트 | W1-05 | Wiki: SDD-Triangle/Internal-Contract |
| W1-07 | subprocess 오류 처리 계약 (timeout, exit code, stderr) | task | 백엔드 | W1-05 | packages/sdd/error-handling.ts |
| W1-08 | Phase 1 메타데이터 저장 방식 결정 (.foundry-x/ JSON) | spike | 아키텍트 | 없음 | ADR + Wiki 업데이트 |
| W1-09 | Wiki 초기 페이지 20개 생성 (구조만, 내용은 점진) | task | PM | W1-01 | Wiki 전체 네비게이션 |
| W1-10 | BluePrint + Phase 1 WBS를 GitHub Projects에 입력 | task | PM | W1-01 | Projects 보드 완성 |
| W1-11 | CI 파이프라인 (.github/workflows) | task | Ops | W1-03 | lint + test + build |
| W1-12 | TS+Python 빌드 파이프라인 검증 | spike | Ops | W1-04, W1-05 | CI에서 두 언어 빌드 통과 |

#### Week 2: CLI 핵심 커맨드

| ID | 작업 | 유형 | 담당 | 의존성 | 산출물 |
|----|------|------|------|--------|--------|
| W2-01 | `foundry-x init` 커맨드 구현 | story | 백엔드 | W1-04 | 하네스 스캐폴딩 (CLAUDE.md, specs/, .plumb/) |
| W2-02 | templates/default/ 하네스 템플릿 작성 | task | 아키텍트 | 없음 | CLAUDE.md, AGENTS.md, CONSTITUTION.md |
| W2-03 | templates/kt-ds-sr/ 특화 템플릿 작성 | task | PM + 아키텍트 | W2-02 | SR 처리 맞춤 하네스 |
| W2-04 | `foundry-x sync` 커맨드 구현 (Plumb review 래퍼) | story | 백엔드 | W1-05 | 결정 추출 + 명세 동기화 |
| W2-05 | `foundry-x status` 커맨드 구현 | story | 백엔드 | W2-04 | 동기화 상태 표시 |
| W2-06 | Triangle Health Score 설계 + status에 통합 | task | 백엔드 | W2-05 | 정량적 점수 출력 |
| W2-07 | Wiki: CLI Commands 3개 페이지 작성 | task | PM | W2-01~05 | 사용법, 옵션, 예시 |

#### Week 3: 품질 + 온보딩 준비

| ID | 작업 | 유형 | 담당 | 의존성 | 산출물 |
|----|------|------|------|--------|--------|
| W3-01 | 단위 테스트 (CLI 3개 커맨드) | task | 백엔드 | W2-01~05 | 커버리지 80%+ |
| W3-02 | E2E 테스트 (init → sync → status 플로우) | task | 백엔드 | W3-01 | examples/sample-project 기반 |
| W3-03 | npm publish 준비 (package.json, README, LICENSE) | task | 백엔드 | W3-01 | `npx foundry-x init` 동작 |
| W3-04 | 사용자 가이드 작성 (Quick Start) | task | PM | W3-03 | Wiki: Getting Started |
| W3-05 | 온보딩 대상자 5명 확정 + 일정 협의 | task | PM | 없음 | 온보딩 일정표 |
| W3-06 | Wiki: Architecture + SDD Triangle 페이지 완성 | task | 아키텍트 | W2-04 | 기술 스펙 허브 |
| W3-07 | 핵심 모듈 독립 패키지 분리 검증 | spike | 아키텍트 | W2-04 | Phase 2 재사용성 확보 |

#### Week 4: 온보딩 + 첫 사용

| ID | 작업 | 유형 | 담당 | 의존성 | 산출물 |
|----|------|------|------|--------|--------|
| W4-01 | 개발자 5명 온보딩 세션 (2시간) | task | PM + 아키텍트 | W3-04 | 5명 환경 설정 완료 |
| W4-02 | 각 개발자의 실제 프로젝트에 `foundry-x init` 적용 | task | 개발자 5명 | W4-01 | 5개 프로젝트에 하네스 구축 |
| W4-03 | 첫 주간 사용 로그 수집 시작 | task | PM | W4-02 | KPI 모니터링 시작 |
| W4-04 | Month 1 회고 + Month 2 계획 | task | 전원 | W4-03 | 회고 기록 (Discussions) |
| W4-05 | Kill 조건 확인: CLI 완성 + 5명 온보딩 | task | PM | W4-01~03 | Go/Kill 첫 체크 |

### 6.3 Month 2~3 WBS (개요)

Month 2~3은 실사용 피드백에 따라 동적으로 조정되므로 상세 WBS는 Month 1 종료 시 작성한다. 고정된 활동만 미리 정의:

| Week | 고정 활동 | 담당 |
|------|----------|------|
| 매주 금요일 | 사용자 인터뷰 30분 (5명 전원) | PM |
| 매주 월요일 | KPI 대시보드 업데이트 (Wiki) | PM |
| 격주 수요일 | CLI 개선 릴리스 (피드백 기반) | 백엔드 |
| Month 2 말 | Plumb Track A/B 판단 회의 | 아키텍트 + 전원 |
| Month 3 초 | Go/Kill 판정 데이터 준비 | PM |
| Month 3 중 | Go/Kill 판정 회의 | 전원 |

---

## 7. 진행현황 모니터링

### 7.1 자동화 연동

GitHub Projects는 Issue/PR 상태와 자동 연동된다:

```
Issue 생성 → Projects Backlog에 자동 추가
PR 생성 (closes #N) → Issue가 In Review로 이동
PR merge → Issue 자동 close → Projects Done으로 이동
```

### 7.2 모니터링 대시보드 (Wiki: KPI & Metrics)

매주 월요일 PM이 업데이트하는 Wiki 페이지:

```markdown
# KPI Dashboard — Week N

## Phase 1 진행률
- [ ] Month 1 CLI MVP: ██████░░░░ 60% (12/20 tasks)
- [ ] Month 2 실사용: 미착수
- [ ] Month 3 판정: 미착수

## 핵심 지표 (최근 1주)
| 지표 | 이번 주 | 지난 주 | 목표 | 추세 |
|------|--------|--------|------|------|
| CLI 호출/인/주 | 7 | 3 | 10+ | ↑ |
| --no-verify 비율 | 35% | 50% | <20% | ↓ (개선) |
| sync 후 수동 수정 | 4건 | 7건 | 감소 | ↓ (개선) |
| 결정 승인률 | 65% | 55% | >70% | ↑ |
| 활성 사용자 | 3/5 | 2/5 | 3+/5 | ↑ |

## 이번 주 주요 이벤트
- [링크] Issue #23 완료: sync 명령어 성능 개선
- [링크] Discussion: Plumb 오탐 패턴 보고

## 차주 계획
- CLI v0.3 릴리스 (오류 메시지 개선)
- 사용자 인터뷰 결과 반영
```

### 7.3 Discussions 활용 — 투명한 의사결정

| 유형 | Discussions 카테고리 | 예시 |
|------|---------------------|------|
| 요구사항 제안 | 💡 Ideas | "sync할 때 변경된 파일만 보여줬으면" |
| 스펙 리뷰 | 🔍 Spec Review | "[Review] CLI status 출력 포맷 스펙" |
| 마일스톤 보고 | 📣 Announcements | "Month 1 CLI MVP 완성 + npm 배포" |
| 기술 질문 | ❓ Q&A | "Plumb이 대형 파일에서 느린데 해결법?" |
| Go/Kill 판정 | 📣 Announcements | "Month 3 Go/Kill 판정 결과" |

---

## 8. PRD v3 보충 사항 요약

본 스펙이 PRD v3에 추가하는 내용:

| # | 추가 항목 | PRD v3 섹션 | 설명 |
|---|----------|-------------|------|
| 1 | GitHub Projects 3개 구성 | 7.3 (Phase 1 아키텍처) | BluePrint + Phase 1 WBS + Backlog |
| 2 | GitHub Wiki 스펙 허브 | 7.5 (리포 구조) | 20+ 페이지, 리뷰 프로세스 |
| 3 | GitHub Discussions 4카테고리 | 축 5 (협업 워크스페이스) | Phase 1부터 CLI 대신 Discussion이 협업 레이어 역할 |
| 4 | Issue 라벨/Milestone 체계 | 8 (Release) | 요구사항→작업 추적 |
| 5 | 전체 BluePrint | 신규 | Phase 1~4 조감도 |
| 6 | Phase 1 WBS (Week별 상세) | 8 (Month 1 상세화) | 40+ 작업 항목, 의존성, 담당자 |
| 7 | KPI 대시보드 (Wiki) | 2.6 (KPI) 보충 | 주간 업데이트 포맷 |
| 8 | 스펙 리뷰 프로세스 | 신규 | Wiki 변경 → Discussion → 승인 |

### 핵심 메시지

**"Foundry-X를 만드는 과정 자체가 Foundry-X의 첫 번째 레퍼런스."**

Phase 1의 산출물은 CLI 3개 커맨드이지만, 개발 프로세스는 처음부터 투명하고 공유되며 추적 가능하다. GitHub Projects로 진행현황이 실시간 공개되고, Wiki로 모든 스펙이 리뷰 가능하며, Discussions로 누구나 참여할 수 있다. 이것이 "동료와 에이전트가 함께 만드는 곳"의 첫 번째 실천이다.
