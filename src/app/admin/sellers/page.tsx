"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Seller = {
  _id: string; name: string; email: string; campus: string;
  accountNumber: string; sellerApprovalStatus: string; isBlocked: boolean;
  createdAt: string; shop?: { shopName?: string };
};

const STATUS_TABS = [
  { value: "pending", label: "Pending", color: "#d97706", bg: "#fffbeb", icon: "schedule" },
  { value: "approved", label: "Approved", color: "#16a34a", bg: "#f0fdf4", icon: "check_circle" },
  { value: "rejected", label: "Rejected", color: "#dc2626", bg: "#fef2f2", icon: "cancel" },
];

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<Seller | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/sellers?status=${tab}`)
      .then(r => r.json())
      .then(d => { setSellers(d.sellers || []); setLoading(false); });
  }, [tab]);

  async function applyAction(sellerId: string, action: "approve" | "reject" | "block" | "unblock") {
    setApplying(sellerId + action);
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, action }),
      });
      if (!res.ok) { toast.error("Action failed"); return; }
      toast.success(`Seller ${action}d successfully`);
      setSellers(prev => prev.filter(s => s._id !== sellerId));
      setSelected(null);
    } finally { setApplying(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Seller Approvals</h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve seller applications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab_) => (
          <button key={tab_.value} onClick={() => setTab(tab_.value)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === tab_.value ? tab_.bg : "white",
              border: `1px solid ${tab === tab_.value ? tab_.color + "50" : "var(--border)"}`,
              color: tab === tab_.value ? tab_.color : "var(--muted)",
            }}>
            <span className="material-symbols-outlined text-sm">{tab_.icon}</span>
            {tab_.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full shrink-0" style={{ background: "#f1f5f9" }} />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 w-1/3 rounded" style={{ background: "#f1f5f9" }} />
                  <div className="h-3 w-1/4 rounded" style={{ background: "#f1f5f9" }} />
                </div>
              </div>
            ))}
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">check_circle</span>
            <p className="text-slate-800 font-bold mb-1">No {tab} sellers</p>
            <p className="text-slate-400 text-sm">Check back later for new applications.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
                {["Seller", "Store", "Campus", "Applied", "Actions"].map((h, i) => (
                  <th key={h} className={`text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 ${i === 1 ? "hidden md:table-cell" : i === 2 ? "hidden sm:table-cell" : i === 3 ? "hidden lg:table-cell" : i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller._id} className="cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                  onClick={() => setSelected(seller)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: "var(--primary)", color: "white" }}>
                        {seller.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-slate-900 font-semibold text-sm">{seller.name}</p>
                        <p className="text-slate-400 text-xs">{seller.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-slate-600">{seller.shop?.shopName || "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-slate-500">{seller.campus}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-slate-400">{new Date(seller.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {tab === "pending" && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); applyAction(seller._id, "approve"); }}
                            disabled={!!applying}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}>
                            {applying === seller._id + "approve" ? "..." : "Approve"}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); applyAction(seller._id, "reject"); }}
                            disabled={!!applying}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                            {applying === seller._id + "reject" ? "..." : "Reject"}
                          </button>
                        </>
                      )}
                      {tab === "approved" && (
                        <button onClick={(e) => { e.stopPropagation(); applyAction(seller._id, "block"); }}
                          disabled={!!applying}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                          Block
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-8 relative bg-white shadow-2xl"
              style={{ border: "1px solid var(--border)" }}>
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-2xl"
                  style={{ background: "var(--primary)" }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selected.name}</h3>
                  <p className="text-slate-500 text-sm">{selected.email}</p>
                  <span className="badge badge-primary mt-1">{selected.accountNumber}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { label: "Store Name", value: selected.shop?.shopName || "Not set" },
                  { label: "Campus", value: selected.campus },
                  { label: "Status", value: selected.sellerApprovalStatus },
                  { label: "Applied On", value: new Date(selected.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" }) },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <p className="text-slate-400 text-sm font-medium">{item.label}</p>
                    <p className="text-slate-900 text-sm font-bold capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              {tab === "pending" && (
                <div className="flex gap-3">
                  <button onClick={() => applyAction(selected._id, "reject")} disabled={!!applying}
                    className="flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                    Reject
                  </button>
                  <button onClick={() => applyAction(selected._id, "approve")} disabled={!!applying}
                    className="flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    style={{ background: "#16a34a", color: "white" }}>
                    {applying ? "Approving..." : "✓ Approve"}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
