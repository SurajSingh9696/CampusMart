import Link from "next/link";

const sections = [
  {
    title: "Information We Collect",
    points: [
      "Account details such as name, email, campus, and account type.",
      "Profile and verification assets you upload for onboarding and trust.",
      "Marketplace activity including listings, orders, and support requests.",
    ],
  },
  {
    title: "How We Use Data",
    points: [
      "To operate customer, seller, and admin portal workflows.",
      "To verify account legitimacy, prevent abuse, and improve safety.",
      "To provide notifications, order updates, and platform communications.",
    ],
  },
  {
    title: "Storage and Protection",
    points: [
      "We apply role-based access controls and authentication safeguards.",
      "Data is processed for marketplace operations and legal compliance.",
      "We regularly review controls to reduce unauthorized access risk.",
    ],
  },
  {
    title: "Your Controls",
    points: [
      "You can request profile updates and correction of inaccurate details.",
      "You can contact support for account and moderation inquiries.",
      "You can review linked policy pages for platform governance terms.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 sm:px-8 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <section className="card p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">CampusMart Policies</p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-4 text-slate-600 max-w-3xl">
            This page explains what data CampusMart processes, why it is needed, and how we protect campus marketplace interactions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">Back to Home</Link>
            <Link href="/support" className="btn-ghost">Contact Support</Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="card p-6">
              <h2 className="text-lg font-black text-slate-900">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {section.points.map((point) => (
                  <li key={point} className="leading-relaxed">{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
