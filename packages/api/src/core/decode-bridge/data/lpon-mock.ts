import type { GraphVisualization, AnalysisSummary, HarnessMetrics } from "../schemas/index.js";

export const LPON_MOCK_GRAPH: GraphVisualization = {
  nodes: [
    { id: "n1", label: "취소신청접수", type: "SubProcess", group: "cancel" },
    { id: "n2", label: "잔액확인", type: "Method", group: "validation" },
    { id: "n3", label: "취소가능조건", type: "Condition", group: "rule" },
    { id: "n4", label: "고객", type: "Actor", group: "actor" },
    { id: "n5", label: "온누리상품권앱", type: "Actor", group: "system" },
    { id: "n6", label: "취소처리", type: "SubProcess", group: "cancel" },
    { id: "n7", label: "환불계좌검증", type: "Method", group: "validation" },
    { id: "n8", label: "환불금액계산", type: "Method", group: "calculation" },
    { id: "n9", label: "취소완료알림", type: "Method", group: "notification" },
    { id: "n10", label: "취소이력저장", type: "Requirement", group: "audit" },
    { id: "n11", label: "취소불가조건", type: "Condition", group: "rule" },
    { id: "n12", label: "부분취소허용", type: "Condition", group: "rule" },
  ],
  edges: [
    { source: "n4", target: "n1", label: "신청" },
    { source: "n1", target: "n2", label: "→" },
    { source: "n2", target: "n3", label: "판단" },
    { source: "n3", target: "n6", label: "가능시" },
    { source: "n3", target: "n11", label: "불가시" },
    { source: "n5", target: "n1", label: "인터페이스" },
    { source: "n6", target: "n7", label: "→" },
    { source: "n7", target: "n8", label: "→" },
    { source: "n8", target: "n9", label: "→" },
    { source: "n6", target: "n10", label: "기록" },
    { source: "n3", target: "n12", label: "부분취소" },
  ],
};

export const LPON_MOCK_SUMMARY: AnalysisSummary = {
  documentId: "lpon-demo",
  status: "completed",
  score: 87,
  summary: "온누리상품권 취소(LPON) 프로세스 분석 완료. 12개 핵심 프로세스 노드, 11개 관계 엣지 추출. AI-Ready Score 87점 (상).",
  processCount: 12,
  entityCount: 4,
};

export const LPON_MOCK_FINDINGS = {
  documentId: "lpon-demo",
  findings: [
    {
      category: "Process",
      severity: "info",
      message: "취소신청 → 잔액확인 → 취소처리 3단계 플로우 정상 식별",
      confidence: 0.95,
    },
    {
      category: "Rule",
      severity: "warning",
      message: "취소불가조건 정의 존재하나 구체적 조건값 미명시 (예: 사용 후 30일 초과)",
      confidence: 0.78,
    },
    {
      category: "Data",
      severity: "info",
      message: "환불계좌 검증 로직 포함 — 외부 금융API 연동 필요",
      confidence: 0.91,
    },
  ],
};

export const LPON_MOCK_COMPARISON = {
  documentId: "lpon-demo",
  comparison: {
    specCoverage: 0.87,
    codeAlignmentScore: 0.92,
    testCoverage: 0.85,
    gaps: [
      "부분취소 시나리오 테스트 미흡",
      "환불 실패 시 롤백 로직 spec 미기술",
    ],
  },
};

export const LPON_HARNESS_METRICS: HarnessMetrics = {
  ktConnectivity: 100,
  businessViability: 82,
  riskLevel: 78,
  aiReadiness: 90,
  concreteness: 87,
};
