const React = require("react");
const { createElement: h } = React;

/**
 * Reusable Component 3: WatchlistDrawer
 *
 * State Ownership Rationale:
 * - WatchlistDrawer manages a sliding side drawer for saved watchlist items.
 * - Props:
 *   - isOpen: Controlled by parent (MovieDiscoveryView) or local modal toggle.
 *   - onClose: Callback to close drawer.
 *   - watchlistItems: Array of full Movie objects currently saved.
 *   - onRemoveItem: Callback passing movieId to remove from the centralized watchlist.
 *   - onClearAll: Callback to empty the watchlist.
 * - By taking the full watchlist item list and emitting onRemoveItem, the drawer
 *   operates purely as a presentation layer without mutating storage directly.
 */
function WatchlistDrawer({
  isOpen = false,
  onClose,
  watchlistItems = [],
  onRemoveItem,
  onClearAll,
}) {
  if (!isOpen) return null;

  const count = watchlistItems.length;

  return h(
    "div",
    { className: "drawer-backdrop", onClick: onClose, "data-testid": "drawer-backdrop" },
    h(
      "aside",
      {
        className: "watchlist-drawer",
        onClick: (e) => e.stopPropagation(), // Prevent backdrop close when clicking inside
        "data-testid": "watchlist-drawer",
        "aria-label": "Your Saved Movies Watchlist",
      },
      // Header
      h(
        "div",
        { className: "drawer-header" },
        h(
          "div",
          { className: "drawer-title-group" },
          h("h2", { className: "drawer-title" }, "Your Watchlist"),
          h("span", { className: "drawer-counter-badge", "data-testid": "drawer-counter-badge" }, `${count} Saved`)
        ),
        h(
          "button",
          {
            className: "drawer-close-btn",
            onClick: onClose,
            "aria-label": "Close Watchlist",
            "data-testid": "drawer-close-btn",
          },
          "✕"
        )
      ),

      // Body: List of saved items or empty placeholder
      h(
        "div",
        { className: "drawer-body" },
        count === 0
          ? h(
              "div",
              { className: "drawer-empty", "data-testid": "drawer-empty" },
              h("span", { className: "empty-icon" }, "🎬"),
              h("h3", null, "Your watchlist is empty"),
              h("p", null, "Click '+ Watchlist' on any recommendation card to queue it for later.")
            )
          : h(
              "ul",
              { className: "drawer-list", "data-testid": "drawer-list" },
              watchlistItems.map((movie) =>
                h(
                  "li",
                  { key: movie.id, className: "drawer-item", "data-testid": `drawer-item-${movie.id}` },
                  h(
                    "div",
                    {
                      className: "drawer-item-thumb",
                      style: { background: movie.backdropColor || "#1e293b" },
                    },
                    movie.poster
                  ),
                  h(
                    "div",
                    { className: "drawer-item-info" },
                    h("h4", { className: "drawer-item-title" }, movie.title),
                    h(
                      "div",
                      { className: "drawer-item-meta" },
                      h("span", null, `${movie.year}`),
                      h("span", null, `•`),
                      h("span", null, movie.genre),
                      h("span", null, `•`),
                      h("span", { className: "match-score-inline" }, `${movie.matchScore}% Match`)
                    )
                  ),
                  h(
                    "button",
                    {
                      className: "remove-item-btn",
                      onClick: () => onRemoveItem && onRemoveItem(movie.id),
                      "aria-label": `Remove ${movie.title} from watchlist`,
                      "data-testid": `remove-btn-${movie.id}`,
                    },
                    "🗑"
                  )
                )
              )
            )
      ),

      // Footer: Clear All and Close Actions
      count > 0 &&
        h(
          "div",
          { className: "drawer-footer" },
          h(
            "button",
            {
              className: "clear-all-btn",
              onClick: onClearAll,
              "data-testid": "clear-all-btn",
            },
            "Clear Watchlist"
          ),
          h(
            "button",
            {
              className: "continue-browsing-btn",
              onClick: onClose,
            },
            "Done"
          )
        )
    )
  );
}

module.exports = WatchlistDrawer;
