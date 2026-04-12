---
code: FX-PLAN-073
title: "Sprint 73 — F218 Agent SDK Test Agent PoC"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo
references:
  - "[[FX-SPEC-PRD-TA-V1]] Test Agent 활성화 + TDD 자동화 PRD §3.1"
  - "[[FX-ANLS-015]] AI Test/Review Agent 리서치 보고서"
---

# FX-PLAN-073: Sprint 73 — F218 Agent SDK Test Agent PoC

## 1. 개요

Anthropic Agent SDK(TypeScript)를 사용해 Test Agent PoC를 구현하고, 기존 F139 TestAgent(LLM 프롬프트 기반)와 비교 평가하여 본격 도입 여부를 판단하는 Sprint.

### 1.1 F-Item

| F# | 제목 | REQ | 우선순위 |
|----|------|-----|----------|
| F218 | Agent SDK Test Agent PoC | FX-REQ-210 | P2 |

### 1.2 목표

1. `tools/test-agent-poc/` 디렉토리에 Agent SDK 기반 Test Agent 구현
2. 3개 Subagent (Test Writer / Test Runner / Test Reviewer) 구성
3. 동일 소스 파일에 대해 F139 TestAgent vs Agent SDK 품질 비교
4. 비교 결과를 FX-ANLS 문서로 작성 — F219 진행 여부 판단 근거

### 1.3 성공 기준

| 기준 | 측정 |
|------|------|
| vitest 파일 1개 이상 자동 생성 + 통과 | PoC 실행 결과 |
| F139 vs Agent SDK 비교 메트릭 산출 | 테스트 수, 엣지케이스, 성공률, 시간, 비용 |
| 비교 분석 보고서 작성 | FX-ANLS-016 문서 |

## 2. 스코프

### 2.1 In-Scope

| # | 항목 | 설명 |
|---|------|------|
| 1 | PoC 프로젝트 구조 | `tools/test-agent-poc/` — package.json, tsconfig, src/ |
| 2 | Agent SDK 진입점 | `src/index.ts` — `query()` 호출로 Test Agent 실행 |
| 3 | Subagent 정의 | test-writer, test-runner, test-reviewer 3종 |
| 4 | 비교 스크립트 | `src/compare.ts` — F139 API vs Agent SDK 결과 비교 |
| 5 | 비교 분석 보고서 | `docs/03-analysis/FX-ANLS-016_agent-sdk-test-agent-poc.md` |

### 2.2 Out-of-Scope

| 항목 | 이유 |
|------|------|
| Web UI 연동 | F217 (Sprint 72) 스코프 |
| CI/CD 파이프라인 통합 | F219 이후 판단 |
| 프로덕션 배포 | PoC 단계 — 로컬 실행만 |

## 3. 기술 설계 방향

### 3.1 디렉토리 구조

```
tools/test-agent-poc/
├── package.json              # @anthropic-ai/claude-agent-sdk 의존성
├── tsconfig.json
├── src/
│   ├── index.ts              # 진입점 — Agent SDK query() 호출
│   ├── agents/
│   │   ├── test-writer.md    # Subagent: 테스트 코드 작성
│   │   ├── test-runner.md    # Subagent: 테스트 실행+수정
│   │   └── test-reviewer.md  # Subagent: 품질 리뷰 (읽기 전용)
│   ├── compare.ts            # F139 vs Agent SDK 비교
│   └── types.ts              # 공통 타입
├── results/                  # 실행 결과 저장 (gitignore)
└── README.md
```

### 3.2 Agent SDK 활용 패턴

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: `${targetFile}에 대한 vitest 테스트를 작성하고 실행해줘`,
  options: {
    allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent"],
    permissionMode: "acceptEdits",
    cwd: projectRoot,
    agents: {
      "test-writer": { /* 테스트 작성 전문 */ },
      "test-runner": { /* 실행+수정 전문 */ },
      "test-reviewer": { /* 읽기 전용 품질 리뷰 */ },
    }
  }
})) { /* stream processing */ }
```

### 3.3 비교 평가 매트릭스

| 항목 | F139 TestAgent | Agent SDK Test Agent |
|------|---------------|---------------------|
| 테스트 생성 | API → JSON 파싱 | query() → 파일 직접 생성 |
| 테스트 실행 | 불가 (코드만 반환) | Bash 도구로 vitest 실행 |
| 자동 수정 | 불가 | Edit 도구로 실패 테스트 수정 |
| 비용 | API 1회 | Agent 세션 (다수 호출) |

## 4. 작업 분해

| # | 작업 | 예상 산출물 | 예상 시간 |
|---|------|-----------|----------|
| 1 | PoC 프로젝트 scaffolding | package.json, tsconfig, 디렉토리 | 5분 |
| 2 | Agent SDK 진입점 구현 | src/index.ts | 15분 |
| 3 | Subagent 프롬프트 작성 | agents/*.md 3개 | 10분 |
| 4 | 비교 스크립트 구현 | src/compare.ts, src/types.ts | 15분 |
| 5 | README 작성 | README.md | 5분 |
| 6 | 비교 분석 보고서 | FX-ANLS-016 | 10분 |

## 5. 리스크

| ID | 리스크 | 영향 | 완화 |
|----|--------|------|------|
| R1 | Agent SDK 패키지 설치 실패 | 높 | npm registry 확인, 버전 고정 |
| R2 | API Key 없이 PoC 실행 불가 | 중 | ANTHROPIC_API_KEY 환경변수 가이드 |
| R3 | Agent SDK가 PoC 환경에서 vitest 파일 생성 실패 | 중 | 수동 실행 가이드 + 결과 템플릿 준비 |

## 6. 의존성

- **선행**: 없음 (F217 완료 불요 — PoC는 독립적)
- **후행**: F219 (TDD 자동화 CC Skill) — PoC 결과에 따라 Strategy C/D 선택
