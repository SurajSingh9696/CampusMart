"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatedTabs3D } from "@/components/ui/AnimatedTabs3D";
import { StatCard } from "@/components/ui/StatCard";
import { Activity, Package, TrendingUp, Upload } from "lucide-react";

type Listing = {
  _id: string;
  title: string;
  type: "product" | "project" | "notes" | "event";
  status: "live" | "deactivated" | "sold" | "pending_approval" | "rejected" | "draft";
  price: number;
  createdAt: string;
};

type Props = {
  listings: Listing[];
};

const chartData = [
  { week: "W1", sales: 8 },
  { week: "W2", sales: 14 },
  { week: "W3", sales: 10 },
  { week: "W4", sales: 18 },
];

export function SellerDashboardClient({ listings }: Props) {
  const [message, setMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [productForm, setProductForm] = useState({ title: "", description: "", category: "stationery", price: 0, quantity: 1 });
  const [projectForm, setProjectForm] = useState({ title: "", description: "", targetYear: "2", branch: "CSE", semester: "3", price: 0, isFree: false });
  const [noteForm, setNoteForm] = useState({ title: "", description: "", subject: "", branch: "CSE", year: "2", semester: "3", price: 0, isFree: false, pdfMediaId: "" });
  const [eventForm, setEventForm] = useState({ title: "", description: "", eventDate: "", eventTime: "18:00", ticketPrice: 0, isFree: false });

  const live = useMemo(() => listings.filter((l) => l.status === "live").length, [listings]);
  const sold = useMemo(() => listings.filter((l) => l.status === "sold").length, [listings]);
  const deactivated = useMemo(() => listings.filter((l) => l.status === "deactivated").length, [listings]);

  async function doAction(id: string, type: Listing["type"], action: "deactivate" | "activate" | "delete") {
    setMessage("");
    const res = await fetch("/api/seller/item-action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type, action }),
    });

    if (!res.ok) {
      setMessage("Action failed.");
      return;
    }

    setMessage("Action completed. Refresh for latest state.");
  }

  async function createItem(type: "product" | "project" | "notes" | "event") {
    setUploadStatus("Submitting...");

    const payload =
      type === "product"
        ? {
            ...productForm,
            tags: [],
            imageIds: [],
            condition: "good",
          }
        : type === "project"
        ? {
            ...projectForm,
            techStack: [],
            imageIds: [],
            isAuction: false,
            auctionStartPrice: 0,
          }
        : type === "notes"
        ? {
            ...noteForm,
            previewImageIds: [],
            previewPages: 2,
          }
        : {
            ...eventForm,
            eventDate: new Date(eventForm.eventDate || Date.now()).toISOString(),
            branch: ["CSE"],
            course: ["BTech"],
            years: ["2"],
            registrationQuestions: ["Name", "Branch", "Year", "Roll Number"],
            galleryImageIds: [],
          };

    const endpoint = type === "product" ? "/api/products" : type === "project" ? "/api/projects" : type === "notes" ? "/api/notes" : "/api/events";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      setUploadStatus(result.error || "Upload failed.");
      return;
    }

    setUploadStatus(`${type} submitted for admin approval.`);
  }

  const renderTable = (items: Listing[]) => (
    <div className="space-y-3">
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="min-w-full text-left text-sm">
          <thead style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="px-3 py-2 text-slate-900 font-semibold">{item.title}</td>
                <td className="px-3 py-2 capitalize text-slate-600">{item.type}</td>
                <td className="px-3 py-2 capitalize text-slate-600">{item.status}</td>
                <td className="px-3 py-2 text-slate-900 font-semibold">Rs {item.price.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => doAction(item._id, item.type, item.status === "live" ? "deactivate" : "activate")}
                      className="rounded-md border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                    >
                      {item.status === "live" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => doAction(item._id, item.type, "delete")}
                      className="rounded-md border px-2 py-1 text-xs text-rose-600"
                      style={{ borderColor: "#fecaca" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Live Listings" value={String(live)} subtitle="Visible to customers" Icon={Package} />
        <StatCard title="Sold" value={String(sold)} subtitle="Completed sales" Icon={TrendingUp} />
        <StatCard title="Deactivated" value={String(deactivated)} subtitle="Auto deactivated after 28 days" Icon={Activity} />
        <StatCard title="Uploads" value={String(listings.length)} subtitle="Products, projects, notes, events" Icon={Upload} />
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Weekly Revenue Trend</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(26,115,232,0.15)" />
              <XAxis dataKey="week" stroke="#6b819d" />
              <YAxis stroke="#6b819d" />
              <Tooltip />
              <Bar dataKey="sales" fill="#1a73e8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <AnimatedTabs3D
        tabs={[
          { id: "marketplace", label: "Marketplace", content: renderTable(listings) },
          {
            id: "uploads",
            label: "Upload Center",
            content: (
              <div className="space-y-5">
                {uploadStatus ? <p className="text-sm text-slate-700">{uploadStatus}</p> : null}
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <h3 className="font-semibold text-slate-900">Upload Product</h3>
                    <div className="mt-3 grid gap-2">
                      <input className="input-dark" placeholder="Title" value={productForm.title} onChange={(e) => setProductForm((p) => ({ ...p, title: e.target.value }))} />
                      <textarea className="h-20 input-dark" placeholder="Description" value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} />
                      <input className="input-dark" placeholder="Category" value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="input-dark" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: Number(e.target.value) }))} />
                        <input type="number" className="input-dark" placeholder="Quantity" value={productForm.quantity} onChange={(e) => setProductForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
                      </div>
                      <button onClick={() => createItem("product")} className="btn-primary px-3 py-2 text-sm font-semibold">Submit Product</button>
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <h3 className="font-semibold text-slate-900">Upload Project</h3>
                    <div className="mt-3 grid gap-2">
                      <input className="input-dark" placeholder="Title" value={projectForm.title} onChange={(e) => setProjectForm((p) => ({ ...p, title: e.target.value }))} />
                      <textarea className="h-20 input-dark" placeholder="Description" value={projectForm.description} onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))} />
                      <div className="grid grid-cols-3 gap-2">
                        <input className="input-dark" placeholder="Year" value={projectForm.targetYear} onChange={(e) => setProjectForm((p) => ({ ...p, targetYear: e.target.value }))} />
                        <input className="input-dark" placeholder="Branch" value={projectForm.branch} onChange={(e) => setProjectForm((p) => ({ ...p, branch: e.target.value }))} />
                        <input className="input-dark" placeholder="Semester" value={projectForm.semester} onChange={(e) => setProjectForm((p) => ({ ...p, semester: e.target.value }))} />
                      </div>
                      <button onClick={() => createItem("project")} className="btn-primary px-3 py-2 text-sm font-semibold">Submit Project</button>
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <h3 className="font-semibold text-slate-900">Upload Notes</h3>
                    <div className="mt-3 grid gap-2">
                      <input className="input-dark" placeholder="Title" value={noteForm.title} onChange={(e) => setNoteForm((p) => ({ ...p, title: e.target.value }))} />
                      <textarea className="h-20 input-dark" placeholder="Description" value={noteForm.description} onChange={(e) => setNoteForm((p) => ({ ...p, description: e.target.value }))} />
                      <input className="input-dark" placeholder="Subject" value={noteForm.subject} onChange={(e) => setNoteForm((p) => ({ ...p, subject: e.target.value }))} />
                      <input className="input-dark" placeholder="PDF Media ID" value={noteForm.pdfMediaId} onChange={(e) => setNoteForm((p) => ({ ...p, pdfMediaId: e.target.value }))} />
                      <button onClick={() => createItem("notes")} className="btn-primary px-3 py-2 text-sm font-semibold">Submit Notes</button>
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <h3 className="font-semibold text-slate-900">Host Event</h3>
                    <div className="mt-3 grid gap-2">
                      <input className="input-dark" placeholder="Title" value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} />
                      <textarea className="h-20 input-dark" placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="input-dark" value={eventForm.eventDate} onChange={(e) => setEventForm((p) => ({ ...p, eventDate: e.target.value }))} />
                        <input type="time" className="input-dark" value={eventForm.eventTime} onChange={(e) => setEventForm((p) => ({ ...p, eventTime: e.target.value }))} />
                      </div>
                      <button onClick={() => createItem("event")} className="btn-primary px-3 py-2 text-sm font-semibold">Submit Event</button>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "settings",
            label: "Payout + Profile",
            content: (
              <div className="space-y-3 text-sm text-slate-700">
                <p>Seller account settings must store UPI or bank details for weekly settlement.</p>
                <p>Shop profile includes logo, banner, full description, and support contact.</p>
                <p>Project auctions allow start price and end-time windows.</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
