import Link from "next/link";

const supportTopics = [
  {
    title: "Account Access",
    desc: "Login issues, blocked account questions, and profile update requests.",
    cta: "Open Login",
    href: "/auth/login",
  },
  {
    title: "Seller Approval",
    desc: "Application status, verification requirements, and onboarding guidance.",
    cta: "Seller Registration",
    href: "/auth/register/seller",
  },
  {
    title: "Order and Payment",
    desc: "Order lifecycle clarifications and payment workflow troubleshooting.",
    cta: "Customer Registration",
    href: "/auth/register/customer",
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 sm:px-8 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="card p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">CampusMart Support</p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Support Center</h1>
          <p className="mt-4 text-slate-600 max-w-3xl">
            Need help with onboarding, listings, orders, or account moderation? Use the pathways below for faster resolution.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">Back to Home</Link>
            <Link href="/privacy" className="btn-ghost">Privacy</Link>
            <Link href="/terms" className="btn-ghost">Terms</Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {supportTopics.map((topic) => (
            <article key={topic.title} className="card p-6 h-full">
              <h2 className="text-lg font-black text-slate-900">{topic.title}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{topic.desc}</p>
              <Link href={topic.href} className="mt-4 inline-flex text-sm font-bold text-[var(--primary)]">
                {topic.cta} →
              </Link>
            </article>
          ))}
        </section>

        <section className="card p-6 lg:p-8">
          <h2 className="text-xl font-black text-slate-900">Policy and Safety Assistance</h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            For policy clarifications, account review concerns, or safety escalation, include your registered email, campus, and account number when reaching out from your dashboard support workflow.
          </p>
        </section>
      </div>
    </main>
  );
}
