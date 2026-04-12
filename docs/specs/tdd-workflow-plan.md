# Foundry-X TDD Workflow 도입 작업 계획서

> **목적**: Anthropic 내부 TDD 패턴(Red→Green→Commit)을 Foundry-X에 체계적으로 도입
> **작성일**: 2026-04-12 | **대상 환경**: WSL + Claude Code
> **적용 시점**: 다음 Sprint(S262~)부터 F-item 신규 개발에 적용

---

## 1. 현황 요약

| 항목 | 현재 상태 |
|------|----------|
| 테스트 총 파일 수 | 514 (unit/integration) + 54 (E2E) |
| 프레임워크 | Vitest 3.x + Playwright 1.58 |
| 테스트 데이터 | make*() 팩토리 패턴 (test-data.ts, mock-factory.ts) |
| TDD 적용 | 부분적 — 체계적 강제 메커니즘 없음 |
| shared 패키지 | 테스트 0개 (타입 의존) |

**핵심 갭**: 테스트-먼저(test-first) 커밋 분리가 규칙화되지 않음. 구현과 테스트가 같은 커밋에 섞이는 경우가 다수.

---

## 2. 도입할 TDD 사이클: Red-Green-Commit

Anthropic이 Claude Code에서 권장하는 정확한 흐름:

```
┌─────────────────────────────────────────────────────┐
│  SPEC.md F-item 등록 (기존 SDD Triangle 유지)       │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ① Red: 테스트만 작성 (구현 코드 zero)              │
│     → vitest run --reporter=verbose 으로 FAIL 확인  │
│     → 만족하면 커밋: test(scope): F### red — ...    │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ② Green: 테스트 통과시키는 최소 구현               │
│     → 테스트 파일 수정 금지                          │
│     → vitest run 으로 PASS 확인                     │
│     → 커밋: feat(scope): F### green — ...           │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ③ Refactor (선택): 구현 정리, 테스트 여전히 PASS   │
│     → 커밋: refactor(scope): F### — ...             │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  ④ PR → --auto --squash (기존 git-workflow 유지)    │
└─────────────────────────────────────────────────────┘
```

---

## 3. 작업 항목 (WSL Claude Code에서 실행)

### 작업 A: `.claude/rules/tdd-workflow.md` 신규 생성

아래 내용을 그대로 파일로 생성:

```markdown
# Foundry-X TDD Workflow

> Red-Green-Commit: Anthropic 권장 TDD 사이클

## 적용 범위

| 등급 | 대상 | TDD 적용 |
|------|------|---------|
| **필수** | 새 F-item 서비스 로직 (api), 새 E2E 시나리오 | Red→Green 풀 사이클 |
| **권장** | CLI UI 컴포넌트, Web 컴포넌트 | 가능하면 Red 먼저 |
| **선택** | D1 마이그레이션, 리팩토링, 버그픽스 | 회귀 테스트만 |
| **면제** | shared 타입, meta-only, docs | 해당 없음 |

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

## Git Workflow 연동
- Red + Green 커밋은 같은 feature 브랜치
- PR은 squash merge → 최종 1커밋이지만 브랜치 내 이력은 Red→Green 순서 유지
- meta-only 규칙 불변: .claude/rules, docs 등은 master 직접 push
```

---

### 작업 B: `testing.md` 에 TDD 섹션 추가

기존 내용 하단에 아래 추가:

```markdown
## TDD 사이클 (Red-Green-Commit)
- 신규 F-item 서비스 로직과 E2E 시나리오에 필수 적용
- 상세 절차: `.claude/rules/tdd-workflow.md` 참조
- Claude Code 지시 패턴:
  - Red: "TDD Red phase — 테스트만 작성, 구현 금지"
  - 확인: "구현하지 말고 테스트만 실행해서 실패 확인"
  - Green: "이 테스트를 통과시키는 코드 작성, 테스트 수정 금지"
```

---

### 작업 C: `sdd-triangle.md` 에 TDD 순서 원칙 추가

기존 "F-item 등록 선행 원칙" 뒤에 아래 추가:

```markdown
## TDD 순서 원칙
- SPEC 등록 → Red(테스트) → Green(구현) → Gap Analysis
- Spec↔Code↔Test 동기화의 **순서**를 명시: Test가 Code보다 먼저
- 상세: `.claude/rules/tdd-workflow.md`
```

---

## 4. 패키지별 TDD 구체적 사례

### 4-1. API 서비스 테스트 (필수 적용)

**시나리오**: `F510 — 새 워크스페이스 초대 API` (가상 예시)

#### Red Phase — 테스트만 작성

```typescript
// packages/api/src/__tests__/workspace-invite.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// ─── F510: Workspace Invite API (Red) ───
describe("POST /api/orgs/:orgId/invites", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
  });

  it("201 — 유효한 이메일로 초대 생성", async () => {
    const res = await app.request("/api/orgs/org_test/invites", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", role: "member" }),
    }, env);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toMatchObject({
      email: "new@example.com",
      role: "member",
      status: "pending",
    });
  });

  it("400 — 이메일 형식 불량", async () => {
    const res = await app.request("/api/orgs/org_test/invites", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", role: "member" }),
    }, env);

    expect(res.status).toBe(400);
  });

  it("403 — viewer 권한으로 초대 불가", async () => {
    const viewerHeaders = await createAuthHeaders({
      orgId: "org_test",
      orgRole: "viewer",
    });

    const res = await app.request("/api/orgs/org_test/invites", {
      method: "POST",
      headers: { ...viewerHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", role: "member" }),
    }, env);

    expect(res.status).toBe(403);
  });

  it("409 — 이미 초대된 이메일", async () => {
    // 첫 번째 초대
    await app.request("/api/orgs/org_test/invites", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com", role: "member" }),
    }, env);

    // 중복 초대
    const res = await app.request("/api/orgs/org_test/invites", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com", role: "member" }),
    }, env);

    expect(res.status).toBe(409);
  });
});
```

**Claude Code 세션 흐름:**

```bash
# WSL Claude Code 에서의 실제 대화 흐름

## 1단계: Red Phase 지시
You: "F510 워크스페이스 초대 API를 TDD로 개발할 거야.
      Red phase — POST /api/orgs/:orgId/invites 의 테스트만 작성해.
      REQ는: 유효한 초대 생성(201), 이메일 검증(400), 권한 체크(403), 중복 방지(409).
      구현 코드는 작성하지 마."

## 2단계: 실패 확인 지시
You: "구현은 하지 말고 테스트만 실행해서 실패하는지 확인해.
      cd packages/api && pnpm vitest run src/__tests__/workspace-invite.test.ts --reporter=verbose"

## 3단계: Red 커밋 (사람이 확인 후)
You: "테스트 괜찮아. Red 커밋해줘.
      test(api): F510 red — workspace invite API 테스트 계약"

## 4단계: Green Phase 지시
You: "이제 Green phase — 이 테스트를 통과시키는 최소 구현을 작성해.
      라우트는 packages/api/src/routes/org-invites.ts,
      서비스는 packages/api/src/services/invite-service.ts.
      테스트는 수정하지 마."

## 5단계: Green 확인
You: "테스트 다시 실행해서 전부 통과하는지 확인해."

## 6단계: (선택) 과적합 검증
You: "서브에이전트로 검증해줘 — 이 테스트가 구현에 과적합되어 있지 않은지.
      edge case나 경계값 테스트가 부족한 부분 알려줘."

## 7단계: Green 커밋
You: "통과 확인. Green 커밋해줘.
      feat(api): F510 green — workspace invite API 구현"

## 8단계: PR
You: "PR 만들어줘. --auto --squash"
```

---

### 4-2. E2E 테스트 (필수 적용)

**시나리오**: `F510 — 초대 관리 페이지 E2E`

#### Red Phase — Playwright spec만 작성

```typescript
// packages/web/e2e/workspace-invite.spec.ts
import { test, expect } from "./fixtures/auth.js";
import { makeBizItem } from "./fixtures/mock-factory.js";

// ─── F510: Workspace Invite E2E (Red) ───
test.describe("워크스페이스 초대 관리", () => {

  test("초대 목록이 표시된다", async ({ authenticatedPage: page }) => {
    // API mock: 초대 목록 응답
    await page.route("**/api/orgs/*/invites", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "inv-1", email: "a@test.com", role: "member", status: "pending" },
          { id: "inv-2", email: "b@test.com", role: "admin", status: "accepted" },
        ]),
      })
    );

    await page.goto("/settings/invites");

    // 초대 카드가 2개 렌더링
    const cards = page.locator("[data-testid='invite-card']");
    await expect(cards).toHaveCount(2);

    // pending 배지 표시
    await expect(page.getByText("pending")).toBeVisible();
    await expect(page.getByText("accepted")).toBeVisible();
  });

  test("새 초대 폼 제출 시 목록에 추가된다", async ({ authenticatedPage: page }) => {
    await page.route("**/api/orgs/*/invites", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, body: JSON.stringify([]) });
      }
      // POST → 성공
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "inv-new", email: "new@test.com", role: "member", status: "pending",
        }),
      });
    });

    await page.goto("/settings/invites");
    await page.getByLabel("이메일").fill("new@test.com");
    await page.getByRole("button", { name: "초대" }).click();

    // 새 카드가 목록에 추가됨
    await expect(page.getByText("new@test.com")).toBeVisible({ timeout: 5000 });
  });

  test("잘못된 이메일 입력 시 에러 메시지", async ({ authenticatedPage: page }) => {
    await page.route("**/api/orgs/*/invites", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([]) })
    );

    await page.goto("/settings/invites");
    await page.getByLabel("이메일").fill("not-valid");
    await page.getByRole("button", { name: "초대" }).click();

    await expect(page.getByText(/유효한 이메일/)).toBeVisible();
  });
});
```

**Claude Code 세션:**

```bash
You: "F510 초대 관리 페이지 E2E를 TDD로 작성할 거야.
      Red phase — 초대 목록 표시, 새 초대 폼 제출, 이메일 검증 3개 시나리오.
      mock-factory 패턴으로 page.route 사용해. 구현은 하지 마."

You: "E2E 실행해서 실패 확인해.
      cd packages/web && pnpm e2e --grep 'workspace invite'"

You: "Red 커밋. test(e2e): F510 red — workspace invite 관리 페이지 E2E"

You: "Green phase — 라우트, 컴포넌트, API 연동 코드 작성해.
      테스트 spec은 수정하지 마."
```

---

### 4-3. CLI UI 테스트 (권장 적용)

**시나리오**: `F510 — 초대 상태 TUI 컴포넌트`

#### Red Phase

```tsx
// packages/cli/src/ui/__tests__/InviteStatus.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { InviteStatus } from "../components/InviteStatus.js";

// ─── F510: InviteStatus TUI Component (Red) ───
describe("InviteStatus", () => {
  it("pending 상태를 노란색으로 표시", () => {
    const { lastFrame } = render(
      <InviteStatus email="a@test.com" status="pending" role="member" />
    );
    expect(lastFrame()).toContain("a@test.com");
    expect(lastFrame()).toContain("pending");
    expect(lastFrame()).toContain("member");
  });

  it("accepted 상태를 초록색으로 표시", () => {
    const { lastFrame } = render(
      <InviteStatus email="b@test.com" status="accepted" role="admin" />
    );
    expect(lastFrame()).toContain("accepted");
  });

  it("이메일이 길면 말줄임 처리", () => {
    const longEmail = "verylongemailaddressthatexceedsnormallength@example.com";
    const { lastFrame } = render(
      <InviteStatus email={longEmail} status="pending" role="member" />
    );
    const frame = lastFrame() ?? "";
    // 전체 이메일이 아닌 축약형 표시
    expect(frame.length).toBeLessThan(longEmail.length + 30);
  });
});
```

**Claude Code 세션:**

```bash
You: "F510 InviteStatus Ink 컴포넌트를 TDD로.
      Red — pending/accepted 상태 렌더링, 긴 이메일 말줄임 처리 테스트.
      컴포넌트는 빈 export만 만들어."

You: "vitest run 으로 실패 확인. 구현은 하지 마."

You: "Red 커밋. test(cli): F510 red — InviteStatus 컴포넌트 TUI 테스트"

You: "Green — ink-testing-library 테스트를 통과하는 InviteStatus 컴포넌트 구현.
      테스트 파일 수정 금지."
```

---

## 5. 과적합 검증 패턴

Green phase 완료 후 서브에이전트에게 요청하는 프롬프트:

```bash
You: "서브에이전트로 이 테스트의 품질을 검증해줘:

      1. 과적합 체크 — 구현의 내부 로직에 의존하는 assertion이 있는지?
         (예: 특정 변수명, 호출 순서에 의존)
      2. 누락된 edge case — 빈 입력, null, 경계값, 음수 케이스
      3. 에러 경로 — 네트워크 에러, 타임아웃, 동시성 문제
      4. 계약 충분성 — REQ 명세의 모든 조건이 테스트에 반영되었는지

      파일: packages/api/src/__tests__/workspace-invite.test.ts
      REQ: 201 생성, 400 검증, 403 권한, 409 중복"
```

---

## 6. 적용 등급 상세 가이드

### 필수 (새 F-item 서비스 + E2E)

**왜**: 서비스 로직은 입력/출력이 명확해서 TDD 효과가 가장 큼.
Claude는 명확한 타겟(테스트 케이스)이 있을 때 가장 잘 작동.

```
적용 패턴:
  REQ에서 HTTP status code + response shape 추출
  → Red: 각 status code별 it() 블록
  → Green: 라우트 + 서비스 구현
```

### 권장 (CLI UI + Web 컴포넌트)

**왜**: 렌더링 결과가 예측 가능해서 Red 작성이 자연스러움.

```
적용 패턴:
  컴포넌트의 props 타입에서 경우의 수 추출
  → Red: 각 props 조합별 렌더링 결과 assertion
  → Green: 컴포넌트 구현
```

### 선택 (버그픽스, 리팩토링)

**왜**: 기존 코드가 있어서 Red를 먼저 쓰기 어려움. 대신 회귀 테스트 추가.

```
적용 패턴:
  버그 재현 테스트 작성 (이것이 Red)
  → 버그 수정 (이것이 Green)
  → 커밋은 한번에 해도 무방
```

### 면제 (shared 타입, meta, docs)

**왜**: 런타임 로직이 없어서 TDD 대상이 아님.
shared는 TypeScript strict mode가 실질적 "테스트".

---

## 7. Git Workflow 연동

기존 `git-workflow.md` 규칙과 충돌 없이 통합:

```
기존 흐름:
  feature 브랜치 → commit → push → gh pr create → --auto --squash

TDD 흐름 (브랜치 내부):
  feature 브랜치 → [Red 커밋] → [Green 커밋] → [Refactor 커밋] → push → PR

최종 결과:
  squash merge 되므로 master에는 1커밋
  but 브랜치 이력에 Red→Green 순서가 남아있어 나중에 참조 가능
```

**커밋 메시지 컨벤션:**

```
# Red Phase
test(api): F510 red — workspace invite 테스트 계약 (201/400/403/409)
test(e2e): F510 red — invite 관리 페이지 시나리오 3건

# Green Phase
feat(api): F510 green — workspace invite 라우트+서비스 구현
feat(web): F510 green — invite 관리 페이지 컴포넌트

# Refactor (선택)
refactor(api): F510 — invite-service 에러 핸들링 정리
```

---

## 8. 실행 체크리스트

WSL Claude Code 세션에서 아래 순서대로 진행:

### Phase 1: 규칙 파일 생성 (meta-only → master 직접 push)

```bash
# 1. tdd-workflow.md 생성 (이 계획서 §3 작업A 내용)
# 2. testing.md 수정 (§3 작업B 내용)
# 3. sdd-triangle.md 수정 (§3 작업C 내용)
# 4. master 직접 commit + push
git add .claude/rules/tdd-workflow.md .claude/rules/testing.md .claude/rules/sdd-triangle.md
git commit -m "docs(rules): TDD Red-Green-Commit 워크플로우 도입

- .claude/rules/tdd-workflow.md 신규 생성 (Anthropic TDD 패턴)
- testing.md에 TDD 사이클 섹션 추가
- sdd-triangle.md에 TDD 순서 원칙 추가"
git push origin master
```

### Phase 2: 첫 번째 F-item에서 실전 적용

```bash
# 다음 Sprint의 첫 F-item에서 TDD 풀 사이클 실행
# 1. SPEC.md에 F-item 등록 → 커밋 → push
# 2. WT 생성: bash -i -c "sprint N"
# 3. Red Phase → 실패 확인 → Red 커밋
# 4. Green Phase → 통과 확인 → Green 커밋
# 5. 과적합 검증 (선택)
# 6. PR → --auto --squash
```

### Phase 3: 회고 및 조정 (2~3 Sprint 후)

- Red 커밋이 실제로 분리되고 있는지 git log 검토
- 생산성에 부정적 영향이 있는 영역 → 등급 조정 (필수→권장 등)
- 과적합 검증이 실제로 유용한 피드백을 주는지 평가

---

## 9. 요약: Claude Code에 주는 핵심 지시문

TDD를 적용하는 F-item 작업 시작 시, Claude Code에 아래 컨텍스트를 제공:

```
이 작업은 TDD Red-Green-Commit 사이클로 진행해.
.claude/rules/tdd-workflow.md 의 절차를 따라.

Phase 순서:
1. Red — 테스트만 작성, 구현 코드 zero. 실행해서 FAIL 확인.
2. Red 커밋 — "test(scope): F### red — ..." 형식
3. Green — 테스트를 통과시키는 최소 구현. 테스트 파일 수정 금지.
4. Green 커밋 — "feat(scope): F### green — ..." 형식

각 phase가 끝날 때마다 나한테 확인받고 다음 phase로 넘어가.
```

---

## 10. 기존 `/tdd` 스킬 활용

> Foundry-X에는 이미 `.claude/skills/tdd/` 스킬이 존재한다.
> 새로 만들 것이 아니라, 기존 스킬을 PDCA 흐름에 공식 연결하는 것이 핵심이다.

### 기존 `/tdd` 스킬 구성

```
.claude/skills/tdd/
├── SKILL.md                    # 오케스트레이터 (서브커맨드: red/green/refactor/check)
├── refs/red-phase.md           # Red 상세 규칙 (happy/edge/error 3종 필수)
├── refs/green-phase.md         # Green 상세 규칙 (YAGNI, 최소 구현)
├── refs/refactor-phase.md      # Refactor 상세 규칙 (DRY, 타입, 네이밍)
└── examples/service-tdd.md     # API 서비스 TDD 사이클 예시 (bookmark)
```

### 서브커맨드 매핑

| 커맨드 | 동작 | PDCA 단계 |
|--------|------|----------|
| `/tdd {파일}` | 전체 R-G-R 사이클 | Do 전체 |
| `/tdd red {파일}` | 실패 테스트 작성 | Do → Red |
| `/tdd green {파일}` | 최소 구현 | Do → Green |
| `/tdd refactor {파일}` | 코드 품질 개선 | Do → Refactor |
| `/tdd check {파일}` | 미커버 함수 리스트 | Analyze 보조 |

### 이 계획서와의 관계

- **§3 작업A** (tdd-workflow.md): `/tdd` 스킬의 실행 규칙을 PDCA/Git 관점에서 보완하는 정책 문서. 스킬 자체를 수정하지 않음.
- **§4 예시들**: `/tdd red`, `/tdd green` 커맨드로 실행 가능. 직접 지시 방식과 병행 가능.
- **§5 과적합 검증**: `/tdd check`로 미커버 함수 확인 후 서브에이전트 검증으로 확장.

### 실제 세션 예시: `/tdd` 스킬 활용

```bash
# 방법 1: 스킬로 전체 사이클 실행
You: "/tdd packages/api/src/services/invite-service.ts"
→ Claude가 Red→Green→Refactor 자동 오케스트레이션

# 방법 2: 단계별 수동 제어 (PDCA 흐름에서 권장)
You: "/tdd red packages/api/src/services/invite-service.ts"
→ 실패 확인 → 사람이 테스트 검토 → Red 커밋 지시
You: "/tdd green packages/api/src/services/invite-service.ts"
→ 통과 확인 → Green 커밋 지시

# 방법 3: 커버리지 확인 (Analyze 단계에서)
You: "/tdd check packages/api/src/services/invite-service.ts"
→ 미커버 함수 목록 → 추가 Red 사이클 필요 여부 판단
```

**PDCA에서의 권장**: 방법 2 (단계별 수동 제어). 사람이 Red 결과를 확인하고 커밋을 승인하는 게이트가 있어야 테스트 계약의 품질이 보장됨.

---

## 11. PDCA 연동: 단계별 영향 분석

> PDCA 흐름: Plan → Design → Do → Analyze → Iterator → Report
> TDD 접목 시 변경되는 단계와 불변 단계를 명확히 구분한다.

### 전체 흐름 비교

```
현재 PDCA:
  Plan → Design → Do(구현+테스트 동시) → Analyze(V-NN) → Iterator → Report

TDD 적용 후:
  Plan → Design(+테스트계약) → Do(/tdd red→green) → Analyze(V-NN+T-NN) → Iterator(Red재시작) → Report
          ▲ 변경                 ▲ 구조변경            ▲ 확장              ▲ 시작점 변경
```

### 11-1. Plan — 불변

현재와 동일. 요구사항/범위/아키텍처 정의. 코드 작성 이전이라 TDD와 무관.

### 11-2. Design — 소폭 추가: "테스트 계약" 섹션

**현재**: SQL 스키마, Zod 스키마, API 엔드포인트, Web 컴포넌트 구조 정의.
**변경**: Design 문서 하단에 **"테스트 계약 (TDD Red Target)"** 섹션 추가.

```markdown
## 테스트 계약 (TDD Red Target)

| # | 대상 | 테스트 유형 | Red 시나리오 |
|---|------|-----------|-------------|
| T1 | POST /api/orgs/:id/invites | API 통합 | 201 생성 / 400 이메일불량 / 403 권한부족 / 409 중복 |
| T2 | GET /api/orgs/:id/invites | API 통합 | 200 목록반환 / 200 빈배열 / 401 미인증 |
| T3 | InviteList 컴포넌트 | Web 단위 | 빈 목록 / pending 배지 / accepted 배지 |
| T4 | 초대 관리 페이지 | E2E | 목록 렌더 / 폼 제출 / 이메일 검증 에러 |
```

**이유**: TDD Red phase에서 "뭘 테스트할지"는 Design에서 결정됨.
Design이 곧 테스트의 입력이 되면, Red 작성 시간이 줄고 테스트 누락이 방지됨.

**실제 적용**: .design.md 파일의 마지막 섹션으로 추가. 기존 섹션(SQL/Schema/API/Web)은 불변.

### 11-3. Do — 구조 변경: Red-Green 순서 강제

**현재**: Design을 보고 구현 + 테스트를 동시 또는 구현 후 테스트.
**변경**: Do phase 내부가 Red → Green 두 단계로 분리.

```
현재 Do:
  서비스 파일 열기 → 구현 작성 → 테스트 작성 → (동시 커밋)

TDD Do:
  테스트 파일 열기 → /tdd red (FAIL 확인) → Red 커밋
  → 서비스 파일 열기 → /tdd green (PASS 확인) → Green 커밋
```

**핵심 변화**: Do의 진입점이 바뀜. 코드 에디터를 여는 첫 행위가 "서비스 파일"이 아니라 "테스트 파일".

**Claude Code 세션 비교:**

```bash
# 현재 Do
You: "Sprint N WT에서 Design 기반으로 F510 구현해줘"
Claude: 서비스 → 라우트 → 스키마 → 테스트 순서로 작성

# TDD Do
You: "/tdd red packages/api/src/services/invite-service.ts"
Claude: Design 테스트 계약 기반으로 테스트만 작성 → FAIL 확인
You: "Red 커밋해줘"
You: "/tdd green packages/api/src/services/invite-service.ts"
Claude: 테스트 통과하는 최소 구현 → PASS 확인
You: "Green 커밋해줘"
```

### 11-4. Analyze — 소폭 확장: T-NN 항목 추가

**현재**: V-NN 항목으로 Design ↔ Implementation Match Rate 측정.
**변경**: V-NN (구현 검증)에 더해 T-NN (테스트 계약 이행률) 추가.

```markdown
## 기존 V-NN (변경 없음)
| # | 항목 | Plan | Design | 구현 | 상태 |
|---|------|------|--------|------|------|
| V1 | POST /api/orgs/:id/invites | ✅ | ✅ | ✅ | 완전 일치 |
| V2 | Zod 스키마 검증 | ✅ | ✅ | ✅ | 완전 일치 |

## 신규 T-NN (테스트 계약 이행률)
| # | Design 계약 | Red 커밋 | Green 커밋 | 상태 |
|---|------------|---------|-----------|------|
| T1 | API 201/400/403/409 | ✅ 4 tests | ✅ 4 pass | 계약 이행 |
| T2 | InviteList 3 시나리오 | ✅ 3 tests | ✅ 3 pass | 계약 이행 |
| T3 | E2E 3건 | ✅ 3 specs | ⚠️ 2 pass, 1 skip | 부분 이행 |

테스트 계약 이행률: 9/10 (90%)
```

**Match Rate 계산 변경:**

```
현재:  Match Rate = V-NN PASS / V-NN 전체
TDD:   Match Rate = (V-NN PASS + T-NN PASS) / (V-NN 전체 + T-NN 전체)
       또는 별도 보고: 구현 일치율 93% + 테스트 계약 이행률 90%
```

**`/tdd check` 활용**: Analyze에서 미커버 함수 확인용으로 사용.

```bash
# Analyze 단계에서
You: "/tdd check packages/api/src/services/invite-service.ts"
→ 커버리지: 3/3 (100%) — 모든 export 함수에 테스트 존재

You: "/tdd check packages/api/src/routes/org-invites.ts"
→ 커버리지: 2/3 (67%) — PATCH 핸들러 미커버 → 추가 Red 필요
```

### 11-5. Iterator — 시작점 변경: Red부터 재시작

**현재**: Gap < 90%일 때 구현 코드 보강 위주.
**변경**: Iterator가 Red-Green 사이클을 다시 돌림.

```
현재 Iterator:
  Gap 발견 → 구현 코드 수정 → Analyze 재실행

TDD Iterator:
  Gap 발견 (T-NN 미달)
  → /tdd red (누락 테스트 계약 보충)
  → Red 커밋
  → /tdd green (구현 보강)
  → Green 커밋
  → Analyze 재실행 (T-NN 갱신)
```

이 흐름이 Anthropic이 말하는 "과적합 검증 후 새 Red 사이클 추가"와 정확히 일치.

**Iterator 트리거 조건 확장:**

```
현재: V-NN Match Rate < 90%
TDD:  V-NN Match Rate < 90% OR T-NN 테스트 계약 이행률 < 90%
```

### 11-6. Report — 불변 (자동 반영)

Analyze의 T-NN 결과가 Report에 자연스럽게 포함됨. Report 형식 자체는 변경 불필요.

---

## 12. PDCA 연동 요약 매트릭스

| PDCA 단계 | 변경 수준 | 구체적 변경 | `/tdd` 스킬 활용 |
|-----------|----------|-----------|-----------------|
| **Plan** | 불변 | — | — |
| **Design** | 소폭 추가 | 하단에 "테스트 계약 (TDD Red Target)" 테이블 추가 | Red Target 정의 |
| **Do** | **구조 변경** | Red→Green 순서 강제, 커밋 분리 | `/tdd red` → `/tdd green` |
| **Analyze** | 소폭 확장 | V-NN에 T-NN(테스트 계약 이행률) 항목 추가 | `/tdd check` |
| **Iterator** | 시작점 변경 | 구현 보강이 아닌 Red 사이클 재시작 | `/tdd red` 재호출 |
| **Report** | 불변 | Analyze 결과 자동 반영 | — |

---

## 13. 실행 체크리스트 (PDCA 연동 포함, 최종)

### Phase 1: 규칙 파일 반영 (meta-only → master 직접 push)

```bash
# 1. .claude/rules/tdd-workflow.md 생성 (§3 작업A)
# 2. .claude/rules/testing.md TDD 섹션 추가 (§3 작업B)
# 3. .claude/rules/sdd-triangle.md TDD 순서 원칙 추가 (§3 작업C)
# 4. master commit + push
```

### Phase 2: Design 템플릿에 테스트 계약 섹션 추가

```bash
# 새 .design.md 작성 시 마지막에 아래 섹션 포함:
# ## 테스트 계약 (TDD Red Target)
# | # | 대상 | 테스트 유형 | Red 시나리오 |
# 기존 design 파일은 소급 불필요 (신규부터 적용)
```

### Phase 3: 첫 F-item에서 PDCA + TDD 풀 사이클

```bash
# Plan (.plan.md) — 기존과 동일
# Design (.design.md) — 테스트 계약 섹션 포함
# Do:
#   /tdd red {서비스파일} → FAIL 확인 → Red 커밋
#   /tdd green {서비스파일} → PASS 확인 → Green 커밋
# Analyze (.analysis.md) — V-NN + T-NN 모두 포함
#   /tdd check 로 커버리지 확인
# Iterator — T-NN < 90% 시 /tdd red 재시작
# Report — 기존과 동일 (T-NN 결과 포함)
```

### Phase 4: 회고 (2~3 Sprint 후)

- Design 테스트 계약이 Red 작성 시간을 실제로 줄이는지
- T-NN 항목이 Analyze 품질을 높이는지
- `/tdd` 스킬의 자동 오케스트레이션 vs 수동 단계 제어 — 어떤 모드가 효과적인지
- Iterator에서 Red 재시작이 자연스러운지 vs 구현 보강이 더 빠른 경우가 있는지
