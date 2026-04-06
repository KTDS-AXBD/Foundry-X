---
code: FX-ADR-001
title: "ADR-001: D1 Shared DB 논리적 분리 전략"
version: "1.0"
status: Accepted
category: ADR
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint 179 Autopilot)
decision-date: 2026-04-07
---

# ADR-001: D1 Shared DB 논리적 분리 전략

## 상태

**Accepted** — Phase 20-A (Sprint 179~184) 기간 적용

## 컨텍스트

Foundry-X는 단일 D1 데이터베이스(`foundry-x-db`)에 174개 테이블, 123건 마이그레이션을 보유하고 있다. Phase 20 MSA 재조정에서 이 테이블들을 7개 서비스로 분류해야 한다.

### 핵심 의존성 데이터

- `biz_items` 테이블: 30회 FK 참조 (S3, S4, S5, S6에서 참조)
- `organizations` 테이블: 25회 FK 참조 (전 서비스)
- `users` 테이블: 7회 FK 참조 (전 서비스)

### 고려한 선택지

1. **즉시 물리적 분리**: 서비스별 별도 D1 DB 생성
2. **Shared DB + 논리적 분리**: 단일 DB 유지, 소유권 태깅 + 접근 정책
3. **하이브리드**: 일부 분리 (예: Auth DB만 분리)

## 결정

**Option 2: Shared DB + 논리적 분리** 채택

Phase 20에서는 물리적 DB 분리를 하지 않는다. 대신:

1. **테이블 소유권 태깅**: 각 테이블에 서비스 코드(S0~SX) 태깅
2. **크로스 서비스 FK 식별**: `biz_items.id`, `organizations.id`, `users.id` 등 공유 키 문서화
3. **서비스별 접근 정책**: ESLint 룰로 모듈 경계 강제 (Sprint 180~)
4. **이벤트 패턴 준비**: 향후 물리적 분리 시 사용할 이벤트 스키마 정의 (Sprint 185)

## 이유

### Option 1 기각 이유
- `biz_items` 30 FK, `organizations` 25 FK — 즉시 분리하면 30+25 = 55개 FK를 동시에 해소해야 함
- Cloudflare D1은 Cross-DB JOIN 불가 — 분리 즉시 모든 JOIN 쿼리 리팩토링 필요
- 회귀 테스트 범위가 전체 263 E2E + 전체 API 테스트로 확대
- 롤백 비용이 매우 높음 (DB 분리 + 데이터 마이그레이션 + 코드 변경)

### Option 2 채택 이유
- **롤백 비용 0**: 코드 구조 변경만이므로 `git revert`로 즉시 복원
- **검증 우선**: 모듈 경계가 올바른지 단일 DB에서 먼저 확인
- **점진적 전환**: 논리적 분리 → 이벤트 패턴 → 물리적 분리 순서
- **기존 테스트 100% 재사용**: DB 구조 변경 없이 E2E/API 테스트 통과

### Option 3 기각 이유
- Auth DB만 분리해도 `users.id` 7 FK + `organizations.id` 25 FK 해소 필요
- 부분 분리는 복잡도만 증가시키고 이점이 제한적

## 결과

### Phase 20-A (Sprint 179~184): 논리적 분리
- 테이블 소유권 태깅 완료 (이 ADR과 동시)
- ESLint 크로스모듈 접근 금지 룰 추가 (Sprint 180)
- 모듈별 디렉토리 분리 (Sprint 181~184)

### Phase 20-B (Sprint 185~188): 분리 준비
- 이벤트 카탈로그 8종 스키마 확정
- EventBus PoC (D1 Event Table + Cron Trigger)
- Strangler Fig 프록시 레이어

### Phase 20 이후: 물리적 분리
- 서비스별 D1 DB 생성 (`harness create` 사용)
- 이중 쓰기(Dual Write) 전환기
- 이벤트 기반 eventual consistency

## 참조

- PRD §7c: D1 데이터 분리 전략
- PRD §7c.4: Cloudflare Workers 환경 특화 사항
- d1-ownership.md: 테이블 소유권 + FK 분석 결과
