"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type Project = {
  _id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  mediaUrls?: string[];
  campus: string;
  type: string;
  status: string;
  tags?: string[];
  techStack?: string[];
  createdAt: string;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "popular", label: "Most Popular" },
  { value: "title_asc", label: "Title: A to Z" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

export default function CustomerProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [globalView, setGlobalView] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "project", sort, global: String(globalView) });
      if (search) params.set("q", search);
      const res = await fetch(`/api/listings?${params}`);
      const data = await res.json();
      setProjects(data.listings || []);
    } finally {
      setLoading(false);
    }
  }, [sort, globalView, search]);

  useEffect(() => {
    const t = setTimeout(fetchProjects, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchProjects, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {projects.length > 0 ? `${projects.length} student projects available` : "Browse student-built projects"}
          </p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-dark w-auto" style={{ minWidth: "180px" }}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Search + campus toggle */}
      <div className="flex gap-3 flex-wrap">
        <div className="input-icon-wrap flex-1 min-w-[200px]">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, tech stack..." className="input-dark" />
        </div>
        <button onClick={() => setGlobalView(!globalView)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border"
          style={{
            background: globalView ? "#fffbeb" : "white",
            borderColor: globalView ? "#d97706" : "var(--border)",
            color: globalView ? "#d97706" : "var(--text-2)",
          }}>
          <span className="material-symbols-outlined text-xl">language</span>
          {globalView ? "Global View" : "My Campus"}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 rounded-t-2xl" style={{ background: "#f1f5f9" }} />
              <div className="p-5 space-y-3">
                <div className="h-4 w-2/3 rounded" style={{ background: "#f1f5f9" }} />
                <div className="h-3 w-full rounded" style={{ background: "#f1f5f9" }} />
                <div className="h-3 w-1/2 rounded" style={{ background: "#f1f5f9" }} />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 block mb-4">terminal</span>
          <h3 className="text-slate-800 font-bold text-lg mb-2">No projects found</h3>
          <p className="text-slate-400 text-sm">
            {search ? `No results for "${search}"` : "No projects listed on your campus yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj, i) => (
            <motion.div key={proj._id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group">
              {/* Banner */}
              <div className="h-36 flex items-center justify-center relative"
                style={{ background: "linear-gradient(135deg, #eff6ff, #edf4ff)" }}>
                {proj.mediaUrls?.[0] ? (
                  <img src={proj.mediaUrls[0]} alt={proj.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-5xl" style={{ color: "#1a73e8" }}>terminal</span>
                )}
                <div className="absolute top-3 left-3">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
                    style={{ background: "rgba(255,255,255,0.85)", color: "#334155", border: "1px solid var(--border)" }}>
                    {proj.campus}
                  </span>
                </div>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <h3 className="text-slate-900 font-bold line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {proj.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{proj.description}</p>
                {/* Tech tags */}
                {proj.techStack && proj.techStack.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {proj.techStack.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                        style={{ background: "#eff6ff", color: "#2563eb" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-lg font-black text-slate-900">
                    {proj.isFree ? <span className="text-green-600 text-sm font-bold">FREE</span> : `₹${proj.price}`}
                  </span>
                  <Link href={`/customer/projects/${proj._id}`}
                    className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all"
                    style={{ background: "var(--primary)" }}>
                    View Project
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
