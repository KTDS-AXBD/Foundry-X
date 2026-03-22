# Agent Evolution 인터뷰 로그

**날짜:** 2026-03-22
**참석:** Sinclair Seo (PM/Dev), Claude (AI)

---

## Part 1: 리소스 조사 요청

사용자가 6개 외부 리소스를 기술적으로 조사하고 Foundry-X 적용 방안을 논의해달라고 요청.

### 조사 대상
1. **gstack** (github.com/garrytan/gstack) — YC CEO Garry Tan의 Claude Code 스킬 모음. 18개 역할 기반 AI 팀, Sprint 워크플로우, 병렬 실행(Conductor), Real QA
2. **Anthropic 에이전트 워크플로우 패턴** (claude.com/blog) — Sequential, Parallel, Evaluator-Optimizer 3대 패턴
3. **claude-code-router** (github.com/musistudio) — 멀티 프로바이더 AI 모델 라우팅 프록시. 태스크별 모델 분리
4. **Fluid.sh** — "Claude Code for Infrastructure". 샌드박스 격리 + 4단계 프로세스(Explore→Plan→Sandbox→IaC Export)
5. **awesome-openrouter** — OpenRouter 통합 앱 40+ 큐레이션. 300+ 모델 단일 API 게이트웨이
6. **openrouter-examples** — OpenRouter API 사용 예제 (Fetch, AI SDK v5, Effect-AI)

---

## Part 2: 적용 방향 결정

### Q1: 적용 범위
- **질문:** 플랫폼 기능 vs 개발 도구 vs 둘 다?
- **답변:** **둘 다** — 단기적으로 개발 도구 활용, 중장기적으로 플랫폼 기능 반영

### Q2: LLM 전략
- **질문:** Anthropic 전용 vs OpenRouter 게이트웨이?
- **답변:** **OpenRouter 게이트웨이** — 300+ 모델 접근, 태스크별 최적 모델 자동 선택

### Q3: 에이전트 확장
- **질문:** 어떤 역할 에이전트를 추가할지?
- **답변:** **전체 확장 검토** — 모든 가능한 역할을 PRD에 나열하고 우선순위 매김

### Q4: 워크플로우
- **질문:** Sprint 워크플로우 vs 멀티모델 우선?
- **답변:** **둘 다 PRD에 포함**

### Q5: 개발 도구
- **질문:** gstack/claude-code-router를 개발에 도입?
- **답변:** **네, 도구 도입도 검토**

### Q6: API 키 관리
- **질문:** OpenRouter 단일 키 vs 프로바이더별 개별 키?
- **답변:** **OpenRouter 단일 키** — 프로바이더 키 대행 관리

### Q7: 도입 시점
- **질문:** Phase 5 시작시 vs 즉시 vs 열려있음?
- **답변:** **열려 있음** — PRD 먼저 작성, 시점은 후결정

---

## Part 3: 기술 분석 결과

### Foundry-X 현재 에이전트 아키텍처 (Sprint 31 기준)

| 구성요소 | 현황 |
|----------|------|
| Runner | 3종 (Claude API / MCP / Mock) + 동적 라우팅 |
| Orchestrator | 병렬 실행 + 충돌 감지 + 자동 rebase (780줄) |
| 전문 에이전트 | PlannerAgent (301줄) + ReviewerAgent (120줄) |
| 워크플로우 | DAG 기반 workflow-engine (305줄) |
| 메시징 | AgentInbox (inter-agent, 144줄) |
| PR 파이프라인 | Code→PR→Review→Merge (319줄) |
| 격리 실행 | Worktree 기반 (F72) |
| Auto-Fix | Hook 실패 시 LLM 기반 자동 수정 (F101) |
| LLM 모델 | Claude Haiku 단일 (Planner만 Sonnet) |

### 갭 분석 (리소스 대비)

| 영역 | 현재 | 목표 (리소스 기반) |
|------|------|-------------------|
| 모델 | 단일 (Haiku) | 멀티모델 라우팅 (OpenRouter) |
| 에이전트 역할 | 2개 (Planner, Reviewer) | 5~8개 전문 역할 |
| 워크플로우 패턴 | Sequential + Parallel | + Evaluator-Optimizer |
| 인프라 자동화 | 없음 | 샌드박스 기반 (Fluid) |
| 실제 QA | 없음 | 브라우저 기반 테스트 (gstack /qa) |
| 개발 도구 | bkit 기반 | + gstack 스킬 + router |
