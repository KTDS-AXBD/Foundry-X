---
name: tdd
description: "TDD 자동화 — Red→Green→Refactor 사이클 오케스트레이터. Use when: TDD, 테스트 먼저, test first, red green refactor. Triggers: tdd, TDD, test driven, 테스트 주도"
user-invocable: true
category: development
argument-hint: "{파일경로} | red {파일} | green {파일} | refactor {파일} | check {파일}"
---

# TDD 자동화 Skill

> Red → Green → Refactor. 테스트가 먼저, 구현은 그 다음.

## 서브커맨드

| 커맨드 | 동작 |
|--------|------|
| `/tdd {파일경로}` | 전체 R-G-R 사이클 실행 |
| `/tdd red {파일경로}` | RED만 — 실패하는 테스트 작성 |
| `/tdd green {파일경로}` | GREEN만 — 테스트 통과하는 최소 구현 |
| `/tdd refactor {파일경로}` | REFACTOR만 — 코드 품질 개선 |
| `/tdd check {파일경로}` | 테스트 커버리지 확인 (미커버 함수 리스트) |

---

## 실행 흐름

### 인자 파싱

1. 첫 번째 인자가 `red`, `green`, `refactor`, `check` 중 하나면 → 해당 단계만 실행
2. 그 외 → 전체 R-G-R 사이클 실행
3. 파일경로가 없으면 → AskUserQuestion으로 대상 파일 질문

### 사전 분석

대상 파일을 Read하고 아래를 추출한다:

1. **export된 함수/클래스** 목록 (public API)
2. **파일이 속한 패키지** (`packages/api/`, `packages/cli/`, `packages/web/`, `packages/shared/`)
3. **기존 테스트 파일** 존재 여부: `__tests__/{파일명}.test.ts` 확인
4. **테스트 패턴** 결정:
   - `packages/api/` → Hono `app.request()` + D1 mock (in-memory SQLite)
   - `packages/cli/` → ink-testing-library `render()` + `lastFrame()`
   - `packages/web/` → React Testing Library + vitest
   - `packages/shared/` → 순수 함수 테스트

---

## RED 단계

> 상세 규칙: `refs/red-phase.md`

1. 각 export 함수에 대해 테스트 작성:
   - **Happy path**: 정상 입력 → 기대 결과
   - **Edge case**: 빈 입력, 경계값, null/undefined
   - **Error case**: 잘못된 입력 → 에러 throw 또는 에러 응답
2. 테스트 파일 위치: `{소스디렉토리}/__tests__/{파일명}.test.ts`
3. 테스트 실행:
   ```bash
   pnpm test -- --grep "{테스트파일명}"
   ```
4. **반드시 실패 확인** — 실패하지 않으면 테스트가 충분히 엄격하지 않음
   - 아직 구현되지 않은 함수 → import 에러 또는 undefined
   - 이미 구현된 함수 → 더 엄격한 엣지케이스 추가

### RED 완료 조건
- [ ] 모든 export 함수에 대해 최소 1개 테스트 존재
- [ ] `pnpm test` 실행 시 새 테스트가 실패함
- [ ] 기존 테스트는 여전히 통과 (기존 코드 미변경)

---

## GREEN 단계

> 상세 규칙: `refs/green-phase.md`

1. RED에서 작성한 테스트를 통과하는 **최소 구현** 작성
2. YAGNI 원칙: 테스트가 요구하는 것만 구현
3. 테스트 실행:
   ```bash
   pnpm test -- --grep "{테스트파일명}"   # 새 테스트 통과 확인
   pnpm test                               # 전체 테스트 통과 확인
   ```
4. 기존 테스트가 깨지면 → 구현 수정 (기존 동작 보존)

### GREEN 완료 조건
- [ ] 새 테스트 전부 통과
- [ ] 기존 테스트 전부 통과
- [ ] `pnpm typecheck` 에러 없음

---

## REFACTOR 단계

> 상세 규칙: `refs/refactor-phase.md`

1. 코드 품질 개선:
   - DRY: 중복 코드 제거
   - 타입 안전성: `any` 제거, 적절한 타입
   - 네이밍: 의미 있는 변수/함수명
   - 에러 핸들링: 구조화된 에러 처리
2. 검증:
   ```bash
   pnpm test        # 전체 통과 유지
   pnpm typecheck   # 타입 에러 없음
   pnpm lint        # 린트 에러 없음
   ```
3. 리팩토링 후 테스트 실패 시 → 리팩토링 되돌리기

### REFACTOR 완료 조건
- [ ] 전체 테스트 통과
- [ ] typecheck 에러 없음
- [ ] lint 에러 없음
- [ ] `any` 타입 미사용

---

## CHECK 서브커맨드

`/tdd check {파일경로}` 실행 시:

1. 대상 파일의 export 함수 목록 추출
2. 기존 테스트 파일에서 테스트된 함수 목록 추출
3. 미커버 함수 리스트 출력:
   ```
   ## 테스트 커버리지 확인: {파일명}

   | 함수 | 테스트 | 상태 |
   |------|--------|------|
   | createFoo | foo.test.ts:15 | ✅ |
   | updateBar | — | ❌ 미커버 |
   | deleteBaz | — | ❌ 미커버 |

   커버리지: 1/3 (33%)
   ```

---

## 프로젝트 컨텍스트

이 스킬은 Foundry-X 모노리포(4개 패키지)에서 사용한다.

- **테스트 러너**: vitest 3.x
- **테스트 패턴**: `__tests__/{파일명}.test.ts`
- **import**: 상대 경로 (`../target-file`)
- **mock**: 외부 서비스만 mock, 내부 모듈은 실제 호출
- **API 테스트**: `app.request()` 직접 호출 (Hono 패턴)
- **fixture**: `test-data.ts` 중앙 factory (`make*()` + spread override)

---

## Gotchas

- `packages/api/` 테스트는 D1 mock이 필요 — `createTestApp()` 또는 `getTestDb()` 헬퍼 사용
- `packages/cli/` Ink 컴포넌트 테스트는 `render()` 후 `lastFrame()` 패턴
- RED 단계에서 import 에러가 나면 정상 — 아직 구현 전이니까
- `pnpm test`은 vitest run (watch 모드 아님)
- PostToolUse hook이 `.ts` 편집 시 eslint + typecheck를 자동 실행하므로, GREEN/REFACTOR에서 추가 실행 불필요할 수 있음
