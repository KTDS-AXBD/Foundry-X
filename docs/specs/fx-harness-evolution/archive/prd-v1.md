# Self-Evolving Harness v2 PRD

**버전:** v1
**날짜:** 2026-04-06
**작성자:** AX BD팀
**상태:** 🔄 검토 중
**입력 문서:** FX-STRT-015 v3.0 (자가 발전 하네스 전략), 인터뷰 로그

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Claude Code 에이전트가 반복 실패 패턴으로부터 자동으로 Guard Rail을 생성하고, O-G-D Loop을 다중 도메인에 재활용하며, 하네스 인프라의 실제 활용률을 측정하는 자가 발전 시스템을 구축한다.

**배경:**
Phase 10~14에서 자가 발전 하네스의 3단계 인프라(Quality Gate, Self-Healing, Self-Evolving)를 구축했다. TaskState 10상태, Hook/EventBus, Orchestration Loop 3모드, Agent Adapter 5종, Telemetry Dashboard까지 완성되어 인프라는 충분하다. 그러나 **데이터→행동 변화** 루프가 부재하여, 쌓인 텔레메트리가 실질적 품질 개선으로 연결되지 않고 있다.

**목표:**
하네스 인프라가 스스로 학습하고, 반복 실패를 예방하며, 인프라 활용률을 측정하여 미사용 인프라를 정리하는 "자가 발전 루프"를 완성한다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- **반복 실패 미감지:** Sprint마다 유사한 실패가 반복되지만, execution_events 데이터를 분석하여 패턴을 자동 감지하는 시스템이 없다.
- **Rules 정적 배치:** `.claude/rules/` 5종이 세션 #199(2026-04-05) 이후 변경 없이 정적으로 유지. 30+ Sprint 동안 축적된 교훈이 Rule로 반영되지 않음.
- **수동 개입 과다:** 텔레메트리 데이터(execution_events, task_histories)가 D1에 쌓이고 있으나, 해석과 행동 전환이 전적으로 수동.
- **O-G-D Loop 단일 도메인:** O-G-D(Orchestrator-Generator-Discriminator) Loop이 BD 형상화와 코드 품질 판정에만 사용됨. Phase 16 Prototype Auto-Gen(F355)에서 첫 재활용을 시도하지만, 범용적 재활용 인터페이스가 없음.
- **인프라 활용률 미측정:** 에이전트 16종 × 스킬 15종이 등록되어 있지만, 실제 월간 사용 빈도가 불명. 전략 문서 §7.2에서 "built but unused" 위험을 **높음**으로 평가.

### 2.2 목표 상태 (To-Be)

- **자동 패턴 감지:** execution_events에서 반복 실패 패턴을 자동 추출하여, Rule 초안을 생성하고 세션 시작 시 사람에게 제안.
- **Rules 동적 갱신:** 승인된 Rule이 `.claude/rules/`에 자동 배치되어, 다음 세션부터 Claude Code가 준수.
- **O-G-D 범용 인터페이스:** 도메인 독립적인 O-G-D Loop 호출 인터페이스를 제공하여, BD·코드리뷰·문서검증·Prototype 등 다양한 도메인에 재활용.
- **활용률 대시보드:** 에이전트/스킬별 월간 사용 빈도, DERIVED/CAPTURED 스킬 재사용률을 Dashboard에서 확인 가능.

### 2.3 시급성

- **인프라 ROI 증명 시점:** Phase 14에서 ~12,600 LOC + 181 tests의 하네스 인프라를 구축했다. 이 투자가 실제 품질 개선으로 이어지는지 증명해야 한다.
- **Phase 16 재활용 시점:** F355(O-G-D 품질 루프)가 Phase 16에서 시도된다. 이 경험을 범용화 설계에 반영하려면 Phase 16 직후가 적기다.
- **Rules 노후화 가속:** Sprint가 누적될수록 정적 Rules와 현실의 괴리가 커진다.

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Claude Code 에이전트 | `.claude/rules/`를 자동 로딩하여 세션별 행동을 결정하는 AI 에이전트 | 최신 패턴이 반영된 Rule을 자동으로 준수하여 반복 실패 예방 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair Seo | 승인 게이트 — Rule 제안을 세션 내에서 승인/거부 | 높음 |
| AX BD팀원 | 공유 Rules의 간접 수혜자 — 에이전트 품질 향상의 영향 | 중간 |

### 3.3 사용 환경
- 기기: PC (WSL/Linux 환경)
- 네트워크: 인터넷 (Cloudflare Workers + D1)
- 기술 수준: 개발자 (Claude Code 세션 내 CLI 인터페이스)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 | 선행 조건 |
|---|------|------|----------|-----------|
| M1 | **데이터 상태 진단 (Phase 0)** | execution_events, task_histories D1 데이터의 양·기간·품질을 진단. 반복 실패 패턴 추출 가능 여부 확인. 기준선(baseline) 수립 | P0 | — |
| M2 | **반복 실패 패턴 감지 엔진** | execution_events에서 동일 유형 실패를 자동 클러스터링. 임계값(최소 N회 반복) 기반 패턴 식별. event_type × error_category × task_family 3차원 분석 | P0 | M1 |
| M3 | **Rule 초안 생성기** | 감지된 패턴을 `.claude/rules/` 포맷의 Rule 초안으로 변환. 패턴 근거(실패 사례 N건)를 주석으로 포함. LLM 호출로 자연어 Rule 생성 | P0 | M2 |
| M4 | **세션 내 승인 플로우** | `/ax:session-start`에 통합 — "새 Rule 제안 N건" 알림 → 각 Rule의 근거·내용 표시 → 승인/거부/수정 → 승인된 Rule을 `.claude/rules/`에 자동 배치 | P0 | M3 |
| M5 | **O-G-D Loop 범용 인터페이스** | 도메인 독립적인 O-G-D 호출 API 설계. `OGDRequest { domain, input, rubric, maxRounds }` → `OGDResult { output, score, iterations }`. BD 형상화·코드리뷰·문서검증·Prototype 4개 도메인 어댑터 | P0 | Phase 16 F355 완료 |
| M6 | **O-G-D 도메인 어댑터 레지스트리** | 새 도메인 추가를 위한 어댑터 등록/조회 API. 각 어댑터는 Rubric + Generator + Discriminator 3요소를 정의 | P0 | M5 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 | 선행 조건 |
|---|------|------|----------|-----------|
| S1 | **에이전트 자기 평가 연동** | F148(에이전트 자기 평가) 데이터를 Guard Rail 패턴 감지에 입력으로 연결. 에이전트가 보고한 "어려웠던 점"을 패턴 클러스터링의 가중치로 활용 | P1 | M2 |
| S2 | **Skill Evolution 운영 지표 대시보드** | DERIVED/CAPTURED 스킬의 생성 수 vs 실제 재사용 수 비율. skill_executions × skill_lineage JOIN으로 재사용률 산출. F337 Dashboard에 탭 추가 | P1 | — |
| S3 | **에이전트/스킬 활용률 대시보드** | 16종 에이전트 × 15종 스킬의 월간 사용 빈도 집계. 미사용(월 0회) 항목 하이라이트. F337 Dashboard에 탭 추가 | P1 | — |
| S4 | **Rule 효과 측정** | 배치된 Rule의 "적용 전 N주 vs 적용 후 N주" 동일 유형 실패 빈도 비교. Rule별 효과 점수 산출 | P1 | M4 |

### 4.3 제외 범위 (Out of Scope)

| 항목 | 제외 이유 | 재검토 조건 |
|------|----------|-----------|
| `.harness/events/` Git 기반 이벤트 저장 | D1이 더 실용적, Git 커밋 노이즈 우려 | CI/CD에서 D1 없이 하네스 상태 확인 필요 발생 시 |
| Guard Rail 완전 자동화 (사람 승인 없이) | 자동 생성 Rule의 품질 보장 불가 | Guard Rail 반자동 운영 6개월+ 후 |
| 에이전트 자율 커밋 | "인간은 판사" 원칙(전략 문서 원칙 3) | 조직 정책 변경 시 |
| 범용 하네스 프로파일 시스템 | 에이전트 16종 역할 분화로 사실상 달성 | 에이전트 30종+ 초과 시 |

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| D1 (execution_events) | SQL 쿼리로 실패 이벤트 조회 | 필수 |
| D1 (task_histories) | SQL 쿼리로 태스크 이력 조회 | 필수 |
| `.claude/rules/` | 파일시스템 Write | 필수 |
| `/ax:session-start` 스킬 | 승인 플로우 통합 | 필수 |
| F337 Orchestration Dashboard | 대시보드 탭 추가 (S2, S3) | 선택 |
| LLM API (Anthropic/OpenRouter) | Rule 초안 생성 시 자연어 변환 | 필수 |
| Phase 14 O-G-D 인프라 | 기존 O-G-D Loop 코드 재활용 | 필수 |
| Phase 16 F355 결과 | O-G-D 범용화의 첫 재활용 사례 입력 | 필수 (M5) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 반복 실패 감소율 | [기준선 측정 필요] | ≥ 30% 감소 | Guard Rail 배치 전 N주 vs 후 N주 동일 유형 실패 빈도 비교 |
| Guard Rail 채택률 | — | > 50% | 자동 제안 Rule 중 사람 승인 비율 |
| O-G-D 도메인 간 재활용 수 | 1 (BD) | ≥ 3 | 등록된 O-G-D 도메인 어댑터 수 (BD + Prototype + 2개 이상) |
| 에이전트 활용률 | [미측정] | > 75% 월 1회+ | 16종 중 월 1회 이상 사용된 에이전트 비율 |
| DERIVED 스킬 재사용률 | [미측정] | > 30% | skill_executions × skill_lineage에서 생성 대비 재실행 비율 |

### 5.2 MVP 최소 기준

- [ ] M1: execution_events 기준선 측정 완료 (데이터 양, 기간, 패턴 추출 가능성)
- [ ] M2+M3: 최소 1개 반복 실패 패턴 자동 감지 → Rule 초안 생성 성공
- [ ] M4: 세션 시작 시 Rule 제안 알림 + 승인 후 `.claude/rules/` 배치 동작
- [ ] M5: O-G-D 범용 인터페이스로 BD 외 1개 도메인(코드리뷰 또는 문서검증) 호출 성공

### 5.3 실패/중단 조건

- execution_events에 패턴 추출 가능한 데이터가 3개월 분량 미만 → M1에서 중단, 데이터 축적 후 재시도
- Guard Rail 채택률이 3개월간 20% 미만 → 제안 품질 재검토 또는 접근 방식 변경
- O-G-D 범용화에서 2개 이상 도메인에서 Rubric 정렬 실패 → 범용화 대신 도메인별 독립 구현으로 전환

---

## 6. 제약 조건

### 6.1 일정

- **시작 시점:** Phase 16 완료 후 (F351~F356 전체 merge)
- **선행 조건:** F355(O-G-D 품질 루프) 성공적 운영 → M5의 입력
- **예상 규모:** 5~7 Sprint (M1~M6: 4~5 Sprint + S1~S4: 2 Sprint)

### 6.2 기술 스택

- 프론트엔드: React 18 + Vite 8 (F337 Dashboard 확장)
- 백엔드: TypeScript + Hono (Cloudflare Workers)
- DB: D1 (execution_events, task_histories, 신규 테이블)
- 인프라: Cloudflare Workers + D1 + Pages
- 기존 의존: Phase 14 O-G-D 인프라, F148 에이전트 자기 평가, Phase 10 Skill Evolution

### 6.3 인력/예산

- 투입: AX BD팀 (AI 에이전트 기반 개발, Sprint worktree 자동화)
- LLM 비용: Rule 초안 생성 시 Haiku 모델 예상 ~$0.1/건
- API 비용: O-G-D Loop 호출 시 기존 Phase 14 비용 구조 유지

### 6.4 컴플라이언스

- **자동 커밋 절대 금지:** Guard Rail이 자동 생성하더라도, `.claude/rules/`에 배치 후 커밋은 사람이 수행
- **Rule 감사 추적:** 생성된 Rule의 근거(패턴 N건, 실패 이벤트 ID)를 D1에 기록하여 감사 가능

---

## 7. 마일스톤 구성 (안)

| Sprint | F-items | 핵심 산출물 | 의존성 |
|--------|---------|------------|--------|
| Sprint A | M1 (데이터 진단) | 기준선 보고서, D1 쿼리 세트, 패턴 추출 PoC | — |
| Sprint B | M2+M3 (패턴 감지 + Rule 생성) | PatternDetector 서비스, RuleGenerator 서비스, D1 신규 테이블 | Sprint A |
| Sprint C | M4 (승인 플로우) | session-start 통합, Rule 배치 자동화, 효과 측정 기반 | Sprint B |
| Sprint D | M5+M6 (O-G-D 범용화) | OGDInterface, DomainAdapter 레지스트리, 2+ 도메인 어댑터 | Phase 16 F355 |
| Sprint E | S1+S2+S3 (운영 지표) | Dashboard 탭 3건, 에이전트 활용률 집계, Skill 재사용률 | — |
| Sprint F | S4 (Rule 효과 측정) + 통합 QA | Rule 효과 점수, 통합 테스트, E2E | Sprint C+D |

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | execution_events 데이터 양/기간 확인 — 패턴 추출 가능성 진단 필요 | M1에서 해결 | Sprint A |
| 2 | 반복 실패 "유형" 분류 기준 정의 — event_type × error_category × task_family 조합이 적절한지 | M2 설계 시 | Sprint B |
| 3 | Rule 초안 생성에 사용할 LLM 모델 선택 — Haiku(비용) vs Sonnet(품질) 트레이드오프 | M3 구현 시 | Sprint B |
| 4 | O-G-D 범용화 시 기존 Phase 14 코드의 리팩토링 범위 — 범용 인터페이스 추출 vs 새로 구현 | M5 설계 시 | Sprint D |
| 5 | Phase 16 F355 결과가 범용화 설계에 어떤 교훈을 주는지 — F355 완료 후 반영 | Phase 16 완료 시 | Sprint D 전 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-06 | 인터뷰 기반 최초 작성. 전략 문서 FX-STRT-015 v3.0 입력 | — |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
*입력 문서: `docs/specs/self-evolving-harness-strategy.md` (FX-STRT-015 v3.0)*
