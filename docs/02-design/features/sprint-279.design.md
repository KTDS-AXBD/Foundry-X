---
id: FX-DESIGN-279
title: Sprint 279 Design — F526 autopilot Verify E2E 통합
sprint: 279
status: done
date: 2026-04-13
req: FX-REQ-554
---

# Sprint 279 Design — F526

## §1 요약

Design 문서에서 E2E 시나리오를 자동 추출하고(F524), Playwright로 실행하고, Gap Analysis 결과와 합산하여(F525) Composite Score를 산출하는 파이프라인 레이어(e2e-runner.ts)를 구현한다. CLI 커맨드로 노출하고, sprint-autopilot Step 5b에 통합한다.

## §2 아키텍처

```
sprint-autopilot Step 5b
        │
        ▼
foundry-x e2e-verify <N> --gap-rate <R>
        │
        ├─ runE2EVerify(VerifyInput)
        │       │
        │       ├─ parseDesignDocument(docContent)        ← F524
        │       ├─ generateE2ESpec(scenarios, sprintNum)  ← F524
        │       ├─ fs.writeFileSync(generatedSpecPath)
        │       ├─ cp.spawnSync(playwright test --reporter=json)
        │       ├─ parsePlaywrightJson(stdout)
        │       └─ computeCompositeScore({gapRate, e2eResults})  ← F525
        │
        └─ VerifyResult → stdout JSON / 사람 읽기 포맷
```

## §3 데이터 모델

```typescript
// 입력
interface VerifyInput {
  sprintNum: number;
  gapRate: number;       // Step 5에서 산출한 Gap Match Rate
  projectRoot: string;   // 프로젝트 루트 (default: cwd)
}

// 출력
interface VerifyResult {
  sprintNum: number;
  designDocPath: string;      // docs/02-design/features/sprint-N.design.md
  generatedSpecPath: string;  // packages/web/e2e/generated/sprint-N.spec.ts
  scenarioCount: number;
  e2eResult: E2EResult | null;  // null = Playwright 실행 불가
  gapRate: number;
  compositeScore: CompositeScore;  // F525
  error?: string;
}
```

## §4 기능 명세

| # | 기능 | 설명 |
|---|------|------|
| 1 | Design doc 파싱 | §4+§5에서 시나리오 추출 (F524 위임) |
| 2 | spec 생성 | `packages/web/e2e/generated/sprint-N.spec.ts` 자동 작성 |
| 3 | Playwright 실행 | `npx playwright test <spec> --reporter=json` (spawnSync) |
| 4 | JSON 파싱 | `stats.expected`=pass, `stats.unexpected`=fail |
| 5 | Composite 계산 | F525 `computeCompositeScore` 위임 (Gap×0.6 + E2E×0.4) |
| 6 | Fallback | Playwright 미설치/오류 시 E2E null → Gap만으로 Composite |
| 7 | Error 처리 | Design doc 없으면 즉시 FAIL VerifyResult 반환 |

## §5 파일 매핑

| 파일 | 역할 | 변경 |
|------|------|------|
| `packages/cli/src/services/e2e-runner.ts` | 파이프라인 서비스 | 신규 |
| `packages/cli/src/services/e2e-runner.test.ts` | TDD 6개 시나리오 | 신규 |
| `packages/cli/src/commands/e2e-verify.ts` | CLI 커맨드 | 신규 |
| `packages/cli/src/index.ts` | CLI 진입점 | 수정 (커맨드 등록) |
| `~/.claude/plugins/.../sprint-autopilot/SKILL.md` | Step 5b 통합 | 수정 |

## §6 TDD 계약

| 시나리오 | 입력 | 기대 출력 |
|----------|------|-----------|
| Design doc 없음 | `existsSync=false` | `error` 포함, `status=FAIL` |
| Playwright 전체 PASS | 3 expected, 0 unexpected | Composite ≈ 97% (gapRate=95) |
| Playwright 일부 FAIL | 2 expected, 1 unexpected | Composite < 90, status=FAIL |
| Playwright 실행 불가 | spawnSync signal=SIGTERM | e2eResult=null, Composite=gapRate |
| spec 경로 반환 | 정상 실행 | `generatedSpecPath` contains `sprint-279.spec.ts` |
| 시나리오 수 | 정상 실행 | `scenarioCount >= 1` |

## §7 sprint-autopilot Step 5b 변경 요약

- **변경 전**: `/ax:e2e-audit coverage` 실행 (커버리지 감지만, E2E 생성 없음)
- **변경 후**: `foundry-x e2e-verify ${SPRINT_NUM} --gap-rate ${MATCH_RATE} --json`
  - Design doc에서 E2E 자동 생성 + 실행
  - Composite Score를 `.sprint-context`의 `MATCH_RATE`에 덮어씀
  - PASS/FAIL 판정을 Report에 전달

## §8 갭/의도적 제외

- **Playwright 미설치**: CLI fallback으로 Gap Score만 사용 — 로컬 환경 다양성 고려
- **E2E 실패 시 자동 수정 없음**: E2E 실패는 도메인 판단이 필요한 영역 (PRD §4.3)
- **크로스 서비스 E2E**: Out of Scope (PRD §4.3)
