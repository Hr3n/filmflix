import requests
from bs4 import BeautifulSoup
import json
import re

def scrape_video_links(url):
    """
    A general-purpose web scraper that looks for video links on a given webpage.
    This demonstrates the core logic used by link aggregators.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
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
            video_links.append(src)
        for source in video.find_all('source'):
            src = source.get('src')
            if src:
                video_links.append(src)

    # Method 2: Look for anchor <a> tags that link directly to video files
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.lower().endswith(('.mp4', '.mkv', '.m3u8', '.avi')):
            video_links.append(href)

    # Method 3: Regex search for video URLs hidden in javascript or raw text
    # (Many file hosts embed their links inside script tags)
    text_urls = re.findall(r'(https?://[^\s\'"]+\.(?:mp4|m3u8|mkv))', response.text, re.IGNORECASE)
    video_links.extend(text_urls)

    # Deduplicate the list
    return list(set(video_links))

if __name__ == "__main__":
    # Example usage: Testing the scraper on a legal public domain movie page
    target_url = "https://archive.org/details/night_of_the_living_dead"
    print(f"Scraping {target_url}...")
    
    links = scrape_video_links(target_url)
    
    # Save the aggregated results to our catalog
    catalog_entry = {
        "title": "Night of the Living Dead",
        "source_url": target_url,
        "extracted_links": links
    }
    
    import os
    
    # Ensure the public directory exists
    os.makedirs("../web/public", exist_ok=True)
    
    with open("../web/public/catalog.json", "w") as f:
        json.dump([catalog_entry], f, indent=4)
        
    print(f"Found {len(links)} links and saved to web/public/catalog.json")
    for link in links:
        print(f" - {link}")
