import {
  alternateLinks,
  apiDiscovery,
  fetchAgentPayload,
  HTML_HEADERS,
  MARKDOWN_HEADERS,
  passthroughError,
  renderWatchlistMarkdown,
  resolveApiBase,
  resolveWatchlistToken,
  safeJson,
  wantsJsonResponse,
} from "../utils/watchlist.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const pathname = new URL(request.url).pathname;
  const token = resolveWatchlistToken(params, request.url);
  if (!token) {
    return new Response("not found", { status: 404 });
  }

  // Cloudflare Pages routes /w/:token.md to [token].js, not [token].md.js — serve markdown here.
  if (/^\/w\/[0-9a-f]{32}\.md$/i.test(pathname)) {
    const apiBase = resolveApiBase(env);
    const agentResult = await fetchAgentPayload(apiBase, token);
    if (!agentResult.ok) {
      return passthroughError(agentResult);
    }
    const body = renderWatchlistMarkdown(
      { token, ...agentResult.payload },
      request.url,
      apiBase,
    );
    return new Response(body, { headers: MARKDOWN_HEADERS });
  }

  if (wantsJsonResponse(request)) {
    return Response.redirect(new URL(`/ai/watchlist/${token}`, request.url).toString(), 302);
  }

  const apiBase = resolveApiBase(env);
  const agentResult = await fetchAgentPayload(apiBase, token);
  if (!agentResult.ok) {
    return passthroughError(agentResult);
  }

  const { watchlist, stocks, truncated, totalSymbols, symbolLimit } = agentResult.payload;

  const staticHtmlUrl = new URL("/index.html", request.url).toString();
  const shellRes = await fetch(staticHtmlUrl);
  if (!shellRes.ok) {
    return new Response(`Could not load app shell: ${shellRes.statusText}`, { status: 502 });
  }

  let html = await shellRes.text();
  const alternate = alternateLinks(apiBase, token, request.url);
  const payload = {
    watchlist,
    stocks,
    api: apiDiscovery(apiBase, token, request.url),
    alternate,
  };
  if (truncated) {
    payload.truncated = true;
    payload.totalSymbols = totalSymbols;
    payload.symbolLimit = symbolLimit;
  }

  const embeddedData = safeJson(JSON.stringify(payload));
  const injected = `
    <link rel="alternate" type="application/json" href="${alternate.json}" />
    <link rel="alternate" type="application/json" href="${alternate.ai}" />
    <link rel="alternate" type="text/markdown" href="${alternate.markdown}" />
    <script type="application/json" id="teemtape-watchlist-data">${embeddedData}</script>
  `;

  html = html.replace("</head>", `${injected}\n</head>`);

  return new Response(html, { headers: HTML_HEADERS });
}
