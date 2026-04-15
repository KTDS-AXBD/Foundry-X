---
id: FX-PLAN-SPRINT-298
title: Sprint 298 Plan — fx-ai-foundry-os MVP (F545~F549)
sprint: 298
features: [F545, F546, F547, F548, F549]
req: [FX-REQ-581, FX-REQ-582, FX-REQ-583, FX-REQ-584, FX-REQ-585]
deadline: "2026-04-17T09:00:00+09:00"
prd: docs/specs/fx-ai-foundry-os/prd-final.md
created: 2026-04-16
---

# Sprint 298 Plan — fx-ai-foundry-os MVP

## 1. 목표 (42시간 MVP)

대표 보고(4/17 09:00) 데모 완성:
- Foundry-X 웹에서 AI Foundry OS 3-Plane 대시보드 접근 가능
- Decode-X (svc-extraction/svc-ontology) 연동 레이어 동작
- LPON Type 1 반제품 시연 + 다운로드
- Harness 5종 체크리스트 UI
- KG XAI 뷰어 (최소 10+ 노드)

## 2. F-item 요약

| F-item | 제목 | REQ | 우선순위 | 예상 시간 |
|--------|------|-----|---------|---------|
| F545 | 3-Plane 랜딩 대시보드 | FX-REQ-581 | P0 | 3시간 |
| F546 | fx-decode-bridge 연동 레이어 | FX-REQ-582 | P0 | 6시간 |
| F547 | LPON Type 1 시연 페이지 | FX-REQ-583 | P0 | 5시간 |
| F548 | Harness 5종 체크리스트 UI | FX-REQ-584 | P0 | 3시간 |
| F549 | KG XAI 뷰어 (read-only) | FX-REQ-585 | P0 | 5시간 |

**총 예상**: 22시간 구현 + 4시간 테스트 + 4시간 배포/리허설 = 30시간

## 3. Decode-X 연동 사전 파악

### 배포된 Workers
- `svc-extraction`: `/analyze`(POST), `/analysis/*`(GET), `/comparison/*`(GET), `/export/*`(GET)
- `svc-ontology`: `/graph/visualization`(GET), `/terms`(GET), `/terms/:id`(GET), `/graph`(GET)
- `svc-mcp-server`: 이번 Sprint 제외 (P2)

### 인증
- 모든 라우트: `X-Internal-Secret` 헤더 필수
- `INTERNAL_API_SECRET` → Foundry-X wrangler secret에 동기화 필요

### Service Binding
- 동일 계정(ktds.axbd@gmail.com) 확인 완료 → `[[services]]` binding 사용 가능
- wrangler.toml: `binding = "SVC_EXTRACTION"`, `binding = "SVC_ONTOLOGY"`

### LPON 반제품
- 경로: `/home/sinclair/work/axbd/Decode-X/반제품-스펙/pilot-lpon-cancel/working-version/`
- 내용: src/ + __tests__/ + migrations/ + docs/ (6종 Spec md)
- F547: 이 디렉토리를 zip 패키징하여 Cloudflare R2 또는 직접 응답

## 4. 구현 순서 (직렬)

```
F546 (bridge) → F545 (landing) → F547 (lpon demo) → F548 (harness) → F549 (kg viewer)
```

F546이 API 레이어이므로 선행 필수. F545는 정적 UI이므로 F546과 병렬 가능.

## 5. 기술 결정

### API (core/decode-bridge/)
- MSA 패턴 준수: `packages/api/src/core/decode-bridge/routes/index.ts` → sub-app
- Service Binding 우선, fallback: fetch + DECODE_X_EXTRACTION_URL secret
- Zod 스키마: Decode-X response를 최소 미러 (전체 복사 X)
- Circuit breaker: fetch 실패 시 mock fallback JSON 반환

### Web Routes
- `/ai-foundry-os` → `packages/web/src/routes/ai-foundry-os/index.tsx`
- `/ai-foundry-os/demo/lpon` → `...demo/lpon.tsx`
- `/ai-foundry-os/harness` → `...harness.tsx`
- `/ai-foundry-os/ontology` → `...ontology.tsx`
- React Router 7 파일 기반 라우팅 확인 필요

### D3 Force Graph (F549)
- `d3-force` 라이브러리 (이미 설치 여부 확인 필요)
- 없으면 `@nivo/network` 또는 간단 SVG fallback
- 데이터: `/api/decode/ontology/graph/visualization` → 10~30 노드

## 6. 데드라인 체크포인트

| 시점 | 체크포인트 |
|------|-----------|
| H+0 (지금) | Plan/Design 완성, F546 TDD Red |
| H+6 | F546 Green + F545 완성 |
| H+12 | F547 완성 (LPON 데모 동작) |
| H+18 | F548 완성 (Harness UI) |
| H+24 | F549 완성 (KG 뷰어) |
| H+30 | 배포 + 전체 smoke test |
| H+36 | rehearsal walkthrough |
| H+42 | 대표 보고 (4/17 09:00) |

## 7. MVP 최소 기준 체크리스트

- [ ] `/ai-foundry-os` 접근 가능 (fx.minu.best 배포)
- [ ] 3-Plane 카드 + "라이브 시연" 버튼 표시
- [ ] LPON 데모 페이지 진입 가능
- [ ] Decode-X API 1회 이상 호출 성공 (또는 mock fallback)
- [ ] Type 1 반제품 다운로드 버튼 동작
- [ ] Harness 5종 체크리스트 페이지 접근
- [ ] KG XAI 뷰어 10+ 노드 렌더링

## 8. 리스크 대응

| 리스크 | 대응 |
|--------|------|
| Decode-X URL/secret 미확보 | mock fallback JSON 즉시 투입 |
| D3 설치 지연 | nivo/network 대체 또는 정적 SVG |
| 배포 CI/CD 장애 | `pnpm dev` 로컬 데모 백업 |
| 42시간 부족 | F549 KG 뷰어 mock fallback으로 단순화 |
