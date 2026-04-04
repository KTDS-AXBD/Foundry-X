import type { SkillVersionRecord } from "@foundry-x/shared";

interface Props {
  versions: SkillVersionRecord[];
}

export default function SkillVersionHistory({ versions }: Props) {
  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        버전 이력이 없어요.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 text-left font-medium">버전</th>
            <th className="py-2 text-left font-medium">모델</th>
            <th className="py-2 text-left font-medium">maxTokens</th>
            <th className="py-2 text-left font-medium">변경사항</th>
            <th className="py-2 text-left font-medium">날짜</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id} className="border-b last:border-0">
              <td className="py-2 font-mono text-xs">v{v.version}</td>
              <td className="py-2 text-xs">{v.model}</td>
              <td className="py-2 text-xs">{v.maxTokens.toLocaleString()}</td>
              <td className="py-2 text-xs text-muted-foreground">
                {v.changelog || "—"}
              </td>
              <td className="py-2 text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleDateString("ko-KR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
