"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Listing = {
  _id: string; title: string; description: string; price: number; isFree: boolean;
  mediaUrls: string[]; campus: string; eventConfig?: { eventDate?: string; ticketLimit?: number };
  status: string;
};

function Countdown({ target }: { target: string }) {
  const end = new Date(target).getTime();
  const [diff, setDiff] = useState(end - Date.now());
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setDiff(end - Date.now()), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [end]);
  if (diff <= 0) return <span className="badge badge-danger">Event Ended</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex gap-2 text-xs font-black text-slate-900">
      {d > 0 && <><span>{d}d</span><span style={{ color: "var(--primary)" }}>:</span></>}
      <span>{String(h).padStart(2, "0")}h</span>
      <span style={{ color: "var(--primary)" }}>:</span>
      <span>{String(m).padStart(2, "0")}m</span>
      <span style={{ color: "var(--primary)" }}>:</span>
      <span>{String(s).padStart(2, "0")}s</span>
    </div>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [qty, setQty] = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    fetch("/api/listings?type=event")
      .then(r => r.json())
      .then(d => { setEvents(d.listings || []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Live Now</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Campus Events</h1>
          <p className="text-slate-500 text-sm mt-1">Discover happenings across all colleges</p>
        </div>
        <div className="flex gap-2">
          <div className="flex p-1 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            {["Upcoming", "Past"].map((tab, i) => (
              <button key={tab} className="px-5 py-2 text-sm font-bold rounded-lg transition-all"
                style={{ background: i === 0 ? "var(--primary)" : "transparent", color: i === 0 ? "white" : "var(--muted)" }}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse overflow-hidden">
              <div className="aspect-[16/9]" style={{ background: "#f1f5f9" }} />
              <div className="p-6 space-y-3">
                <div className="w-24 h-5 rounded" style={{ background: "#e2e8f0" }} />
                <div className="w-3/4 h-6 rounded" style={{ background: "#e2e8f0" }} />
                <div className="w-full h-3 rounded" style={{ background: "#e2e8f0" }} />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">local_activity</span>
          <h3 className="text-slate-800 font-bold text-lg mb-2">No upcoming events</h3>
          <p className="text-slate-500 text-sm">Check back soon for campus events and workshops.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, i) => (
            <motion.div key={event._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="card group flex flex-col overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden" style={{ background: "#f1f5f9" }}>
                {event.mediaUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.mediaUrls[0]} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-slate-300">local_activity</span>
                  </div>
                )}
                {/* Date badge */}
                {event.eventConfig?.eventDate && (
                  <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                      {new Date(event.eventConfig.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                )}
                {/* Countdown overlay */}
                {event.eventConfig?.eventDate && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-sm"
                    style={{ border: "1px solid var(--border)" }}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Starts in</span>
                    <Countdown target={event.eventConfig.eventDate} />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-success">Event</span>
                  <span className="text-xs text-slate-400 font-medium">{event.campus}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight line-clamp-2">{event.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 flex-1">{event.description}</p>
                <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tickets from</p>
                    <p className="text-xl font-black text-slate-900">
                      {event.isFree ? <span className="text-green-600 text-base">FREE</span> : `₹${event.price}`}
                    </p>
                  </div>
                  <button onClick={() => { setSelected(event); setQty(1); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "var(--primary)", color: "white", boxShadow: "0 4px 15px var(--primary-glow)" }}>
                    Book Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ticket Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-2xl p-8 relative overflow-hidden bg-white shadow-2xl"
              style={{ border: "1px solid var(--border)" }}>
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>

              <h3 className="text-xl font-bold text-slate-900 mb-1">Select Tickets</h3>
              <p className="text-slate-500 text-sm mb-6">{selected.title} · {selected.campus}</p>

              {/* Ticket Type */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#f8fafc", border: "1px solid var(--border)" }}>
                  <div>
                    <p className="font-bold text-slate-900">Student Entry</p>
                    <p className="text-xs text-slate-400">Valid College ID required</p>
                    <p className="text-base font-black mt-1" style={{ color: "var(--primary)" }}>
                      {selected.isFree ? "FREE" : `₹${selected.price}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "white", border: "1px solid var(--border)", color: "var(--text)" }}>
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="font-bold text-slate-900 text-lg w-5 text-center">{qty}</span>
                    <button onClick={() => setQty(q => q + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "var(--primary)" }}>
                      <span className="material-symbols-outlined text-sm text-white">add</span>
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex gap-3 p-3 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>info</span>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    You&apos;ll need to show your digital student ID at the venue entrance.
                  </p>
                </div>
              </div>

              {/* Total + Checkout */}
              <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center mb-5">
                  <span className="text-slate-500 font-medium">Total</span>
                  <span className="text-2xl font-black text-slate-900">
                    {selected.isFree ? "FREE" : `₹${selected.price * qty}`}
                  </span>
                </div>
                <button
                  disabled={buyLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ padding: "1rem" }}
                  onClick={async () => {
                    setBuyLoading(true);
                    try {
                      const res = await fetch("/api/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ listingId: selected._id, quantity: qty }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        toast.error(data.error || "Booking failed");
                        return;
                      }
                      toast.success("Event booked successfully! 🎉");
                      setSelected(null);
                      router.push("/customer/orders");
                    } catch {
                      toast.error("Something went wrong");
                    } finally {
                      setBuyLoading(false);
                    }
                  }}
                >
                  {buyLoading ? (
                    <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>
                  ) : (
                    <><span className="material-symbols-outlined">shopping_cart_checkout</span>Complete Booking</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
