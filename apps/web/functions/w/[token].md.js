import {
  fetchAgentPayload,
  MARKDOWN_HEADERS,
  passthroughError,
  resolveApiBase,
  validateToken,
} from "../utils/watchlist.js";

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

  const webOrigin = new URL(request.url).origin;
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

  return new Response(lines.join("\n"), { headers: MARKDOWN_HEADERS });
}
