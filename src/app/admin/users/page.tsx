"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

type User = {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "seller" | "admin";
  status: "active" | "blocked";
  isBlocked: boolean;
  blockedReason?: string;
  accountNumber: string;
  campus: string;
  phone?: string;
  idCardNumber?: string;
  sellerApprovalStatus?: "pending" | "approved" | "rejected";
  sellerApprovalComment?: string;
  createdAt: string;
};

type BlockDialogState = {
  user: User;
  reason: string;
};

const ROLE_AVATAR_CLASS: Record<User["role"], string> = {
  customer: "bg-blue-600",
  seller: "bg-sky-600",
  admin: "bg-red-600",
};

const ROLE_BADGE_CLASS: Record<User["role"], string> = {
  customer: "bg-blue-50 text-blue-600",
  seller: "bg-sky-50 text-sky-600",
  admin: "bg-red-50 text-red-600",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [blockDialog, setBlockDialog] = useState<BlockDialogState | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (roleFilter !== "all") q.set("role", roleFilter);
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (search.trim()) q.set("search", search.trim());

    fetch(`/api/admin/users?${q}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load users");
        setUsers(Array.isArray(data.users) ? data.users : []);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load users");
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [roleFilter, statusFilter, search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  function openBlockDialog(user: User) {
    if (actionLoadingId) return;
    if (user.role === "admin") {
      toast.error("Admin accounts cannot be blocked.");
      return;
    }
    setBlockDialog({
      user,
      reason: user.blockedReason || "",
    });
  }

  async function runBlockAction(user: User, action: "block" | "unblock", reasonInput = "") {
    if (actionLoadingId) return false;

    if (action === "block" && user.role === "admin") {
      toast.error("Admin accounts cannot be blocked.");
      return false;
    }

    const reason = reasonInput.trim();
    if (action === "block" && reason.length < 5) {
      toast.error("Please provide a valid block reason.");
      return false;
    }

    const prev = users;
    setActionLoadingId(user._id);

    setUsers((current) => current.map((item) => {
      if (item._id !== user._id) return item;
      const isBlocked = action === "block";
      return {
        ...item,
        status: isBlocked ? "blocked" : "active",
        isBlocked,
        blockedReason: isBlocked ? reason : "",
      };
    }));

    setSelected((current) => {
      if (!current || current._id !== user._id) return current;
      const isBlocked = action === "block";
      return {
        ...current,
        status: isBlocked ? "blocked" : "active",
        isBlocked,
        blockedReason: isBlocked ? reason : "",
      };
    });

    try {
      const res = await fetch("/api/admin/users/block", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, action, reason }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setUsers(prev);
        setSelected((current) => (current?._id === user._id ? user : current));
        toast.error(data?.error || "Action failed");
        return false;
      }

      toast.success(action === "block" ? "User is blocked" : "User is unblocked");
      if (action === "unblock") setBlockDialog(null);
      return true;
    } catch {
      setUsers(prev);
      setSelected((current) => (current?._id === user._id ? user : current));
      toast.error("Action failed");
      return false;
    } finally {
      setActionLoadingId(null);
    }
  }

  async function submitBlockFromDialog() {
    if (!blockDialog) return;
    const ok = await runBlockAction(blockDialog.user, "block", blockDialog.reason);
    if (ok) setBlockDialog(null);
  }

  const stats = {
    total: users.length,
    blocked: users.filter((user) => user.isBlocked).length,
    sellers: users.filter((user) => user.role === "seller").length,
    admins: users.filter((user) => user.role === "admin").length,
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 md:p-7 relative overflow-hidden bg-gradient-to-br from-white to-blue-50">
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-blue-500/10" />
        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Admin Controls</p>
          <h1 className="text-2xl font-black text-slate-900 mt-1">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Review full user details, moderation status, and block controls in one place.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: "group", boxClass: "bg-blue-50", iconClass: "text-blue-600" },
          { label: "Blocked", value: stats.blocked, icon: "block", boxClass: "bg-red-50", iconClass: "text-red-600" },
          { label: "Sellers", value: stats.sellers, icon: "storefront", boxClass: "bg-sky-50", iconClass: "text-sky-600" },
          { label: "Admins", value: stats.admins, icon: "shield", boxClass: "bg-orange-50", iconClass: "text-orange-600" },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${stat.boxClass}`}>
              <span className={`material-symbols-outlined text-xl ${stat.iconClass}`}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="input-icon-wrap flex-1">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, account number, campus..." className="input-dark" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "customer", "seller", "admin"].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                roleFilter === r
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {r}
            </button>
          ))}
          {["all", "active", "blocked"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                statusFilter === s
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {s}
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {users.map((user, i) => (
            <motion.div key={user._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
              className="card p-5 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setSelected(user)}>
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 ${ROLE_AVATAR_CLASS[user.role]}`}>
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-slate-900 font-bold text-sm truncate">{user.name}</p>
                      <p className="text-slate-400 text-xs truncate">{user.email}</p>
                    </div>
                    <div className="flex gap-1">
                      <span className={`badge text-[10px] shrink-0 ${ROLE_BADGE_CLASS[user.role]}`}>{user.role}</span>
                      <span className={`badge text-[10px] shrink-0 ${user.isBlocked ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                    <p className="text-slate-500"><span className="font-semibold text-slate-700">Account:</span> {user.accountNumber || "—"}</p>
                    <p className="text-slate-500"><span className="font-semibold text-slate-700">Campus:</span> {user.campus || "—"}</p>
                    <p className="text-slate-500"><span className="font-semibold text-slate-700">Phone:</span> {user.phone || "—"}</p>
                    <p className="text-slate-500"><span className="font-semibold text-slate-700">Joined:</span> {new Date(user.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>

                  {user.isBlocked && user.blockedReason ? (
                    <p className="text-xs text-red-600 mt-2 line-clamp-2">Reason: {user.blockedReason}</p>
                  ) : null}

                  {user.role !== "admin" ? (
                    <div className="flex justify-end mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          if (user.isBlocked) {
                            void runBlockAction(user, "unblock");
                          } else {
                            openBlockDialog(user);
                          }
                        }}
                        disabled={actionLoadingId === user._id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 border ${
                          user.isBlocked
                            ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        }`}
                      >
                        {user.isBlocked ? "Unblock User" : "Block User"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Admin account protection enabled
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* User detail drawer */}
      {portalReady && createPortal(
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[4px]"
              onClick={() => setSelected(null)}
            >
              <motion.div
                initial={{ x: 360 }}
                animate={{ x: 0 }}
                exit={{ x: 360 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-2xl p-7 overflow-y-auto flex flex-col gap-5"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900">User Details</h3>
                  <button onClick={() => setSelected(null)}><span className="material-symbols-outlined text-slate-400">close</span></button>
                </div>
                {/* Avatar */}
                <div className="flex flex-col items-center text-center py-4">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl mb-3 ${ROLE_AVATAR_CLASS[selected.role]}`}>
                    {selected.name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xl font-black text-slate-900">{selected.name}</p>
                  <p className="text-slate-500 text-sm">{selected.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`badge ${ROLE_BADGE_CLASS[selected.role]}`}>{selected.role}</span>
                    <span className={`badge ${selected.status === "blocked" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{selected.status}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    ["Account Number", selected.accountNumber || "—"],
                    ["Campus", selected.campus || "—"],
                    ["Phone", selected.phone || "—"],
                    ["ID Card", selected.idCardNumber || "—"],
                    ["Seller Approval", selected.role === "seller" ? (selected.sellerApprovalStatus || "pending") : "N/A"],
                    ["Member since", new Date(selected.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-400">{k}</span>
                      <span className="text-slate-800 font-semibold">{v}</span>
                    </div>
                  ))}
                  {selected.sellerApprovalComment ? (
                    <div className="rounded-lg p-3 text-xs bg-slate-50 border border-slate-200">
                      <p className="font-semibold text-slate-700">Seller Approval Comment</p>
                      <p className="text-slate-500 mt-1">{selected.sellerApprovalComment}</p>
                    </div>
                  ) : null}
                  {selected.blockedReason ? (
                    <div className="rounded-lg p-3 text-xs bg-red-50 border border-red-200">
                      <p className="font-semibold text-red-700">Blocked Reason</p>
                      <p className="text-red-600 mt-1">{selected.blockedReason}</p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-auto">
                  {selected.role !== "admin" ? (
                    <button
                      onClick={() => {
                        if (selected.isBlocked) {
                          void runBlockAction(selected, "unblock");
                        } else {
                          openBlockDialog(selected);
                        }
                      }}
                      disabled={actionLoadingId === selected._id}
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-colors border ${
                        selected.isBlocked
                          ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                      }`}>
                      {selected.isBlocked ? "Unblock User" : "Block User"}
                    </button>
                  ) : (
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">
                      Admin account protection enabled
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {portalReady && createPortal(
        <AnimatePresence>
          {blockDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
              onClick={(event) => {
                if (event.target === event.currentTarget && actionLoadingId !== blockDialog.user._id) {
                  setBlockDialog(null);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.96, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 8 }}
                className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              >
                <h3 className="text-lg font-black text-slate-900">Block User</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Provide the moderation reason for blocking <span className="font-semibold text-slate-700">{blockDialog.user.name}</span>.
                </p>

                <textarea
                  value={blockDialog.reason}
                  onChange={(event) =>
                    setBlockDialog((current) => (current ? { ...current, reason: event.target.value } : current))
                  }
                  rows={5}
                  placeholder="Example: Repeated policy violations, spam messages, and abusive communication."
                  className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Minimum 5 characters ({blockDialog.reason.trim().length}/5)
                </p>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setBlockDialog(null)}
                    disabled={actionLoadingId === blockDialog.user._id}
                    className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void submitBlockFromDialog()}
                    disabled={actionLoadingId === blockDialog.user._id || blockDialog.reason.trim().length < 5}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    Confirm Block
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
