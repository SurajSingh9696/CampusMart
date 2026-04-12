import Link from "next/link";

const clauses = [
  {
    title: "Account Responsibilities",
    details:
      "Users must provide accurate registration details and keep credentials secure. Misrepresentation, impersonation, or account sharing is not permitted.",
  },
  {
    title: "Marketplace Conduct",
    details:
      "All listings must be genuine and lawful. Prohibited content, abusive behavior, and fraudulent transactions can result in moderation actions.",
  },
  {
    title: "Seller Compliance",
    details:
      "Seller accounts are subject to review and approval. Product quality, delivery commitments, and payment details must remain accurate and up to date.",
  },
  {
    title: "Orders and Fulfillment",
    details:
      "Order lifecycle states are controlled through platform workflows. Attempted manipulation of order status or payment paths is strictly prohibited.",
  },
  {
    title: "Enforcement",
    details:
      "CampusMart may suspend, block, or remove access for policy violations to protect community safety and platform integrity.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 sm:px-8 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <section className="card p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">CampusMart Policies</p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Terms of Use</h1>
          <p className="mt-4 text-slate-600 max-w-3xl">
            These terms define expected behavior and operational boundaries for CampusMart users, listings, and transactions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">Back to Home</Link>
            <Link href="/safety" className="btn-ghost">Read Safety</Link>
          </div>
        </section>

        <section className="space-y-4">
          {clauses.map((clause, index) => (
            <article key={clause.title} className="card p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Clause {index + 1}</p>
              <h2 className="mt-2 text-lg font-black text-slate-900">{clause.title}</h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{clause.details}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
