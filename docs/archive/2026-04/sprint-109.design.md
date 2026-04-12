---
code: FX-DSGN-109
title: "Sprint 109 — F281 데모 데이터 E2E 검증 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Claude Autopilot
sprint: 109
f_items: [F281]
req: [FX-REQ-273]
---

# Sprint 109 Design — F281 데모 데이터 E2E 검증

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F281 데모 데이터 E2E 검증 |
| Sprint | 109 |
| 선행 | F279+F280 (BD 데모 시딩, Sprint 108 ✅) |
| 예상 변경 | API 테스트 1개 + Web 컴포넌트 2개 수정 + 라이브러리 1개 추가 + E2E 1개 + demo-scenario 갱신 |

| 관점 | 내용 |
|------|------|
| Problem | 시드 데이터(D1 0082)가 Production에 배포되었으나, 웹 UI에서 Markdown 산출물이 raw 텍스트로 표시되고, 6단계 워크쓰루 E2E 검증이 없음 |
| Solution | react-markdown 도입 + empty state 방어 + API seed 테스트 + E2E walkthrough + demo-scenario 갱신 |
| Function UX Effect | 산출물 상세에서 Markdown이 정상 렌더링되어 가독성 향상, 빈 화면 방어로 에러 없는 UX |
| Core Value | 데모 시연 시 끊김 없는 6단계 BD 프로세스 흐름 보장 |

## §1 배경

Sprint 108에서 D1 0082 마이그레이션으로 2개 아이디어(헬스케어AI + GIVC) × 18테이블 104 rows + bd_artifacts 16건 한글 콘텐츠를 시딩했어요. 이 데이터가 웹 UI에서 정상 동작하는지 E2E로 검증하고, 발견된 UI 결함을 수정해야 해요.

### 현재 문제점

1. **Markdown 미렌더링**: `ArtifactDetail.tsx`가 `whitespace-pre-wrap`으로 outputText를 표시 → Markdown 마크업(`#`, `**`, `-`)이 raw 텍스트로 보임
2. **demo-scenario 구버전**: 체크리스트가 D1 0077~0078 기준, 현재는 0082
3. **E2E 부재**: BD 데모 시나리오 기반 워크쓰루 E2E spec이 없음
4. **API seed 테스트 부재**: 시드 데이터 조회를 검증하는 전용 테스트가 없음

## §2 변경 파일 목록

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 1 | `packages/web/package.json` | 수정 | `react-markdown` + `remark-gfm` 의존성 추가 |
| 2 | `packages/web/src/components/feature/ax-bd/ArtifactDetail.tsx` | 수정 | outputText를 ReactMarkdown으로 렌더링 |
| 3 | `packages/web/src/routes/ax-bd/demo-scenario.tsx` | 수정 | 체크리스트 D1 0082 기준 갱신 + 6단계 딥링크 추가 |
| 4 | `packages/web/src/routes/ax-bd/discover-dashboard.tsx` | 수정 | empty state 방어 로직 보강 (optional chaining) |
| 5 | `packages/web/src/routes/ax-bd/progress.tsx` | 수정 | empty state 방어 로직 보강 |
| 6 | `packages/api/src/__tests__/bd-demo-seed.test.ts` | 신규 | 시드 데이터 API 응답 검증 테스트 |
| 7 | `packages/web/e2e/bd-demo-walkthrough.spec.ts` | 신규 | 6단계 워크쓰루 E2E spec |

## §3 상세 설계

### 3.1 Markdown 렌더링 (파일 #1, #2)

**라이브러리**: `react-markdown` + `remark-gfm` (GFM 테이블/체크리스트 지원)

**ArtifactDetail.tsx 변경**:
```tsx
// Before:
<div className="prose prose-sm max-w-none rounded-lg border p-4 whitespace-pre-wrap">
  {artifact.outputText ?? "(결과 없음)"}
</div>

// After:
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

<div className="prose prose-sm max-w-none rounded-lg border p-4 dark:prose-invert">
  {artifact.outputText ? (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {artifact.outputText}
    </ReactMarkdown>
  ) : (
    <span className="text-muted-foreground">(결과 없음)</span>
  )}
</div>
```

**Tailwind prose 스타일**: `dark:prose-invert` 추가로 다크모드 대응. `whitespace-pre-wrap` 제거 (Markdown이 자체 레이아웃 처리).

### 3.2 demo-scenario.tsx 갱신 (파일 #3)

변경 사항:
1. **체크리스트**: D1 0077~0078 → D1 0082 (bd_demo_seed) 반영
2. **6단계 딥링크**: 각 Act에 해당 페이지 Link 추가
   - Act 1 (온보딩): `/ax-bd/discovery` → discover-dashboard
   - Act 2 (발굴 위저드): `/ax-bd/discover-dashboard` → 프로세스 진행
   - Act 3 (Help Agent): `/ax-bd/discover-dashboard` → 챗 패널
   - Act 4 (HITL): `/ax-bd/artifacts` → 산출물 목록
3. **시드 데이터 아이디어명**: "AI 기반 제조 품질 예측" → 실제 시드 "헬스케어 AI 진단 보조" / "GIVC 플랫폼"

### 3.3 empty state 방어 (파일 #4, #5)

**패턴**: API 응답이 `undefined`/`null`일 때 optional chaining + 빈 배열 fallback.

```tsx
// discover-dashboard.tsx — 데이터 fetch 후
const items = data?.items ?? [];
const stages = data?.stages ?? [];
```

**progress.tsx**: 진행률 데이터가 없을 때 0% 표시 + "아직 진행 데이터가 없어요" 메시지.

### 3.4 API 시드 데이터 테스트 (파일 #6)

`bd-demo-seed.test.ts` — D1 0082 시드 데이터가 API를 통해 정상 반환되는지 검증.

**테스트 항목**:
- `GET /ax-bd/biz-items` → 시드 아이디어 2건 이상 반환
- `GET /ax-bd/biz-items/:id/artifacts` → 산출물 목록 반환
- `GET /ax-bd/artifacts/:id` → 산출물 상세 (outputText 포함)
- `GET /ax-bd/biz-items/:id/discovery-stages` → 발굴 단계 반환
- `GET /ax-bd/evaluations?bizItemId=:id` → 사업성 평가 반환
- `GET /ax-bd/biz-items/:id/progress` → 진행률 반환

**Mock 전략**: 기존 in-memory SQLite D1 mock 사용. 시드 SQL(0082)을 테스트 setup에서 실행.

### 3.5 E2E 워크쓰루 spec (파일 #7)

`bd-demo-walkthrough.spec.ts` — API mock 기반 6단계 네비게이션.

**테스트 시나리오**:
1. `/ax-bd` → ideas 리다이렉트 확인
2. `/ax-bd/demo-scenario` → 데모 시나리오 페이지 렌더링
3. `/ax-bd/ideas` → 아이디어 목록 (시드 데이터 mock)
4. `/ax-bd/artifacts` → 산출물 목록 렌더링
5. `/ax-bd/artifacts/:id` → 산출물 상세 Markdown 렌더링 확인
6. `/ax-bd/progress` → 진행률 페이지 렌더링

**인증**: 기존 `fixtures/auth.ts` 활용 (`authenticatedPage`).

## §4 의존성

- `react-markdown` ^9.0.0 (ESM, React 18+ 호환)
- `remark-gfm` ^4.0.0 (GFM 확장)
- 기존 Tailwind `@tailwindcss/typography` 플러그인 (prose 클래스) — 이미 설치 여부 확인 필요

## §5 Worker 파일 매핑

단일 구현 — Worker 분할 불필요 (UI 보정 + 테스트 작성 간 의존성 높음)

## §6 성공 기준

- [ ] `pnpm install` 성공 (react-markdown + remark-gfm)
- [ ] ArtifactDetail에서 Markdown 콘텐츠가 prose 스타일로 렌더링
- [ ] demo-scenario 체크리스트가 D1 0082 기준으로 갱신
- [ ] discover-dashboard, progress 페이지 empty state 방어
- [ ] bd-demo-seed.test.ts 6+ assertions PASS
- [ ] bd-demo-walkthrough.spec.ts PASS
- [ ] `turbo typecheck` PASS
- [ ] 기존 테스트 regression 없음
