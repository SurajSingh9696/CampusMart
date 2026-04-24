"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { startListingCheckout } from "@/lib/client-checkout";

type Project = {
  _id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  isAuction: boolean;
  auctionStartPrice: number;
  mediaUrls: string[];
  campus: string;
  type: string;
  status: string;
  tags?: string[];
  projectConfig?: {
    targetYear?: string;
    branch?: string;
    semester?: string;
    zipUrl?: string;
    deployedPreviewUrl?: string;
    oneBuyerOnly?: boolean;
  };
  sellerId?: { _id: string; name: string; campus: string };
  createdAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [buyModal, setBuyModal] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) { router.replace("/customer/projects"); return; }
      const data = await res.json();
      setProject(data.listing);
    } catch {
      toast.error("Failed to load project");
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

  useEffect(() => { fetchProject(); }, [fetchProject]);

  async function toggleWishlist() {
    if (!project) return;
    setWishlistLoading(true);
    try {
      const method = wishlisted ? "DELETE" : "POST";
      const res = await fetch("/api/wishlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: project._id, itemType: project.type, campus: project.campus }),
      });
      if (res.ok) {
        setWishlisted(!wishlisted);
        toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist ❤️");
      } else toast.error("Failed to update wishlist");
    } catch { toast.error("Something went wrong"); }
    finally { setWishlistLoading(false); }
  }

  async function handleBuy() {
    if (!project) return;
    setBuyLoading(true);
    try {
      const result = await startListingCheckout({
        listingId: project._id,
        quantity: 1,
        itemType: project.type as "product" | "project" | "notes" | "event",
      });

      toast.success(
        result.provider === "fallback"
          ? "Project order created"
          : "Payment successful. Project order created"
      );
      setBuyModal(false);
      router.push("/customer/orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete checkout";
      toast.error(message);
    }
    finally { setBuyLoading(false); }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card p-8 animate-pulse space-y-4">
          {[70, 50, 100, 40].map((w, i) => (
            <div key={i} className="h-5 rounded-xl" style={{ background: "var(--surface-2)", width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!project) return null;

  const cfg = project.projectConfig;
  const images = project.mediaUrls || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/customer/projects" className="hover:text-slate-700 transition-colors">Projects</Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold line-clamp-1">{project.title}</span>
      </div>

      {/* Hero banner */}
      <div className="card overflow-hidden">
        {/* Banner image or gradient */}
        <div className="relative h-56 sm:h-72 flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, #eff6ff, #edf4ff)" }}>
          {images.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={imgIdx}
                src={images[imgIdx]}
                alt={project.title}
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
          ) : (
            <span className="material-symbols-outlined text-8xl" style={{ color: "#1a73e8", opacity: 0.4 }}>terminal</span>
          )}
          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.9)", border: "1px solid var(--border)", color: "#334155" }}>
              {project.campus}
            </span>
            {project.isAuction && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                style={{ background: "#1a73e8", color: "white" }}>
                Auction
              </span>
            )}
          </div>
          {/* Wishlist */}
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
            <span className="material-symbols-outlined text-xl">{wishlisted ? "favorite" : "favorite_border"}</span>
          </button>
          {/* Image nav */}
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                disabled={imgIdx === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center disabled:opacity-30">
                <span className="material-symbols-outlined text-sm text-slate-700">chevron_left</span>
              </button>
              <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))}
                disabled={imgIdx === images.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center disabled:opacity-30">
                <span className="material-symbols-outlined text-sm text-slate-700">chevron_right</span>
              </button>
            </>
          )}
        </div>

        <div className="p-7 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">{project.title}</h1>
            {project.sellerId && (
              <p className="text-sm text-slate-500">
                By <span className="font-semibold text-slate-700">{project.sellerId.name}</span>
                <span className="mx-2">·</span>
                {project.campus}
              </p>
            )}
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-3">
            {cfg?.branch && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "#edf4ff", color: "#1a73e8" }}>
                <span className="material-symbols-outlined text-sm">schema</span>
                {cfg.branch}
              </div>
            )}
            {cfg?.targetYear && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "#eff6ff", color: "#2563eb" }}>
                <span className="material-symbols-outlined text-sm">school</span>
                {cfg.targetYear}
              </div>
            )}
            {cfg?.oneBuyerOnly && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "#fef2f2", color: "#dc2626" }}>
                <span className="material-symbols-outlined text-sm">person</span>
                Exclusive (1 buyer)
              </div>
            )}
            {cfg?.deployedPreviewUrl && (
              <a href={cfg.deployedPreviewUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Live Preview
              </a>
            )}
          </div>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {project.tags.map(tag => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">About this project</p>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{project.description}</p>
          </div>

          {/* What you get */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: "code", label: "Source Code", desc: cfg?.zipUrl ? "ZIP download included" : "Available after purchase" },
              { icon: "description", label: "Documentation", desc: "README and usage guide" },
              { icon: "support_agent", label: "Seller Support", desc: "Direct contact with creator" },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl text-center"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span className="material-symbols-outlined text-2xl mb-1 block" style={{ color: "#1a73e8" }}>{item.icon}</span>
                <p className="text-sm font-bold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Price & CTA */}
          <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                {project.isAuction ? "Starting Bid" : "Price"}
              </p>
              <span className="text-3xl font-black text-slate-900">
                {project.isFree ? (
                  <span className="text-green-600">FREE</span>
                ) : project.isAuction ? (
                  `₹${project.auctionStartPrice}`
                ) : (
                  `₹${project.price}`
                )}
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
                <span className="material-symbols-outlined">shopping_cart_checkout</span>
                {project.isAuction ? "Place Bid" : project.isFree ? "Get Free" : "Buy Project"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Buy modal */}
      <AnimatePresence>
        {buyModal && project && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && setBuyModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
              style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900">Confirm Purchase</h3>
                <button onClick={() => setBuyModal(false)}><span className="material-symbols-outlined text-slate-400">close</span></button>
              </div>
              <div className="p-4 rounded-xl mb-6" style={{ background: "#edf4ff", border: "1px solid #ddd6fe" }}>
                <p className="font-bold text-slate-900">{project.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{cfg?.branch} · {project.campus}</p>
                <p className="text-xl font-black mt-2" style={{ color: "#1a73e8" }}>
                  {project.isFree ? "FREE" : `₹${project.price}`}
                </p>
              </div>
              <div className="flex justify-between items-center mb-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-slate-500">Total</span>
                <span className="text-2xl font-black text-slate-900">{project.isFree ? "FREE" : `₹${project.price}`}</span>
              </div>
              <button
                onClick={handleBuy} disabled={buyLoading}
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
