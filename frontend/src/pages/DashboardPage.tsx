import { useCallback, useEffect, useState } from "react";
import Joyride, { EVENTS, STATUS, type CallBackProps, type Step } from "react-joyride";
import { AppShell } from "../app/layout/AppShell";
import { type DashboardTab, isDashboardTab } from "../app/layout/navigation";
import { useAuth } from "../app/providers/AuthProvider";
import { ChannelDetailManagement } from "../features/dashboard/components/ChannelDetailManagement";
import { ChannelManagement } from "../features/dashboard/components/ChannelManagement";
import { DataTable, type DataTableColumn } from "../features/dashboard/components/DataTable";
import { DeviceStatusList } from "../features/dashboard/components/DeviceStatusList";
import { LayoutManagement } from "../features/dashboard/components/LayoutManagement";
import { PlaylistManagement } from "../features/dashboard/components/PlaylistManagement";
import { ScheduleManagement } from "../features/dashboard/components/ScheduleManagement";
import { SectionCard } from "../features/dashboard/components/SectionCard";
import { StatCard } from "../features/dashboard/components/StatCard";
import { useDashboardData } from "../features/dashboard/useDashboardData";
import type {
  ChannelScheduleEntry,
  ChannelScheduleMutationInput,
  ContentMediaMutationInput,
  DeviceRegistrationResult,
  PlaylistItemMutationInput,
  ContentSummaryItem,
  LayoutMutationInput,
  LayoutOption,
  PlaylistItem
} from "../entities/dashboard/types";
import type { AuthSession } from "../shared/types/auth";

function readTabFromHash(): DashboardTab {
  if (typeof window === "undefined") return "overview";
  const hashValue = window.location.hash.replace(/^#/, "");
  const primarySegment = hashValue.split("/")[0] ?? "";
  return isDashboardTab(primarySegment) ? primarySegment : "overview";
}

function readChannelIdFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hashValue = window.location.hash.replace(/^#/, "");
  const [primarySegment, ...restSegments] = hashValue.split("/");
  if (primarySegment !== "channels" || restSegments.length === 0) return null;
  const joined = restSegments.join("/").trim();
  return joined ? decodeURIComponent(joined) : null;
}

function readScheduleChannelIdFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hashValue = window.location.hash.replace(/^#/, "");
  const [primarySegment, ...restSegments] = hashValue.split("/");
  if (primarySegment !== "schedules" || restSegments.length === 0) return null;
  const joined = restSegments.join("/").trim();
  return joined ? decodeURIComponent(joined) : null;
}

function isImageContentType(contentType: string): boolean {
  return contentType.trim().toLowerCase().startsWith("image");
}

function TabContent({
  tab,
  data,
  playlistLayouts,
  playlistLayoutsLoading,
  playlistActionBusy,
  playlistError,
  layoutActionBusy,
  layoutError,
  onCreatePlaylist,
  onUpdatePlaylist,
  onDeletePlaylist,
  onLoadPlaylistItemsForManagement,
  onCreatePlaylistItem,
  onUpdatePlaylistItem,
  onDeletePlaylistItem,
  onCreateLayout,
  onUpdateLayout,
  onDeleteLayout,
  onLoadLayouts,
  onLoadPlaylistItems,
  activeChannelId,
  activeScheduleChannelId,
  onSelectChannel,
  onBackToChannels,
  onOpenSchedulesTab,
  channelActionBusy,
  channelError,
  onCreateChannel,
  onUpdateChannel,
  onPublishChannel,
  scheduleActionBusy,
  scheduleError,
  onLoadChannelSchedules,
  onSaveChannelSchedules,
  contentActionBusy,
  contentError,
  deviceRegistrationBusy,
  deviceRegistrationError,
  onCreateMediaContent,
  onDeleteContent,
  onRegisterDeviceSimple
}: {
  tab: DashboardTab;
  data: NonNullable<ReturnType<typeof useDashboardData>["data"]>;
  playlistLayouts: LayoutOption[];
  playlistLayoutsLoading: boolean;
  playlistActionBusy: boolean;
  playlistError: string | null;
  layoutActionBusy: boolean;
  layoutError: string | null;
  onCreatePlaylist: (input: { name: string; layoutId: string }) => Promise<void>;
  onUpdatePlaylist: (playlistId: string, input: { name: string; layoutId: string }) => Promise<void>;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onLoadPlaylistItemsForManagement: (playlistId: string) => Promise<PlaylistItem[]>;
  onCreatePlaylistItem: (input: PlaylistItemMutationInput) => Promise<void>;
  onUpdatePlaylistItem: (playlistItemId: string, input: PlaylistItemMutationInput) => Promise<void>;
  onDeletePlaylistItem: (playlistItemId: string) => Promise<void>;
  onCreateLayout: (input: LayoutMutationInput) => Promise<void>;
  onUpdateLayout: (layoutId: string, input: LayoutMutationInput) => Promise<void>;
  onDeleteLayout: (layoutId: string) => Promise<void>;
  onLoadLayouts: () => Promise<void>;
  onLoadPlaylistItems: (playlistId: string) => Promise<PlaylistItem[]>;
  activeChannelId: string | null;
  activeScheduleChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onBackToChannels: () => void;
  onOpenSchedulesTab: (channelId?: string) => void;
  channelActionBusy: boolean;
  channelError: string | null;
  onCreateChannel: (input: { name: string; description?: string }) => Promise<void>;
  onUpdateChannel: (channelId: string, input: { name: string; description?: string }) => Promise<void>;
  onPublishChannel: (channelId: string, deviceIds: string[]) => Promise<void>;
  scheduleActionBusy: boolean;
  scheduleError: string | null;
  onLoadChannelSchedules: (channelId: string) => Promise<ChannelScheduleEntry[]>;
  onSaveChannelSchedules: (channelId: string, entries: ChannelScheduleMutationInput[]) => Promise<void>;
  contentActionBusy: boolean;
  contentError: string | null;
  deviceRegistrationBusy: boolean;
  deviceRegistrationError: string | null;
  onCreateMediaContent: (input: ContentMediaMutationInput) => Promise<void>;
  onDeleteContent: (contentId: string) => Promise<void>;
  onRegisterDeviceSimple: (input: {
    identifier?: string;
    name?: string;
    version?: string;
    ipAddress?: string;
  }) => Promise<DeviceRegistrationResult>;
}) {
  const [mediaName, setMediaName] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [contentFormError, setContentFormError] = useState<string | null>(null);
  const [registerIdentifier, setRegisterIdentifier] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerVersion, setRegisterVersion] = useState("1.0.0");
  const [registerSuccess, setRegisterSuccess] = useState<DeviceRegistrationResult | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourChecked, setTourChecked] = useState(false);

  const tourSteps: Step[] = [
    {
      target: "body",
      placement: "center",
      title: "Welcome",
      content: "This quick tour shows the fastest path to launch your first screen."
    },
    {
      target: "[data-tour='setup-progress']",
      title: "Track Progress",
      content: "This bar shows how much of the setup is complete."
    },
    {
      target: "[data-tour='next-step']",
      title: "Follow Next Step",
      content: "Use this card to jump straight to the exact next action."
    },
    {
      target: "[data-tour='step-layouts']",
      title: "Start with Layout",
      content: "Create zones first so each playlist item knows where to display."
    },
    {
      target: "[data-tour='step-playlists']",
      title: "Build Playlist",
      content: "Assign content to zones and set item duration."
    },
    {
      target: "[data-tour='step-devices']",
      title: "Go Live",
      content: "Register devices and publish your channel to screens."
    }
  ];

  const handleTourCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      setTourStepIndex(0);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dashboard_tour_completed", "true");
      }
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = action === "prev" ? index - 1 : index + 1;
      setTourStepIndex(nextIndex < 0 ? 0 : nextIndex);
    }
  }, []);

  const startTour = useCallback(() => {
    setTourStepIndex(0);
    setRunTour(true);
  }, []);

  useEffect(() => {
    if (tab !== "overview" || tourChecked || typeof window === "undefined") return;
    const completed = window.localStorage.getItem("dashboard_tour_completed") === "true";
    if (!completed) {
      setRunTour(true);
    }
    setTourChecked(true);
  }, [tab, tourChecked]);

  const playlistCount = data.stats.find((item) => item.label === "Playlists")?.value ?? data.playlists.length;

  if (tab === "devices") {
    const submitDeviceRegistration = async () => {
      try {
        const result = await onRegisterDeviceSimple({
          identifier: registerIdentifier.trim() || undefined,
          name: registerName.trim() || undefined,
          version: registerVersion.trim() || undefined,
          ipAddress: "127.0.0.1"
        });
        setRegisterSuccess(result);
        setRegisterIdentifier("");
        setRegisterName("");
      } catch {
        setRegisterSuccess(null);
      }
    };

    return (
      <section className="grid gap-4">
        <SectionCard title="Register Device" subtitle="Quick onboarding like Appspace pairing">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Device Identifier
              <input
                type="text"
                value={registerIdentifier}
                onChange={(event) => setRegisterIdentifier(event.target.value)}
                placeholder="Optional (auto-generated if empty)"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                disabled={deviceRegistrationBusy}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Device Name
              <input
                type="text"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="Optional (uses identifier)"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                disabled={deviceRegistrationBusy}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Version
              <input
                type="text"
                value={registerVersion}
                onChange={(event) => setRegisterVersion(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                disabled={deviceRegistrationBusy}
              />
            </label>
            <button
              type="button"
              onClick={() => void submitDeviceRegistration()}
              disabled={deviceRegistrationBusy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deviceRegistrationBusy ? "Registering..." : "Register Device"}
            </button>
          </div>
          {deviceRegistrationError ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {deviceRegistrationError}
            </p>
          ) : null}
          {registerSuccess ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <p className="font-semibold">Device Registered</p>
              <p className="mt-1">Pair Code: {registerSuccess.device.code ?? registerSuccess.onboarding?.pairCode ?? "N/A"}</p>
            </div>
          ) : null}
        </SectionCard>
        <DeviceStatusList
          devices={data.devices}
          playlists={data.playlists}
          contents={data.contents}
          onLoadChannelSchedules={onLoadChannelSchedules}
          onLoadPlaylistItems={onLoadPlaylistItems}
        />
      </section>
    );
  }

  if (tab === "channels") {
    if (activeChannelId) {
      const activeChannel = data.channels.find((channel) => channel.id === activeChannelId);
      if (!activeChannel) {
        return (
          <SectionCard title="Channel Not Found" subtitle="Selected channel does not exist in current data">
            <p className="text-sm text-slate-600">
              The selected channel is unavailable. It may have been deleted or is outside current tenant scope.
            </p>
            <button
              type="button"
              onClick={onBackToChannels}
              className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Back to Channels
            </button>
          </SectionCard>
        );
      }

      return (
        <ChannelDetailManagement
          channel={activeChannel}
          devices={data.devices}
          actionBusy={channelActionBusy}
          errorMessage={channelError}
          onBack={onBackToChannels}
          onOpenSchedules={() => onOpenSchedulesTab(activeChannel.id)}
          onPublish={onPublishChannel}
        />
      );
    }

    const readyChannels = data.channels.filter((channel) => channel.status === "ready").length;
    const channelsNeedingSchedule = data.channels.length - readyChannels;
    const assignedDevices = data.devices.filter((device) => Boolean(device.activeChannelId)).length;

    return (
      <section className="space-y-4">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="panel-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Channels</p>
              <p className="mt-1 font-heading text-3xl font-semibold text-slateWarm-900">{data.channels.length}</p>
            </div>
            <div className="panel-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ready</p>
              <p className="mt-1 font-heading text-3xl font-semibold text-emerald-700">{readyChannels}</p>
            </div>
            <div className="panel-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Need Schedule</p>
              <p className="mt-1 font-heading text-3xl font-semibold text-amber-700">{channelsNeedingSchedule}</p>
            </div>
          </div>

          <div className="panel-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Device Assignment Coverage
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {assignedDevices} of {data.devices.length} devices currently assigned to a channel
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {data.devices.length === 0 ? 0 : Math.round((assignedDevices / data.devices.length) * 100)}%
              </span>
            </div>
          </div>

        </div>

        <ChannelManagement
          channels={data.channels}
          devices={data.devices}
          actionBusy={channelActionBusy}
          errorMessage={channelError}
          onOpenDetails={onSelectChannel}
          onCreate={onCreateChannel}
          onUpdate={onUpdateChannel}
        />
      </section>
    );
  }

  if (tab === "schedules") {
    return (
      <>
        <ScheduleManagement
          channels={data.channels}
          playlists={data.playlists}
          initialSelectedChannelId={activeScheduleChannelId}
          actionBusy={scheduleActionBusy}
          errorMessage={scheduleError}
          onLoadSchedules={onLoadChannelSchedules}
          onSaveSchedules={onSaveChannelSchedules}
        />
      </>
    );
  }

  if (tab === "playlists") {
    return (
      <>
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard title="Playlist Summary" subtitle="Overview">
            <p className="font-heading text-4xl font-semibold text-slateWarm-900">{playlistCount}</p>
            <p className="mt-2 text-sm text-slate-500">Total playlists in tenant scope</p>
          </SectionCard>
          <SectionCard title="Playlist Tips" subtitle="Recommended workflow">
            <p className="text-sm text-slate-600">
              Start with layout selection, then add content zone-by-zone for faster setup and fewer mistakes.
            </p>
          </SectionCard>
        </section>

        <PlaylistManagement
          playlists={data.playlists}
          layouts={playlistLayouts}
          contents={data.contents}
          layoutsLoading={playlistLayoutsLoading}
          actionBusy={playlistActionBusy}
          errorMessage={playlistError}
          onReloadLayouts={onLoadLayouts}
          onCreate={onCreatePlaylist}
          onUpdate={onUpdatePlaylist}
          onDelete={onDeletePlaylist}
          onLoadItems={onLoadPlaylistItemsForManagement}
          onCreateItem={onCreatePlaylistItem}
          onUpdateItem={onUpdatePlaylistItem}
          onDeleteItem={onDeletePlaylistItem}
        />
      </>
    );
  }

  if (tab === "layouts") {
    return (
      <>
        <LayoutManagement
          layouts={playlistLayouts}
          playlists={data.playlists}
          actionBusy={layoutActionBusy}
          errorMessage={layoutError}
          onCreate={onCreateLayout}
          onUpdate={onUpdateLayout}
          onDelete={onDeleteLayout}
        />
      </>
    );
  }

  if (tab === "contents") {
    const contentColumns: DataTableColumn<ContentSummaryItem>[] = [
      {
        key: "preview",
        header: "Preview",
        cellClassName: "w-28",
        render: (content) =>
          content.fullUrl && isImageContentType(content.contentType) ? (
            <img
              src={content.fullUrl}
              alt={content.name}
              loading="lazy"
              className="h-14 w-24 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <span className="text-xs text-slate-500">No preview</span>
          )
      },
      {
        key: "name",
        header: "Name",
        cellClassName: "font-semibold text-slateWarm-900",
        render: (content) => content.name
      },
      {
        key: "type",
        header: "Type",
        cellClassName: "text-slate-700",
        render: (content) => content.contentType
      },
      {
        key: "status",
        header: "Status",
        cellClassName: "text-slate-700",
        render: (content) => content.status
      },
      {
        key: "url",
        header: "Media URL",
        render: (content) =>
          content.fullUrl ? (
            <a
              href={content.fullUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Open URL
            </a>
          ) : (
            <span className="text-xs text-slate-500">N/A</span>
          )
      },
      {
        key: "actions",
        header: "Actions",
        render: (content) => (
          <button
            type="button"
            onClick={() => void onDeleteContent(content.id)}
            disabled={contentActionBusy}
            className="rounded border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete
          </button>
        )
      }
    ];

    const acceptedFileTypes =
      mediaType === "video" ? "video/*,.mp4,.mov,.avi" : "image/*,.png,.jpg,.jpeg,.gif";

    const uploadMedia = async () => {
      const trimmedName = mediaName.trim();
      if (!trimmedName) {
        setContentFormError("Content name is required.");
        return;
      }
      if (!mediaFile) {
        setContentFormError("Please choose a media file.");
        return;
      }

      setContentFormError(null);
      try {
        await onCreateMediaContent({
          name: trimmedName,
          contentType: mediaType,
          file: mediaFile
        });
        setMediaName("");
        setMediaFile(null);
      } catch (err) {
        setContentFormError(err instanceof Error ? err.message : "Unable to upload content");
      }
    };

    return (
      <section className="space-y-4">
        <SectionCard title="Upload Content" subtitle="Add media to your content library">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_1fr_auto] md:items-end">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Name
              <input
                type="text"
                value={mediaName}
                onChange={(event) => setMediaName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Spring Campaign Hero"
                disabled={contentActionBusy}
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Type
              <select
                value={mediaType}
                onChange={(event) => setMediaType(event.target.value === "video" ? "video" : "image")}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                disabled={contentActionBusy}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              File
              <input
                type="file"
                accept={acceptedFileTypes}
                onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                disabled={contentActionBusy}
              />
            </label>

            <button
              type="button"
              onClick={() => void uploadMedia()}
              disabled={contentActionBusy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {contentActionBusy ? "Uploading..." : "Upload"}
            </button>
          </div>
          {contentFormError || contentError ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{contentFormError ?? contentError}</p>
          ) : null}
        </SectionCard>

        <SectionCard title="Content Library" subtitle="All uploaded media">
          <DataTable
            columns={contentColumns}
            rows={data.contents}
            getRowKey={(content) => content.id}
            emptyMessage="No content assets available."
          />
        </SectionCard>
      </section>
    );
  }

  const hasLayouts = playlistLayouts.length > 0;
  const hasContent = data.contents.length > 0;
  const hasPlaylists = data.playlists.length > 0;
  const hasChannels = data.channels.length > 0;
  const hasSchedules = data.channels.some((channel) => channel.windows > 0);
  const hasDevices = data.devices.length > 0;
  const hasPublishedScreens = data.devices.some((device) => Boolean(device.activeChannelId));

  const startSteps = [
    {
      id: "layouts",
      title: "Create Layout",
      description: "Define one or more zones for your screen.",
      cta: "Open Layouts",
      href: "#layouts",
      done: hasLayouts
    },
    {
      id: "contents",
      title: "Upload Content",
      description: "Add images and videos to your library.",
      cta: "Open Contents",
      href: "#contents",
      done: hasContent
    },
    {
      id: "playlists",
      title: "Build Playlist",
      description: "Pick a layout and assign content to zones.",
      cta: "Open Playlists",
      href: "#playlists",
      done: hasPlaylists
    },
    {
      id: "channels",
      title: "Create Channel",
      description: "Create a channel that screens will play.",
      cta: "Open Channels",
      href: "#channels",
      done: hasChannels
    },
    {
      id: "schedules",
      title: "Set Schedule",
      description: "Choose when each playlist should run.",
      cta: "Open Schedules",
      href: "#schedules",
      done: hasSchedules
    },
    {
      id: "devices",
      title: "Register and Publish",
      description: "Register screens and publish your channel to them.",
      cta: "Open Devices",
      href: "#devices",
      done: hasDevices && hasPublishedScreens
    }
  ];

  const completedSteps = startSteps.filter((step) => step.done).length;
  const nextPendingStep = startSteps.find((step) => !step.done) ?? null;
  const nextPendingStepIndex = nextPendingStep ? startSteps.findIndex((step) => step.id === nextPendingStep.id) : -1;

  return (
    <>
      <Joyride
        run={tab === "overview" && runTour}
        stepIndex={tourStepIndex}
        steps={tourSteps}
        continuous
        showSkipButton
        showProgress
        disableScrolling
        callback={handleTourCallback}
        styles={{
          options: {
            zIndex: 1000,
            primaryColor: "#d95f0e",
            textColor: "#0f172a"
          }
        }}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            context={stat.context}
            deltaLabel={stat.deltaLabel}
            tone={stat.tone}
          />
        ))}
      </section>

      <SectionCard title="Start Here" subtitle="Follow this order to launch your first screen">
        <div
          data-tour="setup-progress"
          className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <p className="text-sm text-slate-700">
            Progress:{" "}
            <span className="font-semibold text-slate-900">
              {completedSteps}/{startSteps.length} completed
            </span>
          </p>
          {completedSteps === startSteps.length ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              Ready to go live
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
              Setup in progress
            </span>
          )}
          <button
            type="button"
            onClick={startTour}
            className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            Take Guided Tour
          </button>
        </div>

        <div
          data-tour="next-step"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2"
        >
          {nextPendingStep ? (
            <>
              <p className="text-sm text-brand-900">
                Next step:{" "}
                <span className="font-semibold">
                  {nextPendingStepIndex + 1}. {nextPendingStep.title}
                </span>
              </p>
              <a
                href={nextPendingStep.href}
                className="inline-flex rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                Continue Setup
              </a>
            </>
          ) : (
            <p className="text-sm font-semibold text-emerald-700">
              Setup complete. You can now manage daily updates from each section.
            </p>
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {startSteps.map((step, index) => (
            <div
              key={step.id}
              data-tour={`step-${step.id}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slateWarm-900">{step.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{step.description}</p>
                </div>
                <span
                  className={
                    step.done
                      ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                      : "rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
                  }
                >
                  {step.done ? "Done" : "Pending"}
                </span>
              </div>
              <a
                href={step.href}
                className="mt-2 inline-flex rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                {step.cta}
              </a>
            </div>
          ))}
        </div>
      </SectionCard>

    </>
  );
}

function DashboardContent({ session }: { session: AuthSession }) {
  const {
    data,
    loading,
    error,
    refresh,
    getLayoutOptions,
    getPlaylistItems,
    createLayout,
    updateLayout,
    deleteLayout,
    createChannel,
    updateChannel,
    publishChannel,
    getChannelSchedules,
    replaceChannelSchedules,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    createPlaylistItem,
    updatePlaylistItem,
    deletePlaylistItem,
    registerDeviceSimple,
    createMediaContent,
    deleteContent
  } = useDashboardData(session);
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => readTabFromHash());
  const [activeChannelId, setActiveChannelId] = useState<string | null>(() => readChannelIdFromHash());
  const [activeScheduleChannelId, setActiveScheduleChannelId] = useState<string | null>(() =>
    readScheduleChannelIdFromHash()
  );
  const [playlistLayouts, setPlaylistLayouts] = useState<LayoutOption[]>([]);
  const [playlistLayoutsLoading, setPlaylistLayoutsLoading] = useState(false);
  const [playlistActionBusy, setPlaylistActionBusy] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [layoutActionBusy, setLayoutActionBusy] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [channelActionBusy, setChannelActionBusy] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [scheduleActionBusy, setScheduleActionBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [contentActionBusy, setContentActionBusy] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [deviceRegistrationBusy, setDeviceRegistrationBusy] = useState(false);
  const [deviceRegistrationError, setDeviceRegistrationError] = useState<string | null>(null);

  const onTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
    setActiveChannelId(null);
    if (tab !== "schedules") {
      setActiveScheduleChannelId(null);
    }
    if (typeof window !== "undefined" && window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
  }, []);

  const onSelectChannel = useCallback((channelId: string) => {
    setActiveTab("channels");
    setActiveChannelId(channelId);
    setActiveScheduleChannelId(null);
    const nextHash = `#channels/${encodeURIComponent(channelId)}`;
    if (typeof window !== "undefined" && window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, []);

  const onBackToChannels = useCallback(() => {
    setActiveTab("channels");
    setActiveChannelId(null);
    setActiveScheduleChannelId(null);
    if (typeof window !== "undefined" && window.location.hash !== "#channels") {
      window.location.hash = "channels";
    }
  }, []);

  const onOpenSchedulesTab = useCallback((channelId?: string) => {
    const nextChannelId = channelId?.trim() ? channelId : null;
    setActiveTab("schedules");
    setActiveScheduleChannelId(nextChannelId);
    const nextHash = nextChannelId
      ? `#schedules/${encodeURIComponent(nextChannelId)}`
      : "#schedules";
    if (typeof window !== "undefined" && window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleHashChange = () => {
      setActiveTab(readTabFromHash());
      setActiveChannelId(readChannelIdFromHash());
      setActiveScheduleChannelId(readScheduleChannelIdFromHash());
    };

    if (!window.location.hash) {
      window.history.replaceState(null, "", "#overview");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const loadPlaylistLayouts = useCallback(async () => {
    setPlaylistLayoutsLoading(true);
    setPlaylistError(null);
    setLayoutError(null);
    try {
      const layouts = await getLayoutOptions();
      setPlaylistLayouts(layouts);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load layouts";
      setPlaylistError(message);
      setLayoutError(message);
    } finally {
      setPlaylistLayoutsLoading(false);
    }
  }, [getLayoutOptions]);

  const createLayoutHandler = useCallback(
    async (input: LayoutMutationInput) => {
      setLayoutActionBusy(true);
      setLayoutError(null);
      try {
        await createLayout(input);
        await loadPlaylistLayouts();
      } catch (err) {
        setLayoutError(err instanceof Error ? err.message : "Unable to create layout");
      } finally {
        setLayoutActionBusy(false);
      }
    },
    [createLayout, loadPlaylistLayouts]
  );

  const updateLayoutHandler = useCallback(
    async (layoutId: string, input: LayoutMutationInput) => {
      setLayoutActionBusy(true);
      setLayoutError(null);
      try {
        await updateLayout(layoutId, input);
        await loadPlaylistLayouts();
      } catch (err) {
        setLayoutError(err instanceof Error ? err.message : "Unable to update layout");
      } finally {
        setLayoutActionBusy(false);
      }
    },
    [updateLayout, loadPlaylistLayouts]
  );

  const deleteLayoutHandler = useCallback(
    async (layoutId: string) => {
      setLayoutActionBusy(true);
      setLayoutError(null);
      try {
        await deleteLayout(layoutId);
        await loadPlaylistLayouts();
      } catch (err) {
        setLayoutError(err instanceof Error ? err.message : "Unable to delete layout");
      } finally {
        setLayoutActionBusy(false);
      }
    },
    [deleteLayout, loadPlaylistLayouts]
  );

  useEffect(() => {
    if (activeTab !== "playlists" && activeTab !== "layouts" && activeTab !== "overview") return;
    if (playlistLayouts.length > 0 || playlistLayoutsLoading) return;
    void loadPlaylistLayouts();
  }, [activeTab, playlistLayouts.length, playlistLayoutsLoading, loadPlaylistLayouts]);

  const createPlaylistHandler = useCallback(
    async (input: { name: string; layoutId: string }) => {
      setPlaylistActionBusy(true);
      setPlaylistError(null);
      try {
        await createPlaylist(input);
        await refresh();
      } catch (err) {
        setPlaylistError(err instanceof Error ? err.message : "Unable to create playlist");
      } finally {
        setPlaylistActionBusy(false);
      }
    },
    [createPlaylist, refresh]
  );

  const updatePlaylistHandler = useCallback(
    async (playlistId: string, input: { name: string; layoutId: string }) => {
      setPlaylistActionBusy(true);
      setPlaylistError(null);
      try {
        await updatePlaylist(playlistId, input);
        await refresh();
      } catch (err) {
        setPlaylistError(err instanceof Error ? err.message : "Unable to update playlist");
      } finally {
        setPlaylistActionBusy(false);
      }
    },
    [updatePlaylist, refresh]
  );

  const deletePlaylistHandler = useCallback(
    async (playlistId: string) => {
      setPlaylistActionBusy(true);
      setPlaylistError(null);
      try {
        await deletePlaylist(playlistId);
        await refresh();
      } catch (err) {
        setPlaylistError(err instanceof Error ? err.message : "Unable to delete playlist");
      } finally {
        setPlaylistActionBusy(false);
      }
    },
    [deletePlaylist, refresh]
  );

  const loadPlaylistItemsForManagementHandler = useCallback(
    async (playlistId: string) => {
      return getPlaylistItems(playlistId);
    },
    [getPlaylistItems]
  );

  const createPlaylistItemHandler = useCallback(
    async (input: PlaylistItemMutationInput) => {
      setPlaylistActionBusy(true);
      setPlaylistError(null);
      try {
        await createPlaylistItem(input);
      } catch (err) {
        setPlaylistError(err instanceof Error ? err.message : "Unable to create playlist item");
        throw err;
      } finally {
        setPlaylistActionBusy(false);
      }
    },
    [createPlaylistItem]
  );

  const updatePlaylistItemHandler = useCallback(
    async (playlistItemId: string, input: PlaylistItemMutationInput) => {
      setPlaylistActionBusy(true);
      setPlaylistError(null);
      try {
        await updatePlaylistItem(playlistItemId, input);
      } catch (err) {
        setPlaylistError(err instanceof Error ? err.message : "Unable to update playlist item");
        throw err;
      } finally {
        setPlaylistActionBusy(false);
      }
    },
    [updatePlaylistItem]
  );

  const deletePlaylistItemHandler = useCallback(
    async (playlistItemId: string) => {
      setPlaylistActionBusy(true);
      setPlaylistError(null);
      try {
        await deletePlaylistItem(playlistItemId);
      } catch (err) {
        setPlaylistError(err instanceof Error ? err.message : "Unable to delete playlist item");
        throw err;
      } finally {
        setPlaylistActionBusy(false);
      }
    },
    [deletePlaylistItem]
  );

  const createChannelHandler = useCallback(
    async (input: { name: string; description?: string }) => {
      setChannelActionBusy(true);
      setChannelError(null);
      try {
        await createChannel(input);
        await refresh();
      } catch (err) {
        setChannelError(err instanceof Error ? err.message : "Unable to create channel");
      } finally {
        setChannelActionBusy(false);
      }
    },
    [createChannel, refresh]
  );

  const publishChannelHandler = useCallback(
    async (channelId: string, deviceIds: string[]) => {
      setChannelActionBusy(true);
      setChannelError(null);
      try {
        await publishChannel(channelId, deviceIds);
        await refresh();
      } catch (err) {
        setChannelError(err instanceof Error ? err.message : "Unable to publish channel");
      } finally {
        setChannelActionBusy(false);
      }
    },
    [publishChannel, refresh]
  );

  const updateChannelHandler = useCallback(
    async (channelId: string, input: { name: string; description?: string }) => {
      setChannelActionBusy(true);
      setChannelError(null);
      try {
        await updateChannel(channelId, input);
        await refresh();
      } catch (err) {
        setChannelError(err instanceof Error ? err.message : "Unable to update channel");
      } finally {
        setChannelActionBusy(false);
      }
    },
    [updateChannel, refresh]
  );

  const loadChannelSchedulesHandler = useCallback(
    async (channelId: string): Promise<ChannelScheduleEntry[]> => {
      setScheduleError(null);
      return getChannelSchedules(channelId);
    },
    [getChannelSchedules]
  );

  const saveChannelSchedulesHandler = useCallback(
    async (channelId: string, entries: ChannelScheduleMutationInput[]) => {
      setScheduleActionBusy(true);
      setScheduleError(null);
      try {
        await replaceChannelSchedules(channelId, entries);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to save schedules";
        setScheduleError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setScheduleActionBusy(false);
      }
    },
    [replaceChannelSchedules, refresh]
  );

  const createMediaContentHandler = useCallback(
    async (input: ContentMediaMutationInput) => {
      setContentActionBusy(true);
      setContentError(null);
      try {
        await createMediaContent(input);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to upload content";
        setContentError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setContentActionBusy(false);
      }
    },
    [createMediaContent, refresh]
  );

  const deleteContentHandler = useCallback(
    async (contentId: string) => {
      setContentActionBusy(true);
      setContentError(null);
      try {
        await deleteContent(contentId);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to delete content";
        setContentError(message);
      } finally {
        setContentActionBusy(false);
      }
    },
    [deleteContent, refresh]
  );

  const registerDeviceSimpleHandler = useCallback(
    async (input: { identifier?: string; name?: string; version?: string; ipAddress?: string }) => {
      setDeviceRegistrationBusy(true);
      setDeviceRegistrationError(null);
      try {
        const result = await registerDeviceSimple(input);
        await refresh();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to register device";
        setDeviceRegistrationError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setDeviceRegistrationBusy(false);
      }
    },
    [registerDeviceSimple, refresh]
  );

  if (loading && !data) {
    return (
      <AppShell
        username={session.username}
        activeTab={activeTab}
        onTabChange={onTabChange}
      >
        <div className="panel-surface p-6">
          <p className="text-sm text-slate-600">Loading dashboard data...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell
        username={session.username}
        activeTab={activeTab}
        onTabChange={onTabChange}
      >
        <div className="panel-surface p-6">
          <p className="text-sm font-semibold text-rose-700">Unable to load dashboard</p>
          {error ? <p className="mt-1 text-sm text-slate-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      generatedAt={data.generatedAt}
      username={session.username}
      activeTab={activeTab}
      onTabChange={onTabChange}
    >
      <div className="space-y-5">
        {data.source === "mock" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">
            API auth is not configured or backend is unavailable. Showing dashboard fallback data.
          </div>
        ) : null}

        <TabContent
          tab={activeTab}
          data={data}
          playlistLayouts={playlistLayouts}
          playlistLayoutsLoading={playlistLayoutsLoading}
          playlistActionBusy={playlistActionBusy}
          playlistError={playlistError}
          layoutActionBusy={layoutActionBusy}
          layoutError={layoutError}
          onLoadLayouts={loadPlaylistLayouts}
          onLoadPlaylistItems={getPlaylistItems}
          onCreatePlaylist={createPlaylistHandler}
          onUpdatePlaylist={updatePlaylistHandler}
          onDeletePlaylist={deletePlaylistHandler}
          onLoadPlaylistItemsForManagement={loadPlaylistItemsForManagementHandler}
          onCreatePlaylistItem={createPlaylistItemHandler}
          onUpdatePlaylistItem={updatePlaylistItemHandler}
          onDeletePlaylistItem={deletePlaylistItemHandler}
          onCreateLayout={createLayoutHandler}
          onUpdateLayout={updateLayoutHandler}
          onDeleteLayout={deleteLayoutHandler}
          activeChannelId={activeChannelId}
          activeScheduleChannelId={activeScheduleChannelId}
          onSelectChannel={onSelectChannel}
          onBackToChannels={onBackToChannels}
          onOpenSchedulesTab={onOpenSchedulesTab}
          channelActionBusy={channelActionBusy}
          channelError={channelError}
          onCreateChannel={createChannelHandler}
          onUpdateChannel={updateChannelHandler}
          onPublishChannel={publishChannelHandler}
          scheduleActionBusy={scheduleActionBusy}
          scheduleError={scheduleError}
          onLoadChannelSchedules={loadChannelSchedulesHandler}
          onSaveChannelSchedules={saveChannelSchedulesHandler}
          contentActionBusy={contentActionBusy}
          contentError={contentError}
          deviceRegistrationBusy={deviceRegistrationBusy}
          deviceRegistrationError={deviceRegistrationError}
          onCreateMediaContent={createMediaContentHandler}
          onDeleteContent={deleteContentHandler}
          onRegisterDeviceSimple={registerDeviceSimpleHandler}
        />
      </div>
    </AppShell>
  );
}

export function DashboardPage() {
  const { session } = useAuth();
  if (!session) return null;
  return <DashboardContent session={session} />;
}
