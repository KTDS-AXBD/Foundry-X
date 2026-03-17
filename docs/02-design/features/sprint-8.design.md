---
code: FX-DSGN-008
title: Sprint 8 (v0.8.0) — API 실데이터 완성 + SSE + NL→Spec + Wiki Git 동기화 상세 설계
version: 0.2
status: Draft
category: DSGN
system-version: 0.8.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# Sprint 8 Design Document

> **Summary**: 남은 4개 API 엔드포인트를 GitHub API+KV 캐시로 실데이터 전환하고, SSE를 D1 기반으로 고도화하며, NL→Spec LLM 파이프라인과 Wiki↔Git 양방향 동기화를 구현하고, fx.minu.best 프로덕션 사이트(랜딩+대시보드 통합)를 설계하는 상세 설계.
>
> **Project**: Foundry-X
> **Version**: 0.8.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-17
> **Status**: Draft
> **Planning Doc**: [sprint-8.plan.md](../../01-plan/features/sprint-8.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **실데이터 완성**: requirements/health/integrity/freshness 4개 엔드포인트의 mock 제거 — GitHub API + KV 캐시 기반
2. **서비스 레이어 도입**: 라우트 인라인 로직 → `services/` 계층 추출로 테스트 용이성 확보
3. **SSE 고도화**: mock 5초 heartbeat → D1 기반 실 에이전트 세션 추적 + 멀티 이벤트 타입
4. **NL→Spec MVP**: LLM 통합 파이프라인으로 자연어 → 구조화 명세 변환
5. **Wiki Git 동기화**: D1 wiki_pages ↔ Git 리포 양방향 sync ("Git이 진실" 원칙)

### 1.2 현재 코드 분석

| 파일 | 현재 패턴 | 문제 | Sprint 8 변경 |
|------|----------|------|--------------|
| routes/requirements.ts | MOCK_REQUIREMENTS + statusOverrides Map | Workers 불호환 (fs mock) | GitHubService → KV → SpecParser |
| routes/health.ts | MOCK_HEALTH 하드코딩 | 실제 계산 없음 | D1 기반 Triangle 점수 계산 |
| routes/integrity.ts | MOCK 5개 체크 결과 | 실제 파일 검증 없음 | GitHub API 기반 파일 존재+내용 검증 |
| routes/freshness.ts | MOCK 문서 3건 | 실제 수정 시점 없음 | GitHub API 커밋 이력 기반 |
| routes/agent.ts (SSE) | ReadableStream + 5초 mock | 하드코딩 agentId | D1 agentSessions 실시간 + 4 이벤트 타입 |
| routes/wiki.ts | D1 CRUD only | Git 동기화 없음 | WikiSyncService 추가 |
| — (신규) | — | NL→Spec 미구현 | POST /api/spec/generate + LLM 통합 |

### 1.3 환경 바인딩 변경

```typescript
// packages/api/src/env.ts — Sprint 8 변경
export type Env = {
  // 기존
  DB: D1Database;
  GITHUB_TOKEN: string;
  JWT_SECRET: string;
  GITHUB_REPO: string;  // "KTDS-AXBD/Foundry-X"

  // Sprint 8 신규
  CACHE: KVNamespace;             // KV 캐시 (requirements, GitHub 응답)
  AI: Ai;                         // Workers AI 바인딩 (NL→Spec)
  ANTHROPIC_API_KEY?: string;     // Claude API fallback (선택)
  WEBHOOK_SECRET?: string;        // GitHub Webhook 서명 검증
};
```

**wrangler.toml 추가 항목**:

```toml
# KV 네임스페이스
[[kv_namespaces]]
binding = "CACHE"
id = "<생성 후 입력>"

# Workers AI
[ai]
binding = "AI"
```

---

## 2. 서비스 레이어 설계

### 2.1 디렉토리 구조

```
packages/api/src/
├── routes/              # OpenAPI 라우트 (얇은 컨트롤러)
│   ├── auth.ts          # 기존 유지
│   ├── wiki.ts          # + WikiSyncService 호출 추가
│   ├── requirements.ts  # → GitHubService + SpecParser 전환
│   ├── health.ts        # → HealthCalculator 전환
│   ├── integrity.ts     # → IntegrityChecker 전환
│   ├── freshness.ts     # → FreshnessChecker 전환
│   ├── agent.ts         # → SSEManager D1 기반 전환
│   ├── spec.ts          # 신규: NL→Spec 엔드포인트
│   └── webhook.ts       # 신규: GitHub Webhook 수신
├── services/            # 신규: 비즈니스 로직 계층
│   ├── github.ts        # GitHub REST API 래퍼
│   ├── kv-cache.ts      # KV 캐시 유틸
│   ├── spec-parser.ts   # SPEC.md F-items 파서
│   ├── health-calc.ts   # SDD Triangle 점수 계산
│   ├── integrity-checker.ts  # 하네스 무결성 검증
│   ├── freshness-checker.ts  # 문서 신선도 검사
│   ├── sse-manager.ts   # SSE 스트림 관리
│   ├── llm.ts           # LLM 통합 (Workers AI / Claude)
│   └── wiki-sync.ts     # Wiki ↔ Git 동기화
├── schemas/             # 기존 + 신규 Zod 스키마
│   └── spec.ts          # 신규: NL→Spec 입출력 스키마
├── middleware/           # 기존 유지
├── db/                  # 기존 유지
└── utils/               # 기존 유지
```

### 2.2 서비스 계층 규칙

1. **라우트는 얇게**: 요청 파싱 → 서비스 호출 → 응답 포맷만 담당
2. **서비스는 Env 의존성 주입**: `(env: Env)` 파라미터로 D1/KV/AI 바인딩 수신
3. **서비스 간 직접 호출 금지**: 라우트가 오케스트레이션 담당
4. **에러는 서비스에서 throw**: 라우트에서 catch + HTTP 상태 코드 매핑

```typescript
// 서비스 패턴 예시
export class GitHubService {
  constructor(private token: string, private repo: string) {}

  async getFileContent(path: string): Promise<{ content: string; sha: string }> {
    // ...
  }
}

// 라우트에서 사용
const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
const result = await github.getFileContent("SPEC.md");
```

---

## 3. F41 잔여 — API 실데이터 완성 상세 설계

### 3.1 GitHubService (`services/github.ts`)

GitHub REST API v3 래퍼. Workers 환경에서 `fetch` 직접 사용 (octokit 번들 제외).

```typescript
export class GitHubService {
  private baseUrl = "https://api.github.com";

  constructor(
    private token: string,
    private repo: string  // "KTDS-AXBD/Foundry-X"
  ) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Foundry-X-API/0.8.0",
    };
  }

  // 파일 내용 조회 (Base64 디코딩)
  async getFileContent(path: string): Promise<{
    content: string;
    sha: string;
    size: number;
  }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/contents/${path}`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new GitHubApiError(res.status, path);
    const data = await res.json() as { content: string; sha: string; size: number };
    return {
      content: atob(data.content.replace(/\n/g, "")),
      sha: data.sha,
      size: data.size,
    };
  }

  // 커밋 이력 조회 (파일별)
  async getCommits(path: string, perPage = 5): Promise<GitHubCommit[]> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/commits?path=${encodeURIComponent(path)}&per_page=${perPage}`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new GitHubApiError(res.status, path);
    return res.json() as Promise<GitHubCommit[]>;
  }

  // 파일 생성/수정 (커밋)
  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    sha?: string  // 수정 시 기존 SHA 필요
  ): Promise<{ sha: string; commit: { sha: string } }> {
    const body: Record<string, string> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) body.sha = sha;

    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/contents/${path}`,
      {
        method: "PUT",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new GitHubApiError(res.status, path);
    return res.json() as Promise<{ sha: string; commit: { sha: string } }>;
  }

  // 파일 존재 여부 확인 (HEAD 요청)
  async fileExists(path: string): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/contents/${path}`,
      { method: "HEAD", headers: this.headers() }
    );
    return res.ok;
  }
}

// 에러 클래스
export class GitHubApiError extends Error {
  constructor(public status: number, public path: string) {
    super(`GitHub API ${status} for ${path}`);
  }
}

// 타입
export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}
```

### 3.2 KVCacheService (`services/kv-cache.ts`)

Cloudflare KV 기반 캐시. GitHub API 호출 최소화.

```typescript
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

export class KVCacheService {
  private defaultTTL = 300; // 5분

  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.kv.get(key, "text");
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    return entry.data;
  }

  async set<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
    };
    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: ttlSeconds ?? this.defaultTTL,
    });
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async invalidate(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}
```

**KV 키 컨벤션**:

| 키 패턴 | 용도 | TTL |
|---------|------|-----|
| `spec:requirements` | SPEC.md F-items 파싱 결과 | 5분 |
| `github:file:{path}` | GitHub 파일 내용 | 5분 |
| `github:commits:{path}` | 커밋 이력 | 5분 |
| `health:score` | SDD Triangle 점수 | 2분 |
| `integrity:checks` | 하네스 무결성 결과 | 5분 |
| `freshness:report` | 문서 신선도 보고서 | 5분 |

### 3.3 SpecParser (`services/spec-parser.ts`)

SPEC.md 마크다운 → F-items 배열 파싱.

```typescript
export interface SpecRequirement {
  id: string;        // "F44"
  title: string;     // "SSE 실시간 통신"
  reqCode: string;   // "FX-REQ-044"
  priority: string;  // "P1"
  version: string;   // "v0.8"
  status: "planned" | "in_progress" | "done" | "rejected";
  notes: string;
}

export function parseSpecRequirements(specContent: string): SpecRequirement[] {
  const requirements: SpecRequirement[] = [];

  // §5 기능 항목 섹션의 테이블 행 파싱
  // 패턴: | F{N} | 제목 (FX-REQ-NNN, P{N}) | v{X.Y} | 상태이모지 | 비고 |
  const tableRowRegex =
    /\|\s*F(\d+)\s*\|\s*(.+?)\s*\(([A-Z-]+\d+),\s*(P\d)\)\s*\|\s*(v[\d.]+)\s*\|\s*(\S+)\s*\|\s*(.*?)\s*\|/g;

  let match: RegExpExecArray | null;
  while ((match = tableRowRegex.exec(specContent)) !== null) {
    const [, fNum, title, reqCode, priority, version, statusEmoji, notes] = match;
    requirements.push({
      id: `F${fNum}`,
      title: title.trim(),
      reqCode,
      priority,
      version,
      status: parseStatusEmoji(statusEmoji),
      notes: notes.trim(),
    });
  }

  return requirements;
}

function parseStatusEmoji(emoji: string): SpecRequirement["status"] {
  if (emoji.includes("\u2705")) return "done";       // ✅
  if (emoji.includes("\ud83d\udd27")) return "in_progress"; // 🔧
  if (emoji.includes("\ud83d\udccb")) return "planned";     // 📋
  if (emoji.includes("\u274c")) return "rejected";    // ❌
  return "planned";
}
```

### 3.4 requirements 라우트 리팩토링

```typescript
// routes/requirements.ts — Sprint 8 전환
import { GitHubService } from "../services/github";
import { KVCacheService } from "../services/kv-cache";
import { parseSpecRequirements, type SpecRequirement } from "../services/spec-parser";

// GET /api/requirements
requirementsRoute.openapi(getRequirementsRoute, async (c) => {
  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const cache = new KVCacheService(c.env.CACHE);

  try {
    const requirements = await cache.getOrFetch<SpecRequirement[]>(
      "spec:requirements",
      async () => {
        const { content } = await github.getFileContent("SPEC.md");
        return parseSpecRequirements(content);
      },
      300  // 5분 TTL
    );

    return c.json({
      total: requirements.length,
      items: requirements,
      source: "github",
    });
  } catch {
    // Graceful fallback: GitHub API 실패 시 mock 반환
    return c.json({
      total: MOCK_REQUIREMENTS.length,
      items: MOCK_REQUIREMENTS,
      source: "mock",
    });
  }
});
```

### 3.5 HealthCalculator (`services/health-calc.ts`)

SDD Triangle 점수 계산. D1 데이터 + GitHub API 기반.

```typescript
export interface HealthScore {
  overall: number;          // 0-100
  specToCode: number;       // Spec↔Code 동기화 점수
  codeToTest: number;       // Code↔Test 커버리지 점수
  specToTest: number;       // Spec↔Test 추적성 점수
  details: HealthDetail[];
}

interface HealthDetail {
  category: string;
  score: number;
  message: string;
}

export class HealthCalculator {
  constructor(
    private github: GitHubService,
    private cache: KVCacheService
  ) {}

  async calculate(): Promise<HealthScore> {
    return this.cache.getOrFetch("health:score", async () => {
      // 1. SPEC.md에서 F-items 총 수 / DONE 수
      const { content: specContent } = await this.github.getFileContent("SPEC.md");
      const requirements = parseSpecRequirements(specContent);
      const totalItems = requirements.length;
      const doneItems = requirements.filter(r => r.status === "done").length;
      const specToCode = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

      // 2. 테스트 파일 존재 여부
      const codeToTest = await this.calculateTestCoverage();

      // 3. Spec↔Test: 가중 평균
      const specToTest = Math.round((specToCode + codeToTest) / 2);

      const overall = Math.round((specToCode + codeToTest + specToTest) / 3);

      return {
        overall,
        specToCode,
        codeToTest,
        specToTest,
        details: [
          { category: "Spec->Code", score: specToCode, message: `${doneItems}/${totalItems} F-items completed` },
          { category: "Code->Test", score: codeToTest, message: "Test coverage ratio" },
          { category: "Spec->Test", score: specToTest, message: "Traceability score" },
        ],
      };
    }, 120);  // 2분 TTL
  }

  private async calculateTestCoverage(): Promise<number> {
    try {
      const { content } = await this.github.getFileContent("package.json");
      const pkg = JSON.parse(content);
      return pkg.scripts?.test ? 75 : 30;
    } catch {
      return 50;
    }
  }
}
```

### 3.6 IntegrityChecker (`services/integrity-checker.ts`)

하네스 파일 존재 + 내용 유효성 검증. GitHub API 기반.

```typescript
export interface IntegrityCheck {
  name: string;
  passed: boolean;
  level: "PASS" | "WARN" | "FAIL";
  message: string;
}

export interface IntegrityReport {
  overallPassed: boolean;
  score: number;
  checks: IntegrityCheck[];
  checkedAt: string;
}

const REQUIRED_FILES = [
  { path: "CLAUDE.md", name: "CLAUDE.md 존재", required: true },
  { path: ".github/workflows/deploy.yml", name: "CI/CD 파이프라인", required: true },
  { path: "package.json", name: "패키지 매니페스트", required: true },
  { path: "tsconfig.json", name: "TypeScript 설정", required: false },
  { path: "eslint.config.js", name: "ESLint 설정", required: false },
];

export class IntegrityChecker {
  constructor(
    private github: GitHubService,
    private cache: KVCacheService
  ) {}

  async check(): Promise<IntegrityReport> {
    return this.cache.getOrFetch("integrity:checks", async () => {
      const checks: IntegrityCheck[] = [];

      for (const file of REQUIRED_FILES) {
        const exists = await this.github.fileExists(file.path);
        checks.push({
          name: file.name,
          passed: exists,
          level: exists ? "PASS" : file.required ? "FAIL" : "WARN",
          message: exists
            ? `${file.path} confirmed`
            : `${file.path} ${file.required ? "required file missing" : "recommended file missing"}`,
        });
      }

      // CLAUDE.md 내용 검증
      try {
        const { content } = await this.github.getFileContent("CLAUDE.md");
        const hasProjectOverview = content.includes("## Project Overview");
        const hasDevCommands = content.includes("## Development Commands");
        checks.push({
          name: "CLAUDE.md required sections",
          passed: hasProjectOverview && hasDevCommands,
          level: hasProjectOverview && hasDevCommands ? "PASS" : "WARN",
          message: hasProjectOverview && hasDevCommands
            ? "Project Overview + Development Commands sections confirmed"
            : "Missing required sections",
        });
      } catch {
        // skip content check if file read fails
      }

      const passedCount = checks.filter(c => c.passed).length;
      const score = Math.round((passedCount / checks.length) * 100);

      return {
        overallPassed: checks.every(c => c.level !== "FAIL"),
        score,
        checks,
        checkedAt: new Date().toISOString(),
      };
    }, 300);
  }
}
```

### 3.7 FreshnessChecker (`services/freshness-checker.ts`)

하네스 문서 수정 시점 vs 코드 최종 커밋 비교.

```typescript
export interface FreshnessItem {
  document: string;
  lastModified: string;
  lastCodeCommit: string;
  staleDays: number;
  isStale: boolean;
}

export interface FreshnessReport {
  items: FreshnessItem[];
  checkedAt: string;
}

const HARNESS_DOCS = [
  "CLAUDE.md",
  "SPEC.md",
  "docs/specs/prd-v4.md",
];

export class FreshnessChecker {
  constructor(
    private github: GitHubService,
    private cache: KVCacheService
  ) {}

  async check(): Promise<FreshnessReport> {
    return this.cache.getOrFetch("freshness:report", async () => {
      const items: FreshnessItem[] = [];

      const codeCommits = await this.github.getCommits("packages", 1);
      const lastCodeCommit = codeCommits[0]?.commit.author.date ?? new Date().toISOString();

      for (const docPath of HARNESS_DOCS) {
        try {
          const docCommits = await this.github.getCommits(docPath, 1);
          const lastModified = docCommits[0]?.commit.author.date ?? new Date().toISOString();

          const staleDays = Math.floor(
            (new Date(lastCodeCommit).getTime() - new Date(lastModified).getTime()) /
            (1000 * 60 * 60 * 24)
          );

          items.push({
            document: docPath,
            lastModified,
            lastCodeCommit,
            staleDays: Math.max(0, staleDays),
            isStale: staleDays > 7,
          });
        } catch {
          // skip if file not found
        }
      }

      return { items, checkedAt: new Date().toISOString() };
    }, 300);
  }
}
```

---

## 4. F44 — SSE 실시간 통신 상세 설계

### 4.1 SSE 이벤트 스키마

```typescript
// schemas/sse.ts
import { z } from "zod";

export const SSEActivityEvent = z.object({
  agentId: z.string(),
  status: z.enum(["active", "idle", "completed", "failed"]),
  currentTask: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  tokenUsed: z.number().optional(),
  timestamp: z.string().datetime(),
});

export const SSEStatusEvent = z.object({
  agentId: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
  result: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const SSEErrorEvent = z.object({
  agentId: z.string(),
  error: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
});

export const SSESyncEvent = z.object({
  type: z.enum(["spec-code", "code-test", "wiki-git"]),
  status: z.enum(["syncing", "synced", "conflict", "error"]),
  progress: z.number().min(0).max(100),
  timestamp: z.string().datetime(),
});

export type SSEEvent =
  | { event: "activity"; data: z.infer<typeof SSEActivityEvent> }
  | { event: "status"; data: z.infer<typeof SSEStatusEvent> }
  | { event: "error"; data: z.infer<typeof SSEErrorEvent> }
  | { event: "sync"; data: z.infer<typeof SSESyncEvent> };
```

### 4.2 SSEManager (`services/sse-manager.ts`)

D1 `agent_sessions` 테이블 폴링 기반 SSE 스트림.

```typescript
export class SSEManager {
  private encoder = new TextEncoder();
  private pollInterval = 10_000; // 10초 (Workers CPU 절약)

  constructor(private db: D1Database) {}

  createStream(): ReadableStream {
    let timerId: ReturnType<typeof setInterval> | undefined;
    let lastCheckedAt = new Date().toISOString();

    return new ReadableStream({
      start: (controller) => {
        const poll = async () => {
          try {
            const sessions = await this.db
              .prepare(
                `SELECT id, agentName, status, branch, startedAt, endedAt
                 FROM agent_sessions
                 WHERE startedAt > ? OR endedAt > ?
                 ORDER BY startedAt DESC
                 LIMIT 10`
              )
              .bind(lastCheckedAt, lastCheckedAt)
              .all();

            lastCheckedAt = new Date().toISOString();

            for (const session of sessions.results ?? []) {
              const event = this.sessionToSSEEvent(session);
              const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
              controller.enqueue(this.encoder.encode(payload));
            }

            // heartbeat (연결 유지)
            if (!sessions.results?.length) {
              controller.enqueue(
                this.encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`)
              );
            }
          } catch (err) {
            const errorPayload = {
              agentId: "system",
              error: "poll_failed",
              message: err instanceof Error ? err.message : "Unknown error",
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(
              this.encoder.encode(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`)
            );
          }
        };

        poll();
        timerId = setInterval(poll, this.pollInterval);
      },
      cancel: () => {
        if (timerId) clearInterval(timerId);
      },
    });
  }

  private sessionToSSEEvent(session: Record<string, unknown>): SSEEvent {
    const status = session.status as string;
    const isActive = status === "active";

    if (isActive) {
      return {
        event: "activity",
        data: {
          agentId: session.agentName as string,
          status: "active",
          currentTask: session.branch as string,
          progress: 50,
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      event: "status",
      data: {
        agentId: session.agentName as string,
        previousStatus: "active",
        newStatus: status,
        result: status === "completed" ? "Task finished" : undefined,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
```

### 4.3 agent.ts SSE 라우트 전환

```typescript
// routes/agent.ts — SSE 엔드포인트 전환
agentRoute.get("/agents/stream", (c) => {
  const sseManager = new SSEManager(c.env.DB);
  const stream = sseManager.createStream();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
```

### 4.4 Web SSE 클라이언트 (`packages/web/src/lib/sse-client.ts`)

```typescript
export type SSEEventType = "activity" | "status" | "error" | "sync";

interface SSEClientOptions {
  url: string;
  onActivity?: (data: ActivityEvent) => void;
  onStatus?: (data: StatusEvent) => void;
  onError?: (data: ErrorEvent) => void;
  onSync?: (data: SyncEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  maxRetries?: number;
  retryInterval?: number;
}

export class SSEClient {
  private es: EventSource | null = null;
  private retryCount = 0;
  private maxRetries: number;
  private retryInterval: number;

  constructor(private options: SSEClientOptions) {
    this.maxRetries = options.maxRetries ?? 5;
    this.retryInterval = options.retryInterval ?? 3000;
  }

  connect(): void {
    this.es = new EventSource(this.options.url);

    this.es.addEventListener("activity", (e: MessageEvent) => {
      this.retryCount = 0;
      try {
        const data = JSON.parse(e.data);
        this.options.onActivity?.(data);
      } catch { /* ignore malformed */ }
    });

    this.es.addEventListener("status", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.options.onStatus?.(data);
      } catch { /* ignore */ }
    });

    this.es.addEventListener("error", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.options.onError?.(data);
      } catch { /* ignore */ }
    });

    this.es.addEventListener("sync", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.options.onSync?.(data);
      } catch { /* ignore */ }
    });

    this.es.onopen = () => {
      this.retryCount = 0;
      this.options.onConnectionChange?.(true);
    };

    this.es.onerror = () => {
      this.options.onConnectionChange?.(false);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.connect(), this.retryInterval);
      }
    };
  }

  disconnect(): void {
    this.es?.close();
    this.es = null;
  }
}
```

### 4.5 AgentCard 실시간 업데이트

```typescript
// packages/web/src/app/agents/page.tsx — SSE 통합 변경
// 기존 EventSource 직접 사용 → SSEClient 클래스 전환

useEffect(() => {
  const client = new SSEClient({
    url: "/api/agents/stream",
    onActivity: (data) => {
      setAgents(prev =>
        prev?.map(a =>
          a.id === data.agentId ? { ...a, activity: data } : a
        ) ?? null
      );
    },
    onStatus: (data) => {
      setAgents(prev =>
        prev?.map(a =>
          a.id === data.agentId ? { ...a, status: data.newStatus } : a
        ) ?? null
      );
    },
    onConnectionChange: (connected) => setConnected(connected),
  });

  client.connect();
  return () => client.disconnect();
}, []);
```

---

## 5. F45 — NL→Spec 변환 상세 설계

### 5.1 Zod 스키마 (`schemas/spec.ts`)

```typescript
import { z } from "zod";

// 입력 스키마
export const SpecGenerateRequestSchema = z.object({
  text: z.string().min(10).max(2000).describe("자연어 요구사항 텍스트"),
  context: z.string().max(1000).optional().describe("추가 컨텍스트"),
  language: z.enum(["ko", "en"]).default("ko").describe("출력 언어"),
});

// 출력 스키마 (LLM 응답 검증용)
export const GeneratedSpecSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(500),
  acceptanceCriteria: z.array(z.string()).min(1).max(10),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  estimatedEffort: z.enum(["XS", "S", "M", "L", "XL"]),
  category: z.enum(["feature", "bugfix", "improvement", "infrastructure"]),
  dependencies: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
});

// API 응답
export const SpecGenerateResponseSchema = z.object({
  spec: GeneratedSpecSchema,
  markdown: z.string().describe("Markdown 포맷 명세 문서"),
  confidence: z.number().min(0).max(1).describe("LLM 변환 신뢰도"),
  model: z.string().describe("사용된 LLM 모델명"),
});
```

### 5.2 LLM 서비스 (`services/llm.ts`)

Workers AI 기본 + Claude API fallback 전략.

```typescript
interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

export class LLMService {
  constructor(
    private ai?: Ai,
    private anthropicKey?: string
  ) {}

  async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    // 전략 1: Workers AI (무료, 빠름)
    if (this.ai) {
      try {
        return await this.generateWithWorkersAI(systemPrompt, userPrompt);
      } catch {
        if (this.anthropicKey) {
          return this.generateWithClaude(systemPrompt, userPrompt);
        }
        throw new Error("LLM service unavailable");
      }
    }

    // 전략 2: Claude API
    if (this.anthropicKey) {
      return this.generateWithClaude(systemPrompt, userPrompt);
    }

    throw new Error("No LLM provider configured");
  }

  private async generateWithWorkersAI(
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    const result = await this.ai!.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
    });

    return {
      content: (result as { response: string }).response,
      model: "llama-3.1-8b-instruct",
      tokensUsed: 0,
    };
  }

  private async generateWithClaude(
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.anthropicKey!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = await res.json() as {
      content: Array<{ text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0].text,
      model: "claude-haiku-4-5",
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
    };
  }
}

// 프롬프트 템플릿
export const NL_TO_SPEC_SYSTEM_PROMPT = `You are a specification writer for software projects.
Convert natural language requirements into structured specifications.

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "title": "Feature title (5-100 chars)",
  "description": "Clear description of what to build (20-500 chars)",
  "acceptanceCriteria": ["AC-1: ...", "AC-2: ..."],
  "priority": "P0|P1|P2|P3",
  "estimatedEffort": "XS|S|M|L|XL",
  "category": "feature|bugfix|improvement|infrastructure",
  "dependencies": ["dependency description if any"],
  "risks": ["potential risk if any"]
}

RULES:
- P0 = critical/blocking, P1 = important, P2 = nice-to-have, P3 = future
- XS = <1h, S = 1-4h, M = 4-8h, L = 1-3 days, XL = 3+ days
- Acceptance criteria must be testable/verifiable
- Output ONLY valid JSON, no explanation`;

export function buildUserPrompt(text: string, context?: string): string {
  let prompt = `Convert the following requirement to a structured specification:\n\n"${text}"`;
  if (context) {
    prompt += `\n\nProject context: ${context}`;
  }
  return prompt;
}
```

### 5.3 NL→Spec 라우트 (`routes/spec.ts`)

```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  SpecGenerateRequestSchema,
  SpecGenerateResponseSchema,
  GeneratedSpecSchema,
} from "../schemas/spec";
import { LLMService, NL_TO_SPEC_SYSTEM_PROMPT, buildUserPrompt } from "../services/llm";

const specRoute = new OpenAPIHono<{ Bindings: Env }>();

const generateSpecRoute = createRoute({
  method: "post",
  path: "/spec/generate",
  tags: ["Spec"],
  summary: "자연어 → 구조화 명세 변환",
  request: {
    body: {
      content: { "application/json": { schema: SpecGenerateRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "생성된 명세",
      content: { "application/json": { schema: SpecGenerateResponseSchema } },
    },
    422: { description: "LLM 출력 검증 실패" },
    503: { description: "LLM 서비스 불가" },
  },
});

specRoute.openapi(generateSpecRoute, async (c) => {
  const { text, context, language } = c.req.valid("json");

  const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const systemPrompt = language === "en"
    ? NL_TO_SPEC_SYSTEM_PROMPT
    : NL_TO_SPEC_SYSTEM_PROMPT + "\n\nRespond in Korean (한국어).";

  const response = await llm.generate(systemPrompt, buildUserPrompt(text, context));

  // LLM 출력 JSON 파싱 + Zod 검증
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.content);
  } catch {
    return c.json({ error: "LLM output is not valid JSON" }, 422);
  }

  const result = GeneratedSpecSchema.safeParse(parsed);
  if (!result.success) {
    return c.json({
      error: "LLM output does not match schema",
      details: result.error.issues,
    }, 422);
  }

  const markdown = generateSpecMarkdown(result.data);

  return c.json({
    spec: result.data,
    markdown,
    confidence: 0.85,
    model: response.model,
  });
});

function generateSpecMarkdown(
  spec: { title: string; description: string; acceptanceCriteria: string[]; priority: string; estimatedEffort: string; category: string; dependencies: string[]; risks: string[] }
): string {
  return `# ${spec.title}

## 설명
${spec.description}

## 인수 기준
${spec.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join("\n")}

## 메타데이터
- **우선순위**: ${spec.priority}
- **예상 규모**: ${spec.estimatedEffort}
- **분류**: ${spec.category}
${spec.dependencies.length ? `\n## 의존성\n${spec.dependencies.map(d => `- ${d}`).join("\n")}` : ""}
${spec.risks.length ? `\n## 리스크\n${spec.risks.map(r => `- ${r}`).join("\n")}` : ""}
`;
}

export { specRoute };
```

### 5.4 Web UI — Spec Generator 페이지

```
packages/web/src/app/spec-generator/page.tsx
```

**컴포넌트 구성**:

```
SpecGeneratorPage
├── SpecGeneratorForm        # 입력 폼 (textarea + context + submit)
│   ├── Textarea (shadcn)
│   ├── Input (shadcn)
│   └── Button (shadcn)
├── SpecPreview              # 결과 미리보기
│   ├── Card (shadcn)
│   ├── Badge (shadcn)
│   └── MarkdownViewer
└── SpecActions              # 후속 작업 버튼
    ├── Copy Markdown
    └── Save to Wiki
```

**상태 관리**: 컴포넌트 로컬 `useState` (단일 페이지 범위)

**API 클라이언트 확장**:

```typescript
// packages/web/src/lib/api-client.ts 추가
export async function generateSpec(
  text: string,
  context?: string
): Promise<SpecGenerateResponse> {
  const res = await fetch("/api/spec/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, context }),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```

---

## 6. F46 — Wiki Git 동기화 상세 설계

### 6.1 동기화 아키텍처

```
Wiki 편집 (Web UI)                Git Push (외부)
  | PUT /api/wiki/:slug           | GitHub Webhook
  v                               v POST /api/webhook/git
D1 wiki_pages 갱신               push 이벤트 파싱
  | (비동기 waitUntil)             | 변경 파일 필터 (docs/wiki/*)
WikiSyncService.pushToGit()       v
  |                               WikiSyncService.pullFromGit()
GitHub API: PUT contents/           |
  docs/wiki/{slug}.md              D1 wiki_pages INSERT/UPDATE
```

**"Git이 진실" 원칙**: 충돌 시 Git 버전이 우선. Wiki 편집이 먼저 D1에 반영되지만, Git에서 같은 파일이 변경된 경우 Git 버전으로 덮어씀.

### 6.2 WikiSyncService (`services/wiki-sync.ts`)

```typescript
export class WikiSyncService {
  constructor(
    private github: GitHubService,
    private db: D1Database
  ) {}

  // Wiki -> Git: D1 변경 후 호출
  async pushToGit(slug: string, content: string, author: string): Promise<void> {
    const filePath = `docs/wiki/${slug}.md`;

    let sha: string | undefined;
    try {
      const existing = await this.github.getFileContent(filePath);
      sha = existing.sha;
    } catch {
      // 파일 없음 — 새 생성
    }

    await this.github.createOrUpdateFile(
      filePath,
      content,
      `docs(wiki): update ${slug} by ${author}`,
      sha
    );
  }

  // Git -> Wiki: Webhook 호출 시 실행
  async pullFromGit(
    modifiedFiles: string[]
  ): Promise<{ synced: number; errors: string[] }> {
    const wikiFiles = modifiedFiles.filter(
      f => f.startsWith("docs/wiki/") && f.endsWith(".md")
    );
    let synced = 0;
    const errors: string[] = [];

    for (const filePath of wikiFiles) {
      try {
        const slug = filePath.replace("docs/wiki/", "").replace(".md", "");
        const { content } = await this.github.getFileContent(filePath);
        const title = slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());

        // UPSERT: slug 기준
        await this.db
          .prepare(
            `INSERT INTO wiki_pages (id, projectId, slug, title, content, filePath, ownershipMarker, updatedAt)
             VALUES (?, 'default', ?, ?, ?, ?, 'git', datetime('now'))
             ON CONFLICT(slug) DO UPDATE SET
               content = excluded.content,
               ownershipMarker = 'git',
               updatedAt = datetime('now')`
          )
          .bind(crypto.randomUUID(), slug, title, content, filePath)
          .run();

        synced++;
      } catch (err) {
        errors.push(`${filePath}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return { synced, errors };
  }
}
```

### 6.3 Webhook 라우트 (`routes/webhook.ts`)

```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { WikiSyncService } from "../services/wiki-sync";
import { GitHubService } from "../services/github";

const webhookRoute = new OpenAPIHono<{ Bindings: Env }>();

const gitWebhookRoute = createRoute({
  method: "post",
  path: "/webhook/git",
  tags: ["Webhook"],
  summary: "GitHub Push Webhook 수신",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            ref: z.string(),
            commits: z.array(z.object({
              modified: z.array(z.string()),
              added: z.array(z.string()),
            })),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "동기화 결과" },
    401: { description: "서명 검증 실패" },
  },
});

webhookRoute.openapi(gitWebhookRoute, async (c) => {
  // GitHub Webhook HMAC-SHA256 서명 검증
  if (c.env.WEBHOOK_SECRET) {
    const signature = c.req.header("x-hub-signature-256");
    const body = await c.req.text();
    const expected = await computeHmacSha256(c.env.WEBHOOK_SECRET, body);
    if (signature !== `sha256=${expected}`) {
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  const payload = await c.req.json();

  // master 브랜치만 처리
  if (payload.ref !== "refs/heads/master") {
    return c.json({ message: "Skipped: not master branch" });
  }

  const modifiedFiles = payload.commits.flatMap(
    (commit: { modified: string[]; added: string[] }) =>
      [...commit.modified, ...commit.added]
  );

  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const sync = new WikiSyncService(github, c.env.DB);
  const result = await sync.pullFromGit(modifiedFiles);

  return c.json(result);
});

async function computeHmacSha256(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  return [...new Uint8Array(sig)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export { webhookRoute };
```

### 6.4 wiki.ts 동기화 통합

```typescript
// routes/wiki.ts — PUT 핸들러에 Git sync 추가
// 기존 D1 업데이트 로직 이후:

// 비동기 Git push (응답 지연 방지)
c.executionCtx.waitUntil(
  (async () => {
    try {
      const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
      const sync = new WikiSyncService(github, c.env.DB);
      await sync.pushToGit(slug, content, userName);
    } catch (err) {
      console.error("Wiki->Git sync failed:", err);
      // Git 동기화 실패해도 D1 업데이트는 유지 (비동기)
    }
  })()
);
```

**`c.executionCtx.waitUntil()`**: Workers 비동기 태스크 패턴. HTTP 응답은 즉시 반환하되, 백그라운드에서 Git push 수행.

---

## 7. app.ts 라우트 등록 변경

```typescript
// packages/api/src/app.ts — Sprint 8 추가분
import { specRoute } from "./routes/spec";
import { webhookRoute } from "./routes/webhook";

// 기존 라우트 (JWT 보호)
app.route("/api", specRoute);         // F45: NL→Spec

// Webhook (공개, 서명 검증으로 보호)
app.route("/api", webhookRoute);      // F46: GitHub Webhook
```

**OpenAPI 태그 추가**:

```typescript
tags: [
  // 기존 9개 유지
  { name: "Spec", description: "NL→Spec 변환" },
  { name: "Webhook", description: "외부 Webhook 수신" },
],
```

---

## 8. 테스트 설계

### 8.1 서비스 단위 테스트

| 테스트 파일 | 대상 | 테스트 수 | Mock 전략 |
|------------|------|:---------:|----------|
| `github.test.ts` | GitHubService | 6 | fetch mock (vi.fn) |
| `kv-cache.test.ts` | KVCacheService | 4 | MockKVNamespace (인메모리 Map) |
| `spec-parser.test.ts` | SpecParser | 5 | 없음 (순수 함수) |
| `health-calc.test.ts` | HealthCalculator | 3 | GitHubService mock |
| `integrity-checker.test.ts` | IntegrityChecker | 4 | GitHubService mock |
| `freshness-checker.test.ts` | FreshnessChecker | 3 | GitHubService mock |
| `sse-manager.test.ts` | SSEManager | 4 | MockD1Database (기존 shim) |
| `llm.test.ts` | LLMService | 3 | fetch mock (Anthropic API) |
| `wiki-sync.test.ts` | WikiSyncService | 4 | GitHubService + D1 mock |

**예상 신규 서비스 테스트**: 36건

### 8.2 라우트 통합 테스트

| 테스트 파일 | 대상 | 테스트 수 | 비고 |
|------------|------|:---------:|------|
| `requirements.test.ts` | GET /requirements | +3 | GitHub API → KV 캐시 경로 |
| `health.test.ts` | GET /health | +2 | 계산 로직 검증 |
| `spec-generate.test.ts` | POST /spec/generate | 4 | LLM mock + Zod 검증 |
| `webhook.test.ts` | POST /webhook/git | 3 | 서명 검증 + Wiki sync |

**예상 추가 통합 테스트**: 12건

### 8.3 Web 컴포넌트 테스트

| 테스트 파일 | 대상 | 테스트 수 |
|------------|------|:---------:|
| `sse-client.test.ts` | SSEClient | 4 |
| `spec-generator.test.tsx` | SpecGeneratorPage | 5 |

**예상 추가 Web 테스트**: 9건

### 8.4 총 테스트 목표

| 영역 | 기존 | 신규 | 합계 |
|------|:----:|:----:|:----:|
| CLI | 106 | 0 | 106 |
| API | 43 | 48 | 91 |
| Web | 27 | 9 | 36 |
| **합계** | **176** | **57** | **233** |

### 8.5 Mock 인프라 확장

```typescript
// __tests__/helpers/mock-kv.ts
export class MockKVNamespace {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void> {
    this.store.set(key, {
      value,
      expiry: options?.expirationTtl
        ? Date.now() + options.expirationTtl * 1000
        : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<{ keys: unknown[]; list_complete: boolean }> {
    return { keys: [], list_complete: true };
  }
}
```

---

## 9. 마이그레이션 (D1 스키마 변경)

### 9.1 wiki_pages UNIQUE 제약 추가

```sql
-- 0005_wiki_slug_unique.sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug);
```

### 9.2 agent_sessions progress 컬럼 추가 (선택)

```sql
-- 0006_agent_progress.sql
ALTER TABLE agent_sessions ADD COLUMN progress INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN currentTask TEXT;
```

---

## 10. 구현 순서 (의존성 그래프)

```
Week 1: 인프라 기반
├── 10-1. env.ts 바인딩 추가 (CACHE, AI, WEBHOOK_SECRET)
├── 10-2. wrangler.toml KV/AI 설정
├── 10-3. GitHubService 구현 + 테스트
├── 10-4. KVCacheService 구현 + 테스트
└── 10-5. SpecParser 구현 + 테스트

Week 2: API 실데이터 전환
├── 10-6. requirements 라우트 전환
├── 10-7. HealthCalculator + health 라우트 전환
├── 10-8. IntegrityChecker + integrity 라우트 전환
├── 10-9. FreshnessChecker + freshness 라우트 전환
└── 10-10. Workers 프로덕션 재배포 (중간 검증)

Week 3: SSE + NL→Spec
├── 10-11. SSEManager + agent.ts SSE 전환
├── 10-12. Web SSEClient + AgentCard 통합
├── 10-13. LLMService (Workers AI + Claude fallback)
├── 10-14. spec.ts 라우트 + Zod 스키마
└── 10-15. Web Spec Generator 페이지

Week 4: Wiki Git + 마무리
├── 10-16. WikiSyncService (pushToGit + pullFromGit)
├── 10-17. webhook.ts 라우트 + 서명 검증
├── 10-18. wiki.ts waitUntil 통합
├── 10-19. D1 마이그레이션 적용 (slug UNIQUE)
├── 10-20. 전체 테스트 (233건 목표)
└── 10-21. Workers 최종 배포 + npm publish v0.8.0
```

---

## 11. Agent Teams 구성

| Worker | 담당 | 구현 항목 | 금지 파일 |
|--------|------|----------|----------|
| W1 | API 실데이터 | 10-3~10-9: GitHubService, KV, SpecParser, health/integrity/freshness | routes/spec.ts, routes/webhook.ts, services/llm.ts, services/wiki-sync.ts |
| W2 | SSE + NL→Spec | 10-11~10-15: SSEManager, LLMService, spec 라우트, Web Spec Generator | routes/requirements.ts, routes/wiki.ts, services/github.ts |
| W3 | Wiki Git Sync | 10-16~10-19: WikiSyncService, webhook 라우트, wiki.ts 통합 | routes/spec.ts, services/llm.ts, services/sse-manager.ts |
| Leader | 인프라 + 테스트 + 통합 | 10-1~10-2, 10-10, 10-20~10-21 | — |

---

## 12. Risk & Mitigation (설계 수준)

| # | 리스크 | 설계 대응 |
|---|--------|----------|
| R1 | GitHub API Rate Limit | KVCacheService 5분 TTL + PAT 인증 (5000회/h) |
| R2 | Workers AI 한국어 품질 | Claude API fallback + `language` 파라미터 영어 전환 |
| R3 | SSE 장시간 연결 CPU | 10초 폴링 + heartbeat comment |
| R4 | Wiki 동기화 충돌 | "Git이 진실" — ownershipMarker: 'git' |
| R5 | LLM JSON 파싱 실패 | Zod safeParse + 422 에러 + 프롬프트 "JSON only" |
| R6 | KV 비동기 일관성 | getOrFetch() 패턴 — 캐시 미스 시 즉시 갱신 |
| R7 | Webhook 위조 | HMAC-SHA256 서명 검증 (x-hub-signature-256) |
| R8 | fetch 직접 사용 에러 핸들링 | GitHubApiError 클래스 + 상태 코드별 처리 |

---

## 8. F47 Production Site Design — fx.minu.best

### 8.1 Overview

fx.minu.best 프로덕션 사이트. 랜딩 페이지와 대시보드를 단일 Next.js 앱에 통합 배포. (P1, FX-REQ-047)

- **랜딩**: 제품 소개, 기능 하이라이트, CTA → 대시보드 진입
- **대시보드**: 기존 Sprint 7까지 구현된 6개 페이지 (agents, architecture, tokens, wiki, workspace 등)
- **목표**: 외부 사용자가 처음 접하는 프로덕션 진입점 + 내부 대시보드 통합

### 8.2 라우트 구조 — Next.js Route Groups

Next.js App Router의 Route Groups `(folderName)` 패턴으로 랜딩과 대시보드를 분리해요. 괄호 안 이름은 URL 경로에 포함되지 않아요.

```
packages/web/src/app/
├── (landing)/              # Route Group: 랜딩 전용 레이아웃
│   ├── layout.tsx          # Navbar + Footer 포함, Sidebar 미포함
│   └── page.tsx            # / (루트 = 랜딩 페이지)
├── (app)/                  # Route Group: 대시보드 레이아웃
│   ├── layout.tsx          # Sidebar 포함 (기존 대시보드 레이아웃)
│   ├── dashboard/page.tsx  # /dashboard (메인 대시보드)
│   ├── agents/page.tsx     # /agents
│   ├── architecture/page.tsx
│   ├── tokens/page.tsx
│   ├── wiki/page.tsx
│   └── workspace/page.tsx
├── layout.tsx              # 루트 레이아웃 (fonts, globals.css, metadata)
└── globals.css             # Digital Forge 디자인 변수
```

**라우트 매핑**:

| URL | Route Group | 페이지 |
|-----|-------------|--------|
| `/` | `(landing)` | 랜딩 페이지 (Hero + Features + CTA) |
| `/dashboard` | `(app)` | 메인 대시보드 |
| `/agents` | `(app)` | 에이전트 목록 |
| `/architecture` | `(app)` | 아키텍처 뷰 |
| `/tokens` | `(app)` | 토큰 사용량 |
| `/wiki` | `(app)` | Wiki 페이지 |
| `/workspace` | `(app)` | 워크스페이스 |

### 8.3 디자인 시스템 "Digital Forge"

Foundry-X의 "forge(대장간)" 컨셉을 시각적으로 표현하는 디자인 시스템.

**타이포그래피 (3 Font Stack)**:

| 용도 | 폰트 | 적용 |
|------|------|------|
| Display (제목) | **Syne** | h1~h3, Hero title, 섹션 제목 |
| Body (본문) | **Plus Jakarta Sans** | p, label, 일반 텍스트 |
| Code (코드) | **JetBrains Mono** | code, pre, 터미널 프리뷰 |

**컬러 팔레트 — OKLCH 기반**:

```css
:root {
  /* Amber/Copper 액센트 — forge의 불꽃/용광로 */
  --forge-amber: oklch(0.78 0.15 70);
  --forge-copper: oklch(0.65 0.12 55);
  --forge-gold: oklch(0.85 0.12 85);

  /* 배경 계열 */
  --forge-bg: oklch(0.13 0.01 260);
  --forge-surface: oklch(0.18 0.01 260);
  --forge-surface-hover: oklch(0.22 0.02 260);

  /* 텍스트 */
  --forge-text: oklch(0.93 0.01 260);
  --forge-text-muted: oklch(0.65 0.01 260);

  /* 시맨틱 */
  --forge-success: oklch(0.72 0.15 155);
  --forge-warning: oklch(0.78 0.15 70);
  --forge-error: oklch(0.65 0.2 25);
}
```

**유틸리티 클래스**:

| 클래스 | 효과 |
|--------|------|
| `forge-glass` | `backdrop-filter: blur(12px); background: oklch(0.18 0.01 260 / 0.7); border: 1px solid oklch(0.93 0.01 260 / 0.08)` — 글래스모피즘 |
| `forge-glow` | `box-shadow: 0 0 20px oklch(0.78 0.15 70 / 0.15)` — amber 글로우 효과 |

### 8.4 랜딩 페이지 — 6 섹션 구성

```
(landing)/page.tsx
├── 1. Hero           # gradient title + terminal preview animation
├── 2. Features       # 6 feature cards → 각각 대시보드 라우트 링크
├── 3. How It Works   # 3-step 프로세스 (Init → Sync → Collaborate)
├── 4. Testimonials   # 3 quote cards
├── 5. Pricing        # 3 plan cards (Free / Pro / Enterprise)
└── 6. Final CTA      # 최종 Call-to-Action + 이메일 수집
```

**섹션 상세**:

| # | 섹션 | 내용 | 디자인 요소 |
|---|------|------|------------|
| 1 | **Hero** | "Where AI Agents and Humans Build Together" gradient title + CLI 터미널 프리뷰 애니메이션 | `forge-amber` → `forge-gold` gradient, `forge-glass` 터미널 카드 |
| 2 | **Features** | 6개 카드: SDD Triangle, Agent Orchestration, Wiki SSOT, Real-time SSE, NL→Spec, Health Score | 각 카드 클릭 시 `/dashboard`, `/agents`, `/wiki` 등으로 이동 |
| 3 | **How It Works** | Step 1: `foundry-x init`, Step 2: `foundry-x sync`, Step 3: Collaborate on Dashboard | 3-column 아이콘 + 코드 스니펫 |
| 4 | **Testimonials** | 3개 인용문 (AI-native 개발 경험, 하네스 자동화, 팀 투명성) | `forge-glass` 카드, avatar + quote |
| 5 | **Pricing** | Free(개인), Pro($19/월, 팀 5명), Enterprise(커스텀) | 중앙 카드 하이라이트 (`forge-glow`), 비교 표 |
| 6 | **Final CTA** | "Start Building with Foundry-X" + Get Started 버튼 + 이메일 입력 | full-width gradient 배경 |

### 8.5 공유 컴포넌트

**Navbar** (`components/landing/navbar.tsx`):

- 스크롤 반응형: `scrollY > 50`일 때 `forge-glass` 배경 활성화 (투명 → 블러)
- 데스크톱: 로고 + 메뉴 (Features, How It Works, Pricing) + "Get Started" 버튼
- 모바일 (< 768px): 햄버거 → Sheet(shadcn/ui) 드로어 메뉴
- `/dashboard` 이상 경로에서는 미표시 (Route Group 레이아웃 분리)

**Footer** (`components/landing/footer.tsx`):

- 4컬럼 레이아웃: Product (Dashboard, Agents, Wiki) / Developers (Docs, API, GitHub) / Company (About, Blog) / Legal (Privacy, Terms)
- 하단: © 2026 Foundry-X. Built by KTDS AX BD팀

**기존 Sidebar 변경** (`components/sidebar.tsx`):

- 로고 클릭 href: `/` → `/dashboard` 로 변경 (대시보드 내부에서는 대시보드 홈으로)
- 랜딩으로 돌아가는 링크는 Footer 또는 Navbar에만 배치

### 8.6 구현 파일 목록

| # | 파일 | 변경 유형 | 내용 |
|---|------|----------|------|
| 1 | `packages/web/src/app/globals.css` | **수정** | `--forge-*` OKLCH 변수, `forge-glass`/`forge-glow` 유틸리티 클래스 추가 |
| 2 | `packages/web/src/app/layout.tsx` | **수정** | Syne + Plus Jakarta Sans + JetBrains Mono 3개 폰트 import, `<body>` className 적용 |
| 3 | `packages/web/src/app/(landing)/layout.tsx` | **신규** | 랜딩 레이아웃 (Navbar + Footer 포함, Sidebar 미포함) |
| 4 | `packages/web/src/app/(landing)/page.tsx` | **신규** | 랜딩 페이지 6섹션 (Hero, Features, How It Works, Testimonials, Pricing, CTA) |
| 5 | `packages/web/src/app/(app)/layout.tsx` | **신규** | 대시보드 레이아웃 (기존 Sidebar 포함) |
| 6 | `packages/web/src/components/landing/navbar.tsx` | **신규** | 스크롤 반응형 Navbar + 모바일 Sheet 드로어 |
| 7 | `packages/web/src/components/landing/footer.tsx` | **신규** | 4컬럼 Footer |
| 8 | `packages/web/src/components/sidebar.tsx` | **수정** | 로고 href `/` → `/dashboard` 변경 |
