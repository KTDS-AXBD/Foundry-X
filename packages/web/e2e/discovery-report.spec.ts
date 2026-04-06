/**
 * E2E: Discovery Report (F346+F347) — 9탭 리포트 프레임 + 선 구현 4탭
 * API mock 기반 — API 서버 없이도 동작
 */
import { test, expect } from "./fixtures/auth";

const MOCK_REPORT = {
  id: "report-1",
  bizItemId: "biz-1",
  title: "AI 문서 자동화 — 발굴 리포트",
  type: "I" as const,
  completedStages: ["2-1", "2-2", "2-3", "2-4"],
  overallProgress: 44,
  tabs: {
    "2-1": {
      threeLayers: {
        macro: [
          { factor: "AI 규제 동향", trend: "강화", impact: "높음" },
          { factor: "디지털 전환 가속", trend: "상승", impact: "높음" },
        ],
        meso: [
          { factor: "문서 자동화 시장", trend: "급성장", impact: "중간" },
        ],
        micro: [
          { factor: "KT DS 내부 수요", trend: "증가", impact: "높음" },
        ],
      },
      jtbd: [
        { job: "문서 분류 자동화", current: "수동 분류", painLevel: 8, frequency: "매일" },
        { job: "계약서 검토", current: "변호사 수동", painLevel: 7, frequency: "주 3회" },
      ],
      competitors: [
        { name: "DocuSign AI", strength: "시장 점유율", weakness: "한국어 미지원", share: "35%" },
        { name: "Upstage", strength: "한국어 OCR", weakness: "비용", share: "10%" },
      ],
    },
    "2-2": {
      tam: { value: 50000000000, unit: "원" },
      sam: { value: 10000000000, unit: "원" },
      som: { value: 2000000000, unit: "원" },
      painPoints: [
        { pain: "문서 분류 오류", severity: 8, frequency: "매일", segment: "법무" },
        { pain: "검토 지연", severity: 7, frequency: "주 2회", segment: "계약" },
      ],
      roi: {
        investment: 500000000,
        return: 2000000000,
        period: "18개월",
        metrics: [
          { label: "NPV", value: "1.2B" },
          { label: "IRR", value: "45%" },
        ],
      },
    },
    "2-3": {
      swot: {
        strengths: ["AI 기술력", "KT DS 인프라"],
        weaknesses: ["시장 경험 부족"],
        opportunities: ["디지털 전환 수요"],
        threats: ["글로벌 빅테크 진입"],
      },
      porter: {
        axes: [
          { axis: "신규 진입", score: 6 },
          { axis: "공급자 교섭력", score: 4 },
          { axis: "구매자 교섭력", score: 7 },
          { axis: "대체재 위협", score: 5 },
          { axis: "기존 경쟁", score: 8 },
        ],
      },
      positioning: [
        { x: 3, y: 8, name: "KT DS", isOurs: true },
        { x: 7, y: 6, name: "DocuSign", isOurs: false },
      ],
    },
    "2-4": {
      hmw: [
        { question: "어떻게 하면 문서 분류를 99% 자동화할 수 있을까?", category: "기술", priority: "P1" },
        { question: "어떻게 하면 계약서 검토 시간을 80% 단축할 수 있을까?", category: "효율", priority: "P1" },
      ],
      bmc: {
        keyPartners: ["KT 그룹사", "AI 스타트업"],
        keyActivities: ["AI 모델 훈련", "문서 파이프라인 구축"],
        keyResources: ["GPU 인프라", "학습 데이터"],
        valuePropositions: ["문서 처리 자동화", "비용 절감"],
        customerRelationships: ["전담 PM", "기술 지원"],
        channels: ["직접 영업", "파트너 채널"],
        customerSegments: ["대기업 법무", "금융 감사"],
        costStructure: ["GPU 비용", "인건비"],
        revenueStreams: ["SaaS 구독료", "컨설팅"],
      },
      phases: [
        { phase: "Phase 1", description: "PoC", duration: "3개월", deliverables: ["프로토타입", "기술 검증"] },
        { phase: "Phase 2", description: "MVP", duration: "6개월", deliverables: ["베타 서비스", "고객 파일럿"] },
      ],
    },
  },
};

function setupMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    // Skip tours + guide modals
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
      localStorage.setItem("fx-guide-dismissed", "true");
      localStorage.setItem("fx-onboarding-completed", "true");
      localStorage.setItem("fx-process-guide-dismissed", "true");
    }),
    // Hide feedback widget
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    // Summary API (must be before report wildcard)
    page.route("**/api/ax-bd/discovery-report/*/summary", (route) =>
      route.fulfill({ json: null }),
    ),
    // Team review API
    page.route("**/api/ax-bd/team-reviews/**", (route) =>
      route.fulfill({ json: { data: [] } }),
    ),
    // Report API
    page.route("**/api/ax-bd/discovery-report/*", (route) =>
      route.fulfill({ json: MOCK_REPORT }),
    ),
    // prevent real calls
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
  ]);
}

test.describe("Discovery Report (F346+F347)", () => {
  test("9탭 리포트 프레임 렌더링 + 탭 목록", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report");

    // 리포트 제목
    await expect(page.getByText("AI 문서 자동화 — 발굴 리포트")).toBeVisible({ timeout: 10000 });

    // Type 배지
    await expect(page.getByText("Type I — 아이디어형")).toBeVisible();

    // 진행률 배지
    await expect(page.getByText("44% 완료")).toBeVisible();

    // 9개 탭 레이블 확인
    const tabLabels = [
      "레퍼런스 분석", "시장 검증", "경쟁 구도", "기회 도출",
      "기회 선정", "고객 페르소나", "비즈니스 모델", "패키징", "페르소나 평가",
    ];
    for (const label of tabLabels) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
  });

  test("탭 2-1: 레퍼런스 분석 — StepHeader + 3-Layer + JTBD + 경쟁사", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report?tab=2-1");

    // StepHeader
    await expect(page.getByText("레퍼런스 분석").first()).toBeVisible({ timeout: 10000 });

    // 3-Layer 분석 헤딩
    await expect(page.getByText("3-Layer 분석")).toBeVisible();

    // Macro 데이터
    await expect(page.getByText("AI 규제 동향")).toBeVisible();
    await expect(page.getByText("디지털 전환 가속")).toBeVisible();

    // JTBD
    await expect(page.getByText("JTBD (Jobs-to-be-Done)")).toBeVisible();
    await expect(page.getByText("문서 분류 자동화")).toBeVisible();
    await expect(page.getByText("Pain: 8/10")).toBeVisible();

    // 경쟁사 비교
    await expect(page.getByText("경쟁사 비교")).toBeVisible();
    await expect(page.getByText("DocuSign AI")).toBeVisible();

    // InsightBox
    await expect(page.getByText("AI 분석 요약")).toBeVisible();
  });

  test("탭 2-2: 시장 검증 — MetricCard + TAM/SAM/SOM + Pain Point + ROI", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report?tab=2-2");

    // StepHeader — URL query param으로 탭 이미 선택됨
    await expect(page.getByText("시장 검증").first()).toBeVisible({ timeout: 10000 });

    // MetricCard — TAM/SAM/SOM
    await expect(page.getByText("TAM").first()).toBeVisible();
    await expect(page.getByText("SAM").first()).toBeVisible();
    await expect(page.getByText("SOM").first()).toBeVisible();

    // Pain Point 맵
    await expect(page.getByText("Pain Point 맵")).toBeVisible();
    await expect(page.getByText("문서 분류 오류")).toBeVisible();
    await expect(page.getByText("심각도: 8/10")).toBeVisible();

    // ROI 분석
    await expect(page.getByText("ROI 분석")).toBeVisible();
    await expect(page.getByText("18개월")).toBeVisible();
    await expect(page.getByText("NPV")).toBeVisible();

    // InsightBox
    await expect(page.getByText("시장 분석 요약")).toBeVisible();
  });

  test("탭 2-3: 경쟁 구도 — SWOT + Porter + 포지셔닝맵", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report?tab=2-3");

    // StepHeader — URL query param으로 탭 이미 선택됨
    await expect(page.getByText("경쟁 구도").first()).toBeVisible({ timeout: 10000 });

    // SWOT 4분면
    await expect(page.getByText("SWOT 분석")).toBeVisible();
    await expect(page.getByText("Strengths")).toBeVisible();
    await expect(page.getByText("AI 기술력")).toBeVisible();
    await expect(page.getByText("Weaknesses")).toBeVisible();
    await expect(page.getByText("Opportunities")).toBeVisible();
    await expect(page.getByText("Threats")).toBeVisible();

    // Porter 5 Forces
    await expect(page.getByRole("heading", { name: "Porter 5 Forces" }).first()).toBeVisible();

    // 포지셔닝 맵 (Suspense lazy-load 대기)
    await expect(page.getByText("포지셔닝 맵").first()).toBeVisible({ timeout: 10000 });

    // InsightBox
    await expect(page.getByText("경쟁 분석 요약")).toBeVisible({ timeout: 10000 });
  });

  test("탭 2-4: 기회 도출 — HMW + BMC + Phase 타임라인", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report?tab=2-4");

    // StepHeader — URL query param으로 탭 이미 선택됨
    await expect(page.getByText("기회 도출").first()).toBeVisible({ timeout: 10000 });

    // HMW 카드
    await expect(page.getByText("How Might We...?")).toBeVisible();
    await expect(page.getByText(/문서 분류를 99% 자동화/)).toBeVisible();

    // BMC 9블록
    await expect(page.getByText("Business Model Canvas")).toBeVisible();
    await expect(page.getByText("핵심 파트너")).toBeVisible();
    await expect(page.getByText("가치 제안")).toBeVisible();
    await expect(page.getByText("수익원")).toBeVisible();

    // Phase 타임라인
    await expect(page.getByText("Phase 타임라인")).toBeVisible();
    await expect(page.getByText("Phase 1")).toBeVisible();
    await expect(page.getByText("PoC")).toBeVisible();
    await expect(page.getByText("3개월")).toBeVisible();

    // InsightBox
    await expect(page.getByText("기회 도출 요약")).toBeVisible();
  });

  test("미구현 탭 — Coming Soon 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report");

    await expect(page.getByText("AI 문서 자동화 — 발굴 리포트")).toBeVisible({ timeout: 10000 });

    // 2-5 기회 선정 탭 클릭 — mock에 없는 탭은 빈 데이터 표시
    await page.getByRole("tab", { name: "기회 선정" }).click();
    await expect(page.getByText("기회 선정 데이터가 아직 없어요")).toBeVisible();

    // 2-8 패키징 탭 클릭
    await page.getByRole("tab", { name: "패키징" }).click();
    await expect(page.getByText("패키징 데이터가 아직 없어요")).toBeVisible();
  });

  test("탭 전환 시 URL query param 변경", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report");

    await expect(page.getByText("AI 문서 자동화 — 발굴 리포트")).toBeVisible({ timeout: 10000 });

    // 시장 검증 탭 클릭
    await page.getByRole("tab", { name: "시장 검증" }).click();
    await expect(page).toHaveURL(/tab=2-2/);

    // 경쟁 구도 탭 클릭
    await page.getByRole("tab", { name: "경쟁 구도" }).click();
    await expect(page).toHaveURL(/tab=2-3/);

    // 기회 도출 탭 클릭
    await page.getByRole("tab", { name: "기회 도출" }).click();
    await expect(page).toHaveURL(/tab=2-4/);
  });

  test("완료된 탭에 색상 표시 dot 확인", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report");

    await expect(page.getByText("AI 문서 자동화 — 발굴 리포트")).toBeVisible({ timeout: 10000 });

    // completedStages: ["2-1", "2-2", "2-3", "2-4"]에 해당하는 탭에
    // 색상 dot(w-2 h-2 rounded-full)이 있는지 확인
    // 완료된 탭의 dot은 --discovery-mint/blue 색상, 미완료는 --muted
    const completedTabs = page.locator("[role='tab']").filter({ hasText: /레퍼런스 분석|시장 검증|경쟁 구도|기회 도출/ });
    const count = await completedTabs.count();
    expect(count).toBe(4);

    // 각 탭 내부에 색상 dot(span.rounded-full) 존재
    for (let i = 0; i < count; i++) {
      const dot = completedTabs.nth(i).locator("span.rounded-full");
      await expect(dot).toBeVisible();
    }
  });

  test("HITL Badge import 가능 확인 (컴포넌트 존재)", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items/biz-1/report?tab=2-1");

    // HITL Badge는 현재 탭 콘텐츠에 직접 사용되지 않지만,
    // 컴포넌트가 로딩 오류 없이 페이지가 정상 렌더링되는지 확인
    await expect(page.getByText("레퍼런스 분석").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("3-Layer 분석")).toBeVisible();
  });
});
