---
id: FX-DESIGN-321
title: Sprint 321 Design — F553 4주 관측 회고 + 회귀율 리포트 + 모델 튜닝
sprint: 321
feature: F553
req: FX-REQ-590
status: active
created: 2026-05-02
---

# Sprint 321 Design — F553 4주 관측 회고

## §1 실측 데이터 요약 (2026-04-04 ~ 2026-05-02)

Production D1 `foundry-x-db` 직접 쿼리 결과:

| 테이블 | 건수 | 비고 |
|--------|------|------|
| `dual_ai_reviews` | **0건** | Codex degraded 모드 고착, DB insert 미실행 |
| `agent_run_metrics` | **116건** | 100% completed/end_turn |
| `agent_improvement_proposals` | **27건** | 전부 pending, rubric_score=100 기본값 |
| `agent_model_comparisons` | **1건** | 2026-04-14, claude-sonnet-4-6, 6축 rawValue=0 |

## §2 핵심 발견

### F1: dual_ai_reviews 0건 — Codex 4주 미작동

**근본 원인 분석**:
- F554(Sprint 302) 인프라 배선 완료 — `codex-review.sh` 설치, Phase 5c 연동, `codex-review.json` mock 생성
- `codex-review.sh`가 OPENAI_API_KEY 미등록 상태에서 `degraded=true` 분기로 진입
- degraded 모드: verdict=PASS-degraded 생성 + `codex-review.json` 기록 → 정상 흐름
- 그런데 `DualReviewService.insert()`가 autopilot Phase 5c 실행 후 호출되지 않음
- **결론**: autopilot이 `codex-review.json`을 읽어 Signal에 기록하지만, D1 insert 단계가 누락됨

**영향**:
- F553 (a) 목표인 "회귀율 / 합의율 / false positive 분포" 분석 불가
- 4주간 Dual-AI 검증은 실질적으로 단일 AI(Claude Gap Score)로만 동작

### F2: agent_run_metrics output_tokens = 0 기록 버그

- 116건 전부 `output_tokens=0`
- `avg_rounds=1.0` — end_turn이 1라운드에 완료됨 (MetaAgent 빠른 응답)
- `avg_duration=28,410ms` — 평균 28초 처리
- `avg_input_tokens=2,727` — 중간 복잡도

**output_tokens 미기록 원인 후보**:
- `meta-agent.ts`의 Claude API response에서 `usage.output_tokens` 필드를 DB에 기록 안 함
- `agent_run_metrics` insert 시 output_tokens 컬럼을 0 기본값으로 처리

### F3: 27개 proposals 전부 pending — 검토/승인 흐름 미작동

- type 분포: prompt(15) / graph(6) / tool(4) / model(2)
- rubric_score=100 (전부) — 기본값 100, 실측 rubric 점수 기록 안 됨
- 적용된 proposal 0건 → MetaAgent가 제안은 하지만 실제 개선 루프 없음

### F4: R6(rawValue=0) 잔존 확인

`agent_model_comparisons` 유일 레코드 (2026-04-14, KOAMI dogfood):
- 6축 모두 rawValue=0: ToolEffectiveness / Memory / Planning / Verification / Cost / Convergence
- MetaAgent가 6개 DiagnosticCollector instrumentation 제안 생성 (정상)
- 하지만 제안이 실제 적용되지 않아 다음 실행도 동일하게 rawValue=0 예상

## §3 rubric 가중치 조정 평가 (F553-b)

**데이터 불충분으로 가중치 재조정 보류**:
- rubric_score=100 기본값 → 실측 분포 없음
- rawValue=0 → 6축 점수 미신뢰
- **결정**: 가중치 재조정은 DiagnosticCollector 배선 완료 후 Phase 47로 defer

`meta-agent.ts` 코드 변경 없음.

## §4 MetaAgent 모델 A/B 평가 (F553-c)

**1건 비교 데이터 (claude-sonnet-4-6 단독)**:
- proposal_count=6, prompt_version=2.0, PASS 수렴
- 모델 간 A/B는 데이터 1건으로 통계 불가
- **결정**: Opus 4.7 비교는 F575 이후 Phase 47에서 충분한 dogfood 후 실시

## §5 파일 매핑

| 파일 | 변경 여부 | 내용 |
|------|---------|------|
| `docs/04-report/features/phase-46-f553-4week-retrospective.md` | **신규** | 회고 문서 |
| `SPEC.md §5` | **수정** | F553 → ✅ |
| `packages/api/src/core/agent/services/meta-agent.ts` | **변경 없음** | 데이터 불충분으로 보류 |

## §6 Phase 46 GO/NO-GO 판정

| 항목 | 상태 | 판정 |
|------|------|------|
| MetaAgent 기본 작동 (run + proposals) | 정상 (116 runs, 27 proposals) | ✅ |
| Dual-AI 검증 인프라 | degraded 고착, 0건 기록 | ⚠️ |
| rubric 6축 실측 데이터 | 0 (rawValue=0 잔존) | ⚠️ |
| F575 착수 전제 (F571 ✅) | Sprint 320 완료 | ✅ |

**판정: CONDITIONAL GO**
- F575 (Agent 잔여 7 routes 이관)는 Dual-AI 인프라와 무관하므로 Sprint 322 착수 가능
- Dual-AI 0건 문제(F1) + output_tokens 버그(F2) + proposals 미적용(F3) + rawValue=0(F4)는 Phase 46 후속 backlog 등록
- MetaAgent 기능 자체는 정상 → Phase 46 F575 GO

## §7 Design Stage 3 Exit 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 | 해당 없음 (신규 코드 없음) |
| D2 | 식별자 계약 검증 | 해당 없음 |
| D3 | Breaking change 영향도 | 없음 |
| D4 | TDD Red 파일 존재 | 해당 없음 (분석/문서 Sprint) |
