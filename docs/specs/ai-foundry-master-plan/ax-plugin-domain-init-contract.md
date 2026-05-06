---
code: FX-DOC-362-CONTRACT
title: /ax:domain-init β — ax-plugin Skill Contract
version: 1.0
status: Active
category: CONTRACT
created: 2026-05-06
updated: 2026-05-06
related_f_item: F623
related_endpoint: POST /api/asset/domain-init
---

# /ax:domain-init β — ax-plugin Skill Contract

> Foundry-X측 endpoint는 F623 (Sprint 362)에서 제공.
> ax-marketplace git repo에서 `skills/domain-init/SKILL.md` 신설을 위한 가이드.

## Endpoint

```
POST /api/asset/domain-init
Content-Type: application/json
Authorization: Bearer <JWT>
```

## Request Schema (DomainInit)

```json
{
  "domainName": "kotra",       // required, 1~64자
  "orgId": "org-uuid",         // required
  "ownerId": "user-uuid",      // required
  "description": "선택 설명"   // optional, max 1000자
}
```

## Response Schema (DomainInitResponse)

```json
{
  "domainName": "kotra",
  "orgId": "org-uuid",
  "scaffoldedAssets": {
    "policy":          { "policyId": "uuid" },
    "ontology":        { "entityId": "uuid" },
    "skill":           { "skillRef": "ax-marketplace/skills/domain-kotra" },
    "log":             { "auditEventId": "traceId-hex32" },
    "systemKnowledge": { "knowledgeId": "uuid" }
  },
  "initializedAt": 1746528000000
}
```

## Skill 호출 패턴 (ax-marketplace `skills/domain-init/SKILL.md` 작성 기준)

```markdown
# /ax:domain-init

## Trigger
사용자: `/ax:domain-init <domain-name>` 또는 `/ax:domain-init kotra`

## 동작
1. Foundry-X 세션 컨텍스트에서 orgId + ownerId 추출
2. POST /api/asset/domain-init 호출:
   - payload: { domainName, orgId, ownerId, description? }
3. DomainInitResponse 수신 → 사용자에게 결과 표시
4. scaffoldedAssets 5개 항목 확인 (policy/ontology/skill/log/systemKnowledge)

## 결과 표시 형식
도메인 "{domainName}" 초기화 완료 ✅
- Policy ID: {policyId}
- Ontology Entity ID: {entityId}
- Skill Reference: {skillRef}
- Audit Event ID: {auditEventId}
- System Knowledge ID: {knowledgeId}
```

## ax-plugin 신설 절차

1. ax-marketplace git repo clone:
   ```bash
   cd ~/.claude/plugins/marketplaces/ax-marketplace
   mkdir -p skills/domain-init
   ```
2. `skills/domain-init/SKILL.md` 작성 (위 Skill 호출 패턴 기준)
3. `plugin.json`의 `skills` 배열에 `domain-init` 추가
4. commit + push:
   ```bash
   git add skills/domain-init/SKILL.md plugin.json
   git commit -m "feat: /ax:domain-init β skill (F623 contract)"
   git push
   ```
5. cache 동기화:
   ```bash
   cp -r skills/domain-init ~/.claude/plugins/cache/ax-marketplace/ax/latest/skills/
   ```
6. `/ax:infra-selfcheck` C9 (Plugin Cache Drift) — drift=0 확인

## 의존 F-items

| F# | 역할 | 상태 |
|----|------|------|
| F606 | AuditBus (domain.initialized event) | ✅ |
| F628 | EntityRegistry (BeSir actor) | ✅ |
| F629 | 5-Asset Model (system_knowledge) | ✅ |
| F631 | PolicyEngine (read_only policy) | ✅ |
| **F623** | **domain-init endpoint** | **✅ Sprint 362** |
