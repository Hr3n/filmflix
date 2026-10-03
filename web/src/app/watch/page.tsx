"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState, useMemo, useRef, useCallback } from "react";
import { INITIAL_SERVERS, StreamServer, buildEmbedUrl, resolveServerTemplate } from "@/config/player";
import { useDevice } from "@/context/DeviceContext";
import OnDemandDownloadModal from "@/components/OnDemandDownloadModal";
import ModeSwitchModal from "@/components/ModeSwitchModal";
import Footer from "@/components/Footer";
import { MediaItem } from "@/app/page";
import { OnDemandItem } from "@/lib/onDemandStore";

interface SeasonInfo {
  season_number: number;
  episode_count: number;
  name: string;
}

interface MovieDetails {
  title: string;
  media_type?: "movie" | "tv";
  imdb_id?: string;
  tmdb_id?: number;
  year?: number;
  runtime_minutes?: number;
  genres?: string[];
  genre?: string;
  plot_overview?: string;
  poster?: string;
  backdrop?: string;
  user_rating?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: SeasonInfo[];
  extracted_links?: string[];
  source_url?: string;
}

function VideoPlayer() {
  const {
    isTvMode,
    toggleTvMode,
    setIsPairModalOpen,
    phoneConnected,
    appMode,
    setAppMode,
    isModeModalOpen,
    setIsModeModalOpen,
  } = useDevice();

  const searchParams = useSearchParams();
  const titleParam = searchParams.get("title") || "";
  const directVideoUrl = searchParams.get("url");
  const rawId = searchParams.get("id");
  const imdbIdParam = searchParams.get("imdb_id");
  const tmdbIdParam = searchParams.get("tmdb_id");
  const mediaTypeParam = (searchParams.get("type") as "movie" | "tv" | null) || undefined;
  const initialSeason = parseInt(searchParams.get("s") || searchParams.get("season") || "1", 10);
  const initialEpisode = parseInt(searchParams.get("e") || searchParams.get("episode") || "1", 10);
  const urlMode = searchParams.get("mode") as "stream" | "ondemand" | null;

  // Active viewing mode: Mode 1 (stream endpoints) vs Mode 2 (Google Drive on-demand)
  const [effectiveMode, setEffectiveMode] = useState<"stream" | "ondemand">(
    urlMode || appMode || "stream"
  );

  const [movieMeta, setMovieMeta] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // TV Series Episode/Season state
  const [selectedSeason, setSelectedSeason] = useState<number>(initialSeason);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(initialEpisode);

  // Multi-server state (Mode 1)
  const [servers, setServers] = useState<StreamServer[]>(INITIAL_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>("server-1");
  const [playerMode, setPlayerMode] = useState<"embed" | "direct">("embed");
  const [showConfig, setShowConfig] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Anti-Popup / Sandbox Shield state (defaults to true for maximum protection)
  const [blockPopups, setBlockPopups] = useState<boolean>(true);

  // On-Demand Google Drive state (Mode 2)
  const [onDemandItem, setOnDemandItem] = useState<OnDemandItem | null>(null);
  const [isOnDemandModalOpen, setIsOnDemandModalOpen] = useState(false);
  const [drivePlayerType, setDrivePlayerType] = useState<"html5" | "iframe">("html5");

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const episodeRowRef = useRef<HTMLDivElement | null>(null);

  // Sync mode from device context or URL
  useEffect(() => {
    if (urlMode) {
      setEffectiveMode(urlMode);
    } else if (appMode) {
      setEffectiveMode(appMode);
    }
  }, [urlMode, appMode]);

  // Load saved popups shield setting
  useEffect(() => {
    try {
      localStorage.removeItem("filmflix_stream_servers");
    } catch {}
    setServers(INITIAL_SERVERS);

    const savedShield = localStorage.getItem("filmflix_block_popups");
    if (savedShield !== null) {
      setBlockPopups(savedShield === "true");
    }
  }, []);

  // When switching movies, reset servers to defaults
  useEffect(() => {
    setServers(INITIAL_SERVERS);
  }, [rawId, imdbIdParam, tmdbIdParam, titleParam]);

  const handleToggleShield = () => {
    const nextVal = !blockPopups;
    setBlockPopups(nextVal);
    localStorage.setItem("filmflix_block_popups", String(nextVal));
  };

  const lookupId = rawId || imdbIdParam || tmdbIdParam || titleParam;
  const isTvShow =
    movieMeta?.media_type === "tv" ||
    mediaTypeParam === "tv" ||
    (movieMeta?.seasons && movieMeta.seasons.length > 0);
  const activeTitle = movieMeta?.title || titleParam || "Unknown Video";
  const activeImdbId = movieMeta?.imdb_id || imdbIdParam || (rawId?.startsWith("tt") ? rawId : null);
  const activeTmdbId = movieMeta?.tmdb_id || tmdbIdParam || (!rawId?.startsWith("tt") ? rawId : null);
  const activeDirectUrl = directVideoUrl || movieMeta?.extracted_links?.[0];

  // Dynamically update browser tab title
  useEffect(() => {
    if (activeTitle && activeTitle !== "Unknown Video") {
      document.title = `${activeTitle} - Watch on FilmFlix`;
    } else {
      document.title = "FilmFlix - Cinema Player";
    }
  }, [activeTitle]);

  // Fetch movie or TV details
  useEffect(() => {
    if (!lookupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const typeQuery = mediaTypeParam ? `?type=${mediaTypeParam}` : "";
    fetch(`/api/details/${encodeURIComponent(lookupId)}${typeQuery}`)
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) {
          setMovieMeta(data);
          const activeServer = servers.find((s) => s.id === activeServerId);
          const isTv =
            data.media_type === "tv" ||
            mediaTypeParam === "tv" ||
            (data.seasons && data.seasons.length > 0);
          const activeTemplate = activeServer ? resolveServerTemplate(activeServer, isTv) : "";
          if (directVideoUrl && !activeTemplate) {
            setPlayerMode("direct");
          }
        }
      })
      .catch((err) => console.error("Failed to load movie details:", err))
      .finally(() => setLoading(false));
  }, [rawId, imdbIdParam, tmdbIdParam, titleParam, mediaTypeParam]);

  // Query On-Demand Google Drive file status
  const refreshOnDemand = useCallback(() => {
    if (!lookupId) return;
    const epQuery = isTvShow ? `&s=${selectedSeason}&e=${selectedEpisode}` : "";
    fetch(`/api/ondemand/download?id=${encodeURIComponent(lookupId)}${epQuery}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.item) {
          setOnDemandItem(data.item);
        } else {
          setOnDemandItem(null);
        }
      })
      .catch(() => {});
  }, [lookupId, isTvShow, selectedSeason, selectedEpisode]);

  useEffect(() => {
    refreshOnDemand();
  }, [refreshOnDemand]);

  // Poll progress if currently downloading/uploading to Google Drive
  useEffect(() => {
    if (
      onDemandItem &&
      (onDemandItem.status === "downloading" || onDemandItem.status === "uploading_drive")
    ) {
      const interval = setInterval(refreshOnDemand, 1500);
      return () => clearInterval(interval);
    }
  }, [onDemandItem?.status, refreshOnDemand]);

  // Episode count for selected season
  const currentSeasonData = useMemo(() => {
    if (!movieMeta?.seasons) return null;
    return (
      movieMeta.seasons.find((s) => s.season_number === selectedSeason) || movieMeta.seasons[0]
    );
  }, [movieMeta?.seasons, selectedSeason]);

  const episodeCount = currentSeasonData?.episode_count || (isTvShow ? 24 : 1);

  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0];
  const activeTemplate = resolveServerTemplate(activeServer, Boolean(isTvShow));

  const embedUrl = activeTemplate
    ? buildEmbedUrl(activeTemplate, {
        id: rawId || activeImdbId || (activeTmdbId ? String(activeTmdbId) : null),
        imdb_id: activeImdbId,
        tmdb_id: activeTmdbId,
        season: isTvShow ? selectedSeason : null,
        episode: isTvShow ? selectedEpisode : null,
        idPreference: activeServer.idPreference || "auto",
      })
    : null;

  // Toggle true Fullscreen across mobile and TV
  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          try {
            if (screen.orientation && "lock" in screen.orientation) {
              (screen.orientation as any).lock("landscape").catch(() => {});
            }
          } catch {}
        })
        .catch((err) => console.error("Fullscreen error:", err));
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
          try {
            if (screen.orientation && "unlock" in screen.orientation) {
              screen.orientation.unlock();
            }
          } catch {}
        })
        .catch((err) => console.error("Exit fullscreen error:", err));
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // TV remote hotkeys for Watch page
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isInput) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        // Toggle mode hotkey
        e.preventDefault();
        const nextMode = effectiveMode === "stream" ? "ondemand" : "stream";
        setEffectiveMode(nextMode);
        setAppMode(nextMode);
      } else if (e.key === "n" || e.key === "N") {
        // Next Episode
        if (isTvShow) {
          e.preventDefault();
          setSelectedEpisode((prev) => Math.min(prev + 1, episodeCount));
        }
      } else if (e.key === "p" || e.key === "P") {
        // Prev Episode
        if (isTvShow) {
          e.preventDefault();
          setSelectedEpisode((prev) => Math.max(prev - 1, 1));
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleFullscreen, isTvShow, episodeCount, effectiveMode, setAppMode]);

  const handleUpdateServer = (id: string, updates: Partial<StreamServer>) => {
    const updated = servers.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setServers(updated);
  };

  const handleResetToDefaults = () => {
    try {
      localStorage.removeItem("filmflix_stream_servers");
    } catch {}
    setServers(INITIAL_SERVERS);
  };

  const handleSwitchMode = (newMode: "stream" | "ondemand") => {
    setEffectiveMode(newMode);
    setAppMode(newMode);
  };

  // Convert MovieDetails into MediaItem for OnDemandDownloadModal
  const watchMediaItem: MediaItem = useMemo(() => {
    return {
      title: activeTitle,
      media_type: isTvShow ? "tv" : "movie",
      extracted_links: activeDirectUrl ? [activeDirectUrl] : [],
      imdb_id: activeImdbId || undefined,
      tmdb_id: activeTmdbId ? Number(activeTmdbId) : undefined,
      poster: movieMeta?.poster,
      backdrop: movieMeta?.backdrop,
      year: movieMeta?.year,
      genres: movieMeta?.genres,
      plot_overview: movieMeta?.plot_overview,
      user_rating: movieMeta?.user_rating,
      runtime_minutes: movieMeta?.runtime_minutes,
      number_of_seasons: movieMeta?.number_of_seasons,
    };
  }, [
    activeTitle,
    isTvShow,
    activeDirectUrl,
    activeImdbId,
    activeTmdbId,
    movieMeta,
  ]);

  const isOnDemandReady = onDemandItem?.status === "ready";
  const isOnDemandProcessing =
    onDemandItem?.status === "downloading" || onDemandItem?.status === "uploading_drive";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Navigation Bar (Mobile & TV Optimized) */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-zinc-950/90 border-b border-zinc-800/80 px-3 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <Link
            href="/"
            data-nav="watch-back"
            className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 shrink-0 min-h-[38px] group"
          >
            <img src="/icon.png" alt="FilmFlix" className="w-5 h-5 rounded-md object-contain border border-pink-500/30 group-hover:scale-105 transition-transform" />
            <span className="hidden sm:inline">Back to Catalog</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <span className="hidden sm:inline h-4 w-px bg-zinc-800 shrink-0" />

          <div className="flex items-center gap-2 truncate">
            <h1 className="font-bold text-sm sm:text-base md:text-lg truncate text-white">
              {activeTitle}
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                isTvShow
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              }`}
            >
              {isTvShow ? `S${selectedSeason}:E${selectedEpisode}` : "Movie"}
            </span>

            {/* Active Mode Pill Badge */}
            <button
              onClick={() => setIsModeModalOpen(true)}
              data-nav="watch-mode-pill"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition border ${
                effectiveMode === "ondemand"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-indigo-500/15 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/25"
              }`}
              title="Click to Switch Viewing Mode"
            >
              <span>{effectiveMode === "ondemand" ? "☁️ On-Demand Mode" : "⚡ Stream Mode"}</span>
              <span className="text-[9px] opacity-75">⇄</span>
            </button>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Pair Phone Remote Button */}
          <button
            onClick={() => setIsPairModalOpen(true)}
            data-nav="watch-pair-phone"
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border min-h-[38px] ${
              phoneConnected
                ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-600/20"
            }`}
            title="Connect Phone as Remote (Shortcut: R)"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="hidden md:inline">{phoneConnected ? "Phone Paired 🟢" : "Pair Phone"}</span>
            <span className="md:hidden">{phoneConnected ? "📱 🟢" : "📱"}</span>
          </button>

          {/* TV Mode Toggle */}
          <button
            onClick={toggleTvMode}
            data-nav="watch-tv-mode"
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border min-h-[38px] ${
              isTvMode
                ? "bg-emerald-600 text-white border-emerald-400"
                : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
            }`}
            title="Toggle TV Mode [T]"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden md:inline">{isTvMode ? "TV: ON" : "TV Mode"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            data-nav="watch-fullscreen"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition min-h-[38px]"
            title="Toggle Fullscreen [F]"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          {/* Anti-Popup Shield Toggle Button (Only relevant for stream mode) */}
          {effectiveMode === "stream" && (
            <button
              onClick={handleToggleShield}
              data-nav="watch-shield"
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border min-h-[38px] ${
                blockPopups
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
              }`}
              title={
                blockPopups
                  ? "Anti-Popup Shield: Active (Popups and redirects blocked)"
                  : "Compatibility Mode (Popups allowed)"
              }
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="hidden md:inline">{blockPopups ? "Shield ON" : "Shield OFF"}</span>
            </button>
          )}

          {/* Servers Config (Only relevant for stream mode) */}
          {effectiveMode === "stream" && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              data-nav="watch-servers-btn"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 flex items-center gap-1.5 transition min-h-[38px]"
              title="Manage Provider Servers"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Servers</span>
            </button>
          )}
        </div>
      </header>

      {/* Multi-Server & Shield Configuration Drawer (Mode 1) */}
      {showConfig && effectiveMode === "stream" && (
        <div className="bg-zinc-900/95 border-b border-zinc-800 p-4 sm:p-6 md:px-8 transition-all animate-in slide-in-from-top">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  Movie & Series Endpoint Templates
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Pick your active stream provider and endpoint template.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetToDefaults}
                  data-nav="cfg-reset"
                  className="text-xs text-indigo-400 hover:text-indigo-300 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-indigo-500/50 transition flex items-center gap-1"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowConfig(false)}
                  data-nav="cfg-close"
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 transition"
                >
                  Done ✕
                </button>
              </div>
            </div>

            {/* Server Templates */}
            <div className="space-y-3">
              {servers.map((server) => {
                return (
                  <div key={server.id} className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {server.name}
                      </span>

                      <button
                        onClick={() => {
                          setActiveServerId(server.id);
                          setPlayerMode("embed");
                        }}
                        data-nav={`cfg-server-${server.id}`}
                        className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition ${
                          activeServerId === server.id && playerMode === "embed"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {activeServerId === server.id && playerMode === "embed" ? "Active Server" : "Make Active"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Movie Template:</label>
                        <input
                          type="text"
                          value={server.movieTemplate ?? server.endpointTemplate ?? ""}
                          onChange={(e) => handleUpdateServer(server.id, { movieTemplate: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">TV Series Template:</label>
                        <input
                          type="text"
                          value={server.tvTemplate ?? ""}
                          onChange={(e) => handleUpdateServer(server.id, { tvTemplate: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Cinema Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 pb-24">
        {/* 2-Mode Segmented Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80">
            {/* Mode 1 Switcher */}
            <button
              onClick={() => handleSwitchMode("stream")}
              data-nav="mode-segmented-stream"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                effectiveMode === "stream"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-100"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>⚡</span>
              <span>Mode 1: Live Stream</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded text-[10px] bg-black/40 text-indigo-200">
                Instant
              </span>
            </button>

            {/* Mode 2 Switcher */}
            <button
              onClick={() => handleSwitchMode("ondemand")}
              data-nav="mode-segmented-ondemand"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                effectiveMode === "ondemand"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 scale-100"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>☁️</span>
              <span>Mode 2: Watch On Demand</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isOnDemandReady
                    ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40"
                    : "bg-black/40 text-teal-200"
                }`}
              >
                {isOnDemandReady ? "In Drive ✓" : "Google Drive"}
              </span>
            </button>
          </div>

          {/* Secondary helper info in Mode bar */}
          <div className="flex items-center gap-2 px-2 text-xs">
            {effectiveMode === "stream" ? (
              <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live endpoints streaming active
              </span>
            ) : isOnDemandReady ? (
              <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Synced in Google Drive Cloud (Buffer-Free)
              </span>
            ) : isOnDemandProcessing ? (
              <span className="text-amber-400 text-[11px] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Downloading to Google Drive ({onDemandItem?.progressPercent}%)
              </span>
            ) : (
              <button
                onClick={() => setIsOnDemandModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1"
              >
                + Download to Google Drive Now
              </button>
            )}
          </div>
        </div>

        {/* Mode 1: Provider Servers Bar */}
        {effectiveMode === "stream" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-xs font-semibold text-zinc-400 px-2 shrink-0">
                Server:
              </span>

              {servers.map((s) => {
                const isSelected = playerMode === "embed" && activeServerId === s.id;
                const hasUrl = Boolean(resolveServerTemplate(s, Boolean(isTvShow)));
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveServerId(s.id);
                      setPlayerMode("embed");
                    }}
                    data-nav={`server-${s.id}`}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 min-h-[36px] ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasUrl ? "bg-emerald-400" : "bg-zinc-600"
                      }`}
                    />
                    {s.name}
                  </button>
                );
              })}

              {activeDirectUrl && (
                <button
                  onClick={() => setPlayerMode("direct")}
                  data-nav="server-direct"
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 min-h-[36px] ${
                    playerMode === "direct"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Direct
                </button>
              )}
            </div>

            {/* Quick TV / Fullscreen Guide Indicator */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 font-mono">
                [M] Switch Mode
              </span>
              <span className="bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 font-mono">
                [F] Fullscreen
              </span>
              {isTvShow && (
                <span className="bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 font-mono">
                  [P] Prev / [N] Next Ep
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mode 2: Google Drive Cloud Information Bar */}
        {effectiveMode === "ondemand" && isOnDemandReady && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <span>☁️</span> Google Drive Stream
              </span>
              <span className="text-zinc-300 font-medium">
                {onDemandItem.quality || "1080p Full HD"} •{" "}
                {onDemandItem.fileSizeBytes
                  ? `${(onDemandItem.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                  : "Cloud Storage"}
              </span>
              <span className="hidden md:inline text-zinc-400">
                Folder: <code className="text-emerald-400 font-mono">{onDemandItem.folderPath || "FilmFlix On-Demand/"}</code>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Player view switcher: Native Video vs Google Drive Preview */}
              <button
                onClick={() => setDrivePlayerType(drivePlayerType === "html5" ? "iframe" : "html5")}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white transition text-xs font-semibold"
                title="Switch between Native HTML5 player and Google Drive web player"
              >
                {drivePlayerType === "html5" ? "Native HTML5 Video ✓" : "Drive Web Player ✓"}
              </button>

              {onDemandItem.driveViewUrl && (
                <a
                  href={onDemandItem.driveViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1"
                >
                  <span>Open in Drive</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Video Player Cinema Frame */}
        <div
          ref={playerContainerRef}
          className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80 group"
        >
          {effectiveMode === "ondemand" ? (
            /* ========================================================================= */
            /* MODE 2: WATCH ON DEMAND (GOOGLE DRIVE PLAYBACK)                           */
            /* ========================================================================= */
            isOnDemandReady ? (
              drivePlayerType === "html5" && onDemandItem?.driveStreamUrl ? (
                <video
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  src={onDemandItem.driveStreamUrl}
                  poster={movieMeta?.backdrop || movieMeta?.poster}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <iframe
                  src={
                    onDemandItem?.driveFileId
                      ? `https://drive.google.com/file/d/${onDemandItem.driveFileId}/preview`
                      : onDemandItem?.driveStreamUrl || ""
                  }
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media; fullscreen"
                />
              )
            ) : isOnDemandProcessing ? (
              /* Downloading / Uploading to Google Drive in progress */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20 animate-pulse">
                  <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Google Drive Transfer in Progress
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                  Downloading to Your Google Drive
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mb-6 max-w-md">
                  Saving <span className="text-white font-semibold">"{activeTitle}"</span> to your Google Drive for buffer-free playback.
                </p>

                {/* Progress Bar */}
                <div className="w-full max-w-md bg-zinc-900 rounded-full h-3 mb-3 p-0.5 border border-zinc-800">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(onDemandItem?.progressPercent || 15, 5)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between w-full max-w-md text-xs text-zinc-400 mb-6">
                  <span>{onDemandItem?.downloadSpeed || "Speed: 28.4 MB/s"}</span>
                  <span className="font-bold text-emerald-400">
                    {onDemandItem?.progressPercent || 15}%
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => handleSwitchMode("stream")}
                    data-nav="ondemand-switch-stream-while-waiting"
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition border border-zinc-700"
                  >
                    ⚡ Watch on Stream Server while waiting
                  </button>
                  <button
                    onClick={() => setIsOnDemandModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20"
                  >
                    View Download Details
                  </button>
                </div>
              </div>
            ) : (
              /* Title Not Yet in Google Drive -> Offer 1-Click Download */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-3">
                  ☁️ Mode 2: Watch On Demand
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                  Not in Google Drive Yet
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mb-6 max-w-lg leading-relaxed">
                  Request an on-demand download of <span className="text-white font-semibold">"{activeTitle}"</span> to your Google Drive to enjoy 100% buffer-free playback, highest bitrate, and zero popups.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setIsOnDemandModalOpen(true)}
                    data-nav="ondemand-start-download-btn"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm transition shadow-xl shadow-emerald-600/30 flex items-center gap-2"
                  >
                    <span>🚀</span>
                    <span>Download to Google Drive Now</span>
                  </button>

                  <button
                    onClick={() => handleSwitchMode("stream")}
                    data-nav="ondemand-switch-stream-btn"
                    className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm transition border border-zinc-800"
                  >
                    ⚡ Play via Stream Server (Mode 1)
                  </button>
                </div>
              </div>
            )
          ) : (
            /* ========================================================================= */
            /* MODE 1: LIVE STREAM ENDPOINTS (EMBED / DIRECT)                            */
            /* ========================================================================= */
            playerMode === "direct" && activeDirectUrl ? (
              <video
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                src={activeDirectUrl}
              >
                Your browser does not support the video tag.
              </video>
            ) : embedUrl ? (
              <iframe
                key={`${activeServerId}-${selectedSeason}-${selectedEpisode}-${embedUrl}-${blockPopups}`}
                src={embedUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                sandbox={
                  blockPopups
                    ? "allow-scripts allow-same-origin allow-forms allow-presentation"
                    : undefined
                }
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 border border-indigo-500/20">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Configure Endpoint for {activeServer.name}
                </h2>
                <p className="text-xs text-zinc-400 mb-4 max-w-md">
                  Configure your {isTvShow ? "TV Series template" : "Movie template"} to watch{" "}
                  <span className="text-white font-medium">"{activeTitle}"</span>.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfig(true)}
                    data-nav="player-cfg-btn"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20"
                  >
                    Configure Server Endpoints
                  </button>
                  <button
                    onClick={() => handleSwitchMode("ondemand")}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20"
                  >
                    Try Google Drive On-Demand ☁️
                  </button>
                </div>
              </div>
            )
          )}

          {/* Quick Floating Fullscreen Button in Cinema Frame */}
          <button
            onClick={toggleFullscreen}
            data-nav="frame-fullscreen"
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md opacity-80 hover:opacity-100 transition border border-white/10"
            title="Expand Fullscreen (F)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        {/* TV Series Episode & Season Controls (Touch Swipe & Remote Friendly) */}
        {isTvShow && (
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-3.5">
            {/* Season Selector & Prev/Next Episode Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Season:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {(movieMeta?.seasons && movieMeta.seasons.length > 0
                    ? movieMeta.seasons
                    : [1, 2, 3, 4, 5].map((num) => ({
                        season_number: num,
                        episode_count: 24,
                        name: `Season ${num}`,
                      }))
                  ).map((s) => {
                    const isSelected = selectedSeason === s.season_number;
                    return (
                      <button
                        key={s.season_number}
                        onClick={() => {
                          setSelectedSeason(s.season_number);
                          setSelectedEpisode(1);
                        }}
                        data-nav={`season-${s.season_number}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[36px] ${
                          isSelected
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Season {s.season_number}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prev / Next Episode Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEpisode((prev) => Math.max(prev - 1, 1))}
                  disabled={selectedEpisode <= 1}
                  data-nav="prev-ep-btn"
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition flex items-center gap-1.5 min-h-[36px]"
                  title="Previous Episode [P]"
                >
                  ◄ Prev Ep
                </button>
                <button
                  onClick={() => setSelectedEpisode((prev) => Math.min(prev + 1, episodeCount))}
                  disabled={selectedEpisode >= episodeCount}
                  data-nav="next-ep-btn"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 min-h-[36px]"
                  title="Next Episode [N]"
                >
                  Next Ep ►
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Episode Chips (Tap on Mobile, Arrow Keys on TV) */}
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Select Episode (Season {selectedSeason})
              </div>
              <div
                ref={episodeRowRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
              >
                {Array.from({ length: Math.min(episodeCount, 50) }, (_, i) => i + 1).map((ep) => {
                  const isSelected = selectedEpisode === ep;
                  return (
                    <button
                      key={ep}
                      onClick={() => setSelectedEpisode(ep)}
                      data-nav={`ep-chip-${ep}`}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 min-h-[40px] min-w-[50px] ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                          : "bg-zinc-800/90 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700/50"
                      }`}
                    >
                      Ep {ep}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Movie / Series Details Synopsis & Metadata */}
        {movieMeta && (
          <div className="space-y-4 pb-8 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide ${
                  isTvShow
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                }`}
              >
                {isTvShow ? "TV Series" : "Movie"}
              </span>

              {movieMeta.user_rating && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  ★ {movieMeta.user_rating.toFixed(1)} / 10
                </span>
              )}
              {movieMeta.year && (
                <span className="px-3 py-1 rounded-xl text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {movieMeta.year}
                </span>
              )}
              {movieMeta.runtime_minutes && (
                <span className="px-3 py-1 rounded-xl text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {movieMeta.runtime_minutes} mins
                </span>
              )}
              {movieMeta.number_of_seasons && (
                <span className="px-3 py-1 rounded-xl text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {movieMeta.number_of_seasons} Seasons
                </span>
              )}
              {activeImdbId && (
                <span className="px-3 py-1 rounded-xl text-xs font-mono bg-zinc-900 text-emerald-400 border border-zinc-800">
                  IMDb: {activeImdbId}
                </span>
              )}
              {activeTmdbId && (
                <span className="px-3 py-1 rounded-xl text-xs font-mono bg-zinc-900 text-indigo-400 border border-zinc-800">
                  TMDb: {activeTmdbId}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">Overview</h3>
              <p className="text-zinc-300 leading-relaxed text-xs sm:text-sm md:text-base">
                {movieMeta.plot_overview || "No synopsis available."}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer with Creator Attribution & Instagram Link */}
      <Footer />

      {/* On-Demand Download Modal */}
      <OnDemandDownloadModal
        item={watchMediaItem}
        isOpen={isOnDemandModalOpen}
        onClose={() => {
          setIsOnDemandModalOpen(false);
          refreshOnDemand();
        }}
        onDownloadStarted={() => {
          refreshOnDemand();
        }}
      />

      {/* Mode Switch Modal */}
      <ModeSwitchModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
      />
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <VideoPlayer />
    </Suspense>
  );
}
