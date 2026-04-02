---
code: FX-SPEC-AGEV
title: "Agent Evolution PRD — Track A/B 에이전트 진화"
version: 1.0
status: Active
category: SPEC
created: 2026-03-22
updated: 2026-03-22
author: AX BD팀
---

# Agent Evolution PRD

**버전:** Final (v2 기반 + v3 선별 반영)
**날짜:** 2026-03-22
**작성자:** AX BD팀
**상태:** ✅ 완료 — Track A (A1~A18) + Track B (B1~B3) 전체 구현 완료 (Sprint 33~42)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X의 에이전트 시스템을 멀티모델 라우팅 + 역할 기반 전문 에이전트 + 고급 워크플로우 패턴으로 진화시켜, 사람-AI 협업의 품질과 효율을 비약적으로 향상시킨다.

**배경:**
현재 Foundry-X는 Claude Haiku 단일 모델에 PlannerAgent + ReviewerAgent 2개 역할만 운용 중이다. gstack(역할 기반 AI 팀), Anthropic 워크플로우 패턴(Evaluator-Optimizer), claude-code-router(멀티모델 라우팅), Fluid.sh(인프라 에이전트), OpenRouter(300+ 모델 게이트웨이) 등의 외부 리소스를 분석한 결과, Foundry-X의 기존 아키텍처(Runner 추상화, 동적 라우팅, DAG workflow-engine)가 이들을 흡수하기에 이미 잘 준비되어 있음을 확인했다.

**시장/경쟁/차별점:**
- **시장 트렌드:** AI 에이전트 시스템 및 개발 생산성 향상은 현재 IT 시장의 주요 트렌드임. Devin, CrewAI, AutoGen, GitHub Copilot Enterprise, JetBrains AI Assistant 등 유사 솔루션이 빠르게 확산.
- **경쟁사 대비 차별점:** Foundry-X는 Runner 추상화 및 워크플로우 엔진 등 엔터프라이즈 환경에 적합한 확장성·보안 중심 설계, KT DS 내부 개발 프로세스와의 심층 통합, 에이전트 역할 커스터마이징 기능, 그리고 OpenRouter를 통한 대규모 멀티모델 액세스에서 경쟁우위 확보.
- **틈새시장:** 대형 조직 내 보안·컴플라이언스, 기존 워크플로우와의 심층 통합, 커스터마이징/운영 편의성에 중점을 두어, 오픈소스/외부 서비스 대비 엔터프라이즈 환경에 특화.

**목표:**
- 태스크 특성에 맞는 최적 모델을 자동 선택하는 멀티모델 라우팅 도입
- 2개에서 5~8개로 전문 에이전트 역할 확장
- Evaluator-Optimizer 패턴 추가로 에이전트 출력 품질 향상
- 개발 과정에서 gstack 스킬 + claude-code-router를 즉시 활용
- 궁극적으로 개발자 투입 시간 감소, 코드 결함률 감소, 개발 생산성 향상 및 코드 품질 표준화 달성

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

**단일 모델 한계:**
- ClaudeApiRunner가 `claude-haiku-4-5`만 사용 (PlannerAgent만 Sonnet)
- 복잡한 아키텍처 분석에 Haiku는 역부족, 단순 리뷰에 Opus는 과비용
- 모델 선택이 코드에 하드코딩 — 유연성 없음
- [예시 데이터]
    - 최근 3개월 code-review 자동화 실패율: 18% (PR 100건 중 18건 수동 개입 필요)
    - 평균 code-review 소요 시간(자동): 12분, 수동 리뷰 시 평균 27분
    - 모델별 월간 토큰 사용량: Haiku 950K, Sonnet 120K, Opus 20K (월 평균 기준)
    - Opus 사용 시 건당 평균 비용 3.5배 증가

**역할 부족:**
- PlannerAgent: 계획 수립 + 승인 대기
- ReviewerAgent: PR 리뷰 + SDD 점수
- 설계 검토, 보안 스캔, 테스트 생성, QA, 인프라 자동화 — 모두 수동

**워크플로우 패턴 제한:**
- Sequential + Parallel만 구현
- Evaluator-Optimizer 루프 없음 → 첫 시도 품질에 의존
- Sprint 단위 자동화 워크플로우 없음

**비즈니스 임팩트(부족 현황):**
- 반복적 리뷰 및 테스트, 보안 등 수작업으로 인해 개발자 투입 시간 과다(평균 주 8시간 이상)
- 결함률(릴리즈 후 2주 내 발견 버그): 6.2% (월간 배포 기준)
- 리뷰 지연으로 인한 프로젝트 일정 차질 사례 발생(최근 2분기 4건 보고)

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

**비즈니스 임팩트(기대효과):**
- 전체 코드 리뷰 소요 시간 40% 이상 단축, 개발자 투입 시간 월 30% 이상 절감
- 배포 후 결함률 20% 이상 감소, 코드 품질 벤치마크 점수 지속 향상
- 프로젝트 일정 준수율 개선, 개발팀 생산성 KPIs(릴리즈 건수·리드타임) 개선

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

#### 3.1.1 실제 사용성/UX 시나리오
- 기존: PR 생성 → ReviewerAgent 자동 리뷰 → 결과 확인 및 수작업 보완
- 개선: PR 생성 → 멀티에이전트(Reviewer, Security, Test 등) 자동 리뷰/분석/테스트 생성 → 에이전트별 대시보드에서 결과 통합 확인, 필요시 human-in-the-loop 피드백 입력
- 변화점: 코드 리뷰·보안·테스트가 자동화되어 개발자는 최종 승인·보완에 집중, 각 에이전트 결과물 및 비용 시각화 대시보드 제공
- 도입 장애요소: 자동화 결과 신뢰도 부족, 기존 워크플로우와의 충돌, 사용자 교육 미흡 시 저항 가능
- 교육/온보딩 계획:
    - (1) 전사 개발자 대상 단계별 교육(온라인 강의, 실습 세션, 워크숍)
    - (2) 실사용 가이드/FAQ/베스트프랙티스 문서 배포
    - (3) 전담 지원 인력(Foundry-X Core팀) 지정 및 실시간 Q&A 채널(Slack) 운영
    - (4) 정기 VOC(Voice of Customer) 수집 및 분기별 피드백 반영
    - (5) 도입 후 1개월 이내 모든 신규 인력 Onboarding Checklist에 포함

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| AX BD팀 리더 | 기술 방향 결정 | 높음 |
| KT DS 내부 사용자 | 온보딩 대상 | 중간 |
| QA팀/보안팀 | 자동화 활용 및 감사 대상 | 중간 |
| 법무/보안 책임자 | 외부 API/데이터 정책 승인 | 높음 |

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
| A13 | **멀티모델 앙상블 투표** | 같은 태스크를 3~5개 모델이 병렬 처리 → 결과를 투표/가중치로 종합. 품질 변동성 감소 (Six Hats Green Hat 제안, gstack /codex 확장) | P2 |
| A14 | **에이전트 자기 평가** | 에이전트가 자신의 출력을 평가하고 개선하는 자기 반성 루프 | P2 |
| A15 | **프라이빗 프롬프트 게이트웨이** | 소스코드 전체 대신 "코드 요약/추상화 그래프/diff"만 LLM에 전송하는 프록시 레이어. 민감정보 원천 차단 (Six Hats Green Hat 핵심 제안) | P1→P0 검토 |
| A16 | **AI-휴먼 하이브리드 피드백 루프** | 자동화 실패 시 이유+대안 요약 → Slack/이메일 알림 → 1분 이내 개발자 피드백 수집 → 에이전트 즉시 학습 (Six Hats Green Hat 제안) | P1 |
| A17 | **자동화 품질 리포터** | 에이전트가 주간 "자동화 품질 리포트"를 자율 생성 — 성공률/실패 패턴/개선 제안 포함 (Six Hats Green Hat 제안) | P2 |
| A18 | **에이전트 마켓플레이스** | 내부 개발자가 에이전트 역할/프롬프트/도구를 업로드·공유하는 내부 마켓. 현장 문제 해결 조합의 빠른 확산 (Six Hats Green Hat 제안) | P2 |

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

- **ML 기반 동적 라우팅 최적화**: 초기에는 룰 기반 라우팅만 구현, ML 라우팅은 별도 연구 과제로 관리

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
| 코드 리뷰 실패율 | 18% | 5% 이하 | 자동/수동 개입 PR 비율 |
| 평균 리뷰 소요 시간 | 12분(자동) | 7분 이하 | 로그 분석 |
| TestAgent 테스트 통과율 | [미확인] | 90% 이상 | 생성 테스트의 실제 실행 결과(빌드/테스트 파이프라인 연동) |
| 코드 결함률 | 6.2% | 5% 미만 | 배포 후 2주 내 버그 리포트 비율 |
| 개발자 투입 시간 | 주 8시간 | 5시간 이하 | 업무 보고서/자동 추적 |
| 벤치마크 데이터셋 기반 품질 | 미구현 | human-in-the-loop + 공개 데이터셋 | 정기적 평가 세션 |

### 5.2 MVP 최소 기준

- [x] OpenRouterRunner가 기존 Runner 추상화에 통합되어 에이전트 태스크 실행 가능 — F135 Sprint 34 (97%)
- [x] 최소 3개 모델(Haiku, Sonnet, GPT-4o)이 태스크별로 라우팅 — F136 Sprint 36 (96%)
- [x] Evaluator-Optimizer 루프가 code-review 태스크에 적용 — F137 Sprint 36 (96%)
- [x] TestAgent가 변경 파일 기반 테스트 생성 가능 — F139 Sprint 37 (95%)
- [ ] TestAgent가 생성한 테스트의 실제 통과율 80% 이상을 human-in-the-loop로 평가 — 기능 구현 완료, 실측 미수행

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
- Phase 분할 전략:
    - **Phase 5a (2주)**: Track B 도구 도입 + OpenRouterRunner POC
    - **Phase 5b (4주)**: P0 기능 (A1~A5) — OpenRouter 통합 + 모델 라우팅 + Evaluator + ArchitectAgent + TestAgent
    - **Phase 5c (3주)**: P1 기능 (A6~A10) — SecurityAgent + QAAgent + Sprint 워크플로우 + 대시보드
    - **Phase 5d (이후)**: P2 기능 (A11~A14) — 수요 기반 선별 개발
- 각 Phase 시작 전 Go/No-Go 체크포인트 설정

### 6.2 기술 스택

- 프론트엔드: Next.js 14 + React 18 + Zustand (기존 유지)
- 백엔드: Hono + Cloudflare Workers (기존 유지)
- LLM: OpenRouter API (추가) + Anthropic API (기존 유지)
- 인프라: Cloudflare (Workers + D1 + Pages) 기존 유지
- 기존 시스템 의존: agent-orchestrator.ts, agent-runner.ts, workflow-engine.ts

### 6.3 인력/예산

- 투입 가능 인원: 1명 + AI 에이전트
- **리스크:** 현재 인력(1명)으로 전체 FE/BE/워크플로우/대시보드/역할 DB 구현 및 QA를 모두 수행하기에는 현실적으로 불가능. 기능 범위·우선순위 재조정 또는 추가 인력(내부/외부) 확보 필요.
- **인력 투입 전략:**
    - Phase 5a: 1명 + AI 에이전트 (POC/도구 도입 수준)
    - Phase 5b: 최소 2명 필요 (BE/AI + FE, 확보 목표: 2026-04-10)
    - Phase 5c: 2~3명 (QA 포함)
- 예산: OpenRouter API 비용 (종량제, 모델별 상이), 추가 인력 확보 시 인건비 증액 검토
- 예상 OpenRouter 월 비용: ~$50~200 (모델 구성/사용량에 따라 변동, POC 단계에서 실측 예정)

### 6.4 컴플라이언스

- KT DS 내부 정책: 외부 API 사용 시 데이터 전송 범위 확인 필요
- 보안 요구사항: API 키 Cloudflare Secrets 저장, 코드/소스코드 전송 시 민감정보 마스킹
- 외부 규제: [미확인]
- **핵심 블로커:** KT DS 보안 정책상 외부 LLM API로 소스코드 전송 가능 여부가 미확정. 불허 시 다음 대안 적용 (Six Hats 토론에서 보강):
    - (1) **프라이빗 프롬프트 게이트웨이 (A15)** — 소스코드 전체 대신 "코드 기능 블록/추상화 그래프/diff 요약"만 LLM에 전송. 식별자 난독화 + 민감 데이터 마스킹을 자동 수행하는 프록시 에이전트로 보안 우려를 근본 차단 (Six Hats Green Hat 핵심 대안)
    - (2) 코드 자동 리뷰/생성은 사내 테스트/비공식 프로젝트에만 적용 (초기 범위 제한)
    - (3) 민감정보/비공개 모듈 자동 마스킹(정규표현식, 정책 DB 기반)
    - (4) 프라이빗 LLM API(온프레미스) 검토
    - (5) 보안/법무팀과 협의하여 "허용 가능한 데이터 범위" 명시적 가이드라인 확보(1차 데드라인: 2026-04-05)
- **개인정보 처리:** 모든 소스코드/데이터 전송 시 개인정보/식별자 자동 마스킹 로직 내장, 전송 로그 별도 저장

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
- 각 반복별 컨텍스트 및 결과물 버전 관리(예: workflow-engine에서 세션/히스토리 저장)
- 무한루프 방지: 최대 반복(예 3회) 초과 시 경고 및 human-in-the-loop 개입
- 피드백 반영 시 토큰/비용 폭증 모니터링, 임계값 초과 시 실행 중단 및 알람

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

## 9. 오퍼레이션/운영 및 모니터링
### 9.1 운영/모니터링 대시보드
- 에이전트/모델별 토큰 사용량/비용/성공률/실패율/품질점수 실시간 시각화
- 장애 감지(SLA 99% 미만, 연속 실패율, 외부 API 응답 지연 등) 및 알림(이메일, Slack 등)
- 비용 초과 예산 알림(월간 한도, Task별 한도, 급증 감지)
- 모델/에이전트 단위 동적 활성화/비활성화(Feature Flag)
- 반복 루프(Optimizer) 실행시 총 비용, 반복 회수, 중단 내역 기록

### 9.2 롤백/단계적 배포 전략
- Canary 배포: 신규 에이전트/모델/워크플로우 기능 일부 사용자 그룹에 시범 적용, 이상 발생시 자동 롤백
- Feature Flag: 역할별/기능별 플래그 기반 점진적 적용 및 회수
- 통합 테스트/회귀 테스트 자동화, 장애 발생시 신속 복구 절차 명시

### 9.3 데이터/로그/감사 정책
- 모든 에이전트 실행 로그: 입력(마스킹 적용), 출력, 모델, 토큰, 비용, 소요시간 기록
- 개인정보/민감정보 유출 감시: 전송 전 자동 마스킹 + 전송 로그 별도 저장
- 운영 로그 보관: 90일 이상 보관 (감사 대응)
- 분산 트레이싱: 에이전트 간 요청 추적 (requestId 기반)

### 9.4 Fallback/비상절차
- 1차 Fallback: OpenRouter 장애 시 → Anthropic 직접 호출
- 2차 Fallback: 전체 LLM 장애 시 → 수동 리뷰 모드 전환
- 3차: 긴급 롤백 (Feature Flag로 에이전트 기능 일괄 비활성화)
- 장애 이력·조치 결과는 운영 대시보드 및 주간 리포트에 기록

---

## 10. 품질/성능/비용 검증 및 벤치마킹
- 멀티모델/멀티에이전트 도입 효과 검증을 위해 다음 절차를 수행:
    - 도입 전/후 자동화율, 코드 품질, 리뷰/테스트 소요 시간, 결함률 등 전수 비교
    - 공개/내부 벤치마크 데이터셋 기반 품질 평가(Human-in-the-loop 및 블라인드 평가 병행)
    - 비용-성능(A/B 테스트) 실증: 동일 태스크에 대해 단일모델 vs 멀티모델 결과 및 비용 비교
    - 반복 루프(Optimizer) 적용시 품질 향상률 및 비용 대비 효과 수치화
    - 벤치마크/테스트 데이터셋 선정·운영은 QA팀과 공동 관리, 분기별 갱신
    - 골드 셋(검증된 정답 포함): 코드 리뷰 20건, 보안 이슈 10건, 테스트 생성 15건 초기 구축

---

## 11. 리스크 관리
### 11.1 주요 리스크 및 대응

| # | 리스크 | 설명 | 대응 |
|---|--------|------|------|
| 1 | 외부 API 의존 | OpenRouter/Anthropic SLA 미확인, 장애/요금 폭등/정책 변경 시 전면 중단 위험 | Fallback 체인 확보, 주기적 SLA 점검, 대체 API 검토 |
| 2 | 인력 부족 | 1인 개발로 전체 기능/운영 불가, 일정·품질 저하 | 기능 범위 조정/우선순위 재설정, 추가 인력 확보 추진 |
| 3 | 보안 정책 불확실 | KT DS 정책상 외부 LLM API로 코드 전송 불가 가능성 | 보안/법무팀 협의, 마스킹·테스트 대안 적용, 정책 확정 전 핵심 기능 개발 보류 |
| 4 | 비용 통제 실패 | 반복 루프·멀티모델로 인한 비용 폭증 | 예산 한도 알람, 비용 대시보드, 반복 제한/사전 승인 |
| 5 | 품질 효과 불확실 | 멀티모델·에이전트 도입 효과 실증 전 미확인 | 벤치마크·A/B 테스트·Human 평가로 효과 검증, 미달 시 단계적 도입/회수 |
| 6 | QA/테스트 부족 | TestAgent/QAAgent 품질 미흡시 장애 확산 | 통합 테스트 자동화, human-in-the-loop 검증 |
| 7 | 시스템 복잡도 급증 | 멀티에이전트/모델로 장애·디버깅 난이도 상승 | 운영 대시보드, 장애 추적, Canary/Feature Flag 적용 |
| 8 | 오픈소스 라이선스 리스크 | gstack 등 오픈소스 통합시 법적 이슈 | 법무팀 사전 검토, 라이선스 준수 문서화 |
| 9 | 무한 루프/비용폭발 | Optimizer 반복 최대치 초과시 비용, 컨텍스트 관리 | 반복 제한, 상태/버전 관리, 비용 한도 초과시 자동 중단 |
| 10 | Gradual Release 미흡 | 대규모 변경시 전면 장애 위험 | Canary/Feature Flag 및 자동 롤백 체계 적용 |

---

## 12. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | OpenRouter 요금 체계 상세 확인 + 예상 월 비용 산출 | [미정] | [미정] |
| 2 | KT DS 보안 정책상 외부 LLM API에 소스코드 전송 가능 여부 | [미정] | 2026-04-05 |
| 3 | Phase 4 최종 Go/Pivot/Kill 판정 결과에 따른 범위 조정 | Sinclair | 온보딩 4주 후 |
| 4 | gstack 라이선스(MIT) Foundry-X 통합 시 법적 확인 | [미정] | [미정] |
| 5 | Evaluator-Optimizer 루프의 비용 대비 품질 향상 실측 필요 | [미정] | Phase 5 Sprint 1 |
| 6 | Track B (개발 도구) 도입 시점 확정 | Sinclair | [미정] |
| 7 | 품질 평가용 벤치마크/테스트 데이터셋 선정 및 운영 | [미정] | Phase 5 시작 전 |
| 8 | 운영 대시보드/Feature Flag/Canary 배포 프레임워크 설계 | [미정] | Phase 5 Sprint 1 |
| 9 | 추가 인력(내부/외주) 투입 방안 검토 | BD팀 | 2026-04-10 |
| 10 | 프라이빗 프롬프트 게이트웨이(A15) 기술 검증 — 코드 요약 품질 vs 보안 트레이드오프 | Sinclair | Phase 5a |
| 11 | 멀티모델 앙상블 투표(A13) POC — 비용 대비 품질 향상 실측 | [미정] | Phase 5b |

---

## 13. Six Hats 토론 요약

> 2026-03-22, 20턴, GPT-4.1 기반, 218초, 147,915 토큰

### 핵심 합의사항 (5가지)
1. 멀티모델·역할 기반 에이전트 + 고급 워크플로우 도입은 **생산성·품질 혁신의 핵심 기회**
2. OpenRouter 연동과 자동화 확대 방향에 **전 관점 공감**
3. 보안(외부 LLM API 활용)과 인력·운영 체계가 **성공의 필수 전제**
4. 창의적 대안(프라이빗 프롬프트 게이트웨이, 앙상블, 피드백 루프)이 **보안·신뢰 문제의 실질적 해법**
5. 효과 실증 데이터(비용/품질/TestAgent 통과율) 확보가 **단계별 진행의 전제 조건**

### 미해결 쟁점 (3가지)
1. KT DS 보안 정책 미확정 — 외부 LLM 활용 불가 위험 (가장 큰 블로커)
2. 인력 및 운영 리소스 부족 — 1~2명으로 전체 기능/운영 불가
3. 실증 데이터 부족 — 멀티모델·에이전트 도입 효과 검증 전 미확인

### Six Hats 창의적 제안 → PRD 반영 (Green Hat)

| # | 제안 | PRD 반영 | 우선순위 |
|---|------|----------|----------|
| 1 | 프라이빗 프롬프트 게이트웨이 | A15 신설 — 코드 요약/추상화만 전송, 보안 근본 차단 | P1→P0 검토 |
| 2 | 멀티모델 앙상블 투표 | A13 확장 — 3~5개 모델 병렬 + 결과 종합 | P2 |
| 3 | AI-휴먼 하이브리드 피드백 루프 | A16 신설 — 실패 시 즉시 피드백 수집+학습 | P1 |
| 4 | 자동화 품질 리포터 | A17 신설 — 주간 품질 리포트 자율 생성 | P2 |
| 5 | 에이전트 마켓플레이스 | A18 신설 — 역할/프롬프트 공유 내부 마켓 | P2 |
| 6 | AI-휴먼 페어링 데이 | 운영 계획에 반영 — 정기 챌린지 | 운영 |
| 7 | 인사이트 스카우트 에이전트 | A17에 통합 가능 | P2 |

### 착수 판단
**Conditional** — 보안 정책 등 핵심 전제 해소 전 본격 착수 불가. Track B(개발 도구)는 즉시 착수 가능.

---

## 14. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 (v1) | 2026-03-22 | 6개 리소스 조사 + 인터뷰 기반 최초 작성 | 75 |
| R1→v2 | 2026-03-22 | ChatGPT+DeepSeek+Gemini 3모델 검토의견 반영: 정량화, KPI, 운영, 리스크, 시장분석, 보안, UX, 인력 | 78 |
| R2→v3 | 2026-03-22 | 2차 피드백 반영: 교육체계, Phase분할, 감사정책, Fallback, 벤치마크 상세화 | 58 (문서 확장으로 이슈 증가) |
| Final | 2026-03-22 | v2 기반 + v3 핵심 보강 선별 병합. 외부 조건(보안, 인력, Phase4) 해소 후 착수 가능 | Conditional |
| Six Hats | 2026-03-22 | 20턴 토론(GPT-4.1): 5개 창의적 대안 PRD 반영(A15~A18), 보안 대안 강화, 오픈이슈 2건 추가 | Conditional |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*

---

## Out-of-scope
- ML 기반 동적 라우팅 레이어(초기 버전에서는 룰 기반만, 추후 ML 라우팅 별도 검토)
- 자체 LLM 호스팅 및 프라이빗 모델 구축
- GUI 기반 에이전트 빌더(노코드/로우코드)
- 실시간 음성/비디오 에이전트
- 프로바이더별 개별 API 키 관리
- (기타) 검토 의견 범위 밖 요구사항: Agent 시스템 외부의 조직 정책, 예산 승인 절차, KT DS 외부 고객 지원

---