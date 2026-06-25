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
  const symbolNotes = await Promise.all(
    watchlist.symbols.map(async (symbol) => {
      const notesRes = await fetch(
        `${apiBase}/api/w/${token}/notes?symbol=${encodeURIComponent(symbol)}`,
        { headers: { accept: "application/json" } },
      );
      if (!notesRes.ok) {
        return { symbol, notes: [] };
      }
      const payload = await notesRes.json();
      return { symbol, notes: payload.notes ?? [] };
    }),
  );

  const lines = [
    `# Watchlist ${token}`,
    "",
    `* URL: ${new URL(`/w/${token}`, request.url).toString()}`,
    `* JSON: ${apiBase}/api/w/${token}`,
    `* Agent JSON: ${new URL(`/ai/watchlist/${token}`, request.url).toString()}`,
    "",
    `## Symbols`,
    "",
  ];

  if (watchlist.symbols.length === 0) {
    lines.push("No symbols in this watchlist.");
  } else {
    lines.push(...watchlist.symbols.map((symbol) => `- ${symbol}`));
  }

  lines.push("", "## Notes", "",");

  if (symbolNotes.length === 0) {
    lines.push("No notes available.");
  } else {
    for (const entry of symbolNotes) {
      lines.push(`### ${entry.symbol}`);
      if (entry.notes.length === 0) {
        lines.push("- _no notes yet_");
      } else {
        for (const note of entry.notes) {
          const body = note.body.replace(/\n/g, " ").trim();
          lines.push(`- ${body} — ${note.author} (${note.source}, ${note.createdAt})`);
        }
      }
      lines.push("");
    }
  }

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
