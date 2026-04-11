"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function RegisterChoicePage() {
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
        <Link href="/auth/login" className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">login</span> Sign In
        </Link>
      </header>

      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] px-4 py-12">
        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Create your account</h1>
          <p className="text-slate-500 text-sm">How will you mainly use CampusMart?</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {/* Student */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Link href="/auth/register/customer" className="group block">
              <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm" style={{ background: "#eff6ff" }}>
                  <span className="material-symbols-outlined text-3xl" style={{ color: "var(--primary)" }}>school</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Student / Customer</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Browse campus listings, order from verified student sellers, attend events and access study notes.
                </p>
                <ul className="space-y-2 mb-6">
                  {["Free to join","Browse all 4 categories","Instant access","SafeID verified"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="btn-primary flex items-center justify-center gap-2 group-hover:brightness-110">
                  Get Started Free
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Seller */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Link href="/auth/register/seller" className="group block">
              <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:border-violet-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full relative overflow-hidden">
                {/* Popular ribbon */}
                <div className="absolute top-5 right-0 bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1">
                  Seller Program
                </div>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm" style={{ background: "#f5f3ff" }}>
                  <span className="material-symbols-outlined text-3xl" style={{ color: "#7c3aed" }}>storefront</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Campus Seller</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Open your campus store, sell products and projects, upload study notes, host events — and earn.
                </p>
                <ul className="space-y-2 mb-6">
                  {["Zero listing fees (first month)","Revenue analytics dashboard","Auction & event ticketing","Direct Razorpay payouts"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                  Open My Store
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-blue-600 hover:underline">Sign In</Link>
        </p>
      </main>
    </div>
  );
}
