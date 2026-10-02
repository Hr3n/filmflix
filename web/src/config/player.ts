/**
 * Multi-Server Custom Player & Embed Configuration
 * 
 * Supports Movies and TV Series with multiple fallback servers.
 * 
 * Available URL Tokens:
 *  - {id}      : Automatically replaced by the primary ID (IMDb tt... or TMDb ID)
 *  - {imdb}    : Specifically replaced by the IMDb ID (with tt prefix, e.g. tt0903747)
 *  - {tmdb}    : Specifically replaced by the TMDb numeric ID (e.g. 1396)
 *  - {season}  : Season number for TV series (defaults to 1)
 *  - {episode} : Episode number for TV series (defaults to 1)
 */

export interface StreamServer {
  id: string;
  name: string;
  endpointTemplate: string;
}

export const INITIAL_SERVERS: StreamServer[] = [
  {
    id: "server-1",
    name: "Server 1",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT || "",
  },
  {
    id: "server-2",
    name: "Server 2",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT_2 || "",
  },
  {
    id: "server-3",
    name: "Server 3",
    endpointTemplate: process.env.NEXT_PUBLIC_STREAM_ENDPOINT_3 || "",
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
  }
): string | null {
  if (!endpointTemplate || !endpointTemplate.trim()) return null;

  const primaryId =
    params.imdb_id ||
    (params.id?.startsWith("tt") ? params.id : null) ||
    params.tmdb_id ||
    params.id;

  if (!primaryId) return null;

  let url = endpointTemplate.trim();

  // Replace ID tokens
  url = url.replace(/\{id\}/g, encodeURIComponent(String(primaryId)));

  if (params.imdb_id) {
    url = url.replace(/\{imdb\}/g, encodeURIComponent(params.imdb_id));
  } else if (params.id?.startsWith("tt")) {
    url = url.replace(/\{imdb\}/g, encodeURIComponent(params.id));
  }

  if (params.tmdb_id) {
    url = url.replace(/\{tmdb\}/g, encodeURIComponent(String(params.tmdb_id)));
  }

  // Replace Season & Episode tokens (default to 1 if not specified)
  const seasonVal = params.season !== undefined && params.season !== null ? String(params.season) : "1";
  const episodeVal = params.episode !== undefined && params.episode !== null ? String(params.episode) : "1";

  url = url.replace(/\{season\}/g, encodeURIComponent(seasonVal));
  url = url.replace(/\{s\}/g, encodeURIComponent(seasonVal));
  url = url.replace(/\{episode\}/g, encodeURIComponent(episodeVal));
  url = url.replace(/\{e\}/g, encodeURIComponent(episodeVal));

  return url;
}
