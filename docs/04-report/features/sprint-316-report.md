# Sprint 316 회고 리포트 — F567 + F568

> **Sprint**: 316  
> **Phase**: 45  
> **기간**: 2026-04-22 (S310)  
> **작성자**: Autopilot + Claude Sonnet 4.6

---

## 요약

Phase 45 Gap 9(Multi-hop latency) + Gap 10(EventBus PoC) 해소.

| F-item | 제목 | 결과 | PR |
|--------|------|------|-----|
| F567 | Multi-hop latency benchmark | ✅ k6 script + SLO p95<300ms 확정 | Sprint 316 |
| F568 | EventBus PoC — D1 선정 + 1 flow | ✅ StagePublisher + DiscoveryTrigger PoC | Sprint 316 |

---

## Phase Exit Criteria 결과

| # | 항목 | 판정 | 비고 |
|---|------|:----:|------|
| P1 | `docs/dogfood/sprint-316-latency.md` 존재 + 수치 | ✅ | F543 기반 추정값. 실측은 PR merge 후 k6 실행 필요 |
| P2 | `docs/specs/fx-eventbus/decision.md` 기술스택 선정 | ✅ | D1 Event Table 선정, 3종 비교표 완비 |
| P3 | Discovery→Shaping 1 flow 실행 확증 | ✅ | TDD 40/40 PASS, FORMALIZATION 트리거 로직 구현 |
| P4 | 이 회고 리포트 파일 | ✅ | 이 파일 |

---

## 테스트 결과

| 패키지 | 테스트 수 | 결과 |
|--------|----------|------|
| fx-discovery | 35/35 | ✅ PASS |
| fx-shaping | 40/40 | ✅ PASS |
| k6 script validation | 8/8 | ✅ PASS |
| **합계** | **83/83** | **✅ ALL GREEN** |

---

## 구현 요약

### F567 — Multi-hop latency benchmark

**deliverables**:
- `scripts/benchmarks/k6/multi-hop-latency.js` — 2 scenarios (gateway_3hop + direct_baseline), SLO thresholds 내장
- `scripts/benchmarks/k6/single-hop-baseline.js` — 1-hop 기준선
- `docs/dogfood/sprint-316-latency.md` — F543 기반 추정: gateway_3hop p95 ~110ms (SLO < 300ms ✅)

**SLO 확정**:
```
p95 (gateway_3hop)    < 300ms  ← SLO 확정
p95 (direct_baseline) < 200ms  ← baseline SLO
Service Binding overhead: ~10-14ms/hop (F543 실측 기반)
```

**실측 TODO**: Sprint 316 merge 후 production smoke test로 k6 실행하여 latency.md 수치 갱신 필요.

### F568 — EventBus PoC

**기술스택 결정**: **D1 Event Table** 선정 (Cloudflare Queue / Durable Object 대비)

핵심 근거:
1. D1EventBus (harness-kit) 이미 완전 구현됨 — PoC 신규 인프라 불필요
2. fx-discovery/fx-shaping 모두 DB binding 보유
3. local dev 지원 (Cloudflare Queue는 local dev 불가)
4. 2주 타임박스 준수

**구현된 flow**:
```
POST /api/biz-items/:id/discovery-stage
  → DiscoveryStageService.updateStage()
  → StagePublisher.publishIfComplete() [fire-and-forget]
  → domain_events (status=pending)

poll():
  → DiscoveryTrigger.poll()
  → FORMALIZATION 이벤트 수신 시 console.log [PoC scope]
```

---

## Gap Analysis 결과

**Match Rate: 98%** (회고 리포트 생성 후)

| Gap | 내용 | 판단 |
|-----|------|------|
| source 필드 | Design: "discovery" / 구현: "foundry-x" | 수용 — ServiceId 타입 제약. consumer는 type으로만 분기, source 무영향 |
| latency 실측 | 추정값 (실측 아님) | PoC scope 허용 — 실측은 production merge 후 |
| FORMALIZATION → shaping 실제 호출 | console.log로 대체 | PoC 타임박스 scope out (Design §7 명시) |

---

## 배운 것

1. **harness-kit 투자 회수**: F569에서 구현한 D1EventBus가 F568에서 바로 재사용됨. harness-kit 선투자의 효과를 확인.
2. **fire-and-forget 패턴**: 이벤트 발행 실패가 API 응답에 영향 주지 않도록 try/catch swallow — 비동기 파이프라인의 핵심 패턴.
3. **PoC timebox의 가치**: D1 선택이 "현재 도구"를 최대 활용한 결정. Phase 46+에서 Cloudflare Queue 재평가 포인트를 의사결정 문서에 명시.

---

## 다음 단계 (Phase 46+)

| 항목 | 내용 |
|------|------|
| k6 실측 | Production merge 후 k6 실행 → latency.md 수치 갱신 |
| Cron Trigger | `fx-shaping/wrangler.toml`에 `[triggers]` 추가 → 실시간 polling |
| FORMALIZATION → shaping | console.log → 실제 shaping API 호출 교체 |
| Queue 재평가 | 초당 500+ 이벤트 임계점 도달 시 Cloudflare Queue 전환 검토 |
| F565 SDD CI | Sprint 317 착수 예정 |
| F570 Offering 이관 | Sprint 318 착수 예정 |
