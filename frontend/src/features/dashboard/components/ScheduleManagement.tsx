import { useEffect, useMemo, useReducer, useState, type PointerEvent as ReactPointerEvent } from "react";
import type {
  ChannelScheduleEntry,
  ChannelScheduleItem,
  ChannelScheduleMutationInput,
  DayKey,
  PlaylistSummaryItem,
  ScheduleDraftEntry
} from "../../../entities/dashboard/types";
import { SectionCard } from "./SectionCard";
import {
  DAY_OPTIONS,
  MINUTES_PER_DAY,
  draftEntryToMutation,
  formatDayLabel,
  minutesToTime,
  normalizeDay,
  normalizeScheduleTime,
  scheduleEntryToDraft,
  sortScheduleEntries,
  toMinutes,
  validateScheduleEntries
} from "../lib/schedule-utils";

interface ScheduleManagementProps {
  channels: ChannelScheduleItem[];
  playlists: PlaylistSummaryItem[];
  initialSelectedChannelId?: string | null;
  actionBusy: boolean;
  errorMessage: string | null;
  onLoadSchedules: (channelId: string) => Promise<ChannelScheduleEntry[]>;
  onSaveSchedules: (channelId: string, entries: ChannelScheduleMutationInput[]) => Promise<void>;
}

interface ScheduleEditorState {
  original: ScheduleDraftEntry[];
  draft: ScheduleDraftEntry[];
}

type ScheduleEditorAction =
  | { type: "load"; entries: ScheduleDraftEntry[] }
  | { type: "add"; entry: ScheduleDraftEntry }
  | { type: "update"; id: string; patch: Partial<ScheduleDraftEntry> }
  | { type: "remove"; id: string }
  | { type: "discard" }
  | { type: "markSaved" };

const INITIAL_STATE: ScheduleEditorState = {
  original: [],
  draft: []
};

const HOUR_ROWS = Array.from({ length: 24 }, (_, index) => index);
const WEEK_DAYS = DAY_OPTIONS.filter((option) => option.value !== 0);
const WEEKDAY_KEYS: DayKey[] = [1, 2, 3, 4, 5];
const WEEKEND_KEYS: DayKey[] = [6, 7];
const TIME_COLUMN_WIDTH_PX = 48;
const DAY_ROW_HEIGHT_PX = 52;
const STEP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
const MAX_END_MINUTES = MINUTES_PER_DAY - 1;

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  entryId: string;
  mode: DragMode;
  originDay: DayKey;
  originX: number;
  originY: number;
  timeColumnWidth: number;
  dayRowHeight: number;
  originStartMinutes: number;
  originEndMinutes: number;
}

function scheduleEditorReducer(state: ScheduleEditorState, action: ScheduleEditorAction): ScheduleEditorState {
  switch (action.type) {
    case "load":
      return {
        original: action.entries,
        draft: action.entries
      };
    case "add":
      return {
        ...state,
        draft: [...state.draft, action.entry]
      };
    case "update":
      return {
        ...state,
        draft: state.draft.map((entry) => (entry.id === action.id ? { ...entry, ...action.patch } : entry))
      };
    case "remove":
      return {
        ...state,
        draft: state.draft.filter((entry) => entry.id !== action.id)
      };
    case "discard":
      return {
        ...state,
        draft: state.original
      };
    case "markSaved":
      return {
        original: state.draft,
        draft: state.draft
      };
    default:
      return state;
  }
}

function createTempId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `draft-${crypto.randomUUID()}`;
  }

  return `draft-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function serializeForComparison(entries: ScheduleDraftEntry[]): string {
  return JSON.stringify(
    sortScheduleEntries(entries).map((entry) => ({
      channelId: entry.channelId,
      playlistId: entry.playlistId,
      day: entry.day,
      startDatetime: entry.startDatetime,
      endDatetime: entry.endDatetime
    }))
  );
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getRenderableRange(startMinutes: number | null, endMinutes: number | null): { start: number; end: number } | null {
  if (startMinutes === null || endMinutes === null) return null;
  if (endMinutes > startMinutes) return { start: startMinutes, end: endMinutes };

  // Keep invalid/zero-length rows visible so users can drag to repair them.
  return {
    start: startMinutes,
    end: Math.min(startMinutes + 60, MAX_END_MINUTES)
  };
}

export function ScheduleManagement({
  channels,
  playlists,
  initialSelectedChannelId = null,
  actionBusy,
  errorMessage,
  onLoadSchedules,
  onSaveSchedules
}: ScheduleManagementProps) {
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [composerPlaylistId, setComposerPlaylistId] = useState("");
  const [composerDay, setComposerDay] = useState<DayKey>(0);
  const [composerStart, setComposerStart] = useState("08:00");
  const [composerEnd, setComposerEnd] = useState("18:00");
  const [draftDayFilter, setDraftDayFilter] = useState<DayKey | "all">("all");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [state, dispatch] = useReducer(scheduleEditorReducer, INITIAL_STATE);

  useEffect(() => {
    if (!initialSelectedChannelId) return;
    if (!channels.some((channel) => channel.id === initialSelectedChannelId)) return;
    setSelectedChannelId(initialSelectedChannelId);
  }, [initialSelectedChannelId, channels]);

  useEffect(() => {
    if (selectedChannelId) return;
    const firstChannel = channels[0];
    if (!firstChannel) return;
    setSelectedChannelId(firstChannel.id);
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (!composerPlaylistId && playlists.length > 0) {
      const firstPlaylist = playlists[0];
      if (firstPlaylist) {
        setComposerPlaylistId(firstPlaylist.id);
      }
    }
  }, [playlists, composerPlaylistId]);

  useEffect(() => {
    let cancelled = false;
    setFlashMessage(null);

    if (!selectedChannelId) {
      dispatch({ type: "load", entries: [] });
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void onLoadSchedules(selectedChannelId)
      .then((entries) => {
        if (cancelled) return;
        dispatch({
          type: "load",
          entries: entries.map((entry) => scheduleEntryToDraft(entry))
        });
      })
      .catch(() => {
        if (cancelled) return;
        dispatch({ type: "load", entries: [] });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChannelId, onLoadSchedules]);

  const playlistNameById = useMemo(
    () => new Map(playlists.map((playlist) => [playlist.id, playlist.name])),
    [playlists]
  );
  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );
  const readyChannelsCount = useMemo(
    () => channels.filter((channel) => channel.status === "ready").length,
    [channels]
  );
  const needsScheduleCount = Math.max(channels.length - readyChannelsCount, 0);
  const nextNeedsScheduleChannel = useMemo(
    () => channels.find((channel) => channel.status !== "ready") ?? null,
    [channels]
  );

  const sortedDraft = useMemo(() => sortScheduleEntries(state.draft), [state.draft]);
  const validationErrors = useMemo(() => validateScheduleEntries(sortedDraft), [sortedDraft]);
  const entryErrorMap = useMemo(() => {
    const map = new Map<string, string>();
    validationErrors.forEach((error) => {
      if (!map.has(error.entryId)) {
        map.set(error.entryId, error.message);
      }
    });
    return map;
  }, [validationErrors]);

  const uniqueValidationMessages = useMemo(
    () => [...new Set(validationErrors.map((error) => error.message))],
    [validationErrors]
  );
  const draftErrorCount = useMemo(() => new Set(validationErrors.map((error) => error.entryId)).size, [validationErrors]);
  const filteredDraft = useMemo(
    () => sortedDraft.filter((entry) => draftDayFilter === "all" || entry.day === draftDayFilter),
    [sortedDraft, draftDayFilter]
  );

  const hasUnsavedChanges = useMemo(
    () => serializeForComparison(state.draft) !== serializeForComparison(state.original),
    [state.draft, state.original]
  );

  const allDaysEntries = useMemo(() => sortedDraft.filter((entry) => entry.day === 0), [sortedDraft]);
  const entriesByWeekDay = useMemo(() => {
    const map = new Map<DayKey, ScheduleDraftEntry[]>();
    WEEK_DAYS.forEach((day) => map.set(day.value, []));
    sortedDraft.forEach((entry) => {
      if (entry.day === 0) return;
      const list = map.get(entry.day);
      if (list) list.push(entry);
    });
    return map;
  }, [sortedDraft]);

  const canAddToDraft =
    Boolean(selectedChannelId) &&
    Boolean(composerPlaylistId) &&
    Boolean(normalizeScheduleTime(composerStart)) &&
    Boolean(normalizeScheduleTime(composerEnd));

  const canSave =
    Boolean(selectedChannelId) &&
    !loading &&
    !actionBusy &&
    hasUnsavedChanges &&
    validationErrors.length === 0;

  const addToDraft = () => {
    if (!selectedChannelId) return;
    setFlashMessage(null);
    dispatch({
      type: "add",
      entry: {
        id: createTempId(),
        channelId: selectedChannelId,
        playlistId: composerPlaylistId,
        day: composerDay,
        startDatetime: normalizeScheduleTime(composerStart),
        endDatetime: normalizeScheduleTime(composerEnd)
      }
    });
  };

  const addTemplateWindows = (days: DayKey[], start: string, end: string, label: string) => {
    if (!selectedChannelId || !composerPlaylistId) return;
    const normalizedStart = normalizeScheduleTime(start);
    const normalizedEnd = normalizeScheduleTime(end);
    if (!normalizedStart || !normalizedEnd) return;

    setFlashMessage(null);
    days.forEach((day) => {
      dispatch({
        type: "add",
        entry: {
          id: createTempId(),
          channelId: selectedChannelId,
          playlistId: composerPlaylistId,
          day,
          startDatetime: normalizedStart,
          endDatetime: normalizedEnd
        }
      });
    });
    setComposerDay(days[0] ?? 0);
    setComposerStart(normalizedStart);
    setComposerEnd(normalizedEnd);
    setFlashMessage(`Added ${label}.`);
  };

  const saveDraft = async () => {
    if (!selectedChannelId) return;
    setFlashMessage(null);

    try {
      const payload = sortScheduleEntries(state.draft).map((entry) => draftEntryToMutation(entry));
      await onSaveSchedules(selectedChannelId, payload);
      dispatch({ type: "markSaved" });
      setFlashMessage("Schedules saved.");
    } catch {
      // Surface API failure from parent error state.
    }
  };

  const discardDraft = () => {
    setFlashMessage(null);
    dispatch({ type: "discard" });
  };

  const prefillFromSlot = (day: DayKey, hour: number) => {
    const start = minutesToTime(hour * 60);
    const end = minutesToTime(Math.min(hour * 60 + 60, MINUTES_PER_DAY - 1));
    setComposerDay(day);
    setComposerStart(start);
    setComposerEnd(end);
    setFlashMessage(`Prefilled ${formatDayLabel(day)} ${start}-${end}`);
  };

  const setDurationFromStart = (durationMinutes: number) => {
    const startMinutes = toMinutes(normalizeScheduleTime(composerStart));
    if (startMinutes === null) return;
    setComposerEnd(minutesToTime(Math.min(startMinutes + durationMinutes, MINUTES_PER_DAY - 1)));
  };

  const quickAddFromSlot = (day: DayKey, hour: number) => {
    if (!selectedChannelId || !composerPlaylistId) return;

    const start = minutesToTime(hour * 60);
    const end = minutesToTime(Math.min(hour * 60 + 60, MAX_END_MINUTES));
    dispatch({
      type: "add",
      entry: {
        id: createTempId(),
        channelId: selectedChannelId,
        playlistId: composerPlaylistId,
        day,
        startDatetime: start,
        endDatetime: end
      }
    });
    setFlashMessage(`Added ${formatDayLabel(day)} ${start}-${end}.`);
  };

  const beginBlockDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    entry: ScheduleDraftEntry,
    mode: DragMode
  ) => {
    const startMinutes = toMinutes(entry.startDatetime);
    const endMinutes = toMinutes(entry.endDatetime);
    if (startMinutes === null || endMinutes === null) return;
    if (entry.day === 0) return;

    const rowElement = event.currentTarget.closest("[data-day-row]");
    const rowRect = rowElement?.getBoundingClientRect();
    const dayRowHeight = rowRect?.height ?? DAY_ROW_HEIGHT_PX;
    const timeColumnWidth = rowRect ? Math.max(rowRect.width / 24, 24) : TIME_COLUMN_WIDTH_PX;

    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some environments may reject pointer capture; window listeners still handle drag.
    }
    setFlashMessage(null);
    setDragState({
      entryId: entry.id,
      mode,
      originDay: entry.day,
      originX: event.clientX,
      originY: event.clientY,
      timeColumnWidth,
      dayRowHeight,
      originStartMinutes: startMinutes,
      originEndMinutes: endMinutes
    });
  };

  useEffect(() => {
    if (!dragState) return undefined;

    const stepPixelSize = dragState.timeColumnWidth / (60 / STEP_MINUTES);

    const onMouseMove = (event: PointerEvent) => {
      const deltaX = event.clientX - dragState.originX;
      const stepCount = Math.round(deltaX / stepPixelSize);
      const deltaMinutes = stepCount * STEP_MINUTES;
      const deltaY = event.clientY - dragState.originY;
      const dayShift = Math.round(deltaY / Math.max(dragState.dayRowHeight, 1));

      let nextStartMinutes = dragState.originStartMinutes;
      let nextEndMinutes = dragState.originEndMinutes;
      let nextDay = dragState.originDay;

      if (dragState.mode === "move") {
        const duration = dragState.originEndMinutes - dragState.originStartMinutes;
        nextStartMinutes = clamp(
          dragState.originStartMinutes + deltaMinutes,
          0,
          MAX_END_MINUTES - MIN_DURATION_MINUTES
        );
        nextEndMinutes = clamp(nextStartMinutes + duration, nextStartMinutes + MIN_DURATION_MINUTES, MAX_END_MINUTES);
        nextDay = normalizeDay(clamp(dragState.originDay + dayShift, 1, 7));
      } else if (dragState.mode === "resize-start") {
        nextStartMinutes = clamp(
          dragState.originStartMinutes + deltaMinutes,
          0,
          dragState.originEndMinutes - MIN_DURATION_MINUTES
        );
      } else {
        nextEndMinutes = clamp(
          dragState.originEndMinutes + deltaMinutes,
          dragState.originStartMinutes + MIN_DURATION_MINUTES,
          MAX_END_MINUTES
        );
      }

      dispatch({
        type: "update",
        id: dragState.entryId,
        patch: {
          day: nextDay,
          startDatetime: minutesToTime(nextStartMinutes),
          endDatetime: minutesToTime(nextEndMinutes)
        }
      });
    };

    const onMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);

    return () => {
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
    };
  }, [dragState]);

  return (
    <section className="space-y-4">
      <SectionCard title="Scheduling" subtitle="Choose a channel, build windows, and publish in one place">
        {channels.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            No channels yet. Create a channel first, then return here to schedule it.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Channel
                    </span>
                    <select
                      value={selectedChannelId}
                      onChange={(event) => {
                        setSelectedChannelId(event.target.value);
                        setFlashMessage(null);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                    >
                      <option value="">Select channel</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.channelName}
                        </option>
                      ))}
                    </select>
                  </label>
                  {nextNeedsScheduleChannel && nextNeedsScheduleChannel.id !== selectedChannelId ? (
                    <button
                      type="button"
                      onClick={() => setSelectedChannelId(nextNeedsScheduleChannel.id)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      Next Unscheduled Channel
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="pill border-slate-200 bg-white text-slate-700">{channels.length} channels</span>
                  <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">{readyChannelsCount} ready</span>
                  <span className="pill border-amber-200 bg-amber-50 text-amber-700">{needsScheduleCount} need schedule</span>
                  {hasUnsavedChanges ? (
                    <span className="pill border-amber-200 bg-amber-50 text-amber-700">Unsaved changes</span>
                  ) : (
                    <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">All changes saved</span>
                  )}
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={() => void saveDraft()}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionBusy ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    disabled={!hasUnsavedChanges || loading || actionBusy}
                    onClick={discardDraft}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Discard
                  </button>
                </div>
              </div>

              {selectedChannel ? (
                <p className="mt-2 text-sm text-slate-700">
                  Editing channel: <span className="font-semibold text-slate-900">{selectedChannel.channelName}</span>
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quick Templates</p>
                  <p className="mt-1 text-xs text-slate-500">Apply common schedules instantly for the selected playlist.</p>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      disabled={!selectedChannelId || !composerPlaylistId}
                      onClick={() => addTemplateWindows(WEEKDAY_KEYS, "08:00", "18:00", "Weekdays 08:00-18:00 template")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Weekdays 08:00 - 18:00
                    </button>
                    <button
                      type="button"
                      disabled={!selectedChannelId || !composerPlaylistId}
                      onClick={() => addTemplateWindows(WEEKEND_KEYS, "10:00", "22:00", "Weekend 10:00-22:00 template")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Weekend 10:00 - 22:00
                    </button>
                    <button
                      type="button"
                      disabled={!selectedChannelId || !composerPlaylistId}
                      onClick={() => addTemplateWindows([0], "00:00", "23:59", "24/7 all-days template")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      24/7 All Days
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Add Window</p>
                  <div className="mt-2 grid gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-500">Playlist</span>
                      <select
                        value={composerPlaylistId}
                        onChange={(event) => setComposerPlaylistId(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                      >
                        <option value="">Select playlist</option>
                        {playlists.map((playlist) => (
                          <option key={playlist.id} value={playlist.id}>
                            {playlist.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-500">Day</span>
                        <select
                          value={String(composerDay)}
                          onChange={(event) => setComposerDay(normalizeDay(Number(event.target.value)))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                        >
                          {DAY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-500">Start</span>
                          <input
                            type="time"
                            value={composerStart}
                            onChange={(event) => setComposerStart(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-500">End</span>
                          <input
                            type="time"
                            value={composerEnd}
                            onChange={(event) => setComposerEnd(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDurationFromStart(30)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationFromStart(60)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationFromStart(120)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                    >
                      +2h
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!canAddToDraft}
                    onClick={addToDraft}
                    className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add To Draft
                  </button>
                </div>

                {flashMessage ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {flashMessage}
                  </p>
                ) : null}

                {uniqueValidationMessages.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {uniqueValidationMessages.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                ) : null}

                {loading ? <p className="text-xs text-slate-500">Loading channel schedule...</p> : null}
              </aside>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Week Calendar</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Click a slot to prefill, Shift + click to add one hour, drag blocks to move or resize.
                    </p>
                  </div>

                  <div className="max-h-[62vh] overflow-auto">
                    <div className="w-full min-w-[1100px]">
                      <div
                        className="grid border-b border-slate-200 bg-slate-50"
                        style={{ gridTemplateColumns: "84px repeat(24, minmax(0, 1fr))" }}
                      >
                        <div className="sticky left-0 top-0 z-30 bg-slate-50" />
                        {HOUR_ROWS.map((hour) => (
                          <div
                            key={`hour-header-${hour}`}
                            className="sticky top-0 z-20 border-l border-slate-200 bg-slate-50 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600"
                          >
                            {hour % 2 === 0 ? formatHourLabel(hour) : ""}
                          </div>
                        ))}
                      </div>

                      <div className="divide-y divide-slate-200">
                        {WEEK_DAYS.map((day) => {
                          const dayEntries = entriesByWeekDay.get(day.value) ?? [];

                          return (
                            <div
                              key={day.value}
                              className="grid"
                              style={{ gridTemplateColumns: "84px repeat(24, minmax(0, 1fr))" }}
                            >
                              <div className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-slate-50 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                {day.shortLabel}
                              </div>

                              <div data-day-row className="relative" style={{ gridColumn: "2 / span 24" }}>
                                <div className="grid h-[52px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                                  {HOUR_ROWS.map((hour) => (
                                    <button
                                      key={`${day.value}-${hour}`}
                                      type="button"
                                      onClick={(event) => {
                                        if (event.shiftKey) {
                                          quickAddFromSlot(day.value, hour);
                                          return;
                                        }
                                        prefillFromSlot(day.value, hour);
                                      }}
                                      className="h-full border-l border-slate-100 bg-white text-left hover:bg-brand-50/60"
                                      aria-label={`Prefill ${day.label} ${formatHourLabel(hour)}`}
                                    />
                                  ))}
                                </div>

                                {allDaysEntries.map((entry) => {
                                  const startMinutes = toMinutes(entry.startDatetime);
                                  const endMinutes = toMinutes(entry.endDatetime);
                                  const range = getRenderableRange(startMinutes, endMinutes);
                                  if (!range) return null;

                                  const left = (range.start / MINUTES_PER_DAY) * 100;
                                  const width = Math.max(((range.end - range.start) / MINUTES_PER_DAY) * 100, 2);
                                  const availableWidth = Math.max(100 - left, 0);

                                  return (
                                    <div
                                      key={`global-${entry.id}-${day.value}`}
                                      style={{ left: `${left}%`, width: `${Math.min(width, availableWidth)}%` }}
                                      className="pointer-events-none absolute bottom-1 top-1 z-10 rounded-md border border-slate-300 bg-slate-200/40"
                                    />
                                  );
                                })}

                                {dayEntries.map((entry) => {
                                  const startMinutes = toMinutes(entry.startDatetime);
                                  const endMinutes = toMinutes(entry.endDatetime);
                                  const range = getRenderableRange(startMinutes, endMinutes);
                                  if (!range) return null;

                                  const left = (range.start / MINUTES_PER_DAY) * 100;
                                  const width = Math.max(((range.end - range.start) / MINUTES_PER_DAY) * 100, 2);
                                  const availableWidth = Math.max(100 - left, 0);
                                  const entryError = entryErrorMap.get(entry.id);
                                  const label = playlistNameById.get(entry.playlistId) ?? "Unknown playlist";

                                  return (
                                    <div
                                      key={entry.id}
                                      style={{ left: `${left}%`, width: `${Math.min(width, availableWidth)}%` }}
                                      className={
                                        entryError
                                          ? "absolute bottom-1 top-1 z-20 overflow-hidden rounded-md border border-amber-300 bg-amber-100 text-[10px] font-semibold text-amber-800"
                                          : "absolute bottom-1 top-1 z-20 overflow-hidden rounded-md border border-brand-300 bg-brand-100 text-[10px] font-semibold text-brand-800"
                                      }
                                    >
                                      <button
                                        type="button"
                                        title={`${label} ${entry.startDatetime}-${entry.endDatetime}`}
                                        onClick={() => {
                                          setComposerDay(day.value);
                                          setComposerPlaylistId(entry.playlistId);
                                          setComposerStart(entry.startDatetime);
                                          setComposerEnd(entry.endDatetime);
                                        }}
                                        onPointerDown={(event) => beginBlockDrag(event, entry, "move")}
                                        className="h-full w-full cursor-move px-1.5 py-1 text-left touch-none"
                                      >
                                        <p className="truncate">{label}</p>
                                        <p className="truncate text-[10px] font-medium">
                                          {entry.startDatetime} - {entry.endDatetime}
                                        </p>
                                      </button>

                                      <button
                                        type="button"
                                        onPointerDown={(event) => beginBlockDrag(event, entry, "resize-start")}
                                        className="absolute bottom-0 left-0 top-0 w-1.5 cursor-ew-resize bg-transparent touch-none"
                                        aria-label="Resize start"
                                      />
                                      <button
                                        type="button"
                                        onPointerDown={(event) => beginBlockDrag(event, entry, "resize-end")}
                                        className="absolute bottom-0 right-0 top-0 w-1.5 cursor-ew-resize bg-transparent touch-none"
                                        aria-label="Resize end"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Draft Windows</p>
                    <div className="flex items-center gap-2">
                      <span className="pill border-brand-200 bg-brand-100 text-brand-700">{sortedDraft.length} entries</span>
                      {draftErrorCount > 0 ? (
                        <span className="pill border-amber-200 bg-amber-100 text-amber-800">{draftErrorCount} issues</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraftDayFilter("all")}
                      className={
                        draftDayFilter === "all"
                          ? "rounded-md border border-brand-300 bg-brand-100 px-2 py-1 text-[11px] font-semibold text-brand-700"
                          : "rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                      }
                    >
                      All
                    </button>
                    {DAY_OPTIONS.filter((option) => option.value !== 0).map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setDraftDayFilter(day.value)}
                        className={
                          draftDayFilter === day.value
                            ? "rounded-md border border-brand-300 bg-brand-100 px-2 py-1 text-[11px] font-semibold text-brand-700"
                            : "rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                        }
                      >
                        {day.shortLabel}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[30vh] space-y-2 overflow-y-auto pr-1">
                    {filteredDraft.length === 0 ? (
                      <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                        {sortedDraft.length === 0
                          ? "No schedule windows for this channel."
                          : "No entries for the selected day filter."}
                      </p>
                    ) : (
                      filteredDraft.map((entry) => {
                        const entryError = entryErrorMap.get(entry.id);
                        return (
                          <div
                            key={entry.id}
                            className={
                              entryError
                                ? "rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
                                : "rounded-lg border border-slate-200 bg-white px-3 py-2"
                            }
                          >
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_100px_100px_88px]">
                              <select
                                value={entry.playlistId}
                                onChange={(event) => {
                                  setFlashMessage(null);
                                  dispatch({
                                    type: "update",
                                    id: entry.id,
                                    patch: { playlistId: event.target.value }
                                  });
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                              >
                                <option value="">Select playlist</option>
                                {playlists.map((playlist) => (
                                  <option key={playlist.id} value={playlist.id}>
                                    {playlist.name}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={String(entry.day)}
                                onChange={(event) => {
                                  setFlashMessage(null);
                                  dispatch({
                                    type: "update",
                                    id: entry.id,
                                    patch: { day: normalizeDay(Number(event.target.value)) }
                                  });
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                              >
                                {DAY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.shortLabel}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="time"
                                value={entry.startDatetime}
                                onChange={(event) => {
                                  setFlashMessage(null);
                                  dispatch({
                                    type: "update",
                                    id: entry.id,
                                    patch: { startDatetime: normalizeScheduleTime(event.target.value) }
                                  });
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                              />

                              <input
                                type="time"
                                value={entry.endDatetime}
                                onChange={(event) => {
                                  setFlashMessage(null);
                                  dispatch({
                                    type: "update",
                                    id: entry.id,
                                    patch: { endDatetime: normalizeScheduleTime(event.target.value) }
                                  });
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  setFlashMessage(null);
                                  dispatch({ type: "remove", id: entry.id });
                                }}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Remove
                              </button>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatDayLabel(entry.day)} • {playlistNameById.get(entry.playlistId) ?? "Unknown playlist"}
                            </p>
                            {entryError ? <p className="mt-1 text-xs font-medium text-amber-700">{entryError}</p> : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMessage}</p>
      ) : null}
    </section>
  );
}
