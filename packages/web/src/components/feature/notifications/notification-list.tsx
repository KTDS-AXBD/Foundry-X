"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchApi, postApi } from "@/lib/api-client";
import { Bell } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  bizItemId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export function NotificationList() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchApi<NotificationsResponse>("/notifications");
    setData(result);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    await postApi(`/notifications/${id}/read`, {});
    await load();
  };

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            variant="destructive"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
          <div className="p-3 border-b">
            <h4 className="text-sm font-semibold">알림</h4>
          </div>
          {!data?.notifications.length ? (
            <p className="text-sm text-muted-foreground p-4 text-center">알림이 없어요</p>
          ) : (
            <div className="divide-y">
              {data.notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 text-sm ${!notif.readAt ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{notif.title}</p>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    {!notif.readAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => handleMarkRead(notif.id)}
                      >
                        읽음
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
