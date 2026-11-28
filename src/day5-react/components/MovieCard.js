const React = require("react");
const { createElement: h } = React;

/**
 * Reusable Component 2: MovieCard
 *
 * State Ownership Rationale:
 * - MovieCard is stateless with respect to the watchlist collection.
 * - Whether a movie is currently in the watchlist (isInWatchlist boolean) is computed
 *   by the parent and passed down as a prop.
 * - Clicking the watchlist button invokes onToggleWatchlist(movie.id), delegating the
 *   mutation upward to the parent that owns the centralized watchlist collection.
 * - This prevents fragmented state across cards and ensures that removing an item
 *   from the WatchlistDrawer immediately re-renders the MovieCard toggle state.
 */
function MovieCard({ movie, isInWatchlist = false, onToggleWatchlist }) {
  if (!movie) return null;

  const matchColor =
    movie.matchScore >= 95
      ? "#22c55e"
      : movie.matchScore >= 90
      ? "#38bdf8"
      : "#f59e0b";

  return h(
    "article",
    {
      className: `movie-card ${isInWatchlist ? "saved-in-watchlist" : ""}`,
      "data-testid": `movie-card-${movie.id}`,
    },
    // Visual Poster / Backdrop Header
    h(
      "div",
      {
        className: "card-poster",
        style: { background: `linear-gradient(135deg, ${movie.backdropColor}, #020617)` },
      },
      h("span", { className: "poster-emoji", role: "img", "aria-label": movie.title }, movie.poster),
      // Recommendation Match Score Badge
      h(
        "div",
        {
          className: "match-badge",
          style: { borderColor: matchColor, color: matchColor },
          "data-testid": `match-badge-${movie.id}`,
        },
        `${movie.matchScore}% Match`
      )
    ),

    // Movie Details Body
    h(
      "div",
      { className: "card-content" },
      h(
        "div",
        { className: "card-header-meta" },
        h("span", { className: "genre-badge" }, movie.genre),
        h("span", { className: "year-badge" }, movie.year),
        h("span", { className: "rating-badge" }, `⭐ ${movie.rating}`)
      ),
      h("h3", { className: "movie-title" }, movie.title),
      h("p", { className: "movie-tagline" }, `"${movie.tagline}"`),
      h("p", { className: "movie-synopsis" }, movie.synopsis),

      // Footer: Duration & Watchlist Action Button
      h(
        "div",
        { className: "card-footer" },
        h("span", { className: "duration-text" }, `⏱ ${movie.durationMinutes} min`),
        h(
          "button",
          {
            className: `watchlist-toggle-btn ${isInWatchlist ? "active" : ""}`,
            onClick: () => onToggleWatchlist && onToggleWatchlist(movie.id),
            "aria-label": isInWatchlist ? `Remove ${movie.title} from Watchlist` : `Add ${movie.title} to Watchlist`,
            "data-testid": `watchlist-btn-${movie.id}`,
          },
          isInWatchlist ? "✓ In Watchlist" : "+ Watchlist"
        )
      )
    )
  );
}

module.exports = MovieCard;
