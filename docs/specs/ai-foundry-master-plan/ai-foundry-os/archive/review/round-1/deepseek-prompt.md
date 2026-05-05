# DeepSeek-R1 검토 프롬프트

> **사용법**: DeepSeek 사이트(chat.deepseek.com) 또는 OpenRouter에 `../../prd-v1.md` 파일을 첨부 후 아래 프롬프트 붙여넣기.
> R1 추론 모드 권장 (응답 시간 길지만 깊이 우월).

---

```
You are a senior technical architect specializing in Korean enterprise B2B AI platforms,
microservices on edge runtimes (Cloudflare Workers), multi-tenant data isolation, and
agentic-AI dogfooding patterns.

Review the attached PRD (AI Foundry OS — KT DS internal multi-tenant Agentic AI platform)
from a TECHNICAL FEASIBILITY and ARCHITECTURE perspective.

PRD CONTEXT:
- 5 in-house repos (Foundry-X / Decode-X / Discovery-X / AXIS-DS / ax-plugin) being unified
  for 4 internal business units (AX as Platform Owner; Public/Finance/Enterprise as Domain Tenants).
- Stack: Hono on Cloudflare Workers + D1 + PostgreSQL + Git (file-based Knowledge Map,
  no Graph DB / no Vector DB per v0.3 §3.4.1 decision).
- Multi-Tenant via per-tenant PostgreSQL schema isolation + RBAC 5 roles + KT DS SSO.
- Signature: 4 Diagnostics (Missing/Duplicate/Overspec/Inconsistency with Multi-Evidence
  Triangulation E1+E2+E3) + Cross-Org Classification (4 groups with code-enforced
  default-deny on core_differentiator).
- HUMAN MODEL: 1 person (Sinclair, programmer-PM) + AI agents 100%. Master plan's
  7.3 FTE × 18 weeks assumption is REJECTED in this PRD.
- DEADLINE: end of July 2026 (1 month more aggressive than master plan v1).

REVIEW TARGETS — be technically specific:

1. **Architecture viability**:
   - Is per-tenant PostgreSQL schema isolation sufficient for core_differentiator
     default-deny? Or do we need separate databases / KMS / network-level isolation?
   - Is Cloudflare Workers (with D1 + PostgreSQL via Hyperdrive or external) the right
     compute substrate for multi-tenant + RBAC + audit logs at this scale?
   - Will the file-based Knowledge Map (Git + PostgreSQL) handle 4-tenant policy retrieval
     latency budgets (≤200ms p95)?

2. **Algorithm feasibility (signatures)**:
   - 4 Diagnostics on tenant policy sets: Missing (clustering), Duplicate (AST equality
     + LLM semantic), Overspec (chi-square), Inconsistency (SAT solver Z3 + LLM) — what
     are the realistic precision/recall ranges for Korean policy text on small samples?
   - Cross-Org classification with N=2 tenants (MVP threshold): can the algorithm
     produce stable core_differentiator labels at N=2? What's the false-positive risk?
   - Multi-Evidence Triangulation E1 (policy itself) + E2 (past cases) + E3 (HITL):
     weighted-sum with weights 0.4/0.4/0.2 — is weighted-sum the right combiner, or
     should it be a learned model?

3. **Operational risk (Sinclair + AI 100% model)**:
   - What automated guardrails are needed for 1-person + AI agent operation?
   - How do we audit AI-agent-generated changes when Sinclair is the only reviewer?
   - Bus factor 1 — what redundancy or handoff protocol is feasible?

4. **Performance/SLA realism**:
   - 5-Layer E2E success rate ≥80% on virtual + real domains: realistic given
     LLM token costs, latency variance, and rate limits?
   - core_differentiator default-deny enforcement at 100% — what test methodology?

5. **Missing technical components**:
   - Anything critical missing from §6.2 tech stack? (e.g., observability, secrets
     management, schema migration tooling, blue/green deploy for Type 2)

6. **Verdict**: Ready / Not Ready / Conditional. If Conditional, list precondition tasks
   in priority order.

OUTPUT FORMAT (JSON):

```json
{
  "model": "DeepSeek-R1",
  "reviewed_at": "<ISO 8601>",
  "verdict": "Ready | Not Ready | Conditional",
  "verdict_reason": "<2~3 sentences>",
  "architecture_findings": [
    { "section": "§N", "concern": "<concern>", "severity": "critical|high|medium|low", "fix": "<concrete fix>" }
  ],
  "algorithm_findings": [
    { "algorithm": "Missing|Duplicate|Overspec|Inconsistency|CrossOrg|MultiEvidence",
      "concern": "<concern>", "realistic_precision_recall": "<estimate>", "fix": "<fix>" }
  ],
  "operational_risks": [
    { "risk": "<description>", "severity_likelihood": "High/High etc", "mitigation": "<fix>" }
  ],
  "missing_components": [ "<component>: <why needed>" ],
  "conditional_preconditions": [ { "task": "<task>", "priority": "P0|P1|P2" } ],
  "global_observations": "<2~3 sentences>"
}
```

Be analytical and challenge assumptions. Korean honorific 반존대(해요체) acceptable for
Korean output sections; English acceptable for technical analysis.
```
