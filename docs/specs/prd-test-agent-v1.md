---
code: FX-SPEC-PRD-TA-V1
title: "Test Agent 활성화 + TDD 자동화 PRD"
version: "1.0"
status: Active
category: SPEC
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo
references:
  - "[[FX-ANLS-015]] AI Test/Review Agent 리서치 보고서"
  - "[[FX-SPEC-PRD-V8]] Foundry-X PRD v8 (플랫폼)"
---

# Test Agent 활성화 + TDD 자동화 PRD v1.0

> **한 줄 요약**: Foundry-X에 구현만 되어있는 6종 Agent 중 TestAgent(F139)를 실사용 가능한 상태로 활성화하고, Anthropic Agent SDK 기반 PoC와 TDD 자동화 Skill을 순차 도입하여 Sprint 작업의 테스트 품질을 구조적으로 강화한다.

---

## 1. 배경 및 문제 정의

### 1.1 현황

Foundry-X는 6종 역할 Agent를 보유하고 있지만, **PlannerAgent만 적극 활용** 중이에요.

| Agent | 엔드포인트 | 테스트 | Web 연동 | 실사용 |
|-------|:---------:|:------:|:--------:|:------:|
| PlannerAgent | 6개 | 26 | ✅ | ✅ 활용 중 |
| TestAgent (F139) | 2개 | 28 | ❌ | ⚠️ 미사용 |
| ArchitectAgent | 2개 | 20 | ❓ | ⚠️ 미사용 |
| InfraAgent | 3개 | 22 | ❌ | ⚠️ 미사용 |
| QAAgent | 2개 | 18 | ❌ | ⚠️ 미사용 |
| SecurityAgent | 2개 | 미확인 | ❌ | ❌ 미사용 |

**핵심 문제:**
- 5종 Agent가 API 엔드포인트+테스트는 완비되었지만, **Web UI 연동과 Orchestrator 통합이 미흡**
- Sprint 작업 후 테스트는 수동 작성 — AI Agent 기반 자동화 부재
- PRD 기획 → Sprint 구현 흐름에서 **테스트 품질 보증 체계가 없음**

### 1.2 기회

FX-ANLS-015 리서치에서 확인된 외부 생태계:
- **Anthropic Agent SDK**: GA 상태, `query()` 한 줄로 Test Writer/Reviewer subagent 구성 가능
- **OpenObserve 사례**: 8 Agent 파이프라인으로 테스트 380→700+개 (84% 증가)
- **Superpowers**: 99K+ stars, 테스트 없는 코드 자동 삭제 패턴
- **SWE-bench**: Claude 4.5 Opus 76.8% 1위, 에이전트 스캐폴딩이 모델만큼 중요

---

## 2. 목표 및 성공 지표

### 2.1 목표

| # | 목표 | 기한 |
|---|------|------|
| G1 | TestAgent(F139)를 Web UI에서 호출 가능한 상태로 활성화 | Sprint 72 |
| G2 | Agent SDK 기반 Test Agent PoC로 실제 테스트 파일 생성+실행 검증 | Sprint 73 |
| G3 | TDD 자동화 CC Skill로 Sprint 작업 시 Red→Green→Refactor 사이클 자동화 | Sprint 74 |

### 2.2 성공 지표

| KPI | 현재 | 목표 | 측정 방법 |
|-----|------|------|----------|
| TestAgent Web UI 호출 가능 | ❌ | ✅ | Agent Dashboard에서 테스트 생성 요청 가능 |
| Agent SDK PoC 테스트 자동 생성 | N/A | vitest 파일 1개 이상 자동 생성+통과 | PoC 실행 결과 |
| TDD Skill 사용률 | 0% | Sprint 작업 50%+ 에서 /tdd 사용 | CC 세션 로그 |
| Sprint 후 테스트 누락률 | 미측정 | < 10% | 커밋별 테스트 파일 동반 비율 |

### 2.3 Kill 조건

| 조건 | 판단 시점 | 대응 |
|------|----------|------|
| Agent SDK PoC에서 생성된 테스트가 수동 작성 대비 품질 현저히 낮음 | Sprint 73 완료 | F219를 Superpowers 플러그인 도입으로 전환 |
| TestAgent API 응답 시간 > 30초 | Sprint 72 완료 | 비동기 처리 + SSE 스트리밍으로 전환 |
| TDD Skill이 Sprint 워크플로우에서 오히려 생산성 저하 | Sprint 74 + 2주 | 강제 모드를 권고 모드로 변경 |

---

## 3. 스코프

### 3.1 In-Scope

#### Sprint 72 — F217: TestAgent 활성화

| 항목 | 설명 |
|------|------|
| **Agent Dashboard UI** | `/agents` 페이지에 TestAgent 카드 추가 — 소스 코드 입력 → 테스트 생성 요청 |
| **테스트 생성 UI** | TestAgent `/agents/test/generate` 호출 → 결과(vitest 코드) 표시 + 복사 버튼 |
| **커버리지 갭 UI** | TestAgent `/agents/test/coverage-gaps` 호출 → 미커버 함수/엣지케이스 목록 표시 |
| **Orchestrator 통합** | `agent-orchestrator.ts`의 setter 실제 활용 — TestAgent를 오케스트레이션 흐름에 연결 |
| **Sprint 워크플로우 트리거** | Sprint 작업 커밋 시 TestAgent API를 자동 트리거하여 커버리지 갭 리포트 생성 (선택적) |

#### Sprint 73 — F218: Agent SDK Test Agent PoC

| 항목 | 설명 |
|------|------|
| **PoC 스크립트** | `tools/test-agent-poc/` 디렉토리에 TypeScript Agent SDK 기반 Test Agent 구현 |
| **Subagent 구성** | Test Writer (읽기+쓰기) + Test Runner (읽기+Bash) + Test Reviewer (읽기 전용) |
| **비교 평가** | 동일 소스 파일에 대해 (1) 기존 TestAgent(F139) vs (2) Agent SDK Test Agent 품질 비교 |
| **평가 기준** | 테스트 수, 엣지케이스 커버리지, 실행 성공률, 생성 시간, 비용 |
| **결과 보고서** | PoC 결과를 FX-ANLS 문서로 작성 — 본격 도입 여부 판단 근거 |

#### Sprint 74 — F219: TDD 자동화 CC Skill

| 항목 | 설명 |
|------|------|
| **CC Skill 구현** | `.claude/skills/tdd/` — Red→Green→Refactor 3단계 오케스트레이터 |
| **Red 단계** | 요구사항 분석 → 실패하는 테스트 작성 → `pnpm test` 실패 확인 |
| **Green 단계** | 테스트를 통과하는 최소 구현 작성 → `pnpm test` 성공 확인 |
| **Refactor 단계** | 코드 품질 개선 (DRY, 타입 안전성) → 테스트 재실행 → 여전히 통과 확인 |
| **Sprint 통합** | `/tdd {파일}` 명령으로 호출, Sprint worktree에서 사용 가능 |
| **PostToolUse Hook** | `.ts` 파일 Write 시 대응 `.test.ts` 존재 여부 경고 (차단 아닌 경고) |

### 3.2 Out-of-Scope

| 항목 | 이유 | 향후 계획 |
|------|------|----------|
| 나머지 4종 Agent 활성화 (Architect/Security/QA/Infra) | TestAgent 우선 검증 후 패턴 적용 | Phase 5g |
| Managed Code Review 도입 ($15~25/PR) | 비용 부담, 자체 Runner 우선 | Teams 구독 후 검토 |
| E2E 테스트 자동화 (Playwright Agent) | QAAgent 활성화와 별도 | F141 활성화 시 |
| CI/CD 파이프라인 Test Agent 통합 | Sprint 74 이후 PoC 결과 기반 | Phase 5g |

---

## 4. 기술 설계 방향

### 4.1 F217 — TestAgent Web UI 연동

```
[Agent Dashboard] ──────────────────────────────────────
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ PlannerAgent│  │ TestAgent   │  │ 기타 Agent   │  │
│  │ (기존 활용)  │  │ (신규 활성화)│  │ (비활성)     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┘  │
│         │                │                             │
│         ▼                ▼                             │
│  POST /agents/plans  POST /agents/test/generate       │
│                      POST /agents/test/coverage-gaps   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Web 컴포넌트 구조:**
- `packages/web/src/app/(app)/agents/page.tsx` — Agent Dashboard (기존)
- `packages/web/src/components/feature/TestAgentPanel.tsx` — 신규
  - 소스 코드 입력 영역 (Monaco Editor 또는 textarea)
  - "테스트 생성" 버튼 → `/agents/test/generate` POST
  - 생성된 테스트 코드 표시 + "복사" + "다운로드"
  - "커버리지 갭 분석" 탭 → `/agents/test/coverage-gaps` POST
  - 미커버 함수 목록 + 엣지케이스 추천

**Orchestrator 연결:**
```typescript
// agent-orchestrator.ts — 현재: setter만 정의
// 변경: executeTestGeneration() 메서드 추가
async executeTestGeneration(sourceCode: string, projectId: string) {
  const testAgent = this.getTestAgent();
  const result = await testAgent.generateTests(sourceCode);
  // SSE로 결과 스트리밍
  this.sse.emit('agent:test:result', { projectId, result });
  return result;
}
```

### 4.2 F218 — Agent SDK PoC 아키텍처

```
tools/test-agent-poc/
├── src/
│   ├── index.ts           # 진입점 — Agent SDK query() 호출
│   ├── agents/
│   │   ├── test-writer.md  # Subagent: 테스트 코드 작성 전문
│   │   ├── test-runner.md  # Subagent: 테스트 실행 + 결과 분석
│   │   └── test-reviewer.md # Subagent: 품질 리뷰 (읽기 전용)
│   └── compare.ts         # F139 TestAgent vs Agent SDK 비교 스크립트
├── package.json           # @anthropic-ai/claude-agent-sdk 의존성
└── README.md              # PoC 실행 가이드
```

**비교 평가 매트릭스:**

| 항목 | F139 TestAgent (LLM 프롬프트) | Agent SDK Test Agent (도구 실행) |
|------|----------------------------|-------------------------------|
| 테스트 생성 | API 요청 → JSON 응답 파싱 | query() → 파일 직접 생성 |
| 테스트 실행 | 불가 (코드만 반환) | Bash 도구로 `pnpm test` 실행 |
| 자동 수정 | 불가 | Edit 도구로 실패 테스트 수정 |
| 비용 | Anthropic API 1회 호출 | Agent SDK 세션 (다수 호출) |
| 통합 난이도 | 기존 API 활용 (낮음) | 별도 프로세스 (중간) |

### 4.3 F219 — TDD CC Skill 설계

```
.claude/skills/tdd/
├── SKILL.md              # 스킬 메타데이터 + 오케스트레이터 프롬프트
├── refs/
│   ├── red-phase.md      # RED: 테스트 먼저 작성 규칙
│   ├── green-phase.md    # GREEN: 최소 구현 규칙
│   └── refactor-phase.md # REFACTOR: 품질 개선 규칙
└── examples/
    └── service-tdd.md    # 서비스 파일 TDD 예시
```

**SKILL.md 핵심 흐름:**
```
/tdd {파일경로}

1. RED 단계:
   - 파일 분석 → 공개 함수/메서드 목록 추출
   - 각 함수에 대해 실패하는 테스트 작성
   - `pnpm test -- --grep {파일}` 실행 → 실패 확인
   - 실패하지 않으면 → 테스트가 충분히 엄격하지 않음 → 재작성

2. GREEN 단계:
   - 테스트를 통과하는 최소 구현 작성
   - `pnpm test` 실행 → 전체 통과 확인
   - 기존 테스트 깨뜨리지 않았는지 확인

3. REFACTOR 단계:
   - DRY 원칙, 타입 안전성, 에러 핸들링 개선
   - `pnpm test` 재실행 → 여전히 전체 통과
   - typecheck + lint 통과 확인
```

---

## 5. 구현 로드맵

```
Sprint 71 (F215)  Sprint 72 (F217)  Sprint 73 (F218)  Sprint 74 (F219)
    │                 │                  │                  │
    ▼                 ▼                  ▼                  ▼
 팀 가이드        TestAgent         Agent SDK PoC      TDD CC Skill
                  활성화
 ┌─────────┐    ┌──────────┐      ┌──────────┐      ┌──────────┐
 │ Getting  │    │ Web UI   │      │ Subagent │      │ /tdd 명령 │
 │ Started  │    │ Agent    │      │ 3종 구성  │      │ R-G-R    │
 │ 확장     │    │ Dashboard│      │ 비교평가  │      │ 자동화    │
 │ F212+   │    │ Orch통합  │      │ 결과보고  │      │ Hook     │
 └─────────┘    └──────────┘      └──────────┘      └──────────┘
                     │                  │                  │
                     ▼                  ▼                  ▼
                  Go/Kill           Go/Kill           Phase 5g
                  F218 판단         F219 판단         전체 Agent
                                                     활성화 판단
```

### 의존성

| Sprint | 선행 조건 | 비고 |
|--------|----------|------|
| 72 (F217) | F139 TestAgent 코드 존재 ✅ | 추가 구현만 필요 |
| 73 (F218) | Agent SDK npm 설치 가능 | `@anthropic-ai/claude-agent-sdk` |
| 74 (F219) | F218 PoC 결과 | PoC 결과에 따라 Strategy C(Subagent) 또는 D(Superpowers) 선택 |

---

## 6. 리스크 및 완화 방안

| ID | 리스크 | 영향 | 확률 | 완화 |
|----|--------|------|------|------|
| R1 | TestAgent LLM 응답이 vitest 호환 코드가 아닌 경우 | 중 | 중 | 프롬프트에 vitest 패턴 예시 주입 + Zod 파싱 검증 |
| R2 | Agent SDK PoC 비용이 예상 초과 | 중 | 낮 | PoC 범위를 1~2개 서비스 파일로 제한 |
| R3 | TDD Skill이 Sprint 속도를 저하 | 높 | 중 | 강제 모드 대신 권고 모드 기본값, 점진적 강화 |
| R4 | CI typecheck 기존 에러와 충돌 | 낮 | 높 | Sprint 72에서 기존 typecheck 에러 선수정 |

---

## 7. 비기능 요구사항

| 항목 | 요구 |
|------|------|
| **응답 시간** | TestAgent API 응답 < 15초 (1000줄 소스 기준) |
| **비용** | Agent SDK PoC 1회 실행 < $5 |
| **호환성** | vitest 3.x + TypeScript 5.x |
| **보안** | Agent SDK API Key는 환경변수, 코드에 하드코딩 금지 |

---

## 8. 참고 자료

- [[FX-ANLS-015]] AI Test/Review Agent 리서치 보고서
- [[FX-SPEC-PRD-V8]] Foundry-X PRD v8 (Agent Evolution 정의)
- F139 TestAgent 구현: `packages/api/src/services/test-agent.ts` (260줄)
- F141 QAAgent 구현: `packages/api/src/services/qa-agent.ts` (271줄)
- Agent SDK 공식 문서: https://platform.claude.com/docs/en/agent-sdk/overview
- Superpowers TDD Framework: https://github.com/superpowers-ai/superpowers
- OpenObserve Council 패턴: https://openobserve.ai/blog/autonomous-qa-testing-ai-agents-claude-code/
