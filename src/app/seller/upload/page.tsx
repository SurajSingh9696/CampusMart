"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const TYPES = [
  { value: "product", label: "Product", icon: "shopping_bag", color: "#3b82f6", desc: "Physical items, electronics, books, stationery" },
  { value: "project", label: "Project", icon: "terminal", color: "#a855f7", desc: "Code, hardware projects with optional auction" },
  { value: "notes", label: "Notes", icon: "menu_book", color: "#f59e0b", desc: "Study materials, PDFs, subject notes" },
  { value: "event", label: "Event", icon: "local_activity", color: "#22c55e", desc: "Campus events with ticketing & custom questions" },
];

export default function UploadPage() {
  const router = useRouter();
  const [type, setType] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", price: "", isFree: false,
    isAuction: false, auctionStartPrice: "", auctionDays: "7",
    subject: "", semester: "", year: "", branch: "",
    eventDate: "", eventTime: "", venue: "", ticketLimit: "",
    deployedUrl: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  function set(key: keyof typeof form, val: string | boolean) {
    setForm(p => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) { toast.error("Select a listing type"); return; }
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (!form.description.trim()) { toast.error("Description required"); return; }
    setLoading(true);
    try {
      const mediaUrls: string[] = [];
      // Upload images to Cloudinary via API
      for (const file of images) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", "image");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (d.url) mediaUrls.push(d.url);
      }

      let resourceUrl = "";
      if (pdfFile) {
        const fd = new FormData();
        fd.append("file", pdfFile);
        fd.append("type", "pdf");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        resourceUrl = d.url || "";
      }
      if (zipFile) {
        const fd = new FormData();
        fd.append("file", zipFile);
        fd.append("type", "zip");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        resourceUrl = d.url || "";
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
        body.auctionStartPrice = form.isAuction ? parseFloat(form.auctionStartPrice) : 0;
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
          eventDate: form.eventDate ? new Date(`${form.eventDate}T${form.eventTime || "00:00"}`) : undefined,
          ticketLimit: parseInt(form.ticketLimit) || 0,
        };
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create listing"); return; }
      toast.success("Listing submitted for approval!");
      router.push("/seller/marketplace");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">New Listing</h1>
        <p className="text-slate-500 text-sm mt-1">Choose what you want to sell or share on campus</p>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className="card p-4 flex flex-col items-center gap-3 transition-all"
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
              >
                <input ref={imageRef} type="file" className="hidden" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files || []))} />
                {images.length > 0 ? (
                  <div className="flex flex-wrap gap-3 justify-center">
                    {images.map((f, i) => (
                      <div
                        key={i}
                        className="badge badge-success flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">image</span>
                        {f.name.length > 20 ? f.name.slice(0, 20) + "…" : f.name}
                      </div>
                    ))}
                    <span className="text-[10px] text-slate-500 w-full text-center mt-1">Click to change</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-400">add_photo_alternate</span>
                    <p className="text-sm font-semibold text-slate-600">Upload images (max 5MB each)</p>
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
                  <select value={form.semester} onChange={e => set("semester", e.target.value)} className="input-dark appearance-none cursor-pointer">
                    <option value="">Select Semester</option>
                    {["SEM 1","SEM 2","SEM 3","SEM 4","SEM 5","SEM 6","SEM 7","SEM 8"].map(s => (
                      <option key={s} style={{ background: "var(--surface)" }}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Upload Full PDF</label>
                  <div className="drop-zone" onClick={() => pdfRef.current?.click()}>
                    <input ref={pdfRef} type="file" className="hidden" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                    {pdfFile ? (
                      <div className="flex items-center gap-2 badge badge-success">
                        <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                        {pdfFile.name}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-slate-600">picture_as_pdf</span>
                        <p className="text-sm text-slate-500">Upload PDF file</p>
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
                    <select value={form.year} onChange={e => set("year", e.target.value)} className="input-dark appearance-none">
                      <option value="">Any Year</option>
                      {["1st Year","2nd Year","3rd Year","4th Year"].map(y => <option key={y} style={{ background: "var(--surface)" }}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Branch</label>
                    <input value={form.branch} onChange={e => set("branch", e.target.value)} placeholder="CSE, ECE, Mech..." className="input-dark" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deployed URL (Optional)</label>
                  <input value={form.deployedUrl} onChange={e => set("deployedUrl", e.target.value)} placeholder="https://myproject.vercel.app" className="input-dark" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Upload ZIP / Source Code</label>
                  <div className="drop-zone" onClick={() => zipRef.current?.click()}>
                    <input ref={zipRef} type="file" className="hidden" accept=".zip,.rar,.tar.gz" onChange={e => setZipFile(e.target.files?.[0] || null)} />
                    {zipFile ? (
                      <div className="badge badge-success">{zipFile.name}</div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-slate-600">folder_zip</span>
                        <p className="text-sm text-slate-300">Upload .zip / .rar</p>
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
                    <input type="checkbox" checked={form.isAuction} onChange={e => set("isAuction", e.target.checked)} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
                {form.isAuction && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Starting Bid (₹)</label>
                    <input type="number" value={form.auctionStartPrice} onChange={e => set("auctionStartPrice", e.target.value)} placeholder="e.g. 500" className="input-dark" />
                  </div>
                )}
              </div>
            )}

            {type === "event" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Event Date</label>
                    <input type="date" value={form.eventDate} onChange={e => set("eventDate", e.target.value)} className="input-dark" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Time</label>
                    <input type="time" value={form.eventTime} onChange={e => set("eventTime", e.target.value)} className="input-dark" />
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
                  <input type="checkbox" checked={form.isFree} onChange={e => set("isFree", e.target.checked)} />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
              {!form.isFree && !form.isAuction && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0.00" className="input-dark pl-8" />
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div
              className="flex gap-3 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <button type="button" onClick={() => setType(null)} className="btn-ghost">
                Back
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-70">
                {loading ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                ) : (
                  <>Submit for Approval <span className="material-symbols-outlined">send</span></>
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-600">
              All listings are reviewed by admin before going live. This usually takes less than 24 hours.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
