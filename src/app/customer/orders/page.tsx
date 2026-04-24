"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

type Order = {
  _id: string;
  listingId: { _id?: string; title: string; mediaUrls?: string[]; type: string; campus?: string };
  sellerId: { name: string; email?: string };
  amount: number;
  sellerAmount?: number;
  platformFeeAmount?: number;
  quantity?: number;
  status: string;
  paymentStatus?: string;
  cancelReason?: string;
  createdAt: string;
};

const STATUS_META: Record<string, { label: string; badgeClass: string; countClass: string }> = {
  created: {
    label: "Payment Pending",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    countClass: "bg-slate-100 text-slate-700",
  },
  pending_seller_action: {
    label: "Awaiting Seller",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    countClass: "bg-amber-50 text-amber-700",
  },
  ready_to_fulfill: {
    label: "Ready To Fulfill",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    countClass: "bg-blue-50 text-blue-700",
  },
  fulfilled_by_seller: {
    label: "Awaiting Your Confirmation",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    countClass: "bg-violet-50 text-violet-700",
  },
  ready_for_payment: {
    label: "Seller Payout Pending",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    countClass: "bg-teal-50 text-teal-700",
  },
  payout_completed: {
    label: "Completed",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    countClass: "bg-green-50 text-green-700",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    countClass: "bg-red-50 text-red-700",
  },
};

const ORDER_STATUS_FILTERS = [
  "all",
  "pending_seller_action",
  "ready_to_fulfill",
  "fulfilled_by_seller",
  "ready_for_payment",
  "payout_completed",
  "cancelled",
] as const;
type OrderFilter = (typeof ORDER_STATUS_FILTERS)[number];

const TYPE_ICON: Record<string, string> = {
  event: "local_activity",
  notes: "menu_book",
  project: "terminal",
  product: "shopping_bag",
};

function formatAmount(amount: number) {
  if (amount === 0) return "Free";
  return `INR ${Math.round(amount).toLocaleString("en-IN")}`;
}

function getDetailHref(order: Order) {
  const id = order.listingId?._id;
  if (!id) return "/customer/products";
  const type = order.listingId?.type;
  if (type === "notes") return `/customer/notes/${id}`;
  if (type === "project") return `/customer/projects/${id}`;
  if (type === "event") return "/customer/events";
  return `/customer/products/${id}`;
}

function canCustomerCancel(status: string) {
  return ["pending_seller_action", "ready_to_fulfill", "fulfilled_by_seller"].includes(status);
}

function canCustomerConfirmFulfilled(status: string) {
  return status === "fulfilled_by_seller";
}

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] || {
      label: status.replace(/_/g, " "),
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      countClass: "bg-slate-100 text-slate-700",
    }
  );
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/orders/my", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          toast.error(data?.error || "Failed to load orders");
          setOrders([]);
          return;
        }

        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch {
        toast.error("Failed to load orders");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  useEffect(() => {
    if (!selected) {
      setCancelReasonDraft("");
      return;
    }
    setCancelReasonDraft(selected.cancelReason || "");
  }, [selected?._id, selected?.cancelReason]);

  const filtered = useMemo(() => {
    return (filter === "all" ? orders : orders.filter((order) => order.status === filter))
      .filter((order) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return (
          order.listingId?.title?.toLowerCase().includes(term) ||
          order.sellerId?.name?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sort === "amount_desc") return b.amount - a.amount;
        if (sort === "amount_asc") return a.amount - b.amount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [filter, orders, search, sort]);

  const statusCounts = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const selectedStatusMeta = selected ? getStatusMeta(selected.status) : null;

  function applyOrderUpdate(updated: Order) {
    setOrders((current) =>
      current.map((order) =>
        order._id === updated._id
          ? {
              ...order,
              ...updated,
              listingId: (updated.listingId || order.listingId) as Order["listingId"],
              sellerId: (updated.sellerId || order.sellerId) as Order["sellerId"],
            }
          : order
      )
    );

    setSelected((current) => {
      if (!current || current._id !== updated._id) return current;
      return {
        ...current,
        ...updated,
        listingId: (updated.listingId || current.listingId) as Order["listingId"],
        sellerId: (updated.sellerId || current.sellerId) as Order["sellerId"],
      };
    });
  }

  async function runCustomerAction(order: Order, action: "customer_cancel" | "customer_confirm_fulfilled", reason?: string) {
    if (actionLoadingId) return;
    setActionLoadingId(order._id);

    try {
      const response = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data?.error || "Unable to update order");
        return;
      }

      if (data?.order && typeof data.order === "object") {
        applyOrderUpdate(data.order as Order);
      }

      if (action === "customer_cancel") {
        toast.success("Order cancelled successfully");
      } else {
        toast.success("Fulfillment confirmed. Seller payout is now pending admin completion.");
      }
    } catch {
      toast.error("Unable to update order");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your purchases and bookings ({orders.length} total)</p>
        </div>
        <Link href="/customer/products" className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
          <span className="material-symbols-outlined text-xl">add_shopping_cart</span> Shop More
        </Link>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="input-icon-wrap flex-1">
            <span className="icon-left material-symbols-outlined">search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by item or seller"
              className="input-dark"
            />
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort orders"
            className="input-dark w-full sm:w-auto sm:min-w-[180px]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount_desc">Amount high to low</option>
            <option value="amount_asc">Amount low to high</option>
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {ORDER_STATUS_FILTERS.map((status) => {
            const meta = status === "all" ? null : getStatusMeta(status);
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  filter === status
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {status === "all" ? "All" : meta?.label}
                {status !== "all" && statusCounts[status] ? (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      filter === status ? "bg-white/25 text-white" : meta?.countClass
                    }`}
                  >
                    {statusCounts[status]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="card p-5 animate-pulse flex gap-4">
              <div className="w-16 h-16 rounded-xl shrink-0 bg-slate-100" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-1/3 rounded bg-slate-100" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">inventory_2</span>
          <p className="text-slate-700 font-bold mb-1">No {filter === "all" ? "" : getStatusMeta(filter).label} orders yet</p>
          <p className="text-slate-400 text-sm mb-5">Start browsing the marketplace to place your first order.</p>
          <Link href="/customer/products" className="btn-primary inline-flex items-center justify-center px-6 py-2.5">Browse Products</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, index) => {
            const statusMeta = getStatusMeta(order.status);
            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(order)}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden bg-slate-100 border border-slate-200">
                    {order.listingId?.mediaUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={order.listingId.mediaUrls[0]} alt={order.listingId.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-slate-400">
                          {TYPE_ICON[order.listingId?.type] || "shopping_bag"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-slate-900 font-bold break-words line-clamp-2">{order.listingId?.title || "Item"}</p>
                        <p className="text-slate-400 text-xs mt-0.5 break-words">
                          Sold by {order.sellerId?.name || "Seller"}
                          {order.listingId?.campus ? <span className="ml-1.5 text-slate-300">· {order.listingId.campus}</span> : null}
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <p className={`font-black ${order.amount === 0 ? "text-green-600 text-sm" : "text-slate-900"}`}>
                          {order.amount === 0 ? "FREE" : formatAmount(order.amount)}
                        </p>
                        <span className={`badge mt-1 text-[10px] border ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>

                    {order.status === "cancelled" && order.cancelReason ? (
                      <p className="mt-2 text-xs text-red-600 line-clamp-2">Reason: {order.cancelReason}</p>
                    ) : null}

                    <p className="text-[11px] text-slate-400 mt-2">
                      Ordered on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[6px] p-0 sm:p-4"
            onClick={(event) => event.target === event.currentTarget && setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] overflow-hidden"
            >
              <div className="flex items-start justify-between px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Order Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Order ID: {selected._id.slice(-8).toUpperCase()}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700" aria-label="Close order details">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[72vh] space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-[190px_minmax(0,1fr)] gap-4">
                  <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[4/3]">
                    {selected.listingId?.mediaUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selected.listingId.mediaUrls[0]} alt={selected.listingId.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-slate-400">
                          {TYPE_ICON[selected.listingId?.type] || "shopping_bag"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge text-[10px] border ${selectedStatusMeta?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {selectedStatusMeta?.label || selected.status}
                      </span>
                      <span className="badge text-[10px] border bg-slate-50 text-slate-600 border-slate-200 capitalize">
                        {selected.listingId?.type || "item"}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug break-words">
                      {selected.listingId?.title || "Item"}
                    </h4>

                    <p className="text-sm text-slate-500 break-words">
                      Sold by <span className="font-semibold text-slate-700">{selected.sellerId?.name || "Seller"}</span>
                      {selected.sellerId?.email ? <span className="text-slate-400"> ({selected.sellerId.email})</span> : null}
                    </p>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wider font-bold text-blue-600">Total Amount</p>
                      <p className={`font-black mt-0.5 ${selected.amount === 0 ? "text-green-600 text-base" : "text-slate-900 text-lg"}`}>
                        {selected.amount === 0 ? "FREE" : formatAmount(selected.amount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["Campus", selected.listingId?.campus || "Not specified"],
                    ["Quantity", String(selected.quantity || 1)],
                    ["Ordered On", new Date(selected.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })],
                    ["Order Status", selectedStatusMeta?.label || selected.status],
                    ["Payment", selected.paymentStatus || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
                      <p className="text-sm text-slate-900 font-bold mt-0.5 break-words capitalize">{value}</p>
                    </div>
                  ))}
                </div>

                {selected.status === "cancelled" && selected.cancelReason ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-red-500 font-bold">Cancellation Reason</p>
                    <p className="mt-1 text-sm text-red-700">{selected.cancelReason}</p>
                  </div>
                ) : null}

                {canCustomerConfirmFulfilled(selected.status) ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
                    <p className="text-sm text-violet-700 font-semibold">
                      Seller marked this order as fulfilled. Confirm only after receiving and verifying everything.
                    </p>
                    <button
                      onClick={() => void runCustomerAction(selected, "customer_confirm_fulfilled")}
                      disabled={actionLoadingId === selected._id}
                      className="mt-3 w-full rounded-xl border border-violet-300 bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {actionLoadingId === selected._id ? "Processing..." : "Confirm Fulfilled"}
                    </button>
                  </div>
                ) : null}

                {canCustomerCancel(selected.status) ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-amber-600 font-bold">Need To Cancel?</p>
                    <textarea
                      rows={3}
                      value={cancelReasonDraft}
                      onChange={(event) => setCancelReasonDraft(event.target.value)}
                      placeholder="Write reason for cancellation"
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => void runCustomerAction(selected, "customer_cancel", cancelReasonDraft.trim())}
                      disabled={actionLoadingId === selected._id || cancelReasonDraft.trim().length < 6}
                      className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {actionLoadingId === selected._id ? "Processing..." : "Cancel Order"}
                    </button>
                    <p className="mt-1 text-[11px] text-amber-700">Minimum 6 characters required.</p>
                  </div>
                ) : null}
              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-white">
                <Link
                  href={getDetailHref(selected)}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
                >
                  <span className="material-symbols-outlined text-xl">open_in_new</span>
                  View Listing
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
