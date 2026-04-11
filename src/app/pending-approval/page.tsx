"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animated-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            boxShadow: "0 0 40px rgba(245,158,11,0.15)",
          }}
        >
          <span className="material-symbols-outlined text-5xl text-amber-400">schedule</span>
        </div>

        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          Application Under Review
        </div>

        <h1 className="text-3xl font-black text-white mb-4">Your Seller Application is Pending</h1>
        <p className="text-slate-400 leading-relaxed mb-8">
          Our admin team is reviewing your ID verification and store details. This usually takes
          less than <strong className="text-amber-400">24 hours</strong>. You will receive an email
          once your account is approved.
        </p>

        {/* Timeline */}
        <div
          className="rounded-2xl p-6 mb-8 text-left space-y-5"
          style={{ background: "rgba(16,16,34,0.65)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {[
            { step: "Application Submitted", done: true, icon: "check_circle", color: "#22c55e" },
            { step: "Admin Review (in progress)", done: false, current: true, icon: "manage_search", color: "#f59e0b" },
            { step: "Account Activation", done: false, icon: "rocket_launch", color: "var(--muted)" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: item.done ? "rgba(34,197,94,0.15)" : item.current ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${item.done ? "rgba(34,197,94,0.3)" : item.current ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-sm font-semibold ${item.done ? "text-emerald-400" : item.current ? "text-amber-400" : "text-slate-500"}`}>
                {item.step}
              </span>
              {item.current && (
                <span className="ml-auto badge badge-warning">In Progress</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/auth/login" className="btn-ghost flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">login</span>
            Check Application Status
          </Link>
          <Link href="/" className="text-slate-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
