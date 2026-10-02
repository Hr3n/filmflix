import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Curated list of verified public domain films with legitimate archive.org direct streams
DEFAULT_PUBLIC_DOMAIN_MOVIES = [
    {
        "title": "Night of the Living Dead",
        "year": 1968,
        "genre": "Horror",
        "source_url": "https://archive.org/details/night_of_the_living_dead",
        "extracted_links": [
            "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4"
        ]
    },
    {
        "title": "His Girl Friday",
        "year": 1940,
        "genre": "Comedy",
        "source_url": "https://archive.org/details/his_girl_friday",
        "extracted_links": [
            "https://archive.org/download/his_girl_friday/his_girl_friday_512kb.mp4"
        ]
    },
    {
        "title": "Plan 9 from Outer Space",
        "year": 1959,
        "genre": "Sci-Fi",
        "source_url": "https://archive.org/details/Plan_9_from_Outer_Space_1959",
        "extracted_links": [
            "https://archive.org/download/Plan_9_from_Outer_Space_1959/Plan_9_from_Outer_Space_1959_512kb.mp4"
        ]
    },
    {
        "title": "House on Haunted Hill",
        "year": 1959,
        "genre": "Horror",
        "source_url": "https://archive.org/details/house_on_haunted_hill_720p",
        "extracted_links": [
            "https://archive.org/download/house_on_haunted_hill_720p/house_on_haunted_hill_720p.mp4"
        ]
    },
    {
        "title": "Charade",
        "year": 1963,
        "genre": "Mystery",
        "source_url": "https://archive.org/details/charade1963",
        "extracted_links": [
            "https://ia800204.us.archive.org/11/items/charade1963/charade1963_512kb.mp4"
        ]
    },
    {
        "title": "Carnival of Souls",
        "year": 1962,
        "genre": "Horror",
        "source_url": "https://archive.org/details/CarnivalOfSouls",
        "extracted_links": [
            "https://ia800302.us.archive.org/1/items/CarnivalOfSouls/CarnivalOfSouls_512kb.mp4"
        ]
    },
    {
        "title": "Metropolis",
        "year": 1927,
        "genre": "Sci-Fi",
        "source_url": "https://archive.org/details/Metropolis_1927",
        "extracted_links": [
            "https://ia800301.us.archive.org/8/items/Metropolis_1927/Metropolis_1927_512kb.mp4"
        ]
    },
    {
        "title": "The General",
        "year": 1926,
        "genre": "Comedy",
        "source_url": "https://archive.org/details/TheGeneral_201602",
        "extracted_links": [
            "https://ia800301.us.archive.org/16/items/TheGeneral_201602/The%20General.mp4"
        ]
    },
    {
        "title": "The Phantom of the Opera",
        "year": 1925,
        "genre": "Horror",
        "source_url": "https://archive.org/details/ThePhantomoftheOpera1925",
        "extracted_links": [
            "https://ia800302.us.archive.org/21/items/ThePhantomoftheOpera1925/ThePhantomoftheOpera1925_512kb.mp4"
        ]
    },
    {
        "title": "Nosferatu",
        "year": 1922,
        "genre": "Horror",
        "source_url": "https://archive.org/details/nosferatu_202004",
        "extracted_links": [
            "https://ia801406.us.archive.org/30/items/nosferatu_202004/nosferatu.mp4"
        ]
    }
]

def load_env(env_path):
    """Simple .env loader without external dependencies."""
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip().strip("\"'")
    return env_vars

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FilmFlix-Catalog/1.0"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))

def enrich_movie(title, year=None, api_key=None):
    """Fetches metadata and streaming sources from Watchmode API."""
    if not api_key:
        print("No Watchmode API key provided. Skipping enrichment.")
        return {}

    query = urllib.parse.quote(title)
    search_url = f"https://api.watchmode.com/v1/search/?apiKey={api_key}&search_field=name&search_value={query}"

    try:
        search_data = fetch_json(search_url)
    except Exception as e:
        print(f"Error searching for '{title}': {e}")
        return {}

    title_results = [r for r in search_data.get("title_results", []) if r.get("type") == "movie"]
    if not title_results:
        print(f"No movie results found for '{title}'")
        return {}

    # Find the best match, matching year if specified
    best_match = title_results[0]
    if year:
        for res in title_results:
            if res.get("year") == year or (res.get("year") and abs(res.get("year") - year) <= 2):
                best_match = res
                break

    watchmode_id = best_match.get("id")
    print(f"Found Watchmode ID {watchmode_id} for '{title}' ({best_match.get('year')})")

    # Fetch full details including streaming sources
    details_url = f"https://api.watchmode.com/v1/title/{watchmode_id}/details/?apiKey={api_key}&append_to_response=sources"
    try:
        details = fetch_json(details_url)
    except Exception as e:
        print(f"Error fetching details for ID {watchmode_id}: {e}")
        return {}

    # Filter and deduplicate legal streaming sources
    sources = []
    raw_sources = details.get("sources", [])
    seen = set()
    for s in raw_sources:
        name = s.get("name")
        stype = s.get("type")
        region = s.get("region")
        web_url = s.get("web_url")
        key = (name, stype, region)
        if key not in seen and web_url and web_url.startswith("http"):
            seen.add(key)
            sources.append({
                "name": name,
                "type": stype, # 'sub', 'free', 'rent', 'buy'
                "region": region,
                "web_url": web_url,
                "format": s.get("format"),
                "price": s.get("price")
            })

    return {
        "watchmode_id": watchmode_id,
        "imdb_id": details.get("imdb_id"),
        "tmdb_id": details.get("tmdb_id"),
        "title": details.get("title", title),
        "year": details.get("year", year),
        "plot_overview": details.get("plot_overview"),
        "poster": details.get("poster"),
        "backdrop": details.get("backdrop"),
        "genres": details.get("genre_names", []),
        "genre": details.get("genre_names", [None])[0] if details.get("genre_names") else None,
        "user_rating": details.get("user_rating"),
        "runtime_minutes": details.get("runtime_minutes"),
        "sources": sources
    }

def main():
    base_dir = Path(__file__).resolve().parent.parent
    env_file = base_dir / ".env"
    env_vars = load_env(env_file)
    api_key = env_vars.get("WATCHMODE_API_KEY") or os.environ.get("WATCHMODE_API_KEY")

    if not api_key:
        print(f"Warning: WATCHMODE_API_KEY not found in {env_file}")

    catalog_path = base_dir / "web" / "public" / "catalog.json"
    
    # Start with existing catalog or curated defaults
    existing_items = {}
    if catalog_path.exists():
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    existing_items[item.get("title")] = item
        except Exception as e:
            print(f"Error reading existing catalog: {e}")

    # Combine curated list with any extra existing movies
    items_to_process = []
    for default_item in DEFAULT_PUBLIC_DOMAIN_MOVIES:
        title = default_item["title"]
        if title in existing_items:
            # Merge existing data with default item
            merged = dict(default_item)
            merged.update(existing_items[title])
            items_to_process.append(merged)
        else:
            items_to_process.append(default_item)

    for title, item in existing_items.items():
        if not any(d["title"] == title for d in items_to_process):
            items_to_process.append(item)

    print(f"Enriching {len(items_to_process)} catalog titles with Watchmode API...")
    enriched_catalog = []

    for item in items_to_process:
        title = item.get("title")
        year = item.get("year")
        print(f"\nProcessing '{title}' ({year})...")
        meta = enrich_movie(title, year, api_key)
        
        # Merge: Keep existing direct play links and source_url
        merged = dict(item)
        if meta:
            for k, v in meta.items():
                if v is not None:
                    merged[k] = v
        
        enriched_catalog.append(merged)

    # Save back enriched catalog
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(enriched_catalog, f, indent=4, ensure_ascii=False)

    print(f"\nSuccessfully saved {len(enriched_catalog)} enriched movies to {catalog_path}")

if __name__ == "__main__":
    main()
