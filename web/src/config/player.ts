/**
 * Multi-Server Custom Player & Embed Configuration
 * 
 * Supports Movies and TV Series with customizable endpoint templates.
 * 
 * Available URL Tokens:
 *  - {id}          : Automatically replaced by the movie identifier (IMDb or TMDb based on server preference)
 *  - {imdb}        : Strictly replaced by IMDb ID (with 'tt' prefix, e.g. tt6920084)
 *  - {tmdb}        : Strictly replaced by TMDb numeric ID (e.g. 460458)
 *  - {season} / {s}: Season number for TV series (defaults to 1)
 *  - {episode} / {e}: Episode number for TV series (defaults to 1)
 * 
 * Example Templates:
 *  - https://provider.com/embed/{id}?autoPlay=true
 *  - https://provider.com/embed/movie/{id}
 *  - https://provider.com/embed/tv/{id}/{season}/{episode}
 */

export type IdPreference = "auto" | "imdb" | "tmdb";

export interface StreamServer {
  id: string;
  name: string;
  endpointTemplate: string;
  idPreference?: IdPreference; // Which ID format {id} resolves to
}

export const INITIAL_SERVERS: StreamServer[] = [
  {
    id: "server-1",
    name: "Server 1",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT || "",
    idPreference: "auto",
  },
  {
    id: "server-2",
    name: "Server 2",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT_2 || "",
    idPreference: "auto",
  },
  {
    id: "server-3",
    name: "Server 3",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT_3 || "",
    idPreference: "auto",
  },
];

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
