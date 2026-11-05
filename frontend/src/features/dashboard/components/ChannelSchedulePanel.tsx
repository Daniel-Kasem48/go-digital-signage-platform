import type { ChannelScheduleItem } from "../../../entities/dashboard/types";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SectionCard } from "./SectionCard";

interface ChannelSchedulePanelProps {
  channels: ChannelScheduleItem[];
  onSelectChannel?: (channelId: string) => void;
  selectedChannelId?: string | null;
}

export function ChannelSchedulePanel({ channels, onSelectChannel, selectedChannelId }: ChannelSchedulePanelProps) {
  const columns: DataTableColumn<ChannelScheduleItem>[] = [
    {
      key: "channel",
      header: "Channel",
      cellClassName: "font-semibold text-slateWarm-900",
      render: (channel) => channel.channelName
    },
    {
      key: "description",
      header: "Description",
      cellClassName: "text-slate-600",
      render: (channel) => channel.description?.trim() || "No description"
    },
    {
      key: "windows",
      header: "Windows",
      cellClassName: "text-slate-700",
      render: (channel) => `${channel.windows} window${channel.windows === 1 ? "" : "s"}`
    },
    {
      key: "status",
      header: "Status",
      render: (channel) => (
        <span
          className={
            channel.status === "ready"
              ? "pill border-emerald-200 bg-emerald-50 text-emerald-700"
              : "pill border-amber-200 bg-amber-50 text-amber-700"
          }
        >
          {channel.status === "ready" ? "Ready" : "Needs schedule"}
        </span>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: () => (
        <span className="text-xs font-semibold text-brand-700">
          Open
        </span>
      )
    }
  ];

  return (
    <SectionCard title="Channels" subtitle="Select a channel to open details">
      <DataTable
        columns={columns}
        rows={channels}
        getRowKey={(channel) => channel.id}
        emptyMessage="No channels available."
        rowClassName={(channel) =>
          onSelectChannel
            ? channel.id === selectedChannelId
              ? "cursor-pointer bg-brand-50/70 hover:bg-brand-100/70"
              : "cursor-pointer hover:bg-brand-50/60"
            : undefined
        }
        onRowClick={onSelectChannel ? (channel) => onSelectChannel(channel.id) : undefined}
      />
    </SectionCard>
  );
}
