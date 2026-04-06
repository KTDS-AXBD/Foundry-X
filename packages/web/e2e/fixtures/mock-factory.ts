/**
 * E2E Mock Factory — 상세 페이지(:id) 테스트용 mock 데이터 생성
 * CLI의 test-data.ts와 동일한 make*() + spread override 패턴
 */

// ── BizItem (discovery/items/:id) ──
export function makeBizItem(overrides?: Record<string, unknown>) {
  return {
    id: "biz-item-1",
    title: "AI 헬스케어 플랫폼",
    description: "AI 기반 건강관리 서비스",
    type: "I",
    stage: "discovery",
    orgId: "test-org-e2e",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Idea (ax-bd/ideas/:id) ──
export function makeIdea(overrides?: Record<string, unknown>) {
  return {
    id: "idea-1",
    title: "스마트 팩토리 솔루션",
    description: "제조 공정 자동화",
    tags: ["AI", "제조"],
    syncStatus: "synced",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── BMC (ax-bd/bmc/:id) ──
export function makeBmc(overrides?: Record<string, unknown>) {
  return {
    id: "bmc-1",
    ideaId: "idea-1",
    title: "스마트 팩토리 BMC",
    blocks: [
      { blockType: "customer_segments", content: "B2B 제조업체", updatedAt: 1711929600 },
      { blockType: "value_propositions", content: "공정 효율화 30%", updatedAt: 1711929600 },
      { blockType: "channels", content: "직접 영업", updatedAt: 1711929600 },
      { blockType: "customer_relationships", content: "전담 매니저", updatedAt: 1711929600 },
      { blockType: "revenue_streams", content: "SaaS 구독", updatedAt: 1711929600 },
      { blockType: "key_resources", content: "AI 모델", updatedAt: 1711929600 },
      { blockType: "key_activities", content: "모델 학습", updatedAt: 1711929600 },
      { blockType: "key_partnerships", content: "클라우드 벤더", updatedAt: 1711929600 },
      { blockType: "cost_structure", content: "인프라 + 인건비", updatedAt: 1711929600 },
    ],
    createdAt: 1711929600,
    updatedAt: 1711929600,
    ...overrides,
  };
}

// ── BDP Version (ax-bd/bdp/:bizItemId) ──
export function makeBdpVersion(overrides?: Record<string, unknown>) {
  return {
    id: "bdp-v1",
    bizItemId: "biz-item-1",
    version: 1,
    versionNum: 1,
    isFinal: false,
    content: "## 사업 개발 계획\n\n### 시장 분석\n- 타겟: B2B",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── SR Detail (collection/sr/:id) ──
export function makeSrDetail(overrides?: Record<string, unknown>) {
  return {
    id: "sr-1",
    title: "시장 조사 리포트",
    description: "AI 헬스케어 시장 규모 분석",
    sr_type: "market_research",
    status: "completed",
    priority: "high",
    confidence: 85,
    keywords: ["AI", "헬스케어"],
    sourceUrl: "https://example.com",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Offering Pack (shaping/offering/:id) ──
export function makeOfferingPack(overrides?: Record<string, unknown>) {
  return {
    id: "pack-1",
    title: "AI 헬스케어 제안 패키지",
    status: "draft",
    bizItemId: "biz-item-1",
    items: [],
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Outreach (gtm/outreach/:id) ──
export function makeOutreach(overrides?: Record<string, unknown>) {
  return {
    id: "outreach-1",
    customerId: "customer-1",
    bizItemId: "biz-item-1",
    title: "AI 헬스케어 제안",
    status: "draft",
    channel: "email",
    proposalContent: "제안서 초안",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeCustomer(overrides?: Record<string, unknown>) {
  return {
    id: "customer-1",
    companyName: "테스트 고객사",
    industry: "제조",
    contactName: "홍길동",
    contactEmail: "test@example.com",
    ...overrides,
  };
}

// ── Shaping Run (shaping/review/:runId) ──
export function makeShapingRun(overrides?: Record<string, unknown>) {
  return {
    id: "run-1",
    discoveryPrdId: "prd-1",
    status: "completed",
    mode: "full",
    currentPhase: "F",
    qualityScore: 85,
    tokenCost: 1200,
    tokenLimit: 5000,
    gitPath: null,
    createdAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-02T00:00:00Z",
    phaseLogs: [],
    expertReviews: [],
    sixHats: [],
    ...overrides,
  };
}

// ── Artifact (ax-bd/artifacts/:id) ──
export function makeArtifact(overrides?: Record<string, unknown>) {
  return {
    id: "artifact-1",
    orgId: "test-org-e2e",
    bizItemId: "biz-item-1",
    skillId: "feasibility-study",
    stageId: "2-1",
    version: 1,
    inputText: "AI 헬스케어 타당성 분석 요청",
    outputText: "## 분석 결과\n\n시장 규모 1조원",
    model: "claude-sonnet-4-5-20250514",
    tokensUsed: 1500,
    durationMs: 3200,
    status: "completed",
    createdBy: "test-user-id",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Persona Config (ax-bd/persona-configs/:itemId) ──
export function makePersonaConfig(overrides?: Record<string, unknown>) {
  return {
    id: "pc-1",
    itemId: "biz-item-1",
    orgId: "test-org-e2e",
    personaId: "strategy",
    personaName: "전략 담당",
    personaRole: "사업전략 관점에서 시장성과 전략 적합성을 평가",
    weights: {
      strategic_fit: 25,
      market_potential: 20,
      technical_feasibility: 15,
      financial_viability: 15,
      competitive_advantage: 10,
      risk_assessment: 10,
      team_readiness: 5,
    },
    contextJson: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Persona Eval (ax-bd/persona-evals/:itemId) ──
export function makePersonaEval(overrides?: Record<string, unknown>) {
  return {
    id: "pe-1",
    itemId: "biz-item-1",
    orgId: "test-org-e2e",
    personaId: "strategy",
    scores: {
      strategic_fit: 85,
      market_potential: 78,
      technical_feasibility: 72,
      financial_viability: 68,
      competitive_advantage: 80,
      risk_assessment: 65,
      team_readiness: 75,
    },
    verdict: "Go",
    summary: "전략적 적합성이 높고 시장 잠재력이 우수함",
    concerns: null,
    condition: null,
    evalMetadata: { model: "claude-sonnet-4-5-20250514", durationMs: 2500, costUsd: 0.03 },
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Discovery Progress (discovery/items/:id 보조) ──
export function makeDiscoveryProgress(overrides?: Record<string, unknown>) {
  return {
    totalCriteria: 9,
    metCriteria: 3,
    criteria: [],
    ...overrides,
  };
}

// ── Pipeline Run (discovery-pipeline/runs) — F314/F316 ──
export function makePipelineRun(overrides?: Record<string, unknown>) {
  return {
    id: "run-1",
    bizItemId: "biz-item-1",
    orgId: "test-org-e2e",
    status: "discovery_running",
    currentStep: "2-3",
    autoAdvanceEnabled: true,
    startedAt: "2026-04-01T00:00:00Z",
    completedAt: null,
    steps: [
      { stepId: "2-0", status: "completed", startedAt: "2026-04-01T00:00:00Z", completedAt: "2026-04-01T00:05:00Z" },
      { stepId: "2-1", status: "completed", startedAt: "2026-04-01T00:05:00Z", completedAt: "2026-04-01T00:10:00Z" },
      { stepId: "2-2", status: "completed", startedAt: "2026-04-01T00:10:00Z", completedAt: "2026-04-01T00:15:00Z" },
      { stepId: "2-3", status: "in_progress", startedAt: "2026-04-01T00:15:00Z", completedAt: null },
      { stepId: "2-4", status: "pending", startedAt: null, completedAt: null },
    ],
    createdAt: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

// ── Checkpoint (discovery-pipeline/runs/:id/checkpoints) — F314/F316 ──
export function makeCheckpoint(overrides?: Record<string, unknown>) {
  return {
    id: "cp-1",
    pipelineRunId: "run-1",
    stepId: "2-5",
    checkpointType: "commit_gate",
    status: "pending",
    questions: [
      { question: "시장 규모가 충분한가?", required: true },
      { question: "기술 실현 가능성은?", required: true },
      { question: "경쟁 우위 요소는?", required: true },
      { question: "투자 대비 ROI 예상은?", required: true },
    ],
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    decidedBy: null,
    decidedAt: null,
    createdAt: "2026-04-01T00:15:00Z",
    ...overrides,
  };
}

// ── 공유 Discovery Fixture (3+ spec에서 중복 사용) ──

export const SHARED_TRAFFIC_LIGHT = {
  overallSignal: "green" as const,
  summary: { go: 4, pivot: 2, drop: 1 },
  dimensions: { market: "green", tech: "yellow", team: "green" },
};

export function makeBizItems(overrides?: Record<string, unknown>[]) {
  const defaults = [
    { id: "biz-1", title: "AI 문서 자동화", type: "I", stage: "2-3", orgId: "test-org-e2e", createdAt: "2026-03-01T00:00:00Z" },
    { id: "biz-2", title: "스마트 팩토리", type: "T", stage: "2-1", orgId: "test-org-e2e", createdAt: "2026-03-15T00:00:00Z" },
  ];
  return overrides ? defaults.map((d, i) => ({ ...d, ...overrides[i] })) : defaults;
}

export const SHARED_STAGES = {
  stages: [
    { stage: "2-0", status: "completed", updatedAt: "2026-03-30T00:00:00Z" },
    { stage: "2-1", status: "completed", updatedAt: "2026-03-30T00:00:00Z" },
    { stage: "2-2", status: "completed", updatedAt: "2026-03-30T00:00:00Z" },
    { stage: "2-3", status: "in_progress", updatedAt: "2026-03-30T00:00:00Z" },
  ],
};

export function makeArtifacts(overrides?: Record<string, unknown>[]) {
  const defaults = [
    { id: "art-1", stageId: "2-1", skillId: "market-analysis", title: "시장 분석", content: "## 분석 결과\n내용", createdAt: "2026-03-30T10:00:00Z" },
    { id: "art-2", stageId: "2-2", skillId: "competitor-map", title: "경쟁사 분석", content: "## 경쟁사\n내용", createdAt: "2026-03-30T11:00:00Z" },
    { id: "art-3", stageId: "2-3", skillId: "bmc-draft", title: "BMC 초안", content: "## BMC\n내용", createdAt: "2026-03-30T12:00:00Z" },
  ];
  return overrides ? defaults.map((d, i) => ({ ...d, ...overrides[i] })) : defaults;
}
