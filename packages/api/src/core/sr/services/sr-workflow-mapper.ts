/**
 * SrWorkflowMapper — SR 유형별 에이전트 워크플로우 DAG 반환
 * F116 KT DS SR 시나리오 구체화
 */
import type { SrType } from "../schemas/sr.js";

export interface SrWorkflowNode {
  id: string;
  type: "agent" | "condition" | "end";
  label: string;
  agentType?: string;
  dependsOn?: string[];
}

export interface SrWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  srType: SrType;
  nodes: SrWorkflowNode[];
  estimatedDuration: string;
}

const SR_WORKFLOW_TEMPLATES: Record<SrType, SrWorkflowTemplate> = {
  code_change: {
    id: "sr-code-change", name: "코드 변경 요청 워크플로우",
    description: "Planner→Architect→Test→Reviewer", srType: "code_change", estimatedDuration: "30min",
    nodes: [
      { id: "plan", type: "agent", agentType: "spec-analysis", label: "PlannerAgent: 코드 분석" },
      { id: "design", type: "agent", agentType: "spec-analysis", label: "ArchitectAgent: 설계 리뷰", dependsOn: ["plan"] },
      { id: "test", type: "agent", agentType: "test-generation", label: "TestAgent: 테스트 생성", dependsOn: ["design"] },
      { id: "review", type: "agent", agentType: "code-review", label: "ReviewerAgent: PR 리뷰", dependsOn: ["test"] },
      { id: "complete", type: "condition", label: "승인 확인", dependsOn: ["review"] },
    ],
  },
  bug_fix: {
    id: "sr-bug-fix", name: "버그 수정 요청 워크플로우",
    description: "QA→Planner→Test→Security→Reviewer", srType: "bug_fix", estimatedDuration: "45min",
    nodes: [
      { id: "reproduce", type: "agent", agentType: "qa-testing", label: "QAAgent: 재현" },
      { id: "diagnose", type: "agent", agentType: "spec-analysis", label: "PlannerAgent: 진단", dependsOn: ["reproduce"] },
      { id: "regression", type: "agent", agentType: "test-generation", label: "TestAgent: 회귀", dependsOn: ["diagnose"] },
      { id: "security", type: "agent", agentType: "security-review", label: "SecurityAgent: 검증", dependsOn: ["regression"] },
      { id: "review", type: "agent", agentType: "code-review", label: "ReviewerAgent: 리뷰", dependsOn: ["security"] },
      { id: "complete", type: "condition", label: "승인 확인", dependsOn: ["review"] },
    ],
  },
  env_config: {
    id: "sr-env-config", name: "환경 설정 변경 워크플로우",
    description: "Infra→Security→Reviewer", srType: "env_config", estimatedDuration: "15min",
    nodes: [
      { id: "analyze", type: "agent", agentType: "infra-analysis", label: "InfraAgent: 분석" },
      { id: "security", type: "agent", agentType: "security-review", label: "SecurityAgent: 검증", dependsOn: ["analyze"] },
      { id: "review", type: "agent", agentType: "code-review", label: "ReviewerAgent: 리뷰", dependsOn: ["security"] },
      { id: "complete", type: "condition", label: "승인 확인", dependsOn: ["review"] },
    ],
  },
  doc_update: {
    id: "sr-doc-update", name: "문서 갱신 요청 워크플로우",
    description: "Planner→Architect→Reviewer", srType: "doc_update", estimatedDuration: "10min",
    nodes: [
      { id: "scope", type: "agent", agentType: "spec-analysis", label: "PlannerAgent: 범위 분석" },
      { id: "validate", type: "agent", agentType: "spec-analysis", label: "ArchitectAgent: 검토", dependsOn: ["scope"] },
      { id: "review", type: "agent", agentType: "code-review", label: "ReviewerAgent: 리뷰", dependsOn: ["validate"] },
      { id: "complete", type: "condition", label: "승인 확인", dependsOn: ["review"] },
    ],
  },
  security_patch: {
    id: "sr-security-patch", name: "보안 패치 요청 워크플로우",
    description: "Security→Test→Reviewer", srType: "security_patch", estimatedDuration: "30min",
    nodes: [
      { id: "scan", type: "agent", agentType: "security-review", label: "SecurityAgent: 스캔" },
      { id: "regression", type: "agent", agentType: "test-generation", label: "TestAgent: 테스트", dependsOn: ["scan"] },
      { id: "review", type: "agent", agentType: "code-review", label: "ReviewerAgent: 리뷰", dependsOn: ["regression"] },
      { id: "complete", type: "condition", label: "승인 확인", dependsOn: ["review"] },
    ],
  },
};

export class SrWorkflowMapper {
  getWorkflowForType(srType: SrType): SrWorkflowTemplate {
    const template = SR_WORKFLOW_TEMPLATES[srType];
    if (!template) throw new Error(`Unknown SR type: ${srType}`);
    return template;
  }
}
