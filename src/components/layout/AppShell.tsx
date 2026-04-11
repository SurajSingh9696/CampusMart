"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";

export type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  nav: NavItem[];
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, nav, children }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-black text-slate-900">CampusMart</h2>
          <p className="text-xs text-slate-500">Unified Workspace</p>

          <nav className="mt-6 space-y-1">
            {nav.map((item, index) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/") || (index === 0 && pathname === "/dashboard");

              return (
                <Link
                  key={`${item.href}-${item.label}-${index}`}
                  href={item.href}
                  className={`relative block rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                    active ? "text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="appshell-active-nav"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "var(--info-bg)", border: "1px solid rgba(26,115,232,0.2)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-6">
          <header className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
                <p className="mt-1 text-slate-600 font-semibold">{subtitle}</p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  User Menu
                </button>
                {open ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 z-30 mt-2 w-44 rounded-xl border bg-white p-2 shadow-md"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Profile</Link>
                    <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Settings</Link>
                    <Link href="/dashboard/customer" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Wishlist</Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/auth/login" })}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Logout
                    </button>
                  </motion.div>
                ) : null}
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
