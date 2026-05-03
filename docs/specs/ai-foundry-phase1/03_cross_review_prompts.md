---
title: AI Foundry 정의서 — 외부 LLM 교차검증 프롬프트 모음
purpose: ChatGPT·Gemini·DeepSeek·Perplexity 등 외부 LLM으로 정의서 v0.1의 빈틈을 찾기 위한 검증 프롬프트
target_doc: 02_ai_foundry_phase1_v0.1.md (v0.1 → v1.0 승급 전 검증 단계)
date: 2026-04-29
owner: Sinclair Seo
classification: 기업비밀II급
---

# AI Foundry 정의서 — 교차검증 프롬프트 모음

> **이 문서는 무엇인가**
>
> AI Foundry 정의서 v0.1을 외부 LLM(ChatGPT·Gemini·DeepSeek·Perplexity·Claude)에 넣고 8가지 검증 관점에서 빈틈을 찾기 위한 프롬프트 모음입니다. **5월 W21의 G1+G2 게이트(정의서 v1.0 합의)** 전에 외부 시각으로 한 번 거를 수 있도록 설계되었습니다.

---

## 0. 사용 안내

### 0.1 권장 워크플로우

```
1) 외부 LLM 선택 (검증 관점별 LLM 매핑은 §3 참조)
2) §1의 Preamble을 프롬프트 앞에 붙임
3) 정의서 02_ai_foundry_phase1_v0.1.md 전체를 첨부 (또는 해당 섹션만 발췌)
4) §2의 검증 관점별 프롬프트를 골라 사용
5) 결과를 §4의 통합 템플릿에 정리
6) v1.0 회의 안건으로 등재
```

### 0.2 보안·배포 주의사항

- 정의서는 **기업비밀II급** 분류 — 외부 LLM 사용 시 데이터 학습 옵트아웃 설정을 반드시 켤 것 (ChatGPT: Settings → Data Controls → Improve the model OFF / Gemini: Activity OFF / DeepSeek: 별도 정책 확인)
- 가능하면 **API 호출** 사용 (UI 호출은 데이터 학습 가능성 높음)
- 사외 클라우드에 영구 저장되는 응답은 캡처 후 즉시 삭제
- KT 그룹의 외부 AI 사용 가이드라인을 사전 확인

### 0.3 결과 활용 원칙

- 외부 LLM의 답변은 **참고용**, 정의서 변경의 1차 권한은 통합 PM(Sinclair)
- 동일 관점에 2개 이상 LLM의 의견이 일치하면 우선 반영
- LLM이 hallucination한 사실(존재하지 않는 표준·기술·수치)은 §4의 검증 체크리스트로 거름

---

## 1. Preamble — 모든 프롬프트 앞에 공통으로 붙일 컨텍스트

> 아래 텍스트를 **모든 검증 프롬프트의 첫 부분**에 붙이세요. 이 컨텍스트가 없으면 LLM이 일반론적인 답을 합니다.

```
You are a senior reviewer evaluating an internal product definition document
for a Korean enterprise B2B AI platform called "AI Foundry".

CONTEXT:
- The document defines a system that turns enterprise decisions into
  reusable assets (policy packs, ontology, skill packages, decision logs).
- Target users: large Korean enterprises (Phase 3 will pick a real domain;
  Phase 1 keeps domain abstract on purpose).
- The platform is a 5-Layer architecture: Data → Ontology → LLM → Workflow → Agent.
- Signature features: 4 Diagnostics (Missing/Duplicate/Overspec/Inconsistency)
  and Cross-Org Comparison (4 groups: common_standard / org_specific /
  tacit_knowledge / core_differentiator).
- Timeline: Phase 1 (planning) by end of May 2026, Phase 2 (Prototype) in
  June, Phase 3 (real domain in production) starting August.
- The document is v0.1 — written to be consolidated to v1.0 by end of May
  after stakeholder review.

YOUR TASK:
You will be given the full document (or a specific section). You will
provide a STRUCTURED REVIEW from the perspective specified in the prompt.

REVIEW PRINCIPLES:
- Be specific. Cite exact section numbers (e.g., "§2.2.1 Policy Pack").
- Be concrete. If you spot a gap, propose what should fill it.
- Distinguish "definitely wrong" from "could be improved".
- Flag any factual claim that you cannot verify (e.g., specific tech names,
  market figures, regulatory references).
- If the document is ambiguous, list the alternative interpretations.

OUTPUT FORMAT (use this exactly):

## Summary (3 sentences)
## Strengths (3-5 bullet points with section references)
## Critical Gaps (must fix before v1.0)
   - [Severity: Critical/High] [Section] [Issue] [Suggested fix]
## Improvements (nice to fix)
   - [Severity: Medium/Low] [Section] [Issue] [Suggested fix]
## Unverifiable Claims (factual statements you can't validate)
   - [Section] [Claim] [How to verify]
## Counterquestions for the author
   - [3-5 questions that the document should be able to answer
     but currently doesn't]

LANGUAGE: 답변은 한국어로 작성하되, 기술 용어와 인용된 섹션 제목은
원문 그대로 유지하세요.
```

---

## 2. 검증 관점별 프롬프트

> 각 프롬프트는 §1의 Preamble 다음에 붙입니다.

### 2.1 [관점 A] 시스템 정의의 명확성·논리 일관성

**추천 LLM**: Claude (다른 Claude 인스턴스로 self-review), ChatGPT (GPT-4o)

```
REVIEW PERSPECTIVE: System Definition Coherence

당신은 본 정의서가 "AI Foundry란 무엇인가"라는 질문에 일관되고 모순 없이
답하고 있는지 평가합니다.

다음을 점검하세요:

1. §0.1 Gold Slogan, §2.1 시스템 정의(4요소), §1.5 한 줄 진술이
   같은 시스템을 가리키는가? 표현 차이가 정합성을 깨지 않는가?

2. §2.4 시스템 약속(P1~P5)과 §2.5 시스템이 약속하지 않는 것이
   서로 모순되지 않는가?

3. §0.3 허니콤 네트워크(KT·고객·파트너) 개념이 본문에서 충실히
   설명되고 있는가? 아니면 0장에만 나오고 사라지는가?

4. §2.2 4-Asset Model의 4가지 자산이 §3 5-Layer와 어떻게 연결되는지
   §2.3 Asset Graph가 충분히 설명하는가?

5. §1 문제 정의(현재 모습)와 §2 시스템 정의(약속) 사이에
   "이 약속이 이 문제를 어떻게 해결하는가"가 명확한가?

6. 본 정의서가 사용하는 핵심 개념 중에서 정의 없이 도입된 용어가
   있는가? (§12.1 용어 사전과 본문 사용을 대조)

OUTPUT FORMAT는 §1의 OUTPUT FORMAT 사용.
```

### 2.2 [관점 B] 5-Layer 아키텍처의 기술적 타당성

**추천 LLM**: Gemini (Pro/Ultra), DeepSeek (코드 친화)

```
REVIEW PERSPECTIVE: Technical Architecture Feasibility

당신은 시니어 시스템 아키텍트입니다. 본 정의서의 §3 5-Layer와
§8 모듈 스펙을 평가하세요.

다음을 점검하세요:

1. Layer 1~5 사이의 데이터 플로우(§3.2)가 실제로 동작 가능한가?
   특히 비동기 큐 기반 처리에서 발생할 수 있는 일관성 문제는?

2. §3.5 LLM Layer의 Tier 1/2/3 라우팅이 §8.3에서 충분히 구체화
   되었는가? 다음 시나리오를 처리할 수 있는가?
   - Tier 3로 시작했는데 신뢰도 부족 → Tier 2 → Tier 1 fallback
   - Tier 1 호출 비용이 일일 예산을 초과하는 순간

3. §3.4 Ontology Layer의 12 노드 타입이 일반 도메인을 충분히
   커버하는가? 누락이 의심되는 노드 타입이 있는가?

4. §8.4 Workflow Layer의 5 RBAC 역할이 실제 기업 환경의
   직무 분리(SoD) 요구를 충족하는가?

5. §3.7 Layer 5 Agent의 Skill Package(.skill.json) 구조가
   실제 배포·실행에 충분한가? 누락된 메타데이터는?

6. §8.6 횡단 모듈(Audit Log Bus, Cost Governor, Sensitivity
   Label Propagation)이 5-Layer 위에 일관되게 동작 가능한가?

7. §12.3 인터페이스 카탈로그의 이벤트·API 설계에 race condition
   이나 분산 트랜잭션 이슈가 보이는가?

특히 6월 W22~W26의 4주 안에 Prototype(α1~α4)을 만들 수 있는
복잡도인지 평가하세요. 무리한 일정의 단서를 찾으면 명시.

OUTPUT FORMAT는 §1 사용.
```

### 2.3 [관점 C] 4-Asset Model의 비즈니스 타당성

**추천 LLM**: ChatGPT (GPT-4o)

```
REVIEW PERSPECTIVE: Business Model Viability of "Decision-as-Asset"

당신은 B2B SaaS의 사업화 컨설턴트입니다.
본 정의서의 핵심 주장은 "의사결정을 자산화하면 비즈니스 가치가
비선형으로 증가한다"입니다(§5.5 자산 가치 누적 곡선).

다음을 평가하세요:

1. §2.2의 4가지 자산(Policy Pack / Ontology / Skill Package /
   Decision Log)이 정말로 고객 기업이 "구매할 만한" 자산인가?
   각 자산의 단독 가치를 평가.

2. §5.1 4그룹 분류(common_standard / org_specific /
   tacit_knowledge / core_differentiator)는 실제 운영에서
   분류가 가능한가? 분류 알고리즘(§5.2)에 누락은?

3. §5.4 "core_differentiator는 절대 표준화하지 않습니다"라는
   약속이 외부 마켓플레이스가 가동되는 Phase 4 시점에도
   유지 가능한가? 인센티브 충돌 지점은?

4. §5.5의 자산 가치 누적 곡선(N개 도메인 후 비선형 증가)이
   실제로 어떤 조건에서 성립하는가? 깨질 수 있는 시나리오는?

5. 비교 대상: Salesforce Einstein, ServiceNow Now Assist,
   Palantir Foundry, IBM watsonx, IBM ODM 같은 시장 선도 제품
   대비 4-Asset Model이 차별화되는 부분은? (factual claims는
   verifiable로 표시)

6. 한국 시장 특수성 (감독원/공공조달/대기업 IT거버넌스) 관점에서
   본 BM이 작동할 가능성은?

OUTPUT FORMAT는 §1 사용.
```

### 2.4 [관점 D] 4대 진단·Cross-Org의 차별성

**추천 LLM**: Gemini, ChatGPT

```
REVIEW PERSPECTIVE: Signature Feature Differentiation

당신은 AI/MLOps 시장 분석가입니다. 본 정의서가 시그니처로 내세우는
§4 4대 진단(Missing/Duplicate/Overspec/Inconsistency)과
§5 Cross-Org Comparison이 시장에서 정말 차별화 포인트인지
평가하세요.

다음을 점검하세요:

1. 4대 진단이 기존 룰 엔진(IBM ODM, Drools), 정책 분석 도구
   (OPA, OpenPolicyAgent), DMN-기반 BPM 도구에 비해 새로운가?
   각각이 이미 제공하는 기능과 새로 제공하는 기능을 분리.

2. §4.5 진단 임계치(severity)의 결정 방식이 실제 도메인에서
   합리적으로 보정 가능한가? 특히 "도메인별 가변" 부분의 운영 부담은?

3. Cross-Org 4그룹 분류는 데이터 협조에 N개 조직이 동의해야
   가능한 BM. 한국 기업 환경에서 이 데이터 협조가 실제로
   가능한 시나리오/불가능한 시나리오는?

4. 글로벌 시장에서 "policy mining" 또는 "decision intelligence"
   카테고리의 선도 제품들과 본 시그니처가 어떻게 비교되는가?
   (구체 제품명 인용 시 verifiable로 표시)

5. 4대 진단을 LLM 기반으로 구현하는 것의 정확도/재현율 한계는?
   §9.2의 70% 정밀도, 60% 재현율 가설이 합리적인가?

6. 만약 다른 회사(예: 삼성SDS, LG CNS)가 같은 시그니처를 내세우면
   AI Foundry의 차별점은 무엇으로 남는가?

OUTPUT FORMAT는 §1 사용.
```

### 2.5 [관점 E] 마일스톤·일정 현실성 (5월 기획→6월 Prototype→8월 사업적용)

**추천 LLM**: Claude (다른 인스턴스), ChatGPT

```
REVIEW PERSPECTIVE: Schedule Realism

당신은 시니어 엔지니어링 매니저입니다. 본 정의서의 §7 로드맵이
현실적인지 평가하세요.

기본 정보:
- Phase 1 (5월, 4주): 정의서 + 모듈 스펙 + 인터페이스 카탈로그 + 가상 도메인 사양
- Phase 2 (6월, 4주): 5-Layer Prototype + 4대 진단 + Cross-Org + E2E 시연
- Phase 3 진입 정비 (7월): 도메인 합의 + 데이터 협조 + 인력 배정
- Phase 3 (8월, 4주): 첫 실제 도메인 인스턴스화 + 운영 시작
- 인력 가설: 7.3 FTE × 18주 (§10.2)
- 신규 vs 재사용 비율 (§7.5.1): 시그니처 기능은 80% 신규, 인프라는 50% 재사용

다음을 평가하세요:

1. 6월 4주 안에 5-Layer Prototype 통합이 가능한가? 비슷한 규모의
   B2B AI 플랫폼 구축 전례와 비교.

2. §7.6 6가지 가설(H1~H6)이 충분한가? 추가로 검증해야 할
   숨은 가설이 있는가?

3. §11.1 리스크 R-01~R-12가 본 일정의 모든 위험을 다 포착하는가?
   누락된 리스크는?

4. 7.3 FTE × 18주가 본 범위에 적정한가? 한국 IT 환경에서 이
   인력 가설이 무리하다면 어디서 부서질 가능성이 높은가?

5. Phase 3의 7월 W29(G4) 게이트 — "도메인 1개 확정 + 본부 합의 +
   인력 배정"이 4주 안에 가능한가? 한국 대기업의 의사결정 사이클
   기준으로.

6. 8월 W32 "첫 임원 중간 보고"와 W34 "Phase 3 1차 마감"의
   메시지가 실제로 의미가 있으려면 어떤 결과가 8월 안에 나와야 하는가?
   현재 §7.2의 마일스톤이 그 결과를 만들 수 있는가?

7. 일정이 깨질 가장 가능성 높은 한 지점을 골라, 사전 완화 조치를 제안.

OUTPUT FORMAT는 §1 사용.
```

### 2.6 [관점 F] 리스크 누락 검사

**추천 LLM**: ChatGPT (GPT-4o), Claude

```
REVIEW PERSPECTIVE: Risk Coverage Audit

당신은 시니어 PM(또는 CRO 컨설턴트)입니다. §11.1 리스크 레지스터
12건이 충분한지 점검하세요.

다음 카테고리에서 누락 리스크가 있는지 점검:

A. 기술 리스크 — LLM 공급자 전환·정확도·비용
B. 데이터 리스크 — PII/PHI·민감 정보·해외 이전·국정원 망분리
C. 인력 리스크 — 핵심 인력 이탈·신규 채용 지연·외주 갈등
D. 거버넌스 리스크 — KT 그룹 정책 변경·임원 결재 지연·예산 중단
E. 시장 리스크 — 경쟁사 선제 출시·고객사 입맛 변화·산업 규제 변경
F. 법무 리스크 — IP·라이선스·계약 분쟁·AI 책임론
G. 보안 리스크 — 사이버 사고·인사이더 위협·ID 관리
H. 운영 리스크 — 인프라 장애·SLA 위반·고객 클레임
I. 변경 관리 리스크 — 정의서 변경의 후속 문서 동기화
J. 측정 리스크 — Phase 2 측정 결과가 합의 안 됨·Phase 3 ROI 입증 실패

각 카테고리에서 12건 리스크에 누락된 것이 있다면 §11.1의 표 형태로
추가 제안하세요.

OUTPUT FORMAT는 §1 사용.
```

### 2.7 [관점 G] 글쓰기 품질·이해 난이도

**추천 LLM**: ChatGPT (GPT-4o, 글쓰기 강함), Claude

```
REVIEW PERSPECTIVE: Document Quality and Readability

당신은 테크니컬 라이터/에디터입니다.

다음 청중 세 그룹에 본 정의서가 적합한지 평가하세요.

청중 1 — 임원 (15분 내 첫 3장 읽음): §0~§2가 임원이 결재 결정을
내릴 수 있는 정보를 담고 있는가? 첫 1쪽으로 "왜 결재해야 하는가"
가 전달되는가?

청중 2 — 개발자 (90분 내 §3·§7·§8·§12 읽음): 모듈 스펙이
6월 W22 개발 착수에 충분한가? 모듈 간 인터페이스가 ambiguity
없이 정의되었는가?

청중 3 — 외부 고객/파트너 (30분 내 §0~§5 읽음): 한국어 사용자에게
어색한 영어 표현이 있는가? "허니콤 네트워크" 같은 비유가 외부
고객에게 의미가 통하는가? §6 가상 시나리오가 외부 청중을 설득
가능한가?

추가:
- 한국어 표현 중 어색한 직역 또는 영어식 어순이 있는 곳을 5곳
  이상 지적
- 같은 개념이 다른 단어로 불리는 곳 (예: "정책팩"과 "Policy Pack"의
  혼용)이 있는지
- 중복되어 두 곳 이상에서 같은 내용이 반복되는 섹션이 있는지

OUTPUT FORMAT는 §1 사용.
```

### 2.8 [관점 H] 시장 포지셔닝·경쟁 분석

**추천 LLM**: Perplexity (사실 검색), ChatGPT

```
REVIEW PERSPECTIVE: Market Positioning

당신은 시장 분석가입니다. AI Foundry를 다음과 비교하세요.

직접 경쟁:
- Palantir Foundry (특히 AIP)
- IBM watsonx + ODM
- ServiceNow Now Assist + Knowledge Graph
- Salesforce Einstein 1 / Data Cloud
- OpenPolicyAgent + Conftest 생태계

간접 경쟁 (영역별):
- Documind, Glean (지식 검색)
- LangChain, LlamaIndex (RAG 프레임워크)
- Camunda, Pega (BPM/워크플로우)
- Neo4j Bloom (온톨로지 시각화)

평가:
1. AI Foundry의 4-Asset Model이 위 경쟁 제품의 어떤 요소와 겹치고,
   무엇을 새로 제안하는가?

2. 한국 시장에서 AI Foundry의 가장 강한 경쟁자는?
   삼성SDS Brity, LG CNS Devon, SK C&C 같은 SI 자회사 제품들과의
   비교 (사실 검증 필요).

3. "B2B AX" 카테고리에서 한국 시장이 곧 표준으로 받아들일 수
   있는 키워드가 무엇인가? AI Foundry의 메시지(§0.1)는 그
   키워드와 정렬되는가?

4. AI Foundry가 겨냥할 수 있는 Top 3 시장 진입 segment를 구체적으로
   제안 (Phase 3·4 도메인 후보로 활용).

5. AI Foundry가 절대 진입하지 말아야 할 segment는?

이 분석에 사용한 모든 사실은 verifiable claim 섹션에 출처와 함께
표시하세요. (예: "Palantir Foundry AIP의 X 기능 - 출처: Palantir
공식 사이트 2025-XX-XX")

OUTPUT FORMAT는 §1 사용.
```

---

## 3. LLM별 추천 매핑

| 검증 관점 | 1순위 LLM | 2순위 | 비고 |
|---|---|---|---|
| A. 시스템 정의 일관성 | Claude (다른 인스턴스) | ChatGPT | 자기 검증 + 문서 일관성 |
| B. 5-Layer 기술 타당성 | Gemini Pro/Ultra | DeepSeek | 시스템 디자인·코드 친화 |
| C. 4-Asset BM 타당성 | ChatGPT GPT-4o | — | 비즈니스 분석 강점 |
| D. 시그니처 차별성 | Gemini | ChatGPT | 시장 비교·기술 비교 |
| E. 일정 현실성 | Claude | ChatGPT | 엔지니어링 매니저 시각 |
| F. 리스크 누락 | ChatGPT | Claude | PM/리스크 매트릭스 강점 |
| G. 글쓰기 품질 | ChatGPT | Claude | 한국어 어휘·구조 |
| H. 시장 포지셔닝 | Perplexity | ChatGPT | 실시간 사실 검색 |

> **권장**: 8개 관점을 모두 검증할 시간이 없다면 **A·B·E·F 4개를 우선** (정의 일관성·기술·일정·리스크). C·D·G·H는 5월 W21 G1+G2 통과 후 v1.0 → v1.1 보강 단계에 진행.

### 3.1 LLM별 운영 팁

#### ChatGPT (GPT-4o)
- 한 번에 정의서 전체를 첨부 가능 (PDF/텍스트)
- "한국어로 답하되 섹션 번호는 원문 유지" 명시 필요
- Custom GPT로 본 Preamble을 사전 설정해두면 반복 호출 시 효율 ↑

#### Gemini (Pro/Ultra)
- 한 번에 첨부 가능, 하지만 응답 길이 제한 주의
- 기술 검증에 강하지만 한국어 표현이 어색할 수 있음
- Code Execution 기능을 켜면 §8 모듈 스펙의 데이터 구조 검증 가능

#### DeepSeek
- 코드 중심 프롬프트에 강함 — §12.3 인터페이스 카탈로그 검증에 적합
- 한국어 응답 품질은 가변적, 영어로 답을 받고 사용자가 번역하는 방식 추천
- 무료 사용 한도 활용

#### Perplexity
- 사실 검증·시장 비교에 특화 (real-time web search)
- 다른 LLM이 답한 "verifiable claim" 섹션을 Perplexity로 다시 검증
- 답변에 출처 URL이 자동 부착되어 §4 통합 시 활용

#### Claude (다른 인스턴스/모델)
- 본 정의서가 Claude로 작성되었으므로, 동일 모델의 다른 세션에서
  자기검증 — 같은 사고 패턴 때문에 일부 빈틈이 보이지 않을 수 있음
- 보완: Opus → Sonnet 같은 다른 티어로 검증

---

## 4. 결과 통합 템플릿

### 4.1 검증 결과 수집 시트 (예시)

| 관점 | LLM | 검증일 | Critical Gaps | Improvements | Unverifiable | 통합 PM 결정 |
|---|---|---|---|---|---|---|
| A | Claude | 2026-05-XX | (요약) | (요약) | (요약) | 반영/보류/거부 |
| A | ChatGPT | 2026-05-XX | | | | |
| B | Gemini | 2026-05-XX | | | | |
| B | DeepSeek | 2026-05-XX | | | | |
| C | ChatGPT | 2026-05-XX | | | | |
| D | Gemini | 2026-05-XX | | | | |
| E | Claude | 2026-05-XX | | | | |
| F | ChatGPT | 2026-05-XX | | | | |
| G | ChatGPT | 2026-05-XX | | | | |
| H | Perplexity | 2026-05-XX | | | | |

### 4.2 우선순위 결정 룰

| 조건 | 우선순위 | 처리 |
|---|---|---|
| 같은 Critical Gap이 2개 이상 LLM에서 지적됨 | **P0 (즉시 반영)** | v1.0에 반드시 반영 |
| 단일 LLM의 Critical Gap | P1 (검토 후 결정) | 통합 PM 판단 |
| 같은 Improvement가 2개 이상 LLM에서 지적됨 | P2 (반영 시도) | v1.0 또는 v1.1에 |
| 단일 LLM의 Improvement | P3 (보류) | 백로그 |
| Unverifiable Claim 지적 | **별도 트랙** | Perplexity로 재검증 → 사실이면 정의서에 출처 부착 / 사실 아니면 즉시 수정 |

### 4.3 검증 후 v1.0 회의 (5월 W21) 안건 템플릿

```markdown
# AI Foundry 정의서 v1.0 합의 회의 안건
일시: 2026-05-25 (월) 14:00
참석: 사용자, 서민원, AXBD 임원, 모듈 코어 5명

## 1. 외부 LLM 교차검증 결과 요약 (10분)
- 검증한 LLM 수: N개
- P0 사항(즉시 반영): N건 — 본문에 적용된 변경 highlight
- P1 사항(검토 안건): N건 — 회의에서 토론

## 2. P1 토론 (30분)
- 안건별 5분, 결정자 명확화

## 3. 일정 가설 H1~H6 검증 (15분)
- 각 가설의 현재 상태 점검
- 깨진 가설이 있다면 일정 영향 분석

## 4. v1.0 sign-off (5분)
- 합의 텍스트 (의사록)
- 다음 단계 (Phase 2 착수 5월 W22)
```

---

## 5. 빠른 시작 — 한 번의 호출로 시작하고 싶다면

> 시간이 부족하다면 다음 1개 프롬프트만 ChatGPT GPT-4o에 던지세요.
> Preamble + 8개 관점의 핵심을 한 번에 묻는 압축형입니다.

```
[§1 Preamble 전체를 여기에 붙이고 그 다음 아래를 이어붙임]

REVIEW PERSPECTIVE: One-Shot Multi-Lens Audit

다음 8가지 관점에서 본 정의서를 동시에 평가하세요. 각 관점에서
가장 critical한 1~2건만 골라 보고하세요.

A. 시스템 정의의 논리 일관성 (§0~§2)
B. 5-Layer 기술 타당성 + 6월 4주 Prototype 일정 (§3, §7, §8)
C. 4-Asset Model의 비즈니스 타당성 (§2.2, §5)
D. 4대 진단·Cross-Org의 시장 차별성 (§4, §5)
E. 5~8월 일정의 현실성 (§7, §11.1)
F. §11.1 12건 리스크 외에 누락된 critical 리스크 1~2건
G. §0~§2가 임원 15분 결재에 충분한가
H. AI Foundry vs 글로벌 경쟁(Palantir, IBM watsonx, ServiceNow) 차별점

OUTPUT FORMAT:
- 관점별 Top 1 Critical Gap (8건)
- 관점별 Top 1 Improvement (8건)
- 전체 권고 — 만약 정의서를 v1.0으로 승급할 때 반드시 고쳐야 할 3가지

답변은 한국어. 섹션 번호는 원문 유지.
```

---

## 6. 검증 일정 가이드 (5월 W18~W21에 끼워넣기)

| 시점 | 작업 | 책임 |
|---|---|---|
| **5월 W18 화** | 본 프롬프트 모음을 Sinclair가 1차 검토 | Sinclair |
| **5월 W18 수~목** | ChatGPT·Gemini로 관점 A·B·E·F 검증 (압축형 §5도 옵션) | Sinclair |
| **5월 W18 금** | 검증 결과를 §4.1 시트로 정리, P0/P1 분류 | Sinclair |
| **5월 W19 월** | P0 즉시 반영 → v0.2 작성 | Sinclair |
| **5월 W19~W20** | 추가 관점 C·D·G·H 보강 검증 (시간 허락 시) | Sinclair |
| **5월 W20 금** | v0.2 → 모듈 코어들에게 사전 회람 | Sinclair |
| **5월 W21 월** | v1.0 합의 회의 (§4.3 안건 사용) | 전원 |
| **5월 W21 금** | v1.0 sign-off, Phase 2 착수 결재 | 임원 |

---

## 7. 부록 — 정의서를 첨부할 때의 형식 팁

### 7.1 PDF 변환 (외부 LLM 첨부용)
- Markdown 원본(`02_ai_foundry_phase1_v0.1.md`)을 PDF로 변환
- 변환 도구: Pandoc, MarkText, 또는 사내 docx skill 활용
- 표·코드 블록이 PDF에서 깨지지 않는지 사전 확인

### 7.2 토큰 한도 대응
정의서 전체가 토큰 한도를 초과하면 다음 분할 권장:
- 1차 첨부: §0~§5 (정의·아키텍처·시그니처)
- 2차 첨부: §6~§10 (시나리오·로드맵·스펙·측정·조직)
- 3차 첨부: §11~§12 (리스크·부록)

각 첨부마다 Preamble을 다시 붙입니다.

### 7.3 비밀 정보 마스킹
정의서 자체에 PII나 KT 내부 시스템 식별자는 없지만, 향후
v1.0에 인력 이름이 추가될 경우 외부 LLM 호출 전 익명화 검토.

---

— 끝.
