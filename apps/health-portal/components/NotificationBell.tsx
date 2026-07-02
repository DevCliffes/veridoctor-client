"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  axiosClient,
  subscribeToPush,
  getPushPermissionState,
  playNotificationChime,
} from "@veridoctor/api-client";
import { Bell, BellRing } from "@veridoctor/design/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@veridoctor/design/components";

const POLL_INTERVAL_MS = 40000; // 40s — lightweight, not real-time

interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({
  identityId,
}: {
  identityId: string;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState
    NotificationPermission | "unsupported"
  >("default");
  const [pushLoading, setPushLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(() => {
    if (!identityId) return;
    axiosClient
      .get(`/notifications/?identity_id=${identityId}`)
      .then((res) => {
        setNotifications(res.data?.results ?? []);
        setUnreadCount(res.data?.unread_count ?? 0);
      })
      .catch(() => {
        // Silent — a failed notification fetch shouldn't surface as an
        // app-wide error, the bell just won't update this cycle.
      });
  }, [identityId]);

  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    setPushPermission(getPushPermissionState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("vd-push");
    channel.onmessage = () => {
      playNotificationChime();
      fetchNotifications();
    };
    return () => channel.close();
  }, [fetchNotifications]);

  const handleEnablePush = async () => {
    if (!identityId || pushLoading) return;
    setPushLoading(true);
    const success = await subscribeToPush(identityId);
    setPushPermission(getPushPermissionState());
    setPushLoading(false);
    if (!success) {
      console.error("Failed to enable push notifications");
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      axiosClient
        .patch(`/notifications/${notification.id}/read/`)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        })
        .catch(() => {});
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    if (!identityId || unreadCount === 0) return;
    axiosClient
      .post("/notifications/mark-all-read/", { identity_id: identityId })
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      })
      .catch(() => {});
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative flex items-center justify-center p-2 rounded-full hover:bg-black/5 cursor-pointer">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold text-gray-800">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {pushPermission === "default" && (
          <button
            onClick={handleEnablePush}
            disabled={pushLoading}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-b text-xs text-blue-600 hover:bg-blue-50/60 disabled:opacity-50"
          >
            <BellRing size={14} />
            {pushLoading ? "Enabling…" : "Enable push notifications"}
          </button>
        )}

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-400">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={
                  "w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors flex gap-2 " +
                  (n.is_read ? "" : "bg-blue-50/60")
                }
              >
                {!n.is_read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                )}
                <div className={n.is_read ? "pl-4" : ""}>
                  <p className="text-sm font-medium text-gray-800">
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
