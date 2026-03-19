---
code: FX-PLAN-025
title: Sprint 22 — Slack 고도화 (Interactive 메시지 D1 실연동 + 채널별 알림 설정)
version: 1.0
status: Draft
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F94
req: FX-REQ-094
priority: P2
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F94: Slack 고도화 — Interactive 메시지 (승인/거절 버튼), 채널별 알림 설정 |
| 시작일 | 2026-03-19 |
| 예상 범위 | Sprint 22 (API 4~5 endpoints + D1 migration 1개 + 서비스 2개 수정 + 테스트 +30건) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Sprint 18(F85)에서 Slack 기본 연동을 구축했지만, 버튼 클릭이 텍스트 응답만 반환하고 D1 Plan 상태를 실제로 변경하지 않음. 알림은 org 단위 단일 webhook으로만 전송되어 이벤트 유형별 채널 분리가 불가능 |
| **Solution** | Interactive 메시지 버튼(승인/거절) 클릭 시 D1 Plan 상태를 실제 갱신하고 SSE 이벤트를 발행하는 실 연동 구현 + 이벤트 카테고리별 Slack 채널을 지정할 수 있는 알림 설정 시스템 구축 |
| **Function UX Effect** | Slack에서 "승인" 버튼을 누르면 Plan이 즉시 실행되고, "거절"하면 사유 모달이 뜨며, 에이전트/PR/Plan 알림이 각각 다른 Slack 채널로 분리 전송됨 |
| **Core Value** | Slack을 떠나지 않고도 에이전트 Plan 승인/거절 의사결정이 가능해지며, 팀원별 관심사에 맞는 채널로 알림을 받아 정보 과부하를 줄임 |

## 1. 배경 및 목표

### 1.1 현재 상태 (Sprint 18 F85 구현)

| 구성요소 | 파일 | 상태 | 한계 |
|----------|------|------|------|
| SlackService | `services/slack.ts` | ✅ | 3개 이벤트 타입만 지원, webhook URL 단일 |
| Slack Routes | `routes/slack.ts` | ✅ | `/commands`(status, plan) + `/interactions`(버튼 응답만) |
| Slack Schemas | `schemas/slack.ts` | ✅ | SlackCommand + SlackInteraction 기본형 |
| SSE→Slack Bridge | `services/sse-manager.ts` L153~181 | ✅ | org.settings.slack_webhook_url 단일, 카테고리 구분 없음 |
| Signature Verify | `services/slack.ts` L161~185 | ✅ | HMAC-SHA256 + 5분 replay 방어 |
| 테스트 | `__tests__/slack.test.ts` | ✅ | 12건 (service 6 + signature 3 + route 4) |

### 1.2 Sprint 22 목표

1. **Interactive 메시지 D1 실 연동**: 버튼 클릭 → D1 Plan 상태 갱신 + SSE 이벤트 발행
2. **채널별 알림 설정**: 이벤트 카테고리(agent/pr/plan)별 별도 Slack webhook 채널 지정
3. **새 이벤트 타입 추가**: agent.message, queue.conflict 등 Slack 알림 이벤트 확장
4. **테스트 +30건**: D1 연동 + 채널 라우팅 + 새 이벤트 블록 빌더

## 2. 구현 범위

### 2.1 D1 Migration — slack_notification_configs 테이블

```sql
-- 0014_slack_notification_configs.sql
CREATE TABLE IF NOT EXISTS slack_notification_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,          -- 'agent' | 'pr' | 'plan' | 'queue' | 'message'
  webhook_url TEXT NOT NULL,       -- 카테고리별 Incoming Webhook URL
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, category)
);

CREATE INDEX IF NOT EXISTS idx_slack_config_org ON slack_notification_configs(org_id);
```

- org당 카테고리별 1개 행 (UNIQUE 제약)
- `enabled` 필드로 카테고리별 on/off 토글
- 기존 `organizations.settings.slack_webhook_url`은 fallback으로 유지 (마이그레이션 호환)

### 2.2 Interactive 메시지 D1 실 연동

**현재 문제**: `routes/slack.ts` L125~137 — plan_approve/reject 버튼 클릭 시 텍스트만 반환

**수정 대상**: `routes/slack.ts` interactions 핸들러

| action_id | D1 변경 | SSE 이벤트 | Slack 응답 |
|-----------|---------|-----------|-----------|
| `plan_approve` | `plans.status` → 'approved' | `agent.plan.approved` | "✅ 계획 승인 완료 — 실행을 시작해요" |
| `plan_reject` | `plans.status` → 'rejected' | `agent.plan.rejected` | "❌ 계획 거절됨 — 사유: {reason}" |
| `view_dashboard` | — (외부 URL) | — | — |

**구현 흐름**:
```
Slack 버튼 클릭
  → POST /slack/interactions
  → 서명 검증
  → payload.actions[0] 파싱
  → action_id에 따라:
    plan_approve:
      1. D1: UPDATE plans SET status='approved', approved_by='{slack_user_id}' WHERE id='{planId}'
      2. SSE: pushEvent({ event: 'agent.plan.approved', data: { planId, approvedBy } })
      3. Slack 응답: replace_original 블록으로 승인 확인 메시지
    plan_reject:
      1. D1: UPDATE plans SET status='rejected', rejected_reason='{reason}' WHERE id='{planId}'
      2. SSE: pushEvent({ event: 'agent.plan.rejected', data: { planId, reason } })
      3. Slack 응답: replace_original 블록으로 거절 확인 메시지
```

### 2.3 채널별 알림 라우팅

**현재 문제**: `SSEManager.forwardToSlack()` — org.settings.slack_webhook_url 단일

**수정 대상**: `services/sse-manager.ts` forwardToSlack 메서드

```
이벤트 카테고리 매핑:
  agent.task.*      → 'agent'
  agent.pr.*        → 'pr'
  agent.plan.*      → 'plan'
  agent.queue.*     → 'queue'
  agent.message.*   → 'message'
```

**라우팅 로직**:
1. 이벤트 타입 → 카테고리 매핑
2. D1에서 `slack_notification_configs` 조회 (org_id + category)
3. 설정 존재 + enabled → 해당 webhook_url로 전송
4. 설정 없음 → org.settings.slack_webhook_url fallback
5. fallback도 없음 → skip

### 2.4 새 이벤트 타입 지원

SlackService에 추가할 Block Kit 빌더:

| 이벤트 | Block Kit 메시지 | 액션 |
|--------|-----------------|------|
| `queue.conflict` | ⚠️ 머지 큐 충돌 감지 | "대시보드에서 보기" 버튼 |
| `agent.message.received` | 💬 에이전트 메시지 수신 | "답장하기" 버튼 (대시보드 링크) |
| `plan.executing` | 🚀 계획 실행 시작 | — (알림만) |
| `plan.completed` | ✅ 계획 실행 완료 | "결과 보기" 버튼 |
| `plan.failed` | ❌ 계획 실행 실패 | "상세 보기" 버튼 |

### 2.5 API Endpoints

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/orgs/:orgId/slack/configs` | 알림 설정 목록 조회 |
| PUT | `/api/orgs/:orgId/slack/configs/:category` | 카테고리별 설정 생성/수정 (upsert) |
| DELETE | `/api/orgs/:orgId/slack/configs/:category` | 카테고리별 설정 삭제 |
| POST | `/api/orgs/:orgId/slack/test` | 테스트 메시지 발송 (설정 검증용) |

## 3. 수정 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `db/migrations/0014_slack_notification_configs.sql` | **신규** | 알림 설정 테이블 |
| `services/slack.ts` | 수정 | 새 이벤트 타입 + 카테고리별 라우팅 헬퍼 |
| `services/sse-manager.ts` | 수정 | forwardToSlack 카테고리 라우팅 |
| `routes/slack.ts` | 수정 | interactions D1 실 연동 + 새 라우트 |
| `schemas/slack.ts` | 수정 | SlackNotificationConfig 스키마 추가 |
| `__tests__/slack.test.ts` | 수정 | D1 연동 + 채널 라우팅 테스트 추가 |

## 4. 구현 순서

```
Step 1: D1 Migration 0014 작성 + 테스트 헬퍼 반영
  ↓
Step 2: SlackService 확장 — 새 이벤트 타입 Block Kit 빌더 (5개)
  ↓
Step 3: Interactive 메시지 D1 실 연동 — routes/slack.ts 수정
  ↓
Step 4: SSEManager forwardToSlack 카테고리 라우팅
  ↓
Step 5: 알림 설정 CRUD API (4 endpoints)
  ↓
Step 6: 테스트 작성 (+30건)
  ↓
Step 7: typecheck + lint + 전체 테스트 통과 확인
```

## 5. 예상 산출물

| 항목 | 수량 |
|------|------|
| D1 Migration | 1개 (0014) |
| D1 신규 테이블 | 1개 (slack_notification_configs) |
| API Endpoints | 4개 (GET/PUT/DELETE/POST) |
| Block Kit 빌더 | +5개 (queue.conflict, message.received, plan.executing/completed/failed) |
| 테스트 | +30건 (D1 연동 12 + 채널 라우팅 8 + 새 블록 5 + API 5) |
| 총 테스트 (예상) | ~430건 (API 패키지) |

## 6. 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | Slack API rate limit (1msg/sec per webhook) | 대량 이벤트 시 429 | 큐 기반 throttling (미래 스프린트) |
| R2 | 기존 org.settings.slack_webhook_url와의 호환 | 마이그레이션 중 알림 누락 | fallback 로직 유지 |
| R3 | Plan 상태 동시 변경 (SSE+Slack 동시 승인) | race condition | D1 WHERE status='waiting' 조건 추가 |

## 7. 비착수 (Out of Scope)

- Slack Web API (Bot Token, chat.postMessage) — 다음 스프린트
- Slack App Home 탭 / Modal 상호작용
- 프로젝트별 채널 분리 (org 단위만)
- Slack OAuth 설치 플로우
