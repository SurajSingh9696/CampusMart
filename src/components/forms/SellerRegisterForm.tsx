"use client";

import { useState } from "react";
import { ImageUploadField } from "@/components/forms/ImageUploadField";

export function SellerRegisterForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    campus: "City Tech Institute",
    idCardNumber: "",
    idCardImageId: "",
    shopName: "",
    shopDescription: "",
    shopLogoImageId: "",
    shopBannerImageId: "",
    payoutUpi: "",
    payoutBankAccount: "",
    payoutIfsc: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.idCardImageId) {
      setMessage("Upload ID card image first (max 500KB).");
      return;
    }
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/register/seller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error?.formErrors?.[0] || result.error || "Unable to register seller.");
      return;
    }

    setMessage(
      `Seller registered. Account Number: ${result.accountNumber}. You cannot log in until admin approves within 24 hours.`
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <input placeholder="Full Name" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
        <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input placeholder="Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
        <input placeholder="Campus" required value={form.campus} onChange={(e) => setForm((p) => ({ ...p, campus: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input placeholder="ID Card Number" required value={form.idCardNumber} onChange={(e) => setForm((p) => ({ ...p, idCardNumber: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <ImageUploadField
            label="ID Card Image"
            purpose="seller_id_card"
            required
            onUploaded={(mediaId) => setForm((p) => ({ ...p, idCardImageId: mediaId }))}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input placeholder="Shop Name" required value={form.shopName} onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <ImageUploadField
            label="Shop Logo"
            purpose="seller_shop_logo"
            onUploaded={(mediaId) => setForm((p) => ({ ...p, shopLogoImageId: mediaId }))}
          />
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <ImageUploadField
          label="Shop Banner"
          purpose="seller_shop_banner"
          onUploaded={(mediaId) => setForm((p) => ({ ...p, shopBannerImageId: mediaId }))}
        />
      </div>
      <textarea placeholder="Shop Description" required minLength={20} value={form.shopDescription} onChange={(e) => setForm((p) => ({ ...p, shopDescription: e.target.value }))} className="h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <div className="grid gap-3 md:grid-cols-3">
        <input placeholder="UPI" required value={form.payoutUpi} onChange={(e) => setForm((p) => ({ ...p, payoutUpi: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
        <input placeholder="Bank Account" required value={form.payoutBankAccount} onChange={(e) => setForm((p) => ({ ...p, payoutBankAccount: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
        <input placeholder="IFSC" required value={form.payoutIfsc} onChange={(e) => setForm((p) => ({ ...p, payoutIfsc: e.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      </div>

      {message ? <p className="text-sm text-white/80">{message}</p> : null}

      <button disabled={loading} className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-black disabled:opacity-60">
        {loading ? "Submitting..." : "Submit Seller Application"}
      </button>
    </form>
  );
}
