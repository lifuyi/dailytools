/**
 * 小红书卡片渲染器 - Web版
 */

// ============================================
// Constants
// ============================================
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEBOUNCE_DELAY = { RENDER: 300 };

// ============================================
// IndexedDB Image Storage
// ============================================
const ImageStore = {
    db: null,
    dbName: 'CardImagesDB',
    storeName: 'images',

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    },

    async save(id, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.put({ id, data, timestamp: Date.now() });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    async get(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result?.data);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            transaction.objectStore(this.storeName).delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
};

// ============================================
// HTML Sanitization (XSS Prevention)
// ============================================

function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

function sanitizeText(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const state = {
    currentTheme: 'default',
    customBackground: {
        enabled: false,
        color1: '#6366f1',
        color2: '#8b5cf6',
        direction: '135deg'
    },
    cardSize: {
        width: 360,
        height: 480
    }
};

const themeTitleGradients = {
    'default': 'linear-gradient(180deg, #111827 0%, #4B5563 100%)',
    'playful-geometric': 'linear-gradient(180deg, #7C3AED 0%, #F472B6 100%)',
    'neo-brutalism': 'linear-gradient(180deg, #000000 0%, #FF4757 100%)',
    'botanical': 'linear-gradient(180deg, #1F2937 0%, #4A7C59 100%)',
    'professional': 'linear-gradient(180deg, #1E3A8A 0%, #2563EB 100%)',
    'retro': 'linear-gradient(180deg, #8B4513 0%, #D35400 100%)',
    'terminal': 'linear-gradient(180deg, #39D353 0%, #58A6FF 100%)',
    'sketch': 'linear-gradient(180deg, #111827 0%, #6B7280 100%)'
};

const themeConfig = {
    'default': { titleGradient: 'linear-gradient(180deg, #111827 0%, #4B5563 100%)', solidColor: '#1F2937' },
    'playful-geometric': { titleGradient: 'linear-gradient(180deg, #7C3AED 0%, #F472B6 100%)', solidColor: '#7C3AED' },
    'neo-brutalism': { titleGradient: 'linear-gradient(180deg, #000000 0%, #FF4757 100%)', solidColor: '#000000' },
    'botanical': { titleGradient: 'linear-gradient(180deg, #1F2937 0%, #4A7C59 100%)', solidColor: '#1F2937' },
    'professional': { titleGradient: 'linear-gradient(180deg, #1E3A8A 0%, #2563EB 100%)', solidColor: '#1E3A8A' },
    'retro': { titleGradient: 'linear-gradient(180deg, #8B4513 0%, #D35400 100%)', solidColor: '#8B4513' },
    'terminal': { titleGradient: 'linear-gradient(180deg, #39D353 0%, #58A6FF 100%)', solidColor: '#39D353' },
    'sketch': { titleGradient: 'linear-gradient(180deg, #111827 0%, #6B7280 100%)', solidColor: '#111827' }
};

const sampleMarkdown = `---
title: 我的第一篇小红书
subtitle: 分享生活点滴
emoji: 📝
---

# 欢迎来到小红书

这是一段**加粗**的文字，还有*斜体*和\`代码\`。

## 列表示例

- 第一项
- 第二项
- 第三项

## 引用块

> 这是一个引用块

---

# 第二张卡片

你可以用 \`---\` 分隔多张卡片。

多张图片连续粘贴时会自动并排显示。

#标签1 #标签2
`;

// ============================================
// DOM 元素
// ============================================
const elements = {
    markdownInput: document.getElementById('markdown-input'),
    themeSelect: document.getElementById('theme-select'),
    cardsContainer: document.getElementById('cards-container'),
    themeCss: document.getElementById('theme-css'),
    downloadBtn: document.getElementById('download-btn'),
    clearBtn: document.getElementById('clear-btn'),
    sampleBtn: document.getElementById('sample-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    bgColor1: document.getElementById('bg-color-1'),
    bgColor2: document.getElementById('bg-color-2'),
    gradientDirection: document.getElementById('gradient-direction'),
    applyBgBtn: document.getElementById('apply-bg-btn'),
    resetBgBtn: document.getElementById('reset-bg-btn'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    cardWidth: document.getElementById('card-width'),
    cardHeight: document.getElementById('card-height'),
    applySizeBtn: document.getElementById('apply-size-btn'),
    resetSizeBtn: document.getElementById('reset-size-btn'),
    sizePresetBtns: document.querySelectorAll('.size-preset-btn')
};

// ============================================
// Markdown 解析
// ============================================

function parseMarkdown(content) {
    const yamlPattern = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const yamlMatch = content.match(yamlPattern);
    
    let metadata = {};
    let body = content;
    
    if (yamlMatch) {
        try {
            metadata = parseYaml(yamlMatch[1]);
        } catch (e) {
            console.error('YAML 解析失败:', e);
        }
        body = content.slice(yamlMatch[0].length);
    }
    
    return { metadata, body: body.trim() };
}

function parseYaml(content) {
    const result = {};
    if (!content || typeof content !== 'string') {
        return result;
    }
    
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }
        
        const match = trimmedLine.match(/^([\w]+):\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        }
    }
    return result;
}

function splitContentBySeparator(body) {
    return body.split(/\n---+/).map(p => p.trim()).filter(p => p);
}

async function convertMarkdownToHtml(mdContent) {
    // 处理 IndexedDB 图片引用 ![img:id]
    const imagePattern = /!\[img:([^\]]+)\]/g;
    const imageMatches = [];
    
    let match;
    while ((match = imagePattern.exec(mdContent)) !== null) {
        imageMatches.push(match[1]);
    }
    
    // 加载所有图片
    for (const id of imageMatches) {
        const src = await ImageStore.get(id);
        if (src) {
            mdContent = mdContent.replace(`![img:${id}]`, `![图片](${src})`);
        } else {
            mdContent = mdContent.replace(`![img:${id}]`, '');
        }
    }
    
    const tagsPattern = /((?:#[\w\u4e00-\u9fa5]+\s*)+)$/m;
    const tagsMatch = mdContent.match(tagsPattern);
    let tagsHtml = '';
    
    if (tagsMatch) {
        const tags = tagsMatch[1].match(/#([\w\u4e00-\u9fa5]+)/g);
        if (tags) {
            tagsHtml = '<div class="tags-container">';
            tags.forEach(tag => {
                tagsHtml += `<span class="tag">${tag}</span>`;
            });
            tagsHtml += '</div>';
        }
        mdContent = mdContent.slice(0, tagsMatch.index).trim();
    }
    
    const html = marked.parse(mdContent, { breaks: true, gfm: true });
    return html + tagsHtml;
}

// ============================================
// HTML 生成
// ============================================

function generateCoverHtml(metadata, theme) {
    const emoji = metadata.emoji || '📝';
    let title = (metadata.title || '标题').slice(0, 20);
    let subtitle = (metadata.subtitle || '').slice(0, 20);
    
    const titleLen = title.length;
    let titleSize = titleLen <= 6 ? 52 : titleLen <= 10 ? 46 : titleLen <= 18 ? 36 : 28;
    
    const titleGradient = themeTitleGradients[theme] || themeTitleGradients['default'];
    
    return `
        <div class="cover-inner">
            <div class="cover-emoji">${emoji}</div>
            <div class="cover-title" style="font-size: ${titleSize}px; background: ${titleGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${title}</div>
            <div class="cover-subtitle">${subtitle}</div>
        </div>
    `;
}

function generateCardHtml(content, pageNumber, totalPages) {
    return convertMarkdownToHtml(content).then(htmlContent => {
        const pageText = totalPages > 1 ? `${pageNumber}/${totalPages}` : '';
        return `
            <div class="card-container">
                <div class="card-inner">
                    <div class="card-content">
                        ${htmlContent}
                    </div>
                </div>
                ${pageText ? `<div class="page-number">${pageText}</div>` : ''}
            </div>
        `;
    });
}

// ============================================
// 渲染逻辑
// ============================================

async function renderCards() {
    const content = elements.markdownInput.value;
    if (!content.trim()) {
        elements.cardsContainer.innerHTML = '';
        return;
    }
    
    const { metadata, body } = parseMarkdown(content);
    const cardContents = splitContentBySeparator(body);
    
    elements.cardsContainer.innerHTML = '';
    elements.cardsContainer.className = `cards-list theme-${state.currentTheme}`;
    
    if (metadata.title || metadata.emoji) {
        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'card-wrapper';
        coverWrapper.innerHTML = `
            <div class="card-label">封面</div>
            <div class="cover-card">
                ${generateCoverHtml(metadata, state.currentTheme)}
            </div>
        `;
        elements.cardsContainer.appendChild(coverWrapper);
    }
    
    const cardPromises = cardContents.map((content, index) => 
        generateCardHtml(content, index + 1, cardContents.length).then(htmlContent => ({ index, htmlContent }))
    );
    
    const cardResults = await Promise.all(cardPromises);
    
    for (const { index, htmlContent } of cardResults) {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'card-wrapper';
        cardWrapper.innerHTML = `
            <div class="card-label">卡片 ${index + 1}</div>
            <div class="content-card">
                ${htmlContent}
            </div>
        `;
        elements.cardsContainer.appendChild(cardWrapper);
    }
    
    elements.cardsContainer.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            console.warn(`Failed to load image: ${this.src?.substring(0, 100)}...`);
            this.style.display = 'none';
            this.classList.add('image-error');
        };
    });
}

async function switchTheme(theme) {
    state.currentTheme = theme;
    elements.themeCss.href = `themes/${theme}.css`;
    await renderCards();
}

function applyCustomBackground() {
    try {
        const { value: color1 } = elements.bgColor1;
        const { value: color2 } = elements.bgColor2;
        const { value: direction } = elements.gradientDirection;
        
        if (!color1 || !color2 || !direction) {
            console.warn('applyCustomBackground: Missing color or direction value');
            return;
        }
        
        const isValidColor = /^#([0-9A-Fa-f]{3}){1,2}$/.test(color1) && /^#([0-9A-Fa-f]{3}){1,2}$/.test(color2);
        if (!isValidColor) {
            alert('请输入有效的颜色值（如 #6366f1）');
            return;
        }
        
        state.customBackground = { enabled: true, color1, color2, direction };
        
        elements.cardsContainer.classList.add('custom-bg');
        elements.cardsContainer.style.setProperty('--bg-color-1', color1);
        elements.cardsContainer.style.setProperty('--bg-color-2', color2);
        elements.cardsContainer.style.setProperty('--gradient-direction', direction);
    } catch (error) {
        console.error('applyCustomBackground error:', error);
    }
}

function resetBackground() {
    state.customBackground.enabled = false;
    elements.cardsContainer.classList.remove('custom-bg');
    elements.cardsContainer.style.removeProperty('--bg-color-1');
    elements.cardsContainer.style.removeProperty('--bg-color-2');
    elements.cardsContainer.style.removeProperty('--gradient-direction');
    
    elements.bgColor1.value = '#6366f1';
    elements.bgColor2.value = '#8b5cf6';
    elements.gradientDirection.value = '135deg';
    elements.presetBtns.forEach(btn => btn.classList.remove('active'));
}

function applyPreset(color1, color2) {
    elements.bgColor1.value = color1;
    elements.bgColor2.value = color2;
    applyCustomBackground();
}

function applyCardSize() {
    const width = parseInt(elements.cardWidth.value) || 360;
    const height = parseInt(elements.cardHeight.value) || 480;
    
    state.cardSize = { width, height };
    
    elements.cardsContainer.style.setProperty('--card-width', width + 'px');
    elements.cardsContainer.style.setProperty('--card-height', height + 'px');
    elements.cardsContainer.style.setProperty('--cover-inner-width', Math.floor(width * 0.88) + 'px');
    elements.cardsContainer.style.setProperty('--cover-inner-height', Math.floor(height * 0.91) + 'px');
}

function resetCardSize() {
    state.cardSize = { width: 360, height: 480 };
    elements.cardWidth.value = 360;
    elements.cardHeight.value = 480;
    elements.cardsContainer.style.removeProperty('--card-width');
    elements.cardsContainer.style.removeProperty('--card-height');
    elements.cardsContainer.style.removeProperty('--cover-inner-width');
    elements.cardsContainer.style.removeProperty('--cover-inner-height');
    elements.sizePresetBtns.forEach(btn => btn.classList.remove('active'));
}

function applySizePreset(width, height) {
    elements.cardWidth.value = width;
    elements.cardHeight.value = height;
    applyCardSize();
}

// ============================================
// 事件处理
// ============================================

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ============================================
// Export Functions
// ============================================

/**
 * Collect card data from the DOM for export
 * @returns {Object} Object containing card HTML array and dimensions
 */
function collectCardsData() {
    const cardWrappers = elements.cardsContainer.querySelectorAll('.card-wrapper');
    const cardsHtml = [];
    
    for (let i = 0; i < cardWrappers.length; i++) {
        const wrapper = cardWrappers[i];
        const card = wrapper.querySelector('.cover-card, .content-card');
        if (card) {
            const cardClone = card.cloneNode(true);
            applyInlineStyles(card, cardClone);
            cardsHtml.push(cardClone.outerHTML);
        }
    }
    
    const containerStyle = window.getComputedStyle(elements.cardsContainer);
    const width = parseFloat(containerStyle.getPropertyValue('--card-width')) || 360;
    const height = parseFloat(containerStyle.getPropertyValue('--card-height')) || 480;
    
    return { cardsHtml, width, height };
}

/**
 * Apply computed styles to a cloned element recursively
 * @param {Element} original - Original element
 * @param {Element} clone - Cloned element to apply styles to
 */
function applyInlineStyles(original, clone) {
    const layoutProperties = [
        'display', 'flex', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent',
        'grid', 'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
        'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
        'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'boxSizing', 'overflow', 'overflowX', 'overflowY',
        'border', 'borderRadius', 'borderWidth', 'borderStyle', 'borderColor',
        'background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
        'color', 'font', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign',
        'visibility', 'opacity', 'zIndex',
        'transform', 'transition', 'animation'
    ];
    
    const originalStyle = window.getComputedStyle(original);
    
    for (const prop of layoutProperties) {
        const value = originalStyle.getPropertyValue(prop);
        if (value && value !== '' && value !== 'auto' && value !== 'none') {
            clone.style[prop] = value;
        }
    }
    
    const originalChildren = original.children;
    const cloneChildren = clone.children;
    
    for (let i = 0; i < originalChildren.length && i < cloneChildren.length; i++) {
        applyInlineStyles(originalChildren[i], cloneChildren[i]);
    }
}

/**
 * Generate complete HTML document for export
 * @param {Array} cardsHtml - Array of card HTML strings
 * @param {number} width - Card width in pixels
 * @param {number} height - Card height in pixels
 * @returns {string} Complete HTML document
 */
function generateExportHTML(cardsHtml, width, height) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>小红书卡片</title>
    <style>
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
            --card-width: ${width}px;
            --card-height: ${height}px;
            --card-inner-padding: 40px;
            --cover-inner-width: calc(var(--card-width) * 0.88);
            --cover-inner-height: calc(var(--card-height) * 0.91);
        }
        .card-wrapper { position: relative; }
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
function downloadFile(content, filename, mimeType = 'text/html') {
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

/**
 * Download canvas as PNG
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} filename - Download filename
 */
function downloadCanvasAsPng(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Create or get export container for rendering
 * @returns {HTMLElement} Export container element
 */
function getExportContainer() {
    let container = document.getElementById('export-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'export-container';
        // Use visibility:visible with z-index:-9999 to allow html2canvas to render while keeping it off-screen
        container.style.cssText = 'position:fixed;left:0;top:0;z-index:-9999;visibility:visible;background:transparent;overflow:hidden;';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Get the base URL for the current page
 * @returns {string} Base URL
 */
function getBaseUrl() {
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    return baseUrl;
}

/**
 * Fetch CSS content from a URL
 * @param {string} url - CSS URL to fetch
 * @returns {Promise<string>} CSS content
 */
async function fetchCssContent(url) {
    if (!url) return '';
    
    // Convert relative URLs to absolute
    if (url.startsWith('themes/') || url === 'styles.css') {
        url = getBaseUrl() + '/' + url;
    }
    
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        console.warn('[Export] Failed to fetch CSS:', url, error);
        return '';
    }
}

/**
 * Inject CSS into a style element
 * @param {string} css - CSS content
 * @param {string} id - Unique ID for the style element
 */
function injectCss(css, id) {
    let styleEl = document.getElementById(id);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = id;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
}

/**
 * Inject all needed CSS for export (base styles + theme)
 * @returns {Promise<void>}
 */
async function injectExportStyles() {
    // First inject base styles.css
    const baseCssUrl = getBaseUrl() + '/styles.css';
    const baseCss = await fetchCssContent(baseCssUrl);
    if (baseCss) {
        injectCss(baseCss, 'export-base-css');
        console.log('[Export] Base styles injected');
    }
    
    // Then inject theme CSS
    const themeLink = document.getElementById('theme-css');
    const themeHref = themeLink?.href || '';
    if (themeHref) {
        let themeUrl = themeHref;
        // Convert relative theme URL to absolute if needed
        if (themeUrl.startsWith('themes/')) {
            themeUrl = getBaseUrl() + '/' + themeUrl;
        }
        const themeCss = await fetchCssContent(themeUrl);
        if (themeCss) {
            injectCss(themeCss, 'export-theme-css');
            console.log('[Export] Theme CSS injected:', themeUrl);
        }
    }
}

/**
 * Export a single card element to PNG
 * @param {HTMLElement} cardElement - Card element to export
 * @param {string} filename - Output filename
 * @param {Object} options - Export options (scale, backgroundColor)
 * @returns {Promise<boolean>} Success status
 */
async function exportCardToPng(cardElement, filename, options = {}) {
    const scale = options.scale || 2;
    const backgroundColor = options.backgroundColor || null;
    
    console.log(`[Export] Starting export for: ${filename}`);
    console.log(`[Export] Card element:`, cardElement.className);
    console.log(`[Export] Scale: ${scale}, backgroundColor: ${backgroundColor}`);
    
    try {
        // Use html2canvas first, but if it fails or produces issues, try dom-to-image
        let canvas;
        
        try {
            // Try html2canvas first
            canvas = await html2canvas(cardElement, {
                scale: scale,
                backgroundColor: false,
                logging: true,
                useCORS: true,
                allowTaint: true,
                removeContainer: false,
                ignoreElements: (element) => {
                    return element.classList?.contains('image-error');
                },
                onclone: (clonedDoc, clonedElement) => {
                    console.log('[Export] Cloned element for rendering');
                    clonedElement.style.visibility = 'visible';
                    clonedElement.style.display = 'block';
                    
                    const originalStyle = window.getComputedStyle(cardElement);
                    clonedElement.style.background = originalStyle.getPropertyValue('background');
                    
                    if (cardElement.classList.contains('cover-card')) {
                        const originalInner = cardElement.querySelector('.cover-inner');
                        const clonedInner = clonedElement.querySelector('.cover-inner');
                        if (originalInner && clonedInner) {
                            const innerStyle = window.getComputedStyle(originalInner);
                            clonedInner.style.background = innerStyle.getPropertyValue('background');
                        }
                        
                        const originalTitle = cardElement.querySelector('.cover-title');
                        const clonedTitle = clonedElement.querySelector('.cover-title');
                        if (originalTitle && clonedTitle) {
                            const titleStyle = window.getComputedStyle(originalTitle);
                            clonedTitle.style.background = titleStyle.getPropertyValue('background');
                            clonedTitle.style.webkitBackgroundClip = titleStyle.getPropertyValue('webkit-background-clip');
                            clonedTitle.style.backgroundClip = titleStyle.getPropertyValue('background-clip');
                            clonedTitle.style.webkitTextFillColor = titleStyle.getPropertyValue('webkit-text-fill-color');
                            clonedTitle.style.color = titleStyle.getPropertyValue('color');
                        }
                    }
                    
                    const styleIds = ['export-base-css', 'export-theme-css'];
                    for (const id of styleIds) {
                        const styleEl = document.getElementById(id);
                        if (styleEl && clonedDoc.head) {
                            const clonedStyle = styleEl.cloneNode(true);
                            clonedStyle.id = 'cloned-' + id;
                            clonedDoc.head.appendChild(clonedStyle);
                        }
                    }
                }
            });
        } catch (html2canvasError) {
            console.warn('[Export] html2canvas failed, trying dom-to-image:', html2canvasError.message);
            // Fallback to dom-to-image which handles CSS3 better
            canvas = await domtoimage.toCanvas(cardElement, {
                pixelRatio: scale
            });
        }
        
        // Validate canvas content
        const dataUrl = canvas.toDataURL('image/png');
        console.log(`[Export] Canvas dimensions: ${canvas.width}x${canvas.height}`);
        console.log(`[Export] DataURL length: ${dataUrl.length} bytes`);
        
        // Check for blank canvas
        if (dataUrl.length < 1000) {
            console.error(`[Export] Blank canvas detected for ${filename}`);
            throw new Error('导出生成空白图片');
        }
        
        // Download the PNG
        downloadCanvasAsPng(canvas, filename);
        console.log(`[Export] Successfully exported: ${filename}`);
        
        return true;
    } catch (error) {
        console.error(`[Export] Failed to export ${filename}:`, error);
        throw error;
    }
}

/**
 * Handle card export - exports HTML first, then PNGs
 * @param {HTMLElement} btn - Export button element
 */
async function handleExport(btn) {
    const cardWrappers = elements.cardsContainer.querySelectorAll('.card-wrapper');

    if (cardWrappers.length === 0) {
        alert('没有可导出的卡片');
        return;
    }

    const originalText = btn.textContent;
    btn.textContent = '导出中...';
    btn.disabled = true;

    try {
        console.log('[Export] Starting export...');
        console.log(`[Export] Found ${cardWrappers.length} cards to export`);
        
        // Step 1: Download HTML file first
        console.log('[Export] Step 1: Generating HTML file...');
        const { cardsHtml, width, height } = collectCardsData();
        const fullHtml = generateExportHTML(cardsHtml, width, height);
        downloadFile(fullHtml, 'xiaohongshu-cards.html');
        console.log('[Export] HTML file downloaded');
        
        // Wait a bit for HTML download to start
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Then download PNG images
        console.log('[Export] Step 2: Generating PNG images...');
        
        // Inject all CSS (base + theme) before exporting PNGs
        await injectExportStyles();
        
        // Export each card as PNG
        for (let i = 0; i < cardWrappers.length; i++) {
            const wrapper = cardWrappers[i];
            const card = wrapper.querySelector('.cover-card, .content-card');
            const isCover = wrapper.querySelector('.cover-card') !== null;
            
            if (!card) {
                console.warn(`[Export] No card found at index ${i}`);
                continue;
            }
            
            // Get the theme-specific background from the cards container
            const container = elements.cardsContainer;
            const containerStyle = window.getComputedStyle(container);
            
            // Check if custom background is enabled
            const hasCustomBg = container.classList.contains('custom-bg');
            
            if (hasCustomBg) {
                const bgColor1 = containerStyle.getPropertyValue('--bg-color-1').trim() || '#6366f1';
                const bgColor2 = containerStyle.getPropertyValue('--bg-color-2').trim() || '#8b5cf6';
                const direction = containerStyle.getPropertyValue('--gradient-direction').trim() || '135deg';
                card.style.background = `linear-gradient(${direction}, ${bgColor1} 0%, ${bgColor2} 100%)`;
            } else if (isCover) {
                const themeCoverGradients = {
                    'default': 'linear-gradient(180deg, #f3f3f3 0%, #f9f9f9 100%)',
                    'playful-geometric': 'linear-gradient(135deg, #8B5CF6 0%, #F472B6 100%)',
                    'neo-brutalism': 'linear-gradient(135deg, #FF4757 0%, #FECA57 100%)',
                    'botanical': 'linear-gradient(135deg, #4A7C59 0%, #8FBC8F 100%)',
                    'professional': 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    'retro': 'linear-gradient(135deg, #D35400 0%, #F39C12 100%)',
                    'terminal': 'linear-gradient(135deg, #0D1117 0%, #161B22 100%)',
                    'sketch': 'linear-gradient(135deg, #555555 0%, #888888 100%)'
                };
                card.style.background = themeCoverGradients[state.currentTheme] || themeCoverGradients['default'];
            } else {
                const themeBgColors = {
                    'default': '#ffffff',
                    'playful-geometric': '#ffffff',
                    'neo-brutalism': '#ffffff',
                    'botanical': '#ffffff',
                    'professional': '#ffffff',
                    'retro': '#ffffff',
                    'terminal': '#ffffff',
                    'sketch': '#ffffff'
                };
                card.style.background = themeBgColors[state.currentTheme] || '#ffffff';
            }
            
            // Fix cover card inner background (the white/gray area inside cover)
            if (isCover) {
                const coverInner = card.querySelector('.cover-inner');
                if (coverInner) {
                    coverInner.style.background = '#F3F3F3';
                }
                
                // Fix title area - use solid colors instead of gradient text for PNG export
                // (html2canvas doesn't support -webkit-background-clip: text well)
                const coverTitle = card.querySelector('.cover-title');
                if (coverTitle) {
                    const theme = state.currentTheme;
                    const config = themeConfig[theme] || themeConfig['default'];
                    const solidColor = config.solidColor;
                    
                    // Apply solid color instead of gradient text
                    coverTitle.style.background = 'none';
                    coverTitle.style.webkitBackgroundClip = 'initial';
                    coverTitle.style.backgroundClip = 'initial';
                    coverTitle.style.webkitTextFillColor = 'initial';
                    coverTitle.style.color = solidColor;
                }
            }
            
            // Fix content card - ensure full content is visible
            if (!isCover) {
                const cardContainer = card.querySelector('.card-container');
                const cardInner = card.querySelector('.card-inner');
                
                if (cardContainer) {
                    cardContainer.style.overflow = 'visible';
                    cardContainer.style.minHeight = 'auto';
                }
                if (cardInner) {
                    cardInner.style.minHeight = 'auto';
                    cardInner.style.overflow = 'visible';
                }
                
                // Remove overflow:hidden from content card to show all content
                card.style.overflow = 'visible';
                card.style.minHeight = 'auto';
                
                // Fix code blocks - use !important to override preview styles
                const preBlocks = card.querySelectorAll('.card-content pre');
                preBlocks.forEach(el => {
                    el.setAttribute('style', 
                        el.getAttribute('style') + 
                        '; background: #1e293b !important; color: #e2e8f0 !important; padding: 40px !important; margin: 35px 0 !important; font-size: 18px !important; overflow: visible !important; white-space: pre-wrap !important;'
                    );
                });
                
                // Fix inline code
                const inlineCode = card.querySelectorAll('.card-content code:not(pre code)');
                inlineCode.forEach(el => {
                    el.setAttribute('style', 
                        el.getAttribute('style') + 
                        '; background: #f1f5f9 !important; color: #6366f1 !important; padding: 6px 16px !important; font-size: 16px !important;'
                    );
                });
                
                // Fix pre code
                const preCode = card.querySelectorAll('.card-content pre code');
                preCode.forEach(el => {
                    el.setAttribute('style', 
                        el.getAttribute('style') + 
                        '; background: transparent !important; color: inherit !important;'
                    );
                });
                
                console.log('[Export] Fixed code blocks with !important styles');
            }
            
            const label = wrapper.querySelector('.card-label')?.textContent || `卡片_${i + 1}`;
            // Sanitize filename - remove special characters
            const sanitizedLabel = label.replace(/[^\w\u4e00-\u9fa5\s-]/g, '').replace(/\s+/g, '_');
            const filename = `${sanitizedLabel}.png`;
            
            console.log(`[Export] Exporting card ${i + 1}/${cardWrappers.length}: ${filename}`);
            
            await exportCardToPng(card, filename, { scale: 2 });
            
            // Small delay between exports
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('[Export] All exports completed successfully!');
    } catch (err) {
        console.error('导出失败:', err);
        alert('导出失败: ' + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function initEventListeners() {
    elements.markdownInput.addEventListener('input', debounce(() => {
        renderCards().catch(err => console.error('Render failed:', err));
    }, DEBOUNCE_DELAY.RENDER));
    elements.markdownInput.addEventListener('paste', async (e) => {
        try {
            await handlePaste(e);
        } catch (err) {
            console.error('Paste handling failed:', err);
        }
    });
    
    elements.themeSelect.addEventListener('change', (e) => switchTheme(e.target.value));
    
    elements.clearBtn.addEventListener('click', async () => {
        try {
            if (confirm('确定要清空所有内容吗？')) {
                elements.markdownInput.value = '';
                await renderCards();
            }
        } catch (err) {
            console.error('Clear failed:', err);
        }
    });

    elements.sampleBtn.addEventListener('click', async () => {
        try {
            elements.markdownInput.value = sampleMarkdown;
            await renderCards();
        } catch (err) {
            console.error('Sample load failed:', err);
        }
    });

    elements.refreshBtn.addEventListener('click', async () => {
        try {
            await renderCards();
        } catch (err) {
            console.error('Refresh failed:', err);
        }
    });
    
    elements.downloadBtn.addEventListener('click', async () => {
        await handleExport(elements.downloadBtn);
    });
    
    elements.applyBgBtn.addEventListener('click', applyCustomBackground);
    elements.resetBgBtn.addEventListener('click', resetBackground);
    
    elements.bgColor1.addEventListener('change', applyCustomBackground);
    elements.bgColor2.addEventListener('change', applyCustomBackground);
    elements.gradientDirection.addEventListener('change', applyCustomBackground);
    
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.c1, btn.dataset.c2);
        });
    });
    
    elements.applySizeBtn.addEventListener('click', applyCardSize);
    elements.resetSizeBtn.addEventListener('click', resetCardSize);
    
    elements.sizePresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.sizePresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applySizePreset(btn.dataset.w, btn.dataset.h);
        });
    });
}

// ============================================
// 图片粘贴功能
// ============================================

async function handlePaste(e) {
    const items = e.clipboardData.items;
    
    for (const item of items) {
        const type = item.type || '';
        
        if (type.startsWith('image/') || type === 'image') {
            e.preventDefault();
            e.stopPropagation();
            
            let blob = item.getAsFile();
            
            if (!blob && item.getAs) {
                try {
                    blob = await item.getAs(window.Blob);
                } catch (err) {
                    console.warn('Failed to get blob:', err);
                }
            }
            
            if (!blob) {
                console.warn('No image data found');
                alert('无法读取图片数据，请尝试复制图片后直接粘贴');
                return;
            }
            
            if (blob.size > MAX_IMAGE_SIZE) {
                alert('图片过大，请使用小于10MB的图片');
                return;
            }
            
            if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
                alert('不支持的图片格式，请使用 JPEG、PNG、GIF 或 WebP 格式');
                return;
            }
            
            console.log('Image blob type:', blob.type, 'size:', blob.size);
            
            const base64 = await fileToBase64(blob);
            console.log('Base64 length:', base64.length);
            
            const imageId = 'img_' + Date.now() + '_' + crypto.randomUUID();
            console.log('Saving image with ID:', imageId);
            
            await ImageStore.save(imageId, base64);
            console.log('Image saved to IndexedDB');
            
            const imageMarkdown = `\n![img:${imageId}]\n`;
            insertTextAtCursor(imageMarkdown);
            await renderCards();
            console.log('Render complete');
            return;
        }
    }
    
    // Fallback: check if HTML clipboard contains image
    const html = e.clipboardData.getData('text/html');
    const imgMatch = html && html.match(/<img[^>]+src=["']([^"']+)["']/i);
    
    if (imgMatch) {
        e.preventDefault();
        e.stopPropagation();
        
        const src = imgMatch[1];
        console.log('Found image in HTML:', src.substring(0, 50) + '...');
        
        if (src.startsWith('data:image/')) {
            const imageId = 'img_' + Date.now() + '_' + crypto.randomUUID();
            await ImageStore.save(imageId, src);
            const imageMarkdown = `\n![img:${imageId}]\n`;
            insertTextAtCursor(imageMarkdown);
            await renderCards();
        } else if (src.startsWith('http')) {
            try {
                const response = await fetch(src);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const blob = await response.blob();
                
                if (blob.size > MAX_IMAGE_SIZE) {
                    alert('图片过大，请使用小于10MB的图片');
                    return;
                }
                
                if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
                    alert('不支持的图片格式，请使用 JPEG、PNG、GIF 或 WebP 格式');
                    return;
                }
                
                const base64 = await fileToBase64(blob);
                const imageId = 'img_' + Date.now() + '_' + crypto.randomUUID();
                await ImageStore.save(imageId, base64);
                const imageMarkdown = `\n![img:${imageId}]\n`;
                insertTextAtCursor(imageMarkdown);
                await renderCards();
            } catch (err) {
                console.warn('Failed to fetch image:', err);
                alert('无法加载图片，请尝试直接复制图片文件');
            }
        }
    } else {
        console.log('No image found in clipboard. Items:', Array.from(items).map(i => i.type));
    }
}

function fileToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function insertImages(images) {
    const imageIds = [];
    
    for (const data of images) {
        const imageId = 'img_' + Date.now() + '_' + crypto.randomUUID();
        await ImageStore.save(imageId, data);
        imageIds.push(imageId);
    }
    
    let imageMarkdown = '';
    
    if (imageIds.length === 1) {
        imageMarkdown = `\n![img:${imageIds[0]}]\n`;
    } else {
        imageMarkdown = `\n<div class="image-gallery gallery-horizontal">\n`;
        imageIds.forEach((id, i) => {
            imageMarkdown += `  ![img:${id}]\n`;
        });
        imageMarkdown += `</div>\n`;
    }
    
    insertTextAtCursor(imageMarkdown);
    renderCards();
}

function insertTextAtCursor(text) {
    const input = elements.markdownInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = input.value;
    input.value = value.substring(0, start) + text + value.substring(end);
    input.selectionStart = input.selectionEnd = start + text.length;
    input.focus();
}

// ============================================
// 初始化
// ============================================

async function init() {
    await ImageStore.init();
    switchTheme('default');
    initEventListeners();
    elements.markdownInput.value = sampleMarkdown;
    renderCards();
    console.log('📝 小红书卡片渲染器已初始化');
}

document.addEventListener('DOMContentLoaded', init);
