"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/forms/ImageUploadField";

export function CustomerRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    campus: "City Tech Institute",
    idCardNumber: "",
    profileImageId: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/register/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error?.formErrors?.[0] || result.error || "Unable to register.");
      return;
    }

    setMessage(`Registered successfully. Account Number: ${result.accountNumber}`);
    setTimeout(() => router.push("/auth/login"), 900);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        />
        <input
          placeholder="College Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          required
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          placeholder="Password"
          type="password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          required
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        />
        <input
          placeholder="ID Card Number"
          value={form.idCardNumber}
          onChange={(e) => setForm((prev) => ({ ...prev, idCardNumber: e.target.value }))}
          required
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          placeholder="Campus"
          value={form.campus}
          onChange={(e) => setForm((prev) => ({ ...prev, campus: e.target.value }))}
          required
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        />
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <ImageUploadField
            label="Profile Image"
            purpose="customer_profile"
            onUploaded={(mediaId) => setForm((prev) => ({ ...prev, profileImageId: mediaId }))}
          />
        </div>
      </div>

      {message ? <p className="text-sm text-white/80">{message}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-black disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create Customer Account"}
      </button>
    </form>
  );
}
