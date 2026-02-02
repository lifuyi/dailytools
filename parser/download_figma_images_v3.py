#!/usr/bin/env python3
"""
Download images from Figma prototype using Playwright.
Captures all visual elements including canvas-rendered content.
"""

import asyncio
import os
import re
import base64
import json
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
        image_urls = []
        
        async def handle_response(response):
            try:
                resource_type = response.request.resource_type
                if resource_type in ['image', 'media', 'xhr', 'fetch']:
                    content_type = response.headers.get('content-type', '')
                    if 'image' in content_type.lower() or resource_type in ['image', 'media']:
                        url = response.url
                        if url not in [x['url'] for x in image_urls]:
                            image_urls.append({
                                'url': url,
                                'type': content_type,
                                'method': response.request.method
                            })
            except:
                pass
        
        page.on('response', handle_response)
        
        print(f"Navigating to: {url}")
        try:
            await page.goto(url, wait_until='networkidle', timeout=60000)
            print("Page loaded, waiting for content to render...")
            await asyncio.sleep(5)  # Give extra time for dynamic content
            
            # Scroll to load more content
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2)
            
            # Try to capture all images from the page
            print("Extracting image URLs from page...")
            
            # Get all img elements
            img_elements = await page.query_selector_all('img')
            for img in img_elements:
                src = await img.get_attribute('src')
                data_src = await img.get_attribute('data-src')
                srcset = await img.get_attribute('srcset')
                
                if src and not any(x['url'] == src for x in image_urls):
                    image_urls.append({'url': src, 'type': 'image/unknown', 'method': 'img_tag'})
                if data_src and not any(x['url'] == data_src for x in image_urls):
                    image_urls.append({'url': data_src, 'type': 'image/unknown', 'method': 'img_tag'})
                if srcset:
                    # Parse srcset
                    for srcset_item in srcset.split(','):
                        url = srcset_item.strip().split()[0]
                        if url and not any(x['url'] == url for x in image_urls):
                            image_urls.append({'url': url, 'type': 'image/unknown', 'method': 'img_srcset'})
            
            # Get background images
            bg_images = await page.evaluate('''
                () => {
                    const urls = [];
                    document.querySelectorAll('*').forEach(el => {
                        const style = window.getComputedStyle(el);
                        const bgImage = style.backgroundImage;
                        if (bgImage && bgImage !== 'none') {
                            const matches = bgImage.match(/url\(["']?([^"')]+)["']?\)/g);
                            if (matches) {
                                matches.forEach(match => {
                                    const url = match.replace(/url\(["']?|["']?\)/g, '');
                                    urls.push(url);
                                });
                            }
                        }
                    });
                    return urls;
                }
            ''')
            for bg_url in bg_images:
                if not any(x['url'] == bg_url for x in image_urls):
                    image_urls.append({'url': bg_url, 'type': 'image/unknown', 'method': 'background'})
            
            # Get all images from canvas elements (Figma uses canvas)
            canvas_data = await page.evaluate('''
                () => {
                    const urls = [];
                    document.querySelectorAll('canvas').forEach((canvas, index) => {
                        try {
                            const dataUrl = canvas.toDataURL('image/png');
                            if (dataUrl && dataUrl.startsWith('data:image')) {
                                urls.push(dataUrl);
                            }
                        } catch(e) {
                            console.log('Canvas error:', e);
                        }
                    });
                    return urls;
                }
            ''')
            for canvas_url in canvas_data:
                if not any(x['url'] == canvas_url for x in image_urls):
                    image_urls.append({'url': canvas_url, 'type': 'image/png', 'method': 'canvas'})
            
            # Also capture SVG elements
            svgs = await page.query_selector_all('svg')
            for i, svg in enumerate(svgs):
                try:
                    svg_content = await svg.evaluate('el => el.outerHTML')
                    if svg_content:
                        # Save as SVG file
                        filename = f'figma_svg_{i+1:03d}.svg'
                        filepath = os.path.join(output_dir, filename)
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(svg_content)
                        print(f"Downloaded SVG: {filename}")
                except:
                    pass
            
            print(f"Found {len(image_urls)} image URLs")
            
        except Exception as e:
            print(f"Error loading page: {e}")
            import traceback
            traceback.print_exc()
        
        await browser.close()
    
    # Download all found images
    print(f"\nDownloading {len(image_urls)} images...")
    downloaded = 0
    
    for index, img_data in enumerate(image_urls, 1):
        img_url = img_data['url']
        try:
            if img_url.startswith('data:'):
                # Handle data URLs
                ext_match = re.search(r'data:image/(\w+);', img_url)
                ext = '.png'
                if ext_match:
                    ext = '.' + ext_match.group(1)
                
                content = base64.b64decode(img_url.split(',')[1])
                filename = f'figma_canvas_{index:03d}{ext}'
                filepath = os.path.join(output_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(content)
                
                print(f"Downloaded: {filename} (from canvas)")
                downloaded += 1
            elif img_url.startswith('blob:'):
                print(f"Skipping blob URL: {img_url}")
            elif img_url.startswith('chrome-extension:'):
                print(f"Skipping extension URL: {img_url}")
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
                elif 'octet-stream' in content_type:
                    # Try to determine from URL
                    url_ext = os.path.splitext(urlparse(img_url).path)[1]
                    ext = url_ext if url_ext else '.bin'
                
                filename = f'figma_image_{index:03d}{ext}'
                filepath = os.path.join(output_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(content)
                
                print(f"Downloaded: {filename} ({img_data['method']})")
                downloaded += 1
                
        except Exception as e:
            print(f"Error downloading image {index}: {e}")
        
        await asyncio.sleep(0.1)  # Be respectful
    
    print(f"\nDownloaded {downloaded}/{len(image_urls)} images to {output_dir}")
    
    # Save the list of found URLs
    with open(os.path.join(output_dir, 'image_urls.json'), 'w') as f:
        json.dump(image_urls, f, indent=2)
    print(f"Saved image URLs list to: {os.path.join(output_dir, 'image_urls.json')}")

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