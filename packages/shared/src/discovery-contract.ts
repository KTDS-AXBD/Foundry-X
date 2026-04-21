/**
 * F538: Discovery 도메인 공용 계약 타입 (cross-domain contract)
 * shaping, agent 등 타 도메인에서 discovery 타입이 필요한 경우 여기서 import.
 *
 * F562: @foundry-x/shared-contracts로 타입 이동. 이 파일은 호환성 re-export 브리지.
 * 소비자 import 경로(@foundry-x/shared) 변경 불필요.
 */

export type {
  ExecuteSkillInput,
  ArtifactListQuery,
  BdArtifact,
  SkillExecutionResult,
  TriggerShapingInput,
  DiscoveryIngestPayload,
  DiscoveryCollectionSource,
  DiscoveryDataItem,
  DiscoveryStatus,
  DiscoveryReportResponse,
  ExecutiveSummaryData,
} from "@foundry-x/shared-contracts";
