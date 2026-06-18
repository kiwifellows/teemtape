import type { Quote } from "@teemtape/api-client";
import { fmtChange, fmtPrice } from "../lib/format";

export function WatchlistTable({
  quotes,
  noteCounts,
  onOpenNotes,
}: {
  quotes: Quote[];
  noteCounts: Record<string, number>;
  onOpenNotes: (symbol: string) => void;
}) {
  if (quotes.length === 0) {
    return (
      <div className="empty-state">
        <p>Your watchlist is empty.</p>
        <p className="faint">Add a symbol to get started.</p>
      </div>
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Symbol</th>
          <th scope="col">Company</th>
          <th scope="col" className="right">
            Last price
          </th>
          <th scope="col" className="right">
            Change
          </th>
          <th scope="col" className="center">
            Notes
          </th>
          <th scope="col" className="right">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {quotes.map((quote) => {
          const count = noteCounts[quote.symbol] ?? 0;
          const change = fmtChange(quote);
          const countCls = count > 0 ? "badge-count" : "badge-count empty";

          return (
            <tr key={quote.symbol}>
              <td className="sym" data-label="Symbol">
                {quote.symbol}
              </td>
              <td className="coname" data-label="Company">
                {quote.name}
              </td>
              <td className="right num" data-label="Last price">
                ${fmtPrice(quote.price)}
              </td>
              <td className={`right num ${change.direction}`} data-label="Change">
                {change.text}
              </td>
              <td className="center" data-label="Notes">
                <span className={countCls}>{count}</span>
              </td>
              <td className="right actions-cell">
                <button
                  type="button"
                  className="note-btn"
                  onClick={() => onOpenNotes(quote.symbol)}
                >
                  💬 Note
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
