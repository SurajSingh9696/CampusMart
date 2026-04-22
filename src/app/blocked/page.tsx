"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export default function BlockedPage() {
  const [queryReason, setQueryReason] = useState("");
  const { data: session } = useSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason")?.trim() || "";
    setQueryReason(reason);
  }, []);

  const blockedReason = useMemo(() => {
    if (queryReason) return queryReason;

    const fromSession = session?.user?.blockedReason?.trim();
    if (fromSession) return fromSession;

    return "No additional reason was provided. Contact support for details.";
  }, [queryReason, session?.user?.blockedReason]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animated-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 bg-red-500/10 border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <span className="material-symbols-outlined text-5xl text-red-400">block</span>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400">
          <span className="material-symbols-outlined text-xs">warning</span>
          Account Restricted
        </div>

        <h1 className="text-3xl font-black text-white mb-4">Your Account has been Blocked</h1>
        <p className="text-slate-400 leading-relaxed mb-6">
          Your account has been temporarily restricted by the platform admin. This may be due to
          a policy violation or pending review.
        </p>

        <div className="rounded-2xl p-5 mb-6 text-left bg-slate-900/35 border border-slate-400/35">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Reason from Admin</p>
          <p className="text-sm text-slate-200 leading-relaxed">{blockedReason}</p>
        </div>

        <div className="rounded-2xl p-6 mb-8 text-left bg-red-500/5 border border-red-500/20">
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
