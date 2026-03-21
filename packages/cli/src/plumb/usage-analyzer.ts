/**
 * F105: Plumb Track B 판정 — 사용 데이터 수집 + 분석 + 판정 매트릭스
 *
 * PRD v5 G3, §7.5: Track A 실사용 데이터 기반 전환 판단
 * 전환 기준: Plumb 버그로 인한 장애 주 2회 이상
 */

export interface PlumbUsageMetrics {
  /** 분석 기간 (주) */
  analysisPeriodWeeks: number;
  /** 코드베이스 내 PlumbBridge 호출 파일 수 */
  callSiteFiles: number;
  /** 코드베이스 내 PlumbBridge 호출 지점 목록 */
  callSites: string[];
  /** 에러 타입 수 */
  errorTypeCount: number;
  /** Git 커밋에서 plumb 관련 버그 수정 횟수 */
  bugFixCommits: number;
  /** 주간 장애 횟수 (bugFixCommits / analysisPeriodWeeks) */
  weeklyFailures: number;
  /** 에러율 추정 (버그 수정 / 전체 plumb 관련 커밋) */
  errorRate: number;
  /** 전체 plumb 관련 커밋 수 */
  totalPlumbCommits: number;
  /** 실사용자 KPI 데이터 존재 여부 */
  hasKpiData: boolean;
}

export interface TrackBDecision {
  decision: "go-track-b" | "stay-track-a" | "conditional";
  metrics: PlumbUsageMetrics;
  rationale: string;
  nextReviewDate: string;
}

/**
 * 판정 매트릭스:
 * - go-track-b: 주간 장애 ≥ 2 AND 에러율 > 10%
 * - stay-track-a: 주간 장애 ≤ 1 AND 에러율 < 5%
 * - conditional: 그 외 경계 영역
 */
export function applyDecisionMatrix(metrics: PlumbUsageMetrics): TrackBDecision {
  const { weeklyFailures, errorRate } = metrics;

  if (weeklyFailures >= 2 && errorRate > 0.1) {
    return {
      decision: "go-track-b",
      metrics,
      rationale:
        `주간 장애 ${weeklyFailures.toFixed(1)}회 (기준: ≥2), 에러율 ${(errorRate * 100).toFixed(1)}% (기준: >10%). ` +
        `TypeScript 재구현 시작 권장.`,
      nextReviewDate: "",
    };
  }

  if (weeklyFailures <= 1 && errorRate < 0.05) {
    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + 6);
    return {
      decision: "stay-track-a",
      metrics,
      rationale:
        `주간 장애 ${weeklyFailures.toFixed(1)}회 (기준: ≤1), 에러율 ${(errorRate * 100).toFixed(1)}% (기준: <5%). ` +
        `Plumb Track A 유지, ${reviewDate.toISOString().slice(0, 10)}에 재판정.`,
      nextReviewDate: reviewDate.toISOString().slice(0, 10),
    };
  }

  return {
    decision: "conditional",
    metrics,
    rationale:
      `경계 영역 — 주간 장애 ${weeklyFailures.toFixed(1)}회, 에러율 ${(errorRate * 100).toFixed(1)}%. ` +
      `모니터링 강화 후 Sprint 30에서 재판정.`,
    nextReviewDate: "Sprint 30",
  };
}

export function calculateMetrics(rawData: {
  callSiteFiles: number;
  callSites: string[];
  errorTypeCount: number;
  bugFixCommits: number;
  totalPlumbCommits: number;
  analysisPeriodWeeks: number;
  hasKpiData: boolean;
}): PlumbUsageMetrics {
  const weeklyFailures =
    rawData.analysisPeriodWeeks > 0
      ? rawData.bugFixCommits / rawData.analysisPeriodWeeks
      : 0;

  const errorRate =
    rawData.totalPlumbCommits > 0
      ? rawData.bugFixCommits / rawData.totalPlumbCommits
      : 0;

  return {
    ...rawData,
    weeklyFailures,
    errorRate,
  };
}

export function generateAdrMarkdown(decision: TrackBDecision): string {
  const { metrics } = decision;
  const statusMap = {
    "go-track-b": "Accepted — Track B 착수",
    "stay-track-a": "Accepted — Track A 유지",
    "conditional": "Deferred — 재판정 필요",
  };

  return `# ADR-001: Plumb Track B 전환 판정

## Status

${statusMap[decision.decision]} — ${new Date().toISOString().slice(0, 10)}

## Context

Plumb는 Python 기반 SDD Triangle 엔진으로, Foundry-X CLI에서 subprocess로 호출한다.

- **Track A (현재)**: Plumb을 그대로 사용. CLI에서 PlumbBridge를 통해 \`python3 -m plumb\` 실행.
- **Track B (대안)**: Plumb 핵심 알고리즘을 TypeScript로 재구현하여 subprocess 의존 제거.

**전환 기준 (PRD v4 원문 유지):** Plumb 버그로 인한 장애 주 2회 이상.

## Data

### 분석 기간

${metrics.analysisPeriodWeeks}주 (Sprint 24~27 기간)

### 코드베이스 분석

| 항목 | 값 |
|------|-----|
| PlumbBridge 호출 파일 수 | ${metrics.callSiteFiles}개 |
| 에러 타입 수 | ${metrics.errorTypeCount}개 |
| 호출 지점 | ${metrics.callSites.map(s => `\`${s}\``).join(", ")} |

### Git 이력 분석

| 항목 | 값 |
|------|-----|
| Plumb 관련 전체 커밋 | ${metrics.totalPlumbCommits}건 |
| 버그 수정 커밋 | ${metrics.bugFixCommits}건 |
| 주간 장애 횟수 | ${metrics.weeklyFailures.toFixed(1)}회/주 |
| 에러율 | ${(metrics.errorRate * 100).toFixed(1)}% |

### KPI 데이터

${metrics.hasKpiData ? "kpi_events 테이블에서 cli_invoke type=plumb 데이터 수집 완료." : "**실사용자 KPI 데이터 없음** — KPI 인프라(F100)는 Sprint 27에서 구축 중이나, 실사용자 미참여로 Plumb 호출 기록 없음."}

## Decision

**${decision.decision === "go-track-b" ? "Go Track B" : decision.decision === "stay-track-a" ? "Stay Track A" : "Conditional — 재판정 필요"}**

${decision.rationale}

## Consequences

${decision.decision === "go-track-b" ? `- TypeScript 재구현 착수 (Phase 4+ 별도 스프린트)
- PlumbBridge를 점진적으로 교체 — 기능 단위로 전환
- Python 의존성 제거 로드맵 수립` : decision.decision === "stay-track-a" ? `- Plumb Track A 유지 — subprocess 호출 방식 계속 사용
- ${decision.nextReviewDate}에 재판정 (6개월 후)
- 재판정 시 KPI 데이터(F100) + 실사용자 피드백 기반으로 판정
- PlumbBridge 에러 핸들링 강화 모니터링 유지` : `- 모니터링 강화: KPI 이벤트에 Plumb 호출 성공/실패 로깅 추가
- Sprint 30에서 재판정 — 추가 데이터 수집 후 결정
- 그 사이 Plumb 장애 발생 시 즉시 Track B 판정 가능`}
`;
}
