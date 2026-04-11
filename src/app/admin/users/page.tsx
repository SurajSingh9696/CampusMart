"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type User = {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "seller" | "admin";
  status: "active" | "blocked";
  college?: string;
  createdAt: string;
};

const ROLE_COLOR: Record<string, string> = { customer: "#2563eb", seller: "#1a73e8", admin: "#dc2626" };
const ROLE_BG: Record<string, string> = { customer: "#eff6ff", seller: "#edf4ff", admin: "#fef2f2" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<User | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (roleFilter !== "all") q.set("role", roleFilter);
    if (search) q.set("search", search);
    fetch(`/api/admin/users?${q}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users || []); setLoading(false); });
  }, [roleFilter, search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  async function toggleBlock(user: User) {
    const action = user.status === "blocked" ? "unblock" : "block";
    const prev = users;
    setUsers((u) => u.map((x) => x._id === user._id ? { ...x, status: action === "block" ? "blocked" : "active" } : x));
    setSelected((s) => s?._id === user._id ? { ...s, status: action === "block" ? "blocked" : "active" } : s);
    const res = await fetch("/api/admin/users/block", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id, action }),
    });
    if (!res.ok) { setUsers(prev); toast.error("Action failed"); }
    else toast.success(`User ${action}ed`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">User Management</h1>
        <p className="text-slate-500 text-sm mt-0.5">Search, view, and manage all platform users</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="input-icon-wrap flex-1">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="input-dark" />
        </div>
        <div className="flex gap-2">
          {["all", "customer", "seller", "admin"].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={{ background: roleFilter === r ? "var(--primary)" : "white", color: roleFilter === r ? "white" : "var(--text-2)", border: `1px solid ${roleFilter === r ? "var(--primary)" : "var(--border)"}` }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse" />)}</div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">manage_accounts</span>
          <p className="text-slate-700 font-bold">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user, i) => (
            <motion.div key={user._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
              className="card px-5 py-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setSelected(user)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
                style={{ background: ROLE_COLOR[user.role] }}>
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold text-sm truncate">{user.name}</p>
                <p className="text-slate-400 text-xs truncate">{user.email}</p>
              </div>
              <span className="badge text-[10px] shrink-0" style={{ background: ROLE_BG[user.role], color: ROLE_COLOR[user.role] }}>{user.role}</span>
              {user.status === "blocked" && <span className="badge text-[10px] shrink-0" style={{ background: "#fef2f2", color: "#dc2626" }}>Blocked</span>}
            </motion.div>
          ))}
        </div>
      )}

      {/* User detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-end"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full w-full max-w-sm bg-white shadow-2xl p-7 overflow-y-auto flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-900">User Details</h3>
                <button onClick={() => setSelected(null)}><span className="material-symbols-outlined text-slate-400">close</span></button>
              </div>
              {/* Avatar */}
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl mb-3"
                  style={{ background: ROLE_COLOR[selected.role] }}>
                  {selected.name?.charAt(0).toUpperCase()}
                </div>
                <p className="text-xl font-black text-slate-900">{selected.name}</p>
                <p className="text-slate-500 text-sm">{selected.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="badge" style={{ background: ROLE_BG[selected.role], color: ROLE_COLOR[selected.role] }}>{selected.role}</span>
                  <span className="badge" style={{ background: selected.status === "blocked" ? "#fef2f2" : "#f0fdf4", color: selected.status === "blocked" ? "#dc2626" : "#16a34a" }}>{selected.status}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[["College", selected.college || "—"], ["Member since", new Date(selected.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-slate-800 font-semibold">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto">
                <button onClick={() => toggleBlock(selected)}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: selected.status === "blocked" ? "#f0fdf4" : "#fef2f2", color: selected.status === "blocked" ? "#16a34a" : "#dc2626", border: `1px solid ${selected.status === "blocked" ? "#bbf7d0" : "#fecaca"}` }}>
                  {selected.status === "blocked" ? "Unblock User" : "Block User"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
