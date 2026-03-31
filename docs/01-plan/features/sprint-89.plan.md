---
code: FX-PLAN-S89
title: "Sprint 89 — BD 프로세스 가이드 UI + 스킬 카탈로그 UI"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S89]]"
---

# Sprint 89: BD 프로세스 가이드 UI + 스킬 카탈로그 UI

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F258 BD 프로세스 가이드 UI + F259 BD 스킬 카탈로그 UI |
| Sprint | 89 |
| 기간 | 2026-03-31 |
| 우선순위 | P0 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD팀이 2-0~2-10 발굴 프로세스를 수행할 때, 단계별 설명·유형별 강도·사용 스킬을 CLI 스킬 문서에서 직접 찾아야 하는 불편함 |
| Solution | 웹 대시보드에 프로세스 가이드 페이지와 스킬 카탈로그를 시각화하여 탐색 비용 제거 |
| Function UX Effect | /ax-bd 하위에 process-guide, skill-catalog 2개 라우트 추가 → 팀원이 브라우저에서 즉시 참조 |
| Core Value | BD 프로세스의 웹 접근성 확보 — CLI 의존 없이 팀 전원이 단계별 가이드를 활용 가능 |

## 목표

1. **F258**: BD 2-0~2-10 발굴 프로세스를 웹에서 시각적으로 탐색 가능하게 함
   - 11단계 프로세스 설명 + 유형별(I/M/P/T/S) 강도 매핑 테이블
   - 사업성 체크포인트 가이드 (7단계 Go/Pivot/Drop + Commit Gate)
2. **F259**: BD 스킬 76개 + 커맨드 36개를 검색·필터·카테고리로 탐색 가능하게 함
   - 단계별 추천 스킬 하이라이트
   - 스킬 상세(설명/입력/산출물) 모달

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F258 | BD 프로세스 가이드 UI | P0 | axbd-skill SKILL.md + stages-detail.md 기반 |
| F259 | BD 스킬 카탈로그 UI | P0 | .claude/skills/ + commands/ 메타데이터 기반 |

## 기술 결정

### 데이터 소스 전략

F258과 F259의 데이터는 **정적 JSON**으로 관리한다 (API/D1 미사용):
- BD 프로세스 정의는 변경 빈도가 낮고, Git 기반 SSOT 원칙에 부합
- 스킬 메타데이터도 SKILL.md에서 추출한 정적 데이터
- Sprint 90(F260)에서 스킬 실행 엔진 도입 시 API 연동으로 진화

### 라우팅 구조

```
/ax-bd/process-guide   ← F258 (신규)
/ax-bd/skill-catalog   ← F259 (신규)
```

기존 `/ax-bd/discovery` (biz-item 파이프라인 목록)와 독립.

## 실행 계획

### Step 1: 정적 데이터 파일 생성 (~10분)

1. `packages/web/src/data/bd-process.ts` — 11단계 프로세스 정의 (SKILL.md 기반)
   - 단계 ID, 이름, 설명, 방법론, 프레임워크, 사업성 체크포인트
   - 유형별 강도 매트릭스 (핵심/보통/간소)
2. `packages/web/src/data/bd-skills.ts` — 스킬/커맨드 카탈로그 메타데이터
   - 카테고리, 단계 매핑, 설명, 입력/산출물

### Step 2: F258 프로세스 가이드 페이지 (~20분)

1. `packages/web/src/routes/ax-bd/process-guide.tsx` — 라우트 컴포넌트
2. `packages/web/src/components/feature/ax-bd/ProcessGuide.tsx` — 메인 컴포넌트
   - 11단계 타임라인/아코디언 뷰
   - 단계 클릭 → 상세 설명 + 사용 프레임워크 + 체크포인트
3. `packages/web/src/components/feature/ax-bd/TypeIntensityMatrix.tsx` — 유형별 강도 매트릭스 테이블
   - I/M/P/T/S × 2-1~2-7 그리드, 핵심/보통/간소 컬러 코딩
4. `packages/web/src/components/feature/ax-bd/CheckpointGuide.tsx` — 사업성 체크포인트 + Commit Gate
5. 라우터에 `/ax-bd/process-guide` 추가

### Step 3: F259 스킬 카탈로그 페이지 (~20분)

1. `packages/web/src/routes/ax-bd/skill-catalog.tsx` — 라우트 컴포넌트
2. `packages/web/src/components/feature/ax-bd/SkillCatalog.tsx` — 메인 컴포넌트
   - 검색 바 + 카테고리 필터 (pm-skills, ai-biz, Anthropic, AI프레임워크, 경영전략)
   - 단계별 추천 스킬 하이라이트
3. `packages/web/src/components/feature/ax-bd/SkillCard.tsx` — 스킬 카드 UI
4. `packages/web/src/components/feature/ax-bd/SkillDetailModal.tsx` — 스킬 상세 모달
   - 설명, 입력, 산출물, 추천 단계
5. 라우터에 `/ax-bd/skill-catalog` 추가

### Step 4: 네비게이션 통합 + 테스트 (~10분)

1. AX BD 사이드바/서브메뉴에 "프로세스 가이드", "스킬 카탈로그" 링크 추가
2. 단위 테스트 작성 (컴포넌트 렌더링 + 필터 동작)
3. `turbo typecheck && turbo test` 통과 확인

## 의존성

- **선행 없음** — F258, F259 모두 "병렬 가능" (기존 코드 수정 최소)
- **후행**: F260(스킬 실행 엔진)이 F259의 카탈로그 데이터 구조를 활용

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 스킬 메타데이터 수동 추출 부담 | 중 | stages-detail.md에서 구조화된 데이터 추출, 향후 자동화 가능 |
| 프로세스 정의 변경 시 코드 수정 필요 | 저 | Sprint 90에서 API 기반으로 전환 시 해결 |

## 산출물 체크리스트

- [ ] `packages/web/src/data/bd-process.ts` — 프로세스 정적 데이터
- [ ] `packages/web/src/data/bd-skills.ts` — 스킬 카탈로그 정적 데이터
- [ ] `packages/web/src/routes/ax-bd/process-guide.tsx` — F258 라우트
- [ ] `packages/web/src/routes/ax-bd/skill-catalog.tsx` — F259 라우트
- [ ] `packages/web/src/components/feature/ax-bd/ProcessGuide.tsx`
- [ ] `packages/web/src/components/feature/ax-bd/TypeIntensityMatrix.tsx`
- [ ] `packages/web/src/components/feature/ax-bd/CheckpointGuide.tsx`
- [ ] `packages/web/src/components/feature/ax-bd/SkillCatalog.tsx`
- [ ] `packages/web/src/components/feature/ax-bd/SkillCard.tsx`
- [ ] `packages/web/src/components/feature/ax-bd/SkillDetailModal.tsx`
- [ ] 라우터 업데이트 (2개 라우트 추가)
- [ ] AX BD 네비게이션 업데이트
- [ ] 테스트 통과 (typecheck + lint + test)
