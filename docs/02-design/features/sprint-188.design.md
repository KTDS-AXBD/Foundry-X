---
code: FX-DSGN-S188
title: Sprint 188 Design — F401 Production 배포 + harness-kit 문서화 + 개발자 가이드
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude Autopilot
sprint: 188
f_items: [F401]
req_ids: [FX-REQ-393]
phase: 20
---

# Sprint 188 Design — F401

> **설계 원칙**: 코드 변경 최소화, 문서 완성도 최대화. harness-kit의 실제 구현을 기반으로 실용적인 가이드 작성.

---

## 1. 구현 범위

### 1.1 산출물 목록

| 파일 | 유형 | 설명 |
|------|------|------|
| `packages/harness-kit/README.md` | 신규 문서 | harness-kit 퀵스타트 + API 레퍼런스 |
| `docs/specs/ax-bd-msa/developer-guide.md` | 신규 문서 | 새 서비스 생성 워크플로우 + harness-kit 통합 가이드 |
| `docs/specs/ax-bd-msa/migration-guide.md` | 신규 문서 | 모놀리스 → MSA 서비스 이관 절차 |
| `SPEC.md` | 기존 갱신 | F401 ✅ + Phase 20 ✅ |

### 1.2 코드 변경 없음
harness-kit 구현 코드(Sprint 179~184)와 모듈화 코드(Sprint 185~187)는 이미 완료됨.
이번 Sprint는 **문서화 전용**이에요.

---

## 2. 설계 상세

### 2.1 harness-kit README.md 구조

```
# @foundry-x/harness-kit

## Quick Start (3단계)
  1. 설치
  2. 설정
  3. 첫 번째 서비스

## API Reference
  ### createAuthMiddleware(config)
  ### createCorsMiddleware(config)
  ### rbac(minRole)
  ### errorHandler()
  ### createStranglerMiddleware(config)
  ### getDb(env) / runQuery() / runExec()
  ### D1EventBus / NoopEventBus
  ### harnessKitPlugin (ESLint)

## CLI
  ### harness create <service-name>

## ServiceId 목록
```

**설계 결정**: API 레퍼런스는 실제 src/types.ts, src/middleware/*.ts에서 추출. 예시 코드는 __tests__/*.test.ts에서 발췌하여 실제 동작이 검증된 코드만 사용.

### 2.2 개발자 가이드 (developer-guide.md) 구조

```
# AX BD MSA 개발자 가이드

## 1. 새 서비스 생성 (harness create)
   - harness create gate-x --service-id gate-x
   - 생성 파일 목록 설명
   - wrangler.toml 설정

## 2. harness-kit 통합
   - app.ts 설정 패턴
   - 미들웨어 스택 설정

## 3. 서비스 간 통신
   - REST API 호출 패턴
   - D1EventBus 이벤트 발행/구독

## 4. 로컬 개발
   - wrangler dev 실행
   - D1 로컬 DB 설정

## 5. 배포
   - CI/CD (deploy.yml 패턴)
   - 수동 배포
```

### 2.3 마이그레이션 가이드 (migration-guide.md) 구조

```
# 모놀리스 → MSA 마이그레이션 가이드

## 1. Strangler Fig 패턴 개요
   - Foundry-X에서의 적용 방식

## 2. 모듈 분리 체크리스트
   - E2E 서비스 태그 확인
   - D1 테이블 ownership 확인
   - 크로스 서비스 import ESLint 통과

## 3. 단계별 이관 절차
   Phase 1: 코드 분리 (modules/ 디렉토리)
   Phase 2: harness create <service>
   Phase 3: 코드 복사 + 의존성 처리
   Phase 4: 독립 배포 검증

## 4. 실전 예시 — Gate-X 이관
   - Sprint 187 PoC 결과 기반

## 5. 트러블슈팅
   - FK 의존성 처리
   - JWT 공유 방법
   - CORS 설정
```

### 2.4 Production Smoke Test

기존 `scripts/smoke-test.sh`를 실행하여 결과를 확인해요.

**기대 결과:**
```
API: https://foundry-x-api.ktds-axbd.workers.dev
Web: https://fx.minu.best
✅ GET / (root health)       HTTP 200
✅ GET /api/openapi.json     HTTP 200
✅ GET /api/docs             HTTP 200
✅ POST /api/auth/login      HTTP 400|401|422
✅ GET /api/health (401)     HTTP 401
✅ Landing page              HTTP 200
Results: 6 passed, 0 failed
```

---

## 3. 성공 기준 (§2.2)

| 기준 | 검증 방법 |
|------|-----------|
| smoke-test.sh 0 FAIL | 스크립트 실행 결과 확인 |
| harness-kit README 존재 | `ls packages/harness-kit/README.md` |
| 개발자 가이드 존재 | `ls docs/specs/ax-bd-msa/developer-guide.md` |
| 마이그레이션 가이드 존재 | `ls docs/specs/ax-bd-msa/migration-guide.md` |
| SPEC.md F401 ✅ | grep F401 SPEC.md |

---

## 5. Worker 파일 매핑

단일 작업자(Claude 직접 구현):

| 파일 | 작업 |
|------|------|
| `packages/harness-kit/README.md` | 신규 생성 |
| `docs/specs/ax-bd-msa/developer-guide.md` | 신규 생성 |
| `docs/specs/ax-bd-msa/migration-guide.md` | 신규 생성 |
| `SPEC.md` | F401 ✅ + Phase 20 ✅ 업데이트 |
