---
code: FX-GUID-OPS-001
title: "Discovery Pipeline 운영 가이드"
version: "1.0"
status: Active
category: GUID
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
references: "[[FX-REQ-309]], [[FX-DSGN-S136]]"
---

# Discovery Pipeline 운영 가이드

## 1. 백업 정책

### 1.1 자동 백업
- **주기**: 매일 KST 03:00 (UTC 18:00)
- **범위**: 전체 org 데이터 (scope: full)
- **보관 기간**: 7일 (자동 삭제)
- **대상 테이블**: bd_artifacts, discovery_pipeline_runs, pipeline_checkpoints, pipeline_events
- **실행 주체**: Cloudflare Workers Cron Trigger (`0 */6 * * *`, UTC 18시 분기)

### 1.2 수동 백업
- **배포 전**: pre_deploy 타입으로 수동 백업 권장
- **방법**: 관리 > 백업 관리 > "전체 백업" 버튼 또는 API `POST /api/backup/export`
- **아이템 단위**: 특정 사업 아이템만 백업 시 `scope: "item"` + `bizItemId` 지정

### 1.3 백업 용량 가이드
- D1 row 최대 1MB — 아이템 수 100개 이하의 org는 full 백업 가능
- 100개 초과 시 item 단위 분할 백업 권장

## 2. 복구 절차

### 2.1 복구 전략

| 전략 | 동작 | 사용 시기 |
|------|------|-----------|
| merge | 기존 데이터 보존, 신규만 추가 | 일부 데이터 유실 시 보충 |
| replace | 범위 내 기존 삭제 후 전체 복원 | 데이터 무결성 의심 시 깨끗한 복원 |

### 2.2 복구 단계
1. 관리 > 백업 관리에서 복원 대상 백업 확인
2. "복원" 버튼 클릭 (기본: merge 전략)
3. 결과 확인: inserted(추가) / skipped(중복 건너뜀)
4. replace 전략이 필요하면 API 직접 호출: `POST /api/backup/import { backupId, strategy: "replace" }`

### 2.3 복구 후 검증
- Discovery 파이프라인 목록에서 복원된 실행 이력 확인
- 산출물(bd_artifacts) 데이터 정합성 확인
- 체크포인트 상태 확인 (승인/거부 이력)

## 3. 모니터링

### 3.1 자동 백업 모니터링
- F315 PipelineNotificationService 연동
- 자동 백업 실패 시 admin 사용자에게 알림 발송
- 백업 관리 페이지에서 최신 auto 백업 일시 확인

### 3.2 핵심 지표
| 지표 | 정상 범위 | 비정상 시 조치 |
|------|-----------|----------------|
| auto 백업 최신 일시 | 24시간 이내 | Cron Trigger 상태 확인 |
| backup_metadata row 수 | 7~14개 (auto) | retention 로직 확인 |
| payload size | < 500KB | 데이터 분할 검토 |

## 4. Hotfix 체계

### 4.1 Hotfix 프로세스
1. **발견**: 프로덕션 장애/버그 발견
2. **분류**: 긴급(서비스 중단) / 중요(기능 오류) / 경미(UI 이슈)
3. **수정**: `hotfix/{issue-number}` 브랜치에서 최소 변경
4. **검증**: 로컬 테스트 + typecheck 통과 확인
5. **배포**: PR → squash merge to master → CI/CD 자동 배포 (deploy.yml)
6. **확인**: Workers 배포 완료 + smoke test 통과

### 4.2 긴급 Hotfix (서비스 중단)
- 목표: 발견 후 30분 이내 배포
- 승인: admin 1명 approve 즉시 merge
- 롤백: 이전 Workers 버전으로 Cloudflare Dashboard에서 즉시 롤백 가능

### 4.3 일반 Hotfix
- 목표: 발견 후 2시간 이내 배포
- 승인: 일반 PR 프로세스 (1명 approve + CI 통과)

## 5. 담당자 매핑

| 역할 | 담당자 | 책임 |
|------|--------|------|
| 운영 총괄 | 서민원 (admin) | 배포 승인, 장애 대응 의사결정 |
| 기술 운영 | 김기욱 (admin) | D1 마이그레이션, Workers 배포, 모니터링 |
| 데이터 관리 | 김정원 (admin) | 백업/복구 실행, 데이터 정합성 검증 |
| AI 에이전트 | Claude Code | 자동 구현, 테스트, PDCA 사이클 |

## 6. 장애 대응 에스컬레이션

| Level | 조건 | 대응 | 담당 |
|-------|------|------|------|
| L1 | 파이프라인 단계 실패 | 자동 재시도 (max 3회) | 시스템 |
| L2 | 재시도 실패 | 수동 개입 (건너뛰기/중단) | 운영 담당자 |
| L3 | 데이터 손상/유실 | 백업 복구 + 원인 분석 | admin 전원 |

## 7. 정기 점검

- **주 1회**: 자동 백업 정상 동작 확인 (백업 관리 페이지)
- **월 1회**: 복원 테스트 (staging 환경에서 최신 백업 import)
- **분기 1회**: 백업 보관 정책 검토 + 데이터 증가 추세 확인
