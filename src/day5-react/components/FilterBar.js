const React = require("react");
const { createElement: h } = React;
const { GENRES, SORT_OPTIONS } = require("../mockData");

/**
 * Reusable Component 1: FilterBar
 *
 * State Ownership Rationale:
 * - FilterBar is a CONTROLLABLE (stateless) presentation component.
 * - It does not own the filter state; it receives selected values via props
 *   (selectedGenre, minRating, sortBy) and invokes callback handlers
 *   (onGenreChange, onRatingChange, onSortChange, onReset) to request state changes.
 * - This allows the parent (MovieDiscoveryView) to keep filter state in sync
 *   with query parameters, URL history, and recommendation queries.
 */
function FilterBar({
  selectedGenre = "All",
  onGenreChange,
  minRating = 0,
  onRatingChange,
  sortBy = "matchScore",
  onSortChange,
  totalResults = 0,
  onResetFilters,
  watchlistCount = 0,
  onOpenWatchlist,
}) {
  const isFiltered = selectedGenre !== "All" || minRating > 0 || sortBy !== "matchScore";

  return h(
    "header",
    { className: "filter-bar", "data-testid": "filter-bar" },
    // Top Bar: Search Summary & Watchlist Trigger
    h(
      "div",
      { className: "filter-top-row" },
      h(
        "div",
        { className: "brand-section" },
        h("span", { className: "brand-icon" }, "🎬"),
        h("h1", { className: "brand-title" }, "CinePulse AI"),
        h("span", { className: "brand-tag" }, "Recommendation Engine")
      ),
      h(
        "div",
        { className: "header-actions" },
        h(
          "button",
          {
            className: "watchlist-trigger-btn",
            onClick: onOpenWatchlist,
            "aria-label": "Open Watchlist",
            "data-testid": "watchlist-drawer-btn",
          },
          h("span", null, "🔖 Watchlist"),
          h("span", { className: "badge-count", "data-testid": "watchlist-count-badge" }, watchlistCount)
        )
      )
    ),

    // Middle Bar: Genre Navigation Pills
    h(
      "nav",
      { className: "genre-nav", "aria-label": "Filter by Genre" },
      GENRES.map((genre) =>
        h(
          "button",
          {
            key: genre,
            className: `genre-pill ${selectedGenre === genre ? "active" : ""}`,
            onClick: () => onGenreChange && onGenreChange(genre),
            "data-testid": `genre-pill-${genre.toLowerCase()}`,
          },
          genre
        )
      )
    ),

    // Bottom Controls: Rating Slider & Sort Selector
    h(
      "div",
      { className: "filter-controls-row" },
      // Min Rating Filter
      h(
        "div",
        { className: "control-group rating-control" },
        h("label", { htmlFor: "min-rating-input" }, `Min Rating: ${minRating > 0 ? `${minRating.toFixed(1)} ⭐` : "Any"}`),
        h("input", {
          id: "min-rating-input",
          type: "range",
          min: "0",
          max: "9.5",
          step: "0.5",
          value: minRating,
          onChange: (e) => onRatingChange && onRatingChange(parseFloat(e.target.value)),
          "data-testid": "rating-slider",
        })
      ),

      // Recommendation Ranking Sort Selector
      h(
        "div",
        { className: "control-group sort-control" },
        h("label", { htmlFor: "sort-select" }, "Rank By:"),
        h(
          "select",
          {
            id: "sort-select",
            value: sortBy,
            onChange: (e) => onSortChange && onSortChange(e.target.value),
            "data-testid": "sort-select",
          },
          SORT_OPTIONS.map((opt) =>
            h("option", { key: opt.value, value: opt.value }, opt.label)
          )
        )
      ),

      // Reset Button & Result Counter
      h(
        "div",
        { className: "filter-meta" },
        h("span", { className: "results-count", "data-testid": "results-count" }, `${totalResults} Recommendations`),
        isFiltered &&
          h(
            "button",
            {
              className: "reset-filters-btn",
              onClick: onResetFilters,
              "data-testid": "reset-filters-btn",
            },
            "↺ Reset"
          )
      )
    )
  );
}

module.exports = FilterBar;
