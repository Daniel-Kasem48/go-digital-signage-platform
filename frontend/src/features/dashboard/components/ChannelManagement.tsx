import { useMemo, useState } from "react";
import type {
  ChannelMutationInput,
  ChannelScheduleItem,
  DeviceHealthItem
} from "../../../entities/dashboard/types";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SectionCard } from "./SectionCard";

interface ChannelManagementProps {
  channels: ChannelScheduleItem[];
  devices: DeviceHealthItem[];
  actionBusy: boolean;
  errorMessage: string | null;
  onOpenDetails: (channelId: string) => void;
  onCreate: (input: ChannelMutationInput) => Promise<void>;
  onUpdate: (channelId: string, input: ChannelMutationInput) => Promise<void>;
}

function ChannelFormModal({
  open,
  busy,
  title,
  subtitle,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSubmit,
  submitLabel,
  children
}: {
  open: boolean;
  busy: boolean;
  title: string;
  subtitle: string;
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 md:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slateWarm-900">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {children}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Name
            </span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
              placeholder="Channel name"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Description (optional)
            </span>
            <input
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
              placeholder="Description"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !name.trim()}
              onClick={onSubmit}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {busy ? "Working..." : submitLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChannelManagement({
  channels,
  devices,
  actionBusy,
  errorMessage,
  onOpenDetails,
  onCreate,
  onUpdate
}: ChannelManagementProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editChannelId, setEditChannelId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const channelById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels]
  );

  const assignedDeviceCountByChannel = useMemo(() => {
    const map = new Map<string, number>();
    channels.forEach((channel) => map.set(channel.id, 0));

    devices.forEach((device) => {
      if (!device.activeChannelId) return;
      const previousCount = map.get(device.activeChannelId) ?? 0;
      map.set(device.activeChannelId, previousCount + 1);
    });

    return map;
  }, [channels, devices]);

  const setEditTarget = (channelId: string) => {
    const channel = channelById.get(channelId);
    setEditChannelId(channelId);
    setEditName(channel?.channelName ?? "");
    setEditDescription(channel?.description ?? "");
  };

  const openEditModalForChannel = (channelId: string) => {
    setEditTarget(channelId);
    setIsEditModalOpen(true);
  };

  const submitCreate = async () => {
    if (!createName.trim()) return;
    await onCreate({
      name: createName.trim(),
      description: createDescription.trim() || undefined
    });
    setCreateName("");
    setCreateDescription("");
    setIsCreateModalOpen(false);
  };

  const submitEdit = async () => {
    if (!editChannelId || !editName.trim()) return;
    await onUpdate(editChannelId, {
      name: editName.trim(),
      description: editDescription.trim() || undefined
    });
    setIsEditModalOpen(false);
  };

  const channelColumns: DataTableColumn<ChannelScheduleItem>[] = useMemo(
    () => [
      {
        key: "name",
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
        render: (channel) => channel.windows
      },
      {
        key: "assigned",
        header: "Assigned Devices",
        cellClassName: "text-slate-700",
        render: (channel) => assignedDeviceCountByChannel.get(channel.id) ?? 0
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
        key: "hostedUrl",
        header: "Hosted URL",
        render: (channel) =>
          channel.hostedUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={channel.hostedUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Open
              </a>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void navigator.clipboard?.writeText(channel.hostedUrl ?? "");
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                Copy
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500">N/A</span>
          )
      },
      {
        key: "actions",
        header: "Actions",
        render: (channel) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={(event) => {
                event.stopPropagation();
                onOpenDetails(channel.id);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              Details
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={(event) => {
                event.stopPropagation();
                openEditModalForChannel(channel.id);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              Update
            </button>
          </div>
        )
      }
    ],
    [actionBusy, assignedDeviceCountByChannel, onOpenDetails]
  );

  return (
    <section className="space-y-4">
      <SectionCard
        title="Channels"
        subtitle="Create channels and open details to publish"
        action={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
          >
            Create Channel
          </button>
        }
      >
        <DataTable
          columns={channelColumns}
          rows={channels}
          getRowKey={(channel) => channel.id}
          emptyMessage="No channels available."
        />
      </SectionCard>

      <ChannelFormModal
        open={isCreateModalOpen}
        busy={actionBusy}
        title="Create Channel"
        subtitle="Create a new broadcast channel"
        name={createName}
        description={createDescription}
        onNameChange={setCreateName}
        onDescriptionChange={setCreateDescription}
        onClose={() => {
          if (actionBusy) return;
          setIsCreateModalOpen(false);
        }}
        onSubmit={() => void submitCreate()}
        submitLabel="Create Channel"
      />

      <ChannelFormModal
        open={isEditModalOpen}
        busy={actionBusy}
        title="Edit Channel"
        subtitle="Update channel name and description"
        name={editName}
        description={editDescription}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onClose={() => {
          if (actionBusy) return;
          setIsEditModalOpen(false);
        }}
        onSubmit={() => void submitEdit()}
        submitLabel="Save Changes"
      />

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
