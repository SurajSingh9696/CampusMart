"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Listing = {
  _id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  mediaUrls: string[];
  campus: string;
  type: string;
  status: string;
  createdAt: string;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryString = searchParams.toString();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [globalView, setGlobalView] = useState(false);
  const [search, setSearch] = useState("");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [wishlistLoading, setWishlistLoading] = useState<Set<string>>(new Set());

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "product", sort, global: String(globalView) });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/listings?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
    } finally {
      setLoading(false);
    }
  }, [sort, globalView, search]);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setGlobalView(searchParams.get("global") === "true");
  }, [queryString, searchParams]);

  useEffect(() => {
    const t = setTimeout(fetchListings, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchListings, search]);

  // Load real wishlist state from API
  useEffect(() => {
    fetch("/api/wishlist")
      .then(r => r.json())
      .then(d => {
        const ids = new Set<string>(
          (d.items || []).map((item: { listingId: { _id: string } | null }) =>
            item.listingId?._id ?? ""
          ).filter(Boolean)
        );
        setWishlist(ids);
      })
      .catch(() => {});
  }, []);

  async function toggleWishlist(listing: Listing) {
    const id = listing._id;
    const isWishlisted = wishlist.has(id);
    setWishlistLoading(prev => new Set(prev).add(id));
    try {
      const method = isWishlisted ? "DELETE" : "POST";
      const res = await fetch("/api/wishlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id, itemType: listing.type, campus: listing.campus }),
      });
      if (res.ok) {
        setWishlist(prev => {
          const next = new Set(prev);
          isWishlisted ? next.delete(id) : next.add(id);
          return next;
        });
        toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist ❤️");
      } else {
        toast.error("Login required to save items");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setWishlistLoading(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Products Marketplace</h1>
          <p className="text-slate-500 text-sm mt-1">
            {listings.length > 0 ? `${listings.length} items available` : "Explore student listings"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Grid/List toggle */}
          <div
            className="flex p-1 rounded-xl gap-1"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: view === v ? "var(--primary)" : "transparent",
                  color: view === v ? "white" : "var(--muted)",
                }}
              >
                <span className="material-symbols-outlined text-xl">
                  {v === "grid" ? "grid_view" : "view_list"}
                </span>
              </button>
            ))}
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-dark py-2 pr-8 w-auto"
            style={{ minWidth: "180px" }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "var(--surface)" }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search + Campus toggle */}
      <div className="flex gap-3 flex-wrap">
        <div className="input-icon-wrap flex-1 min-w-[200px]">
          <span className="icon-left material-symbols-outlined">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for products, electronics, books..."
            className="input-dark"
          />
        </div>
        <button
          onClick={() => setGlobalView(!globalView)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: globalView ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${globalView ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
            color: globalView ? "#f59e0b" : "var(--muted)",
          }}
        >
          <span className="material-symbols-outlined text-xl">language</span>
          {globalView ? "Global View" : "My Campus"}
        </button>
      </div>

      {/* Cross-campus warning */}
      {globalView && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <span className="material-symbols-outlined text-amber-400">warning</span>
          <p className="text-amber-400 text-sm">
            <strong>Browsing globally.</strong> Items from other campuses may require travel or shipping arrangements with the seller.
          </p>
        </motion.div>
      )}

      {/* Loading */}
      {loading ? (
        <div className={`grid gap-5 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden animate-pulse"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <div className="aspect-[4/3]" style={{ background: "var(--border)" }} />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded" style={{ background: "var(--border)" }} />
                <div className="h-3 w-full rounded" style={{ background: "var(--border)" }} />
                <div className="h-3 w-1/2 rounded" style={{ background: "var(--border)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">shopping_bag</span>
          <h3 className="text-slate-800 font-bold text-lg mb-2">No products found</h3>
          <p className="text-slate-500">
            {search ? `No results for "${search}"` : "Be the first to list something on your campus!"}
          </p>
        </div>
      ) : (
        <div className={`grid gap-5 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
          {listings.map((item, i) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/customer/products/${item._id}`}>
                <div
                  className={`group rounded-xl overflow-hidden transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-1 ${
                    view === "list" ? "flex gap-4" : ""
                  }`}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Image */}
                  <div
                    className={`relative overflow-hidden ${view === "grid" ? "aspect-[4/3]" : "w-32 sm:w-48 shrink-0"}`}
                    style={{ background: "var(--surface-3)" }}
                  >
                    {item.mediaUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.mediaUrls[0]}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-5xl" style={{ color: "var(--border)" }}>
                          shopping_bag
                        </span>
                      </div>
                    )}
                    {/* Campus badge */}
                    <div className="absolute top-2 left-2">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
                        style={{
                          background: "rgba(255,255,255,0.92)",
                          border: "1px solid var(--border)",
                          color: "var(--text-2)",
                        }}
                      >
                        {item.campus}
                      </span>
                    </div>
                    {/* Wishlist */}
                    <button
                      onClick={(e) => { e.preventDefault(); toggleWishlist(item); }}
                      disabled={wishlistLoading.has(item._id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid var(--border)",
                        color: wishlist.has(item._id) ? "#ef4444" : "var(--muted)",
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {wishlist.has(item._id) ? "favorite" : "favorite_border"}
                      </span>
                    </button>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-3">
                      <span className="text-lg font-black text-slate-900">
                        {item.isFree ? (
                          <span className="text-green-600 text-sm font-bold">FREE</span>
                        ) : (
                          `₹${item.price}`
                        )}
                      </span>
                      <button
                        onClick={(e) => { e.preventDefault(); router.push(`/customer/products/${item._id}`); }}
                        className="flex items-center gap-1 py-2 px-3 rounded-lg text-xs font-bold transition-all active:scale-95"
                        style={{ background: "var(--primary)", color: "white", boxShadow: "0 4px 12px var(--primary-glow)" }}
                      >
                        <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>
                        {view === "list" ? "Buy Now" : ""}
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading products...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
