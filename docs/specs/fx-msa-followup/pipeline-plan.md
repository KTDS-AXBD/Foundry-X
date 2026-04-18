# Phase 45 Sprint Pipeline — 실행 계획

> **작성일**: 2026-04-19 (S302)
> **범위**: Sprint 311~318 (F560~F572, 13 F-item)
> **PRD 근거**: `docs/specs/fx-msa-followup/prd-final.md` v1.1
> **실행 모드**: 단계별 착수 (F560 결과 → 312~318 조정)

---

## 배치 계획 (의존성 분석 완료)

| Batch | Sprint | F-items | 전제 | 비고 |
|-------|--------|---------|------|------|
| **B1** | 311 | F560, F566 | 독립 | **S302+ 착수** — F566 문서, F560 코드 |
| **B2** | 312 | F561, F562 | F560 완료 | D1 분리 + contract 레이어 병렬 |
| **B3** | 313 | F563, F564 | F562 완료 | Shaping E2E + CLI Strangler |
| **B4a** | 314 | F565, F567 | F560/F561 완료 | SDD CI + multi-hop latency |
| **B4b** | 315 | F568, F569 | F562 완료 | EventBus PoC + harness-kit |
| **B5** | 316 | F570 | F541 MERGED (✅) | Offering 완전 이관 |
| **B6** | 317 | F572 | 독립 | modules 통합 |
| **B7** | 318 | F571 | 최후 배치 | Agent (최고 리스크) |

**B3/B4는 3 Sprint 병렬 가능** (rules/development-workflow.md §Sprint 병렬 "동시 3개 권장").

## 현재 진행

- [x] SPEC.md §5 F560~F572 13 F-item 등록 (v5.90, commit `3f7932a0`)
- [x] PRD v1.1 Final 승격 (3-AI Round 3 76/100 Conditional 수용)
- [x] fx-msa-roadmap PRD Appendix 링크 추가 (commit `80351ce0`)
- [x] MEMORY.md S302+ 세션 기록 + 다음 작업 갱신
- [ ] **Sprint 311 WT 생성 + autopilot 주입** — 진행 중
- [ ] Sprint 312~318 단계별 재개

## MVP 3종 (Phase 45 최소 성공 기준)

| MVP | Sprint | F-item | 판정 |
|-----|--------|--------|------|
| M1 | 311 | F560 | proxy 0건 + Discovery 10 routes fx-discovery 소속 |
| M2 | 312 | F561 | discovery_db 별도 + 롤백 리허설 1회 성공 |
| M3 | 313 | F564 | CLI `VITE_API_URL=fx-gateway.*` + foundry-x-api 직결 0건 |

## 재개 방식

Sprint 311 완료 후:
- F560 Match Rate ≥ 90% 확인
- F566 Roadmap v2 문서 publish 확인
- Sprint 312 `bash -i -c "sprint 312"` 착수

Sprint 실패 시 (Match < 90%): pdca-iterator 자동 개선 3회 후 재평가.

## 관련 문서

- `docs/specs/fx-msa-followup/prd-final.md` v1.1 Final
- `docs/specs/fx-msa-followup/archive/review/round-{1,2,3}/` — 3-AI 검토 근거
- `docs/specs/fx-msa-roadmap/prd-final.md` §Appendix — 후속 링크
- `SPEC.md §5` — F560~F572 SSOT

---

## 변경 이력

| 날짜 | 변경 | 세션 |
|------|-----|------|
| 2026-04-19 | 초안 작성 + B1 착수 | S302+ |
