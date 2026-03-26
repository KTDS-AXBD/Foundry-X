# F218: Agent SDK Test Agent PoC

Anthropic Agent SDK(TypeScript)를 사용한 Test Agent PoC.
기존 F139 TestAgent(LLM 프롬프트 기반)와 비교 평가하여 본격 도입 여부를 판단.

## 사전 요구사항

- Node.js 20+
- `ANTHROPIC_API_KEY` 환경변수
- Claude CLI (`claude`) PATH에 설치 (Agent SDK 런타임)

## 설치

```bash
cd tools/test-agent-poc
pnpm install
```

## 사용법

### Agent SDK Test Agent 단독 실행

```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm poc -- packages/api/src/services/config-service.ts
```

### F139 vs Agent SDK 비교

```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm compare -- packages/api/src/services/config-service.ts
```

F139 API URL 지정 (기본: Workers 프로덕션):
```bash
pnpm compare -- packages/api/src/services/config-service.ts --api-url=http://localhost:8787/api
```

## 구조

```
src/
├── index.ts              # Agent SDK 진입점 — query() 호출
├── compare.ts            # F139 vs Agent SDK 비교 스크립트
├── types.ts              # 공통 타입
├── utils.ts              # 헬퍼 함수
└── agents/
    ├── test-writer.md    # Subagent: 테스트 작성 전문가
    ├── test-runner.md    # Subagent: 실행+수정 전문가
    └── test-reviewer.md  # Subagent: 품질 리뷰 (읽기 전용)
```

## Subagent 구성

| Agent | 역할 | 도구 |
|-------|------|------|
| test-writer | vitest 테스트 작성 | Read, Write, Glob, Grep |
| test-runner | 실행 + 실패 수정 (최대 3회) | Read, Edit, Bash |
| test-reviewer | 품질 리뷰 (읽기 전용) | Read, Glob, Grep |

## 비교 평가 기준

| 항목 | 가중치 |
|------|--------|
| 테스트 수 | 20% |
| 엣지케이스 커버리지 | 25% |
| 실행 성공률 | 25% |
| 생성 시간 | 15% |
| 비용 | 15% |

## 판정 기준

- Agent SDK 3개+ 항목 우위 → F219를 Strategy C (Subagent)로 진행
- F139 우위 → F219를 Strategy D (Superpowers)로 전환
- Agent SDK 비용 > $5 → 비용 최적화 후 재평가

## 참조

- [[FX-SPEC-PRD-TA-V1]] Test Agent PRD
- [[FX-ANLS-015]] AI Test/Review Agent 리서치
- [Agent SDK TypeScript](https://github.com/anthropics/claude-agent-sdk-typescript)
