"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type AnalyticsData = {
  totalRevenue: number;
  totalOrders: number;
  totalListings: number;
  activeListings: number;
  viewsTotal: number;
  topListings: { title: string; views: number; orders: number; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
};

function StatCard({ label, value, icon, color, bg, delay }: { label: string; value: string | number; icon: string; color: string; bg: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <span className="material-symbols-outlined text-xl" style={{ color }}>{icon}</span>
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </motion.div>
  );
}

export default function SellerAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/seller/analytics");
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Unable to load analytics");
        }
        setData(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load analytics";
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded animate-pulse" style={{ background: "#f1f5f9" }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-28 animate-pulse" />)}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="card p-10 text-center">
        <span className="material-symbols-outlined text-5xl text-red-300 block mb-3">error</span>
        <p className="text-slate-900 font-bold mb-1">Unable to load analytics</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.revenue), 1);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your store performance overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${Math.round(data.totalRevenue).toLocaleString("en-IN")}`} icon="payments" color="#16a34a" bg="#f0fdf4" delay={0} />
        <StatCard label="Total Orders" value={data.totalOrders} icon="receipt_long" color="#2563eb" bg="#eff6ff" delay={0.06} />
        <StatCard label="Listings" value={`${data.activeListings}/${data.totalListings}`} icon="inventory_2" color="#1a73e8" bg="#edf4ff" delay={0.12} />
        <StatCard label="Total Views" value={data.viewsTotal.toLocaleString()} icon="visibility" color="#d97706" bg="#fffbeb" delay={0.18} />
      </div>

      {/* Revenue chart */}
      <div className="card p-6">
        <p className="text-base font-black text-slate-900 mb-6">Monthly Revenue</p>
        <div className="flex items-end gap-3 h-40">
          {data.revenueByMonth.map((m, i) => {
            const pct = Math.max((m.revenue / maxRevenue) * 100, 4);
            return (
              <motion.div key={m.month} className="flex-1 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 180 }}
                style={{ transformOrigin: "bottom" }}>
                <span className="text-[10px] font-bold text-slate-500">₹{Math.round(m.revenue).toLocaleString("en-IN")}</span>
                <div className="w-full rounded-t-lg transition-all" style={{
                  height: `${pct}%`, background: i === data.revenueByMonth.length - 1 ? "var(--primary)" : "#dbeafe",
                }} />
                <span className="text-xs text-slate-400 font-medium">{m.month}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Top listings */}
      <div className="card p-6">
        <p className="text-base font-black text-slate-900 mb-4">Top Listings</p>
        {data.topListings.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#f8fafc" }}>
            <p className="text-slate-700 font-semibold">No order history yet</p>
            <p className="text-slate-400 text-xs mt-1">Top-selling listings will appear once customers place orders.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.topListings.map((l, i) => (
              <motion.div key={`${l.title}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "#f8fafc" }}>
                <span className="text-slate-400 font-black text-sm w-5 text-center">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-bold text-sm truncate">{l.title}</p>
                  <p className="text-slate-400 text-xs">{l.orders} orders</p>
                </div>
                <p className="text-slate-900 font-black text-sm shrink-0">₹{Math.round(l.revenue).toLocaleString("en-IN")}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
