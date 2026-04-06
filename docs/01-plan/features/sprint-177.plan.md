# Sprint 177 Plan — M2+M3: CLI 듀얼 모드 + Enhanced O-G-D

> **Sprint**: 177
> **F-items**: F388, F389
> **Phase**: 19 (Builder Evolution)
> **선행**: F384 CLI PoC ✅, F386 5차원 스코어러 ✅, F388→F389 순차
> **PRD**: `docs/specs/fx-builder-evolution/prd-final.md`
> **Design**: `docs/02-design/features/fx-builder-evolution.design.md` §6 Sprint 177

---

## 1. 목표

Sprint 176에서 구현한 5차원 품질 스코어러를 **O-G-D 루프에 통합**하고, Claude Max CLI `--bare` 모드를 **코드 생성 primary**로 전환하여 API 비용을 제거한다.

| F-item | 제목 | 핵심 산출물 |
|--------|------|------------|
| F388 | CLI 듀얼 모드 | `fallback.ts` 4-Level (`max-cli` → `cli` → `api` → `ensemble`) + `CostTracker.recordCli()` |
| F389 | Enhanced O-G-D 루프 | `orchestrator.ts` 5차원 스코어 통합 + 타겟 피드백 + 5라운드 80점 수렴 + 미수렴 리포트 |

---

## 2. 변경 범위

### F388: CLI 듀얼 모드

| 파일 | 변경 내용 |
|------|----------|
| `prototype-builder/src/fallback.ts` | `runMaxCli()` 함수 추가, `FallbackLevel`에 `'max-cli'` 추가, `executeWithFallback()` 4-Level로 재구성 |
| `prototype-builder/src/cost-tracker.ts` | `recordCli()` 메서드 추가 (CLI 모드 $0 기록) |
| `prototype-builder/src/__tests__/fallback.test.ts` | CLI 듀얼 모드 mock 테스트 (max-cli 성공/실패/fallback) |

### F389: Enhanced O-G-D 루프

| 파일 | 변경 내용 |
|------|----------|
| `prototype-builder/src/orchestrator.ts` | `evaluateQuality()` 통합, `qualityThreshold` 80, `maxRounds` 5, 타겟 피드백 → 다음 라운드, 미수렴 시 best score 채택 + 리포트 |
| `prototype-builder/src/types.ts` | `OgdResult`에 `matchRate`, `feedback` 필드 추가 |
| `prototype-builder/src/__tests__/orchestrator.test.ts` | Enhanced O-G-D 시나리오 테스트 (수렴/미수렴/장애 복구) |

---

## 3. 리스크

| Risk | Mitigation |
|------|-----------|
| Max CLI rate limit | `SKIP_CLI=true` 환경변수로 즉시 API fallback 전환 |
| 5차원 평가 시간 | 평가는 빌드 후 1회만, 병렬 실행으로 2초 이내 목표 |
| 미수렴 무한 루프 | maxRounds 5 하드 리밋 + best score 강제 채택 |

---

## 4. 완료 기준

- [ ] fallback.ts에 runMaxCli() 함수 추가
- [ ] FallbackLevel에 'max-cli' 추가
- [ ] CLAUDE_CLI_PATH 환경변수 지원
- [ ] CostTracker.recordCli() 메서드 추가
- [ ] orchestrator.ts에 evaluateQuality() 통합
- [ ] qualityThreshold 단위 변경 (0.85 → 80)
- [ ] maxRounds 3→5 확장
- [ ] 타겟 피드백 → saveFeedback() → 다음 라운드 입력
- [ ] 미수렴 시 best score 채택 + 미달 리포트
- [ ] fallback 테스트 통과
- [ ] orchestrator 테스트 통과
- [ ] 전체 typecheck 통과
- [ ] Gap Analysis >= 90%
