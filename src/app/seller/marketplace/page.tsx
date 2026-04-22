"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

type Listing = {
  _id: string;
  title: string;
  description?: string;
  approvalComment?: string;
  type: "product" | "project" | "notes" | "event";
  price?: number;
  isFree?: boolean;
  status: "draft" | "pending_approval" | "live" | "sold" | "deactivated" | "rejected";
  mediaUrls?: string[];
  createdAt: string;
  orderedCount?: number;
  revenueTotal?: number;
};

const TYPE_ICON: Record<string, string> = {
  product: "shopping_bag", project: "terminal", notes: "menu_book", event: "local_activity",
};
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: "Draft", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" },
  pending_approval: { label: "Pending", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  live: { label: "Live", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  sold: { label: "Sold", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  deactivated: { label: "Paused", color: "#334155", bg: "#f1f5f9", border: "#cbd5e1" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

const STATUS_FILTERS = ["all", "live", "pending_approval", "sold", "deactivated", "rejected", "draft"] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "popular", label: "Most ordered" },
  { value: "revenue_desc", label: "Highest revenue" },
  { value: "price_desc", label: "Price high to low" },
  { value: "price_asc", label: "Price low to high" },
  { value: "title_asc", label: "Title A-Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export default function SellerMarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [sort, setSort] = useState<SortValue>("newest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/listings?mine=true&limit=100")
      .then((r) => r.json())
      .then((d) => {
        setListings(d.listings || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Unable to load listings");
        setLoading(false);
      });
  }, []);

  async function deleteListing(id: string) {
    if (!confirm("Delete this listing?")) return;
    const prev = listings;
    setListings((l) => l.filter((x) => x._id !== id));
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (!res.ok) { setListings(prev); toast.error("Delete failed"); }
    else toast.success("Listing deleted");
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = listings.filter((listing) => {
      if (filter !== "all" && listing.status !== filter) return false;
      if (!term) return true;
      return (
        listing.title.toLowerCase().includes(term) ||
        listing.description?.toLowerCase().includes(term)
      );
    });

    return [...base].sort((a, b) => {
      const aPrice = a.isFree ? 0 : a.price || 0;
      const bPrice = b.isFree ? 0 : b.price || 0;
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      if (sort === "oldest") return aCreated - bCreated;
      if (sort === "price_asc") return aPrice - bPrice;
      if (sort === "price_desc") return bPrice - aPrice;
      if (sort === "title_asc") return a.title.localeCompare(b.title);
      if (sort === "popular") return (b.orderedCount || 0) - (a.orderedCount || 0);
      if (sort === "revenue_desc") return (b.revenueTotal || 0) - (a.revenueTotal || 0);
      return bCreated - aCreated;
    });
  }, [listings, filter, search, sort]);

  const stats = useMemo(() => {
    const liveCount = listings.filter((l) => l.status === "live").length;
    const pendingCount = listings.filter((l) => l.status === "pending_approval").length;
    const soldCount = listings.filter((l) => l.status === "sold").length;
    const totalOrders = listings.reduce((sum, listing) => sum + (listing.orderedCount || 0), 0);
    return { liveCount, pendingCount, soldCount, totalOrders };
  }, [listings]);

  const revenue = useMemo(
    () => listings.reduce((sum, listing) => sum + (listing.revenueTotal || 0), 0),
    [listings]
  );

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6 lg:p-7" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f3f8ff 100%)" }}>
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(26,115,232,0.12)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--primary)" }}>Seller Studio</p>
            <h1 className="text-2xl font-black text-slate-900 mt-1">My Listings</h1>
            <p className="text-slate-500 text-sm mt-1">Manage pricing, visibility, and performance for {listings.length} listings.</p>
          </div>
          <Link href="/seller/upload" className="btn-primary flex items-center gap-2 text-sm" style={{ padding: "0.65rem 1.2rem" }}>
            <span className="material-symbols-outlined text-xl">add</span>
            New Listing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Live", value: stats.liveCount, icon: "check_circle", color: "#16a34a", bg: "#f0fdf4" },
          { label: "Pending", value: stats.pendingCount, icon: "hourglass_empty", color: "#d97706", bg: "#fffbeb" },
          { label: "Sold", value: stats.soldCount, icon: "sell", color: "#2563eb", bg: "#eff6ff" },
          { label: "Orders", value: stats.totalOrders, icon: "shopping_cart", color: "#0f766e", bg: "#ecfeff" },
          { label: "Revenue", value: `₹${Math.round(revenue).toLocaleString("en-IN")}`, icon: "payments", color: "#7c3aed", bg: "#f5f3ff" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="input-icon-wrap flex-1">
            <span className="icon-left material-symbols-outlined">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or description"
              className="input-dark"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            aria-label="Sort listings"
            className="input-dark w-full xl:w-auto"
            style={{ minWidth: "210px" }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => {
            const selected = filter === status;
            const label = status === "all" ? "All" : STATUS_META[status].label;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: selected ? "var(--primary)" : "white",
                  color: selected ? "white" : "var(--text-2)",
                  border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inventory_2</span>
          <p className="text-slate-700 font-bold mb-1">No listings found</p>
          <p className="text-slate-400 text-sm mb-5">Try changing status filters or search terms.</p>
          <Link href="/seller/upload" className="btn-primary" style={{ padding: "0.6rem 1.4rem" }}>Create Listing</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((listing, i) => {
            const statusMeta = STATUS_META[listing.status] || STATUS_META.draft;
            const price = listing.isFree ? "Free" : `₹${(listing.price || 0).toLocaleString("en-IN")}`;

            return (
              <motion.div
                key={listing._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-4 sm:p-5"
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0" style={{ background: "#f1f5f9", border: "1px solid var(--border)" }}>
                    {listing.mediaUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.mediaUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-slate-400">{TYPE_ICON[listing.type] || "sell"}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-slate-900 font-bold text-base line-clamp-1">{listing.title}</p>
                        <p className="text-slate-500 text-xs capitalize mt-0.5">
                          {listing.type} · {new Date(listing.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span
                        className="badge text-[10px]"
                        style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}` }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <p className="text-slate-500 text-xs mt-2 line-clamp-2">{listing.description || "No description provided."}</p>

                    {listing.status === "rejected" ? (
                      <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide font-bold text-red-500">Rejection Reason</p>
                        <p className="text-xs text-red-700 mt-1 line-clamp-3">
                          {listing.approvalComment?.trim() || "Rejected by admin. Please update the listing and re-submit."}
                        </p>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="rounded-xl p-2" style={{ background: "#f8fafc" }}>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Price</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5">{price}</p>
                      </div>
                      <div className="rounded-xl p-2" style={{ background: "#f8fafc" }}>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Orders</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5">{listing.orderedCount || 0}</p>
                      </div>
                      <div className="rounded-xl p-2" style={{ background: "#f8fafc" }}>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Revenue</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5">₹{Math.round(listing.revenueTotal || 0).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <Link
                    href={`/seller/upload?edit=${listing._id}`}
                    className="px-3 py-2 rounded-xl text-xs font-bold border"
                    style={{ borderColor: "var(--border)", color: "var(--text-2)", background: "white" }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteListing(listing._id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border"
                    style={{ borderColor: "#fecaca", color: "#b91c1c", background: "#fff5f5" }}
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
