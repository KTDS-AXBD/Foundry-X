---
code: FX-PLAN-194
title: "Sprint 194 — Gate-X 외부 웹훅 연동 + 멀티테넌시 격리 (F410)"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
system-version: "2.0.0"
sprint: 194
f-items: [F410]
---

# Sprint 194 Plan — Gate-X 외부 웹훅 연동 + 멀티테넌시 격리

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F410 외부 웹훅 연동 + 멀티테넌시 격리 — 테넌트별 데이터/API 분리 |
| Sprint | 194 |
| 시작일 | 2026-04-07 |
| 예상 소요 | 1 Sprint (Autopilot) |
| PRD | docs/specs/gate-x/prd-final.md (M3 확장 기능 + M4 SaaS 기반) |
| REQ | FX-REQ-402 (P2) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Gate-X 검증 완료 이벤트가 Web UI 폴링 전용 — Slack/Teams/HTTP 같은 외부 협업 도구로 자동 알림 불가. 멀티테넌시 격리 없이 단일 org 운영 중 |
| Solution | (1) 웹훅 구독 CRUD + 이벤트 발송 서비스 — Slack/Teams/HTTP 대상 서명 검증 방식으로 안전 전송. (2) 테넌트 관리 테이블 + RBAC 확장 (tenant_admin/member 역할) + 테넌트별 데이터 격리 강화 |
| Function UX Effect | BD팀원이 검증 완료 시 Slack DM·채널에 자동 알림 수신. 테넌트 관리자가 멤버 초대·제거·역할 변경 가능 |
| Core Value | Gate-X의 SaaS 확장 기반 — 외부 시스템 연동 생태계 + 팀/고객별 완전 격리 운영 |

---

## 1. 배경 및 목표

### 1.1 현재 상태 (As-Is)
- **웹훅 없음**: Gate-X 검증 완료 이벤트가 D1 DB에만 기록 — 외부 알림 불가
- **단순 orgId 격리**: JWT payload의 `orgId` 필터링만 적용 — 테넌트 관리 API·멤버 RBAC 없음
- **테넌트 테이블 없음**: `org_id`는 JWT에서 추출될 뿐, D1에 테넌트 엔티티 없음

### 1.2 목표 상태 (To-Be)
- **웹훅 구독 관리**: `webhook_subscriptions` 테이블 + CRUD API — 이벤트 유형별(evaluation.completed, evaluation.failed 등) 구독 설정
- **웹훅 발송 서비스**: 검증 이벤트 발생 시 등록된 웹훅 엔드포인트에 HMAC-SHA256 서명 페이로드 전송
- **테넌트 관리 테이블**: `tenants` + `tenant_members` D1 테이블 — 멤버 초대/역할/활성화 상태 관리
- **RBAC 확장**: `tenant_admin` 역할 → 멤버/웹훅 관리 가능, `member` → 읽기+평가 실행

---

## 2. 구현 범위

### F410: 외부 웹훅 연동 + 멀티테넌시 격리

#### 2.1 웹훅 연동 (Webhook Integration)
| 구성요소 | 내용 |
|----------|------|
| D1 마이그레이션 | `webhook_subscriptions` 테이블 — url, events(JSON), secret, is_active, org_id |
| 웹훅 서비스 | `webhook-service.ts` — 구독 CRUD + 이벤트 발송 (HMAC-SHA256 서명) |
| 웹훅 라우트 | `webhooks.ts` — GET/POST/PUT/DELETE `/api/gate/webhooks` |
| Zod 스키마 | `webhook-schema.ts` — CreateWebhookSchema, UpdateWebhookSchema |
| 이벤트 연동 | `evaluation-service.ts` 완료 시점에 `webhookService.dispatch()` 호출 |

**지원 이벤트 유형**:
- `evaluation.completed` — 검증 완료 (passed)
- `evaluation.failed` — 검증 실패 (failed)
- `evaluation.started` — 검증 시작
- `decision.made` — Go/No-Go 결정

#### 2.2 멀티테넌시 격리 (Multi-tenancy Isolation)
| 구성요소 | 내용 |
|----------|------|
| D1 마이그레이션 | `tenants` + `tenant_members` 테이블 |
| 테넌트 서비스 | `tenant-service.ts` — 생성/조회/멤버 초대/역할 변경/활성화 CRUD |
| 테넌트 라우트 | `tenants.ts` — `/api/tenants` + `/api/tenants/:id/members` |
| Zod 스키마 | `tenant-schema.ts` — CreateTenantSchema, InviteMemberSchema |
| RBAC 확장 | `tenantGuard` 미들웨어에 `tenant_admin` 역할 체크 로직 추가 |
| 테스트 | `webhook-service.test.ts` + `tenant-service.test.ts` |

---

## 3. 의존성

| 의존 | 내용 |
|------|------|
| Sprint 193 (F409) | custom_validation_rules 테이블 + evaluation-service.ts (dispatch 연동 대상) |
| harness-kit | JWT 검증, CORS, errorHandler 재사용 |
| D1 migrations | 0003_custom_rules.sql 다음 0004_webhooks_tenants.sql |

---

## 4. 위험 요소

| 위험 | 대응 |
|------|------|
| 웹훅 발송 실패 | 비동기 fire-and-forget + 에러 로깅 (Workers 환경에서 retry는 DO/Queue 단계에서) |
| HMAC 키 노출 | `secret`은 생성 시만 반환, 이후 조회 API에서 마스킹 (`***`) |
| 테넌트 데이터 격리 누락 | 모든 서비스 레이어에 `org_id` 필터 강제 — ESLint 룰 적용 |

---

## 5. 완료 기준

- [ ] D1 migration 0004 적용 — `webhook_subscriptions`, `tenants`, `tenant_members`
- [ ] 웹훅 CRUD API 4개 엔드포인트 동작
- [ ] 검증 완료 시 웹훅 dispatch 동작 (HMAC 서명 포함)
- [ ] 테넌트 관리 API (생성/멤버 초대/역할 변경) 동작
- [ ] RBAC `tenant_admin` 역할 체크 동작
- [ ] TypeScript typecheck 통과
- [ ] 단위 테스트 2개 파일 (webhook + tenant service)
