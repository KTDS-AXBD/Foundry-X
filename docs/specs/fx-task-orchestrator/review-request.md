---
code: FX-RVW-TASK-ORCH
title: Task Orchestrator PRD v0.3 외부 AI 검토 요청 패키지
version: 1.0
status: Active
category: REVIEW
created: 2026-04-10
updated: 2026-04-10
author: Sinclair Seo
---

# Task Orchestrator PRD v0.3 — 외부 AI 검토 요청

> **사용 방법**: 아래 § "검토 요청 프롬프트"를 복사해서 각 AI(Gemini / GPT / Claude Opus)의 웹 UI 또는 API에 붙여넣어요. 답변 받으면 `docs/specs/fx-task-orchestrator/review-feedback.md`에 기록 → 저에게 전달.

## 검토 대상

- **파일**: `docs/specs/fx-task-orchestrator/prd-draft.md` (v0.3)
- **버전 이력**: v0.1 초안 → v0.2 미결 5건 결정 반영 → v0.3 자가 리뷰 11건 결함 반영
- **PRD 유형**: 기술 인프라 (BD 형상화 아님) — Foundry-X 내부 개발 워크플로우 자동화

## 사전 자가 리뷰 요약

이미 2개 사내 에이전트로 검토 완료, 11건 결함을 v0.3에 모두 반영했어요:
- **auto-reviewer** (3 페르소나: PO/Tech Lead/End User) — Consensus 3/3 Pass
- **shaping-discriminator** (Rubric S2/S3/S4/S5) — 종합 0.70 (MAJOR_ISSUE → RESOLVED)

반영된 결함: C1 (Critical) + M1~M4 (Major) + m1~m3 (Minor) + RA1~RA3 (누락 리스크)

**그러므로 외부 AI에게는 "사내 검토가 놓친 관점"을 찾아달라고 요청**해요.

---

## 검토 요청 프롬프트 (공통)

````
You are reviewing a technical infrastructure PRD for an internal developer
workflow automation system. This is NOT a business/market PRD — it's about
coordinating git worktrees, tmux panes, and AI subagents in a monorepo
development environment.

CONTEXT:
- Project: Foundry-X (TypeScript/Python monorepo, Cloudflare Workers stack)
- Author: Solo power user + future small team
- Environment: WSL2 + tmux + Claude Code CLI
- The PRD has already passed 2 rounds of internal review (3-persona review
  + rubric-based discrimination). 11 defects were identified and resolved
  in v0.3 (1 Critical + 4 Major + 3 Minor + 3 missed risks).

YOUR TASK:
Find what the internal reviewers MISSED. Focus on blind spots, not restating
already-resolved issues. Be ruthlessly skeptical. Assume the author may have
tunnel-vision from being too close to the problem.

SPECIFIC ANGLES TO EXPLORE:
1. Hidden coupling between tmux pane lifecycle and Claude Code session state
   — what happens when Claude Code crashes mid-task, or when tmux session
   is detached and reattached?
2. Race conditions in /ax:task start §4.1.1 pseudocode — specifically,
   what if another process pushes to master between steps 2 (push) and 3
   (WT create)?
3. The F/B/C track taxonomy — is there a 4th track hiding in the use cases?
   (e.g., "experiment", "spike", "docs-only", "release chore")
4. conflict-resolver's risk_level classification — how is "low/medium/high"
   actually determined? Is there a training or prompting strategy implied?
5. Scalability of .task-context file + /tmp/fx-task-log.ndjson approach
   — what breaks at 100 tasks? 1000?
6. Human factors: What cognitive load does this add vs remove? A power user
   already managing sprint WTs now also manages tasks. Is the mental model
   actually simpler or just different?
7. Rollback strategy: If Phase 0 S-α ships and is a dud, how do we remove
   it cleanly? Is the migration reversible?
8. Security/supply chain: conflict-resolver auto-writes code. What if a
   malicious commit message tries to prompt-inject the resolver?
9. Any decision in §10 "Resolved Issues" that you think was wrong.
10. Any goal in §2 that you think is unachievable given the design.

OUTPUT FORMAT:
- Structured critique (not a summary)
- Separate sections: "Blind Spots" / "Wrong Decisions" / "Risk Additions"
- Prioritize: Critical / Major / Minor
- Be specific: cite section numbers, line numbers, or exact phrases
- 500-800 words in English or Korean (reviewer's choice)
- End with "Top 3 v0.4 changes you'd make"

PRD BODY FOLLOWS BELOW:
---
[여기에 prd-draft.md 전체 내용 붙여넣기]
````

---

## AI별 특화 지시 (공통 프롬프트 뒤에 추가)

### Gemini (2.5 Pro 권장)

```
Additional instruction for Gemini:
- Apply your strength in long-context analysis. Cross-reference §4.1.1
  pseudocode with §6.1.2 approve gate to find logical inconsistencies.
- Look for implicit assumptions about tmux/git behavior that may not
  hold on non-Linux environments.
```

### GPT (GPT-5 또는 GPT-4.1 권장)

```
Additional instruction for GPT:
- Apply your strength in code-level reasoning. Mentally execute the
  §4.1.1 pseudocode with adversarial inputs (network failures, partial
  pushes, concurrent task starts).
- Critique the subagent orchestration pattern from an agentic systems
  perspective — is this the right abstraction?
```

### Claude Opus (4.6 또는 4.5 권장)

```
Additional instruction for Claude Opus:
- You are allowed to be self-critical if you identify that an Anthropic
  model (conflict-resolver = Sonnet) is over-relied upon for a task it
  cannot safely perform.
- Evaluate the human approve gate (§6.1.2) from a safety research
  perspective: is the risk_level classification robust enough?
```

---

## 답변 회수 후 다음 단계

1. 3종 답변을 `review-feedback.md`에 아래 템플릿으로 정리:

```markdown
## Gemini feedback
(paste here)

## GPT feedback
(paste here)

## Claude Opus feedback
(paste here)

## Synthesis (사용자 주관)
- 중복 지적: ...
- 독립 지적: ...
- 반영 vs 각하 판단 메모: ...
```

2. 피드백을 저(Claude Code)에게 전달
3. v0.4 반영 → 최종 착수 게이트 진입
