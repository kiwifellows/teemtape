import { useEffect, useState } from "react";
import { getDashboardUrl } from "../config";
import { useApi } from "../context/ApiContext";

export interface Whoami {
  /** Undefined while loading; null when anonymous or when no Pro app is configured. */
  user: { handle: string } | null | undefined;
  dashboardUrl: string | undefined;
}

/**
 * Who is the viewer, according to the API's optional authorisation hook?
 * Does nothing on self-hosted builds (no VITE_DASHBOARD_URL) — the public app
 * has no sign-in of its own; it only reflects a session the Pro app created.
 */
export function useWhoami(): Whoami {
  const client = useApi();
  const dashboardUrl = getDashboardUrl();
  const [user, setUser] = useState<Whoami["user"]>(dashboardUrl ? undefined : null);

  useEffect(() => {
    if (!dashboardUrl) return;
    let cancelled = false;
    client
      .whoami()
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [client, dashboardUrl]);

  return { user, dashboardUrl };
}
