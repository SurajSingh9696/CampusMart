"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Notification = {
  _id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
};

const TYPE_CONFIG = {
  order: { icon: "receipt_long", color: "#2563eb", bg: "#eff6ff" },
  listing: { icon: "inventory_2", color: "#1a73e8", bg: "#edf4ff" },
  event: { icon: "local_activity", color: "#16a34a", bg: "#f0fdf4" },
  system: { icon: "campaign", color: "#d97706", bg: "#fffbeb" },
  general: { icon: "notifications", color: "#0ea5e9", bg: "#f0f9ff" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/notifications?limit=50", { cache: "no-store" });
        if (!response.ok) {
          toast.error("Unable to load notifications");
          if (mounted) setNotifs([]);
          return;
        }

        const data = (await response.json()) as { notifications?: Notification[] };
        if (mounted) setNotifs(data.notifications || []);
      } catch {
        if (mounted) setNotifs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  const unread = notifs.filter((n) => !n.isRead).length;

  function emitNotificationRefresh() {
    window.dispatchEvent(new Event("notifications:refresh"));
  }

  async function markAllRead() {
    if (unread === 0) return;
    setActionLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        toast.error("Unable to mark all notifications as read");
        return;
      }

      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      emitNotificationRefresh();
    } catch {
      toast.error("Unable to update notifications");
    } finally {
      setActionLoading(false);
    }
  }

  async function markOneRead(notificationId: string) {
    const target = notifs.find((n) => n._id === notificationId);
    if (!target || target.isRead) return;

    setActionLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      });

      if (!response.ok) {
        toast.error("Unable to mark notification as read");
        return;
      }

      setNotifs((prev) => prev.map((item) => (
        item._id === notificationId ? { ...item, isRead: true } : item
      )));
      emitNotificationRefresh();
    } catch {
      toast.error("Unable to update notification");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unread > 0 ? `${unread} unread` : "All caught up!"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            disabled={actionLoading}
            className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex gap-4">
              <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: "#f1f5f9" }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded" style={{ background: "#f1f5f9" }} />
                <div className="h-3 w-2/3 rounded" style={{ background: "#f1f5f9" }} />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">notifications_none</span>
          <p className="text-slate-700 font-bold">No notifications yet</p>
          <p className="text-slate-400 text-sm mt-1">We'll notify you about orders, events, and listings.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n, i) => {
            const category = (n.category || "general").toLowerCase() as keyof typeof TYPE_CONFIG;
            const cfg = TYPE_CONFIG[category] || TYPE_CONFIG.general;
            return (
              <motion.div key={n._id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`card p-5 flex gap-4 cursor-pointer transition-all hover:shadow-sm ${!n.isRead ? "ring-1 ring-blue-100" : ""}`}
                style={{ borderLeft: !n.isRead ? "3px solid var(--primary)" : undefined }}
                onClick={() => { void markOneRead(n._id); }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: cfg.color }}>{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold ${n.isRead ? "text-slate-500" : "text-slate-900"}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: "var(--primary)" }} />}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-slate-400 text-xs mt-1.5 font-medium">{timeAgo(n.createdAt)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
