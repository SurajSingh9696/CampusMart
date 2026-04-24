"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Order = {
  _id: string;
  listingId: { title: string; type: string; mediaUrls?: string[] };
  customerId: { name: string; email: string };
  amount: number;
  sellerAmount?: number;
  payoutDueAmount?: number;
  status: string;
  cancelReason?: string;
  buyerAccountNumber?: string;
  buyerIdCardNumber?: string;
  buyerIdCardImageUrl?: string;
  createdAt: string;
};

const STATUS_META: Record<string, { label: string; text: string; bg: string; border: string }> = {
  pending_seller_action: {
    label: "Awaiting Seller",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  ready_to_fulfill: {
    label: "Ready To Fulfill",
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  fulfilled_by_seller: {
    label: "Awaiting Customer",
    text: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  ready_for_payment: {
    label: "Ready For Payout",
    text: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  payout_completed: {
    label: "Payout Completed",
    text: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

function statusMeta(status: string) {
  return (
    STATUS_META[status] || {
      label: status,
      text: "text-slate-700",
      bg: "bg-slate-100",
      border: "border-slate-200",
    }
  );
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/orders/seller", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          toast.error(data?.error || "Failed to load orders");
          setOrders([]);
          return;
        }
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  async function runAction(orderId: string, action: "seller_accept" | "seller_mark_fulfilled" | "seller_cancel", reason?: string) {
    if (actionLoadingId) return;

    setActionLoadingId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data?.error || "Update failed");
        return;
      }

      const updated = data?.order as Order | undefined;
      if (updated?._id) {
        setOrders((current) => current.map((order) => (order._id === updated._id ? { ...order, ...updated } : order)));
      }

      if (action === "seller_accept") toast.success("Order accepted");
      if (action === "seller_mark_fulfilled") toast.success("Order marked fulfilled");
      if (action === "seller_cancel") toast.success("Order cancelled");
    } catch {
      toast.error("Update failed");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filtered = (filter === "all" ? orders : orders.filter((o) => o.status === filter))
    .filter((order) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        order.listingId?.title?.toLowerCase().includes(term) ||
        order.customerId?.name?.toLowerCase().includes(term) ||
        order.customerId?.email?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "amount_desc") return b.amount - a.amount;
      if (sort === "amount_asc") return a.amount - b.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const awaitingSeller = orders.filter((order) => order.status === "pending_seller_action").length;
  const readyToFulfill = orders.filter((order) => order.status === "ready_to_fulfill").length;
  const payoutReady = orders.filter((order) => order.status === "ready_for_payment").length;
  const settledRevenue = orders
    .filter((order) => order.status === "payout_completed")
    .reduce((sum, order) => sum + (order.sellerAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Incoming Orders</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage customer verification, fulfillment, and payout readiness</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Awaiting Seller", value: awaitingSeller, color: "#d97706", bg: "#fffbeb", icon: "hourglass_empty" },
          { label: "Ready To Fulfill", value: readyToFulfill, color: "#2563eb", bg: "#eff6ff", icon: "package_2" },
          { label: "Payout Ready", value: payoutReady, color: "#0f766e", bg: "#ecfeff", icon: "account_balance_wallet" },
          { label: "Settled Earnings", value: `₹${settledRevenue.toFixed(0)}`, color: "#16a34a", bg: "#f0fdf4", icon: "payments" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-4 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: s.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="input-icon-wrap flex-1">
            <span className="icon-left material-symbols-outlined">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item or customer"
              className="input-dark"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort seller orders"
            className="input-dark w-full sm:w-auto"
            style={{ minWidth: "190px" }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount_desc">Amount high to low</option>
            <option value="amount_asc">Amount low to high</option>
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all", "pending_seller_action", "ready_to_fulfill", "fulfilled_by_seller", "ready_for_payment", "payout_completed", "cancelled"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={{ background: filter === s ? "var(--primary)" : "white", color: filter === s ? "white" : "var(--text-2)", border: `1px solid ${filter === s ? "var(--primary)" : "var(--border)"}` }}>
              {s.replace(/_/g, " ")} {s === "pending_seller_action" && awaitingSeller > 0 && `(${awaitingSeller})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">receipt_long</span>
          <p className="text-slate-700 font-bold">No {filter === "all" ? "" : filter.replace(/_/g, " ")} orders</p>
          <p className="text-slate-400 text-sm mt-1">Orders from customers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => (
            <motion.div key={order._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-5 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-bold break-words">{order.listingId?.title || "Item"}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {order.customerId?.name} · {order.customerId?.email} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
                  </p>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <p className="text-slate-400 uppercase tracking-wider">Buyer Account</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{order.buyerAccountNumber || "Not provided"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <p className="text-slate-400 uppercase tracking-wider">Buyer ID Card No.</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{order.buyerIdCardNumber || "Not provided"}</p>
                    </div>
                  </div>

                  {order.buyerIdCardImageUrl ? (
                    <a
                      href={order.buyerIdCardImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex mt-2 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      <span className="material-symbols-outlined text-sm">badge</span>
                      View Buyer ID Card Photo
                    </a>
                  ) : null}

                  {order.cancelReason ? (
                    <p className="mt-2 text-xs text-red-600">Cancellation reason: {order.cancelReason}</p>
                  ) : null}
                </div>

                <div className="md:text-right shrink-0">
                  <p className="font-black text-slate-900">₹{Math.round(order.amount).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-slate-500">Your payout: ₹{Math.round(order.sellerAmount || 0).toLocaleString("en-IN")}</p>
                  <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta(order.status).bg} ${statusMeta(order.status).text} ${statusMeta(order.status).border}`}>
                    {statusMeta(order.status).label}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {order.status === "pending_seller_action" ? (
                  <>
                    <button
                      onClick={() => void runAction(order._id, "seller_accept")}
                      disabled={actionLoadingId === order._id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors border border-blue-200 disabled:opacity-50"
                    >
                      Accept Order
                    </button>
                    <button
                      onClick={() => setCancelDialog({ id: order._id, reason: "" })}
                      disabled={actionLoadingId === order._id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-700 hover:bg-red-50 transition-colors border border-red-200 disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  </>
                ) : null}

                {order.status === "ready_to_fulfill" ? (
                  <>
                    <button
                      onClick={() => void runAction(order._id, "seller_mark_fulfilled")}
                      disabled={actionLoadingId === order._id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-green-700 hover:bg-green-50 transition-colors border border-green-200 disabled:opacity-50"
                    >
                      Mark Fulfilled
                    </button>
                    <button
                      onClick={() => setCancelDialog({ id: order._id, reason: "" })}
                      disabled={actionLoadingId === order._id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-700 hover:bg-red-50 transition-colors border border-red-200 disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  </>
                ) : null}

                {order.status === "ready_for_payment" ? (
                  <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 font-semibold">
                    Waiting for admin payout. Due: ₹{Math.round(order.payoutDueAmount || order.sellerAmount || 0).toLocaleString("en-IN")}
                  </span>
                ) : null}

                {order.status === "fulfilled_by_seller" ? (
                  <span className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5 font-semibold">
                    Waiting for customer confirmation.
                  </span>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {cancelDialog ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
            onClick={(event) => {
              if (event.target === event.currentTarget && !actionLoadingId) {
                setCancelDialog(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <h3 className="text-base font-black text-slate-900">Cancel Order</h3>
              <p className="text-sm text-slate-500 mt-1">Reason is required and visible to the customer.</p>

              <textarea
                rows={4}
                value={cancelDialog.reason}
                onChange={(event) => setCancelDialog((current) => (current ? { ...current, reason: event.target.value } : current))}
                placeholder="Write cancellation reason"
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-red-400"
              />
              <p className="mt-1 text-xs text-slate-400">Minimum 6 characters</p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setCancelDialog(null)}
                  disabled={Boolean(actionLoadingId)}
                  className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    if (!cancelDialog) return;
                    await runAction(cancelDialog.id, "seller_cancel", cancelDialog.reason.trim());
                    setCancelDialog(null);
                  }}
                  disabled={Boolean(actionLoadingId) || cancelDialog.reason.trim().length < 6}
                  className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Confirm Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
