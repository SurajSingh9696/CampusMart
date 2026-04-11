"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type AnimatedTabs3DProps = {
  tabs: TabItem[];
  className?: string;
};

export function AnimatedTabs3D({ tabs, className = "" }: AnimatedTabs3DProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
              active === tab.id
                ? "text-blue-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
            style={
              active === tab.id
                ? {
                    background: "var(--info-bg)",
                    border: "1px solid rgba(26,115,232,0.2)",
                    boxShadow: "0 8px 20px rgba(26,115,232,0.12)",
                  }
                : {
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="relative min-h-[280px] overflow-hidden rounded-2xl p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 15% 0%, rgba(26,115,232,0.08), transparent 35%)" }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, rotateY: 24, z: -40, x: 32 }}
            animate={{ opacity: 1, rotateY: 0, z: 0, x: 0 }}
            exit={{ opacity: 0, rotateY: -24, z: -40, x: -32 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="will-change-transform"
          >
            {activeTab.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
