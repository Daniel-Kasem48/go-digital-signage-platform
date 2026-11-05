export type DeviceHealthState = "online" | "idle" | "offline";

export interface DashboardStat {
  label: string;
  value: number;
  context: string;
  deltaLabel: string;
  tone: "up" | "neutral" | "down";
}

export interface DeviceHealthItem {
  id: string;
  name: string;
  activeChannelId: string | null;
  state: DeviceHealthState;
  lastSeenLabel: string;
  orientation: string;
  channelName: string;
}

export interface ChannelScheduleItem {
  id: string;
  channelName: string;
  description?: string;
  windows: number;
  status: "ready" | "needs-schedule";
  hostedUrl?: string;
}

export interface ChannelScheduleEntry {
  id: string;
  channelId: string;
  playlistId: string;
  day: DayKey;
  startDatetime: string;
  endDatetime: string;
}

export type DayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ScheduleDraftEntry {
  id: string;
  channelId: string;
  playlistId: string;
  day: DayKey;
  startDatetime: string;
  endDatetime: string;
}

export interface ScheduleValidationError {
  code: "required" | "time-order" | "overlap";
  entryId: string;
  message: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  occurredAt: string;
}

export interface PlaylistSummaryItem {
  id: string;
  name: string;
  layoutId: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  contentId: string;
  order: number;
  layoutPosition: number;
  timeString: string;
  isActive: boolean;
}

export interface PlaylistItemMutationInput {
  playlistId: string;
  contentId: string;
  layoutPosition: number;
  timeString: string;
  isActive: boolean;
  order?: number;
}

export interface LayoutOption {
  id: string;
  name: string;
  zones?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface LayoutMutationInput {
  name: string;
  zones: unknown;
}

export interface PlaylistMutationInput {
  name: string;
  layoutId: string;
}

export interface ChannelMutationInput {
  name: string;
  description?: string;
}

export interface ChannelScheduleMutationInput {
  channelId: string;
  playlistId: string;
  day: DayKey;
  startDatetime: string;
  endDatetime: string;
}

export interface ContentMediaMutationInput {
  name: string;
  contentType: "image" | "video";
  file: File;
}

export interface ContentSummaryItem {
  id: string;
  name: string;
  contentType: string;
  status: string;
  fullUrl?: string;
}

export interface DeviceRegistrationInput {
  identifier?: string;
  name?: string;
  version?: string;
  ipAddress?: string;
}

export interface DeviceRegistrationResult {
  device: {
    id: string;
    name?: string;
    code?: string;
  };
  token?: string;
  onboarding?: {
    identifier?: string;
    deviceName?: string;
    pairCode?: string;
    note?: string;
  };
}

export interface DashboardSnapshot {
  source: "api" | "mock";
  generatedAt: string;
  stats: DashboardStat[];
  devices: DeviceHealthItem[];
  channels: ChannelScheduleItem[];
  activity: ActivityItem[];
  playlists: PlaylistSummaryItem[];
  contents: ContentSummaryItem[];
}
