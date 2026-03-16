# Foundry-X PRD v2 아키텍처 리뷰

(논리적 완결성 관점)

## 전체 요약

현재 PRD는 **컨셉과 방향성은 매우 강력하지만**, 실제 플랫폼 설계로 보면 **핵심 계약 계층(contract layer)**이 부족합니다.

특히 다음 세 가지가 구조적으로 비어 있습니다.

```
Canonical Model
API Contract
Spec DSL Schema
```

이 세 가지가 없으면 팀마다 데이터 모델과 API를 다르게 정의하게 되어 **통합 단계에서 대규모 재작업**이 발생할 가능성이 큽니다. 

---

# 1. 논리적 결함 (Architectural Logic Issues)

## 1.1 Git = SSOT vs 자연어 협업 충돌

PRD 핵심 원칙

```
Git = Single Source of Truth
```

하지만 동시에

```
비기술자 자연어 참여
AI Agent 협업
```

을 요구합니다.

### 논리 충돌

Git 기반 시스템은 기본적으로

```
구조화된 변경
PR 리뷰
commit 기반 상태
```

를 전제로 합니다.

그러나 자연어 참여는

```
불완전 입력
모호한 intent
즉흥 수정
```

을 발생시킵니다.

### 해결 구조가 문서에 없음

필요한 계층

```
Natural Language
↓
Spec DSL
↓
Canonical Model
↓
Git
```

현재 PRD에는 **NL → DSL 변환 계층이 명확히 정의되어 있지 않습니다.**

---

## 1.2 5축 구조의 책임 경계

PRD에서 언급된 핵심 축

```
Workspace
Requirement
Spec
Prototype
Runtime
Governance
```

문제는 **Workspace와 Requirement의 책임 경계**입니다.

예

```
Workspace
프로젝트 협업

Requirement
요구사항 관리
```

그러나 실제 데이터 흐름은

```
Project
Requirement
Spec
Prototype
Review
```

입니다.

Workspace가 독립 서비스로 존재하면

```
Project 데이터
Requirement 데이터
```

중복 관리가 발생할 수 있습니다.

즉

```
Workspace = UI layer
Requirement = domain layer
```

로 분리해야 합니다.

---

## 1.3 Prototype Factory 정의 충돌

문서에서 두 가지 파이프라인이 존재합니다.

문서 A

```
Template
→ Compile
→ Generate
→ Preview
```

문서 B

```
Resolve
Load
Compile
Validate
Scaffold
Preview
Build
Publish
```

이 두 파이프라인의 관계가 명확하지 않습니다. 

결과적으로

```
어느 것이 정본인가?
```

라는 문제가 발생합니다.

---

## 1.4 서비스 경계 불일치

문서 간 정의

PRD

```
5 services
```

아키텍처

```
4 services
```

Monorepo

```
7 apps
```

이것은 플랫폼 개발에서 **가장 위험한 신호 중 하나**입니다.

개발 착수 시

```
팀 A → 5개 기준
팀 B → 7개 기준
```

으로 작업이 시작될 수 있습니다.

---

# 2. 빠진 핵심 요소

## 2.1 Canonical Data Model

가장 중요한 문제입니다.

현재 ERD는

```
Project
Requirement
Spec
Prototype
Review
```

엔티티 이름만 존재합니다. 

하지만 다음이 없습니다.

```
PK
FK
속성
카디널리티
버전 관리
```

예를 들어

```
SpecVersion
PrototypeVersion
Template
User
Team
AuditLog
Approval
```

같은 운영 필수 엔티티가 없습니다.

---

## 2.2 멀티테넌시 / 데이터 격리

PRD에서

```
Workspace
Project
```

개념은 있지만

다음이 없습니다.

```
Tenant
Organization
Environment
```

멀티 조직 플랫폼이라면 반드시 있어야 합니다.

---

## 2.3 Agent-Human 충돌 시나리오

PRD 핵심 컨셉

```
Agent = team member
```

하지만 다음 시나리오가 없습니다.

예

```
Agent가 코드 수정
사람이 다른 변경
충돌 발생
```

또는

```
Agent가 Spec 변경
사람이 reject
```

즉

```
Conflict resolution model
```

이 없습니다.

---

## 2.4 운영 계층 (Operations)

다음이 문서에 없습니다.

```
Observability
Retry 전략
Failure handling
Rate limiting
Cost control
```

AI 기반 플랫폼에서는 특히

```
LLM 비용
token usage
latency
```

가 중요합니다.

---

# 3. 실현 가능성 우려

## 3.1 TypeScript + Python 혼합

이 구조는 현실적으로 가능하지만 다음이 필요합니다.

```
strict API contract
shared schema
proto or json schema
```

현재 문서에는

```
Canonical Model schema
```

가 없습니다.

즉

```
TS service
Python runtime
```

간 데이터 계약이 없습니다.

---

## 3.2 Plumb (SDD triangle)

이 컨셉은 매우 좋습니다.

```
Spec
Code
Test
```

동기화

하지만 문제는

```
production codebase scale
```

입니다.

Plumb는 일반적으로

```
PoC 수준
소형 프로젝트
```

에서는 효과적입니다.

대규모 프로젝트에서는

```
spec drift
test drift
```

가 쉽게 발생합니다.

---

## 3.3 6개 멀티리포

소규모 팀이라면

```
6 repos
```

는 부담이 됩니다.

보통 초기 플랫폼은

```
Monorepo
```

로 시작합니다.

추천

```
apps/
packages/
tools/
```

구조

---

# 4. 추가 기술 리스크

## 4.1 Spec DSL

현재 문서에서

```
feature.json
workflow.json
ui.json
api.json
policy.json
```

가 언급됩니다.

하지만

```
JSON Schema
```

가 없습니다. 

즉

```
validation
IDE support
codegen
```

이 불가능합니다.

---

## 4.2 API 계약

PRD에서는

```
POST /prototype/build
```

같은 endpoint만 존재합니다.

하지만 다음이 없습니다.

```
request schema
response schema
error codes
auth
```

이 상태에서는 개발이 시작될 수 없습니다.

---

# 5. 착수 판단

## 최종 판단

```
Conditional Ready
```

즉

```
즉시 개발 착수는 위험
```

입니다.

하지만 구조 자체는 매우 좋습니다.

---

# 착수 조건

다음 세 가지가 먼저 확정되어야 합니다.

## 1. Canonical Model

TypeScript 패키지

```
packages/canonical-model
```

정의

예

```
Project
Requirement
Spec
Prototype
Review
Template
User
Team
AuditLog
```

---

## 2. Spec DSL Schema

정식 JSON Schema

```
feature.schema.json
workflow.schema.json
ui.schema.json
api.schema.json
policy.schema.json
```

---

## 3. OpenAPI Contract

서비스별

```
workspace-api
requirement-spec-api
prototype-factory-api
runtime-api
governance-api
```

OpenAPI YAML

---

# 최종 결론

이 PRD는 **컨셉과 방향성은 매우 강력합니다.**

특히

```
Agent collaboration
Spec-driven development
Git SSOT
Prototype factory
```

조합은 매우 미래지향적인 플랫폼 구조입니다.

하지만 현재 상태는

```
Architecture vision
```

이지

```
Engineering contract
```

이 아닙니다.

---

# 한 문장 결론

```
Architecture: Strong
Contracts: Missing
Execution: Conditional
```