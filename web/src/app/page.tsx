"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

export interface MediaItem {
  title: string;
  media_type?: "movie" | "tv";
  source_url?: string;
  extracted_links: string[];
  genre?: string;
  genres?: string[];
  year?: number;
  imdb_id?: string;
  tmdb_id?: number;
  plot_overview?: string;
  poster?: string;
  backdrop?: string;
  user_rating?: number;
  runtime_minutes?: number;
  number_of_seasons?: number;
}

export default function Home() {
  const [catalog, setCatalog] = useState<MediaItem[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<MediaItem[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeModalItem, setActiveModalItem] = useState<MediaItem | null>(null);

  // Global search states
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load catalog and trending items
  useEffect(() => {
    fetch("/catalog.json")
      .then((res) => res.json())
      .then((data: MediaItem[]) => setCatalog(data.map((m) => ({ ...m, media_type: "movie" }))))
      .catch((err) => console.error("Failed to load catalog:", err));

    fetch("/api/trending")
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(data.hasApiKey);
        if (data.movies) setTrendingMovies(data.movies);
        if (data.tvShows) setTrendingTv(data.tvShows);
      })
      .catch((err) => console.error("Failed to load trending items:", err));
  }, []);

  // Debounced search for movies and TV series
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          if (data.hasApiKey !== undefined) setHasApiKey(data.hasApiKey);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Combine items for homepage browsing
  const allMediaItems = useMemo(() => {
    const combined = [...catalog, ...trendingMovies, ...trendingTv];
    const seen = new Set<string>();
    return combined.filter((item) => {
      const key = `${item.media_type}-${item.tmdb_id || item.imdb_id || item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [catalog, trendingMovies, trendingTv]);

  // Filter based on search, media type (Movie / TV), and category
  const filteredItems = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return searchResults.filter((item) => {
        if (mediaFilter === "movie" && item.media_type === "tv") return false;
        if (mediaFilter === "tv" && item.media_type === "movie") return false;
        return true;
      });
    }

    return allMediaItems.filter((item) => {
      if (mediaFilter === "movie" && item.media_type === "tv") return false;
      if (mediaFilter === "tv" && item.media_type === "movie") return false;

      if (selectedCategory !== "All") {
        const matchesCategory =
          (item.genres && item.genres.includes(selectedCategory)) ||
          item.genre === selectedCategory;
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [searchQuery, searchResults, allMediaItems, mediaFilter, selectedCategory]);

  // Spotlight Hero item
  const featuredItem = useMemo(() => {
    return allMediaItems.find((m) => m.backdrop && m.poster) || catalog[0] || null;
  }, [allMediaItems, catalog]);

  const isSearchActive = searchQuery.trim().length > 0;

  const renderMediaCard = (item: MediaItem, index: number) => {
    const isTv = item.media_type === "tv";
    const videoUrl = item.extracted_links?.[0];
    const hasDirectPlay = Boolean(videoUrl);
    const mediaIdParam = item.imdb_id || (item.tmdb_id ? String(item.tmdb_id) : "") || item.title;

    return (
      <div
        key={`${item.media_type}-${item.imdb_id || item.tmdb_id || item.title}-${index}`}
        className="group flex flex-col bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-indigo-500/60 shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1.5"
      >
        {/* Poster Container */}
        <div
          className="relative aspect-[2/3] w-full bg-zinc-800 overflow-hidden cursor-pointer"
          onClick={() => setActiveModalItem(item)}
        >
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-800 to-zinc-900 text-center">
              <span className="text-zinc-500 font-bold text-sm sm:text-base leading-snug">{item.title}</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

          {/* Top Badges */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1 pointer-events-none">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow ${
                isTv
                  ? "bg-purple-600/90 text-white border border-purple-400/40"
                  : "bg-indigo-600/90 text-white border border-indigo-400/40"
              }`}
            >
              {isTv ? "Series" : "Movie"}
            </span>

            {item.user_rating ? (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-amber-400/30 flex items-center gap-1 shadow">
                ★ {item.user_rating.toFixed(1)}
              </span>
            ) : null}
          </div>

          {/* Bottom Indicators */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            {hasDirectPlay ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/90 text-white backdrop-blur-md shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Direct Play
              </span>
            ) : item.imdb_id ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-zinc-900/90 text-emerald-400 backdrop-blur-md border border-emerald-500/30 shadow-md">
                {item.imdb_id}
              </span>
            ) : null}
          </div>
        </div>

        {/* Card Details */}
        <div className="p-3.5 flex-1 flex flex-col justify-between">
          <div>
            <h4
              onClick={() => setActiveModalItem(item)}
              className="font-bold text-sm text-zinc-100 truncate hover:text-indigo-400 transition-colors cursor-pointer"
              title={item.title}
            >
              {item.title}
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              {item.year ? `${item.year} • ` : ""}
              {item.genres?.join(", ") || item.genre || (isTv ? "TV Series" : "Cinema Movie")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 flex items-center gap-1.5">
            <Link
              href={`/watch?id=${encodeURIComponent(mediaIdParam)}&title=${encodeURIComponent(item.title)}${
                isTv ? "&type=tv" : ""
              }${videoUrl ? `&url=${encodeURIComponent(videoUrl)}` : ""}${
                item.imdb_id ? `&imdb_id=${encodeURIComponent(item.imdb_id)}` : ""
              }${item.tmdb_id ? `&tmdb_id=${item.tmdb_id}` : ""}`}
              className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 rounded-lg transition-colors text-xs shadow-md shadow-indigo-600/20"
            >
              Watch Now
            </Link>

            <button
              onClick={() => setActiveModalItem(item)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="View Synopsis & Details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white pb-24">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/85 border-b border-zinc-800/80 px-4 md:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                FILM<span className="text-indigo-400">FLIX</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              Movies & Series
            </span>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-[480px] relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              type="text"
              placeholder="Search any Movie or Series (e.g. Breaking Bad, Inception, tt0903747)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-sm placeholder-zinc-500 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        {/* TMDb API Key Notice Banner if not configured */}
        {!hasApiKey && (
          <div className="mb-8 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-zinc-900/60 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  TMDb API
                </span>
                Unlock All Movies & TV Series
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl">
                Add your free TMDb API key to <code className="text-indigo-400 bg-zinc-900 px-1 py-0.5 rounded">web/.env.local</code> as <code className="text-indigo-400 bg-zinc-900 px-1 py-0.5 rounded">TMDB_API_KEY=...</code> to instantly display every trending movie, popular TV series, and search millions of titles worldwide.
              </p>
            </div>
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
            >
              Get Free TMDb Key ↗
            </a>
          </div>
        )}

        {/* Media Type Tabs: All / Movies / TV Shows */}
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMediaFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                mediaFilter === "all"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              All Content
            </button>
            <button
              onClick={() => setMediaFilter("movie")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                mediaFilter === "movie"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => setMediaFilter("tv")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                mediaFilter === "tv"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              TV Series
            </button>
          </div>

          <span className="text-xs text-zinc-500">
            {filteredItems.length} titles available
          </span>
        </div>

        {/* Spotlight Hero (when not searching) */}
        {!isSearchActive && featuredItem && (
          <div className="relative rounded-3xl overflow-hidden mb-12 border border-zinc-800/80 shadow-2xl bg-zinc-900 group">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url(${featuredItem.backdrop || featuredItem.poster || ""})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent"></div>
            </div>

            <div className="relative z-10 p-6 md:p-12 lg:p-16 max-w-3xl flex flex-col justify-end min-h-[420px]">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-md">
                  {featuredItem.media_type === "tv" ? "Featured Series" : "Featured Film"}
                </span>
                {featuredItem.user_rating && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    ★ {featuredItem.user_rating.toFixed(1)} / 10
                  </span>
                )}
                {featuredItem.year && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                    {featuredItem.year}
                  </span>
                )}
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3 leading-tight drop-shadow-md">
                {featuredItem.title}
              </h2>

              <p className="text-zinc-300 text-sm sm:text-base line-clamp-3 mb-6 leading-relaxed max-w-2xl drop-shadow">
                {featuredItem.plot_overview || "Stream this title directly in FilmFlix with your custom stream provider."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/watch?id=${encodeURIComponent(
                    featuredItem.imdb_id || (featuredItem.tmdb_id ? String(featuredItem.tmdb_id) : "") || featuredItem.title
                  )}&title=${encodeURIComponent(featuredItem.title)}${
                    featuredItem.media_type === "tv" ? "&type=tv" : ""
                  }${
                    featuredItem.extracted_links?.[0]
                      ? `&url=${encodeURIComponent(featuredItem.extracted_links[0])}`
                      : ""
                  }`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Now
                </Link>

                <button
                  onClick={() => setActiveModalItem(featuredItem)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm transition-all border border-zinc-700/80 hover:border-zinc-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Details & Overview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {isSearchActive
                  ? `Search Results for "${searchQuery}"`
                  : mediaFilter === "tv"
                  ? "Trending TV Series"
                  : mediaFilter === "movie"
                  ? "Popular Movies"
                  : "Catalog & Trending Releases"}
              </h3>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filteredItems.map((item, index) => renderMediaCard(item, index))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500 italic p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center">
              No matching movies or TV series found. Try another search query!
            </div>
          )}
        </div>
      </div>

      {/* Media Details Modal */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Backdrop */}
            <div className="relative h-60 bg-zinc-950 overflow-hidden rounded-t-3xl">
              {activeModalItem.backdrop ? (
                <img
                  src={activeModalItem.backdrop}
                  alt={activeModalItem.title}
                  className="w-full h-full object-cover"
                />
              ) : activeModalItem.poster ? (
                <img
                  src={activeModalItem.poster}
                  alt={activeModalItem.title}
                  className="w-full h-full object-cover blur-sm opacity-50"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

              <button
                onClick={() => setActiveModalItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors border border-zinc-700/50"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-600 text-white">
                    {activeModalItem.media_type === "tv" ? "TV Series" : "Movie"}
                  </span>
                  {activeModalItem.user_rating && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      ★ {activeModalItem.user_rating.toFixed(1)} / 10
                    </span>
                  )}
                  {activeModalItem.year && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {activeModalItem.year}
                    </span>
                  )}
                  {activeModalItem.number_of_seasons && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {activeModalItem.number_of_seasons} Seasons
                    </span>
                  )}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">{activeModalItem.title}</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Synopsis */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Synopsis</h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {activeModalItem.plot_overview || "No synopsis available for this title."}
                </p>
              </div>

              {/* Action Buttons & Endpoint Integration */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href={`/watch?id=${encodeURIComponent(
                      activeModalItem.imdb_id ||
                        (activeModalItem.tmdb_id ? String(activeModalItem.tmdb_id) : "") ||
                        activeModalItem.title
                    )}&title=${encodeURIComponent(activeModalItem.title)}${
                      activeModalItem.media_type === "tv" ? "&type=tv" : ""
                    }${
                      activeModalItem.extracted_links?.[0]
                        ? `&url=${encodeURIComponent(activeModalItem.extracted_links[0])}`
                        : ""
                    }${activeModalItem.imdb_id ? `&imdb_id=${encodeURIComponent(activeModalItem.imdb_id)}` : ""}${
                      activeModalItem.tmdb_id ? `&tmdb_id=${activeModalItem.tmdb_id}` : ""
                    }`}
                    className="flex-1 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group"
                  >
                    <svg className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play in Cinema Player
                  </Link>

                  {activeModalItem.extracted_links?.[0] && (
                    <Link
                      href={`/watch?title=${encodeURIComponent(activeModalItem.title)}&url=${encodeURIComponent(
                        activeModalItem.extracted_links[0]
                      )}`}
                      className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 flex items-center justify-center gap-2 transition"
                    >
                      Play Archive Direct MP4
                    </Link>
                  )}
                </div>

                {/* Endpoint Parameters Box */}
                <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Endpoint Query Tokens
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {activeModalItem.imdb_id ? (
                      <span className="px-2.5 py-1 rounded-lg font-mono bg-zinc-900 text-emerald-400 border border-zinc-800">
                        IMDb: <strong>{activeModalItem.imdb_id}</strong>
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-xs italic">Resolving IMDb ID via TMDb</span>
                    )}

                    {activeModalItem.tmdb_id ? (
                      <span className="px-2.5 py-1 rounded-lg font-mono bg-zinc-900 text-indigo-400 border border-zinc-800">
                        TMDb: <strong>{activeModalItem.tmdb_id}</strong>
                      </span>
                    ) : null}

                    {activeModalItem.media_type === "tv" && (
                      <span className="px-2.5 py-1 rounded-lg font-mono bg-zinc-900 text-purple-400 border border-zinc-800">
                        Tokens: &#123;season&#125; &#123;episode&#125;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
