import ArtifactList from "@/components/feature/ax-bd/ArtifactList";

export function Component() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold">BD 산출물</h1>
        <p className="text-sm text-muted-foreground">
          스킬 실행 결과를 확인하고 버전별로 비교할 수 있어요.
        </p>
      </div>
      <ArtifactList />
    </div>
  );
}
