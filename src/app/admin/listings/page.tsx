"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Listing = {
  _id: string;
  title: string;
  type: string;
  price: number;
  priceMarkupPercent?: number;
  campus?: string;
  tags?: string[];
  isFree?: boolean;
  status: string;
  sellerId: { name: string; email: string };
  mediaUrls?: string[];
  previewUrls?: string[];
  resourceUrl?: string;
  description?: string;
  approvalComment?: string;
  projectConfig?: {
    targetYear?: string;
    branch?: string;
    semester?: string;
    zipUrl?: string;
    deployedPreviewUrl?: string;
  };
  notesConfig?: {
    subject?: string;
    year?: string;
    semester?: string;
    notesPdfUrl?: string;
    previewPages?: number;
  };
  eventConfig?: {
    venue?: string;
    eventStartAt?: string;
    eventEndAt?: string;
    ticketLimit?: number;
  };
  createdAt: string;
};

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  pending_approval: { label: "Pending", badgeClass: "bg-amber-50 text-amber-700 border-amber-300" },
  live: { label: "Live", badgeClass: "bg-green-50 text-green-700 border-green-300" },
  rejected: { label: "Rejected", badgeClass: "bg-red-50 text-red-700 border-red-300" },
  sold: { label: "Sold", badgeClass: "bg-blue-50 text-blue-700 border-blue-300" },
  deactivated: { label: "Paused", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
  draft: { label: "Draft", badgeClass: "bg-slate-50 text-slate-500 border-slate-300" },
};

const FILTERS = [
  { value: "pending_approval", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

type ListingFileLink = {
  label: string;
  url: string;
};

type RejectDialogState = {
  id: string;
  title: string;
  reason: string;
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function getListingFileLinks(listing: Listing): ListingFileLink[] {
  const links: ListingFileLink[] = [];
  const candidates: Array<ListingFileLink | null> = [
    listing.resourceUrl ? { label: "Listing Resource", url: listing.resourceUrl } : null,
    listing.projectConfig?.zipUrl ? { label: "Project Source ZIP", url: listing.projectConfig.zipUrl } : null,
    listing.notesConfig?.notesPdfUrl ? { label: "Notes PDF", url: listing.notesConfig.notesPdfUrl } : null,
    listing.projectConfig?.deployedPreviewUrl ? { label: "Project Live Preview", url: listing.projectConfig.deployedPreviewUrl } : null,
  ];

  const seen = new Set<string>();
  for (const item of candidates) {
    if (!item) continue;
    if (!item.url.trim()) continue;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    links.push(item);
  }

  return links;
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("pending_approval");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Listing | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [markupLoadingId, setMarkupLoadingId] = useState<string | null>(null);
  const [markupDraft, setMarkupDraft] = useState("8");
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);

  useEffect(() => {
    if (!preview) return;
    const raw = typeof preview.priceMarkupPercent === "number" ? preview.priceMarkupPercent : 8;
    setMarkupDraft(raw.toFixed(2));
  }, [preview?._id, preview?.priceMarkupPercent]);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/listings?status=${filter}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load listings");
        }
        if (!cancelled) setListings(Array.isArray(data.listings) ? data.listings : []);
      } catch (error) {
        if (!cancelled) {
          setListings([]);
          const message = error instanceof Error ? error.message : "Failed to load listings";
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadListings();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  function openRejectDialog(listing: Listing) {
    if (actionLoadingId) return;
    setRejectDialog({
      id: listing._id,
      title: listing.title,
      reason: "",
    });
  }

  async function decide(id: string, action: "approve" | "reject", providedComment = "") {
    if (actionLoadingId) return false;

    const comment = providedComment.trim();
    if (action === "reject" && comment.length < 5) {
      toast.error("Rejection reason is required.");
      return false;
    }

    const nextStatus = action === "approve" ? "live" : "rejected";
    const previousListings = listings;

    setActionLoadingId(id);
    setListings((current) => {
      if (filter === "pending_approval") {
        return current.filter((listing) => listing._id !== id);
      }
      return current.map((listing) =>
        listing._id === id
          ? {
              ...listing,
              status: nextStatus,
              approvalComment: action === "reject" ? comment : listing.approvalComment,
              mediaUrls: action === "reject" ? [] : listing.mediaUrls,
              previewUrls: action === "reject" ? [] : listing.previewUrls,
              resourceUrl: action === "reject" ? "" : listing.resourceUrl,
              projectConfig: action === "reject"
                ? { ...(listing.projectConfig || {}), zipUrl: "" }
                : listing.projectConfig,
              notesConfig: action === "reject"
                ? { ...(listing.notesConfig || {}), notesPdfUrl: "" }
                : listing.notesConfig,
            }
          : listing
      );
    });

    if (preview?._id === id) {
      setPreview((current) => {
        if (!current) return null;
        return {
          ...current,
          status: nextStatus,
          approvalComment: action === "reject" ? comment : current.approvalComment,
          mediaUrls: action === "reject" ? [] : current.mediaUrls,
          previewUrls: action === "reject" ? [] : current.previewUrls,
          resourceUrl: action === "reject" ? "" : current.resourceUrl,
          projectConfig: action === "reject"
            ? { ...(current.projectConfig || {}), zipUrl: "" }
            : current.projectConfig,
          notesConfig: action === "reject"
            ? { ...(current.notesConfig || {}), notesPdfUrl: "" }
            : current.notesConfig,
        };
      });
    }

    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404 || res.status === 409) {
          setListings((current) => current.filter((listing) => listing._id !== id));
          if (filter === "pending_approval") setPreview(null);
          toast.error(data?.error || "Listing is no longer pending moderation");
          return true;
        }
        setListings(previousListings);
        if (preview?._id === id) setPreview(previousListings.find((listing) => listing._id === id) || null);
        toast.error(data?.error || "Action failed");
        return false;
      }

      if (data?.listing && typeof data.listing === "object") {
        const nextListing = data.listing as Listing;
        if (filter !== "pending_approval") {
          setListings((current) => current.map((listing) => (listing._id === id ? nextListing : listing)));
        }
        if (preview?._id === id && filter !== "pending_approval") {
          setPreview(nextListing);
        }
      }

      toast.success(`Listing ${action === "approve" ? "approved" : "rejected"}`);
      if (filter === "pending_approval") setPreview(null);
      return true;
    } catch {
      setListings(previousListings);
      if (preview?._id === id) setPreview(previousListings.find((listing) => listing._id === id) || null);
      toast.error("Action failed");
      return false;
    } finally {
      setActionLoadingId(null);
    }
  }

  async function submitRejectDecision() {
    if (!rejectDialog) return;
    const ok = await decide(rejectDialog.id, "reject", rejectDialog.reason);
    if (ok) setRejectDialog(null);
  }

  async function deleteListing(id: string) {
    if (deleteLoadingId) return;
    if (!window.confirm("Delete this rejected listing permanently?")) return;

    const previousListings = listings;
    setDeleteLoadingId(id);
    setListings((current) => current.filter((listing) => listing._id !== id));
    if (preview?._id === id) setPreview(null);

    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListings(previousListings);
        toast.error(data?.error || "Delete failed");
        return;
      }
      toast.success("Listing deleted");
    } catch {
      setListings(previousListings);
      toast.error("Delete failed");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  async function saveMarkupPercent(id: string) {
    if (markupLoadingId) return;

    const nextValue = Number.parseFloat(markupDraft);
    if (!Number.isFinite(nextValue) || nextValue < 5 || nextValue > 10) {
      toast.error("Markup must be between 5% and 10%.");
      return;
    }

    const rounded = Number(nextValue.toFixed(2));
    setMarkupLoadingId(id);

    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceMarkupPercent: rounded }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to update markup");
        return;
      }

      setListings((current) =>
        current.map((listing) =>
          listing._id === id ? { ...listing, priceMarkupPercent: rounded } : listing
        )
      );

      setPreview((current) =>
        current && current._id === id
          ? { ...current, priceMarkupPercent: rounded }
          : current
      );

      toast.success("Buyer markup updated");
    } catch {
      toast.error("Failed to update markup");
    } finally {
      setMarkupLoadingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return listings;

    return listings.filter((listing) => {
      return (
        listing.title.toLowerCase().includes(term) ||
        listing.type.toLowerCase().includes(term) ||
        listing.sellerId?.name?.toLowerCase().includes(term) ||
        listing.sellerId?.email?.toLowerCase().includes(term)
      );
    });
  }, [listings, search]);

  const stats = useMemo(() => {
    return {
      pending: listings.filter((listing) => listing.status === "pending_approval" || listing.status === "pending").length,
      live: listings.filter((listing) => listing.status === "live" || listing.status === "active").length,
      rejected: listings.filter((listing) => listing.status === "rejected").length,
      value: listings.reduce((sum, listing) => sum + (listing.price || 0), 0),
    };
  }, [listings]);

  const previewImages = useMemo(() => {
    if (!preview) return [];
    const merged = [...(preview.mediaUrls || []), ...(preview.previewUrls || [])];
    return [...new Set(merged.filter((url) => typeof url === "string" && url.trim().length > 0))];
  }, [preview]);

  const previewFiles = useMemo(() => {
    if (!preview) return [];
    return getListingFileLinks(preview);
  }, [preview]);

  const previewBuyerAmount = useMemo(() => {
    if (!preview) return 0;
    if (preview.isFree || preview.price <= 0) return 0;
    const markup = Number.isFinite(Number.parseFloat(markupDraft))
      ? Number.parseFloat(markupDraft)
      : typeof preview.priceMarkupPercent === "number"
        ? preview.priceMarkupPercent
        : 8;
    return Number((preview.price * (1 + markup / 100)).toFixed(2));
  }, [preview, markupDraft]);

  return (
    <div className="space-y-6">
      <div className="card p-6 md:p-7 relative overflow-hidden bg-gradient-to-br from-white to-blue-50">
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-blue-500/10" />
        <div className="relative z-10 flex flex-col gap-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Admin Moderation</p>
          <h1 className="text-2xl font-black text-slate-900">Listing Approvals</h1>
          <p className="text-slate-500 text-sm">Review seller submissions and push trusted listings live with one click.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: stats.pending, icon: "hourglass_empty", boxClass: "bg-amber-50", iconClass: "text-amber-600" },
          { label: "Live", value: stats.live, icon: "check_circle", boxClass: "bg-green-50", iconClass: "text-green-600" },
          { label: "Rejected", value: stats.rejected, icon: "cancel", boxClass: "bg-red-50", iconClass: "text-red-600" },
          { label: "Visible Value", value: `₹${Math.round(stats.value).toLocaleString("en-IN")}`, icon: "payments", boxClass: "bg-blue-50", iconClass: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${stat.boxClass}`}>
              <span className={`material-symbols-outlined text-xl ${stat.iconClass}`}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="input-icon-wrap flex-1">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, type, seller, or email..." className="input-dark" />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((status) => (
            <button key={status.value} onClick={() => setFilter(status.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                filter === status.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card p-5 h-20 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inventory_2</span>
          <p className="text-slate-700 font-bold">No listings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((listing, i) => (
            <motion.div key={listing._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-4 sm:p-5 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setPreview(listing)}>
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                  {listing.mediaUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.mediaUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-900 font-bold truncate">{listing.title}</p>
                    <span className={`badge text-[10px] shrink-0 border ${STATUS_META[listing.status]?.badgeClass || "bg-slate-50 text-slate-500 border-slate-300"}`}>
                      {STATUS_META[listing.status]?.label || listing.status}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs mt-0.5">{listing.sellerId?.name} · {listing.type} · {new Date(listing.createdAt).toLocaleDateString("en-IN")}</p>

                  {listing.description ? (
                    <p className="text-slate-500 text-xs mt-2 line-clamp-2">{listing.description}</p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <p className="text-slate-700 font-bold text-sm">{listing.isFree || listing.price === 0 ? "Free" : `₹${listing.price.toLocaleString("en-IN")}`}</p>

                    {(listing.status === "pending_approval" || listing.status === "pending") ? (
                      <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openRejectDialog(listing)}
                          disabled={actionLoadingId === listing._id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => decide(listing._id, "approve")}
                          disabled={actionLoadingId === listing._id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-green-700 border border-green-200 hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    ) : listing.status === "rejected" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteListing(listing._id);
                        }}
                        disabled={deleteLoadingId === listing._id}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[6px]"
            onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-7 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between mb-5">
                <h3 className="text-lg font-black text-slate-900">Listing Details</h3>
                <button onClick={() => setPreview(null)}><span className="material-symbols-outlined text-slate-400">close</span></button>
              </div>
              <div className="space-y-2.5 text-sm">
                {[["Title", preview.title], ["Type", preview.type], ["Price", preview.price === 0 ? "Free" : `₹${preview.price}`], ["Seller", preview.sellerId?.name], ["Email", preview.sellerId?.email], ["Campus", preview.campus || "—"], ["Created", formatDateTime(preview.createdAt)]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">{k}</span>
                    <span className="text-slate-800 font-bold capitalize">{v}</span>
                  </div>
                ))}

                <div className="pt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-700 text-xs font-semibold uppercase tracking-wider">Buyer Markup</p>
                      <p className="text-[11px] text-slate-500 mt-1">Admin controlled margin for buyer-visible price (5% to 10%).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={10}
                        step={0.25}
                        value={markupDraft}
                        onChange={(event) => setMarkupDraft(event.target.value)}
                        className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => void saveMarkupPercent(preview._id)}
                        disabled={markupLoadingId === preview._id}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-600">
                    <p>Seller Price: {preview.price === 0 ? "Free" : `₹${preview.price.toLocaleString("en-IN")}`}</p>
                    <p>Buyer Sees: {previewBuyerAmount === 0 ? "Free" : `₹${previewBuyerAmount.toLocaleString("en-IN")}`}</p>
                  </div>
                </div>
                {preview.type === "event" ? (
                  <div className="pt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-700 text-xs font-semibold uppercase tracking-wider">Event Details</p>
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <p>Start: {formatDateTime(preview.eventConfig?.eventStartAt)}</p>
                      <p>End: {formatDateTime(preview.eventConfig?.eventEndAt)}</p>
                      <p>Venue: {preview.eventConfig?.venue || "—"}</p>
                      <p>Capacity: {preview.eventConfig?.ticketLimit ?? "—"}</p>
                    </div>
                  </div>
                ) : null}
                {preview.type === "project" ? (
                  <div className="pt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-700 text-xs font-semibold uppercase tracking-wider">Project Details</p>
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <p>Target Year: {preview.projectConfig?.targetYear || "—"}</p>
                      <p>Branch: {preview.projectConfig?.branch || "—"}</p>
                      <p>Semester: {preview.projectConfig?.semester || "—"}</p>
                    </div>
                  </div>
                ) : null}
                {preview.type === "notes" ? (
                  <div className="pt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-700 text-xs font-semibold uppercase tracking-wider">Notes Details</p>
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <p>Subject: {preview.notesConfig?.subject || "—"}</p>
                      <p>Year: {preview.notesConfig?.year || "—"}</p>
                      <p>Semester: {preview.notesConfig?.semester || "—"}</p>
                    </div>
                  </div>
                ) : null}
                {preview.tags && preview.tags.length > 0 ? (
                  <div className="pt-2">
                    <p className="text-slate-400 text-xs font-semibold">Tags</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {preview.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-semibold">{tag}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {preview.approvalComment ? (
                  <div className="pt-2">
                    <p className="text-slate-400 text-xs font-semibold">Admin Comment</p>
                    <p className="text-slate-600 text-xs mt-1">{preview.approvalComment}</p>
                  </div>
                ) : null}
                {preview.description && <p className="text-slate-500 text-xs pt-2">{preview.description}</p>}

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-slate-700 text-xs font-semibold uppercase tracking-wider mb-2">Media</p>
                  {previewImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {previewImages.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={preview.title} className="w-full h-24 object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : preview.status === "rejected" ? (
                    <p className="text-xs text-slate-500">Media files were removed after rejection.</p>
                  ) : (
                    <p className="text-xs text-slate-500">No media files available.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-slate-700 text-xs font-semibold uppercase tracking-wider mb-2">Files & Links</p>
                  {previewFiles.length > 0 ? (
                    <div className="space-y-2">
                      {previewFiles.map((fileLink) => (
                        <a
                          key={fileLink.url}
                          href={fileLink.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-xs text-slate-700 font-semibold">{fileLink.label}</span>
                          <span className="material-symbols-outlined text-slate-400 text-base">open_in_new</span>
                        </a>
                      ))}
                    </div>
                  ) : preview.status === "rejected" ? (
                    <p className="text-xs text-slate-500">Files were removed after rejection.</p>
                  ) : (
                    <p className="text-xs text-slate-500">No downloadable files available.</p>
                  )}
                </div>
              </div>
              {(preview.status === "pending_approval" || preview.status === "pending") && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => openRejectDialog(preview)} disabled={actionLoadingId === preview._id} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50">Reject</button>
                  <button onClick={() => decide(preview._id, "approve")} disabled={actionLoadingId === preview._id} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 bg-blue-600 hover:bg-blue-700">Approve</button>
                </div>
              )}
              {preview.status === "rejected" && (
                <button
                  onClick={() => void deleteListing(preview._id)}
                  disabled={deleteLoadingId === preview._id}
                  className="w-full mt-6 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Delete Rejected Listing
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
            onClick={(event) => {
              if (event.target === event.currentTarget && actionLoadingId !== rejectDialog.id) {
                setRejectDialog(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-black text-slate-900">Reject Listing</h3>
              <p className="mt-1 text-sm text-slate-500">
                Add a clear reason for rejecting <span className="font-semibold text-slate-700">{rejectDialog.title}</span>.
              </p>

              <textarea
                value={rejectDialog.reason}
                onChange={(event) =>
                  setRejectDialog((current) => (current ? { ...current, reason: event.target.value } : current))
                }
                rows={5}
                placeholder="Example: Media quality is low and required file is missing. Please re-upload clear files."
                className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Minimum 5 characters ({rejectDialog.reason.trim().length}/5)
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setRejectDialog(null)}
                  disabled={actionLoadingId === rejectDialog.id}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void submitRejectDecision()}
                  disabled={actionLoadingId === rejectDialog.id || rejectDialog.reason.trim().length < 5}
                  className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
