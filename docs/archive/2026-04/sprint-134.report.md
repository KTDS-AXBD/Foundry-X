---
code: FX-RPRT-S134
title: "Sprint 134 — F315 상태 모니터링 + 알림 + 권한 제어 완료 보고서"
version: "1.0"
status: Active
category: RPRT
feature: F315
sprint: 134
created: 2026-04-05
updated: 2026-04-05
author: Claude (autopilot)
---

# FX-RPRT-S134: Sprint 134 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F315 — 상태 모니터링 + 알림 + 권한 제어 |
| Sprint | 134 |
| Match Rate | **100%** (15/15 항목 PASS) |
| 테스트 | API 13 + Web 7 = **20 tests** (전체 2684 pass) |
| 파일 | 신규 10 + 수정 5 = **15 파일** |

| 관점 | 내용 |
|------|------|
| Problem | 파이프라인 상태가 실시간으로 공유되지 않고, HITL 승인 권한 통제 없음 |
| Solution | 모니터링 대시보드 + 이벤트→알림 자동 발행 + roleGuard 기반 권한 제어 |
| Function UX Effect | 팀장 대시보드에서 전체 현황 확인, 실패/대기 시 자동 알림, 승인 권한 있는 사용자만 결정 가능 |
| Core Value | 파이프라인 투명성 + 실수 방지 (무권한 승인 차단) |

## 구현 상세

### 1. D1 마이그레이션 (0092)
- `pipeline_permissions` 테이블 신규: 파이프라인별 승인 가능 역할/사용자
- `pipeline_checkpoints`에 `approver_role` 컬럼 추가

### 2. API (4 EP 신규 + 3 EP 수정)
**신규:**
- `GET /discovery-pipeline/dashboard` — 상태별 집계 + 최근 실행 목록
- `GET /discovery-pipeline/runs/:id/permissions` — 승인 권한 목록
- `PUT /discovery-pipeline/runs/:id/permissions` — 승인 권한 설정 (admin+)
- `GET /discovery-pipeline/runs/:id/audit-log` — 승인/거부 이력

**수정:**
- `POST .../checkpoints/:cpId/approve` — 권한 검증 + approver_role 기록
- `POST .../checkpoints/:cpId/reject` — 권한 검증 추가
- `POST .../runs/:id/action` — abort 시 권한 검증 + 알림
- `POST .../runs/:id/step-failed` — 실패 알림 자동 발행

### 3. Services (2 신규 + 1 수정)
- `PipelineNotificationService`: 이벤트→인앱 알림 (중복 5분 방지)
- `PipelinePermissionService`: 승인 권한 CRUD + canApprove/canAbort
- `PipelineCheckpointService`: approve에 approverRole 파라미터 추가

### 4. Web (3 신규)
- `PipelineMonitorDashboard`: 상태별 카드 + 대기 체크포인트 배너 + 실행 목록
- `PipelinePermissionEditor`: 승인 권한 설정 UI (admin 전용)
- `CheckpointApproverInfo`: 승인자 정보 + 이력 표시

### 5. 테스트 (20건)
- API: 대시보드 집계, 권한 CRUD, canApprove/canAbort, 알림 발행/중복 방지, audit-log (13건)
- Web: 대시보드 렌더링, 빈 상태, 권한 에디터, 승인자 정보, 비활성 버튼 (7건)

## 기존 코드 영향

- `discovery-pipeline-route-extended.test.ts`: mock에 `orgRole: "admin"` 추가 (F315 권한 검증과 호환)
- `mock-d1.ts`: 3개 테이블 스텁 추가 (notifications, tenant_members, biz_items) + approver_role 컬럼
- `notification.schema.ts`: 파이프라인 알림 타입 4종 추가
- 기존 2684 tests 전부 영향 없음

## 성공 기준 달성

- [x] 파이프라인 모니터링 대시보드에서 전체 실행 현황 조회 가능
- [x] HITL 대기/실패/완료 시 관련자에게 인앱 알림 자동 발행
- [x] member 미만 역할은 체크포인트 승인/거부 불가 (403)
- [x] 체크포인트 승인 시 승인자 역할 기록
- [x] typecheck + test 전체 통과
