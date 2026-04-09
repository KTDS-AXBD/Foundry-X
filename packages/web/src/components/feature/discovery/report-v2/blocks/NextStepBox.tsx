/**
 * F493: NextStepBox — NextStepSchema 렌더러
 */
import { ArrowRight } from "lucide-react";

interface NextStepBoxProps {
  text: string;
}

export function NextStepBox({ text }: NextStepBoxProps) {
  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-start gap-2">
      <ArrowRight className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
