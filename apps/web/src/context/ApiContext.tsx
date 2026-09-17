import { TeemtapeClient } from "@teemtape/api-client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getApiUrl, getDashboardUrl } from "../config";

const ApiContext = createContext<TeemtapeClient | null>(null);

/** Send the `.teemtape.com` session cookie only when a Pro app is configured. */
function clientOptions(token?: string) {
  return {
    baseUrl: getApiUrl(),
    token,
    credentials: getDashboardUrl() ? ("include" as const) : undefined,
  };
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new TeemtapeClient(clientOptions()), []);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): TeemtapeClient {
  const client = useContext(ApiContext);
  if (!client) {
    throw new Error("useApi must be used within ApiProvider");
  }
  return client;
}

export function useApiForToken(token: string): TeemtapeClient {
  return useMemo(() => new TeemtapeClient(clientOptions(token)), [token]);
}
