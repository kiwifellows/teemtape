/*
 * teemtape — shared wireframe mock data + interactions.
 *
 * Everything here is fake/static. It exists only to make the wireframes feel
 * real enough to evaluate the flows (table, note popup, share link). No network
 * calls are made. In the real app this data comes from a Cloudflare Worker that
 * proxies the Polygon/Massive free API (delayed by ~1 minute) and reads notes
 * from a D1 database.
 */

const MOCK_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", price: 228.52, change: 1.84, pct: 0.81, notes: 3 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 478.13, change: -2.31, pct: -0.48, notes: 1 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 142.97, change: 4.12, pct: 2.97, notes: 5 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 251.44, change: -6.07, pct: -2.36, notes: 2 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 219.88, change: 0.42, pct: 0.19, notes: 0 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 178.65, change: 2.05, pct: 1.16, notes: 0 },
  { symbol: "META", name: "Meta Platforms", price: 612.30, change: -3.88, pct: -0.63, notes: 1 },
  { symbol: "AMD", name: "Advanced Micro Devices", price: 124.71, change: 1.12, pct: 0.91, notes: 0 },
];

// Anonymous, randomly generated MD5-style handles. In the real app each visitor
// gets a watchlist keyed by an MD5 string on the end of their share URL.
const MOCK_NOTES = {
  AAPL: [
    { author: "anon-7f3a9c", source: "web", body: "Watching the 225 support level — bounced here twice this week.", when: "2h ago" },
    { author: "agent-cli", source: "cli", body: "Earnings call scheduled. Flagging for review.", when: "5h ago" },
    { author: "anon-1b8e02", source: "web", body: "Volume looks light today.", when: "1d ago" },
  ],
  NVDA: [
    { author: "anon-c41d77", source: "web", body: "Momentum still strong after the split.", when: "30m ago" },
    { author: "agent-cli", source: "cli", body: "Added to learning watchlist for the demo.", when: "3h ago" },
  ],
  MSFT: [
    { author: "anon-9a2f10", source: "web", body: "Cloud numbers next quarter are the thing to watch.", when: "6h ago" },
  ],
};

const SHARE_LINK = "https://www.teemtape.com/w/6f1ed002ab5595859014ebf0951522d9";

function fmtPrice(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtChange(stock) {
  const sign = stock.change >= 0 ? "+" : "";
  const cls = stock.change >= 0 ? "up" : "down";
  return `<span class="num ${cls}">${sign}${fmtPrice(stock.change)} (${sign}${stock.pct.toFixed(2)}%)</span>`;
}

/* ---------- Note popup ---------- */
function buildNoteThread(symbol) {
  const notes = MOCK_NOTES[symbol] || [];
  if (notes.length === 0) {
    return `<p class="faint" style="text-align:center;padding:24px 0;">No notes yet. Be the first to leave one.</p>`;
  }
  return notes
    .map(
      (n) => `
      <div class="note-item">
        <div class="note-head">
          <span class="note-author num">${n.author}</span>
          <span class="note-source ${n.source}">${n.source === "cli" ? "via CLI" : "via web"}</span>
          <span class="faint">${n.when}</span>
        </div>
        <p class="note-body">${n.body}</p>
      </div>`
    )
    .join("");
}

function openNotePopup(symbol) {
  const overlay = document.getElementById("note-overlay");
  if (!overlay) return;
  document.getElementById("note-symbol").textContent = symbol;
  document.getElementById("note-thread").innerHTML = buildNoteThread(symbol);
  overlay.classList.add("open");
}

function closeNotePopup() {
  const overlay = document.getElementById("note-overlay");
  if (overlay) overlay.classList.remove("open");
}

/* ---------- Share link copy (wireframe only) ---------- */
function fakeCopyShareLink(btn) {
  const original = btn.textContent;
  btn.textContent = "Copied ✓";
  setTimeout(() => {
    btn.textContent = original;
  }, 1400);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNotePopup();
});

/* ---------- Light / dark theme ---------- */
function applyTheme(theme) {
  const mode = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", mode);
  try {
    localStorage.setItem("teemtape-theme", mode);
  } catch (e) {
    /* ignore: file:// or private mode */
  }
  document.querySelectorAll("[data-theme-label]").forEach((el) => {
    el.textContent = mode === "light" ? "🌙 Dark" : "☀️ Light";
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "light" ? "dark" : "light");
}

(function initTheme() {
  let saved = "dark";
  try {
    saved = localStorage.getItem("teemtape-theme") || "dark";
  } catch (e) {
    /* ignore */
  }
  applyTheme(saved);
})();
