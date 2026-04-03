"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/api-client";
import { CalendarDays, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Meeting {
  id: string;
  bizItemId: string;
  type: string;
  title: string;
  scheduledAt: string;
  attendees: string[];
  location: string | null;
  notes: string | null;
  status: string;
}

export function Component() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [bizItemId, setBizItemId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<{ items: Meeting[]; total: number }>("/validation/meetings");
      setMeetings(data.items);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const handleCreate = async () => {
    if (!title || !bizItemId || !scheduledAt) return;
    try {
      await fetchApi("/validation/meetings", {
        method: "POST",
        body: JSON.stringify({ bizItemId, title, scheduledAt, location: location || undefined }),
      });
      setSheetOpen(false);
      setTitle("");
      setBizItemId("");
      setScheduledAt("");
      setLocation("");
      await loadMeetings();
    } catch {
      // ignore
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold">미팅 관리</h1>
          <span className="text-sm text-muted-foreground">({total}건)</span>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> 미팅 추가
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>새 미팅 추가</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="title">제목</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="인터뷰 제목" />
              </div>
              <div>
                <Label htmlFor="bizItemId">사업 아이템 ID</Label>
                <Input id="bizItemId" value={bizItemId} onChange={(e) => setBizItemId(e.target.value)} placeholder="item-xxx" />
              </div>
              <div>
                <Label htmlFor="scheduledAt">일정</Label>
                <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="location">장소 (선택)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="회의실 A" />
              </div>
              <Button onClick={handleCreate} className="w-full">생성</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {meetings.length === 0 ? (
        <p className="text-muted-foreground">등록된 미팅이 없어요.</p>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <div key={m.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{m.title}</h3>
                {statusBadge(m.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(m.scheduledAt).toLocaleString("ko-KR")}
                {m.location && ` · ${m.location}`}
                {m.attendees.length > 0 && ` · 참석자 ${m.attendees.length}명`}
              </p>
              {m.notes && (
                <p className="text-sm mt-2 text-gray-600">{m.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
