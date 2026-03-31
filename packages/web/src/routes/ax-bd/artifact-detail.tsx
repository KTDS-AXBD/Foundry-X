import { useParams } from "react-router-dom";
import ArtifactDetail from "@/components/feature/ax-bd/ArtifactDetail";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div className="p-6 text-red-500">잘못된 접근이에요.</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <ArtifactDetail artifactId={id} />
    </div>
  );
}
