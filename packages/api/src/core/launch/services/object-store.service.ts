// F618: ObjectStore — Type1 zip upload/download URL stub (실 R2/storage는 후속)
import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import type { ObjectUploadResult } from "../types.js";

function makeCtx() {
  return { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
}

const ARTIFACT_BASE_URL = "https://artifacts.example.com";
const EXPIRY_7_DAYS_MS = 7 * 86_400 * 1_000;

export class ObjectStoreService {
  constructor(private auditBus: Pick<AuditBus, "emit">) {}

  async uploadZip(releaseId: string, content: Uint8Array | string): Promise<ObjectUploadResult> {
    const downloadUrl = `${ARTIFACT_BASE_URL}/${releaseId}.zip`;
    const expiresAt = Date.now() + EXPIRY_7_DAYS_MS;
    const size = typeof content === "string" ? content.length : content.byteLength;

    await this.auditBus.emit(
      "launch.object_store.uploaded",
      { releaseId, size, expiresAt },
      makeCtx(),
    );

    return { releaseId, downloadUrl, expiresAt, size };
  }

  async getDownloadUrl(releaseId: string, expiresIn = 3_600): Promise<string> {
    return `${ARTIFACT_BASE_URL}/${releaseId}.zip?expires=${Date.now() + expiresIn * 1_000}`;
  }

  async cleanupExpired(): Promise<number> {
    return 0;
  }
}
