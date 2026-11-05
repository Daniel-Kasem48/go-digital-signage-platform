import { useEffect, useMemo, useState } from "react";
import type { ChannelScheduleItem, DeviceHealthItem } from "../../../entities/dashboard/types";
import { cn } from "../../../shared/lib/utils";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SectionCard } from "./SectionCard";

interface ChannelDetailManagementProps {
  channel: ChannelScheduleItem;
  devices: DeviceHealthItem[];
  actionBusy: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onOpenSchedules: () => void;
  onPublish: (channelId: string, deviceIds: string[]) => Promise<void>;
}

const stateClass: Record<DeviceHealthItem["state"], string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-500",
  offline: "bg-slate-400"
};

export function ChannelDetailManagement({
  channel,
  devices,
  actionBusy,
  errorMessage,
  onBack,
  onOpenSchedules,
  onPublish
}: ChannelDetailManagementProps) {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedDeviceIds(
      devices.filter((device) => device.activeChannelId === channel.id).map((device) => device.id)
    );
  }, [devices, channel.id]);

  const toggleDevice = (deviceId: string) => {
    setSelectedDeviceIds((previous) =>
      previous.includes(deviceId) ? previous.filter((id) => id !== deviceId) : [...previous, deviceId]
    );
  };

  const selectedCount = selectedDeviceIds.length;

  const columns: DataTableColumn<DeviceHealthItem>[] = useMemo(
    () => [
      {
        key: "select",
        header: "",
        headerClassName: "w-[50px]",
        render: (device) => (
          <input
            type="checkbox"
            checked={selectedDeviceIds.includes(device.id)}
            onChange={() => toggleDevice(device.id)}
            onClick={(event) => event.stopPropagation()}
          />
        )
      },
      {
        key: "device",
        header: "Device",
        cellClassName: "font-semibold text-slateWarm-900",
        render: (device) => device.name
      },
      {
        key: "status",
        header: "Status",
        render: (device) => (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
            <span className={cn("h-2.5 w-2.5 rounded-full", stateClass[device.state])} />
            {device.state}
          </span>
        )
      },
      {
        key: "currentChannel",
        header: "Current Channel",
        cellClassName: "text-slate-700",
        render: (device) => device.channelName
      },
      {
        key: "lastSeen",
        header: "Last Seen",
        cellClassName: "text-slate-700",
        render: (device) => device.lastSeenLabel
      }
    ],
    [selectedDeviceIds]
  );

  return (
    <section className="space-y-4">
      <SectionCard
        title={`Channel: ${channel.channelName}`}
        subtitle={channel.description?.trim() || "Select screens and publish this channel"}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSchedules}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Open Schedules
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Back to Channels
            </button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Windows</p>
            <p className="mt-1 text-lg font-semibold text-slateWarm-900">{channel.windows}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p>
            <p className="mt-1 text-lg font-semibold text-slateWarm-900">
              {channel.status === "ready" ? "Ready" : "Needs schedule"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Selected Devices</p>
            <p className="mt-1 text-lg font-semibold text-slateWarm-900">{selectedCount}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Publish Channel"
        subtitle="Select devices then publish this channel"
        action={
          <button
            type="button"
            disabled={actionBusy || selectedDeviceIds.length === 0}
            onClick={() => void onPublish(channel.id, selectedDeviceIds)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {actionBusy ? "Publishing..." : "Publish To Selected"}
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={devices}
          getRowKey={(device) => device.id}
          emptyMessage="No devices available."
          onRowClick={(device) => toggleDevice(device.id)}
          rowClassName={(device) =>
            selectedDeviceIds.includes(device.id)
              ? "cursor-pointer bg-brand-50/70 hover:bg-brand-100/70"
              : "cursor-pointer hover:bg-brand-50/50"
          }
        />
      </SectionCard>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMessage}</p>
      ) : null}
    </section>
  );
}
