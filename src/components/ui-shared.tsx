import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck, ShieldAlert, Clock, Sparkles } from "lucide-react";

export type VerificationStatus =
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "CLAIMED"
  | "NOT_VERIFIED"
  | "PENDING"
  | "FAILED";

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const norm = status.toUpperCase().replace(/\s+/g, "_");

  switch (norm) {
    case "VERIFIED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-300/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 tracking-wide ${className}`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          VERIFIED
        </span>
      );
    case "PARTIALLY_VERIFIED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 tracking-wide ${className}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          PARTIALLY VERIFIED
        </span>
      );
    case "FAILED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border border-rose-300/80 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 tracking-wide ${className}`}
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          UNVERIFIED / TERMINATED
        </span>
      );
    case "PENDING":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border border-blue-300/80 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 tracking-wide ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          PENDING
        </span>
      );
    case "CLAIMED":
    case "NOT_VERIFIED":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 tracking-wide ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-stone-400 shrink-0" />
          SELF-CLAIMED
        </span>
      );
  }
}

export function RiskBadge({ riskLevel, className = "" }: { riskLevel: string; className?: string }) {
  const norm = riskLevel.toUpperCase();
  switch (norm) {
    case "LOW":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Low Risk
        </span>
      );
    case "MEDIUM":
    case "MODERATE":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Medium Risk
        </span>
      );
    case "HIGH":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
          High Risk
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600 ${className}`}>
          {riskLevel}
        </span>
      );
  }
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-stone-200/90 bg-white p-5 shadow-xs transition hover:border-stone-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-stone-400" />}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-stone-900">{value}</span>
        {badge}
      </div>
      {subtext && <p className="mt-1 text-xs text-stone-500">{subtext}</p>}
    </div>
  );
}
