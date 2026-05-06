// F623: DomainInitService stub — TDD Red phase (구현 없음)
export interface DomainInitInput {
  domainName: string;
  orgId: string;
  ownerId: string;
  description?: string;
}

export interface DomainScaffold {
  policy: { policyId: string };
  ontology: { entityId: string };
  skill: { skillRef: string };
  log: { auditEventId: string };
  systemKnowledge: { knowledgeId: string };
}

export interface DomainInitResult {
  domainName: string;
  orgId: string;
  scaffoldedAssets: DomainScaffold;
  initializedAt: number;
}

export class DomainInitService {
  scaffold(_input: DomainInitInput): Promise<DomainInitResult> {
    throw new Error("not implemented");
  }
}
