# shared-contracts 설계 가이드라인

> **버전**: 1.0 | **Sprint 313** | FX-REQ-605

## 목적

`@foundry-x/shared-contracts`는 Discovery↔Shaping 등 도메인 간 공유 계약(DTO/Event)을 담는 독립 패키지입니다.
monolith 방지를 위해 **타입과 인터페이스만** 허용하고, 구현 로직은 일절 금지합니다.

## 절대 규칙

| 허용 | 금지 |
|------|------|
| `interface`, `type` 정의 | `function`, `class` 구현 |
| JSDoc 주석 | DB 접근 코드 (`prepare`, `query` 등) |
| `export type *` re-export | HTTP 클라이언트 코드 |
| Zod 스키마 (타입 추론용만) | 비즈니스 로직 (`if`, `switch`, 계산식) |

## 파일 구조

```
src/
├── discovery.ts  — Discovery 도메인 public API 계약
├── shaping.ts    — Shaping 도메인 계약
├── events.ts     — 도메인 이벤트 카탈로그 (DomainEventEnvelope)
├── ax-bd.ts      — AX BD 공용 비즈니스 타입
└── index.ts      — re-export 진입점
```

## 버전 관리

- **v1.0**: Discovery↔Shaping DTO + DomainEvent 8종 + AX BD 타입
- 향후 변경 시 SemVer — breaking change는 major 버전 증가
- consumer: fx-discovery, fx-shaping, packages/api (service binding 경유)

## 소비 방법

```typescript
import type { BdArtifact, DomainEventEnvelope } from '@foundry-x/shared-contracts';
```

## 기존 shared 패키지 호환성

`@foundry-x/shared`의 `discovery-contract.ts`는 re-export 브리지를 통해 호환성 유지.
소비자 코드의 import 경로(`@foundry-x/shared`) 수정 불필요.

## 위반 감지

PR CI에서 `tsc --noEmit` + 구현 금지 lint 룰로 검증.
`function\s` 패턴 grep 결과 0건 목표.
