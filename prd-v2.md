# Foundry-X PRD

**버전:** v2 (기술 스택 검토 반영)
**날짜:** 2026-03-16
**작성자:** AX BD팀
**상태:** 🔄 검토 중
**태그라인:** 동료와 에이전트가 함께 만드는 곳

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
| Architect | AX BD팀 | 기술 스택 확정, 하네스 설계 |
| Development | AX BD팀 + 외부 파트너/SI | 구현 |
| Stakeholder | KT DS 내부 팀 + 외부 고객사 | 사용자 피드백 |

---

## 3. Background

### 왜 지금인가?

하네스 엔지니어링의 등장이 이 프로젝트의 배경이다. OpenAI Codex 팀은 사람이 직접 작성한 코드 없이 100만 줄 이상의 프로덕션 소프트웨어를 구축했다. 핵심은 에이전트 자체가 아니라, 에이전트가 안정적으로 일할 수 있는 환경(하네스) — 제약 조건, 피드백 루프, 문서화, 린터, 수명 주기 관리로 구성된 시스템이었다.

동시에, Spec-Driven Development가 부상하고 있다. Drew Breunig의 SDD Triangle은 명세, 코드, 테스트 간의 지속적 동기화가 에이전트 시대의 핵심 과제임을 보여준다. 코드 변경이 명세에 반영되지 않으면, 시간이 지나면서 코드베이스 자체가 문서화되지 않은 진실 공급원(undocumented source of truth)이 되어버린다.

### Discovery-X → AI Foundry → Foundry-X

- **Discovery-X**: 관찰→실험→기록 사이클의 신사업 발굴 플랫폼. "탐색과 발견"의 정신.
- **AI Foundry**: 요구사항→스펙→코드 자동 생성 파이프라인. "구축"의 정신.
- **Foundry-X**: 두 프로젝트의 합류. 탐색하고, 구축하고, 동기화하는 — 그 전 과정을 동료와 에이전트가 함께 수행하는 플랫폼.

---

## 4. Objective

### 목표

조직 내에서 사람과 AI 에이전트가 동등한 팀원으로 협업하며, 명세↔코드↔테스트가 항상 동기화된 상태로 소프트웨어를 만들 수 있는 환경을 제공한다.

### 성공 지표 (KPI)

| # | 지표 | 현재 | 목표 | 측정 방법 |
|---|------|------|------|-----------|
| K1 | 의도 정렬률 | 체감 50~60% | > 90% | 요구사항 ↔ 최종 산출물 일치도 평가 |
| K2 | PoC 구축 시간 | 2~4주 | < 1일 | 요구사항 입력 → 동작하는 프로토타입 |
| K3 | 팀 협업 효율성 | 기준 없음 | 커뮤니케이션 왕복 50% 감소 | 리뷰 사이클 횟수, 재작업 비율 |
| K4 | 에이전트 신뢰도 | 기준 없음 | 생성 코드 테스트 통과율 > 90% | CI 빌드/테스트 리포트 |

### 전략 정렬

KT DS의 AX(AI Transformation) 사업과 직접 연결된다. AI 에이전트를 조직의 생산성 도구로 도입하는 것을 넘어, 에이전트와 함께 일하는 방식 자체를 플랫폼화한다.

---

## 5. Market Segment(s)

### 주 사용자 세그먼트

| 세그먼트 | 페르소나 | JTBD | 기술 수준 |
|---------|---------|------|-----------|
| 의도 설계자 | PM, 기획자, 영업 | 자연어로 요구사항을 전달하면 의도대로 동작하는 결과물을 받고 싶다 | 비기술자 (자연어 참여) |
| 에이전트 지휘자 | 개발자, 아키텍트 | 에이전트에게 작업을 지시하고, 하네스를 설계하여 안정적 결과를 얻고 싶다 | 기술자 |
| 검증자 | 아키텍트, QA, 리뷰어 | 명세↔코드↔테스트가 동기화되어 있는지 확인하고, 품질을 보장하고 싶다 | 기술자 |
| AI 에이전트 | Codex, Claude Code 등 | 명확한 컨텍스트와 제약 조건 내에서 코드를 생성하고 테스트를 실행하고 싶다 | N/A (자동화) |

### 사용 범위

- **내부**: KT DS 전 직군 (기획, 디자인, 영업 포함)
- **외부**: 고객사 (파일럿 후 확대)
- **작동 단위**: 조직 단위 (여러 팀이 여러 프로젝트를)

---

## 6. Value Proposition(s)

### 의도 설계자 (PM, 기획자)

- **What before**: 요구사항을 PPT와 구두로 전달하면, 개발팀이 다르게 이해하여 재작업 발생
- **How**: 자연어로 의도를 입력하면 구조화된 명세(Spec)로 자동 변환, 에이전트가 코드를 생성하고, SDD Triangle이 의도와 결과의 동기화를 보장
- **What after**: 내가 말한 것이 그대로 동작하는 프로토타입을 1일 내에 확인
- **Alternatives**: PPT 목업 + 구두 전달 → 수동 구현 (2~4주, 의도 왜곡)

### 에이전트 지휘자 (개발자, 아키텍트)

- **What before**: 반복적인 스캐폴딩, CRUD 작성에 시간을 소비하며, 에이전트를 쓰면 명세와 코드가 점점 어긋남
- **How**: 하네스를 설계하면 에이전트가 제약 조건 내에서 안정적으로 작업하고, 커밋마다 결정사항이 자동으로 명세에 반영됨
- **What after**: 비즈니스 로직과 아키텍처 설계에 집중하고, 에이전트가 구현을 담당
- **Alternatives**: 수동 보일러플레이트 + 에이전트 단편 활용 (명세 드리프트)

### 검증자 (아키텍트, QA)

- **What before**: 코드 리뷰에서 명세와 코드의 불일치를 수동으로 발견해야 함
- **How**: SDD Triangle이 커밋마다 명세↔코드↔테스트 동기화를 자동 검증하고, 커버리지 갭을 보고
- **What after**: 동기화된 상태에서 아키텍처적 결정에만 집중
- **Alternatives**: 수동 코드 리뷰 + PR 코멘트 (누락 빈번)

---

## 7. Solution

### 7.1 설계 원칙: "Git이 진실, Foundry-X는 렌즈"

- 모든 명세, 코드, 테스트, 결정 이력은 **Git 리포에 존재** (SSOT)
- Foundry-X는 이를 읽고, 분석하고, 시각화하고, 동기화를 강제하는 **레이어**
- DB(PostgreSQL)에는 메타데이터(프로젝트 설정, 사용자, 작업 상태)만 저장
- 에이전트는 Git 리포에 직접 작업하고, Foundry-X는 그 결과를 관찰
- GitHub와 GitLab 모두 지원

### 7.2 시스템 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                   사용자 레이어                         │
│                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ foundry-x  │  │ Web        │  │ AI Agents      │  │
│  │ CLI        │  │ Dashboard  │  │ (Claude Code,  │  │
│  │ (npm)      │  │ (Next.js)  │  │  Codex 등)     │  │
│  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘  │
│        └───────────────┼──────────────────┘           │
│                        │ REST + SSE                    │
├────────────────────────┼──────────────────────────────┤
│              Foundry-X Core (API Server)               │
│                   (Hono + TypeScript)                   │
│                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Project    │  │ Agent      │  │ Git Provider   │  │
│  │ Manager    │  │ Orchestr.  │  │ Abstraction    │  │
│  └────────────┘  └────────────┘  │ (GitHub/GitLab)│  │
│                                   └────────────────┘  │
│         │                                              │
│  ┌──────┴─────────────────────────────────────────┐   │
│  │         SDD Engine (Python, Plumb 확장)          │   │
│  │  결정 추출 │ 명세 동기화 │ 커버리지 분석          │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
├────────────────────────────────────────────────────────┤
│                  Git 레이어 (SSOT)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ GitHub   │  │ GitLab   │  │ 프로젝트 Repos    │    │
│  │ API      │  │ API      │  │ (Spec/Code/Test) │    │
│  └──────────┘  └──────────┘  └──────────────────┘    │
│                                                        │
├────────────────────────────────────────────────────────┤
│                  메타데이터 레이어                        │
│  ┌──────────────┐  ┌────────────┐                     │
│  │ PostgreSQL 16│  │ Redis 7    │                     │
│  │ (프로젝트,    │  │ (캐시,     │                     │
│  │  사용자,      │  │  작업 큐,  │                     │
│  │  작업 상태)   │  │  실시간)   │                     │
│  └──────────────┘  └────────────┘                     │
└────────────────────────────────────────────────────────┘
```

### 7.3 핵심 5축

#### 축 1: 하네스 구축
- 리포지토리 구조, 스키마, 규칙, 린터, CI 설정 등 에이전트가 안정적으로 일할 수 있는 환경
- CLAUDE.md / AGENTS.md / CONSTITUTION.md 같은 에이전트 지시 파일 관리
- 프로젝트별 제약 조건과 코딩 컨벤션 정의
- `foundry-x init` 으로 표준 하네스 스캐폴딩

#### 축 2: SDD Triangle (Spec-Driven Development Triangle)
- **명세(Spec)**: Markdown + JSON Schema로 관리. 자연어→Spec 자동 변환 지원
- **코드(Code)**: 에이전트가 명세 기반으로 구현
- **테스트(Test)**: 명세에서 테스트 자동 생성 + 커버리지 추적
- **동기화 메커니즘**: Git pre-commit 훅으로 결정사항 자동 추출 → 명세 업데이트 → 커버리지 갭 보고
- SDD Engine(Python, Plumb 확장)이 핵심 엔진
- Spec/Test/Code 모두 Git 내 1급 시민

#### 축 3: 에이전트 오케스트레이션
- 여러 AI 에이전트에게 병렬로 작업 지시
- 작업 상태 추적 (queued → running → review → done → failed)
- BullMQ(Redis) 기반 작업 큐
- SSE로 실시간 상태 스트리밍

#### 축 4: 지식 공유 (SSOT)
- Git 리포 = 단일 진실 공급원
- 에이전트 관점에서 접근할 수 없는 것은 존재하지 않는 것
- Google Docs, Slack, 머릿속 지식을 리포로 이전하는 워크플로우 제공

#### 축 5: 협업 워크스페이스
- 웹 대시보드: 프로젝트 개요, SDD Triangle 시각화, 에이전트 모니터
- CLI: 개발자 워크플로우 (`foundry-x status`, `foundry-x sync`, `foundry-x review`)
- 자연어 입력 인터페이스: 비기술자가 요구사항을 채팅으로 입력

### 7.4 기술 스택 (확정)

#### 리포지토리 구조 (멀티리포)

```
github.com/AX-BD-Team/
├── foundry-x-cli/          # CLI 도구 (TypeScript, npm)
├── foundry-x-api/          # API Server (TypeScript, Hono)
├── foundry-x-web/          # Web Dashboard (Next.js)
├── foundry-x-sdd/          # SDD Engine (Python, Plumb 확장)
├── foundry-x-docs/         # 문서, ADR, 가이드
└── foundry-x-templates/    # 하네스 템플릿, 스타터 킷
```

#### 컴포넌트별 기술 선택

| 컴포넌트 | 기술 | 언어 | 근거 |
|---------|------|------|------|
| **CLI** | Commander + Ink | TypeScript (Node.js 20) | npm 배포 용이, TUI 대시보드 가능 |
| **API Server** | Hono + Drizzle ORM | TypeScript | 경량 REST + SSE, 기존 팀 역량 |
| **Web Dashboard** | Next.js 14 + shadcn/ui + Zustand | TypeScript | SSR, 비기술자 UI, 기존 역량 |
| **SDD Engine** | Plumb 확장 + Anthropic/OpenAI SDK | Python 3.12+ | SDD Triangle 핵심, LLM 생태계 |
| **DB** | PostgreSQL 16 | - | 메타데이터 저장, 기존 재활용 |
| **캐시/큐** | Redis 7 + BullMQ | - | API 캐시, 작업 큐, SSE 이벤트 |
| **Git 연동** | octokit (GitHub) + GitLab API | TypeScript | 두 플랫폼 추상화 |
| **인증** | JWT + RBAC (admin/member/viewer) | TypeScript | 기존 shared-auth 재활용 |

#### CLI 핵심 커맨드

```bash
foundry-x init                    # 프로젝트 초기화 (하네스 구축)
foundry-x status                  # SDD Triangle 동기화 상태
foundry-x sync                    # 명세↔코드↔테스트 동기화 검사
foundry-x review                  # 결정사항 리뷰 (Plumb 연동)
foundry-x coverage                # 커버리지 갭 보고
foundry-x agent run "<지시>"       # 에이전트 작업 지시
foundry-x agent status            # 에이전트 작업 상태
foundry-x dashboard               # 웹 대시보드 열기
```

### 7.5 저장소 설계

**"Git이 진실"** 원칙에 따라 5개→3개로 간소화:

| 저장소 | 용도 | 저장 대상 |
|--------|------|----------|
| **Git 리포** (SSOT) | 명세, 코드, 테스트, 결정 이력, 하네스 설정 | Spec Markdown, 소스 코드, 테스트, .plumb/, CLAUDE.md |
| **PostgreSQL 16** | 메타데이터 | 프로젝트, 사용자, 작업 상태, 감사 로그 |
| **Redis 7** | 실시간/캐시 | API 캐시, 작업 큐 (BullMQ), SSE 이벤트 |

기존 v2의 Neo4j(온톨로지), Qdrant(벡터), MinIO(오브젝트)는 Phase 1에서 제외. Git 리포가 SSOT이므로 별도 스토리지 불필요.

### 7.6 기존 코드베이스 재활용

| 기존 자산 | 판정 | 이관 대상 |
|----------|------|----------|
| canonical-model (TS 타입) | 부분 재활용 | foundry-x-api (Project/User 타입) |
| shared-auth (JWT/RBAC) | 재활용 | foundry-x-api |
| shared-events (Redis) | 재활용 | foundry-x-api (이벤트 패턴) |
| PostgreSQL DDL | 부분 재활용 | foundry-x-api (users/projects 테이블) |
| docker-compose | 재활용 | foundry-x-api (PG + Redis) |
| CI 파이프라인 패턴 | 패턴 재활용 | 각 리포 |
| codegen-core / Template | **폐기** | Phase 2에서 에이전트 기반 재설계 |
| spec-dsl JSON Schema | 컨셉 참조 | foundry-x-sdd (SDD 명세 포맷으로 재정의) |
| Neo4j/Qdrant/MinIO | **폐기** (Phase 1) | 필요 시 Phase 3에서 재검토 |

### 7.7 Assumptions (검증 필요)

| # | 가정 | 리스크 | 검증 방법 |
|---|------|--------|-----------|
| A1 | 비기술자가 자연어만으로 의미 있는 명세를 만들 수 있다 | High | PM 대상 프로토타입 테스트 |
| A2 | SDD Triangle 동기화가 에이전트 작업 속도를 저해하지 않는다 | Medium | Plumb PoC 실행 후 측정 |
| A3 | 여러 에이전트 병렬 실행 시 충돌 없이 병합 가능하다 | High | 멀티 에이전트 시나리오 테스트 |
| A4 | 조직이 "에이전트를 동등한 팀원"으로 받아들일 준비가 되어 있다 | Medium | 파일럿 팀 관찰 |
| A5 | GitHub/GitLab 추상화 레이어가 실용적으로 동작한다 | Medium | 두 플랫폼에서 동일 워크플로우 검증 |

---

## 8. Release

### Phase 1: MVP — 하네스 + SDD Triangle + CLI
- **기준**: 하네스 환경이 구축되고 에이전트가 첫 작업을 완료
- **범위**:
  - foundry-x-cli: `init`, `status`, `sync`, `review` 커맨드
  - foundry-x-sdd: Plumb 기반 결정 추출 + 명세 동기화
  - foundry-x-api: 프로젝트/사용자 메타데이터 + Git 연동
  - foundry-x-web: 프로젝트 대시보드 (SDD Triangle 상태 시각화)
- **일정**: 유연 (고정 데드라인 없음)

### Phase 2: 에이전트 오케스트레이션 + 자연어 입력
- 에이전트 병렬 작업 (`foundry-x agent run`)
- 자연어→Spec 자동 변환 (LLM 연동)
- 협업 워크스페이스 강화 (역할 분담, 알림)

### Phase 3: 확장 + 외부 연동
- 외부 도구 연동 (Jira, Slack, GitHub Issues)
- 멀티테넌시 (조직 단위 운영)
- 프로토타입 미리보기/샌드박스

### Phase 4: 고객 파일럿 + 안정화
- 외부 고객사 파일럿
- 성능 최적화, 보안 강화
- 운영 자동화

### 핵심 리스크 대응
- **최대 리스크**: 사용자 채택 실패
- **대응**: 기술보다 UX/온보딩 우선. Phase 1부터 실제 사용자(PM) 참여 필수
- **채택 전략**: CLI는 개발자 채택 경로, 웹 대시보드는 비기술자 채택 경로. 두 경로 동시 공략

---

## 9. v1 → v2 변경 이력

| 섹션 | 변경 내용 |
|------|----------|
| 7.1 | 설계 원칙 "Git이 진실, Foundry-X는 렌즈" 추가 |
| 7.2 | 시스템 아키텍처 다이어그램 추가 (Git 중심 레이어 + 멀티리포) |
| 7.3 | 핵심 5축에 구체 기술(Plumb, BullMQ, Git 훅 등) 반영 |
| 7.4 | 기술 스택 "재검토 필요" → **확정** (TS+Python 혼합, 멀티리포 6개, 컴포넌트별 선택) |
| 7.5 | 저장소 5개→3개 간소화 (Git SSOT + PG + Redis) |
| 7.6 | 기존 코드베이스 재활용 판정표 추가 |
| 8 | Phase 1 범위 구체화 (4개 리포별 산출물 명시) |
| Q1 | Open Questions에서 삭제 (기술 스택 확정됨) |
| Q5 | Open Questions에서 삭제 (재활용 판정 완료) |

## Open Questions

| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| Q1 | Plumb fork 방식 vs 별도 SDD Engine 구현 | 아키텍트 | Phase 1 Sprint 1 |
| Q2 | 에이전트 오케스트레이션 프로토콜 (MCP vs REST) | 아키텍트 | Phase 2 전 |
| Q3 | 외부 파트너/SI 범위 및 역할 분담 | PM | Phase 1 전 |
| Q4 | GitHub/GitLab 추상화 레이어 구현 방식 | 아키텍트 | Phase 1 Sprint 1 |
