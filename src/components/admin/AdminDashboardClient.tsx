"use client";

import { useState } from "react";
import { AnimatedTabs3D } from "@/components/ui/AnimatedTabs3D";
import { StatCard } from "@/components/ui/StatCard";
import { Gavel, ShieldAlert, Store, Users } from "lucide-react";

type PendingSeller = {
  _id: string;
  name: string;
  email: string;
  campus: string;
  accountNumber: string;
  idCardNumber: string;
  idCardImageId?: string;
  shop?: {
    shopName?: string;
    shopDescription?: string;
  };
};

type Props = {
  stats: {
    customers: number;
    sellers: number;
    products: number;
    projects: number;
    notes: number;
    events: number;
    soldItems: number;
  };
  pendingSellers: PendingSeller[];
};

export function AdminDashboardClient({ stats, pendingSellers }: Props) {
  const [commentById, setCommentById] = useState<Record<string, string>>({});
  const [info, setInfo] = useState("");
  const [selectionKey, setSelectionKey] = useState<"campus" | "branch" | "course" | "year" | "category">("campus");
  const [selectionValues, setSelectionValues] = useState("City Tech Institute,Engineering Tech Institute");
  const [moderateForm, setModerateForm] = useState({ userId: "", block: true, comment: "" });

  async function decide(sellerId: string, decision: "approved" | "rejected") {
    const comment = commentById[sellerId] || "Reviewed by admin team.";

    const res = await fetch("/api/admin/sellers/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, decision, comment }),
    });

    if (!res.ok) {
      setInfo("Action failed. Please retry.");
      return;
    }

    setInfo(`Seller ${decision}. Refresh to view latest queue.`);
  }

  async function saveSelections() {
    const values = selectionValues
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const res = await fetch("/api/admin/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: selectionKey, values }),
    });

    if (!res.ok) {
      setInfo("Unable to update selection values.");
      return;
    }

    setInfo(`Updated ${selectionKey} options successfully.`);
  }

  async function submitModeration() {
    const res = await fetch("/api/admin/users/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(moderateForm),
    });

    if (!res.ok) {
      setInfo("User moderation failed.");
      return;
    }

    setInfo(moderateForm.block ? "User blocked successfully." : "User unblocked successfully.");
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Customers" value={String(stats.customers)} subtitle="Registered buyers" Icon={Users} />
        <StatCard title="Sellers" value={String(stats.sellers)} subtitle="Approved + pending" Icon={Store} />
        <StatCard title="Items Sold" value={String(stats.soldItems)} subtitle="Paid orders" Icon={Gavel} />
        <StatCard title="Moderation" value={String(pendingSellers.length)} subtitle="Pending seller approvals" Icon={ShieldAlert} />
      </section>

      <AnimatedTabs3D
        tabs={[
          {
            id: "approvals",
            label: "Seller Approvals",
            content: (
              <div className="space-y-3">
                {info ? <p className="text-sm text-slate-700">{info}</p> : null}
                <div className="grid gap-3 md:grid-cols-2">
                  {pendingSellers.map((seller) => (
                    <article key={seller._id} className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      <p className="text-xs text-slate-500">{seller.accountNumber}</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">{seller.name}</h3>
                      <p className="text-sm text-slate-600">{seller.email} • {seller.campus}</p>
                      <p className="mt-2 text-sm text-slate-700">Shop: {seller.shop?.shopName || "N/A"}</p>
                      <p className="text-sm text-slate-700">ID: {seller.idCardNumber}</p>
                      <a
                        href={seller.idCardImageId ? `/api/media/${seller.idCardImageId}` : "#"}
                        target="_blank"
                        className="mt-2 inline-block text-xs"
                        style={{ color: "var(--primary)" }}
                      >
                        View ID Proof
                      </a>

                      <textarea
                        placeholder="Mandatory admin comment"
                        className="mt-3 h-20 w-full input-dark"
                        value={commentById[seller._id] || ""}
                        onChange={(e) => setCommentById((prev) => ({ ...prev, [seller._id]: e.target.value }))}
                      />

                      <div className="mt-3 flex gap-2">
                        <button onClick={() => decide(seller._id, "approved")} className="btn-primary px-3 py-2 text-xs font-semibold">
                          Approve
                        </button>
                        <button
                          onClick={() => decide(seller._id, "rejected")}
                          className="rounded-lg border px-3 py-2 text-xs text-rose-600"
                          style={{ borderColor: "#fecaca" }}
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ),
          },
          {
            id: "catalog",
            label: "Category Control",
            content: (
              <div className="space-y-3 rounded-xl p-4 text-sm text-slate-700" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <p>Update dropdown values used across the full product (comma separated).</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <select
                    value={selectionKey}
                    onChange={(e) => setSelectionKey(e.target.value as "campus" | "branch" | "course" | "year" | "category")}
                    className="input-dark"
                  >
                    <option value="campus">Campus</option>
                    <option value="branch">Branch</option>
                    <option value="course">Course</option>
                    <option value="year">Year</option>
                    <option value="category">Category</option>
                  </select>
                  <input
                    value={selectionValues}
                    onChange={(e) => setSelectionValues(e.target.value)}
                    className="md:col-span-2 input-dark"
                    placeholder="Value1,Value2,Value3"
                  />
                </div>
                <button onClick={saveSelections} className="btn-primary px-3 py-2 text-xs font-semibold">
                  Save Selection Values
                </button>
              </div>
            ),
          },
          {
            id: "governance",
            label: "Governance",
            content: (
              <div className="space-y-3 rounded-xl p-4 text-sm text-slate-700" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <p>Block or unblock any account with mandatory moderation reason.</p>
                <input
                  value={moderateForm.userId}
                  onChange={(e) => setModerateForm((prev) => ({ ...prev, userId: e.target.value }))}
                  placeholder="User ID"
                  className="input-dark"
                />
                <textarea
                  value={moderateForm.comment}
                  onChange={(e) => setModerateForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Comment"
                  className="h-20 input-dark"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModerateForm((prev) => ({ ...prev, block: true }))}
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{
                      background: moderateForm.block ? "#fee2e2" : "#f1f5f9",
                      color: moderateForm.block ? "#be123c" : "#475569",
                    }}
                  >
                    Block Mode
                  </button>
                  <button
                    onClick={() => setModerateForm((prev) => ({ ...prev, block: false }))}
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{
                      background: !moderateForm.block ? "#dcfce7" : "#f1f5f9",
                      color: !moderateForm.block ? "#166534" : "#475569",
                    }}
                  >
                    Unblock Mode
                  </button>
                  <button onClick={submitModeration} className="btn-primary px-3 py-2 text-xs font-semibold">
                    Submit Moderation
                  </button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
