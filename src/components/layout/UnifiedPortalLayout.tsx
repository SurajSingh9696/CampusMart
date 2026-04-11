"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

type QuickAction = {
  href: string;
  icon: string;
  label: string;
};

type UnifiedPortalLayoutProps = {
  portalLabel: string;
  logoIcon: string;
  logoHref: string;
  navItems: NavItem[];
  accountItems?: NavItem[];
  children: React.ReactNode;
  quickAction?: QuickAction;
  notificationHref?: string;
  showCampusBadge?: boolean;
};

export function UnifiedPortalLayout({
  portalLabel,
  logoIcon,
  logoHref,
  navItems,
  accountItems = [],
  children,
  quickAction,
  notificationHref,
  showCampusBadge,
}: UnifiedPortalLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as {
    name?: string;
    email?: string;
    campus?: string;
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const pageTitle = useMemo(() => {
    const segment = pathname.split("/").pop() || "dashboard";
    return segment.replace(/-/g, " ");
  }, [pathname]);

  useEffect(() => {
    if (!notificationHref) return;

    let mounted = true;

    const refreshUnreadCount = async () => {
      try {
        const response = await fetch("/api/notifications?limit=1", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { unreadCount?: number };
        if (mounted) setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // Ignore transient request errors for notification badge.
      }
    };

    const onRefresh = () => {
      void refreshUnreadCount();
    };

    void refreshUnreadCount();
    window.addEventListener("notifications:refresh", onRefresh);

    return () => {
      mounted = false;
      window.removeEventListener("notifications:refresh", onRefresh);
    };
  }, [notificationHref]);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: "rgba(12, 22, 36, 0.32)", backdropFilter: "blur(4px)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar z-40 ${sidebarOpen ? "open" : ""}`}>
        <div className="flex items-center justify-between px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <Link href={logoHref} className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--primary)", boxShadow: "0 0 18px var(--primary-glow)" }}
            >
              <span className="material-symbols-outlined text-white text-xl">{logoIcon}</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 tracking-tight leading-none">CampusMart</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5" style={{ color: "var(--muted)" }}>
                {portalLabel}
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg lg:hidden text-slate-400 hover:text-slate-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {showCampusBadge && user?.campus && (
          <div className="px-4 py-3">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--info-bg)", border: "1px solid rgba(26,115,232,0.16)" }}
            >
              <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>
                school
              </span>
              <span className="text-xs font-bold text-slate-700 line-clamp-1">{user.campus}</span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 px-3 mb-2 mt-2">Workspace</p>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-nav-item mb-1 ${active ? "active" : ""}`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="font-semibold">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="portal-nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--primary)" }}
                  />
                )}
              </Link>
            );
          })}

          {accountItems.length > 0 && (
            <>
              <div className="mt-4 mb-2 border-t" style={{ borderColor: "var(--border)" }} />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 px-3 mb-2">Account</p>
              {accountItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`sidebar-nav-item mb-1 ${active ? "active" : ""}`}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span className="font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
              >
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{user?.email || ""}</p>
              </div>
              <span className="material-symbols-outlined text-slate-500 text-sm">
                {profileOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 -10px 28px rgba(16,40,74,0.18)",
                  }}
                >
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      signOut({ callbackUrl: "/auth/login" });
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 h-16 border-b"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(14px)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl lg:hidden text-slate-500 hover:text-slate-800"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <div className="hidden sm:block">
              <p className="text-base font-black text-slate-900 capitalize tracking-tight">{pageTitle || "Dashboard"}</p>
              <p className="text-[11px] text-slate-500 font-bold">{portalLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {quickAction && (
              <Link
                href={quickAction.href}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: "var(--primary)", boxShadow: "0 4px 15px var(--primary-glow)" }}
              >
                <span className="material-symbols-outlined text-xl">{quickAction.icon}</span>
                {quickAction.label}
              </Link>
            )}

            {notificationHref && (
              <Link
                href={notificationHref}
                className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                    style={{ background: "var(--danger)" }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </header>

        <motion.main
          key={pathname}
          className="flex-1 p-4 lg:p-8 page-enter"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
