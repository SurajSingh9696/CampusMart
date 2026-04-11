"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function BlockedPage() {
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
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            boxShadow: "0 0 40px rgba(239,68,68,0.15)",
          }}
        >
          <span className="material-symbols-outlined text-5xl text-red-400">block</span>
        </div>

        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
        >
          <span className="material-symbols-outlined text-xs">warning</span>
          Account Restricted
        </div>

        <h1 className="text-3xl font-black text-white mb-4">Your Account has been Blocked</h1>
        <p className="text-slate-400 leading-relaxed mb-6">
          Your account has been temporarily restricted by the platform admin. This may be due to
          a policy violation or pending review.
        </p>

        <div
          className="rounded-2xl p-6 mb-8 text-left"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            What to do next
          </h3>
          <ul className="text-slate-400 text-sm space-y-2 leading-relaxed">
            <li>• Contact admin support using your account number</li>
            <li>• Provide your registered email address for verification</li>
            <li>• Blocks can be appealed if applied in error</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@campusmart.in"
            className="btn-ghost flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">mail</span>
            Contact Admin Support
          </a>
          <Link href="/" className="text-slate-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
