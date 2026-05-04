---
id: FX-DESIGN-333
sprint: 333
feature: F587
req: FX-REQ-654
status: approved
date: 2026-05-04
---

# Sprint 333 Design — F587: services/ 루트 dead code 2 git rm + 도메인 이동 2

## §1 개요

services/ 루트 4 files 정리:
- **Dead code 2 git rm**: logger.ts, telemetry-collector.ts (api 내부 callers 0건)
- **도메인 이동 2**: monitoring.ts → core/harness/services/, traceability.service.ts → core/work/services/ (신설)

## §2 변경 전/후 구조

### Before (33 files)
```
packages/api/src/services/
├── logger.ts                    ← DEAD (0 callers)
├── telemetry-collector.ts       ← DEAD (0 callers in api, fx-agent는 자체 파일)
├── monitoring.ts                ← harness 단일 caller → 이동
├── traceability.service.ts      ← work 단일 caller → 이동
└── ... (29 other files)
```

### After (29 files)
```
packages/api/src/services/                     ← 29 files
packages/api/src/core/harness/services/
└── monitoring.ts                              ← 신규 이동
packages/api/src/core/work/services/           ← 신설 디렉토리
└── traceability.service.ts                    ← 신규 이동
packages/api/src/__tests__/
└── telemetry-collector.test.ts                ← git rm (대상 파일 사라짐)
```

## §3 구현 단계

### Step 1: Dead code git rm
```bash
git rm packages/api/src/services/logger.ts
git rm packages/api/src/services/telemetry-collector.ts
git rm packages/api/src/__tests__/telemetry-collector.test.ts
```

> logger.test.ts 없음 (사전 측정 확인됨)

### Step 2: 도메인 이동
```bash
git mv packages/api/src/services/monitoring.ts \
       packages/api/src/core/harness/services/monitoring.ts

mkdir -p packages/api/src/core/work/services
git mv packages/api/src/services/traceability.service.ts \
       packages/api/src/core/work/services/traceability.service.ts
```

### Step 3: Callers import path 갱신

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `packages/api/src/core/harness/routes/health.ts:9` | `from "../../../services/monitoring.js"` | `from "../services/monitoring.js"` |
| `packages/api/src/routes/work.ts:22` | `from "../services/traceability.service.js"` | `from "../core/work/services/traceability.service.js"` |

### Step 4: Test import path 갱신

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `packages/api/src/__tests__/monitoring.test.ts:4` | `from "../services/monitoring.js"` | `from "../core/harness/services/monitoring.js"` |
| `packages/api/src/__tests__/traceability.service.test.ts:3` | `from "../services/traceability.service.js"` | `from "../core/work/services/traceability.service.js"` |

## §4 TDD 적용

- **면제 등급**: 기존 파일 이동/삭제 — 신규 서비스 로직 없음
- 기존 monitoring.test.ts, traceability.service.test.ts import path 갱신 후 GREEN 유지

## §5 파일 매핑

### 삭제 파일
- `packages/api/src/services/logger.ts` → git rm
- `packages/api/src/services/telemetry-collector.ts` → git rm
- `packages/api/src/__tests__/telemetry-collector.test.ts` → git rm

### 이동 파일
- `packages/api/src/services/monitoring.ts` → `packages/api/src/core/harness/services/monitoring.ts`
- `packages/api/src/services/traceability.service.ts` → `packages/api/src/core/work/services/traceability.service.ts`

### 갱신 파일 (import path 변경)
- `packages/api/src/core/harness/routes/health.ts`
- `packages/api/src/routes/work.ts`
- `packages/api/src/__tests__/monitoring.test.ts`
- `packages/api/src/__tests__/traceability.service.test.ts`

## §6 회귀 방지

- fx-agent/src/services/telemetry-collector.ts: api 삭제와 무관 (별도 파일)
- packages/cli/src/services/logger.ts: api 삭제와 무관 (별도 파일)
- core/work/ 신설: index.ts 없이 시작 (다른 도메인과 달리 route 등록 없음 — traceability는 routes/work.ts에서 직접 import)
