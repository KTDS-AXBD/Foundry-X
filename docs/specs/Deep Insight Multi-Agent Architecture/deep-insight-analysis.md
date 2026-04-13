# AWS Deep Insight 분석 — Multi-Agent 아키텍처 & Context Engineering

> 분석일: 2026-04-13 | 분석자: Sinclair | 목적: Foundry-X Phase 34~36 멀티에이전트 로드맵 참조

---

## 1. 프로젝트 개요

**Deep Insight**는 AWS Korea SA Team이 개발한 프로덕션급 Multi-Agent 프레임워크로, "수주일 걸리던 수동 리포팅 작업을 분 단위로 전환"하는 것을 목표로 한다. Strands Agents SDK + Amazon Bedrock 기반이며, MIT 라이선스로 오픈소스 공개되었다.

- **GitHub**: [aws-samples/sample-deep-insight](https://github.com/aws-samples/sample-deep-insight)
- **블로그 시리즈** (3부작):
  - Part 1: [프로덕션 Multi-Agent 시스템이 해결해야 할 5가지 문제](https://aws.amazon.com/ko/blogs/tech/practical-design-lessons-from-the-deep-insight-arch/)
  - Part 2: Context Window 한계를 넘어서 – Context Engineering 실전 기법 (게시됨, techblogposts.com에서 확인)
  - Part 3: 개발에서 운영까지 – 에이전트를 AWS에 안전하게 배포하는 방법 (예정)
- **검증 사례**: LG전자 ChatInsight (분석 3일→30분, 288x 생산성 향상), re:Invent 2025 TechRecon
- **팀**: Yoonseo Kim, Jiyun Park, Younghwa Kwak, Jesam Kim, Kyutae Park, Dongjin Jang (Ph.D.)

---

## 2. Part 1 — 프로덕션 Multi-Agent 시스템의 5가지 문제

### 핵심 메시지

> "좋은 프롬프트만으로는 부족하다. 에이전트가 어떻게 협업하고, 어떻게 사고하며, 어디서 코드를 안전하게 실행하고, 어떻게 운영 상태를 모니터링할 것인지에 대한 올바른 기술 스택과 인프라가 필요하다."

### 5가지 문제 × 솔루션 매핑

| # | 문제 영역 | 핵심 과제 | 솔루션 | AWS 서비스 |
|---|----------|----------|--------|-----------|
| 1 | **실행 흐름 제어** | 8개 에이전트의 순서/분기/루프를 안정적으로 관리 | Strands SDK **Graph** + **Agents-as-Tools** 패턴 | Strands Agents SDK |
| 2 | **역할별 모델 배치** | 비용-품질 최적화, 에이전트마다 다른 모델 필요 | Haiku(라우팅) / Opus(계획) / Sonnet(실행) 혼합 | Amazon Bedrock |
| 3 | **프로덕션 배포** | 관리형 런타임, 세션 격리, VPC 보안 | AgentCore 관리형 런타임 | Bedrock AgentCore |
| 4 | **코드 안전 실행** | 에이전트가 생성한 코드의 샌드박스 실행 | Fargate + ALB 기반 Custom Code Interpreter | AWS Fargate, ALB |
| 5 | **운영 모니터링** | 에이전트 상태/토큰/비용 실시간 추적 | DynamoDB + SNS + Cognito Ops 대시보드 | DynamoDB, SNS, Cognito |

### 비용 최적화: Prompt Cache 전략

| 에이전트 | Prompt Cache | 이유 |
|---------|-------------|------|
| Supervisor, Coder, Reporter | **활성화** | 시스템 프롬프트 + 도구 정의 반복 호출 → 입력 토큰 비용 최대 90% 절감 |
| Coordinator | **비활성화** | 단 한 번 호출됨 |
| Validator, Tracker | **비활성화** | 매번 다른 컨텍스트로 호출 → 캐싱 효과 낮음 |

---

## 3. Part 2 — Context Engineering 실전 기법

### 배경: Anthropic의 Context Engineering 프레임워크

Anthropic이 2025년 9월 공개한 [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)에서 제안한 3가지 핵심 기법을 Deep Insight가 실전 적용.

### 기법 1: Compaction (압축)

**문제**: 장기 실행 에이전트의 컨텍스트 윈도우가 포화되면 성능 급격히 저하 (Context Rot).

**원리**: 대화가 윈도우 한계 근접 시 내용을 요약하고, 새 윈도우로 요약본과 함께 재시작.

**구현 포인트**:
- "아키텍처 결정, 미해결 버그, 구현 세부사항"은 보존
- 중복된 도구 출력은 제거
- 원칙: "회상을 최대화한 후 불필요한 내용을 제거하여 정확성 개선"

**Deep Insight 적용**: Supervisor가 여러 Tool Agent를 순차 호출하면서 컨텍스트가 누적되는 문제를 Structured Note-Taking과 결합하여 해결.

### 기법 2: Structured Note-Taking (구조화된 메모)

**문제**: 에이전트가 장기 작업 진행 상황을 "기억"하지 못함.

**원리**: 에이전트가 컨텍스트 윈도우 외부에 메모를 정기적으로 저장하고, 필요시 불러옴.

**Deep Insight 적용**:
- `all_results.txt` — Coder 에이전트의 분석 결과 누적 저장
- `calculation_metadata.json` — 수치 계산 기록 (Validator가 검증용으로 참조)
- `citations.json` — 검증된 인용 메타데이터
- Tracker 에이전트가 전체 진행률을 `[x]` 체크리스트로 관리

### 기법 3: Multi-Agent (Sub-Agent) Architecture

**문제**: 단일 컨텍스트 윈도우로는 "데이터 분석 + 시각화 + 검증 + 리포트 생성"을 한 번에 처리 불가.

**원리**: 메인 에이전트(Supervisor)가 조정 역할, 전문 에이전트가 각자의 클린 컨텍스트에서 작업 후 압축된 요약만 반환.

**Deep Insight 구현**: 3단계 계층 + Agents-as-Tools 패턴 (상세는 §4).

### 기법 4: Token-Efficient Tool Design

**원칙**:
- **최소 기능성**: 도구가 너무 많은 기능을 가지면 에이전트가 혼란
- **명확한 목적**: "인간이 어떤 도구를 쓸지 확신할 수 없으면, AI도 못한다"
- **Just-in-Time Context Retrieval**: 사전 로드 대신 런타임에 필요한 데이터만 동적 로드

**Deep Insight 적용**:
- Coder의 `write_and_execute_tool`: 파일 기반 실행 (REPL 대비 에러 감소)
- `skill_tool`: PDF/DOCX/XLSX 처리를 동적 로딩 (Claude Code-style Skill System)
- 각 스크립트가 **완전 자체 포함** — "변수는 스크립트 간 지속되지 않음, 항상 캐시에서 로드"

### Context Rot: 왜 큰 윈도우가 답이 아닌가

> "트랜스포머 구조에서 n개 토큰은 n² 쌍 관계를 생성. 컨텍스트가 증가하면 각 관계에 할당된 주의(attention) 예산이 감소."

→ 하드 클리프가 아니라 **성능 그래디언트**: 더 긴 컨텍스트에서도 작동하지만 정보 검색 & 장거리 추론 정확도 감소.

---

## 4. 아키텍처 상세 분석 (GitHub 코드 기반)

### 4.1 에이전트 계층 구조 (3-Tier)

```
사용자 요청
    │
    ▼
┌──────────────┐
│ Coordinator  │ ← Tier 1: 라우팅 (Haiku)
│  간단한 대화  │   "인사말, 잡담은 직접 처리"
│  직접 처리    │   "복잡한 작업은 Planner로 즉시 이관"
└──────┬───────┘
       │ 복잡한 작업
       ▼
┌──────────────┐
│   Planner    │ ← Tier 2: 전략 기획 (Opus)
│  분석 계획    │   "목표/결과물 파악 → 에이전트 선택 → 의존성 순서 결정"
│  수립/수정    │   필수 순서: Coder → Validator → Reporter
└──────┬───────┘
       │ 계획 승인 (HITL)
       ▼
┌──────────────┐
│  Supervisor  │ ← Tier 2: 실행 조율 (Sonnet)
│  도구 에이전트 │   4개 Tool Agent를 Agents-as-Tools로 호출
│  오케스트레이션│   Tracker 호출로 진행률 추적
└──────┬───────┘
       │
  ┌────┼────┬────────┐
  ▼    ▼    ▼        ▼
Coder Validator Reporter Tracker  ← Tier 3: 전문 도구 에이전트
```

### 4.2 그래프 워크플로우 (Strands SDK)

`build_graph()` — 4개 FunctionNode를 조건부 엣지로 연결:

```
Coordinator → Planner → PlanReviewer ──┐
                 ↑                      │
                 └── should_revise ─────┘
                                        │
                        should_proceed ──┘
                                        │
                                        ▼
                                    Supervisor
```

- **PlanReviewer**: Human-in-the-Loop — 사용자가 계획을 승인/수정 피드백
- **최대 수정 횟수**: 10회 (환경변수 설정 가능)
- **최대 실행 횟수**: 25회 (무한 루프 방지)
- **StreamableGraph**: 백그라운드 작업 + 이벤트 큐 패턴으로 실시간 스트리밍

### 4.3 에이전트별 역할/프롬프트/도구

| 에이전트 | 역할 | 도구 | 출력 제한 | 프롬프트 캐시 |
|---------|------|------|----------|-------------|
| **Coordinator** | 라우팅 (간단→직접, 복잡→Planner) | 없음 | — | ✗ |
| **Planner** | 분석 계획 수립 (Markdown) | 없음 | — | — |
| **Supervisor** | Tool Agent 오케스트레이션 | coder, validator, reporter, tracker | — | ✓ |
| **Coder** | Python 코드 실행, 데이터 분석, 시각화 | skill_tool, write_and_execute, bash, file_read | — | ✓ |
| **Validator** | 수치 검증, citation 생성 | write_and_execute, file_read | 800 tokens | ✗ |
| **Reporter** | DOCX 리포트 생성 (증분 빌드) | write_and_execute, file_read | 1000 tokens | ✓ |
| **Tracker** | 진행률 체크리스트 관리 | — | — | ✗ |

### 4.4 코드 실행 패턴

**핵심 원칙: "Self-Contained, Incremental Execution"**

```python
# Coder 에이전트의 실행 패턴
# 1. 각 스크립트는 완전 독립 — 모든 import, 데이터 로드 포함
# 2. 변수는 스크립트 간 지속 안 됨 — pickle 캐시로 데이터 전달
# 3. 결과는 ./artifacts/에 저장 — .py, .pkl, .csv, .png, .json

# Reporter의 DOCX 빌드 패턴
# Step 0: 유틸리티 모듈 생성
# Step 1~N: 섹션별 증분 추가 (title → summary → charts → analysis → conclusions)
# Final: 인용 포함/미포함 2개 버전 생성
```

### 4.5 디렉토리 구조

```
sample-deep-insight/
├── self-hosted/              # 로컬/EC2 배포 (~10분 설정)
│   ├── main.py               # 진입점
│   ├── src/
│   │   ├── graph/
│   │   │   ├── builder.py    # Strands SDK 그래프 구성
│   │   │   └── nodes.py      # 4개 에이전트 노드 + 상태관리
│   │   ├── tools/
│   │   │   ├── coder_agent_tool.py
│   │   │   ├── reporter_agent_tool.py
│   │   │   ├── validator_agent_tool.py
│   │   │   └── tracker_agent_tool.py
│   │   ├── prompts/          # 마크다운 시스템 프롬프트 (즉시 반영)
│   │   │   ├── coordinator.md
│   │   │   ├── planner.md
│   │   │   ├── supervisor.md
│   │   │   ├── coder.md
│   │   │   ├── reporter.md
│   │   │   └── validator.md
│   │   └── utils/
│   ├── app/app.py            # Streamlit 웹 인터페이스
│   ├── skills/               # 동적 스킬 로딩
│   ├── data/                 # 샘플 CSV + column_definitions.json
│   └── .env.example
├── managed-agentcore/        # 프로덕션 배포 (~45분, Bedrock Runtime)
├── deep-insight-web/         # Web UI (React, ~15분)
└── docs/                     # features/, ops/, incidents/, release-management
```

### 4.6 배포 옵션 비교

| 옵션 | 설정 시간 | 에이전트 호스팅 | 코드 실행 | 네트워크 | 대상 |
|-----|---------|-------------|---------|--------|------|
| **Self-Hosted** | ~10분 | 로컬/EC2 | 로컬 Python | 선택 | 개발/테스트 |
| **Managed AgentCore** | ~45분 | Bedrock Runtime | Fargate 샌드박스 | 100% VPC | 프로덕션 |
| **Web UI** | ~15분 | Bedrock Runtime | Fargate 샌드박스 | VPN/CloudFront+Cognito | 비기술 사용자 |

### 4.7 모델 설정

```env
# .env 에이전트별 모델 지정
COORDINATOR_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
PLANNER_MODEL_ID=us.anthropic.claude-opus-4-20250514-v1:0
CODER_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
VALIDATOR_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
REPORTER_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
```

---

## 5. Deep Insight가 LangManus에서 가져온 것

> "Come From Open Source, Back to Open Source"

LangManus 커뮤니티의 멀티에이전트 워크플로우 아이디어를 기반으로, AWS 네이티브 기능(Bedrock, AgentCore, Fargate, VPC 격리)을 확장하여 프로덕션 레벨로 끌어올린 후 다시 오픈소스로 기여.

---

## 6. Foundry-X Phase 34~36 시사점

### 6.1 Deep Insight ↔ Foundry-X GAP 대조

| Deep Insight 요소 | Foundry-X 현황 | GAP/기회 |
|------------------|--------------|---------|
| 3-Tier 에이전트 계층 (Coordinator→Planner→Supervisor→Tools) | F510 멀티에이전트 세션 표준화 계획 중 | **G1 직접 참조**: Strands SDK의 Graph 패턴을 TS로 포팅하거나, Cloudflare Workers 기반으로 유사 구현 가능 |
| Agents-as-Tools 패턴 | SDD Triangle (Spec↔Code↔Test) | **확장 기회**: 현행 SDD를 에이전트 도구로 래핑하여 Supervisor가 호출하는 구조 |
| 역할별 모델 배치 (Haiku/Opus/Sonnet) | 단일 모델 사용 | **F510 구현 시 적용**: 라우팅=Haiku, 계획=Opus, 실행=Sonnet 전략 도입 |
| Human-in-the-Loop (PlanReviewer) | O-G-D Loop에서 수동 검증 | **F516 자율 코딩 루프와 결합**: 계획 승인 단계를 HITL로 |
| Prompt Cache 전략적 활성화/비활성화 | 미적용 | **즉시 적용 가능**: Bedrock API 호출 시 반복 프롬프트 캐싱 |
| Structured Note-Taking (all_results.txt, metadata.json) | SPEC.md + MEMORY.md | **이미 유사 패턴 보유**: SPEC.md가 구조화된 메모 역할 수행 중 |
| Self-Contained Code Execution (pickle 캐시) | CLI plumb (subprocess 래핑) | **Track B 참조**: TS 재구현 시 유사 패턴 적용 가능 |
| TokenTracker (에이전트별 토큰 추적) | F512 WebSocket 에이전트 활동 스트리밍 계획 | **직접 참조**: 에이전트별 토큰 사용량 추적 + 비용 대시보드 |
| Fargate 샌드박스 Code Interpreter | Cloudflare Workers 샌드박스 | **동일 패턴, 다른 인프라**: Workers의 isolate 모델이 유사 역할 |

### 6.2 F-item 보강 제안

기존 F510~F516 로드맵에 Deep Insight 분석 결과 반영:

**F510 보강** — 멀티에이전트 세션 표준화
- Deep Insight의 3-Tier 패턴 (Coordinator→Planner→Supervisor→Tools) 참조
- `_global_node_states` 딕셔너리 기반 상태 공유 → Foundry-X는 Zustand store로 대체
- Graph 빌더 패턴: 노드 정의 → 조건부 엣지 → 최대 실행 횟수 제한

**F512 보강** — WebSocket 에이전트 활동 스트리밍
- Deep Insight의 `StreamableGraph` + 이벤트 큐 패턴 직접 참조
- `TokenTracker.accumulate()` 방식의 에이전트별 토큰 추적

**F516 보강** — SDD 기반 자율 코딩 루프
- Deep Insight의 Coder→Validator→Reporter 필수 순서 = SDD의 Code→Test→Spec 동기화
- PlanReviewer HITL = O-G-D Loop의 수동 승인 단계
- Self-Contained Execution 패턴: 각 단계가 독립적으로 실행되며 파일 기반으로 결과 전달

### 6.3 즉시 적용 가능한 기법

1. **프롬프트를 마크다운 파일로 분리**: Deep Insight처럼 `prompts/*.md`로 관리하면 재배포 없이 프롬프트 수정 가능
2. **에이전트별 모델 분리**: `.env`에서 `COORDINATOR_MODEL_ID`, `PLANNER_MODEL_ID` 등으로 분리 → 비용-품질 최적화
3. **Prompt Cache 전략**: 반복 호출 에이전트(Supervisor, Coder)만 캐시 활성화, 일회성 호출은 비활성화
4. **출력 토큰 제한**: Validator(800), Reporter(1000)처럼 역할별 출력 제한 → 불필요한 토큰 소비 방지
5. **`column_definitions.json` 패턴**: 데이터 컨텍스트를 별도 JSON으로 관리 → 에이전트에 Just-in-Time으로 주입

---

## 7. 핵심 인사이트 요약

### "Context Engineering은 Prompt Engineering의 상위 개념"

| 구분 | Prompt Engineering | Context Engineering |
|-----|-------------------|-------------------|
| 범위 | 단일 프롬프트 최적화 | 전체 정보 페이로드 최적화 |
| 시점 | 정적 (사전 설계) | 동적 (매 호출마다 큐레이션) |
| 대상 | 시스템 프롬프트 | 시스템 프롬프트 + 메시지 히스토리 + 도구 출력 + 외부 메모 |
| 원칙 | "좋은 프롬프트를 쓰라" | "최소한의 고신호 토큰으로 원하는 결과 가능성을 최대화하라" |

### Deep Insight가 증명한 3가지

1. **Multi-Agent는 Context Window 한계의 해법이다**: 각 에이전트가 자기만의 클린 윈도우에서 작업 → 수만 토큰 사용해도 1~2k 요약만 반환
2. **에이전트별 모델 분리는 비용을 극적으로 줄인다**: Haiku(라우팅) + Opus(계획) + Sonnet(실행) 조합으로 Opus 단일 사용 대비 비용 대폭 절감
3. **Prompt Cache + 출력 제한 = 실전 비용 최적화**: 반복 호출 에이전트만 캐시 활성화, 역할별 출력 토큰 캡

---

## Sources

- [Part 1: 프로덕션 Multi-Agent 시스템이 해결해야 할 5가지 문제](https://aws.amazon.com/ko/blogs/tech/practical-design-lessons-from-the-deep-insight-arch/)
- [GitHub: aws-samples/sample-deep-insight](https://github.com/aws-samples/sample-deep-insight)
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [TechBlogPosts.com — Part 2 확인](https://www.techblogposts.com/ko)
