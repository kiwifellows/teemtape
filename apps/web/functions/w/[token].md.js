import {
  fetchAgentPayload,
  MARKDOWN_HEADERS,
  passthroughError,
  renderWatchlistMarkdown,
  resolveApiBase,
  resolveWatchlistToken,
} from "../utils/watchlist.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const token = resolveWatchlistToken(params, request.url);
  if (!token) {
    return new Response("not found", { status: 404 });
  }

  const apiBase = resolveApiBase(env);
  const agentResult = await fetchAgentPayload(apiBase, token, { request });
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
