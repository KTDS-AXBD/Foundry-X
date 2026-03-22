# Agent Evolution PRD

**버전:** v1
**날짜:** 2026-03-22
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X의 에이전트 시스템을 멀티모델 라우팅 + 역할 기반 전문 에이전트 + 고급 워크플로우 패턴으로 진화시켜, 사람-AI 협업의 품질과 효율을 비약적으로 향상시킨다.

**배경:**
현재 Foundry-X는 Claude Haiku 단일 모델에 PlannerAgent + ReviewerAgent 2개 역할만 운용 중이다. gstack(역할 기반 AI 팀), Anthropic 워크플로우 패턴(Evaluator-Optimizer), claude-code-router(멀티모델 라우팅), Fluid.sh(인프라 에이전트), OpenRouter(300+ 모델 게이트웨이) 등의 외부 리소스를 분석한 결과, Foundry-X의 기존 아키텍처(Runner 추상화, 동적 라우팅, DAG workflow-engine)가 이들을 흡수하기에 이미 잘 준비되어 있음을 확인했다.

**목표:**
- 태스크 특성에 맞는 최적 모델을 자동 선택하는 멀티모델 라우팅 도입
- 2개에서 5~8개로 전문 에이전트 역할 확장
- Evaluator-Optimizer 패턴 추가로 에이전트 출력 품질 향상
- 개발 과정에서 gstack 스킬 + claude-code-router를 즉시 활용

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

**단일 모델 한계:**
- ClaudeApiRunner가 `claude-haiku-4-5`만 사용 (PlannerAgent만 Sonnet)
- 복잡한 아키텍처 분석에 Haiku는 역부족, 단순 리뷰에 Opus는 과비용
- 모델 선택이 코드에 하드코딩 — 유연성 없음

**역할 부족:**
- PlannerAgent: 계획 수립 + 승인 대기
- ReviewerAgent: PR 리뷰 + SDD 점수
- 설계 검토, 보안 스캔, 테스트 생성, QA, 인프라 자동화 — 모두 수동

**워크플로우 패턴 제한:**
- Sequential + Parallel만 구현
- Evaluator-Optimizer 루프 없음 → 첫 시도 품질에 의존
- Sprint 단위 자동화 워크플로우 없음

### 2.2 목표 상태 (To-Be)

**멀티모델 라우팅:**
- OpenRouter 게이트웨이를 통해 300+ 모델 접근
- 태스크 복잡도/비용 기준으로 자동 모델 선택
- Fallback 체인 (Sonnet → Haiku 등)으로 안정성 확보

**역할 기반 에이전트 팀:**
- 5~8개 전문 역할 에이전트가 Sprint 워크플로우에 따라 협업
- 각 역할별 전용 시스템 프롬프트 + 도구 권한 + 모델 설정

**고급 워크플로우:**
- Evaluator-Optimizer: 코드 생성 → 리뷰 → 개선 자동 루프
- Sprint 워크플로우: Think→Plan→Build→Review→Test→Ship→Reflect

### 2.3 시급성

- Phase 4 Conditional Go 후 Phase 5에서 에이전트 오케스트레이션 고도화 예정
- gstack이 보여준 "하루 10,000~20,000줄" 생산성은 멀티 에이전트 + 멀티 모델의 실증
- OpenRouter 생태계가 급성장 중 — 조기 도입으로 선제적 모델 다양성 확보

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| 개발자 (내부 팀) | Foundry-X를 사용하여 프로젝트를 관리하는 개발자 | 에이전트가 코드 리뷰, 테스트 생성, 보안 스캔을 자동으로 수행 |
| AI 에이전트 오퍼레이터 | 에이전트 설정/모니터링을 담당하는 역할 | 모델별 비용/품질 트레이드오프 가시성, 에이전트 역할 커스터마이징 |
| Foundry-X 개발팀 (자체) | 플랫폼 자체를 개발하는 팀 | gstack 스킬/router로 개발 생산성 향상 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| AX BD팀 리더 | 기술 방향 결정 | 높음 |
| KT DS 내부 사용자 | 온보딩 대상 | 중간 |

### 3.3 사용 환경
- 기기: PC (웹 대시보드 + CLI)
- 네트워크: 인터넷 (OpenRouter API 호출)
- 기술 수준: 개발자

---

## 4. 기능 범위

### Track A: 플랫폼 기능 (Phase 5+)

#### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| A1 | **OpenRouter 게이트웨이 통합** | OpenRouterRunner 구현. 단일 API 키로 300+ 모델 접근. 기존 Runner 추상화에 새 구현체 추가 | P0 |
| A2 | **태스크별 모델 라우팅** | task_type(code-review, spec-analysis 등)별 최적 모델 자동 선택. DB 기반 라우팅 규칙 테이블 | P0 |
| A3 | **Evaluator-Optimizer 패턴** | 생성 에이전트 → 평가 에이전트 → 피드백 반영 루프. 최대 반복 횟수 + 품질 임계값 설정 | P0 |
| A4 | **ArchitectAgent** | 설계 문서 검토, 아키텍처 판단, 의존성 분석. Sonnet/Opus급 모델 사용 | P0 |
| A5 | **TestAgent** | 변경 코드 기반 테스트 자동 생성 + 커버리지 분석. Haiku/Sonnet 혼합 | P0 |

#### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| A6 | **SecurityAgent** | OWASP Top 10 기반 보안 취약점 스캔. PR diff 분석 + 정적 분석 연동 | P1 |
| A7 | **QAAgent (브라우저 테스트)** | gstack /qa 패턴. 실제 Chromium/Playwright로 UI 테스트 실행 | P1 |
| A8 | **Sprint 워크플로우 템플릿** | Think→Plan→Build→Review→Test→Ship→Reflect를 workflow-engine DAG로 사전 정의 | P1 |
| A9 | **모델 비용/품질 대시보드** | 에이전트별 토큰 사용량, 비용, 품질 점수 시각화 (Web Dashboard) | P1 |
| A10 | **Fallback 체인** | 모델 응답 실패 시 자동 대체 모델 전환 (예: Sonnet 실패 → Haiku) | P1 |

#### 4.3 장기 기능 (Nice to Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| A11 | **InfraAgent** | Fluid 패턴 — 샌드박스 환경에서 인프라 변경 시뮬레이션 + IaC 출력 | P2 |
| A12 | **에이전트 역할 커스터마이징** | 사용자가 직접 에이전트 역할(시스템 프롬프트, 도구 권한, 모델)을 정의 | P2 |
| A13 | **크로스 모델 리뷰** | gstack /codex 패턴 — 같은 코드를 여러 모델이 리뷰하고 결과 병합 | P2 |
| A14 | **에이전트 자기 평가** | 에이전트가 자신의 출력을 평가하고 개선하는 자기 반성 루프 | P2 |

### Track B: 개발 도구 도입 (즉시 가능)

| # | 도구 | 설명 | 우선순위 |
|---|------|------|----------|
| B1 | **gstack 스킬 설치** | `/review`, `/qa`, `/ship` 등 유용한 gstack 스킬을 Foundry-X 개발에 도입 | P0 |
| B2 | **claude-code-router 설정** | 로컬 프록시로 Claude Code의 멀티모델 라우팅 활성화. thinking=Sonnet, default=Haiku 등 | P1 |
| B3 | **OpenRouter API 키 발급** | 개발/테스트용 OpenRouter 계정 + API 키 발급 | P0 |

### 4.4 제외 범위 (Out of Scope)

- **자체 LLM 호스팅**: 모든 LLM은 외부 API (OpenRouter/Anthropic)를 통해 접근
- **GUI 기반 에이전트 빌더**: 에이전트 역할은 코드/설정으로 정의 (노코드 빌더는 별도 검토)
- **실시간 음성/비디오 에이전트**: 텍스트 기반 에이전트에 집중
- **프로바이더별 개별 API 키 관리**: OpenRouter 단일 키 전략

### 4.5 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| OpenRouter API | REST API (OpenAI 호환 포맷) | 필수 |
| Anthropic API | 기존 유지 (Fallback) | 필수 |
| Playwright/Chromium | QAAgent 실행 시 | 선택 (A7) |
| GitHub API | 기존 PR 파이프라인 유지 | 필수 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 에이전트 역할 수 | 2 (Planner, Reviewer) | 5+ | agent_sessions.agent_name 고유값 |
| 지원 LLM 모델 수 | 1 (Haiku) | 5+ | model_routing_rules 테이블 행 수 |
| Evaluator 루프 적용 | 0 태스크 | code-review, code-generation | 루프 적용 태스크 비율 |
| 에이전트 비용 효율 | [미확인] | 모델별 비용 추적 가능 | 토큰 사용량 × 모델 단가 |
| 코드 리뷰 품질 | SDD 단일 점수 | SDD + 보안 + 아키텍처 | 다차원 점수 체계 |

### 5.2 MVP 최소 기준

- [ ] OpenRouterRunner가 기존 Runner 추상화에 통합되어 에이전트 태스크 실행 가능
- [ ] 최소 3개 모델(Haiku, Sonnet, GPT-4o)이 태스크별로 라우팅
- [ ] Evaluator-Optimizer 루프가 code-review 태스크에 적용
- [ ] TestAgent가 변경 파일 기반 테스트 생성 가능

### 5.3 실패/중단 조건

- OpenRouter API 안정성이 99% 미만으로 프로덕션 사용 불가
- 멀티모델 라우팅이 단일 모델 대비 비용 2배 이상 + 품질 향상 미미
- Phase 4 최종 판정에서 Kill 결정 시 전체 중단

---

## 6. 제약 조건

### 6.1 일정

- 목표 완료일: [미정 — Phase 4 최종 판정 후 결정]
- 개발 도구 도입 (Track B): 즉시 시작 가능
- 플랫폼 기능 (Track A): Phase 5 시작 시점에 따라 결정

### 6.2 기술 스택

- 프론트엔드: Next.js 14 + React 18 + Zustand (기존 유지)
- 백엔드: Hono + Cloudflare Workers (기존 유지)
- LLM: OpenRouter API (추가) + Anthropic API (기존 유지)
- 인프라: Cloudflare (Workers + D1 + Pages) 기존 유지
- 기존 시스템 의존: agent-orchestrator.ts, agent-runner.ts, workflow-engine.ts

### 6.3 인력/예산

- 투입 가능 인원: 1명 + AI 에이전트
- 예산: OpenRouter API 비용 (종량제, 모델별 상이)

### 6.4 컴플라이언스

- KT DS 내부 정책: 외부 API 사용 시 데이터 전송 범위 확인 필요
- 보안 요구사항: API 키 Cloudflare Secrets 저장, 코드/소스코드 전송 시 민감정보 마스킹
- 외부 규제: [미확인]

---

## 7. 기술 설계 가이드

> PRD 수준의 기술 방향. 상세 설계는 별도 Design 문서에서 다룬다.

### 7.1 OpenRouterRunner 구현

기존 `AgentRunner` 인터페이스를 구현하는 새 Runner:

```
interface AgentRunner {
  readonly type: AgentRunnerType;  // 'openrouter' 추가
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
  isAvailable(): Promise<boolean>;
  supportsTaskType(taskType: string): boolean;
}
```

**핵심 포인트:**
- OpenRouter는 OpenAI 호환 API 포맷 → 기존 요청 변환 최소화
- `model` 파라미터를 동적으로 주입 (라우팅 규칙 참조)
- 응답에서 `x-openrouter-*` 헤더로 실제 사용 모델/토큰/비용 추적

### 7.2 모델 라우팅 규칙

D1에 `model_routing_rules` 테이블 추가:

```
| task_type        | model_id              | priority | max_tokens | fallback_model_id    |
|------------------|-----------------------|----------|------------|----------------------|
| code-review      | anthropic/claude-haiku | 1        | 4096       | openai/gpt-4o-mini   |
| spec-analysis    | anthropic/claude-sonnet| 1        | 8192       | anthropic/claude-haiku|
| code-generation  | anthropic/claude-sonnet| 1        | 8192       | deepseek/deepseek-r1 |
| test-generation  | anthropic/claude-haiku | 1        | 4096       | null                 |
```

### 7.3 Evaluator-Optimizer 패턴

기존 Orchestrator에 `executeWithEvaluation()` 메서드 추가:

```
1. Generator 에이전트 실행 (model A)
2. Evaluator 에이전트 실행 (model B, 다른 모델 가능)
   → 품질 점수 + 피드백 생성
3. 품질 < 임계값 AND 반복 < 최대?
   → Generator에 피드백 전달 + 재실행 (go to 1)
4. 최종 결과 반환
```

### 7.4 에이전트 역할 레지스트리

`agent_roles` 테이블로 역할 관리:

```
| role_id      | name          | system_prompt_key | default_model        | tools_allowed        |
|-------------|---------------|-------------------|----------------------|----------------------|
| planner     | PlannerAgent  | planner_v1        | claude-sonnet        | file-read, spec-parse|
| reviewer    | ReviewerAgent | reviewer_v1       | claude-haiku         | diff-read, score     |
| architect   | ArchitectAgent| architect_v1      | claude-sonnet        | file-read, dep-graph |
| security    | SecurityAgent | security_v1       | claude-sonnet        | diff-read, vuln-scan |
| tester      | TestAgent     | tester_v1         | claude-haiku         | file-read, test-gen  |
```

---

## 8. 리소스 출처 및 영감

| # | 리소스 | 적용 포인트 | 참조 URL |
|---|--------|------------|----------|
| 1 | gstack | 역할 기반 에이전트 팀, Sprint 워크플로우, /qa, /codex | github.com/garrytan/gstack |
| 2 | Anthropic 패턴 | Evaluator-Optimizer 루프, 패턴 선택 기준 | claude.com/blog/common-workflow-patterns |
| 3 | claude-code-router | 태스크별 모델 라우팅, Transformer 패턴 | github.com/musistudio/claude-code-router |
| 4 | Fluid.sh | 인프라 에이전트 샌드박스 실행 (P2) | fluid.sh |
| 5 | awesome-openrouter | OpenRouter 생태계 참조, GitBug 패턴 | github.com/OpenRouterTeam/awesome-openrouter |
| 6 | openrouter-examples | OpenRouter API 통합 구현 참조 | github.com/OpenRouterTeam/openrouter-examples |

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | OpenRouter 요금 체계 상세 확인 + 예상 월 비용 산출 | [미정] | [미정] |
| 2 | KT DS 보안 정책상 외부 LLM API에 소스코드 전송 가능 여부 | [미정] | [미정] |
| 3 | Phase 4 최종 Go/Pivot/Kill 판정 결과에 따른 범위 조정 | Sinclair | 온보딩 4주 후 |
| 4 | gstack 라이선스(MIT) Foundry-X 통합 시 법적 확인 | [미정] | [미정] |
| 5 | Evaluator-Optimizer 루프의 비용 대비 품질 향상 실측 필요 | [미정] | Phase 5 Sprint 1 |
| 6 | Track B (개발 도구) 도입 시점 확정 | Sinclair | [미정] |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-03-22 | 6개 리소스 조사 + 인터뷰 기반 최초 작성 | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
