---
code: FX-PLAN-S135
title: "Sprint 135 — F316 Discovery E2E 테스트"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Code
sprint: 135
features: [F316]
requirements: [FX-REQ-308]
---

# Sprint 135 Plan — F316 Discovery E2E 테스트

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F316: Discovery E2E 테스트 |
| **Sprint** | 135 |
| **시작일** | 2026-04-05 |
| **예상 기간** | 1 Sprint (~30분 autopilot) |
| **선행** | F314 ✅ (Sprint 133), F312+F313 ✅ (Sprint 132) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Discovery 위저드·파이프라인·HITL 체크포인트에 대한 E2E 테스트 부재로 UI 변경 시 회귀 감지 불가 |
| **Solution** | Playwright E2E 10건 신규 추가 — 파이프라인 생성~스킬 실행~HITL 승인/거부~에러 복구 전체 흐름 커버 |
| **Function UX Effect** | UI 리팩토링 시 회귀 감지 + F314 기능(AutoAdvance, CheckpointReview) E2E 보호 |
| **Core Value** | Discovery E2E 커버리지 ~12건 → 22건+ (PRD 목표 15건+ 초과 달성) |

## 1. 목표

F316은 **테스트 전용 Sprint**으로, 코드 변경은 E2E 테스트 파일만 수행한다.

### 1.1 커버리지 목표

| 영역 | 기존 커버리지 | 추가 대상 | 목표 |
|------|-------------|-----------|------|
| Discovery 위저드 (F263) | 4건 | — (충분) | 4건 유지 |
| HITL Review (F266) | 4건 | — (충분) | 4건 유지 |
| Pipeline Dashboard (F232) | 4건 | — (충분) | 4건 유지 |
| **파이프라인 실행 흐름** | 0건 | **4건 신규** | 4건 |
| **HITL 체크포인트 (F314)** | 0건 | **3건 신규** | 3건 |
| **에러 복구 + 재시도** | 0건 | **2건 신규** | 2건 |
| **위저드→스킬→형상화 통합** | 0건 | **1건 신규** | 1건 |
| **합계** | ~12건 | **10건** | **22건** |

### 1.2 신규 E2E 테스트 시나리오

#### A. 파이프라인 실행 흐름 (discovery-pipeline-flow.spec.ts)
1. **파이프라인 생성 → 목록 표시**: POST runs → 목록에 새 파이프라인 나타남
2. **파이프라인 상세 → 이벤트 로그**: 상세 페이지에서 step 진행 상태 + 이벤트 목록
3. **자동 진행(AutoAdvance) → 단계 전환**: 버튼 클릭 → 다음 단계로 전환 확인
4. **일시중지/재개**: Pause → status 변경 → Resume → 복귀

#### B. HITL 체크포인트 (discovery-checkpoint.spec.ts)
5. **CheckpointReviewPanel 렌더링 + 질문 표시**: 체크포인트 데이터 mock → 패널 + 질문 목록
6. **체크포인트 승인 → 파이프라인 재개**: 질문 답변 입력 → 승인 클릭 → API 호출 확인
7. **체크포인트 거부 → 거부 사유 입력**: 거부 모드 전환 → 사유 입력 → 거부 확정

#### C. 에러 복구 (discovery-error-recovery.spec.ts)
8. **스킬 실행 실패 → 재시도/건너뛰기 옵션**: step-failed 응답 mock → 에러 UI + 액션 버튼
9. **에러 후 재시도(retry) → 복구**: retry 액션 → 파이프라인 재개 확인

#### D. 통합 시나리오 (discovery-e2e-flow.spec.ts)
10. **위저드→스킬 실행→체크포인트→형상화 트리거**: 위저드 진입 → auto-advance 3회 → 체크포인트 승인 → 형상화 시작

## 2. 기술 접근

### 2.1 테스트 구조
- **mock 기반**: 모든 API를 `page.route()` mock으로 처리 (기존 패턴 유지)
- **auth fixture**: `./fixtures/auth` import (기존 인증 패턴 활용)
- **mock-factory 확장**: `makePipelineRun()`, `makeCheckpoint()` 추가

### 2.2 파일 구조
```
packages/web/e2e/
├── discovery-pipeline-flow.spec.ts   # A. 파이프라인 실행 (4건)
├── discovery-checkpoint.spec.ts      # B. HITL 체크포인트 (3건)
├── discovery-error-recovery.spec.ts  # C. 에러 복구 (2건)
├── discovery-e2e-flow.spec.ts        # D. 통합 시나리오 (1건)
└── fixtures/
    └── mock-factory.ts               # makePipelineRun, makeCheckpoint 추가
```

### 2.3 변경 파일 요약
| 파일 | 동작 | 라인 추정 |
|------|------|-----------|
| `e2e/fixtures/mock-factory.ts` | 수정 (2개 factory 함수 추가) | +40 |
| `e2e/discovery-pipeline-flow.spec.ts` | **신규** (4건) | ~180 |
| `e2e/discovery-checkpoint.spec.ts` | **신규** (3건) | ~160 |
| `e2e/discovery-error-recovery.spec.ts` | **신규** (2건) | ~120 |
| `e2e/discovery-e2e-flow.spec.ts` | **신규** (1건) | ~100 |
| **합계** | 4 신규 + 1 수정 | ~600 라인 |

## 3. 리스크

| 리스크 | 대응 |
|--------|------|
| 기존 E2E flaky 영향 | 독립 mock으로 격리 — 기존 테스트와 데이터 공유 없음 |
| Web 컴포넌트가 실제로 discovery-pipeline API를 호출하는 페이지 미존재 | 파이프라인 관련 라우트(discovery.tsx 등) 확인 후 mock 대상 결정 |
| CheckpointReviewPanel이 독립 라우트 없이 내부 컴포넌트만 존재 | 직접 /discovery/items 에서 파이프라인 관련 UI 진입점 확인 |

## 4. 검증

```bash
cd packages/web
pnpm e2e --grep "Discovery Pipeline|Checkpoint|Error Recovery|E2E Flow"
```

성공 기준: 10건 전체 pass, skip 0건
