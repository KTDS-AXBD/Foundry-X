---
title: AI Foundry 정의서 — 외부 LLM 교차검증 1차 결과 통합
target_doc: 02_ai_foundry_phase1_v0.1.md (→ v0.2 격상 근거)
date: 2026-04-29
reviewers: ChatGPT (사업화·BD), Gemini (임원 보고용 요약), DeepSeek (기술적 정확성)
owner: Sinclair Seo
classification: 기업비밀II급
---

# AI Foundry 정의서 — 외부 LLM 교차검증 1차 결과 통합

> **이 문서는 무엇인가**
>
> 03_cross_review_prompts.md 기반으로 ChatGPT·Gemini·DeepSeek 3개 LLM이 정의서 v0.1을 검증한 결과를 한 곳에 모으고, P0~P2로 분류하여 정의서 v0.2 반영 의사결정을 기록한 PM 운영 문서입니다. v1.0 합의 회의(5월 W21) 안건의 기초 자료로 사용합니다.

---

## 0. 1쪽 요약

### 0.1 검증 합의된 강점 (3 LLM 공통)

- **단일 컨셉 일관성** — "의사결정의 자산화"라는 메시지가 0.1 / 2.1 / 1.5에서 흔들리지 않음
- **기술·BM·운영의 통합** — 5-Layer / 4-Asset / HITL+Audit+Diagnostic이 한 문서에 묶임 (분리되지 않은 점이 차별)
- **방어적 게이트 + DoD 설계** — 7.1·7.3에서 일정 위험을 명시적으로 흡수
- **신규 vs 재사용 비율 명시** — 7.5.1이 6월 Prototype 현실성을 뒷받침

### 0.2 즉시 반영해야 할 P0 4건

| # | P0 항목 | 출처 LLM | 정의서 반영 위치 |
|---|---|---|---|
| **P0-1** | "Decision Case" 데이터 구조 정의 추가 | DeepSeek (Critical) | §3 (신규 3.1.5) + §12.3 |
| **P0-2** | 도메인·데이터 제공 지연 리스크 (R-13) 신규 등록 | ChatGPT #1 + DeepSeek #improvement 2 | §11.1 |
| **P0-3** | Cross-Org BM 현실 난이도(데이터 공유 거부) 리스크 명시 | ChatGPT #2 + DeepSeek §5.5 | §5.5 + §11.1 R-14 |
| **P0-4** | 6월 Prototype 일정 공격성 — 범위 축소 fallback 사전 명시 | ChatGPT #3 + DeepSeek counterquestion 1 | §7.6 (가설 H2 보강) + §7.2 버퍼 원칙 |

### 0.3 P1 (v0.2 또는 v1.0 전 반영 시도)

- **P1-1** Multi-Evidence Triangulation (LLM self-confidence 의존 완화) — §3.5 / §8.3
- **P1-2** 허니콤 그림 양방향화 (KT ↔ 고객 ↔ 파트너 순환) — §0.3 / §2.6
- **P1-3** "진짜 경쟁자 = 내부 inertia·SI 방식" 인식 추가 — §1.3
- **P1-4** 외부 고객사용 "한 줄 가치" 추가 (4-Asset이 너무 복잡할 위험 대응) — §0.4 또는 §1.5
- **P1-5** core_differentiator 보호 vs 플랫폼 학습 경계 — §5.4 보강

### 0.4 P2 (백로그 — v1.x 보강 단계)

- §1.3 (a) 룰 엔진 약점 클레임 출처 부착 (Gartner/Forrester 보고서 인용)
- §5.5 자산 가치 곡선의 검증 한계 명시 (가상 도메인 3개로는 검증 불가 → 산업 컨소시엄 사례 인용 보강)
- §6 가상 시나리오의 외부 고객 설득력 — 시연용 시나리오로 별도 정련

### 0.5 사용자(Sinclair)가 답해야 하는 Counterquestions 3건

DeepSeek가 던진 질문 — 정의서로는 즉답 불가. PM 의사결정 또는 W18 합의 회의 안건으로 등재.

1. **Q1**: 6월 Prototype 못 만든다는 신호가 5월에 감지되면 범위를 어떻게 축소할 것인가?
2. **Q2**: 첫 외부 고객사에게 "압도적으로 명확한 하나의 가치"는 무엇인가? (정책 충돌 진단? 감사 대응 시간 단축?)
3. **Q3**: core_differentiator 보호와 플랫폼 지능 향상의 경계는 어디인가?

---

## 1. LLM별 1차 검증 결과 요약

### 1.1 ChatGPT — 사업화·BD 운영 관점

#### 진단 한 줄
> "이미 'Gate 통과 직전 상태'다. 좋냐가 아니라 어디서 깨질지가 문제."

#### 강점 (사업화 관점 3가지)
- 단일 컨셉이 명확함 — "의사결정 자산화" 메시지 흔들림 없음, 4-Asset/5-Layer/Diagnostics 일관
- 기술·비즈니스·운영을 하나의 문서에 묶음 (보통 분리되어 무너짐)
- 외부 LLM 교차검증 프레임워크가 이미 들어 있음 (QA 조직 수준)

#### 깨지는 지점 4건
| # | 지적 | 우선순위 |
|---|---|---|
| 1 | 정의는 완벽하지만 실제 첫 도메인 연결이 없음 → "좋은 플랫폼이 아무도 안 쓰는 플랫폼"이 될 위험 | **P0** |
| 2 | Cross-Org는 현실 난이도 최상 (기업이 데이터 공유 안 함) → 핵심 BM이 Phase 4까지 밀릴 위험 | **P0** |
| 3 | 6월 Prototype 4주 일정은 공격적 (보통 2~3배 걸림) — 문서도 가설로 인식 중 | **P0** |
| 4 | 진짜 경쟁자는 IBM ODM·RAG·SaaS가 아니라 **내부 조직 inertia + 기존 프로세스 + SI 방식** | P1 |

#### 추천 액션
- "파일럿 도메인 1개 강제 선택" (HR / Ops / 심사·승인 중)
- 규제 + 의사결정 많은 조직이 first target — 추적성·일관성·감사 대응이 돈이 되는 곳
- 이번 주: 도메인 1개 선택 + 데이터 접근 가능 여부 + KPI 3개
- 다음 주: 외부 LLM 검증 A·B·E·F만 우선
- W21 전: v1.0 확정 + Phase 2 착수

#### 통합 PM 결정
- ✅ 1·2·3 P0로 즉시 반영
- ✅ 4번 P1 — §1.3 시장 시도 비교에 "내부 inertia/기존 프로세스/SI 방식이 진짜 경쟁자" 단락 추가
- ✅ 도메인 강제 선택 → 별도 산출물 06_domain_selection_matrix.md로 후속 작업 (다음 응답)

---

### 1.2 Gemini — 임원 보고용 1쪽 요약 변환

#### 형태
- 정의서 → 임원 결재용 1쪽 보고서로 변환
- DoD 1~5 / 5월 마일스톤 표 (W18~W21, Owner 명시) / Critical Path Warning / 검증 가설 H1~H3

#### 가치
- W18~W21 회의 자료로 즉시 사용 가능
- 임원이 15분 안에 "이걸 왜 결재해야 하는가"에 답할 수 있는 형태

#### 통합 PM 결정
- ✅ Gemini 결과를 기반으로 별도 산출물 **05_executive_one_pager_v1.md** 정리
- 정의서 본문은 변경 없음 (요약 콘텐츠는 정의서에 모두 존재)
- W18 회의 직전에 v1.1로 한 번 더 갱신

---

### 1.3 DeepSeek — 기술적 정확성·구현 가능성

#### 진단 한 줄
> "탄탄한 설계지만 5-Layer를 잇는 '의사결정 케이스' 데이터 구조가 모호하고, LLM 추출 신뢰도 검증 방법론이 누락되어 있다."

#### Critical Gap 2건

**Gap 1 — Decision Case 데이터 구조 부재 (Critical, §3.2 / §8.3)**
- 전체 아키텍처가 의사결정 케이스 단위로 작동하지만, 이 핵심 데이터 개체가 5-Layer를 통과하며 어떻게 변하는지 정의 없음
- 제안한 스키마:
```json
{
  "case_id": "string",
  "type": "loan_approval | alarm_response | ...",
  "status": "ingested | enriched_with_ontology | policies_applied | ...",
  "input": { "raw_document_ids": [], "structured_facts": {} },
  "context_graph_nodes": ["node_id1", ...],
  "applied_policies": [{"POL-ID": "...", "version": "...", "result": "..."}],
  "hitl_decisions": [],
  "final_outcome": {}
}
```
- 영향: 모든 레이어 의존성과 개발 범위가 훨씬 명확해짐

**Gap 2 — LLM self-confidence 의존 (High, §3.5 / §4.5 / §9.2)**
- 현재 진단 severity와 자동화 수준이 LLM이 스스로 평가한 confidence에 전적 의존
- Prototype에서 이 수치가 부정확하면 임계치 보정 자체가 불가능
- 제안: **Multi-Evidence Triangulation** — 별도 LLM 호출(낮은 Tier)로 "이 정책이 기존 정책과 모순되는가, 자주 발생하는 케이스인가"를 질문해 2차 신뢰도 확보

#### Improvements 2건
- **§2.6 / §0.3 허니콤 그림이 하향식 편향** — KT → 고객/파트너의 일방향만 보임. 양방향 순환 필요
- **§11.1 도메인·데이터 제공 지연 리스크 미등록** — 가장 큰 단일 장애 지점인데 R-13으로 공식 등록되어 있지 않음

#### Unverifiable Claims
- §1.3 (a) "룰 엔진의 약점: 룰 작성에 전문가 필요" — 최신 NLP 기반 룰 마이닝 도구는 완화 중. Gartner/Forrester 보고서 확인 필요
- §5.5 N개 도메인 비선형 가치 곡선 — 가상 도메인 3개로는 검증 불가. 산업 컨소시엄 사례 등 보강 필요

#### Counterquestions 3건
- Q1: 6월 Prototype 못 만든다는 신호가 5월에 감지되면 범위 축소 준비?
- Q2: 첫 외부 고객사에 "압도적으로 명확한 하나의 가치"는?
- Q3: core_differentiator 보호와 플랫폼 학습 경계?

#### 통합 PM 결정
- ✅ Gap 1 (Decision Case Schema) — §3에 신규 절(3.1.5) + §12.3 부록 데이터 스키마에 추가, **DeepSeek 제안 스키마를 출발점으로 채택**
- ✅ Gap 2 (Multi-Evidence) — §3.5 LLM Layer 설명 보강, §8.3 모듈 스펙 갱신, P1으로 분류 (v0.2 반영 시도)
- ✅ 허니콤 양방향화 — §0.3 다이어그램 수정 (P1)
- ✅ R-13 신규 (Critical, High) — ChatGPT #1과 합쳐 P0로 즉시 등록
- ✅ §1.3 (a) 클레임 — 출처 부착 또는 표현 완화 (P2)
- ✅ §5.5 곡선 검증 한계 — 가상 도메인의 검증 한계를 본문에 명시 (P0의 일부로 처리)
- ✅ Counterquestions 3건 — §11.4 신규 절 (사용자 답변 필요 질문) 또는 W18 회의 안건

---

## 2. P0 / P1 / P2 통합 매트릭스

### 2.1 P0 — v0.2 즉시 반영 (5건)

| # | 항목 | 정의서 반영 위치 | 변경 형태 | Owner |
|---|---|---|---|---|
| P0-1 | Decision Case Schema 추가 | §3 신규 절 + §12.3 데이터 스키마 | 신규 절 + 스키마 추가 | Sinclair |
| P0-2 | 도메인·데이터 제공 지연 리스크 R-13 | §11.1 | 표 행 추가 (Critical / High) | Sinclair |
| P0-3 | Cross-Org 현실 난이도 리스크 R-14 + §5.5 곡선 검증 한계 명시 | §11.1 + §5.5 | 표 행 추가 + 본문 보강 | Sinclair |
| P0-4 | 6월 Prototype 범위 축소 fallback 사전 명시 | §7.2 + §7.6 H2 | 본문 보강 (Mock 우선 + 시그니처 단계 축소) | Sinclair |
| P0-5 | LLM self-confidence 의존 리스크 R-15 (DeepSeek Gap 2의 리스크 면) | §11.1 | 표 행 추가 (High / High) | Sinclair |

### 2.2 P1 — v0.2 또는 v1.0 전까지 반영 시도 (5건)

| # | 항목 | 정의서 반영 위치 | 우선도 |
|---|---|---|---|
| P1-1 | Multi-Evidence Triangulation 설계 추가 | §3.5 / §8.3 | High (P0-5와 한 쌍) |
| P1-2 | 허니콤 양방향 순환 다이어그램 | §0.3 + §2.6 | Med |
| P1-3 | "진짜 경쟁자 = 내부 inertia·SI 방식" | §1.3 신규 단락 | Med |
| P1-4 | 외부 고객사용 한 줄 가치 (4-Asset이 복잡할 위험 대응) | §0.4 또는 §1.5 | Med |
| P1-5 | core_differentiator 보호 vs 플랫폼 학습 경계 | §5.4 보강 | Low |

### 2.3 P2 — 백로그 (3건)

| # | 항목 | 처리 |
|---|---|---|
| P2-1 | §1.3 (a) 룰 엔진 약점 클레임 출처 부착 | Gartner/Forrester 보고서 인용 — Perplexity 별도 검증 |
| P2-2 | §5.5 자산 가치 곡선 — 산업 컨소시엄 사례 인용 | 문헌 조사로 별도 보강 |
| P2-3 | §6 가상 시나리오의 외부 고객 설득력 — 시연용으로 정련 | Phase 2 시연 시나리오 작업 시 통합 |

### 2.4 Counterquestions — 사용자가 답해야 할 안건 (3건)

| Q | 질문 | 결정 시점 / 안건화 |
|---|---|---|
| Q1 | 6월 Prototype 범위 축소 fallback 정책 | W18 합의 회의 안건 → 결정 후 §7.2 본문 갱신 |
| Q2 | 첫 외부 고객사에 보여줄 "한 줄 가치" | Phase 3 도메인 확정과 연동 → 7월 W29 G4 |
| Q3 | core_differentiator vs 플랫폼 학습 경계 | Phase 4 라이선스 정책과 연동 — 9월 이후 |

---

## 3. 정의서 v0.2 변경 매핑 (구체 항목)

### 3.1 신규 추가될 섹션

| 정의서 위치 | 신규 추가 내용 | 출처 |
|---|---|---|
| **§3.1.5 (신규)** "Decision Case 데이터 구조" | Decision Case 정의 + JSON Schema + 5-Layer 통과 흐름 | DeepSeek Gap 1 |
| **§11.1 R-13** | 도메인·데이터 제공 지연 (Critical / High) + 대응 (W22까지 시나리오 협의 + 2순위 도메인 병행 발굴) | ChatGPT #1 + DeepSeek improvement 2 |
| **§11.1 R-14** | Cross-Org 데이터 공유 거부 (High / High) + 대응 (단일 조직 내부 자체 진단 우선 적용) | ChatGPT #2 |
| **§11.1 R-15** | LLM self-confidence 의존 (High / High) + 대응 (Multi-Evidence Triangulation 설계, P1) | DeepSeek Gap 2 |
| **§11.4 (신규)** "사용자 답변 필요 질문" | Q1·Q2·Q3 + 결정 시점 | DeepSeek counterquestions |
| **Changelog (신규 끝)** | v0.1 → v0.2 변경 이력 | 본 문서 추적 |

### 3.2 본문 수정될 섹션

| 정의서 위치 | 변경 내용 | 출처 |
|---|---|---|
| §0.3 / §2.6 | 허니콤 그림을 양방향 순환 구조로 수정 | DeepSeek improvement 1 |
| §0.4 또는 §1.5 | "외부 고객사용 한 줄 가치" 단락 추가 | DeepSeek counterquestion 2 |
| §1.3 | "내부 조직 inertia + 기존 프로세스 + SI 방식이 진짜 경쟁자" 단락 추가 | ChatGPT #4 |
| §5.4 | core_differentiator 보호와 플랫폼 학습의 경계 명시 | DeepSeek counterquestion 3 |
| §5.5 | 자산 가치 곡선의 검증 한계 + 가상 도메인의 한계 명시 | DeepSeek §5.5 unverifiable |
| §7.2 / §7.6 H2 | Prototype 범위 축소 fallback 명시 (시그니처 mock + 5-Layer E2E 우선) | ChatGPT #3 + DeepSeek Q1 |
| §3.5 / §8.3 | Multi-Evidence Triangulation 설계 추가 | DeepSeek Gap 2 |

---

## 4. v0.2 발행 후 다음 의사결정 (W18 합의 회의 안건)

다음 안건들이 W18 회의에서 결정되어야 v1.0으로 승급 가능합니다.

### 4.1 안건 A — 첫 도메인 강제 선택 (ChatGPT 강조)

| 후보 | 데이터 접근 | 의사결정 반복 | KPI 명확성 | 규제 친화 |
|---|---|---|---|---|
| HR 의사결정 | 사내 가능 | 높음 | 보통 | 보통 |
| 운영(Ops) 의사결정 | 사내 가능 | 매우 높음 | 높음 | 낮음 |
| 심사·승인 (대출/보조금/감사) | 외부 협조 필요 | 매우 높음 | 매우 높음 | **매우 높음** |

> ChatGPT 추천 우선순위: HR → Ops → 심사·승인. PM의 W18 결정 안건.

### 4.2 안건 B — 6월 Prototype 범위 축소 fallback 정책

| 시그니처 기능 | Phase 2 4주 안에 풀구현 | 1주 지연 시 | 2주 지연 시 |
|---|---|---|---|
| 5-Layer E2E | 필수 | 필수 | 필수 |
| 4대 진단 | 풀구현 | Missing/Inconsistency만 | mock |
| Cross-Org Comparison | 가상 조직 3개 | 가상 조직 2개 | mock |

### 4.3 안건 C — 5 모듈 코어 인력 지정 (필수)

> Gemini의 Critical Path Warning 일치. W18까지 미지정 시 도미노 지연.

### 4.4 안건 D — Counterquestion Q1·Q2 결정자 매핑

> Q3는 Phase 4 안건이므로 W18 보류.

---

## 5. v0.2 → v1.0 승급 기준

| 게이트 | 통과 기준 |
|---|---|
| **Gate v0.2** (오늘) | P0 5건 정의서 본문 반영 완료 |
| **Gate v0.3** (5월 W19~W20) | P1 5건 정의서 반영 완료 + 안건 A·B·C 결정 |
| **Gate v1.0** (5월 W21) | 임원·핵심 이해관계자 sign-off + Counterquestion Q1·Q2 결정 + 모듈 스펙 v1.0 합의 |

---

— 끝.
