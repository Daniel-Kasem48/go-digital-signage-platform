import { useEffect, useMemo, useState } from "react";
import type {
  ContentSummaryItem,
  LayoutOption,
  PlaylistItem,
  PlaylistItemMutationInput,
  PlaylistMutationInput,
  PlaylistSummaryItem
} from "../../../entities/dashboard/types";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SectionCard } from "./SectionCard";

interface PlaylistManagementProps {
  playlists: PlaylistSummaryItem[];
  layouts: LayoutOption[];
  contents: ContentSummaryItem[];
  layoutsLoading: boolean;
  actionBusy: boolean;
  errorMessage: string | null;
  onReloadLayouts: () => Promise<void>;
  onCreate: (input: PlaylistMutationInput) => Promise<void>;
  onUpdate: (playlistId: string, input: PlaylistMutationInput) => Promise<void>;
  onDelete: (playlistId: string) => Promise<void>;
  onLoadItems: (playlistId: string) => Promise<PlaylistItem[]>;
  onCreateItem: (input: PlaylistItemMutationInput) => Promise<void>;
  onUpdateItem: (playlistItemId: string, input: PlaylistItemMutationInput) => Promise<void>;
  onDeleteItem: (playlistItemId: string) => Promise<void>;
}

const DURATION_PRESETS = ["00:00:15", "00:00:30", "00:01:00", "00:05:00"];

function ManagementModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidthClassName = "max-w-5xl"
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-4 md:p-8" onClick={onClose}>
      <div
        className={`w-full ${maxWidthClassName} rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:p-5`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slateWarm-900">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function toDurationString(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function normalizeDurationValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^\d+$/.test(trimmed)) {
    return toDurationString(Number(trimmed));
  }

  const parts = trimmed.split(":").map((segment) => segment.trim());
  if (!parts.every((segment) => /^\d+$/.test(segment))) {
    return "";
  }

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
      return "";
    }
    return toDurationString(minutes * 60 + seconds);
  }

  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      minutes >= 60 ||
      seconds >= 60
    ) {
      return "";
    }
    return toDurationString(hours * 3600 + minutes * 60 + seconds);
  }

  return "";
}

function isValidDurationValue(value: string): boolean {
  return normalizeDurationValue(value).length > 0;
}

function parseDurationToSeconds(value: string): number {
  const normalized = normalizeDurationValue(value);
  if (!normalized) return 0;
  const [hours, minutes, seconds] = normalized.split(":").map((part) => Number(part));
  return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
}

interface ZoneOption {
  position: number;
  key: string;
  label: string;
}

interface LayoutPreviewZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function extractZoneOptions(layout: LayoutOption | null): ZoneOption[] {
  if (!layout || !layout.zones) {
    return [{ position: 1, key: "zone-1", label: "Zone 1" }];
  }

  if (Array.isArray(layout.zones)) {
    const options = (layout.zones as Array<Record<string, unknown>>)
      .map((zone, index) => {
        const key = typeof zone.id === "string" && zone.id.trim() ? zone.id : `zone-${index + 1}`;
        const label =
          (typeof zone.name === "string" && zone.name.trim()) ||
          (typeof zone.id === "string" && zone.id.trim()) ||
          `Zone ${index + 1}`;
        return { position: index + 1, key, label };
      })
      .filter((zone) => zone.position > 0);
    return options.length > 0 ? options : [{ position: 1, key: "zone-1", label: "Zone 1" }];
  }

  if (typeof layout.zones === "object" && layout.zones !== null) {
    const entries = Object.entries(layout.zones as Record<string, unknown>);
    const options = entries.map(([zoneKey], index) => ({
      position: index + 1,
      key: zoneKey,
      label: zoneKey
    }));
    return options.length > 0 ? options : [{ position: 1, key: "zone-1", label: "Zone 1" }];
  }

  return [{ position: 1, key: "zone-1", label: "Zone 1" }];
}

function toPercentValue(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace("%", ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function extractLayoutPreviewZones(layout: LayoutOption): LayoutPreviewZone[] {
  const source = layout.zones;
  const toZone = (raw: unknown, index: number): LayoutPreviewZone => {
    const value = (raw ?? {}) as Record<string, unknown>;
    const width = clampPercent(toPercentValue(value.width, 100));
    const height = clampPercent(toPercentValue(value.height, 100));
    const x = clampPercent(toPercentValue(value.x, 0));
    const y = clampPercent(toPercentValue(value.y, 0));
    return {
      id: typeof value.id === "string" && value.id.trim() ? value.id : `zone-${index + 1}`,
      name: typeof value.name === "string" && value.name.trim() ? value.name : `Zone ${index + 1}`,
      x: Math.min(x, 100 - width),
      y: Math.min(y, 100 - height),
      width,
      height
    };
  };

  if (Array.isArray(source)) {
    const zones = source.map((zone, index) => toZone(zone, index));
    return zones.length > 0 ? zones : [toZone({}, 0)];
  }

  if (source && typeof source === "object") {
    const values = Object.values(source as Record<string, unknown>);
    if (values.length > 0) {
      return values.map((zone, index) => toZone(zone, index));
    }
  }

  return [toZone({}, 0)];
}

function LayoutPreviewPicker({
  layouts,
  selectedLayoutId,
  onSelect
}: {
  layouts: LayoutOption[];
  selectedLayoutId: string;
  onSelect: (layoutId: string) => void;
}) {
  if (layouts.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">No layouts available.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {layouts.map((layout) => {
        const selected = layout.id === selectedLayoutId;
        const zones = extractLayoutPreviewZones(layout);
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onSelect(layout.id)}
            className={`rounded-xl border p-2 text-left transition ${
              selected
                ? "border-brand-500 bg-brand-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
            }`}
          >
            <p className="text-sm font-semibold text-slate-800">{layout.name}</p>
            <p className="text-[11px] text-slate-500">{zones.length} zone{zones.length > 1 ? "s" : ""}</p>
            <div className="relative mt-2 h-20 w-full rounded-md border border-slate-200 bg-slate-100">
              {zones.map((zone, index) => (
                <div
                  key={zone.id}
                  className={`absolute overflow-hidden rounded border border-white/60 text-[9px] font-semibold text-white ${
                    ["bg-sky-500/75", "bg-emerald-500/75", "bg-amber-500/75", "bg-rose-500/75", "bg-violet-500/75"][
                      index % 5
                    ]
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`
                  }}
                >
                  <span className="block truncate px-1 py-0.5">{zone.name}</span>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ZoneCanvasPicker({
  layout,
  zones,
  selectedPosition,
  onSelect
}: {
  layout: LayoutOption | null;
  zones: ZoneOption[];
  selectedPosition: number;
  onSelect: (position: number) => void;
}) {
  if (zones.length === 0) return null;

  const layoutZones = layout ? extractLayoutPreviewZones(layout) : [];
  const merged = zones.map((zone, index) => {
    const fromLayout = layoutZones[index];
    if (fromLayout) {
      return {
        ...zone,
        x: fromLayout.x,
        y: fromLayout.y,
        width: fromLayout.width,
        height: fromLayout.height
      };
    }

    const width = 100 / zones.length;
    return {
      ...zone,
      x: index * width,
      y: 0,
      width,
      height: 100
    };
  });

  return (
    <div className="relative h-32 w-full rounded-lg border border-slate-200 bg-slate-100">
      {merged.map((zone, index) => {
        const selected = zone.position === selectedPosition;
        return (
          <button
            key={zone.key}
            type="button"
            onClick={() => onSelect(zone.position)}
            className={`absolute overflow-hidden rounded border text-left text-[10px] font-semibold text-white transition ${
              selected ? "border-white ring-2 ring-brand-500/90" : "border-white/60 hover:brightness-110"
            } ${
              ["bg-sky-500/80", "bg-emerald-500/80", "bg-amber-500/80", "bg-rose-500/80", "bg-violet-500/80"][
                index % 5
              ]
            }`}
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`
            }}
          >
            <span className="block truncate px-1.5 py-1">{zone.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function isImageContentType(contentType: string): boolean {
  return contentType.trim().toLowerCase().startsWith("image");
}

export function PlaylistManagement({
  playlists,
  layouts,
  contents,
  layoutsLoading,
  actionBusy,
  errorMessage,
  onReloadLayouts,
  onCreate,
  onUpdate,
  onDelete,
  onLoadItems,
  onCreateItem,
  onUpdateItem,
  onDeleteItem
}: PlaylistManagementProps) {
  const [createName, setCreateName] = useState("");
  const [createLayoutId, setCreateLayoutId] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editLayoutId, setEditLayoutId] = useState("");
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [itemContentId, setItemContentId] = useState("");
  const [selectedZonePosition, setSelectedZonePosition] = useState<number>(1);
  const [itemTimeString, setItemTimeString] = useState("00:00:15");
  const [itemDurationError, setItemDurationError] = useState<string | null>(null);
  const [itemFormError, setItemFormError] = useState<string | null>(null);
  const [itemIsActive, setItemIsActive] = useState(true);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemOrder, setEditItemOrder] = useState<number>(1);
  const [editItemContentId, setEditItemContentId] = useState("");
  const [editItemLayoutPosition, setEditItemLayoutPosition] = useState<number>(1);
  const [editItemTimeString, setEditItemTimeString] = useState("00:00:15");
  const [editItemDurationError, setEditItemDurationError] = useState<string | null>(null);
  const [editItemFormError, setEditItemFormError] = useState<string | null>(null);
  const [editItemIsActive, setEditItemIsActive] = useState(true);

  const layoutNameById = useMemo(() => new Map(layouts.map((layout) => [layout.id, layout.name])), [layouts]);
  const contentNameById = useMemo(() => new Map(contents.map((content) => [content.id, content.name])), [contents]);
  const contentById = useMemo(() => new Map(contents.map((content) => [content.id, content])), [contents]);
  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId]
  );
  const selectedPlaylistLayout = useMemo(
    () => layouts.find((layout) => layout.id === selectedPlaylist?.layoutId) ?? null,
    [layouts, selectedPlaylist]
  );
  const zoneOptions = useMemo(() => extractZoneOptions(selectedPlaylistLayout), [selectedPlaylistLayout]);
  const zoneLabelByPosition = useMemo(
    () => new Map(zoneOptions.map((zone) => [zone.position, zone.label])),
    [zoneOptions]
  );
  const selectedCreateContent = useMemo(() => contentById.get(itemContentId) ?? null, [contentById, itemContentId]);
  const selectedEditContent = useMemo(
    () => contentById.get(editItemContentId) ?? null,
    [contentById, editItemContentId]
  );
  const createDurationNormalized = useMemo(() => normalizeDurationValue(itemTimeString), [itemTimeString]);
  const editDurationNormalized = useMemo(() => normalizeDurationValue(editItemTimeString), [editItemTimeString]);
  const createDurationInvalid = itemTimeString.trim().length > 0 && !createDurationNormalized;
  const editDurationInvalid = editItemTimeString.trim().length > 0 && !editDurationNormalized;
  const zoneItems = useMemo(
    () =>
      playlistItems
        .filter((item) => item.layoutPosition === selectedZonePosition)
        .sort((left, right) => left.order - right.order),
    [playlistItems, selectedZonePosition]
  );
  const zoneLoopDurationSeconds = useMemo(
    () => zoneItems.reduce((total, item) => total + parseDurationToSeconds(item.timeString), 0),
    [zoneItems]
  );

  useEffect(() => {
    if (!createLayoutId && layouts.length > 0) {
      setCreateLayoutId(layouts[0].id);
    }
  }, [layouts, createLayoutId]);

  useEffect(() => {
    if (!itemContentId && contents.length > 0) {
      setItemContentId(contents[0].id);
    }
  }, [contents, itemContentId]);

  useEffect(() => {
    if (!selectedPlaylistId && playlists.length > 0) {
      setSelectedPlaylistId(playlists[0].id);
      return;
    }

    if (selectedPlaylistId && !playlists.some((playlist) => playlist.id === selectedPlaylistId)) {
      setSelectedPlaylistId(playlists[0]?.id ?? "");
    }
  }, [playlists, selectedPlaylistId]);

  useEffect(() => {
    if (zoneOptions.length === 0) {
      setSelectedZonePosition(1);
      return;
    }

    if (!zoneOptions.some((zone) => zone.position === selectedZonePosition)) {
      setSelectedZonePosition(zoneOptions[0].position);
    }
  }, [zoneOptions, selectedZonePosition]);

  const loadPlaylistItems = async (playlistId: string) => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const items = await onLoadItems(playlistId);
      setPlaylistItems(items.sort((left, right) => left.order - right.order));
    } catch (error) {
      setItemsError(error instanceof Error ? error.message : "Unable to load playlist items");
      setPlaylistItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (!isItemsModalOpen || !selectedPlaylistId) {
      setPlaylistItems([]);
      setItemsError(null);
      return;
    }
    void loadPlaylistItems(selectedPlaylistId);
  }, [isItemsModalOpen, selectedPlaylistId]);

  useEffect(() => {
    setItemFormError(null);
  }, [itemContentId, selectedZonePosition, selectedPlaylistId]);

  useEffect(() => {
    if (!editingItemId) return;
    setEditItemFormError(null);
  }, [editingItemId, editItemContentId, editItemLayoutPosition]);

  const startEdit = (playlist: PlaylistSummaryItem) => {
    setEditingId(playlist.id);
    setEditName(playlist.name);
    setEditLayoutId(playlist.layoutId);
    setIsEditModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditName("");
    setEditLayoutId("");
    setIsEditModalOpen(false);
  };

  const openItems = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setIsItemsModalOpen(true);
    setItemFormError(null);
    setEditItemFormError(null);
  };

  const submitCreate = async () => {
    if (!createName.trim() || !createLayoutId.trim()) return;
    await onCreate({ name: createName.trim(), layoutId: createLayoutId });
    setCreateName("");
  };

  const submitUpdate = async () => {
    if (!editingId) return;
    if (!editName.trim() || !editLayoutId.trim()) return;
    await onUpdate(editingId, { name: editName.trim(), layoutId: editLayoutId });
    cancelEdit();
  };

  const submitCreateItem = async () => {
    if (!selectedPlaylistId || !itemContentId.trim()) return;
    if (!createDurationNormalized) {
      setItemDurationError("Use HH:MM:SS, MM:SS, or seconds.");
      return;
    }
    const duplicateInSelectedZone = playlistItems.some(
      (item) => item.layoutPosition === selectedZonePosition && item.contentId === itemContentId
    );
    if (duplicateInSelectedZone) {
      setItemFormError("This content already exists in the selected zone.");
      return;
    }

    setItemDurationError(null);
    setItemFormError(null);
    try {
      await onCreateItem({
        playlistId: selectedPlaylistId,
        contentId: itemContentId,
        layoutPosition: Math.max(1, selectedZonePosition),
        timeString: createDurationNormalized,
        isActive: itemIsActive
      });
      setItemTimeString(createDurationNormalized);
      await loadPlaylistItems(selectedPlaylistId);
    } catch (error) {
      setItemFormError(error instanceof Error ? error.message : "Unable to add item to this zone.");
      throw error;
    }
  };

  const startEditItem = (item: PlaylistItem) => {
    setEditingItemId(item.id);
    setEditItemOrder(item.order);
    setEditItemContentId(item.contentId);
    setEditItemLayoutPosition(item.layoutPosition);
    setEditItemTimeString(normalizeDurationValue(item.timeString) || item.timeString);
    setEditItemDurationError(null);
    setEditItemFormError(null);
    setEditItemIsActive(item.isActive);
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditItemOrder(1);
    setEditItemContentId("");
    setEditItemLayoutPosition(1);
    setEditItemTimeString("00:00:15");
    setEditItemDurationError(null);
    setEditItemFormError(null);
    setEditItemIsActive(true);
  };

  const submitUpdateItem = async () => {
    if (!editingItemId || !selectedPlaylistId || !editItemContentId.trim()) return;
    if (!editDurationNormalized) {
      setEditItemDurationError("Use HH:MM:SS, MM:SS, or seconds.");
      return;
    }
    const duplicateInTargetZone = playlistItems.some(
      (item) =>
        item.id !== editingItemId &&
        item.layoutPosition === Math.max(1, editItemLayoutPosition) &&
        item.contentId === editItemContentId
    );
    if (duplicateInTargetZone) {
      setEditItemFormError("This content already exists in the selected target zone.");
      return;
    }

    setEditItemDurationError(null);
    setEditItemFormError(null);
    try {
      await onUpdateItem(editingItemId, {
        playlistId: selectedPlaylistId,
        contentId: editItemContentId,
        layoutPosition: Math.max(1, editItemLayoutPosition),
        timeString: editDurationNormalized,
        isActive: editItemIsActive,
        order: Math.max(1, editItemOrder)
      });
      cancelEditItem();
      await loadPlaylistItems(selectedPlaylistId);
    } catch (error) {
      setEditItemFormError(error instanceof Error ? error.message : "Unable to update item.");
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!selectedPlaylistId) return;
    await onDeleteItem(itemId);
    await loadPlaylistItems(selectedPlaylistId);
  };

  const playlistColumns: DataTableColumn<PlaylistSummaryItem>[] = [
    {
      key: "name",
      header: "Playlist",
      cellClassName: "font-semibold text-slateWarm-900",
      render: (playlist) => playlist.name
    },
    {
      key: "layout",
      header: "Layout",
      cellClassName: "text-slate-700",
      render: (playlist) => layoutNameById.get(playlist.layoutId) ?? "Unassigned"
    },
    {
      key: "actions",
      header: "Actions",
      render: (playlist) => (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={actionBusy}
            onClick={(event) => {
              event.stopPropagation();
              openItems(playlist.id);
            }}
            className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
          >
            Items
          </button>
          <button
            type="button"
            disabled={actionBusy}
            onClick={(event) => {
              event.stopPropagation();
              startEdit(playlist);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={actionBusy}
            onClick={(event) => {
              event.stopPropagation();
              void onDelete(playlist.id);
            }}
            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  const itemColumns: DataTableColumn<PlaylistItem>[] = [
    {
      key: "order",
      header: "Order",
      cellClassName: "text-slate-700",
      render: (item) =>
        editingItemId === item.id ? (
          <input
            type="number"
            min={1}
            value={editItemOrder}
            onChange={(event) => setEditItemOrder(Number(event.target.value))}
            className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
          />
        ) : (
          item.order
        )
    },
    {
      key: "content",
      header: "Content",
      cellClassName: "text-slate-700",
      render: (item) =>
        editingItemId === item.id ? (
          <div className="space-y-1">
            <select
              value={editItemContentId}
              onChange={(event) => setEditItemContentId(event.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            >
              {contents.map((content) => (
                <option key={content.id} value={content.id}>
                  {content.name}
                </option>
              ))}
            </select>
            {selectedEditContent?.fullUrl && isImageContentType(selectedEditContent.contentType) ? (
              <img
                src={selectedEditContent.fullUrl}
                alt={selectedEditContent.name}
                loading="lazy"
                className="h-10 w-16 rounded border border-slate-200 object-cover"
              />
            ) : null}
          </div>
        ) : (() => {
          const content = contentById.get(item.contentId);
          if (!content) {
            return contentNameById.get(item.contentId) ?? item.contentId;
          }

          return (
            <div className="flex min-w-0 items-center gap-2">
              {content.fullUrl && isImageContentType(content.contentType) ? (
                <img
                  src={content.fullUrl}
                  alt={content.name}
                  loading="lazy"
                  className="h-8 w-12 shrink-0 rounded border border-slate-200 object-cover"
                />
              ) : null}
              <span className="truncate">{content.name}</span>
            </div>
          );
        })()
    },
    {
      key: "layoutPosition",
      header: "Zone",
      cellClassName: "text-slate-700",
      render: (item) =>
        editingItemId === item.id ? (
          <select
            value={editItemLayoutPosition}
            onChange={(event) => setEditItemLayoutPosition(Number(event.target.value))}
            className="w-36 rounded border border-slate-300 px-2 py-1 text-xs"
          >
            {zoneOptions.map((zone) => (
              <option key={zone.key} value={zone.position}>
                {zone.label}
              </option>
            ))}
          </select>
        ) : (
          zoneLabelByPosition.get(item.layoutPosition) ?? `Zone ${item.layoutPosition}`
        )
    },
    {
      key: "timestring",
      header: "Duration",
      cellClassName: "text-slate-700",
      render: (item) =>
        editingItemId === item.id ? (
          <div className="space-y-1">
            <input
              list="duration-presets-edit"
              type="text"
              inputMode="numeric"
              value={editItemTimeString}
              onChange={(event) => {
                setEditItemTimeString(event.target.value);
                if (editItemDurationError) {
                  setEditItemDurationError(null);
                }
              }}
              onBlur={() => {
                const normalized = normalizeDurationValue(editItemTimeString);
                if (normalized) {
                  setEditItemTimeString(normalized);
                  setEditItemDurationError(null);
                }
              }}
              placeholder="HH:MM:SS"
              className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <datalist id="duration-presets-edit">
              {DURATION_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
            {editItemDurationError || editDurationInvalid ? (
              <p className="text-[11px] text-rose-700">
                {editItemDurationError ?? "Use HH:MM:SS, MM:SS, or seconds."}
              </p>
            ) : null}
          </div>
        ) : (
          normalizeDurationValue(item.timeString) || item.timeString || "--"
        )
    },
    {
      key: "active",
      header: "Active",
      render: (item) =>
        editingItemId === item.id ? (
          <input
            type="checkbox"
            checked={editItemIsActive}
            onChange={(event) => setEditItemIsActive(event.target.checked)}
          />
        ) : (
          <span className={item.isActive ? "text-emerald-700" : "text-slate-500"}>
            {item.isActive ? "Yes" : "No"}
          </span>
        )
    },
    {
      key: "actions",
      header: "Actions",
      render: (item) => (
        <div className="flex gap-2">
          {editingItemId === item.id ? (
            <>
              <button
                type="button"
                disabled={actionBusy || !isValidDurationValue(editItemTimeString)}
                onClick={() => void submitUpdateItem()}
                className="rounded border border-brand-300 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"
              >
                Save
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={cancelEditItem}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => startEditItem(item)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void deleteItem(item.id)}
                className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <section className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title="Create Playlist"
          subtitle="Name it and choose a layout"
          action={
            <button
              type="button"
              onClick={() => void onReloadLayouts()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Refresh Layouts
            </button>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Name
              </span>
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                placeholder="Playlist name"
              />
            </label>

            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Layout</span>
              <LayoutPreviewPicker layouts={layouts} selectedLayoutId={createLayoutId} onSelect={setCreateLayoutId} />
            </div>

            <button
              type="button"
              disabled={actionBusy || layoutsLoading || !createName.trim() || !createLayoutId.trim()}
              onClick={() => void submitCreate()}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {actionBusy ? "Working..." : "Create Playlist"}
            </button>
            {layoutsLoading ? <p className="text-xs text-slate-500">Loading layouts...</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Playlists" subtitle="Open a playlist to manage its items">
          <DataTable
            columns={playlistColumns}
            rows={playlists}
            getRowKey={(playlist) => playlist.id}
            emptyMessage="No playlists available."
          />
        </SectionCard>
      </section>

      <ManagementModal
        open={isEditModalOpen}
        onClose={() => {
          if (actionBusy) return;
          cancelEdit();
        }}
        title="Edit Playlist"
        subtitle="Update playlist name and layout"
        maxWidthClassName="max-w-xl"
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</span>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
            />
          </label>
          <div className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Layout</span>
            <LayoutPreviewPicker layouts={layouts} selectedLayoutId={editLayoutId} onSelect={setEditLayoutId} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={actionBusy || !editName.trim() || !editLayoutId.trim()}
              onClick={() => void submitUpdate()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-65"
            >
              Save Changes
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </ManagementModal>

      <ManagementModal
        open={isItemsModalOpen}
        onClose={() => {
          if (actionBusy) return;
          setIsItemsModalOpen(false);
          setItemFormError(null);
          setEditItemFormError(null);
          cancelEditItem();
        }}
        title={selectedPlaylist ? `Playlist Items - ${selectedPlaylist.name}` : "Playlist Items"}
        subtitle="Pick a zone, then add and arrange content"
      >
        {selectedPlaylist ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Layout Zones</p>
              <div className="mt-2">
                <ZoneCanvasPicker
                  layout={selectedPlaylistLayout}
                  zones={zoneOptions}
                  selectedPosition={selectedZonePosition}
                  onSelect={setSelectedZonePosition}
                />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Selected:{" "}
                <span className="font-semibold text-slate-800">
                  {zoneLabelByPosition.get(selectedZonePosition) ?? `Zone ${selectedZonePosition}`}
                </span>{" "}
                • {zoneItems.length} item{zoneItems.length === 1 ? "" : "s"} • Loop{" "}
                <span className="font-semibold">{toDurationString(zoneLoopDurationSeconds)}</span>
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-[1.7fr_0.9fr_auto]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Content
                </span>
                <select
                  value={itemContentId}
                  onChange={(event) => setItemContentId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                >
                  {contents.map((content) => (
                    <option key={content.id} value={content.id}>
                      {content.name}
                    </option>
                  ))}
                </select>
                {selectedCreateContent?.fullUrl && isImageContentType(selectedCreateContent.contentType) ? (
                  <img
                    src={selectedCreateContent.fullUrl}
                    alt={selectedCreateContent.name}
                    loading="lazy"
                    className="mt-1 h-12 w-20 rounded border border-slate-200 object-cover"
                  />
                ) : null}
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Duration
                </span>
                <input
                  list="duration-presets-create"
                  type="text"
                  inputMode="numeric"
                  value={itemTimeString}
                  onChange={(event) => {
                    setItemTimeString(event.target.value);
                    if (itemDurationError) {
                      setItemDurationError(null);
                    }
                  }}
                  onBlur={() => {
                    const normalized = normalizeDurationValue(itemTimeString);
                    if (normalized) {
                      setItemTimeString(normalized);
                      setItemDurationError(null);
                    }
                  }}
                  placeholder="HH:MM:SS"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                />
                <datalist id="duration-presets-create">
                  {DURATION_PRESETS.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-slate-500">Accepted: HH:MM:SS, MM:SS, or seconds.</p>
                {itemDurationError || createDurationInvalid ? (
                  <p className="mt-1 text-[11px] text-rose-700">
                    {itemDurationError ?? "Use HH:MM:SS, MM:SS, or seconds."}
                  </p>
                ) : null}
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={itemIsActive}
                    onChange={(event) => setItemIsActive(event.target.checked)}
                  />
                  Active item
                </label>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={actionBusy || !itemContentId || !createDurationNormalized}
                  onClick={() => void submitCreateItem()}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  Add Item
                </button>
              </div>
            </div>
            {itemFormError ? <p className="text-xs text-rose-700">{itemFormError}</p> : null}
            {editItemFormError ? <p className="text-xs text-rose-700">{editItemFormError}</p> : null}

            <DataTable
              columns={itemColumns}
              rows={zoneItems}
              getRowKey={(item) => item.id}
              emptyMessage={
                itemsLoading
                  ? "Loading items..."
                  : `No items in ${zoneLabelByPosition.get(selectedZonePosition) ?? `Zone ${selectedZonePosition}`}.`
              }
            />
          </div>
        ) : (
          <p className="text-sm text-slate-600">Select a playlist row and open its items.</p>
        )}
      </ManagementModal>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </p>
      ) : null}
      {itemsError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {itemsError}
        </p>
      ) : null}
    </section>
  );
}
