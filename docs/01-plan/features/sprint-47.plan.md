---
code: FX-PLAN-047
title: "Sprint 47 — 커스터마이징 범위 + 법적/윤리/거버넌스 정책 (F164+F165+F166)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-47
sprint: 47
phase: "Phase 5"
references:
  - "[[FX-PLAN-046]]"
  - "[[FX-SPEC-001]]"
  - "prd-v8-final.md"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F164: 커스터마이징 범위 정의 + 플러그인 시스템 / F165: AI 코드 법적/윤리 정책 / F166: 데이터 거버넌스 정책 |
| Sprint | 47 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5 — PRD v8 Conditional 선결 조건 #3, #5 해소 |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 커스터마이징 정의서 | 5-레이어 커스터마이징 범위 + 플러그인 아키텍처 설계 1건 |
| 법적/윤리 정책 | AI 코드 가이드라인 + 감사 로그 API 엔드포인트 |
| 거버넌스 정책 | 데이터 반출 정책 + PII 마스킹 미들웨어 + 보안 체크리스트 |
| 테스트 | 감사 로그 API + PII 마스킹 서비스 테스트 |
| 문서 | 정책 문서 3건 + 커스터마이징 가이드 + 고객 제안서 부속 자료 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | PRD v8 Conditional 5개 중 #3(커스터마이징 범위 미정)과 #5(법적/윤리/거버넌스 정책 부재)가 미해소. 고객사 제안 시 "어디까지 커스터마이징 가능한가", "AI 생성 코드 저작권은 누구에게 있나", "데이터가 외부로 나가는가"에 답할 수 없음 |
| **Solution** | F164: 5-레이어 커스터마이징 범위 정의 + 플러그인 시스템 아키텍처 설계. F165: AI 생성 코드 가이드라인 + 감사 로그 API. F166: 데이터 반출 정책 + PII 마스킹 미들웨어 |
| **Function UX Effect** | 고객사 담당자가 제안서에서 커스터마이징 옵션 매트릭스를 확인하고, 감사 로그로 AI 생성물 이력 추적 가능. 기밀정보가 외부 API로 전송되기 전 자동 마스킹 |
| **Core Value** | PRD v8 Conditional → Ready 전환 4/5 해소. "커스터마이징 가능 범위"와 "데이터 보안 보장"을 고객 제안서에 정량적으로 포함 가능 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

Sprint 47은 **정책 문서 + 코드 구현 병행** Sprint — 커스터마이징 범위 설계와 법적/거버넌스 정책을 문서로 확정하고, 핵심 기술 구현(감사 로그, PII 마스킹)까지 수행.

| 유형 | F# | 작업 | 완료 기준 |
|:----:|:--:|------|-----------|
| 아키텍처 | F164 | 커스터마이징 범위 + 플러그인 시스템 설계 | 5-레이어 범위 정의서 + 플러그인 인터페이스 설계 + 표준 템플릿 |
| 정책+코드 | F165 | AI 코드 법적/윤리 정책 + 감사 로그 | 가이드라인 문서 + audit-log API 2개 + 테스트 |
| 정책+코드 | F166 | 데이터 거버넌스 + PII 마스킹 | 정책 문서 + pii-masker 미들웨어 + 보안 체크리스트 + 테스트 |

### 1.2 PRD v8 Conditional 조건 매핑

| PRD 조건 | 이번 Sprint | 비고 |
|----------|:-----------:|------|
| #1 SI 파트너 R&R 확정 (F163) | ✅ Sprint 46 | 완료 |
| #2 Azure 마이그레이션 PoC (F162) | ✅ Sprint 46 | 완료 |
| #3 고객 커스터마이징 범위 (F164) | ✅ Sprint 47 | **이번 Sprint 해소** |
| #4 내부 Adoption 데이터 (F114) | 🔄 진행 중 | 4주 수집 병행 (약 2주 경과) |
| #5 법적/윤리적 정책 (F165, F166) | ✅ Sprint 47 | **이번 Sprint 해소** |

→ Sprint 47 완료 시 **5개 중 4개 해소**, #4만 데이터 수집 대기

### 1.3 PRD 오픈이슈 해소 매핑

| 오픈이슈 | 해소 F# | 설명 |
|----------|---------|------|
| Q12 | F164 | 고객사별 커스터마이징 범위 정의 |
| Q13 | F165 | AI 생성 코드 법적/윤리적 정책 수립 |
| Q14 | F166 | 외부 AI API 데이터 거버넌스 정책 |

---

## 2. 범위 (Scope)

### 2.1 In Scope

#### F164: 커스터마이징 범위 정의 + 플러그인 시스템 설계

- [ ] **5-레이어 커스터마이징 범위 정의서** (정책 문서)
  - [ ] Layer 1: 배포 환경 커스터마이징 (Azure/Cloudflare/On-premise, 환경변수 기반)
  - [ ] Layer 2: 인증/SSO 커스터마이징 (JWT/SAML/OAuth, 고객사 IdP 연동)
  - [ ] Layer 3: DB 스키마 커스터마이징 (커스텀 필드, 테넌트별 확장 테이블)
  - [ ] Layer 4: UI 테마/레이아웃 커스터마이징 (CSS 변수, 컴포넌트 슬롯)
  - [ ] Layer 5: 워크플로우/에이전트 커스터마이징 (에이전트 구성, DAG 편집)
- [ ] **플러그인 시스템 아키텍처 설계** (기술 문서)
  - [ ] 플러그인 인터페이스 정의 (PluginManifest, PluginHook, PluginSlot)
  - [ ] 확장 포인트(Extension Point) 매핑 — 기존 76개 서비스 중 플러그인화 대상 선별
  - [ ] 플러그인 생명주기 (install → activate → configure → deactivate → uninstall)
  - [ ] 보안 샌드박스: 플러그인 권한 모델 (read-only, write, admin 3단계)
- [ ] **커스터마이징 옵션 매트릭스** (고객 제안서 부속)
  - [ ] 레이어별 가능/불가능/옵션 매트릭스 (Standard / Professional / Enterprise 3 tier)
  - [ ] 커스터마이징 책임 주체 (내부 개발자 / SI 파트너 / 고객사) 매핑
- [ ] **표준 템플릿**: 커스터마이징 요청서 양식 (고객사 → PM 접수용)

#### F165: AI 생성 코드 법적/윤리적 정책 + 감사 로그

- [ ] **AI 코드 가이드라인 문서** (정책 문서)
  - [ ] 저작권 귀속 정책: AI 생성 코드의 저작권 주체 (회사/고객사/공동 보유)
  - [ ] 오픈소스 라이선스 관리: AI가 생성한 코드의 라이선스 오염 방지 절차
  - [ ] 코드 리뷰 의무: AI 생성물의 사람 검토 의무 범위 (자동 커밋 금지 원칙 확장)
  - [ ] 책임 분장: AI 생성 코드로 인한 장애 시 책임 체계
- [ ] **감사 로그 API 구현** (코드)
  - [ ] `AuditLogService` — AI 생성물 이력 기록 (프롬프트 해시, 모델, 생성 시간, 승인자)
  - [ ] D1 마이그레이션: `audit_logs` 테이블 (0029)
  - [ ] `POST /api/audit/log` — 감사 이벤트 기록
  - [ ] `GET /api/audit/logs` — 감사 로그 조회 (필터: 날짜, 모델, 에이전트, 승인 상태)
  - [ ] Zod 스키마: `audit.ts`
  - [ ] 테스트: AuditLogService + 라우트 테스트

#### F166: 외부 AI API 데이터 거버넌스 + PII 마스킹

- [ ] **데이터 거버넌스 정책 문서** (정책 문서)
  - [ ] 데이터 분류 체계: 공개(Public) / 내부(Internal) / 기밀(Confidential) / 극비(Restricted)
  - [ ] 데이터 반출 규칙: 분류 등급별 외부 AI API 전송 가능 여부
  - [ ] KT DS 보안 체크리스트: 사내 보안 정책 준수 항목 매핑
  - [ ] 데이터 보존/삭제 정책: AI API 응답 캐시 보존 기간, 삭제 절차
- [ ] **PII 마스킹 미들웨어 구현** (코드)
  - [ ] `PiiMaskerService` — 정규식 + 패턴 기반 PII 탐지/마스킹
    - 이메일, 전화번호, 주민번호, 사번, IP 주소, 신용카드 패턴
  - [ ] Hono 미들웨어: 외부 AI API 호출 전 request body 자동 마스킹
  - [ ] 마스킹 감사 로그: 마스킹 발생 시 audit_logs에 기록 (원본 미저장)
  - [ ] D1 마이그레이션: `data_classification_rules` 테이블 (0030)
  - [ ] `GET /api/governance/rules` — 데이터 분류 규칙 조회
  - [ ] `PUT /api/governance/rules/:id` — 분류 규칙 수정 (admin only)
  - [ ] 테스트: PiiMaskerService + 미들웨어 + 라우트 테스트

### 2.2 Out of Scope

- 플러그인 런타임 구현 (설계만, 코드 구현은 Sprint 48+)
- 고객사 실제 SAML/OAuth IdP 연동 테스트 (범위 정의만)
- 법무팀 공식 검토/승인 (초안 작성까지, 검토는 별도 프로세스)
- ML 기반 PII 탐지 (정규식 패턴 기반만, NER 모델은 향후)
- 금융/공공 규제 대응 상세 (일반 체크리스트 수준)

---

## 3. 구현 전략 (Implementation Strategy)

### 3.1 작업 순서

```
Phase A: 정책 문서 (문서 작업, 코드 의존성 없음)
├─ F164-Doc: 커스터마이징 범위 정의서 + 옵션 매트릭스
├─ F165-Doc: AI 코드 가이드라인
└─ F166-Doc: 데이터 거버넌스 정책 + 보안 체크리스트

Phase B: 코드 구현 (Phase A 완료 후)
├─ F165-Code: AuditLogService + D1 0029 + API 2개
├─ F166-Code: PiiMaskerService + D1 0030 + 미들웨어 + API 2개
└─ F164-Arch: 플러그인 시스템 아키텍처 설계 (코드 인터페이스만)

Phase C: 통합 + 테스트
├─ 마스킹 → 감사 로그 연동 테스트
├─ 기존 에이전트 서비스에 마스킹 미들웨어 적용
└─ 전체 테스트 + PDCA
```

### 3.2 Agent Team 전략

2-Worker Agent Team (Dynamic 패턴):

| Worker | 담당 | 산출물 |
|--------|------|--------|
| Worker 1 | F165: AuditLogService + audit route + D1 0029 + 테스트 | `audit-logger.ts`, `audit.ts` (route), `audit.ts` (schema), 0029 migration |
| Worker 2 | F166: PiiMaskerService + governance route + D1 0030 + 미들웨어 + 테스트 | `pii-masker.ts`, `governance.ts` (route), `governance.ts` (schema), 0030 migration |
| Leader | F164 아키텍처 설계 + 정책 문서 3건 + 통합 | 정책 문서, 플러그인 설계 문서, Worker 통합 |

### 3.3 파일 구조 (예상)

```
packages/api/src/
├── services/
│   ├── audit-logger.ts          # NEW: AuditLogService
│   └── pii-masker.ts            # NEW: PiiMaskerService
├── routes/
│   ├── audit.ts                 # NEW: /api/audit/* (2 endpoints)
│   └── governance.ts            # NEW: /api/governance/* (2 endpoints)
├── schemas/
│   ├── audit.ts                 # NEW: Zod schemas
│   └── governance.ts            # NEW: Zod schemas
├── middleware/
│   └── pii-masker.middleware.ts # NEW: Hono middleware
└── db/migrations/
    ├── 0029_audit_logs.sql      # NEW
    └── 0030_data_classification.sql # NEW

docs/policy/                      # NEW: 정책 문서 디렉토리
├── customization-scope.md        # F164: 커스터마이징 범위 정의서
├── ai-code-guidelines.md         # F165: AI 코드 가이드라인
├── data-governance.md            # F166: 데이터 거버넌스 정책
└── security-checklist.md         # F166: KT DS 보안 체크리스트
```

### 3.4 D1 마이그레이션 설계 (초안)

**0029_audit_logs.sql**:
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,        -- 'ai_generation', 'code_review', 'masking', 'approval'
  agent_id TEXT,
  model_id TEXT,
  prompt_hash TEXT,                -- SHA-256 (원본 프롬프트 미저장)
  input_classification TEXT,       -- 'public', 'internal', 'confidential', 'restricted'
  output_type TEXT,                -- 'code', 'test', 'document', 'review'
  approved_by TEXT,                -- 승인자 user_id (null이면 미승인)
  approved_at TEXT,
  metadata TEXT,                   -- JSON: 추가 컨텍스트
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
```

**0030_data_classification.sql**:
```sql
CREATE TABLE IF NOT EXISTS data_classification_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_name TEXT NOT NULL,      -- 'email', 'phone_kr', 'ssn_kr', 'employee_id', 'ip_address', 'credit_card'
  pattern_regex TEXT NOT NULL,
  classification TEXT NOT NULL,    -- 'public', 'internal', 'confidential', 'restricted'
  masking_strategy TEXT NOT NULL,  -- 'redact', 'hash', 'partial', 'tokenize'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_classification_tenant ON data_classification_rules(tenant_id, is_active);
```

---

## 4. 기술 고려사항 (Technical Considerations)

### 4.1 PII 마스킹 성능

- 외부 AI API 호출 전 마스킹은 **동기 처리** (latency 추가 최소화)
- 정규식 패턴은 사전 컴파일 후 캐시 (서비스 초기화 시)
- 대형 텍스트(>100KB)는 청크 분할 처리

### 4.2 감사 로그 보존

- 감사 로그는 **삭제 불가** (soft delete만, 법적 요구)
- 프롬프트 원본은 저장하지 않음 (SHA-256 해시만) — 개인정보 보호
- 보존 기간: 기본 1년 (tenant 설정으로 연장 가능)

### 4.3 플러그인 보안 샌드박스

- 플러그인은 허용된 서비스 API만 호출 가능 (화이트리스트 방식)
- DB 직접 접근 불가 — 반드시 서비스 레이어 경유
- 런타임 격리는 Sprint 48+에서 구현 (이번은 인터페이스 설계만)

### 4.4 기존 코드 영향도

| 기존 모듈 | 변경 내용 | 영향 |
|-----------|-----------|------|
| `services/llm.ts` | PII 마스킹 미들웨어 적용 지점 | 낮음 (미들웨어 추가만) |
| `services/prompt-gateway.ts` | 감사 로그 기록 호출 추가 | 낮음 (데코레이터 패턴) |
| `app.ts` | PII 마스킹 미들웨어 등록 | 낮음 (1줄 추가) |
| `index.ts` (routes) | audit, governance 라우트 등록 | 낮음 (2줄 추가) |

---

## 5. 리스크 (Risks)

| 리스크 | 확률 | 영향 | 완화 |
|--------|:----:|:----:|------|
| 플러그인 설계 범위 과다 | 중 | 중 | 설계만 하고 구현은 Sprint 48+로 분리 |
| PII 패턴 누락 (오탐/미탐) | 중 | 높 | 정규식 기반으로 시작, 패턴 DB 확장 가능 구조 |
| 법적 정책 검토 지연 | 높 | 낮 | 초안만 작성, 법무 공식 검토는 별도 트랙 |
| Worker 범위 이탈 | 중 | 중 | Positive File Constraint + File Guard 적용 |

---

## 6. 완료 기준 (Definition of Done)

- [ ] 정책 문서 3건 작성 완료 (커스터마이징, AI 코드, 거버넌스)
- [ ] 플러그인 시스템 아키텍처 설계 문서 1건
- [ ] 커스터마이징 옵션 매트릭스 (3-tier) + 표준 템플릿
- [ ] AuditLogService + 2 API endpoints + D1 0029 + 테스트
- [ ] PiiMaskerService + 2 API endpoints + D1 0030 + 미들웨어 + 테스트
- [ ] 기존 prompt-gateway에 감사 로그 연동
- [ ] 기존 LLM 서비스에 PII 마스킹 미들웨어 적용
- [ ] typecheck 에러 0건 + 전체 테스트 통과
- [ ] PDCA Match Rate ≥ 90%
