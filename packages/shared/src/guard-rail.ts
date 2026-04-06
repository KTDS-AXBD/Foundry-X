// ─── F357+F358: Guard Rail types (Sprint 161, Phase 17) ───

/** F357: 데이터 진단 결과 */
export interface DiagnosticResult {
  totalEvents: number;
  totalFailedTransitions: number;
  earliestEvent: string | null;
  latestEvent: string | null;
  dataCoverageDays: number;
  sourceDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
  failedTransitionsBySource: Record<string, number>;
  isDataSufficient: boolean;
}

/** F358: 감지된 실패 패턴 */
export interface FailurePattern {
  id: string;
  tenantId: string;
  patternKey: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  sampleEventIds: string[];
  samplePayloads: unknown[];
  status: "detected" | "proposed" | "resolved";
  createdAt: string;
  updatedAt: string;
}

/** F358: Guard Rail 제안 */
export interface GuardRailProposal {
  id: string;
  tenantId: string;
  patternId: string;
  ruleContent: string;
  ruleFilename: string;
  rationale: string;
  llmModel: string;
  status: "pending" | "approved" | "rejected" | "modified";
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

/** F358: 패턴 감지 요청 */
export interface DetectPatternsRequest {
  minOccurrences?: number;
  sinceDays?: number;
}

/** F358: 패턴 감지 결과 */
export interface DetectPatternsResult {
  patternsFound: number;
  patternsNew: number;
  patternsUpdated: number;
  patterns: FailurePattern[];
}

/** F358: Rule 생성 결과 */
export interface GenerateRulesResult {
  proposalsCreated: number;
  proposals: GuardRailProposal[];
}
