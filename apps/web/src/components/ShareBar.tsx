import { useCallback, useState } from "react";
import { shareUrlForToken } from "../config";

const SHARE_WARNING =
  "Keep this private. Anyone with this link can view your watchlist and post notes anonymously — only share it with people you trust or your AI agent.";

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
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      /* fallback: select the visible text isn't ideal; user can copy manually */
    }
  }, [url]);

  return (
    <div className="share-bar-wrap">
      <div className="share-bar">
        <span className="label">Your watchlist link</span>
        <span className="url has-tooltip" data-tooltip={SHARE_WARNING} tabIndex={0}>
          <span className="url-text">{url}</span>
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
      <p className={`share-hint${copied ? " flash" : ""}`} role="status" aria-live="polite">
        <span className="lock" aria-hidden="true">
          🔒
        </span>
        {copied
          ? "Copied. Share this link only in private or with your AI agent — anyone who has it can view your watchlist and post notes anonymously."
          : "Private link. Share only with people you trust or your AI agent — anyone with it can view your watchlist and post notes anonymously."}
      </p>
    </div>
  );
}
