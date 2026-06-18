import type { Quote } from "@teemtape/api-client";

export function fmtPrice(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtChange(quote: Pick<Quote, "change" | "pct">): { text: string; direction: "up" | "down" } {
  const sign = quote.change >= 0 ? "+" : "";
  const direction = quote.change >= 0 ? "up" : "down";
  const text = `${sign}${fmtPrice(quote.change)} (${sign}${quote.pct.toFixed(2)}%)`;
  return { text, direction };
}

export function fmtRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
