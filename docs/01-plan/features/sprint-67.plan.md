---
code: FX-PLAN-067
title: "Sprint 67 — F209 AI Foundry 흡수 + F210 비밀번호 재설정"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 67
features: [F209, F210]
req: [FX-REQ-201, FX-REQ-202]
prd: docs/specs/ax-bd-atoz/prd-final.md
depends-on: Sprint 58 (F181 Prototype 자동 생성)
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | AI Foundry가 독립 시스템으로 존재하여 Foundry-X와 기능 중복·산출물 불일치 발생. 사용자가 비밀번호를 분실하면 계정 복구 방법이 없음 |
| **Solution** | AI Foundry의 프로토타입/PoC 기능을 Foundry-X 내부 서비스로 통합하고, 이메일 기반 비밀번호 재설정 플로우를 구현 |
| **Function UX Effect** | 프로토타입 관리가 Foundry-X 단일 UI에서 가능 + "비밀번호 찾기" → 이메일 토큰 → 새 비밀번호 설정 |
| **Core Value** | 시스템 일원화로 운영 복잡도 제거. 비밀번호 재설정으로 인증 완성도 확보 — 팀 온보딩 장벽 해소 |

| 항목 | 값 |
|------|-----|
| Feature | F209 AI Foundry 흡수 + F210 비밀번호 재설정 |
| Sprint | 67 |
| PRD | FX-PLAN-AX-BD-001 (A-to-Z prd-final §4.6) |
| 선행 조건 | Sprint 58 완료 (F181 Prototype 자동 생성 ✅) |
| 병렬 대상 | F209와 F210은 파일 겹침 없음 — 병렬 구현 가능 |
| Worker 구성 | W1: F209 (AI Foundry 흡수), W2: F210 (비밀번호 재설정) |

---

## 1. Feature 상세

### F209 — AI Foundry 기능 흡수 (FX-REQ-201, P1)

**목표**: AI Foundry의 프로토타입/PoC 모듈을 Foundry-X 내부 서비스로 이관하여 단일 플랫폼으로 통합.

**배경 (PRD §4.6)**:
- 기존 `prototype-generator.ts`(F181)가 이미 프로토타입 생성 핵심 로직 보유
- AI Foundry의 독립 UI는 폐기, Foundry-X Web에서 관리
- PoC 환경 프로비저닝 + 기술 타당성 분석을 신규 서비스로 추가

**API Endpoints**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/ax-bd/prototypes/:id/poc-env` | PoC 환경 프로비저닝 요청 |
| 2 | GET | `/api/ax-bd/prototypes/:id/poc-env` | PoC 환경 상태 조회 |
| 3 | DELETE | `/api/ax-bd/prototypes/:id/poc-env` | PoC 환경 정리 (teardown) |
| 4 | POST | `/api/ax-bd/prototypes/:id/tech-review` | 기술 타당성 분석 요청 |
| 5 | GET | `/api/ax-bd/prototypes/:id/tech-review` | 기술 타당성 분석 결과 조회 |
| 6 | GET | `/api/ax-bd/prototypes` | 프로토타입 목록 (전체, 필터/정렬) |
| 7 | GET | `/api/ax-bd/prototypes/:id` | 프로토타입 상세 (버전 포함) |
| 8 | DELETE | `/api/ax-bd/prototypes/:id` | 프로토타입 삭제 |

**핵심 로직**:
- `poc-env-service.ts`: PoC 환경 관리 (상태: pending → provisioning → ready → teardown)
- `tech-review-service.ts`: 기술 타당성 분석 (AgentRunner 활용, 기술 스택 적합성/구현 난이도/리스크 평가)
- `prototype-service.ts`: 기존 `prototype-generator.ts`를 확장하여 목록/상세/삭제 CRUD 추가
- D1: `poc_environments` 테이블 + `tech_reviews` 테이블 (마이그레이션 0051, 0052)

**PoC 환경 상태 머신**:
```
pending → provisioning → ready → teardown → terminated
                ↓ (실패)
              failed
```

**기술 타당성 분석 출력**:
```json
{
  "feasibility": "high|medium|low",
  "stackFit": 85,
  "complexity": "medium",
  "risks": ["..."],
  "recommendation": "proceed|modify|reject",
  "estimatedEffort": "2 weeks"
}
```

**UI (Web)**:
- `/app/(app)/prototypes/` 페이지: 프로토타입 목록 + PoC 환경 상태 뱃지
- 프로토타입 상세에 "PoC 환경 생성" / "기술 검증 요청" 버튼 추가
- 기존 `biz-items` 상세의 프로토타입 섹션과 연동

### F210 — 비밀번호 재설정 (FX-REQ-202, P2)

**목표**: 이메일 기반 비밀번호 재설정 플로우 구현으로 인증 완성도 확보.

**API Endpoints**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/auth/forgot-password` | 재설정 이메일 발송 요청 |
| 2 | GET | `/api/auth/reset-password/:token` | 토큰 유효성 검증 |
| 3 | POST | `/api/auth/reset-password` | 새 비밀번호 설정 |

**핵심 로직**:
- `password-reset-service.ts`: 토큰 생성(crypto.randomUUID), 만료 관리(1시간), 사용 후 폐기
- D1: `password_reset_tokens` 테이블 (마이그레이션 0053)
- 이메일 발송: Workers 환경에서 Resend/Mailgun API 또는 `fetch()` 기반 이메일 서비스
- 보안: 토큰은 1회 사용, 1시간 만료, 사용자 존재 여부 미노출 (항상 200 응답)

**D1 스키마 — `password_reset_tokens`**:
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_prt_user ON password_reset_tokens(user_id);
```

**플로우**:
```
1. POST /auth/forgot-password { email }
   → 사용자 조회 → 토큰 생성 → 이메일 발송 → 200 (항상)
2. GET /auth/reset-password/:token
   → 토큰 유효성 + 만료 확인 → 200 { valid: true } | 410 { valid: false }
3. POST /auth/reset-password { token, newPassword }
   → 토큰 검증 → 비밀번호 해싱 → users 업데이트 → 토큰 사용 처리 → 200
```

**UI (Web)**:
- 로그인 페이지에 "비밀번호를 잊으셨나요?" 링크
- `/auth/forgot-password` 페이지: 이메일 입력 폼
- `/auth/reset-password/[token]` 페이지: 새 비밀번호 입력 폼

**보안 고려사항**:
- 이메일 미등록 시에도 동일 200 응답 (사용자 열거 공격 방지)
- 토큰 1시간 만료 + 1회 사용 제한
- 비밀번호 변경 시 기존 refresh token 전체 폐기 (세션 강제 만료)
- Rate limiting: IP당 5분에 3회 (abuse 방지)

---

## 2. 기술 설계 요약

### D1 마이그레이션

| # | 파일명 | 내용 |
|---|--------|------|
| 0051 | `0051_poc_environments.sql` | PoC 환경 관리 테이블 |
| 0052 | `0052_tech_reviews.sql` | 기술 타당성 분석 결과 테이블 |
| 0053 | `0053_password_reset_tokens.sql` | 비밀번호 재설정 토큰 테이블 |

### 서비스 파일

| 서비스 | 위치 | 역할 |
|--------|------|------|
| `poc-env-service.ts` | services/ | PoC 환경 프로비저닝 상태 관리 |
| `tech-review-service.ts` | services/ | 기술 타당성 자동 분석 |
| `prototype-service.ts` | services/ | 기존 prototype-generator 확장 CRUD |
| `password-reset-service.ts` | services/ | 비밀번호 재설정 토큰 관리 |
| `email-service.ts` | services/ | 이메일 발송 (Workers fetch) |

### 라우트 파일

| 라우트 | 위치 | 엔드포인트 |
|--------|------|-----------|
| `ax-bd-prototypes.ts` | routes/ | 프로토타입+PoC+기술검증 (8 endpoints) |
| `auth.ts` (기존 확장) | routes/ | 비밀번호 재설정 (3 endpoints 추가) |

### 스키마 파일

| 스키마 | 위치 | 용도 |
|--------|------|------|
| `prototype-ext.ts` | schemas/ | PoC 환경 + 기술 검증 Zod 스키마 |
| `password-reset.ts` | schemas/ | 비밀번호 재설정 Zod 스키마 |

---

## 3. 테스트 계획

| 영역 | 파일 | 테스트 수 (예상) |
|------|------|-----------------|
| PoC 환경 서비스 | `poc-env-service.test.ts` | ~12 |
| 기술 검증 서비스 | `tech-review-service.test.ts` | ~10 |
| 프로토타입 CRUD | `prototype-service.test.ts` | ~10 |
| 프로토타입 라우트 | `ax-bd-prototypes.test.ts` | ~15 |
| 비밀번호 재설정 서비스 | `password-reset-service.test.ts` | ~12 |
| 비밀번호 재설정 라우트 | `auth-password-reset.test.ts` | ~10 |
| 이메일 서비스 | `email-service.test.ts` | ~5 |
| **합계** | | **~74** |

---

## 4. 리스크 & 완화

| # | 리스크 | 영향 | 완화 |
|---|--------|------|------|
| 1 | PoC 환경 실제 프로비저닝은 외부 인프라 의존 | 중 | Sprint 67에서는 상태 관리만 구현, 실제 프로비저닝은 Phase 2 |
| 2 | 이메일 발송 실패 (Workers 환경 제약) | 중 | 이메일 서비스를 인터페이스로 추상화, 초기에는 로그 기반 확인 |
| 3 | 기존 prototype-generator 변경 시 F181 테스트 깨짐 | 저 | 기존 서비스는 래퍼로 감싸고, 새 기능은 별도 서비스에 구현 |

---

## 5. Worker 파일 매핑

### W1: F209 — AI Foundry 흡수 (Track A)

**수정/생성 파일**:
- `packages/api/src/db/migrations/0051_poc_environments.sql` (신규)
- `packages/api/src/db/migrations/0052_tech_reviews.sql` (신규)
- `packages/api/src/services/poc-env-service.ts` (신규)
- `packages/api/src/services/tech-review-service.ts` (신규)
- `packages/api/src/services/prototype-service.ts` (신규 — CRUD 래퍼)
- `packages/api/src/schemas/prototype-ext.ts` (신규)
- `packages/api/src/routes/ax-bd-prototypes.ts` (신규)
- `packages/api/src/__tests__/poc-env-service.test.ts` (신규)
- `packages/api/src/__tests__/tech-review-service.test.ts` (신규)
- `packages/api/src/__tests__/prototype-service.test.ts` (신규)
- `packages/api/src/__tests__/ax-bd-prototypes.test.ts` (신규)
- `packages/api/src/index.ts` (라우트 등록)

### W2: F210 — 비밀번호 재설정 (Track B)

**수정/생성 파일**:
- `packages/api/src/db/migrations/0053_password_reset_tokens.sql` (신규)
- `packages/api/src/services/password-reset-service.ts` (신규)
- `packages/api/src/services/email-service.ts` (신규)
- `packages/api/src/schemas/password-reset.ts` (신규)
- `packages/api/src/routes/auth.ts` (기존 확장)
- `packages/api/src/__tests__/password-reset-service.test.ts` (신규)
- `packages/api/src/__tests__/auth-password-reset.test.ts` (신규)
- `packages/api/src/__tests__/email-service.test.ts` (신규)

---

## 6. 완료 기준

- [ ] F209: 프로토타입 CRUD + PoC 환경 관리 + 기술 타당성 분석 API 구현 + 테스트 통과
- [ ] F210: 비밀번호 재설정 3 endpoints 구현 + 토큰 관리 + 이메일 서비스 + 테스트 통과
- [ ] D1 마이그레이션 0051~0053 로컬 적용
- [ ] typecheck + lint 통과
- [ ] 전체 기존 테스트 회귀 없음
