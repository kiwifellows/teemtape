import { TeemtapeClient } from "@teemtape/api-client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getApiUrl } from "../config";

const ApiContext = createContext<TeemtapeClient | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new TeemtapeClient({ baseUrl: getApiUrl() }), []);
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
  return useMemo(() => new TeemtapeClient({ baseUrl: getApiUrl(), token }), [token]);
}
