// ─── Harness Pipeline Types (v4) ───

/** 리포지토리 유형 */
export type RepoMode = 'brownfield' | 'greenfield';

/** 프로젝트 마커 감지 결과 */
export interface MarkerFile {
  path: string;
  type: 'node' | 'python' | 'go' | 'java' | 'unknown';
}

export interface ModuleInfo {
  name: string;
  path: string;
  role: string;
}

/** 리포지토리 프로필 (detect → discover → analyze 순으로 채워짐) */
export interface RepoProfile {
  mode: RepoMode;
  // Phase 0: discover
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];
  ci: string | null;
  packageManager: string | null;
  markers: MarkerFile[];
  // Phase 1: analyze
  entryPoints: string[];
  modules: ModuleInfo[];
  architecturePattern: string;
  /** package.json scripts 중 주요 커맨드 (build, test, lint 등) */
  scripts?: Record<string, string>;
  /** F220: 발견된 문서 파일 */
  existingDocs?: DocFile[];
  /** F220: 주요 디렉토리 구조 */
  directoryStructure?: DirNode[];
  /** F220: 프로젝트 컨텍스트 */
  projectContext?: ProjectContext;
}

// ─── F220: Brownfield Context Types ───

/** 발견된 문서 파일 */
export interface DocFile {
  path: string;
  type: 'readme' | 'changelog' | 'adr' | 'spec' | 'docs' | 'contributing' | 'other';
}

/** 디렉토리 노드 (트리 구조) */
export interface DirNode {
  name: string;
  role: 'routes' | 'services' | 'components' | 'tests' | 'config' | 'docs' | 'unknown';
  children?: DirNode[];
}

/** 프로젝트 컨텍스트 요약 */
export interface ProjectContext {
  summary: string;
  hasMonorepo: boolean;
  docCount: number;
  topLevelDirs: string[];
}

// ─── F222: Changes Directory Types ───

export type ChangeStatus = 'proposed' | 'approved' | 'implemented' | 'rejected';

/** 단일 변경 항목 */
export interface ChangeEntry {
  id: string;
  status: ChangeStatus;
  hasProposal: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
  hasSpecDelta: boolean;
  specDelta?: SpecDelta;
}

/** 스펙 변경분 */
export interface SpecDelta {
  added: string[];
  modified: string[];
  removed: string[];
}

/** changes/ 인덱스 */
export interface ChangesIndex {
  version: string;
  changes: ChangeEntry[];
}

/** 산출물 생성 결과 */
export interface GenerateResult {
  created: string[];
  merged: string[];
  skipped: string[];
}

/** 하네스 무결성 검증 결과 */
export interface HarnessIntegrity {
  passed: boolean;
  score: number;
  checks: IntegrityCheck[];
}

export type IntegrityLevel = 'PASS' | 'WARN' | 'FAIL';

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  level: IntegrityLevel;
  message: string;
}

// ─── SDD Triangle Types (v3) ───

export interface SyncResult {
  success: boolean;
  timestamp: string;
  duration: number;
  triangle: {
    specToCode: SyncStatus;
    codeToTest: SyncStatus;
    specToTest: SyncStatus;
  };
  decisions: Decision[];
  errors: PlumbError[];
}

export interface SyncStatus {
  matched: number;
  total: number;
  gaps: GapItem[];
}

export interface GapItem {
  type: 'spec_only' | 'code_only' | 'test_missing' | 'drift';
  path: string;
  description: string;
}

export interface Decision {
  id: string;
  source: 'agent' | 'human';
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  commit: string;
}

// ─── PlumbBridge Types (v3) ───

export interface PlumbResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  data?: unknown;
}

export interface PlumbError {
  code: string;
  message: string;
}

// ─── Config & Logging (v3 + v4) ───

export interface CommandLog {
  command: 'init' | 'sync' | 'status';
  timestamp: string;
  duration: number;
  success: boolean;
  args: Record<string, unknown>;
  plumbCalled: boolean;
  harnessIntegrity?: number;
  error?: string;
}

export interface HealthScore {
  overall: number;
  specToCode: number;
  codeToTest: number;
  specToTest: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface FoundryXConfig {
  version: string;
  initialized: string;
  template: string;
  mode: RepoMode;
  repoProfile: RepoProfile;
  /** F564: fx-gateway 단일 진입점 URL. 미설정 시 fx-gateway 기본값 사용 */
  apiUrl?: string;
  plumb: {
    timeout: number;
    pythonPath: string;
  };
  git: {
    provider: 'github' | 'gitlab';
    remote?: string;
  };
}

// ─── Sprint 12: Ambiguity Score (F59) ───

export interface AmbiguityDimension {
  name: 'goal' | 'constraint' | 'success' | 'context';
  clarity: number;
  weight: number;
}

export interface AmbiguityScore {
  dimensions: AmbiguityDimension[];
  totalClarity: number;
  ambiguity: number;
  ready: boolean;
  projectType: 'greenfield' | 'brownfield';
}

export function calculateAmbiguity(dimensions: AmbiguityDimension[]): number {
  const totalClarity = dimensions.reduce((sum, d) => sum + d.clarity * d.weight, 0);
  return parseFloat((1 - totalClarity).toFixed(4));
}

export const GREENFIELD_WEIGHTS: Record<string, number> = {
  goal: 0.4, constraint: 0.3, success: 0.3,
};

export const BROWNFIELD_WEIGHTS: Record<string, number> = {
  goal: 0.35, constraint: 0.25, success: 0.25, context: 0.15,
};

// ─── Multi-tenancy Types (F92) ───

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export type OrgPlan = 'free' | 'pro' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  orgId: string;
  userId: string;
  email: string;
  name: string;
  role: OrgRole;
  joinedAt: string;
}

export interface OrgInvitation {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: string;
}

export const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

// ─── Sprint 58: F180 사업계획서 + F181 Prototype ───

export interface BusinessPlanDraft {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  sectionsSnapshot: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

export interface Prototype {
  id: string;
  bizItemId: string;
  version: number;
  format: "html" | "markdown";
  content: string;
  templateUsed: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

// ─── Sprint 60: Methodology Plugin Types (F193+F194) ───

export interface PmSkillsClassification {
  entryPoint: "discovery" | "validation" | "expansion";
  recommendedSkills: string[];
  skillScores: Record<string, number>;
}

export interface PmSkillsCriterion {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  skill: string;
  condition: string;
  status: "pending" | "in_progress" | "completed" | "needs_revision";
  evidence: string | null;
  outputType: string;
  score: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface PmSkillsCriteriaProgress {
  total: number;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: PmSkillsCriterion[];
  gateStatus: "blocked" | "warning" | "ready";
}

export interface MethodologyInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  isDefault: boolean;
}

export interface MethodologyRecommendation {
  id: string;
  name: string;
  score: number;
}

export interface MethodologyProgressSummary {
  methodologyId: string;
  methodologyName: string;
  totalItems: number;
  gateReady: number;
  gateWarning: number;
  gateBlocked: number;
  avgProgress: number;
}

// ─── F229: Agent Spec 호환성 타입 (Watch — 향후 Export 어댑터 개발 시 사용) ───

/** Oracle Agent Spec 호환 에이전트 정의 (최소 매핑) */
export interface AgentSpecCompat {
  name: string;
  description?: string;
  model?: string;
  system_prompt: string;
  tools?: AgentSpecTool[];
  guardrails?: string[];
}

/** Agent Spec 도구 정의 (스키마 포함) */
export interface AgentSpecTool {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

// ─── F230: Scale-Adaptive 복잡도 등급 (Watch — 향후 프로세스 조절 시 사용) ───

/** 프로젝트 복잡도 등급 (BMAD 참고) */
export type ProjectComplexity = 'quick-fix' | 'standard' | 'enterprise';

/** 복잡도 감지 결과 */
export interface ComplexityAssessment {
  grade: ProjectComplexity;
  factors: {
    loc: number;
    dependencies: number;
    fileCount: number;
    moduleCount: number;
  };
  recommendedAgentCount: number;
  recommendedDocDepth: 'minimal' | 'standard' | 'full';
}

// ─── F231: Multi-repo 참조 타입 (Watch — 향후 멀티리포 지원 시 사용) ───

/** 리포지토리 참조 */
export interface RepoRef {
  name: string;
  url: string;
  role: 'primary' | 'spec' | 'infrastructure' | 'shared';
  branch?: string;
}

/** 멀티리포 워크스페이스 (향후 확장) */
export interface WorkspaceConfig {
  name: string;
  repositories: RepoRef[];
  specRepository?: string;
}

// ─── F274: 스킬 실행 메트릭 타입 ───

export interface SkillMetricSummary {
  skillId: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  avgTokensPerExecution: number;
  lastExecutedAt: string | null;
}

export interface SkillDetailMetrics extends SkillMetricSummary {
  versions: SkillVersionRecord[];
  recentExecutions: SkillExecutionRecord[];
  costTrend: { date: string; cost: number; executions: number }[];
}

export interface SkillVersionRecord {
  id: string;
  skillId: string;
  version: number;
  promptHash: string;
  model: string;
  maxTokens: number;
  changelog: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SkillExecutionRecord {
  id: string;
  skillId: string;
  version: number;
  model: string;
  status: "completed" | "failed" | "timeout" | "cancelled";
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  executedBy: string;
  executedAt: string;
}

export interface SkillLineageNode {
  skillId: string;
  derivationType: "manual" | "derived" | "captured" | "forked";
  children: SkillLineageNode[];
  parents: { skillId: string; derivationType: string }[];
}

export interface SkillAuditEntry {
  id: string;
  entityType: "execution" | "version" | "lineage" | "skill";
  entityId: string;
  action: "created" | "updated" | "deleted" | "executed" | "versioned";
  actorId: string;
  details: string | null;
  createdAt: string;
}

// ─── F275: 스킬 레지스트리 타입 ───

export type SkillSafetyGrade = "A" | "B" | "C" | "D" | "F" | "pending";
export type SkillCategory = "general" | "bd-process" | "analysis" | "generation" | "validation" | "integration";
export type SkillSourceType = "marketplace" | "custom" | "derived" | "captured";
export type SkillStatus = "active" | "deprecated" | "draft" | "archived";

export interface SkillRegistryEntry {
  id: string;
  tenantId: string;
  skillId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  tags: string[];
  status: SkillStatus;
  safetyGrade: SkillSafetyGrade;
  safetyScore: number;
  safetyCheckedAt: string | null;
  sourceType: SkillSourceType;
  sourceRef: string | null;
  promptTemplate: string | null;
  modelPreference: string | null;
  maxTokens: number;
  tokenCostAvg: number;
  successRate: number;
  totalExecutions: number;
  currentVersion: number;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillSearchResult {
  skillId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  tags: string[];
  safetyGrade: SkillSafetyGrade;
  score: number;
}

export interface SafetyCheckResult {
  score: number;
  grade: SkillSafetyGrade;
  violations: SafetyViolation[];
  checkedAt: string;
}

export interface SafetyViolation {
  rule: string;
  description: string;
  severity: number;
  matchedPattern: string;
}

export interface SkillEnrichedView {
  registry: SkillRegistryEntry;
  metrics: SkillMetricSummary | null;
  versions: SkillVersionRecord[];
  lineage: SkillLineageNode | null;
}

// ─── F276: DERIVED 엔진 타입 ───

export type DerivedPatternType = "single" | "chain";
export type DerivedPatternStatus = "active" | "consumed" | "expired";
export type DerivedReviewStatus = "pending" | "approved" | "rejected" | "revision_requested";
export type PipelineStage = "collection" | "discovery" | "shaping" | "validation" | "productization" | "gtm";

export interface DerivedPattern {
  id: string;
  tenantId: string;
  pipelineStage: PipelineStage;
  discoveryStage: string | null;
  patternType: DerivedPatternType;
  skillIds: string[];
  successRate: number;
  sampleCount: number;
  avgCostUsd: number;
  avgDurationMs: number;
  confidence: number;
  status: DerivedPatternStatus;
  extractedAt: string;
  expiresAt: string | null;
}

export interface DerivedPatternDetail extends DerivedPattern {
  skills: SkillRegistryEntry[];
  sampleExecutions: SkillExecutionRecord[];
}

export interface DerivedCandidate {
  id: string;
  tenantId: string;
  patternId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  promptTemplate: string;
  sourceSkills: { skillId: string; contribution: number }[];
  similarityScore: number;
  safetyGrade: SkillSafetyGrade;
  safetyScore: number;
  reviewStatus: DerivedReviewStatus;
  registeredSkillId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface DerivedCandidateDetail extends DerivedCandidate {
  pattern: DerivedPattern;
  reviews: DerivedReview[];
  sourceSkillEntries: SkillRegistryEntry[];
}

export interface DerivedReview {
  id: string;
  tenantId: string;
  candidateId: string;
  action: "approved" | "rejected" | "revision_requested";
  comment: string | null;
  modifiedPrompt: string | null;
  reviewerId: string;
  createdAt: string;
}

export interface DerivedStats {
  totalPatterns: number;
  activePatterns: number;
  consumedPatterns: number;
  expiredPatterns: number;
  totalCandidates: number;
  pendingCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  approvalRate: number;
  registeredSkills: number;
  avgConfidence: number;
  topStages: { stage: string; patternCount: number }[];
}

// ─── F277: CAPTURED 엔진 타입 ───

export type CapturedPatternStatus = "active" | "consumed" | "expired";

export interface CapturedWorkflowPattern {
  id: string;
  tenantId: string;
  methodologyId: string | null;
  pipelineStage: PipelineStage;
  workflowStepSequence: { stepId: string; stepName: string; action: string }[];
  skillSequence: string[];
  successRate: number;
  sampleCount: number;
  avgCostUsd: number;
  avgDurationMs: number;
  confidence: number;
  status: CapturedPatternStatus;
  extractedAt: string;
  expiresAt: string | null;
}

export interface CapturedWorkflowPatternDetail extends CapturedWorkflowPattern {
  candidateCount: number;
  approvedCount: number;
}

export interface CapturedCandidate {
  id: string;
  tenantId: string;
  patternId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  promptTemplate: string;
  sourceWorkflowSteps: { stepId: string; stepName: string }[];
  sourceSkills: { skillId: string; contribution: number }[];
  similarityScore: number;
  safetyGrade: SkillSafetyGrade;
  safetyScore: number;
  reviewStatus: DerivedReviewStatus;
  registeredSkillId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface CapturedCandidateDetail extends CapturedCandidate {
  pattern: CapturedWorkflowPattern;
  reviews: CapturedReview[];
}

export interface CapturedReview {
  id: string;
  candidateId: string;
  action: DerivedReviewStatus;
  comment: string | null;
  modifiedPrompt: string | null;
  reviewerId: string;
  createdAt: string;
}

export interface CapturedStats {
  totalPatterns: number;
  activePatterns: number;
  totalCandidates: number;
  pendingCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  avgConfidence: number;
  avgSuccessRate: number;
}

// ─── F278: BD ROI 벤치마크 타입 (Sprint 107) ───

export interface RoiBenchmark {
  id: string;
  tenantId: string;
  skillId: string;
  coldThreshold: number;
  coldExecutions: number;
  warmExecutions: number;
  coldAvgCostUsd: number;
  warmAvgCostUsd: number;
  coldAvgDurationMs: number;
  warmAvgDurationMs: number;
  coldAvgTokens: number;
  warmAvgTokens: number;
  coldSuccessRate: number;
  warmSuccessRate: number;
  costSavingsPct: number | null;
  durationSavingsPct: number | null;
  tokenSavingsPct: number | null;
  pipelineStage: string | null;
  createdAt: string;
}

export interface SkillExecutionSummary {
  id: string;
  costUsd: number;
  durationMs: number;
  totalTokens: number;
  status: string;
  executedAt: string;
}

export interface RoiBenchmarkDetail extends RoiBenchmark {
  coldExecutionsList: SkillExecutionSummary[];
  warmExecutionsList: SkillExecutionSummary[];
}

export interface RoiByStage {
  pipelineStage: string;
  skillCount: number;
  avgCostSavingsPct: number;
  avgDurationSavingsPct: number;
  totalWarmSavingsUsd: number;
}

export interface SignalValuation {
  id: string;
  tenantId: string;
  signalType: "go" | "pivot" | "drop";
  valueUsd: number;
  description: string | null;
  updatedBy: string;
  updatedAt: string;
}

export interface BdRoiSummary {
  period: { days: number; from: string; to: string };
  bdRoi: number;
  totalInvestment: number;
  totalSavings: number;
  signalValue: number;
  breakdown: {
    warmRunSavings: {
      totalSaved: number;
      avgSavingsPerExecution: number;
      warmExecutionCount: number;
    };
    signalBreakdown: {
      go: { count: number; valuePerUnit: number; total: number };
      pivot: { count: number; valuePerUnit: number; total: number };
      drop: { count: number; valuePerUnit: number; total: number };
    };
  };
  topSkillsBySavings: Array<{ skillId: string; savingsPct: number }>;
  offeringSavingsUsd?: number;
}

// ─── Sprint 121: GTM Outreach (F299) ───

export type CompanySize = "startup" | "smb" | "mid" | "enterprise";

export type OutreachStatus =
  | "draft"
  | "proposal_ready"
  | "sent"
  | "opened"
  | "responded"
  | "meeting_set"
  | "converted"
  | "declined"
  | "archived";

export interface GtmCustomer {
  id: string;
  orgId: string;
  companyName: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactRole: string | null;
  companySize: CompanySize | null;
  notes: string | null;
  tags: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GtmOutreach {
  id: string;
  orgId: string;
  customerId: string;
  offeringPackId: string | null;
  title: string;
  status: OutreachStatus;
  proposalContent: string | null;
  proposalGeneratedAt: string | null;
  sentAt: string | null;
  responseNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  offeringPackTitle?: string;
}
