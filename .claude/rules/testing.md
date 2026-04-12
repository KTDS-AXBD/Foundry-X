# Foundry-X Testing Rules

## Runner & Framework
- Runner: Vitest 3.x (`vitest.config.ts` per package)
- TSX 지원: `.test.tsx` 패턴, tsconfig `jsx: "react-jsx"`

## CLI UI 테스트
- ink-testing-library: `render()` → `lastFrame()` → assertion
- Mock 전략: Ink 컴포넌트는 실제 렌더링, 외부 서비스만 mock

## API 테스트
- Hono `app.request()` 직접 호출 (supertest 아님)
- D1 mock: in-memory SQLite (`better-sqlite3`)

## E2E 테스트
- Playwright (`packages/web/e2e/`), `pnpm e2e`로 실행
- Assertion 수준: smoke(title 확인)가 아닌 **functional**(badge/tag/link/content 검증)
- Skip 사유: 코드로 해결 불가한 skip은 Design 문서에 사유 기록

## Test Data
- 중앙 fixture factory: `test-data.ts` (CLI), `mock-factory.ts` (E2E)
- 패턴: `make*()` + spread override

## TDD 사이클 (Red-Green-Commit)
- 신규 F-item 서비스 로직과 E2E 시나리오에 적용
- 상세 절차: `.claude/rules/tdd-workflow.md` 참조 (SSOT)
- Claude Code 지시 패턴:
  - Red: "TDD Red phase — 테스트만 작성, 구현 금지"
  - 확인: "구현하지 말고 테스트만 실행해서 실패 확인"
  - Green: "이 테스트를 통과시키는 코드 작성, 테스트 수정 금지"
