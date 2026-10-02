import requests
from bs4 import BeautifulSoup
import json
import re

import urllib.parse

def scrape_video_links(url):
    """
    A general-purpose web scraper that looks for video links on a given webpage.
    This demonstrates the core logic used by link aggregators.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    video_links = []

    # Method 1: Look for standard HTML5 <video> and <source> tags
    for video in soup.find_all('video'):
        src = video.get('src')
        if src:
            video_links.append(urllib.parse.urljoin(url, src))
        for source in video.find_all('source'):
            src = source.get('src')
            if src:
                video_links.append(urllib.parse.urljoin(url, src))

    # Method 2: Look for anchor <a> tags that link directly to video files
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.lower().split('?')[0].endswith(('.mp4', '.mkv', '.m3u8', '.avi')):
            video_links.append(urllib.parse.urljoin(url, href))

    # Method 3: Regex search for video URLs hidden in javascript or raw text
    text_urls = re.findall(r'(https?://[^\s\'"]+\.(?:mp4|m3u8|mkv))', response.text, re.IGNORECASE)
    video_links.extend(text_urls)

    def is_safe_url(url):
        """Validates that a URL is safe and points to a media file."""
        if not url:
            return False
        
        # Must use secure HTTP or HTTPs, block javascript:, data:, etc.
        if not url.startswith(('http://', 'https://')):
            return False
            
        # Optional: Ensure it has a valid media extension
        # If your sources hide the extension, you might need to relax this rule
        safe_extensions = ('.mp4', '.m3u8', '.mkv', '.webm', '.avi')
        if not any(url.lower().split('?')[0].endswith(ext) for ext in safe_extensions):
            return False
            
        return True

    # Deduplicate, sanitize, and filter the list
    safe_links = []
    for link in set(video_links):
        if is_safe_url(link):
            safe_links.append(link)
            
    return safe_links

if __name__ == "__main__":
    # Example usage: Testing the scraper on a legal public domain movie page
    target_url = "https://archive.org/details/night_of_the_living_dead_dvd"
    print(f"Scraping {target_url}...")
    
    links = scrape_video_links(target_url)
    
    title = "Night of the Living Dead"
    year = 1968
    
    catalog_entry = {
        "title": title,
        "year": year,
        "source_url": target_url,
        "extracted_links": links
    }
    
    import os
    from pathlib import Path
    
    # Try enriching with Watchmode API if available
    try:
        from enrich_catalog import enrich_movie, load_env
        base_dir = Path(__file__).resolve().parent.parent
        env_vars = load_env(base_dir / ".env")
        api_key = env_vars.get("WATCHMODE_API_KEY") or os.environ.get("WATCHMODE_API_KEY")
        if api_key:
            print(f"Enriching '{title}' via Watchmode API...")
            meta = enrich_movie(title, year=year, api_key=api_key)
            catalog_entry.update({k: v for k, v in meta.items() if v is not None})
    except ImportError:
        pass
    
    # Ensure the public directory exists
    catalog_path = Path(__file__).resolve().parent.parent / "web" / "public" / "catalog.json"
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Load existing catalog to avoid overwriting other movies
    catalog = []
    if catalog_path.exists():
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog = json.load(f)
        except Exception:
            catalog = []
            
    # Update existing or append new
    found = False
    for i, item in enumerate(catalog):
        if item.get("title", "").lower() == title.lower():
            if not catalog_entry.get("extracted_links") and item.get("extracted_links"):
                catalog_entry["extracted_links"] = item["extracted_links"]
            catalog[i].update(catalog_entry)
            found = True
            break
            
    if not found:
        catalog.append(catalog_entry)
        
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=4, ensure_ascii=False)
        
    print(f"Successfully updated '{title}' with {len(links)} links in {catalog_path}")
    for link in links:
        print(f" - {link}")
