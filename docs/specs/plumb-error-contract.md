---
code: FX-SPEC-003
title: Plumb Subprocess Error Handling Contract
version: 1.0
status: Active
category: SPEC
system-version: 0.2.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# Plumb Subprocess Error Handling Contract

> **REQ**: FX-REQ-014 (F14)
> **Implementor**: `PlumbBridge` (bridge.ts) + `FoundryXError` hierarchy (errors.ts)

---

## 1. Exit Code Contract

| Exit Code | 의미 | stdout | stderr | CLI 동작 |
|:---------:|------|:------:|:------:|---------|
| 0 | 성공 | JSON (SyncResult) | 없음 또는 경고 | `PlumbResult { success: true, data }` 반환 |
| 1 | 실행 오류 | 없음 또는 불완전 | 에러 메시지 | `PlumbExecutionError(stderr)` throw |
| 2 | 부분 성공 (경고 있음) | JSON (SyncResult) | 경고 메시지 | `PlumbResult { success: false, data }` 반환 |
| 127 | 명령 없음 | 없음 | 시스템 메시지 | `PlumbNotInstalledError` throw |

**핵심 규칙**: exit 0/2만 stdout JSON을 파싱한다. exit 1/127은 stdout을 무시한다.

## 2. Spawn Error Handling

| 에러 | 조건 | CLI 에러 클래스 |
|------|------|----------------|
| `ENOENT` | python3 바이너리 없음 | `PlumbNotInstalledError` |
| 기타 spawn error | 권한/리소스 문제 | `PlumbExecutionError(err.message)` |

## 3. Timeout Contract

| 항목 | 값 |
|------|-----|
| 기본값 | 30,000ms (30초) |
| 설정 우선순위 | `PlumbBridgeConfig.timeout` > `FOUNDRY_X_PLUMB_TIMEOUT` env > 기본값 |
| 시그널 | `SIGTERM` (graceful) |
| CLI 에러 | `PlumbTimeoutError(timeoutMs)` |
| 사용자 메시지 | `"Plumb timed out after {N}ms. Try: FOUNDRY_X_PLUMB_TIMEOUT={N*2}"` |

**Timeout 후 Plumb 프로세스**: SIGTERM 전송 후 CLI는 즉시 reject. Plumb가 SIGTERM을 처리하지 않으면 좀비 프로세스가 될 수 있음 (OS 정리에 위임).

## 4. stdout Parse Error

| 조건 | CLI 에러 |
|------|---------|
| exit 0/2이지만 `JSON.parse` 실패 | `PlumbOutputError` |

**발생 시나리오**: Plumb가 `PLUMB_OUTPUT_FORMAT=json`을 무시하고 텍스트를 출력하거나, JSON이 잘린 경우.

## 5. Error Class Hierarchy

```
FoundryXError (abstract)
├── PlumbNotInstalledError   code: PLUMB_NOT_INSTALLED   exit: 1
├── PlumbTimeoutError        code: PLUMB_TIMEOUT          exit: 1
├── PlumbExecutionError      code: PLUMB_EXECUTION_ERROR  exit: 1
├── PlumbOutputError         code: PLUMB_OUTPUT_ERROR     exit: 1
├── NotInitializedError      code: NOT_INITIALIZED        exit: 1
└── NotGitRepoError          code: NOT_GIT_REPO           exit: 1
```

모든 `FoundryXError`는 `code` (기계 읽기용)와 `exitCode` (process.exit용)를 가진다.

## 6. Configuration

| 설정 | 소스 | 우선순위 |
|------|------|:--------:|
| Python 경로 | `PlumbBridgeConfig.pythonPath` > `FOUNDRY_X_PYTHON_PATH` > `"python3"` | 1 > 2 > 3 |
| Timeout | `PlumbBridgeConfig.timeout` > `FOUNDRY_X_PLUMB_TIMEOUT` > `30000` | 1 > 2 > 3 |
| 작업 디렉토리 | `PlumbBridgeConfig.cwd` > `process.cwd()` | 1 > 2 |

## 7. Plumb Availability Check

`PlumbBridge.isAvailable()`는 `plumb --version`을 실행하여 판별한다:
- 성공 (exit 0): `true` — Plumb 설치됨
- 실패 (any error): `false` — 미설치 또는 접근 불가

`sync`/`status` 커맨드는 실행 전에 `isAvailable()`을 호출하여, 미설치 시 사용자 친화적 경고를 출력하고 정상 종료한다 (throw 하지 않음).

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-16 | 초안 — bridge.ts + errors.ts에서 추출 |
