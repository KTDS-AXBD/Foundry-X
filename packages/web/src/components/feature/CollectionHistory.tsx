"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CollectionJob {
  id: string;
  channel: string;
  status: string;
  keywords: string[];
  itemsFound: number;
  itemsNew: number;
  itemsDuplicate: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface CollectionHistoryProps {
  jobs: CollectionJob[];
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    running: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${styles[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}

export default function CollectionHistory({ jobs }: CollectionHistoryProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          수집 이력이 없어요.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">수집 이력</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">채널</th>
                <th className="px-4 py-2 text-left font-medium">상태</th>
                <th className="px-4 py-2 text-left font-medium">키워드</th>
                <th className="px-4 py-2 text-right font-medium">발견</th>
                <th className="px-4 py-2 text-right font-medium">신규</th>
                <th className="px-4 py-2 text-right font-medium">중복</th>
                <th className="px-4 py-2 text-left font-medium">시작 시각</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{job.channel}</span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(job.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {job.keywords.length > 0 ? job.keywords.join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">{job.itemsFound}</td>
                  <td className="px-4 py-3 text-right">{job.itemsNew}</td>
                  <td className="px-4 py-3 text-right">{job.itemsDuplicate}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(job.startedAt).toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
