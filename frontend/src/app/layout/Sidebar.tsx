import { DASHBOARD_NAV_SECTIONS, type DashboardTab } from "./navigation";

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="panel-surface w-full p-4 lg:max-h-[calc(100vh-2rem)] lg:max-w-[260px] lg:overflow-y-auto">
      <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-5 text-white">
        <p className="font-heading text-sm uppercase tracking-[0.16em] text-brand-100">Digital Signage</p>
        <p className="mt-1 text-lg font-semibold">Control Room</p>
      </div>

      <nav className="mt-4 space-y-3">
        {DASHBOARD_NAV_SECTIONS.map((section) => (
          <section key={section.id}>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onTabChange(item.key)}
                  className={
                    item.key === activeTab
                      ? "w-full rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-left"
                      : "w-full rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50"
                  }
                >
                  <p
                    className={
                      item.key === activeTab
                        ? "text-sm font-semibold text-brand-700"
                        : "text-sm font-medium text-slate-700"
                    }
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{item.description}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
