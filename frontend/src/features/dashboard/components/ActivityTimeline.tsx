import type { ActivityItem } from "../../../entities/dashboard/types";
import { formatRelativeDate } from "../../../shared/lib/utils";
import { SectionCard } from "./SectionCard";

interface ActivityTimelineProps {
  activity: ActivityItem[];
}

export function ActivityTimeline({ activity }: ActivityTimelineProps) {
  return (
    <SectionCard title="Recent Activity" subtitle="Latest operational updates">
      <ol className="space-y-4">
        {activity.map((item) => (
          <li key={item.id} className="relative border-l-2 border-brand-200 pl-4">
            <p className="text-sm font-semibold text-slateWarm-900">{item.title}</p>
            <p className="text-xs text-slate-500">{item.subtitle}</p>
            <p className="mt-1 text-xs font-semibold text-brand-700">{formatRelativeDate(item.occurredAt)}</p>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
