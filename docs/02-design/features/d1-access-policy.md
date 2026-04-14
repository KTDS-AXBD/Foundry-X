---
id: FX-DESIGN-D1-POLICY
title: D1 접근 규약 — MSA Walking Skeleton (Option B)
version: 1.0
created: 2026-04-13
sprint: 277
f_items: [F523]
---

# D1 접근 규약 — MSA Walking Skeleton Phase 2

## 1. 결정: Option B (공유 DB 유지)

**현 시점 결정**: 모든 Worker가 단일 D1 인스턴스(`foundry-x-db`)를 공유한다.

**근거**:
- 팀 규모 1명 → 별도 DB 운영 오버헤드 > 이점
- 데이터 마이그레이션 없이 기능 이관 가능
- Option A(독립 DB) 전환은 팀 확장 시점(F560~)에 재판정

**재판정 트리거**:
- 팀 멤버 3명 이상 or
- Worker별 트래픽 분리 필요 or
- D1 Row limit 80% 이상 도달

## 2. Worker별 테이블 접근 규약

### foundry-x-api (메인 API Worker)

| 테이블 그룹 | 접근 | 비고 |
|------------|------|------|
| 모든 테이블 | READ/WRITE | 잔여 도메인 전체 |

### fx-discovery (Discovery Domain Worker)

| 테이블 | 접근 | Sprint |
|--------|------|--------|
| `biz_items` | READ | F523 (Sprint 277) |
| `biz_item_classifications` | READ | F523 |
| `discovery_items` | READ | 추후 이관 |
| `biz_evaluation_reports` | READ | 추후 이관 |
| `discovery_v2_items` | READ | 추후 이관 |

> **이번 Sprint**: `biz_items` 조회만 활성화. 나머지는 추후 라우트 이관 시 추가.

### fx-gateway (Gateway Worker)

| 테이블 | 접근 | 비고 |
|--------|------|------|
| 없음 | — | Proxy만, D1 바인딩 없음 |

### 규약 규칙

1. **WRITE는 foundry-x-api 독점**: 데이터 정합성 보장을 위해 쓰기는 메인 API만 허용
2. **fx-discovery READ 전용**: `GET` 요청만 처리, mutation은 foundry-x-api로 위임
3. **테이블 추가 시 이 문서 업데이트**: Worker별 접근 목록은 반드시 동기화
4. **prepared statement 필수**: raw SQL injection 방지

## 3. Binding 구성 (현재)

```toml
# packages/fx-discovery/wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "foundry-x-db"
database_id = "6338688e-b050-4835-98a2-7101f9215c76"

# packages/fx-gateway/wrangler.toml
# D1 binding 없음 — proxy only
```

## 4. 향후 마이그레이션 경로 (Option A 전환 시)

```
Step 1: fx-discovery-db 별도 생성 (D1 create)
Step 2: biz_items 등 Discovery 테이블 스키마 복제
Step 3: 데이터 마이그레이션 스크립트 (bulk read from foundry-x-db → write to fx-discovery-db)
Step 4: foundry-x-api Discovery WRITE → fx-discovery WRITE 이관
Step 5: foundry-x-api에서 Discovery 테이블 접근 제거
```

이 문서는 Option B 단계에서는 변경 없음. Option A 전환 결정 시 Sprint 계획에 포함.
