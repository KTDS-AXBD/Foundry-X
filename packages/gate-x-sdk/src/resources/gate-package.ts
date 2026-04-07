import type {
  CreateGatePackageInput,
  GatePackage,
  GatePackageDownload,
} from "../types.js";
import type { Requester } from "../client.js";

export class GatePackageResource {
  constructor(private readonly req: Requester) {}

  create(bizItemId: string, input: CreateGatePackageInput): Promise<GatePackage> {
    return this.req(`/api/gate/gate-package/${bizItemId}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  get(bizItemId: string): Promise<GatePackage> {
    return this.req(`/api/gate/gate-package/${bizItemId}`);
  }

  download(bizItemId: string): Promise<GatePackageDownload> {
    return this.req(`/api/gate/gate-package/${bizItemId}/download`);
  }

  updateStatus(bizItemId: string, status: string): Promise<GatePackage> {
    return this.req(`/api/gate/gate-package/${bizItemId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }
}
