---
code: FX-PLAN-038
title: "Sprint 38 — SecurityAgent + QAAgent (F140+F141)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-38
sprint: 38
phase: "Phase 5a"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F140: SecurityAgent + F141: QAAgent |
| Sprint | 38 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — F138 ArchitectAgent + F139 TestAgent 후속) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 신규 서비스 | 2개 (SecurityAgent, QAAgent) |
| 신규 테스트 | 30개+ |
| AgentTaskType 추가 | 2종 (security-review, qa-testing) |
| 기존 테스트 회귀 | 0건 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트가 설계/테스트 분석까지 확장됐지만, 보안 취약점 스캔과 QA 테스트는 여전히 수동. OWASP Top 10 점검 없이 PR이 머지되고, UI 회귀는 E2E만으로 커버 |
| **Solution** | F140: SecurityAgent — OWASP Top 10 기반 코드 스캔 + PR diff 보안 분석 + 인증/인가 패턴 검증. F141: QAAgent — 수용 기준 검증 + 회귀 감지 + 브라우저 테스트 시나리오 생성 |
| **Function UX Effect** | PR에서 보안 취약점 자동 경고 + QA 체크리스트 자동 생성. SecurityAgent가 diff 분석 시 injection/XSS/auth 패턴 자동 검출 |
| **Core Value** | F136 ModelRouter로 SecurityAgent=보안 전문 모델, QAAgent=실용 모델 자동 배정. 6종 역할 에이전트 완성(Reviewer+Planner+Architect+Test+Security+QA) |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F140 — SecurityAgent:**
- `SecurityAgent` 서비스 구현 — LLM 기반 보안 분석 전문 에이전트
- `scanVulnerabilities(request)` — 소스 파일 기반 OWASP Top 10 취약점 스캔
- `analyzePRDiff(diff, context)` — PR diff 보안 영향 분석
- `checkOWASPCompliance(files)` — 인증/인가/암호화 패턴 적합성 검증
- Orchestrator 위임: `security-review` taskType → SecurityAgent 라우팅

**F141 — QAAgent:**
- `QAAgent` 서비스 구현 — LLM 기반 QA 테스트 전문 에이전트
- `runBrowserTest(request)` — 브라우저 테스트 시나리오 생성 (Playwright 코드)
- `validateAcceptanceCriteria(spec, files)` — 수용 기준 충족 여부 검증
- `detectRegressions(changes, existingTests)` — 기존 테스트 회귀 위험 분석
- Orchestrator 위임: `qa-testing` taskType → QAAgent 라우팅

### 1.2 범위 제한
- DB 저장 없음 — 분석 결과는 API 응답으로만 반환
- ArchitectAgent/TestAgent 패턴(Sprint 37) 100% 준수
- 실제 브라우저 실행 없음 — QAAgent는 테스트 코드 생성만 담당

## 2. 기술 설계 요약

### 2.1 파일 구조
```
packages/api/src/services/
├── security-agent.ts         # SecurityAgent 서비스
├── security-agent-prompts.ts # 보안 분석 프롬프트 3종
├── qa-agent.ts              # QAAgent 서비스
└── qa-agent-prompts.ts      # QA 테스트 프롬프트 3종

packages/api/src/__tests__/
├── security-agent.test.ts    # SecurityAgent 테스트 15개+
└── qa-agent.test.ts          # QAAgent 테스트 15개+

packages/api/src/
├── routes/agent.ts           # 4개 엔드포인트 추가
├── schemas/agent.ts          # Security + QA 스키마
└── services/
    ├── execution-types.ts    # "security-review" | "qa-testing" 추가
    └── agent-orchestrator.ts # 위임 블록 2개 추가
```

### 2.2 API 엔드포인트

| Method | Path | 용도 |
|--------|------|------|
| POST | /agents/security/scan | OWASP 취약점 스캔 |
| POST | /agents/security/pr-diff | PR diff 보안 분석 |
| POST | /agents/qa/browser-test | 브라우저 테스트 시나리오 생성 |
| POST | /agents/qa/acceptance | 수용 기준 검증 |

## 3. 위험 및 의존성

| 위험 | 대응 |
|------|------|
| LLM 보안 분석 정확도 | 프롬프트에 OWASP Top 10 카테고리 명시 + false positive 최소화 지침 |
| QA 시나리오 품질 | Playwright 코드 생성은 참조용 — 직접 실행은 후속 Sprint |
| execution-types.ts 변경 | 기존 7종 + 신규 2종, 하위 호환 유지 |
