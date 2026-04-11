"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";

type College = { _id: string; name: string; shortCode: string };

const categories = [
  {
    icon: "shopping_bag",
    title: "Products",
    desc: "Buy used laptops, books, furniture, and daily student essentials from verified peers.",
    link: "/auth/login",
    cta: "Browse Products",
  },
  {
    icon: "terminal",
    title: "Projects",
    desc: "Explore software and hardware projects with source files and creator support.",
    link: "/auth/login",
    cta: "View Projects",
  },
  {
    icon: "menu_book",
    title: "Notes",
    desc: "Access curated lecture notes, exam summaries, and revision resources.",
    link: "/auth/login",
    cta: "Study Notes",
  },
  {
    icon: "local_activity",
    title: "Events",
    desc: "Book tickets for hackathons, workshops, and campus events from one dashboard.",
    link: "/auth/login",
    cta: "Explore Events",
  },
];

const stats = [
  { label: "Verified Students", value: "12K+" },
  { label: "Live Listings", value: "450+" },
  { label: "Partner Colleges", value: "4+" },
  { label: "Safe Transactions", value: "100%" },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dashboardLink = role ? `/${role}/dashboard` : "/auth/login";

  const [colleges, setColleges] = useState<College[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/colleges?active=true")
      .then((r) => r.json())
      .then((d) => setColleges(d.colleges || []));

    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen text-slate-800 overflow-x-hidden">
      <nav
        className="sticky top-0 z-50 w-full transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
          boxShadow: scrolled ? "0 8px 24px rgba(18, 48, 90, 0.08)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between py-3">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
                <span className="material-symbols-outlined text-white text-xl">handshake</span>
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900">CampusMart</span>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600 leading-none -mt-0.5">Unified Student Network</p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {["Home", "Marketplace", "How It Works", "Safety"].map((label) => (
                <a
                  key={label}
                  href={label === "Home" ? "#" : label === "How It Works" ? "#features" : "#"}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-3">
              {session ? (
                <Link href={dashboardLink} className="btn-primary flex items-center gap-2 text-sm" style={{ padding: "0.5rem 1.2rem" }}>
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2">Sign In</Link>
                  <Link href="/auth/register" className="btn-primary text-sm" style={{ padding: "0.5rem 1.2rem" }}>
                    Get Started
                  </Link>
                </>
              )}
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100">
              <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed inset-0 z-40 bg-white pt-20 px-6 flex flex-col gap-4"
          >
            {["Home", "Marketplace", "How It Works", "Safety"].map((label) => (
              <a
                key={label}
                href={label === "Home" ? "#" : label === "How It Works" ? "#features" : "#"}
                onClick={() => setMenuOpen(false)}
                className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4"
              >
                {label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-3">
              {session ? (
                <Link href={dashboardLink} className="btn-primary text-center flex items-center justify-center gap-2" onClick={() => setMenuOpen(false)}>
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="btn-ghost text-center" onClick={() => setMenuOpen(false)}>
                    Sign In
                  </Link>
                  <Link href="/auth/register" className="btn-primary text-center" onClick={() => setMenuOpen(false)}>
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="hero-gradient max-w-7xl mx-auto px-5 sm:px-8 py-14 lg:py-20 grid lg:grid-cols-2 gap-14 items-center">
        <div className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start order-2 lg:order-1">
          <div className="feature-chip">
            <span className="material-symbols-outlined text-xs">verified_user</span>
            Trusted Campus Commerce Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.06] tracking-tight text-slate-900">
            One Platform for
            <br />
            <span className="gradient-text">Every Campus Transaction.</span>
          </h1>

          <p className="text-base lg:text-lg text-slate-600 max-w-xl leading-relaxed">
            Buy, sell, learn, and participate in events with role-based portals that look and work the same across your full campus ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {session ? (
              <Link href={dashboardLink} className="btn-primary flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined text-xl">dashboard</span>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/register" className="btn-primary flex items-center justify-center gap-2 group">
                  Start for Free
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-xl">arrow_forward</span>
                </Link>
                <Link href="/auth/login" className="btn-ghost flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl">login</span>
                  Sign In
                </Link>
              </>
            )}
          </div>

          <div className="w-full max-w-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] block mb-2">Select Your Campus</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">school</span>
              <select
                className="w-full appearance-none pl-11 pr-10 py-3.5 rounded-xl text-sm font-medium text-slate-700 cursor-pointer transition-all outline-none"
                style={{ background: "white", border: "1.5px solid var(--border)", boxShadow: "0 4px 16px rgba(16,40,74,0.08)" }}
                defaultValue=""
                aria-label="Select your campus"
              >
                <option value="" disabled>Choose your campus</option>
                {colleges.length > 0 ? (
                  colleges.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)
                ) : (
                  <>
                    <option>SRMCEM</option>
                    <option>BBDITM</option>
                    <option>SRMU</option>
                  </>
                )}
              </select>
              <span className="material-symbols-outlined select-chevron">unfold_more</span>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="card-3d rounded-3xl p-6 lg:p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.title} className="rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--primary)" }}>
                    <span className="material-symbols-outlined text-white">{cat.icon}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{cat.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <p className="text-3xl font-black text-slate-900 tracking-tight">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-3">Marketplace Categories</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">All role portals follow one unified UI so customers, sellers, and admins operate in a familiar, professional workspace.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link key={cat.title} href={cat.link}>
              <div className="card p-6 h-full hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--info-bg)" }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: "var(--primary)" }}>{cat.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{cat.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{cat.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-sm font-bold" style={{ color: "var(--primary)" }}>
                  {cat.cta}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
        <div className="card p-8 lg:p-10" style={{ background: "linear-gradient(135deg, #edf4ff 0%, #f7fbff 100%)" }}>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: "person", title: "Customer Portal", desc: "Browse products, projects, notes, and events with smart search and wishlists.", link: "/auth/register/customer" },
              { icon: "storefront", title: "Seller Portal", desc: "Upload listings, manage orders, and track performance in one clean dashboard.", link: "/auth/register/seller" },
              { icon: "admin_panel_settings", title: "Admin Portal", desc: "Approve sellers, moderate listings, and govern platform operations.", link: "/auth/login" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--primary-subtle)" }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: "var(--primary)" }}>{item.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600 mt-2 mb-5">{item.desc}</p>
                <Link href={item.link} className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                  Open Portal →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: "var(--border)", background: "#f8fbff" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
              <span className="material-symbols-outlined text-white text-xl">handshake</span>
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">CampusMart</p>
              <p className="text-xs text-slate-500">A unified campus marketplace platform.</p>
            </div>
          </div>
          <div className="flex gap-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {["Privacy", "Terms", "Safety", "Support"].map((item) => (
              <a key={item} href="#" className="hover:text-slate-700 transition-colors">{item}</a>
            ))}
          </div>
          <p className="text-xs text-slate-500">© 2026 CampusMart</p>
        </div>
      </footer>
    </div>
  );
}
