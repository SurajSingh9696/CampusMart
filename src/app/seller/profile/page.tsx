"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Tab = "store" | "password";

export default function SellerProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as { name?: string; email?: string; storeName?: string; phone?: string; upiId?: string; bio?: string };
  const [tab, setTab] = useState<Tab>("store");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    storeName: user?.storeName || "",
    phone: user?.phone || "",
    upiId: user?.upiId || "",
    bio: user?.bio || "",
  });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  function setF(k: keyof typeof form, v: string) { setForm((p) => ({ ...p, [k]: v })); }
  function setPw(k: keyof typeof pwForm, v: string) { setPwForm((p) => ({ ...p, [k]: v })); }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { toast.error("Update failed"); return; }
      await update({ name: form.name });
      toast.success("Store profile updated!");
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next.length < 8) { toast.error("Min 8 characters"); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success("Password changed!");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Store Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your seller account and store details</p>
      </div>

      {/* Identity card */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl shrink-0"
          style={{ background: "linear-gradient(135deg, #1a73e8, #2563eb)" }}>
          {user?.name?.charAt(0).toUpperCase() || "S"}
        </div>
        <div>
          <p className="text-xl font-black text-slate-900">{user?.storeName || user?.name}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="badge badge-primary">Seller</span>
            <span className="badge badge-success">Approved</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100">
        {(["store", "password"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-3 px-1 text-sm font-bold capitalize transition-all relative"
            style={{ color: tab === t ? "var(--primary)" : "var(--muted)" }}>
            {t === "store" ? "Store Info" : "Change Password"}
            {tab === t && <motion.div layoutId="seller-tab-ind" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "var(--primary)" }} />}
          </button>
        ))}
      </div>

      <div className="card p-7">
        {tab === "store" ? (
          <form onSubmit={saveProfile} className="space-y-5">
            {([
              ["Display Name", "name", "Your name"],
              ["Store Name", "storeName", "e.g. TechKart by Ravi"],
              ["Phone", "phone", "+91 XXXXXXXXXX"],
              ["UPI ID", "upiId", "yourname@upi"],
            ] as [string, keyof typeof form, string][]).map(([label, key, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <input value={form[key]} onChange={(e) => setF(key, e.target.value)} className="input-dark" placeholder={placeholder} />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Bio</label>
              <textarea value={form.bio} onChange={(e) => setF("bio", e.target.value)} className="input-dark resize-none" rows={3} placeholder="Tell customers about your store..." />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={changePassword} className="space-y-5">
            {[["Current Password", "current"], ["New Password", "next"], ["Confirm New Password", "confirm"]].map(([label, key]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <input type="password" value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPw(key as keyof typeof pwForm, e.target.value)}
                  className="input-dark" placeholder="••••••••" />
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Updating...</> : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
