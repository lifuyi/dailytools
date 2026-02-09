/**
 * 小红书卡片渲染器 - Web版
 * 核心逻辑：Markdown 解析、主题切换、实时预览
 */

// ============================================
// 配置与状态
// ============================================
const state = {
    currentTheme: 'default',
    markdownContent: '',
    parsedData: null,
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

// 主题标题渐变映射
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

// 示例内容
const sampleMarkdown = `---
title: 我的第一篇小红书
subtitle: 分享生活点滴
emoji: 📝
---

# 欢迎来到小红书

这是一段**加粗**的文字，还有*斜体*和\`代码\`。

## 列表示例

- 第一项：这是一个列表项
- 第二项：又一个列表项
- 第三项：列表项内容

## 引用块

> 这是一个引用块，用来突出显示重要内容。

## 代码示例

\`\`\`javascript
const greeting = "Hello, 小红书!";
console.log(greeting);
\`\`\`

---

# 第二张卡片

你可以用 \`---\` 分隔符来创建多张卡片。

## 链接示例

[点击访问小红书](https://www.xiaohongshu.com)

## 图片示例

![示例图片](https://via.placeholder.com/600x400/6366f1/ffffff?text=小红书)

#标签1 #标签2 #小红书
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

/**
 * 解析 Markdown 文件，提取 YAML 头部和正文
 */
function parseMarkdown(content) {
    // 解析 YAML 头部
    const yamlPattern = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const yamlMatch = content.match(yamlPattern);
    
    let metadata = {};
    let body = content;
    
    if (yamlMatch) {
        try {
            // 简单解析 YAML
            const yamlContent = yamlMatch[1];
            metadata = parseYaml(yamlContent);
        } catch (e) {
            console.error('YAML 解析失败:', e);
        }
        body = content.slice(yamlMatch[0].length);
    }
    
    return {
        metadata,
        body: body.trim()
    };
}

/**
 * 简单 YAML 解析器
 */
function parseYaml(content) {
    const result = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
        const match = line.match(/^([\w]+):\s*(.*)$/);
        if (match) {
            const [, key, value] = match;
            result[key] = value.trim().replace(/^["']|["']$/g, '');
        }
    }
    
    return result;
}

/**
 * 按分隔符拆分内容为多张卡片
 */
function splitContentBySeparator(body) {
    const parts = body.split(/\n---+/);
    return parts.map(p => p.trim()).filter(p => p);
}

/**
 * 转换 Markdown 为 HTML
 */
function convertMarkdownToHtml(mdContent) {
    // 处理 tags（以 # 开头的标签）
    const tagsPattern = /((?:#[\w\u4e00-\u9fa5]+\s*)+)$/m;
    const tagsMatch = mdContent.match(tagsPattern);
    let tagsHtml = '';
    
    if (tagsMatch) {
        const tagsStr = tagsMatch[1];
        mdContent = mdContent.slice(0, tagsMatch.index).trim();
        const tags = tagsStr.match(/#([\w\u4e00-\u9fa5]+)/g);
        if (tags) {
            tagsHtml = '<div class="tags-container">';
            for (const tag of tags) {
                tagsHtml += `<span class="tag">${tag}</span>`;
            }
            tagsHtml += '</div>';
        }
    }
    
    // 使用 marked.js 转换 Markdown
    const html = marked.parse(mdContent, {
        breaks: true,
        gfm: true
    });
    
    return html + tagsHtml;
}

// ============================================
// HTML 生成
// ============================================

/**
 * 生成封面 HTML
 */
function generateCoverHtml(metadata, theme) {
    const emoji = metadata.emoji || '📝';
    let title = metadata.title || '标题';
    let subtitle = metadata.subtitle || '';
    
    // 限制长度
    if (title.length > 20) title = title.slice(0, 20);
    if (subtitle.length > 20) subtitle = subtitle.slice(0, 20);
    
    // 动态调整标题大小
    const titleLen = title.length;
    let titleSize;
    if (titleLen <= 6) titleSize = 52;
    else if (titleLen <= 10) titleSize = 46;
    else if (titleLen <= 18) titleSize = 36;
    else titleSize = 28;
    
    const titleGradient = themeTitleGradients[theme] || themeTitleGradients['default'];
    
    return `
        <div class="cover-inner">
            <div class="cover-emoji">${emoji}</div>
            <div class="cover-title" style="font-size: ${titleSize}px; background: ${titleGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${title}</div>
            <div class="cover-subtitle">${subtitle}</div>
        </div>
    `;
}

/**
 * 生成正文卡片 HTML
 */
function generateCardHtml(content, pageNumber, totalPages) {
    const htmlContent = convertMarkdownToHtml(content);
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
}

// ============================================
// 渲染逻辑
// ============================================

/**
 * 渲染所有卡片
 */
function renderCards() {
    const content = elements.markdownInput.value;
    if (!content.trim()) {
        elements.cardsContainer.innerHTML = '';
        return;
    }
    
    // 解析 Markdown
    const { metadata, body } = parseMarkdown(content);
    
    // 分割内容
    const cardContents = splitContentBySeparator(body);
    
    // 清空容器
    elements.cardsContainer.innerHTML = '';
    
    // 添加主题类
    elements.cardsContainer.className = `cards-list theme-${state.currentTheme}`;
    
    // 生成封面（如果有标题或 emoji）
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
    
    // 生成正文卡片
    cardContents.forEach((cardContent, index) => {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'card-wrapper';
        const pageNum = index + 1;
        cardWrapper.innerHTML = `
            <div class="card-label">卡片 ${pageNum}</div>
            <div class="content-card">
                ${generateCardHtml(cardContent, pageNum, cardContents.length)}
            </div>
        `;
        elements.cardsContainer.appendChild(cardWrapper);
    });
}

/**
 * 切换主题
 */
function switchTheme(theme) {
    state.currentTheme = theme;
    elements.themeCss.href = `themes/${theme}.css`;
    renderCards();
}

function applyCustomBackground() {
    const color1 = elements.bgColor1.value;
    const color2 = elements.bgColor2.value;
    const direction = elements.gradientDirection.value;

    state.customBackground = {
        enabled: true,
        color1,
        color2,
        direction
    };

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

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initEventListeners() {
    const debouncedRender = debounce(renderCards, 300);
    elements.markdownInput.addEventListener('input', debouncedRender);

    elements.themeSelect.addEventListener('change', (e) => {
        switchTheme(e.target.value);
    });

    elements.clearBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有内容吗？')) {
            elements.markdownInput.value = '';
            renderCards();
        }
    });

    elements.sampleBtn.addEventListener('click', () => {
        elements.markdownInput.value = sampleMarkdown;
        renderCards();
    });

    elements.refreshBtn.addEventListener('click', () => {
        renderCards();
    });

    elements.downloadBtn.addEventListener('click', () => {
        alert('请使用浏览器截图功能（Cmd+Shift+4 或 Win+Shift+S）截取右侧预览区域。\n\n提示：可以将浏览器窗口调整为只显示右侧预览，获得最佳效果。');
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
            const c1 = btn.dataset.c1;
            const c2 = btn.dataset.c2;
            applyPreset(c1, c2);
        });
    });

    elements.applySizeBtn.addEventListener('click', applyCardSize);

    elements.resetSizeBtn.addEventListener('click', resetCardSize);

    elements.sizePresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.sizePresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const w = btn.dataset.w;
            const h = btn.dataset.h;
            applySizePreset(w, h);
        });
    });
}

// ============================================
// 初始化
// ============================================

function init() {
    // 加载默认主题
    switchTheme('default');
    
    // 绑定事件
    initEventListeners();
    
    // 加载示例内容
    elements.markdownInput.value = sampleMarkdown;
    renderCards();
    
    console.log('📝 小红书卡片渲染器已初始化');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
