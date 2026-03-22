---
code: FX-GUID-003
title: "외부 AI API 데이터 거버넌스 정책"
version: 1.0
status: Active
category: GUID
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
references:
  - "[[FX-SPEC-001]] F166"
  - "[[FX-PLAN-047]]"
  - "prd-v8-final.md §6.4, §13.2"
---

# 외부 AI API 데이터 거버넌스 정책

## 1. 목적

이 문서는 Foundry-X가 외부 AI API (Anthropic Claude, OpenAI, OpenRouter 등)를 호출할 때 **데이터 분류, 반출 제한, 마스킹, 보존/삭제** 정책을 정의해요.
PRD v8 Conditional 조건 #5 (Q14: 외부 AI API 데이터 거버넌스 정책)을 해소하기 위한 공식 정책이에요.

## 2. 데이터 분류 체계

### 2.1 4단계 분류

| 등급 | 명칭 | 정의 | 예시 |
|:----:|------|------|------|
| L1 | **Public** | 공개 가능한 정보 | 오픈소스 코드, 공개 API 문서, 기술 블로그 |
| L2 | **Internal** | 사내 공유 정보 | 내부 코드, 아키텍처 문서, 회의록 |
| L3 | **Confidential** | 기밀 정보 | 고객 데이터, 계약 정보, 사내 이메일 |
| L4 | **Restricted** | 극비 정보 | 주민번호, 비밀번호, API 키, 신용카드 |

### 2.2 분류 기준

- **자동 분류**: PII 마스킹 서비스가 정규식 패턴으로 L3/L4 자동 탐지
- **수동 분류**: 사용자가 프롬프트 작성 시 분류 등급 지정 가능
- **기본값**: 명시적 분류 없으면 **Internal (L2)** 적용
- **상향 조정**: 고객사 프로젝트 데이터는 최소 **Confidential (L3)** 이상

## 3. 외부 AI API 데이터 반출 규칙

### 3.1 등급별 전송 가능 여부

| 등급 | 외부 AI API 전송 | 조건 |
|:----:|:----------------:|------|
| L1 Public | ✅ 허용 | 제한 없음 |
| L2 Internal | ✅ 허용 | 감사 로그 기록 의무 |
| L3 Confidential | ⚠️ 조건부 | PII 마스킹 적용 후에만 전송 |
| L4 Restricted | ❌ 차단 | 어떤 경우에도 외부 전송 금지 |

### 3.2 마스킹 파이프라인

```
사용자 입력
  │
  ▼
[1단계] PromptGatewayService.sanitize()
  │     시스템 시크릿 마스킹 (password, JWT, URL)
  ▼
[2단계] PiiMaskerService.mask()
  │     PII 탐지/마스킹 (이메일, 전화번호, 주민번호 등)
  ▼
[3단계] 분류 등급 판정
  │     ├─ L4 Restricted 잔존 → ❌ 전송 차단
  │     ├─ L3 탐지 + 마스킹 완료 → ✅ 전송 허용
  │     └─ L1~L2 → ✅ 전송 허용
  ▼
[4단계] AuditLogService.logEvent()
  │     감사 로그 기록 (전송 여부, 마스킹 내역)
  ▼
LLMService.generate()  →  외부 AI API
```

### 3.3 PII 마스킹 패턴

| 패턴명 | 대상 | 분류 | 마스킹 전략 | 결과 예시 |
|--------|------|:----:|-------------|-----------|
| email | 이메일 주소 | L3 | redact | `[EMAIL_REDACTED]` |
| phone_kr | 한국 전화번호 | L3 | partial | `010-****-1234` |
| ssn_kr | 주민등록번호 | L4 | redact | `[SSN_REDACTED]` |
| employee_id | 사번 | L2 | hash | `[EMP:sha256:abc12]` |
| ip_address | IP 주소 | L2 | partial | `192.168.*.*` |
| credit_card | 신용카드 번호 | L4 | redact | `[CARD_REDACTED]` |

## 4. AI API 응답 데이터 관리

### 4.1 응답 캐시

- **캐시 허용**: L1~L2 등급 응답만 KV 캐시 저장 허용
- **캐시 금지**: L3~L4 등급 응답은 캐시 저장 금지 (메모리만)
- **TTL**: 기본 24시간 (테넌트 설정으로 조정 가능)

### 4.2 응답 보존/삭제

| 데이터 | 보존 기간 | 삭제 방식 |
|--------|-----------|-----------|
| 감사 로그 | 1년 (기본) | soft delete (법적 요구) |
| AI 응답 캐시 (L1~L2) | 24시간 | TTL 자동 삭제 |
| AI 응답 (L3~L4) | 미저장 | N/A |
| 프롬프트 원본 | 미저장 | SHA-256 해시만 보존 |
| 마스킹 전 원본 | 미저장 | 마스킹 후 즉시 폐기 |

## 5. KT DS 보안 정책 준수

### 5.1 사내 보안 체크리스트 매핑

별도 문서 참조: [[FX-GUID-004]] `security-checklist.md`

### 5.2 네트워크 보안

- 외부 AI API 호출은 **HTTPS만** 허용 (TLS 1.2+)
- 사내망에서 외부 API 접근 시 프록시 경유 가능 (환경변수 설정)
- API 키는 환경변수/Secrets Manager에만 저장 (코드/DB 저장 금지)

### 5.3 접근 제어

- 외부 AI API 호출 권한은 **admin, user 역할만** 허용 (guest 차단)
- API 키 로테이션: 90일 주기 권장
- 호출 빈도 제한: 테넌트별 rate limiting (기본 100 req/min)

## 6. 규제 산업 대응

### 6.1 금융/공공 고객사 추가 요구사항

| 요구사항 | 대응 방안 |
|----------|-----------|
| 데이터 국내 보관 의무 | Azure Korea Central 리전 사용 |
| AI 사용 고지 의무 | 감사 로그 + 사용자 고지 UI |
| 데이터 삭제 요청권 | 테넌트별 데이터 퍼지 API |
| 감사 추적 의무 | 감사 로그 1년 보존 (연장 가능) |

### 6.2 향후 자동화 계획

- L3/L4 자동 분류 정확도 향상: 정규식 → ML 기반 NER (Sprint 48+)
- 라이선스 자동 스캐너 연동 (F165 확장)
- 외부 AI API 호출 비용 모니터링 + 알림
