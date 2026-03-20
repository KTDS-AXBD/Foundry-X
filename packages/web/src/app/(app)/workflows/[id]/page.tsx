import WorkflowEditorClient from "./client";

export async function generateStaticParams() {
  return [];
}

export default function WorkflowEditorPage() {
  return <WorkflowEditorClient />;
}
