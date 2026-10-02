/**
 * Multi-Server Custom Player & Embed Configuration
 * 
 * Supports distinct endpoint templates for Movies and TV Series with auto-detection.
 * 
 * Available URL Tokens:
 *  - {id}          : Automatically replaced by the primary ID (IMDb or TMDb based on server preference)
 *  - {imdb}        : Strictly replaced by IMDb ID (with 'tt' prefix, e.g. tt0903747)
 *  - {tmdb}        : Strictly replaced by TMDb numeric ID (e.g. 1396)
 *  - {season} / {s}: Season number for TV series (defaults to 1)
 *  - {episode} / {e}: Episode number for TV series (defaults to 1)
 * 
 * Example Templates:
 *  - Movie:  https://provider.com/embed/movie/{id}?autoPlay=true
 *  - Series: https://provider.com/embed/tv/{id}/{season}/{episode}?autoPlay=true
 */

export type IdPreference = "auto" | "imdb" | "tmdb";

export interface StreamServer {
  id: string;
  name: string;
  endpointTemplate: string; // General / fallback template
  movieTemplate?: string;   // Dedicated Movie template
  tvTemplate?: string;      // Dedicated TV Series template
  idPreference?: IdPreference;
}

export const INITIAL_SERVERS: StreamServer[] = [
  {
    id: "server-1",
    name: "Server 1",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT || "https://111movies.net/movie/{id}",
    movieTemplate:
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_MOVIE ||
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT ||
      "https://111movies.net/movie/{id}",
    tvTemplate:
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_TV ||
      "https://111movies.net/tv/{id}/{season}/{episode}",
    idPreference: "auto",
  },
  {
    id: "server-2",
    name: "Server 2",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT_2 || "https://www.2embed.cc/embed/{id}",
    movieTemplate:
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_2_MOVIE ||
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_2 ||
      "https://www.2embed.cc/embed/{id}",
    tvTemplate:
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_2_TV ||
      "https://www.2embed.cc/embedtv/{season}&s=1&e={episode}",
    idPreference: "auto",
  },
  {
    id: "server-3",
    name: "Server 3",
    endpointTemplate:
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_3 ||
      "https://vidfast.vc/movie/{id}?autoPlay=true",
    movieTemplate:
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_3_MOVIE ||
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_3 ||
      "https://vidfast.vc/movie/{id}?autoPlay=true",
    tvTemplate:
      process.env.NEXT_PUBLIC_STREAM_ENDPOINT_3_TV ||
      "https://vidfast.vc/tv/{id}/{season}/{episode}?autoPlay=true",
    idPreference: "auto",
  },
];

/**
 * Resolves the appropriate template based on whether the content is a TV Series or a Movie.
 */
export function resolveServerTemplate(server: StreamServer, isTv: boolean): string {
  if (isTv) {
    return server.tvTemplate?.trim() || server.endpointTemplate?.trim() || "";
  }
  return server.movieTemplate?.trim() || server.endpointTemplate?.trim() || "";
}

export function buildEmbedUrl(
  endpointTemplate: string,
  params: {
    id?: string | null;
    imdb_id?: string | null;
    tmdb_id?: string | number | null;
    season?: number | string | null;
    episode?: number | string | null;
    idPreference?: IdPreference;
  }
): string | null {
  if (!endpointTemplate || !endpointTemplate.trim()) return null;

  const pref = params.idPreference || "auto";

  // Resolve primary ID based on preference
  let primaryId: string | number | null = null;

  if (pref === "imdb") {
    primaryId = params.imdb_id || (params.id?.startsWith("tt") ? params.id : null) || params.tmdb_id || params.id || null;
  } else if (pref === "tmdb") {
    primaryId = params.tmdb_id || (!params.id?.startsWith("tt") ? params.id : null) || params.imdb_id || null;
  } else {
    // Auto: Prefer IMDb (with tt prefix), otherwise TMDb ID
    primaryId =
      params.imdb_id ||
      (params.id?.startsWith("tt") ? params.id : null) ||
      params.tmdb_id ||
      params.id ||
      null;
  }

  if (!primaryId) return null;

  let url = endpointTemplate.trim();
  if (url && !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("//")) {
    url = `https://${url}`;
  }

  // Replace {id} token (case-insensitive)
  url = url.replace(/\{id\}/gi, encodeURIComponent(String(primaryId)));

  // Replace {imdb} / {imdb_id} token specifically
  const imdbVal = params.imdb_id || (params.id?.startsWith("tt") ? params.id : null);
  if (imdbVal) {
    url = url.replace(/\{imdb(_id)?\}/gi, encodeURIComponent(imdbVal));
  }

  // Replace {tmdb} / {tmdb_id} token specifically
  const tmdbVal = params.tmdb_id || (!params.id?.startsWith("tt") ? params.id : null);
  if (tmdbVal) {
    url = url.replace(/\{tmdb(_id)?\}/gi, encodeURIComponent(String(tmdbVal)));
  }

  // Replace Season & Episode tokens (default to 1 if not specified)
  const seasonVal = params.season !== undefined && params.season !== null ? String(params.season) : "1";
  const episodeVal = params.episode !== undefined && params.episode !== null ? String(params.episode) : "1";

  url = url.replace(/\{season\}/gi, encodeURIComponent(seasonVal));
  url = url.replace(/\{s\}/gi, encodeURIComponent(seasonVal));
  url = url.replace(/\{episode\}/gi, encodeURIComponent(episodeVal));
  url = url.replace(/\{e\}/gi, encodeURIComponent(episodeVal));

  return url;
}
