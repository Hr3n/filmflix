import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const typeHint = searchParams.get("type"); // 'movie' | 'tv'

  if (!id) {
    return NextResponse.json({ error: "Missing title ID" }, { status: 400 });
  }

  // 1. Check local catalog first
  try {
    const catalogPath = path.join(process.cwd(), "public", "catalog.json");
    if (fs.existsSync(catalogPath)) {
      const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      const found = catalogData.find(
        (m: any) =>
          m.imdb_id === id ||
          String(m.tmdb_id) === String(id) ||
          m.title.toLowerCase() === id.toLowerCase()
      );

      if (found) {
        return NextResponse.json({
          ...found,
          media_type: "movie",
        });
      }
    }
  } catch (err) {
    console.error("Error reading local catalog in details route:", err);
  }

  // 2. Query TMDb if API key is provided
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) {
    return NextResponse.json(
      { error: "TMDb API key is not configured. Add TMDB_API_KEY to your .env.local file to enable all movies and series." },
      { status: 404 }
    );
  }

  try {
    let resolvedTmdbId = id;
    let resolvedType: "movie" | "tv" = typeHint === "tv" ? "tv" : "movie";
    let imdbId = id.startsWith("tt") ? id : null;

    // If ID starts with "tt", find TMDb ID and media type via /find
    if (id.startsWith("tt")) {
      const findRes = await fetch(
        `https://api.themoviedb.org/3/find/${encodeURIComponent(id)}?external_source=imdb_id&api_key=${tmdbKey}`,
        { next: { revalidate: 86400 } }
      );

      if (!findRes.ok) {
        return NextResponse.json({ error: "Failed to resolve IMDb ID on TMDb" }, { status: findRes.status });
      }

      const findData = await findRes.json();
      const movie = findData.movie_results?.[0];
      const tvShow = findData.tv_results?.[0];

      if (movie) {
        resolvedTmdbId = movie.id.toString();
        resolvedType = "movie";
      } else if (tvShow) {
        resolvedTmdbId = tvShow.id.toString();
        resolvedType = "tv";
      } else {
        return NextResponse.json({ error: "No title found matching this IMDb ID" }, { status: 404 });
      }
    }

    // Fetch details according to resolved type
    if (resolvedType === "tv") {
      const tvRes = await fetch(
        `https://api.themoviedb.org/3/tv/${resolvedTmdbId}?api_key=${tmdbKey}&append_to_response=external_ids,videos`,
        { next: { revalidate: 86400 } }
      );

      if (!tvRes.ok) {
        return NextResponse.json({ error: "Failed to fetch TV details from TMDb" }, { status: tvRes.status });
      }

      const d = await tvRes.json();
      const finalImdbId = d.external_ids?.imdb_id || imdbId || null;

      // Filter seasons to standard numbered seasons
      const seasons = (d.seasons || [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({
          season_number: s.season_number,
          episode_count: s.episode_count,
          name: s.name,
          air_date: s.air_date,
        }));

      return NextResponse.json({
        title: d.name,
        media_type: "tv",
        year: d.first_air_date ? parseInt(d.first_air_date.split("-")[0], 10) : undefined,
        imdb_id: finalImdbId,
        tmdb_id: d.id,
        plot_overview: d.overview,
        poster: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : undefined,
        backdrop: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : undefined,
        genres: d.genres?.map((g: any) => g.name) || [],
        user_rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : undefined,
        number_of_seasons: d.number_of_seasons || seasons.length,
        number_of_episodes: d.number_of_episodes,
        seasons: seasons,
        extracted_links: [],
      });
    } else {
      // Movie details
      const detailsRes = await fetch(
        `https://api.themoviedb.org/3/movie/${resolvedTmdbId}?api_key=${tmdbKey}&append_to_response=external_ids,videos`,
        { next: { revalidate: 86400 } }
      );

      if (!detailsRes.ok) {
        return NextResponse.json({ error: "Failed to fetch movie details from TMDb" }, { status: detailsRes.status });
      }

      const d = await detailsRes.json();
      const finalImdbId = d.external_ids?.imdb_id || imdbId || null;

      return NextResponse.json({
        title: d.title,
        media_type: "movie",
        year: d.release_date ? parseInt(d.release_date.split("-")[0], 10) : undefined,
        imdb_id: finalImdbId,
        tmdb_id: d.id,
        plot_overview: d.overview,
        poster: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : undefined,
        backdrop: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : undefined,
        genres: d.genres?.map((g: any) => g.name) || [],
        user_rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : undefined,
        runtime_minutes: d.runtime || undefined,
        extracted_links: [],
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
