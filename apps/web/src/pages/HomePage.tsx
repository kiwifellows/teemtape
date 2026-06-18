import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../context/ApiContext";

export function HomePage() {
  const client = useApi();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
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
        <p className="muted">Creating your watchlist…</p>
      )}
    </div>
  );
}
