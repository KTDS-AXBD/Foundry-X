---
code: FX-PLAN-S235
title: "Sprint 235 Plan — Discovery 동기화 파이프라인 (F478~F482)"
version: 1.0
status: Active
category: plan
created: 2026-04-09
updated: 2026-04-09
author: Claude Opus 4.6
system-version: "0.1.0"
---

# Sprint 235 Plan — Discovery 동기화 파이프라인

## 1. Executive Summary

| 항목 | 값 |
|------|---|
| Sprint | 235 |
| Phase | 28: Discovery 동기화 파이프라인 |
| F-items | F478, F479, F481, F482 |
| 브랜치 | sprint/235 |
| 상위 Plan | discovery-item-detail-review.plan.md |

### F-item 상태

| F-item | 제목 | 상태 | 비고 |
|--------|------|------|------|
| F478 | STATUS_CONFIG 매핑 보완 | ✅ 구현 완료 | Sprint 233에서 이미 추가 (business-plan-list.tsx:15-25, discovery-detail.tsx:50-55) |
| F479 | 분석 완료 → pipeline/discovery_stages 자동 전환 | ✅ 구현 완료 | Sprint 233에서 이미 추가 (biz-items.ts:320-330 — advanceStage + updateStage) |
| F481 | 평가결과서 HTML 자동 생성 스킬 | 📋 신규 구현 | CLAUDE_AXBD 커맨드 + HTML 템플릿 |
| F482 | bd_artifacts 자동 등록 파이프라인 | 📋 신규 구현 | API sync 엔드포인트 + 서비스 |

> F478/F479는 이전 세션에서 이미 구현 완료. Sprint 235의 실질 작업은 **F481 + F482**.

## 2. 배경 및 목표

### 2-1. 문제

CLAUDE_AXBD 스킬(Claude Code 프로젝트)에서 2단계 발굴 분석(2-0~2-10)을 수행하면:
1. 분석 결과가 로컬 파일(markdown)로만 저장됨
2. Foundry-X DB(bd_artifacts, discovery_stages)에 유입되는 파이프라인이 없음
3. 평가결과서 HTML(발굴단계완료 보고서)을 수동으로 작성해야 함

### 2-2. 목표

- **F481**: PRD-final.md를 파싱하여 9탭 HTML 평가결과서를 자동 생성하는 스킬 커맨드
- **F482**: 스킬 분석 완료 시 Foundry-X API를 호출하여 bd_artifacts + discovery_stages를 자동 동기화하는 파이프라인

## 3. 구현 범위

### F481: 평가결과서 HTML 자동 생성 스킬

| 구분 | 내용 |
|------|------|
| 입력 | `prd-{item}-final.md` 파일 경로 |
| 처리 | PRD 섹션을 9탭(2-1~2-9)으로 매핑 + HTML 템플릿 렌더링 |
| 출력 | `04_발굴단계완료_{item}.html` |
| 위치 | `CLAUDE_AXBD/.claude/commands/generate-evaluation-report.md` (신규) |

**PRD → 탭 매핑**:
| 탭 | PRD 섹션 |
|----|----------|
| 2-1 레퍼런스 | Pain Points, 솔루션 개요, 기술 비교 |
| 2-2 수요 시장 | TAM/SAM/SOM, 시장 성장 |
| 2-3 경쟁·자사 | 경쟁 환경, SWOT, 비대칭 우위 |
| 2-4 아이템 도출 | 솔루션, 기능 백로그, 엘리베이터 피치 |
| 2-5 아이템 선정 | 성공 기준, 리스크, Commit Gate |
| 2-6 타겟 고객 | 페르소나, 사용자 스토리 |
| 2-7 비즈니스 모델 | BMC, 투자, 매출, 수익성 |
| 2-8 패키징 | 실행 계획, GTM, Discovery Summary |
| 2-9 멀티 페르소나 | AI 8인 평가 자동 생성 |

### F482: bd_artifacts 자동 등록 파이프라인

| 구분 | 내용 |
|------|------|
| API | `POST /api/ax-bd/biz-items/:id/sync-artifacts` |
| 서비스 | `artifact-sync-service.ts` (신규) |
| 기능 | bd_artifacts upsert + discovery_stages 완료 갱신 + biz_items.status 전환 |
| 스킬 연동 | `skill-execution.md`에 API 호출 지침 추가 |

**API Request Body**:
```json
{
  "stages": [
    { "stage": "2-1", "outputText": "...", "skillId": "competitor-analysis" }
  ],
  "source": "claude-skill"
}
```

**서비스 로직**:
1. 각 stage에 대해 bd_artifacts INSERT (version 자동 증가)
2. biz_item_discovery_stages 상태를 `completed`로 갱신
3. 2-8 이상 완료 시 biz_items.status를 `evaluated`로 전환

## 4. 수정 파일 목록

### F481
| 파일 | 동작 |
|------|------|
| `docs/specs/axbd-skill/CLAUDE_AXBD/.claude/commands/generate-evaluation-report.md` | 신규 — 커맨드 정의 |
| `docs/specs/axbd-skill/CLAUDE_AXBD/references/evaluation-report-template.html` | 신규 — HTML/CSS 템플릿 |

### F482
| 파일 | 동작 |
|------|------|
| `packages/api/src/core/discovery/routes/biz-items.ts` | 수정 — sync-artifacts 엔드포인트 추가 |
| `packages/api/src/core/discovery/services/artifact-sync-service.ts` | 신규 — 동기화 서비스 |
| `packages/api/src/core/discovery/schemas/artifact-sync.ts` | 신규 — Zod 스키마 |
| `docs/specs/axbd-skill/CLAUDE_AXBD/.claude/rules/skill-execution.md` | 수정 — API 호출 지침 추가 |

### F478/F479 (검증만)
| 파일 | 확인 |
|------|------|
| `packages/web/src/routes/business-plan-list.tsx` | ✅ STATUS_CONFIG 매핑 확인 |
| `packages/web/src/routes/ax-bd/discovery-detail.tsx` | ✅ STATUS_LABELS 매핑 확인 |
| `packages/api/src/core/discovery/routes/biz-items.ts` | ✅ advanceStage + updateStage 확인 |

## 5. 의존성

- F482는 F479의 DiscoveryStageService.updateStage() 메서드를 재사용
- F482는 기존 BdArtifactService.create() + getNextVersion() 재사용
- F481은 독립 (스킬 커맨드 파일만 생성)

## 6. 테스트 계획

| 대상 | 방법 |
|------|------|
| F482 API | Vitest — sync-artifacts 엔드포인트 단위 테스트 (D1 mock) |
| F482 서비스 | Vitest — ArtifactSyncService 비즈니스 로직 테스트 |
| F481 | 수동 — CLAUDE_AXBD 환경에서 커맨드 실행 검증 (스킬 파일이므로 자동 테스트 불필요) |
| F478/F479 | 기존 테스트 통과 확인 |
