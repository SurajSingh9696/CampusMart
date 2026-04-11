"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

type WishlistItem = {
  _id: string;
  listingId: {
    _id: string; title: string; price: number; isFree: boolean; type: string;
    mediaUrls?: string[]; campus?: string; status?: string;
  };
  itemType: string;
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false); });
  }, []);

  async function remove(item: WishlistItem) {
    const prev = items;
    setItems((i) => i.filter((x) => x._id !== item._id));
    const res = await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: item.listingId._id }),
    });
    if (!res.ok) { setItems(prev); toast.error("Failed to remove"); }
    else toast.success("Removed from wishlist");
  }

  function getDetailHref(item: WishlistItem) {
    const id = item.listingId._id;
    const type = item.itemType || item.listingId?.type;
    if (type === "notes") return `/customer/notes/${id}`;
    if (type === "project") return `/customer/projects/${id}`;
    if (type === "event") return `/customer/events`;
    return `/customer/products/${id}`;
  }

  const TYPE_ICON: Record<string, string> = {
    event: "local_activity", notes: "menu_book", project: "terminal", product: "shopping_bag",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Wishlist</h1>
        <p className="text-slate-500 text-sm mt-0.5">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="aspect-video rounded-xl" style={{ background: "#f1f5f9" }} />
              <div className="h-4 w-2/3 rounded" style={{ background: "#f1f5f9" }} />
              <div className="h-3 w-1/3 rounded" style={{ background: "#f1f5f9" }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 block mb-4">favorite_border</span>
          <p className="text-slate-700 font-bold mb-1">Your wishlist is empty</p>
          <p className="text-slate-400 text-sm mb-6">Tap the heart on any listing to save it here.</p>
          <Link href="/customer/products" className="btn-primary" style={{ padding: "0.65rem 1.5rem" }}>
            Start Exploring
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => {
            const listing = item.listingId;
            if (!listing) return null;
            return (
              <motion.div key={item._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card group overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                {/* Image */}
                <div className="aspect-video flex items-center justify-center relative overflow-hidden" style={{ background: "#f8fafc" }}>
                  {listing.mediaUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.mediaUrls[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-slate-300">
                      {TYPE_ICON[item.itemType] || "shopping_bag"}
                    </span>
                  )}
                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <span className="badge badge-primary capitalize text-[9px]">{item.itemType}</span>
                  </div>
                  {/* Campus */}
                  {listing.campus && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md"
                        style={{ background: "rgba(255,255,255,0.9)", color: "#334155", border: "1px solid var(--border)" }}>
                        {listing.campus}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-slate-900 font-bold text-sm leading-tight line-clamp-2 flex-1">{listing.title}</p>
                    <button onClick={() => remove(item)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-sm">favorite</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-slate-900 font-black text-lg">
                      {listing.isFree || listing.price === 0 ? (
                        <span className="text-green-600 text-sm font-bold">FREE</span>
                      ) : (
                        `₹${listing.price}`
                      )}
                    </span>
                    <Link href={getDetailHref(item)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "var(--primary-subtle)", color: "var(--primary)", border: "1px solid rgba(37,99,235,0.15)" }}>
                      View →
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
