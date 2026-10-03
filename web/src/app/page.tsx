"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useDevice } from "@/context/DeviceContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import ModeSelectorBanner from "@/components/ModeSelectorBanner";
import OnDemandDownloadModal from "@/components/OnDemandDownloadModal";
import Footer from "@/components/Footer";

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

const POPULAR_GENRES = [
  "All",
  "Action",
  "Drama",
  "Comedy",
  "Sci-Fi",
  "Animation",
  "Horror",
  "Thriller",
  "Adventure",
  "Crime",
];

export default function Home() {
  const {
    isTvMode,
    toggleTvMode,
    isMobile,
    setIsPairModalOpen,
    phoneConnected,
    appMode,
    toggleAppMode,
    setIsModeModalOpen,
  } = useDevice();

  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<MediaItem[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeModalItem, setActiveModalItem] = useState<MediaItem | null>(null);
  const [downloadModalItem, setDownloadModalItem] = useState<MediaItem | null>(null);

  // Set document title explicitly
  useEffect(() => {
    document.title = "FilmFlix - Movies & TV Series Cinema";
  }, []);
  const [onDemandMap, setOnDemandMap] = useState<Record<string, any>>({});

  const loadOnDemandCatalog = useCallback(() => {
    fetch("/api/ondemand/catalog")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          const map: Record<string, any> = {};
          for (const item of data.items) {
            map[item.id] = item;
            if (item.title) map[item.title.toLowerCase()] = item;
          }
          setOnDemandMap(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadOnDemandCatalog();
  }, [loadOnDemandCatalog]);

  // Global search states
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const moviesRailRef = useRef<HTMLDivElement | null>(null);
  const tvRailRef = useRef<HTMLDivElement | null>(null);

  // Load trending items
  useEffect(() => {
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
    const combined = [...trendingMovies, ...trendingTv];
    const seen = new Set<string>();
    return combined.filter((item) => {
      const key = `${item.media_type}-${item.tmdb_id || item.imdb_id || item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [trendingMovies, trendingTv]);

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
          (item.genres && item.genres.some((g) => g.toLowerCase().includes(selectedCategory.toLowerCase()))) ||
          (item.genre && item.genre.toLowerCase().includes(selectedCategory.toLowerCase()));
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [searchQuery, searchResults, allMediaItems, mediaFilter, selectedCategory]);

  // Spotlight Hero item
  const featuredItem = useMemo(() => {
    return allMediaItems.find((m) => m.backdrop && m.poster) || allMediaItems[0] || null;
  }, [allMediaItems]);

  const isSearchActive = searchQuery.trim().length > 0;

  const scrollRail = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const distance = direction === "left" ? -400 : 400;
    ref.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  const focusSearch = () => {
    setMobileSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const renderMediaCard = (item: MediaItem, index: number, isCarouselItem: boolean = false) => {
    const isTv = item.media_type === "tv";
    const mediaIdParam = item.imdb_id || (item.tmdb_id ? String(item.tmdb_id) : "") || item.title;
    const onDemandEntry = onDemandMap[mediaIdParam] || onDemandMap[item.title.toLowerCase()];
    const isDriveReady = onDemandEntry?.status === "ready";
    const isDriveDownloading = onDemandEntry?.status === "downloading" || onDemandEntry?.status === "uploading_drive";

    const watchHref = `/watch?id=${encodeURIComponent(mediaIdParam)}&title=${encodeURIComponent(item.title)}${
      isTv ? "&type=tv" : ""
    }${item.imdb_id ? `&imdb_id=${encodeURIComponent(item.imdb_id)}` : ""}${
      item.tmdb_id ? `&tmdb_id=${item.tmdb_id}` : ""
    }${appMode === "ondemand" ? "&mode=ondemand" : ""}`;

    return (
      <div
        key={`${item.media_type}-${item.imdb_id || item.tmdb_id || item.title}-${index}`}
        data-nav="media-card"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveModalItem(item);
          }
        }}
        className={`group flex flex-col bg-zinc-900/90 rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1.5 cursor-pointer relative shadow-lg ${
          appMode === "ondemand"
            ? isDriveReady
              ? "border-emerald-500/40 hover:border-emerald-500 shadow-emerald-500/10"
              : "border-purple-500/30 hover:border-purple-500/70"
            : "border-zinc-800/80 hover:border-indigo-500/60 focus:border-indigo-500 shadow-indigo-500/10"
        } ${
          isCarouselItem
            ? "w-[160px] sm:w-[190px] md:w-[220px] shrink-0 snap-start"
            : "w-full"
        }`}
      >
        {/* Poster Container */}
        <div
          className="relative aspect-[2/3] w-full bg-zinc-800 overflow-hidden"
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
              <span className="text-zinc-500 font-bold text-xs sm:text-sm leading-snug">{item.title}</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

          {/* Top Badges */}
          <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none">
            {appMode === "ondemand" ? (
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow flex items-center gap-1 ${
                  isDriveReady
                    ? "bg-emerald-600/90 text-white border border-emerald-400/40"
                    : isDriveDownloading
                    ? "bg-amber-600/90 text-white border border-amber-400/40 animate-pulse"
                    : "bg-purple-600/90 text-white border border-purple-400/40"
                }`}
              >
                {isDriveReady ? "✓ In Drive" : isDriveDownloading ? "⏳ Syncing" : "☁️ On-Demand"}
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow ${
                  isTv
                    ? "bg-purple-600/90 text-white border border-purple-400/40"
                    : "bg-indigo-600/90 text-white border border-indigo-400/40"
                }`}
              >
                {isTv ? "Series" : "Movie"}
              </span>
            )}

            {item.user_rating ? (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-amber-400/30 flex items-center gap-1 shadow">
                ★ {item.user_rating.toFixed(1)}
              </span>
            ) : null}
          </div>

          {/* Quick Play Floating Overlay on Hover / Touch */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
            <Link
              href={watchHref}
              data-nav="play-btn"
              onClick={(e) => e.stopPropagation()}
              className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform ${
                appMode === "ondemand" && isDriveReady
                  ? "bg-emerald-600 shadow-emerald-600/40"
                  : "bg-indigo-600 shadow-indigo-600/40"
              }`}
              title={appMode === "ondemand" ? "Play Cloud Copy" : "Instant Play"}
            >
              <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Card Details */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
          <div>
            <h4
              onClick={() => setActiveModalItem(item)}
              className="font-bold text-xs sm:text-sm text-zinc-100 truncate hover:text-indigo-400 transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate">
              {item.year ? `${item.year} • ` : ""}
              {item.genres?.slice(0, 2).join(", ") || item.genre || (isTv ? "TV Series" : "Cinema Movie")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-1.5">
            {appMode === "ondemand" ? (
              isDriveReady ? (
                <Link
                  href={watchHref}
                  data-nav="card-play-drive"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2 rounded-xl transition-colors text-xs shadow-md shadow-emerald-600/20 min-h-[38px] flex items-center justify-center gap-1"
                >
                  <span>▶</span> Play Drive
                </Link>
              ) : isDriveDownloading ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDownloadModalItem(item);
                  }}
                  data-nav="card-syncing"
                  className="flex-1 text-center bg-amber-600/90 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl transition-colors text-xs shadow-md min-h-[38px] flex items-center justify-center gap-1"
                >
                  <span>⏳</span> {onDemandEntry?.progressPercent || 35}%
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDownloadModalItem(item);
                  }}
                  data-nav="card-download-drive"
                  className="flex-1 text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2 rounded-xl transition-colors text-xs shadow-md shadow-purple-600/20 min-h-[38px] flex items-center justify-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span>Save to Drive</span>
                </button>
              )
            ) : (
              <Link
                href={watchHref}
                data-nav="card-watch"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2 rounded-xl transition-colors text-xs shadow-md shadow-indigo-600/20 min-h-[38px] flex items-center justify-center"
              >
                Watch
              </Link>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveModalItem(item);
              }}
              data-nav="card-info"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Details & Overview"
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white pb-32 md:pb-24">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-2xl bg-zinc-950/90 border-b border-zinc-800/80 px-4 md:px-8 py-3 transition-all pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="w-full md:w-auto flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 group" data-nav="logo">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform border border-pink-500/30 bg-zinc-950">
                <img
                  src="/icon.png"
                  alt="FilmFlix Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
                FILM<span className="bg-gradient-to-r from-pink-500 via-purple-400 to-indigo-400 bg-clip-text text-transparent">FLIX</span>
              </span>
            </Link>

            {/* TV Mode & Phone Remote Pairing Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPairModalOpen(true)}
                data-nav="nav-pair-phone"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border min-h-[38px] ${
                  phoneConnected
                    ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-600/20"
                }`}
                title="Connect Phone as Remote (Shortcut: R)"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">{phoneConnected ? "Phone Linked 🟢" : "Connect Phone"}</span>
                <span className="sm:hidden">{phoneConnected ? "📱 🟢" : "📱"}</span>
              </button>

              <button
                onClick={toggleAppMode}
                data-nav="nav-mode-btn"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border min-h-[38px] ${
                  appMode === "ondemand"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-600/20"
                    : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                }`}
                title="Toggle Mode: Live Stream vs Google Drive On-Demand"
              >
                <span>{appMode === "ondemand" ? "☁️ On-Demand (Drive)" : "⚡ Live Stream"}</span>
              </button>

              <button
                onClick={toggleTvMode}
                data-nav="tv-mode-btn"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border min-h-[38px] ${
                  isTvMode
                    ? "bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20"
                    : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                }`}
                title="Toggle 10-foot TV Mode (Shortcut: T)"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">{isTvMode ? "TV Mode: ON" : "TV Mode"}</span>
                <span className="sm:hidden">{isTvMode ? "TV" : "TV"}</span>
              </button>

              {/* Mobile Search Icon Toggle */}
              <button
                onClick={() => {
                  setMobileSearchOpen(!mobileSearchOpen);
                  if (!mobileSearchOpen) {
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                  }
                }}
                className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search Box (Desktop and Responsive Mobile Drawer) */}
          <div
            className={`w-full md:w-[480px] relative ${
              mobileSearchOpen ? "block" : "hidden md:block"
            }`}
          >
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
              ref={searchInputRef}
              data-nav="search-input"
              type="text"
              placeholder="Search Movie, Series or IMDb (e.g. Breaking Bad, tt0903747)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-sm placeholder-zinc-500 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner min-h-[44px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white text-base"
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-5">
        {/* 2 Modes Viewing Selector Banner */}
        <ModeSelectorBanner />
        {/* TMDb API Key Notice Banner if not configured */}
        {!hasApiKey && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-zinc-900/60 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  TMDb API
                </span>
                Unlock All Movies & TV Series
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl">
                Add your TMDb API key to <code className="text-indigo-400 bg-zinc-900 px-1 py-0.5 rounded">web/.env.local</code> as <code className="text-indigo-400 bg-zinc-900 px-1 py-0.5 rounded">TMDB_API_KEY=...</code> to display trending titles worldwide.
              </p>
            </div>
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              data-nav="tmdb-key-link"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 min-h-[38px]"
            >
              Get Free TMDb Key ↗
            </a>
          </div>
        )}

        {/* Media Type Tabs & Genre Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setMediaFilter("all")}
                data-nav="filter-all"
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[38px] ${
                  mediaFilter === "all"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                All Content
              </button>
              <button
                onClick={() => setMediaFilter("movie")}
                data-nav="filter-movie"
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[38px] ${
                  mediaFilter === "movie"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => setMediaFilter("tv")}
                data-nav="filter-tv"
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[38px] ${
                  mediaFilter === "tv"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                TV Series
              </button>
            </div>

            <span className="text-xs text-zinc-400 hidden sm:inline">
              {filteredItems.length} titles
            </span>
          </div>

          {/* Quick Genre Pills (Swipeable on mobile, D-pad navigable on TV) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth">
            {POPULAR_GENRES.map((genre) => {
              const isSelected = selectedCategory === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setSelectedCategory(genre)}
                  data-nav={`genre-${genre.toLowerCase()}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition min-h-[32px] ${
                    isSelected
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-md"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        {/* Spotlight Hero (when not searching) */}
        {!isSearchActive && featuredItem && (
          <div className="relative rounded-3xl overflow-hidden mb-10 border border-zinc-800/80 shadow-2xl bg-zinc-900 group">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url(${featuredItem.backdrop || featuredItem.poster || ""})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent"></div>
            </div>

            <div className="relative z-10 p-5 sm:p-8 md:p-12 lg:p-14 max-w-3xl flex flex-col justify-end min-h-[340px] sm:min-h-[420px]">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
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

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2.5 leading-tight drop-shadow-md">
                {featuredItem.title}
              </h2>

              <p className="text-zinc-300 text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3 mb-5 leading-relaxed max-w-2xl drop-shadow">
                {featuredItem.plot_overview || "Stream this title directly in FilmFlix with your custom stream provider."}
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/watch?id=${encodeURIComponent(
                    featuredItem.imdb_id || (featuredItem.tmdb_id ? String(featuredItem.tmdb_id) : "") || featuredItem.title
                  )}&title=${encodeURIComponent(featuredItem.title)}${
                    featuredItem.media_type === "tv" ? "&type=tv" : ""
                  }${featuredItem.imdb_id ? `&imdb_id=${encodeURIComponent(featuredItem.imdb_id)}` : ""}${
                    featuredItem.tmdb_id ? `&tmdb_id=${featuredItem.tmdb_id}` : ""
                  }`}
                  data-nav="hero-watch"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30 min-h-[44px]"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Now
                </Link>

                <button
                  onClick={() => setActiveModalItem(featuredItem)}
                  data-nav="hero-details"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-semibold text-xs sm:text-sm transition-all border border-zinc-700/80 hover:border-zinc-500 min-h-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Swipeable Rails (Trending Movies & Series) when browsing homepage */}
        {!isSearchActive && selectedCategory === "All" && mediaFilter === "all" && (
          <div className="space-y-10 mb-12">
            {/* Trending Movies Rail */}
            {trendingMovies.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Trending Movies
                  </h3>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      onClick={() => scrollRail(moviesRailRef, "left")}
                      data-nav="rail-movies-left"
                      className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition"
                      title="Scroll Left"
                    >
                      ◄
                    </button>
                    <button
                      onClick={() => scrollRail(moviesRailRef, "right")}
                      data-nav="rail-movies-right"
                      className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition"
                      title="Scroll Right"
                    >
                      ►
                    </button>
                  </div>
                </div>

                <div
                  ref={moviesRailRef}
                  className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 px-0.5"
                >
                  {trendingMovies.slice(0, 15).map((item, index) => renderMediaCard(item, index, true))}
                </div>
              </div>
            )}

            {/* Popular TV Series Rail */}
            {trendingTv.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    Popular TV Series
                  </h3>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      onClick={() => scrollRail(tvRailRef, "left")}
                      data-nav="rail-tv-left"
                      className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition"
                      title="Scroll Left"
                    >
                      ◄
                    </button>
                    <button
                      onClick={() => scrollRail(tvRailRef, "right")}
                      data-nav="rail-tv-right"
                      className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition"
                      title="Scroll Right"
                    >
                      ►
                    </button>
                  </div>
                </div>

                <div
                  ref={tvRailRef}
                  className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 px-0.5"
                >
                  {trendingTv.slice(0, 15).map((item, index) => renderMediaCard(item, index, true))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {isSearchActive
                ? `Search Results for "${searchQuery}"`
                : mediaFilter === "tv"
                ? "All TV Series"
                : mediaFilter === "movie"
                ? "All Movies"
                : "Explore Full Catalog"}
            </h3>
            <span className="text-xs text-zinc-500 sm:hidden">
              {filteredItems.length} titles
            </span>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
              {filteredItems.map((item, index) => renderMediaCard(item, index, false))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500 italic p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center">
              No matching movies or TV series found. Try another search query!
            </div>
          )}
        </div>
      </div>

      {/* Media Details Modal (Mobile Bottom Sheet / TV Centered Dialog) */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Indicator Bar */}
            <div className="sm:hidden w-12 h-1 bg-zinc-700 rounded-full mx-auto my-3"></div>

            {/* Modal Header Backdrop */}
            <div className="relative h-48 sm:h-60 bg-zinc-950 overflow-hidden sm:rounded-t-3xl">
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
                data-nav="modal-close"
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors border border-zinc-700/50 min-h-[36px] min-w-[36px]"
                title="Close (Esc)"
              >
                ✕
              </button>

              <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase bg-indigo-600 text-white">
                    {activeModalItem.media_type === "tv" ? "TV Series" : "Movie"}
                  </span>
                  {activeModalItem.user_rating && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      ★ {activeModalItem.user_rating.toFixed(1)} / 10
                    </span>
                  )}
                  {activeModalItem.year && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {activeModalItem.year}
                    </span>
                  )}
                  {activeModalItem.number_of_seasons && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {activeModalItem.number_of_seasons} Seasons
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-3xl font-black text-white">{activeModalItem.title}</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
              {/* Synopsis */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Synopsis</h4>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {activeModalItem.plot_overview || "No synopsis available for this title."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <Link
                    href={`/watch?id=${encodeURIComponent(
                      activeModalItem.imdb_id ||
                        (activeModalItem.tmdb_id ? String(activeModalItem.tmdb_id) : "") ||
                        activeModalItem.title
                    )}&title=${encodeURIComponent(activeModalItem.title)}${
                      activeModalItem.media_type === "tv" ? "&type=tv" : ""
                    }${activeModalItem.imdb_id ? `&imdb_id=${encodeURIComponent(activeModalItem.imdb_id)}` : ""}${
                      activeModalItem.tmdb_id ? `&tmdb_id=${activeModalItem.tmdb_id}` : ""
                    }`}
                    data-nav="modal-play"
                    className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group min-h-[46px]"
                  >
                    <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    ⚡ Instant Stream
                  </Link>

                  <button
                    onClick={() => {
                      const itemToDownload = activeModalItem;
                      setActiveModalItem(null);
                      setDownloadModalItem(itemToDownload);
                    }}
                    data-nav="modal-ondemand-btn"
                    className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 min-h-[46px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    ☁️ Save to Google Drive
                  </button>
                </div>

                {/* Endpoint Parameters Box */}
                <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Endpoint Query Tokens
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {activeModalItem.imdb_id ? (
                      <span className="px-2 py-0.5 rounded-lg font-mono bg-zinc-900 text-emerald-400 border border-zinc-800 text-[11px]">
                        IMDb: <strong>{activeModalItem.imdb_id}</strong>
                      </span>
                    ) : null}

                    {activeModalItem.tmdb_id ? (
                      <span className="px-2 py-0.5 rounded-lg font-mono bg-zinc-900 text-indigo-400 border border-zinc-800 text-[11px]">
                        TMDb: <strong>{activeModalItem.tmdb_id}</strong>
                      </span>
                    ) : null}

                    {activeModalItem.media_type === "tv" && (
                      <span className="px-2 py-0.5 rounded-lg font-mono bg-zinc-900 text-purple-400 border border-zinc-800 text-[11px]">
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

      {/* On-Demand Google Drive Download Modal */}
      <OnDemandDownloadModal
        item={downloadModalItem}
        isOpen={Boolean(downloadModalItem)}
        onClose={() => setDownloadModalItem(null)}
        onDownloadStarted={loadOnDemandCatalog}
      />

      {/* Footer with Creator Attribution & Instagram Link */}
      <Footer />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        mediaFilter={mediaFilter}
        onSelectFilter={(filter) => {
          setMediaFilter(filter);
          setSelectedCategory("All");
          setSearchQuery("");
        }}
        onFocusSearch={focusSearch}
      />
    </main>
  );
}
