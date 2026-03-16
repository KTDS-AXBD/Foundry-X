---
code: FX-PLAN-002
title: Plumb Internal Contracts Documentation
version: 1.0
status: Draft
category: PLAN
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# plumb-contracts Planning Document

> **Summary**: Plumb subprocess 연동의 내부 계약을 문서화하여, Plumb 버전 업데이트 시 CLI 호환성 판단 기준을 확립한다
>
> **REQ**: FX-REQ-013 (F13) + FX-REQ-014 (F14)
> **Priority**: P2
> **Effort**: 문서 작업 (코드 변경 없음)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PlumbBridge가 Plumb subprocess의 출력/에러를 파싱하지만, Plumb 측의 출력 스키마와 에러 계약이 문서화되어 있지 않아 Plumb 업데이트 시 CLI가 무경고로 깨질 수 있다 |
| **Solution** | `.plumb` 출력 형식, `decisions.jsonl` 스키마, exit code 계약, timeout/stderr 처리 규칙을 ADR 형태의 내부 계약 문서로 정의한다 |
| **Function/UX Effect** | Plumb 업데이트 전에 계약 문서를 확인하면 호환성 깨짐을 사전 감지 가능. CLI 에러 메시지도 계약 기반으로 일관성 유지 |
| **Core Value** | "Plumb가 바뀌면 어디를 봐야 하는가?"에 대한 답이 리포에 존재하는 상태를 만든다 |

---

## 1. Scope

### F13: Plumb 출력 형식 + decisions.jsonl 계약

현재 코드에서 추출한 암묵적 계약:

| 항목 | 현재 구현 (bridge.ts) | 문서화 필요 |
|------|----------------------|------------|
| 출력 포맷 | `PLUMB_OUTPUT_FORMAT=json` env로 JSON 강제 | JSON 스키마 정의 |
| stdout | `JSON.parse(stdout)` → `PlumbResult.data` | 필드 목록 + 타입 |
| stderr | 에러 메시지 원문 전달 | 포맷 규칙 |
| `review` 명령 | `data as SyncResult` 캐스팅 | SyncResult 스키마 |
| `status` 명령 | `data as SyncResult` 캐스팅 | SyncResult 스키마 |
| decisions.jsonl | shared/types.ts `Decision` 인터페이스 | JSONL 라인 형식 |

**산출물**: `docs/specs/plumb-output-contract.md`

### F14: Subprocess 오류 처리 계약

현재 코드에서 추출한 에러 계약:

| Exit Code | 의미 | CLI 동작 (errors.ts) |
|:---------:|------|---------------------|
| 0 | 성공 | `success: true` 반환 |
| 1 | 실행 오류 | `PlumbExecutionError(stderr)` throw |
| 2 | 부분 성공 (경고) | `success: false` + data 반환 |
| 127 | 명령 없음 | `PlumbNotInstalledError` throw |
| ENOENT | spawn 실패 | `PlumbNotInstalledError` throw |
| timeout | 30s 초과 | SIGTERM → `PlumbTimeoutError` throw |

**산출물**: `docs/specs/plumb-error-contract.md`

## 2. Deliverables

| # | 산출물 | 형식 | 비고 |
|---|--------|------|------|
| 1 | `docs/specs/plumb-output-contract.md` | 내부 계약서 | JSON 스키마 + decisions.jsonl 포맷 |
| 2 | `docs/specs/plumb-error-contract.md` | 내부 계약서 | exit code + timeout + stderr 규칙 |
| 3 | `docs/INDEX.md` 갱신 | 인덱스 | SPEC 섹션에 2건 추가 |

## 3. Non-Goals

- Plumb 소스 코드 수정 (Plumb는 외부 의존성)
- PlumbBridge 코드 리팩토링 (계약 문서화만)
- Track B(TypeScript 재구현) 관련 작업

## 4. Schedule

| 작업 | 예상 |
|------|------|
| plumb-output-contract.md 작성 | 1회 세션 |
| plumb-error-contract.md 작성 | 같은 세션 |
| INDEX.md 갱신 + 커밋 | 같은 세션 |

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-16 | 초안 — F13/F14 통합 계획 |
