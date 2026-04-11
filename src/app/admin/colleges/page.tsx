"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type College = { _id: string; name: string; shortCode: string; location: string; isActive: boolean; sellerCount?: number; studentCount?: number; createdAt: string };

export default function AdminCollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<College | null>(null);
  const [form, setForm] = useState({ name: "", shortCode: "", location: "" });

  useEffect(() => {
    fetch("/api/colleges")
      .then((r) => r.json())
      .then((d) => { setColleges(d.colleges || []); setLoading(false); });
  }, []);

  function openAdd() { setForm({ name: "", shortCode: "", location: "" }); setEditTarget(null); setShowModal(true); }
  function openEdit(c: College) { setForm({ name: c.name, shortCode: c.shortCode, location: c.location }); setEditTarget(c); setShowModal(true); }

  async function save() {
    if (!form.name.trim() || !form.shortCode.trim()) { toast.error("Name and short code are required"); return; }
    const url = editTarget ? `/api/colleges/${editTarget._id}` : "/api/colleges";
    const method = editTarget ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Save failed"); return; }
    toast.success(editTarget ? "College updated" : "College added");
    setShowModal(false);
    // Refresh
    fetch("/api/colleges").then((r) => r.json()).then((d) => setColleges(d.colleges || []));
  }

  async function toggleActive(college: College) {
    const prev = [...colleges];
    setColleges((c) => c.map((x) => x._id === college._id ? { ...x, isActive: !x.isActive } : x));
    const res = await fetch(`/api/colleges/${college._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !college.isActive }),
    });
    if (!res.ok) { setColleges(prev); toast.error("Update failed"); }
    else toast.success(`Campus ${college.isActive ? "de" : ""}activated`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Campus Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">{colleges.length} registered campuses</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm" style={{ padding: "0.6rem 1.2rem" }}>
          <span className="material-symbols-outlined text-xl">add</span> Add Campus
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-28 animate-pulse" />)}</div>
      ) : colleges.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">school</span>
          <p className="text-slate-700 font-bold">No campuses yet</p>
          <button onClick={openAdd} className="btn-primary mt-4" style={{ padding: "0.6rem 1.3rem" }}>Add First Campus</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {colleges.map((c, i) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.isActive ? "#eff6ff" : "#f8fafc" }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: c.isActive ? "#2563eb" : "#94a3b8" }}>school</span>
                </div>
                <button onClick={() => toggleActive(c)}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                  style={c.isActive ? { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" } : { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                  {c.isActive ? "Active" : "Inactive"}
                </button>
              </div>
              <p className="text-slate-900 font-black">{c.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">{c.location || "Location not set"}</p>
              <div className="inline-block mt-1 badge badge-primary">{c.shortCode}</div>
              <div className="flex gap-4 mt-3 text-xs text-slate-400">
                <span>{c.studentCount || 0} students</span>
                <span>{c.sellerCount || 0} sellers</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(c)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors">
                  Edit
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl p-7 shadow-2xl border border-slate-100">
              <div className="flex justify-between mb-5">
                <h3 className="text-lg font-black text-slate-900">{editTarget ? "Edit Campus" : "Add Campus"}</h3>
                <button onClick={() => setShowModal(false)}><span className="material-symbols-outlined text-slate-400">close</span></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">College Name</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-dark" placeholder="e.g. IIT Bombay" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Short Code (Required)</label>
                  <input value={form.shortCode} onChange={(e) => setForm((f) => ({ ...f, shortCode: e.target.value.toUpperCase() }))} className="input-dark" placeholder="e.g. IITB" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location / City</label>
                  <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="input-dark" placeholder="e.g. Mumbai" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
                <button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
                  {editTarget ? "Save Changes" : "Add Campus"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
