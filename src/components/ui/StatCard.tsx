import { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  Icon: LucideIcon;
};

export function StatCard({ title, value, subtitle, Icon }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: "rgba(26,115,232,0.14)" }} />
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <span className="rounded-lg p-2" style={{ background: "var(--info-bg)", border: "1px solid rgba(26,115,232,0.16)" }}>
          <Icon className="h-4 w-4" style={{ color: "var(--primary)" }} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
