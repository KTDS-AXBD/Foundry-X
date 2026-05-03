---
title: F582 KOAMI Dogfood 1-Page Command Sheet
subtitle: Phase 47 GAP-4 Smoke Reality 운영자 1회 실행 가이드
version: v1 (2026-05-04, S322)
owner: Sinclair Seo
audience: admin 권한 보유 운영자 (KTDS-AXBD)
based_on:
  - F582 Sprint 328 (PR #710 MERGED, S319) — fx-discovery DiagnosticCollector 배선
  - scripts/dogfood-graph.sh (Phase 42 Dogfood 원본)
  - SPEC.md §5 F582 Phase Exit P-d 미수행 잔존
estimated_time: 5분 (커맨드 실행) + 5분 (검증)
---

# F582 KOAMI Dogfood — 1-Page Command Sheet

> **목적**: F582(Sprint 328) 배선 검증 마무리 — Production에서 KOAMI 도메인으로 graph 1회 실행하여 `agent_run_metrics`, `agent_improvement_proposals`, `dual_ai_reviews` 인프라가 4월 21일 stale 이후 진정 가동되는지 확증.
>
> **왜 운영자가 필요한가**: 본 endpoint는 `org_members` 테이블 등록된 admin 권한 사용자만 호출 가능. Master pane은 권한 없음 (S319에서 403 차단 확증).

---

## STEP 0 — 환경 변수 준비

```bash
# Production API
export FX_API_URL="https://foundry-x-api.ktds-axbd.workers.dev/api"

# JWT 획득 방법: 웹 fx.minu.best 로그인 → DevTools → Network → 아무 API 호출의 Authorization 헤더 복사
export FX_JWT="Bearer eyJhbGciOiJIUzI1NiIs..."  # 본인 JWT 붙여넣기

# Biz Item ID (KOAMI)
export BIZ_ITEM_ID="bi-koami-001"
```

---

## STEP 1 — Pre-flight (실행 전 stale 상태 확인)

```bash
cd packages/api && npx wrangler d1 execute foundry-x-db --remote --command "
SELECT
  (SELECT COUNT(*) FROM graph_sessions) AS graph_sessions,
  (SELECT COUNT(*) FROM agent_run_metrics) AS agent_run_metrics,
  (SELECT COUNT(*) FROM agent_improvement_proposals) AS proposals,
  (SELECT COUNT(*) FROM dual_ai_reviews) AS dual_ai_reviews,
  (SELECT MAX(created_at) FROM agent_run_metrics) AS last_metric_at;
"
```

**예상 (실행 전, 2026-05-04 시점)**: graph_sessions=10, agent_run_metrics=116, proposals=27, dual_ai_reviews=14, last_metric_at=2026-04-21T00:38:xx (12일+ stale).

---

## STEP 2 — KOAMI Discovery Graph 실행 (메인)

### 옵션 A — 기존 dogfood 스크립트 사용 (권장)

```bash
./scripts/dogfood-graph.sh "$BIZ_ITEM_ID" "$FX_JWT"
```

### 옵션 B — 직접 curl

```bash
curl -X POST "$FX_API_URL/biz-items/$BIZ_ITEM_ID/discovery-graph/run-all" \
  -H "Authorization: $FX_JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 600
```

**예상 응답**:
```json
{
  "ok": true,
  "sessionId": "graph-koami-...",
  "completedStages": 9,
  ...
}
```

> **소요 시간**: 9-stage 순차 실행, 약 3~5분. 실패 시 `wrangler tail` 30초 관찰 권장.

---

## STEP 3 — F582 인프라 가동 검증 (4종 동시)

`SESSION_ID`를 응답에서 복사 후 본인 환경에 export:

```bash
export SESSION_ID="graph-koami-..."  # STEP 2 응답에서 복사

cd packages/api && npx wrangler d1 execute foundry-x-db --remote --command "
SELECT
  -- 1) graph_sessions: 신규 1건 INSERT 확증
  (SELECT COUNT(*) FROM graph_sessions WHERE session_id='$SESSION_ID') AS new_graph_session,

  -- 2) biz_items 상태 갱신: KOAMI updated_at 본 실행 시점
  (SELECT updated_at FROM biz_items WHERE id='$BIZ_ITEM_ID') AS koami_updated_at,

  -- 3) agent_run_metrics: 본 session_id 행수 (stage 1+ stage)
  (SELECT COUNT(*) FROM agent_run_metrics WHERE session_id LIKE '%$BIZ_ITEM_ID%' AND created_at > datetime('now', '-15 minutes')) AS new_metrics,

  -- 4) agent_improvement_proposals: MetaAgent auto-trigger로 신규 proposals
  (SELECT COUNT(*) FROM agent_improvement_proposals WHERE created_at > datetime('now', '-15 minutes')) AS new_proposals;
"
```

**기대 결과**:
| 컬럼 | 4월 21일 stale | 본 실행 후 (기대) | 의미 |
|------|---------------|-----------------|------|
| `new_graph_session` | 0 | **≥ 1** | F535 Graph 실행 정식 API 가동 |
| `koami_updated_at` | 2026-04-21 | **2026-05-04 시점** | F582 routing fix 효과 |
| `new_metrics` | 0 | **≥ 9** (9-stage × DiagnosticCollector record) | F582 fx-discovery DiagnosticCollector 배선 가동 |
| `new_proposals` | 0 | **≥ 1** (auto-trigger fire-and-forget) | F582 autoTriggerMetaAgent 가동 |

---

## STEP 4 — Worker 로그 30초 관찰 (선택, 디버깅용)

별도 터미널에서:

```bash
# Main API
cd packages/api && npx wrangler tail foundry-x-api --format pretty &

# fx-discovery (F582 핵심 검증 대상)
cd packages/fx-discovery && npx wrangler tail fx-discovery --format pretty &

# 30초 관찰 후 Ctrl+C
sleep 30 && kill %1 %2 2>/dev/null
```

**관찰 포인트**:
- `[DiagnosticCollector] record(...)` 로그 9건 이상 (각 stage)
- `[autoTriggerMetaAgent] enqueue(...)` 로그 1건 이상
- `error` 0건 — error 발견 시 본 시트의 STEP 5 이슈 보고로

---

## STEP 5 — 결과 보고 (Sinclair에게)

다음 1줄 포맷으로 회신:

```
F582 KOAMI Dogfood 결과: graph_sessions+1=[1], metrics+N=[9], proposals+N=[1|0], updated_at=[2026-05-04 hh:mm], 에러=[0|N]
```

**판정 기준**:
- ✅ **PASS**: `metrics+N ≥ 1` AND `error = 0` → F582 Phase Exit P-d 충족, Phase 47 GAP-4 진정 종결
- ⚠️ **PARTIAL**: `metrics+N ≥ 1` BUT `proposals+N = 0` → DiagnosticCollector OK, autoTriggerMetaAgent 별도 점검 (별건 등록)
- ❌ **FAIL**: `metrics+N = 0` → F582 routing fix 미완. 즉시 Sinclair에게 보고 + worker tail 로그 첨부

---

## 참고 — 본 실행이 가진 의미

| 검증 항목 | 의미 |
|----------|------|
| F582 Sprint 328 PR #710 routing fix 효과 | fx-discovery DiagnosticCollector + autoTriggerMetaAgent 배선이 실 트래픽에 도달 |
| Phase 47 GAP-4 진정 종결 | 4월 21일 12일+ stale → 5월 4일 신규 데이터 흐름 회복 |
| C103·C104 silent fail layer 1~5 효과 | dual_ai_reviews 자동 INSERT 인프라가 본 실행 sprint와 무관하게 정적 가동 |

---

## 트러블슈팅

| 증상 | 원인 | 조치 |
|------|------|------|
| `403 Forbidden` | JWT 만료 또는 admin 권한 없음 | 새 JWT 획득 + `org_members` 등록 확인 |
| `500 Internal Server Error` | fx-discovery binding 미설정 | `wrangler.toml` `[services]` DISCOVERY 확인 |
| `--max-time 600` 초과 | LLM 호출 지연 (Tier 1 Opus) | 재실행 또는 Cost Governor 한도 확인 |
| `metrics+N = 0` PASS but routing 정상 | F582 hotfix `8c372d27` `.catch()` 효과로 silent skip | wrangler tail로 `[DiagnosticCollector]` 로그 직접 확인 |

---

> **이 시트의 한 줄**: KOAMI Discovery Graph 1회 실행으로 F582 Smoke Reality 마무리. 5분 안에 PASS 판정 가능. 운영자 1회 가동만 필요.
