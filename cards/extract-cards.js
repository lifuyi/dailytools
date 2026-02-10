const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

/**
 * Extract card data from xiaohongshu-cards HTML file
 */
function extractCardsFromHTML(htmlPath) {
    // Read HTML file
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const cards = [];

    // Alternative approach: split by card-wrapper
    const parts = html.split('<div class="card-wrapper">');
    
    // Skip the first part (before first card-wrapper)
    for (let i = 1; i < parts.length; i++) {
        const cardWrapperHTML = parts[i];
        
        // Extract card label
        const labelMatch = cardWrapperHTML.match(/<div class="card-label">(.*?)<\/div>/);
        const label = labelMatch ? labelMatch[1] : 'Unknown';

        // Check if it's a cover card or content card
        const isCoverCard = cardWrapperHTML.includes('class="cover-card"');
        
        let cardData = {
            label,
            type: isCoverCard ? 'cover' : 'content'
        };

        if (isCoverCard) {
            // Extract cover card data
            cardData.emoji = extractText(cardWrapperHTML, 'cover-emoji');
            cardData.title = extractText(cardWrapperHTML, 'cover-title');
            cardData.subtitle = extractText(cardWrapperHTML, 'cover-subtitle');
            
            // Extract background gradient
            const bgMatch = cardWrapperHTML.match(/background:\s*linear-gradient\([^)]+\)/);
            cardData.background = bgMatch ? bgMatch[0] : null;
            
            // Extract title gradient
            const titleGradientMatch = cardWrapperHTML.match(/class="cover-title"[^>]*background:\s*linear-gradient\([^)]+\)/);
            if (titleGradientMatch) {
                const gradientMatch = titleGradientMatch[0].match(/linear-gradient\([^)]+\)/);
                cardData.titleGradient = gradientMatch ? gradientMatch[0] : null;
            }
        } else {
            // Extract content card data
            const cardContentMatch = cardWrapperHTML.match(/<div class="card-content"[^>]*>(.*?)<\/div>/s);
            if (cardContentMatch) {
                const contentHTML = cardContentMatch[1];
                cardData.content = cleanContent(contentHTML);
                
                // Extract page number
                const pageMatch = cardWrapperHTML.match(/<div class="page-number"[^>]*>(.*?)<\/div>/s);
                cardData.pageNumber = pageMatch ? pageMatch[1].trim() : null;
            }
        }

        cards.push(cardData);
    }

    return cards;
}

/**
 * Extract text content from an element by class name
 */
function extractText(html, className) {
    const regex = new RegExp(`<div class="${className}"[^>]*>(.*?)</div>`, 's');
    const match = html.match(regex);
    if (match) {
        return match[1].replace(/<[^>]*>/g, '').trim();
    }
    return '';
}

/**
 * Clean content by removing excessive style attributes
 */
function cleanContent(contentHTML) {
    // Remove inline style attributes (they contain computed styles)
    let cleaned = contentHTML.replace(/\s*style="[^"]*"/g, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

/**
 * Convert extracted cards back to HTML format
 */
function convertCardsToHTML(cards) {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extracted Cards</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
        }
        .cards-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
        }
        :root {
            --card-width: 360px;
            --card-height: 480px;
            --card-inner-padding: 40px;
            --cover-inner-width: calc(var(--card-width) * 0.88);
            --cover-inner-height: calc(var(--card-height) * 0.91);
        }
        .card-wrapper {
            position: relative;
        }
        .cover-card {
            width: var(--card-width);
            height: var(--card-height);
            position: relative;
            overflow: hidden;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        }
        .cover-inner {
            position: absolute;
            width: var(--cover-inner-width);
            height: var(--cover-inner-height);
            left: calc(var(--card-width) * 0.06);
            top: calc(var(--card-height) * 0.045);
            background: #F3F3F3;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            padding: calc(var(--card-width) * 0.074) calc(var(--card-width) * 0.079);
        }
        .cover-emoji {
            font-size: 60px;
            line-height: 1.2;
            margin-bottom: 20px;
        }
        .cover-title {
            font-weight: 900;
            font-size: 42px;
            line-height: 1.4;
            flex: 1;
            display: flex;
            align-items: flex-start;
            word-break: break-word;
        }
        .cover-subtitle {
            font-weight: 350;
            font-size: 24px;
            line-height: 1.4;
            color: #000;
            margin-top: auto;
        }
        .content-card {
            width: var(--card-width);
            min-height: var(--card-height);
            position: relative;
            overflow: hidden;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        }
        .card-container {
            width: 100%;
            min-height: var(--card-height);
            position: relative;
            padding: calc(var(--card-height) * 0.04);
        }
        .card-inner {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: var(--card-inner-padding);
            min-height: calc(var(--card-height) - var(--card-height) * 0.08);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(10px);
        }
        .card-content {
            font-size: 42px;
            line-height: 1.7;
        }
        .card-content h1 {
            font-size: 72px;
            font-weight: 700;
            margin-bottom: 40px;
            line-height: 1.3;
        }
        .card-content h2 {
            font-size: 56px;
            font-weight: 600;
            margin: 50px 0 25px 0;
            line-height: 1.4;
        }
        .card-content h3 {
            font-size: 48px;
            font-weight: 600;
            margin: 40px 0 20px 0;
        }
        .card-content p {
            margin-bottom: 35px;
        }
        .card-content strong, .card-content b {
            font-weight: 700;
        }
        .card-content em, .card-content i {
            font-style: italic;
        }
        .card-content ul, .card-content ol {
            margin: 30px 0;
            padding-left: 60px;
        }
        .card-content li {
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .card-content blockquote {
            border-left: 8px solid #6366f1;
            padding-left: 40px;
            background: #f1f5f9;
            padding-top: 25px;
            padding-bottom: 25px;
            padding-right: 30px;
            margin: 35px 0;
            font-style: italic;
            border-radius: 0 12px 12px 0;
        }
        .card-content code {
            background: #f1f5f9;
            padding: 6px 16px;
            border-radius: 8px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 38px;
        }
        .card-content pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 40px;
            border-radius: 16px;
            margin: 35px 0;
            overflow-x: visible;
            word-wrap: break-word;
            font-size: 36px;
            line-height: 1.5;
        }
        .card-content pre code {
            background: transparent;
            color: inherit;
            padding: 0;
            font-size: inherit;
        }
        .card-content img {
            max-width: 100%;
            height: auto;
            border-radius: 16px;
            margin: 35px auto;
            display: block;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .card-content hr {
            border: none;
            height: 2px;
            background: #e2e8f0;
            margin: 50px 0;
        }
        .tags-container {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e2e8f0;
        }
        .tag {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 12px 28px;
            border-radius: 30px;
            font-size: 34px;
            margin: 10px 15px 10px 0;
            font-weight: 500;
        }
        .page-number {
            position: absolute;
            bottom: 20px;
            right: 30px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="cards-container">
`;

    cards.forEach(card => {
        html += '        <div class="card-wrapper"><div class="card-label">' + card.label + '</div>';
        
        if (card.type === 'cover') {
            html += `<div class="cover-card" style="${card.background || ''}">
                <div class="cover-inner">
                    <div class="cover-emoji">${card.emoji}</div>
                    <div class="cover-title" style="${card.titleGradient ? 'background: ' + card.titleGradient + '; -webkit-text-fill-color: transparent;' : ''}">${card.title}</div>
                    <div class="cover-subtitle">${card.subtitle}</div>
                </div>
            </div>`;
        } else {
            html += `<div class="content-card">
                <div class="card-container">
                    <div class="card-inner">
                        <div class="card-content">${card.content || ''}</div>
                    </div>
                </div>
                ${card.pageNumber ? `<div class="page-number">${card.pageNumber}</div>` : ''}
            </div>`;
        }
        
        html += '</div>\n';
    });

    html += `    </div>
</body>
</html>`;

    return html;
}

/**
 * Save HTML to file
 */
function saveHtmlToFile(html, outputPath) {
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✓ HTML saved to ${outputPath}`);
}

/**
 * Save cards to JSON file
 */
function saveCardsToJson(cards, outputPath) {
    const json = JSON.stringify(cards, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
    console.log(`✓ Extracted ${cards.length} cards saved to ${outputPath}`);
}

/**
 * Print card summary to console
 */
function printCardSummary(cards) {
    console.log('\n=== Extracted Cards ===\n');
    cards.forEach((card, index) => {
        console.log(`Card ${index + 1}: ${card.label || 'Unknown'} (${card.type || 'unknown'})`);
        if (card.type === 'cover') {
            console.log(`  Emoji: ${card.emoji || ''}`);
            console.log(`  Title: ${card.title || ''}`);
            console.log(`  Subtitle: ${card.subtitle || ''}`);
        } else {
            console.log(`  Content length: ${card.content ? card.content.length : 0} chars`);
            console.log(`  Page: ${card.pageNumber || 'N/A'}`);
        }
        console.log('');
    });
}

/**
 * Export individual cards as PNG files
 */
async function exportCardsToPNG(htmlPath, outputDir) {
    console.log('\n🖼️  Exporting cards to PNG...');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Set device scale factor for higher quality
    await page.setViewport({ 
        width: 360, 
        height: 480,
        deviceScaleFactor: 2
    });
    
    // Load HTML file
    const fileUrl = `file://${htmlPath}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Get all card wrappers
    const cards = await page.$$('.card-wrapper');
    
    console.log(`Found ${cards.length} cards to export...`);
    
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        
        // Get card label for filename
        const labelElement = await card.$('.card-label');
        const label = labelElement ? await page.evaluate(el => el.textContent.trim(), labelElement) : `card_${i + 1}`;
        
        // Sanitize label for filename (allow Chinese characters)
        const sanitizedLabel = label.replace(/[^\w\u4e00-\u9fa5\s-]/g, '').replace(/\s+/g, '_');
        const filename = `${sanitizedLabel}.png`;
        const outputPath = path.join(outputDir, filename);
        
        // Get bounding box with padding for shadow
        const boundingBox = await card.boundingBox();
        
        // Screenshot the card with padding for shadow
        await page.screenshot({
            path: outputPath,
            clip: {
                x: boundingBox.x - 10,
                y: boundingBox.y - 10,
                width: boundingBox.width + 20,
                height: boundingBox.height + 20
            }
        });
        
        console.log(`✓ Exported: ${filename}`);
    }
    
    await browser.close();
    console.log(`\n✓ All cards exported to ${outputDir}/`);
}

// Main execution
const htmlPath = path.join(__dirname, 'xiaohongshu-cards (8).html');
const jsonOutputPath = path.join(__dirname, 'extracted-cards.json');
const reconstructedHtmlPath = path.join(__dirname, 'reconstructed-cards.html');
const pngOutputDir = path.join(__dirname, 'cards-png');

async function main() {
    try {
        console.log('Extracting cards from HTML file...');
        const cards = extractCardsFromHTML(htmlPath);
        printCardSummary(cards);
        saveCardsToJson(cards, jsonOutputPath);
        
        // Convert back to HTML
        console.log('\nConverting cards back to HTML...');
        const reconstructedHtml = convertCardsToHTML(cards);
        saveHtmlToFile(reconstructedHtml, reconstructedHtmlPath);
        
        // Export to PNG
        await exportCardsToPNG(reconstructedHtmlPath, pngOutputDir);
        
        console.log('\n✓ All operations complete!');
    } catch (error) {
        console.error('✗ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();