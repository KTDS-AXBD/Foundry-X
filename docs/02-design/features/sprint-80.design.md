# Sprint 80 Design: BDP 편집/버전관리 + ORB/PRB 게이트 + 사업제안서

> **Summary**: F234 BDP 에디터 + F235 게이트 패키지 + F237 사업제안서 LLM 생성
>
> **Project**: Foundry-X
> **Version**: api 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Draft
> **Planning Doc**: [sprint-80.plan.md](../../01-plan/features/sprint-80.plan.md)

---

## 1. Overview

Sprint 79(파이프라인+공유+의사결정)에서 구축한 인프라 위에 문서 계층을 추가한다.

---

## 2. Data Model

### 2.1 D1 Migration: 0070_bdp_versions.sql

```sql
CREATE TABLE IF NOT EXISTS bdp_versions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version_num INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_final INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, version_num)
);
```

### 2.2 D1 Migration: 0071_gate_packages.sql

```sql
CREATE TABLE IF NOT EXISTS gate_packages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  gate_type TEXT NOT NULL,
  items TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  download_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 3. API Specification

### 3.1 F234 BDP (5 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/bdp/:bizItemId | BDP 최신 버전 조회 | tenant |
| GET | /api/bdp/:bizItemId/versions | 버전 히스토리 | tenant |
| POST | /api/bdp/:bizItemId | BDP 새 버전 저장 | tenant |
| PATCH | /api/bdp/:bizItemId/finalize | 최종본 잠금 | tenant |
| GET | /api/bdp/:bizItemId/diff/:v1/:v2 | 두 버전 diff | tenant |

### 3.2 F235 게이트 패키지 (4 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/gate-package/:bizItemId | 게이트 패키지 자동 구성 | tenant |
| GET | /api/gate-package/:bizItemId | 패키지 내용 조회 | tenant |
| GET | /api/gate-package/:bizItemId/download | ZIP 다운로드 | tenant |
| PATCH | /api/gate-package/:bizItemId/status | 상태 변경 | tenant |

### 3.3 F237 사업제안서 (1 endpoint)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/bdp/:bizItemId/generate-proposal | LLM 사업제안서 요약 생성 | tenant |

---

## 4. Service Design

### 4.1 BdpService

```
- getLatest(bizItemId, orgId) → BdpVersion | null
- listVersions(bizItemId, orgId) → BdpVersion[]
- createVersion(input) → BdpVersion
- finalize(bizItemId, orgId, userId) → BdpVersion
- getDiff(bizItemId, orgId, v1, v2) → { v1Content, v2Content, diff }
```

### 4.2 GatePackageService

```
- create(bizItemId, orgId, gateType, userId) → GatePackage
  - 산출물 수집: BMC, PRD, BDP(최신), 평가결과(Six Hats)
  - 필수 항목 누락 시 422 에러
- get(bizItemId, orgId) → GatePackage | null
- download(bizItemId, orgId) → { filename, items[] }
- updateStatus(bizItemId, orgId, status) → GatePackage
```

### 4.3 ProposalGenerator

```
- generate(bizItemId, orgId, userId) → BdpVersion (type=proposal)
  - BDP 최신 버전에서 LLM으로 요약 추출
  - 결과를 bdp_versions에 새 버전으로 저장 (proposal 태그)
```

---

## 5. Worker 파일 매핑

### Worker 1: DB + Schemas (독립)

**수정/생성 파일:**
- `packages/api/src/db/migrations/0070_bdp_versions.sql` (생성)
- `packages/api/src/db/migrations/0071_gate_packages.sql` (생성)
- `packages/api/src/schemas/bdp.schema.ts` (생성)
- `packages/api/src/schemas/gate-package.schema.ts` (생성)

### Worker 2: Services + Routes + Tests (Worker 1 의존)

**수정/생성 파일:**
- `packages/api/src/services/bdp-service.ts` (생성)
- `packages/api/src/services/gate-package-service.ts` (생성)
- `packages/api/src/services/proposal-generator.ts` (생성)
- `packages/api/src/routes/bdp.ts` (생성)
- `packages/api/src/routes/gate-package.ts` (생성)
- `packages/api/src/index.ts` (수정 — 라우트 등록)
- `packages/api/src/__tests__/bdp.test.ts` (생성)
- `packages/api/src/__tests__/gate-package.test.ts` (생성)

---

## 6. Error Handling

| Code | Scenario | Message |
|------|----------|---------|
| 400 | 잘못된 요청 (Zod 검증 실패) | Zod flatten 에러 |
| 404 | BDP/패키지 미존재 | "BDP를 찾을 수 없어요" |
| 409 | 최종본 잠금 후 새 버전 생성 시도 | "최종본이 잠금된 BDP는 수정할 수 없어요" |
| 422 | 게이트 패키지 필수 산출물 누락 | "BMC와 PRD가 필요해요" |

---

## 7. Test Plan

### 7.1 BDP Tests (~25)

- BDP 버전 생성 (정상, content 검증)
- 버전 히스토리 조회 (순서, 버전 번호)
- 최신 버전 조회
- 최종본 잠금 (정상, 잠금 후 생성 차단 409)
- diff 조회 (정상, 존재하지 않는 버전 404)
- Route 통합 테스트 (5 endpoints)

### 7.2 Gate Package Tests (~20)

- 패키지 자동 구성 (정상, 산출물 수집 확인)
- 필수 산출물 누락 시 422
- 패키지 조회
- 상태 변경 (draft→ready→submitted)
- 다운로드 (items 목록 반환)
- Route 통합 테스트 (4 endpoints)

### 7.3 Proposal Generator Tests (~5)

- LLM 생성 (mock, 결과 저장 확인)
- BDP 미존재 시 404
- Route 통합 테스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-30 | 초안 | Sinclair Seo |
