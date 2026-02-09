/**
 * 小红书卡片渲染器 - Web版
 */

// ============================================
// IndexedDB 图片存储
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
        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            store.getAll().onsuccess = (e) => resolve(e.target.result);
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
// 配置与状态
// ============================================
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

![示例图片](https://via.placeholder.com/600x400/6366f1/ffffff?text=小红书)

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
    const lines = content.split('\n');
    
    for (const line of lines) {
        const match = line.match(/^([\w]+):\s*(.*)$/);
        if (match) {
            result[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
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
    
    for (let index = 0; index < cardContents.length; index++) {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'card-wrapper';
        const htmlContent = await generateCardHtml(cardContents[index], index + 1, cardContents.length);
        cardWrapper.innerHTML = `
            <div class="card-label">卡片 ${index + 1}</div>
            <div class="content-card">
                ${htmlContent}
            </div>
        `;
        elements.cardsContainer.appendChild(cardWrapper);
    }
}

async function switchTheme(theme) {
    state.currentTheme = theme;
    elements.themeCss.href = `themes/${theme}.css`;
    await renderCards();
}

function applyCustomBackground() {
    const { value: color1 } = elements.bgColor1;
    const { value: color2 } = elements.bgColor2;
    const { value: direction } = elements.gradientDirection;
    
    state.customBackground = { enabled: true, color1, color2, direction };
    
    elements.cardsContainer.classList.add('custom-bg');
    elements.cardsContainer.style.setProperty('--bg-color-1', color1);
    elements.cardsContainer.style.setProperty('--bg-color-2', color2);
    elements.cardsContainer.style.setProperty('--gradient-direction', direction);
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

function initEventListeners() {
    elements.markdownInput.addEventListener('input', debounce(() => {
        renderCards();
    }, 300));
    elements.markdownInput.addEventListener('paste', handlePaste);
    
    elements.themeSelect.addEventListener('change', (e) => switchTheme(e.target.value));
    
    elements.clearBtn.addEventListener('click', async () => {
        if (confirm('确定要清空所有内容吗？')) {
            elements.markdownInput.value = '';
            await renderCards();
        }
    });
    
    elements.sampleBtn.addEventListener('click', async () => {
        elements.markdownInput.value = sampleMarkdown;
        await renderCards();
    });
    
    elements.refreshBtn.addEventListener('click', async () => {
        await renderCards();
    });
    
    elements.downloadBtn.addEventListener('click', () => {
        alert('请使用浏览器截图功能（Cmd+Shift+4 或 Win+Shift+S）截取右侧预览区域。');
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
    
    // First try to find direct image data
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
            
            console.log('Image blob type:', blob.type, 'size:', blob.size);
            
            const base64 = await fileToBase64(blob);
            console.log('Base64 length:', base64.length);
            
            const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
            const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await ImageStore.save(imageId, src);
            const imageMarkdown = `\n![img:${imageId}]\n`;
            insertTextAtCursor(imageMarkdown);
            await renderCards();
        } else if (src.startsWith('http')) {
            try {
                const response = await fetch(src);
                const blob = await response.blob();
                const base64 = await fileToBase64(blob);
                const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
        const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
