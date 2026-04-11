"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const result = await signIn("credentials", { email: email.trim().toLowerCase(), password, redirect: false });
      if (!result) { toast.error("Authentication failed"); return; }
      if (result.error) {
        if (result.url?.includes("/pending-approval")) router.push("/pending-approval");
        else if (result.url?.includes("/blocked")) router.push("/blocked");
        else toast.error("Invalid email or password");
        return;
      }
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      toast.success("Welcome back!");
      if (session?.user?.role === "admin") router.push("/admin/dashboard");
      else if (session?.user?.role === "seller") router.push("/seller/dashboard");
      else router.push("/customer/dashboard");
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-2)" }}>
      {/* Navbar */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <span className="material-symbols-outlined text-white text-xl">handshake</span>
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">CampusMart</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          {/* Card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            {/* Top accent */}
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, var(--primary), #7c3aed)" }} />

            <div className="p-8">
              {/* Heading */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm" style={{ background: "var(--primary)" }}>
                  <span className="material-symbols-outlined text-white text-3xl">shopping_cart_checkout</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900">Welcome back</h1>
                <p className="text-slate-500 text-sm mt-1">Sign in to your campus account</p>
              </div>

              {/* Role indicator */}
              <div className="flex items-center gap-2 p-3 rounded-xl mb-6" style={{ background: "var(--info-bg)", border: "1px solid rgba(37,99,235,0.15)" }}>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--primary)" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--primary)" }} />
                </span>
                <p className="text-xs font-semibold text-blue-700">Auto-detecting role — one login for all portals</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <div className="input-icon-wrap">
                    <span className="icon-left material-symbols-outlined">alternate_email</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@college.edu" className="input-dark h-11 w-full" required autoComplete="email" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <a href="#" className="text-xs font-semibold text-blue-600 hover:underline">Forgot password?</a>
                  </div>
                  <div className="input-icon-wrap">
                    <span className="icon-left material-symbols-outlined">lock</span>
                    <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-dark pr-11 h-11 w-full" required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-xl leading-none">{showPw ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 mt-2" style={{ padding: "0.875rem" }}>
                  {loading ? (
                    <><span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Signing in...</>
                  ) : (
                    <>Sign In <span className="material-symbols-outlined text-xl">arrow_forward</span></>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-medium">New to CampusMart?</span>
                </div>
              </div>

              {/* Register buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Link href="/auth/register/customer" className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all">
                  <span className="material-symbols-outlined text-sm">person</span> As Student
                </Link>
                <Link href="/auth/register/seller" className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all">
                  <span className="material-symbols-outlined text-sm">storefront</span> As Seller
                </Link>
              </div>
            </div>

            {/* Trust strip */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-center gap-6">
              {[["verified_user","SSL Encrypted"],["group","12K+ Students"],["hub","4+ Campuses"]].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span className="material-symbols-outlined text-sm">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-center text-xs text-slate-400 mt-5 font-medium">
            © 2024 CampusMart Inc. · <a href="#" className="hover:underline">Privacy</a> · <a href="#" className="hover:underline">Terms</a>
          </p>
        </div>
      </main>
    </div>
  );
}
