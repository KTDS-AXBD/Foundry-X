import { z } from "zod";

export const GateTypeEnum = z.enum(["orb", "prb"]);
export type GateType = z.infer<typeof GateTypeEnum>;

export const CreateGatePackageSchema = z.object({
  gateType: GateTypeEnum,
});

export const GateStatusEnum = z.enum(["draft", "ready", "submitted"]);
export type GateStatus = z.infer<typeof GateStatusEnum>;

export const UpdateGateStatusSchema = z.object({
  status: GateStatusEnum,
});
