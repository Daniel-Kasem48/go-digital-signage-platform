import { useEffect, useMemo, useState } from "react";
import type { LayoutMutationInput, LayoutOption, PlaylistSummaryItem } from "../../../entities/dashboard/types";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SectionCard } from "./SectionCard";

interface LayoutManagementProps {
  layouts: LayoutOption[];
  playlists: PlaylistSummaryItem[];
  actionBusy: boolean;
  errorMessage: string | null;
  onCreate: (input: LayoutMutationInput) => Promise<void>;
  onUpdate: (layoutId: string, input: LayoutMutationInput) => Promise<void>;
  onDelete: (layoutId: string) => Promise<void>;
}

interface EditableZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragMode =
  | "move"
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se";

interface DragState {
  zoneId: string;
  mode: DragMode;
  originClientX: number;
  originClientY: number;
  canvasWidth: number;
  canvasHeight: number;
  zoneStart: EditableZone;
}

const MIN_ZONE_SIZE = 8;
const ZONE_COLORS = [
  "bg-sky-500/70",
  "bg-emerald-500/70",
  "bg-amber-500/70",
  "bg-rose-500/70",
  "bg-violet-500/70",
  "bg-cyan-500/70"
];

const DEFAULT_ZONES: EditableZone[] = [
  {
    id: "zone-1",
    name: "Main",
    x: 0,
    y: 0,
    width: 100,
    height: 100
  }
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPercentageNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.trim().replace("%", "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeZone(raw: unknown, index: number): EditableZone {
  if (!raw || typeof raw !== "object") {
    const fallback = DEFAULT_ZONES[0];
    return {
      id: `zone-${index + 1}`,
      name: `Zone ${index + 1}`,
      x: fallback?.x ?? 0,
      y: fallback?.y ?? 0,
      width: fallback?.width ?? 100,
      height: fallback?.height ?? 100
    };
  }

  const item = raw as Record<string, unknown>;
  const width = clamp(toPercentageNumber(item.width, 100), MIN_ZONE_SIZE, 100);
  const height = clamp(toPercentageNumber(item.height, 100), MIN_ZONE_SIZE, 100);
  const x = clamp(toPercentageNumber(item.x, 0), 0, 100 - width);
  const y = clamp(toPercentageNumber(item.y, 0), 0, 100 - height);

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id : `zone-${index + 1}`,
    name: typeof item.name === "string" && item.name.trim() ? item.name : `Zone ${index + 1}`,
    x: roundToTwo(x),
    y: roundToTwo(y),
    width: roundToTwo(width),
    height: roundToTwo(height)
  };
}

function zonesFromUnknown(input: unknown): EditableZone[] {
  if (Array.isArray(input)) {
    const zones = input.map((item, index) => normalizeZone(item, index));
    return zones.length > 0 ? zones : DEFAULT_ZONES;
  }

  if (input && typeof input === "object") {
    const objectValue = input as Record<string, unknown>;
    if (Array.isArray(objectValue.zones)) {
      const zones = objectValue.zones.map((item, index) => normalizeZone(item, index));
      return zones.length > 0 ? zones : DEFAULT_ZONES;
    }

    const values = Object.values(objectValue);
    if (values.length > 0) {
      const zones = values.map((item, index) => normalizeZone(item, index));
      return zones.length > 0 ? zones : DEFAULT_ZONES;
    }
  }

  return DEFAULT_ZONES;
}

function serializeZones(zones: EditableZone[]): unknown {
  return zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    x: roundToTwo(zone.x),
    y: roundToTwo(zone.y),
    width: `${roundToTwo(zone.width)}%`,
    height: `${roundToTwo(zone.height)}%`
  }));
}

function sanitizeZone(zone: EditableZone): EditableZone {
  const width = clamp(zone.width, MIN_ZONE_SIZE, 100);
  const height = clamp(zone.height, MIN_ZONE_SIZE, 100);
  const x = clamp(zone.x, 0, 100 - width);
  const y = clamp(zone.y, 0, 100 - height);

  return {
    ...zone,
    x: roundToTwo(x),
    y: roundToTwo(y),
    width: roundToTwo(width),
    height: roundToTwo(height)
  };
}

function createNewZone(existingCount: number): EditableZone {
  const size = clamp(42 - existingCount * 2, 20, 42);
  const offset = (existingCount * 9) % 50;
  return sanitizeZone({
    id: `zone-${existingCount + 1}`,
    name: `Zone ${existingCount + 1}`,
    x: offset,
    y: clamp(offset / 2, 0, 100 - size),
    width: size,
    height: size
  });
}

function zoneStyle(zone: EditableZone): React.CSSProperties {
  return {
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.width}%`,
    height: `${zone.height}%`
  };
}

function applyDrag(dragState: DragState, event: PointerEvent): EditableZone {
  const dxPct = ((event.clientX - dragState.originClientX) / dragState.canvasWidth) * 100;
  const dyPct = ((event.clientY - dragState.originClientY) / dragState.canvasHeight) * 100;

  const start = dragState.zoneStart;
  if (dragState.mode === "move") {
    return sanitizeZone({
      ...start,
      x: start.x + dxPct,
      y: start.y + dyPct
    });
  }

  let nextX = start.x;
  let nextY = start.y;
  let nextWidth = start.width;
  let nextHeight = start.height;

  if (dragState.mode === "resize-e" || dragState.mode === "resize-ne" || dragState.mode === "resize-se") {
    nextWidth = start.width + dxPct;
  }
  if (dragState.mode === "resize-w" || dragState.mode === "resize-sw" || dragState.mode === "resize-nw") {
    nextX = start.x + dxPct;
    nextWidth = start.width - dxPct;
  }
  if (dragState.mode === "resize-s" || dragState.mode === "resize-sw" || dragState.mode === "resize-se") {
    nextHeight = start.height + dyPct;
  }
  if (dragState.mode === "resize-n" || dragState.mode === "resize-nw" || dragState.mode === "resize-ne") {
    nextY = start.y + dyPct;
    nextHeight = start.height - dyPct;
  }

  return sanitizeZone({
    ...start,
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight
  });
}

function LayoutZonesEditor({
  zones,
  onChange,
  disabled
}: {
  zones: EditableZone[];
  onChange: (zones: EditableZone[]) => void;
  disabled: boolean;
}) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id ?? "");
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    if (zones.length === 0) {
      setSelectedZoneId("");
      return;
    }
    if (!zones.some((zone) => zone.id === selectedZoneId)) {
      const firstZone = zones[0];
      if (firstZone) {
        setSelectedZoneId(firstZone.id);
      }
    }
  }, [zones, selectedZoneId]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? zones[0] ?? null,
    [zones, selectedZoneId]
  );

  const updateZone = (zoneId: string, updater: (zone: EditableZone) => EditableZone) => {
    onChange(zones.map((zone) => (zone.id === zoneId ? sanitizeZone(updater(zone)) : zone)));
  };

  const updateSelectedZone = (patch: Partial<EditableZone>) => {
    if (!selectedZone) return;
    updateZone(selectedZone.id, (zone) => ({ ...zone, ...patch }));
  };

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !selectedZone) return;

    const isArrowKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key);
    if (!isArrowKey) return;

    event.preventDefault();
    const step = event.shiftKey ? 2 : 1;

    // Arrow keys move zone; Shift + arrows extend/shrink zone.
    if (event.shiftKey) {
      switch (event.key) {
        case "ArrowUp":
          updateZone(selectedZone.id, (zone) => ({ ...zone, height: zone.height - step }));
          break;
        case "ArrowDown":
          updateZone(selectedZone.id, (zone) => ({ ...zone, height: zone.height + step }));
          break;
        case "ArrowLeft":
          updateZone(selectedZone.id, (zone) => ({ ...zone, width: zone.width - step }));
          break;
        case "ArrowRight":
          updateZone(selectedZone.id, (zone) => ({ ...zone, width: zone.width + step }));
          break;
        default:
          break;
      }
      return;
    }

    switch (event.key) {
      case "ArrowUp":
        updateZone(selectedZone.id, (zone) => ({ ...zone, y: zone.y - step }));
        break;
      case "ArrowDown":
        updateZone(selectedZone.id, (zone) => ({ ...zone, y: zone.y + step }));
        break;
      case "ArrowLeft":
        updateZone(selectedZone.id, (zone) => ({ ...zone, x: zone.x - step }));
        break;
      case "ArrowRight":
        updateZone(selectedZone.id, (zone) => ({ ...zone, x: zone.x + step }));
        break;
      default:
        break;
    }
  };

  const startDrag = (event: React.PointerEvent, zone: EditableZone, mode: DragMode) => {
    if (disabled) return;
    const canvas = event.currentTarget.closest("[data-zones-canvas='true']");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedZoneId(zone.id);
    setDragState({
      zoneId: zone.id,
      mode,
      originClientX: event.clientX,
      originClientY: event.clientY,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      zoneStart: zone
    });
  };

  useEffect(() => {
    if (!dragState) return undefined;

    const onPointerMove = (event: PointerEvent) => {
      event.preventDefault();
      const nextZone = applyDrag(dragState, event);
      updateZone(dragState.zoneId, () => nextZone);
    };

    const onPointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, zones]);

  const addZone = () => {
    if (disabled) return;
    const nextZone = createNewZone(zones.length);
    onChange([...zones, nextZone]);
    setSelectedZoneId(nextZone.id);
  };

  const removeSelected = () => {
    if (disabled || !selectedZone || zones.length <= 1) return;
    const nextZones = zones.filter((zone) => zone.id !== selectedZone.id);
    onChange(nextZones);
    setSelectedZoneId(nextZones[0]?.id ?? "");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={addZone}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
          >
            Add Zone
          </button>
          <button
            type="button"
            disabled={disabled || !selectedZone || zones.length <= 1}
            onClick={removeSelected}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-65"
          >
            Remove Selected
          </button>
        </div>

        <div
          data-zones-canvas="true"
          tabIndex={0}
          onKeyDown={handleCanvasKeyDown}
          className="relative h-64 w-full overflow-hidden rounded-xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 md:h-72 xl:h-80"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:28px_28px]" />
          {zones.map((zone, index) => {
            const isSelected = selectedZone?.id === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                style={zoneStyle(zone)}
                disabled={disabled}
                onClick={() => setSelectedZoneId(zone.id)}
                onPointerDown={(event) => startDrag(event, zone, "move")}
                className={`absolute rounded-lg border text-left shadow-sm transition ${
                  isSelected
                    ? "z-20 border-brand-700 ring-2 ring-brand-300"
                    : "z-10 border-white/75 hover:ring-1 hover:ring-brand-200"
                } ${ZONE_COLORS[index % ZONE_COLORS.length]} disabled:cursor-not-allowed`}
              >
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-black/10" />
                <div className="relative p-2 text-[11px] font-semibold text-white">
                  <p className="truncate">{zone.name}</p>
                  <p className="mt-0.5 font-mono text-[10px]">
                    {Math.round(zone.width)}% × {Math.round(zone.height)}%
                  </p>
                </div>

                {isSelected ? (
                  <>
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-n")}
                      className="absolute left-1/2 top-1 flex h-4 w-6 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded border border-white bg-brand-700 text-[9px] font-bold text-white"
                    >
                      ^
                    </span>
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-s")}
                      className="absolute bottom-1 left-1/2 flex h-4 w-6 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded border border-white bg-brand-700 text-[9px] font-bold text-white"
                    >
                      v
                    </span>
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-w")}
                      className="absolute left-1 top-1/2 flex h-6 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded border border-white bg-brand-700 text-[9px] font-bold text-white"
                    >
                      {"<"}
                    </span>
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-e")}
                      className="absolute right-1 top-1/2 flex h-6 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded border border-white bg-brand-700 text-[9px] font-bold text-white"
                    >
                      {">"}
                    </span>
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-nw")}
                      className="absolute left-1 top-1 h-3 w-3 cursor-nwse-resize rounded-full border border-white bg-brand-700"
                    />
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-ne")}
                      className="absolute right-1 top-1 h-3 w-3 cursor-nesw-resize rounded-full border border-white bg-brand-700"
                    />
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-sw")}
                      className="absolute bottom-1 left-1 h-3 w-3 cursor-nesw-resize rounded-full border border-white bg-brand-700"
                    />
                    <span
                      role="presentation"
                      onPointerDown={(event) => startDrag(event, zone, "resize-se")}
                      className="absolute bottom-1 right-1 h-3 w-3 cursor-nwse-resize rounded-full border border-white bg-brand-700"
                    />
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          Drag zone body to move. Drag arrow handles to extend. Keyboard: arrows move, Shift+arrows resize.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Zone Details</p>
        <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedZoneId(zone.id)}
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition ${
                selectedZone?.id === zone.id
                  ? "border-brand-300 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-200"
              } disabled:cursor-not-allowed disabled:opacity-65`}
            >
              <span className="truncate font-semibold">{zone.name}</span>
            </button>
          ))}
        </div>

        {selectedZone ? (
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Name
              </span>
              <input
                value={selectedZone.name}
                disabled={disabled}
                onChange={(event) => updateSelectedZone({ name: event.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  X (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selectedZone.x}
                  disabled={disabled}
                  onChange={(event) =>
                    updateSelectedZone({
                      x: clamp(Number(event.target.value), 0, 100 - selectedZone.width)
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Y (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selectedZone.y}
                  disabled={disabled}
                  onChange={(event) =>
                    updateSelectedZone({
                      y: clamp(Number(event.target.value), 0, 100 - selectedZone.height)
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Width (%)
                </span>
                <input
                  type="number"
                  min={MIN_ZONE_SIZE}
                  max={100}
                  step={0.5}
                  value={selectedZone.width}
                  disabled={disabled}
                  onChange={(event) =>
                    updateSelectedZone({
                      width: clamp(Number(event.target.value), MIN_ZONE_SIZE, 100 - selectedZone.x)
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Height (%)
                </span>
                <input
                  type="number"
                  min={MIN_ZONE_SIZE}
                  max={100}
                  step={0.5}
                  value={selectedZone.height}
                  disabled={disabled}
                  onChange={(event) =>
                    updateSelectedZone({
                      height: clamp(Number(event.target.value), MIN_ZONE_SIZE, 100 - selectedZone.y)
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
                />
              </label>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Select a zone to edit details.</p>
        )}
      </div>
    </div>
  );
}

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 md:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
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

export function LayoutManagement({
  layouts,
  playlists,
  actionBusy,
  errorMessage,
  onCreate,
  onUpdate,
  onDelete
}: LayoutManagementProps) {
  const usageCountByLayoutId = useMemo(() => {
    const map = new Map<string, number>();
    playlists.forEach((playlist) => {
      const layoutId = playlist.layoutId;
      if (!layoutId || layoutId === "Unassigned") return;
      map.set(layoutId, (map.get(layoutId) ?? 0) + 1);
    });
    return map;
  }, [playlists]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createZones, setCreateZones] = useState<EditableZone[]>(DEFAULT_ZONES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editZones, setEditZones] = useState<EditableZone[]>(DEFAULT_ZONES);
  const [localError, setLocalError] = useState<string | null>(null);

  const startEdit = (layout: LayoutOption) => {
    setEditingId(layout.id);
    setEditName(layout.name);
    setEditZones(zonesFromUnknown(layout.zones));
    setLocalError(null);
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setLocalError(null);
  };

  const closeCreateModal = () => {
    if (actionBusy) return;
    setIsCreateModalOpen(false);
    setLocalError(null);
  };

  const cancelEdit = () => {
    if (actionBusy) return;
    setEditingId(null);
    setEditName("");
    setEditZones(DEFAULT_ZONES);
    setLocalError(null);
  };

  const createLayoutHandler = async () => {
    const name = createName.trim();
    if (!name) {
      setLocalError("Layout name is required.");
      return;
    }

    setLocalError(null);
    try {
      await onCreate({
        name,
        zones: serializeZones(createZones)
      });
      setCreateName("");
      setCreateZones(DEFAULT_ZONES);
      setIsCreateModalOpen(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to create layout");
    }
  };

  const updateLayoutHandler = async () => {
    const layoutId = editingId;
    const name = editName.trim();
    if (!layoutId) return;
    if (!name) {
      setLocalError("Layout name is required.");
      return;
    }

    setLocalError(null);
    try {
      await onUpdate(layoutId, {
        name,
        zones: serializeZones(editZones)
      });
      cancelEdit();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to update layout");
    }
  };

  const columns: DataTableColumn<LayoutOption>[] = [
    {
      key: "name",
      header: "Layout",
      cellClassName: "font-semibold text-slateWarm-900",
      render: (layout) => layout.name
    },
    {
      key: "usage",
      header: "Used By Playlists",
      cellClassName: "text-slate-700",
      render: (layout) => usageCountByLayoutId.get(layout.id) ?? 0
    },
    {
      key: "zones",
      header: "Zones",
      cellClassName: "text-slate-700",
      render: (layout) => zonesFromUnknown(layout.zones).length
    },
    {
      key: "updatedAt",
      header: "Updated",
      cellClassName: "text-slate-700",
      render: (layout) => (layout.updatedAt ? new Date(layout.updatedAt).toLocaleString() : "Unknown")
    },
    {
      key: "actions",
      header: "Actions",
      render: (layout) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={actionBusy}
            onClick={(event) => {
              event.stopPropagation();
              startEdit(layout);
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={actionBusy}
            onClick={(event) => {
              event.stopPropagation();
              if (!window.confirm(`Delete layout "${layout.name}"?`)) return;
              void onDelete(layout.id);
            }}
            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-65"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="space-y-4">
      <SectionCard
        title="Layouts"
        subtitle="Design screen zones and save reusable templates"
        action={
          <button
            type="button"
            onClick={openCreateModal}
            disabled={actionBusy}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-65"
          >
            Create Layout
          </button>
        }
      >
        <DataTable columns={columns} rows={layouts} getRowKey={(layout) => layout.id} emptyMessage="No layouts available." />
      </SectionCard>

      <ModalShell
        open={isCreateModalOpen}
        title="Create Layout"
        subtitle="Drag zones, resize with arrows, then save"
        onClose={closeCreateModal}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</span>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Layout name"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-300 transition focus:ring-2"
            />
          </label>
          <LayoutZonesEditor zones={createZones} onChange={setCreateZones} disabled={actionBusy} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={actionBusy || !createName.trim()}
              onClick={() => void createLayoutHandler()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy ? "Working..." : "Create Layout"}
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={closeCreateModal}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(editingId)}
        title="Edit Layout"
        subtitle="Update zones and save changes"
        onClose={cancelEdit}
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
          <LayoutZonesEditor zones={editZones} onChange={setEditZones} disabled={actionBusy} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={actionBusy || !editName.trim()}
              onClick={() => void updateLayoutHandler()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy ? "Working..." : "Save Changes"}
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </ModalShell>

      {localError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{localError}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMessage}</p>
      ) : null}
    </section>
  );
}
