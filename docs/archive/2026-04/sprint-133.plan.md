---
code: FX-PLAN-S133
title: "Sprint 133 — 발굴 연속 스킬 파이프라인 + HITL 체크포인트"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S132]], [[FX-PLAN-S132]]"
---

# Sprint 133 Plan: 발굴 연속 스킬 파이프라인 + HITL 체크포인트

## 1. 목표

F314 (FX-REQ-306, P1): 발굴 2-0~2-10 자동 순차 실행 + 사업성 체크포인트(Commit Gate) 사용자 승인 UI

Sprint 132에서 구축한 파이프라인 상태 머신(F312+F313)은 "단계 완료/실패를 수동으로 보고받는" 구조였다.
Sprint 133은 이를 확장하여:
1. **자동 연속 실행**: 2-0 완료 → 2-1 자동 시작 → ... → 2-10까지 연쇄 실행
2. **HITL 체크포인트**: 사업성 체크포인트(2-1, 2-3, 2-5 Commit Gate, 2-7)에서 자동 정지 + 사용자 승인/거부 UI
3. **스킬 자동 실행 연동**: BdSkillExecutor를 파이프라인에 통합하여 각 단계 스킬을 자동 호출

## 2. 선행 조건

- [x] F312: 형상화 자동 전환 (Sprint 132, PR #266) ✅
- [x] F313: 파이프라인 상태 머신 (Sprint 132, PR #266) ✅
- [x] BdSkillExecutor (F260, Sprint 101) ✅
- [x] bd_skills + bd_artifacts D1 테이블 ✅

## 3. 구현 범위

### 3.1 API — 스킬 파이프라인 오케스트레이터

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| 1 | D1 마이그레이션 | `0091_pipeline_checkpoints.sql` | HITL 체크포인트 테이블 (pipeline_checkpoints) |
| 2 | Zod 스키마 확장 | `discovery-pipeline.ts` 스키마 추가 | 체크포인트 관련 스키마 |
| 3 | SkillPipelineRunner | `skill-pipeline-runner.ts` | 2-0~2-10 자동 순차 실행 + HITL 정지 |
| 4 | HITL 체크포인트 서비스 | `pipeline-checkpoint-service.ts` | 승인/거부/타임아웃 관리 |
| 5 | 라우트 추가 (4 EP) | `discovery-pipeline.ts` | auto-advance, checkpoint approve/reject/list |
| 6 | 테스트 | 3개 테스트 파일 | runner + checkpoint + route |

### 3.2 Web — HITL 체크포인트 UI

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| 1 | CheckpointReviewPanel | `CheckpointReviewPanel.tsx` | 승인/거부 + 사업성 질문 표시 |
| 2 | AutoAdvanceToggle | `AutoAdvanceToggle.tsx` | 자동 진행 on/off + 현재 단계 표시 |
| 3 | PipelineTimeline 확장 | 기존 컴포넌트 수정 | 체크포인트 마커 + 대기 상태 표시 |

## 4. 기술 설계 요약

### 4.1 자동 연속 실행 흐름

```
POST /runs (triggerMode=auto)
  → createRun + startRun (idle → discovery_running, step=2-0)
  → SkillPipelineRunner.runStep('2-0')
    → BdSkillExecutor.execute()
    → reportStepComplete('2-0')
    → isCheckpoint('2-1')? → 예: pause + checkpoint 생성
                            → 아니오: runStep('2-1')
  → ... 반복 ...
  → reportStepComplete('2-10')
    → shouldTriggerShaping=true → 형상화 자동 시작
```

### 4.2 HITL 체크포인트 단계

| 단계 | 유형 | 질문 | 의미 |
|------|------|------|------|
| 2-1 | 사업성 체크 | "이 아이디어는 우리 역량에 부합하나요?" | 초기 필터링 |
| 2-3 | 사업성 체크 | "시장 규모와 경쟁 강도가 적정한가요?" | 중간 검증 |
| 2-5 | **Commit Gate** | 4가지 필수 질문 (TAM/경쟁우위/수익모델/팀역량) | 본격 투자 결정 |
| 2-7 | 사업성 체크 | "파일럿 결과가 기대에 부합하나요?" | 후기 검증 |

### 4.3 체크포인트 상태 흐름

```
checkpoint 생성 (status=pending)
  → 사용자 승인 (approved) → 다음 단계 자동 진행
  → 사용자 거부 (rejected) → 파이프라인 paused (수동 개입 대기)
  → 타임아웃 (24h) → expired → 파이프라인 paused
```

## 5. 일정 (Autopilot 기준)

| 단계 | 예상 |
|------|------|
| Plan | 이미 완료 |
| Design | ~5분 |
| 구현 (API 6파일 + Web 3파일) | ~15분 |
| 테스트 | ~5분 |
| 갭 분석 + 보고서 | ~3분 |
| 커밋 + PR | ~2분 |
| **합계** | ~30분 |

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| BdSkillExecutor 호출이 Workers 30초 제한 초과 | 각 단계를 개별 API 호출로 분리 (auto-advance 엔드포인트) |
| 체크포인트 타임아웃 관리 | D1에 deadline 저장, Cron Trigger로 만료 체크 |
| 파이프라인 중간 실패 시 재개 | 기존 F313 에러핸들러 활용 (retry/skip/abort) |
