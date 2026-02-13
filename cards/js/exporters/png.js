/**
 * PNG Exporter - Export cards as PNG images
 */

import { appState, themeCoverGradients, themeBgColors } from '../state.js';
import { downloadFile } from './html.js';

// Layout properties to copy when cloning elements
const LAYOUT_PROPERTIES = [
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

/**
 * Get the base URL for the current page
 * @returns {string} Base URL
 */
export function getBaseUrl() {
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    return baseUrl;
}

/**
 * Fetch CSS content from a URL
 * @param {string} url - CSS URL to fetch
 * @returns {Promise<string>} CSS content
 */
export async function fetchCssContent(url) {
    if (!url) return '';
    
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
export async function injectExportStyles() {
    const baseCssUrl = getBaseUrl() + '/styles.css';
    const baseCss = await fetchCssContent(baseCssUrl);
    if (baseCss) {
        injectCss(baseCss, 'export-base-css');
        console.log('[Export] Base styles injected');
    }
    
    const themeLink = document.getElementById('theme-css');
    const themeHref = themeLink?.href || '';
    if (themeHref) {
        let themeUrl = themeHref;
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
 * Apply computed styles to a cloned element recursively
 * @param {Element} original - Original element
 * @param {Element} clone - Cloned element to apply styles to
 */
function applyInlineStyles(original, clone) {
    const originalStyle = window.getComputedStyle(original);
    
    for (const prop of LAYOUT_PROPERTIES) {
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
 * Collect card data from the DOM for export
 * @param {HTMLElement} container - Cards container element
 * @returns {Object} Object containing card HTML array and dimensions
 */
export function collectCardsData(container) {
    const cardWrappers = container.querySelectorAll('.card-wrapper');
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
    
    const containerStyle = window.getComputedStyle(container);
    const width = parseFloat(containerStyle.getPropertyValue('--card-width')) || 360;
    const height = parseFloat(containerStyle.getPropertyValue('--card-height')) || 480;
    
    return { cardsHtml, width, height };
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
 * Export a single card element to PNG
 * @param {HTMLElement} cardElement - Card element to export
 * @param {string} filename - Output filename
 * @param {Object} options - Export options (scale, backgroundColor)
 * @returns {Promise<boolean>} Success status
 */
async function exportCardToPng(cardElement, filename, options = {}) {
    const scale = options.scale || 2;
    
    console.log(`[Export] Starting export for: ${filename}`);
    
    try {
        let canvas;
        
        try {
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
            canvas = await domtoimage.toCanvas(cardElement, {
                pixelRatio: scale
            });
        }
        
        const dataUrl = canvas.toDataURL('image/png');
        
        if (dataUrl.length < 1000) {
            console.error(`[Export] Blank canvas detected for ${filename}`);
            throw new Error('导出生成空白图片');
        }
        
        downloadCanvasAsPng(canvas, filename);
        console.log(`[Export] Successfully exported: ${filename}`);
        
        return true;
    } catch (error) {
        console.error(`[Export] Failed to export ${filename}:`, error);
        throw error;
    }
}

/**
 * Prepare card for PNG export by applying theme-specific styles
 * @param {HTMLElement} card - Card element
 * @param {boolean} isCover - Whether this is a cover card
 * @param {string} theme - Current theme
 */
function prepareCardForExport(card, isCover, theme) {
    const state = appState.getState();
    const container = document.getElementById('cards-container');
    const containerStyle = window.getComputedStyle(container);
    
    const hasCustomBg = container.classList.contains('custom-bg');
    
    if (hasCustomBg) {
        const bgColor1 = containerStyle.getPropertyValue('--bg-color-1').trim() || '#6366f1';
        const bgColor2 = containerStyle.getPropertyValue('--bg-color-2').trim() || '#8b5cf6';
        const direction = containerStyle.getPropertyValue('--gradient-direction').trim() || '135deg';
        card.style.background = `linear-gradient(${direction}, ${bgColor1} 0%, ${bgColor2} 100%)`;
    } else if (isCover) {
        card.style.background = themeCoverGradients[theme] || themeCoverGradients['default'];
    } else {
        card.style.background = themeBgColors[theme] || '#ffffff';
    }
    
    if (isCover) {
        const coverInner = card.querySelector('.cover-inner');
        if (coverInner) {
            coverInner.style.background = '#F3F3F3';
        }
        
        const coverTitle = card.querySelector('.cover-title');
        if (coverTitle) {
            const config = window.themeConfig?.[theme] || window.themeConfig?.['default'];
            const solidColor = config?.solidColor || '#1F2937';
            coverTitle.style.background = 'none';
            coverTitle.style.webkitBackgroundClip = 'initial';
            coverTitle.style.backgroundClip = 'initial';
            coverTitle.style.webkitTextFillColor = 'initial';
            coverTitle.style.color = solidColor;
        }
    } else {
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
        
        card.style.overflow = 'visible';
        card.style.minHeight = 'auto';
        
        // Fix code blocks
        const preBlocks = card.querySelectorAll('.card-content pre');
        preBlocks.forEach(el => {
            el.setAttribute('style', 
                el.getAttribute('style') + 
                '; background: #1e293b !important; color: #e2e8f0 !important; padding: 40px !important; margin: 35px 0 !important; font-size: 18px !important; overflow: visible !important; white-space: pre-wrap !important;'
            );
        });
        
        const inlineCode = card.querySelectorAll('.card-content code:not(pre code)');
        inlineCode.forEach(el => {
            el.setAttribute('style', 
                el.getAttribute('style') + 
                '; background: #f1f5f9 !important; color: #6366f1 !important; padding: 6px 16px !important; font-size: 16px !important;'
            );
        });
        
        const preCode = card.querySelectorAll('.card-content pre code');
        preCode.forEach(el => {
            el.setAttribute('style', 
                el.getAttribute('style') + 
                '; background: transparent !important; color: inherit !important;'
            );
        });
    }
}

/**
 * Handle card export - exports HTML first, then PNGs
 * @param {HTMLElement} btn - Export button element
 * @param {HTMLElement} container - Cards container element
 * @param {Function} generateExportHTML - HTML generator function
 */
export async function handleExport(btn, container, generateExportHTML) {
    const cardWrappers = container.querySelectorAll('.card-wrapper');

    if (cardWrappers.length === 0) {
        alert('没有可导出的卡片');
        return;
    }

    const originalText = btn.textContent;
    btn.textContent = '导出中...';
    btn.disabled = true;

    try {
        const { cardsHtml, width, height } = collectCardsData(container);
        const fullHtml = generateExportHTML(cardsHtml, width, height);
        downloadFile(fullHtml, 'xiaohongshu-cards.html');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await injectExportStyles();
        
        const theme = appState.getTheme();
        
        for (let i = 0; i < cardWrappers.length; i++) {
            const wrapper = cardWrappers[i];
            const card = wrapper.querySelector('.cover-card, .content-card');
            const isCover = wrapper.querySelector('.cover-card') !== null;
            
            if (!card) continue;
            
            prepareCardForExport(card, isCover, theme);
            
            const label = wrapper.querySelector('.card-label')?.textContent || `卡片_${i + 1}`;
            const sanitizedLabel = label.replace(/[^\w\u4e00-\u9fa5\s-]/g, '').replace(/\s+/g, '_');
            const filename = `${sanitizedLabel}.png`;
            
            await exportCardToPng(card, filename, { scale: 2 });
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

export default { 
    getBaseUrl, 
    fetchCssContent, 
    injectExportStyles, 
    collectCardsData, 
    handleExport 
};
