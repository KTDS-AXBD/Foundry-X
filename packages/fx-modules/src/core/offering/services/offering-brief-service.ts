import type { MeetingType } from "../schemas/offering-brief.schema.js";

export interface OfferingBrief {
  id: string;
  orgId: string;
  offeringPackId: string;
  title: string;
  content: string;
  targetAudience: string | null;
  meetingType: MeetingType;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferingBriefInput {
  orgId: string;
  offeringPackId: string;
  title: string;
  targetAudience?: string;
  meetingType?: MeetingType;
}

export class OfferingBriefService {
  constructor(_db: D1Database) {}

  async create(_input: CreateOfferingBriefInput, _userId: string): Promise<OfferingBrief | null> {
    return null;
  }

  async createWithContent(_input: CreateOfferingBriefInput, _pack: unknown): Promise<OfferingBrief | null> {
    return null;
  }

  async list(_packId: string, _orgId: string, _opts?: { limit?: number; offset?: number }): Promise<OfferingBrief[]> {
    return [];
  }

  async getLatest(_packId: string, _orgId: string): Promise<OfferingBrief | null> {
    return null;
  }

  async get(_id: string, _orgId: string): Promise<OfferingBrief | null> {
    return null;
  }

  async delete(_id: string, _orgId: string): Promise<void> {}
}
