---
code: FX-DSGN-074
title: "Sprint 74 — F219 TDD 자동화 CC Skill Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-074]] Sprint 74 Plan"
  - "[[FX-SPEC-PRD-TA-V1]] Test Agent PRD §4.3"
---

# Sprint 74 Design — F219 TDD 자동화 CC Skill

## 1. 개요

CC Skill로 TDD 사이클(Red→Green→Refactor)을 자동화한다.
기존 `.claude/skills/` 패턴(ax-bd-discovery)을 따르되, 개발 워크플로우에 특화된 구조를 설계한다.

## 2. 아키텍처

```
.claude/skills/tdd/
├── SKILL.md                 # 스킬 진입점 — 오케스트레이터 프롬프트
├── refs/
│   ├── red-phase.md         # RED 단계 상세 (테스트 작성 규칙)
│   ├── green-phase.md       # GREEN 단계 상세 (최소 구현 규칙)
│   └── refactor-phase.md    # REFACTOR 단계 상세 (품질 개선 규칙)
└── examples/
    └── service-tdd.md       # Foundry-X API 서비스 TDD 예시

.claude/hooks/
├── post-edit-format.sh      # 기존 — eslint --fix
├── post-edit-typecheck.sh   # 기존 — tsc --noEmit
└── post-edit-test-warn.sh   # 신규 — .test.ts 존재 경고
```

## 3. 상세 설계

### 3.1 SKILL.md 구조

```yaml
---
name: tdd
description: |
  TDD 자동화 — Red→Green→Refactor 사이클 오케스트레이터.
  소스 파일을 분석하여 실패 테스트 작성 → 최소 구현 → 리팩토링을 자동화.
  Use when: TDD, 테스트 먼저, test first, red green refactor
  Triggers: tdd, TDD, test driven, 테스트 주도, red green
  Do NOT use for: E2E 테스트, 기존 테스트 수정, 테스트 삭제
user-invocable: true
category: development
argument-hint: "{파일경로} | red {파일} | green {파일} | refactor {파일} | check {파일}"
---
```

**서브커맨드 분기:**

| 인자 패턴 | 동작 |
|-----------|------|
| `{파일경로}` (단독) | 전체 R-G-R 사이클 |
| `red {파일경로}` | RED만 — 실패 테스트 작성 |
| `green {파일경로}` | GREEN만 — 최소 구현 |
| `refactor {파일경로}` | REFACTOR만 — 품질 개선 |
| `check {파일경로}` | 커버리지 확인 (테스트 실행 + 미커버 함수 리스트) |

### 3.2 RED Phase (refs/red-phase.md)

**규칙:**

1. 대상 파일의 export된 함수/클래스/타입 목록 추출
2. 각 함수에 대해:
   - 정상 케이스 (happy path) 테스트 1개+
   - 엣지 케이스 (빈 입력, null, 경계값) 테스트 1개+
   - 에러 케이스 (잘못된 입력, 예외) 테스트 1개+
3. 테스트 파일 위치: 소스 파일과 같은 디렉토리의 `__tests__/{파일명}.test.ts`
4. `pnpm test -- --grep {테스트파일}` 실행 → **반드시 실패 확인**
5. 실패하지 않으면: 구현이 이미 존재하는 경우 → 더 엄격한 테스트 추가

**테스트 패턴 (vitest):**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { targetFunction } from '../target-file';

describe('targetFunction', () => {
  it('정상: 유효 입력 → 기대 결과', () => { /* ... */ });
  it('엣지: 빈 입력 → 기본값 반환', () => { /* ... */ });
  it('에러: 잘못된 입력 → 에러 throw', () => { /* ... */ });
});
```

**프로젝트별 패턴 감지:**
- `packages/api/` → Hono `app.request()` + D1 mock 패턴
- `packages/cli/` → ink-testing-library `render()` + `lastFrame()`
- `packages/web/` → React Testing Library
- `packages/shared/` → 순수 함수 테스트

### 3.3 GREEN Phase (refs/green-phase.md)

**규칙:**

1. RED에서 작성한 테스트를 통과하는 **최소 구현** 작성
2. "최소"의 정의:
   - 테스트가 요구하는 것만 구현
   - 향후 필요할 수 있는 기능 추가 금지 (YAGNI)
   - 하드코딩도 허용 (Refactor에서 개선)
3. `pnpm test` 실행 → **전체 테스트 통과 확인** (새 테스트 + 기존 테스트)
4. 기존 테스트가 깨지면 → 구현 수정 (기존 동작 보존 원칙)

### 3.4 REFACTOR Phase (refs/refactor-phase.md)

**규칙:**

1. GREEN에서 통과한 코드의 품질 개선:
   - DRY: 중복 코드 제거
   - 타입 안전성: `any` 제거, 적절한 타입 추가
   - 에러 핸들링: try-catch 구조화
   - 네이밍: 의미 있는 변수/함수명
2. `pnpm test` 재실행 → **여전히 전체 통과**
3. `pnpm typecheck` → 에러 없음
4. `pnpm lint` → 에러 없음
5. 리팩토링 후 테스트 실패 시 → 리팩토링 rollback

### 3.5 PostToolUse Hook (post-edit-test-warn.sh)

**동작:**
1. `.ts`/`.tsx` 파일 Edit/Write 이벤트 감지
2. 파일 경로에서 대응 테스트 파일 경로 계산:
   - `src/services/foo.ts` → `src/services/__tests__/foo.test.ts`
   - `src/routes/bar.ts` → `src/routes/__tests__/bar.test.ts`
3. 테스트 파일 미존재 시 → stderr에 경고 출력
4. `exit 0` (차단하지 않음)

**제외 패턴:**
- `*.test.ts`, `*.spec.ts` — 테스트 파일 자체
- `*.d.ts` — 타입 선언
- `index.ts` — 배럴 파일
- `types.ts` — 순수 타입 파일
- `__tests__/` 하위 파일

### 3.6 settings.json 수정

기존 PostToolUse hooks 배열에 새 hook 추가:

```json
{
  "type": "command",
  "command": "bash .claude/hooks/post-edit-test-warn.sh",
  "timeout": 5000,
  "statusMessage": "test coverage check"
}
```

## 4. 검증 계획

| # | 항목 | 방법 | 기대 결과 |
|---|------|------|----------|
| 1 | SKILL.md frontmatter 유효성 | YAML 파싱 | 에러 없음 |
| 2 | 서브커맨드 분기 | SKILL.md 내 조건문 검토 | 5개 서브커맨드 커버 |
| 3 | RED 단계 테스트 작성 | refs/red-phase.md 규칙 준수 여부 | vitest 패턴 준수 |
| 4 | Hook 경고 동작 | `.ts` 파일 write → 테스트 미존재 시 경고 | exit 0 + 메시지 |
| 5 | Hook 제외 패턴 | `.test.ts`, `.d.ts` 등 write → 경고 없음 | exit 0 + 무출력 |
| 6 | 기존 hooks 공존 | format + typecheck + test-warn 순차 실행 | 3개 hook 정상 동작 |

## 5. 구현 매핑

단일 구현 (Worker 병렬 불필요 — 파일 7개, 모두 독립 텍스트 파일):

| # | 파일 | 작업 |
|---|------|------|
| 1 | `.claude/skills/tdd/SKILL.md` | 신규 생성 — 오케스트레이터 프롬프트 |
| 2 | `.claude/skills/tdd/refs/red-phase.md` | 신규 생성 — RED 규칙 |
| 3 | `.claude/skills/tdd/refs/green-phase.md` | 신규 생성 — GREEN 규칙 |
| 4 | `.claude/skills/tdd/refs/refactor-phase.md` | 신규 생성 — REFACTOR 규칙 |
| 5 | `.claude/skills/tdd/examples/service-tdd.md` | 신규 생성 — 예시 |
| 6 | `.claude/hooks/post-edit-test-warn.sh` | 신규 생성 — Hook |
| 7 | `.claude/settings.json` | 수정 — Hook 등록 |
