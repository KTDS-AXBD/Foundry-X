# Phase 4 통합 판정 — Round 1

**날짜**: 2026-05-02
**대상**: ai-foundry-os PRD v1
**채점자**: ax-plugin /req-interview Phase 4 (Phase 2 자동 + Phase 4-B 수동 채점)
**프로젝트 유형**: Greenfield (신규 PRD)

---

## Phase 4 — 충분도 스코어카드 (자동 채점, scorecard.md 발췌)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 착수 충분도 스코어카드 — Round 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
항목 1: 가중 이슈 밀도      [ 20 / 20 ]  (초안, 스킵)
         severity 분포      flaw:6 gap:5 risk:23 (가중:46)
항목 2: Ready 판정 비율     [ 15 / 30 ]  ChatGPT:Conditional, Gemini:Conditional, DeepSeek:Conditional
항목 3: 핵심 요소 커버리지  [ 21 / 30 ]  사용자/이해관계자(최소), Out-of-scope(최소), KPI/성공 기준(최소), MVP 기준(최소)
항목 4: 다관점 반영 여부    [ 17 / 20 ]  사용자 관점(최소)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총점:  73 / 100  →  🔄 추가 검토 권장 (착수 임계 80 미달)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

미달 핵심:
- **항목 2 (15/30)**: 3 모델 모두 Conditional — 신뢰성 있는 일치, 단 Ready 0개
- **항목 3 (21/30)**: 핵심 섹션이 간결하지만 깊이 부족 (특히 사용자 여정·KPI 산정 방법)
- **항목 4 (17/20)**: 사용자 관점이 페르소나 표 수준에서 그침

---

## Phase 4-B — Ambiguity Score (Claude 직접 채점)

> 공식: **Ambiguity = 1 − Σ(clarityᵢ × weightᵢ)** · Greenfield 가중치 적용

### 차원별 채점

| 차원 | 가중치 | Clarity | 가중 점수 | 근거 |
|---|---|---|---|---|
| **Goal** | 0.40 | **0.85** | 0.34 | Gold Slogan + 한 줄 정의 명확, 7월 deadline + MVP 기준 측정 가능, 외부 vs 사내 두 트랙 명시. 단 "외부 GTM 메시지의 성공 기준"이 약간 모호 |
| **Constraint** | 0.30 | **0.80** | 0.24 | 기술 스택·인력(1.0 FTE+AI)·보안(SSO+RBAC+schema 격리)·일정 모두 명시. 단 LLM 비용 한도·외주 가능 여부·KMS 정책은 약간 모호 |
| **Success** | 0.30 | **0.70** | 0.21 | 8개 KPI 정의 + MVP 기준 + 실패 조건 명시. 단 "X%", "N건" 같은 변수가 미정 (베이스라인 측정 후 — 오픈 이슈 #7), ChatGPT가 "KPI 산정 방법 구체성 부족" flaw 지적 |
| **(Context)** | (Greenfield X — 적용 안 함) | - | - | - |
| **합계** | **1.00** | | **0.79** | |

### 결과

```
Ambiguity = 1 − 0.79 = 0.21
```

| Ambiguity 범위 | 판정 | 본 PRD |
|---|---|---|
| ≤ 0.2 | **Ready** | |
| 0.2 ~ 0.4 | **주의** (Socratic 심화 보완) | ✅ **0.21** |
| > 0.4 | **미달** (재인터뷰 필요) | |

가장 모호한 차원: **Success (0.70)** — KPI 변수(X%, N건) 미정, 산정 방법 구체성 부족. ChatGPT와 Gemini 모두 동일 지적.

---

## Phase 4-C — 통합 판정 매트릭스

> 02 references/scorecard.md + ambiguity-score.md 매트릭스 적용

| 스코어카드 | Ambiguity | 판정 | 본 PRD |
|---|---|---|---|
| ≥ 80 | ≤ 0.2 | ✅ 착수 가능 | |
| ≥ 80 | > 0.2 | ⚠️ 스코어 통과, 모호함 잔존 — Socratic 심화 | |
| < 80 | any | ❌ 미달 — 추가 인터뷰 라운드 필요 | ✅ **본 PRD** |

### 최종 판정: ❌ **추가 라운드 필요**

스코어카드 73 / 100 (< 80) → 매트릭스에 따라 **Ambiguity와 무관하게 미달**.

단, Ambiguity가 0.21 (주의 경계)로 나쁘지 않다는 건 PRD의 골격은 명확하고 **세부 보강만 하면 빠르게 80점 달성 가능**하다는 신호.

---

## Round 2를 위한 핵심 보강 안건 (P0)

3 LLM 검토 결과를 P0 (모든 모델 일치) / P1 (2 모델 일치) / P2 (단일)로 분류:

### P0 — Round 2에 무조건 반영 (3 모델 일치)

| ID | 안건 | 출처 | PRD §변경 |
|---|---|---|---|
| **P0-1** | **인력 1인 + AI 100% 모델의 PoC 검증 + 백업 인력 확약** (R-X2 강화) | ChatGPT flaw + Gemini risk + DeepSeek risk | §6.3 + §11 오픈 이슈 #4 강화 |
| **P0-2** | **본부별 합의 리드타임 명시** (R-X1 강화 — 7월 deadline 영향 분석 포함) | ChatGPT risk + Gemini gap + DeepSeek risk | §7 신설 (Risks Detail) + §11 오픈 이슈 #1 강화 |
| **P0-3** | **KPI 산정 방법 구체화** (자산 재사용 단위·진단 시간 단축 베이스라인 측정 의무) | ChatGPT flaw + Gemini gap | §5.1 + §11 오픈 이슈 #7 |

### P1 — Round 2에 반영 강력 권장 (2 모델 일치)

| ID | 안건 | 출처 | PRD §변경 |
|---|---|---|---|
| **P1-1** | **운영/지원 체계 명시** (장애 대응·백업·복구 SOP) | ChatGPT gap + DeepSeek risk | §4.5 신설 (운영) + §6.4 보안 보강 |
| **P1-2** | **테스트/QA/교육 계획** (UAT, 본부별 시나리오 테스트, 비개발자 온보딩) | ChatGPT gap + Gemini gap | §4.6 신설 (QA·교육) |
| **P1-3** | **변경관리/릴리즈 플랜** (정책팩 버전업·롤백·블루그린) | ChatGPT gap + DeepSeek concern | §6.2 보강 + §4.7 신설 |
| **P1-4** | **AI 에이전트 투명성·설명 가능성** (산출물 근거·HITL escalation) | ChatGPT gap + Gemini risk | §3 사용자 환경 + §4.6 + §6.4 |
| **P1-5** | **사용자 여정 (User Journey)** — 본부별 신규 정책팩 자산화 → 진단 → Cross-Org → KPI 반영 | ChatGPT flaw + Gemini concern | §3 신설 (User Journey) |
| **P1-6** | **외부 GTM 자료 형태 구체화** (영상·1쪽 시각화·KPI 보고서 템플릿) | ChatGPT flaw + Gemini comment | §4 신설 또는 §5.2 보강 |

### P2 — 참고 보존 (단일 모델)

| ID | 안건 | 출처 | 처리 |
|---|---|---|---|
| **P2-1** | Six Hats 토론 자동화 구현 난이도 | DeepSeek flaw | §4.2 P1 → P2 강등 또는 외부 LLM 호출만 |
| **P2-2** | 산업별 규제 (금융권 망분리, 정보보안 강화) Phase 4 이연 명시 | Gemini risk | §4.3 보강 |
| **P2-3** | 윤리적 AI / 편향성 관리 방안 | Gemini risk | §6.4 신설 |

---

## Round 2 진행 옵션

| 옵션 | 설명 | 예상 효과 |
|---|---|---|
| **A. P0+P1 모두 반영 → prd-v2.md → Round 2 자동 검토** | 9 안건 PRD에 통합 (≈ 50% 분량 증가). 다시 3 모델 검토 → 80+ 도달 시 착수 | 80점+ 도달 가능성 ≥ 70%, 시간 30분~1시간 |
| **B. P0만 반영 → prd-v2.md → Round 2** | 핵심 3 안건만 반영. Conditional의 main 차단 요소 해결. 빠른 진행 | 80점+ 도달 가능성 ≈ 50%, 빠름 |
| **C. P0+P1 반영 + Six Hats 수동 폴백 + Round 2** | 깊이 있는 검토 후 진행 | 가장 깊이 있는 검증, 시간 더 소요 |
| **D. Round 1 결과 그대로 착수 결정 (사용자 권한)** | 73점이지만 Conditional 조건 별도 트래킹하면서 진행 | 실패 조건 위험 증가 |

---

## Six Hats 상태 (deep depth 옵션)

⚠️ **자동 호출 실패** — Cowork sandbox 45초 timeout이 20 turn × Gemini 호출 시간(60~90초)을 초과.

옵션:
- **수동 폴백**: `round-1/sixhats-prompt.md`를 Gemini 또는 ChatGPT 사이트에 직접 붙여넣어 결과 받아 `sixhats-discussion.md`에 저장. Phase 4-C 판정에 보조로 반영
- **로컬 호출**: 본인 컴퓨터(macOS/Windows/WSL)에서 `node review-api.mjs --mode sixhats --rounds 20 --model gemini --proxy openrouter`
- **Round 2까지 미루기**: prd-v2.md 작성 후 한꺼번에 Six Hats

---

## Round 1 → Round 2 전이 체크리스트

- [ ] P0-1 (인력 PoC + 백업) 결정
- [ ] P0-2 (본부 합의 리드타임) 측정
- [ ] P0-3 (KPI 베이스라인) 측정 시작
- [ ] P1-1 ~ P1-6 반영 여부 결정 (사용자)
- [ ] Six Hats 진행 방식 결정 (수동/로컬/이연)
- [ ] prd-v2.md 작성 → review-api.mjs Round 2 호출
- [ ] Round 2 scorecard ≥ 80 + Ambiguity ≤ 0.2 도달 시 Phase 5 (prd-final + SPEC F-item 등록)

---

*이 문서는 ax-plugin /req-interview 스킬 Phase 4 (Phase 4-B는 Claude 직접 채점). Round 1 외부 LLM 검토 결과 통합.*
