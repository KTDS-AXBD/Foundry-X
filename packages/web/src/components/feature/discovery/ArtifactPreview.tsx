/**
 * Sprint 224: F459+F460 Gap 보강 — ArtifactPreview
 *
 * PRD/사업기획서/Offering 산출물 요약 미리보기 컴포넌트.
 * - D1 내용(PRD, 기획서): 처음 500자만 표시
 * - R2 대용량(Offering): 메타데이터만 표시
 */
import type { PortfolioTree } from "@/lib/api-client";

type ArtifactType = "prd" | "offering" | "prototype";

interface ArtifactPreviewProps {
  type: ArtifactType;
  /** portfolio 데이터에서 해당 artifact ID로 찾아서 미리보기 */
  artifactId: string;
  portfolio: PortfolioTree;
}

function truncate(text: string, max = 500): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function PrdPreview({ prd }: { prd: PortfolioTree["businessPlans"][number] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">PRD</span>
        <span className="text-xs text-muted-foreground">v{prd.version}</span>
        {prd.modelUsed && (
          <span className="text-xs text-muted-foreground">· {prd.modelUsed}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        생성일: {new Date(prd.generatedAt).toLocaleDateString("ko-KR")}
      </p>
    </div>
  );
}

function OfferingPreview({ offering }: { offering: PortfolioTree["offerings"][number] }) {
  const purposeLabel: Record<string, string> = {
    report: "보고서",
    proposal: "제안서",
    review: "검토서",
  };
  const formatLabel: Record<string, string> = {
    html: "HTML",
    pptx: "PPTX",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
          {purposeLabel[offering.purpose] ?? offering.purpose}
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {formatLabel[offering.format] ?? offering.format}
        </span>
        <span className="text-xs text-muted-foreground">v{offering.currentVersion}</span>
      </div>
      <p className="text-xs font-medium">{truncate(offering.title)}</p>
      <p className="text-xs text-muted-foreground">
        섹션 {offering.sectionsCount}개 · 버전 {offering.versionsCount}개
        {offering.linkedPrototypeIds.length > 0 && ` · Prototype ${offering.linkedPrototypeIds.length}개 연결`}
      </p>
    </div>
  );
}

function PrototypePreview({ prototype }: { prototype: PortfolioTree["prototypes"][number] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Prototype</span>
        <span className="text-xs text-muted-foreground">v{prototype.version}</span>
        <span className="text-xs text-muted-foreground">· {prototype.format}</span>
      </div>
      {prototype.templateUsed && (
        <p className="text-xs text-muted-foreground">템플릿: {prototype.templateUsed}</p>
      )}
      <p className="text-xs text-muted-foreground">
        생성일: {new Date(prototype.generatedAt).toLocaleDateString("ko-KR")}
      </p>
    </div>
  );
}

export function ArtifactPreview({ type, artifactId, portfolio }: ArtifactPreviewProps) {
  if (type === "prd") {
    const prd = portfolio.businessPlans.find((p) => p.id === artifactId);
    if (!prd) {
      return (
        <p className="text-xs text-muted-foreground">PRD를 찾을 수 없어요 (id: {artifactId})</p>
      );
    }
    return (
      <div className="rounded border bg-card p-3" data-artifact-preview="prd">
        <PrdPreview prd={prd} />
      </div>
    );
  }

  if (type === "offering") {
    const offering = portfolio.offerings.find((o) => o.id === artifactId);
    if (!offering) {
      return (
        <p className="text-xs text-muted-foreground">Offering을 찾을 수 없어요 (id: {artifactId})</p>
      );
    }
    return (
      <div className="rounded border bg-card p-3" data-artifact-preview="offering">
        <OfferingPreview offering={offering} />
      </div>
    );
  }

  if (type === "prototype") {
    const prototype = portfolio.prototypes.find((p) => p.id === artifactId);
    if (!prototype) {
      return (
        <p className="text-xs text-muted-foreground">Prototype을 찾을 수 없어요 (id: {artifactId})</p>
      );
    }
    return (
      <div className="rounded border bg-card p-3" data-artifact-preview="prototype">
        <PrototypePreview prototype={prototype} />
      </div>
    );
  }

  return null;
}
