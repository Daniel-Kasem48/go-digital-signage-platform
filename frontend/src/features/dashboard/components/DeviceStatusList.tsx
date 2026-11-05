import { useEffect, useMemo, useState } from "react";
import type {
  ChannelScheduleEntry,
  ContentSummaryItem,
  DayKey,
  DeviceHealthItem,
  PlaylistItem,
  PlaylistSummaryItem
} from "../../../entities/dashboard/types";
import { cn } from "../../../shared/lib/utils";
import { formatDayLabel, normalizeScheduleTime, toMinutes } from "../lib/schedule-utils";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SectionCard } from "./SectionCard";

interface DeviceStatusListProps {
  devices: DeviceHealthItem[];
  playlists?: PlaylistSummaryItem[];
  contents?: ContentSummaryItem[];
  onLoadChannelSchedules?: (channelId: string) => Promise<ChannelScheduleEntry[]>;
  onLoadPlaylistItems?: (playlistId: string) => Promise<PlaylistItem[]>;
}

interface ScheduleWindow {
  entry: ChannelScheduleEntry;
  startMinutes: number;
  endMinutes: number;
}

interface DeviceRealtimeDetail {
  windowLabel: string;
  playlistName: string;
  note: string;
  contents: ContentSummaryItem[];
}

const stateClass: Record<DeviceHealthItem["state"], string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-500",
  offline: "bg-slate-400"
};

function browserDayKey(date: Date): DayKey {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as DayKey;
}

function normalizeScheduleWindow(entry: ChannelScheduleEntry): ScheduleWindow | null {
  const startMinutes = toMinutes(normalizeScheduleTime(entry.startDatetime));
  const endMinutes = toMinutes(normalizeScheduleTime(entry.endDatetime));
  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
    return null;
  }

  return {
    entry,
    startMinutes,
    endMinutes
  };
}

function resolveActiveSchedule(entries: ChannelScheduleEntry[], day: DayKey, minuteOfDay: number): ChannelScheduleEntry | null {
  const active = entries
    .map(normalizeScheduleWindow)
    .filter((window): window is ScheduleWindow => Boolean(window))
    .filter(
      (window) =>
        (window.entry.day === 0 || window.entry.day === day) &&
        minuteOfDay >= window.startMinutes &&
        minuteOfDay < window.endMinutes
    )
    .sort((left, right) => {
      const leftSpecificity = left.entry.day === 0 ? 0 : 1;
      const rightSpecificity = right.entry.day === 0 ? 0 : 1;
      if (leftSpecificity !== rightSpecificity) {
        return rightSpecificity - leftSpecificity;
      }
      if (left.startMinutes !== right.startMinutes) {
        return right.startMinutes - left.startMinutes;
      }
      return left.endMinutes - right.endMinutes;
    });

  return active[0]?.entry ?? null;
}

function formatWindowLabel(entry: ChannelScheduleEntry): string {
  const start = normalizeScheduleTime(entry.startDatetime);
  const end = normalizeScheduleTime(entry.endDatetime);
  if (!start || !end) {
    return "Invalid schedule window";
  }
  return `${formatDayLabel(entry.day)} ${start}-${end}`;
}

function DeviceRealtimeModal({
  open,
  device,
  detail,
  loading,
  error,
  onClose
}: {
  open: boolean;
  device: DeviceHealthItem | null;
  detail: DeviceRealtimeDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !device) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 md:p-8" onClick={onClose} role="presentation">
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slateWarm-900">{device.name}</h3>
            <p className="text-xs text-slate-500">Realtime playback (browser time: {new Date().toLocaleString()})</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
          >
            Close
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-600">Resolving realtime playback...</p> : null}
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        ) : null}

        {!loading && !error && detail ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Channel</p>
                <p className="mt-1 text-sm font-semibold text-slateWarm-900">{device.channelName}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Active Window</p>
                <p className="mt-1 text-sm font-semibold text-slateWarm-900">{detail.windowLabel}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Playlist</p>
                <p className="mt-1 text-sm font-semibold text-slateWarm-900">{detail.playlistName}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</p>
                <p className="mt-1 text-sm text-slate-700">{detail.note}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Contents In Active Playlist
              </p>
              {detail.contents.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  No content resolved for this device at current time.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.contents.map((content) => (
                    <li key={`${device.id}-${content.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                      {content.fullUrl && content.contentType.toLowerCase() === "image" ? (
                        <img
                          src={content.fullUrl}
                          alt={content.name}
                          loading="lazy"
                          className="h-12 w-20 rounded border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          {content.contentType}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slateWarm-900">{content.name}</p>
                        <p className="text-xs text-slate-500">
                          {content.contentType} • {content.status}
                        </p>
                      </div>
                      {content.fullUrl ? (
                        <a
                          href={content.fullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                        >
                          Open URL
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function DeviceStatusList({
  devices,
  playlists = [],
  contents = [],
  onLoadChannelSchedules,
  onLoadPlaylistItems
}: DeviceStatusListProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeviceRealtimeDetail | null>(null);

  const playlistNameById = useMemo(
    () => new Map(playlists.map((playlist) => [playlist.id, playlist.name])),
    [playlists]
  );
  const contentById = useMemo(() => new Map(contents.map((content) => [content.id, content])), [contents]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  const canOpenRealtime = Boolean(onLoadChannelSchedules && onLoadPlaylistItems);

  useEffect(() => {
    let cancelled = false;
    const device = selectedDevice;
    if (!device) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const resolveRealtime = async () => {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);

      if (!onLoadChannelSchedules || !onLoadPlaylistItems) {
        setDetail({
          windowLabel: "Unavailable",
          playlistName: "Unavailable",
          note: "Realtime resolver is not configured for this view.",
          contents: []
        });
        setDetailLoading(false);
        return;
      }

      if (!device.activeChannelId) {
        setDetail({
          windowLabel: "No channel",
          playlistName: "None",
          note: "Assign a channel to this device.",
          contents: []
        });
        setDetailLoading(false);
        return;
      }

      try {
        const schedules = await onLoadChannelSchedules(device.activeChannelId);
        if (cancelled) return;

        const now = new Date();
        const day = browserDayKey(now);
        const minute = now.getHours() * 60 + now.getMinutes();
        const activeSchedule = resolveActiveSchedule(schedules, day, minute);

        if (!activeSchedule) {
          setDetail({
            windowLabel: "No active schedule now",
            playlistName: "None",
            note:
              schedules.length === 0
                ? "No schedules found for this channel."
                : "Current time is outside channel schedule windows.",
            contents: []
          });
          setDetailLoading(false);
          return;
        }

        const playlistItems = await onLoadPlaylistItems(activeSchedule.playlistId);
        if (cancelled) return;

        const resolvedContents = playlistItems
          .filter((item) => item.isActive)
          .sort((left, right) => left.order - right.order)
          .map((item) => contentById.get(item.contentId))
          .filter((content): content is ContentSummaryItem => Boolean(content));

        setDetail({
          windowLabel: formatWindowLabel(activeSchedule),
          playlistName: playlistNameById.get(activeSchedule.playlistId) ?? activeSchedule.playlistId,
          note:
            resolvedContents.length > 0
              ? "Content resolved from active playlist."
              : "No content items found in active playlist.",
          contents: resolvedContents
        });
      } catch (error) {
        if (cancelled) return;
        setDetailError(error instanceof Error ? error.message : "Unable to resolve realtime playback");
      } finally {
        if (cancelled) return;
        setDetailLoading(false);
      }
    };

    void resolveRealtime();
    return () => {
      cancelled = true;
    };
  }, [selectedDevice, onLoadChannelSchedules, onLoadPlaylistItems, contentById, playlistNameById]);

  const columns: DataTableColumn<DeviceHealthItem>[] = [
    {
      key: "device",
      header: "Device",
      cellClassName: "font-semibold text-slateWarm-900",
      render: (device) => device.name
    },
    {
      key: "channel",
      header: "Channel",
      cellClassName: "text-slate-700",
      render: (device) => device.channelName
    },
    {
      key: "orientation",
      header: "Orientation",
      cellClassName: "text-slate-700",
      render: (device) => device.orientation
    },
    {
      key: "lastSeen",
      header: "Last Seen",
      cellClassName: "text-slate-700",
      render: (device) => device.lastSeenLabel
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
  ];

  if (canOpenRealtime) {
    columns.push({
      key: "details",
      header: "Details",
      render: (device) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedDeviceId(device.id);
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
        >
          Realtime
        </button>
      )
    });
  }

  return (
    <>
      <SectionCard title="Screens" subtitle="Current screen status">
        <DataTable
          columns={columns}
          rows={devices}
          getRowKey={(device) => device.id}
          emptyMessage="No devices available."
          onRowClick={canOpenRealtime ? (device) => setSelectedDeviceId(device.id) : undefined}
          rowClassName={canOpenRealtime ? () => "cursor-pointer transition hover:bg-brand-50/30" : undefined}
        />
      </SectionCard>

      <DeviceRealtimeModal
        open={Boolean(selectedDeviceId)}
        device={selectedDevice}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        onClose={() => setSelectedDeviceId(null)}
      />
    </>
  );
}
