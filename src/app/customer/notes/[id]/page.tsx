"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Note = {
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
  notesConfig?: {
    subject?: string;
    year?: string;
    semester?: string;
    notesPdfUrl?: string;
    previewPages?: number;
  };
  sellerId?: { _id: string; name: string; campus: string };
  createdAt: string;
};

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [buyModal, setBuyModal] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) { router.replace("/customer/notes"); return; }
      const data = await res.json();
      setNote(data.listing);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

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

  useEffect(() => { fetchNote(); }, [fetchNote]);

  async function toggleWishlist() {
    if (!note) return;
    setWishlistLoading(true);
    try {
      const method = wishlisted ? "DELETE" : "POST";
      const res = await fetch("/api/wishlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: note._id, itemType: note.type, campus: note.campus }),
      });
      if (res.ok) {
        setWishlisted(!wishlisted);
        toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist ❤️");
      } else toast.error("Failed to update wishlist");
    } catch { toast.error("Something went wrong"); }
    finally { setWishlistLoading(false); }
  }

  async function handleBuy() {
    if (!note) return;
    setBuyLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: note._id, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Order failed"); return; }
      toast.success("Notes purchased! Check your orders. 🎉");
      setBuyModal(false);
      router.push("/customer/orders");
    } catch { toast.error("Something went wrong"); }
    finally { setBuyLoading(false); }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="card p-8 animate-pulse space-y-4">
          {[70, 50, 100, 40].map((w, i) => (
            <div key={i} className="h-5 rounded-xl" style={{ background: "var(--surface-2)", width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!note) return null;

  const cfg = note.notesConfig;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/customer/notes" className="hover:text-slate-700 transition-colors">Study Notes</Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold line-clamp-1">{note.title}</span>
      </div>

      <div className="card overflow-hidden">
        {/* Top color bar */}
        <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, var(--primary), #1a73e8)" }} />

        <div className="p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {cfg?.subject && <span className="badge badge-primary mb-2 inline-block">{cfg.subject}</span>}
              <h1 className="text-2xl font-black text-slate-900 leading-tight mb-1">{note.title}</h1>
              {note.sellerId && (
                <p className="text-sm text-slate-500">
                  Shared by <span className="font-semibold text-slate-700">{note.sellerId.name}</span>
                  <span className="mx-2">·</span>
                  <span className="text-slate-400">{note.campus}</span>
                </p>
              )}
            </div>
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0"
              style={{
                background: wishlisted ? "#fef2f2" : "white",
                borderColor: wishlisted ? "#fca5a5" : "var(--border)",
                color: wishlisted ? "#ef4444" : "#94a3b8",
              }}
            >
              <span className="material-symbols-outlined text-xl">
                {wishlisted ? "favorite" : "favorite_border"}
              </span>
            </button>
          </div>

          {/* Meta info chips */}
          <div className="flex flex-wrap gap-3">
            {cfg?.semester && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "#edf4ff", color: "#1a73e8" }}>
                <span className="material-symbols-outlined text-sm">school</span>
                Sem {cfg.semester}
              </div>
            )}
            {cfg?.year && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "#eff6ff", color: "#2563eb" }}>
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                {cfg.year}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <span className="material-symbols-outlined text-sm">location_city</span>
              {note.campus}
            </div>
            {cfg?.previewPages && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "#fffbeb", color: "#d97706" }}>
                <span className="material-symbols-outlined text-sm">description</span>
                {cfg.previewPages} preview pages
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">About these notes</p>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{note.description}</p>
          </div>

          {/* Preview images */}
          {note.mediaUrls?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Preview Pages</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {note.mediaUrls.slice(0, 6).map((url, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden border"
                    style={{ borderColor: "var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price & CTA */}
          <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Price</p>
              <span className="text-3xl font-black text-slate-900">
                {note.isFree ? <span className="text-green-600">FREE</span> : `₹${note.price}`}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all"
                style={{
                  background: wishlisted ? "#fef2f2" : "white",
                  borderColor: wishlisted ? "#fca5a5" : "var(--border)",
                  color: wishlisted ? "#ef4444" : "var(--text-2)",
                }}
              >
                {wishlisted ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => setBuyModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <span className="material-symbols-outlined">download</span>
                {note.isFree ? "Get Free" : "Buy Notes"}
              </button>
            </div>
          </div>

          {/* Safety note */}
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>verified_user</span>
            <p className="text-xs text-blue-700 leading-relaxed">
              After purchase, the seller will share the full PDF with you via your registered email or campus contact.
            </p>
          </div>
        </div>
      </div>

      {/* Purchase modal */}
      <AnimatePresence>
        {buyModal && note && (
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
              <div className="p-4 rounded-xl mb-6" style={{ background: "#edf4ff", border: "1px solid #ddd6fe" }}>
                <p className="font-bold text-slate-900">{note.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{cfg?.subject} · {note.campus}</p>
                <p className="text-xl font-black mt-2" style={{ color: "#1a73e8" }}>
                  {note.isFree ? "FREE" : `₹${note.price}`}
                </p>
              </div>
              <div className="flex justify-between items-center mb-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-slate-500">Total</span>
                <span className="text-2xl font-black text-slate-900">{note.isFree ? "FREE" : `₹${note.price}`}</span>
              </div>
              <button
                onClick={handleBuy}
                disabled={buyLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-70"
              >
                {buyLoading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>
                ) : (
                  <><span className="material-symbols-outlined">download</span>Confirm & Get Notes</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
