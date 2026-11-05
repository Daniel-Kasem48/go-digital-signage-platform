import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { AuthSession } from "../../shared/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  isBootstrapping: boolean;
  configError: string | null;
}

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const ENV_TENANT_ID = import.meta.env.VITE_API_TENANT_ID ?? "";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function buildSessionFromEnv(): { session: AuthSession | null; error: string | null } {
  const baseUrl = ENV_API_BASE_URL.trim();
  const tenantId = ENV_TENANT_ID.trim();
  const missing: string[] = [];

  if (!baseUrl) missing.push("VITE_API_BASE_URL");
  if (!tenantId) missing.push("VITE_API_TENANT_ID");

  if (missing.length > 0) {
    return {
      session: null,
      error: `Missing required env vars: ${missing.join(", ")}`
    };
  }

  return {
    session: {
      username: tenantId,
      tenantId,
      baseUrl,
      loggedInAt: new Date().toISOString()
    },
    error: null
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const envSession = buildSessionFromEnv();
    setSession(envSession.session);
    setConfigError(envSession.error);
    setIsBootstrapping(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isBootstrapping,
      configError
    }),
    [session, isBootstrapping, configError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
