import { useTheme } from "../hooks/useTheme";
import { useWhoami } from "../hooks/useWhoami";

export function TopBar({
  onAddSymbol,
  addingSymbol,
  addSymbolBlocked,
}: {
  onAddSymbol: () => void;
  addingSymbol?: boolean;
  /** Why adding is not allowed here (disables the button and explains on hover). */
  addSymbolBlocked?: string;
}) {
  const { toggleTheme, themeLabel } = useTheme();
  const { user, dashboardUrl } = useWhoami();

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark">t</span>
        teemtape
      </div>
      <div className="actions">
        <span className="pill delayed">
          <span className="dot" />
          Delayed ~1 min
        </span>
        <button type="button" className="btn ghost small" onClick={toggleTheme}>
          {themeLabel}
        </button>
        <a
          className="btn ghost small icon-only"
          href="https://github.com/kiwifellows/teemtape"
          target="_blank"
          rel="noreferrer"
          aria-label="View teemtape on GitHub"
          title="View on GitHub"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
          </svg>
          <span className="sr-only">GitHub</span>
        </a>
        {dashboardUrl && user === null && (
          <a className="btn ghost small" href={dashboardUrl}>
            Sign in
          </a>
        )}
        {dashboardUrl && user && (
          <a className="btn ghost small" href={dashboardUrl} title="Open teemtape Pro">
            <span className="handle-chip">{user.handle}</span> · Open app
          </a>
        )}
        <button
          type="button"
          className="btn primary small"
          onClick={onAddSymbol}
          disabled={addingSymbol || Boolean(addSymbolBlocked)}
          title={addSymbolBlocked}
          aria-disabled={Boolean(addSymbolBlocked)}
        >
          + Add symbol
        </button>
      </div>
    </header>
  );
}
