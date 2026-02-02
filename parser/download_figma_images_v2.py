#!/usr/bin/env python3
"""
Download images from Figma prototype using Playwright.
"""

import asyncio
import os
import re
import base64
from urllib.parse import urlparse

async def download_with_playwright():
    from playwright.async_api import async_playwright

    url = "https://www.figma.com/proto/SvtNcyCmFhLaPRwENhxixT/%E4%B8%AD%E5%9B%BD%E5%A4%A7%E5%AD%A6%E7%9F%A2%E9%87%8F%E6%A0%A1%E5%BE%BD%E5%90%88%E9%9B%86--Community-?node-id=100-634&p=f&t=kLqYzMOxra36vpNG-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A217"
    
    output_dir = os.path.join(os.path.dirname(__file__), 'downloaded_images')
    os.makedirs(output_dir, exist_ok=True)

    print("Starting headless browser...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        # Track all network requests for images
        image_urls = set()
        
        async def handle_request(request):
            resource_type = request.resource_type
            if resource_type in ['image', 'media']:
                image_urls.add(request.url)
        
        page.on('request', handle_request)
        
        print(f"Navigating to: {url}")
        try:
            await page.goto(url, wait_until='networkidle', timeout=60000)
            print("Page loaded, waiting for content to render...")
            await asyncio.sleep(5)  # Give extra time for dynamic content
            
            # Try to capture all images from the page
            print("Extracting image URLs from page...")
            
            # Get all img elements
            img_elements = await page.query_selector_all('img')
            for img in img_elements:
                src = await img.get_attribute('src')
                data_src = await img.get_attribute('data-src')
                if src:
                    image_urls.add(src)
                if data_src:
                    image_urls.add(data_src)
            
            # Get all images from canvas elements (Figma uses canvas)
            canvas_data = await page.evaluate('''
                () => {
                    const urls = [];
                    document.querySelectorAll('canvas').forEach(canvas => {
                        try {
                            const dataUrl = canvas.toDataURL();
                            if (dataUrl && dataUrl.startsWith('data:image')) {
                                urls.push(dataUrl);
                            }
                        } catch(e) {}
                    });
                    return urls;
                }
            ''')
            image_urls.update(canvas_data)
            
            # Also try to get image URLs from the page's network responses
            print(f"Found {len(image_urls)} image URLs")
            
        except Exception as e:
            print(f"Error loading page: {e}")
        
        await browser.close()
    
    # Download all found images
    print(f"\nDownloading {len(image_urls)} images...")
    downloaded = 0
    
    for index, img_url in enumerate(image_urls, 1):
        try:
            if img_url.startswith('data:'):
                # Handle data URLs
                ext_match = re.search(r'data:image/(\w+);', img_url)
                ext = '.png'
                if ext_match:
                    ext = '.' + ext_match.group(1)
                
                content = base64.b64decode(img_url.split(',')[1])
                filename = f'figma_image_{index:03d}{ext}'
                filepath = os.path.join(output_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(content)
                
                print(f"Downloaded: {filename}")
                downloaded += 1
            else:
                # Handle regular URLs using requests
                import requests
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                }
                response = requests.get(img_url, headers=headers, timeout=30)
                response.raise_for_status()
                
                content = response.content
                
                # Determine extension
                content_type = response.headers.get('Content-Type', '')
                ext = '.png'
                if 'jpeg' in content_type or 'jpg' in content_type:
                    ext = '.jpg'
                elif 'gif' in content_type:
                    ext = '.gif'
                elif 'webp' in content_type:
                    ext = '.webp'
                elif 'svg' in content_type:
                    ext = '.svg'
                
                filename = f'figma_image_{index:03d}{ext}'
                filepath = os.path.join(output_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(content)
                
                print(f"Downloaded: {filename}")
                downloaded += 1
                
        except Exception as e:
            print(f"Error downloading image {index}: {e}")
        
        await asyncio.sleep(0.2)  # Be respectful
    
    print(f"\nDownloaded {downloaded}/{len(image_urls)} images to {output_dir}")

def main():
    print("Checking for Playwright...")
    try:
        import playwright
        print("Playwright found. Starting download...")
        asyncio.run(download_with_playwright())
    except ImportError:
        print("Playwright not installed. Please run: pip3 install playwright && python3 -m playwright install chromium")

if __name__ == '__main__':
    main()