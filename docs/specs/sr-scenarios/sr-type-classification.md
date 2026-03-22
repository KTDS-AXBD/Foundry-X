---
code: FX-SPEC-SR-001
title: SR 유형 분류 체계
version: "1.0"
status: Active
category: SPEC
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# SR 유형 분류 체계

## 개요

KT DS SR(Service Request) 처리 자동화를 위한 유형 분류 체계예요.
SR 제목과 설명 텍스트를 분석해 5종 유형으로 자동 분류하고, 유형별 최적 에이전트 워크플로우를 선택해요.

---

## 1. 유형 정의 (5종)

| srType | 한국어 명칭 | 설명 | 예시 |
|--------|------------|------|------|
| `security_patch` | 보안 패치 | CVE, OWASP 취약점, 인증/인가 버그 | "JWT 알고리즘 none 취약점 패치" |
| `bug_fix` | 버그 수정 | 기능 오작동, 런타임 에러, 데이터 불일치 | "로그인 후 세션 만료 오류" |
| `env_config` | 환경 설정 | 환경변수, 타임아웃, 연결 설정 변경 | "DB 커넥션 풀 사이즈 조정" |
| `doc_update` | 문서 업데이트 | README, API 명세, 주석 업데이트 | "사용자 API 응답 형식 문서화" |
| `code_change` | 코드 변경 | 신규 기능 추가, 리팩토링, 일반 코드 변경 | "사용자 활동 로그 API 추가" |

---

## 2. 키워드/패턴 기반 분류 알고리즘

### 2.1 처리 흐름

```
입력: title (string) + description (string)
  ↓
텍스트 정규화 (소문자 변환, 연속 공백 제거)
  ↓
5종 유형별 키워드 매칭 (각 유형의 hitCount 집계)
  ↓
confidence = hitCount / totalKeywordsForType (0.0~1.0)
  ↓
최고 confidence 유형 선택
  ↓
confidence < 0.5? → 'code_change' 폴백
  ↓
출력: { srType, confidence, matchedKeywords }
```

### 2.2 키워드 사전 (전체)

#### security_patch
```
cve, 취약점, vulnerability, owasp, 인증우회, authentication bypass,
xss, cross-site scripting, sql injection, sqli, rce, 원격코드실행,
csrf, 보안, security, 패치, patch, exploit, 공격, injection
```

#### bug_fix
```
버그, bug, 오류, 에러, error, 500, crash, 오작동, malfunction,
수정, fix, hotfix, 긴급, 장애, incident, 재현, reproduce,
stacktrace, npe, nullpointerexception, 비정상, abnormal
```

#### env_config
```
환경변수, env, config, 설정, configuration, timeout, 타임아웃,
커넥션풀, connection pool, 포트, port, 호스트, host, url 변경,
.env, wrangler, yml, yaml, 인프라설정
```

#### doc_update
```
readme, 문서, documentation, 주석, comment, api spec, swagger,
openapi, jsdoc, 명세, spec 업데이트, 가이드, guide, 위키, wiki
```

#### code_change
```
추가, add, 구현, implement, 신규, new, endpoint, 기능, feature,
개발, develop, 리팩토링, refactor, 개선, improve, 확장, extend,
api 추가, 모듈, module
```

### 2.3 동점 처리

복수 유형의 confidence가 동일한 경우, 우선순위 순서로 선택해요:
`security_patch > bug_fix > code_change > env_config > doc_update`

---

## 3. 에이전트 매핑

유형별로 Foundry-X 에이전트 팀의 어떤 에이전트가 몇 번 순서로 실행되는지 정의해요.

| srType | 에이전트 순서 | 예상 소요 |
|--------|-------------|----------|
| `security_patch` | SecurityAgent → PlannerAgent → TestAgent → ReviewerAgent | ~30분 |
| `bug_fix` | QAAgent → PlannerAgent → TestAgent → SecurityAgent → ReviewerAgent | ~25분 |
| `env_config` | PlannerAgent → ReviewerAgent | ~8분 |
| `doc_update` | PlannerAgent → ReviewerAgent | ~5분 |
| `code_change` | PlannerAgent → ArchitectAgent → TestAgent → ReviewerAgent | ~18분 |

에이전트 타입은 기존 `AgentTaskType` enum을 그대로 사용해요. 추가 개발 없이 SR 워크플로우에 연결해요.

---

## 4. 분류 정확도 기준

- 목표 정확도: ≥ 90% (5종 유형 × 10 테스트케이스 기준)
- confidence 하한: 0.5 (미만 시 `code_change` 폴백)
- 모호 케이스 처리: 복합 유형(예: 보안 관련 버그) → 더 높은 confidence 유형 선택

---

## 5. Phase 5b ML 확장 계획

현재 Phase 5a는 키워드 기반 규칙 엔진으로 구현해요. Phase 5b에서 ML로 전환 예정이에요.

| 항목 | Phase 5a (현재) | Phase 5b (예정) |
|------|----------------|----------------|
| 분류 방식 | 키워드 매칭 | 임베딩 기반 분류 |
| 학습 데이터 | 없음 | SR 처리 이력 자동 수집 |
| 모델 | 규칙 엔진 | LightGBM 또는 zero-shot LLM |
| 전환 기준 | — | SR 이력 500건 이상 |

Phase 5a 구현에서 `matched_keywords`, `confidence`를 D1에 모두 저장하는 이유는 Phase 5b 학습 데이터 수집을 위해서예요.

---

## 참조
- Plan: `[[FX-PLAN-044]]`
- Design: `[[FX-DSGN-044]]`
- 시나리오 A: `[[FX-SPEC-SR-002]]`
- 시나리오 B: `[[FX-SPEC-SR-003]]`
