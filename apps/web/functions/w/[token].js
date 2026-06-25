const TOKEN_RE = /^[0-9a-f]{32}$/;

function safeJson(text) {
  return text.replaceAll("</script>", "<\\/script>");
}

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
  const staticHtmlUrl = new URL("/index.html", request.url).toString();
  const shellRes = await fetch(staticHtmlUrl);
  if (!shellRes.ok) {
    return new Response(`Could not load app shell: ${shellRes.statusText}`, { status: 502 });
  }

  let html = await shellRes.text();
  const alternateJson = `${apiBase}/api/w/${token}`;
  const alternateAi = new URL(`/ai/watchlist/${token}`, request.url).toString();
  const alternateMd = new URL(`/w/${token}.md`, request.url).toString();
  const embeddedData = safeJson(
    JSON.stringify({
      watchlist,
      alternate: {
        json: alternateJson,
        ai: alternateAi,
        markdown: alternateMd,
      },
    }),
  );

  const injected = `
    <link rel="alternate" type="application/json" href="${alternateJson}" />
    <link rel="alternate" type="application/json" href="${alternateAi}" />
    <link rel="alternate" type="text/markdown" href="${alternateMd}" />
    <script type="application/json" id="teemtape-watchlist-data">${embeddedData}</script>
  `;

  html = html.replace("</head>", `${injected}\n</head>`);

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
