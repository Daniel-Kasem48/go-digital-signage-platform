import { cn } from "../../../shared/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  context: string;
  deltaLabel: string;
  tone: "up" | "neutral" | "down";
}

const toneClasses: Record<StatCardProps["tone"], string> = {
  up: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-amber-50 text-amber-700 border-amber-200",
  down: "bg-rose-50 text-rose-700 border-rose-200"
};

export function StatCard({ label, value, context, deltaLabel, tone }: StatCardProps) {
  return (
    <article className="panel-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="font-heading text-4xl font-semibold text-slateWarm-900">{value}</p>
        <span className={cn("rounded-full border px-2 py-1 text-xs font-semibold", toneClasses[tone])}>
          {deltaLabel}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{context}</p>
    </article>
  );
}
