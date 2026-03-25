"use client";

import { useParams } from "next/navigation";
import IdeaDetailPage from "@/components/feature/ax-bd/IdeaDetailPage";

export default function IdeaDetailRoute() {
  const params = useParams();
  const id = params.id as string;

  return <IdeaDetailPage ideaId={id} />;
}
