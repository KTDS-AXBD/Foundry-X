---
code: FX-DSGN-TSR
title: "기술 스택 검토서"
version: 1.0
status: Active
category: DSGN
created: 2026-03-16
updated: 2026-03-16
author: AX BD팀
---

# Foundry-X 기술 스택 검토서

**버전:** v1
**날짜:** 2026-03-16
**상태:** 검토 중

---

## 1. 검토 배경

기존 AI Foundry 문서(v2~v4)는 "코드 생성 도구"에 맞춰진 기술 스택이었다.

| 항목 | 기존 (AI Foundry) | 변경 요인 (Foundry-X) |
|------|-------------------|----------------------|
| 정체성 | 코드 생성 파이프라인 | 조직 협업 플랫폼 |
| 아키텍처 | 모노리포 MSA (7개 서비스) | Git 중심 + 멀티리포 + CLI/웹 레이어 |
| 중심축 | Spec DSL → 코드 생성 | SDD Triangle (명세↔코드↔테스트 동기화) |
| 사용자 | 개발자 중심 | 전 직군 (자연어 참여) |
| 배포 | K8s 웹앱 | CLI + 웹 대시보드 |

이 전환에 맞는 기술 스택을 **우선순위 기준**으로 재검토한다.

### 기술 선택 우선순위 (인터뷰 확정)

1. **확장성** (조직 단위, 멀티테넌시, 외부 고객사)
2. **SDD Triangle 구현 적합성** (Git 훅, 명세↔코드↔테스트 동기화)
3. **팀 규모 대비 운영 복잡도** (단순할수록 좋음)
4. **비기술자 접근성** (자연어 참여 가능한 UI)
5. **기존 코드베이스 재활용** (AI Foundry TS Monorepo, Discovery-X Remix)
6. **에이전트 통합 용이성** (Claude Code, Codex 등)

### 아키텍처 결정사항 (인터뷰 확정)

- **Git 중심**: GitHub/GitLab을 핵심으로, Foundry-X는 그 위의 레이어
- **CLI + 웹 대시보드**: Plumb처럼 CLI 기반 + 시각화 웹
- **멀티리포**: 서비스별 분리
- **Git 플랫폼**: GitHub/GitLab 둘 다 지원
- **웹과 CLI 동시 개발**

---

## 2. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 레이어                          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ foundry-x   │  │ Web         │  │ 에이전트       │  │
│  │ CLI         │  │ Dashboard   │  │ (Claude Code,  │  │
│  │             │  │             │  │  Codex 등)     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘  │
│         └────────────────┼─────────────────┘            │
│                          │                               │
├──────────────────────────┼───────────────────────────────┤
│                   Foundry-X Core                         │
│  ┌───────────────────────┼───────────────────────────┐  │
│  │                  API Server                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │  │
│  │  │ SDD      │  │ Harness  │  │ Orchestration   │ │  │
│  │  │ Engine   │  │ Manager  │  │ Engine          │ │  │
│  │  └──────────┘  └──────────┘  └─────────────────┘ │  │
│  └───────────────────────┼───────────────────────────┘  │
│                          │                               │
├──────────────────────────┼───────────────────────────────┤
│                    Git 레이어 (SSOT)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ GitHub   │  │ GitLab   │  │ 프로젝트  │               │
│  │ API      │  │ API      │  │ Repos    │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                    저장소 레이어                           │
│  ┌──────────┐  ┌──────────┐                              │
│  │ PostgreSQL│  │ Redis    │                              │
│  │ (메타데이터)│ │ (캐시/큐) │                              │
│  └──────────┘  └──────────┘                              │
└──────────────────────────────────────────────────────────┘
```

### 핵심 설계 원칙

**"Git이 진실, Foundry-X는 렌즈"**

- 모든 명세, 코드, 테스트, 결정 이력은 Git 리포에 존재
- Foundry-X는 이를 읽고, 분석하고, 시각화하고, 동기화를 강제하는 레이어
- DB(PostgreSQL)에는 메타데이터(프로젝트 설정, 사용자, 작업 상태)만 저장
- 에이전트는 Git 리포에 직접 작업하고, Foundry-X는 그 결과를 관찰

---

## 3. 기술 스택 권장안

### 3.1 주 개발 언어: TypeScript + Python 혼합

| 영역 | 언어 | 근거 |
|------|------|------|
| **CLI (foundry-x)** | TypeScript (Node.js) | npm 배포 용이, Commander/Ink로 TUI 구현. 기존 팀 역량 활용. Claude Code/Codex CLI와 동일 생태계. |
| **API Server** | TypeScript (Hono/Fastify) | CLI와 코드 공유, 경량 REST API. Git API 연동 라이브러리(octokit) 풍부. |
| **Web Dashboard** | TypeScript (Next.js) | 기존 팀 역량. SSR/ISR로 SEO 불필요한 대시보드에 적합. shadcn/ui 재사용. |
| **SDD Engine** | Python | Plumb가 Python(pip install plumb-dev). LLM 연동(langchain/anthropic SDK) 생태계. 결정 추출/명세 파싱 로직에 최적. |
| **Git Hooks** | Python | Plumb 확장 또는 호환. pre-commit 훅 생태계. |

**혼합 근거:**
- CLI/웹/API는 TypeScript로 통일하여 타입 공유 및 팀 효율성 확보
- SDD Triangle 핵심(결정 추출, 명세 동기화, 커버리지 분석)은 Python이 Plumb 호환성 + LLM 생태계에서 압도적 우위
- 두 언어 간 통신은 REST API로 연결 (CLI → API Server → SDD Engine)

### 3.2 리포지토리 구조 (멀티리포)

```
github.com/AX-BD-Team/
├── foundry-x-cli/          # CLI 도구 (TypeScript, npm 패키지)
├── foundry-x-api/          # API Server (TypeScript, Hono)
├── foundry-x-web/          # Web Dashboard (Next.js)
├── foundry-x-sdd/          # SDD Engine (Python, Plumb 확장)
├── foundry-x-docs/         # 문서, ADR, 가이드
└── foundry-x-templates/    # 하네스 템플릿, 스타터 킷
```

**멀티리포 선택 근거:**
- 우선순위 1(확장성): 각 컴포넌트 독립 배포/확장 가능
- 우선순위 2(SDD): SDD Engine이 Python, 나머지가 TS — 언어 분리가 자연스러움
- 우선순위 3(운영 단순성): 각 리포가 작고 목적이 명확. CI/CD 독립
- 기존 코드 재활용: AI Foundry의 canonical-model/spec-dsl 타입은 foundry-x-api로 이관 가능

### 3.3 컴포넌트별 기술 선택

#### CLI (foundry-x-cli)

| 항목 | 선택 | 대안 | 근거 |
|------|------|------|------|
| 런타임 | Node.js 20 LTS | Bun | Node.js가 npm 배포 안정성 우위. Bun은 아직 npm publish 생태계 미성숙 |
| CLI 프레임워크 | Commander + Ink | oclif, yargs | Commander는 경량, Ink는 React 기반 TUI로 대시보드형 CLI 구현 가능 |
| Git 연동 | simple-git + octokit | nodegit | simple-git은 경량, octokit은 GitHub/GitLab API 추상화 |
| 배포 | npm publish | brew, curl script | npm이 개발자 접근성 최고. `npx foundry-x init` 으로 즉시 시작 |

**CLI 핵심 커맨드 설계:**

```bash
# 프로젝트 초기화 (하네스 구축)
foundry-x init

# SDD Triangle 상태 확인
foundry-x status

# 명세↔코드↔테스트 동기화 검사
foundry-x sync

# 결정사항 리뷰 (Plumb 연동)
foundry-x review

# 커버리지 갭 보고
foundry-x coverage

# 에이전트 작업 지시
foundry-x agent run "스펙에 따라 API 엔드포인트 구현"

# 에이전트 작업 상태
foundry-x agent status

# 웹 대시보드 열기
foundry-x dashboard
```

#### API Server (foundry-x-api)

| 항목 | 선택 | 근거 |
|------|------|------|
| 프레임워크 | Hono | Edge 호환, 경량, TypeScript 네이티브. Express 대비 10x 빠름 |
| ORM | Drizzle | TypeScript 타입 안전. Discovery-X에서 검증 완료 |
| DB | PostgreSQL 16 | 메타데이터 저장. JSONB로 유연한 스키마 |
| 캐시/큐 | Redis 7 | API 캐시 + 작업 큐 (BullMQ) |
| 인증 | JWT + RBAC | shared-auth 패키지 재활용 가능 |
| API 스타일 | REST + SSE | REST(CRUD) + Server-Sent Events(실시간 에이전트 상태) |

**API Server 핵심 역할:**
- 프로젝트/사용자/작업 메타데이터 관리
- Git API 프록시 (GitHub/GitLab 추상화)
- SDD Engine 호출 (결정 추출, 동기화 검사)
- 에이전트 오케스트레이션 (작업 큐, 상태 추적)
- 웹 대시보드 백엔드

#### Web Dashboard (foundry-x-web)

| 항목 | 선택 | 근거 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | SSR/ISR, 기존 팀 역량, 풍부한 생태계 |
| UI | shadcn/ui + Tailwind | 기존 AI Foundry design-system 컨셉 계승 |
| 상태 관리 | Zustand + TanStack Query | 경량 글로벌 상태 + 서버 상태 캐싱 |
| 실시간 | SSE (EventSource) | 에이전트 작업 상태 실시간 표시 |
| 자연어 입력 | Chat UI 컴포넌트 | 비기술자가 자연어로 요구사항 입력 |

**웹 대시보드 핵심 화면:**
- 프로젝트 대시보드: 팀, 리포, 작업 상태 개요
- SDD Triangle 시각화: 명세↔코드↔테스트 동기화 상태, 커버리지 갭
- 에이전트 모니터: 진행 중인 에이전트 작업, 결정사항 리뷰
- 자연어 입력: 비기술자가 요구사항을 자연어로 입력하는 채팅 인터페이스

#### SDD Engine (foundry-x-sdd)

| 항목 | 선택 | 근거 |
|------|------|------|
| 언어 | Python 3.12+ | Plumb 호환, LLM SDK 생태계 |
| 기반 | Plumb 확장/Fork | SDD Triangle 동기화의 핵심. Git 훅 기반 결정 추출 이미 구현됨 |
| LLM 연동 | Anthropic SDK + OpenAI SDK | 멀티 프로바이더 지원 |
| 명세 파싱 | Markdown + JSON Schema | 명세는 Markdown(사람 읽기) + JSON Schema(기계 검증) |
| 테스트 연동 | pytest + 범용 어댑터 | Plumb의 pytest 지원 확장하여 Vitest/Jest 등도 커버 |
| 배포 | pip install / Docker | CLI에서 subprocess로 호출 또는 API Server에서 HTTP 호출 |

**SDD Engine 핵심 기능:**
- `plumb init` 확장: Foundry-X 프로젝트 구조에 맞는 초기화
- 결정 추출: Git diff + 에이전트 대화에서 결정사항 자동 식별
- 명세 업데이트: 승인된 결정을 명세 Markdown에 자동 반영
- 커버리지 분석: 명세 요구사항 vs 테스트 커버리지 vs 코드 구현 매핑
- 동기화 검사: 세 축 간 불일치 탐지 및 보고

---

## 4. 기존 코드베이스 재활용 판정

| 기존 자산 | 재활용 판정 | 이관 대상 | 근거 |
|----------|-----------|----------|------|
| canonical-model (TS 타입) | **부분 재활용** | foundry-x-api | Project/User/Review 타입은 재사용. Spec/Prototype은 SDD Triangle에 맞게 재설계 |
| spec-dsl (JSON Schema) | **컨셉 재활용** | foundry-x-sdd | JSON Schema 구조는 참조하되, SDD Triangle의 명세 포맷으로 재정의 |
| shared-auth (JWT/RBAC) | **재활용** | foundry-x-api | JWT 검증 + RBAC 미들웨어 그대로 이관 |
| shared-events (Redis Streams) | **재활용** | foundry-x-api | 이벤트 패턴 유지, 이벤트 목록은 Foundry-X에 맞게 재정의 |
| codegen-core | **보류** | 해당 없음 | 코드 생성은 Phase 2에서 에이전트 기반으로 재설계. 정적 템플릿 방식은 폐기 검토 |
| PostgreSQL DDL | **부분 재활용** | foundry-x-api | users/projects/audit_logs 테이블 재사용. specs/prototypes 테이블은 재설계 |
| docker-compose | **재활용** | foundry-x-api | PostgreSQL + Redis 구성 재사용. Neo4j/Qdrant/MinIO는 Phase 1에서 제외 |
| CI 파이프라인 | **패턴 재활용** | 각 리포 | lint→test→build 패턴 유지, 모노리포→멀티리포에 맞게 재구성 |
| Discovery-X Remix | **컨셉 참조** | foundry-x-web | Cloudflare Pages/Remix 대신 Next.js. 관찰→실험→기록 UX 패턴은 참조 |

---

## 5. 기존 v2~v4 대비 폐기/변경 사항

### 폐기

| 항목 | 근거 |
|------|------|
| 모노리포 구조 (pnpm + turbo) | 멀티리포로 전환 |
| 7개 MSA 서비스 (workspace-api, req-spec-api 등) | Git 중심 레이어 아키텍처로 전환 |
| Prototype Factory 8단계 파이프라인 | 에이전트 기반으로 재설계 (Phase 2) |
| Template Registry / codegen-core | 정적 템플릿 → 에이전트 + SDD Triangle |
| Neo4j (온톨로지) | Phase 1 범위 축소, 필요 시 Phase 3에서 재검토 |
| Qdrant (벡터 검색) | Phase 1 범위 축소, 필요 시 Phase 3에서 재검토 |
| MinIO (오브젝트 스토리지) | Git 리포가 SSOT이므로 별도 스토리지 불필요 (Phase 1) |
| ADR-001~005 (기존) | 새 아키텍처에 맞게 전량 재작성 |

### 변경

| 항목 | 기존 | 변경 |
|------|------|------|
| API 경로 | /api/v1/factory/*, /api/v1/specs/* 등 | /api/v1/projects/*, /api/v1/sdd/*, /api/v1/agents/* |
| 데이터 모델 | 8개 엔티티 (Spec 중심) | 프로젝트/사용자/작업 메타데이터 (Git 리포가 주 저장소) |
| 인증 | JWT + 6단계 RBAC | JWT + 간소화 RBAC (admin/member/viewer) |
| 이벤트 | 12종 도메인 이벤트 | 작업 상태 이벤트 중심 (agent.task.*, sdd.sync.* 등) |

---

## 6. 저장소 설계 (간소화)

### Phase 1 저장소

| 저장소 | 용도 | 근거 |
|--------|------|------|
| **PostgreSQL 16** | 메타데이터 (프로젝트, 사용자, 작업 상태, 감사 로그) | 기존 재활용. 트랜잭션 안정성 |
| **Redis 7** | API 캐시, 작업 큐 (BullMQ), SSE 이벤트 | 기존 재활용. 실시간 에이전트 상태 |
| **Git 리포** | 명세, 코드, 테스트, 결정 이력, 하네스 설정 (SSOT) | 핵심 설계 원칙 |

기존 v2의 5개 저장소(PostgreSQL + Neo4j + Qdrant + MinIO + Redis)에서 **3개로 간소화**. Git 리포가 SSOT 역할을 하므로 별도 오브젝트/벡터 스토리지 불필요.

### 간소화된 DDL

```sql
-- Foundry-X 메타데이터 스키마 (Phase 1)

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'member', -- admin/member/viewer
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  git_provider VARCHAR(20) NOT NULL, -- 'github' | 'gitlab'
  git_org     VARCHAR(200) NOT NULL,
  git_repos   JSONB NOT NULL DEFAULT '[]', -- 연결된 리포 목록
  owner_id    UUID NOT NULL REFERENCES users(id),
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_members (
  project_id  UUID NOT NULL REFERENCES projects(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  role        VARCHAR(20) NOT NULL DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE agent_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id),
  repo        VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'queued',
    -- queued/running/review/done/failed
  assigned_to VARCHAR(100), -- 'claude-code' | 'codex' | user_id
  result      JSONB,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sdd_sync_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id),
  repo        VARCHAR(200) NOT NULL,
  commit_sha  VARCHAR(40) NOT NULL,
  decisions   JSONB NOT NULL DEFAULT '[]',
  coverage    JSONB NOT NULL DEFAULT '{}',
  sync_status VARCHAR(20) NOT NULL, -- 'synced' | 'drifted' | 'pending_review'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. 결정 요약

| # | 결정 | 선택 | 핵심 근거 |
|---|------|------|-----------|
| D1 | 아키텍처 | Git 중심 레이어 + 멀티리포 | 확장성(1순위) + SDD Triangle(2순위) |
| D2 | 주 언어 | TypeScript + Python 혼합 | TS(CLI/웹/API) + Python(SDD/LLM) |
| D3 | CLI | Node.js + Commander + Ink | npm 배포, 개발자 접근성 |
| D4 | API | Hono + Drizzle + PostgreSQL | 경량, 타입 안전, 기존 재활용 |
| D5 | 웹 | Next.js + shadcn/ui + Zustand | 기존 팀 역량, 비기술자 UI |
| D6 | SDD | Python + Plumb 확장 | SDD Triangle 핵심, LLM 생태계 |
| D7 | 저장소 | PostgreSQL + Redis + Git(SSOT) | 5개→3개 간소화 |
| D8 | Git 플랫폼 | GitHub + GitLab 둘 다 | octokit + GitLab API 추상화 레이어 |
| D9 | 기존 코드 | 부분 재활용 | 타입/인증/이벤트 재사용, 파이프라인은 재설계 |

---

## 8. Open Questions

| # | Question | 영향 | 결정 시점 |
|---|----------|------|----------|
| Q1 | Plumb을 fork하여 확장할 것인가, 별도 SDD Engine을 만들 것인가? | SDD Engine 설계 | Phase 1 Sprint 1 |
| Q2 | 에이전트 오케스트레이션 프로토콜 (MCP vs REST vs 자체) | 에이전트 통합 | Phase 1 Sprint 2 |
| Q3 | GitHub/GitLab 추상화 레이어 직접 구현 vs 기존 라이브러리 활용 | API Server | Phase 1 Sprint 1 |
| Q4 | 웹 대시보드의 자연어 입력 → LLM 연동 방식 | 비기술자 접근성 | Phase 2 |
