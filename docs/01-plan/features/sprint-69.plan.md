---
code: FX-PLAN-069
title: "Sprint 69 — F213 Foundry-X API v8.2 확장"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 69
features: [F213]
req: [FX-REQ-205]
prd: docs/specs/axbd/AX_BD_COWORK_SETUP.md
depends-on: Sprint 67 (biz_items + biz_item_classifications 기반)
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 프로세스 v8.2의 5유형(I/M/P/T/S) 분류와 단계별 사업성 체크포인트가 API에 미반영. 담당자가 단계별 Go/Pivot/Drop 판단을 구조화하여 추적할 수 없음 |
| **Solution** | biz_items에 discovery_type(I/M/P/T/S) 확장 + 사업성 체크포인트(2-1~2-7) CRUD + 누적 트래픽 라이트 집계 + 2-5 Commit Gate 플로우 API 구현 |
| **Function UX Effect** | 아이템 유형별 분석 경로 자동 제안 + 각 단계 완료 시 사업성 판단 기록 + 🟢🟡🔴 신호등 이력 자동 집계 + Commit Gate 4질문 구조화 |
| **Core Value** | 사업 발굴 프로세스의 의사결정 이력을 체계적으로 추적하여 팀 내 투명성 확보. Discovery → 형상화 Handoff 시 근거 자료 제공 |

| 항목 | 값 |
|------|-----|
| Feature | F213 Foundry-X API v8.2 확장 |
| Sprint | 69 |
| PRD | docs/specs/axbd/ (프로세스 v8.2 참고자료 7개) |
| 선행 조건 | Sprint 67 완료 (biz_items + biz_item_classifications ✅) |
| Worker 구성 | 단일 구현 (파일 상호 의존성 높음) |

---

## 1. Feature 상세

### F213 — Foundry-X API v8.2 확장 (FX-REQ-205, P1)

**목표**: 프로세스 v8.2의 5유형 분류, 단계별 사업성 체크포인트, 누적 트래픽 라이트, Commit Gate 플로우를 API 레벨에서 지원.

**배경**:
- `biz_item_classifications.item_type`에 이미 유형 저장 가능하나, v8.2 5유형(I/M/P/T/S) 전용 ENUM 검증 없음
- 2-1~2-7 각 단계 완료 시 사업성 판단(Go/Pivot/Drop)을 구조화하여 저장할 테이블 필요
- 2-5 Commit Gate는 4개 질문의 심화 논의 → 별도 플로우
- 누적 트래픽 라이트: 단계별 판단을 🟢🟡🔴로 집계하여 한눈에 보여주는 API

---

## 2. D1 마이그레이션

### 0058_discovery_type_enum.sql
```sql
-- biz_items에 discovery_type 컬럼 추가 (I/M/P/T/S)
ALTER TABLE biz_items ADD COLUMN discovery_type TEXT
  CHECK (discovery_type IN ('I', 'M', 'P', 'T', 'S'));
```

### 0059_viability_checkpoints.sql
```sql
CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('2-1','2-2','2-3','2-4','2-5','2-6','2-7')),
  decision TEXT NOT NULL CHECK (decision IN ('go','pivot','drop')),
  question TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  UNIQUE(biz_item_id, stage)
);

CREATE INDEX idx_viability_cp_item ON ax_viability_checkpoints(biz_item_id);
CREATE INDEX idx_viability_cp_org ON ax_viability_checkpoints(org_id);
```

### 0060_commit_gates.sql
```sql
CREATE TABLE IF NOT EXISTS ax_commit_gates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  question_1_answer TEXT,
  question_2_answer TEXT,
  question_3_answer TEXT,
  question_4_answer TEXT,
  final_decision TEXT NOT NULL CHECK (final_decision IN ('commit','explore_alternatives','drop')),
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  UNIQUE(biz_item_id)
);
```

---

## 3. API Endpoints

| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | PATCH | /biz-items/:id/discovery-type | 아이템 discovery_type(I/M/P/T/S) 설정 |
| 2 | GET | /biz-items/:id/analysis-path | 유형별 분석 경로(강도 매핑) 조회 |
| 3 | POST | /ax-bd/viability/checkpoints | 사업성 체크포인트 기록 (단계별) |
| 4 | GET | /ax-bd/viability/checkpoints/:bizItemId | 아이템별 체크포인트 전체 조회 |
| 5 | PUT | /ax-bd/viability/checkpoints/:bizItemId/:stage | 특정 단계 체크포인트 수정 |
| 6 | DELETE | /ax-bd/viability/checkpoints/:bizItemId/:stage | 특정 단계 체크포인트 삭제 |
| 7 | GET | /ax-bd/viability/traffic-light/:bizItemId | 누적 트래픽 라이트 집계 |
| 8 | POST | /ax-bd/viability/commit-gate | Commit Gate(2-5) 기록 |
| 9 | GET | /ax-bd/viability/commit-gate/:bizItemId | Commit Gate 상세 조회 |

총 **9개** 신규 엔드포인트.

---

## 4. 서비스/스키마 파일 구조

### 신규 파일
| 파일 | 역할 |
|------|------|
| `services/viability-checkpoint-service.ts` | 사업성 체크포인트 CRUD + 트래픽 라이트 집계 |
| `services/commit-gate-service.ts` | Commit Gate(2-5) 기록/조회 |
| `services/analysis-path-v82.ts` | v8.2 유형별 분석 경로(강도 매핑) 반환 |
| `schemas/viability-checkpoint.schema.ts` | 체크포인트 Zod 스키마 |
| `schemas/commit-gate.schema.ts` | Commit Gate Zod 스키마 |
| `routes/ax-bd-viability.ts` | 사업성 관련 라우트 통합 |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `routes/biz-items.ts` | PATCH /:id/discovery-type + GET /:id/analysis-path 엔드포인트 추가 |
| `services/biz-item-service.ts` | updateDiscoveryType() 메서드 추가 |
| `schemas/biz-item.ts` | discovery_type 스키마 추가 |
| `app.ts` | axBdViabilityRoute import + 라우트 등록 |

---

## 5. 유형별 분석 경로 매핑 (analysis-path-v82.ts)

프로세스 v8.2의 강도 매핑을 정적 데이터로 제공:

```typescript
type Intensity = 'core' | 'normal' | 'light';
type DiscoveryType = 'I' | 'M' | 'P' | 'T' | 'S';

const ANALYSIS_PATH: Record<string, Record<DiscoveryType, Intensity>> = {
  '2-1': { I: 'light', M: 'normal', P: 'light', T: 'core', S: 'core' },
  '2-2': { I: 'core',  M: 'core',  P: 'core',  T: 'core', S: 'light' },
  '2-3': { I: 'normal',M: 'core',  P: 'core',  T: 'core', S: 'core' },
  '2-4': { I: 'core',  M: 'normal',P: 'core',  T: 'core', S: 'core' },
  '2-5': { I: 'core',  M: 'core',  P: 'core',  T: 'core', S: 'normal' },
  '2-6': { I: 'core',  M: 'core',  P: 'core',  T: 'normal',S:'normal' },
  '2-7': { I: 'normal',M: 'normal',P: 'core',  T: 'normal',S: 'core' },
};
```

---

## 6. 트래픽 라이트 집계 로직

```
GET /ax-bd/viability/traffic-light/:bizItemId

Response:
{
  "bizItemId": "abc123",
  "summary": { "go": 4, "pivot": 1, "drop": 0, "pending": 2 },
  "commitGate": { "decision": "commit", "decidedAt": "..." } | null,
  "checkpoints": [
    { "stage": "2-1", "decision": "go", "decidedAt": "..." },
    ...
  ],
  "overallSignal": "green" | "yellow" | "red"
}
```

**overallSignal 로직**:
- 🟢 green: drop 0개 && pivot ≤ 1개
- 🟡 yellow: drop 0개 && pivot ≥ 2개, 또는 commitGate가 explore_alternatives
- 🔴 red: drop ≥ 1개, 또는 commitGate가 drop

---

## 7. 검증 전략

- **단위 테스트**: 각 서비스 함수별 테스트 (CRUD, 유효성 검증, 에지 케이스)
- **통합 테스트**: Hono app.request() 기반 라우트 테스트
- **예상 테스트 수**: ~40개 (서비스 ~24 + 라우트 ~16)
- **타입 안전성**: Zod 스키마로 입력 검증, TypeScript strict mode

---

## 8. 기존 코드 영향 분석

| 영역 | 영향 | 위험도 |
|------|------|--------|
| biz_items 테이블 | ALTER TABLE (컬럼 추가) — 기존 데이터 영향 없음 (NULL 허용) | 낮음 |
| biz-items.ts 라우트 | 2개 엔드포인트 추가 — 기존 라우트 변경 없음 | 낮음 |
| app.ts | import + route 1줄 추가 | 낮음 |
| shared/types.ts | DiscoveryType 타입 추가 가능 | 낮음 |
