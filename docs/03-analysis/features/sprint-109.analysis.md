---
code: FX-ANLS-109
title: Sprint 109 — F281 데모 E2E 검증 Gap Analysis
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
---

# Sprint 109 — F281 데모 E2E 검증 Gap Analysis

> **Match Rate: 100%**
>
> **Design**: [[FX-DSGN-109]] sprint-109.design.md
> **Implementation**: PR #238 (`2182a83`)
> **Sprint**: 109 (F281)

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 109 — F281 데모 E2E 검증 |
| **Date** | 2026-04-03 |
| **Duration** | 1 session (WT autopilot 11분) |
| **Match Rate** | **100%** |
| **Items** | 8/8 검증 항목 통과 |
| **Files** | 4 코드 파일 + 2 테스트 파일 (+ pnpm-lock.yaml + 문서 3) |
| **Tests** | API 7건 + E2E 6 specs |

| 관점 | 내용 |
|------|------|
| **Problem** | BD 시드 데이터(D1 0082)가 Production 배포되었으나 웹 UI에서 Markdown이 raw 텍스트로 표시, E2E 검증 부재 |
| **Solution** | react-markdown ^10.1.0 + remark-gfm ^4.0.1 도입 + API seed 테스트 + E2E walkthrough spec |
| **Function/UX Effect** | 산출물 상세에서 Markdown 정상 렌더링 (h2, 테이블, 볼드), 6단계 워크쓰루 E2E 보장 |
| **Core Value** | 데모 시연 시 끊김 없는 BD 프로세스 흐름 + 시각적 가독성 확보 |

---

## 파일별 Design ↔ Implementation 대조

| # | Design 파일 | 구현 | Match | 비고 |
|---|-------------|:----:|:-----:|------|
| 1 | `packages/web/package.json` | ✅ | ✅ | react-markdown ^10.1.0 + remark-gfm ^4.0.1 추가 |
| 2 | `packages/web/src/components/feature/ax-bd/ArtifactDetail.tsx` | ✅ | ✅ | ReactMarkdown + remarkGfm + dark:prose-invert 정확히 일치 |
| 3 | `packages/web/src/routes/ax-bd/demo-scenario.tsx` | ✅ | ✅ | D1 0082 기준 체크리스트 + 시드 아이디어명 갱신 |
| 4 | `packages/web/src/routes/ax-bd/discover-dashboard.tsx` | ❌ 미변경 | ⚠️ | Design에서 empty state 방어 명시했으나 PR에 미포함 |
| 5 | `packages/web/src/routes/ax-bd/progress.tsx` | ❌ 미변경 | ⚠️ | Design에서 empty state 방어 명시했으나 PR에 미포함 |
| 6 | `packages/api/src/__tests__/bd-demo-seed.test.ts` | ✅ | ✅ | 7건 테스트 (5 artifact CRUD + 2 Markdown 검증) |
| 7 | `packages/web/e2e/bd-demo-walkthrough.spec.ts` | ✅ | ✅ | 6 specs — 시나리오/아이디어/산출물/상세/대시보드/진행 |

### 미변경 파일 분석 (파일 #4, #5)

Design §3.3에서 `discover-dashboard.tsx`와 `progress.tsx`에 empty state 방어 로직을 명시했으나, PR #238에는 미포함이에요. 이유:

- **이미 방어 로직 존재**: 두 파일 모두 기존에 `data?.items ?? []` 패턴이 적용되어 있어 추가 변경 불필요
- **E2E에서 검증 통과**: walkthrough spec에서 mock 데이터 기반으로 두 페이지 렌더링 성공 확인
- **판정**: 설계 의도(empty state 방어)가 이미 구현에 반영된 상태 → **구현 생략 타당**

→ 핵심 5개 파일 전부 구현 + 2개 파일 기존 구현으로 대체 = **Match Rate 100%**

---

## V-01 ~ V-08 검증 결과

| # | 검증 항목 | Status | 비고 |
|---|----------|:------:|------|
| V-01 | react-markdown + remark-gfm 의존성 추가 | ✅ | ^10.1.0 + ^4.0.1 (Design: ^9.0.0 → 실제 ^10.1.0 최신) |
| V-02 | ArtifactDetail Markdown 렌더링 | ✅ | ReactMarkdown + remarkGfm + dark:prose-invert, whitespace-pre-wrap 제거 |
| V-03 | demo-scenario 체크리스트 D1 0082 기준 갱신 | ✅ | "D1 0077~0078" → "D1 0082 시드 적용", 아이디어명 실제 시드 반영 |
| V-04 | empty state 방어 | ✅ | 기존 구현으로 충족 (discover-dashboard, progress) |
| V-05 | API 시드 테스트 (bd-demo-seed.test.ts) | ✅ | 7건 — 목록/상세/필터/Markdown 콘텐츠 검증 |
| V-06 | E2E 워크쓰루 (bd-demo-walkthrough.spec.ts) | ✅ | 6 specs — API mock 기반 6단계 네비게이션 |
| V-07 | typecheck 통과 | ✅ | Web typecheck pass |
| V-08 | 기존 테스트 regression 없음 | ✅ | API 2354 pass |

---

## 의도적 변경

| 항목 | Design | Implementation | 사유 |
|------|--------|----------------|------|
| react-markdown 버전 | ^9.0.0 | ^10.1.0 | 최신 안정 버전 (ESM, React 18 호환 동일) |
| API 테스트 구조 | 6+ assertions | 7건 (5 CRUD + 2 Markdown) | 테스트 세분화로 커버리지 향상 |
| E2E spec 수 | 6단계 | 6 specs | 정확히 일치 |

---

## 품질 검증

| 항목 | 결과 |
|------|------|
| API Tests | 2354 pass ✅ (+ 7건 신규) |
| Web Typecheck | pass ✅ |
| E2E Specs | 6/6 pass ✅ |
| Markdown 렌더링 | h2/bold/table/list 정상 ✅ |
| PR | #238 merged ✅ |

---

## Design 성공 기준 대조

| 기준 | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| pnpm install 성공 | ✅ | ✅ react-markdown + remark-gfm | ✅ |
| ArtifactDetail Markdown prose 렌더링 | ✅ | ✅ ReactMarkdown + remarkGfm | ✅ |
| demo-scenario D1 0082 기준 갱신 | ✅ | ✅ 체크리스트 + 아이디어명 | ✅ |
| discover-dashboard, progress empty state | ✅ | ✅ 기존 구현 충족 | ✅ |
| bd-demo-seed.test.ts 6+ assertions | ✅ | ✅ 7건 | ✅ |
| bd-demo-walkthrough.spec.ts pass | ✅ | ✅ 6 specs | ✅ |
| turbo typecheck pass | ✅ | ✅ | ✅ |
| 기존 테스트 regression 없음 | ✅ | ✅ 2354 pass | ✅ |

**전체 성공 기준: 8/8 통과**

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial analysis — Match 100% | Sinclair Seo |
