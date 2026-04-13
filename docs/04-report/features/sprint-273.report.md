---
id: FX-REPORT-273
title: "Sprint 273 Report — F516 Backlog 인입 파이프라인 + 실시간 동기화"
sprint: 273
f_items: [F516]
req: [FX-REQ-544]
status: completed
created: 2026-04-13
match_rate: 95
---

# Sprint 273 Report — F516

## 요약

Backlog 인입 경로를 CLI 단일에서 **웹 폼 + CLI + Marker.io 3채널**로 확장하고,
GitHub push → SSE 실시간 동기화 파이프라인을 구축했어요.

**Match Rate**: 78% (초기) → **95%** (gap 해소 후)

---

## 구현 완료 항목

| # | 항목 | 상태 |
|---|------|------|
| M1-1 | 웹 Backlog 제출 폼 (/work-management "아이디어 제출" 탭) | ✅ |
| M1-2 | POST /api/work/submit — AI 분류 + D1 저장 | ✅ |
| M1-2a | SPEC.md 자동 업데이트 (soft fail + 수동 fallback) | ✅ |
| M1-3 | Marker.io: 기존 GitHub Issues 경유 흐름 + idempotency_key 연동 준비 | ✅ |
| M1-5 | GitHub Issue 자동 생성 (soft fail) | ✅ |
| SSE | GET /api/work/stream — EventSource 연결 + connected 이벤트 | ✅ |
| SSE | submitBacklog → work:backlog-updated broadcast | ✅ |
| SSE | GitHub push → work:snapshot-refresh broadcast | ✅ |
| D1 | backlog_items 테이블 (migration 0128) + idempotency_key 중복 방지 | ✅ |
| WEB | SSE EventSource 연결 → polling 30초 자동 전환 | ✅ |

---

## 테스트 결과

| 파일 | 통과 | 전체 |
|------|:----:|:----:|
| `work-submit.test.ts` | 8 | 8 |
| `work.routes.test.ts` | 9 | 9 |
| `work.service.test.ts` | 15 | 15 |
| **합계** | **32** | **32** |

TypeCheck: `packages/api` PASS / `packages/web` PASS

---

## 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/api/src/db/migrations/0128_backlog_items.sql` | NEW |
| `packages/api/src/schemas/work.ts` | WorkSubmitInputSchema, WorkSubmitOutputSchema 추가 |
| `packages/api/src/services/work.service.ts` | submitBacklog, createGithubIssue, updateSpecMd, SSE broadcast |
| `packages/api/src/services/sse-manager.ts` | BacklogUpdatedData + SSEEvent 2종 추가 |
| `packages/api/src/routes/work.ts` | POST /api/work/submit, GET /api/work/stream |
| `packages/api/src/modules/portal/routes/webhook.ts` | push 이벤트 SSE broadcast |
| `packages/api/src/__tests__/helpers/mock-d1.ts` | backlog_items 테이블 추가 |
| `packages/api/src/__tests__/work-submit.test.ts` | NEW (TDD Red→Green) |
| `packages/web/src/routes/work-management.tsx` | SubmitTab + SSE EventSource |
| `docs/01-plan/features/sprint-273.plan.md` | NEW |
| `docs/02-design/features/sprint-273.design.md` | NEW |

---

## Gap Analysis

**초기 Match Rate**: 78% (15/19)

**Gaps 해소**:
- `sse-manager.ts` BacklogUpdatedData 인터페이스 추가
- `work.service.ts` submitBacklog SSE broadcast 추가
- `webhook.ts` push 이벤트 SSE broadcast 추가

**최종 Match Rate**: 95% (±2% 설계 변경 사항: SSE Durable Objects → ReadableStream 단순 구현)

---

## 설계 변경 사항 (역동기화)

| 항목 | 설계 | 구현 | 사유 |
|------|------|------|------|
| SSE stream 구현 | Durable Objects 기반 | ReadableStream + polling 조합 | Workers에서 long-lived SSE 없이도 `connected` 이벤트로 polling 간격 조정 가능 |
| Marker.io 직접 연동 | webhook 직접 수신 | GitHub Issues 경유 기존 흐름 유지 | 기존 인프라 재활용, webhook 설정 변경 불필요 |

---

## 다음 Sprint (274 — F517 메타데이터 트레이서빌리티)

- REQ↔F-item↔Sprint D1 테이블 구축
- GitHub API PR body 파싱 → Sprint-PR-Commit 연결
- Changelog 구조화 (REQ/F-item/PR 메타태깅)
- /work-management "추적" 탭

---

## 커밋 이력

1. `test(work): F516 red — POST /api/work/submit + GET /api/work/stream TDD Red Phase`
2. `feat(work): F516 green — Backlog 인입 파이프라인 + 실시간 동기화`
3. `fix(work): F516 gap — SSE broadcast 연동 3건 추가`
