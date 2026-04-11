"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Listing = {
  _id: string;
  title: string;
  type: string;
  price: number;
  status: string;
  sellerId: { name: string; email: string };
  images?: string[];
  description?: string;
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = { active: "#16a34a", pending: "#d97706", rejected: "#dc2626" };
const STATUS_BG: Record<string, string> = { active: "#f0fdf4", pending: "#fffbeb", rejected: "#fef2f2" };

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Listing | null>(null);

  useEffect(() => {
    fetch(`/api/admin/listings?status=${filter}`)
      .then((r) => r.json())
      .then((d) => { setListings(d.listings || []); setLoading(false); });
  }, [filter]);

  async function decide(id: string, action: "approve" | "reject") {
    const prev = listings;
    setListings((l) => l.filter((x) => x._id !== id));
    setPreview(null);
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { setListings(prev); toast.error("Action failed"); }
    else toast.success(`Listing ${action === "approve" ? "approved" : "rejected"}`);
  }

  const filtered = search ? listings.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()) || l.sellerId?.name?.toLowerCase().includes(search.toLowerCase())) : listings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Listing Moderation</h1>
        <p className="text-slate-500 text-sm mt-0.5">Review and approve or reject student listings</p>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="input-icon-wrap flex-1">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or seller..." className="input-dark" />
        </div>
        <div className="flex gap-2">
          {["pending", "active", "rejected", "all"].map((s) => (
            <button key={s} onClick={() => { setFilter(s); setLoading(true); }}
              className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={{ background: filter === s ? "var(--primary)" : "white", color: filter === s ? "white" : "var(--text-2)", border: `1px solid ${filter === s ? "var(--primary)" : "var(--border)"}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card p-5 h-20 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inventory_2</span>
          <p className="text-slate-700 font-bold">No {filter} listings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing, i) => (
            <motion.div key={listing._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-5 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setPreview(listing)}>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold truncate">{listing.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{listing.sellerId?.name} · {listing.type} · {new Date(listing.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              <p className="text-slate-700 font-bold shrink-0">{listing.price === 0 ? "Free" : `₹${listing.price}`}</p>
              <span className="badge text-[10px] shrink-0" style={{ background: STATUS_BG[listing.status] || "#f8fafc", color: STATUS_COLOR[listing.status] || "#64748b" }}>
                {listing.status}
              </span>
              {listing.status === "pending" && (
                <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => decide(listing._id, "approve")}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-green-700 border border-green-200 hover:bg-green-50 transition-colors">
                    Approve
                  </button>
                  <button onClick={() => decide(listing._id, "reject")}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                    Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-7 border border-slate-100">
              <div className="flex justify-between mb-5">
                <h3 className="text-lg font-black text-slate-900">Listing Preview</h3>
                <button onClick={() => setPreview(null)}><span className="material-symbols-outlined text-slate-400">close</span></button>
              </div>
              <div className="space-y-2.5 text-sm">
                {[["Title", preview.title], ["Type", preview.type], ["Price", preview.price === 0 ? "Free" : `₹${preview.price}`], ["Seller", preview.sellerId?.name], ["Email", preview.sellerId?.email]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">{k}</span>
                    <span className="text-slate-800 font-bold capitalize">{v}</span>
                  </div>
                ))}
                {preview.description && <p className="text-slate-500 text-xs pt-2">{preview.description}</p>}
              </div>
              {preview.status === "pending" && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => decide(preview._id, "reject")} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">Reject</button>
                  <button onClick={() => decide(preview._id, "approve")} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: "var(--primary)" }}>Approve</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
