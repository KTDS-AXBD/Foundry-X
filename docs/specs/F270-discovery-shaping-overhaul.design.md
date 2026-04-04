# F270: 발굴→형상화 정비 설계문서

**Sprint:** 101
**Status:** 구현 완료 (코드 수정됨, typecheck/빌드 필요)
**Date:** 2026-04-04

---

## 1. 이슈 분석 및 수정 내역

### 1-1. 사이드바 배경 투명도 (모바일)

**증상:** 모바일에서 사이드바 Sheet 열 때 배경이 투명해서 텍스트 가독성 저하
**원인:** `SheetContent`에 `bg-background` 클래스 누락
**수정 파일:** `packages/web/src/components/sidebar.tsx`
**변경:** `SheetContent`에 `bg-background` 추가

### 1-2. 발굴 대시보드 별도 메뉴 제거

**증상:** "2. 발굴" 메뉴 아래 "대시보드"가 별도 항목으로 존재하여 불필요한 네비게이션
**수정 파일:** `packages/web/src/components/sidebar.tsx`
**변경:** `processGroups`의 "discover" 그룹에서 대시보드 항목 제거

### 1-3. Discovery 메인 페이지에 대시보드 탭 통합

**증상:** 대시보드 메뉴를 제거했으므로 Discovery 메인에서 접근 가능해야 함
**수정 파일:**
- `packages/web/src/routes/ax-bd/discovery.tsx` — "대시보드" 탭 추가
- `packages/web/src/components/feature/discovery/DiscoverDashboardContent.tsx` — **신규** 컴포넌트 (대시보드 내용 추출)

**변경:** 기존 `/ax-bd/discover-dashboard` 페이지의 핵심 내용을 `DiscoverDashboardContent`로 추출하고, Discovery 메인 페이지 탭으로 통합. lazy import로 코드 스플리팅.

### 1-4. "다음 단계" 클릭 시 실제 단계 전환

**증상:** WizardStepDetail의 "다음 단계: 2-1 레퍼런스 분석" 텍스트가 클릭 불가
**수정 파일:**
- `packages/web/src/components/feature/discovery/WizardStepDetail.tsx`
- `packages/web/src/components/feature/discovery/DiscoveryWizard.tsx`

**변경:**
- `WizardStepDetail`에 `onNavigateStage` prop 추가
- "다음 단계" 텍스트를 클릭 가능한 버튼으로 변환
- 현재 단계가 "completed"일 때만 활성화 (파란색 배경 + "클릭하여 이동" 안내)
- `DiscoveryWizard`에서 `onNavigateStage`를 `setActiveStage`로 연결

### 1-5. 아이템 카드 클릭 404 에러 수정

**증상:** 사업 아이템 현황 카드 클릭 시 `Unexpected Application Error! 404 Not Found`
**원인:** `discovery-detail.tsx`의 `fetchBizItemDetail` API 호출 실패 시 에러가 React Router 에러 바운더리까지 전파
**수정 파일:** `packages/web/src/routes/ax-bd/discovery-detail.tsx`

**변경 (전면 리라이트):**
- 에러 발생 시 graceful fallback UI (경고 아이콘 + 안내 메시지 + "뒤로 가기" / "Discovery 메인으로" 버튼)
- React Router 에러 바운더리 대신 컴포넌트 내부 에러 상태로 처리
- 아이템 상세 + 위저드 스텝 진행 통합 (기존 단순 정보 표시 → 실제 분석 작업 가능)
- HITL 리뷰 패널 연동

### 1-6. Agent 스킬 실행 UI 연동

**증상:** 각 단계별 스킬이 정의만 되어 있고 실제 실행 UI 없음
**수정 파일:** `packages/web/src/components/feature/discovery/WizardStepDetail.tsx`

**변경:**
- 스킬 뱃지를 Bot 아이콘 + 클릭 가능한 버튼으로 변환
- `POST /ax-bd/skills/:skillId/execute` API 연동 (기존 `BdSkillExecutor` 서비스 활용)
- 실행 중 로딩 스피너, 완료/실패 결과 표시
- 완료 시 산출물 상세 보기 연결
- "pending" 상태에서는 스킬 실행 비활성화 (먼저 "시작하기" 필요)

---

## 2. 수정 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `packages/web/src/components/sidebar.tsx` | 수정 | SheetContent bg-background 추가 + 대시보드 메뉴 제거 |
| `packages/web/src/routes/ax-bd/discovery.tsx` | 수정 | 대시보드 탭 추가 (lazy import) |
| `packages/web/src/components/feature/discovery/DiscoverDashboardContent.tsx` | **신규** | 대시보드 콘텐츠 컴포넌트 추출 |
| `packages/web/src/components/feature/discovery/WizardStepDetail.tsx` | 수정 | Agent 스킬 실행 + 다음 단계 네비게이션 |
| `packages/web/src/components/feature/discovery/DiscoveryWizard.tsx` | 수정 | onNavigateStage prop 전달 |
| `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 전면 리라이트 | 404 에러 처리 + 위저드 통합 |

---

## 3. 남은 작업 (후속 Sprint)

### 3-1. Agent 오케스트레이션 파이프라인 강화
- 현재: 단일 스킬 실행 → 사용자가 수동으로 다음 단계 이동
- 목표: 연속 스킬 실행 파이프라인 (2-0 완료 → 자동으로 2-1 스킬 추천/실행)
- 기존 `.claude/skills/ax-bd-discovery/` 스킬과 연결

### 3-2. E2E 테스트 추가
- Discovery 위저드 전체 흐름 E2E
- 아이템 상세 페이지 에러 처리 E2E
- 스킬 실행 + HITL 리뷰 E2E

### 3-3. 형상화 단계 연동
- 2-10 최종 보고서 완료 시 → 형상화 (3단계) 자동 전환
- Spec 생성기 / BMC / Offering Pack 자동 연결

---

## 4. 배포 전 체크리스트

- [ ] `pnpm typecheck` (packages/web) 통과
- [ ] `pnpm test` (packages/web) 통과
- [ ] `pnpm build` (packages/web) 성공
- [ ] `pnpm e2e` discovery 관련 스펙 통과
- [ ] Windows PowerShell에서 `wrangler pages deploy` 실행
