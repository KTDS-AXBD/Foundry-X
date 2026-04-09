---
code: FX-RPRT-S238
title: "Sprint 238 완료 보고서 — F485 + F486"
version: 1.0
status: Active
category: report
created: 2026-04-09
updated: 2026-04-09
author: Claude
sprint: 238
f-items: [F485, F486]
---

# Sprint 238 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F485 발굴 분석 결과 표시 + HITL 피드백 루프 / F486 9기준 체크리스트 UX 정리 |
| Sprint | 238 |
| Match Rate | **100%** (15/15) |
| 테스트 | 9 pass / 0 fail |
| 변경 파일 | 7 files (API 2 + Web 3 + 연동 1 + 테스트 1) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **문제** | 완료된 분석 단계의 결과를 다시 볼 수 없음 + 9기준 체크리스트가 역할 불명확 |
| **해결** | bd_artifacts 저장 + GET /result API + 완료 단계 펼쳐보기 + 피드백 재실행 + criteria 자동 연동 |
| **기능 UX 효과** | 완료 단계 클릭으로 결과 즉시 확인 + 재실행으로 품질 향상 + AI 자동/수동 역할 명확화 |
| **핵심 가치** | BD 발굴 프로세스의 HITL 루프 완성 — 분석 결과 추적 + 피드백 반영 + 기준 자동 완료 |

## 구현 상세

### F485: 발굴 분석 결과 표시 + HITL 피드백 루프

1. **API: bd_artifacts 자동 저장** — runStage 실행 시 AI 결과를 bd_artifacts에 저장, version 자동 증가
2. **API: GET /result 엔드포인트** — 완료된 단계의 최신 결과 + viability decision 조회
3. **Web: 완료 단계 펼쳐보기** — 완료된 단계 클릭 시 API에서 결과 조회하여 표시 (intensity 배지 + decision 배지 + 피드백)
4. **Web: 피드백 재실행** — "피드백 재실행" 버튼으로 피드백 입력 후 동일 단계 재분석 가능

### F486: 9기준 체크리스트 UX 정리

1. **API: criteria 자동 갱신** — confirmStage 시 STAGE_CRITERIA_MAP에 따라 관련 기준 자동 completed 처리
2. **Web: 역할 배지** — 각 기준에 "AI 자동" 또는 "수동 확인" 배지 표시
3. **Web: 설명 + 연결 단계** — 기준 카드 확장 시 연결된 분석 단계 + 역할 설명 표시
4. **Web: refresh 연동** — stage complete 시 부모에서 refreshTrigger로 criteria 데이터 갱신

## PDCA 문서

| 문서 | 경로 |
|------|------|
| Plan | `docs/01-plan/features/discovery-detail-ux-v2.plan.md` |
| Design | `docs/02-design/features/sprint-238.design.md` |
| Analysis | `docs/03-analysis/features/sprint-238.analysis.md` |
| Report | `docs/04-report/features/sprint-238.report.md` |
