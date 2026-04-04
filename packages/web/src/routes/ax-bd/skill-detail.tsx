import { useParams } from "react-router-dom";
import SkillEnrichedViewPage from "@/components/feature/ax-bd/SkillEnrichedViewPage";

export function Component() {
  const { skillId } = useParams<{ skillId: string }>();
  if (!skillId) return <div className="p-6 text-red-500">스킬 ID가 없어요.</div>;

  return <SkillEnrichedViewPage skillId={skillId} />;
}
