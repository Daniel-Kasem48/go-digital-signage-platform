import { SectionCard } from "./SectionCard";

interface QuickActionsProps {
  onRefresh: () => Promise<void>;
}

const actionItems = [
  { id: "new-device", title: "Register Device", subtitle: "Start onboarding for a new screen" },
  { id: "new-channel", title: "Create Channel", subtitle: "Build a fresh broadcast route" },
  { id: "upload-media", title: "Upload Content", subtitle: "Push new campaign assets" }
];

export function QuickActions({ onRefresh }: QuickActionsProps) {
  return (
    <SectionCard
      title="Quick Actions"
      subtitle="Frequent operational tasks"
      action={
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
        >
          Refresh Data
        </button>
      }
    >
      <div className="grid gap-3">
        {actionItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-soft"
          >
            <p className="text-sm font-semibold text-slateWarm-900">{item.title}</p>
            <p className="text-xs text-slate-500">{item.subtitle}</p>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
