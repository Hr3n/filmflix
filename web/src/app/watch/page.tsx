"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState, useMemo } from "react";
import { INITIAL_SERVERS, StreamServer, buildEmbedUrl } from "@/config/player";

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

  // Load servers from localStorage if saved
  useEffect(() => {
    const saved = localStorage.getItem("filmflix_stream_servers");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServers(parsed);
          setActiveServerId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse saved servers", e);
      }
    }
  }, []);

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
        const catalogRes = await fetch("/catalog.json");
        const catalog = await catalogRes.json();
        const found = catalog.find(
          (m: any) =>
            m.imdb_id === lookupId ||
            String(m.tmdb_id) === String(lookupId) ||
            m.title.toLowerCase() === titleParam.toLowerCase()
        );
        return found || null;
      })
      .then((data) => {
        if (data) {
          setMovieMeta(data);
          const activeServer = servers.find((s) => s.id === activeServerId);
          if (data.extracted_links?.[0] && (!activeServer || !activeServer.endpointTemplate)) {
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
  const embedUrl = activeServer
    ? buildEmbedUrl(activeServer.endpointTemplate, {
        id: rawId || activeImdbId || (activeTmdbId ? String(activeTmdbId) : null),
        imdb_id: activeImdbId,
        tmdb_id: activeTmdbId,
        season: isTvShow ? selectedSeason : null,
        episode: isTvShow ? selectedEpisode : null,
      })
    : null;

  const handleUpdateServer = (id: string, newTemplate: string) => {
    const updated = servers.map((s) =>
      s.id === id ? { ...s, endpointTemplate: newTemplate } : s
    );
    setServers(updated);
    localStorage.setItem("filmflix_stream_servers", JSON.stringify(updated));
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
            {isTvShow && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                S{selectedSeason}:E{selectedEpisode}
              </span>
            )}
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
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

      {/* Multi-Server Configuration Drawer */}
      {showConfig && (
        <div className="bg-zinc-900/95 border-b border-zinc-800 p-5 md:px-8 transition-all animate-in slide-in-from-top">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  Multi-Provider Server Templates
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Supported tokens: <code className="text-indigo-400">&#123;id&#125;</code>, <code className="text-indigo-400">&#123;imdb&#125;</code>, <code className="text-indigo-400">&#123;tmdb&#125;</code>, <code className="text-indigo-400">&#123;season&#125;</code>, <code className="text-indigo-400">&#123;episode&#125;</code>.
                </p>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800"
              >
                Done ✕
              </button>
            </div>

            <div className="space-y-3">
              {servers.map((server, idx) => (
                <div key={server.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="w-20 text-xs font-semibold text-zinc-300 shrink-0">
                    {server.name}:
                  </span>
                  <input
                    type="text"
                    placeholder={`https://provider-${idx + 1}.example.com/embed/{id}${isTvShow ? '/{season}/{episode}' : ''}`}
                    value={server.endpointTemplate}
                    onChange={(e) => handleUpdateServer(server.id, e.target.value)}
                    className="flex-1 w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                  {server.endpointTemplate && (
                    <button
                      onClick={() => {
                        setActiveServerId(server.id);
                        setPlayerMode("embed");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition"
                    >
                      Make Active
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-zinc-500 border-t border-zinc-800">
              <span>Active Tokens:</span>
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
              const hasUrl = Boolean(s.endpointTemplate?.trim());
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
            <iframe
              key={`${activeServerId}-${selectedSeason}-${selectedEpisode}-${embedUrl}`}
              src={embedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                {activeServer.name} Endpoint Not Set
              </h2>
              <p className="text-xs text-zinc-400 mb-5 max-w-md">
                Configure your endpoint template for <strong className="text-zinc-200">{activeServer.name}</strong> to watch{" "}
                <span className="text-white font-medium">"{activeTitle}"</span>
                {isTvShow ? ` (Season ${selectedSeason}, Episode ${selectedEpisode})` : ""}.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {activeImdbId && (
                  <span className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                    &#123;id&#125; / &#123;imdb&#125;: <strong className="text-emerald-400">{activeImdbId}</strong>
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
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
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
