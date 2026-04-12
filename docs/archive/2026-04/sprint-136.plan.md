---
code: FX-PLAN-S136
title: "Sprint 136 — 데이터 백업/복구 + 운영 계획 (F317)"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-309]]"
---

# Sprint 136: 데이터 백업/복구 + 운영 계획 (F317)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F317 데이터 백업/복구 + 운영 계획 — 산출물 백업 + 복구 시나리오 + 운영 정책 + Hotfix 체계 |
| Sprint | 136 |
| 우선순위 | P2 |
| 의존성 | F315(모니터링+알림+권한) 선행 — Sprint 134 ✅ |
| PRD 근거 | fx-discovery-v2/prd-final.md §4.1 항목 9(데이터 백업/복구) + 항목 10(운영/배포 계획) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Discovery 파이프라인 산출물 유실 시 복구 수단 없음. 운영 정책/책임 미정의 |
| Solution | JSON Export/Import API + Cron 자동 백업 + 운영 정책 문서 + Hotfix 체계 |
| Function UX Effect | 관리자가 백업 목록 조회 → 원클릭 복원. 운영 가이드로 장애 대응 절차 명확화 |
| Core Value | 데이터 안전성 확보 + 운영 성숙도 향상 (fx-discovery-v2 M3 마지막 마일스톤) |

## 작업 목록

### API — 신규 서비스 + 라우트

| # | 파일 | 설명 |
|---|------|------|
| 1 | `api/src/services/backup-restore-service.ts` | Export(JSON 직렬화) + Import(JSON 역직렬화) + 백업 메타 관리. 대상: bd_artifacts, pipeline_checkpoints, bd_pipeline_runs |
| 2 | `api/src/routes/backup-restore.ts` | POST /backup/export, POST /backup/import, GET /backup/list, GET /backup/:id, DELETE /backup/:id |
| 3 | `api/src/schemas/backup-restore.ts` | Zod 스키마 — BackupCreateSchema, BackupImportSchema, BackupListQuery |
| 4 | `api/src/db/migrations/0093_backup_metadata.sql` | backup_metadata 테이블 (id, org_id, type, scope, item_count, size_bytes, created_by, created_at) |

### API — 수정

| # | 파일 | 설명 |
|---|------|------|
| 5 | `api/src/index.ts` | backup-restore 라우트 등록 |
| 6 | `api/src/scheduled.ts` | Cron 자동 백업 — 매일 1회 `0 3 * * *` (KST 03:00) 자동 Export |

### Web — 관리 UI

| # | 파일 | 설명 |
|---|------|------|
| 7 | `web/src/routes/dashboard.backup.tsx` | 백업 관리 페이지 — 목록 + Export/Import 버튼 + 상세 모달 |
| 8 | `web/src/lib/api-client.ts` | backup API 함수 추가 (exportBackup, importBackup, listBackups, deleteBackup) |

### Web — 수정

| # | 파일 | 설명 |
|---|------|------|
| 9 | `web/src/layouts/AppLayout.tsx` | 사이드바 "백업 관리" 메뉴 추가 (admin 전용) |

### 문서 — 운영 정책

| # | 파일 | 설명 |
|---|------|------|
| 10 | `docs/specs/fx-discovery-v2/ops-guide.md` | 운영 가이드 — 백업 정책 + 복구 절차 + 모니터링 + Hotfix 체계 + 담당자 매핑 |

### 테스트

| # | 파일 | 설명 |
|---|------|------|
| 11 | `api/src/__tests__/backup-restore.test.ts` | Export/Import 라운드트립 + 에러 케이스 + 권한 체크 |

## 구현 순서

```
4(migration) → 3(schema) → 1(service) → 2(route) → 5(등록) → 6(cron)
→ 8(api-client) → 7(UI) → 9(sidebar)
→ 10(ops-guide)
→ 11(tests)
```

## 리스크

| # | 리스크 | 대응 |
|---|--------|------|
| 1 | D1 Export 시 대량 row → Workers 메모리 제한 | biz_item_id 기준 단위 Export (한 아이템씩) |
| 2 | Import 시 FK 충돌 (이미 존재하는 ID) | UPSERT(INSERT OR REPLACE) 전략 |
| 3 | Cron 실패 시 백업 누락 | notification-service 알림 연동 (F315) |

## 예상 산출물

- 신규 파일 5개 (service + route + schema + migration + test)
- 수정 파일 4개 (index.ts + scheduled.ts + api-client.ts + AppLayout.tsx)
- 신규 Web 라우트 1개 (backup 관리)
- 운영 가이드 문서 1개
- 테스트 ~10건
