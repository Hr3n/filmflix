import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const trimmed = query.trim().toLowerCase();
  const results: any[] = [];
  const seenIds = new Set<string>();

  // 1. Search local catalog first
  try {
    const catalogPath = path.join(process.cwd(), "public", "catalog.json");
    if (fs.existsSync(catalogPath)) {
      const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      for (const m of catalogData) {
        const titleMatch = m.title && m.title.toLowerCase().includes(trimmed);
        const genreMatch =
          m.genre?.toLowerCase().includes(trimmed) ||
          m.genres?.some((g: string) => g.toLowerCase().includes(trimmed));
        const imdbMatch = m.imdb_id && m.imdb_id.toLowerCase() === trimmed;

        if (titleMatch || genreMatch || imdbMatch) {
          const idKey = m.imdb_id || m.title;
          if (!seenIds.has(idKey)) {
            seenIds.add(idKey);
            results.push({
              ...m,
              media_type: "movie",
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Local catalog search error:", err);
  }

  // 2. Search TMDb across both Movies and TV Series via /search/multi
  const tmdbKey = process.env.TMDB_API_KEY;
  if (tmdbKey) {
    try {
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query.trim())}&api_key=${tmdbKey}&include_adult=false`,
        { next: { revalidate: 1800 } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const rawResults = (searchData.results || [])
          .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
          .slice(0, 16);

        for (const item of rawResults) {
          const isMovie = item.media_type === "movie";
          const idKey = `tmdb-${item.media_type}-${item.id}`;

          if (!seenIds.has(idKey)) {
            seenIds.add(idKey);
            const title = isMovie ? item.title : item.name;
            const dateStr = isMovie ? item.release_date : item.first_air_date;

            results.push({
              tmdb_id: item.id,
              media_type: item.media_type,
              title: title,
              year: dateStr ? parseInt(dateStr.split("-")[0], 10) : undefined,
              plot_overview: item.overview,
              poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
              backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
              user_rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : undefined,
              extracted_links: [],
            });
          }
        }
      }
    } catch (e) {
      console.error("TMDb multi-search error:", e);
    }
  }

  return NextResponse.json({ results, hasApiKey: Boolean(tmdbKey) });
}
