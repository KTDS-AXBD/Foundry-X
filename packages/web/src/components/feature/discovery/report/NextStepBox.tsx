/**
 * Sprint 156: F346 — 다음 단계 안내 CTA
 */
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface NextStepBoxProps {
  stepNum: string;
  title: string;
  description: string;
  href?: string;
}

export function NextStepBox({ stepNum, title, description, href }: NextStepBoxProps) {
  const content = (
    <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50 transition-colors">
      <ArrowRight className="size-5 text-muted-foreground shrink-0" />
      <div>
        <div className="text-sm font-semibold">
          {stepNum} {title}
        </div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}
