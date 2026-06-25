import {
  fetchAgentPayload,
  MARKDOWN_HEADERS,
  passthroughError,
  renderWatchlistMarkdown,
  resolveApiBase,
  resolveWatchlistToken,
} from "../../utils/watchlist.js";

/** Fallback markdown route: /w/:token/markdown (avoids Pages `[token].md.js` param quirks). */
export async function onRequest(context) {
  const { request, env, params } = context;
  const token = resolveWatchlistToken(params, request.url);
  if (!token) {
    return new Response("not found", { status: 404 });
  }

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
