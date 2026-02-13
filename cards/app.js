/**
 * 小红书卡片渲染器 - Web版 (ES Modules)
 */

// Imports
import { SAMPLE_MARKDOWN, MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES, DEBOUNCE_DELAY } from './js/constants.js';
import { appState, themeConfig } from './js/state.js';
import imageStore from './js/services/ImageStore.js';
import { renderCards } from './js/renderers/card.js';
import { generateExportHTML } from './js/exporters/html.js';
import { handleExport } from './js/exporters/png.js';

// Make themeConfig available globally for PNG exporter
window.themeConfig = themeConfig;

// ============================================
// DOM Elements
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
// Theme Switching
// ============================================

async function switchTheme(theme) {
    appState.setTheme(theme);
    elements.themeCss.href = `themes/${theme}.css`;
    await renderCards(elements.cardsContainer, elements.markdownInput.value, theme);
}

// ============================================
// Background Controls
// ============================================

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
        
        appState.setCustomBackground({ enabled: true, color1, color2, direction });
        
        elements.cardsContainer.classList.add('custom-bg');
        elements.cardsContainer.style.setProperty('--bg-color-1', color1);
        elements.cardsContainer.style.setProperty('--bg-color-2', color2);
        elements.cardsContainer.style.setProperty('--gradient-direction', direction);
    } catch (error) {
        console.error('applyCustomBackground error:', error);
    }
}

function resetBackground() {
    appState.resetCustomBackground();
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

// ============================================
// Card Size Controls
// ============================================

function applyCardSize() {
    const width = parseInt(elements.cardWidth.value) || 360;
    const height = parseInt(elements.cardHeight.value) || 480;
    
    appState.setCardSize({ width, height });
    
    elements.cardsContainer.style.setProperty('--card-width', width + 'px');
    elements.cardsContainer.style.setProperty('--card-height', height + 'px');
    elements.cardsContainer.style.setProperty('--cover-inner-width', Math.floor(width * 0.88) + 'px');
    elements.cardsContainer.style.setProperty('--cover-inner-height', Math.floor(height * 0.91) + 'px');
}

function resetCardSize() {
    appState.resetCardSize();
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
// Event Handlers
// ============================================

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ============================================
// Image Paste Handling
// ============================================

function fileToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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

async function insertImages(images) {
    const imageIds = [];
    
    for (const data of images) {
        const imageId = imageStore.generateImageId();
        await imageStore.save(imageId, data);
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
    renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
}

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
            
            const base64 = await fileToBase64(blob);
            const imageId = imageStore.generateImageId();
            await imageStore.save(imageId, base64);
            
            const imageMarkdown = `\n![img:${imageId}]\n`;
            insertTextAtCursor(imageMarkdown);
            await renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
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
        
        if (src.startsWith('data:image/')) {
            const imageId = imageStore.generateImageId();
            await imageStore.save(imageId, src);
            const imageMarkdown = `\n![img:${imageId}]\n`;
            insertTextAtCursor(imageMarkdown);
            await renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
        } else if (src.startsWith('http')) {
            try {
                const response = await fetch(src);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
                const imageId = imageStore.generateImageId();
                await imageStore.save(imageId, base64);
                const imageMarkdown = `\n![img:${imageId}]\n`;
                insertTextAtCursor(imageMarkdown);
                await renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
            } catch (err) {
                console.warn('Failed to fetch image:', err);
                alert('无法加载图片，请尝试直接复制图片文件');
            }
        }
    }
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Markdown input
    elements.markdownInput.addEventListener('input', debounce(() => {
        renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme())
            .catch(err => console.error('Render failed:', err));
    }, DEBOUNCE_DELAY.RENDER));
    
    elements.markdownInput.addEventListener('paste', async (e) => {
        try {
            await handlePaste(e);
        } catch (err) {
            console.error('Paste handling failed:', err);
        }
    });
    
    // Theme select
    elements.themeSelect.addEventListener('change', (e) => switchTheme(e.target.value));
    
    // Toolbar buttons
    elements.clearBtn.addEventListener('click', async () => {
        if (confirm('确定要清空所有内容吗？')) {
            elements.markdownInput.value = '';
            await renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
        }
    });

    elements.sampleBtn.addEventListener('click', async () => {
        elements.markdownInput.value = SAMPLE_MARKDOWN;
        await renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
    });

    elements.refreshBtn.addEventListener('click', async () => {
        await renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
    });
    
    // Export button
    elements.downloadBtn.addEventListener('click', async () => {
        await handleExport(elements.downloadBtn, elements.cardsContainer, generateExportHTML);
    });
    
    // Background controls
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
    
    // Size controls
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
// Initialization
// ============================================

async function init() {
    await imageStore.init();
    await switchTheme('default');
    initEventListeners();
    elements.markdownInput.value = SAMPLE_MARKDOWN;
    await renderCards(elements.cardsContainer, elements.markdownInput.value, appState.getTheme());
    console.log('📝 小红书卡片渲染器已初始化 (ES Modules)');
}

document.addEventListener('DOMContentLoaded', init);