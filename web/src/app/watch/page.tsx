"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { INITIAL_SERVERS, StreamServer, IdPreference, buildEmbedUrl, resolveServerTemplate } from "@/config/player";

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
  const searchParams = useSearchParams();
  const titleParam = searchParams.get("title") || "";
  const directVideoUrl = searchParams.get("url");
  const rawId = searchParams.get("id");
  const imdbIdParam = searchParams.get("imdb_id");
  const tmdbIdParam = searchParams.get("tmdb_id");
  const mediaTypeParam = (searchParams.get("type") as "movie" | "tv" | null) || undefined;
  const initialSeason = parseInt(searchParams.get("s") || searchParams.get("season") || "1", 10);
  const initialEpisode = parseInt(searchParams.get("e") || searchParams.get("episode") || "1", 10);

  const [movieMeta, setMovieMeta] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // TV Series Episode/Season state
  const [selectedSeason, setSelectedSeason] = useState<number>(initialSeason);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(initialEpisode);

  // Multi-server state
  const [servers, setServers] = useState<StreamServer[]>(INITIAL_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>("server-1");
  const [playerMode, setPlayerMode] = useState<"embed" | "direct">("embed");
  const [showConfig, setShowConfig] = useState(false);

  // Anti-Popup / Sandbox Shield state (defaults to true for maximum protection)
  const [blockPopups, setBlockPopups] = useState<boolean>(true);

  // Overlay Click-Shield state (protects against initial clickjacking/popups)
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Always use code/env defaults; purge any legacy localStorage saved servers
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

  // When switching movies, automatically reset servers to code-defined templates and re-arm click shield
  useEffect(() => {
    setServers(INITIAL_SERVERS);
    setIsOverlayActive(true);
  }, [rawId, imdbIdParam, tmdbIdParam, titleParam]);

  // Re-arm click shield whenever changing servers, season, or episode
  useEffect(() => {
    setIsOverlayActive(true);
  }, [activeServerId, selectedSeason, selectedEpisode]);

  const handleToggleShield = () => {
    const nextVal = !blockPopups;
    setBlockPopups(nextVal);
    localStorage.setItem("filmflix_block_popups", String(nextVal));
  };

  // Fetch movie or TV details
  useEffect(() => {
    const lookupId = rawId || imdbIdParam || tmdbIdParam || titleParam;
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
          const isTv = data.media_type === "tv" || mediaTypeParam === "tv" || (data.seasons && data.seasons.length > 0);
          const activeTemplate = activeServer ? resolveServerTemplate(activeServer, isTv) : "";
          if (directVideoUrl && !activeTemplate) {
            setPlayerMode("direct");
          }
        }
      })
      .catch((err) => console.error("Failed to load movie details:", err))
      .finally(() => setLoading(false));
  }, [rawId, imdbIdParam, tmdbIdParam, titleParam, mediaTypeParam]);

  const isTvShow = movieMeta?.media_type === "tv" || mediaTypeParam === "tv" || (movieMeta?.seasons && movieMeta.seasons.length > 0);
  const activeTitle = movieMeta?.title || titleParam || "Unknown Video";
  const activeImdbId = movieMeta?.imdb_id || imdbIdParam || (rawId?.startsWith("tt") ? rawId : null);
  const activeTmdbId = movieMeta?.tmdb_id || tmdbIdParam || (!rawId?.startsWith("tt") ? rawId : null);
  const activeDirectUrl = directVideoUrl || movieMeta?.extracted_links?.[0];

  // Episode count for selected season
  const currentSeasonData = useMemo(() => {
    if (!movieMeta?.seasons) return null;
    return movieMeta.seasons.find((s) => s.season_number === selectedSeason) || movieMeta.seasons[0];
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

  const handleUpdateServer = (id: string, updates: Partial<StreamServer>) => {
    const updated = servers.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setServers(updated);
    // Endpoints are not persisted to localStorage so code remains the permanent source of truth
  };

  const handleResetToDefaults = () => {
    try {
      localStorage.removeItem("filmflix_stream_servers");
    } catch {}
    setServers(INITIAL_SERVERS);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Catalog
          </Link>
          <span className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2 truncate max-w-md">
            <h1 className="font-bold text-base md:text-lg truncate text-white">
              {activeTitle}
            </h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isTvShow
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
            }`}>
              {isTvShow ? `Series S${selectedSeason}:E${selectedEpisode}` : "Movie"}
            </span>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          {/* Anti-Popup Shield Toggle Button */}
          <button
            onClick={handleToggleShield}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              blockPopups
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10"
                : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
            }`}
            title={blockPopups ? "Anti-Popup Shield: Active (Popups and redirects blocked)" : "Compatibility Mode (Popups allowed)"}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="hidden sm:inline">{blockPopups ? "Shield: ON" : "Shield: OFF"}</span>
          </button>

          {/* Re-arm Shield Button */}
          {!isOverlayActive && embedUrl && (
            <button
              onClick={() => setIsOverlayActive(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition"
              title="Cover player with protective click shield"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="hidden sm:inline">Cover Player</span>
            </button>
          )}

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 flex items-center gap-1.5 transition"
            title="Manage Provider Servers"
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Servers Config
          </button>
        </div>
      </header>

      {/* Multi-Server & Shield Configuration Drawer */}
      {showConfig && (
        <div className="bg-zinc-900/95 border-b border-zinc-800 p-5 md:px-8 transition-all animate-in slide-in-from-top">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  Movie & Series Endpoint Templates
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  The player automatically detects whether a title is a <strong>Movie</strong> or <strong>TV Series</strong> and picks the matching endpoint template.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetToDefaults}
                  className="text-xs text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-indigo-500/50 transition flex items-center gap-1"
                  title="Reset all endpoints to code defaults"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset to Code
                </button>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition"
                >
                  Done ✕
                </button>
              </div>
            </div>

            {/* Anti-Popup / Sandbox Shield Setting Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Built-in Anti-Popup & Redirect Shield
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    blockPopups
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {blockPopups ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 max-w-xl">
                  Applies HTML5 sandboxing to strictly block new tab popups and redirects. Turn OFF if a specific video server requires full popup permissions.
                </p>
              </div>

              <button
                onClick={handleToggleShield}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  blockPopups
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}
              >
                {blockPopups ? "Shield: Active" : "Enable Shield"}
              </button>
            </div>

            {/* Server Templates */}
            <div className="space-y-4">
              {servers.map((server) => {
                const currentTemplate = resolveServerTemplate(server, Boolean(isTvShow));
                const previewUrl = buildEmbedUrl(currentTemplate, {
                  id: rawId || activeImdbId || (activeTmdbId ? String(activeTmdbId) : null),
                  imdb_id: activeImdbId,
                  tmdb_id: activeTmdbId,
                  season: isTvShow ? selectedSeason : null,
                  episode: isTvShow ? selectedEpisode : null,
                  idPreference: server.idPreference || "auto",
                });

                return (
                  <div key={server.id} className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {server.name}
                        </span>

                        {/* ID Preference Selector for {id} */}
                        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[10px]">
                          <span className="text-zinc-500 px-1 font-medium">&#123;id&#125; Format:</span>
                          {(["auto", "imdb", "tmdb"] as IdPreference[]).map((pref) => {
                            const isSelected = (server.idPreference || "auto") === pref;
                            return (
                              <button
                                key={pref}
                                onClick={() => handleUpdateServer(server.id, { idPreference: pref })}
                                className={`px-2 py-0.5 rounded-lg font-bold uppercase transition ${
                                  isSelected ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                                }`}
                              >
                                {pref}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveServerId(server.id);
                          setPlayerMode("embed");
                        }}
                        className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition ${
                          activeServerId === server.id && playerMode === "embed"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {activeServerId === server.id && playerMode === "embed" ? "Active Server" : "Make Active"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Movie Template */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                          🎬 Movie URL Template:
                        </label>
                        <input
                          type="text"
                          placeholder="https://provider.com/embed/movie/{id}?autoPlay=true"
                          value={server.movieTemplate ?? server.endpointTemplate ?? ""}
                          onChange={(e) => handleUpdateServer(server.id, { movieTemplate: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      {/* TV Series Template */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                          📺 TV Series URL Template:
                        </label>
                        <input
                          type="text"
                          placeholder="https://provider.com/embed/tv/{id}/{season}/{episode}?autoPlay=true"
                          value={server.tvTemplate ?? ""}
                          onChange={(e) => handleUpdateServer(server.id, { tvTemplate: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Live Preview for Current Title */}
                    {previewUrl && (
                      <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5 pt-1 border-t border-zinc-900">
                        <span className="text-zinc-500 shrink-0 font-medium">
                          Active URL ({isTvShow ? "Series" : "Movie"}):
                        </span>
                        <code className="text-emerald-400 truncate font-mono">{previewUrl}</code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-zinc-500 border-t border-zinc-800">
              <span>Detected Media Type:</span>
              <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                isTvShow ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              }`}>
                {isTvShow ? "TV Series" : "Movie"}
              </span>

              {activeImdbId && (
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  IMDb: {activeImdbId}
                </span>
              )}
              {activeTmdbId && (
                <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  TMDb: {activeTmdbId}
                </span>
              )}
              {isTvShow && (
                <>
                  <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Season: {selectedSeason}
                  </span>
                  <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Episode: {selectedEpisode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Cinema Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {/* Modular Server & TV Season/Episode Switcher Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-400 px-2.5">
              Provider:
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-800"
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  playerMode === "direct"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Direct Stream
              </button>
            )}
          </div>

          {/* TV Series Episode & Season Pickers */}
          {isTvShow && (
            <div className="flex items-center gap-2 self-start md:self-auto bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
              <label className="text-[11px] text-zinc-400 px-2 font-medium">Season:</label>
              <select
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(parseInt(e.target.value, 10));
                  setSelectedEpisode(1);
                }}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {movieMeta?.seasons && movieMeta.seasons.length > 0 ? (
                  movieMeta.seasons.map((s) => (
                    <option key={s.season_number} value={s.season_number}>
                      Season {s.season_number} ({s.episode_count} eps)
                    </option>
                  ))
                ) : (
                  [1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={s}>
                      Season {s}
                    </option>
                  ))
                )}
              </select>

              <label className="text-[11px] text-zinc-400 px-2 font-medium">Episode:</label>
              <select
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(parseInt(e.target.value, 10))}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {Array.from({ length: Math.min(episodeCount, 50) }, (_, i) => i + 1).map((ep) => (
                  <option key={ep} value={ep}>
                    Episode {ep}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Video Player Cinema Frame */}
        <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80 group">
          {playerMode === "direct" && activeDirectUrl ? (
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
            <div className="relative w-full h-full">
              <iframe
                ref={iframeRef}
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

              {/* Protective Overlay Shield */}
              {isOverlayActive && (
                <div
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/90 backdrop-blur-md transition-all duration-300 animate-in fade-in"
                  style={{
                    backgroundImage: movieMeta?.backdrop
                      ? `linear-gradient(to top, rgba(9, 9, 11, 0.95), rgba(9, 9, 11, 0.75)), url(${movieMeta.backdrop})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="max-w-md space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      Anti-Clickjack Overlay Shield
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                        {activeTitle}
                      </h2>
                      {isTvShow && (
                        <p className="text-xs text-purple-300 font-medium mt-1">
                          Season {selectedSeason} • Episode {selectedEpisode}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                      Click below to arm and reveal the video player. This blocks rogue click-jacking overlays and background taps.
                    </p>

                    <button
                      onClick={() => {
                        setIsOverlayActive(false);
                        setTimeout(() => {
                          iframeRef.current?.focus();
                        }, 100);
                      }}
                      className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 mx-auto group hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <svg className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Start Watching</span>
                    </button>

                    <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-400 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {activeServer.name}
                      </span>
                      <span>•</span>
                      <span>{blockPopups ? "Sandbox: Active" : "Sandbox: Off"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                {isTvShow ? "Series" : "Movie"} Endpoint Not Set for {activeServer.name}
              </h2>
              <p className="text-xs text-zinc-400 mb-5 max-w-md">
                Configure your {isTvShow ? "TV Series template" : "Movie template"} for <strong className="text-zinc-200">{activeServer.name}</strong> to watch{" "}
                <span className="text-white font-medium">"{activeTitle}"</span>
                {isTvShow ? ` (Season ${selectedSeason}, Episode ${selectedEpisode})` : ""}.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {activeImdbId && (
                  <span className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                    &#123;imdb&#125;: <strong className="text-emerald-400">{activeImdbId}</strong>
                  </span>
                )}
                {activeTmdbId && (
                  <span className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                    &#123;tmdb&#125;: <strong className="text-indigo-400">{activeTmdbId}</strong>
                  </span>
                )}
                {isTvShow && (
                  <>
                    <span className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                      &#123;season&#125;: <strong className="text-amber-400">{selectedSeason}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                      &#123;episode&#125;: <strong className="text-amber-400">{selectedEpisode}</strong>
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20"
                >
                  Configure Server Endpoints
                </button>
                {activeDirectUrl && (
                  <button
                    onClick={() => setPlayerMode("direct")}
                    className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs transition"
                  >
                    Play Direct Archive File
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Movie / Series Details Synopsis & Metadata */}
        {movieMeta && (
          <div className="space-y-6 pb-12 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide ${
                isTvShow
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              }`}>
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
                <span className="px-3 py-1 rounded-xl text-xs font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                  IMDb: {activeImdbId}
                </span>
              )}
              {activeTmdbId && (
                <span className="px-3 py-1 rounded-xl text-xs font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                  TMDb: {activeTmdbId}
                </span>
              )}
              {movieMeta.genres?.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium bg-zinc-900/60 text-zinc-400 border border-zinc-800"
                >
                  {g}
                </span>
              ))}
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Overview</h3>
              <p className="text-zinc-300 leading-relaxed text-sm md:text-base">
                {movieMeta.plot_overview || "No synopsis available."}
              </p>
            </div>
          </div>
        )}
      </main>
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
