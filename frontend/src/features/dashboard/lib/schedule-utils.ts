import type {
  ChannelScheduleEntry,
  ChannelScheduleMutationInput,
  DayKey,
  ScheduleDraftEntry,
  ScheduleValidationError
} from "../../../entities/dashboard/types";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const MINUTES_PER_DAY = 24 * 60;

export const DAY_OPTIONS: Array<{ value: DayKey; label: string; shortLabel: string }> = [
  { value: 0, label: "All days", shortLabel: "All" },
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
  { value: 7, label: "Sunday", shortLabel: "Sun" }
];

export function normalizeDay(value: number): DayKey {
  return value >= 0 && value <= 7 ? (value as DayKey) : 0;
}

export function formatDayLabel(day: number): string {
  return DAY_OPTIONS.find((option) => option.value === day)?.label ?? "All days";
}

export function normalizeScheduleTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (TIME_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const hhmmMatch = trimmed.match(/([01]\d|2[0-3]):([0-5]\d)/);
  if (hhmmMatch) {
    return `${hhmmMatch[1]}:${hhmmMatch[2]}`;
  }

  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return "";
}

export function toMinutes(timeValue: string): number | null {
  if (!TIME_PATTERN.test(timeValue)) {
    return null;
  }

  const [hoursString, minutesString] = timeValue.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, MINUTES_PER_DAY - 1));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function intersectsDay(dayA: DayKey, dayB: DayKey): boolean {
  if (dayA === 0 || dayB === 0) return true;
  return dayA === dayB;
}

export function sortScheduleEntries(entries: ScheduleDraftEntry[]): ScheduleDraftEntry[] {
  return [...entries].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    const aStart = toMinutes(a.startDatetime) ?? 0;
    const bStart = toMinutes(b.startDatetime) ?? 0;
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = toMinutes(a.endDatetime) ?? 0;
    const bEnd = toMinutes(b.endDatetime) ?? 0;
    if (aEnd !== bEnd) return aEnd - bEnd;
    return a.id.localeCompare(b.id);
  });
}

export function scheduleEntryToDraft(entry: ChannelScheduleEntry): ScheduleDraftEntry {
  return {
    id: entry.id,
    channelId: entry.channelId,
    playlistId: entry.playlistId,
    day: normalizeDay(entry.day),
    startDatetime: normalizeScheduleTime(entry.startDatetime),
    endDatetime: normalizeScheduleTime(entry.endDatetime)
  };
}

export function draftEntryToMutation(entry: ScheduleDraftEntry): ChannelScheduleMutationInput {
  return {
    channelId: entry.channelId,
    playlistId: entry.playlistId,
    day: entry.day,
    startDatetime: entry.startDatetime,
    endDatetime: entry.endDatetime
  };
}

export function validateScheduleEntries(entries: ScheduleDraftEntry[]): ScheduleValidationError[] {
  const errors: ScheduleValidationError[] = [];
  const invalidEntryIds = new Set<string>();

  entries.forEach((entry) => {
    if (!entry.playlistId || !entry.startDatetime || !entry.endDatetime) {
      invalidEntryIds.add(entry.id);
      errors.push({
        code: "required",
        entryId: entry.id,
        message: "Playlist, start time, and end time are required."
      });
      return;
    }

    const startMinutes = toMinutes(entry.startDatetime);
    const endMinutes = toMinutes(entry.endDatetime);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
      invalidEntryIds.add(entry.id);
      errors.push({
        code: "time-order",
        entryId: entry.id,
        message: "End time must be after start time."
      });
    }
  });

  for (let i = 0; i < entries.length; i += 1) {
    const left = entries[i];
    if (!left || invalidEntryIds.has(left.id)) continue;

    const leftStart = toMinutes(left.startDatetime);
    const leftEnd = toMinutes(left.endDatetime);
    if (leftStart === null || leftEnd === null) continue;

    for (let j = i + 1; j < entries.length; j += 1) {
      const right = entries[j];
      if (!right || invalidEntryIds.has(right.id)) continue;
      if (left.channelId !== right.channelId) continue;
      if (!intersectsDay(left.day, right.day)) continue;

      const rightStart = toMinutes(right.startDatetime);
      const rightEnd = toMinutes(right.endDatetime);
      if (rightStart === null || rightEnd === null) continue;

      const overlaps = leftStart < rightEnd && rightStart < leftEnd;
      if (!overlaps) continue;

      errors.push({
        code: "overlap",
        entryId: left.id,
        message: `Overlaps with another window on ${formatDayLabel(left.day)}.`
      });
      errors.push({
        code: "overlap",
        entryId: right.id,
        message: `Overlaps with another window on ${formatDayLabel(right.day)}.`
      });
    }
  }

  return errors;
}
