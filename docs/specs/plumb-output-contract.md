---
code: FX-SPEC-002
title: Plumb Output Format & decisions.jsonl Internal Contract
version: 1.0
status: Active
category: SPEC
system-version: 0.2.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# Plumb Output Format & decisions.jsonl Internal Contract

> **REQ**: FX-REQ-013 (F13)
> **Consumers**: `PlumbBridge.execute()`, `PlumbBridge.review()`, `PlumbBridge.getStatus()`

---

## 1. Invocation Convention

PlumbBridge는 Plumb를 child_process.spawn으로 호출한다:

```
python3 -m plumb <command> [args...]
```

**환경 변수**:

| 변수 | 값 | 용도 |
|------|-----|------|
| `PLUMB_OUTPUT_FORMAT` | `json` | stdout을 JSON으로 강제 |

PlumbBridge는 항상 `PLUMB_OUTPUT_FORMAT=json`을 설정하므로, Plumb의 텍스트 출력 모드는 사용하지 않는다.

## 2. stdout JSON Schema

### 2.1 `plumb review` / `plumb status` → SyncResult

exit code 0 또는 2일 때, stdout은 아래 JSON을 출력해야 한다:

```jsonc
{
  "success": true,             // boolean — exit 0이면 true, exit 2이면 false
  "timestamp": "ISO8601",      // string — 실행 시점
  "duration": 1234,            // number — ms 단위 실행 시간
  "triangle": {
    "specToCode": {
      "matched": 10,           // number — 일치 항목 수
      "total": 12,             // number — 전체 항목 수
      "gaps": [                // GapItem[]
        {
          "type": "spec_only", // "spec_only" | "code_only" | "test_missing" | "drift"
          "path": "src/foo.ts",
          "description": "Spec에 정의되었지만 구현 없음"
        }
      ]
    },
    "codeToTest": { /* SyncStatus — 동일 구조 */ },
    "specToTest": { /* SyncStatus — 동일 구조 */ }
  },
  "decisions": [               // Decision[]
    {
      "id": "d-001",           // string — 고유 ID
      "source": "agent",       // "agent" | "human"
      "summary": "foo.ts에 에러 핸들링 추가",
      "status": "pending",     // "pending" | "approved" | "rejected"
      "commit": "abc1234"      // string — 관련 commit SHA
    }
  ],
  "errors": [                  // PlumbError[]
    {
      "code": "PARSE_FAIL",    // string — 에러 코드
      "message": "..."         // string — 사람 읽기용 메시지
    }
  ]
}
```

### 2.2 `plumb --version`

```
plumb X.Y.Z
```

PlumbBridge는 `isAvailable()` 판별에만 사용하며, 버전 문자열을 파싱하지 않는다.

## 3. GapItem.type 열거값

| type | 의미 | 예시 |
|------|------|------|
| `spec_only` | 명세에 있지만 코드에 없음 | spec에 정의된 함수가 구현되지 않음 |
| `code_only` | 코드에 있지만 명세에 없음 | 명세 없이 추가된 함수 |
| `test_missing` | 코드에 있지만 테스트 없음 | 함수는 있으나 테스트 커버리지 0 |
| `drift` | 명세와 코드가 불일치 | 시그니처/동작이 다름 |

## 4. decisions.jsonl

`.foundry-x/decisions.jsonl` 파일에 Decision 객체가 한 줄에 하나씩 JSON으로 기록된다:

```jsonl
{"id":"d-001","source":"agent","summary":"...","status":"pending","commit":"abc1234"}
{"id":"d-002","source":"human","summary":"...","status":"approved","commit":"def5678"}
```

**규칙**:
- 한 줄 = 하나의 Decision JSON (줄바꿈으로 분리)
- append-only (기존 라인 수정 금지, 새 상태는 새 라인으로 추가)
- `id`는 `d-NNN` 형식, 단조 증가
- CLI는 이 파일을 직접 읽지 않음 (Plumb가 review 시 `decisions` 배열에 포함)

## 5. Compatibility Rules

| 변경 유형 | 호환성 | CLI 대응 |
|-----------|:------:|---------|
| 필드 추가 | ✅ 호환 | `JSON.parse`가 무시 |
| 필드 제거 | ❌ 비호환 | CLI crash 가능 → Plumb minor 이상에서만 허용 |
| 타입 변경 | ❌ 비호환 | PlumbOutputError 발생 |
| 열거값 추가 (GapItem.type) | ⚠️ 부분 호환 | CLI가 unknown type을 표시는 하되 처리 로직 없음 |

**버전 호환 정책**: Plumb minor 버전 범프 시 이 문서를 갱신하고, CLI의 shared/types.ts를 동기화한다.

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-16 | 초안 — bridge.ts + shared/types.ts에서 추출 |
