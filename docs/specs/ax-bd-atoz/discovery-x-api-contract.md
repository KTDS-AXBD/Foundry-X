---
code: FX-SPEC-DX-API-001
title: "Discovery-X API 인터페이스 계약"
version: 1.0
status: Active
category: SPEC
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
---

# Discovery-X API 인터페이스 계약

## 1. 개요

Discovery-X에서 수집한 시장/트렌드/경쟁사 데이터를 Foundry-X에 전달하기 위한 API 계약.

| 항목 | 값 |
|------|-----|
| Provider | Discovery-X |
| Consumer | Foundry-X API |
| Base Path | /api/ax-bd/discovery |
| Version | v1 |
| Transport | HTTPS (Webhook push + Pull on demand) |

## 2. 인증

| 방식 | 설명 |
|------|------|
| Bearer Token | `Authorization: Bearer {API_KEY}` |
| 발급 | Foundry-X 관리자가 환경변수 또는 D1 api_keys 테이블에 등록 |
| 갱신 | 수동 갱신 (자동 로테이션은 v2 예정) |

## 3. Payload 스키마

### 3.1 CollectionSource
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | 수집 소스 고유 ID |
| type | enum | O | market_trend, competitor, pain_point, technology, regulation |
| name | string | O | 소스 이름 (max 200자) |
| url | string | X | 소스 URL |

### 3.2 DiscoveryDataItem
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | O | 데이터 아이템 고유 ID |
| sourceId | string | O | CollectionSource.id 참조 |
| type | enum | O | CollectionSource.type과 동일 |
| title | string | O | 제목 (max 500자) |
| summary | string | O | 요약 (max 2000자) |
| content | string | X | 전문 (max 50000자) |
| tags | string[] | O | 태그 (max 20개, 각 max 50자) |
| confidence | number | O | 신뢰도 (0.0~1.0) |
| collectedAt | number | O | 수집 시각 (Unix timestamp, ms) |
| metadata | object | X | 추가 메타데이터 |

### 3.3 DiscoveryIngestPayload
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| version | "v1" | O | API 버전 |
| source | CollectionSource | O | 수집 소스 |
| timestamp | number | O | 전송 시각 (Unix timestamp, ms) |
| data | DiscoveryDataItem[] | O | 수집 데이터 (1~100건) |

## 4. 엔드포인트

### 4.1 POST /api/ax-bd/discovery/ingest
Discovery-X -> Foundry-X 수집 데이터 수신 (webhook).

**Request:**
- Headers: `Authorization: Bearer {API_KEY}`, `Content-Type: application/json`
- Body: DiscoveryIngestPayload

**Response (200):**
```json
{ "ok": true, "received": 5 }
```

**Errors:** 400 (스키마 불일치), 401 (인증 실패), 429 (Rate Limit 초과)

### 4.2 GET /api/ax-bd/discovery/status
연동 상태 확인.

**Response (200):**
```json
{
  "connected": false,
  "lastSyncAt": null,
  "pendingItems": 0,
  "failedItems": 0,
  "version": "v1"
}
```

### 4.3 POST /api/ax-bd/discovery/sync
수동 재동기화 트리거.

**Response (200):**
```json
{ "ok": true, "message": "Sync triggered" }
```

## 5. Rate Limit

| 항목 | 값 |
|------|-----|
| 방식 | Token bucket |
| 한도 | 60 req/min per API key |
| 초과 시 | 429 Too Many Requests |
| 응답 헤더 | `X-RateLimit-Remaining`, `X-RateLimit-Reset` |

## 6. 에러 코드

| 코드 | 의미 | 대응 |
|------|------|------|
| 400 | Bad Request -- 스키마 불일치 | payload 수정 후 재시도 |
| 401 | Unauthorized -- 인증 실패 | API key 확인 |
| 429 | Too Many Requests -- Rate Limit | `X-RateLimit-Reset` 후 재시도 |
| 503 | Service Unavailable -- 일시 장애 | 지수 백오프 재시도 |

## 7. Fallback/재시도

| 항목 | 값 |
|------|-----|
| 전략 | 지수 백오프 (exponential backoff) |
| 초기 대기 | 1000ms |
| 최대 재시도 | 5회 |
| DLQ | 5회 실패 시 Dead Letter Queue에 보관 후 수동 재처리 |

## 8. 버전 관리

| 항목 | 규칙 |
|------|------|
| 접두사 | version 필드에 "v1" 명시 |
| 하위호환 | 필드 추가는 허용, 삭제/변경 시 v2로 신규 |
| Deprecation | 최소 30일 전 공지 |
