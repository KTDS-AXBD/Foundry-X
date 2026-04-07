---
code: FX-PLAN-S196
title: "Sprint 196 — F412 SDK/CLI 클라이언트"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: autopilot
---

# Sprint 196 Plan — F412 SDK/CLI 클라이언트

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F412 — SDK/CLI 클라이언트 |
| Sprint | 196 |
| 담당 | Autopilot |
| 목표 | Gate-X API를 외부에서 쉽게 사용할 수 있는 TypeScript SDK + CLI 도구 제공 |
| 범위 | packages/gate-x-sdk/ 신규 패키지, npm 배포 대상 |

## 배경 및 목적

Gate-X (F402~F411)가 독립 Cloudflare Workers로 배포된 이후, 외부 고객(BD팀 포함)이 API를 직접 호출하려면:
1. JWT/API Key 인증 처리
2. 모든 엔드포인트 URL 암기
3. 요청/응답 타입 직접 관리

...가 필요해 진입 장벽이 높아요. TypeScript SDK가 이를 해소하고, CLI는 터미널에서 빠른 검증·운영을 가능하게 해요.

## 구현 범위

### 1. TypeScript SDK (`packages/gate-x-sdk/`)
- `GateXClient` 클래스 — API Key 인증 + base URL 설정
- **Evaluations**: create, list, getById, updateStatus, createKpi, listKpis, updateKpi, getHistory
- **GatePackage**: create, get, download, updateStatus
- **OGD**: run (O-G-D 파이프라인 실행)
- **Health**: check
- 인라인 TypeScript 타입 정의 (모노리포 외부 의존 없음)

### 2. CLI 도구 (`packages/gate-x-sdk/bin/`)
- `gate-x` 바이너리 (Commander.js 기반)
- 명령: `health`, `eval list`, `eval create`, `eval status`, `gate-package get`, `ogd run`
- `--api-key`, `--base-url` 공통 옵션 (환경변수 `GATEX_API_KEY`, `GATEX_BASE_URL` 지원)
- JSON 출력 (기본) + `--pretty` 옵션

### 3. API 문서 (`packages/gate-x-sdk/README.md`)
- 설치, 인증, 빠른 시작 예제
- 각 메서드 시그니처 + 사용 예제
- CLI 명령 레퍼런스

## 기술 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 타입 소스 | 인라인 정의 | npm 배포 시 모노리포 의존 없음 |
| HTTP 클라이언트 | 네이티브 fetch | 의존성 최소화 (Node 18+/Browser 모두 지원) |
| CLI 프레임워크 | Commander.js | 기존 FX CLI와 동일 패턴 |
| 빌드 | tsc + tsup | ESM + CJS 듀얼 번들 |
| 테스트 | vitest + vi.mock fetch | 외부 의존 없이 유닛 테스트 |

## 파일 구조 (예상)

```
packages/gate-x-sdk/
├── src/
│   ├── client.ts          # GateXClient 메인 클래스
│   ├── types.ts           # 인라인 타입 정의
│   ├── resources/
│   │   ├── evaluations.ts
│   │   ├── gate-package.ts
│   │   └── ogd.ts
│   └── index.ts           # public exports
├── bin/
│   └── gate-x.ts          # CLI entry point
├── src/__tests__/
│   ├── client.test.ts
│   └── cli.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 제외 범위
- Decisions / TeamReviews / ValidationMeetings / CustomRules / Webhooks / Tenants / ApiKeys — v1.0에서 제외 (핵심 3개 리소스 집중)
- SDK 자동 타입 생성 (openapi-typescript) — 수동 인라인으로 충분
- Python/Go SDK — TypeScript만

## 성공 기준
- [ ] `import { GateXClient } from "@foundry-x/gate-x-sdk"` 동작
- [ ] Evaluations + GatePackage + OGD 3개 리소스 SDK 메서드 구현
- [ ] CLI `gate-x health`, `gate-x eval list` 동작
- [ ] 유닛 테스트 커버리지 핵심 메서드 100% (fetch mock)
- [ ] README 설치/사용 가이드 포함
- [ ] TypeScript strict 통과
