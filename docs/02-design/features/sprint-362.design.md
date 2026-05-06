---
code: FX-DSGN-362
title: Sprint 362 Design — F623 /ax:domain-init β endpoint (core/asset/ 합류)
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 362
f_item: F623
req: FX-REQ-688
priority: P2
---

# Sprint 362 Design — F623 /ax:domain-init β endpoint

> Plan: `docs/01-plan/features/sprint-362.plan.md` · SPEC: §5 F623

## §1 목표

`POST /api/asset/domain-init` — 새 본부 도메인 인스턴스화 시 5-Asset (Policy/Ontology/Skill/Log/SystemKnowledge) 스캐폴드를 일괄 생성한다. F629 core/asset/ sub-app에 자연 확장으로 합류.

## §2 의존 서비스 계약 (D2 식별자 계약)

| 서비스 | 실제 클래스 | 실제 메서드 | 반환 |
|--------|------------|------------|------|
| F631 PolicyEngine | `PolicyEngine` | `registerPolicy({ orgId, actionType, allowed, reason, metadata })` | `{ id: string }` |
| F628 EntityRegistry | `EntityRegistry` | `register({ serviceId, entityType, besirType, externalId, title, metadata, orgId })` | `ServiceEntity { id, ... }` |
| F629 SystemKnowledgeService | `SystemKnowledgeService` | `registerKnowledge({ orgId, title, contentRef, contentType, metadata, createdBy })` | `SystemKnowledgeAsset { id, ... }` |
| F606 AuditBus | `AuditBus` | `emit(eventType, payload, ctx: TraceContext, actor?, tenantId?)` | `void` |

> **주의**: Plan 문서는 `entityRegistry.registerEntity()`를 사용했으나, 실제 API는 `entityRegistry.register()`. 구현은 실제 코드 기준.

## §3 데이터 흐름

```
POST /api/asset/domain-init
  ↓ DomainInitSchema 파싱 (domainName, orgId, ownerId, description?)
  ↓ DomainInitService.scaffold(input)
    1. PolicyEngine.registerPolicy()          → policyId
    2. EntityRegistry.register(actor)         → entityId
    3. skillRef = "ax-marketplace/skills/domain-{name}" (reference only)
    4. AuditBus.emit("domain.initialized")    → traceId (used as auditEventId)
    5. SystemKnowledgeService.registerKnowledge() → knowledgeId
  ↓ DomainInitResult { domainName, orgId, scaffoldedAssets[5], initializedAt }
  → 200 JSON
```

## §4 TDD Red Target

테스트 파일: `core/asset/services/domain-init.service.test.ts`

| 테스트 | 검증 내용 |
|--------|----------|
| T1 | scaffold("kotra") → policyEngine.registerPolicy 1회 호출 |
| T2 | scaffold("kotra") → entityRegistry.register 1회 호출 (besirType="actor") |
| T3 | scaffold("kotra") → auditBus.emit("domain.initialized", ...) 1회 호출 |
| T4 | scaffold("kotra") → systemKnowledgeService.registerKnowledge 1회 호출 |
| T5 | 반환값 scaffoldedAssets에 policy/ontology/skill/log/systemKnowledge 5개 포함 |

## §5 파일 매핑 (D1 주입 사이트 전수)

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `core/asset/services/domain-init.service.ts` | **신규** | DomainInitService class + DomainInitInput/DomainInitResult/DomainScaffold interface |
| `core/asset/services/domain-init.service.test.ts` | **신규** | TDD 테스트 5건 |
| `core/asset/types.ts` | **수정** | DomainInitService + DomainInitInput + DomainInitResult + DomainScaffold re-export |
| `core/asset/schemas/asset.ts` | **수정** | DomainInitSchema + DomainInitResponseSchema 추가 |
| `core/asset/routes/index.ts` | **수정** | POST /domain-init 핸들러 추가 (DomainInitSchema 파싱 + DomainInitService 호출) |
| `docs/specs/ai-foundry-master-plan/ax-plugin-domain-init-contract.md` | **신규** | ax-plugin skill 신설 가이드 (외부 git repo 대상) |

> **D1 Breaking change**: 없음. 신규 routes 추가만. D3 소비자 영향 없음.
> **D4 TDD Red**: `domain-init.service.test.ts` FAIL 확인 후 커밋 (service 파일 stub만 허용).

## §6 스키마

### DomainInitInput
```typescript
{ domainName: string (1~64), orgId: string, ownerId: string, description?: string (max 1000) }
```

### DomainInitResult
```typescript
{
  domainName: string, orgId: string,
  scaffoldedAssets: {
    policy: { policyId: string },
    ontology: { entityId: string },
    skill: { skillRef: string },
    log: { auditEventId: string },       // = traceId of domain.initialized event
    systemKnowledge: { knowledgeId: string },
  },
  initializedAt: number
}
```

## §7 Phase Exit 체크리스트 (P-a~P-l)

P-a: `domain-init.service.ts` 신설 (DomainInitService class export)
P-b: `types.ts` DomainInitInput + DomainInitResult + DomainScaffold 3개 re-export
P-c: `schemas/asset.ts` DomainInitSchema + DomainInitResponseSchema 2개 신규
P-d: `routes/index.ts` POST `/domain-init` 핸들러 1개 추가
P-e: scaffold() 5-Asset 일괄 호출 단위 테스트 PASS
P-f: ax-plugin contract 문서 1건 신설
P-g: auditBus.emit("domain.initialized") mock 검증
P-h: app.ts `/api/asset` mount 회귀 0
P-i: typecheck + 5 tests GREEN
P-j: dual_ai_reviews sprint 362 자동 INSERT (hook)
P-k: ESLint baseline 회귀 0
P-l: API smoke POST /api/asset/domain-init → 200 + scaffoldedAssets 5 entries
