#!/usr/bin/env python3
"""
Download images from Figma prototype page.
Note: Figma pages require JavaScript to render, so this script may have limitations.
"""

import requests
import json
import re
import os
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import time

def extract_urls_from_page(url):
    """Extract all URLs from the page content."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching page: {e}")
        return None

def find_image_urls(html_content, base_url):
    """Find image URLs in HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    image_urls = set()
    
    # Look for img tags
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src')
        if src:
            image_urls.add(src)
    
    # Look for background images in style attributes
    for tag in soup.find_all(style=True):
        style = tag.get('style', '')
        # Match url() patterns in CSS
        matches = re.findall(r'url(["\']?([^"\'\\)]+)["\']?)', style)
        image_urls.update(matches)
    
    # Look for data-image URLs or similar patterns
    for tag in soup.find_all(['div', 'img', 'svg', 'canvas']):
        for attr in ['data-image', 'data-url', 'data-src', 'data-background']:
            value = tag.get(attr)
            if value:
                image_urls.add(value)
    
    # Convert relative URLs to absolute
    absolute_urls = set()
    for url in image_urls:
        if url.startswith('http'):
            absolute_urls.add(url)
        elif url.startswith('//'):
            absolute_urls.add('https:' + url)
        elif url.startswith('/'):
            absolute_urls.add(urljoin(base_url, url))
    
    return list(absolute_urls)

def download_image(url, output_dir, index):
    """Download a single image."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Determine file extension
        content_type = response.headers.get('content-type', '')
        ext = '.jpg'  # default
        if 'png' in content_type:
            ext = '.png'
        elif 'gif' in content_type:
            ext = '.gif'
        elif 'svg' in content_type:
            ext = '.svg'
        elif 'webp' in content_type:
            ext = '.webp'
        
        # Get filename from URL or use index
        parsed = urlparse(url)
        filename = os.path.basename(parsed.path)
        if not filename or '.' not in filename:
            filename = f'image_{index:03d}{ext}'
        
        filepath = os.path.join(output_dir, filename)
        
        # Handle duplicate filenames
        counter = 1
        while os.path.exists(filepath):
            name, ext = os.path.splitext(filename)
            filepath = os.path.join(output_dir, f'{name}_{counter}{ext}')
            counter += 1
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"Downloaded: {filename}")
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

def main():
    url = "https://www.figma.com/proto/SvtNcyCmFhLaPRwENhxixT/%E4%B8%AD%E5%9B%BD%E5%A4%A7%E5%AD%A6%E7%9F%A2%E9%87%8F%E6%A0%A1%E5%BE%BD%E5%90%88%E9%9B%86--Community-?node-id=100-634&p=f&t=kLqYzMOxra36vpNG-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A217"
    
    output_dir = os.path.join(os.path.dirname(__file__), 'downloaded_images')
    os.makedirs(output_dir, exist_ok=True)
    
    print("Fetching Figma page...")
    html_content = extract_urls_from_page(url)
    
    if not html_content:
        print("Failed to fetch page content")
        return
    
    print("Searching for image URLs...")
    image_urls = find_image_urls(html_content, url)
    
    print(f"Found {len(image_urls)} potential image URLs")
    
    if not image_urls:
        print("\nNote: Figma prototypes use JavaScript to render content.")
        print("Direct scraping may not work. Alternative methods:")
        print("1. Use Figma's export feature in the Figma app")
        print("2. Use browser developer tools to manually download images")
        print("3. Use a headless browser like Playwright (requires installation)")
        return
    
    print("\nDownloading images one by one...")
    downloaded = 0
    for index, img_url in enumerate(image_urls, 1):
        if download_image(img_url, output_dir, index):
            downloaded += 1
        time.sleep(0.5)  # Be respectful with requests
    
    print(f"\nDownloaded {downloaded}/{len(image_urls)} images to {output_dir}")

if __name__ == '__main__':
    main()