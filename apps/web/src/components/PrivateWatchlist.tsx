import type { ApiError } from "@teemtape/api-client";
import { getDashboardUrl } from "../config";

/**
 * Shown in place of the table when the API's authorisation hook refuses the
 * list: 401 (sign in) or 403 (signed in, but no role on this list).
 */
export function PrivateWatchlist({ error }: { error: ApiError }) {
  const signInUrl = error.signInUrl ?? getDashboardUrl();
  const forbidden = error.reason === "forbidden";

  return (
    <div className="private-panel" role="status">
      <div className="private-panel-icon" aria-hidden="true">
        🔒
      </div>
      <h2>{forbidden ? "You don't have access to this watchlist" : "This watchlist is private"}</h2>
      <p>
        {forbidden
          ? "You're signed in, but the owner hasn't given you a role on this list. Ask them for an invite."
          : "The owner has turned off link access. Sign in to teemtape Pro if you've been invited."}
      </p>
      {signInUrl && !forbidden && (
        <a className="btn primary" href={signInUrl}>
          Sign in
        </a>
      )}
      <p className="private-panel-hint">
        Using the CLI or an agent? Run <code>teemtape login</code> with an access token.
      </p>
    </div>
  );
}
