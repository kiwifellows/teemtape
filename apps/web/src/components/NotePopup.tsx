import { ApiError, type Note } from "@teemtape/api-client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useApiForToken } from "../context/ApiContext";
import { useHandle } from "../hooks/useHandle";
import { deniedActionMessage } from "../lib/access";
import { fmtRelativeTime } from "../lib/format";
import { HandleDialog } from "./HandleDialog";

export function NotePopup({
  token,
  symbol,
  onClose,
  onNotePosted,
  postBlocked,
  offerSignIn,
  signedIn,
  onAccessChanged,
}: {
  token: string;
  symbol: string;
  onClose: () => void;
  onNotePosted: () => void;
  /** Why posting is not allowed here; replaces the compose box with the reason. */
  postBlocked?: string;
  /** Sign-in URL to offer alongside the reason (anonymous viewer, Pro app configured). */
  offerSignIn?: string;
  signedIn?: boolean;
  /** Called when a post is refused by the API so the page can re-read permissions. */
  onAccessChanged?: () => void;
}) {
  const client = useApiForToken(token);
  const { handle, setHandle } = useHandle();
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [showHandleDialog, setShowHandleDialog] = useState(false);
  // When true, posting should resume automatically after a handle is chosen.
  const [postAfterHandle, setPostAfterHandle] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.getNotes(symbol);
      setNotes(res.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [client, symbol]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!postBlocked) textareaRef.current?.focus();
  }, [symbol, postBlocked]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const doPost = useCallback(
    async (asHandle: string) => {
      const trimmed = body.trim();
      if (!trimmed || posting) return;

      setPosting(true);
      setError(null);
      try {
        const note = await client.addNote({ symbol, body: trimmed, source: "web", handle: asHandle });
        setNotes((prev) => [...prev, note]);
        setBody("");
        onNotePosted();
      } catch (err) {
        if (err instanceof ApiError && err.accessDenied) {
          setError(deniedActionMessage("post_note", Boolean(signedIn)));
          onAccessChanged?.();
        } else {
          setError(err instanceof Error ? err.message : "Failed to post note");
        }
      } finally {
        setPosting(false);
      }
    },
    [body, client, onAccessChanged, onNotePosted, posting, signedIn, symbol],
  );

  const postNote = () => {
    if (!body.trim() || posting) return;
    // First note from this browser: ask for a handle, then post automatically.
    if (!handle) {
      setPostAfterHandle(true);
      setShowHandleDialog(true);
      return;
    }
    void doPost(handle);
  };

  const onHandleSaved = (next: string) => {
    setHandle(next);
    setShowHandleDialog(false);
    if (postAfterHandle) {
      setPostAfterHandle(false);
      void doPost(next);
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
      <div
        className="popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="popup-head">
          <div className="popup-title">
            <span className="sym" id={titleId}>
              {symbol}
            </span>
            <span className="muted">notes</span>
          </div>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="popup-thread">
          {loading && <p className="faint">Loading notes…</p>}
          {!loading && error && <p className="status-banner error">{error}</p>}
          {!loading && !error && notes.length === 0 && (
            <p className="faint" style={{ textAlign: "center", padding: "24px 0" }}>
              No notes yet. Be the first to leave one.
            </p>
          )}
          {!loading &&
            notes.map((note) => (
              <div key={note.id} className="note-item">
                <div className="note-head">
                  <span className="note-author num">{note.author}</span>
                  <span className={`note-source ${note.source}`}>
                    {note.source === "cli" ? "via CLI" : "via web"}
                  </span>
                  <span className="faint">{fmtRelativeTime(note.createdAt)}</span>
                </div>
                <p className="note-body">{note.body}</p>
              </div>
            ))}
        </div>

        {postBlocked ? (
          <div className="popup-compose compose-blocked" role="status">
            <span className="lock" aria-hidden="true">🔒</span>{" "}
            {postBlocked}
            {offerSignIn && (
              <>
                {" "}
                <a href={offerSignIn}>Sign in</a> if you've been invited.
              </>
            )}
          </div>
        ) : (
        <div className="popup-compose">
          <label className="sr-only" htmlFor={`note-body-${symbol}`}>
            Add a note about {symbol}
          </label>
          <textarea
            ref={textareaRef}
            id={`note-body-${symbol}`}
            placeholder="Add an anonymous note about this stock…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void postNote();
              }
            }}
          />
          <div className="compose-foot">
            <span className="faint" style={{ fontSize: 12 }}>
              {handle ? (
                <>
                  Posting as <span className="num">{handle}</span>
                  {" · "}
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      setPostAfterHandle(false);
                      setShowHandleDialog(true);
                    }}
                  >
                    change
                  </button>
                </>
              ) : (
                <>You’ll pick an anonymous handle when you post.</>
              )}
            </span>
            <button
              type="button"
              className="btn primary small"
              onClick={postNote}
              disabled={posting || !body.trim()}
            >
              {posting ? "Posting…" : "Post note"}
            </button>
          </div>
        </div>
        )}
      </div>

      {showHandleDialog && (
        <HandleDialog
          client={client}
          currentHandle={handle}
          onSave={onHandleSaved}
          onClose={() => {
            setShowHandleDialog(false);
            setPostAfterHandle(false);
          }}
        />
      )}
    </div>
  );
}
