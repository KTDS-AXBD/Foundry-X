---
code: FX-DSGN-OC1
title: OpenClaw MVP — AI PoC 빌더 플랫폼 설계
version: 0.1
status: Draft
category: DSGN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# OpenClaw MVP Design Document

> **Summary**: 프롬프트→AI 코드 생성→Sandpack 프리뷰→Cloudflare 배포 전체 아키텍처 + API/UI/데이터 상세 설계
>
> **Project**: OpenClaw (별도 리포: KTDS-AXBD/openclaw)
> **Version**: MVP v0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-23
> **Status**: Draft
> **Planning Doc**: [openclaw-mvp.plan.md](../../01-plan/features/openclaw-mvp.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **비개발자 친화**: 코딩 없이 채팅형 UI로 PoC 생성 + 배포
2. **E2E 자동화**: 프롬프트 입력 → 코드 생성 → 프리뷰 → 배포 → URL 발급 원스톱
3. **반복 수정**: 대화형으로 "이 부분 바꿔줘" → AI 코드 업데이트 → 재프리뷰
4. **최소 인프라**: Cloudflare 올인 (Pages + Workers + D1), 별도 서버 없음

### 1.2 Design Principles

- **프롬프트가 곧 스펙**: 사용자의 자연어가 유일한 입력. 별도 설정/코드 불필요
- **AI 출력 = 배포 가능 코드**: 생성 코드가 바로 빌드+배포 가능한 상태여야 함
- **실패 허용 + 빠른 재시도**: AI 생성 실패 시 사용자가 프롬프트를 수정하여 재시도

---

## 2. Architecture

### 2.1 System Diagram

```
┌──────────────────────────────────────────────────────────┐
│  Browser (사용자)                                         │
│  ┌──────────┐  ┌───────────────┐  ┌────────────────────┐ │
│  │ PromptChat│  │ CodePreview   │  │ DeployPanel        │ │
│  │ (채팅 UI) │→ │ (Sandpack)    │  │ 배포 → URL 발급   │ │
│  └─────┬────┘  └───────────────┘  └────────┬───────────┘ │
└────────┼───────────────────────────────────┼─────────────┘
         │ SSE (스트리밍)                     │ POST /deploy
         ▼                                   ▼
┌─────────────────────────────────────────────────────────┐
│  OpenClaw API (Hono, Cloudflare Workers)                │
│                                                         │
│  ┌─────────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ POST /generate   │  │ POST /refine│  │POST /deploy│  │
│  │ 프롬프트→코드    │  │ 수정 요청   │  │ wrangler   │  │
│  └────────┬────────┘  └──────┬──────┘  └─────┬──────┘  │
│           │                   │                │         │
│           ▼                   ▼                ▼         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ AICodeEngine                                      │   │
│  │ ┌──────────┐  ┌───────────┐  ┌────────────────┐  │   │
│  │ │ System   │  │ Claude    │  │ Output Parser  │  │   │
│  │ │ Prompt   │→ │ API Call  │→ │ JSON→Files     │  │   │
│  │ └──────────┘  └───────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │ ProjectStore │  │ Deployer     │                     │
│  │ D1 CRUD     │  │ wrangler API │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Core Data Flow — 신규 PoC 생성

```
1. 사용자: 프롬프트 입력 ("고객 피드백 대시보드 만들어줘")
2. Web: POST /api/generate { prompt, projectId? }
3. API: AICodeEngine.generate(prompt)
   a. 시스템 프롬프트 + 사용자 프롬프트 → Claude API 호출
   b. 응답: { files: { "index.html": "...", "style.css": "...", "app.js": "..." } }
   c. D1에 프로젝트 저장 (메타 + 생성 코드 + 대화 이력)
4. Web: Sandpack에 files 전달 → 실시간 프리뷰
5. 사용자: "차트를 파란색으로 바꿔줘"
6. Web: POST /api/refine { projectId, message, currentFiles }
7. API: AICodeEngine.refine(message, currentFiles, history)
   → Claude API (이전 대화 + 현재 코드 + 수정 요청)
   → 수정된 files 반환
8. Web: Sandpack 업데이트
9. 사용자: "배포" 버튼 클릭
10. Web: POST /api/deploy { projectId }
11. API: Deployer.deploy(files)
    → 임시 디렉토리에 파일 생성 → wrangler pages deploy
    → URL 반환: oc-{projectId}.pages.dev
12. Web: URL 표시 + 복사 버튼
```

### 2.3 Core Data Flow — 대화형 수정

```
사용자 ←→ PromptChat ←→ POST /refine ←→ Claude API
              ↓                              ↓
         Sandpack 업데이트            대화 이력 누적 (D1)
              ↓
         프리뷰 자동 갱신
```

### 2.4 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| PromptChat | `/api/generate`, `/api/refine` | 프롬프트 전송 + 응답 수신 |
| CodePreview | Sandpack (`@codesandbox/sandpack-react`) | 브라우저 내 코드 실행 |
| DeployPanel | `/api/deploy` | Cloudflare Pages 배포 |
| AICodeEngine | `@anthropic-ai/sdk` | Claude API 코드 생성 |
| Deployer | `wrangler` CLI | Pages 배포 자동화 |
| ProjectStore | Cloudflare D1 | 프로젝트 메타/코드/이력 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
interface Project {
  id: string;           // UUID
  userId: string;       // Google OAuth sub
  title: string;        // AI가 자동 생성 또는 사용자 입력
  prompt: string;       // 최초 프롬프트
  files: string;        // JSON stringified Record<string, string>
  deployUrl: string | null;  // 배포 URL (미배포 시 null)
  status: 'draft' | 'deployed';
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;      // 사용자: 프롬프트/수정 요청, AI: 생성/수정 결과 요약
  files: string | null; // AI 응답 시 생성된 파일 스냅샷
  createdAt: string;
}
```

### 3.2 D1 Schema

```sql
-- 0001_initial.sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  prompt TEXT NOT NULL,
  files TEXT NOT NULL DEFAULT '{}',
  deploy_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  files TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_messages_project ON messages(project_id);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/generate` | 프롬프트→코드 생성 (신규 프로젝트) | Required |
| POST | `/api/refine` | 대화형 수정 | Required |
| POST | `/api/deploy` | Cloudflare Pages 배포 | Required |
| GET | `/api/projects` | 프로젝트 목록 | Required |
| GET | `/api/projects/:id` | 프로젝트 상세 (코드+이력) | Required |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 | Required |
| POST | `/api/auth/google` | Google OAuth 로그인 | No |

### 4.2 POST /api/generate

프롬프트를 받아 AI가 풀스택 코드를 생성하고 프로젝트를 저장.

**Request:**
```json
{
  "prompt": "고객 피드백 대시보드를 만들어줘. 차트와 테이블이 있어야 해."
}
```

**Response (201, SSE 스트리밍):**
```
event: status
data: {"phase": "generating", "message": "코드를 생성하고 있어요..."}

event: files
data: {"files": {"index.html": "<!DOCTYPE html>...", "style.css": "...", "app.js": "..."}}

event: complete
data: {"projectId": "proj_abc123", "title": "고객 피드백 대시보드", "fileCount": 3}
```

**AI System Prompt (핵심):**
```
당신은 웹 앱을 만드는 전문 개발자입니다.
사용자의 요구사항을 받아 즉시 실행 가능한 웹 앱 코드를 생성하세요.

규칙:
1. 반드시 JSON 형식으로 응답: { "title": "...", "files": { "파일명": "내용", ... } }
2. HTML+CSS+JavaScript만 사용 (프레임워크 없음, CDN 라이브러리 허용)
3. index.html이 반드시 포함되어야 함 (진입점)
4. 모든 코드는 하나의 HTML 파일로도 동작 가능해야 함 (Sandpack 호환)
5. 외부 라이브러리는 CDN으로 포함 (Chart.js, Tailwind CSS 등)
6. 한국어 UI 기본
```

### 4.3 POST /api/refine

기존 코드 + 대화 이력 + 수정 요청을 받아 코드를 업데이트.

**Request:**
```json
{
  "projectId": "proj_abc123",
  "message": "차트 색상을 파란색으로 바꾸고, 테이블에 필터 기능 추가해줘"
}
```

**Response (200, SSE 스트리밍):**
```
event: files
data: {"files": {"index.html": "...(수정됨)", "style.css": "...(수정됨)", "app.js": "...(수정됨)"}}

event: complete
data: {"modifiedFiles": ["style.css", "app.js"], "summary": "차트 색상 변경 + 테이블 필터 추가"}
```

### 4.4 POST /api/deploy

프로젝트의 현재 코드를 Cloudflare Pages에 배포.

**Request:**
```json
{
  "projectId": "proj_abc123"
}
```

**Response (200):**
```json
{
  "url": "https://oc-proj-abc123.pages.dev",
  "status": "deployed",
  "deployedAt": "2026-03-23T15:00:00Z"
}
```

**내부 처리:**
```
1. D1에서 프로젝트 files 로드
2. /tmp/oc-{projectId}/ 디렉토리에 파일 생성
3. wrangler pages deploy /tmp/oc-{projectId}/ --project-name oc-{projectId}
4. URL 반환 + D1 deploy_url 갱신
```

---

## 5. UI/UX Design

### 5.1 메인 화면 — 새 PoC 생성 (`/new`)

```
┌──────────────────────────────────────────────────────────┐
│  🦞 OpenClaw                      [프로젝트 목록] [로그인] │
├───────────────────────┬──────────────────────────────────┤
│                       │                                  │
│  💬 채팅              │  👁️ 프리뷰                       │
│                       │                                  │
│  ┌─────────────────┐  │  ┌──────────────────────────┐    │
│  │ 🤖 안녕하세요!   │  │  │                          │    │
│  │ 어떤 PoC를      │  │  │  (Sandpack 프리뷰 영역)  │    │
│  │ 만들까요?       │  │  │                          │    │
│  └─────────────────┘  │  │  생성 후 여기에 표시됩니다 │    │
│                       │  │                          │    │
│  ┌─────────────────┐  │  └──────────────────────────┘    │
│  │ 예시:            │  │                                  │
│  │ • 고객 피드백    │  │  ┌────────────────────────────┐  │
│  │   대시보드       │  │  │  🚀 배포하기               │  │
│  │ • 팀 일정 관리   │  │  │  배포 시 공개 URL이        │  │
│  │ • SR 접수 양식   │  │  │  자동 생성됩니다          │  │
│  └─────────────────┘  │  └────────────────────────────┘  │
│                       │                                  │
│  ┌─────────────────┐  │                                  │
│  │ 메시지 입력...   │  │                                  │
│  │            [전송]│  │                                  │
│  └─────────────────┘  │                                  │
│                       │                                  │
├───────────────────────┴──────────────────────────────────┤
│  OpenClaw v0.1.0 | AX BD팀                               │
└──────────────────────────────────────────────────────────┘
```

### 5.2 프로젝트 목록 (`/`)

```
┌──────────────────────────────────────────────┐
│  🦞 OpenClaw                        [+ 새로 만들기]  │
│                                              │
│  내 프로젝트                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ 📊 고객    │ │ 📝 SR 접수 │ │ 📅 일정    ││
│  │ 피드백     │ │ 양식      │ │ 관리       ││
│  │ 대시보드   │ │           │ │            ││
│  │            │ │           │ │            ││
│  │ 🟢 배포됨  │ │ 📝 초안   │ │ 📝 초안    ││
│  │ 3/23      │ │ 3/22      │ │ 3/21       ││
│  └────────────┘ └────────────┘ └────────────┘│
└──────────────────────────────────────────────┘
```

### 5.3 User Flow

```
[첫 접속]
로그인 (Google) → 프로젝트 목록 (빈 상태) → "+ 새로 만들기"
  ↓
[PoC 생성]
프롬프트 입력 → AI 생성 중 (로딩) → 프리뷰 표시 → 만족?
  ├─ Yes → "배포" → URL 발급 → 공유
  └─ No  → 수정 요청 입력 → AI 수정 → 프리뷰 갱신 (반복)
```

### 5.4 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `PromptChat` | `components/PromptChat.tsx` | 채팅형 프롬프트 입력 + AI 응답 표시 |
| `CodePreview` | `components/CodePreview.tsx` | Sandpack 래퍼, files→실시간 프리뷰 |
| `DeployPanel` | `components/DeployPanel.tsx` | 배포 버튼 + URL 표시 + 복사 |
| `ProjectList` | `components/ProjectList.tsx` | 카드 그리드 목록 |
| `ProjectCard` | `components/ProjectCard.tsx` | 개별 프로젝트 카드 (제목+상태+날짜) |
| `ExamplePrompts` | `components/ExamplePrompts.tsx` | 예시 프롬프트 칩 목록 |

---

## 6. Error Handling

| Code | Cause | User Message | Recovery |
|------|-------|-------------|----------|
| AI 생성 실패 | Claude API 에러/타임아웃 | "생성에 실패했어요. 다시 시도해주세요." | 재시도 버튼 |
| 코드 파싱 실패 | AI가 JSON 외 형식 응답 | "코드를 정리하는 중 문제가 생겼어요." | 자동 재시도 1회 |
| 배포 실패 | wrangler 에러 | "배포에 실패했어요. 잠시 후 다시 시도해주세요." | 재시도 버튼 |
| 프리뷰 에러 | Sandpack 실행 에러 | "프리뷰에서 에러가 발생했어요." | 에러 내용 표시 + 수정 유도 |

---

## 7. Security Considerations

- [x] Google OAuth 인증 필수 (비로그인 접근 차단)
- [x] AI API에 프롬프트만 전송 (고객 데이터 최소 노출)
- [x] 생성 코드는 Cloudflare 인프라 내 보관
- [x] 배포 URL은 프로젝트 소유자만 관리 가능
- [ ] Rate limiting: 사용자당 시간당 20회 생성 제한
- [ ] 프롬프트 인젝션 방어: 시스템 프롬프트 보호

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Count |
|------|--------|------|-------|
| Unit | AICodeEngine, Deployer, ProjectStore | Vitest | 15~20 |
| API Integration | generate, refine, deploy endpoints | Hono test client | 10~15 |
| E2E | 프롬프트→생성→프리뷰→배포 전체 플로우 | Playwright | 3~5 |

### 8.2 Key Test Cases

- [ ] 프롬프트 → AI 응답이 유효한 JSON (files 포함)
- [ ] Sandpack에 files 전달 시 에러 없이 렌더링
- [ ] 배포 후 URL이 200 OK 반환
- [ ] 대화형 수정 3회 → 코드가 누적 반영
- [ ] Google OAuth 미인증 시 401

---

## 9. Implementation Guide

### 9.1 리포 초기 구조

```
openclaw/
├── packages/
│   ├── web/                         # Next.js 15
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx              # 프로젝트 목록 (홈)
│   │   │   │   ├── new/page.tsx          # 새 PoC 생성
│   │   │   │   ├── p/[id]/page.tsx       # PoC 상세 (프리뷰+수정+배포)
│   │   │   │   └── login/page.tsx        # Google OAuth
│   │   │   ├── components/
│   │   │   │   ├── PromptChat.tsx
│   │   │   │   ├── CodePreview.tsx
│   │   │   │   ├── DeployPanel.tsx
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   └── ExamplePrompts.tsx
│   │   │   └── lib/
│   │   │       ├── api-client.ts         # API 호출 함수
│   │   │       └── auth-store.ts         # Zustand 인증 상태
│   │   ├── package.json
│   │   └── next.config.ts
│   └── api/                         # Hono (Workers)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── generate.ts
│       │   │   ├── refine.ts
│       │   │   ├── deploy.ts
│       │   │   ├── projects.ts
│       │   │   └── auth.ts
│       │   ├── services/
│       │   │   ├── ai-engine.ts          # Claude API + 프롬프트 관리
│       │   │   ├── deployer.ts           # wrangler 래핑
│       │   │   └── project-store.ts      # D1 CRUD
│       │   ├── prompts/
│       │   │   ├── system.ts             # 시스템 프롬프트
│       │   │   └── refine.ts             # 수정 프롬프트
│       │   ├── db/
│       │   │   └── migrations/
│       │   │       └── 0001_initial.sql
│       │   └── index.ts
│       ├── wrangler.toml
│       └── package.json
├── package.json                     # root (pnpm workspace)
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md
```

### 9.2 Implementation Order

| # | Task | Sprint | Dependencies |
|---|------|:------:|-------------|
| 1 | 리포 생성 + 모노리포 세팅 (pnpm + turbo) | S1 | — |
| 2 | D1 스키마 + wrangler.toml | S1 | #1 |
| 3 | Hono API 기본 (auth + projects CRUD) | S1 | #2 |
| 4 | AICodeEngine — Claude API 연동 + 시스템 프롬프트 | S1 | #3 |
| 5 | POST /generate + POST /refine (SSE 스트리밍) | S1 | #4 |
| 6 | Next.js 기본 세팅 + Google OAuth | S2 | #1 |
| 7 | PromptChat 컴포넌트 + API 연동 | S2 | #5, #6 |
| 8 | CodePreview (Sandpack 연동) | S2 | #7 |
| 9 | Deployer 서비스 + POST /deploy | S2 | #5 |
| 10 | DeployPanel + 배포 플로우 연결 | S2 | #8, #9 |
| 11 | ProjectList + ProjectCard + 홈 화면 | S3 | #6 |
| 12 | 대화형 수정 UX 완성 | S3 | #7, #8 |
| 13 | 에러 핸들링 + 로딩 상태 | S3 | #12 |
| 14 | E2E 테스트 + 내부 파일럿 | S4 | #13 |

### 9.3 핵심 구현 — AI System Prompt

```typescript
// packages/api/src/prompts/system.ts
export const SYSTEM_PROMPT = `당신은 웹 앱을 만드는 전문 개발자입니다.
사용자의 요구사항을 받아 즉시 실행 가능한 웹 앱 코드를 생성하세요.

## 응답 규칙
1. 반드시 JSON으로만 응답하세요:
   { "title": "앱 제목", "files": { "파일명": "내용", ... } }
2. index.html이 반드시 포함되어야 합니다 (진입점).
3. HTML + CSS + JavaScript만 사용하세요 (프레임워크 없음).
4. 외부 라이브러리는 CDN으로 포함하세요:
   - 차트: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
   - 스타일: <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/...">
5. 모든 코드가 하나의 페이지에서 동작해야 합니다.
6. 한국어 UI를 기본으로 하세요.
7. 더미 데이터를 포함하여 즉시 동작하는 상태로 만드세요.

## 품질 기준
- 시각적으로 깔끔한 UI (Tailwind CSS 권장)
- 반응형 디자인
- 에러 상태 처리
- 접근성 기본 준수 (aria-label, alt 등)`;
```

### 9.4 핵심 구현 — Deployer

```typescript
// packages/api/src/services/deployer.ts (개념)
export class Deployer {
  async deploy(projectId: string, files: Record<string, string>): Promise<string> {
    // 1. 임시 디렉토리에 파일 생성
    // 2. wrangler pages deploy 실행
    // 3. URL 반환
    // MVP에서는 Cloudflare Pages Direct Upload API 사용
    // https://developers.cloudflare.com/pages/configuration/direct-upload/
  }
}
```

---

## 10. Coding Convention

| Item | Convention |
|------|-----------|
| Component naming | PascalCase: `PromptChat`, `CodePreview` |
| API route files | kebab-case or camelCase: `generate.ts`, `projects.ts` |
| Service files | kebab-case: `ai-engine.ts`, `project-store.ts` |
| State management | Zustand (`useAuthStore`, `useProjectStore`) |
| Styling | Tailwind CSS + shadcn/ui |
| Testing | Vitest + Playwright |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | Initial draft | Sinclair Seo |
