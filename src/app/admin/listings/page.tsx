"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Listing = {
  _id: string;
  title: string;
  type: string;
  price: number;
  isFree?: boolean;
  status: string;
  sellerId: { name: string; email: string };
  mediaUrls?: string[];
  description?: string;
  approvalComment?: string;
  createdAt: string;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending_approval: { label: "Pending", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  live: { label: "Live", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  sold: { label: "Sold", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  deactivated: { label: "Paused", color: "#334155", bg: "#f1f5f9", border: "#cbd5e1" },
  draft: { label: "Draft", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" },
};

const FILTERS = [
  { value: "pending_approval", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("pending_approval");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Listing | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/listings?status=${filter}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load listings");
        }
        if (!cancelled) setListings(Array.isArray(data.listings) ? data.listings : []);
      } catch (error) {
        if (!cancelled) {
          setListings([]);
          const message = error instanceof Error ? error.message : "Failed to load listings";
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadListings();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function decide(id: string, action: "approve" | "reject") {
    if (actionLoadingId) return;

    const nextStatus = action === "approve" ? "live" : "rejected";
    const previousListings = listings;

    setActionLoadingId(id);
    setListings((current) => {
      if (filter === "pending_approval") {
        return current.filter((listing) => listing._id !== id);
      }
      return current.map((listing) =>
        listing._id === id ? { ...listing, status: nextStatus } : listing
      );
    });

    if (preview?._id === id) {
      setPreview((current) => (current ? { ...current, status: nextStatus } : null));
    }

    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setListings(previousListings);
        if (preview?._id === id) setPreview(previousListings.find((listing) => listing._id === id) || null);
        toast.error(data?.error || "Action failed");
        return;
      }

      toast.success(`Listing ${action === "approve" ? "approved" : "rejected"}`);
      if (filter === "pending_approval") setPreview(null);
    } catch {
      setListings(previousListings);
      if (preview?._id === id) setPreview(previousListings.find((listing) => listing._id === id) || null);
      toast.error("Action failed");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return listings;

    return listings.filter((listing) => {
      return (
        listing.title.toLowerCase().includes(term) ||
        listing.type.toLowerCase().includes(term) ||
        listing.sellerId?.name?.toLowerCase().includes(term) ||
        listing.sellerId?.email?.toLowerCase().includes(term)
      );
    });
  }, [listings, search]);

  const stats = useMemo(() => {
    return {
      pending: listings.filter((listing) => listing.status === "pending_approval" || listing.status === "pending").length,
      live: listings.filter((listing) => listing.status === "live" || listing.status === "active").length,
      rejected: listings.filter((listing) => listing.status === "rejected").length,
      value: listings.reduce((sum, listing) => sum + (listing.price || 0), 0),
    };
  }, [listings]);

  return (
    <div className="space-y-6">
      <div className="card p-6 md:p-7 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f3f8ff 100%)" }}>
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(26,115,232,0.12)" }} />
        <div className="relative z-10 flex flex-col gap-2">
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--primary)" }}>Admin Moderation</p>
          <h1 className="text-2xl font-black text-slate-900">Listing Approvals</h1>
          <p className="text-slate-500 text-sm">Review seller submissions and push trusted listings live with one click.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: stats.pending, icon: "hourglass_empty", color: "#d97706", bg: "#fffbeb" },
          { label: "Live", value: stats.live, icon: "check_circle", color: "#16a34a", bg: "#f0fdf4" },
          { label: "Rejected", value: stats.rejected, icon: "cancel", color: "#dc2626", bg: "#fef2f2" },
          { label: "Visible Value", value: `₹${Math.round(stats.value).toLocaleString("en-IN")}`, icon: "payments", color: "#2563eb", bg: "#eff6ff" },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: stat.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="input-icon-wrap flex-1">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, type, seller, or email..." className="input-dark" />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((status) => (
            <button key={status.value} onClick={() => setFilter(status.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={{ background: filter === status.value ? "var(--primary)" : "white", color: filter === status.value ? "white" : "var(--text-2)", border: `1px solid ${filter === status.value ? "var(--primary)" : "var(--border)"}` }}>
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card p-5 h-20 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inventory_2</span>
          <p className="text-slate-700 font-bold">No listings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((listing, i) => (
            <motion.div key={listing._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-4 sm:p-5 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setPreview(listing)}>
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0" style={{ background: "#f1f5f9", border: "1px solid var(--border)" }}>
                  {listing.mediaUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.mediaUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-900 font-bold truncate">{listing.title}</p>
                    <span className="badge text-[10px] shrink-0" style={{ background: STATUS_META[listing.status]?.bg || "#f8fafc", color: STATUS_META[listing.status]?.color || "#64748b", border: `1px solid ${STATUS_META[listing.status]?.border || "#cbd5e1"}` }}>
                      {STATUS_META[listing.status]?.label || listing.status}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs mt-0.5">{listing.sellerId?.name} · {listing.type} · {new Date(listing.createdAt).toLocaleDateString("en-IN")}</p>

                  {listing.description ? (
                    <p className="text-slate-500 text-xs mt-2 line-clamp-2">{listing.description}</p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <p className="text-slate-700 font-bold text-sm">{listing.isFree || listing.price === 0 ? "Free" : `₹${listing.price.toLocaleString("en-IN")}`}</p>

                    {(listing.status === "pending_approval" || listing.status === "pending") ? (
                      <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => decide(listing._id, "reject")}
                          disabled={actionLoadingId === listing._id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => decide(listing._id, "approve")}
                          disabled={actionLoadingId === listing._id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-green-700 border border-green-200 hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
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
                {preview.approvalComment ? (
                  <div className="pt-2">
                    <p className="text-slate-400 text-xs font-semibold">Admin Comment</p>
                    <p className="text-slate-600 text-xs mt-1">{preview.approvalComment}</p>
                  </div>
                ) : null}
                {preview.description && <p className="text-slate-500 text-xs pt-2">{preview.description}</p>}
              </div>
              {(preview.status === "pending_approval" || preview.status === "pending") && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => decide(preview._id, "reject")} disabled={actionLoadingId === preview._id} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50">Reject</button>
                  <button onClick={() => decide(preview._id, "approve")} disabled={actionLoadingId === preview._id} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50" style={{ background: "var(--primary)" }}>Approve</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
