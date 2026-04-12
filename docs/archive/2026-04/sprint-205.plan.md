---
code: FX-PLAN-S205
title: Sprint 205 — Vision API 시각 평가 + max-cli 본격 통합
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 205 Plan — F427 Vision API 시각 평가 + F428 max-cli 본격 통합

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 205 |
| F-items | F427, F428 |
| Phase | 22-D (Prototype Builder v2, M4) |
| PRD | `docs/specs/fx-builder-v2/prd-final.md` |
| 목표 | Vision API로 UI 시각 평가 고도화 + max-cli 율 제한 백오프 통합 |

---

## 1. 목적 및 배경

Phase 22-D Builder v2 M4 마일스톤의 일환으로:

- **F427**: 기존 `uiScore`는 DOM 정적 분석(태그 다양성, Tailwind 비율 등)만으로 UI 품질을 측정하여 실제 시각적 완성도를 반영하지 못함. Claude Vision API로 스크린샷 기반 시각 평가를 추가해 ui 차원 정확도를 향상.
- **F428**: max-cli PoC(F384)는 완료했으나 rate limit 발생 시 즉시 실패 처리. 지수 백오프 재시도 + API fallback 자동 전환으로 실운영 안정성 확보. generation_mode를 비용 추적에 기록.

---

## 2. F-item 상세

### F427: Vision API 시각 평가 (FX-REQ-419)

**범위:**
- `prototype-builder/src/vision-evaluator.ts` 신규 생성
- Chromium `--headless` 스크린샷 캡처 (available) 또는 HTML 텍스트 fallback
- Claude Vision API 호출 → 레이아웃/색상/타이포/계층구조/반응형 5항목 평가
- `scorer.ts` `evaluateQuality`에 `useVisionApi?: boolean` 옵션 추가
- ui 차원 점수를 Vision 결과로 대체 (정적 분석은 보조 컨텍스트)

**구현 전략:**
```
1. Chromium 존재 확인 (google-chrome / chromium / chromium-browser)
2. 있으면: 빌드된 dist/index.html을 headless로 열어 PNG 스크린샷 → base64
3. 없으면: HTML 소스를 텍스트로 Claude에 전달 (텍스트 기반 시각 평가)
4. Claude API (claude-sonnet-4-6) vision 호출
5. JSON 응답: layout / color / typography / hierarchy / responsive 각 0~100점
6. 평균 → DimensionScore (ui 차원)
```

### F428: max-cli 본격 통합 (FX-REQ-420)

**범위:**
- `prototype-builder/src/types.ts`: `CostRecord`에 `generation_mode?: GenerationMode` 추가
- `prototype-builder/src/fallback.ts`: `retryWithBackoff` 유틸 + `runMaxCli` 재시도 로직
- `prototype-builder/src/cost-tracker.ts`: `recordCli` → `generation_mode` 파라미터 포함
- Rate limit 감지: stderr/stdout에 `rate limit` / `429` / `overloaded` 키워드 탐지
- 백오프 전략: 초기 1s → 2s → 4s (최대 3회 재시도)

---

## 3. 구현 파일 목록

| 파일 | 변경 | 설명 |
|------|------|------|
| `prototype-builder/src/vision-evaluator.ts` | 신규 | F427 핵심 모듈 |
| `prototype-builder/src/types.ts` | 수정 | CostRecord generation_mode |
| `prototype-builder/src/fallback.ts` | 수정 | retryWithBackoff + runMaxCli 강화 |
| `prototype-builder/src/cost-tracker.ts` | 수정 | recordCli generation_mode 파라미터 |
| `prototype-builder/src/scorer.ts` | 수정 | useVisionApi 옵션 통합 |
| `prototype-builder/src/__tests__/vision-evaluator.test.ts` | 신규 | F427 단위 테스트 |
| `prototype-builder/src/__tests__/fallback.test.ts` | 신규 | F428 재시도 로직 테스트 |

---

## 4. 의존성

- `@anthropic-ai/sdk` (기존 의존성) — Vision API 호출
- `child_process` (Node.js 내장) — Chromium 스크린샷
- 신규 npm 패키지 없음 (zero-dependency 유지)

---

## 5. 완료 기준

- [ ] `vision-evaluator.ts` 구현 및 단위 테스트 통과
- [ ] `fallback.ts` 재시도 로직 구현 및 테스트 통과
- [ ] `evaluateQuality({ useVisionApi: true })` 호출 시 Vision 점수 반영
- [ ] `CostRecord.generation_mode` 필드 존재
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 통과
