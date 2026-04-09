# Plan: Discovery Detail UX v2 (F484~F487)

## 1. 개요

Discovery 아이템 상세 페이지의 UX 4대 이슈를 해결한다. 스크린샷 기반 점검 결과에서 도출.

## 2. 이슈 상세

### F484: 파이프라인 진행률 UI 개선

**문제**: PipelineProgressStepper가 현재 어떤 단계인지 시각적으로 식별이 어려움.
- 현재: 4단계 원형 노드 + 얇은 연결선, 색상 차이만으로 구분
- 필요: 현재 단계 강조, 진행률 퍼센티지, 단계별 상태 라벨

**수정 방향**: `/frontend-design`으로 스텝퍼 시각 리디자인
- 현재 단계에 pulse 애니메이션 또는 확대 노드
- 각 노드 아래 상태 텍스트 (완료일 또는 "진행 중")
- 전체 진행률 바 추가

**파일**: `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx`

### F485: 발굴 분석 11단계 결과 표시 + HITL 피드백 루프

**문제**: DiscoveryStageStepper가 11/11 완료로 표시되지만, 각 단계의 분석 결과가 보이지 않음. 사용자 피드백을 반영하는 HITL 루프도 없음.

**현재 동작**: 
- 2-0: starting-point + classify 자동 실행
- 2-1~2-8: stage-runner API 호출 → 결과 표시 → Go/Pivot/Stop
- 하지만 완료된 단계의 결과를 다시 볼 수 없음

**필요 동작** (단계별 HITL 루프):
```
AI 분석 실행 → 결과 출력 → 사용자 피드백 입력 
→ 피드백 반영 재실행 → 결과 출력 → 피드백 확인 반복 
→ 사용자 "확인/완료" → 다음 단계
```

**수정 방향**:
1. 완료된 단계 클릭 시 결과 펼쳐보기 (bd_artifacts 조회)
2. 각 단계에 "재실행" 버튼 (피드백 포함)
3. 피드백 히스토리 표시

**파일**:
- `packages/web/src/components/feature/discovery/DiscoveryStageStepper.tsx` — 결과 표시 + 재실행 UI
- `packages/web/src/lib/api-client.ts` — bd_artifacts 조회 API 추가
- `packages/api/src/core/discovery/services/stage-runner-service.ts` — 결과 저장/조회 로직

### F486: 발굴 9기준 체크리스트 UX 정리

**문제**: 
- 사용자가 체크리스트를 보고 뭘 어떻게 하라는 건지 모름
- "진행 중"으로 표시되어 있는데, 누가(AI? 사용자?) 어떻게 진행해야 할지 불명확

**현재 구현**: `DiscoveryCriteriaPanel` — 9개 기준을 체크리스트로 표시, 상태(pending/in_progress/completed)

**수정 방향**:
- Option A: 분석 리포트에 필요한 데이터라면 → AI 분석 결과와 연동하여 자동 완료 처리
- Option B: 정보성이라면 → 별도 가이드 패널로 분리 (체크리스트에서 제거)
- 각 기준에 "이건 뭔가요?" 설명 툴팁 추가
- AI 자동 평가 결과가 있으면 자동으로 체크 표시

**파일**: `packages/web/src/components/feature/discovery/DiscoveryCriteriaPanel.tsx`

### F487: 발굴 리포트 500 에러 수정

**문제**: `/discovery/items/bi-koami-001/report` 접근 시 500 에러
- API: `GET /api/ax-bd/discovery-report/bi-koami-001` → 500

**원인**: `discovery-report-service.ts`에서 `item_id` 컬럼 참조하는데, 프로덕션 DB는 `biz_item_id`
- 마이그레이션 `0098_discovery_reports.sql`은 `item_id`로 정의
- 프로덕션 DB 실제 컬럼은 `biz_item_id` (다른 마이그레이션이나 수동 변경으로 추정)
- `shared_token` 컬럼도 프로덕션에 없음

**수정 범위**:
- `discovery-report-service.ts` — `item_id` → `biz_item_id` 전체 교체 (10곳+)
- `shared_token` 참조 제거 또는 ALTER TABLE로 컬럼 추가
- 평가결과서 페이지와 차이점 점검 (동일 데이터 소스 사용 여부)

**파일**:
- `packages/api/src/core/discovery/services/discovery-report-service.ts` — 컬럼명 수정
- 마이그레이션 추가 (shared_token 컬럼 필요 시)

## 3. 우선순위

| F-item | 제목 | 복잡도 | 우선순위 |
|--------|------|--------|----------|
| F487 | 리포트 500 에러 | 낮음 | P0 즉시 |
| F484 | 파이프라인 UI | 중간 | P1 |
| F485 | 분석 결과 + HITL 루프 | 높음 | P1 |
| F486 | 9기준 체크리스트 UX | 중간 | P2 |

## 4. Sprint 구성 (안)

- **Sprint 237**: F487 (버그 수정) + F484 (파이프라인 UI) — 충돌 없음, 병렬 가능
- **Sprint 238**: F485 (HITL 루프) + F486 (체크리스트 UX) — discovery-detail 공통 영역
