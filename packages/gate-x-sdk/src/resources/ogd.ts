import type { OgdJobStatus, OgdRunInput } from "../types.js";
import type { Requester } from "../client.js";

export class OgdResource {
  constructor(private readonly req: Requester) {}

  run(input: OgdRunInput): Promise<OgdJobStatus> {
    return this.req("/api/ogd/run", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getStatus(jobId: string): Promise<OgdJobStatus> {
    return this.req(`/api/ogd/status/${jobId}`);
  }
}
