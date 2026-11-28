const React = require("react");
const { createElement: h } = React;

/**
 * Reusable Component 4: StateFeedback
 *
 * State Ownership Rationale:
 * - StateFeedback handles the 3 non-ideal states required by the user:
 *   1. LOADING State: Displays skeleton cards while asynchronous recommendation queries resolve.
 *   2. EMPTY State: Displays when filters are too narrow, with a clear "Reset Filters" action.
 *   3. ERROR State: Displays when network/ranking API fails, with an actionable "Retry" button.
 * - By encapsulating state representations in one reusable component, the main view
 *   remains declarative and clean:
 *   {status !== 'success' && h(StateFeedback, { state: status, onRetry, onReset })}
 */
function StateFeedback({
  state = "loading", // "loading" | "empty" | "error"
  errorMessage = "Unable to fetch personalized recommendations.",
  onRetry,
  onResetFilters,
  currentFilters = {},
}) {
  // 1. LOADING STATE
  if (state === "loading") {
    return h(
      "div",
      { className: "feedback-container loading-state", "data-testid": "loading-state" },
      h(
        "div",
        { className: "loading-banner" },
        h("div", { className: "spinner-ring" }),
        h("h3", null, "Synthesizing AI Movie Recommendations..."),
        h("p", null, "Analyzing viewing patterns, rating thresholds, and narrative preferences.")
      ),
      // Skeleton grid preview
      h(
        "div",
        { className: "skeleton-grid", "aria-hidden": "true" },
        [1, 2, 3, 4, 5, 6].map((i) =>
          h(
            "div",
            { key: i, className: "skeleton-card" },
            h("div", { className: "skeleton-poster" }),
            h("div", { className: "skeleton-line skeleton-title" }),
            h("div", { className: "skeleton-line skeleton-tagline" }),
            h("div", { className: "skeleton-line skeleton-btn" })
          )
        )
      )
    );
  }

  // 2. EMPTY STATE
  if (state === "empty") {
    return h(
      "div",
      { className: "feedback-container empty-state", "data-testid": "empty-state" },
      h("span", { className: "feedback-icon", role: "img", "aria-label": "Empty" }, "🔍"),
      h("h3", { className: "feedback-title" }, "No Movies Match Your Current Criteria"),
      h(
        "p",
        { className: "feedback-description" },
        `No recommendations found for genre '${currentFilters.genre || "All"}' with a minimum rating of ${
          currentFilters.minRating ? `${currentFilters.minRating} ⭐` : "any"
        }. Try lowering your rating threshold or choosing another genre.`
      ),
      onResetFilters &&
        h(
          "button",
          {
            className: "primary-action-btn",
            onClick: onResetFilters,
            "data-testid": "empty-reset-btn",
          },
          "Reset Filters to Default"
        )
    );
  }

  // 3. ERROR STATE
  if (state === "error") {
    return h(
      "div",
      { className: "feedback-container error-state", "data-testid": "error-state" },
      h("span", { className: "feedback-icon", role: "img", "aria-label": "Error" }, "⚠️"),
      h("h3", { className: "feedback-title" }, "Recommendation Engine Unreachable"),
      h("p", { className: "feedback-description" }, errorMessage),
      onRetry &&
        h(
          "button",
          {
            className: "primary-action-btn retry-btn",
            onClick: onRetry,
            "data-testid": "error-retry-btn",
          },
          "↻ Retry Connection"
        )
    );
  }

  return null;
}

module.exports = StateFeedback;
