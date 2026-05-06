---
code: FX-PLAN-362
title: Sprint 362 — F623 /ax:domain-init β endpoint (T4 세 번째)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 362
f_item: F623
req: FX-REQ-688
priority: P2
---

# Sprint 362 — F623 /ax:domain-init β endpoint (T4 세 번째)

> SPEC.md §5 F623 row가 권위 소스. 본 plan은 17 internal dev plan §3 T4 세 번째 sprint.
> **시동 조건**: 354/360/361 중 1개 MERGED 후 (3 sprint 한도 준수).
> **scope**: Foundry-X endpoint만. ax-plugin skill 자체는 외부 git repo 별 트랙.

## §1 배경 + 사전 측정

### F623 본질
- BeSir 정합성 P1 누락 3건 중 하나
- 새 본부 도메인 인스턴스화 시 **5-Asset 스캐폴드 자동 생성** (Policy/Ontology/Skill/Log/SystemKnowledge 각 default 1건)
- Phase 3 도메인 인스턴스화(W30+) **주 진입점**
- ax-marketplace 24 스킬 + 신규 5 스킬 후보 중

### 두 트랙 분리

| 트랙 | 본 sprint scope |
|------|-----------------|
| **Foundry-X endpoint** | ✅ POST /api/asset/domain-init + DomainInitService |
| **ax-plugin skill 자체** | ❌ 외부 git repo (사용자/후속) — contract 문서만 |

### 의존 unlock

| 의존 F# | 상태 | 활용 |
|---------|------|------|
| F606 audit-bus | ✅ MERGED | domain.initialized 이벤트 |
| F628 BesirEntityType | ✅ MERGED | Ontology 자산 (besir_type=actor) |
| F629 5-Asset Model | ✅ MERGED | core/asset/ 합류 + system_knowledge 활용 |
| F631 PolicyEngine | ✅ MERGED | Policy 자산 등록 |

## §2 인터뷰 4회 패턴 (S336, 41회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T4 세 번째 = F623 | F615/F616 평행 진행 |
| 2차 위치 | **A core/asset/ 합류** | F629 5-Asset sub-app 자연 확장 |
| 3차 ax-plugin | **endpoint만 + contract 문서** | 외부 git repo 별 트랙 |
| 4차 시동 | **354/360/361 중 1개 MERGED 후** | 3 sprint 한도 |

## §3 범위 (a~i)

### (a) `core/asset/services/domain-init.service.ts` 신설

```typescript
import { EntityRegistryService } from "../../entity/types.js"; // F628
import { PolicyEngine } from "../../policy/types.js";          // F631
import { SystemKnowledgeService } from "./system-knowledge.service.js"; // F629
import { AuditBus } from "../../infra/types.js";                // F606

export interface DomainInitInput {
  domainName: string;       // 예: "kotra", "본부 A"
  orgId: string;
  ownerId: string;
  description?: string;
}

export interface DomainScaffold {
  policy: { policyId: string };
  ontology: { entityId: string };
  skill: { skillRef: string };
  log: { auditEventId: string };
  systemKnowledge: { knowledgeId: string };
}

export interface DomainInitResult {
  domainName: string;
  orgId: string;
  scaffoldedAssets: DomainScaffold;
  initializedAt: number;
}

export class DomainInitService {
  constructor(
    private db: D1Database,
    private entityRegistry: EntityRegistryService,
    private policyEngine: PolicyEngine,
    private systemKnowledgeService: SystemKnowledgeService,
    private auditBus: AuditBus,
  ) {}

  async scaffold(input: DomainInitInput): Promise<DomainInitResult> {
    // 1. Policy: 기본 정책 1건 (read_only allow, 다른 default-deny)
    const policy = await this.policyEngine.registerPolicy({
      orgId: input.orgId,
      actionType: "read_only",
      allowed: true,
      reason: `Default read_only for domain ${input.domainName}`,
      metadata: { domainName: input.domainName, scaffoldedBy: "domain-init" },
    });

    // 2. Ontology: 본부 actor entity 1건 (BeSir 7-타입)
    const ontologyEntity = await this.entityRegistry.registerEntity({
      serviceId: "ai-foundry",
      entityType: "domain_actor",
      besirType: "actor",
      externalId: `domain-${input.domainName}`,
      title: input.domainName,
      metadata: { ownerId: input.ownerId, scaffoldedBy: "domain-init", description: input.description ?? null },
      orgId: input.orgId,
    });

    // 3. Skill: ax-plugin reference (외부 git, contract만)
    const skillRef = `ax-marketplace/skills/domain-${input.domainName}`;

    // 4. Log: audit-bus 도메인 등록 이벤트
    const initializedAt = Date.now();
    await this.auditBus.emit("domain.initialized", {
      domainName: input.domainName,
      orgId: input.orgId,
      ownerId: input.ownerId,
      scaffoldedAt: initializedAt,
      assetIds: { policyId: policy.id, entityId: ontologyEntity.id },
    });

    // 5. System Knowledge: 기본 도메인 룰 1건
    const knowledge = await this.systemKnowledgeService.registerKnowledge({
      orgId: input.orgId,
      title: `${input.domainName} 도메인 룰 (기본)`,
      contentRef: `knowledge/domains/${input.domainName}/rules.md`,
      contentType: "domain_rule",
      metadata: { scaffoldedBy: "domain-init", ownerId: input.ownerId },
      createdBy: input.ownerId,
    });

    return {
      domainName: input.domainName,
      orgId: input.orgId,
      scaffoldedAssets: {
        policy: { policyId: policy.id },
        ontology: { entityId: ontologyEntity.id },
        skill: { skillRef },
        log: { auditEventId: String(initializedAt) },
        systemKnowledge: { knowledgeId: knowledge.id },
      },
      initializedAt,
    };
  }
}
```

### (b) `core/asset/types.ts` 갱신

기존 export에 추가:
```typescript
export { DomainInitService } from "./services/domain-init.service.js";
export type { DomainInitInput, DomainInitResult, DomainScaffold } from "./services/domain-init.service.js";
```

### (c) `core/asset/schemas/asset.ts` 갱신

```typescript
export const DomainInitSchema = z.object({
  domainName: z.string().min(1).max(64),
  orgId: z.string().min(1),
  ownerId: z.string().min(1),
  description: z.string().max(1000).optional(),
}).openapi("DomainInit");

export const DomainInitResponseSchema = z.object({
  domainName: z.string(),
  orgId: z.string(),
  scaffoldedAssets: z.object({
    policy: z.object({ policyId: z.string() }),
    ontology: z.object({ entityId: z.string() }),
    skill: z.object({ skillRef: z.string() }),
    log: z.object({ auditEventId: z.string() }),
    systemKnowledge: z.object({ knowledgeId: z.string() }),
  }),
  initializedAt: z.number(),
}).openapi("DomainInitResponse");
```

### (d) `core/asset/routes/index.ts` — POST /asset/domain-init endpoint 추가

```typescript
const domainInitRoute = createRoute({
  method: "post",
  path: "/domain-init",
  request: { body: { content: { "application/json": { schema: DomainInitSchema } } } },
  responses: { 200: { content: { "application/json": { schema: DomainInitResponseSchema } } } },
});

assetApp.openapi(domainInitRoute, async (c) => {
  const input = c.req.valid("json");
  const service = new DomainInitService(/* deps from c.env */);
  const result = await service.scaffold(input);
  return c.json(result);
});
```

### (e) audit-bus 통합 (F606)
- `domain.initialized` event_type
- payload: `{ domainName, orgId, ownerId, scaffoldedAt, assetIds: {policyId, entityId} }`

### (f) ax-plugin skill contract 명시 (외부 git 가이드)

`docs/specs/ai-foundry-master-plan/ax-plugin-domain-init-contract.md` 신규:

```markdown
# /ax:domain-init β — ax-plugin Skill Contract

> 본 문서는 ax-marketplace git repo의 `skills/domain-init/SKILL.md` 신설 가이드.
> Foundry-X측 endpoint는 F623(Sprint 362)에서 제공.

## Skill 호출 spec
- 사용자: `/ax:domain-init <domain-name>` 또는 `/ax:domain-init kotra`
- Skill 동작:
  1. Foundry-X endpoint 호출: `POST /api/asset/domain-init`
  2. payload: { domainName, orgId (현 세션 컨텍스트), ownerId (사용자), description (선택) }
  3. response: DomainInitResult { scaffoldedAssets } 표시

## Endpoint 응답 schema
(DomainInitResponseSchema 참조)

## ax-plugin 신설 가이드
1. `~/.claude/plugins/marketplaces/ax-marketplace/` git clone
2. `skills/domain-init/` 디렉토리 신설
3. SKILL.md 작성 (트리거 키워드 + Foundry-X endpoint 호출 절차)
4. `cd ~/.claude/plugins/marketplaces/ax-marketplace && git add ... && git commit && git push`
5. cache 동기화
```

### (g) test mock 1건

`__tests__/domain-init.test.ts`:
- Mock D1 + Mock EntityRegistry/PolicyEngine/SystemKnowledgeService/AuditBus
- Test 1: scaffold("kotra") → 5 자산 INSERT + audit emit "domain.initialized" + 응답 5 entries

### (h) typecheck + tests GREEN
회귀 0 확증.

### (i) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | core/asset/services/domain-init.service.ts 신설 | grep | DomainInitService class export |
| P-b | types.ts 3 신규 export | grep | DomainInitInput + DomainInitResult + DomainScaffold |
| P-c | schemas 2 신규 | grep | DomainInitSchema + DomainInitResponseSchema |
| P-d | routes endpoint 1 추가 | grep `/asset/domain-init` | 1 |
| P-e | DomainInitService 5-Asset 일괄 INSERT 동작 | unit test | 5 자산 |
| P-f | ax-plugin contract 문서 1건 신설 | find | `ax-plugin-domain-init-contract.md` |
| P-g | audit-bus domain.initialized 이벤트 mock | mock | emit |
| P-h | app.ts /api/asset mount 회귀 0 | grep | 1 line (F629에서 이미) |
| P-i | typecheck + 1 test GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 362 자동 INSERT | D1 query | ≥ 1건 (hook 37 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/asset/domain-init` | curl | 200 OK + scaffoldedAssets 5 entries |

## §5 전제

- F606 ✅ + F628 ✅ + F629 ✅ + F631 ✅ MERGED
- 354/360/361 중 1개 MERGED 후 시동 (3 sprint 한도)

## §6 예상 시간

- autopilot **~15분** (Minimal — 1 service + 1 endpoint + 5-Asset 일괄 + 1 contract md + 1 test)

## §7 다음 사이클 후보 (F623 후속, T4 진행)

- **Sprint 363 — F603** Cross-Org default-deny 골격 (T4, 자체 부분)
- Sprint 364 — F626 core_diff 차단율 측정 코드 (T4, F603 후)
- Sprint 365 — F617 Guard-X Integration (T5, F615 ✅ 후)
- Sprint 366 — F618 Launch-X Integration (T5, F616 ✅ 후)
