# Foundry-X TDD Workflow

> Red-Green-Commit: Anthropic 권장 TDD 사이클
> 이 파일이 TDD 규칙의 SSOT — testing.md, sdd-triangle.md는 참조만

## 적용 범위

| 등급 | 대상 | TDD 적용 |
|------|------|---------|
| **필수** | 새 F-item 서비스 로직 (api) | Red→Green 풀 사이클 |
| **권장** | 새 E2E 시나리오, CLI UI 컴포넌트, Web 컴포넌트 | 가능하면 Red 먼저 |
| **선택** | 리팩토링, 버그픽스 | 회귀 테스트만 |
| **면제** | shared 타입, D1 migration, meta-only, docs, P0 Hotfix, 1-line 버그픽스 | 해당 없음 |

## Red Phase (테스트만 작성)

### 원칙
- F-item의 REQ 명세에서 **입력/출력**을 추출하여 테스트 작성
- 구현 파일은 빈 export(stub)만 허용 — 로직 zero
- `describe` 블록에 F-item 번호 주석 필수
- Claude에게 지시할 때: **"TDD Red phase — 테스트만 작성하고 구현은 하지 마"**

### 실패 확인 필수
- `vitest run <파일> --reporter=verbose` 로 FAIL 확인
- 만약 PASS라면 assertion이 무의미 — 재검토
- Claude에게: **"구현은 하지 말고 테스트만 실행해서 실패하는지 확인해"**

### Red 커밋 규칙
- 메시지: `test(scope): F### red — describe what's tested`
- 이 커밋이 "테스트 계약" — 이후 Green에서 이 계약을 충족시킴

## Green Phase (구현 작성)

### 원칙
- **테스트 파일 수정 금지** — 실패하면 구현 쪽을 고침
- 최소한의 구현으로 테스트 통과 (과잉 구현 금지)
- Claude에게: **"이 테스트를 통과시키는 코드를 작성해. 테스트는 수정하지 마"**

### 과적합 검증 (선택)
- Green 통과 후 서브에이전트로 검증:
  **"이 테스트가 구현에 과적합되어 있지 않은지 검증해. edge case, 음수 케이스, 경계값 부족한 부분 알려줘"**
- 부족하면 새 Red 사이클 추가

### Green 커밋 규칙
- 메시지: `feat(scope): F### green — describe implementation`

## E2E Red Phase 특칙

- Playwright `page.route()` mock 설정은 "테스트 인프라"로 간주하여 Red Phase에서 허용
- "구현 zero"의 범위 = React 컴포넌트/라우트 파일이 존재하면 안 됨 (mock은 예외)
- E2E 실행: `cd packages/web && pnpm e2e --grep '<pattern>'`

## 예외 정책

| 상황 | 적용 | 근거 |
|------|------|------|
| P0 Hotfix (프로덕션 장애) | 면제 | 즉시 대응 우선. 회귀 테스트만 사후 추가 |
| Legacy 대규모 리팩토링 | 선택 | 기존 코드 Red 작성 비효율. 회귀 테스트 대체 |
| 1-line 버그픽스 | 면제 | 오버헤드 > 이득. 회귀 테스트 1건만 |

## Git Workflow 연동
- Red + Green 커밋은 같은 feature 브랜치
- PR은 squash merge → 최종 1커밋이지만 브랜치 내 이력은 Red→Green 순서 유지
- meta-only 규칙 불변: .claude/rules, docs 등은 master 직접 push
