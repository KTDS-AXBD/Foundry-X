// F616: Launch-X Solo — ManifestGenerator + PackagePublisher (T1) + RuntimeDeployer (T2) + DecisionLogger
import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import type { LaunchManifest, LaunchArtifactType1, LaunchRuntimeType2, LaunchType } from "../types.js";

async function computeSha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeCtx() {
  return { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
}

export class LaunchEngine {
  constructor(
    private db: D1Database,
    private auditBus: Pick<AuditBus, "emit">,
  ) {}

  // LX-S03 ManifestGenerator
  async package(input: {
    orgId: string;
    artifactRef: string;
    metadata?: Record<string, unknown>;
  }): Promise<LaunchManifest> {
    const releaseId = crypto.randomUUID();
    const sha256 = await computeSha256(input.artifactRef + JSON.stringify(input.metadata ?? {}));
    return {
      releaseId,
      orgId: input.orgId,
      launchType: 1,
      artifactRef: input.artifactRef,
      sha256,
      metadata: input.metadata ?? {},
      generatedAt: Date.now(),
    };
  }

  // LX-S04 PackagePublisher (Type 1)
  async publishType1(manifest: LaunchManifest): Promise<LaunchArtifactType1> {
    const downloadUrl = `https://artifacts.example.com/${manifest.releaseId}.zip`;
    const manifestPath = `/manifests/${manifest.releaseId}.json`;
    const expiresAt = Date.now() + 7 * 86400 * 1000;
    await this.db
      .prepare(
        `INSERT INTO launch_artifacts_type1
         (release_id, org_id, download_url, manifest_path, sha256, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(manifest.releaseId, manifest.orgId, downloadUrl, manifestPath, manifest.sha256, expiresAt)
      .run();
    await this.recordDecision(manifest, 1);
    return {
      releaseId: manifest.releaseId,
      orgId: manifest.orgId,
      downloadUrl,
      manifestPath,
      zipSize: null,
      sha256: manifest.sha256,
      expiresAt,
      createdAt: Date.now(),
    };
  }

  // LX-S04 RuntimeDeployer (Type 2)
  async deployType2(manifest: LaunchManifest): Promise<LaunchRuntimeType2> {
    const invokeEndpoint = `/api/launch/runtime/${manifest.releaseId}/invoke`;
    await this.db
      .prepare(
        `INSERT INTO launch_runtimes_type2
         (release_id, org_id, invoke_endpoint, runtime_version, status)
         VALUES (?, ?, ?, ?, 'active')`,
      )
      .bind(manifest.releaseId, manifest.orgId, invokeEndpoint, "v1.0.0")
      .run();
    await this.recordDecision({ ...manifest, launchType: 2 }, 2);
    return {
      releaseId: manifest.releaseId,
      orgId: manifest.orgId,
      invokeEndpoint,
      runtimeVersion: "v1.0.0",
      status: "active",
      createdAt: Date.now(),
    };
  }

  // LX-S05 DecisionLogger
  private async recordDecision(manifest: LaunchManifest, launchType: LaunchType): Promise<void> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO launch_decisions
         (id, release_id, org_id, launch_type, manifest_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, manifest.releaseId, manifest.orgId, launchType, JSON.stringify(manifest))
      .run();
    await this.auditBus.emit(
      "launch.completed",
      {
        releaseId: manifest.releaseId,
        orgId: manifest.orgId,
        launchType,
        sha256: manifest.sha256,
      },
      makeCtx(),
    );
  }
}
