---
code: FX-PLAN-S228
title: Sprint 228 Plan — Feedback→Regeneration + Quality 데이터 통합 (F466/F467)
version: "1.0"
status: Active
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Claude Sonnet 4.6 (autopilot)
sprint: 228
---

# Sprint 228 Plan — Feedback→Regeneration + Quality 데이터 통합

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 228 |
| F-items | F466, F467 |
| Phase | 27-B: GAP 복구 (2/4) |
| 우선순위 | P0 |
| 목표 | 피드백→재생성 루프 연결 + OGD 평가 결과를 prototype_quality에 자동 적재 |

## 배경

Phase 27-A (Sprint 226)에서 Prototype QSA + Offering QSA Discriminator가 구현됐어요.
Phase 27-B는 파이프라인 구성요소 간 단절(GAP)을 복구하는 단계예요.

Sprint 227이 F464(Generation-Evaluation 정합성) + F465(Design Token 연결)을 담당하고,
이번 Sprint 228은 두 개의 남은 GAP을 완결해요:

- **GAP #2**: 사용자 피드백 저장 후 재생성 트리거 미구현 → `feedback_pending` Job이 무시됨
- **GAP #1**: `prototype_quality` 테이블이 O-G-D 루프와 분리 → Quality Dashboard 데이터 부재

## F466: Feedback → Regeneration 루프

### 현재 상태
- `PrototypeFeedbackService.create()`: feedback을 저장하고 job을 `feedback_pending`으로 전환 ✅
- `PrototypeJobService.VALID_TRANSITIONS`: `feedback_pending → building` 정의 ✅
- **연결 고리 없음**: `feedback_pending` 상태를 감지하고 OGD 재실행하는 서비스/라우트 부재 ❌

### 구현 대상
1. **`prototype-feedback-service.ts` 확장**
   - `triggerRegeneration(jobId, orgId, db)` 메서드 추가
   - job의 `feedback_content`를 읽어 `OgdOrchestratorService.runLoop()`에 전달
   - 재생성 완료 후 feedback 상태를 `applied`로, job 상태를 `live`로 전환
   - 실패 시 job을 `failed`로 전환

2. **`ogd-quality.ts` 라우트 확장**
   - `POST /ogd/regenerate/:jobId` — feedback_pending job의 재생성 트리거
   - 응답: `{ summary, jobId, status }`

3. **테스트: `ogd-orchestrator.test.ts` 확장**
   - `feedback_pending` → regeneration 흐름 테스트
   - 성공/실패 케이스

### 수용 기준
- [ ] `POST /ogd/regenerate/:jobId` 엔드포인트 구현
- [ ] `feedback_pending` job의 `feedback_content`가 OGD generator에 전달됨
- [ ] 재생성 완료 후 job이 `live`로 복귀
- [ ] 피드백 상태가 `applied`로 업데이트됨
- [ ] 테스트 8개 이상 통과

## F467: Quality 데이터 통합

### 현재 상태
- `OgdOrchestratorService.runLoop()`: `ogd_rounds`에 라운드 기록 ✅
- `PrototypeQualityService.insert()`: `prototype_quality`에 INSERT 가능 ✅
- **연결 고리 없음**: runLoop 완료 후 `prototype_quality`에 자동 적재하는 코드 없음 ❌

### 구현 대상
1. **`ogd-orchestrator-service.ts` 확장**
   - 생성자에 선택적 `PrototypeQualityService` 주입
   - `runLoop()` 완료 시 최선 라운드(bestRound) 데이터를 `prototype_quality`에 INSERT
   - 5차원 분해 로직: `quality_score`를 기반으로 5차원에 분배 (equal weight)
   - generation_mode = `'ogd'`

2. **`ogd-quality.ts` 라우트 수정**
   - `OgdOrchestratorService` 생성 시 `PrototypeQualityService` 함께 주입

3. **테스트: `ogd-orchestrator.test.ts` 확장**
   - runLoop 완료 후 prototype_quality에 INSERT됐는지 확인
   - quality_score 5차원 분해 검증

### 5차원 분해 로직
OGD rounds는 단일 `quality_score`만 제공해요. 5차원 분해 전략:
- `total_score` = bestScore (0~100)
- 각 차원 = `total_score * weight`
  - `build_score` = total_score * 1.0 (OGD는 빌드/구조 중심)
  - `ui_score` = total_score * 1.0
  - `functional_score` = total_score * 1.0
  - `prd_score` = total_score * 1.0
  - `code_score` = total_score * 1.0
  
> 현 단계에서 OGD discriminator는 차원별 점수를 분리하지 않으므로 equal weight 적용.
> F468 (BD Sentinel) 이후 차원별 rubric 도입 시 여기서 세분화.

### 수용 기준
- [ ] `OgdOrchestratorService`에 `PrototypeQualityService` 주입 패턴 구현
- [ ] runLoop 완료 후 `prototype_quality` INSERT 자동 실행
- [ ] `ogd-quality.ts` 라우트에 quality service 연결
- [ ] 테스트 5개 이상 통과

## 비고

- D1 마이그레이션: 불필요 (기존 테이블 활용)
- 기존 파일만 수정 (신규 파일 최소화)
- Sprint 226 Pattern: `OgdOrchestratorService`의 생성자 주입 패턴 유지
