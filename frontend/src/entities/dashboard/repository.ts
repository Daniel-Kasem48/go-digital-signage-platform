import {
  httpDelete,
  httpGet,
  httpPostForm,
  httpPost,
  httpPut,
  type ProtectedApiConfig
} from "../../shared/lib/http";
import { formatRelativeDate } from "../../shared/lib/utils";
import type {
  ChannelDto,
  ChannelScheduleDto,
  ContentDto,
  DeviceDto,
  LayoutDto,
  PlaylistItemDto,
  PlaylistDto
} from "../../shared/types/api";
import type {
  ActivityItem,
  ChannelMutationInput,
  ChannelScheduleEntry,
  ChannelScheduleMutationInput,
  ChannelScheduleItem,
  DeviceRegistrationInput,
  DeviceRegistrationResult,
  ContentMediaMutationInput,
  ContentSummaryItem,
  DashboardSnapshot,
  DashboardStat,
  DeviceHealthItem,
  LayoutOption,
  LayoutMutationInput,
  PlaylistItem,
  PlaylistItemMutationInput,
  PlaylistMutationInput,
  PlaylistSummaryItem
} from "./types";

export interface DashboardRepositoryContract {
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
  getLayoutOptions(): Promise<LayoutOption[]>;
  createLayout(input: LayoutMutationInput): Promise<void>;
  updateLayout(layoutId: string, input: LayoutMutationInput): Promise<void>;
  deleteLayout(layoutId: string): Promise<void>;
  createChannel(input: ChannelMutationInput): Promise<void>;
  updateChannel(channelId: string, input: ChannelMutationInput): Promise<void>;
  publishChannel(channelId: string, deviceIds: string[]): Promise<void>;
  getChannelSchedules(channelId: string): Promise<ChannelScheduleEntry[]>;
  getPlaylistItems(playlistId: string): Promise<PlaylistItem[]>;
  replaceChannelSchedules(channelId: string, entries: ChannelScheduleMutationInput[]): Promise<void>;
  createChannelSchedule(input: ChannelScheduleMutationInput): Promise<void>;
  deleteChannelSchedule(scheduleId: string): Promise<void>;
  createPlaylist(input: PlaylistMutationInput): Promise<void>;
  updatePlaylist(playlistId: string, input: PlaylistMutationInput): Promise<void>;
  deletePlaylist(playlistId: string): Promise<void>;
  createPlaylistItem(input: PlaylistItemMutationInput): Promise<void>;
  updatePlaylistItem(playlistItemId: string, input: PlaylistItemMutationInput): Promise<void>;
  deletePlaylistItem(playlistItemId: string): Promise<void>;
  registerDeviceSimple(input: DeviceRegistrationInput): Promise<DeviceRegistrationResult>;
  createMediaContent(input: ContentMediaMutationInput): Promise<void>;
  deleteContent(contentId: string): Promise<void>;
}

const enableMockFallback = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === "true";

function toDeviceState(lastActiveAt: string | null | undefined): "online" | "idle" | "offline" {
  if (!lastActiveAt) return "offline";

  const elapsed = Date.now() - new Date(lastActiveAt).getTime();
  if (Number.isNaN(elapsed)) return "offline";
  if (elapsed < 5 * 60_000) return "online";
  if (elapsed < 30 * 60_000) return "idle";
  return "offline";
}

function fallbackName(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function normalizeDay(value: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return value >= 0 && value <= 7 ? (value as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) : 0;
}

function shortCodeFromChannelId(channelId: string): string {
  let hash = 5381;
  const source = channelId.trim().toLowerCase().split("-").join("");
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) + hash + source.charCodeAt(index)) >>> 0;
  }
  const codeNum = hash % 2176782336; // 36^6
  return codeNum.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

export class DashboardRepository implements DashboardRepositoryContract {
  constructor(private readonly config: ProtectedApiConfig) {}

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const [devicesRes, channelsRes, playlistsRes, contentsRes] = await Promise.all([
      httpGet<unknown>("/api/devices", this.config),
      httpGet<unknown>("/api/channels", this.config),
      httpGet<unknown>("/api/playlists", this.config),
      httpGet<unknown>("/api/contents", this.config)
    ]);

    if (!devicesRes.ok || !channelsRes.ok || !playlistsRes.ok || !contentsRes.ok) {
      if (enableMockFallback) {
        return this.getMockSnapshot();
      }

      const firstError = !devicesRes.ok
        ? devicesRes.error
        : !channelsRes.ok
          ? channelsRes.error
          : !playlistsRes.ok
            ? playlistsRes.error
            : !contentsRes.ok
              ? contentsRes.error
              : "Unable to load dashboard";

      throw new Error(firstError);
    }

    const devices = this.extractItems<DeviceDto>(devicesRes.data);
    const channels = this.extractItems<ChannelDto>(channelsRes.data);
    const playlists = this.extractItems<PlaylistDto>(playlistsRes.data);
    const contents = this.extractItems<ContentDto>(contentsRes.data);

    const topChannelIds = channels.slice(0, 3).map((channel) => channel.id);
    const scheduleResponses = await Promise.all(
      topChannelIds.map((channelId) =>
        httpGet<unknown>(`/api/channels/${channelId}/schedules`, this.config)
      )
    );

    const schedulesByChannel = new Map<string, number>();
    scheduleResponses.forEach((response, index) => {
      const channelId = topChannelIds[index];
      if (!channelId) return;
      if (!response.ok) {
        schedulesByChannel.set(channelId, 0);
        return;
      }

      const scheduleItems = this.extractItems<ChannelScheduleDto>(response.data);
      const scheduleCount = this.extractCount(response.data, scheduleItems.length);
      schedulesByChannel.set(channelId, scheduleCount);
    });

    const mappedDevices = this.mapDevices(devices, channels);
    const mappedChannels = this.mapChannels(channels, schedulesByChannel);
    const activity = this.mapActivity(devices, channels, playlists, contents);
    const stats = this.mapStats(
      this.extractCount(devicesRes.data, devices.length),
      this.extractCount(channelsRes.data, channels.length),
      this.extractCount(playlistsRes.data, playlists.length),
      this.extractCount(contentsRes.data, contents.length)
    );
    const mappedPlaylists = this.mapPlaylists(playlists);
    const mappedContents = this.mapContents(contents);

    return {
      source: "api",
      generatedAt: new Date().toISOString(),
      stats,
      devices: mappedDevices,
      channels: mappedChannels,
      activity,
      playlists: mappedPlaylists,
      contents: mappedContents
    };
  }

  async getLayoutOptions(): Promise<LayoutOption[]> {
    const response = await httpGet<unknown>("/api/layouts", this.config);
    if (!response.ok) {
      throw new Error(response.error);
    }

    const layouts = this.extractItems<LayoutDto>(response.data);
    return this.mapLayouts(layouts);
  }

  async createLayout(input: LayoutMutationInput): Promise<void> {
    const payload = {
      name: input.name,
      zones: input.zones
    };

    const response = await httpPost<unknown>("/api/layouts", this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async updateLayout(layoutId: string, input: LayoutMutationInput): Promise<void> {
    const payload = {
      name: input.name,
      zones: input.zones
    };

    const response = await httpPut<unknown>(`/api/layouts/${layoutId}`, this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async deleteLayout(layoutId: string): Promise<void> {
    const response = await httpDelete<unknown>(`/api/layouts/${layoutId}`, this.config);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async createChannel(input: ChannelMutationInput): Promise<void> {
    const payload: { name: string; description?: string } = {
      name: input.name
    };

    if (input.description?.trim()) {
      payload.description = input.description.trim();
    }

    const response = await httpPost<unknown>("/api/channels", this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async updateChannel(channelId: string, input: ChannelMutationInput): Promise<void> {
    const payload: { name: string; description?: string } = {
      name: input.name
    };

    if (input.description?.trim()) {
      payload.description = input.description.trim();
    }

    const response = await httpPut<unknown>(`/api/channels/${channelId}`, this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async publishChannel(channelId: string, deviceIds: string[]): Promise<void> {
    const response = await httpPost<unknown>(`/api/channels/${channelId}/publish`, this.config, {
      device_ids: deviceIds
    });
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async getChannelSchedules(channelId: string): Promise<ChannelScheduleEntry[]> {
    const response = await httpGet<unknown>(`/api/channels/${channelId}/schedules`, this.config);
    if (!response.ok) {
      throw new Error(response.error);
    }

    const schedules = this.extractItems<ChannelScheduleDto>(response.data);
    return this.mapChannelSchedules(schedules);
  }

  async getPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
    const response = await httpGet<unknown>(
      `/api/playlist-items?playlistId=${encodeURIComponent(playlistId)}`,
      this.config
    );
    if (!response.ok) {
      throw new Error(response.error);
    }

    const items = this.extractItems<PlaylistItemDto>(response.data);
    return this.mapPlaylistItems(items);
  }

  async replaceChannelSchedules(channelId: string, entries: ChannelScheduleMutationInput[]): Promise<void> {
    const payload = {
      schedules: entries.map((entry) => ({
        start_datetime: entry.startDatetime,
        end_datetime: entry.endDatetime,
        channel_id: channelId,
        playlist_id: entry.playlistId,
        day: entry.day
      }))
    };

    const response = await httpPost<unknown>(`/api/channels/${channelId}/schedules`, this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async createChannelSchedule(input: ChannelScheduleMutationInput): Promise<void> {
    const payload = {
      start_datetime: input.startDatetime,
      end_datetime: input.endDatetime,
      channel_id: input.channelId,
      playlist_id: input.playlistId,
      day: input.day
    };

    const response = await httpPost<unknown>("/api/channel-schedules", this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async deleteChannelSchedule(scheduleId: string): Promise<void> {
    const response = await httpDelete<unknown>(`/api/channel-schedules/${scheduleId}`, this.config);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async createPlaylist(input: PlaylistMutationInput): Promise<void> {
    const payload = {
      name: input.name,
      layoutId: input.layoutId
    };

    const response = await httpPost<unknown>("/api/playlists", this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async updatePlaylist(playlistId: string, input: PlaylistMutationInput): Promise<void> {
    const payload = {
      name: input.name,
      layoutId: input.layoutId
    };

    const response = await httpPut<unknown>(`/api/playlists/${playlistId}`, this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const response = await httpDelete<unknown>(`/api/playlists/${playlistId}`, this.config);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async createPlaylistItem(input: PlaylistItemMutationInput): Promise<void> {
    const payload = {
      layoutPosition: input.layoutPosition,
      timestring: input.timeString,
      isActive: input.isActive,
      contentId: input.contentId,
      playlistId: input.playlistId
    };

    const response = await httpPost<unknown>("/api/playlist-items", this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async updatePlaylistItem(playlistItemId: string, input: PlaylistItemMutationInput): Promise<void> {
    const payload = {
      order: input.order,
      layoutPosition: input.layoutPosition,
      timestring: input.timeString,
      isActive: input.isActive,
      contentId: input.contentId,
      playlistId: input.playlistId
    };

    const response = await httpPut<unknown>(`/api/playlist-items/${playlistItemId}`, this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async deletePlaylistItem(playlistItemId: string): Promise<void> {
    const response = await httpDelete<unknown>(`/api/playlist-items/${playlistItemId}`, this.config);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  async registerDeviceSimple(input: DeviceRegistrationInput): Promise<DeviceRegistrationResult> {
    const payload = {
      identifier: input.identifier?.trim() || undefined,
      name: input.name?.trim() || undefined,
      version: input.version?.trim() || undefined,
      ipAddress: input.ipAddress?.trim() || undefined
    };

    const response = await httpPost<DeviceRegistrationResult>("/public/devices/register-simple", this.config, payload);
    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data;
  }

  async createMediaContent(input: ContentMediaMutationInput): Promise<void> {
    const formData = new FormData();
    formData.append("file", input.file);

    const uploadResponse = await httpPostForm<{ objectName?: string; object_name?: string }>(
      "/api/files",
      this.config,
      formData
    );
    if (!uploadResponse.ok) {
      throw new Error(uploadResponse.error);
    }

    const objectName = uploadResponse.data.objectName ?? uploadResponse.data.object_name;
    if (!objectName) {
      throw new Error("File uploaded but object name was not returned by the server.");
    }

    const createResponse = await httpPost<unknown>("/api/contents/media", this.config, {
      name: input.name,
      content_type: input.contentType,
      temp_file_path: objectName
    });
    if (!createResponse.ok) {
      throw new Error(createResponse.error);
    }
  }

  async deleteContent(contentId: string): Promise<void> {
    const response = await httpDelete<unknown>(`/api/contents/${encodeURIComponent(contentId)}`, this.config);
    if (!response.ok) {
      throw new Error(response.error);
    }
  }

  private mapStats(
    deviceCount: number,
    channelCount: number,
    playlistCount: number,
    contentCount: number
  ): DashboardStat[] {
    return [
      {
        label: "Devices",
        value: deviceCount,
        context: "Registered screens",
        deltaLabel: "2 added this week",
        tone: "up"
      },
      {
        label: "Channels",
        value: channelCount,
        context: "Broadcast groups",
        deltaLabel: "Stable this week",
        tone: "neutral"
      },
      {
        label: "Playlists",
        value: playlistCount,
        context: "Active rotations",
        deltaLabel: "1 changed today",
        tone: "up"
      },
      {
        label: "Contents",
        value: contentCount,
        context: "Media assets",
        deltaLabel: "No failed assets",
        tone: "up"
      }
    ];
  }

  private mapDevices(devices: DeviceDto[], channels: ChannelDto[]): DeviceHealthItem[] {
    const channelMap = new Map<string, string>(
      channels.map((channel) => [channel.id, fallbackName(channel.name, "Unnamed channel")])
    );

    const mapped = devices.map((device, index) => {
      const deviceName = fallbackName(device.name, `Device ${index + 1}`);
      const state = toDeviceState(device.last_active_at ?? null);
      const channelName =
        (device.active_channel_id && channelMap.get(device.active_channel_id)) || "Unassigned";

      return {
        id: device.id,
        name: deviceName,
        activeChannelId: device.active_channel_id ?? null,
        state,
        lastSeenLabel: formatRelativeDate(device.last_active_at ?? null),
        orientation: device.orientation ?? "landscape",
        channelName
      };
    });

    return mapped;
  }

  private mapChannels(
    channels: ChannelDto[],
    schedulesByChannel: Map<string, number>
  ): ChannelScheduleItem[] {
    const cleanBaseUrl = this.config.baseUrl.replace(/\/+$/, "");
    return channels.map((channel, index) => {
      const windows = schedulesByChannel.get(channel.id) ?? 0;
      const channelName = fallbackName(channel.name, `Channel ${index + 1}`);
      const shortCode = shortCodeFromChannelId(channel.id);
      return {
        id: channel.id,
        channelName,
        description: channel.description ?? undefined,
        windows,
        status: windows > 0 ? "ready" : "needs-schedule",
        hostedUrl: `${cleanBaseUrl}/live/${encodeURIComponent(shortCode)}?t=${encodeURIComponent(this.config.tenantId)}`
      };
    });
  }

  private mapChannelSchedules(schedules: ChannelScheduleDto[]): ChannelScheduleEntry[] {
    return schedules
      .filter(
        (schedule) =>
          Boolean(schedule.id) &&
          Boolean(schedule.channel_id) &&
          Boolean(schedule.playlist_id) &&
          Boolean(schedule.start_datetime) &&
          Boolean(schedule.end_datetime)
      )
      .map((schedule) => ({
        id: schedule.id,
        channelId: schedule.channel_id ?? "",
        playlistId: schedule.playlist_id ?? "",
        day: normalizeDay(schedule.day ?? 0),
        startDatetime: schedule.start_datetime ?? "",
        endDatetime: schedule.end_datetime ?? ""
      }));
  }

  private mapPlaylists(playlists: PlaylistDto[]): PlaylistSummaryItem[] {
    return playlists.map((playlist, index) => ({
      id: playlist.id,
      name: fallbackName(playlist.name, `Playlist ${index + 1}`),
      layoutId: playlist.layout_id ?? "Unassigned"
    }));
  }

  private mapPlaylistItems(items: PlaylistItemDto[]): PlaylistItem[] {
    return items
      .filter((item) => Boolean(item.id) && Boolean(item.playlist_id) && Boolean(item.content_id))
      .map((item) => ({
        id: item.id,
        playlistId: item.playlist_id ?? "",
        contentId: item.content_id ?? "",
        order: typeof item.order === "number" ? item.order : 0,
        layoutPosition: typeof item.layout_position === "number" ? item.layout_position : 1,
        timeString: item.timestring ?? "",
        isActive: item.is_active ?? true
      }));
  }

  private mapLayouts(layouts: LayoutDto[]): LayoutOption[] {
    return layouts.map((layout, index) => ({
      id: layout.id,
      name: fallbackName(layout.name, `Layout ${index + 1}`),
      zones: layout.zones,
      createdAt: layout.created_at,
      updatedAt: layout.updated_at
    }));
  }

  private mapContents(contents: ContentDto[]): ContentSummaryItem[] {
    return contents.map((content, index) => ({
      id: content.id,
      name: fallbackName(content.name, `Asset ${index + 1}`),
      contentType: content.content_type ?? content.type ?? "unknown",
      status: content.status ?? "uploaded",
      fullUrl: content.full_url
    }));
  }

  private mapActivity(
    devices: DeviceDto[],
    channels: ChannelDto[],
    playlists: PlaylistDto[],
    contents: ContentDto[]
  ): ActivityItem[] {
    const deviceEvents = devices
      .filter((item) => item.created_at)
      .slice(0, 2)
      .map((item) => ({
        id: `device-${item.id}`,
        title: `Device added: ${fallbackName(item.name, "Unnamed device")}`,
        subtitle: "Device registration",
        occurredAt: item.created_at ?? new Date().toISOString()
      }));

    const channelEvents = channels
      .filter((item) => item.created_at)
      .slice(0, 1)
      .map((item) => ({
        id: `channel-${item.id}`,
        title: `Channel created: ${fallbackName(item.name, "Unnamed channel")}`,
        subtitle: "Channel management",
        occurredAt: item.created_at ?? new Date().toISOString()
      }));

    const playlistEvents = playlists
      .filter((item) => item.created_at)
      .slice(0, 1)
      .map((item) => ({
        id: `playlist-${item.id}`,
        title: `Playlist updated: ${fallbackName(item.name, "Unnamed playlist")}`,
        subtitle: "Playlist rotation",
        occurredAt: item.created_at ?? new Date().toISOString()
      }));

    const contentEvents = contents
      .filter((item) => item.created_at)
      .slice(0, 1)
      .map((item) => ({
        id: `content-${item.id}`,
        title: `Content uploaded: ${fallbackName(item.name, "Media asset")}`,
        subtitle: "Asset library",
        occurredAt: item.created_at ?? new Date().toISOString()
      }));

    return [...deviceEvents, ...channelEvents, ...playlistEvents, ...contentEvents]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 6);
  }

  private extractItems<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (payload && typeof payload === "object") {
      const candidate = (payload as { data?: unknown }).data;
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }

    return [];
  }

  private extractCount(payload: unknown, fallback: number): number {
    if (payload && typeof payload === "object") {
      const candidate = (payload as { count?: unknown }).count;
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
      }
    }

    return fallback;
  }

  private getMockSnapshot(): DashboardSnapshot {
    return {
      source: "mock",
      generatedAt: new Date().toISOString(),
      stats: [
        {
          label: "Devices",
          value: 14,
          context: "Registered screens",
          deltaLabel: "3 online in last 5 min",
          tone: "up"
        },
        {
          label: "Channels",
          value: 6,
          context: "Broadcast groups",
          deltaLabel: "2 pending publish",
          tone: "neutral"
        },
        {
          label: "Playlists",
          value: 12,
          context: "Active rotations",
          deltaLabel: "Morning loop updated",
          tone: "up"
        },
        {
          label: "Contents",
          value: 86,
          context: "Media assets",
          deltaLabel: "5 new uploads today",
          tone: "up"
        }
      ],
      devices: [
        {
          id: "1",
          name: "HQ Lobby",
          activeChannelId: "1",
          state: "online",
          lastSeenLabel: "2m ago",
          orientation: "landscape",
          channelName: "Corporate Feed"
        },
        {
          id: "2",
          name: "Store 42 Entrance",
          activeChannelId: "2",
          state: "idle",
          lastSeenLabel: "12m ago",
          orientation: "portrait",
          channelName: "Retail Promo"
        },
        {
          id: "3",
          name: "Warehouse C",
          activeChannelId: null,
          state: "offline",
          lastSeenLabel: "2h ago",
          orientation: "landscape",
          channelName: "Safety Notices"
        }
      ],
      channels: [
        {
          id: "1",
          channelName: "Corporate Feed",
          windows: 5,
          status: "ready"
        },
        {
          id: "2",
          channelName: "Retail Promo",
          windows: 3,
          status: "ready"
        },
        {
          id: "3",
          channelName: "Night Operations",
          windows: 0,
          status: "needs-schedule"
        }
      ],
      activity: [
        {
          id: "a1",
          title: "Playlist updated: Morning Promo Loop",
          subtitle: "Playlist rotation",
          occurredAt: new Date(Date.now() - 20 * 60_000).toISOString()
        },
        {
          id: "a2",
          title: "Device added: Store 42 Entrance",
          subtitle: "Device registration",
          occurredAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString()
        },
        {
          id: "a3",
          title: "Content uploaded: Q1 Campaign Intro",
          subtitle: "Asset library",
          occurredAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString()
        }
      ],
      playlists: [
        {
          id: "p1",
          name: "Morning Promo Loop",
          layoutId: "main-layout"
        },
        {
          id: "p2",
          name: "Safety Rotation",
          layoutId: "split-layout"
        }
      ],
      contents: [
        {
          id: "c1",
          name: "Q1 Campaign Intro",
          contentType: "video",
          status: "active"
        },
        {
          id: "c2",
          name: "Fire Exit Instruction",
          contentType: "image",
          status: "active"
        }
      ]
    };
  }
}
