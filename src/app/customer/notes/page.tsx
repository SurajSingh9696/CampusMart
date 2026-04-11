"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type Note = {
  _id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  campus: string;
  subject?: string;
  semester?: string;
  pages?: number;
  format?: string;
  createdAt: string;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

const SUBJECTS = ["All", "Mathematics", "Physics", "Computer Science", "Chemistry", "Economics", "History", "Other"];

export default function CustomerNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [globalView, setGlobalView] = useState(false);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "notes", sort, global: String(globalView) });
      if (search) params.set("q", search);
      if (subject !== "All") params.set("subject", subject);
      const res = await fetch(`/api/listings?${params}`);
      const data = await res.json();
      setNotes(data.listings || []);
    } finally {
      setLoading(false);
    }
  }, [sort, globalView, search, subject]);

  useEffect(() => {
    const t = setTimeout(fetchNotes, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchNotes, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Study Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {notes.length > 0 ? `${notes.length} notes available` : "Curated lecture notes from your peers"}
          </p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-dark w-auto" style={{ minWidth: "180px" }}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="input-icon-wrap flex-1 min-w-[200px]">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by title, subject..." className="input-dark" />
        </div>
        <button onClick={() => setGlobalView(!globalView)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border"
          style={{
            background: globalView ? "#fffbeb" : "white",
            borderColor: globalView ? "#d97706" : "var(--border)",
            color: globalView ? "#d97706" : "var(--text-2)",
          }}>
          <span className="material-symbols-outlined text-xl">language</span>
          {globalView ? "Global" : "Campus"}
        </button>
      </div>

      {/* Subject filter pills */}
      <div className="flex gap-2 flex-wrap">
        {SUBJECTS.map((s) => (
          <button key={s} onClick={() => setSubject(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
            style={{
              background: subject === s ? "var(--primary)" : "white",
              color: subject === s ? "white" : "var(--text-2)",
              borderColor: subject === s ? "var(--primary)" : "var(--border)",
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 w-2/3 rounded" style={{ background: "#f1f5f9" }} />
              <div className="h-3 w-full rounded" style={{ background: "#f1f5f9" }} />
              <div className="h-3 w-full rounded" style={{ background: "#f1f5f9" }} />
              <div className="h-3 w-1/2 rounded" style={{ background: "#f1f5f9" }} />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 block mb-4">menu_book</span>
          <h3 className="text-slate-800 font-bold text-lg mb-2">No notes found</h3>
          <p className="text-slate-400 text-sm">
            {search ? `No results for "${search}"` : "No notes listed on your campus yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note, i) => (
            <motion.div key={note._id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
              {/* Top colour bar */}
              <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, var(--primary), #1a73e8)" }} />
              <div className="p-5 flex flex-col gap-3">
                {/* Subject badge */}
                {note.subject && (
                  <span className="badge badge-primary w-fit">{note.subject}</span>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#eff6ff" }}>
                    <span className="material-symbols-outlined text-xl" style={{ color: "var(--primary)" }}>menu_book</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-slate-900 font-bold text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {note.title}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">{note.campus}</p>
                  </div>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{note.description}</p>
                <div className="flex gap-3 text-xs text-slate-400">
                  {note.pages && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">description</span>{note.pages} pages</span>}
                  {note.semester && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">school</span>Sem {note.semester}</span>}
                </div>
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-50">
                  <span className="font-black text-slate-900">
                    {note.isFree ? <span className="text-green-600 text-sm font-bold">FREE</span> : `₹${note.price}`}
                  </span>
                  <Link href={`/customer/notes/${note._id}`}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all"
                    style={{ background: "var(--primary)" }}>
                    View →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
