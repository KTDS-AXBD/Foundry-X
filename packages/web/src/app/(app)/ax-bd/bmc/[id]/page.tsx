"use client";

import { useParams } from "next/navigation";
import BmcEditorPage from "@/components/feature/ax-bd/BmcEditorPage";

export default function BmcEditRoute() {
  const params = useParams();
  const id = params.id as string;

  return <BmcEditorPage bmcId={id} />;
}
