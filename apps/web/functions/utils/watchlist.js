/** Shared helpers for watchlist Pages Functions (AI + embed + markdown). */

export const TOKEN_RE = /^[0-9a-f]{32}$/;

/** Max symbols to embed in HTML / agent JSON (matches API quote batch limit). */
export const MAX_EMBED_SYMBOLS = 50;

export function validateToken(token) {
  return typeof token === "string" && TOKEN_RE.test(token);
}

/**
 * Resolve watchlist token from Pages params or URL path.
 * `[token].md.js` routes expose the param as `token.md`, not `token`.
 */
export function resolveWatchlistToken(params, requestUrl) {
  const pathname = new URL(requestUrl).pathname;
  const fromMdPath = pathname.match(/^\/w\/([0-9a-f]{32})\.md$/i)?.[1];
  const fromHtmlPath = pathname.match(/^\/w\/([0-9a-f]{32})$/i)?.[1];
  const fromAiPath = pathname.match(/^\/ai\/watchlist\/([0-9a-f]{32})$/i)?.[1];

  const candidates = [
    fromMdPath,
    fromHtmlPath,
    fromAiPath,
    params?.token,
    params?.["token.md"],
  ];

  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const token = raw.replace(/\.md$/i, "").toLowerCase();
    if (TOKEN_RE.test(token)) return token;
  }
  return null;
}

export function resolveApiBase(env) {
  return env.API_BASE_URL || "https://api.teemtape.com";
}

/** Fetch aggregate watchlist + note threads from the Worker (single request). */
export async function fetchAgentPayload(apiBaseUrl, token, { limit = MAX_EMBED_SYMBOLS } = {}) {
  const res = await fetch(`${apiBaseUrl}/api/w/${token}/agent?limit=${limit}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      text: await res.text(),
      contentType: res.headers.get("content-type"),
    };
  }
  return { ok: true, payload: await res.json() };
}

/** Machine-readable API map so agents can post notes after reading a share URL. */
export function apiDiscovery(apiBaseUrl, token, requestUrl) {
  const webOrigin = new URL(requestUrl).origin;
  return {
    base: apiBaseUrl,
    cors: "*",
    endpoints: {
      getWatchlist: {
        method: "GET",
        url: `${apiBaseUrl}/api/w/${token}`,
      },
      getAgentWatchlist: {
        method: "GET",
        url: `${apiBaseUrl}/api/w/${token}/agent`,
      },
      addSymbol: {
        method: "POST",
        url: `${apiBaseUrl}/api/w/${token}/symbols`,
        contentType: "application/json",
        body: { symbol: "NVDA" },
      },
      getNotes: {
        method: "GET",
        url: `${apiBaseUrl}/api/w/${token}/notes?symbol=NVDA`,
      },
      addNote: {
        method: "POST",
        url: `${apiBaseUrl}/api/w/${token}/notes`,
        contentType: "application/json",
        body: {
          symbol: "NVDA",
          body: "Analysis or recommendation (max 2000 characters).",
          source: "cli",
          handle: "optional-agent-handle",
        },
        hint: 'Use source "cli" for agent-authored notes. Optional handle distinguishes agents on the watchlist.',
      },
      getQuotes: {
        method: "GET",
        url: `${apiBaseUrl}/api/quotes?symbols=NVDA,AAPL`,
      },
    },
    web: {
      shareUrl: `${webOrigin}/w/${token}`,
      agentJson: `${webOrigin}/ai/watchlist/${token}`,
      markdown: `${webOrigin}/w/${token}.md`,
      markdownAlt: `${webOrigin}/w/${token}/markdown`,
    },
  };
}

export function alternateLinks(apiBaseUrl, token, requestUrl) {
  const webOrigin = new URL(requestUrl).origin;
  return {
    json: `${apiBaseUrl}/api/w/${token}/agent`,
    watchlist: `${apiBaseUrl}/api/w/${token}`,
    ai: `${webOrigin}/ai/watchlist/${token}`,
    markdown: `${webOrigin}/w/${token}.md`,
    markdownAlt: `${webOrigin}/w/${token}/markdown`,
  };
}

export function wantsJsonResponse(request) {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

export function safeJson(text) {
  return text.replaceAll("</script>", "<\\/script>");
}

export function passthroughError(result) {
  return new Response(result.text, {
    status: result.status,
    headers: {
      "content-type": result.contentType || "text/plain; charset=utf-8",
    },
  });
}

export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
};

export const MARKDOWN_HEADERS = {
  "content-type": "text/markdown; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
};

export const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=60",
};

/** Build Markdown export body for a watchlist agent payload. */
export function renderWatchlistMarkdown({ token, watchlist, stocks, truncated, totalSymbols, symbolLimit }, requestUrl, apiBase) {
  const webOrigin = new URL(requestUrl).origin;
  const lines = [
    `# Watchlist ${token}`,
    "",
    `* Share URL: ${webOrigin}/w/${token}`,
    `* Agent JSON: ${webOrigin}/ai/watchlist/${token}`,
    `* API aggregate: ${apiBase}/api/w/${token}/agent`,
    "",
    "## Post a note (API)",
    "",
    "```http",
    `POST ${apiBase}/api/w/${token}/notes`,
    "Content-Type: application/json",
    "",
    JSON.stringify(
      {
        symbol: "NVDA",
        body: "Your analysis here.",
        source: "cli",
        handle: "optional-agent-handle",
      },
      null,
      2,
    ),
    "```",
    "",
    "## Symbols",
    "",
  ];

  if (watchlist.symbols.length === 0) {
    lines.push("No symbols in this watchlist.");
  } else {
    lines.push(...watchlist.symbols.map((symbol) => `- ${symbol}`));
  }

  if (truncated) {
    lines.push(
      "",
      `_Showing notes for the first ${symbolLimit} of ${totalSymbols} symbols. Use agent JSON for the capped export._`,
    );
  }

  lines.push("", "## Notes", "");

  if (stocks.length === 0) {
    lines.push("No notes available.");
  } else {
    for (const entry of stocks) {
      lines.push(`### ${entry.ticker}`);
      if (entry.comments.length === 0) {
        lines.push("- _no notes yet_");
      } else {
        for (const note of entry.comments) {
          const body = note.body.replace(/\n/g, " ").trim();
          lines.push(`- ${body} — ${note.author} (${note.source}, ${note.createdAt})`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
