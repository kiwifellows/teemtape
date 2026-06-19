import { ApiError, type TeemtapeClient } from "@teemtape/api-client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { isValidHandle, normalizeHandle } from "../config";

/**
 * Lightweight, sign-in-free identity picker. On first use we suggest a unique,
 * auto-generated handle (reserved server-side) that the user can keep or change.
 * The chosen handle is claimed via the API and persisted by the caller.
 */
export function HandleDialog({
  client,
  currentHandle,
  onSave,
  onClose,
}: {
  client: TeemtapeClient;
  currentHandle: string | null;
  onSave: (handle: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(currentHandle ?? "");
  // The auto-generated handle we already reserved server-side (so saving it
  // unchanged needs no extra round-trip).
  const [reserved, setReserved] = useState<string | null>(null);
  const [loading, setLoading] = useState(!currentHandle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { handle } = await client.createHandle();
      setReserved(handle);
      setValue(handle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not suggest a handle");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!currentHandle) void suggest();
  }, [currentHandle, suggest]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const normalized = normalizeHandle(value);
  const valid = isValidHandle(value);

  const save = async () => {
    if (saving || !valid) return;
    // No change, or claiming the handle we already reserved — nothing to do.
    if (normalized === currentHandle || normalized === reserved) {
      onSave(normalized);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { handle } = await client.createHandle(normalized);
      onSave(handle);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(`"${normalized}" is taken — try another or shuffle for a new one.`);
      } else {
        setError(err instanceof Error ? err.message : "Could not save handle");
      }
      setSaving(false);
    }
  };

  return (
    <div
      className="overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="popup handle-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="popup-head">
          <div className="popup-title">
            <span className="sym" id={titleId}>
              {currentHandle ? "Change your handle" : "Pick a handle"}
            </span>
          </div>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="handle-body">
          <p className="faint handle-intro">
            Choose an anonymous handle so others on a shared watchlist can tell your notes apart.
            No email or password — it just lives in this browser. You can change it anytime.
          </p>

          <label className="handle-label" htmlFor={`${titleId}-input`}>
            Handle
          </label>
          <div className="handle-input-row">
            <span className="handle-at" aria-hidden="true">
              @
            </span>
            <input
              ref={inputRef}
              id={`${titleId}-input`}
              className="handle-input"
              value={value}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={loading ? "Generating…" : "user1234"}
              disabled={loading}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void save();
                }
              }}
            />
            <button
              type="button"
              className="btn ghost small"
              onClick={() => void suggest()}
              disabled={loading || saving}
              title="Suggest a new handle"
            >
              🎲 Shuffle
            </button>
          </div>

          {error ? (
            <p className="handle-hint error">{error}</p>
          ) : (
            <p className="handle-hint faint">
              3–20 characters: letters, numbers, “-” or “_”, starting with a letter.
            </p>
          )}
        </div>

        <div className="handle-foot">
          <button type="button" className="btn ghost small" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary small"
            onClick={() => void save()}
            disabled={loading || saving || !valid}
          >
            {saving ? "Saving…" : "Save handle"}
          </button>
        </div>
      </div>
    </div>
  );
}
