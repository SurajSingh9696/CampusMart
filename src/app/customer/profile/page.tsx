"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Tab = "profile" | "password";

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  campus: string;
  accountNumber: string;
  idCardNumber: string;
  notificationEmailOptIn: boolean;
};

export default function CustomerProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user;

  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [colleges, setColleges] = useState<{ _id: string; name: string }[]>([]);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: "",
    campus: "",
    accountNumber: "",
    idCardNumber: "",
    notificationEmailOptIn: true,
  });

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  function setField(key: Exclude<keyof ProfileForm, "notificationEmailOptIn">, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setPw(key: keyof typeof pwForm, value: string) {
    setPwForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let mounted = true;

    fetch("/api/colleges?active=true")
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setColleges(d.colleges || []);
      })
      .catch(() => {});

    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as {
          profile?: {
            name?: string;
            email?: string;
            phone?: string;
            campus?: string;
            accountNumber?: string;
            idCardNumber?: string;
            notificationEmailOptIn?: boolean;
          };
        };

        if (mounted) {
          setForm({
            name: data.profile?.name || user?.name || "",
            email: data.profile?.email || user?.email || "",
            phone: data.profile?.phone || "",
            campus: data.profile?.campus || user?.campus || "",
            accountNumber: data.profile?.accountNumber || user?.accountNumber || "",
            idCardNumber: data.profile?.idCardNumber || "",
            notificationEmailOptIn: data.profile?.notificationEmailOptIn ?? true,
          });
        }
      } catch {
        // Keep default values from session when request fails.
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [user?.accountNumber, user?.campus, user?.email, user?.name]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (!form.idCardNumber.trim()) {
      toast.error("Student ID is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          campus: form.campus,
          phone: form.phone,
          idCardNumber: form.idCardNumber,
          notificationEmailOptIn: form.notificationEmailOptIn,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        profile?: {
          name?: string;
          campus?: string;
          phone?: string;
          idCardNumber?: string;
          notificationEmailOptIn?: boolean;
        };
      };

      if (!response.ok) {
        toast.error(result.error || "Update failed");
        return;
      }

      setForm((prev) => ({
        ...prev,
        name: result.profile?.name || prev.name,
        campus: result.profile?.campus || prev.campus,
        phone: result.profile?.phone || prev.phone,
        idCardNumber: result.profile?.idCardNumber || prev.idCardNumber,
        notificationEmailOptIn: result.profile?.notificationEmailOptIn ?? prev.notificationEmailOptIn,
      }));

      await update({ name: form.name, campus: form.campus });
      toast.success("Profile updated!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();

    if (pwForm.next.length < 8) {
      toast.error("New password too short (min 8)");
      return;
    }

    if (pwForm.next !== pwForm.confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || "Password change failed");
        return;
      }

      toast.success("Password changed!");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account information</p>
      </div>

      <div className="card p-6 flex items-center gap-5">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl shrink-0"
          style={{ background: "linear-gradient(135deg, var(--primary), #1d4ed8)" }}
        >
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <p className="text-xl font-black text-slate-900">{form.name || user?.name}</p>
          <p className="text-slate-500 text-sm">{form.email || user?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="badge badge-primary">{form.accountNumber || user?.accountNumber || "-"}</span>
            <span className="badge badge-success">Verified</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-100">
        {(["profile", "password"] as Tab[]).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className="pb-3 px-1 text-sm font-bold capitalize transition-all relative"
            style={{ color: tab === value ? "var(--primary)" : "var(--muted)" }}
          >
            {value === "profile" ? "Edit Profile" : "Change Password"}
            {tab === value && (
              <motion.div
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "var(--primary)" }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="card p-7">
        {tab === "profile" ? (
          loadingProfile ? (
            <div className="space-y-3">
              <div className="h-10 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />
              <div className="h-10 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />
              <div className="h-10 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />
              <div className="h-10 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />
            </div>
          ) : (
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="input-dark"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    className="input-dark"
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input value={form.email || user?.email || ""} className="input-dark opacity-60 cursor-not-allowed" disabled />
                <p className="text-xs text-slate-400">Email cannot be changed</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student ID</label>
                  <input
                    value={form.idCardNumber}
                    onChange={(e) => setField("idCardNumber", e.target.value)}
                    className="input-dark"
                    placeholder="e.g. 21CS045"
                    required
                  />
                  <p className="text-xs text-slate-400">Use your latest official college roll number</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campus</label>
                  <div className="relative">
                    <select
                      value={form.campus}
                      onChange={(e) => setField("campus", e.target.value)}
                      className="input-dark appearance-none cursor-pointer w-full"
                    >
                      <option value="" disabled>Select your campus</option>
                      {colleges.length === 0 && <option value={form.campus}>{form.campus}</option>}
                      {colleges.map((c) => (
                        <option key={c._id} value={c.name} style={{ background: "var(--surface)" }}>{c.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined select-chevron">unfold_more</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Number</label>
                <input value={form.accountNumber} className="input-dark opacity-60 cursor-not-allowed" disabled />
              </div>

              <div
                className="flex items-center justify-between rounded-xl border p-4"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">Email Notifications</p>
                  <p className="text-xs text-slate-500">Receive order and activity updates on email</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.notificationEmailOptIn}
                    onChange={(e) => setForm((prev) => ({ ...prev, notificationEmailOptIn: e.target.checked }))}
                  />
                  <span className="toggle-track" />
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={changePassword} className="space-y-5">
            {[
              ["Current Password", "current", "Your current password"],
              ["New Password", "next", "Minimum 8 characters"],
              ["Confirm New Password", "confirm", "Repeat new password"],
            ].map(([label, key, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <input
                  type="password"
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPw(key as keyof typeof pwForm, e.target.value)}
                  className="input-dark"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
