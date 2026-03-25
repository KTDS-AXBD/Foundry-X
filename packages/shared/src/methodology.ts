/** Sprint 59 F191: 방법론 모듈 공유 타입 */

export interface MethodologyModuleSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  criteriaCount: number;
  reviewMethodCount: number;
}

export interface MethodologyRecommendationResult {
  methodologyId: string;
  name: string;
  matchScore: number;
  description: string;
}

export interface MethodologySelectionRecord {
  id: string;
  bizItemId: string;
  methodologyId: string;
  matchScore: number | null;
  selectedBy: "auto" | "manual";
  isCurrent: boolean;
  createdAt: string;
}
