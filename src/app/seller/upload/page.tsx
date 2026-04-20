"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_COUNT = 6;

const TYPES = [
  { value: "product", label: "Product", icon: "shopping_bag", color: "#3b82f6", desc: "Physical items, electronics, books, stationery" },
  { value: "project", label: "Project", icon: "terminal", color: "#a855f7", desc: "Code, hardware projects with optional auction" },
  { value: "notes", label: "Notes", icon: "menu_book", color: "#f59e0b", desc: "Study materials, PDFs, subject notes" },
  { value: "event", label: "Event", icon: "local_activity", color: "#22c55e", desc: "Campus events with ticketing & custom questions" },
];

const BRANCH_OPTIONS = ["CSE", "ECE", "EEE", "ME", "CE", "IT", "AI/ML", "BCA", "MCA", "MBA"];

type ListingType = "product" | "project" | "notes" | "event";

type ListingResponse = {
  type?: ListingType;
  title?: string;
  description?: string;
  price?: number;
  isFree?: boolean;
  isAuction?: boolean;
  auctionStartPrice?: number;
  mediaUrls?: string[];
  resourceUrl?: string;
  eventConfig?: {
    eventDate?: string;
    eventStartAt?: string;
    eventEndAt?: string;
    venue?: string;
    ticketLimit?: number;
  };
  projectConfig?: {
    targetYear?: string;
    year?: string;
    branch?: string;
    deployedPreviewUrl?: string;
    zipUrl?: string;
  };
  notesConfig?: {
    subject?: string;
    semester?: string;
    year?: string;
    branch?: string;
    notesPdfUrl?: string;
  };
};

function splitIsoDateTime(value?: string) {
  if (!value) return { date: "", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  };
}

function getFileNameFromUrl(url: string) {
  if (!url) return "";
  try {
    const lastSegment = url.split("/").pop() || url;
    return decodeURIComponent(lastSegment);
  } catch {
    return url;
  }
}

function extractErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeFlatten = error as {
      formErrors?: unknown;
      fieldErrors?: Record<string, unknown>;
      message?: unknown;
    };

    if (typeof maybeFlatten.message === "string" && maybeFlatten.message.trim().length > 0) {
      return maybeFlatten.message;
    }

    if (Array.isArray(maybeFlatten.formErrors)) {
      const formMessage = maybeFlatten.formErrors.find(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
      );
      if (formMessage) return formMessage;
    }

    if (maybeFlatten.fieldErrors && typeof maybeFlatten.fieldErrors === "object") {
      const fieldMessage = Object.values(maybeFlatten.fieldErrors)
        .flat()
        .find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
      if (fieldMessage) return fieldMessage;
    }
  }

  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const [type, setType] = useState<ListingType | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", price: "", isFree: false,
    isAuction: false, auctionStartPrice: "",
    subject: "", semester: "", year: "", branch: "",
    eventStartDate: "", eventStartTime: "", eventEndDate: "", eventEndTime: "", venue: "", ticketLimit: "",
    deployedUrl: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [isLoadingEditListing, setIsLoadingEditListing] = useState(false);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [existingResourceUrl, setExistingResourceUrl] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const isEditMode = Boolean(editId);

  function set(key: keyof typeof form, val: string | boolean) {
    setForm(p => ({ ...p, [key]: val }));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const listingId = new URLSearchParams(window.location.search).get("edit");
    if (!listingId) return;

    let cancelled = false;

    async function loadListingForEdit() {
      setEditId(listingId);
      setIsLoadingEditListing(true);

      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const payload = await res.json();

        if (!res.ok || !payload.listing) {
          throw new Error(payload?.error || "Failed to load listing");
        }

        if (cancelled) return;

        const listing = payload.listing as ListingResponse;
        const start = splitIsoDateTime(listing.eventConfig?.eventStartAt || listing.eventConfig?.eventDate);
        const end = splitIsoDateTime(listing.eventConfig?.eventEndAt);

        setType((listing.type || null) as ListingType | null);
        setExistingMediaUrls(Array.isArray(listing.mediaUrls) ? listing.mediaUrls : []);

        const savedResource =
          listing.resourceUrl ||
          listing.notesConfig?.notesPdfUrl ||
          listing.projectConfig?.zipUrl ||
          "";
        setExistingResourceUrl(savedResource);

        setForm({
          title: listing.title || "",
          description: listing.description || "",
          price: typeof listing.price === "number" ? String(listing.price) : "",
          isFree: Boolean(listing.isFree),
          isAuction: Boolean(listing.isAuction),
          auctionStartPrice: typeof listing.auctionStartPrice === "number" ? String(listing.auctionStartPrice) : "",
          subject: listing.notesConfig?.subject || "",
          semester: listing.notesConfig?.semester || "",
          year: listing.projectConfig?.targetYear || listing.projectConfig?.year || listing.notesConfig?.year || "",
          branch: listing.projectConfig?.branch || listing.notesConfig?.branch || "",
          eventStartDate: start.date,
          eventStartTime: start.time,
          eventEndDate: end.date,
          eventEndTime: end.time,
          venue: listing.eventConfig?.venue || "",
          ticketLimit: typeof listing.eventConfig?.ticketLimit === "number" ? String(listing.eventConfig.ticketLimit) : "",
          deployedUrl: listing.projectConfig?.deployedPreviewUrl || "",
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load listing";
        toast.error(message);
        router.push("/seller/marketplace");
      } finally {
        if (!cancelled) setIsLoadingEditListing(false);
      }
    }

    void loadListingForEdit();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function formatSize(bytes: number) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function toIsoDateTime(date: string, time: string) {
    if (!date) return null;
    const parsed = new Date(`${date}T${time || "00:00"}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  function validateImageFiles(files: File[]) {
    if (files.length > MAX_IMAGE_COUNT) {
      toast.error(`You can upload up to ${MAX_IMAGE_COUNT} images.`);
      return false;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image file.`);
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds 1MB image limit.`);
        return false;
      }
    }

    return true;
  }

  function validateDocument(file: File, label: string) {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      toast.error(`${label} must be 10MB or less.`);
      return false;
    }
    return true;
  }

  function onImageSelect(files: File[]) {
    if (!validateImageFiles(files)) return;
    setImages(files);
  }

  async function uploadFile(file: File, uploadType: "image" | "pdf" | "zip") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", uploadType);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const payload = await res.json();

    if (!res.ok || !payload.url) {
      throw new Error(payload?.error || `Failed to upload ${file.name}`);
    }

    return payload.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) { toast.error("Select a listing type"); return; }
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (!form.description.trim()) { toast.error("Description required"); return; }
    if (!validateImageFiles(images)) return;
    if (pdfFile && !validateDocument(pdfFile, "PDF")) return;
    if (zipFile && !validateDocument(zipFile, "Archive")) return;

    const eventStartAt = toIsoDateTime(form.eventStartDate, form.eventStartTime);
    const eventEndAt = toIsoDateTime(form.eventEndDate, form.eventEndTime);
    if (type === "event") {
      if (!eventStartAt) {
        toast.error("Event start date and time are required.");
        return;
      }
      if (eventEndAt && new Date(eventEndAt).getTime() <= new Date(eventStartAt).getTime()) {
        toast.error("Event end time must be after start time.");
        return;
      }
    }

    const parsedAuctionStartPrice = Number.parseFloat(form.auctionStartPrice);
    if (type === "project" && form.isAuction && (!Number.isFinite(parsedAuctionStartPrice) || parsedAuctionStartPrice < 0)) {
      toast.error("Starting bid is required for auction projects.");
      return;
    }

    setLoading(true);
    try {
      const mediaUrls: string[] = images.length > 0 ? [] : [...existingMediaUrls];
      for (const file of images) {
        const imageUrl = await uploadFile(file, "image");
        mediaUrls.push(imageUrl);
      }

      let resourceUrl = existingResourceUrl;
      if (pdfFile) {
        resourceUrl = await uploadFile(pdfFile, "pdf");
      }
      if (zipFile) {
        resourceUrl = await uploadFile(zipFile, "zip");
      }

      const body: Record<string, unknown> = {
        type,
        title: form.title,
        description: form.description,
        price: form.isFree ? 0 : parseFloat(form.price) || 0,
        isFree: form.isFree,
        mediaUrls,
        resourceUrl,
      };

      if (type === "project") {
        body.isAuction = form.isAuction;
        body.auctionStartPrice = form.isAuction ? parsedAuctionStartPrice : 0;
        body.projectConfig = {
          branch: form.branch,
          year: form.year,
          deployedPreviewUrl: form.deployedUrl,
          zipUrl: resourceUrl,
        };
      }
      if (type === "notes") {
        body.notesConfig = {
          subject: form.subject,
          semester: form.semester,
          year: form.year,
          branch: form.branch,
          notesPdfUrl: resourceUrl,
        };
      }
      if (type === "event") {
        body.eventConfig = {
          eventDate: eventStartAt || undefined,
          eventStartAt: eventStartAt || undefined,
          eventEndAt: eventEndAt || undefined,
          venue: form.venue,
          ticketLimit: parseInt(form.ticketLimit) || 0,
        };
      }

      const endpoint = isEditMode && editId ? `/api/listings/${editId}` : "/api/listings";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const fallback = isEditMode ? "Failed to update listing" : "Failed to create listing";
        toast.error(extractErrorMessage(data?.error) || fallback);
        return;
      }
      toast.success(isEditMode ? "Listing updated and submitted for review!" : "Listing submitted for approval!");
      router.push("/seller/marketplace");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{isEditMode ? "Edit Listing" : "New Listing"}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isLoadingEditListing
            ? "Loading your listing details..."
            : isEditMode
              ? "Update your listing details and resubmit for review"
              : "Choose what you want to sell or share on campus"}
        </p>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              if (!isEditMode) setType(t.value as ListingType);
            }}
            disabled={isEditMode}
            className="card p-4 flex flex-col items-center gap-3 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              border: type === t.value ? `1px solid ${t.color}` : "1px solid var(--border)",
              background: type === t.value ? `${t.color}10` : "white",
            }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${t.color}15` }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: t.color }}>{t.icon}</span>
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm">{t.label}</p>
              <p className="text-slate-500 text-[9px] leading-tight mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {isEditMode && (
        <p className="text-xs text-slate-500">Listing type is locked while editing to keep existing data consistent.</p>
      )}

      {isLoadingEditListing && !type && (
        <div className="card p-6 flex items-center justify-center gap-2 text-slate-600">
          <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          Loading listing editor...
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {type && (
          <motion.form
            key={type}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit}
            className="card p-6 lg:p-8 space-y-6"
          >
            <h2 className="text-lg font-bold text-slate-900 capitalize">{type} Details</h2>

            {/* Title + Description */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Title *</label>
                <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Give your listing a clear title..." className="input-dark" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Description *</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe your listing in detail..." rows={4} className="input-dark resize-none" style={{ borderRadius: "12px" }} required />
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">
                {type === "notes" ? "Preview Pages" : "Images"}
              </label>
              <div
                className="drop-zone"
                onClick={() => imageRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onImageSelect(Array.from(event.dataTransfer.files || []));
                }}
              >
                <input
                  ref={imageRef}
                  type="file"
                  className="hidden"
                  aria-label="Upload listing images"
                  accept="image/*"
                  multiple
                  onChange={(e) => onImageSelect(Array.from(e.target.files || []))}
                />
                {images.length > 0 ? (
                  <div className="flex flex-wrap gap-3 justify-center">
                    {images.map((f, i) => (
                      <div
                        key={i}
                        className="badge badge-success flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">image</span>
                        {f.name.length > 24 ? f.name.slice(0, 24) + "..." : f.name}
                      </div>
                    ))}
                    <span className="text-[10px] text-slate-500 w-full text-center mt-1">Click or drop to replace images</span>
                  </div>
                ) : existingMediaUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-3 justify-center">
                    {existingMediaUrls.map((url, i) => (
                      <div key={`${url}-${i}`} className="badge badge-success flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">image</span>
                        {getFileNameFromUrl(url).slice(0, 24)}
                      </div>
                    ))}
                    <span className="text-[10px] text-slate-500 w-full text-center mt-1">Existing images are saved. Upload new ones to replace.</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-400">add_photo_alternate</span>
                    <p className="text-sm font-semibold text-slate-600">Upload images (max 1MB each)</p>
                    <p className="text-slate-400 text-xs">Drag &amp; drop or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            {/* Type-specific fields */}
            {type === "notes" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Subject</label>
                  <input value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. Data Structures" className="input-dark" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Semester</label>
                  <select value={form.semester} onChange={e => set("semester", e.target.value)} aria-label="Semester" className="input-dark appearance-none cursor-pointer">
                    <option value="">Select Semester</option>
                    {["SEM 1","SEM 2","SEM 3","SEM 4","SEM 5","SEM 6","SEM 7","SEM 8"].map(s => (
                      <option key={s} style={{ background: "var(--surface)" }}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Upload Full PDF</label>
                  <div className="drop-zone" onClick={() => pdfRef.current?.click()}>
                    <input
                      ref={pdfRef}
                      type="file"
                      className="hidden"
                      aria-label="Upload notes PDF"
                      accept=".pdf,application/pdf"
                      onChange={e => {
                        const selected = e.target.files?.[0] || null;
                        if (selected && !validateDocument(selected, "PDF")) return;
                        setPdfFile(selected);
                      }}
                    />
                    {pdfFile ? (
                      <div className="flex items-center gap-2 badge badge-success">
                        <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                        {pdfFile.name} ({formatSize(pdfFile.size)})
                      </div>
                    ) : existingResourceUrl ? (
                      <div className="flex items-center gap-2 badge badge-success">
                        <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                        {getFileNameFromUrl(existingResourceUrl)}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-slate-600">picture_as_pdf</span>
                        <p className="text-sm text-slate-500">Upload PDF file (max 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {type === "project" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Target Year</label>
                    <select value={form.year} onChange={e => set("year", e.target.value)} aria-label="Target year" className="input-dark appearance-none">
                      <option value="">Any Year</option>
                      {["1st Year","2nd Year","3rd Year","4th Year"].map(y => <option key={y} style={{ background: "var(--surface)" }}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Branch (Optional)</label>
                    <select
                      value={form.branch}
                      onChange={e => set("branch", e.target.value)}
                      aria-label="Branch"
                      className="input-dark appearance-none cursor-pointer"
                    >
                      <option value="">Select Branch (Optional)</option>
                      {BRANCH_OPTIONS.map((branch) => (
                        <option key={branch} style={{ background: "var(--surface)" }}>{branch}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deployed URL (Optional)</label>
                  <input value={form.deployedUrl} onChange={e => set("deployedUrl", e.target.value)} placeholder="https://myproject.vercel.app" className="input-dark" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Upload ZIP / Source Code</label>
                  <div className="drop-zone" onClick={() => zipRef.current?.click()}>
                    <input
                      ref={zipRef}
                      type="file"
                      className="hidden"
                      aria-label="Upload project archive"
                      accept=".zip,.rar,.7z,.tar,.gz"
                      onChange={e => {
                        const selected = e.target.files?.[0] || null;
                        if (selected && !validateDocument(selected, "Archive")) return;
                        setZipFile(selected);
                      }}
                    />
                    {zipFile ? (
                      <div className="badge badge-success">{zipFile.name} ({formatSize(zipFile.size)})</div>
                    ) : existingResourceUrl ? (
                      <div className="badge badge-success">{getFileNameFromUrl(existingResourceUrl)}</div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-slate-600">folder_zip</span>
                        <p className="text-sm text-slate-500">Upload .zip / archive (max 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Auction toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#edf4ff", border: "1px solid #ddd6fe" }}>
                    <div>
                      <p className="text-slate-900 font-bold text-sm">Enable Auction Mode</p>
                    <p className="text-slate-400 text-xs mt-0.5">Let students bid on this project</p>
                  </div>
                  <label className="toggle">
                    <input aria-label="Enable auction mode" type="checkbox" checked={form.isAuction} onChange={e => set("isAuction", e.target.checked)} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
                {form.isAuction && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Starting Bid (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                      <input type="number" value={form.auctionStartPrice} onChange={e => set("auctionStartPrice", e.target.value)} placeholder="Enter amount" className="input-dark pl-10" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === "event" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Start Date</label>
                    <input aria-label="Event start date" type="date" value={form.eventStartDate} onChange={e => set("eventStartDate", e.target.value)} className="input-dark" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Start Time</label>
                    <input aria-label="Event start time" type="time" value={form.eventStartTime} onChange={e => set("eventStartTime", e.target.value)} className="input-dark" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">End Date (Optional)</label>
                    <input aria-label="Event end date" type="date" value={form.eventEndDate} onChange={e => set("eventEndDate", e.target.value)} className="input-dark" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">End Time (Optional)</label>
                    <input aria-label="Event end time" type="time" value={form.eventEndTime} onChange={e => set("eventEndTime", e.target.value)} className="input-dark" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Venue / Location</label>
                  <input value={form.venue} onChange={e => set("venue", e.target.value)} placeholder="Main Auditorium, Room 201, etc." className="input-dark" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Max Capacity (0 = unlimited)</label>
                  <input type="number" value={form.ticketLimit} onChange={e => set("ticketLimit", e.target.value)} placeholder="100" className="input-dark" />
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div>
                    <p className="text-slate-900 font-bold text-sm">Free Listing</p>
                  <p className="text-slate-400 text-xs">Make this available at no cost</p>
                </div>
                <label className="toggle">
                  <input aria-label="Mark listing as free" type="checkbox" checked={form.isFree} onChange={e => set("isFree", e.target.checked)} />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
              {!form.isFree && !form.isAuction && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="Enter amount" className="input-dark pl-10" />
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div
              className="flex gap-3 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={() => {
                  if (isEditMode) {
                    router.push("/seller/marketplace");
                    return;
                  }
                  setType(null);
                }}
                className="btn-ghost"
              >
                {isEditMode ? "Cancel" : "Back"}
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-70">
                {loading ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {isEditMode ? "Saving..." : "Submitting..."}</>
                ) : (
                  <>{isEditMode ? "Save Changes" : "Submit for Approval"} <span className="material-symbols-outlined">send</span></>
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-600">
              {isEditMode
                ? "Edited listings are reviewed by admin before they go live again."
                : "All listings are reviewed by admin before going live. This usually takes less than 24 hours."}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
