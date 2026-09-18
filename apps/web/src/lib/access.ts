import type { WatchlistAccess } from "@teemtape/api-client";

/**
 * Turns the API's `access` block into the words the UI shows. One place for
 * every "why can't I…" so the scenarios stay consistent:
 *
 *   link        anonymous            signed-in non-member      member
 *   ----------  -------------------  ------------------------  ---------------------------
 *   public-edit everything           everything                everything (owner: manage)
 *   public-cmt  notes only           notes only                by role
 *   public-view read only            read only                 by role
 *   private     (401 panel)          (403 panel)               by role
 *
 * Absent `access` (older API / self-hosted without the hook) = fully open.
 */

export const OPEN_ACCESS: WatchlistAccess = {
  role: "anonymous",
  linkAccess: "public-edit",
  can: { addSymbol: true, postNote: true, manage: false },
  user: null,
};

export interface AccessCopy {
  /** Short badge for the top of the list, e.g. "read-only" / "owner". Undefined = nothing to say. */
  badge?: string;
  /** One-line explanation shown under the share bar when the caller can't do everything. */
  summary?: string;
  /** Why "Add symbol" is disabled (undefined = allowed). */
  addSymbol?: string;
  /** Why the note box is disabled (undefined = allowed). */
  postNote?: string;
  /** Offer a sign-in link with the messages (anonymous caller and a Pro app exists). */
  offerSignIn: boolean;
  /** What the share link itself grants — used by the share bar's hint. */
  linkHint: string;
}

const LINK_HINT: Record<WatchlistAccess["linkAccess"], string> = {
  "public-edit":
    "Private link. Share only with people you trust or your AI agent — anyone with it can view your watchlist and post notes anonymously.",
  "public-comment":
    "Comment-only link. Anyone with it can view this watchlist and post notes; only members can add symbols.",
  "public-view": "Read-only link. Anyone with it can view this watchlist; only members can add symbols or post notes.",
  private: "Private watchlist. Only members can open this link — it does nothing for anyone else.",
};

export function describeAccess(access: WatchlistAccess | undefined, dashboardUrl: string | undefined): AccessCopy {
  const a = access ?? OPEN_ACCESS;
  const signedIn = a.user !== null;
  const who = a.user ? `You're signed in as ${a.user.handle}` : undefined;
  const offerSignIn = !signedIn && Boolean(dashboardUrl);
  const linkHint = LINK_HINT[a.linkAccess];
  const copy: AccessCopy = { offerSignIn, linkHint };

  // Members: the role explains everything.
  if (a.role !== "anonymous") {
    copy.badge = a.role === "owner" ? "owner" : a.role;
    if (a.role === "viewer") {
      copy.summary = "You have view-only access to this watchlist — you can read symbols and notes, but not add or post.";
      copy.addSymbol = "Your role on this list is viewer, so you can't add symbols.";
      copy.postNote = "You have view-only access to this list, so notes are read-only for you.";
    } else if (a.role === "commenter") {
      copy.summary = "You can post notes on this watchlist, but only editors and the owner can add symbols.";
      copy.addSymbol = "Your role on this list is commenter — you can post notes but not add symbols.";
    }
    return copy;
  }

  // Non-members: the link decides.
  switch (a.linkAccess) {
    case "public-edit":
      return copy; // today's teemtape: nothing to explain
    case "public-comment":
      copy.badge = "comment-only";
      copy.summary = signedIn
        ? `${who}, but not a member of this list. Anyone with the link can read and post notes; only members can add symbols — ask the owner for an invite.`
        : "Anyone with this link can read and post notes, but only members can add symbols.";
      copy.addSymbol = signedIn
        ? `${who}, but not a member of this list — ask the owner for an invite to add symbols.`
        : "This watchlist is public for reading and comments, but only members can add symbols.";
      return copy;
    case "public-view":
      copy.badge = "read-only";
      copy.summary = signedIn
        ? `${who}, but not a member of this list. It's public to read, but only members can add symbols or post notes — ask the owner for an invite.`
        : "This watchlist is public, but read-only: only members can add symbols or post notes.";
      copy.addSymbol = signedIn
        ? `${who}, but not a member — only members can add symbols here.`
        : "This watchlist is public, but read-only — only members can add symbols.";
      copy.postNote = signedIn
        ? `This watchlist is public, but does not allow comments. ${who}, but not a member — ask the owner for access.`
        : "This watchlist is public, but does not allow comments.";
      return copy;
    case "private":
      // Normally unreachable (the API denies the read); keep the copy sane anyway.
      copy.badge = "private";
      copy.addSymbol = copy.postNote = "This watchlist is private — only members can change it.";
      return copy;
  }
}

/** Friendly text for a 401/403 that arrives when an action is attempted anyway (stale state, revoked role). */
export function deniedActionMessage(action: "add_symbol" | "post_note", signedIn: boolean): string {
  const what = action === "add_symbol" ? "add symbols to" : "post notes on";
  return signedIn
    ? `You don't have permission to ${what} this watchlist any more — the owner may have changed your role or the link access.`
    : `This watchlist doesn't let visitors ${what.replace(" to", "").replace(" on", "")} it. Sign in if you've been invited.`;
}
