# 모놀리스 → MSA 마이그레이션 가이드

> **목적**: Foundry-X 모놀리스에서 독립 서비스로 특정 기능을 이관하는 절차  
> **패턴**: Strangler Fig (점진적 이관, 운영 중단 없음)  
> **현재 상태**: Phase 20 완료 — 코드 분리 완료, 실제 이관은 Phase 21+

---

## 1. Strangler Fig 패턴 개요

```
Phase 1 (현재): 모놀리스 내 모듈 경계 정의
┌─────────────────────────────────┐
│ Foundry-X Workers               │
│  ├── modules/auth/    (S0)      │
│  ├── modules/portal/  (S0)      │
│  ├── modules/gate/    (S4) ←분리│
│  ├── modules/launch/  (S5) ←분리│
│  └── modules/core/    (S3) 핵심 │
└─────────────────────────────────┘

Phase 2 (향후): Strangler 프록시 + 독립 서비스
┌─────────────────┐    프록시    ┌──────────────┐
│ Foundry-X       │ ──────────> │ Gate-X       │
│ (Strangler)     │             │ Workers      │
│ /api/gate/*     │             └──────────────┘
│ /api/launch/*   │ ──────────> ┌──────────────┐
│                 │    프록시    │ Launch-X     │
│ /api/discovery/ │             │ Workers      │
│ (여전히 로컬)   │             └──────────────┘
└─────────────────┘
```

---

## 2. 서비스별 이관 우선순위

Phase 20에서 정의된 서비스 경계 (service-mapping.md 기반):

| 서비스 | 코드 | 이관 대상 기능 | 이관 우선순위 |
|--------|------|----------------|--------------|
| Foundry-X (핵심 유지) | S3 | 발굴(S1) + 형상화(S3) | — |
| Gate-X | S4 | 검증, 의사결정, 평가 | P1 (다음) |
| Launch-X | S5 | 제품화, GTM, 아웃리치 | P2 |
| Auth/Portal | S0 | 인증, 대시보드, Wiki | P3 |
| Eval-X | S6 | KPI, ROI, 벤치마크 | P4 |

---

## 3. 이관 사전 체크리스트

새 서비스로 기능을 이관하기 **전에** 반드시 확인해야 해요.

### 3.1 E2E 서비스 태그 확인

```bash
# gate-x 관련 E2E spec이 태깅됐는지 확인
grep -r "@service: gate-x" packages/web/e2e/
# 예상 결과: validation-basic.spec.ts, decisions.spec.ts 등
```

### 3.2 D1 테이블 Ownership 확인

```bash
# gate-x 소유 테이블 목록 (d1-ownership.md 참조)
grep "gate-x" docs/specs/ax-bd-msa/d1-ownership.md
```

Gate-X 소유 테이블 (참고):
- `decisions` — 의사결정
- `validation_results` — 검증 결과

### 3.3 크로스 서비스 Import ESLint

```bash
# 현재 크로스 서비스 import 위반 확인
cd packages/api
pnpm lint 2>&1 | grep "no-cross-service-import"
```

위반이 0건이어야 이관이 안전해요.

### 3.4 테스트 통과 확인

```bash
# 전체 테스트
turbo test

# E2E (회귀 없음 확인)
cd packages/web && pnpm e2e
# 목표: 264 passed, 0 failed
```

---

## 4. 단계별 이관 절차

### Phase A: 새 서비스 생성

```bash
# 1. scaffold 생성
npx harness create gate-x \
  --service-id gate-x \
  --account-id b6c06059b413892a92f150e5ca496236

# 2. D1 데이터베이스 생성
cd gate-x
npx wrangler d1 create gate-x-db

# 3. wrangler.toml에 database_id 입력
# 4. GitHub 리포 생성 또는 모노리포 내 패키지로 추가
```

### Phase B: 코드 이식

```bash
# Foundry-X modules/gate/ → gate-x/src/
cp -r packages/api/src/modules/gate/* gate-x/src/

# 의존성 처리 (4종 패턴)
```

**의존성 처리 패턴:**

| 의존성 유형 | 처리 방법 |
|-----------|---------|
| `@foundry-x/shared` 타입 | gate-x에 로컬 타입으로 복제 |
| Foundry-X API 호출 | REST API fetch로 전환 |
| 공유 D1 테이블 읽기 | 이벤트 기반 동기화 or API 위임 |
| harness-kit 미들웨어 | `@foundry-x/harness-kit`에서 직접 import |

```typescript
// Before (모놀리스 내부)
import { getDb } from "../../db";
import type { Opportunity } from "@foundry-x/shared";

// After (독립 서비스)
import { getDb } from "@foundry-x/harness-kit/d1";
import type { Opportunity } from "./types";  // 로컬 복제 타입
```

### Phase C: Typecheck 검증

```bash
cd gate-x
pnpm typecheck
# 에러 0개 목표 (Sprint 187 Gate-X PoC에서 검증됨)
```

### Phase D: Strangler Fig 프록시 설정

Foundry-X `app.ts`에 프록시 라우트 추가:

```typescript
import { createStranglerMiddleware } from "@foundry-x/harness-kit";

app.use("*", createStranglerMiddleware({
  routes: [
    {
      pathPrefix: "/api/validations",
      serviceId: "gate-x",
      mode: "proxy",  // 이관 완료 → proxy 모드
      targetUrl: "https://gate-x.ktds-axbd.workers.dev",
    },
    {
      pathPrefix: "/api/decisions",
      serviceId: "gate-x",
      mode: "proxy",
      targetUrl: "https://gate-x.ktds-axbd.workers.dev",
    },
  ],
}));
```

### Phase E: 독립 배포 + 검증

```bash
# Gate-X 배포
cd gate-x
npx wrangler d1 migrations apply gate-x-db --remote
npx wrangler deploy

# Smoke test
API_URL=https://gate-x.ktds-axbd.workers.dev bash scripts/smoke-test.sh
```

### Phase F: Foundry-X에서 코드 제거

검증이 완료된 후 Foundry-X에서 이관된 코드를 제거해요.

```bash
# 이관 완료 후 Foundry-X에서 삭제
rm -rf packages/api/src/modules/gate/
rm -rf packages/api/src/routes/decisions.ts
rm -rf packages/api/src/routes/validation*.ts

# 테스트 재실행 (회귀 없음 확인)
turbo test && cd packages/web && pnpm e2e
```

---

## 5. 실전 예시 — Gate-X PoC (Sprint 187)

Sprint 187에서 Gate-X scaffold PoC가 완료됐어요.

```bash
# Sprint 187에서 실행한 명령
packages/harness-kit$ node dist/cli/index.js create gate-x --service-id gate-x

# 결과: 8개 파일 생성 + modules/gate/ typecheck 에러 0개 확인
```

이 PoC를 통해 harness-kit 기반 "1분 내 서비스 생성" 비전이 검증됐어요.

---

## 6. 트러블슈팅

### Q. 크로스 서비스 FK 의존성이 있어요

**증상**: Gate-X의 `validations` 테이블이 Foundry-X D1의 `opportunities.id`를 FK로 참조

**해결 (ADR-001 결정 사항)**:
- D1은 단일 DB 유지 (논리적 분리만 적용, 물리적 분리 Phase 21+)
- FK 제약은 현재 유지, 이관 시 references 테이블도 함께 이전하거나 FK를 application-level로 전환

```sql
-- 이관 전 FK 해제 방법
PRAGMA foreign_keys = OFF;
ALTER TABLE validations DROP COLUMN opportunity_id_fk;
ALTER TABLE validations ADD COLUMN opportunity_id TEXT NOT NULL;
-- opportunity_id를 단순 참조 텍스트로 (무결성은 application에서 관리)
```

### Q. JWT가 Gate-X에서 검증 실패해요

**원인**: JWT_SECRET이 Foundry-X와 다른 값으로 등록됨

**해결**:
```bash
# Foundry-X JWT_SECRET 값 확인 (wrangler secrets)
npx wrangler secret list --name foundry-x-api

# Gate-X에 동일한 값 등록
npx wrangler secret put JWT_SECRET --name gate-x
# → Foundry-X와 동일한 시크릿 입력
```

### Q. CORS 오류가 발생해요

**원인**: Gate-X의 `corsOrigins`에 Web URL이 누락됨

**해결**:
```typescript
const config = {
  corsOrigins: [
    "https://fx.minu.best",     // Production
    "http://localhost:3000",    // 로컬 개발
  ],
};
```

### Q. Strangler 프록시가 무한루프에 빠져요

**원인**: Gate-X가 다시 Foundry-X를 호출하는 순환 참조

**해결**: Gate-X에서 `FOUNDRY_X_URL` 환경변수로 명시적 URL 지정, 내부 경로 참조 금지

---

## 7. 이관 완료 체크리스트

| 항목 | 확인 방법 |
|------|---------|
| harness create 실행 완료 | `ls <service>/src/app.ts` |
| D1 마이그레이션 remote 적용 | `wrangler d1 migrations list --remote` |
| Typecheck 통과 | `pnpm typecheck` → 에러 0 |
| 단위 테스트 통과 | `pnpm test` → 0 fail |
| Strangler 프록시 설정 | Foundry-X app.ts mode: "proxy" 확인 |
| Smoke test 통과 | `bash scripts/smoke-test.sh` → 0 fail |
| Foundry-X E2E 회귀 없음 | `pnpm e2e` → 0 fail |
| Foundry-X 구 코드 삭제 | `git diff --stat` 확인 |

---

## 참고

- **Strangler Fig 패턴**: Martin Fowler의 레거시 이관 패턴. 신규 서비스가 준비될 때까지 모놀리스를 점진적으로 대체
- **Gate-X PoC**: Sprint 187 결과 참조 (`docs/04-report/features/sprint-187.report.md`)
- **D1 전략**: ADR-001 (`docs/specs/ax-bd-msa/adr-001-d1-shared-db.md`)
