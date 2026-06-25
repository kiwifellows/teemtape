import {
  apiDiscovery,
  fetchAgentPayload,
  JSON_HEADERS,
  passthroughError,
  resolveApiBase,
  validateToken,
} from "../../utils/watchlist.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const token = params?.token;
  if (!validateToken(token)) {
    return new Response("not found", { status: 404 });
  }

  const apiBase = resolveApiBase(env);
  const agentResult = await fetchAgentPayload(apiBase, token);
  if (!agentResult.ok) {
    return passthroughError(agentResult);
  }

  const { watchlist, stocks, truncated, totalSymbols, symbolLimit } = agentResult.payload;

  const body = {
    watchlist,
    stocks,
    api: apiDiscovery(apiBase, token, request.url),
    metadata: {
      source: "teemtape-ai-watchlist",
      fetchedAt: new Date().toISOString(),
      url: request.url,
    },
  };
  if (truncated) {
    body.truncated = true;
    body.totalSymbols = totalSymbols;
    body.symbolLimit = symbolLimit;
  }

  return new Response(JSON.stringify(body), { headers: JSON_HEADERS });
}
