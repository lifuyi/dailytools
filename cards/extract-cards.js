// Built-in modules
const fs = require('fs');
const path = require('path');

// Third-party modules
const puppeteer = require('puppeteer');

/**
 * Extract card data from xiaohongshu-cards HTML file
 * @param {string} htmlPath - Path to the HTML file
 * @returns {Array} Array of card objects
 * @throws {Error} If file cannot be read or parsed
 */
function extractCardsFromHTML(htmlPath) {
    if (!fs.existsSync(htmlPath)) {
        throw new Error(`File not found: ${htmlPath}`);
    }

    let html;
    try {
        html = fs.readFileSync(htmlPath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read file ${htmlPath}: ${error.message}`);
    }

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
            Object.assign(cardData, extractCoverCardData(cardWrapperHTML));
        } else {
            Object.assign(cardData, extractContentCardData(cardWrapperHTML));
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
 * Extract data from a cover card HTML
 * @param {string} cardWrapperHTML - HTML content of card wrapper
 * @returns {Object} Cover card data
 */
function extractCoverCardData(cardWrapperHTML) {
    const cardData = {};
    cardData.emoji = extractText(cardWrapperHTML, 'cover-emoji');
    cardData.title = extractText(cardWrapperHTML, 'cover-title');
    cardData.subtitle = extractText(cardWrapperHTML, 'cover-subtitle');

    const bgMatch = cardWrapperHTML.match(/background:\s*linear-gradient\([^)]+\)/);
    cardData.background = bgMatch ? bgMatch[0] : null;

    const titleGradientMatch = cardWrapperHTML.match(/class="cover-title"[^>]*background:\s*linear-gradient\([^)]+\)/);
    if (titleGradientMatch) {
        const gradientMatch = titleGradientMatch[0].match(/linear-gradient\([^)]+\)/);
        cardData.titleGradient = gradientMatch ? gradientMatch[0] : null;
    }

    return cardData;
}

/**
 * Extract data from a content card HTML
 * @param {string} cardWrapperHTML - HTML content of card wrapper
 * @returns {Object} Content card data
 */
function extractContentCardData(cardWrapperHTML) {
    const cardData = {};
    const cardContentMatch = cardWrapperHTML.match(/<div class="card-content"[^>]*>(.*?)<\/div>/s);

    if (cardContentMatch) {
        const contentHTML = cardContentMatch[1];
        cardData.content = cleanContent(contentHTML);

        const pageMatch = cardWrapperHTML.match(/<div class="page-number"[^>]*>(.*?)<\/div>/s);
        cardData.pageNumber = pageMatch ? pageMatch[1].trim() : null;
    }

    return cardData;
}

function cleanContent(contentHTML) {
    let cleaned = contentHTML.replace(/\s*style="[^"]*"/g, '');
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
            display: inline-block;
            width: var(--card-width);
        }
        .card-label {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: #999;
            background: #fff;
            padding: 4px 12px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            white-space: nowrap;
            z-index: 10;
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
 * Export individual cards as PNG files using Puppeteer
 * @param {string} htmlPath - Path to the HTML file containing cards
 * @param {string} outputDir - Directory to save PNG files
 * @throws {Error} If export fails
 */
async function exportCardsToPNG(htmlPath, outputDir) {
    console.log('\n🖼️  Exporting cards to PNG...');
    
    if (!fs.existsSync(htmlPath)) {
        throw new Error(`HTML file not found: ${htmlPath}`);
    }
    
    // Validate and normalize output path to prevent path traversal
    const normalizedOutputDir = path.normalize(outputDir);
    const resolvedOutputDir = path.resolve(normalizedOutputDir);
    
    if (!fs.existsSync(resolvedOutputDir)) {
        fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        await page.setViewport({ 
            width: 360, 
            height: 480,
            deviceScaleFactor: 2
        });
        
        const fileUrl = `file://${htmlPath}`;
        await page.goto(fileUrl, { waitUntil: 'networkidle0' });

        const cards = await page.$$('.card-wrapper');
        
        if (cards.length === 0) {
            console.warn('No cards found in HTML file');
            return;
        }
        
        console.log(`Found ${cards.length} cards to export...`);
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            
            const labelElement = await card.$('.card-label');
            const label = labelElement ? await page.evaluate(el => el.textContent.trim(), labelElement) : `card_${i + 1}`;
            
            const sanitizedLabel = label.replace(/[^\w\u4e00-\u9fa5\s-]/g, '').replace(/\s+/g, '_');
            const filename = `${sanitizedLabel}.png`;
            const outputPath = path.join(resolvedOutputDir, filename);
            
            const boundingBox = await card.boundingBox();
            
            if (!boundingBox) {
                console.warn(`Could not get bounding box for card ${i + 1}, skipping...`);
                continue;
            }
            
            await page.screenshot({
                path: outputPath,
                clip: {
                    x: Math.max(0, boundingBox.x - 10),
                    y: Math.max(0, boundingBox.y - 10),
                    width: boundingBox.width + 20,
                    height: boundingBox.height + 20
                }
            });
            
            console.log(`✓ Exported: ${filename}`);
        }
        
        console.log(`\n✓ All cards exported to ${resolvedOutputDir}/`);
    } catch (error) {
        console.error('Export failed:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        input: null,
        outputJson: null,
        outputHtml: null,
        outputPngDir: null
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-i':
            case '--input':
                options.input = args[++i];
                break;
            case '-j':
            case '--json':
                options.outputJson = args[++i];
                break;
            case '-h':
            case '--html':
                options.outputHtml = args[++i];
                break;
            case '-p':
            case '--png':
                options.outputPngDir = args[++i];
                break;
            case '--help':
                showHelp();
                process.exit(0);
                break;
        }
    }
    
    return options;
}

function showHelp() {
    console.log(`
Usage: node extract-cards.js [options]

Options:
  -i, --input <path>     Input HTML file path (required)
  -j, --json <path>      Output JSON file path
  -h, --html <path>      Output HTML file path
  -p, --png <dir>        Output PNG directory
  --help                 Show this help message

Examples:
  node extract-cards.js -i input.html
  node extract-cards.js -i input.html -j cards.json -h output.html -p png-output/
`);
}

/**
 * Main execution function
 */
async function main() {
    const args = parseArgs();
    
    if (!args.input) {
        console.error('Error: Input file is required. Use -i or --input option.');
        showHelp();
        process.exit(1);
    }
    
    const htmlPath = path.resolve(args.input);
    const baseName = path.basename(htmlPath, path.extname(htmlPath));
    const baseDir = path.dirname(htmlPath);
    
    const jsonOutputPath = args.outputJson || path.join(baseDir, `${baseName}.json`);
    const reconstructedHtmlPath = args.outputHtml || path.join(baseDir, `${baseName}-reconstructed.html`);
    const pngOutputDir = args.outputPngDir || path.join(baseDir, `${baseName}-png`);
    
    try {
        console.log('Extracting cards from HTML file...');
        const cards = extractCardsFromHTML(htmlPath);
        printCardSummary(cards);
        saveCardsToJson(cards, jsonOutputPath);
        
        console.log('\nConverting cards back to HTML...');
        const reconstructedHtml = convertCardsToHTML(cards);
        saveHtmlToFile(reconstructedHtml, reconstructedHtmlPath);
        
        await exportCardsToPNG(reconstructedHtmlPath, pngOutputDir);
        
        console.log('\n✓ All operations complete!');
    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
}

main();