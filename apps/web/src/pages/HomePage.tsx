import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardUrl } from "../config";
import { useApi } from "../context/ApiContext";

/**
 * The bare domain. Anonymous visitors get a fresh watchlist — the link is the
 * account, so there is nothing else to land on.
 *
 * Signed-in Pro users instead land on the list they saved most recently
 * (the authoriser picks it; see `lastWatchlist` in docs/authz-contract.md).
 * Minting a new list on every visit left their account littered with empty
 * ones. They can still start a fresh list with "New link" on any watchlist.
 * Falls back to creating one whenever there is nothing to open: not signed in,
 * no saved lists yet, or whoami failed.
 */
export function HomePage() {
  const client = useApi();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(!getDashboardUrl());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (getDashboardUrl()) {
          // A failure here just means "carry on and make a new list".
          const who = await client.whoami().catch(() => null);
          const last = who?.lastWatchlist?.token;
          if (last) {
            if (!cancelled) void navigate(`/w/${last}`, { replace: true });
            return;
          }
        }
        if (cancelled) return;
        setCreating(true);
        const watchlist = await client.createWatchlist();
        if (!cancelled) {
          void navigate(`/w/${watchlist.token}`, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to create watchlist");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, navigate]);

  return (
    <div className="page-center">
      <div className="brand" style={{ marginBottom: 16 }}>
        <span className="mark">t</span>
        teemtape
      </div>
      {error ? (
        <div className="status-banner error">{error}</div>
      ) : (
        <p className="muted">{creating ? "Creating your watchlist…" : "Opening your watchlist…"}</p>
      )}
    </div>
  );
}
