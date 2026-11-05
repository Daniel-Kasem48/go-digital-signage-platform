import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardRepository } from "../../entities/dashboard/repository";
import type {
  ChannelMutationInput,
  ChannelScheduleEntry,
  ChannelScheduleMutationInput,
  DeviceRegistrationInput,
  DeviceRegistrationResult,
  ContentMediaMutationInput,
  DashboardSnapshot,
  LayoutMutationInput,
  LayoutOption,
  PlaylistItem,
  PlaylistItemMutationInput,
  PlaylistMutationInput
} from "../../entities/dashboard/types";
import type { AuthSession } from "../../shared/types/auth";

interface UseDashboardDataResult {
  data: DashboardSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getLayoutOptions: () => Promise<LayoutOption[]>;
  createLayout: (input: LayoutMutationInput) => Promise<void>;
  updateLayout: (layoutId: string, input: LayoutMutationInput) => Promise<void>;
  deleteLayout: (layoutId: string) => Promise<void>;
  createChannel: (input: ChannelMutationInput) => Promise<void>;
  updateChannel: (channelId: string, input: ChannelMutationInput) => Promise<void>;
  publishChannel: (channelId: string, deviceIds: string[]) => Promise<void>;
  getChannelSchedules: (channelId: string) => Promise<ChannelScheduleEntry[]>;
  getPlaylistItems: (playlistId: string) => Promise<PlaylistItem[]>;
  replaceChannelSchedules: (channelId: string, entries: ChannelScheduleMutationInput[]) => Promise<void>;
  createChannelSchedule: (input: ChannelScheduleMutationInput) => Promise<void>;
  deleteChannelSchedule: (scheduleId: string) => Promise<void>;
  createPlaylist: (input: PlaylistMutationInput) => Promise<void>;
  updatePlaylist: (playlistId: string, input: PlaylistMutationInput) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  createPlaylistItem: (input: PlaylistItemMutationInput) => Promise<void>;
  updatePlaylistItem: (playlistItemId: string, input: PlaylistItemMutationInput) => Promise<void>;
  deletePlaylistItem: (playlistItemId: string) => Promise<void>;
  registerDeviceSimple: (input: DeviceRegistrationInput) => Promise<DeviceRegistrationResult>;
  createMediaContent: (input: ContentMediaMutationInput) => Promise<void>;
  deleteContent: (contentId: string) => Promise<void>;
}

export function useDashboardData(session: AuthSession): UseDashboardDataResult {
  const repository = useMemo(
    () =>
      new DashboardRepository({
        baseUrl: session.baseUrl,
        tenantId: session.tenantId
      }),
    [session.baseUrl, session.tenantId]
  );
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await repository.getDashboardSnapshot();
      setData(snapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    getLayoutOptions: () => repository.getLayoutOptions(),
    createLayout: (input) => repository.createLayout(input),
    updateLayout: (layoutId, input) => repository.updateLayout(layoutId, input),
    deleteLayout: (layoutId) => repository.deleteLayout(layoutId),
    createChannel: (input) => repository.createChannel(input),
    updateChannel: (channelId, input) => repository.updateChannel(channelId, input),
    publishChannel: (channelId, deviceIds) => repository.publishChannel(channelId, deviceIds),
    getChannelSchedules: (channelId) => repository.getChannelSchedules(channelId),
    getPlaylistItems: (playlistId) => repository.getPlaylistItems(playlistId),
    replaceChannelSchedules: (channelId, entries) => repository.replaceChannelSchedules(channelId, entries),
    createChannelSchedule: (input) => repository.createChannelSchedule(input),
    deleteChannelSchedule: (scheduleId) => repository.deleteChannelSchedule(scheduleId),
    createPlaylist: (input) => repository.createPlaylist(input),
    updatePlaylist: (playlistId, input) => repository.updatePlaylist(playlistId, input),
    deletePlaylist: (playlistId) => repository.deletePlaylist(playlistId),
    createPlaylistItem: (input) => repository.createPlaylistItem(input),
    updatePlaylistItem: (playlistItemId, input) => repository.updatePlaylistItem(playlistItemId, input),
    deletePlaylistItem: (playlistItemId) => repository.deletePlaylistItem(playlistItemId),
    registerDeviceSimple: (input) => repository.registerDeviceSimple(input),
    createMediaContent: (input) => repository.createMediaContent(input),
    deleteContent: (contentId) => repository.deleteContent(contentId)
  };
}
