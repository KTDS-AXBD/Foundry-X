---
code: FX-PRD-F542
title: MetaAgent Prompt Quality Tuning PRD
version: v1
status: Draft
category: PRD
feature: F542
req: FX-REQ-571
phase: 44
priority: P1
created: 2026-04-14
updated: 2026-04-14
author: Sinclair Seo
---

# fx-metaagent-prompt-tuning PRD

**버전**: v1
**날짜**: 2026-04-14
**작성자**: AX BD팀 (Sinclair Seo)
**상태**: 🔄 검토 중 (Round 1 대기)
**대상 F-item**: F542 (SPEC.md §5) / FX-REQ-571 / Phase 44 / P1

---

## 1. 요약 (Executive Summary)

**한 줄 정의**
Phase 43 Dogfood 3회에서 0건이었던 MetaAgent `agent_improvement_proposals`를 ≥1건 생성하고 apply 경로까지 검증하기 위해, Prompt·Model·Data 3축 원인을 진단·해소한다.

**배경**
Phase 41~43 HyperFX Agent Stack에서 Diagnostic 6축 메트릭 수집과 diagnose 점수 산출까지는 정상화됐으나(F534/F536 hotfix), 동일 세션의 `MetaAgent.diagnose()` 호출 결과 `agent_improvement_proposals` 저장 건수가 3회 연속 0건이었다. 원인이 불명하여 "Phase 44 프롬프트 품질 문제"로 이관됐다. (MEMORY S287 회고 §"남은 이슈")

**목표**
Dogfood 1회 실행에서 proposals ≥1건이 생성되고, Human Approval을 거친 proposal 1건이 AgentSpec YAML diff로 apply된다. 2차 Dogfood에서 6축 점수 최소 1개 axis에 방향성 이동이 관찰된다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

| 항목 | 값 | 비고 |
|------|-----|------|
| agent_run_metrics 수집 | 27건 (3 세션 누적) | F534 hotfix 후 ✅ |
| diagnose 6축 점수 산출 | 정상 (6/6 axis) | F536 hotfix 후 ✅ |
| **agent_improvement_proposals** | **0건 (3회 연속)** | **❌ 이번 F-item 해소 대상** |
| 6축 rawValue | 모든 axis rawValue=0, score=50 | 의미 있는 개선안 생성 근거 부족 가능 |
| 재현 세션 | `graph-bi-koami-001-*` 3건 | `docs/retrospective/phase-42-43.md` 참조 |

### 2.2 목표 상태 (To-Be)

- Dogfood 1회 실행에서 proposals ≥1건 D1 저장 (MVP)
- Proposals 품질 rubric 평균 ≥70/100 (stretch)
- Human Approval → YAML diff apply 경로 100% 성공
- Apply 후 2차 Dogfood에서 6축 score 방향성 이동 관찰 (stretch)
- Haiku 4.5 vs Sonnet 4.6 결과 비교 데이터 D1 저장 (A/B 근거)

### 2.3 시급성

- Phase 43 HyperFX Activation은 "proposals 생성 가능"을 완료 조건으로 삼았으나 실측 0건 상태로 선언됨 (Phase Exit P2 위반). `process-lifecycle.md v1.1` 신설과 동시에 **본 F542가 P2 체크리스트의 첫 회귀 검증 대상**이 된다.
- KOAMI 내년 본사업(~10억) 전, HyperFX가 "실제 가치를 생산한다"를 보여주는 유일한 E2E 고리. 생산된 proposal 1건이 apply되면 Dogfood 스토리가 완성된다.

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair (Dogfood) | F542 단독 사용자. Human Approval UI에서 생성된 proposal을 본인이 검토·승인 | ① 무언가 생성되는지 확증 ② 내용이 해석 가능한지 ③ apply 결과가 실제 YAML 변경인지 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| AX BD팀 (KT DS) | Phase 44 일정 관리, MSA 작업(F538~F541)과 병행 감수 | 중간 |
| KOAMI 고객 (미래) | 내년 본사업 대상. 현재 F542 범위에 직접 등장하지 않음 | 낮음 (관찰) |
| HyperFX Agent Stack 기존 F-item (F527~F533) | 본 F-item 성공이 이들의 "실전 가치"를 재평가함 | 높음 |

### 3.3 사용 환경

- 기기: WSL2 Ubuntu (Sinclair 개발 머신) + Cloudflare Workers (프로덕션 MetaAgent 호출)
- 네트워크: 인터넷 (Anthropic API 호출)
- 기술 수준: 개발자 (AgentSpec YAML 직접 편집 가능)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M1 | **MetaAgent systemPrompt 강화** | `meta-agent.agent.yaml` systemPrompt에 (a) few-shot 예시 2~3건 (b) rawValue=0/low-signal 입력에 대한 처리 규칙 (c) 출력 형식 재검증 지침 추가 | P0 |
| M2 | **`META_AGENT_MODEL` config flag** | wrangler env var로 `haiku-4-5` / `sonnet-4-6` 런타임 전환. **기본값은 Sonnet 4.6** (Haiku 역량 부족 가정, A/B 결과로 검증) | P0 |
| M3 | **A/B 실험 경로** | 동일 DiagnosticReport 1건에 대해 두 모델 결과를 D1 `agent_model_comparisons` 테이블에 기록. 비교 조회 API 최소 1개 (`GET /api/agent/comparisons/:reportId`) | P0 |
| M4 | **Proposals 품질 rubric** | 재현성(R1, 30점) / 실행가능성(R2, 40점) / 근거명시(R3, 30점) = 100점. 자동 heuristic 1차 채점 + Sinclair 수동 보정 기록. `agent_improvement_proposals.rubric_score` 컬럼 추가 | P0 |
| M5 | **Apply 경로 E2E 검증** | Human Approval UI에서 proposal 1건 승인 → `proposal-apply.ts`가 YAML diff를 AgentSpec에 적용 → 저장된 YAML이 실제로 변경됐는지 파일 대조. 성공률 100% | P0 |
| M6 | **2차 Dogfood — 방향성 검증** | Apply 후 동일 Graph 재실행. 6축 score 중 ≥1개가 방향성 이동(절대값 목표 아님, 부호 이동) | P0 (MVP 요건은 아님, stretch) |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| S1 | Model comparison UI (최소) | `/api/agent/comparisons/:reportId` 결과를 보여주는 읽기 전용 대시보드 | P1 |
| S2 | Rubric 수동 보정 이력 | Sinclair가 auto rubric을 수정한 경우 이력 보존 | P2 |

### 4.3 제외 범위 (Out of Scope)

- **Auto-apply (Human Approval 제거)** — 안전상 금지. 반드시 수동 승인 유지
- **MetaAgent 외 agent tuning** — Worker/Shaping agent 등은 별도 F-item 대상 (Phase 45+ 후보)
- **고객용 Proposal 리뷰 UI** — KOAMI 본사업 시점에 별도 F-item으로 분리
- **DiagnosticCollector 집계 로직 수정** — rawValue=0 원인이 집계 버그로 판명되면 **F543으로 분리 등록** (F542 범위 밖). F542는 Data 축을 "현상 유지 + Prompt가 low-signal 입력을 감당하게 함" 관점으로 처리

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Anthropic API (Claude Haiku 4.5 / Sonnet 4.6) | REST `/v1/messages` | 필수 |
| Cloudflare D1 (`foundry-x-db`) | `agent_improvement_proposals`, `agent_model_comparisons` (신규) | 필수 |
| 기존 `meta-agent.ts` / `meta-approval.ts` / `proposal-apply.ts` | 내부 함수 호출 | 필수 (수정 포함) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 (MVP) | 목표값 (stretch) | 측정 방법 |
|------|--------|--------------|------------------|-----------|
| K1 Proposals 생성 건수 | 0 | ≥1 | ≥3 | D1 `SELECT COUNT(*) FROM agent_improvement_proposals WHERE session_id='<dogfood>'` |
| K2 Rubric 평균 | N/A | — (stretch) | ≥70/100 | rubric_score 컬럼 평균 |
| K3 Apply 성공률 | N/A | 100% | 100% | 승인된 proposal 중 AgentSpec 실제 변경 건수 / 승인 건수 |
| K4 6축 점수 방향성 이동 | N/A | — (stretch) | ≥1 axis score 부호 이동 | apply 전후 diagnose score 비교 |
| K5 모델 A/B 기록 | 0 | ≥1 비교 | 모든 Dogfood에서 기록 | `agent_model_comparisons` row 수 |

### 5.2 MVP 최소 기준

- [ ] K1 ≥ 1건 (Dogfood 1회에서 proposal 생성 확증)
- [ ] K3 = 100% (생성된 proposal이 apply 경로를 통과)

두 조건 모두 충족 시 F542 → `✅` 마킹. stretch goal은 Phase Exit 판정에 기록만 하고 실패해도 F-item 완료는 가능.

### 5.3 실패/중단 조건

**5회 반복 룰**:
- 라운드 1: Prompt 튜닝 v1 (systemPrompt + few-shot) → Haiku 실행
- 라운드 2: Prompt 튜닝 v2 (형식 재검증 강화) → Haiku 실행
- 라운드 3: 모델 전환 (Sonnet 4.6) → 같은 Prompt v2 실행
- 라운드 4: Rubric 자동 채점 도입 → Sonnet 결과 재평가
- 라운드 5: Graph 재설계 축소 실험 (rawValue 주입 강제 fixture로 데이터 축 통제) → 실행

5회 모두 K1=0건이면 **F542 중단** + SPEC 상태 `🗑️(DEFER, 사유: 5회 반복 후 미해소)`. 그리고 **R6 발견 여부를 보고** — Data 축이 원인으로 드러나면 F543(DiagnosticCollector 집계 로직) 등록. Phase 44 완료는 F538~F541 기준으로 선언 가능 (R8 escape).

### 5.4 비기능 요구사항

- MetaAgent 1회 호출 latency ≤ 30s (90p 기준)
- Sonnet 4.6 Dogfood 1회 비용 ≤ $0.10
- 5회 반복 누적 비용 ≤ $0.50
- Cloudflare Workers CPU budget 초과 금지 (Haiku 대비 Sonnet이 초과할 위험 R1 참조)

---

## 6. 제약 조건

### 6.1 일정

- 목표 완료일: W+8 (Phase 44 중후반, 구체 날짜는 W+5 GTM 종료 후 재평가)
- 마일스톤: M1/M2 prompt+flag → M3/M4 A/B+rubric → M5 apply → M6 2차 Dogfood

### 6.2 기술 스택

- 백엔드: Hono + Cloudflare Workers + D1 (기존 유지, 신규 마이그레이션 1개 예상 `NNNN_agent_model_comparisons.sql`)
- Agent 런타임: 기존 `meta-agent.ts` / `orchestration-loop.ts` 구조 유지 (F527~F530 자산)
- LLM: Claude Haiku 4.5 (기존) + Claude Sonnet 4.6 (신규 대상, 이미 `ANTHROPIC_API_KEY` 등록됨)
- 테스트: Vitest (`.test.ts` 추가), TDD Red→Green 준수 (`.claude/rules/tdd-workflow.md`)

### 6.3 인력/예산

- 투입 인원: Sinclair 단독 (cs 없이 ccs + autopilot)
- 예산: Anthropic API 5회 반복 ≤ $0.50
- Sprint: 1 Sprint 배정 예상 (병행 전략: F538 단독 선행, F542는 F538 PR merge 후 독립 sprint)

### 6.4 컴플라이언스

- KT DS 내부 정책: 해당 없음 (내부 도구)
- 보안: `ANTHROPIC_API_KEY` wrangler secret 유지, 하드코딩 금지 (`.claude/rules/security.md`)

---

## 7. 핵심 리스크

| # | 리스크 | 영향 | 완화 | 확률 |
|---|--------|------|------|------|
| **R4** | **YAML diff parsing 실패** — proposal.yamlDiff가 invalid YAML 또는 schema violation | M5 apply FAIL → K3 < 100% | (a) schema validation step (b) structured output(`json_schema`) 사용 (c) apply 실패 시 auto-retry 1회 | 중 |
| **R5** | **Rubric 주관성** — R1~R3 채점이 Sinclair 감정에 좌우 | K2 신뢰도 하락 | (a) auto heuristic 1차 (b) 수동 보정은 rubric_manual_adjusted 플래그로 구분 기록 (c) stretch goal이라 MVP와 분리 | 중 |
| **R7** | **A/B 순환 논리** — "Haiku 못해서 Sonnet" 판단이 prompt 미튜닝 탓일 가능성 | M3 결론 오염 | (a) **Prompt v2 동일 버전**에 대해 두 모델 비교 강제 (b) 비교 결과에 prompt_version 컬럼 기록 | 중 |
| **R8** | **Phase Exit deadlock** — 5회 반복해도 K1=0건이면 Phase 44 완료가 F542 때문에 막힘 | 일정 지연 | **Escape 룰**: 5회 실패 시 F542 `🗑️(DEFER)` + Phase 44 완료 판정은 F538~F541로 선언 가능. R6 후보 발견 시 F543 분리 | 중 |

> R1 Sonnet latency, R2 비용 spike, R3 prompt injection은 **표준 기술 미티게이션**으로 충분하므로 본 섹션에 포함하지 않음 (아래 §9 Open Issue 참조 가능).
> R6 rawValue=0 근본원인은 **F543으로 분리 예정** — F542 Data 축 진단 과정에서 집계 버그 징후 발견 시 즉시 등록 + F542 흐름은 중단 없이 계속.

---

## 8. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | `agent_model_comparisons` 테이블 스키마 초안 (columns: id, session_id, report_id, model, prompt_version, proposals_json, created_at) — Design Phase 확정 | Sinclair | Design 작성 시 |
| 2 | Sonnet 4.6 Cloudflare Workers 지원 확인 (streaming, timeout 등) — W+6 선행 | Sinclair | W+6 |
| 3 | Rubric 자동 heuristic 알고리즘 상세 — JSON valid / 길이 / 키워드("because", "therefore", reasoning 존재) / yamlDiff 파싱 성공 4요소 | Sinclair | Design |
| 4 | R6 발견 시 F543 등록 기준 — "6축 중 N개 axis에서 rawValue=0이고 raw 로그 상 count>0인 경우" | Sinclair | Dogfood 라운드 1~3 중 관찰 |

---

## 9. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-14 | 최초 작성 (인터뷰 5파트 + 리스크 4건 확정) | — |

---

*이 문서는 /ax:req-interview 스킬에 의해 자동 생성·관리됩니다. 최종 착수 판정 시 `prd-final.md`로 승격됩니다.*
