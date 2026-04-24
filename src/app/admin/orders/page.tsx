"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Order = {
  _id: string;
  listingId: { title?: string; type?: string };
  customerId: { name?: string; email?: string };
  sellerId: { name?: string; email?: string };
  amount: number;
  sellerAmount?: number;
  platformFeeAmount?: number;
  payoutDueAmount?: number;
  sellerPayoutUpi?: string;
  status: string;
  cancelReason?: string;
  payoutReference?: string;
  createdAt: string;
};

type OrdersResponse = {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "payout_due", label: "Payout Due" },
  { value: "pending_seller_action", label: "Awaiting Seller" },
  { value: "ready_to_fulfill", label: "Ready To Fulfill" },
  { value: "fulfilled_by_seller", label: "Awaiting Buyer Confirm" },
  { value: "ready_for_payment", label: "Ready For Payout" },
  { value: "payout_completed", label: "Payout Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending_seller_action: { label: "Awaiting Seller", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ready_to_fulfill: { label: "Ready To Fulfill", className: "bg-blue-50 text-blue-700 border-blue-200" },
  fulfilled_by_seller: { label: "Awaiting Buyer Confirm", className: "bg-violet-50 text-violet-700 border-violet-200" },
  ready_for_payment: { label: "Ready For Payout", className: "bg-teal-50 text-teal-700 border-teal-200" },
  payout_completed: { label: "Payout Completed", className: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  created: { label: "Payment Pending", className: "bg-slate-100 text-slate-700 border-slate-300" },
};

function getStatusMeta(status: string) {
  return STATUS_META[status] || {
    label: status.replace(/_/g, " "),
    className: "bg-slate-100 text-slate-700 border-slate-300",
  };
}

function money(value: number | undefined) {
  return `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const PER_PAGE = 20;

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/orders?status=${filter}&page=${page}`, { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as Partial<OrdersResponse> & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load orders");
        }

        if (!cancelled) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          setTotal(typeof data.total === "number" ? data.total : 0);
        }
      } catch (error) {
        if (!cancelled) {
          setOrders([]);
          setTotal(0);
          toast.error(error instanceof Error ? error.message : "Failed to load orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [filter, page]);

  async function markPayoutCompleted(order: Order) {
    if (actionLoadingId) return;

    setActionLoadingId(order._id);
    try {
      const response = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_mark_payout_completed",
          payoutReference: (payoutRefs[order._id] || "").trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "Unable to complete payout");
        return;
      }

      const updated = data?.order as Order | undefined;
      if (updated?._id) {
        setOrders((current) => current.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
      }
      toast.success("Payout marked completed");
    } catch {
      toast.error("Unable to complete payout");
    } finally {
      setActionLoadingId(null);
    }
  }

  const payoutDueCount = orders.filter((order) => order.status === "ready_for_payment").length;
  const payoutDueAmount = orders.reduce(
    (sum, order) => sum + (order.status === "ready_for_payment" ? order.payoutDueAmount || order.sellerAmount || 0 : 0),
    0
  );
  const platformFeeTotal = orders.reduce((sum, order) => sum + (order.platformFeeAmount || 0), 0);
  const grossCollection = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Platform Orders</h1>
        <p className="text-slate-500 text-sm mt-0.5">All transactions, fulfillment states, and seller payout operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Page Orders", value: orders.length, icon: "receipt_long", color: "#2563eb", bg: "#eff6ff" },
          { label: "Payout Due", value: payoutDueCount, icon: "account_balance_wallet", color: "#0f766e", bg: "#ecfeff" },
          { label: "Payout Amount", value: money(payoutDueAmount), icon: "currency_rupee", color: "#0891b2", bg: "#ecfeff" },
          { label: "Platform Fee", value: money(platformFeeTotal), icon: "trending_up", color: "#1a73e8", bg: "#edf4ff" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <span className="material-symbols-outlined text-lg" style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-xs font-bold text-slate-500">{s.label}</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Gross Collection (Current Page)</p>
        <p className="text-xl font-black text-slate-900 mt-1">{money(grossCollection)}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((item) => (
          <button key={item.value} onClick={() => { setFilter(item.value); setPage(1); }}
            className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
            style={{ background: filter === item.value ? "var(--primary)" : "white", color: filter === item.value ? "white" : "var(--text-2)", border: `1px solid ${filter === item.value ? "var(--primary)" : "var(--border)"}` }}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">receipt_long</span>
          <p className="text-slate-700 font-bold">No orders found</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Seller</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amounts</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Payout UPI</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order, i) => (
                  <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-900 font-semibold truncate max-w-[180px]">{order.listingId?.title || "Item"}</td>
                    <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{order.customerId?.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{order.sellerId?.name || "—"}</td>
                    <td className="px-5 py-3">
                      <p className="text-slate-900 font-bold">Buyer: {money(order.amount)}</p>
                      <p className="text-xs text-slate-500">Seller: {money(order.sellerAmount)}</p>
                      <p className="text-xs text-slate-500">Fee: {money(order.platformFeeAmount)}</p>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-slate-600">
                      {order.sellerPayoutUpi || "Not configured"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge text-[10px] border ${getStatusMeta(order.status).className}`}>
                        {getStatusMeta(order.status).label}
                      </span>
                      {order.cancelReason ? <p className="text-[11px] text-red-600 mt-1 line-clamp-2">{order.cancelReason}</p> : null}
                    </td>

                    <td className="px-5 py-3">
                      {order.status === "ready_for_payment" ? (
                        <div className="space-y-2 min-w-[180px]">
                          <input
                            value={payoutRefs[order._id] || ""}
                            onChange={(event) =>
                              setPayoutRefs((current) => ({ ...current, [order._id]: event.target.value }))
                            }
                            placeholder="Payout reference (optional)"
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          />
                          <button
                            onClick={() => void markPayoutCompleted(order)}
                            disabled={actionLoadingId === order._id}
                            className="w-full rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {actionLoadingId === order._id ? "Processing..." : "Mark Payout Completed"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">Showing {orders.length} of {total} orders</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                ← Prev
              </button>
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100">
                Page {page}
              </span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * PER_PAGE >= total}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
