---
code: FX-PLAN-S134
title: "Sprint 134 — F315 상태 모니터링 + 알림 + 권한 제어"
version: "1.0"
status: Active
category: PLAN
feature: F315
sprint: 134
created: 2026-04-05
updated: 2026-04-05
author: Claude (autopilot)
---

# FX-PLAN-S134: Sprint 134 Plan

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F315 — 상태 모니터링 + 알림 + 권한 제어 |
| Sprint | 134 |
| PRD | fx-discovery-v2/prd-final.md §4.1 #7, #8 |
| 선행 | F314 (발굴 연속 스킬 파이프라인 + HITL 체크포인트) ✅ |
| 목표 | 파이프라인 진행 대시보드 + 실시간 알림 + HITL 승인 권한 관리 |

| 관점 | 내용 |
|------|------|
| Problem | 파이프라인 실패/대기 상태가 실시간 공유 안 됨, HITL 승인 권한 통제 없음 |
| Solution | 모니터링 대시보드 + 이벤트→알림 자동 발행 + roleGuard 기반 권한 제어 |
| Function UX Effect | 팀장이 대시보드에서 전체 파이프라인 현황 확인, 실패/대기 시 자동 알림, 승인 권한이 있는 사용자만 체크포인트 결정 가능 |
| Core Value | 파이프라인 투명성 확보 + 실수 방지 (권한 없는 승인 차단) |

## 1. 목표 및 범위

### 1.1 핵심 목표
1. **파이프라인 모니터링 대시보드**: 전체 파이프라인 실행 목록 + 상태별 필터 + 소요시간 + 실시간 현황
2. **파이프라인 이벤트 알림**: HITL 대기, 실패, 완료 등 주요 이벤트 발생 시 인앱 알림 자동 생성
3. **HITL 승인 권한 제어**: 체크포인트 승인/거부에 `admin`+ 권한 필요 + 승인 이력 추적

### 1.2 범위
- **포함**: D1 마이그레이션 (pipeline_permissions), API 4 EP, Service 2개, Web 3 컴포넌트
- **제외**: Slack/이메일 외부 알림 (인앱만), 실시간 WebSocket (폴링 방식)

## 2. 기존 인프라 활용

| 기존 자산 | 활용 방식 |
|-----------|-----------|
| `NotificationService` (F233) | 파이프라인 이벤트→알림 자동 발행 hook |
| `NotificationList` 웹 컴포넌트 | 그대로 활용 (이미 알림 목록 UI 존재) |
| `roleGuard` 미들웨어 | HITL 체크포인트 승인/거부에 적용 |
| `PipelineTimeline` (F312+F314) | 모니터링 대시보드에서 재사용 |
| `pipeline_events` 테이블 (F312) | 이벤트 기반 알림 트리거 소스 |
| `pipeline_checkpoints` (F314) | 승인 이력 확장 (approver_role 컬럼 추가) |

## 3. 구현 계획

### Phase A: D1 마이그레이션 (0092)
- `pipeline_permissions` 테이블: 파이프라인별 승인 가능 사용자/역할 설정
- `pipeline_checkpoints`에 `approver_role` 컬럼 추가

### Phase B: API — 알림 연동 서비스
- `PipelineNotificationService`: 파이프라인 이벤트→알림 자동 발행
  - HITL 대기 시 → 승인 권한자에게 알림
  - 실패 시 → 파이프라인 생성자에게 알림
  - 완료 시 → 관련자 전체 알림
- `PipelinePermissionService`: 파이프라인별 승인 권한 CRUD

### Phase C: API — 라우트 확장
- `GET /discovery-pipeline/dashboard` — 모니터링 대시보드 데이터 (상태별 집계 + 최근 실행 목록)
- `GET /discovery-pipeline/runs/:id/permissions` — 승인 권한 목록
- `PUT /discovery-pipeline/runs/:id/permissions` — 승인 권한 설정 (admin+)
- 기존 체크포인트 승인/거부 EP에 `roleGuard('member')` 적용

### Phase D: Web — 모니터링 대시보드 + 권한 UI
- `PipelineMonitorDashboard`: 전체 파이프라인 현황 (상태별 카드 + 목록)
- `PipelinePermissionEditor`: 승인 권한 설정 UI
- `CheckpointApproverInfo`: 승인자 정보 + 이력 표시

### Phase E: 테스트
- API 테스트: 알림 발행 + 권한 CRUD + 대시보드 집계
- Web 테스트: 대시보드 렌더링 + 권한 UI

## 4. 예상 산출물

| 유형 | 파일 | 설명 |
|------|------|------|
| D1 | `0092_pipeline_monitoring.sql` | pipeline_permissions + checkpoints 확장 |
| Service | `pipeline-notification-service.ts` | 이벤트→알림 자동 발행 |
| Service | `pipeline-permission-service.ts` | 파이프라인 승인 권한 관리 |
| Schema | `pipeline-monitoring.schema.ts` | 모니터링/권한 Zod 스키마 |
| Route | `pipeline-monitoring.ts` | 대시보드 + 권한 EP 4개 |
| Web | `PipelineMonitorDashboard.tsx` | 모니터링 대시보드 |
| Web | `PipelinePermissionEditor.tsx` | 승인 권한 설정 |
| Web | `CheckpointApproverInfo.tsx` | 승인자 정보/이력 |
| Test | `pipeline-monitoring.test.ts` | API 테스트 |
| Test | `pipeline-monitor-dashboard.test.tsx` | Web 테스트 |

## 5. 리스크

| 리스크 | 대응 |
|--------|------|
| 알림 과다 발생 | 중복 방지 로직 (같은 이벤트 5분 내 재발행 차단) |
| 권한 미설정 시 | 기본값: `admin`+ 역할은 항상 승인 가능 |

## 6. 성공 기준

- [ ] 파이프라인 모니터링 대시보드에서 전체 실행 현황 조회 가능
- [ ] HITL 대기/실패/완료 시 관련자에게 인앱 알림 자동 발행
- [ ] `member` 미만 역할은 체크포인트 승인/거부 불가 (403)
- [ ] 체크포인트 승인 시 승인자 역할 기록
- [ ] typecheck + lint + test 전체 통과
