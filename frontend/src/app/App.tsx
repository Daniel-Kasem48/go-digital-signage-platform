import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { DashboardPage } from "../pages/DashboardPage";

function AuthenticatedApp() {
  const { session, isBootstrapping, configError } = useAuth();

  if (isBootstrapping) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[600px] items-center justify-center p-4">
        <div className="panel-surface p-6">
          <p className="text-sm text-slate-600">Initializing session...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[900px] items-center justify-center p-4">
        <section className="panel-surface w-full max-w-[720px] p-6">
          <h1 className="font-heading text-2xl font-bold text-slateWarm-900">Frontend Configuration Required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Login has been removed. This dashboard now uses tenant-scoped API access directly from frontend
            environment variables.
          </p>
          <p className="mt-4 text-sm text-slate-700">Set these values in `frontend/.env` and restart Vite:</p>
          <pre className="mt-2 rounded-lg bg-slate-900/95 p-3 text-xs text-slate-100">
{`VITE_API_BASE_URL=https://signage.divsuite.com
VITE_API_TENANT_ID=public`}
          </pre>
          {configError ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {configError}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return <DashboardPage />;
}

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
