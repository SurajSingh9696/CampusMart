"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const PROFILE_MAX_IMAGE_SIZE = 1024 * 1024;

type Tab = "profile" | "password" | "delete";

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  campus: string;
  accountNumber: string;
  idCardNumber: string;
  notificationEmailOptIn: boolean;
  profileImageId: string;
};

type SessionUser = {
  name?: string;
  email?: string;
  campus?: string;
  accountNumber?: string;
  profileImageId?: string;
};

export default function CustomerProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as SessionUser | undefined;

  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [updatingCampus, setUpdatingCampus] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [colleges, setColleges] = useState<{ _id: string; name: string; shortCode: string }[]>([]);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: "",
    campus: "",
    accountNumber: "",
    idCardNumber: "",
    notificationEmailOptIn: true,
    profileImageId: "",
  });

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [deleteForm, setDeleteForm] = useState({ currentPassword: "", confirmationText: "", acknowledge: false });

  function setField(key: Exclude<keyof ProfileForm, "notificationEmailOptIn">, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setPw(key: keyof typeof pwForm, value: string) {
    setPwForm((prev) => ({ ...prev, [key]: value }));
  }

  function setDeleteField(key: keyof typeof deleteForm, value: string | boolean) {
    setDeleteForm((prev) => ({ ...prev, [key]: value }));
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
            profileImageId?: string;
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
            profileImageId: data.profile?.profileImageId || user?.profileImageId || "",
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
  }, [user?.accountNumber, user?.campus, user?.email, user?.name, user?.profileImageId]);

  async function uploadProfileImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    if (file.size > PROFILE_MAX_IMAGE_SIZE) {
      toast.error("Profile image must be 1MB or less");
      return;
    }

    setUploadingAvatar(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Unable to read image file"));
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data,
          fileName: file.name,
          contentType: file.type,
          purpose: "profile_avatar",
        }),
      });

      const uploadResult = (await response.json()) as { error?: string; mediaId?: string };
      if (!response.ok || !uploadResult.mediaId) {
        toast.error(uploadResult.error || "Profile image upload failed");
        return;
      }

      const saveImageResponse = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImageId: uploadResult.mediaId }),
      });

      const saveImageResult = (await saveImageResponse.json()) as {
        error?: string;
        profile?: { profileImageId?: string };
      };

      if (!saveImageResponse.ok) {
        toast.error(saveImageResult.error || "Could not save profile image");
        return;
      }

      const nextProfileImageId = saveImageResult.profile?.profileImageId || uploadResult.mediaId;
      setForm((prev) => ({ ...prev, profileImageId: nextProfileImageId }));
      await update({ profileImageId: nextProfileImageId });
      toast.success("Profile image updated");
    } catch {
      toast.error("Unable to upload profile image");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleProfileImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void uploadProfileImage(file);
    }
    event.currentTarget.value = "";
  }

  async function updateCampusSelection(nextCampus: string) {
    const trimmedCampus = nextCampus.trim();
    const previousCampus = form.campus;

    setField("campus", trimmedCampus);
    if (!trimmedCampus) {
      toast.error("Campus is required");
      setField("campus", previousCampus);
      return;
    }

    setUpdatingCampus(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campus: trimmedCampus }),
      });

      const result = (await response.json()) as {
        error?: string;
        profile?: { campus?: string };
      };

      if (!response.ok) {
        setField("campus", previousCampus);
        toast.error(result.error || "Unable to update campus");
        return;
      }

      const persistedCampus = result.profile?.campus || trimmedCampus;
      setField("campus", persistedCampus);
      await update({ campus: persistedCampus });
      toast.success("Campus updated");
    } catch {
      setField("campus", previousCampus);
      toast.error("Unable to update campus");
    } finally {
      setUpdatingCampus(false);
    }
  }

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
          profileImageId: form.profileImageId || "",
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
          profileImageId?: string;
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
        profileImageId: result.profile?.profileImageId || prev.profileImageId,
      }));

      await update({
        name: result.profile?.name || form.name,
        campus: result.profile?.campus || form.campus,
        profileImageId: result.profile?.profileImageId || form.profileImageId || "",
      });
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

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();

    if (!deleteForm.currentPassword) {
      toast.error("Password is required to delete account");
      return;
    }

    if (!deleteForm.acknowledge || deleteForm.confirmationText.trim().toUpperCase() !== "DELETE") {
      toast.error("Confirm deletion by checking the box and typing DELETE");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: deleteForm.currentPassword,
          confirmationText: deleteForm.confirmationText,
          acknowledge: deleteForm.acknowledge,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || "Unable to delete account");
        return;
      }

      toast.success("Account deleted successfully");
      await signOut({ callbackUrl: "/auth/login" });
    } catch {
      toast.error("Unable to delete account");
    } finally {
      setSaving(false);
    }
  }

  const profileImageId = form.profileImageId || user?.profileImageId || "";
  const getCampusLabel = (campusValue: string) => {
    const match = colleges.find((college) => college.name === campusValue || college.shortCode === campusValue);
    return match?.shortCode || campusValue;
  };
  const hasSelectedCampusOption = colleges.some((college) => college.name === form.campus);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account information</p>
      </div>

      <div className="card p-6 flex items-center gap-5">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl shrink-0 overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--primary), #1d4ed8)" }}
        >
          {profileImageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/media/${profileImageId}`} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            user?.name?.charAt(0).toUpperCase() || "U"
          )}
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
        {(["profile", "password", "delete"] as Tab[]).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className="pb-3 px-1 text-sm font-bold capitalize transition-all relative"
            style={{ color: tab === value ? "var(--primary)" : "var(--muted)" }}
          >
            {value === "profile" ? "Edit Profile" : value === "password" ? "Change Password" : "Delete Account"}
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
                <input
                  value={form.email || user?.email || ""}
                  title="Registered email"
                  className="input-dark opacity-60 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-slate-400">Email cannot be changed</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Image</label>
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  title="Upload profile image"
                  onChange={handleProfileImageSelection}
                  disabled={uploadingAvatar}
                  className="hidden"
                />

                {profileImageId ? (
                  <div
                    className="rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Uploaded
                    </p>
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="btn-ghost px-3 py-2 text-xs font-bold disabled:opacity-60"
                    >
                      {uploadingAvatar ? "Uploading..." : "Change"}
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-xl border p-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="btn-ghost px-3 py-2 text-xs font-bold disabled:opacity-60"
                    >
                      {uploadingAvatar ? "Uploading..." : "Upload Image"}
                    </button>
                    <p className="mt-2 text-xs text-slate-500">Upload JPEG, PNG, or WEBP image up to 1MB.</p>
                  </div>
                )}
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
                      onChange={(e) => {
                        void updateCampusSelection(e.target.value);
                      }}
                      title="Select your campus"
                      className="input-dark appearance-none cursor-pointer w-full"
                      disabled={updatingCampus || saving}
                    >
                      <option value="" disabled>Select your campus</option>
                      {colleges.length === 0 && form.campus && <option value={form.campus}>{form.campus}</option>}
                      {colleges.length > 0 && form.campus && !hasSelectedCampusOption && (
                        <option value={form.campus}>{getCampusLabel(form.campus)}</option>
                      )}
                      {colleges.map((c) => (
                        <option key={c._id} value={c.name} style={{ background: "var(--surface)" }}>
                          {getCampusLabel(c.name)}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined select-chevron">unfold_more</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Number</label>
                <input
                  value={form.accountNumber}
                  title="Account number"
                  className="input-dark opacity-60 cursor-not-allowed"
                  disabled
                />
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
                    title="Toggle email notifications"
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
          ) : tab === "password" ? (
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
        ) : (
          <form onSubmit={deleteAccount} className="space-y-5">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-bold text-rose-700">Delete Account</p>
              <p className="mt-1 text-xs text-rose-600 leading-relaxed">
                This action permanently removes your account and cannot be undone. You will be signed out and redirected to login.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={deleteForm.currentPassword}
                onChange={(e) => setDeleteField("currentPassword", e.target.value)}
                className="input-dark"
                placeholder="Enter your current password"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type DELETE to Confirm</label>
              <input
                value={deleteForm.confirmationText}
                onChange={(e) => setDeleteField("confirmationText", e.target.value)}
                className="input-dark"
                placeholder="DELETE"
              />
            </div>

            <label className="flex items-start gap-2 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <input
                type="checkbox"
                title="Confirm permanent account deletion"
                checked={deleteForm.acknowledge}
                onChange={(e) => setDeleteField("acknowledge", e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-slate-600">
                I understand this action is permanent and my account data will be deleted.
              </span>
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {saving ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
