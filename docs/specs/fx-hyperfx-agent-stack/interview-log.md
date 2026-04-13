# HyperFX Agent Stack — 요구사항 인터뷰 ���그

> **날짜:** 2026-04-13
> **인터뷰어:** Claude (req-interview 스킬)
> **인터뷰이:** Sinclair Seo (AX BD팀)
> **코드네임:** HyperFX

---

## Part 1: 왜 (목적/문제)

**Q: 이걸 만들려는 핵심 동기가 뭔가요?**
A: 복합 동기 — 실무 병목 해소 + 업계 트렌드 선제 반영 + 고객 데모 역량 확보

**Q: 가장 긴박한 것은?**
A: 실무 병목이 우선

**Q: 구체적으로 어떤 병목?**
A: 오케스트레이션 한계 — 현행 OrchestrationLoop가 피드백 루프(retry/adversarial/fix) 3모드만 지원하여 DAG 분기/병렬 실행이 불가

**Q: 구체적 사례는?**
A: AX BD 발굴/형상화 파이프라인에서 에이전트 간 조건부 분기/병렬 실행이 필요하나 현행 구조로는 구현 불가

### 정리
- **핵심 문제**: OrchestrationLoop의 오케스트레이션 한계
- **As-Is**: 피드백 루프 3모드만 — Graph 기반 DAG/분기/루프/병렬 미지원
- **To-Be**: 4-Layer Agent Stack (선언적 에이전트 + Graph 오케스트레이션 + 자기개선)
- **시급성**: 발굴/형상화 파이프라인이 조건부 분기를 못 해서 수동 처리 중

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q: 누가 사용하나요?**
A: 복합 사용자 — 개발자 + AX BD팀 + 고객

**Q: 주 사용자와 부 사용자 구분은?**
A: 1순위: 개발자 (Sinclair) — FX 플랫폼 에이전트 기반을 만드는 게 우선, 그 위에 BD팀/고객용 기능 구축

### 정리
- **주 사용자**: 개발자 (Sinclair) — 에이전트 인프라 구축
- **부 사용자 1**: AX BD팀 — 발굴/형상화 업무 자동화
- **부 사용자 2**: 고객 — 멀티에이전트 데모/제안
- **사용 환경**: PC, 개발자 (CLI + Web UI)

---

## Part 3: 무엇을 (범위/기능)

**Q: 이번 스코프 범위는?**
A: HyperFX 4-Layer Agent Stack 전체 — Walking Skeleton 접근 (각 레이어 최소 구현 후 점진적 확장)

**Q: Out-of-scope는?**
A: 외부 배포/연동 제외 — AgentCore 외부 배포, Bedrock/OpenAI 직접 연동, Swarm 자율 인계

### 정리
- **Must Have (Walking Skeleton)**:
  - L1 Infrastructure: 기존 Cloudflare Workers/D1/KV 활용
  - L2 Agent: defineTool(), AgentSpec YAML, Agent Loop, Hooks, TokenTracker
  - L3 Orchestration: GraphEngine (GraphBuilder + 조건부 라우팅), Agents-as-Tools, SteeringHandler
  - L4 Meta: DiagnosticCollector (6축 메트릭), MetaAgent (진단→제안), Human Approval
- **Out-of-scope**: AgentCore 외부 배포, Bedrock/OpenAI 직접 연동, Swarm 자율 인계

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**Q: 성공 기준은?**
A: 발굴 파이프라인 9단계 전체를 Graph로 정의하여 조건부 분기가 동작

**Q: MVP 최소 기준은?**
A: 9단계 Graph + 병렬 실행 + 실시간 스트리밍 — 3가지 모두 동작해야 MVP 통과

### 정리
- **성공 지표**: 발굴 9단계 Graph + 조건부 분기 + 병렬 실행 + 실시간 스트리밍 대시보드
- **MVP 기준**: 3가지 모두 동작 (Graph + 병렬 + 스트리밍)

---

## Part 5: 제약과 리소스 (현실 조건)

**Q: 시간/인력/기술 제약은?**
A: 1인 개발 + CF 인프라 기반

**Q: 기술 스택은?**
A: CF 외에 AWS/GCP 등 필요하면 확장 가능. LLM은 Claude Code 구독 계정(주) + OpenRouter(보조)

### 정리
- **인력**: 1인 개발 (Sinclair), Sprint 단위 점진
- **기술 스택**: TypeScript, Cloudflare Workers/D1/KV (확장 가능), Vite+React+RR7 (Web)
- **LLM**: Claude Code 구독(주) + OpenRouter(보조)
- **인프라 제약**: CF 기본이나 AWS/GCP 확장 가능

---

## 참조 분석 문서

1. `docs/specs/Deep Insight Multi-Agent Architecture/deep-insight-analysis.md` — AWS Deep Insight 3-Tier + Context Engineering
2. `docs/specs/Deep Insight Multi-Agent Architecture/strands-sdk-analysis-and-fx-plan.md` — Strands SDK GAP 분석 7건
3. `docs/specs/Deep Insight Multi-Agent Architecture/fx-agent-restructure-proposal.md` — HyperFX 4-Layer 완전 재구조화 제안
4. `docs/specs/FX-Skill-Agent-Architecture/FX-Skill-Agent-Architecture-v2.md` — 기존 Skill & Agent Architecture v2.1
5. `docs/specs/FX-Skill-Agent-Architecture/AX_BD팀_사업기획서_Skill_v0.5_260404.md` — 사업기획서 생성 스킬
