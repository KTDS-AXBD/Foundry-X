---
id: FX-PLAN-273
title: "Sprint 273 Plan — F516 Backlog 인입 파이프라인 + 실시간 동기화"
sprint: 273
f_items: [F516]
req: [FX-REQ-544]
status: active
created: 2026-04-13
---

# Sprint 273 Plan — F516

## 1. 목표

Backlog 인입 경로를 CLI 단일에서 **웹 폼 + CLI + Marker.io 3채널**로 확장하고,
GitHub Webhook → D1 캐시 → SSE 실시간 파이프라인으로 /work-management 폴링(5초)을 대체한다.

## 2. 범위 (Sprint 273 한정, M1 기능)

| ID | 기능 | 우선순위 | 메모 |
|----|------|----------|------|
| M1-1 | 웹 Backlog 제출 폼 | P0 | /work-management "아이디어 제출" 탭 신규 |
| M1-2 | AI 자동 분류 + D1 등록 | P0 | POST /api/work/submit — classify() 확장 + backlog_items D1 저장 |
| M1-2a | SPEC.md 자동 업데이트 | P0 | GitHub API file update (PoC) — 실패 시 수동 fallback |
| M1-3 | Marker.io webhook 연동 | P0 | 기존 webhook-registry 재활용 → backlog 자동 등록 |
| M1-4 | CLI 경로 유지 | P1 | task-start.sh → POST /api/work/submit 경유로 변경 |
| M1-5 | SSE 실시간 동기화 | P0 | GitHub Webhook push → SSE broadcast → 웹 5초 polling 제거 |

**제외 (Sprint 274~275)**:
- M2 메타데이터 트레이서빌리티 (F517)
- M3 Ontology KG (F518)

## 3. 기술 결정

### 3-1. SPEC.md 자동 업데이트 전략
- **1순위**: GitHub API (PUT /repos/.../contents/SPEC.md) — Workers에서 base64 encode + GITHUB_TOKEN 사용
- **fallback**: 수동 merge 안내 + GitHub Issue comment로 "등록 대기" 알림
- D1 `backlog_items` 테이블이 중간 버퍼 역할 (SPEC.md 업데이트와 분리)

### 3-2. SSE 실시간 동기화 전략
- 기존 `sse-manager.ts` + Cloudflare Durable Objects 기반 인프라 재활용
- GitHub Webhook (push event) → `POST /api/work/webhook/github` → SSE broadcast `work:backlog-updated`
- Web: `EventSource('/api/work/stream')` 구독, `work:backlog-updated` 수신 시 스냅샷 재로드

### 3-3. Marker.io 연동
- 기존 `webhook-registry` 테이블 확인 → `marker.io` 소스 엔트리 없으면 신규 등록
- Payload: `feedback.title` + `feedback.description` → `/api/work/submit` 내부 호출

## 4. 구현 파일 예측

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `packages/api/src/db/migrations/0128_backlog_items.sql` | NEW | `backlog_items` D1 테이블 |
| `packages/api/src/schemas/work.ts` | MODIFY | `WorkSubmitInputSchema`, `WorkSubmitOutputSchema` 추가 |
| `packages/api/src/services/work.service.ts` | MODIFY | `submitBacklog()`, `syncGithubBacklog()` 추가 |
| `packages/api/src/routes/work.ts` | MODIFY | `POST /api/work/submit`, `GET /api/work/stream` 추가 |
| `packages/api/src/services/sse-manager.ts` | MODIFY | `BacklogUpdatedData` 이벤트 타입 + `broadcastBacklogUpdate()` |
| `packages/api/src/modules/portal/routes/webhook.ts` | MODIFY | Marker.io + GitHub push 이벤트 처리 |
| `packages/web/src/routes/work-management.tsx` | MODIFY | "아이디어 제출" 탭 + SSE EventSource 구독 |
| `packages/api/src/__tests__/work-submit.test.ts` | NEW | TDD Red→Green |

## 5. TDD 계획

적용 등급: **필수** (새 API 서비스 로직 — `submitBacklog`, `syncGithubBacklog`)

### Red Phase 테스트 계약
1. `POST /api/work/submit` — 입력 분류 + D1 저장 + GitHub Issue 생성 응답 반환
2. `POST /api/work/submit` — AI 분류 실패 시 regex fallback 동작 확인
3. `POST /api/work/submit` — Marker.io 중복 제출 방지 (idempotency_key)
4. `GET /api/work/stream` — SSE 연결 + `work:backlog-updated` 이벤트 수신
5. GitHub webhook push → SSE broadcast 트리거

### Green Phase
- 테스트 통과 최소 구현 (테스트 수정 금지)

## 6. 위험 요소

| 위험 | 가능성 | 완화 방안 |
|------|--------|-----------|
| GitHub API file update가 Cloudflare Workers에서 불가 | 중 | base64 + fetch PoC 먼저, 실패 시 D1만 업데이트 + 수동 알림 |
| Durable Objects SSE 지연 (>2초) | 낮 | polling fallback(10초) 유지 + DO 정상화 후 제거 |
| Marker.io webhook payload 구조 불명확 | 중 | `title`+`description` 필드 존재 가정, 없으면 raw JSON 저장 후 수동 분류 |

## 7. 완료 기준

- [ ] 웹 폼에서 아이디어 제출 → AI 분류 → D1 저장 → GitHub Issue 생성
- [ ] SPEC.md Backlog 테이블 자동 행 추가 (또는 수동 fallback 안내)
- [ ] Marker.io webhook → backlog 자동 등록
- [ ] GitHub push → SSE → 웹 실시간 갱신 (5초 polling 제거)
- [ ] TDD Green (unit test PASS), typecheck PASS
- [ ] Gap Analysis Match Rate ≥ 90%
