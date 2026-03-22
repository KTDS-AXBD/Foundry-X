---
code: FX-GUID-162
title: Azure Migration PoC Guide
version: "1.0"
status: Draft
category: GUID
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# Azure Migration PoC Guide

F162 Azure 마이그레이션 PoC 결과를 정리한 가이드 문서.

## 1. Cloudflare → Azure 스택 매핑

| 영역 | Cloudflare (현재) | Azure (마이그레이션) | 비고 |
|------|-------------------|---------------------|------|
| Compute | Workers | Azure Functions (Consumption Plan) | HTTP Trigger, v4 프로그래밍 모델 |
| Database | D1 (SQLite) | Azure SQL Database (Basic/S0) | T-SQL 변환 필요 |
| KV Store | Workers KV | Azure Table Storage / Redis Cache | 단순 키-값: Table Storage 권장 |
| Static Hosting | Pages | Azure Static Web Apps | Next.js SSR: App Service 검토 |
| DNS | Cloudflare DNS | Azure DNS | CNAME 재구성 |
| CDN | Cloudflare CDN (내장) | Azure CDN / Front Door | Front Door 권장 (WAF 포함) |
| Secrets | `wrangler secret` | Azure Key Vault / App Settings | App Settings로 시작, 운영 시 Key Vault |
| Cron | Cron Triggers | Timer Trigger (Azure Functions) | cron 표현식 호환 |
| Monitoring | Sentry (toucan-js) | Application Insights | Azure 네이티브 APM |
| CI/CD | GitHub Actions + wrangler | GitHub Actions + Azure CLI | `az functionapp deploy` |

## 2. 핵심 변환 포인트

### 2.1 런타임 어댑터

Hono 앱은 Web Standard `fetch` API를 사용하므로, Azure Functions의 `HttpRequest`를 Web `Request`로 변환하는 thin adapter만 있으면 모든 라우팅과 미들웨어가 그대로 동작해요.

- **어댑터 파일**: `packages/api/src/azure.ts`
- **변환 흐름**: `Azure HttpRequest` → `new Request()` → `honoApp.fetch()` → `Response` → `HttpResponseInit`
- **catch-all 라우팅**: `route: '{*path}'`로 모든 경로를 Hono에 위임

### 2.2 SQL 문법 변환

| SQLite (D1) | Azure SQL (T-SQL) | 설명 |
|-------------|-------------------|------|
| `TEXT` | `NVARCHAR(255)` / `NVARCHAR(MAX)` | 길이 제한 명시 필요 |
| `REAL` | `FLOAT` | 부동소수점 |
| `INTEGER` | `INT` | 정수 |
| `datetime('now')` | `GETUTCDATE()` | UTC 타임스탬프 |
| `INSERT OR IGNORE` | `IF NOT EXISTS (...) INSERT` | 멱등성 보장 |
| `CREATE TABLE IF NOT EXISTS` | `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '...')` | DDL 멱등성 |
| `lower(hex(randomblob(16)))` | 앱 레이어에서 UUID 생성 | `NEWID()` 또는 앱 생성 |
| `CHECK(...)` | `CHECK(...)` | 동일하게 지원 |
| `FOREIGN KEY ... ON DELETE CASCADE` | 동일 | T-SQL 네이티브 지원 |

### 2.3 환경변수

| 변수 | Cloudflare | Azure |
|------|-----------|-------|
| DB 연결 | D1 바인딩 (`env.DB`) | `AZURE_SQL_CONNECTION_STRING` |
| JWT | `wrangler secret` | App Settings 또는 Key Vault |
| GitHub | `wrangler secret` | App Settings |

## 3. PoC에서 확인된 것

| 항목 | 상태 | 세부 |
|------|------|------|
| Hono → Azure Functions 어댑터 | PoC 작성 완료 | `azure.ts` — Request/Response 변환 검증 |
| Azure Functions v4 등록 | PoC 작성 완료 | `app.http()` catch-all 패턴 |
| 핵심 5 테이블 T-SQL 변환 | PoC 작성 완료 | users, organizations, org_members, projects, sr_requests |
| 데모 시드 데이터 | PoC 작성 완료 | IF NOT EXISTS 멱등 패턴 |
| host.json / local.settings.json | PoC 작성 완료 | Extension Bundle v4 |

## 4. 미확인 항목 (전체 마이그레이션 시 검증 필요)

| 항목 | 리스크 | 대안 |
|------|--------|------|
| Azure SQL 실제 연결 (`mssql`/`tedious` 패키지) | D1 API(`env.DB.prepare().bind()`)와 인터페이스 불일치 | DB 추상화 레이어 도입 |
| 나머지 41개 테이블 T-SQL 변환 | 볼륨 크지만 패턴 동일 | 스크립트 자동 변환 도구 작성 |
| Workers KV → Table Storage 마이그레이션 | 캐시 로직 변경 필요 | Redis Cache 대안 검토 |
| Cron Trigger → Timer Trigger 전환 | cron 표현식 미세 차이 | Azure NCRONTAB 포맷 확인 |
| Pages(Next.js SSR) → Static Web Apps | SSR 지원 범위 확인 필요 | App Service로 배포 |
| SSE(Server-Sent Events) 지원 | Azure Functions Consumption은 SSE 제한 | Premium Plan 또는 SignalR |
| 콜드 스타트 지연 | Functions Consumption Plan 특성 | Premium Plan warm-up |
| Sentry → Application Insights 전환 | 로깅 API 변경 | `@azure/monitor-opentelemetry` |

## 5. 예상 비용 (월간, 한국 리전)

| 리소스 | 사양 | 예상 월 비용 (USD) |
|--------|------|-------------------|
| Azure Functions (Consumption) | 100만 실행, 400K GB-s | ~$0 (무료 등급 내) |
| Azure SQL Database (Basic) | 5 DTU, 2GB | ~$5 |
| Azure SQL Database (S0) | 10 DTU, 250GB | ~$15 |
| Storage Account (Blob/Table) | 1GB | ~$1 |
| Azure DNS | 1 zone | ~$0.50 |
| Application Insights | 5GB/월 | ~$0 (무료 등급 내) |
| **합계 (Basic)** | | **~$7/월** |
| **합계 (S0, 프로덕션)** | | **~$17/월** |

> 참고: Cloudflare Workers Free 대비 Azure 기본 비용이 발생하지만, 고객사 Azure 테넌트 내 배포가 요구사항이므로 비용은 고객사 부담.

## 6. 전체 마이그레이션 예상 소요 시간

| 단계 | 작업 | 예상 기간 |
|------|------|-----------|
| Phase A | DB 추상화 레이어 + 나머지 테이블 변환 | 2-3일 |
| Phase B | Azure Functions 로컬 E2E 테스트 | 1-2일 |
| Phase C | KV → Table Storage 전환 | 1일 |
| Phase D | SSE → SignalR 전환 (필요시) | 2-3일 |
| Phase E | CI/CD + Azure 배포 파이프라인 | 1일 |
| Phase F | 모니터링(App Insights) + DNS 전환 | 1일 |
| **합계** | | **8-11일** |

## 7. 리스크와 대안

### 높은 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| D1 API ↔ Azure SQL API 불일치 | 모든 서비스에서 DB 호출 방식 변경 필요 | Repository 패턴으로 DB 접근 추상화 |
| SSE 미지원 (Consumption Plan) | 실시간 알림 불가 | Azure SignalR Service 또는 Premium Plan |
| 콜드 스타트 | 첫 요청 2-5초 지연 | Premium Plan warm-up 인스턴스 |

### 중간 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| T-SQL 미세 차이 | 쿼리 오류 | 통합 테스트에서 Azure SQL 직접 검증 |
| 환경변수 관리 | Key Vault 연동 복잡도 | 초기엔 App Settings, 운영 전환 시 Key Vault |

### 대안 아키텍처

1. **Azure Container Apps**: Functions 대신 컨테이너 기반 배포 — SSE 제약 해소, 콜드 스타트 감소
2. **Azure App Service**: Node.js 네이티브 런타임 — Functions 어댑터 불필요, 비용 약간 증가
3. **하이브리드**: API는 Container Apps, 스케줄 작업만 Functions Timer Trigger

## 8. 다음 단계

1. [ ] Azure SQL 실제 연결 테스트 (mssql 패키지 + Connection String)
2. [ ] DB 추상화 인터페이스 설계 (D1/Azure SQL 동시 지원)
3. [ ] 나머지 41개 테이블 T-SQL 자동 변환 스크립트
4. [ ] Azure Functions 로컬 실행 검증 (`func start`)
5. [ ] 고객사 Azure 테넌트 배포 테스트
6. [ ] SI 파트너 R&R과 Azure 운영 역할 확정 (F163 연계)
