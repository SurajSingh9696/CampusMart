"use client";

import { useState } from "react";

type Props = {
  label: string;
  purpose: string;
  required?: boolean;
  onUploaded: (mediaId: string) => void;
};

const MAX_SIZE = 500 * 1024;

export function ImageUploadField({ label, purpose, required, onUploaded }: Props) {
  const [status, setStatus] = useState("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setStatus("Only image files are allowed.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setStatus("Image must be 500KB or less.");
      return;
    }

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });

    setStatus("Uploading...");

    const response = await fetch("/api/media/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64Data,
        fileName: file.name,
        contentType: file.type,
        purpose,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      setStatus(result.error || "Upload failed.");
      return;
    }

    onUploaded(result.mediaId);
    setStatus(`Uploaded (${Math.round(result.size / 1024)}KB)`);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-white/80">
        {label} {required ? "*" : "(optional)"}
      </label>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        required={required}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
      />
      {status ? <p className="text-xs text-white/70">{status}</p> : null}
    </div>
  );
}
