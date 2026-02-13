/**
 * HTML Exporter - Export cards as HTML
 */

// CSS for exported HTML
const EXPORT_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
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
        --card-width: ${'{width}'}px;
        --card-height: ${'{height}'}px;
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
    .cover-emoji { font-size: 60px; line-height: 1.2; margin-bottom: 20px; }
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
    .card-content { font-size: 42px; line-height: 1.7; }
    .card-content h1 { font-size: 72px; font-weight: 700; margin-bottom: 40px; line-height: 1.3; }
    .card-content h2 { font-size: 56px; font-weight: 600; margin: 50px 0 25px 0; line-height: 1.4; }
    .card-content h3 { font-size: 48px; font-weight: 600; margin: 40px 0 20px 0; }
    .card-content p { margin-bottom: 35px; }
    .card-content strong, .card-content b { font-weight: 700; }
    .card-content em, .card-content i { font-style: italic; }
    .card-content ul, .card-content ol { margin: 30px 0; padding-left: 60px; }
    .card-content li { margin-bottom: 20px; line-height: 1.6; }
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
    .card-content pre code { background: transparent; color: inherit; padding: 0; font-size: inherit; }
    .card-content img {
        max-width: 100%;
        height: auto;
        border-radius: 16px;
        margin: 35px auto;
        display: block;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .card-content hr { border: none; height: 2px; background: #e2e8f0; margin: 50px 0; }
    .tags-container { margin-top: 50px; padding-top: 30px; border-top: 2px solid #e2e8f0; }
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
`;

/**
 * Generate complete HTML document for export
 * @param {Array} cardsHtml - Array of card HTML strings
 * @param {number} width - Card width in pixels
 * @param {number} height - Card height in pixels
 * @returns {string} Complete HTML document
 */
export function generateExportHTML(cardsHtml, width, height) {
    const css = EXPORT_CSS.replace(/\{width\}/g, width).replace(/\{height\}/g, height);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>小红书卡片</title>
    <style>
        ${css}
    </style>
</head>
<body>
    <div class="cards-container">
        ${cardsHtml.map((html, index) => {
            const label = index === 0 ? '封面' : `卡片 ${index}`;
            return `<div class="card-wrapper"><div class="card-label">${label}</div>${html}</div>`;
        }).join('\n')}
    </div>
</body>
</html>`;
}

/**
 * Download content as a file
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/html') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default { generateExportHTML, downloadFile };
