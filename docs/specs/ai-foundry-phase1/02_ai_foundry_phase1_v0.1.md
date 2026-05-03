---
title: AI Foundry — 기업 의사결정 업무 Agentic AI 플랫폼 정의서
scope: Phase 1 정의서 (~5월) + Phase 2(6월 Prototype) + Phase 3(8월~ 실제 사업 적용) 로드맵
version: v0.2 (Draft, 외부 LLM 1차 교차검증 P0 반영판)
date: 2026-04-29
owner: Sinclair Seo
status: 외부 LLM 교차검증(ChatGPT·Gemini·DeepSeek) 1차 결과 P0/P1 반영
timeline: 5월 기획 확정 / 6월 Prototype / 7월 진입 정비 / 8월~ 실제 사업 적용
out_of_scope_phase1: 모듈 구현, KT 본부 GTM, 도메인 인스턴스화 (Phase 2·3에서 다룸)
changelog_ref: 끝의 Changelog 절 참조 (04_cross_review_consolidation_v1.md 기반)
classification: 기업비밀II급
---

# AI Foundry
## 기업 의사결정 업무 Agentic AI 플랫폼 정의서

> **이 문서는 무엇이고, 무엇이 아닌가**
>
> **이다**: AI Foundry라는 시스템이 무엇인지 **5월 안에 확정**하고(Phase 1), **6월에 Prototype**으로 입증하며(Phase 2), **8월부터 실제 사업 적용**으로 운영하는(Phase 3) 전체 그림을 담은 문서. 모든 독자(임원·개발자·외부 파트너)가 이 문서 한 권으로 "AI Foundry는 어떤 시스템이고, 언제 무엇이 나오는가"에 답할 수 있어야 한다.
>
> **아니다**: 도메인별 상세 사업기획안, 외부 고객사 영업 자료, 가격·계약서 양식 — 이런 것들은 Phase 3 진입 후 별도 문서로 다룬다.
>
> **세 Phase의 분리 (요약)**
>
> | Phase | 기간 | 본질 | 종료 시 산출물 |
> |---|---|---|---|
> | **Phase 1** | ~2026-05-31 | **기획 확정** — AI Foundry 정의 + 모듈 스펙 | 본 문서 v1.0 + 5-Layer 모듈 스펙 v1.0 |
> | **Phase 2** | 2026-06-01 ~ 2026-06-30 | **Prototype** — 가상 도메인 1개로 5-Layer E2E 동작 | 시연 가능한 빌드 + 시연 영상 + 측정 결과 |
> | **Phase 3** | 2026-08-01 ~ | **실제 사업 적용** — 첫 실제 도메인 인스턴스화 + 운영 | 도메인 정책팩 v1.0 + 운영 데모 + GTM 1차 |
>
> 7월은 Phase 2 결과 정리 + Phase 3 진입 정비(도메인 합의·데이터 협조·인력 배정·KT 본부 align) 기간으로, 명시적 게이트(G4)를 둡니다.

---

## 0. Executive Summary

### 0.1 Gold Slogan — 한 문장 정의

> **AI Foundry는 기업의 의사결정을 자산으로 만드는 Agentic AI 플랫폼입니다.**

### 0.2 한 단락 확장

기업이 매일 수천 번 내리는 의사결정은 대부분 사람의 머릿속에 있다가 사라집니다. 누가, 무엇을 근거로, 어떤 룰을 따라 결정했는지가 추적되지 않으니 같은 결정이 반복되고, 효과를 평가할 수 없으며, 감독·감사가 발생할 때마다 처음부터 근거를 재구성해야 합니다. AI Foundry는 이 의사결정의 **근거·맥락·반복가능성**을 데이터·온톨로지·LLM·Workflow·Agent 5개 레이어로 영구 자산화합니다. 결과로 의사결정은 **정책팩(Policy Pack) · 온톨로지(Ontology) · 스킬패키지(Skill Package) · 의사결정 로그(Decision Log)** 라는 4가지 자산 형태로 축적되며, 이 자산은 사람이 바뀌고 조직이 바뀌어도 살아남는 **조직의 의사결정 IP**가 됩니다.

### 0.3 활용 주체 — 허니콤(Honeycomb) 네트워크 구조

AI Foundry는 한 조직만 쓰는 시스템이 아닙니다. **KT의 의사결정**과 **고객사의 의사결정**, 그리고 그 사이의 파트너사 의사결정이 같은 자산 표준을 공유하면서, 서로의 자산을 재사용·검증·확장할 수 있는 **허니콤 네트워크**입니다. 자산 흐름은 한 방향이 아닌 **양방향 순환** 구조입니다 — 한 조직의 결정이 다른 조직의 학습 자산으로, 다른 조직의 검증 결과가 첫 조직의 정책 개선으로 환류됩니다.

```
                       ┌──────────────────┐
              ┌───────▶│   AI Foundry     │◀────────┐
              │        │ (자산 표준·공통면) │         │
              │        └────────┬─────────┘         │
              │                 │                    │
              │   공유          │  공유               │  공유
              │   자산          │  자산              │  자산
              │                 │                    │
        ┌─────┴────┐      ┌─────▼──────┐       ┌────┴─────┐
        │   KT     │◀────▶│  고객사 1    │◀─────▶│ 파트너 N  │
        │ (사업화)  │       │  (본업 결정) │       │ (전문지식) │
        └─────┬────┘       └─────┬──────┘       └────┬─────┘
              │                   │                    │
              └──────환류·검증·재사용─────────────────┘

      KT의 사업화 판단·고객의 본업 결정·파트너의 전문지식이
      Policy Pack·Ontology·Skill Package·Decision Log 단위로
      서로를 학습·검증·강화하는 닫힌 순환.
```

이 구조에서 누가 결정의 주체인지에 따라 동일 시스템이 세 가지 모습으로 보입니다.

| 활용 주체 | AI Foundry의 모습 | 가치 |
|---|---|---|
| KT 그룹 (내부) | "KT를 더 빠르고 일관된 의사결정 조직으로 만드는 OS" | 사업화·운영 의사결정의 누적 학습, 본부 간 지식 공유 |
| 고객 기업 (외부) | "고객 본업의 핵심 의사결정을 자산화·자동화하는 OS" | 감독 대응, 정책 일관성, 사람 의존 감소 |
| 파트너·전문가 (생태계) | "도메인 자산을 기여하고 재사용 매출을 받는 마켓플레이스" | 컨설팅 IP 자산화, 표준 라이선스 수익 |

### 0.4 핵심 가치 4중주 (1순위는 "자산화")

| 우선순위 | 가치 | 한 줄 정의 |
|---|---|---|
| **1 (Gold)** | **자산화** | 일회성 LLM 호출이 아니라, 의사결정 룰·맥락·결과를 정책팩·온톨로지·스킬패키지·로그로 영구 자산화 |
| 2 | 추적성 | "왜 이 결정인가"에 언제든 답할 수 있는 audit trail 자동 생성 |
| 3 | 적응 속도 | 새 도메인을 N주 안에 인스턴스화 (자산 재사용으로 가속) |
| 4 | 사람-AI 협업 | HITL(Human-in-the-Loop)이 모든 결정 흐름의 일등 시민, 책임 분담 명확 |

#### 0.4.1 외부 고객사용 단일 약속 (one-line value)

4-Asset Model이 처음 듣는 외부 고객에게는 복잡할 수 있습니다. 그래서 첫 미팅에서는 다음 한 줄로만 약속합니다.

> **"당신 조직의 critical 정책 충돌을 30일 안에 모두 찾아드리고, 감독 응답 시간을 일주일 → 즉시로 줄여드립니다."**

이 한 줄이 4대 진단(§4)의 직접 결과이고, 자산화·추적성·적응 속도가 자연스럽게 따라옵니다. **첫 도메인 영업에서는 4-Asset 이야기를 후순위로 두고 이 한 줄을 우선**합니다.

### 0.5 Phase별 주요 산출물 (5~8월)

#### Phase 1 — 5월 (기획 확정)
| 산출물 | 형태 | 의미 |
|---|---|---|
| **AI Foundry 정의서 v1.0** | 본 문서의 합의 반영판 | 모든 이해관계자의 공통 언어 |
| **5-Layer 모듈 스펙 v1.0** | 레이어별 1~3쪽 스펙 문서 | 6월 Prototype 개발 착수 가능한 수준 |
| **인터페이스 카탈로그 v1.0** | 모듈 간 API/이벤트 명세 | Prototype 통합의 근거 |
| **가상 도메인 1·2 사양** | 데이터·시나리오 정의 | Prototype 검증용 |

#### Phase 2 — 6월 (Prototype)
| 산출물 | 형태 | 의미 |
|---|---|---|
| **AI Foundry Prototype** | 동작하는 5-Layer 통합 빌드 | 시스템 정의가 실제로 구현 가능함을 증명 |
| **가상 도메인 E2E 시연** | 시연 영상 + 시연 시나리오 | 임원·외부 청중 대상 |
| **Phase 2 측정 보고서** | 정량·정성 지표 | Phase 3 진입 결정의 근거 |

#### Phase 3 — 7~8월 (실제 사업 적용)
| 산출물 | 형태 | 의미 |
|---|---|---|
| **첫 실제 도메인 인스턴스 정책팩 v1.0** | 운영 가능한 도메인 정책 자산 | "사업 적용"의 첫 실증 |
| **HITL 검토 운영 시작** | RBAC + 운영 SOP | 거버넌스 내장 검증 |
| **GTM 1차 패키지** | 본부·고객사 제안용 자료 | 8월 말 임원 보고 |

### 0.6 명시적 out-of-scope

| Phase | out-of-scope (해당 Phase에서는 다루지 않음) |
|---|---|
| Phase 1 (5월) | 모듈 구현 자체 / 도메인 데이터 / GTM / 가격 |
| Phase 2 (6월) | 실제 도메인 데이터 (가상 데이터만) / 외부 고객 / KT 본부 공식 합의 |
| Phase 3 (7~8월) | 외부 마켓플레이스 / 다국어 / 실시간 스트림 / 결제·라이선스 풀 시스템 |

→ Phase 1의 정의가 Phase 2/3의 모든 산출물이 인용하는 **단일 진실의 원본(Single Source of Truth)** 역할을 하며, Phase 1 정의서가 흔들리면 Phase 2·3가 흔들립니다. 따라서 5월 안의 정의서 합의가 전체 일정의 첫 도미노입니다.

---

## 1. 왜 AI Foundry가 필요한가 — 문제 정의

### 1.1 기업 의사결정의 현재 모습 (As-Is)

기업의 의사결정은 네 가지 만성 질환을 앓고 있습니다.

#### 1.1.1 머릿속에만 있는 결정 (Tacit Decision)

대부분의 업무 의사결정은 명문화되지 않습니다. 베테랑이 30년 쌓은 판단 기준은 그 사람이 퇴직하면 사라지고, 신입은 같은 케이스를 다시 처음부터 학습합니다. 명시적으로 문서화된 정책조차 실제 운영과 다른 경우가 많아, "공식 룰"과 "현장 룰"이 분리되어 있습니다.

> **현장 인용 (가설)**: "이 케이스는 매뉴얼대로 하면 거절인데, 우리 부서는 이런 사례에선 승인해 왔어요."

#### 1.1.2 추적되지 않는 근거

결정이 내려진 후, "왜 그 결정이었는가"를 묻는 질문(감독·감사·민원·내부 이의신청)이 들어오면 근거를 처음부터 재구성해야 합니다. 의사결정 시점의 데이터·룰·문맥이 함께 보존되지 않기 때문입니다.

#### 1.1.3 반복 재발생하는 같은 결정

조직이 큰 결정일수록 반복합니다. 같은 케이스가 부서·지역·시점만 다르게 매번 새로 결정되며, 그 결정 사이의 일관성은 사후에 우연히 발견됩니다. 일관성 부재는 곧 신뢰성·예측가능성의 부재이고, 외부에서는 차별·자의성 시비로 이어집니다.

#### 1.1.4 평가되지 않는 결과

결정 후 효과가 측정되지 않습니다. 어떤 룰이 좋은 결정으로 이어졌고 어떤 룰이 나쁜 결과로 이어졌는지 데이터가 없으니, 룰을 개선하려 해도 무엇을 바꿔야 할지 모릅니다. 결국 룰은 정치·관습·민원 압력에 의해 임시방편적으로 수정됩니다.

### 1.2 LLM 시대 이후 더 심각해진 것

생성형 LLM이 일상에 들어오면서 의사결정 속도는 빨라졌지만, 위 네 가지 질환은 오히려 악화됩니다.

| 악화 양상 | 설명 |
|---|---|
| **불투명성 가속** | LLM이 빠른 결정을 만들어내지만 "왜 그 답인가"는 더 알기 어려워짐. 프롬프트와 모델 가중치라는 블랙박스 |
| **자산화 실패** | 매번 LLM을 새로 호출. 결정의 누적이 조직의 자산이 되지 않고 토큰 비용으로 휘발 |
| **감독 비용 폭증** | 금융·공공·의료 등 규제 산업에서 "AI가 어떻게 그 결정을 했는가"의 설명 의무 강화. 답할 수 없으면 사용 자체가 금지 |
| **거버넌스 공백** | 누가 책임지는가 불명확. AI 단독 결정과 사람 결정이 구분되지 않음 |

### 1.3 시장의 시도들 — 그리고 무엇이 부족한가

현재 의사결정 자동화 시장에는 세 가지 흐름이 있습니다.

**(a) 룰 엔진 / 의사결정 관리 (DMN, IBM ODM 등)**
- 강점: 결정의 추적성, 감독 친화적
- 약점: 룰 작성에 전문가 필요, 비정형 데이터 처리 어려움, LLM 시대 대응 부족

**(b) RAG/LLM 워크플로우 (LangChain, n8n 등)**
- 강점: 빠른 PoC, 비정형 데이터 친화
- 약점: 자산화 부재, 일회성 호출의 누적, 감독 대응 약함

**(c) 도메인 특화 AI 솔루션 (산업별 SaaS)**
- 강점: 도메인 적중도 높음
- 약점: 한 도메인에 갇힘, 조직 간 자산 공유 불가, 가격 비싸고 락인 강함

AI Foundry는 이 세 흐름의 빈틈을 채웁니다.

> "**룰 엔진의 추적성** + **LLM 워크플로우의 적응성** + **도메인 솔루션의 깊이**를 자산화로 통합하는 것."

#### 1.3.1 진짜 경쟁자는 도구가 아닙니다

위 (a)·(b)·(c)는 시장의 도구 비교일 뿐입니다. AI Foundry가 실제로 싸워야 하는 진짜 경쟁자는 다음 세 가지이고, 본 정의서·로드맵·시연·GTM 모든 단계에서 이를 의식해야 합니다.

| 진짜 경쟁자 | 양상 | AI Foundry의 대응 |
|---|---|---|
| **내부 조직 inertia** | "지금까지 잘 돌아가던 프로세스"를 바꾸지 않으려는 관성 | 도입 30일 안에 critical 진단으로 즉시 ROI 신호 (§4.4) — 작은 승리부터 |
| **기존 SI 방식** | "특정 도메인을 처음부터 SI로 만들면 된다"는 관습 | 두 번째 도메인부터 비용 60%+ 감소 (§5.5) — 자산 재사용의 정량 증명 |
| **고객 본업의 우선순위 경쟁** | 의사결정 자동화는 다른 100가지 IT 우선순위와 경합 | "감독 대응 시간 1주일 → 즉시" 같은 즉각적 페인포인트 직타 (§0.4.1) |

> **이 세 경쟁자에게 지면 도구 비교에서 이긴 의미가 없어집니다.** Phase 3 GTM 설계의 첫 질문은 "이 도메인의 internal champion 한 명을 어떻게 확보할 것인가"입니다.

### 1.4 더 큰 그림 — 기업 의사결정 AX 시장

KT가 위치한 B2B AX(AI Transformation) 시장은 향후 5년간 다음 방향으로 움직입니다.

- **표준화 압력**: 산업·정부의 AI 거버넌스 요구로 "왜 이 결정인가"를 답할 수 있는 시스템만 살아남음
- **자산화 압력**: 일회성 PoC 폭증의 후폭풍으로, 재사용 가능한 자산형 AI에 대한 수요 급증
- **수직 통합 압력**: 모델·데이터·워크플로우·UI를 한 번에 제공하는 통합 플랫폼이 산업별 표준 차지
- **거버넌스 의무화**: 금융·공공·의료를 시작으로, 일반 산업도 AI 의사결정의 audit·설명 의무가 법제화

AI Foundry는 이 네 압력에 동시에 답하는 시스템으로 설계되었습니다. 이게 KT의 B2B AX 사업이 단순 SI에서 **자산형 플랫폼**으로 이행하는 지렛대가 됩니다.

### 1.5 본 시스템이 풀려는 문제 — 한 줄 진술

> **"매일 일어나는 기업 의사결정의 근거·일관성·재사용성을, 사람이 떠나도 살아남는 자산으로 변환한다."**

---

## 2. AI Foundry란 — 시스템 정의

### 2.1 시스템 정의 (Definition)

AI Foundry는 다음 네 요소가 동시에 성립하는 시스템입니다.

| 요소 | 정의 |
|---|---|
| **A. 자산 모델** | 의사결정을 4가지 영구 자산(정책팩·온톨로지·스킬패키지·로그)으로 변환·저장 |
| **B. 5-Layer 아키텍처** | Data → Ontology → LLM → Workflow → Agent의 통합 처리 파이프라인 |
| **C. 허니콤 네트워크** | KT·고객·파트너의 의사결정이 동일 자산 표준 위에서 작동·교환 |
| **D. 거버넌스 내장** | HITL·audit log·4대 진단이 시스템의 일부, 부가기능이 아닌 코어 |

이 네 요소 중 하나라도 빠지면 AI Foundry가 아닙니다. 예: 워크플로우만 있으면 단순 자동화 도구, 자산 모델만 있으면 룰 엔진, 거버넌스만 있으면 컴플라이언스 도구.

### 2.2 무엇이 자산이 되는가 — 4-Asset Model

자산화는 AI Foundry의 1순위 가치이므로 가장 자세히 설명합니다.

#### 2.2.1 Policy Pack (정책팩)

의사결정 룰을 코드화·버전관리 가능한 형태로 묶은 자산입니다.

- **단위**: `POL-{DOMAIN}-{TYPE}-{SEQ}` 형식의 정책 코드 (예: `POL-LOAN-APPROVAL-001`)
- **구조**: Condition · Criteria · Outcome 트리플 + 메타데이터(작성자, 버전, 적용 범위, 만료일)
- **저장**: Git-친화적 JSON/YAML 포맷, diff·blame·rollback 가능
- **재사용**: 동일 도메인의 다른 조직이 라이선스/포크하여 사용

> **자산화 의미**: 사람이 바뀌어도 정책팩은 git history로 살아남습니다. "왜 이 룰을 만들었는가"의 commit 메시지가 곧 조직의 의사결정 학습 로그.

#### 2.2.2 Ontology (온톨로지)

도메인 지식을 노드·관계 그래프로 구조화한 자산입니다.

- **노드 타입(예시)**: Domain · Process · Policy · Entity · Actor · Event · Outcome · Constraint · Reference · Metric · Artifact · Decision (12 타입)
- **저장**: 그래프 데이터베이스 (Neo4j 호환)
- **활용**: LLM 컨텍스트 주입, 정책 간 관계 추적, 도메인 학습 곡선 단축
- **공유 단위**: 도메인 단위 export/import 가능 (`.ontology.json`)

#### 2.2.3 Skill Package (스킬패키지)

특정 의사결정 작업을 수행하는 Agent의 실행 가능한 패키지입니다.

- **포맷**: `.skill.json` (JSON Schema 2020-12 호환)
- **내용**: Agent 정의 + 사용하는 정책팩 참조 + 사용하는 온톨로지 참조 + 입출력 스키마 + LLM 모델 사양
- **배포**: 마켓플레이스에 게시 가능, 라이선스 메타데이터 첨부
- **버전관리**: SemVer + 호환성 매트릭스

#### 2.2.4 Decision Log (의사결정 로그)

실제 운영에서 일어난 모든 의사결정의 영구 기록입니다.

- **단위**: 결정 1건 = 1 로그 엔트리
- **필수 필드**: timestamp · actor(사람/AI) · 사용된 정책팩 ID + 버전 · 사용된 모델 + 버전 · 입력 데이터 hash · 출력 결과 · HITL 단계별 결정자 · 결과 평가(나중에 채워짐)
- **저장**: append-only, 변조 불가
- **활용**: audit · 정책 효과 평가 · 4대 진단 입력 · 강화학습 신호

### 2.3 자산 사이의 관계 (Asset Graph)

```
[Decision Log] ── 평가 신호 ──▶ [Policy Pack] ── 참조 ──▶ [Ontology]
       ▲                            │                       │
       │                            └─── 사용 ────┐         │
       │                                          ▼         │
       └────────── 실행 결과 ────── [Skill Package] ◀────── 컨텍스트
```

- 정책팩은 온톨로지 노드를 참조 (어떤 Entity·Actor에 적용되는지)
- 스킬패키지는 정책팩과 온톨로지를 함께 사용 (LLM 컨텍스트로 주입)
- 의사결정 로그는 모든 자산의 사용 이력을 기록
- 로그의 결과 평가는 다시 정책팩의 개선 신호로 환류

이 그래프가 AI Foundry의 구조적 핵심입니다.

### 2.4 시스템이 약속하는 것 (Promises)

AI Foundry를 도입한 조직에 시스템이 약속하는 것은 다음 다섯 가지입니다.

| 약속 | 시스템적 보장 |
|---|---|
| **P1. 모든 결정에 근거가 첨부된다** | Decision Log + 사용된 정책팩 ID/버전 자동 기록 |
| **P2. 정책은 코드처럼 관리된다** | Policy Pack에 git-style diff·blame·rollback |
| **P3. 도메인 지식은 사람이 떠나도 남는다** | Ontology + Policy Pack의 영구 저장 |
| **P4. AI 결정과 사람 결정의 책임이 분리된다** | HITL 5 RBAC + 단계별 결정자 기록 |
| **P5. 정책 일관성은 자동으로 진단된다** | 4대 진단 (Missing/Duplicate/Overspec/Inconsistency) 백그라운드 실행 |

이 다섯 약속이 깨지면 그 인스턴스는 AI Foundry라 부르지 않습니다.

### 2.5 시스템이 약속하지 않는 것 (Non-Promises)

실패를 방지하기 위해 AI Foundry가 **명시적으로 약속하지 않는** 것을 정의합니다.

- 인간 판단을 완전히 대체하지 않습니다 (모든 critical 결정에 HITL 강제)
- 새 도메인의 첫 인스턴스화를 즉시 보장하지 않습니다 (자산 누적 후 가속, 첫 도메인은 정상 SI 일정)
- 모든 LLM의 환각을 0으로 만들지 않습니다 (4대 진단으로 감지·완화하되 0 보장 X)
- 외부 모델·데이터 공급자의 보안을 책임지지 않습니다 (격리·감사 인터페이스만 제공)
- 산업 규제 자체에 대한 법적 자문이 아닙니다 (감독 대응을 돕는 시스템, 법무 대체 X)

### 2.6 한 그림 요약 (One-Picture)

```
        의사결정 = 사람 머릿속의 휘발성 신호
                   │
                   ▼  (AI Foundry)
                   │
        의사결정 = 4가지 자산 + 5-Layer 처리 + 허니콤 공유 + 거버넌스 내장
                   │
                   ▼
        조직의 영속적 IP
```

---

## 3. 5-Layer 아키텍처

AI Foundry는 **Data → Ontology → LLM → Workflow → Agent**의 5층 구조이고, 각 층은 위 층에 명확한 인터페이스(계약)를 노출합니다.

### 3.1 전체 구조도

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 5  Agent Layer                                               │
│           도메인 의사결정 자동화의 실행 단위                            │
│           산출: Skill Package 호출 + Decision Log entry              │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4  Workflow Layer                                            │
│           HITL · audit · 4대 진단 · 5 RBAC                           │
│           산출: 사람 승인된 정책 + 진단 카드                            │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3  LLM (Reasoning) Layer                                     │
│           정책 추론 (Condition-Criteria-Outcome) · Tier 1/2/3 모델     │
│           산출: 명시화된 룰 (POL-* 코드 부여)                            │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2  Ontology Layer                                            │
│           도메인 지식 그래프 (12 node types)                            │
│           산출: 정책·엔티티·프로세스 간 관계 그래프                       │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1  Data Layer                                                │
│           비정형/정형 입력 · 구조화 · 메타데이터 부여                     │
│           산출: 표준화된 입력 단위 (Document Schema)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 레이어 간 데이터 플로우 (전형적 1회 처리)

```
[원본 입력]
   │ (PDF, DB row, 스트림 등)
   ▼
[Layer 1] Data           ──▶ Document Schema 인스턴스
   │
   ▼
[Layer 2] Ontology       ──▶ 그래프 노드/엣지 추가, 기존 그래프와 연결
   │
   ▼
[Layer 3] LLM            ──▶ Policy Triple 추출, POL-* 코드 후보 생성
   │
   ▼
[Layer 4] Workflow       ──▶ HITL Reviewer 검토 → accept/reject/modify
   │                          + 4대 진단 백그라운드 실행
   ▼
[Layer 5] Agent          ──▶ Skill Package 발행 / 호출 / 결과 반환
   │
   ▼
[Decision Log]            (모든 단계가 자동 기록)
```

각 화살표는 비동기 큐 기반(Queue + Event)으로 동작하여, 실시간 처리와 배치 처리를 동일 인터페이스로 지원합니다.

### 3.2.1 Decision Case — 5-Layer를 통과하는 핵심 데이터 개체

> **본 절은 v0.2에서 신규 추가**되었습니다 (외부 검증 P0-1 반영). 5-Layer가 무엇을 처리하는지 명확히 하기 위해, 모든 레이어를 통과하는 **단일 데이터 개체 = Decision Case**를 정의합니다.

#### 3.2.1.1 Decision Case의 정의

**Decision Case**는 "AI Foundry가 처리하는 한 건의 의사결정 단위"입니다. 한 건의 대출 심사 신청, 한 건의 알람 대응, 한 건의 정책 적용 케이스가 모두 Decision Case이고, **이 객체가 Layer 1에서 생성되어 Layer 5까지 통과하면서 각 레이어의 산출물을 누적**합니다.

#### 3.2.1.2 Decision Case Schema (v0.2 초안)

```json
{
  "case_id": "string (uuid)",
  "type": "string (도메인별 케이스 타입)",
  "status": "ingested | enriched_with_ontology | policies_applied | hitl_review | resolved",
  "domain": "string (도메인 식별자)",

  "input": {
    "raw_document_ids": ["doc_id1", "doc_id2"],
    "structured_facts": { "<key>": "<value>" },
    "ingested_at": "datetime",
    "source_metadata": { "channel": "...", "sensitivity_label": "..." }
  },

  "context": {
    "ontology_node_ids": ["node_id1", "node_id2"],
    "linked_entities": ["entity_id1"],
    "relevant_processes": ["process_id1"]
  },

  "policy_application": [
    {
      "pol_id": "POL-DOMAIN-TYPE-SEQ",
      "version": "semver",
      "match_confidence": 0.0,
      "outcome": "any",
      "evidence_links": ["..."]
    }
  ],

  "hitl_decisions": [
    {
      "step": "review | approve | modify",
      "actor": "rbac_role + user_id",
      "decision": "accept | reject | modify",
      "comment": "string",
      "timestamp": "datetime"
    }
  ],

  "diagnostic_findings": [
    { "finding_id": "FND-...", "type": "missing|duplicate|overspec|inconsistency", "severity": "...", "confidence": 0.0 }
  ],

  "final_outcome": {
    "decision": "any",
    "reasoning_trace": ["..."],
    "decided_at": "datetime",
    "decided_by": "human|ai|hybrid"
  },

  "audit": {
    "decision_log_entry_id": "uuid",
    "model_calls": [ { "tier": 1, "provider": "...", "model_id": "...", "tokens": 0, "cost": 0.0 } ],
    "sla_metrics": { "total_ms": 0, "layer_breakdown_ms": {} }
  }
}
```

#### 3.2.1.3 5-Layer 통과 시 Decision Case의 변천

| 통과 레이어 | status 변화 | 채워지는 필드 |
|---|---|---|
| **Layer 1 (Data)** | `(none)` → `ingested` | `case_id`, `type`, `domain`, `input` 전체, `audit.sla_metrics.layer_breakdown_ms.layer1` |
| **Layer 2 (Ontology)** | `ingested` → `enriched_with_ontology` | `context.ontology_node_ids`, `context.linked_entities`, `context.relevant_processes` |
| **Layer 3 (LLM)** | `enriched_with_ontology` → `policies_applied` | `policy_application[]` (with confidence), `audit.model_calls[]` |
| **Layer 4 (Workflow)** | `policies_applied` → `hitl_review` → `resolved` | `hitl_decisions[]`, `diagnostic_findings[]` |
| **Layer 5 (Agent)** | `resolved` → 외부 시스템 통합 | `final_outcome`, `audit.decision_log_entry_id` |

#### 3.2.1.4 Decision Case의 운영적 의미

- **개발 범위 명확화**: 모든 레이어가 동일 객체에 작동하므로 모듈 간 인터페이스 카탈로그(§12.3)의 가장 중요한 데이터 계약이 됨
- **테스트 표준화**: 가상 도메인 1·2의 Phase 2 검증은 "Decision Case가 Layer 1→5를 status 변화 없이 통과 가능한가"로 단순화
- **감사 친화**: Decision Log entry는 Decision Case의 영구 스냅샷
- **확장성**: 새 도메인은 `type`·`domain` 필드만 다르고, 동일 스키마 사용

#### 3.2.1.5 v1.0 합의 시 결정 안건

- Decision Case Schema가 어느 시점에 freeze되어야 하는가 (안건: W19 모듈 스펙 작성 시작 전)
- 도메인별 type 명명 규칙 (예: `loan_approval`, `alarm_response`, `grant_review`) — Phase 3 도메인 확정 시 갱신

### 3.3 Layer 1 — Data Layer

#### 책임
- 비정형(문서·이미지·음성)·정형(DB·API·이벤트) 입력의 표준화
- 메타데이터(출처·시점·신뢰도·민감도) 자동 부여
- PII/PHI 자동 탐지 + 마스킹·격리 정책 적용

#### 핵심 모듈
| 모듈 | 역할 |
|---|---|
| **Ingestion Engine** | 다양한 포맷의 입력 수집 (PDF, DOCX, XLSX, CSV, JSON, RDB, Stream) |
| **Structure Extractor** | OCR + 표·섹션 인식 + 의미 단위 분할 |
| **Metadata Annotator** | 출처/시점/신뢰도 등급 자동 부여 |
| **PII/PHI Guard** | 민감 정보 자동 감지 + 정책별 처리 (마스킹/격리/파기) |
| **Connector Library** | DB·SaaS·메시징의 표준 커넥터 (확장 가능) |

#### 입력 / 출력 / SLA
- **입력**: 임의 포맷 (문서/구조화/스트림)
- **출력**: `Document Schema 2020-12` 형태의 표준 단위 (text + structured + metadata)
- **SLA(Phase 1 가설)**: 100쪽 PDF → 60초 / 1만 row CSV → 10초 / 스트림 1만 events/min

### 3.4 Layer 2 — Ontology Layer

#### 책임
- Layer 1 산출물을 도메인 그래프에 통합
- 신규 노드/관계 추론 + 기존 그래프와의 연결
- 그래프 쿼리 인터페이스 (Cypher 호환) 제공

#### 12 Node Types
```
1. Domain         도메인의 최상위 단위
2. Process        업무 프로세스 (의사결정 흐름)
3. Policy         정책/룰 (POL-* 단위)
4. Entity         핵심 사물 (고객·계약·자산 등)
5. Actor          행위 주체 (사람 역할 + AI Agent)
6. Event          시간 단위로 발생한 사건
7. Outcome        결정의 결과
8. Constraint     제약 (법령·내규·SLA)
9. Reference      외부 참조 자료
10. Metric        측정 지표
11. Artifact      산출 문서/파일
12. Decision      특정 결정 인스턴스
```

#### 핵심 모듈
| 모듈 | 역할 |
|---|---|
| **Graph Store** | 그래프 데이터베이스 (Neo4j 호환) |
| **Schema Manager** | 12 노드 타입 + 관계 타입 스키마 |
| **Linker** | 신규 입력의 기존 노드 매칭 (entity resolution) |
| **Reasoner** | 추론 룰 기반 신규 관계 자동 생성 |
| **Exporter / Importer** | `.ontology.json` 단위 export/import |

#### 입력 / 출력 / SLA
- **입력**: Document Schema 인스턴스
- **출력**: 그래프 노드/엣지 (with confidence)
- **SLA(가설)**: 1 문서당 평균 50 노드 생성, 10 노드/초

### 3.5 Layer 3 — LLM (Reasoning) Layer

#### 책임
- Ontology 기반 컨텍스트로 LLM 호출
- 의사결정 룰을 Condition-Criteria-Outcome triple로 추출
- 정책 코드 자동 부여 (POL-{DOMAIN}-{TYPE}-{SEQ})
- LLM 비용·정확도·지연의 균형 (Tier별 분리)

#### Tier 매트릭스
| Tier | 용도 | 모델 후보(예시) | 호출 빈도 |
|---|---|---|---|
| **Tier 1** | 정책 추출 / 핵심 추론 | Claude Opus급 / GPT-4 Turbo급 | 결정 1건당 1회 미만 |
| **Tier 2** | 구조화 / 분류 / 요약 | Claude Sonnet급 / GPT-4o급 | 결정 1건당 5~10회 |
| **Tier 3** | 단순 추출 / 매칭 / Re-rank | Haiku급 / 자체 임베딩 | 결정 1건당 50~100회 |

> **운영 원칙**: Tier 1은 최후의 수단. 가능하면 Tier 3 + 명시적 룰 + 캐시로 처리하고, Tier 1 호출은 audit log에 별도 표시.

#### 3.5.1 Multi-Evidence Triangulation (v0.2 추가)

LLM 한 번의 호출이 자체 평가한 confidence (self-confidence)에만 의존하면 진단 severity 임계 보정과 자동화 비율 결정이 부정확해집니다. 본 정의서는 단일 LLM의 self-confidence를 그대로 사용하지 않고, 다음 **세 가지 증거의 삼각화**로 최종 confidence를 산정합니다.

| 증거 종류 | 출처 | 가중치 (가설) |
|---|---|---|
| **E1. LLM Self-Confidence** | Tier 1/2 모델이 출력한 자체 신뢰도 | 0.4 |
| **E2. Cross-Policy Consistency** | 별도 LLM 호출(낮은 Tier)로 "이 정책이 기존 정책 세트와 모순되는가, 동일 패턴이 자주 발생하는가" 검증 | 0.4 |
| **E3. Historical Frequency** | Decision Log에서 동일 패턴 케이스의 과거 처리 일관성 | 0.2 |

**최종 confidence = 0.4·E1 + 0.4·E2 + 0.2·E3**

> Phase 2 종료(W26) 시점에 가중치는 가상 도메인 측정 결과로 보정. Phase 3 종료 시점에 실제 도메인 데이터로 재보정.

이 설계는 §3.5의 Triple Extractor 모듈에 추가 구현되며 (§8.3), §4.5 진단 임계 결정의 입력 신호로 사용됩니다. 단일 호출 self-confidence보다 처리 비용이 1.3~1.5배 늘어나지만, 임계 보정 가능성이 확보되어 운영 신뢰도가 높아집니다.

#### 핵심 모듈
| 모듈 | 역할 |
|---|---|
| **Tier Router** | 작업 종류 + 신뢰도 요구치 + 비용 예산에 따라 Tier 자동 선택 |
| **Prompt Library** | 도메인 무관 + 도메인 특화 프롬프트 템플릿 |
| **Triple Extractor** | LLM 출력을 C-C-O triple로 정규화 |
| **Policy Coder** | 신규 룰에 POL-* 코드 부여 (충돌 회피 포함) |
| **Cost Governor** | 모델 호출 비용 실시간 모니터링·억제 |

#### 입력 / 출력 / SLA
- **입력**: 처리할 결정 케이스 + 관련 온톨로지 노드 셋
- **출력**: Policy Triple 후보 (with confidence) + Tier 호출 비용 메타
- **SLA(가설)**: 단순 결정 → 200ms (Tier 3) / 정책 추출 → 5초 (Tier 1)

### 3.6 Layer 4 — Workflow Layer

#### 책임
- Layer 3가 추출한 정책의 사람 검토(HITL)
- 5 RBAC 역할 + 단계별 승인 흐름
- 4대 진단(Missing/Duplicate/Overspec/Inconsistency) 백그라운드 실행
- 모든 결정의 audit log 자동 생성

#### 5 RBAC 역할
| 역할 | 권한 |
|---|---|
| **Reviewer** | Layer 3 산출 정책 검토 + accept/reject/modify |
| **Approver** | Reviewer 결과 최종 승인 (정책 발행 권한) |
| **Auditor** | 모든 audit log 조회 (수정 권한 X) |
| **Domain Expert** | 도메인 온톨로지·정책의 의미 검증 (도메인 한정) |
| **Admin** | 시스템 설정 + RBAC 자체 관리 |

#### 핵심 모듈
| 모듈 | 역할 |
|---|---|
| **Workflow Engine** | 단계별 승인 흐름 정의·실행 |
| **HITL Console** | Reviewer가 사용하는 검토 UI |
| **Diagnostic Runner** | 4대 진단 주기적/이벤트 기반 실행 |
| **Audit Log Service** | append-only 기록, 변조 불가 |
| **Notification Service** | 단계 전환 알림 (이메일/메신저/SLA 위반 알람) |

#### 입력 / 출력 / SLA
- **입력**: Policy Triple 후보 + 진단 트리거
- **출력**: 승인된 정책팩 + 진단 결과 카드 + audit log entry
- **SLA(가설)**: 단순 정책 검토 평균 24시간 / critical 진단 즉시 알림

### 3.7 Layer 5 — Agent Layer

#### 책임
- 승인된 정책팩 + 온톨로지를 사용해 도메인 의사결정 자동화
- Skill Package 단위로 패키징·배포·버전관리
- 외부 시스템 통합 (API·Webhook·메시지 큐)

#### Skill Package 구조 (`.skill.json`)
```json
{
  "schema": "https://json-schema.org/draft/2020-12/schema",
  "name": "string",
  "version": "semver",
  "domain": "string",
  "type": "decision | analysis | recommendation | generation",
  "uses_policies": ["POL-* IDs with version pin"],
  "uses_ontology_scope": ["domain/sub-domain"],
  "input_schema": { ... },
  "output_schema": { ... },
  "model_spec": { "tier": "1|2|3", "fallback": [...] },
  "hitl_required": "boolean",
  "compliance_tags": ["GDPR", "FINRA", ...],
  "license": "string",
  "created_by": "string",
  "metrics_endpoint": "url"
}
```

#### 핵심 모듈
| 모듈 | 역할 |
|---|---|
| **Skill Registry** | 발행된 스킬패키지의 카탈로그 |
| **Skill Runtime** | 스킬 호출 실행 환경 |
| **Integration Bus** | API/Webhook/Queue 인터페이스 |
| **Marketplace API** | 외부 파트너의 스킬 게시·소비 |
| **Metrics Collector** | 스킬 실행 결과의 품질 지표 수집 |

#### 입력 / 출력 / SLA
- **입력**: 스킬 호출 요청 (input_schema 준수)
- **출력**: 결정 결과 + 사용된 정책 ID/버전 + Decision Log entry
- **SLA(가설)**: 단순 스킬 호출 1초 이내 / HITL 필요 스킬은 비동기

### 3.8 5-Layer를 합치는 횡단 관심사

| 횡단 관심사 | 적용 레이어 | 구현 방식 |
|---|---|---|
| **Audit Log** | 1~5 모든 레이어 | append-only 이벤트 버스 + 영구 저장 |
| **HITL** | 주로 Layer 4, 트리거는 1~5 | RBAC + 알림 + 검토 UI |
| **4대 진단** | Layer 4가 주관, 입력은 Layer 2~3 | Diagnostic Runner |
| **비용 거버넌스** | 주로 Layer 3, 실행은 Layer 5 | Cost Governor + 예산 정책 |
| **PII/PHI 보호** | Layer 1이 주관, 1~5에 정책 적용 | 민감도 라벨 전파 |

이 횡단 관심사가 5-Layer 위에 일관되게 동작하는 것이 AI Foundry의 거버넌스 내장(2.1 D요소)을 실현합니다.

---

## 4. 시그니처 기능 — 4대 진단

AI Foundry를 다른 의사결정 자동화 도구와 결정적으로 구분 짓는 것이 **4대 진단**입니다. 시스템에 어떤 도메인이 들어오든, 시스템은 그 도메인의 정책 세트에 대해 다음 4가지를 자동·지속 진단합니다.

### 4.1 4대 진단 정의

| 진단 | 의미 | 시스템적 정의 |
|---|---|---|
| **Missing** | 룰이 누락된 케이스 | 입력 케이스 분포에서 정책 매칭률이 임계 미만인 영역 자동 탐지 |
| **Duplicate** | 동일 케이스에 충돌하는 룰 | 같은 Condition에 대해 다른 Outcome을 가진 정책 쌍 자동 검색 |
| **Overspec** | 과도하게 세분화된 룰 | Outcome 분포가 통계적으로 유의미하게 다르지 않은 미세 분기 감지 |
| **Inconsistency** | 정책 간 모순 | 정책 A·B가 동시에 적용 가능한 케이스에서 양쪽이 충돌하는 경우 |

### 4.2 진단 결과의 데이터 구조

각 진단은 다음 표준 형태로 출력됩니다.

```yaml
diagnosis_finding:
  id: "FND-2026-0001"
  type: "missing | duplicate | overspec | inconsistency"
  severity: "critical | warning | info"
  confidence: 0.87           # 0.0 ~ 1.0
  policies_involved: ["POL-LOAN-APPROVAL-001", "POL-LOAN-APPROVAL-002"]
  cases_affected: 1234       # 영향받는 결정 케이스 수
  evidence: { ... }          # 자동 수집된 증거
  suggested_remedy: "..."    # AI 제안 수정안
  hitl_status: "pending"     # pending | accept | reject | modify
  reviewer: null
  resolved_at: null
```

### 4.3 진단의 라이프사이클

```
[자동 감지]              ─▶ 진단 생성 (severity + confidence)
   │
   ▼
[Reviewer에게 알림]      ─▶ HITL Console에 카드 표시
   │
   ▼
[Reviewer 결정]          ─▶ accept(수정안 반영) / reject(거짓양성) / modify(수정안 변경)
   │
   ▼
[정책팩 변경 트리거]     ─▶ Layer 3가 신규 정책 후보 생성
   │
   ▼
[Approver 승인]          ─▶ 정책팩 새 버전 배포
   │
   ▼
[Decision Log 환류]      ─▶ 변경 효과 추적 시작
```

### 4.4 4대 진단의 가치 — 임원 한 줄

> "당신 조직에는 N개의 critical inconsistency가 있습니다. AI가 제안한 수정안은 다음과 같습니다."

이 한 문장을 즉시 출력할 수 있는 시스템은 시장에 거의 없습니다. AI Foundry의 시연·평가에서 가장 강력한 임팩트를 만드는 기능입니다.

### 4.5 진단 임계치(severity)의 결정

진단의 critical/warning/info 임계는 도메인별로 보정됩니다.

| severity | 결정 기준 (예시 — 도메인별 가변) |
|---|---|
| **critical** | confidence ≥ 0.85 AND cases_affected ≥ 100 → 인스턴스 호출 자동 중단 + 즉시 알림 |
| **warning** | confidence ≥ 0.70 OR (cases_affected ≥ 50 AND confidence ≥ 0.50) → 24시간 내 검토 요구 |
| **info** | 그 외 → 주간 다이제스트로 묶어 알림 |

도메인별 임계 보정은 **Domain Expert** RBAC 역할의 책임입니다.

---

## 5. Cross-Org Comparison — 자산화의 구조적 근거

자산화가 1순위 가치인 이유는 단순합니다. **자산이 누적될수록 시스템 가치가 비선형으로 증가**하기 때문입니다. AI Foundry는 그 비선형성을 **Cross-Org Comparison**으로 명시적으로 설계합니다.

### 5.1 4그룹 분류

같은 도메인을 사용하는 여러 조직의 정책을 비교하면, 모든 정책은 다음 4그룹 중 하나로 분류됩니다.

| 그룹 | 의미 | 자산화 정책 |
|---|---|---|
| **common_standard** | 모든 조직이 공유하는 표준 | AI Foundry **공유 자산**으로 등록, 라이선스 기반 재사용 |
| **org_specific** | 조직별로 명확히 다른 부분 | 해당 조직 내부 자산으로만 보관, 공유 불가 |
| **tacit_knowledge** | 명문화 안 된 암묵지 | 시스템이 적극 표면화 → Domain Expert가 분류 결정 |
| **core_differentiator** | 그 조직만의 핵심 차별화 | **절대 표준화 금지**, 조직 IP로 잠금 |

### 5.2 분류 알고리즘 (자동)

조직 N개의 정책을 비교할 때, 각 정책은 다음 단계를 거칩니다.

1. **정책 정규화**: 표현이 다르더라도 의미가 같은 정책을 LLM(Tier 2) 임베딩 + 룰 매칭으로 그룹핑
2. **공통도 점수**: 정책 의미가 N개 조직 중 몇 개에서 발견되는지 (0/N ~ N/N)
3. **변동성 점수**: 정책의 Outcome이 조직 간에 얼마나 다른지 (분산)
4. **분류 결정**:
    - 공통도 ≥ 0.8 AND 변동성 < 0.2 → **common_standard**
    - 공통도 ≥ 0.4 AND 변동성 ≥ 0.5 → **org_specific**
    - 공통도 < 0.4 AND 명문화율 < 0.3 → **tacit_knowledge**
    - 공통도 < 0.4 AND 명문화율 ≥ 0.7 AND 비즈니스 영향 ≥ "high" → **core_differentiator**

### 5.3 분류의 비즈니스 함의

| 분류 | 의미 |
|---|---|
| common_standard 비율이 높을수록 | 산업 전체의 표준화 자산이 큼 → **신규 도메인 인스턴스화 비용 60%+ 감소** |
| core_differentiator를 시스템적으로 보호 | 고객의 IP 우려 해소 → 도입 결심 빨라짐 |
| tacit_knowledge가 표면화되면 | 베테랑 의존 감소 → 조직 회복력 강화 |

### 5.4 절대 표준화 금지 약속 (Promise to Customer)

AI Foundry가 Cross-Org Comparison을 운영하면서 고객에게 명시적으로 약속하는 것:

> **"우리는 당신 조직의 core_differentiator는 절대 표준화하지 않습니다. common_standard만 공유 자산으로 만들어 산업 전체의 비용을 낮춥니다."**

이 약속은 시스템의 **기본 설정(default-deny)** 으로 강제됩니다. core_differentiator로 분류된 정책은 export·라이선스·외부 마켓플레이스 게시가 모두 차단됩니다.

#### 5.4.1 보호 vs 학습의 경계 (v0.2 추가)

자주 받게 될 질문 — **"core_differentiator를 표준화하지 않는다고 해도, AI Foundry가 그 정책의 존재와 최적화 방법을 학습하는 것은 가능해야 하지 않나요?"**

본 정의서가 v1.0 합의 시 결정해야 할 경계입니다. 현 v0.2 시점의 가설:

| 사용 단계 | core_differentiator 정책에 적용되는 정책 |
|---|---|
| **단일 조직 내부 사용** | 시스템이 학습·최적화·진단 모두 수행 (해당 조직 한정) |
| **Cross-Org 비교 분류** | 분류 결과는 해당 조직만 가시화 (분류 사실 자체가 다른 조직에 노출 X) |
| **타 조직 학습 신호로 사용** | **금지** (default-deny) — 모델 가중치·통계 신호로도 흘러나가지 않음 |
| **외부 마켓플레이스 게시** | **금지** — 라이선스·export·재판매 모두 차단 |
| **AI Foundry 제품 개선 신호** | 별도 정책 — 익명·집계화 후 본 시스템의 진단 알고리즘 개선에는 사용 가능 (고객 옵트인) |

> **Phase 4 진입 전까지 이 경계를 라이선스·계약 문서로 명문화**해야 합니다. 본 정의서 §11.4의 Counterquestion Q3가 이 결정을 추적합니다.

### 5.5 자산 가치의 누적 곡선 (가설)

Cross-Org에 N개 조직이 참여할 때 시스템이 보유한 자산의 가치는 다음과 같이 누적될 것으로 예상합니다.

```
가치
 ▲
 │                                                ●
 │                                          ●
 │                                  ●
 │                          ●
 │                  ●                              ◀ 가속 구간
 │              ●                                    (자산 재사용 효율 ↑)
 │          ●
 │        ●
 │      ●
 │    ●  ◀ 첫 도메인은 정상 SI 비용
 │   ●
 │  ●
 └──────────────────────────────────────────────▶  시간 / 도메인 인스턴스 수
       1   2   3   4   5   6   7   8   9   10
```

> **Phase 1에서는 이 곡선을 가설로 둡니다.** Phase 2 진입 후 첫 3~5개 인스턴스의 실제 데이터로 곡선을 보정합니다.

#### 5.5.1 본 곡선의 검증 한계 (v0.2 추가, 외부 검증 P0 반영)

이 곡선은 시장에서 검증되지 않은 강력한 비즈니스 가설입니다. 다음 한계를 명시합니다.

- **가상 도메인 3개로는 검증 불가**: Phase 2의 가상 시나리오 A·B와 추가 합성 가상 조직 1개로는 비선형 가속이 입증되지 않음. 실제 다중 조직·다중 도메인 데이터가 필요
- **Cross-Org 데이터 협조 가설에 의존**: 곡선의 가속 구간은 N개 조직의 데이터 공유에 의존하지만, 한국 기업 환경에서 데이터 공유 합의는 어렵거나 느림 (R-14 참조)
- **검증 보강 계획**:
  - Phase 1 W19~W21에 산업 컨소시엄·오픈소스 정책 공유 사례(예: 금융권 신용평가 표준, 공공조달 정책 자산화) 문헌 조사
  - Phase 3에서 첫 실제 도메인 1개의 정책팩 자산화 비용을 측정 (이게 곡선의 첫 점)
  - Phase 4에서 두 번째 도메인 인스턴스화 시 첫 도메인 대비 비용 감소율 측정 (이게 곡선의 가속 입증)

> **곡선의 가설이 깨지면(예: 두 번째 도메인이 첫 도메인 대비 30% 미만 감소) BM 자체를 재설계**해야 합니다. 이 신호는 Phase 4 진입의 Go/No-Go 핵심 지표가 됩니다.

### 5.5 자산 가치의 누적 곡선 (가설)

Cross-Org에 N개 조직이 참여할 때 시스템이 보유한 자산의 가치는 다음과 같이 누적될 것으로 예상합니다.

```
가치
 ▲
 │                                                ●
 │                                          ●
 │                                  ●
 │                          ●
 │                  ●                              ◀ 가속 구간
 │              ●                                    (자산 재사용 효율 ↑)
 │          ●
 │        ●
 │      ●
 │    ●  ◀ 첫 도메인은 정상 SI 비용
 │   ●
 │  ●
 └──────────────────────────────────────────────▶  시간 / 도메인 인스턴스 수
       1   2   3   4   5   6   7   8   9   10
```

> **Phase 1에서는 이 곡선을 가설로 둡니다.** Phase 2 진입 후 첫 3~5개 인스턴스의 실제 데이터로 곡선을 보정합니다.

---

## 6. 활용 시나리오 — 시스템이 어떻게 동작하는가 (가상 케이스)

> 이 챕터는 도메인 미정 상태에서 시스템의 동작을 보여주기 위해 **가상 시나리오 두 개**를 사용합니다. 실제 도메인은 Phase 2에서 결정됩니다.

### 6.1 시나리오 A — 가상 자원조달 심사 ("Grants Review")

**가상 조직**: 한 공공기관이 매년 1만 건의 보조금 신청을 심사합니다. 신청자는 사업체·연구기관·개인이며, 심사 룰은 12개 부서가 따로 운영하는 50여 개 정책에 분산되어 있습니다.

**도입 전 모습**
- 심사 평균 14일, 부서별 일관성 부재로 민원 폭주
- 감사 때마다 근거 재구성에 평균 3개월 투입
- 베테랑 심사관 1명이 퇴직하면 해당 카테고리 심사 품질 30% 저하

**AI Foundry 도입 동작**

| 단계 | 시스템 동작 | 산출물 |
|---|---|---|
| **D-30일** | 50여 개 정책 + 과거 5년치 심사 데이터 Layer 1 투입 | 표준화된 입력 만 건 + 정책 50개 |
| **D-25일** | Layer 2가 도메인 온톨로지 구축 (3,000 노드) | 사업체·신청·심사관·결과 그래프 |
| **D-20일** | Layer 3가 50개 정책에서 280개 Policy Triple 추출 | POL-GRANT-* 코드 280개 |
| **D-18일** | Layer 4의 4대 진단: critical 12건 / warning 47건 / info 119건 | 진단 카드 178개 |
| **D-15일** | Domain Expert + Approver가 critical 12건 검토 → 9건 정책 충돌 확정 | 정책팩 v2 발행 |
| **D-10일** | Layer 5가 신청 자동 사전심사 Skill Package 발행 | `grants-prescreen-1.0.0.skill.json` |
| **D-Day** | 신규 신청 1건당 평균 30초에 1차 분류 + 근거 첨부 → Reviewer에게 즉시 전달 | Decision Log entry per 신청 |
| **D+30일** | 운영 데이터 환류 → 4대 진단 다시 → 진화한 정책팩 v3 | 정책팩 자가 개선 사이클 |

**도입 후 변화 (가설)**
- 심사 평균 14일 → 3일
- 일관성 점수(자동 계측) 0.62 → 0.91
- 감사 대응 자료 출력 3개월 → 즉시
- 베테랑 의존도 — `tacit_knowledge` 그룹 18%가 시스템에 표면화됨

### 6.2 시나리오 B — 가상 운영 의사결정 ("Ops Decisions")

**가상 조직**: 한 인프라 운영 조직이 24/7 시스템 모니터링을 한다. 알람은 일 평균 2,000건, 대응 의사결정 룰은 80여 개 runbook에 분산.

**도입 전 모습**
- 알람-대응 룰 매핑이 사람 머릿속, 신입 6개월 학습
- 같은 알람에 부서별 다른 대응 → 사후 분석에서 충돌 발견
- "왜 그때 그 결정이었나"는 재구성 불가능

**AI Foundry 도입 동작**

| 단계 | 시스템 동작 | 산출물 |
|---|---|---|
| **사전 학습** | 80개 runbook + 과거 1년 알람·대응 로그 Layer 1~2 투입 | 운영 온톨로지 5,000 노드 |
| **정책 추출** | Layer 3가 720개 Policy Triple 추출 (알람 패턴 → 대응) | POL-OPS-* 720개 |
| **4대 진단** | Duplicate 64건 (동일 알람에 다른 대응) / Inconsistency 23건 | 진단 카드 87건 |
| **HITL 검토** | Domain Expert(시니어 운영자)가 87건 검토 → 정책팩 v2 정리 | 정책팩 720 → 502 (중복 제거) |
| **운영 투입** | 알람 발생 시 Skill Package가 추천 대응 + 신뢰도 + 근거 정책 출력 | 알람당 Decision Log |
| **HITL 단계** | 신뢰도 ≥ 0.9 → 자동 / 0.7 ≤ x < 0.9 → 알림 + 추천 / < 0.7 → 사람 결정 강제 | severity별 자동·반자동·수동 |
| **자산 재사용** | 다른 운영 조직이 common_standard 정책팩 라이선스 → 6주 만에 인스턴스화 | 두 번째 도메인 가속 입증 |

**도입 후 변화 (가설)**
- 알람 평균 대응 시간 12분 → 4분 (자동·반자동 비율 60%)
- 신입 학습 기간 6개월 → 6주 (정책팩이 학습 자료)
- 같은 알람의 부서별 충돌 23건 → 0건

### 6.3 두 시나리오에서 공통으로 보이는 것

| 패턴 | 설명 |
|---|---|
| 첫 도메인은 30일 ~ 60일 정상 SI 일정 | 자산이 없으니 처음부터 추출 |
| 4대 진단이 즉시 가치 입증 | 도입 30일 시점에 critical 진단으로 즉시 ROI 신호 |
| 두 번째 인스턴스부터 가속 | common_standard 정책팩 재사용 |
| 자산이 사람을 대체하지 않음 | 베테랑의 암묵지가 표면화되어 학습용 자산이 됨 |
| HITL이 결정 흐름의 일등 시민 | 자동·반자동·수동의 비율이 신뢰도에 따라 자연스럽게 결정 |

---

## 7. Phase 1~3 로드맵 (~2026년 8월)

본 챕터는 5월 기획 확정 → 6월 Prototype → 7월 진입 정비 → 8월 실제 사업 적용의 일정을 한 곳에서 정합적으로 정의합니다.

### 7.1 Phase별 종료 기준 (Definition of Done)

#### Phase 1 — 5월 종료 기준 (DoD₁)

| # | 종료 기준 | 검증 방법 |
|---|---|---|
| DoD₁-1 | 본 정의서 v1.0이 임원·핵심 이해관계자 합의 | 합의 회의 의사록 + 서명 |
| DoD₁-2 | 5-Layer 모듈 스펙 v1.0이 6월 Prototype 개발 착수 가능한 수준 | 개발 리드 검토 통과 |
| DoD₁-3 | 인터페이스 카탈로그 v1.0 (모듈 간 API/이벤트) | 신규 모듈 추가 dry-run 1회 통과 |
| DoD₁-4 | 가상 도메인 1·2의 데이터·시나리오 사양 확정 | 데이터 합성 책임자 sign-off |
| DoD₁-5 | Phase 2 인력 배정 + 인프라 셋업 | 인력 명단 + 클러스터 가동 |

#### Phase 2 — 6월 종료 기준 (DoD₂)

| # | 종료 기준 | 검증 방법 |
|---|---|---|
| DoD₂-1 | 5-Layer 통합 빌드가 가상 도메인 1개로 E2E 동작 | E2E 자동 테스트 ≥ 80% 성공 |
| DoD₂-2 | 4대 진단 + Cross-Org 가상 데이터에서 정상 출력 | 진단 카드 + 4그룹 분류 결과 |
| DoD₂-3 | 시연 시나리오로 30분 시연 가능 | 시연 영상 + 시연 출석자 sign-off |
| DoD₂-4 | Phase 2 측정 보고서 (정성·정량) | 보고서 v1 |
| DoD₂-5 | Phase 3 진입을 위한 도메인 후보 1개 + 본부 사전 컨택 | 컨택 의사록 |

#### Phase 3 — 8월 1차 마감 기준 (DoD₃)

| # | 종료 기준 | 검증 방법 |
|---|---|---|
| DoD₃-1 | 첫 실제 도메인 데이터로 5-Layer 통과 | 실제 정책팩 v1.0 발행 |
| DoD₃-2 | 4대 진단 결과 + HITL 검토 + Skill Package 발행 | Decision Log 운영 시작 |
| DoD₃-3 | 8월 말 임원 보고에서 "사업 적용 시작" 인정 | 임원 보고 의사록 |
| DoD₃-4 | GTM 1차 패키지 (본부·고객사 제안 가능) | 자료 sign-off |
| DoD₃-5 | Phase 3 운영 측정 1차 (도입 효과 가설 입증 신호) | 측정 보고서 |

### 7.2 18주 마일스톤 (2026-05-04 ~ 2026-08-31)

#### Phase 1 (5월): 기획 확정

| 주차 | 주요 마일스톤 | 산출물 |
|---|---|---|
| **W18 (5/4~10)** | 정의서 v0.1 합의 회의 (서민원·AXBD 임원 1차) | 의사록 + 코어 5명 지정 |
| **W19 (5/11~17)** | 5-Layer 모듈 스펙 v0.1 작성 시작 + 가상 도메인 1·2 데이터 사양 | spec drafts + 도메인 사양 |
| **W20 (5/18~24)** | 모듈 스펙 v0.5 + 인터페이스 카탈로그 v0.1 + LLM·Graph DB 공급자 선정 | 스펙·카탈로그 1차 + 공급자 결정 |
| **W21 (5/25~31)** | **G1+G2 통합 게이트** — 정의서 v1.0 + 모듈 스펙 v1.0 + 임원 결재 | **Phase 1 종료, Phase 2 즉시 착수** |

#### Phase 2 (6월): Prototype

| 주차 | 주요 마일스톤 | 산출물 |
|---|---|---|
| **W22 (6/1~7)** | Prototype α1 — Layer 1+2 통합 (가상 도메인 입력 → 온톨로지) | α1 빌드 |
| **W23 (6/8~14)** | Prototype α2 — Layer 3 통합 (정책 추출 + POL-* 코드 부여) | α2 빌드 |
| **W24 (6/15~21)** | Prototype α3 — Layer 4 통합 (HITL Console 동작 + audit log) | α3 빌드 |
| **W25 (6/22~28)** | Prototype α4 — Layer 5 통합 + 4대 진단 + Cross-Org | α4 빌드 |
| **W26 (6/29~7/5)** | **G3 게이트** — Prototype E2E 시연 + 측정 + Phase 3 도메인 후보 사전 컨택 | **Phase 2 종료, 시연 영상 + 측정 보고서** |

#### Phase 3 진입 정비 (7월)

| 주차 | 주요 마일스톤 | 산출물 |
|---|---|---|
| **W27 (7/6~12)** | 첫 실제 도메인 후보 협의 (KT 사업본부·고객사 카운터파트) + Phase 2 회고 | 후보 도메인 short list (1~3개) |
| **W28 (7/13~19)** | 도메인 데이터 NDA·접근 권한 + GTM 1차 자료 골격 + Phase 3 인력 배정 | NDA 체결 + GTM 골격 |
| **W29 (7/20~26)** | **G4 게이트** — 도메인 1개 확정 + KT 본부 공식 합의 + Prototype 보강 (필요 시) | **Phase 3 진입 결재** + 도메인 v1.0 |
| **W30 (7/27~8/2)** | 도메인 인스턴스화 1주차 — Layer 1 데이터 투입 시작 | 실제 도메인 데이터 ingestion |

#### Phase 3 (8월): 실제 사업 적용

| 주차 | 주요 마일스톤 | 산출물 |
|---|---|---|
| **W31 (8/3~9)** | 도메인 온톨로지 + Tier별 LLM 정책 추출 진행 | 도메인 그래프 + Triple 후보 |
| **W32 (8/10~16)** | 4대 진단 결과 + 진단 카드 + **첫 임원 중간 보고** | 진단 결과 + 보고 의사록 |
| **W33 (8/17~23)** | HITL 검토 + Approver 승인 + Skill Package 발행 | 도메인 정책팩 v1.0 |
| **W34 (8/24~31)** | **G5 게이트** — 운영 시작 + 8월 임원 종합 보고 + GTM 1차 패키지 sign-off | **Phase 3 1차 마감 + Phase 3 후속 결정** |

> **버퍼 원칙**:
> - Phase 1 W21이 미통과 시 → W22~W23이 Phase 1 마감 + Phase 2 시작 동시 진행 (전체 일정 1주 손실 허용)
> - Phase 2 W26이 미통과 시 → W27을 Prototype 보강에 할애, 도메인 협의는 W28부터
> - Phase 3 W30 데이터 투입이 막히면 → W30~W31을 도메인 데이터 합성·마스킹에 할애

### 7.3 게이트 (Gate Checks)

| 게이트 | 시점 | 통과 기준 | 미통과 시 |
|---|---|---|---|
| **G1+G2** | 5월 W21 말 | 정의서 v1.0 + 모듈 스펙 v1.0 합의 | Phase 2 착수 1주 지연 |
| **G3** | 6월 W26 말 | 가상 도메인 E2E 성공률 ≥ 80%, 시연 통과 | Phase 3 진입 정비 1~2주 지연 |
| **G4** | 7월 W29 말 | 도메인 1개 확정 + 본부 합의 + 인력 배정 완료 | Phase 3 적용 실패, 8월 임원 보고 위험 |
| **G5** | 8월 W34 말 | 도메인 정책팩 v1.0 + 운영 시작 + GTM 1차 sign-off | "사업 적용" 메시지 약화, Phase 3 후속 재정비 |

### 7.4 모듈별 Phase 도달 목표

| 모듈 | Phase 1 (5월말) | Phase 2 (6월말) | Phase 3 진입 (7월말) | Phase 3 1차 (8월말) |
|---|---|---|---|---|
| Data Layer | 스펙 v1.0 + 커넥터 카탈로그 | PDF·CSV·DB 통합 (가상 도메인) | 실제 도메인 1개 데이터 카탈로그 | 100% 안정 ingestion |
| Ontology Layer | 12 노드 타입 스키마 v1.0 | 3,000 노드 가상 그래프 | 실제 도메인 온톨로지 5,000 노드 | 시각화 + 쿼리 운영 |
| LLM Layer | Tier 라우터 + Prompt Library v1.0 | Triple 추출 + POL-* 코드 부여 | 실제 도메인 정책 추출 | 정책팩 v1.0 발행 |
| Workflow Layer | RBAC 5역할 + HITL 흐름 정의 | HITL Console 동작 + audit log | Reviewer/Approver 운영 SOP | 운영 가동 |
| Agent Layer | Skill Schema v1.0 | Skill Registry + Runtime 동작 | 도메인 Skill Package 발행 | 호출 운영 |
| 4대 진단 | 진단 알고리즘 정의 | 가상 데이터 동작 | 실제 데이터 1차 진단 | 진단 카드 + 임원 보고 |
| Cross-Org | 4그룹 분류 알고리즘 정의 | 가상 조직 3개 비교 | 단일 조직 자체 진단 | (Phase 3 후속) |

### 7.5 개발 자원 활용 원칙

#### 7.5.1 신규 vs 재사용 비율

| 영역 | 신규 개발 | 기존 자산 재사용 | 외부 OSS |
|---|---|---|---|
| Data Layer | 30% | 50% | 20% |
| Ontology Layer | 40% | 40% | 20% |
| LLM Layer | 50% | 30% | 20% |
| Workflow Layer | 30% | 60% | 10% |
| Agent Layer | 50% | 40% | 10% |
| 4대 진단 / Cross-Org | 80% | 10% | 10% |

> **원칙**: 인프라(클러스터·DB·큐)·UI 컴포넌트는 기존 자산 최대 재사용. 시그니처 기능(4대 진단·Cross-Org)은 신규 80% (제품 차별화의 핵심).

#### 7.5.2 8월까지 안 만드는 것 (의도적 미수행)

| 영역 | 이연 시점 |
|---|---|
| 외부 마켓플레이스 UI/Backend | Phase 4 |
| 결제·라이선스 풀 시스템 | Phase 4 |
| SLA 보장형 SaaS 운영 모드 | Phase 4 |
| 다국어 지원 (영어 외) | Phase 4+ |
| 모바일 앱 | Phase 4+ |
| 실시간 스트림 처리 GA (Phase 1~3은 배치 + 준실시간) | Phase 4 |
| 외부 ID 연동 풀 (SSO 기본만) | Phase 4 |
| 산업별 표준 인증 (금감원·국정원 등) | Phase 4 |

### 7.6 일정의 중대한 가설 (Phase 1 검증 필요)

본 일정이 성립하기 위한 6가지 가설을 명시합니다. 5월 W18 합의 회의에서 이 가설들이 검증되어야 합니다.

| 가설 | 검증 방법 | 가설 깨질 시 |
|---|---|---|
| H1 — 5월 4주 안에 정의서 합의 가능 | W18 회의 일정 사전 확정 | Phase 2 자동 1주 지연 |
| H2 — 6월 4주 안에 5-Layer Prototype 가능 | 신규 vs 재사용 비율(7.5.1)이 정확 | **§7.6.1 fallback 정책 발동** (시그니처 축소 또는 mock 우선) |
| H3 — 7월 1개 실제 도메인 확정 가능 | KT 본부 카운터파트 W18~W22 사이 지정 | 8월 사업 적용 메시지 실패 |
| H4 — 도메인 데이터 1개월 내 접근 가능 | NDA·내부 승인 표준 일정 | 8월 데이터 투입 지연 |
| H5 — 5 모듈 코어 인력 시간 배분 가능 | W18 인력 지정 시 50%+ 시간 확보 | Prototype 품질 저하 |
| H6 — Phase 3 진입에 임원 결재 가능 | G4 시점에 임원 회의 사전 세팅 | 7월 G4 미통과 → 8월 적용 위험 |

> **모든 가설은 Phase 1 W18 합의 회의에서 명시적으로 점검**되며, 깨진 가설은 즉시 일정 영향 분석을 동반합니다.

#### 7.6.1 H2 깨짐 시 Prototype 범위 축소 fallback (v0.2 추가)

외부 검증 결과 "6월 4주 안에 시그니처 풀구현(4대 진단 + Cross-Org)은 공격적"이라는 지적이 다수. 5월 W18 합의 회의에서 사전에 fallback 정책을 결정해 둡니다. **시그니처 축소가 필요한 신호가 5월 안에 보이면 즉시 발동**합니다.

| 발동 신호 (5월 안에 감지) | Phase 2 범위 |
|---|---|
| **Green** — 모든 가설 통과, 인력 50%+ 시간 확보 | 풀구현: 5-Layer E2E + 4대 진단(4종 모두) + Cross-Org(가상 조직 3개) |
| **Yellow** — 인력 시간 30~50% 확보, 모듈 스펙 합의 1주 지연 | **5-Layer E2E + 4대 진단(Missing+Inconsistency만) + Cross-Org mock** |
| **Red** — 인력 30% 미만, 모듈 스펙 2주 지연 | **5-Layer E2E만 (4대 진단·Cross-Org 둘 다 mock)** + 시그니처는 7월에 추가 |

> **원칙**: 어떤 신호 단계에서도 "5-Layer E2E가 가상 도메인 1개에서 동작" 자체는 **포기 불가**. 이 한 가지가 Phase 2 종료 게이트(G3)의 본질이고, Phase 3 진입의 최소 조건이기 때문.

이 fallback 정책은 5월 W18 합의 회의에서 임원·모듈 코어들에게 명시적으로 공유하여 "범위 축소 ≠ 실패"라는 공감대를 사전에 형성합니다.

---

## 8. Layer별 모듈 스펙

> 본 챕터는 개발 착수가 가능한 수준의 1차 스펙입니다. 각 모듈의 상세 인터페이스(타입 시그니처)는 부록 C의 인터페이스 카탈로그에서 다룹니다.

### 8.1 Layer 1 — Data Layer 스펙

#### 8.1.1 책임 범위
비정형/정형 입력의 수집·구조화·메타데이터 부여·민감정보 보호.

#### 8.1.2 입력 인터페이스
| 채널 | 형식 | 비고 |
|---|---|---|
| HTTP Upload | multipart/form-data | PDF·DOCX·XLSX·CSV·JSON·이미지 |
| DB Connector | JDBC·ODBC 호환 | 읽기 전용 권한으로 시작 |
| Stream Connector | Kafka·Webhook | Phase 1은 배치 모드, 스트림은 큐로 변환 |
| API Connector | REST·GraphQL | 인증 토큰 보관 KMS 분리 |

#### 8.1.3 출력 인터페이스
- 단위: `Document` (Document Schema 2020-12)
- 필수 필드: `doc_id` · `source` · `ingested_at` · `text` · `structured` · `metadata`
- 메타데이터: `provenance` · `sensitivity_label` · `confidence` · `language`

#### 8.1.4 내부 모델
- Structure Extractor: PDF→텍스트는 OSS 우선(예: Apache PDFBox), 표 인식은 별도 모델
- PII Guard: 정규식 + ML 모델 이중 체크, 라벨 전파를 위한 메타 필드

#### 8.1.5 외부 의존성
- 객체 저장소 (대용량 파일)
- KMS (커넥터 자격증명)
- 임베딩 모델 (entity resolution 시 사용, Layer 3 공유)

#### 8.1.6 SLA 가설 (Phase 1)
- 100쪽 PDF: 60초 이내
- 1만 행 CSV: 10초 이내
- 가용성: 99.0% (Phase 1 가정, Phase 2에서 99.9% 목표)

### 8.2 Layer 2 — Ontology Layer 스펙

#### 8.2.1 책임 범위
도메인 그래프 관리, 노드 매칭, 추론 룰 실행, 그래프 export/import.

#### 8.2.2 입력 인터페이스
- Layer 1의 Document 인스턴스
- 외부 온톨로지 import (`.ontology.json`)
- Graph Query (Cypher 호환)

#### 8.2.3 출력 인터페이스
- 노드/엣지 변경 이벤트 (이벤트 버스)
- 그래프 쿼리 응답
- Export 패키지 (`.ontology.json`)

#### 8.2.4 내부 모델
- Graph Store: 그래프 DB (관리형 서비스 활용)
- Linker: 임베딩 + 룰 기반 entity resolution
- Reasoner: SPARQL/Cypher rule pack
- Schema Manager: 12 노드 타입 + 사용자 정의 노드 확장 허용

#### 8.2.5 외부 의존성
- 그래프 DB 관리형 서비스
- 임베딩 모델 (Layer 1 공유)

#### 8.2.6 SLA 가설
- 1 문서당 평균 50 노드 생성, 10 노드/초
- 그래프 쿼리 (단순): 200ms 이내
- 가용성: 99.0%

### 8.3 Layer 3 — LLM (Reasoning) Layer 스펙

#### 8.3.1 책임 범위
정책 추출, Tier 기반 모델 라우팅, 비용 거버넌스, POL-* 코드 부여.

#### 8.3.2 입력 인터페이스
- Layer 2 그래프 노드 + 처리할 결정 케이스
- 도메인 무관 + 도메인 특화 프롬프트 라이브러리 참조

#### 8.3.3 출력 인터페이스
- Policy Triple 후보 (with confidence)
- 사용 모델 + 토큰 + 비용 메타
- 신규 POL-* 코드 (충돌 회피)

#### 8.3.4 내부 모델
- Tier Router:
  - Tier 1 (정책 추출 / 핵심 추론) — 결정 1건당 1회 미만
  - Tier 2 (구조화 / 분류 / 요약) — 5~10회
  - Tier 3 (단순 추출 / 매칭) — 50~100회
- Triple Extractor: schema-validated JSON parser + **Multi-Evidence Triangulator (E1/E2/E3 통합)** — §3.5.1
- Policy Coder: 도메인별 SEQ 카운터 + 충돌 검색

#### 8.3.5 외부 의존성
- LLM 공급자 API (Anthropic·OpenAI·OpenRouter 등 — 다중 공급자 라우팅)
- 모델 가격 메타 데이터 (자동 업데이트)

#### 8.3.6 SLA 가설
- Tier 3 호출: 200ms 이내
- Tier 2 호출: 1~3초
- Tier 1 호출: 5~15초
- 일일 비용 예산: 도메인 인스턴스당 별도 예산, 80% 도달 시 알람

### 8.4 Layer 4 — Workflow Layer 스펙

#### 8.4.1 책임 범위
HITL 흐름 정의/실행, 5 RBAC, 4대 진단 실행, audit log.

#### 8.4.2 입력 인터페이스
- Layer 3의 Policy Triple 후보
- 진단 트리거 (이벤트·스케줄)

#### 8.4.3 출력 인터페이스
- 승인된 정책팩 (Layer 5로 발행)
- 진단 카드 (HITL Console 표시)
- audit log entry (영구 저장)

#### 8.4.4 내부 모델
- Workflow Engine: 단계 정의(YAML/JSON) + 실행
- HITL Console: 웹 UI (검토·승인·진단)
- Diagnostic Runner: 4대 진단 알고리즘 (§4 참조)
- Audit Log Service: append-only, 변조 불가

#### 8.4.5 외부 의존성
- 알림 채널 (이메일·메신저)
- 영구 저장소 (audit log)

#### 8.4.6 SLA 가설
- Reviewer 검토 평균 처리 24시간 (도메인별 보정)
- Critical 진단 즉시 알림 (≤ 5분)
- audit log 쓰기 지연: ≤ 1초

### 8.5 Layer 5 — Agent Layer 스펙

#### 8.5.1 책임 범위
Skill Package 등록·실행·외부 연동, Decision Log 기록.

#### 8.5.2 입력 인터페이스
- Skill 호출 요청 (input_schema 검증)
- 스킬 등록 (`.skill.json` upload)

#### 8.5.3 출력 인터페이스
- 호출 결과 (output_schema 검증) + Decision Log entry
- 스킬 레지스트리 카탈로그

#### 8.5.4 내부 모델
- Skill Registry · Skill Runtime · Integration Bus · Metrics Collector

#### 8.5.5 외부 의존성
- 외부 시스템 (호출 대상 API)
- 측정 데이터 저장소 (시계열 DB)

#### 8.5.6 SLA 가설
- 단순 스킬 호출: 1초 이내
- HITL 필요 스킬: 비동기, 워크플로우 정의에 따름

### 8.6 횡단 모듈 스펙

#### 8.6.1 Audit Log Bus
- 1~5 레이어의 모든 결정 흐름 이벤트 수집, append-only, SIEM 연계 IF 제공

#### 8.6.2 Cost Governor
- LLM·외부 API 비용 집계, 도메인별 예산·알람, 초과 시 Tier 강등 또는 호출 거부

#### 8.6.3 Sensitivity Label Propagation
- Layer 1 민감도 라벨이 1~5 전체에 전파, 라벨에 따라 모델·저장소·로그 분리

---

## 9. 측정지표 — Phase 1 종료 시점 평가 기준

### 9.1 측정의 원칙
- 자동 수집 가능한 지표만, 사람 평가는 정성에 한정
- 임계는 가설 — Phase 2/3 결과로 보정해 OKR로 이전
- 모든 지표 시계열 보존

### 9.2 정량 지표

| 지표 | Phase 1 목표 (가설) | 측정 방식 |
|---|---|---|
| 5-Layer 통합 성공률 | ≥ 80% | E2E 자동 테스트 |
| 4대 진단 정밀도 / 재현율 | ≥ 70% / ≥ 60% | 가상 ground truth 비교 |
| Tier 1 호출 비율 | ≤ 0.5 / 결정 | Cost Governor |
| Decision Log 일관성 | ≤ 0.1% 불일치 | cross-check |
| 신규 모듈 추가 시간 | ≤ 1일 | dry-run |
| HITL 평균 처리 | ≤ 24시간 | 워크플로우 로그 |
| API 응답 p95 | ≤ 1.5초 | 호출 로그 |

### 9.3 정성 지표

| 지표 | Phase 1 목표 |
|---|---|
| 임원 시연 sign-off | "Phase 2 진행 결재" 명시 |
| 개발자 인계 가능성 | dry-run 1회 통과 |
| 외부 발표 가능성 | 30분 발표 자료 1차 |
| 이해 난이도 | 비기술자 5명 중 4명 1줄 재진술 성공 |

### 9.4 측정 시점과 결과 활용

| 시점 | 측정 대상 | 결과 활용 |
|---|---|---|
| **Phase 2 종료 (6월 W26, G3)** | 통합 성공률·진단 정확도/재현율·SLA·비용 (가상 데이터) | Phase 3 진입 (G4) Go/No-Go + 도메인 후보 선정 |
| **Phase 3 진입 (7월 W29, G4)** | 도메인 1개 확정 + 본부 합의 + 인력 (정성) | Phase 3 적용 착수 결재 |
| **Phase 3 1차 마감 (8월 W34, G5)** | 실제 도메인 정책팩 v1.0 + HITL 운영 + 도입 효과 가설 신호 | Phase 4 진입 결정 + 후속 OKR |

> **OKR 보정**: 가상 데이터 측정(Phase 2)은 가설 검증, 실제 데이터 측정(Phase 3)은 OKR 임계치의 첫 보정. Phase 4의 OKR은 Phase 3 1차 마감 결과를 기준으로 설정.

---

## 10. 조직·인력·리소스 (Phase 1)

### 10.1 R&R

| 역할 | 담당 | 책임 |
|---|---|---|
| 통합 PM | Sinclair Seo | 정의서 owner / 마일스톤 / 게이트 의사결정 |
| 시스템 책임 | 서민원 (AX컨설팅팀) | α 빌드 / 시연 / Phase 1 종료 보고서 |
| Layer 1·2 코어 | (지정 필요) | 데이터·온톨로지 모듈 |
| Layer 3 코어 | (지정 필요) | 모델 라우터·Triple Extractor·Cost Governor |
| Layer 4 코어 | (지정 필요) | HITL Console·4대 진단·audit log |
| Layer 5 코어 | (지정 필요) | Skill Registry·Runtime·Integration Bus |
| UI/UX | (지정 필요) | HITL Console + 시연 UI |
| 문서 책임 | Sinclair + 서민원 | 정의서·스펙·시연 자료 일관성 |
| 인프라 | ktcloud + 운영 파트너 | 클러스터·DB·관리형 서비스 |

### 10.2 인력 가이드

> **원칙**: 8월까지 인력은 2순위. 신규 채용·외주 최소화, 기존 인력 시간 재배분 위주.

| 역할군 | FTE 가설 | 비고 |
|---|---|---|
| 통합 PM | 1.0 | Sinclair |
| 모듈 코어 (5) | 5.0 | 기존 인력 재배치 우선 |
| UI/UX | 0.5 | 디자인 자산 재사용 |
| 시연/문서 | 0.5 | 서민원 + Sinclair |
| 인프라 | 0.3 | ktcloud 협업 |
| **합계** | **7.3 FTE × 18주** | |

### 10.3 외주 가능 영역

| 영역 | 외주 | 비고 |
|---|---|---|
| Data Layer 커넥터 추가 | 가능 | 표준 스펙 기반 |
| HITL Console UI 폴리싱 | 가능 | 디자인 시스템 |
| 시연 영상 편집 | 가능 | 마케팅 외주 |
| 4대 진단 알고리즘 | **불가** | 차별화 핵심 |
| Cross-Org Comparison | **불가** | 같음 |
| 정책 코드 명명·자산화 룰 | **불가** | 제품 IP |

### 10.4 협업 의례

| 회의 | 주기 | 참석 | 목적 |
|---|---|---|---|
| 코어 동기화 | 주 1회 60분 | Sinclair + 서민원 + 5 모듈 코어 | 마일스톤·블로커 |
| 게이트 회의 | 게이트 시점 (G1~G5) | PM + 임원 + 핵심 이해관계자 | Go/No-Go |
| 드라이런 | 6월 W25·26 | 시연 출석 예정자 + 코어 | 시연 완성도 |
| 회고 | 8월 W34 | 코어 전원 | Phase 4 진입 의사결정 |

### 10.5 인프라·도구

| 영역 | 활용 |
|---|---|
| 코드 저장소 | 사내 Git |
| CI/CD | 사내 빌드 + 자동 테스트 |
| 인프라 (Workers·DB·Queue) | 기존 KTDS-AXBD 인프라 자산 재사용 |
| LLM 공급자 | 다중 공급자 라우팅 (Tier별 비용 최적화) |
| 그래프 DB | 관리형 서비스 |
| 모니터링 | 기존 관제 + Cost Governor 통합 |

---

## 11. 리스크 / 미해결 / 다음 의사결정

### 11.1 Phase 1 리스크 레지스터

| ID | 리스크 | 영역 | 심각도 | 가능성 | 대응 / Owner |
|---|---|---|---|---|---|
| R-01 | 정의서 v1.0 합의 (G1)가 W21 미통과 | 합의 | High | Med | W17 사전 라운드 추가, 1:1 사전 협의 / Sinclair |
| R-02 | 5-Layer 통합 E2E (G3) 6월 W26 미달성 | 기술 | High | Med | Layer 단위 우선 안정화 후 통합, Layer 5는 mock 우선 / 모듈 코어 |
| R-03 | 4대 진단 정확도가 가설 미달 | 기술 | High | High | 가상 known issue 재정의 + 진단 룰 보강 / Sinclair |
| R-04 | LLM 비용이 도메인당 예산 초과 | 비용 | Med | High | Tier 강등 + 캐싱 강화 + Tier 1 hard cap / Cost Governor |
| R-05 | HITL Console UX가 시연에서 어색 | 시연 | Med | Med | W30 드라이런에서 외주 폴리싱 / UI/UX |
| R-06 | 모듈 코어 5명 중 1명 이상 지정 지연 | 인력 | High | Med | W18까지 임원 직권 지정 요청 / Sinclair |
| R-07 | 기존 자산 재사용이 신규 코어와 충돌 | 기술 | Med | Med | 통합 PM 의사결정, 신규 prototype 우선 + 점진 통합 |
| R-08 | 임원 시연(G5)에서 "어디서 봤던 것" 평가 | 포지셔닝 | High | Low | §0.1 Slogan + 4-Asset 차별화 메시지 사전 학습 |
| R-09 | 가상 도메인 1개의 일반화 가능성 의심 | 신뢰성 | Med | Med | 가상 시나리오 2개 모두 시연 포함, 도메인 무관 메시지 강조 |
| R-10 | Phase 4 진입 결정이 W34 안 안 남 | 거버넌스 | Med | Low | W32 시연 직후 사전 회의 세팅 / Sinclair |
| R-11 | PII/PHI 처리 준수 미흡 | 보안 | High | Low | W22까지 PII Guard 우선 통합, 보안팀 합동 검토 / Layer 1 코어 |
| R-12 | 시연 데모 장애 (네트워크·인프라) | 운영 | Med | Low | 오프라인 mock + 영상 백업 |
| **R-13** | **Phase 3 도메인·데이터 제공 지연 또는 불발** (KT 본부·고객사 측 사유) | 거버넌스 | **Critical** | **High** | 5월 W22까지 시나리오 기반 협의 출발 + 2순위 도메인 병행 발굴 / Sinclair·임원 — *외부 검증 P0-2* |
| **R-14** | **Cross-Org 데이터 공유 합의 거부** (다중 조직 BM 가설 깨짐) | 사업화 | High | High | Phase 3는 "단일 조직 내부 자체 4대 진단"으로 ROI 입증 → Phase 4에서 다조직 단계 진입 / Sinclair — *외부 검증 P0-3* |
| **R-15** | **LLM Self-Confidence 의존으로 진단 임계 보정 불가** | 기술 | High | High | §3.5.1 Multi-Evidence Triangulation 6월 W23까지 통합, Phase 2 종료 시점 가중치 보정 / LLM 코어 — *외부 검증 P0-5* |

### 11.2 미해결 의사결정 (안건과 결정 시점)

| 안건 | 결정 시점 | 결정자 | Phase |
|---|---|---|---|
| 5 모듈 코어 인력 지정 | 5월 W18 | AXBD 임원 | Phase 1 |
| LLM 공급자 1·2차 선정 (Tier별) | 5월 W20 | LLM 코어 + Sinclair | Phase 1 |
| Graph DB 관리형 서비스 선정 | 5월 W20 | Ontology 코어 + 인프라 | Phase 1 |
| 가상 도메인 1·2 데이터 사양 확정 | 5월 W19 | Sinclair + 서민원 | Phase 1 |
| KT 사업본부 카운터파트 지정 (도메인 컨택용) | 5월 W22 이전 | 본부장 | Phase 1→2 |
| **첫 실제 도메인 1개 확정** (Phase 3) | **7월 W29 (G4)** | 임원 + Sinclair + 본부 | **Phase 3 진입 게이트** |
| 도메인 데이터 NDA + 접근 권한 | 7월 W28 | 법무 + 본부 + 도메인 코어 | Phase 3 진입 |
| GTM 1차 패키지 양식 | 7월 W28 ~ 8월 W34 | 통합 PM + 본부 | Phase 3 |
| 외부 마켓플레이스 정책 | Phase 4 | Phase 4 | Phase 4 |
| 가격·라이선스 모델 | Phase 3 종료 후 (9월~) | 법무 + 임원 | Phase 4 진입 |
| 산업별 표준 인증 (금감원·국정원·CC 등) | Phase 4 | Phase 4 | Phase 4 |

### 11.3 다음 1주 액션 (Sinclair 직접)

- [ ] 본 정의서 v0.2를 서민원·AXBD 임원·Layer 코어 후보에게 공유 + W18 합의 회의 세팅
- [ ] 5 모듈 코어 후보 명단 작성 + 임원 보고 1쪽 (05_executive_one_pager_v1.md 활용)
- [ ] 가상 도메인 1·2의 데이터/시나리오 초안 (Phase 1 5월 2주 사용)
- [ ] LLM 공급자 + Graph DB 후보 비교 매트릭스 (5월 4주 결정용)
- [ ] 본 문서 → docx 변환 (사내 공유용)
- [ ] **첫 도메인 후보 매트릭스 작성** (HR / Ops / 심사·승인 — ChatGPT 권고)

### 11.4 사용자 답변 필요 질문 (Counterquestions, v0.2 신규)

> 외부 LLM 교차검증에서 도출된 질문. 정의서로는 즉답 불가. PM 또는 W18 합의 회의의 의사결정으로 답을 채워야 합니다.

| Q | 질문 | 결정 시점 | 담당 |
|---|---|---|---|
| **Q1** | 6월 Prototype을 4주 안에 못 만든다는 신호가 5월에 감지되면 범위를 어떻게 축소할 것인가? | W18 합의 회의 | Sinclair + 모듈 코어 |
| **Q2** | 첫 외부 고객사에게 "압도적으로 명확한 하나의 가치"는 정확히 무엇인가? (4-Asset은 외부에는 복잡할 수 있음) | Phase 3 도메인 확정 시 (7월 W29 G4) | Sinclair + 본부 카운터파트 |
| **Q3** | core_differentiator 보호와 플랫폼 학습 향상의 경계는 어디까지인가? (계약·라이선스의 결정) | Phase 4 라이선스 정책 결정 시 (9월 이후) | Sinclair + 법무 + 임원 |

#### Q1 — 1차 답변 가설 (v0.2 시점)
§7.6.1 fallback 정책으로 정의서에 사전 명시 완료. **Yellow 신호** = 5-Layer E2E + 4대 진단 일부만(Missing+Inconsistency) + Cross-Org mock. **Red 신호** = 5-Layer E2E만. W18 회의에서 임원 합의 후 §7.6.1 가중치 보정.

#### Q2 — 1차 답변 가설 (v0.2 시점)
§0.4.1에 "당신 조직의 critical 정책 충돌을 30일 안에 모두 찾아드리고, 감독 응답 시간을 일주일 → 즉시로 줄여드립니다"로 1차 명시. Phase 3 도메인이 확정된 후 도메인별 한 줄로 재설정.

#### Q3 — 1차 답변 가설 (v0.2 시점)
§5.4.1에 5단계 사용 단계별 정책 매트릭스로 가설 명시. Phase 4 진입 전 라이선스 문서로 정식 명문화. 본 정의서가 Phase 4까지 흔들리지 않으려면 Q3가 9월까지는 답을 가져야 함.

---

## 12. 부록

### 12.1 부록 A — 용어 사전

| 용어 | 정의 |
|---|---|
| **AI Foundry** | 본 시스템. 의사결정을 자산으로 만드는 Agentic AI 플랫폼 |
| **Decision Case** | AI Foundry가 처리하는 한 건의 의사결정 단위 (§3.2.1) |
| **Policy Pack (정책팩)** | 의사결정 룰을 코드화한 자산. POL-{DOMAIN}-{TYPE}-{SEQ} |
| **Skill Package (스킬패키지)** | 의사결정 작업의 실행 단위. `.skill.json` |
| **Decision Log** | 모든 결정의 영구 기록. append-only |
| **Ontology** | 도메인 지식의 그래프 표현. 12 노드 타입 |
| **HITL** | Human-in-the-Loop. 사람의 검토·승인이 결정 흐름의 일부 |
| **5-Layer** | Data → Ontology → LLM → Workflow → Agent |
| **Tier 1/2/3** | LLM 모델의 비용·정확도 등급 분리 |
| **4대 진단** | Missing / Duplicate / Overspec / Inconsistency |
| **4-Asset Model** | Policy Pack · Ontology · Skill Package · Decision Log |
| **Cross-Org** | 다조직 정책의 4그룹(common_standard·org_specific·tacit_knowledge·core_differentiator) 분류 |
| **5 RBAC** | Reviewer · Approver · Auditor · Domain Expert · Admin |
| **Honeycomb Network** | KT·고객·파트너의 의사결정이 자산을 공유하는 양방향 순환 네트워크 |
| **Multi-Evidence Triangulation** | E1(self-confidence) + E2(cross-policy) + E3(historical frequency)의 가중 신뢰도 (§3.5.1) |
| **DoD₁/₂/₃** | Phase별 종료 기준 |
| **G1+G2 / G3 / G4 / G5** | Phase 게이트 |

### 12.2 부록 B — 가상 도메인 상세

#### 12.2.1 가상 도메인 1: "Grants Review" (시나리오 A 보강)
- 가상 공공기관, 매년 1만 건 보조금 신청 심사
- 신청서 PDF 1,000건 + 정책 50개 + 5만 행 과거 결과
- 예상: 온톨로지 3,000 노드 / Policy Triple 280 / 진단 critical 12·warning 47·info 119 / Cross-Org 분류 common 60% / org 25% / tacit 10% / core 5%

#### 12.2.2 가상 도메인 2: "Ops Decisions" (시나리오 B 보강)
- 가상 인프라 운영, 24/7, 일 알람 2,000건, runbook 80개
- 예상: 5,000 노드 / Policy 720 → 진단 후 502 정리 / 자동·반자동·수동 60/25/15

#### 12.2.3 가상 데이터 합성 책임
- W19~W21 별도 트랙, LLM(Tier 2) 활용 가능
- 합성 자체가 Layer 1·2의 첫 검증 케이스

### 12.3 부록 C — 인터페이스 카탈로그 (개발자용 v0.1)

#### 12.3.1 이벤트 버스

| 이벤트 | 발행자 | 구독자 | 페이로드 핵심 |
|---|---|---|---|
| `data.document.ingested` | Layer 1 | Layer 2 | doc_id, source, metadata, sensitivity_label |
| `ontology.node.added` | Layer 2 | Layer 3 | node_id, node_type, domain, confidence |
| `policy.triple.extracted` | Layer 3 | Layer 4 | pol_id_candidate, triple, confidence (E1·E2·E3 통합), cost |
| `policy.approved` | Layer 4 | Layer 5 | pol_id, version, triple, approver |
| `diagnostic.finding.created` | Layer 4 | HITL Console | finding_id, type, severity, confidence |
| `skill.invoked` | Layer 5 | Audit Log | skill_id, version, input_hash, output, decision_log_id |
| `audit.entry.appended` | Audit Log | (관제) | entry_id, actor, action, timestamp |

#### 12.3.2 핵심 API (REST 가설)

| API | 메서드 | 설명 |
|---|---|---|
| `/v1/data/ingest` | POST | 문서 업로드 (multipart) |
| `/v1/ontology/query` | POST | Cypher 호환 쿼리 |
| `/v1/policy/{id}` | GET | 정책팩 조회 |
| `/v1/policy/{id}/versions` | GET | 정책팩 버전 이력 |
| `/v1/diagnostic/findings` | GET | 진단 카드 조회 (필터) |
| `/v1/skill/{id}/invoke` | POST | 스킬 호출 |
| `/v1/audit/log` | GET | audit log 조회 (read-only) |
| `/v1/case/{id}` | GET | Decision Case 단건 조회 (v0.2 신규) |
| `/v1/case/{id}/timeline` | GET | Decision Case의 5-Layer 통과 timeline |

#### 12.3.3 핵심 데이터 스키마
- **Decision Case** — §3.2.1 참조 (v0.2 신규)
- **Document (Layer 1 출력)** — §8.1.3 참조
- **Policy Pack (Layer 4 산출)** — §2.2.1 참조
- **Decision Log Entry (Layer 5 자동 생성)** — §2.2.4 참조
- **Diagnostic Finding** — §4.2 참조

### 12.4 부록 D — Phase 2~4 미리보기

#### Phase 2 (6월) — Prototype의 큰 그림
1. 5-Layer 통합 빌드 — 가상 도메인 1개 E2E
2. 시그니처 동작 — 4대 진단 + Cross-Org 가상 데이터
3. 시연 가능성 — 30분 시연 시나리오 + 영상

진입 게이트: G1+G2 (5월 W21) 통과 후 자동 착수.

#### Phase 3 (7~8월) — 실제 사업 적용의 큰 그림
1. 첫 실제 도메인 1개 인스턴스화
2. HITL 운영 시작 — Reviewer/Approver SOP
3. GTM 1차 패키지 — 본부 + 외부 고객 제안 자료
4. 8월 말 사업 적용 메시지 — 임원 보고

진입 게이트: G3 (6월 W26) + G4 (7월 W29) 통과 후 착수.

#### Phase 4 (9월~) 가설 — 본 정의서 범위 밖
1. 자산 재사용 가속화 입증 (두 번째 도메인)
2. 다도메인 동시 운영 (3~5개)
3. 외부 마켓플레이스
4. 산업별 표준 인증
5. 가격·라이선스 풀 시스템
6. 다국어·다지역 운영

#### Phase 1 정의서가 후속 산출물의 어디에 인용되는가

| 후속 산출물 | 시점 | 인용 위치 |
|---|---|---|
| Phase 2 모듈 구현 코드 | 6월 | §8 모듈 스펙 + §12.3 인터페이스 카탈로그 |
| Phase 3 도메인별 사업기획안 | 7~8월 | §0.1 + §2 정의 + §3 5-Layer + §4·5 시그니처 |
| Phase 3 KT 사업본부 협업 제안서 | 7월 | §0.3 허니콤 + §5.4 표준화 금지 약속 |
| Phase 4 가격·라이선스 모델 | 9월~ | §2.2 4-Asset + §5 4그룹 자산화 |
| Phase 4 마켓플레이스 정책 | 9월~ | §5.1 4그룹 분류 + §5.4 약속 |

> Phase 2~4의 모든 후속 문서는 본 정의서를 SSOT로 인용하며, 정의서 변경 시 후속 문서가 자동 갱신 검토를 받습니다.

---

## 13. Changelog

### v0.2 (2026-04-29) — 외부 LLM 1차 교차검증 P0/P1 반영

**근거 문서**: 04_cross_review_consolidation_v1.md (ChatGPT·Gemini·DeepSeek 검증 결과 통합)

#### P0 (즉시 반영)
- §3.2.1 **Decision Case 데이터 구조 신규 절** — 5-Layer를 통과하는 핵심 객체 + JSON Schema (DeepSeek Critical Gap 1)
- §11.1 **R-13 도메인·데이터 제공 지연** (Critical/High) — ChatGPT #1 + DeepSeek improvement 2
- §11.1 **R-14 Cross-Org 데이터 공유 거부** (High/High) + §5.5.1 곡선 검증 한계 명시 — ChatGPT #2 + DeepSeek §5.5
- §11.1 **R-15 LLM Self-Confidence 의존** (High/High) — DeepSeek Critical Gap 2
- §7.6.1 **Prototype 범위 축소 fallback** (Green/Yellow/Red) — ChatGPT #3 + DeepSeek Counterquestion 1

#### P1 (반영 시도, v0.2에 모두 반영됨)
- §3.5.1 **Multi-Evidence Triangulation** (E1·E2·E3 가중) — DeepSeek Gap 2 보강
- §0.3 / §2.6 **허니콤 양방향 순환 다이어그램** — DeepSeek improvement 1
- §1.3.1 **"진짜 경쟁자 = 내부 inertia·기존 SI 방식"** — ChatGPT #4
- §0.4.1 **외부 고객사용 한 줄 가치** — DeepSeek Q2 1차 답
- §5.4.1 **core_differentiator 보호 vs 플랫폼 학습 5단계 매트릭스** — DeepSeek Q3 1차 답

#### 신규 절
- §3.2.1 (Decision Case)
- §3.5.1 (Multi-Evidence Triangulation)
- §5.4.1 (보호 vs 학습 경계)
- §5.5.1 (곡선 검증 한계)
- §7.6.1 (Prototype 범위 축소 fallback)
- §11.4 (Counterquestions Q1·Q2·Q3)
- §13 (Changelog)
- §0.3 다이어그램 교체 (양방향 순환)

#### 보류 (P2 백로그)
- §1.3 (a) 룰 엔진 약점 클레임 — Gartner/Forrester 출처 부착
- §5.5 자산 가치 곡선 — 산업 컨소시엄 사례 인용 보강
- §6 가상 시나리오 — Phase 2 시연 시나리오와 통합·정련

#### v1.0 승급 조건
- W18 합의 회의에서 P1 sign-off
- §11.4 Q1 결정
- 5 모듈 코어 인력 지정 완료
- §11.1 R-13 대응 액션 (W22까지 시나리오 협의 출발) 착수

### v0.1 (2026-04-29) — 초안 (타임라인 재조정 포함)

- AI Foundry 정의서 초안 (시스템 정의 + 5-Layer + 4대 진단 + Cross-Org + 가상 시나리오 + 5~8월 로드맵)
- 5월 기획 / 6월 Prototype / 8월 사업 적용 일정 확정
- 5개 KTDS 내부 repo 외부 노출 제거 (이전 Decision Foundry 시기 v0.1 대비)
- 첫 인스턴스 = 도메인 미정 (추상 정의)

---

## 끝맺음 — 본 문서의 위상

이 문서는 **AI Foundry 정의서 v0.2**입니다 (외부 LLM 1차 교차검증 P0·P1 반영판). v1.0이 아니라 v0.2로 둔 것은:

1. 5 모듈 코어 미지정 — 5월 W18 합의 회의 결과 반영 후 **v1.0 (5월 W21 G1+G2 통과 시점)**
2. 가상 도메인 1·2의 구체 사양 미작성 — 5월 W19~W21 작업 후 부록 B 보강
3. Phase 2 측정 결과는 6월 W26 시점에 별도 측정 보고서로 통합
4. Phase 3 첫 실제 도메인 결정은 7월 W29 (G4) — §12.4 부록 D Phase 3 미리보기 도메인 합의 후 보강
5. Counterquestions Q1·Q2·Q3 정식 답변 — Q1은 W18, Q2는 G4, Q3는 9월 이후

본 문서의 모든 섹션은 **Phase 3 1차 마감(8월 W34) 시점까지 살아 있는 living document**로 운영되며, 변경이 발생하면 통합 PM(Sinclair)이 정합성을 검토합니다.

**Phase 2(Prototype) · Phase 3(실제 사업 적용) · Phase 4(확장)의 모든 후속 산출물은 본 정의서를 SSOT로 인용합니다.** 본 문서가 흔들리면 Phase 2~4가 흔들립니다.


— 끝.
