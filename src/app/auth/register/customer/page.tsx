"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type College = { _id: string; name: string };

const STEP_1 = "Personal Details";
const STEP_2 = "Campus & Account";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", collegeId: "", studentId: "" });

  useEffect(() => {
    fetch("/api/colleges?active=true").then(r => r.json()).then(d => setColleges(d.colleges || []));
  }, []);

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { toast.error("Fill in all fields"); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast.error("Enter a valid email"); return; }
    if (!/^\d{10}$/.test(form.phone.trim())) { toast.error("Enter a valid 10-digit phone number"); return; }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.password || form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirmPassword) { toast.error("Passwords don't match"); return; }
    if (!form.collegeId) { toast.error("Select your college"); return; }
    if (!form.studentId.trim()) { toast.error("Student ID is required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "customer",
          name: form.name.trim(),
          email: form.email.toLowerCase().trim(),
          phone: form.phone.trim(),
          password: form.password,
          collegeId: form.collegeId,
          studentId: form.studentId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Registration failed"); return; }
      toast.success("Account created! Please sign in.");
      router.push("/auth/login");
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-2)" }}>
      {/* Navbar */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <span className="material-symbols-outlined text-white text-xl">handshake</span>
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">CampusMart</span>
        </Link>
        <Link href="/auth/login" className="text-sm font-medium text-slate-500 hover:text-slate-800">Sign In</Link>
      </header>

      <main className="flex flex-col lg:flex-row items-stretch min-h-[calc(100vh-65px)]">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-center px-14 py-16 w-[42%] shrink-0" style={{ background: "linear-gradient(145deg, #2563eb 0%, #1e40af 100%)" }}>
          <div className="text-white max-w-xs">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-white/10 backdrop-blur-sm">
              <span className="material-symbols-outlined text-white text-3xl">school</span>
            </div>
            <h2 className="text-3xl font-black mb-4 leading-tight">Join 12,000+ students on CampusMart</h2>
            <p className="text-blue-200 text-sm leading-relaxed mb-10">
              Get instant access to your campus marketplace — shop, learn, connect and attend events all in one place.
            </p>
            <div className="space-y-4">
              {[
                { icon: "verified", label: "SafeID verified community" },
                { icon: "payments", label: "Secure Razorpay checkout" },
                { icon: "local_activity", label: "Exclusive campus events" },
                { icon: "menu_book", label: "Curated study notes" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                  </div>
                  <span className="text-blue-100 text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-[440px]">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8">
              {[STEP_1, STEP_2].map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-all"
                    style={{
                      background: step > i + 1 ? "#22c55e" : step === i + 1 ? "var(--primary)" : "#f1f5f9",
                      color: step >= i + 1 ? "white" : "var(--muted)",
                      border: step < i + 1 ? "1.5px solid var(--border-2)" : "none",
                    }}
                  >
                    {step > i + 1 ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
                  </div>
                  <span className={`text-xs font-bold truncate ${step === i + 1 ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
                  {i < 1 && <div className="flex-1 h-px" style={{ background: step > 1 ? "var(--primary)" : "var(--border)" }} />}
                </div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="h-1.5" style={{ background: "linear-gradient(90deg, var(--primary), #7c3aed)" }} />

              <div className="p-8">
                <h1 className="text-xl font-black text-slate-900 mb-1">
                  {step === 1 ? "Tell us about yourself" : "Your campus & security"}
                </h1>
                <p className="text-slate-500 text-sm mb-6">
                  {step === 1 ? "Step 1 of 2 — Basic details" : "Step 2 of 2 — Campus verification"}
                </p>

                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.form key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} onSubmit={nextStep} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" className="input-dark" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Preferably college email" className="input-dark" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 leading-none">+91</span>
                          <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value.replace(/[^0-9]/g, ""))} placeholder="10-digit number" className="input-dark h-11 w-full" style={{ paddingLeft: "3.25rem" }} maxLength={10} inputMode="numeric" required />
                        </div>
                      </div>
                      <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2" style={{ padding: "0.875rem" }}>
                        Continue <span className="material-symbols-outlined text-xl">arrow_forward</span>
                      </button>
                    </motion.form>
                  ) : (
                    <motion.form key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Campus</label>
                        <select value={form.collegeId} onChange={e => set("collegeId", e.target.value)} className="input-dark appearance-none cursor-pointer" required>
                          <option value="">Select your college</option>
                          {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student ID</label>
                        <input value={form.studentId} onChange={e => set("studentId", e.target.value)} placeholder="e.g. 21CS045" className="input-dark" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                        <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 8 characters" className="input-dark" required minLength={8} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                        <input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Repeat password" className="input-dark" required />
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button type="button" onClick={() => setStep(1)} className="btn-ghost" style={{ padding: "0.875rem 1.25rem" }}>Back</button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60" style={{ padding: "0.875rem" }}>
                          {loading ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating...</> : "Create Account"}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
                By creating an account you agree to our{" "}
                <a href="#" className="font-semibold text-blue-600 hover:underline">Terms</a> &{" "}
                <a href="#" className="font-semibold text-blue-600 hover:underline">Privacy Policy</a>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

// workaround for css var in JSX
const var_bg_3 = "var(--surface-3)";
