---
code: FX-PLAN-S160
title: "Sprint 160 — O-G-D 품질 루프 + Prototype 대시보드"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S159]]"
---

# Sprint 160: O-G-D 품질 루프 + Prototype 대시보드

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F355 O-G-D 품질 루프, F356 Prototype 대시보드 + 피드백 Loop |
| Sprint | 160 |
| 우선순위 | F355=P0, F356=P1 |
| 의존성 | Sprint 159 (F353+F354) ✅ 완료 (PR #295) |
| Phase | 16 — Prototype Auto-Gen Integration |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Prototype 생성 후 품질 검증 없이 바로 배포 → 저품질 산출물 전달 위험 |
| Solution | O-G-D 루프로 자동 품질 검증 + 대시보드로 실사용자 피드백 반영 |
| Function UX Effect | BD팀이 대시보드에서 prototype 현황 확인 + 피드백 입력 → 자동 재생성 |
| Core Value | 품질 보증된 prototype만 팀에 전달 → 신뢰도 향상 |

## F355: O-G-D 품질 루프

### 개요
Prototype 생성 시 Generator → Discriminator → Feedback 루프를 통해 품질 ≥ 0.85를 보장하는 자동 품질 검증 시스템.

### 작업 목록

| # | 영역 | 파일 | 작업 내용 |
|---|------|------|-----------|
| 1 | Service | `api/src/services/ogd-orchestrator-service.ts` | O-G-D 루프 오케스트레이터 — 체크리스트 전처리 + 라운드 관리 |
| 2 | Service | `api/src/services/ogd-generator-service.ts` | PRD → HTML 생성 (Haiku 모델, --bare 모드) |
| 3 | Service | `api/src/services/ogd-discriminator-service.ts` | 품질 평가 (0~1 스코어) + Pass/Fail 판정 + 개선 피드백 |
| 4 | Route | `api/src/routes/ogd-quality.ts` | POST /ogd/evaluate, GET /ogd/rounds/:jobId |
| 5 | Schema | `api/src/schemas/ogd-quality-schema.ts` | Zod: OgdEvaluateRequest, OgdRoundResult, OgdSummary |
| 6 | Migration | `api/src/db/migrations/NNNN_ogd_rounds.sql` | ogd_rounds 테이블 (라운드별 스코어/피드백 기록) |
| 7 | Shared | `shared/src/ogd.ts` | OgdRound, OgdSummary, OgdStatus 타입 |
| 8 | Test | `api/src/services/__tests__/ogd-*.test.ts` | 3종 서비스 단위 테스트 |
| 9 | Test | `api/src/routes/__tests__/ogd-quality.test.ts` | 라우트 통합 테스트 |

### 수렴 판정 규칙
- **최대 라운드**: 3회
- **통과 임계값**: qualityScore ≥ 0.85
- **조기 탈출**: 1라운드라도 ≥ 0.85이면 즉시 Pass
- **실패 처리**: 3라운드 후에도 < 0.85이면 최고 스코어 라운드 채택 + 수동 리뷰 플래그

## F356: Prototype 대시보드 + 피드백 Loop

### 개요
BD팀이 prototype 목록/상세를 확인하고, 빌드로그/프리뷰를 보며 피드백을 입력하면 자동으로 Generator가 재생성하는 피드백 루프 + Slack 알림.

### 작업 목록

| # | 영역 | 파일 | 작업 내용 |
|---|------|------|-----------|
| 1 | Page | `web/src/routes/prototype-dashboard.tsx` | 대시보드 메인 — 목록 + 상태별 필터 + 비용 요약 |
| 2 | Page | `web/src/routes/prototype-detail.tsx` | 상세 — 빌드로그 + iframe 프리뷰 + O-G-D 라운드 히스토리 |
| 3 | Component | `web/src/components/prototype/PrototypeCard.tsx` | 목록 카드 — 상태 뱃지 + 비용 + 최종 스코어 |
| 4 | Component | `web/src/components/prototype/BuildLogViewer.tsx` | 빌드로그 뷰어 — 단계별 펼침/접기 |
| 5 | Component | `web/src/components/prototype/FeedbackForm.tsx` | 피드백 입력 폼 — 텍스트 + 카테고리 선택 |
| 6 | Component | `web/src/components/prototype/QualityScoreChart.tsx` | O-G-D 라운드별 스코어 시각화 |
| 7 | Route | `api/src/routes/prototype-feedback.ts` | POST /prototype-jobs/:id/feedback — 피드백 저장 + 재생성 트리거 |
| 8 | Schema | `api/src/schemas/prototype-feedback-schema.ts` | Zod: FeedbackRequest, FeedbackResponse |
| 9 | Service | `api/src/services/prototype-feedback-service.ts` | 피드백 저장 + job 상태 전환 (live→feedback_pending→building) |
| 10 | Service | `api/src/services/slack-notification-service.ts` | Slack webhook으로 빌드 완료/실패/피드백 알림 |
| 11 | Migration | `api/src/db/migrations/NNNN_prototype_feedback.sql` | prototype_feedback 테이블 |
| 12 | Shared | `shared/src/prototype-feedback.ts` | PrototypeFeedback, FeedbackCategory 타입 |
| 13 | Test | 각 서비스/라우트 테스트 | 단위 + 통합 테스트 |

### 피드백 카테고리
- `layout` — 레이아웃/디자인 문제
- `content` — 텍스트/데이터 부정확
- `functionality` — 기능 미동작
- `ux` — UX 개선 요청
- `other` — 기타

### Slack 알림 이벤트
- `build_complete` — prototype 빌드 성공 (live 전환)
- `build_failed` — 빌드 실패 (dead_letter 전환)
- `feedback_received` — BD팀 피드백 접수
- `ogd_pass` — O-G-D 품질 통과

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Haiku 모델 품질 불안정 | O-G-D 루프 수렴 불가 | max 3 라운드 + 최고 스코어 채택 fallback |
| Slack webhook 미설정 | 알림 미발송 | graceful degradation — 알림 실패 시 로그만 기록 |
| iframe CSP 제한 | 프리뷰 미표시 | sandbox 속성 조정 + fallback 스크린샷 |

## 완료 기준 (DoD)

- [ ] typecheck 통과
- [ ] lint 통과
- [ ] 단위 테스트 전체 Pass
- [ ] O-G-D 루프 3라운드 수렴 시나리오 검증
- [ ] 대시보드 목록/상세/피드백 E2E 동작 확인
- [ ] Gap Analysis ≥ 90%
