---
code: FX-DSGN-047
title: "Sprint 47 — 커스터마이징 범위 + 법적/윤리/거버넌스 정책 (F164+F165+F166)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-47
sprint: 47
phase: "Phase 5"
references:
  - "[[FX-PLAN-047]]"
  - "[[FX-SPEC-001]]"
  - "prd-v8-final.md"
---

# Sprint 47 Design Document

> **Summary**: 커스터마이징 범위 정의 + 플러그인 아키텍처 + 감사 로그 + PII 마스킹 설계
>
> **Project**: Foundry-X
> **Version**: api 0.1.0 / web 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-22
> **Status**: Draft
> **Planning Doc**: [sprint-47.plan.md](../../01-plan/features/sprint-47.plan.md)

---

## 1. Overview

### 1.1 Design Goals

이 Design은 **정책 문서 + 코드 구현** 병행 Sprint의 기술 설계서예요:
1. **F164 (커스터마이징 범위)**: 5-레이어 커스터마이징 범위 정의 + 플러그인 시스템 인터페이스 설계
2. **F165 (감사 로그)**: AI 생성물 이력 추적을 위한 AuditLogService + API 2개 설계
3. **F166 (PII 마스킹)**: 외부 AI API 호출 전 기밀정보 자동 마스킹 미들웨어 설계

### 1.2 Design Principles

- **기존 패턴 재활용**: PromptGatewayService의 SanitizationRule 패턴을 PII 마스킹에 확장
- **KpiLogger 패턴 차용**: D1 기반 이벤트 로깅 → AuditLogService에 동일 구조 적용
- **OpenAPI 일관성**: 기존 createRoute + Zod 스키마 패턴 유지
- **설계 우선(Design-First)**: 플러그인 시스템은 인터페이스만 설계, 런타임 구현은 Sprint 48+

---

## 2. F164: 커스터마이징 범위 + 플러그인 시스템 설계

### 2.1 5-레이어 커스터마이징 범위

| Layer | 범위 | 커스터마이징 방식 | 책임 주체 | Tier |
|:-----:|------|-------------------|-----------|:----:|
| L1 | 배포 환경 | 환경변수 + 어댑터 교체 (Cloudflare/Azure/On-prem) | SI 파트너 | Standard |
| L2 | 인증/SSO | OAuth/SAML/OIDC 프로바이더 설정 + IdP 연동 | SI 파트너 | Standard |
| L3 | DB 스키마 | 커스텀 필드 추가, 테넌트별 확장 테이블 | 내부 개발자 | Professional |
| L4 | UI 테마/레이아웃 | CSS 변수, 컴포넌트 슬롯, 로고/브랜딩 교체 | 고객사/SI | Professional |
| L5 | 워크플로우/에이전트 | 에이전트 역할 커스터마이징, DAG 편집, 커스텀 프롬프트 | 내부 개발자 | Enterprise |

#### Tier 매트릭스 (고객 제안서 부속)

| 기능 | Standard | Professional | Enterprise |
|------|:--------:|:------------:|:----------:|
| 배포 환경 선택 (L1) | ✅ | ✅ | ✅ |
| SSO/IdP 연동 (L2) | ✅ | ✅ | ✅ |
| 커스텀 DB 필드 (L3) | - | ✅ | ✅ |
| UI 테마/브랜딩 (L4) | - | ✅ | ✅ |
| 에이전트 커스터마이징 (L5) | - | - | ✅ |
| 커스텀 플러그인 설치 | - | - | ✅ |
| 전용 기술 지원 | 이메일 | 이메일+채팅 | 전담 엔지니어 |

### 2.2 플러그인 시스템 아키텍처

#### 2.2.1 핵심 인터페이스

```typescript
// packages/shared/src/plugin.ts (신규)

/** 플러그인 매니페스트 — 플러그인의 메타데이터 + 의존성 선언 */
interface PluginManifest {
  id: string                    // 'com.example.my-plugin'
  name: string                  // '고객사 SR 분류기'
  version: string               // SemVer
  author: string
  description: string
  permissions: PluginPermission[]
  hooks: PluginHookDeclaration[]
  slots: PluginSlotDeclaration[]
  dependencies?: string[]       // 다른 플러그인 ID
  minPlatformVersion?: string   // 최소 Foundry-X 버전
}

/** 플러그인 권한 3단계 */
type PluginPermission =
  | 'read:agents'          // 에이전트 정보 조회
  | 'read:specs'           // 명세 조회
  | 'read:workflows'       // 워크플로우 조회
  | 'write:agents'         // 에이전트 구성 변경
  | 'write:workflows'      // 워크플로우 생성/수정
  | 'admin:settings'       // 시스템 설정 변경

/** 플러그인이 등록할 수 있는 훅 포인트 */
interface PluginHookDeclaration {
  event: PluginHookEvent
  handler: string              // 핸들러 함수 경로
  priority?: number            // 실행 순서 (낮을수록 먼저, 기본 100)
}

type PluginHookEvent =
  | 'agent:before-run'         // 에이전트 실행 전
  | 'agent:after-run'          // 에이전트 실행 후
  | 'workflow:before-step'     // 워크플로우 스텝 실행 전
  | 'workflow:after-step'      // 워크플로우 스텝 실행 후
  | 'spec:before-sync'         // 스펙 동기화 전
  | 'spec:after-sync'          // 스펙 동기화 후
  | 'pr:before-create'         // PR 생성 전
  | 'pr:after-merge'           // PR 머지 후

/** 플러그인이 UI에 삽입할 수 있는 슬롯 */
interface PluginSlotDeclaration {
  slot: PluginSlotId
  component: string            // 컴포넌트 경로
}

type PluginSlotId =
  | 'dashboard:widget'         // 대시보드 위젯 영역
  | 'agent:config-panel'       // 에이전트 설정 패널
  | 'sidebar:menu-item'        // 사이드바 메뉴 항목
  | 'spec:toolbar'             // 스펙 에디터 툴바
```

#### 2.2.2 플러그인 생명주기

```
install → validate → activate → configure → [running] → deactivate → uninstall
                                                 ↑           |
                                                 └── update ──┘
```

| 단계 | 동작 | 실패 시 |
|------|------|---------|
| install | 매니페스트 검증 + 파일 복사 | 설치 중단, 롤백 |
| validate | 권한 검증 + 의존성 확인 + 버전 호환성 | 비활성 상태 유지 |
| activate | 훅 등록 + 슬롯 바인딩 | 비활성 상태 유지, 에러 로그 |
| configure | 플러그인 설정 UI 노출 | 기본값으로 동작 |
| deactivate | 훅 해제 + 슬롯 언바인딩 | 강제 해제 |
| uninstall | 설정 삭제 + 파일 제거 | 수동 정리 안내 |

#### 2.2.3 확장 포인트 매핑 (기존 76개 서비스 중 선별)

| 확장 포인트 | 대상 서비스 | 훅 이벤트 | 용도 예시 |
|-------------|-------------|-----------|-----------|
| 에이전트 실행 | agent-runner, agent-orchestrator | agent:before-run, after-run | 커스텀 전처리, 결과 후처리 |
| 워크플로우 | workflow-engine | workflow:before-step, after-step | 커스텀 승인 게이트 |
| 스펙 동기화 | spec-parser, github-sync | spec:before-sync, after-sync | 외부 도구 연동 |
| PR 파이프라인 | pr-pipeline | pr:before-create, after-merge | 커스텀 리뷰 규칙 |
| 모델 라우팅 | model-router | (향후 추가) | 커스텀 라우팅 규칙 |

#### 2.2.4 보안 샌드박스 (설계만)

```
┌─────────────────────────────────┐
│         Foundry-X Core          │
│  ┌────────────────────────────┐ │
│  │   Plugin Host (Sandbox)    │ │
│  │  ┌─────────┐  ┌─────────┐ │ │
│  │  │Plugin A │  │Plugin B │ │ │
│  │  └────┬────┘  └────┬────┘ │ │
│  │       │             │      │ │
│  │  ┌────▼─────────────▼────┐ │ │
│  │  │ Permission Gateway    │ │ │  ← 화이트리스트 기반 접근 제어
│  │  └────┬──────────────────┘ │ │
│  └───────┼────────────────────┘ │
│          │                      │
│  ┌───────▼──────────────────┐   │
│  │  Service Layer (읽기만)   │   │  ← DB 직접 접근 불가
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

- 플러그인은 `PermissionGateway`를 통해서만 서비스 접근
- 매니페스트에 선언된 권한만 허용 (화이트리스트)
- DB 직접 쿼리 불가 — 서비스 API 경유 필수
- 런타임 격리(V8 isolate 등)는 Sprint 48+에서 구현

---

## 3. F165: AuditLogService + 감사 로그 API 설계

### 3.1 서비스 설계

```typescript
// packages/api/src/services/audit-logger.ts (신규)

interface AuditEvent {
  tenantId: string
  eventType: 'ai_generation' | 'code_review' | 'masking' | 'approval' | 'plugin_action'
  agentId?: string
  modelId?: string
  promptHash?: string          // SHA-256 해시 (원본 미저장)
  inputClassification?: DataClassification
  outputType?: 'code' | 'test' | 'document' | 'review'
  approvedBy?: string          // user_id
  metadata?: Record<string, unknown>
}

type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted'

class AuditLogService {
  constructor(private db: D1Database) {}

  /** 감사 이벤트 기록 */
  async logEvent(event: AuditEvent): Promise<{ id: string }>

  /** 감사 로그 조회 (필터링 + 페이지네이션) */
  async getEvents(params: {
    tenantId: string
    eventType?: string
    agentId?: string
    modelId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<{ events: AuditLog[]; total: number }>

  /** 감사 통계 (대시보드용) */
  async getStats(tenantId: string, period: 'day' | 'week' | 'month'): Promise<AuditStats>
}
```

**KpiLogger 패턴 차용 포인트**:
- constructor에 `D1Database` 의존성 주입
- `logEvent()` → `db.prepare().bind().run()` (INSERT)
- `getEvents()` → SQL WHERE + LIMIT/OFFSET (페이지네이션)
- `getStats()` → COUNT + GROUP BY (집계)

### 3.2 D1 마이그레이션: 0029_audit_logs.sql

```sql
-- 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  agent_id TEXT,
  model_id TEXT,
  prompt_hash TEXT,
  input_classification TEXT DEFAULT 'internal',
  output_type TEXT,
  approved_by TEXT,
  approved_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);

CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_agent ON audit_logs(agent_id);
```

### 3.3 API 엔드포인트 설계

#### POST /api/audit/log

```typescript
// 요청
{
  eventType: 'ai_generation',
  agentId: 'reviewer-agent',
  modelId: 'claude-sonnet-4-6',
  promptHash: 'sha256:abc123...',
  inputClassification: 'internal',
  outputType: 'review',
  metadata: { prNumber: 42, linesGenerated: 150 }
}

// 응답 201
{ id: 'aud_xxx', createdAt: '2026-03-22T10:00:00Z' }
```

#### GET /api/audit/logs

```typescript
// 쿼리 파라미터
?eventType=ai_generation&agentId=reviewer-agent&startDate=2026-03-01&endDate=2026-03-22&page=1&pageSize=20

// 응답 200
{
  events: [
    {
      id: 'aud_xxx',
      tenantId: 'org_xxx',
      eventType: 'ai_generation',
      agentId: 'reviewer-agent',
      modelId: 'claude-sonnet-4-6',
      promptHash: 'sha256:abc123...',
      inputClassification: 'internal',
      outputType: 'review',
      approvedBy: null,
      approvedAt: null,
      metadata: { prNumber: 42 },
      createdAt: '2026-03-22T10:00:00Z'
    }
  ],
  total: 42,
  page: 1,
  pageSize: 20
}
```

### 3.4 Zod 스키마: audit.ts

```typescript
// packages/api/src/schemas/audit.ts (신규)

const AuditEventSchema = z.object({
  eventType: z.enum(['ai_generation', 'code_review', 'masking', 'approval', 'plugin_action']),
  agentId: z.string().optional(),
  modelId: z.string().optional(),
  promptHash: z.string().optional(),
  inputClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  outputType: z.enum(['code', 'test', 'document', 'review']).optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi('AuditEvent')

const AuditLogSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventType: z.string(),
  agentId: z.string().nullable(),
  modelId: z.string().nullable(),
  promptHash: z.string().nullable(),
  inputClassification: z.string().nullable(),
  outputType: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.string(),
}).openapi('AuditLog')

const AuditQuerySchema = z.object({
  eventType: z.string().optional(),
  agentId: z.string().optional(),
  modelId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
}).openapi('AuditQuery')
```

### 3.5 기존 코드 연동: prompt-gateway 감사 로그 적용

```typescript
// packages/api/src/services/prompt-gateway.ts 수정

// 기존 sanitize() 메서드에 감사 로그 호출 추가
async sanitize(content: string, tenantId: string): Promise<SanitizeResult> {
  const result = await this.applySanitizationRules(content)

  // 마스킹 발생 시 감사 로그 기록
  if (result.appliedRules.length > 0 && this.auditLogger) {
    await this.auditLogger.logEvent({
      tenantId,
      eventType: 'masking',
      metadata: {
        appliedRules: result.appliedRules,
        originalLength: result.originalLength,
        sanitizedLength: result.sanitizedLength,
      }
    })
  }

  return result
}
```

---

## 4. F166: PiiMaskerService + 미들웨어 설계

### 4.1 서비스 설계

```typescript
// packages/api/src/services/pii-masker.ts (신규)

/** PII 패턴 정의 */
interface PiiPattern {
  name: string
  regex: RegExp
  classification: DataClassification
  maskStrategy: 'redact' | 'hash' | 'partial' | 'tokenize'
}

/** 마스킹 결과 */
interface MaskResult {
  masked: string
  detections: PiiDetection[]
  originalLength: number
  maskedLength: number
}

interface PiiDetection {
  pattern: string       // 'email', 'phone_kr' 등
  count: number
  classification: DataClassification
  maskStrategy: string
}

class PiiMaskerService {
  private patterns: PiiPattern[]     // 사전 컴파일된 정규식 캐시

  constructor(private db: D1Database) {}

  /** DB에서 활성 패턴 로드 + 기본 패턴 병합 */
  async loadPatterns(tenantId: string): Promise<void>

  /** 텍스트에서 PII 탐지 + 마스킹 */
  mask(text: string): MaskResult

  /** 특정 분류 등급 이상만 마스킹 */
  maskAbove(text: string, minClassification: DataClassification): MaskResult
}
```

### 4.2 기본 PII 패턴 (DEFAULT_PII_PATTERNS)

```typescript
const DEFAULT_PII_PATTERNS: PiiPattern[] = [
  {
    name: 'email',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    classification: 'confidential',
    maskStrategy: 'redact',    // → [EMAIL_REDACTED]
  },
  {
    name: 'phone_kr',
    regex: /01[0-9]-?\d{3,4}-?\d{4}/g,
    classification: 'confidential',
    maskStrategy: 'partial',   // → 010-****-1234
  },
  {
    name: 'ssn_kr',
    regex: /\d{6}-?[1-4]\d{6}/g,
    classification: 'restricted',
    maskStrategy: 'redact',    // → [SSN_REDACTED]
  },
  {
    name: 'employee_id',
    regex: /[A-Z]{2,3}-?\d{5,8}/g,
    classification: 'internal',
    maskStrategy: 'hash',      // → [EMP:sha256:abc12]
  },
  {
    name: 'ip_address',
    regex: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
    classification: 'internal',
    maskStrategy: 'partial',   // → 192.168.*.*
  },
  {
    name: 'credit_card',
    regex: /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g,
    classification: 'restricted',
    maskStrategy: 'redact',    // → [CARD_REDACTED]
  },
]
```

### 4.3 PromptGatewayService 확장 전략

기존 `PromptGatewayService`에는 이미 `SanitizationRule` 기반 마스킹이 있어요 (secret, password, JWT 등). PII 마스킹을 별도 서비스로 만들되, 통합 파이프라인으로 연결해요.

```
사용자 입력
  │
  ▼
PromptGatewayService.sanitize()     ← 기존: secret/password/URL 마스킹
  │
  ▼
PiiMaskerService.mask()             ← 신규: PII (이메일/전화/주민번호 등)
  │
  ▼
AuditLogService.logEvent()          ← 신규: 마스킹 발생 감사 기록
  │
  ▼
LLMService.generate()              ← 외부 AI API 호출
```

### 4.4 Hono 미들웨어 설계

```typescript
// packages/api/src/middleware/pii-masker.middleware.ts (신규)

import { createMiddleware } from 'hono/factory'

/**
 * PII 마스킹 미들웨어
 * - POST/PUT 요청의 body에서 PII 자동 탐지/마스킹
 * - 외부 AI API 호출 경로에만 적용 (/api/agent/*, /api/spec/generate 등)
 */
export const piiMaskerMiddleware = createMiddleware(async (c, next) => {
  // 1. AI API 호출 경로인지 확인
  const aiPaths = ['/api/agent/', '/api/spec/generate', '/api/mcp/']
  const isAiPath = aiPaths.some(p => c.req.path.startsWith(p))

  if (!isAiPath || c.req.method === 'GET') {
    return next()
  }

  // 2. PiiMaskerService로 body 마스킹
  const piiMasker = new PiiMaskerService(c.env.DB)
  await piiMasker.loadPatterns(getTenantId(c))

  // body를 읽고 마스킹 적용
  const body = await c.req.text()
  const result = piiMasker.mask(body)

  // 3. 마스킹 발생 시 감사 로그 + 마스킹된 body로 교체
  if (result.detections.length > 0) {
    const auditLogger = new AuditLogService(c.env.DB)
    await auditLogger.logEvent({
      tenantId: getTenantId(c),
      eventType: 'masking',
      metadata: {
        detections: result.detections,
        path: c.req.path,
      }
    })

    // 마스킹된 body로 요청 교체
    c.req.raw = new Request(c.req.url, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: result.masked,
    })
  }

  return next()
})
```

**적용 위치** (`app.ts`):

```typescript
// 기존 미들웨어 순서에 추가
// 1. CORS
// 2. Sentry
// 3. Auth
// 4. TenantGuard
// 5. PII Masker (신규) ← AI 경로에만 적용
app.use('/api/agent/*', piiMaskerMiddleware)
app.use('/api/spec/generate', piiMaskerMiddleware)
app.use('/api/mcp/*', piiMaskerMiddleware)
```

### 4.5 D1 마이그레이션: 0030_data_classification.sql

```sql
-- 데이터 분류 규칙 테이블 (테넌트별 커스텀 패턴)
CREATE TABLE IF NOT EXISTS data_classification_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_regex TEXT NOT NULL,
  classification TEXT NOT NULL CHECK(classification IN ('public','internal','confidential','restricted')),
  masking_strategy TEXT NOT NULL CHECK(masking_strategy IN ('redact','hash','partial','tokenize')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id),
  UNIQUE(tenant_id, pattern_name)
);

CREATE INDEX idx_classification_tenant ON data_classification_rules(tenant_id, is_active);
```

### 4.6 거버넌스 API 엔드포인트 설계

#### GET /api/governance/rules

```typescript
// 쿼리: ?classification=confidential&isActive=true
// 응답 200
{
  rules: [
    {
      id: 'rule_xxx',
      tenantId: 'org_xxx',
      patternName: 'email',
      patternRegex: '[a-zA-Z0-9._%+-]+@...',
      classification: 'confidential',
      maskingStrategy: 'redact',
      isActive: true,
      createdAt: '2026-03-22T10:00:00Z',
      updatedAt: '2026-03-22T10:00:00Z'
    }
  ],
  total: 6
}
```

#### PUT /api/governance/rules/:id

```typescript
// 요청 (admin only)
{
  classification: 'restricted',
  maskingStrategy: 'hash',
  isActive: false
}

// 응답 200
{ ok: true, updatedAt: '2026-03-22T10:30:00Z' }
```

### 4.7 Zod 스키마: governance.ts

```typescript
// packages/api/src/schemas/governance.ts (신규)

const DataClassificationSchema = z.enum(['public', 'internal', 'confidential', 'restricted'])
const MaskingStrategySchema = z.enum(['redact', 'hash', 'partial', 'tokenize'])

const ClassificationRuleSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patternName: z.string(),
  patternRegex: z.string(),
  classification: DataClassificationSchema,
  maskingStrategy: MaskingStrategySchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('ClassificationRule')

const UpdateRuleSchema = z.object({
  classification: DataClassificationSchema.optional(),
  maskingStrategy: MaskingStrategySchema.optional(),
  isActive: z.boolean().optional(),
}).openapi('UpdateRule')

const RuleQuerySchema = z.object({
  classification: DataClassificationSchema.optional(),
  isActive: z.coerce.boolean().optional(),
}).openapi('RuleQuery')
```

---

## 5. 파일 구조 + 구현 순서

### 5.1 신규/수정 파일 목록

```
[신규 파일]
packages/api/src/services/audit-logger.ts        # F165: AuditLogService
packages/api/src/services/pii-masker.ts          # F166: PiiMaskerService
packages/api/src/routes/audit.ts                 # F165: 감사 로그 API (2 endpoints)
packages/api/src/routes/governance.ts            # F166: 거버넌스 API (2 endpoints)
packages/api/src/schemas/audit.ts                # F165: Zod 스키마
packages/api/src/schemas/governance.ts           # F166: Zod 스키마
packages/api/src/middleware/pii-masker.middleware.ts  # F166: Hono 미들웨어
packages/api/src/db/migrations/0029_audit_logs.sql
packages/api/src/db/migrations/0030_data_classification.sql
packages/shared/src/plugin.ts                    # F164: 플러그인 인터페이스 (타입만)
docs/policy/customization-scope.md               # F164: 커스터마이징 범위 정의서
docs/policy/ai-code-guidelines.md                # F165: AI 코드 가이드라인
docs/policy/data-governance.md                   # F166: 데이터 거버넌스 정책
docs/policy/security-checklist.md                # F166: KT DS 보안 체크리스트

[수정 파일]
packages/api/src/app.ts                          # PII 미들웨어 등록
packages/api/src/services/prompt-gateway.ts      # AuditLogger 연동
```

### 5.2 구현 순서

```
Phase A: 정책 문서 (Worker 작업 불필요, Leader 단독)
 1. docs/policy/customization-scope.md           — F164 커스터마이징 범위 + 옵션 매트릭스
 2. docs/policy/ai-code-guidelines.md            — F165 AI 코드 가이드라인
 3. docs/policy/data-governance.md               — F166 데이터 거버넌스 정책
 4. docs/policy/security-checklist.md            — F166 보안 체크리스트
 5. packages/shared/src/plugin.ts                — F164 플러그인 인터페이스 (타입만)

Phase B: 코드 구현 (2-Worker 병렬)
 Worker 1 (F165 감사 로그):
  6. 0029_audit_logs.sql                         — D1 마이그레이션
  7. schemas/audit.ts                            — Zod 스키마
  8. services/audit-logger.ts                    — AuditLogService
  9. routes/audit.ts                             — API 2개
 10. __tests__/audit-logger.test.ts              — 서비스 테스트
 11. __tests__/routes/audit.test.ts              — 라우트 테스트

 Worker 2 (F166 PII 마스킹):
 12. 0030_data_classification.sql                — D1 마이그레이션
 13. schemas/governance.ts                       — Zod 스키마
 14. services/pii-masker.ts                      — PiiMaskerService
 15. middleware/pii-masker.middleware.ts          — Hono 미들웨어
 16. routes/governance.ts                        — API 2개
 17. __tests__/pii-masker.test.ts                — 서비스 + 미들웨어 테스트
 18. __tests__/routes/governance.test.ts          — 라우트 테스트

Phase C: 통합 (Leader)
 19. app.ts 수정 — PII 미들웨어 등록
 20. prompt-gateway.ts 수정 — AuditLogger 연동
 21. 통합 테스트 (마스킹 → 감사 로그 플로우)
 22. typecheck + 전체 테스트 확인
```

---

## 6. 테스트 전략

### 6.1 테스트 범위

| 대상 | 테스트 유형 | 주요 케이스 |
|------|-----------|-------------|
| AuditLogService | 단위 | logEvent 성공/실패, getEvents 필터링, getStats 집계 |
| PiiMaskerService | 단위 | 6종 패턴 탐지, 마스킹 전략별 출력, 복합 PII, 빈 텍스트 |
| pii-masker.middleware | 통합 | AI 경로 마스킹 적용, 비AI 경로 통과, GET 무시 |
| POST /api/audit/log | API | 정상 기록, 필수 필드 누락, 테넌트 격리 |
| GET /api/audit/logs | API | 필터링, 페이지네이션, 빈 결과 |
| GET /api/governance/rules | API | 전체 조회, 분류별 필터, 테넌트 격리 |
| PUT /api/governance/rules/:id | API | 수정 성공, 미존재 rule, admin 권한 검증 |
| prompt-gateway 연동 | 통합 | 마스킹 시 감사 로그 자동 기록 |

### 6.2 예상 테스트 수

| 영역 | 예상 수 |
|------|:-------:|
| AuditLogService | ~12 |
| PiiMaskerService | ~15 |
| 미들웨어 | ~6 |
| audit 라우트 | ~8 |
| governance 라우트 | ~10 |
| 통합 테스트 | ~4 |
| **합계** | **~55** |

---

## 7. Worker 프롬프트 명세

### Worker 1: F165 감사 로그

**허용 파일**:
- `packages/api/src/services/audit-logger.ts` (신규)
- `packages/api/src/routes/audit.ts` (신규)
- `packages/api/src/schemas/audit.ts` (신규)
- `packages/api/src/db/migrations/0029_audit_logs.sql` (신규)
- `packages/api/src/__tests__/audit-logger.test.ts` (신규)
- `packages/api/src/__tests__/routes/audit.test.ts` (신규)

**참고 파일** (읽기만):
- `packages/api/src/services/kpi-logger.ts` — D1 이벤트 로깅 패턴
- `packages/api/src/routes/kpi.ts` — OpenAPIHono 라우트 패턴
- `packages/api/src/schemas/kpi.ts` — Zod 스키마 패턴

### Worker 2: F166 PII 마스킹

**허용 파일**:
- `packages/api/src/services/pii-masker.ts` (신규)
- `packages/api/src/routes/governance.ts` (신규)
- `packages/api/src/schemas/governance.ts` (신규)
- `packages/api/src/middleware/pii-masker.middleware.ts` (신규)
- `packages/api/src/db/migrations/0030_data_classification.sql` (신규)
- `packages/api/src/__tests__/pii-masker.test.ts` (신규)
- `packages/api/src/__tests__/routes/governance.test.ts` (신규)

**참고 파일** (읽기만):
- `packages/api/src/services/prompt-gateway.ts` — SanitizationRule 패턴
- `packages/api/src/app.ts` — 미들웨어 등록 구조
