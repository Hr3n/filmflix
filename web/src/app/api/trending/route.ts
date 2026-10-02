import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const tmdbKey = process.env.TMDB_API_KEY;

  if (!tmdbKey) {
    // Return fallback catalog movies if no TMDB key is configured yet
    try {
      const catalogPath = path.join(process.cwd(), "public", "catalog.json");
      if (fs.existsSync(catalogPath)) {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
        return NextResponse.json({
          hasApiKey: false,
          trending: catalog.map((m: any) => ({ ...m, media_type: "movie" })),
          movies: catalog,
          tvShows: [],
        });
      }
    } catch (err) {
      console.error("Catalog fallback read error:", err);
    }
    return NextResponse.json({ hasApiKey: false, trending: [], movies: [], tvShows: [] });
  }

  try {
    const [trendingRes, moviesRes, tvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbKey}`, {
        next: { revalidate: 3600 },
      }),
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}`, {
        next: { revalidate: 3600 },
      }),
      fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${tmdbKey}`, {
        next: { revalidate: 3600 },
      }),
    ]);

    const formatItems = (items: any[], defaultType?: "movie" | "tv") =>
      (items || []).slice(0, 15).map((item) => {
        const type = item.media_type || defaultType || (item.title ? "movie" : "tv");
        const isMovie = type === "movie";
        const dateStr = isMovie ? item.release_date : item.first_air_date;

        return {
          tmdb_id: item.id,
          media_type: type,
          title: isMovie ? item.title : item.name,
          year: dateStr ? parseInt(dateStr.split("-")[0], 10) : undefined,
          plot_overview: item.overview,
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
          backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
          user_rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : undefined,
          extracted_links: [],
        };
      });

    const trendingData = trendingRes.ok ? await trendingRes.json() : { results: [] };
    const moviesData = moviesRes.ok ? await moviesRes.json() : { results: [] };
    const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

    return NextResponse.json({
      hasApiKey: true,
      trending: formatItems(trendingData.results),
      movies: formatItems(moviesData.results, "movie"),
      tvShows: formatItems(tvData.results, "tv"),
    });
  } catch (error: any) {
    return NextResponse.json(
      { hasApiKey: true, error: error.message || "Failed to fetch trending data" },
      { status: 500 }
    );
  }
}
