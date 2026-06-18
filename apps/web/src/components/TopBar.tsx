import { useTheme } from "../hooks/useTheme";

export function TopBar({
  onAddSymbol,
  addingSymbol,
}: {
  onAddSymbol: () => void;
  addingSymbol?: boolean;
}) {
  const { toggleTheme, themeLabel } = useTheme();

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
          className="btn ghost small"
          href="https://github.com/kiwifellows/teemtape"
          target="_blank"
          rel="noreferrer"
        >
          Docs
        </a>
        <button
          type="button"
          className="btn primary small"
          onClick={onAddSymbol}
          disabled={addingSymbol}
        >
          + Add symbol
        </button>
      </div>
    </header>
  );
}
