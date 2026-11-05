import { useEffect, useMemo, useState } from "react";
import type {
  ChannelScheduleEntry,
  ContentSummaryItem,
  DayKey,
  DeviceHealthItem,
  PlaylistItem,
  PlaylistSummaryItem
} from "../../../entities/dashboard/types";
import { formatDayLabel, normalizeScheduleTime, toMinutes } from "../lib/schedule-utils";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SectionCard } from "./SectionCard";

interface DeviceRealtimeContentPanelProps {
  devices: DeviceHealthItem[];
  playlists: PlaylistSummaryItem[];
  contents: ContentSummaryItem[];
  onLoadChannelSchedules: (channelId: string) => Promise<ChannelScheduleEntry[]>;
  onLoadPlaylistItems: (playlistId: string) => Promise<PlaylistItem[]>;
}

interface DeviceNowPlayingRow {
  id: string;
  name: string;
  channelName: string;
  windowLabel: string;
  playlistName: string;
  playlistId: string | null;
  contents: ContentSummaryItem[];
  note: string;
}

interface ScheduleWindow {
  entry: ChannelScheduleEntry;
  startMinutes: number;
  endMinutes: number;
}

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
    .filter((window) => (window.entry.day === 0 || window.entry.day === day) && minuteOfDay >= window.startMinutes && minuteOfDay < window.endMinutes)
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

function DevicePlaybackModal({
  row,
  onClose
}: {
  row: DeviceNowPlayingRow | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [row, onClose]);

  if (!row) return null;

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
            <h3 className="text-lg font-semibold text-slateWarm-900">{row.name}</h3>
            <p className="text-xs text-slate-500">Realtime playback details for selected device</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
          >
            Close
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Channel</p>
            <p className="mt-1 text-sm font-semibold text-slateWarm-900">{row.channelName}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Active Window</p>
            <p className="mt-1 text-sm font-semibold text-slateWarm-900">{row.windowLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Playlist</p>
            <p className="mt-1 text-sm font-semibold text-slateWarm-900">{row.playlistName}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-700">{row.note}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Contents In Active Playlist
          </p>
          {row.contents.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              No content resolved for this device at current time.
            </p>
          ) : (
            <ul className="space-y-2">
              {row.contents.map((content) => (
                <li key={`${row.id}-${content.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
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
      </div>
    </div>
  );
}

export function DeviceRealtimeContentPanel({
  devices,
  playlists,
  contents,
  onLoadChannelSchedules,
  onLoadPlaylistItems
}: DeviceRealtimeContentPanelProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [reloadToken, setReloadToken] = useState(0);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingPlaylistItems, setLoadingPlaylistItems] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [schedulesByChannelId, setSchedulesByChannelId] = useState<Record<string, ChannelScheduleEntry[]>>({});
  const [playlistItemsByPlaylistId, setPlaylistItemsByPlaylistId] = useState<Record<string, PlaylistItem[]>>({});

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const activeChannelIds = useMemo(
    () =>
      Array.from(
        new Set(
          devices
            .map((device) => device.activeChannelId)
            .filter((channelId): channelId is string => Boolean(channelId))
        )
      ),
    [devices]
  );
  const activeChannelIdsKey = activeChannelIds.join("|");

  useEffect(() => {
    let cancelled = false;
    setErrorMessage(null);

    if (activeChannelIds.length === 0) {
      setSchedulesByChannelId({});
      return () => {
        cancelled = true;
      };
    }

    setLoadingSchedules(true);
    void Promise.allSettled(
      activeChannelIds.map(async (channelId) => ({
        channelId,
        entries: await onLoadChannelSchedules(channelId)
      }))
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, ChannelScheduleEntry[]> = {};
        let failedCount = 0;

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            next[result.value.channelId] = result.value.entries;
          } else {
            failedCount += 1;
          }
        });

        setSchedulesByChannelId(next);
        if (failedCount > 0) {
          setErrorMessage("Some channel schedules could not be loaded.");
        }
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingSchedules(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChannelIdsKey, onLoadChannelSchedules, reloadToken]);

  const playlistNameById = useMemo(
    () => new Map(playlists.map((playlist) => [playlist.id, playlist.name])),
    [playlists]
  );
  const contentById = useMemo(() => new Map(contents.map((content) => [content.id, content])), [contents]);

  const currentDay = browserDayKey(now);
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  const activePlaylistIds = useMemo(
    () =>
      Array.from(
        new Set(
          devices
            .map((device) => {
              if (!device.activeChannelId) return null;
              const schedules = schedulesByChannelId[device.activeChannelId] ?? [];
              const activeSchedule = resolveActiveSchedule(schedules, currentDay, currentMinute);
              return activeSchedule?.playlistId ?? null;
            })
            .filter((playlistId): playlistId is string => Boolean(playlistId))
        )
      ),
    [devices, schedulesByChannelId, currentDay, currentMinute]
  );

  const playlistItemsByPlaylistIdKey = useMemo(
    () => Object.keys(playlistItemsByPlaylistId).sort().join("|"),
    [playlistItemsByPlaylistId]
  );

  useEffect(() => {
    let cancelled = false;
    const missingPlaylistIds = activePlaylistIds.filter((playlistId) => !playlistItemsByPlaylistId[playlistId]);
    if (missingPlaylistIds.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    setLoadingPlaylistItems(true);
    void Promise.allSettled(
      missingPlaylistIds.map(async (playlistId) => ({
        playlistId,
        items: await onLoadPlaylistItems(playlistId)
      }))
    )
      .then((results) => {
        if (cancelled) return;
        const updates: Record<string, PlaylistItem[]> = {};
        let failedCount = 0;

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            updates[result.value.playlistId] = result.value.items;
          } else {
            failedCount += 1;
          }
        });

        if (Object.keys(updates).length > 0) {
          setPlaylistItemsByPlaylistId((previous) => ({ ...previous, ...updates }));
        }
        if (failedCount > 0) {
          setErrorMessage("Some playlist items could not be loaded.");
        }
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingPlaylistItems(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activePlaylistIds, onLoadPlaylistItems, playlistItemsByPlaylistIdKey, playlistItemsByPlaylistId]);

  const rows = useMemo<DeviceNowPlayingRow[]>(() => {
    return devices.map((device) => {
      if (!device.activeChannelId) {
        return {
          id: device.id,
          name: device.name,
          channelName: "Unassigned",
          windowLabel: "No channel",
          playlistName: "None",
          playlistId: null,
          contents: [],
          note: "Assign a channel to this device."
        };
      }

      const schedules = schedulesByChannelId[device.activeChannelId] ?? [];
      const hasLoadedSchedules = Object.prototype.hasOwnProperty.call(schedulesByChannelId, device.activeChannelId);
      const activeSchedule = resolveActiveSchedule(schedules, currentDay, currentMinute);

      if (!activeSchedule) {
        return {
          id: device.id,
          name: device.name,
          channelName: device.channelName,
          windowLabel: "No active schedule now",
          playlistName: "None",
          playlistId: null,
          contents: [],
          note: !hasLoadedSchedules && loadingSchedules
            ? "Loading channel schedules..."
            : schedules.length === 0
              ? "No schedules found for this channel."
              : "Current time is outside channel schedule windows."
        };
      }

      const hasLoadedPlaylistItems = Object.prototype.hasOwnProperty.call(
        playlistItemsByPlaylistId,
        activeSchedule.playlistId
      );
      const playlistItems = (playlistItemsByPlaylistId[activeSchedule.playlistId] ?? [])
        .filter((item) => item.isActive)
        .sort((left, right) => left.order - right.order);
      const resolvedContents = playlistItems
        .map((item) => contentById.get(item.contentId))
        .filter((content): content is ContentSummaryItem => Boolean(content));

      return {
        id: device.id,
        name: device.name,
        channelName: device.channelName,
        windowLabel: formatWindowLabel(activeSchedule),
        playlistName: playlistNameById.get(activeSchedule.playlistId) ?? activeSchedule.playlistId,
        playlistId: activeSchedule.playlistId,
        contents: resolvedContents,
        note: resolvedContents.length > 0
          ? "Content resolved from active playlist."
          : !hasLoadedPlaylistItems && loadingPlaylistItems
            ? "Loading playlist items..."
            : "No content items found in active playlist."
      };
    });
  }, [
    devices,
    schedulesByChannelId,
    currentDay,
    currentMinute,
    playlistItemsByPlaylistId,
    contentById,
    playlistNameById,
    loadingSchedules,
    loadingPlaylistItems
  ]);

  const columns: DataTableColumn<DeviceNowPlayingRow>[] = [
    {
      key: "device",
      header: "Device",
      cellClassName: "font-semibold text-slateWarm-900",
      render: (row) => row.name
    },
    {
      key: "channel",
      header: "Channel",
      cellClassName: "text-slate-700",
      render: (row) => row.channelName
    },
    {
      key: "window",
      header: "Active Window",
      cellClassName: "text-slate-700",
      render: (row) => row.windowLabel
    },
    {
      key: "playlist",
      header: "Playlist",
      cellClassName: "text-slate-700",
      render: (row) => row.playlistName
    },
    {
      key: "contents",
      header: "Contents Showing",
      render: (row) => {
        if (row.contents.length === 0) {
          return <span className="text-xs text-slate-500">{row.note}</span>;
        }

        return (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1.5">
              {row.contents.slice(0, 4).map((content) => (
                <span
                  key={content.id}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700"
                >
                  {content.name}
                </span>
              ))}
              {row.contents.length > 4 ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  +{row.contents.length - 4} more
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              {row.contents
                .filter((content) => content.contentType.toLowerCase() === "image" && Boolean(content.fullUrl))
                .slice(0, 2)
                .map((content) => (
                  <img
                    key={`${row.id}-${content.id}`}
                    src={content.fullUrl}
                    alt={content.name}
                    loading="lazy"
                    className="h-10 w-16 rounded border border-slate-200 object-cover"
                  />
                ))}
            </div>
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "Details",
      render: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedDeviceId(row.id);
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
        >
          View
        </button>
      )
    }
  ];

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedDeviceId) ?? null,
    [rows, selectedDeviceId]
  );

  return (
    <>
      <SectionCard
        title="Realtime Device Playback"
        subtitle={`Browser time: ${now.toLocaleString()} • Channel schedule + playlist resolution`}
        action={
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            disabled={loadingSchedules || loadingPlaylistItems}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loadingSchedules || loadingPlaylistItems ? "Refreshing..." : "Refresh Resolution"}
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setSelectedDeviceId(row.id)}
          rowClassName={() => "cursor-pointer transition hover:bg-brand-50/30"}
          emptyMessage="No devices available."
        />
        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </SectionCard>

      <DevicePlaybackModal row={selectedRow} onClose={() => setSelectedDeviceId(null)} />
    </>
  );
}
