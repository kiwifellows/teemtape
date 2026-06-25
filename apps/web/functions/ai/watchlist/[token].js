const TOKEN_RE = /^[0-9a-f]{32}$/;

export async function onRequest(context) {
  const { request, env, params } = context;
  const token = params?.token;
  if (!token || !TOKEN_RE.test(token)) {
    return new Response("not found", { status: 404 });
  }

  const apiBase = env.API_BASE_URL || "https://api.teemtape.com";
  const watchlistRes = await fetch(`${apiBase}/api/w/${token}`, {
    headers: { accept: "application/json" },
  });

  if (!watchlistRes.ok) {
    const text = await watchlistRes.text();
    return new Response(text, {
      status: watchlistRes.status,
      headers: {
        "content-type": watchlistRes.headers.get("content-type") || "text/plain; charset=utf-8",
      },
    });
  }

  const watchlist = await watchlistRes.json();
  const symbolComments = await Promise.all(
    watchlist.symbols.map(async (symbol) => {
      const notesRes = await fetch(
        `${apiBase}/api/w/${token}/notes?symbol=${encodeURIComponent(symbol)}`,
        { headers: { accept: "application/json" } },
      );
      if (!notesRes.ok) {
        return { ticker: symbol, comments: [] };
      }
      const payload = await notesRes.json();
      return {
        ticker: symbol,
        comments: payload.notes.map((note) => ({
          body: note.body,
          author: note.author,
          source: note.source,
          createdAt: note.createdAt,
        })),
      };
    }),
  );

  return new Response(
    JSON.stringify({
      watchlist,
      stocks: symbolComments,
      metadata: {
        source: "teemtape-ai-watchlist",
        fetchedAt: new Date().toISOString(),
        url: request.url,
      },
    }),
    {
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
