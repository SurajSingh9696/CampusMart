"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { startListingCheckout } from "@/lib/client-checkout";

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
  tags?: string[];
  sellerId?: { _id: string; name: string; campus: string };
  createdAt: string;
};

const TYPE_ICON: Record<string, string> = {
  product: "shopping_bag",
  project: "terminal",
  notes: "menu_book",
  event: "local_activity",
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyModal, setBuyModal] = useState(false);
  const [related, setRelated] = useState<Listing[]>([]);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) { router.replace("/customer/products"); return; }
      const data = await res.json();
      setListing(data.listing);

      // Fetch related listings (same campus, same type)
      if (data.listing) {
        const rRes = await fetch(
          `/api/listings?type=${data.listing.type}&limit=4&status=live`
        );
        const rData = await rRes.json();
        setRelated((rData.listings || []).filter((l: Listing) => l._id !== id).slice(0, 3));
      }
    } catch {
      toast.error("Failed to load listing");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Load wishlist state for this item
  useEffect(() => {
    fetch("/api/wishlist")
      .then(r => r.json())
      .then(d => {
        const items = d.items || [];
        const found = items.find((i: { listingId: { _id: string } | string }) => {
          const lid = typeof i.listingId === "string" ? i.listingId : i.listingId?._id;
          return lid === id;
        });
        setWishlisted(!!found);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => { fetchListing(); }, [fetchListing]);

  async function toggleWishlist() {
    if (!listing) return;
    setWishlistLoading(true);
    try {
      const method = wishlisted ? "DELETE" : "POST";
      const res = await fetch("/api/wishlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing._id, itemType: listing.type, campus: listing.campus }),
      });
      if (res.ok) {
        setWishlisted(!wishlisted);
        toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist ❤️");
      } else {
        toast.error("Failed to update wishlist");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setWishlistLoading(false);
    }
  }

  async function handleBuy() {
    if (!listing) return;
    setBuyLoading(true);
    try {
      const result = await startListingCheckout({
        listingId: listing._id,
        quantity: 1,
        itemType: listing.type as "product" | "project" | "notes" | "event",
      });

      toast.success(
        result.provider === "fallback"
          ? "Order placed successfully"
          : "Payment successful and order placed"
      );
      setBuyModal(false);
      router.push("/customer/orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete checkout";
      toast.error(message);
    } finally {
      setBuyLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl animate-pulse" style={{ background: "var(--surface-2)" }} />
          <div className="space-y-4 pt-4">
            {[80, 60, 40, 100, 50].map((w, i) => (
              <div key={i} className="h-5 rounded-xl animate-pulse" style={{ background: "var(--surface-2)", width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const images = listing.mediaUrls?.length ? listing.mediaUrls : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/customer/products" className="hover:text-slate-700 transition-colors">Products</Link>
        <span>/</span>
        <span className="text-slate-600 capitalize">{listing.type}</span>
        <span>/</span>
        <span className="text-slate-900 font-semibold line-clamp-1">{listing.title}</span>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Image gallery */}
        <div className="space-y-3">
          <div
            className="relative rounded-2xl overflow-hidden aspect-square flex items-center justify-center"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            {images.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={imgIdx}
                  src={images[imgIdx]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
            ) : (
              <span className="material-symbols-outlined text-7xl text-slate-300">
                {TYPE_ICON[listing.type] || "shopping_bag"}
              </span>
            )}
            {/* Wishlist button */}
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                background: wishlisted ? "#fef2f2" : "rgba(255,255,255,0.9)",
                border: `1px solid ${wishlisted ? "#fca5a5" : "var(--border)"}`,
                color: wishlisted ? "#ef4444" : "#94a3b8",
              }}
            >
              <span className="material-symbols-outlined text-xl">
                {wishlisted ? "favorite" : "favorite_border"}
              </span>
            </button>
            {/* Campus badge */}
            <div className="absolute top-4 left-4">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid var(--border)", color: "#334155" }}>
                {listing.campus}
              </span>
            </div>
            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30"
                  disabled={imgIdx === 0}>
                  <span className="material-symbols-outlined text-sm text-slate-700">chevron_left</span>
                </button>
                <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30"
                  disabled={imgIdx === images.length - 1}>
                  <span className="material-symbols-outlined text-sm text-slate-700">chevron_right</span>
                </button>
              </>
            )}
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((url, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className="w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                  style={{ borderColor: imgIdx === i ? "var(--primary)" : "transparent" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <span className="badge badge-primary capitalize mb-2 inline-block">{listing.type}</span>
            <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">{listing.title}</h1>
            {listing.sellerId && (
              <p className="text-sm text-slate-500">
                Listed by <span className="font-semibold text-slate-700">{listing.sellerId.name}</span>
                <span className="mx-2">·</span>
                <span className="text-slate-400">{listing.campus}</span>
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-slate-900">
              {listing.isFree ? (
                <span className="text-green-600">FREE</span>
              ) : (
                `₹${listing.price}`
              )}
            </span>
            {!listing.isFree && (
              <span className="text-slate-400 text-sm mb-1">+ Campus delivery</span>
            )}
          </div>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {listing.tags.map(tag => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Description</p>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setBuyModal(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
            >
              <span className="material-symbols-outlined">shopping_cart_checkout</span>
              {listing.isFree ? "Get for Free" : "Buy Now"}
            </button>
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all border"
              style={{
                background: wishlisted ? "#fef2f2" : "white",
                borderColor: wishlisted ? "#fca5a5" : "var(--border)",
                color: wishlisted ? "#ef4444" : "#94a3b8",
              }}
            >
              <span className="material-symbols-outlined">
                {wishlisted ? "favorite" : "favorite_border"}
              </span>
            </button>
          </div>

          {/* Safety note */}
          <div className="flex items-center gap-3 p-3 rounded-xl text-xs"
            style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>verified_user</span>
            <p className="text-blue-700 leading-relaxed">
              All listings are verified by campus admin. Meet in a safe, public place for physical transfers.
            </p>
          </div>

          {/* Date */}
          <p className="text-xs text-slate-400">
            Listed on {new Date(listing.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </div>
      </div>

      {/* Related listings */}
      {related.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">More from your campus</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((item, i) => (
              <motion.div key={item._id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Link href={`/customer/products/${item._id}`}>
                  <div className="card group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="aspect-[4/3] flex items-center justify-center relative overflow-hidden"
                      style={{ background: "var(--surface-2)" }}>
                      {item.mediaUrls?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.mediaUrls[0]} alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-slate-300">
                          {TYPE_ICON[item.type] || "shopping_bag"}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                      <div className="flex justify-between items-center mt-3">
                        <span className="font-black text-slate-900">
                          {item.isFree ? <span className="text-green-600 text-sm">FREE</span> : `₹${item.price}`}
                        </span>
                        <span className="badge badge-primary text-[10px]">{item.campus}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Buy Confirmation Modal */}
      <AnimatePresence>
        {buyModal && listing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && setBuyModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
              style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900">Confirm Purchase</h3>
                <button onClick={() => setBuyModal(false)} className="text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-4 items-center p-4 rounded-xl"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#eff6ff" }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: "var(--primary)" }}>
                      {TYPE_ICON[listing.type] || "shopping_bag"}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 line-clamp-1">{listing.title}</p>
                    <p className="text-sm text-slate-500">{listing.campus}</p>
                    <p className="text-lg font-black" style={{ color: "var(--primary)" }}>
                      {listing.isFree ? "FREE" : `₹${listing.price}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    The seller will contact you to arrange delivery. Always meet in a campus public space.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-slate-500 font-medium">Total</span>
                <span className="text-2xl font-black text-slate-900">
                  {listing.isFree ? "FREE" : `₹${listing.price}`}
                </span>
              </div>

              <button
                onClick={handleBuy}
                disabled={buyLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-70"
              >
                {buyLoading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>
                ) : (
                  <><span className="material-symbols-outlined">shopping_cart_checkout</span>Confirm Order</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
