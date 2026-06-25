/** Shared helpers for watchlist Pages Functions (AI + embed + markdown). */

export const TOKEN_RE = /^[0-9a-f]{32}$/;

/** Max symbols to embed in HTML / agent JSON (matches API quote batch limit). */
export const MAX_EMBED_SYMBOLS = 50;

export function validateToken(token) {
  return typeof token === "string" && TOKEN_RE.test(token);
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
