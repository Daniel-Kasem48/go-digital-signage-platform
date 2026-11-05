interface TopbarProps {
  generatedAt?: string;
  username?: string;
  onLogout?: () => Promise<void>;
}

export function Topbar({ generatedAt, username, onLogout }: TopbarProps) {
  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleString()
    : new Date().toLocaleString();

  return (
    <header className="panel-surface mb-5 px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slateWarm-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500">Live view of devices, channels, playlists, and recent activity</p>
        </div>
        <div className="flex items-center gap-3">
          {username ? <span className="pill">Signed in: {username}</span> : null}
          <span className="pill">Tenant aware</span>
          <span className="pill">Updated {formattedDate}</span>
          {onLogout ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
