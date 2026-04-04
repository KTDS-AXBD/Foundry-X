---
code: FX-DSGN-S125
title: "Sprint 125 Design — Skill Unification 배치 1 (F303+F304)"
version: 1.0
status: Active
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
refs:
  - "[[FX-PLAN-S125]]"
  - "[[FX-SPEC-SKILL-UNIFY]]"
---

# Sprint 125 Design — Skill Unification 배치 1

## 1. 개요

F303(SkillCatalog API 전환) + F304(벌크 레지스트리 API) 기술 설계.

**핵심 원칙**: 기존 API/D1 스키마 변경 없이 연결 계층만 추가.

---

## 2. F303: SkillCatalog API 전환

### 2.1 타입 매핑 (BdSkill → SkillRegistryEntry)

현재 `BdSkill`과 API `SkillRegistryEntry` 간 필드 매핑:

| BdSkill | SkillRegistryEntry | 비고 |
|---------|-------------------|------|
| `id` | `skillId` | 키 매핑 |
| `name` | `name` | 동일 |
| `category` | `category` | enum 차이: BdSkill 6종 ↔ API 6종 (매핑 필요) |
| `description` | `description` | 동일 |
| `input` | — | API에 없음 → promptTemplate에서 추출 또는 무시 |
| `output` | — | API에 없음 → 무시 |
| `stages` | `tags` | stages를 tags로 매핑 |
| `type` | `sourceType` | "skill"→"marketplace", "command"→"custom" |

**카테고리 매핑** (bd-skills.ts → API):
```
pm-skills → bd-process
ai-biz → analysis
anthropic → integration
ai-framework → general
management → validation
command → generation
```

### 2.2 api-client 확장

`packages/web/src/lib/api-client.ts`에 추가:

```typescript
// ─── Skill Registry API (F303) ───

export interface SkillRegistryListResponse {
  items: SkillRegistryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface SkillSearchResponse {
  results: SkillSearchResult[];
  total: number;
  query: string;
}

export async function getSkillRegistryList(params?: {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<SkillRegistryListResponse> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return fetchApi<SkillRegistryListResponse>(
    `/skills/registry${query ? `?${query}` : ""}`
  );
}

export async function searchSkillRegistry(
  q: string,
  opts?: { category?: string; limit?: number }
): Promise<SkillSearchResponse> {
  const qs = new URLSearchParams({ q });
  if (opts?.category) qs.set("category", opts.category);
  if (opts?.limit) qs.set("limit", String(opts.limit));
  return fetchApi<SkillSearchResponse>(`/skills/search?${qs}`);
}

export async function getSkillRegistryDetail(
  skillId: string
): Promise<SkillRegistryEntry> {
  return fetchApi<SkillRegistryEntry>(`/skills/registry/${skillId}`);
}

export async function getSkillEnriched(
  skillId: string
): Promise<SkillEnrichedView> {
  return fetchApi<SkillEnrichedView>(`/skills/registry/${skillId}/enriched`);
}
```

### 2.3 React Hook

`packages/web/src/hooks/useSkillRegistry.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSkillRegistryList,
  searchSkillRegistry,
  getSkillEnriched,
  type SkillRegistryListResponse,
  type SkillSearchResponse,
} from "@/lib/api-client";
import type { SkillRegistryEntry, SkillEnrichedView } from "@foundry-x/shared";

interface UseSkillListParams {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface UseSkillListResult {
  items: SkillRegistryEntry[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSkillList(params?: UseSkillListParams): UseSkillListResult {
  const [data, setData] = useState<SkillRegistryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSkillRegistryList(params);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, [params?.category, params?.status, params?.limit, params?.offset]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    refetch: fetch,
  };
}

export function useSkillSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<SkillSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchSkillRegistry(query);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, debounceMs]);

  return { results, loading };
}
```

### 2.4 SkillCatalog 리팩토링 전략

**구조 변경**:
```
Before:
  SkillCatalog → import BD_SKILLS → 클라이언트 필터링

After:
  SkillCatalog → useSkillList(params) → API 호출 → 서버 필터링
               → useSkillSearch(query) → API 검색 (디바운스)
               → 폴백: API 실패 시 BD_SKILLS (import 유지)
```

**핵심 변경점**:
1. `BD_SKILLS` → `useSkillList()` 결과로 교체
2. `searchQuery` 클라이언트 필터 → `useSkillSearch()` API 호출
3. `selectedCategory` → API query param으로 전달
4. `selectedStage` → tags 기반 필터 (API에서 지원 안하면 클라이언트 후처리)
5. 로딩 스피너 + 에러 상태 UI 추가
6. 페이징: 최초 50건 로드 + "더 보기" 또는 스크롤 페이징

**SkillCard 변경**:
- `BdSkill` → `SkillRegistryEntry` 타입으로 전환
- `skill.stages` → `skill.tags` 표시
- `skill.type` → `skill.sourceType` 표시
- 카테고리 색상: `CATEGORY_COLORS` 매핑 확장 (API 카테고리 enum 대응)

**SkillDetailSheet 변경**:
- `BdSkill` → `SkillRegistryEntry` + optional `SkillEnrichedView`
- 스킬 선택 시 `getSkillEnriched()` 호출하여 메트릭/버전/계보 표시
- 메트릭 영역: `totalExecutions`, `successRate`, `tokenCostAvg`

**ProcessGuide 변경**:
- `BD_SKILLS.filter(s => s.stages.includes(stageId))` → API 호출 또는 공유 데이터

### 2.5 API 응답 보강 (list 엔드포인트)

현재 `GET /api/skills/registry`의 `list()` 메서드가 `total` 카운트를 반환하는지 확인 필요.
미지원 시 서비스에 COUNT 쿼리 추가:

```sql
SELECT COUNT(*) as total FROM skill_registry
WHERE tenant_id = ? AND status != 'archived'
```

---

## 3. F304: 벌크 레지스트리 API

### 3.1 Zod 스키마

`packages/api/src/schemas/skill-registry.ts`에 추가:

```typescript
export const bulkRegisterSkillSchema = z.object({
  skills: z.array(
    z.object({
      skillId: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      category: z.enum([
        "general", "bd-process", "analysis",
        "generation", "validation", "integration",
      ]).default("general"),
      tags: z.array(z.string()).max(20).optional(),
      sourceType: z.enum([
        "marketplace", "custom", "derived", "captured",
      ]).default("marketplace"),
      sourceRef: z.string().optional(),
    })
  ).min(1).max(500),
});

export type BulkRegisterSkillInput = z.infer<typeof bulkRegisterSkillSchema>;
```

### 3.2 서비스 메서드

`SkillRegistryService.bulkUpsert()`:

```typescript
interface BulkUpsertResult {
  created: number;
  updated: number;
  errors: Array<{ skillId: string; error: string }>;
  total: number;
}

async bulkUpsert(
  tenantId: string,
  items: BulkRegisterSkillInput["skills"],
  actorId: string,
): Promise<BulkUpsertResult> {
  const result: BulkUpsertResult = { created: 0, updated: 0, errors: [], total: items.length };
  const BATCH_SIZE = 50;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const stmts: D1PreparedStatement[] = [];

    for (const item of batch) {
      // Check if skill exists
      const existing = await this.db
        .prepare("SELECT id FROM skill_registry WHERE tenant_id = ? AND skill_id = ?")
        .bind(tenantId, item.skillId)
        .first();

      if (existing) {
        // UPDATE
        stmts.push(
          this.db.prepare(
            `UPDATE skill_registry
             SET name = ?, description = ?, category = ?, tags = ?,
                 source_type = ?, source_ref = ?, updated_by = ?, updated_at = datetime('now')
             WHERE tenant_id = ? AND skill_id = ?`
          ).bind(
            item.name, item.description ?? null, item.category,
            item.tags ? JSON.stringify(item.tags) : null,
            item.sourceType, item.sourceRef ?? null, actorId,
            tenantId, item.skillId,
          )
        );
        result.updated++;
      } else {
        // INSERT
        const id = generateId("sr");
        stmts.push(
          this.db.prepare(
            `INSERT INTO skill_registry
              (id, tenant_id, skill_id, name, description, category, tags,
               source_type, source_ref, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            id, tenantId, item.skillId, item.name, item.description ?? null,
            item.category, item.tags ? JSON.stringify(item.tags) : null,
            item.sourceType, item.sourceRef ?? null, actorId,
          )
        );
        result.created++;
      }
    }

    // D1 batch execution (최대 50 statements per batch)
    if (stmts.length > 0) {
      await this.db.batch(stmts);
    }

    // Build search indexes for batch
    for (const item of batch) {
      await this.searchService.buildIndex(tenantId, item.skillId, {
        name: item.name,
        description: item.description,
        tags: item.tags,
        category: item.category,
      });
    }
  }

  return result;
}
```

**D1 batch 활용**: `db.batch(stmts)` — 단일 트랜잭션으로 최대 50 statements 실행. 210건 = 5배치.

### 3.3 라우트

`packages/api/src/routes/skill-registry.ts`에 추가:

```typescript
// POST /skills/registry/bulk — 벌크 등록/업서트 (admin only)
skillRegistryRoute.post("/skills/registry/bulk", async (c) => {
  // Admin 권한 확인
  const role = c.get("userRole");
  if (role !== "admin" && role !== "owner") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const parsed = bulkRegisterSkillSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillRegistryService(c.env.DB);
  const result = await svc.bulkUpsert(c.get("orgId"), parsed.data.skills, c.get("userId"));
  return c.json(result, 200);
});
```

**주의**: `/skills/registry/bulk`는 `/skills/registry/:skillId`보다 **먼저** 등록해야 `bulk`가 param으로 잡히지 않음.

### 3.4 sf-scan 매핑 스크립트

`scripts/sf-scan-register.sh`:

```bash
#!/usr/bin/env bash
# sf-scan 결과를 Foundry-X API에 벌크 등록
# Usage: ./scripts/sf-scan-register.sh [--api-url URL] [--token TOKEN]

API_URL="${1:-https://foundry-x-api.ktds-axbd.workers.dev/api}"
TOKEN="${2:-$FOUNDRY_X_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Error: API token required. Set FOUNDRY_X_TOKEN or pass as argument."
  exit 1
fi

# sf-scan JSON 생성 (skill-framework CLI)
SF_OUTPUT=$(npx sf-scan --json 2>/dev/null)
if [ -z "$SF_OUTPUT" ]; then
  echo "Error: sf-scan produced no output"
  exit 1
fi

# JSON 변환 (sf-scan → API 포맷)
PAYLOAD=$(echo "$SF_OUTPUT" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const skills = data.skills.map(s => ({
  skillId: s.id || s.name.toLowerCase().replace(/\\s+/g, '-'),
  name: s.name,
  description: s.description || null,
  category: mapCategory(s.category),
  tags: s.tags || [],
  sourceType: 'custom',
  sourceRef: s.path || null,
}));
function mapCategory(cat) {
  const map = { 'pm-skills':'bd-process', 'ai-biz':'analysis', 'anthropic':'integration',
                 'ai-framework':'general', 'management':'validation', 'command':'generation' };
  return map[cat] || 'general';
}
console.log(JSON.stringify({ skills }));
")

# API 호출
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_URL}/skills/registry/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Bulk registration successful:"
  echo "$BODY" | jq '.'
else
  echo "❌ Failed (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
```

### 3.5 API list 응답 보강

현재 `SkillRegistryService.list()`의 응답에 `total` 카운트가 없으면 추가:

```typescript
async list(tenantId: string, query: ListSkillsQuery): Promise<SkillRegistryListResponse> {
  // ... 기존 쿼리 ...

  // total count 추가
  const countResult = await this.db
    .prepare("SELECT COUNT(*) as total FROM skill_registry WHERE tenant_id = ? AND status != 'archived'")
    .bind(tenantId)
    .first<{ total: number }>();

  return {
    items: results,
    total: countResult?.total ?? 0,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  };
}
```

---

## 4. 테스트 전략

### F303 테스트

| 파일 | 테스트 항목 |
|------|-----------|
| `packages/web/src/__tests__/skill-catalog.test.tsx` | API 연동 SkillCatalog 렌더링, 검색, 필터, 로딩/에러 상태 |
| `packages/web/src/__tests__/useSkillRegistry.test.ts` | hook 단위 테스트 (fetch, debounce, error) |

### F304 테스트

| 파일 | 테스트 항목 |
|------|-----------|
| `packages/api/src/__tests__/skill-registry-bulk.test.ts` | bulkUpsert: 신규 등록, upsert, 에러 케이스, 배치 처리, admin 권한 |

---

## 5. 마이그레이션

**D1 마이그레이션 불필요** — 기존 `skill_registry`, `skill_search_index` 테이블 그대로 사용.

단, `list()` 응답 보강을 위한 서비스 코드 변경만 필요.

---

## 6. 구현 순서 (autopilot용)

```
1. [F303-A] api-client.ts에 skill registry 메서드 4개 추가
2. [F303-B] useSkillRegistry.ts hook 신규 생성
3. [F303-C] SkillCatalog.tsx API 전환 리팩토링
4. [F303-D] SkillCard.tsx + SkillDetailSheet.tsx 타입 전환
5. [F303-E] ProcessGuide.tsx BD_SKILLS 참조 정리
6. [F303-F] skill-catalog.test.tsx 업데이트
7. [F303-G] API list() 응답에 total 추가 (필요 시)
8. [F304-A] bulkRegisterSkillSchema 스키마 추가
9. [F304-B] SkillRegistryService.bulkUpsert() 구현
10. [F304-C] POST /skills/registry/bulk 라우트 추가
11. [F304-D] skill-registry-bulk.test.ts 테스트
12. [F304-E] sf-scan-register.sh 스크립트
13. typecheck + lint + test 전체 통과 확인
```
