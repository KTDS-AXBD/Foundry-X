# 경험의 자산화 — Input Plane

> **AI Foundry OS Deep Dive v0.3** · Plane A

kt ds 20년+ SI/ITO 경험은 형태가 제각각이다. 돌아가는 코드, 산출·운영 문서, 담당자 암묵지 — 이 셋을 AI가 다시 쓸 수 있는 구조로 바꾸는 게 Decode-X의 역할.

---

## A-1 원시 경험 → Spec 변환 파이프라인

> **SOURCE → PROCESS → OUTPUT**

3종 원시 경험(코드·문서·암묵지)을 Decode-X 4단계 처리로 통과시키면 Business·Technical·Quality 3종 Spec 자산이 생성된다.

### 소스 (SOURCE)

| # | 유형 | 설명 | 예시 |
|---|------|------|------|
| 1 | **SI/ITO 코드** | 레거시 소스코드 저장소, 패키지, DB 스키마 | Java/Spring, COBOL, PL/SQL / DDL·프로시저·배치 잡 / 환경설정·IaC 스크립트 |
| 2 | **SI/ITO 문서** | 프로젝트 공식 산출물 + 운영 문서 | SI 산출물(요건정의서, 설계서, 테스트 시나리오) / 운영문서(Runbook, 장애이력) / KMS 등록 지식 |
| 3 | **암묵지 (Tacit)** | 담당자 머릿속에만 있는 비정형 지식 | 담당자 Knowledge(인터뷰·워크숍) / Lesson & Learned / 화이트보드 메모, Slack/회의록 |

### 처리 (PROCESS)

| 단계 | 이름 | 방식 | 내용 |
|------|------|------|------|
| 2-1 | **코드 구조 분석** | Local · AST | AST 파싱 · 의존성 그래프 · 데이터 모델 리버스 / 모듈·클래스·함수 추출 / Call Graph · DB 테이블 관계 / API 엔드포인트 시그니처 |
| 2-2 | **문서 의미 분석** | AI · RAG | LLM+RAG로 비정형 문서를 섹션·개념 단위로 쪼개 의미 추출 / DocumentParser(보유) / 요건·정책·규칙 추출 / 용어사전 자동 생성 |
| 2-3 | **암묵지 인터뷰** | HITL | Agent가 담당자에게 구조화 질문 → 답변을 Spec 조각으로 변환 / TA Agent · AI Makers 활용 / 회의록 Agent 연계 / 답변 → KG 노드 자동 등록 |
| 2-4 | **정합성 검증** | SDD | 코드·문서·암묵지 3자 Cross-check — Gap ≥ 90% 달성까지 반복 |

### 출력 (OUTPUT)

| 유형 | 관점 | 구성 |
|------|------|------|
| 📘 **Business Spec** | 사업·업무 규칙 관점 | 정책 정의서 / 업무 프로세스·의사결정 규칙 / 도메인 용어집 · KPI 정의 |
| 📗 **Technical Spec** | 시스템·구현 관점 | 아키텍처 정의서 / 서비스 구성도 · API 명세 / 데이터 모델 · 인터페이스 계약 |
| 📙 **Quality Spec** | 비기능·품질 관점 | 성능·보안·SLA 기준 / 테스트 계약(Test Contract) / 운영 Runbook · 장애 대응 절차 |

> 3종 Spec을 노드·엣지로 연결해 L4 Ontology에 저장 → Asset Layer로 유통

---

## A-2 Spec의 정의 — 무엇이 나와야 Spec인가

> **AI와 사람이 동일한 의미로 해석 가능한 구조화된 계약**

Spec은 단순 문서가 아니라 AI와 사람이 동일한 의미로 해석 가능한 구조화된 계약. 3가지 관점(사업·시스템·비기능)으로 분리되어 서로를 보완한다.

### 📘 Business Spec — "무엇을 왜" (사업·업무 관점)

**구성요소**
- 목적·KPI·대상 사용자
- 업무 규칙 (if-then)
- 정책·승인 체계
- 용어사전 (도메인 표준)

**예시**: 퇴직연금 중도인출 사유 판정 규칙 — 주택구입/의료비/학자금 등 분기 조건, 소득증빙 필수 서류, 한도 계산식

### 📗 Technical Spec — "어떻게" (시스템 구현 관점)

**구성요소**
- 아키텍처 정의서 (Layer 구조)
- 서비스 구성도 (컴포넌트·IF)
- API 명세 (OpenAPI, Zod 스키마)
- 데이터 모델 (ERD·DDL)

**예시**: "인증/결제" 반제품 — MSA 서비스 구성도 5개 컴포넌트, JWT+OAuth2 인증 플로우, 결제 Idempotency 키 설계

### 📙 Quality Spec — "얼마나 잘" (비기능 관점)

**구성요소**
- 성능 목표 (RPS·Latency)
- 보안 요구 (Mask·암호화·감사)
- 테스트 계약 (단위·통합·E2E)
- 운영 Runbook · SLA

**예시**: 연말정산 반제품 — 피크 1만 TPS, 개인정보 필드 AES-256, 테스트 케이스 300건, 롤백 15분 이내

---

## A-3 AI 개발의 필요충분조건 — 6가지 기준

> **Foundry-X가 자동 생산 가능해지는 조건**

Spec이 아래 6가지를 모두 충족해야 Foundry-X가 자동으로 Code·Test·Agent를 생성할 수 있다. 한 가지라도 빠지면 반제품화 불가.

| # | 기준 | 태그 | 설명 |
|---|------|------|------|
| ① | **기계 판독 가능** | Machine-readable | Markdown/YAML/JSON 등 구조화 포맷. 자연어만으로는 부족 — 스키마가 있어야 함 |
| ② | **의미 일관성** | Semantic Consistency | 같은 용어는 같은 뜻. KG 용어사전과 연결되어 중의성 제거 |
| ③ | **테스트 가능** | Testable | Spec에서 바로 테스트 케이스가 도출 가능. TDD Red Phase의 입력 |
| ④ | **추적 가능** | Traceable | Spec ↔ Code ↔ Test 3자 매핑이 KG로 연결. Gap 측정 가능 |
| ⑤ | **완결성** | Completeness | Business + Technical + Quality 3종 모두 존재. 한쪽만 있으면 구현 불가 |
| ⑥ | **사람 리뷰 가능** | Human-reviewable | AI만 이해하는 게 아니라 도메인 전문가가 10분 내 검토 가능한 가독성 |

---

## A-4 실전 사례 — 퇴직연금 중도인출 반제품화 (Type 1)

> **경험 → Spec → AI 반제품 E2E 플로우**

DeepDive 원본이 상정한 대표 시나리오. 실제 kt ds AX BD팀이 파일럿으로 선정한 도메인은 LPON(온누리상품권 취소)으로, Decode-X `반제품-스펙/pilot-lpon-cancel/`에 완성 상태로 존재한다.

```
SOURCE
  └→ 기존 퇴직연금 SI 코드 + 운영 매뉴얼 + 현업 담당자 인터뷰

DECODE-X
  └→ AST로 judgment 로직 추출 / 매뉴얼에서 정책 추출 / 담당자 엣지케이스 캡처

SPEC 산출
  └→ Business: 인출사유 6종 규칙
  └→ Technical: REST API + ERD
  └→ Quality: 규제 준수 테스트 200건

반제품 ✅
  └→ Foundry-X가 Spec 읽고 Code + Test 자동 생성
  └→ Type 1 소스 딜리버리 → 신규 고객사 투입
```

---

*Source: `packages/web/src/data/deepdive-content.ts` · v0.3 · Sprint 298*
