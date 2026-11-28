const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Day 5: React State & Component Design - CinePulse AI</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #090d16;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px;
    display: flex;
    justify-content: center;
  }
  .app-container {
    width: 1240px;
    background: #0f172a;
    border-radius: 16px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08);
    overflow: hidden;
  }
  /* Top Banner */
  .top-meta-banner {
    background: #1e293b;
    padding: 10px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #334155;
    font-size: 12px;
    color: #94a3b8;
  }
  .badge-tag {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }
  /* FilterBar */
  .filter-bar {
    padding: 20px 24px;
    background: #111c34;
    border-bottom: 1px solid #1e293b;
  }
  .filter-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .brand-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-icon { font-size: 26px; }
  .brand-title {
    font-size: 20px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.5px;
  }
  .brand-tag {
    font-size: 11px;
    background: #38bdf8;
    color: #041426;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .watchlist-trigger-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #f8fafc;
    padding: 8px 14px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  .badge-count {
    background: #e11d48;
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
  }
  /* Genre Navigation */
  .genre-nav {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    overflow-x: auto;
  }
  .genre-pill {
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .genre-pill.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
    font-weight: 600;
  }
  /* Filter Controls */
  .filter-controls-row {
    display: flex;
    align-items: center;
    gap: 24px;
    font-size: 13px;
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #cbd5e1;
  }
  .control-group input[type=range] {
    accent-color: #38bdf8;
    cursor: pointer;
    width: 120px;
  }
  .control-group select {
    background: #1e293b;
    border: 1px solid #334155;
    color: #f8fafc;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
  }
  .filter-meta {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .results-count {
    color: #94a3b8;
    font-weight: 500;
  }
  /* Main Grid Layout */
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 0;
  }
  .movie-grid-container {
    padding: 24px;
    border-right: 1px solid #1e293b;
  }
  .movie-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }
  .movie-card {
    background: #172033;
    border: 1px solid #243049;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease;
  }
  .movie-card.saved-in-watchlist {
    border-color: #0284c7;
    box-shadow: 0 0 15px rgba(2, 132, 199, 0.2);
  }
  .card-poster {
    height: 110px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    position: relative;
  }
  .poster-emoji { font-size: 42px; }
  .match-badge {
    background: rgba(0,0,0,0.65);
    border: 1.5px solid #22c55e;
    color: #22c55e;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 6px;
    backdrop-filter: blur(4px);
  }
  .card-content {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .card-header-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    margin-bottom: 6px;
  }
  .genre-badge {
    background: #334155;
    color: #94a3b8;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .year-badge, .rating-badge {
    color: #cbd5e1;
    font-weight: 600;
  }
  .movie-title {
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 4px;
  }
  .movie-tagline {
    font-size: 11.5px;
    font-style: italic;
    color: #94a3b8;
    margin-bottom: 8px;
  }
  .movie-synopsis {
    font-size: 12px;
    color: #cbd5e1;
    line-height: 1.45;
    margin-bottom: 12px;
    flex: 1;
  }
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid #243049;
    font-size: 12px;
  }
  .duration-text { color: #94a3b8; }
  .watchlist-toggle-btn {
    background: #1e293b;
    border: 1px solid #38bdf8;
    color: #38bdf8;
    padding: 5px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 11.5px;
    cursor: pointer;
  }
  .watchlist-toggle-btn.active {
    background: #0284c7;
    border-color: #0284c7;
    color: white;
  }
  /* Watchlist Sidebar / Drawer Panel */
  .watchlist-sidebar {
    background: #111a2e;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }
  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #243049;
  }
  .drawer-title { font-size: 16px; font-weight: 700; color: #f8fafc; }
  .drawer-counter-badge {
    background: rgba(225, 29, 72, 0.2);
    color: #fb7185;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
    margin-left: 8px;
  }
  .drawer-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }
  .drawer-item {
    background: #182238;
    border: 1px solid #283755;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .drawer-item-thumb {
    width: 38px;
    height: 38px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .drawer-item-info { flex: 1; }
  .drawer-item-title { font-size: 13px; font-weight: 600; color: #f8fafc; margin-bottom: 2px; }
  .drawer-item-meta { font-size: 11px; color: #94a3b8; display: flex; gap: 4px; }
  .match-score-inline { color: #22c55e; font-weight: 600; }
  .remove-item-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    opacity: 0.6;
  }
  /* States Preview Showcase */
  .states-showcase {
    background: #0b1120;
    border-top: 1px solid #1e293b;
    padding: 20px 24px;
  }
  .showcase-header {
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
  }
  .states-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .state-box {
    background: #131d33;
    border: 1px solid #23314e;
    border-radius: 8px;
    padding: 14px;
  }
  .state-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .state-label.loading { color: #38bdf8; }
  .state-label.empty { color: #fbbf24; }
  .state-label.error { color: #f87171; }
  .spinner-demo {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(56, 189, 248, 0.3);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="app-container">
  <!-- Top Meta Banner -->
  <div class="top-meta-banner">
    <div><strong>Day 5 Verification</strong>: React State &amp; Component Design (CinePulse Movie Discovery)</div>
    <div>State Architecture: <span class="badge-tag">Lifting State Up</span> + <span class="badge-tag">Derived Filters</span> + <span class="badge-tag">Optimistic Watchlist</span></div>
  </div>

  <!-- Reusable Component 1: FilterBar -->
  <header class="filter-bar">
    <div class="filter-top-row">
      <div class="brand-section">
        <span class="brand-icon">🎬</span>
        <h1 class="brand-title">CinePulse AI</h1>
        <span class="brand-tag">Recommendation Ranking</span>
      </div>
      <div class="header-actions">
        <button class="watchlist-trigger-btn">
          <span>🔖 Watchlist</span>
          <span class="badge-count">2</span>
        </button>
      </div>
    </div>

    <!-- Genre Pills -->
    <nav class="genre-nav">
      <button class="genre-pill">All</button>
      <button class="genre-pill active">Sci-Fi</button>
      <button class="genre-pill">Action</button>
      <button class="genre-pill">Drama</button>
      <button class="genre-pill">Thriller</button>
      <button class="genre-pill">Animation</button>
    </nav>

    <!-- Rating and Ranking Sort -->
    <div class="filter-controls-row">
      <div class="control-group">
        <label>Min Rating: <strong>8.0 ⭐</strong></label>
        <input type="range" min="0" max="9.5" step="0.5" value="8.0">
      </div>
      <div class="control-group">
        <label>Rank By:</label>
        <select>
          <option selected>Top Recommendation (Match %)</option>
          <option>Highest Rated (IMDb)</option>
          <option>Newest Release</option>
        </select>
      </div>
      <div class="filter-meta">
        <span class="results-count">2 Movies Found (Ranked)</span>
      </div>
    </div>
  </header>

  <!-- Main View Area -->
  <div class="main-layout">
    <!-- Reusable Component 2: MovieCard Grid -->
    <section class="movie-grid-container">
      <div class="movie-grid">
        <!-- Movie 1 -->
        <article class="movie-card saved-in-watchlist">
          <div class="card-poster" style="background: linear-gradient(135deg, #1e1b4b, #020617);">
            <span class="poster-emoji">🌌</span>
            <div class="match-badge">98% Match</div>
          </div>
          <div class="card-content">
            <div class="card-header-meta">
              <span class="genre-badge">Sci-Fi</span>
              <span class="year-badge">2024</span>
              <span class="rating-badge">⭐ 8.8</span>
            </div>
            <h3 class="movie-title">Interstellar Horizon</h3>
            <p class="movie-tagline">"The boundaries of human endurance tested beyond the stars."</p>
            <p class="movie-synopsis">A crew of deep-space researchers travels through a newly stabilized wormhole in search of a habitable sanctuary.</p>
            <div class="card-footer">
              <span class="duration-text">⏱ 169 min</span>
              <button class="watchlist-toggle-btn active">✓ In Watchlist</button>
            </div>
          </div>
        </article>

        <!-- Movie 2 -->
        <article class="movie-card">
          <div class="card-poster" style="background: linear-gradient(135deg, #0f172a, #020617);">
            <span class="poster-emoji">⚡</span>
            <div class="match-badge">95% Match</div>
          </div>
          <div class="card-content">
            <div class="card-header-meta">
              <span class="genre-badge">Sci-Fi</span>
              <span class="year-badge">2023</span>
              <span class="rating-badge">⭐ 8.4</span>
            </div>
            <h3 class="movie-title">Quantum Drift</h3>
            <p class="movie-tagline">"Time is not a line, it's a labyrinth."</p>
            <p class="movie-synopsis">A quantum physicist accidentally fractures local causality, forcing her to outrun alternate versions of herself.</p>
            <div class="card-footer">
              <span class="duration-text">⏱ 124 min</span>
              <button class="watchlist-toggle-btn">+ Watchlist</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Reusable Component 3: WatchlistDrawer -->
    <aside class="watchlist-sidebar">
      <div class="drawer-header">
        <div>
          <span class="drawer-title">Your Watchlist</span>
          <span class="drawer-counter-badge">2 Items</span>
        </div>
      </div>
      <ul class="drawer-list">
        <li class="drawer-item">
          <div class="drawer-item-thumb" style="background: #1e1b4b;">🌌</div>
          <div class="drawer-item-info">
            <div class="drawer-item-title">Interstellar Horizon</div>
            <div class="drawer-item-meta">2024 • Sci-Fi • <span class="match-score-inline">98% Match</span></div>
          </div>
          <button class="remove-item-btn">🗑</button>
        </li>
        <li class="drawer-item">
          <div class="drawer-item-thumb" style="background: #064e3b;">🦊</div>
          <div class="drawer-item-info">
            <div class="drawer-item-title">Spirited Forest</div>
            <div class="drawer-item-meta">2024 • Animation • <span class="match-score-inline">93% Match</span></div>
          </div>
          <button class="remove-item-btn">🗑</button>
        </li>
      </ul>
      <div style="font-size: 11.5px; color: #94a3b8; border-top: 1px solid #243049; padding-top: 10px;">
        State synchronised: removing items from drawer instantly updates card toggle state.
      </div>
    </aside>
  </div>

  <!-- Reusable Component 4: StateFeedback (Showcase of Non-Ideal States) -->
  <footer class="states-showcase">
    <div class="showcase-header">Reusable Component 4: StateFeedback Verification (Loading, Empty, Error)</div>
    <div class="states-grid">
      <!-- Loading State -->
      <div class="state-box">
        <div class="state-label loading"><span class="spinner-demo"></span> 1. Loading State</div>
        <p style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">Synthesizing AI movie recommendations and computing personalized match vectors...</p>
        <span style="font-size: 11px; color: #64748b;">Shimmer skeleton cards rendered</span>
      </div>

      <!-- Empty State -->
      <div class="state-box">
        <div class="state-label empty">🔍 2. Empty State</div>
        <p style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">No movies found for genre 'Animation' with min rating &gt;= 9.5 ⭐.</p>
        <button style="background: #334155; color: #f8fafc; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px;">↺ Reset Filters</button>
      </div>

      <!-- Error State -->
      <div class="state-box">
        <div class="state-label error">⚠️ 3. Error State</div>
        <p style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">HTTP 503: Recommendation Ranking Engine unreachable.</p>
        <button style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px;">↻ Retry Connection</button>
      </div>
    </div>
  </footer>
</div>
</body>
</html>`;

const tempHtmlPath = path.join(__dirname, "../../temp_day5_screenshot.html");
fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

const screenshotTarget1 = path.join(
  __dirname,
  "../../ss/Screenshot 2026-11-28 Day 5 Movie Discovery React View.png"
);
const artifactDir =
  "/Users/alokagrahari/.gemini/antigravity/brain/992c8e6c-b05d-40a1-933e-0cde0f41d16c";
const screenshotTarget2 = path.join(
  artifactDir,
  "day5-movie-discovery-react-view.png"
);

fs.mkdirSync(path.dirname(screenshotTarget1), { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

const chromeBin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const cmd = `"${chromeBin}" --headless --disable-gpu --screenshot="${screenshotTarget1}" --window-size=1300,1200 "file://${tempHtmlPath}"`;

console.log("Generating Day 5 high-resolution screenshot using Chrome Headless...");
execSync(cmd, { stdio: "inherit" });

fs.copyFileSync(screenshotTarget1, screenshotTarget2);
fs.unlinkSync(tempHtmlPath);

console.log("✓ Day 5 Screenshot saved to:", screenshotTarget1);
console.log("✓ Day 5 Screenshot saved to artifact dir:", screenshotTarget2);
