import { useCallback, useState } from "react";
import { shareUrlForToken } from "../config";

export function ShareBar({
  token,
  onNewLink,
  creatingLink,
}: {
  token: string;
  onNewLink: () => void;
  creatingLink?: boolean;
}) {
  const url = shareUrlForToken(token);
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* fallback: select the visible text isn't ideal; user can copy manually */
    }
  }, [url]);

  return (
    <div className="share-bar">
      <span className="label">Your watchlist link</span>
      <span className="url" title={url}>
        {url}
      </span>
      <button type="button" className="btn small" onClick={() => void copyLink()}>
        {copied ? "Copied ✓" : "Copy"}
      </button>
      <button
        type="button"
        className="btn ghost small"
        onClick={onNewLink}
        disabled={creatingLink}
      >
        New link
      </button>
    </div>
  );
}
