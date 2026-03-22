---
code: FX-ANLS-046
title: "Sprint 46 Gap Analysis — Phase 5 고객 파일럿 준비 (F162+F163+F169)"
version: 1.0
status: Active
category: ANLS
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo (gap-detector)
feature: sprint-46
sprint: 46
match_rate: 91
---

# Sprint 46 Gap Analysis

## Match Rate: **91%** (즉시 조치 3건 반영 후)

| 카테고리 | 점수 | 상태 |
|----------|:----:|:----:|
| Design Match | 88% | ✅ |
| Architecture Compliance | 95% | ✅ |
| Convention Compliance | 92% | ✅ |
| **Overall** | **91%** | ✅ |

> 초기 82% → 즉시 조치 3건(troubleshooting.md, migrate.sh, 문서코드 수정) 후 **91%**

---

## Feature별 점수

| Feature | 점수 | 핵심 산출물 | 비고 |
|---------|:----:|:-----------:|------|
| F162 Azure PoC | 78% | azure.ts + 2 SQL + host.json + 가이드 | config.ts, migrate.sh 미구현 |
| F169 데모 환경 | 88% | demo-seed + scenario + account-setup | troubleshooting.md 미구현 |
| F163 SI R&R | 100% | si-partner-rr.md (7섹션, Design 초과) | Enhanced |

---

## Missing (Design O, Implementation X) — 3건

| # | 항목 | Design 위치 | 영향 |
|:-:|------|------------|:----:|
| 1 | `config.ts` isAzure + getDbClient() | §2.4 | Medium |
| 2 | `packages/api/src/db/azure/migrate.sh` | §2.3 | Low |
| 3 | `docs/specs/demo/demo-troubleshooting.md` | §3.4 | Low |

## Changed (Design != Implementation) — 2건

| # | 항목 | Design | 구현 | 영향 |
|:-:|------|--------|------|:----:|
| 1 | Azure SQL 테이블 구성 | sr_classifications + agent_tasks | sr_requests + org_members | Low |
| 2 | Azure seed 조직명 | 'KT DS 파일럿' | 'Demo Organization' | Low |

## Added (Design X, Implementation O) — 5건

| # | 항목 | 설명 |
|:-:|------|------|
| 1 | demo-account-setup.md | 해시 생성, 삽입, 리셋 가이드 (7섹션) |
| 2 | azure/local.settings.json | 로컬 개발 환경 변수 |
| 3 | si-partner-rr.md §4 커스터마이징 가이드 | 표준/고급/제외 3단계 분류 |
| 4 | si-partner-rr.md §6 커뮤니케이션 채널 | Slack, 주간 미팅, GitHub |
| 5 | demo-seed.sql sr_workflow_runs | 워크플로우 실행 기록 2건 시드 |

---

## 90% 달성을 위한 즉시 조치 (3건)

1. `docs/specs/demo/demo-troubleshooting.md` 작성
2. `packages/api/src/db/azure/migrate.sh` 작성
3. `azure-migration-guide.md` 문서 코드 수정 (AIF → FX)

## 보류 항목 (PoC 범위 초과)

- `config.ts isAzure + getDbClient()` — Azure SQL 실 연결 Sprint에서 구현 적절
