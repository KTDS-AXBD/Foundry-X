---
code: FX-ANLS-015
title: "AI Test Agent & Code Review Agent 리서치 보고서"
version: "1.0"
status: Active
category: analysis
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo
---

# FX-ANLS-015: AI Test Agent & Code Review Agent 리서치 보고서

> 조사 기준일: 2026-03-26 | 대상: Anthropic Agent SDK, Claude Code Review, 외부 AI Test Agent 생태계

---

## 목차

1. [Anthropic Agent SDK 기반 Test Agent](#1-anthropic-agent-sdk-기반-test-agent)
2. [Anthropic Code Review Agent](#2-anthropic-code-review-agent)
3. [외부 Test Agent 벤치마크](#3-외부-test-agent-벤치마크)
4. [TDD with AI Agent 전략](#4-tdd-with-ai-agent-전략)
5. [Foundry-X 적용 시사점](#5-foundry-x-적용-시사점)

---

## 1. Anthropic Agent SDK 기반 Test Agent

### 1.1 SDK 현황

**Claude Agent SDK** (구 Claude Code SDK)는 Python과 TypeScript 양쪽에서 사용 가능한 프로덕션급 에이전트 빌드 SDK예요.

| 항목 | 상세 |
|------|------|
| **Python 패키지** | `pip install claude-agent-sdk` |
| **TypeScript 패키지** | `npm install @anthropic-ai/claude-agent-sdk` |
| **인증** | Anthropic API Key 직접 / Bedrock / Vertex AI / Azure Foundry |
| **핵심 API** | `query()` — 비동기 스트림, 프롬프트 + 옵션으로 에이전트 실행 |
| **리포** | [claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python), [claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) |

**핵심 차이점 (Client SDK vs Agent SDK):**
- Client SDK: 개발자가 tool loop를 직접 구현해야 함
- Agent SDK: Claude가 자율적으로 tool을 실행 — `query(prompt)` 한 줄로 에이전트 가동

### 1.2 주요 기능

| 기능 | 설명 |
|------|------|
| **Built-in Tools** | Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion |
| **Hooks** | PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd 등 — 콜백 함수로 에이전트 행위 제어 |
| **Subagents** | `Agent` 도구로 전문화된 하위 에이전트 스폰 — 병렬 처리 + 격리된 컨텍스트 |
| **MCP** | Model Context Protocol 서버 연결 — Playwright, DB, 브라우저 등 외부 시스템 통합 |
| **Permissions** | `allowed_tools`로 에이전트 권한 세밀 제어 (읽기 전용 에이전트 등) |
| **Sessions** | 세션 유지/재개 — 멀티턴 작업에서 컨텍스트 보존 |
| **Skills/Commands** | `.claude/skills/`, `.claude/commands/` — Claude Code와 동일한 파일 기반 확장 |

### 1.3 Test Agent 구축 가능성

Agent SDK의 tool_use 기능으로 테스트 코드 자동 생성/실행이 **충분히 가능**해요.

**구현 패턴:**

```python
# 예시: Test Agent 구성
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async for message in query(
    prompt="src/services/auth.ts에 대한 단위 테스트를 작성하고 실행해줘",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent"],
        agents={
            "test-writer": AgentDefinition(
                description="테스트 코드 전문 작성 에이전트",
                prompt="기존 테스트 패턴을 분석하고 누락된 테스트를 작성",
                tools=["Read", "Write", "Edit", "Glob", "Grep"],
            ),
            "test-runner": AgentDefinition(
                description="테스트 실행 및 결과 분석 에이전트",
                prompt="테스트를 실행하고 실패 원인을 분석하여 수정",
                tools=["Read", "Edit", "Bash"],
            ),
        },
    ),
):
    print(message)
```

**실증 사례:**

1. **OpenObserve — Council of Sub Agents** (8개 에이전트 파이프라인)
   - Analyst → Architect → Engineer → Sentinel → Healer → Scribe → Inspector
   - 결과: 테스트 380개 → 700+개 (84% 증가), 분석 시간 45~60분 → 5~10분
   - Flaky 테스트 30~35개 → 4~5개 (85% 감소)
   - [출처](https://openobserve.ai/blog/autonomous-qa-testing-ai-agents-claude-code/)

2. **Test Coverage 자동화 사례** (30% → 50% 1주일 만에)
   - TypeScript Test Specialist 에이전트 + Test Quality Reviewer 에이전트 2개 운용
   - `.claude/agents/` 디렉토리에 마크다운으로 정의
   - CLAUDE.md에 테스트 규칙/커버리지 기준 설정
   - [출처](https://dev.to/melnikkk/how-we-use-claude-agents-to-automate-test-coverage-3bfa)

3. **Intent-Driven E2E Testing** (Python + Claude tool-use API)
   - YAML 테스트 스펙 → 헤드리스 브라우저 → Claude가 자율 탐색 → 구조화된 보고서
   - [출처](https://www.devassure.io/blog/how-to-build-a-testing-agent-with-claude/)

### 1.4 공식 데모 리포

- [claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos) — Email assistant, research agent 등 다수 예제
- 테스트 전용 데모는 아직 없으나, built-in tools (Read + Edit + Bash)로 테스트 작성/실행/수정 사이클 구현 가능

---

## 2. Anthropic Code Review Agent

### 2.1 Claude Code `/review` — Managed Code Review (Research Preview)

2026-03-09 출시된 **관리형 PR 리뷰 서비스**예요.

| 항목 | 상세 |
|------|------|
| **구조** | 복수 전문 에이전트가 병렬로 diff + 전체 코드베이스 분석 |
| **검증** | 후보 이슈를 실제 코드 동작과 대조해 false positive 필터링 |
| **결과** | 심각도별 인라인 코멘트 (Normal / Nit / Pre-existing) |
| **소요** | 평균 20분, $15~$25/리뷰 |
| **대상** | Teams / Enterprise 구독 (Research Preview) |
| **트리거** | PR 생성 시 / 매 push / 수동 (`@claude review`) |
| **커스텀** | `CLAUDE.md` + `REVIEW.md`로 리뷰 기준 조정 |
| **내부 성과** | PR의 54%에 실질적 코멘트 (이전 16% → 54%) |
| **문서** | [Code Review Docs](https://code.claude.com/docs/en/code-review) |

**핵심 특징:**
- 승인/차단을 하지 않으므로 기존 리뷰 워크플로우와 충돌 없음
- 확장 가능한 reasoning 섹션으로 "왜 문제인지" 설명
- `REVIEW.md`로 팀 스타일 가이드, 스킵 규칙, 필수 체크 항목 정의 가능

### 2.2 claude-code-action (GitHub Actions)

범용 Claude Code GitHub Actions 통합이에요.

| 항목 | 상세 |
|------|------|
| **리포** | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) |
| **버전** | v1.0 (2025-08-26) |
| **Stars** | 6.6K+ |
| **기능** | 코드 리뷰, 질문 응답, 코드 구현, 이슈 분류, 문서 동기화 |
| **트리거** | `@claude` 멘션, 이슈 할당, PR 이벤트 |
| **인증** | Anthropic Direct / Bedrock / Vertex AI / Azure Foundry |

**활용 패턴:**
- PR에서 `@claude` 멘션 → 자동 코드 리뷰
- 이슈에 Claude 할당 → 자동 구현 + PR 생성
- 경로별 트리거 (보안 파일 변경 시 집중 리뷰)
- 커스텀 체크리스트 강제
- 스케줄 기반 리포 건강 점검 (cron)

**설정 예시:**
```yaml
name: Claude Code Review
on: [pull_request, issue_comment]
jobs:
  claude:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: "Review this PR for code quality and suggest improvements"
```

### 2.3 claude-code-security-review (보안 특화)

| 항목 | 상세 |
|------|------|
| **리포** | [anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review) |
| **탐지 범위** | Injection, 인증/인가, 데이터 노출, 암호화, 비즈니스 로직, XSS 등 20+ 카테고리 |
| **모델** | claude-opus-4-1 (기본) |
| **타임아웃** | 20분 (기본) |
| **FP 필터** | DoS, 레이트리밋 등 노이즈 자동 제외 |
| **라이선스** | MIT |

### 2.4 요약 비교

| 방식 | 인프라 | 비용 | 커스텀 | 용도 |
|------|--------|------|--------|------|
| **Managed Code Review** | Anthropic 호스팅 | $15~25/리뷰 | CLAUDE.md + REVIEW.md | 정교한 멀티에이전트 리뷰 |
| **claude-code-action** | 자체 GitHub Runner | API 사용량 기반 | prompt + claude_args | 범용 PR/이슈 자동화 |
| **security-review** | 자체 GitHub Runner | API 사용량 기반 | 커스텀 스캔 규칙 | 보안 특화 리뷰 |

---

## 3. 외부 Test Agent 벤치마크

### 3.1 Cursor Agent

| 항목 | 상세 |
|------|------|
| **사용자** | 1M+ (360K 유료) |
| **아키텍처** | VS Code fork + AI-native Agent Mode (Cursor 2.0) |
| **테스트 생성** | Agent Mode에서 "write tests for X" → 멀티파일 자동 생성 + 실행 + 검증 |
| **TDD 지원** | 공식 가이드 제공: "TDD 중이라고 명시 → 테스트 먼저 → 실패 확인 → 구현" |
| **2026 신기능** | Cloud Agent (격리 VM에서 앱 실행 + 자체 테스트), Automation 템플릿 |
| **Composer** | 구현+테스트 병렬 생성 가능 (Simultaneous Construction) |
| **문서** | [Cursor Test Generation](https://cursor.com/for/test-generation) |

### 3.2 OpenAI Codex CLI

| 항목 | 상세 |
|------|------|
| **최신 모델** | GPT-5.2-Codex (2025 하반기~) |
| **속도** | 240+ tokens/sec, Terminal-Bench 77.3% |
| **테스트 생성** | 함수 시맨틱 분석 → 프로젝트 컨벤션 기반 테스트 자동 생성 |
| **CI 통합** | Codex Autofix — CI에서 자동 테스트/수정 |
| **CLI** | 오픈소스, `codex exec` 명령으로 스크립팅 가능 |
| **문서** | [Codex CLI](https://developers.openai.com/codex/cli) |

### 3.3 Cline

| 항목 | 상세 |
|------|------|
| **설치** | VS Code 5M+ installs (오픈소스 1위) |
| **모델** | BYOM (Bring Your Own Model) — 모든 LLM 지원 |
| **테스트** | Plan/Act 이중 모드 — 테스트 계획 → 실행 분리 가능 |
| **MCP** | MCP 통합으로 Playwright 등 외부 테스트 도구 연결 |
| **강점** | 시각적 피드백, 초보자 친화적, 투명한 작업 과정 |

### 3.4 Aider

| 항목 | 상세 |
|------|------|
| **Stars** | 39K GitHub |
| **처리량** | 15B tokens/week |
| **SWE-bench** | 49.2% (Verified, 2026-03 기준) |
| **테스트** | `--test-cmd` 옵션으로 테스트 명령어 지정 → 코드 변경 후 자동 실행 |
| **Git 통합** | 자동 커밋 + 테스트 결과 기반 롤백 |
| **diff 포맷** | 편집 에러 30% 감소 (2026 벤치마크) |
| **강점** | 터미널 기반, 100+ 언어, 비용 효율적 |

### 3.5 SWE-bench / SWE-agent

**SWE-bench Verified** — AI 코딩 에이전트의 표준 벤치마크

| 순위 | 에이전트 | 해결률 | 비용/인스턴스 |
|------|----------|--------|-------------|
| 1 | Claude 4.5 Opus (high reasoning) | 76.8% | $376.95 |
| 2 | Gemini 3 Flash (high reasoning) | 75.8% | $177.98 |
| 3 | MiniMax M2.5 (high reasoning) | ~75% | $36.64 |

**주요 관찰:**
- Claude Code (에이전트 스캐폴딩 포함): SWE-bench Verified **80.8%** (별도 측정)
- 에이전트 스캐폴딩이 기저 모델만큼 중요 — 동일 모델 + 다른 프레임워크에서 17포인트 차이
- SWE-bench++: 11개 언어, 3,971 리포, 11,133 인스턴스로 확장
- 2026-02 대규모 스캐폴딩 업그레이드 수행

---

## 4. TDD with AI Agent 전략

### 4.1 Superpowers 프레임워크 (99K+ Stars)

2026-01 출시 후 3개월 만에 **99,200+ GitHub stars**를 달성한 TDD 강제 프레임워크예요.

**7단계 워크플로우:**
1. **Brainstorm** — 구조화된 대화로 요구사항 정리
2. **Spec** — 요구사항 공식화
3. **Plan** — 2~5분 단위 작업으로 분해 (정확한 파일 경로 포함)
4. **TDD** — Red-Green-Refactor 사이클 (테스트 없이 작성된 코드는 삭제)
5. **Subagent Development** — 태스크별 새 에이전트로 컨텍스트 drift 방지
6. **Review** — 코드 품질 + 스펙 준수 검증
7. **Finalize** — 프로덕션 준비 완료

**핵심 특징:**
- 테스트 전에 작성된 코드를 **자동 삭제** — TDD 비타협적 강제
- Git worktree 관리로 격리된 개발 브랜치
- 태스크당 새로운 subagent로 컨텍스트 오염 방지
- Claude Code, Cursor, Codex, OpenCode, Gemini CLI 지원
- 설치: `/plugin install superpowers@claude-plugins-official` (30초)

### 4.2 Custom TDD Skill (Red-Green-Refactor 자동화)

[alexop.dev 사례](https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/)에서 검증된 패턴이에요.

**아키텍처:**
```
.claude/skills/tdd-integration/
├── skill.md          # 오케스트레이터 (페이즈 게이팅)
├── agents/
│   ├── test-writer   # RED: 실패하는 테스트 작성
│   ├── implementer   # GREEN: 최소 구현
│   └── refactorer    # REFACTOR: 품질 개선
```

**컨텍스트 오염 방지:**
- 각 에이전트가 격리된 컨텍스트에서 작동
- 테스트 작성 결정이 구현 세부사항을 오염시키지 않음
- `UserPromptSubmit` hook으로 스킬 자동 활성화 (~84% 성공률)

**실측 결과:**
- 초기 설정 약 2시간, 이후 수동 개입 없이 자동 운용
- 기능 구현 시 테스트-먼저 패턴이 자연스럽게 강제됨

### 4.3 Council of Sub Agents 패턴 (8 에이전트)

OpenObserve 팀이 검증한 프로덕션 패턴이에요.

**파이프라인:**
```
Orchestrator → Analyst → Architect → Engineer → Sentinel → Healer → Scribe → Inspector
    (관리)    (분석)    (설계)    (구현)     (감사)    (수정)   (문서)   (리뷰)
```

**정량적 성과:**

| 지표 | Before | After | 개선 |
|------|--------|-------|------|
| 기능 분석 시간 | 45~60분 | 5~10분 | 6~10x |
| Flaky 테스트 | 30~35개 | 4~5개 | 85% 감소 |
| 테스트 커버리지 | 380개 | 700+개 | 84% 증가 |
| 첫 테스트까지 | ~1시간 | 5분 | 92% 단축 |

### 4.4 실용적 TDD 전략 (Sprint 적용)

**Strategy A: CLAUDE.md 기반 TDD 규칙 주입**
```markdown
## Testing Rules
- 모든 새 기능은 테스트 먼저 작성
- 테스트 없이 구현된 코드는 리뷰에서 거부
- 커버리지 임계: 신규 코드 80%+
```
→ 가장 간단하지만 강제력 약함 (에이전트가 무시 가능)

**Strategy B: PostToolUse Hook으로 테스트 강제**
```bash
# 새 .ts 파일 Write 시 → 대응 .test.ts 존재 여부 확인
if [[ "$TOOL" == "Write" && "$FILE" == *.ts && "$FILE" != *.test.ts ]]; then
  TEST_FILE="${FILE%.ts}.test.ts"
  if [[ ! -f "$TEST_FILE" ]]; then
    echo "BLOCK: 테스트 파일 먼저 작성 필요: $TEST_FILE"
    exit 1
  fi
fi
```
→ 중간 강제력, hook 우회 가능성 있음

**Strategy C: Subagent 분리 (권장)**
- Test Writer 에이전트 (읽기+쓰기 권한)
- Implementer 에이전트 (읽기+쓰기 권한, 테스트 파일 수정 불가)
- Reviewer 에이전트 (읽기 전용)
→ 가장 강한 강제력, Agent SDK로 프로그래밍 가능

**Strategy D: Superpowers 플러그인 (최소 설정)**
- 30초 설치, 즉시 사용 가능
- 테스트 없는 코드 자동 삭제
→ 빠른 도입에 적합, 커스터마이징 제한적

---

## 5. Foundry-X 적용 시사점

### 5.1 Code Review 도입 옵션

| 옵션 | 비용 | 난이도 | 효과 | 적합성 |
|------|------|--------|------|--------|
| **Managed Code Review** | $15~25/PR | 낮음 (설정만) | 높음 | Teams/Enterprise 필요 |
| **claude-code-action** | API 비용만 | 중간 | 중~높 | 자체 Runner 사용 시 |
| **security-review** | API 비용만 | 낮음 | 중 (보안만) | 보안 특화 |

**권장:** `claude-code-action` + `REVIEW.md` 조합이 Foundry-X에 가장 적합해요.
- 자체 GitHub Runner에서 실행 가능
- `REVIEW.md`로 Foundry-X 고유 규칙 정의 (SDD Triangle 준수, D1 마이그레이션 체크 등)
- 비용 예측 가능

### 5.2 Test Agent 도입 전략

**단기 (Sprint 72~):** CLAUDE.md 규칙 강화 + `.claude/agents/` 테스트 전문 에이전트 정의
- 기존 `packages/api/` 테스트 패턴을 학습하는 Test Specialist 에이전트
- Test Quality Reviewer 에이전트 (실행 + 커버리지 확인)

**중기:** Agent SDK 기반 CI 파이프라인 테스트 자동화
- PR 생성 시 → Agent SDK로 변경 파일 분석 → 누락 테스트 자동 생성 → PR에 커밋
- PostToolUse hook으로 테스트 없는 코드 차단

**장기:** Council 패턴 적용
- Analyst(영향 분석) → Architect(테스트 설계) → Engineer(테스트 작성) → Healer(실행+수정)
- Sprint worktree와 통합하여 격리된 환경에서 운용

### 5.3 핵심 권고사항

1. **Agent SDK 도입 우선순위 높음** — Python/TypeScript 양쪽 지원, Foundry-X 모노리포에 자연스럽게 통합 가능
2. **Subagent 분리가 핵심** — 테스트 작성자와 구현자를 분리해야 진정한 TDD 강제 가능
3. **REVIEW.md 즉시 도입 가능** — `claude-code-action` 없이도 로컬 `/review`에서 활용
4. **벤치마크 참고**: Claude 4.5 Opus가 SWE-bench 76.8% (1위), 에이전트 스캐폴딩이 모델만큼 중요

---

## Sources

### Anthropic 공식
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Code Review Docs](https://code.claude.com/docs/en/code-review)
- [Code Review Blog](https://claude.com/blog/code-review)
- [claude-code-action](https://github.com/anthropics/claude-code-action)
- [claude-code-security-review](https://github.com/anthropics/claude-code-security-review)
- [claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python)
- [claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript)
- [claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos)

### 사례 & 튜토리얼
- [How we use Claude Agents to automate test coverage](https://dev.to/melnikkk/how-we-use-claude-agents-to-automate-test-coverage-3bfa)
- [How AI Agents Automated Our QA: 700+ Test Coverage](https://openobserve.ai/blog/autonomous-qa-testing-ai-agents-claude-code/)
- [Forcing Claude Code to TDD: Red-Green-Refactor Loop](https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/)
- [Superpowers TDD Framework Tutorial](https://byteiota.com/superpowers-tutorial-claude-code-tdd-framework-2026/)
- [Automated Test Case Generation with Claude Code and MCP](https://testcollab.com/blog/automated-test-case-generation-claude-code-mcp)
- [Write automated tests with Playwright Agents](https://shipyard.build/blog/playwright-agents-claude-code/)
- [Build an E2E Testing Agent with Claude](https://www.devassure.io/blog/how-to-build-a-testing-agent-with-claude/)

### 벤치마크 & 비교
- [SWE-bench Verified Leaderboard](https://www.swebench.com/)
- [Testing AI Coding Agents — Render Blog](https://render.com/blog/ai-coding-agents-benchmark)
- [Best AI Coding Agents 2026 — Faros AI](https://www.faros.ai/blog/best-ai-coding-agents-2026)
- [Cursor Test Generation Docs](https://cursor.com/for/test-generation)
- [OpenAI Codex CLI](https://developers.openai.com/codex/cli)
- [Cline vs Aider Comparison 2026](https://is4.ai/blog/our-blog-1/cline-vs-aider-comparison-2026-313)
