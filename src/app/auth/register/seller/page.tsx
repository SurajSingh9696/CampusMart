"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type College = { _id: string; name: string };

export default function SellerRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", phone: "",
    collegeId: "", idCardNumber: "", year: "", branch: "", course: "",
    shopName: "", shopDescription: "",
  });

  useEffect(() => {
    fetch("/api/colleges?active=true").then(r => r.json()).then(d => setColleges(d.colleges || []));
  }, []);

  function set(key: keyof typeof form, val: string) {
    setForm(p => ({ ...p, [key]: val }));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setIdPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error("Name, email, and password required"); return; }
    if (form.password.length < 8) { toast.error("Password must be 8+ characters"); return; }
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!form.collegeId) { toast.error("Select your college"); return; }
    if (!form.idCardNumber) { toast.error("Enter your college ID / roll number"); return; }
    if (!form.shopName.trim()) { toast.error("Store name is required"); return; }
    setLoading(true);
    try {
      const body: Record<string, string> = { ...form, role: "seller" };
      if (idPreview) body.idCardImageBase64 = idPreview;
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Registration failed"); return; }
      toast.success("Seller account created! Awaiting admin approval (within 24h).");
      router.push("/pending-approval");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-2)" }}>
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <span className="material-symbols-outlined text-white text-xl">handshake</span>
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">CampusMart</span>
        </Link>
        <Link href="/auth/login" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Sign In
        </Link>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-stretch">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-center px-14 py-16 w-[42%] shrink-0" style={{ background: "linear-gradient(145deg, #2563eb 0%, #1e40af 100%)" }}>
          <div className="text-white max-w-sm">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-[10px] font-bold uppercase tracking-widest bg-white/10 border border-white/20"
            >
              <span className="material-symbols-outlined text-sm">verified_user</span>
              Verified Seller Program
            </div>
            <h2 className="text-4xl font-black mb-4 leading-tight">
              Turn Campus Know-How Into Real Money.
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed mb-10">
              Set up your shop, sell products, projects, and notes. Organize events for your fellow students — all with powerful analytics and weekly settlements.
            </p>
            <div className="space-y-4">
              {[
                { icon: "rocket_launch", title: "Go Live in 24 Hours", desc: "Admin review and approval within one business day." },
                { icon: "payments", title: "Weekly Settlements", desc: "Transparent revenue with Razorpay integration." },
                { icon: "analytics", title: "Full Analytics", desc: "Track sales, revenue trends, and best-selling products." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm mb-0.5">{item.title}</h3>
                    <p className="text-blue-200 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex px-4">
          <div className="w-full max-w-xl mx-auto py-8">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="h-1.5" style={{ background: "linear-gradient(90deg, var(--primary), #7c3aed)" }} />

              <div className="p-6 md:p-8">
                <div className="mb-8">
                  <h1 className="text-2xl font-black text-slate-900 mb-1">Seller Registration</h1>
                  <p className="text-slate-500 text-sm">Requires admin approval · ID verification required</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Info */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>person</span>
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="input-icon-wrap">
                          <span className="icon-left material-symbols-outlined">badge</span>
                          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full Name" className="input-dark h-11 w-full" required />
                        </div>
                        <div className="input-icon-wrap">
                          <span className="icon-left material-symbols-outlined">phone</span>
                          <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone" className="input-dark h-11 w-full" />
                        </div>
                      </div>
                      <div className="input-icon-wrap">
                        <span className="icon-left material-symbols-outlined">alternate_email</span>
                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="College Email" className="input-dark h-11 w-full" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="input-icon-wrap">
                          <span className="icon-left material-symbols-outlined">lock</span>
                          <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Password (8+)" className="input-dark h-11 w-full" required />
                        </div>
                        <div className="input-icon-wrap">
                          <span className="icon-left material-symbols-outlined">lock_reset</span>
                          <input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Confirm" className="input-dark h-11 w-full" required />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* College & Store */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>storefront</span>
                      College & Store Info
                    </h3>
                    <div className="space-y-4">
                      <div className="input-icon-wrap relative">
                        <span className="icon-left material-symbols-outlined">school</span>
                        <select value={form.collegeId} onChange={e => set("collegeId", e.target.value)} className="input-dark appearance-none cursor-pointer w-full h-11 pl-[3.25rem] pr-10" required>
                          <option value="">Select Your College</option>
                          {colleges.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined select-chevron">unfold_more</span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="input-icon-wrap col-span-3 sm:col-span-1">
                          <span className="icon-left material-symbols-outlined">badge</span>
                          <input value={form.idCardNumber} onChange={e => set("idCardNumber", e.target.value)} placeholder="Roll No / ID" className="input-dark w-full h-11" required />
                        </div>
                        <div className="relative col-span-3 sm:col-span-1">
                          <select value={form.year} onChange={e => set("year", e.target.value)} className="input-dark appearance-none cursor-pointer w-full px-4 h-11 pr-10">
                            <option value="">Year</option>
                            {["1st Year","2nd Year","3rd Year","4th Year","PG"].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined select-chevron">unfold_more</span>
                        </div>
                        <div className="relative col-span-3 sm:col-span-1">
                          <input value={form.branch} onChange={e => set("branch", e.target.value)} placeholder="Branch" className="input-dark px-4 w-full h-11" />
                        </div>
                      </div>

                      <div className="input-icon-wrap">
                        <span className="icon-left material-symbols-outlined">storefront</span>
                        <input value={form.shopName} onChange={e => set("shopName", e.target.value)} placeholder="Your Store Name (e.g., TechNotes Hub)" className="input-dark h-11 w-full" required />
                      </div>
                      <textarea
                        value={form.shopDescription}
                        onChange={e => set("shopDescription", e.target.value)}
                        placeholder="What will you sell? Tell customers about your store…"
                        rows={3}
                        className="input-dark resize-none w-full p-4"
                        style={{ borderRadius: "12px" }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ID Verification */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>verified_user</span>
                      ID Verification
                    </h3>

                    <div
                      className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-center"
                      onClick={() => fileRef.current?.click()}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={onFileChange}
                      />
                      {idPreview ? (
                        <div className="flex flex-col items-center gap-3">
                          {idPreview.startsWith("data:image") && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={idPreview} alt="ID preview" className="max-h-40 rounded-xl object-contain border border-slate-200 shadow-sm" />
                          )}
                          <div className="flex items-center gap-2 badge badge-success">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            ID Card Uploaded
                          </div>
                          <span className="text-[10px] font-medium text-slate-500">Click to change</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                            <span className="material-symbols-outlined text-2xl text-blue-600">upload_file</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700">Upload College ID Card</p>
                          <p className="text-slate-500 text-xs">Front of ID card image or PDF (max 5MB)</p>
                          <div className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">Browse Files</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3 p-4 rounded-xl bg-orange-50 border border-orange-100">
                      <span className="material-symbols-outlined text-lg text-orange-500 shrink-0 mt-0.5">info</span>
                      <p className="text-xs font-medium text-orange-800 leading-relaxed">
                        Your application will be reviewed within 24 hours. You&apos;ll be notified by email once approved. Misrepresentation results in permanent ban.
                      </p>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 mt-4" style={{ padding: "1rem" }}>
                    {loading ? (
                      <><span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Submitting Application...</>
                    ) : (
                      <>Submit Seller Application <span className="material-symbols-outlined text-xl">send</span></>
                    )}
                  </button>

                  <p className="text-center text-sm font-medium text-slate-500 pt-2">
                    Already registered?{" "}
                    <Link href="/auth/login" className="font-bold text-blue-600 hover:text-blue-700">
                      Sign in
                    </Link>
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
