# C66 — E2E Shard 4 전면 실패 근본 원인 조사

**작업**: C66  
**날짜**: 2026-04-14  
**PR**: #575, #578, #579 — 3회 연속 Shard 4 실패  
**결론**: Playwright strict mode violation 3건 (인프라 regression ❌ — 테스트 코드 버그 ✅)

---

## 1. 조사 요약

### 가설 검증 결과

| 가설 | 검증 방법 | 결론 |
|------|----------|------|
| Shard 4에만 특이한 인프라/설정 문제 | e2e.yml + playwright.config.ts 분석 | ❌ 없음 (4 shard 모두 동일 설정) |
| shardIndex 조건부 로직 | playwright.config.ts 전체 읽기 | ❌ 없음 |
| paths-filter가 shard 4에만 영향 | deploy.yml + e2e.yml 분석 | ❌ 없음 |
| 특정 E2E 시나리오의 결정론적 버그 | CI 로그 직접 추출 (`gh run view`) | ✅ 3건 확인 |

### 결론

Shard 4에 할당된 3개 테스트 파일에 **Playwright strict mode violation** 버그가 존재했다.
Shard 분할은 파일 알파벳 순으로 이루어지며, 이 3개 파일이 모두 shard 4에 배치되어 결과적으로 shard 4가 매번 전면 실패했다.

---

## 2. 근본 원인 — Strict Mode Violation 3건

Playwright strict mode: locator가 2개 이상 요소와 매칭되면 즉시 에러를 던진다.
아래 3건 모두 선택자가 의도치 않게 복수 요소를 매칭했다.

### Bug 1 — shaping-html-view.spec.ts:317

**파일**: `packages/web/e2e/shaping-html-view.spec.ts`  
**실패 선택자**: `prd2Card.getByText("확정")`  
**원인**:
- PRD 카드 헤더의 Badge `<div>확정</div>` (exact match)
- MarkdownViewer가 렌더링한 `<li>확정된 PRD 버전</li>` (substring match)
- `getByText("확정")`은 substring 매칭이므로 두 요소 모두 히트

**왜 shard 4인가**: Sprint 287~290에서 shaping PRD 뷰 E2E가 추가되었고, 이 파일이 shard 4에 배치됨.

**수정**:
```diff
- await expect(prd2Card.getByText("확정")).toBeVisible();
+ await expect(prd2Card.getByText("확정", { exact: true })).toBeVisible();
```

### Bug 2 — uncovered-pages.spec.ts:65

**파일**: `packages/web/e2e/uncovered-pages.spec.ts`  
**실패 선택자**: `page.locator("main")`  
**원인**:
- AppLayout의 `<main class="flex-1 overflow-auto ...">` — 인증된 앱 공통 outer main
- wiki.tsx 자체의 `<main class="flex min-w-0 ...">` — wiki 고유 inner main
- `/wiki` 경로에서 두 `<main>` 요소가 중첩되어 strict mode violation

**수정**:
```diff
- await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
+ await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
```

> 참고: wiki.tsx의 `<main>` 요소는 ARIA 관점에서도 문제 (페이지에 main landmark가 2개).
> F 승격 후 wiki.tsx `<main>` → `<div>` 구조 개선 권장 (기능 영향 없음).

### Bug 3 — sse-lifecycle.spec.ts:54

**파일**: `packages/web/e2e/sse-lifecycle.spec.ts`  
**실패 선택자**: `page.getByText("TestAgent")`  
**원인**:
- agents.tsx 탭 네비게이션의 `<button>TestAgent</button>` (항상 렌더됨)
- 모킹된 에이전트 카드의 `<h3>TestAgent</h3>` AgentCard 헤딩
- `getByText("TestAgent")`가 두 요소 모두 매칭

**CI 로그 실제 에러**:
```
strict mode violation: getByText('TestAgent') resolved to 2 elements:
  1) <button ...>TestAgent</button>  ← 탭 버튼
  2) <h3 ...>TestAgent</h3>         ← 에이전트 카드 헤딩
```

**수정**:
```diff
- await expect(page.getByText("TestAgent")).toBeVisible({ timeout: 10000 });
+ await expect(page.getByRole("heading", { name: "TestAgent" })).toBeVisible({ timeout: 10000 });
```

---

## 3. 왜 3회 연속 실패했나

Sprint 287~290에서 도입된 E2E 시나리오들이 순차적으로 shard 4에 배치되었다:
- Sprint 287: shaping HTML 뷰 E2E 추가 (shaping-html-view.spec.ts)
- Sprint ~288: agents SSE lifecycle E2E 추가 (sse-lifecycle.spec.ts)
- uncovered-pages.spec.ts의 wiki 테스트도 동 기간 추가

이 파일들의 알파벳 순서(s, u 위치)가 Playwright shard 분할 시 모두 shard 4에 배치되는 결과를 낳았다. 각 PR에서 이 테스트들이 반복 실패하며 "shard 4 전면 실패"처럼 보였으나 실제로는 동일한 테스트 버그가 3회 재현된 것이다.

---

## 4. 조사 범위별 결론

| 조사 항목 | 결론 |
|----------|------|
| `.github/workflows/e2e.yml` shard 분할 로직 | 정상 — `shardIndex: [1, 2, 3, 4]`, 특이점 없음 |
| `playwright.config.ts` shardIndex 조건부 설정 | 없음 |
| CI 로그 shard 4 failure 스택 | 3건 strict mode violation 확인 |
| Sprint 287~290 신규 E2E 시나리오 | 3개 파일 모두 shard 4 배치 |
| deploy.yml paths-filter shard 영향 | 없음 |
| Local 4-shard 재현 | 코드 분석으로 확인 (로컬 E2E 서버 불필요) |

---

## 5. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/web/e2e/shaping-html-view.spec.ts:317` | `getByText("확정", { exact: true })` |
| `packages/web/e2e/uncovered-pages.spec.ts:65` | `locator("main").first()` |
| `packages/web/e2e/sse-lifecycle.spec.ts:54` | `getByRole("heading", { name: "TestAgent" })` |

---

## 6. 후속 권장 사항

| # | 항목 | 분류 |
|---|------|------|
| R1 | wiki.tsx `<main>` → `<div>` 교체 (ARIA landmark 정리) | C-track Backlog |
| R2 | E2E 테스트 작성 가이드라인에 strict mode 주의사항 추가 | docs 개선 |
| R3 | `getByText()` 사용 시 exact/role 명시 컨벤션 추가 | testing.md |

---

## 7. TDD 적용 여부

본 작업은 1-line 버그픽스 × 3건으로 **TDD 면제** 대상.
기존 테스트를 올바른 선택자로 수정하는 것 = 테스트 자체가 Red 역할.
