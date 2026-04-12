import Link from "next/link";

const safetyPillars = [
  {
    icon: "verified_user",
    title: "Identity and Verification",
    desc: "Campus-linked onboarding helps ensure users and sellers are accountable within the community.",
  },
  {
    icon: "admin_panel_settings",
    title: "Moderation and Review",
    desc: "Seller applications and listing states are reviewed through controlled admin workflows.",
  },
  {
    icon: "shield",
    title: "Account Protection",
    desc: "Role-based access and blocked-account controls protect users from repeated misuse.",
  },
  {
    icon: "receipt_long",
    title: "Traceable Orders",
    desc: "Order status transitions maintain auditable records for buyers, sellers, and support teams.",
  },
];

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 sm:px-8 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="card p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">CampusMart Trust</p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Safety Standards</h1>
          <p className="mt-4 text-slate-600 max-w-3xl">
            CampusMart is designed to keep campus commerce reliable through verification, moderation, and clear transaction accountability.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">Back to Home</Link>
            <Link href="/support" className="btn-ghost">Get Help</Link>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          {safetyPillars.map((pillar) => (
            <article key={pillar.title} className="card p-6">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--info-bg)]">
                <span className="material-symbols-outlined text-[var(--primary)]">{pillar.icon}</span>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900">{pillar.title}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{pillar.desc}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
