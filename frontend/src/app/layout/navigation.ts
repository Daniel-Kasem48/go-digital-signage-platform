export type DashboardTab =
  | "overview"
  | "devices"
  | "channels"
  | "schedules"
  | "playlists"
  | "layouts"
  | "contents";

export interface DashboardNavItem {
  key: DashboardTab;
  label: string;
  description: string;
}

export interface DashboardNavSection {
  id: string;
  label: string;
  items: DashboardNavItem[];
}

export const DASHBOARD_NAV_SECTIONS: DashboardNavSection[] = [
  {
    id: "monitoring",
    label: "Monitoring",
    items: [
      { key: "overview", label: "Overview", description: "KPIs and activity" },
      { key: "devices", label: "Devices", description: "Health and realtime playback" },
      { key: "channels", label: "Channels", description: "Channel operations and publishing" },
      { key: "schedules", label: "Schedules", description: "Calendar and time windows" }
    ]
  },
  {
    id: "programming",
    label: "Programming",
    items: [
      { key: "playlists", label: "Playlists", description: "Playlist and item sequencing" },
      { key: "layouts", label: "Layouts", description: "Zone-based screen layouts" }
    ]
  },
  {
    id: "library",
    label: "Library",
    items: [{ key: "contents", label: "Contents", description: "Media assets and previews" }]
  },
];

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = DASHBOARD_NAV_SECTIONS.flatMap((section) => section.items);

export function isDashboardTab(value: string): value is DashboardTab {
  return DASHBOARD_NAV_ITEMS.some((item) => item.key === value);
}
