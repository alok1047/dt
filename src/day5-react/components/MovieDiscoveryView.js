const React = require("react");
const { createElement: h, useState, useEffect, useMemo, useCallback } = React;
const FilterBar = require("./FilterBar");
const MovieCard = require("./MovieCard");
const WatchlistDrawer = require("./WatchlistDrawer");
const StateFeedback = require("./StateFeedback");
const { SAMPLE_MOVIES } = require("../mockData");

/**
 * Top-Level View Component: MovieDiscoveryView
 *
 * STATE OWNERSHIP ARCHITECTURE & RATIONALE:
 *
 * 1. Filter State (genre, minRating, sortBy):
 *    - Owned by: MovieDiscoveryView.
 *    - Why: Filters directly determine the movie recommendation pipeline.
 *      Lifting this state to MovieDiscoveryView allows the view to coordinate
 *      between the FilterBar and the resulting movie grid.
 *
 * 2. Asynchronous API Status (loading | success | empty | error):
 *    - Owned by: MovieDiscoveryView.
 *    - Why: Coordinates whether to show the movie grid, loading skeleton,
 *      empty state banner, or error retry box in StateFeedback.
 *
 * 3. Watchlist State (watchlistIds):
 *    - Owned by: MovieDiscoveryView.
 *    - Why: Shared across two disparate branches of the component tree:
 *      (a) MovieCard (which needs to know `isInWatchlist` for its toggle button)
 *      (b) WatchlistDrawer (which lists the saved items and supports removal)
 *      (c) FilterBar (which displays the badge count)
 *      Lifting state up ensures a single source of truth and prevents state drift.
 *
 * 4. UI Visibility State (isDrawerOpen):
 *    - Owned by: MovieDiscoveryView (or a layout modal manager).
 *    - Why: Triggered from FilterBar's "Watchlist" button and dismissed by WatchlistDrawer.
 *
 * 5. Derived State (filteredAndRankedMovies):
 *    - Not stored in state! Calculated dynamically via useMemo from `movies` + `filters`.
 *    - Prevents synchronization bugs and redundant re-renders.
 */
function MovieDiscoveryView({
  initialMovies = SAMPLE_MOVIES,
  initialWatchlist = ["mov_01"], // "Interstellar Horizon" saved by default
  simulateNetworkDelay = 0,
  shouldFailApi = false,
}) {
  // 1. Filter State
  const [filters, setFilters] = useState({
    genre: "All",
    minRating: 0,
    sortBy: "matchScore",
  });

  // 2. Data & Async State
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "empty" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  // 3. Watchlist State (Set of saved movie IDs)
  const [watchlistIds, setWatchlistIds] = useState(initialWatchlist);

  // 4. Modal Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Simulate Recommendation API Fetch
  const fetchRecommendations = useCallback(() => {
    setStatus("loading");
    setErrorMessage("");

    const timer = setTimeout(() => {
      if (shouldFailApi) {
        setStatus("error");
        setErrorMessage("HTTP 503: Recommendation Ranking Engine is temporarily unavailable.");
      } else {
        setMovies(initialMovies);
        setStatus("success");
      }
    }, simulateNetworkDelay);

    return () => clearTimeout(timer);
  }, [initialMovies, shouldFailApi, simulateNetworkDelay]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Derived State: Filter and Rank Movies
  const filteredAndRankedMovies = useMemo(() => {
    if (status !== "success") return [];

    let result = [...movies];

    // Filter by Genre
    if (filters.genre !== "All") {
      result = result.filter((m) => m.genre === filters.genre);
    }

    // Filter by Minimum Rating
    if (filters.minRating > 0) {
      result = result.filter((m) => m.rating >= filters.minRating);
    }

    // Rank / Sort
    if (filters.sortBy === "matchScore") {
      result.sort((a, b) => b.matchScore - a.matchScore);
    } else if (filters.sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (filters.sortBy === "year") {
      result.sort((a, b) => b.year - a.year);
    }

    return result;
  }, [movies, filters, status]);

  // Compute effective view status (distinguish empty from normal success)
  const effectiveStatus = useMemo(() => {
    if (status === "loading") return "loading";
    if (status === "error") return "error";
    if (status === "success" && filteredAndRankedMovies.length === 0) return "empty";
    return "success";
  }, [status, filteredAndRankedMovies.length]);

  // Watchlist Handlers (Lifting State Up)
  const handleToggleWatchlist = useCallback((movieId) => {
    setWatchlistIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );
  }, []);

  const handleRemoveWatchlistItem = useCallback((movieId) => {
    setWatchlistIds((prev) => prev.filter((id) => id !== movieId));
  }, []);

  const handleClearWatchlist = useCallback(() => {
    setWatchlistIds([]);
  }, []);

  // Filter Handlers
  const handleGenreChange = useCallback((genre) => {
    setFilters((prev) => ({ ...prev, genre }));
  }, []);

  const handleRatingChange = useCallback((minRating) => {
    setFilters((prev) => ({ ...prev, minRating }));
  }, []);

  const handleSortChange = useCallback((sortBy) => {
    setFilters((prev) => ({ ...prev, sortBy }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ genre: "All", minRating: 0, sortBy: "matchScore" });
  }, []);

  // Compute full movie objects in watchlist
  const watchlistMovies = useMemo(() => {
    return initialMovies.filter((m) => watchlistIds.includes(m.id));
  }, [initialMovies, watchlistIds]);

  return h(
    "div",
    { className: "movie-discovery-app", "data-testid": "movie-discovery-app" },
    // 1. Reusable Component 1: FilterBar
    h(FilterBar, {
      selectedGenre: filters.genre,
      onGenreChange: handleGenreChange,
      minRating: filters.minRating,
      onRatingChange: handleRatingChange,
      sortBy: filters.sortBy,
      onSortChange: handleSortChange,
      totalResults: filteredAndRankedMovies.length,
      onResetFilters: handleResetFilters,
      watchlistCount: watchlistIds.length,
      onOpenWatchlist: () => setIsDrawerOpen(true),
    }),

    // Main Content: State Feedback OR Movie Grid
    h(
      "main",
      { className: "main-content-area" },
      effectiveStatus !== "success"
        ? // 2. Reusable Component 4: StateFeedback (Loading, Empty, Error)
          h(StateFeedback, {
            state: effectiveStatus,
            errorMessage,
            onRetry: fetchRecommendations,
            onResetFilters: handleResetFilters,
            currentFilters: filters,
          })
        : // 3. Movie Grid composed of Reusable Component 2: MovieCard
          h(
            "section",
            {
              className: "movie-grid",
              "aria-label": "Personalized Recommendations",
              "data-testid": "movie-grid",
            },
            filteredAndRankedMovies.map((movie) =>
              h(MovieCard, {
                key: movie.id,
                movie,
                isInWatchlist: watchlistIds.includes(movie.id),
                onToggleWatchlist: handleToggleWatchlist,
              })
            )
          )
    ),

    // 4. Reusable Component 3: WatchlistDrawer
    h(WatchlistDrawer, {
      isOpen: isDrawerOpen,
      onClose: () => setIsDrawerOpen(false),
      watchlistItems: watchlistMovies,
      onRemoveItem: handleRemoveWatchlistItem,
      onClearAll: handleClearWatchlist,
    })
  );
}

module.exports = MovieDiscoveryView;
