/**
 * Card Renderer - Generate card HTML
 */

import { calculateTitleSize } from '../constants.js';
import { themeTitleGradients } from '../state.js';
import { convertMarkdownToHtml, sanitizeText } from '../parsers/markdown.js';

/**
 * Generate cover card HTML
 * @param {Object} metadata - Card metadata (title, subtitle, emoji)
 * @param {string} theme - Current theme name
 * @returns {string} HTML string
 */
export function generateCoverHtml(metadata, theme) {
    const emoji = sanitizeText(metadata.emoji) || '📝';
    let title = sanitizeText(metadata.title || '标题').slice(0, 20);
    let subtitle = sanitizeText(metadata.subtitle || '').slice(0, 20);
    
    const titleLen = title.length;
    const titleSize = calculateTitleSize(titleLen);
    
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
 * Generate content card HTML
 * @param {string} content - Markdown content
 * @param {number} pageNumber - Current page number
 * @param {number} totalPages - Total number of pages
 * @returns {Promise<string>} HTML string
 */
export function generateCardHtml(content, pageNumber, totalPages) {
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

/**
 * Render all cards to the DOM
 * @param {HTMLElement} container - Container element
 * @param {string} markdownContent - Full markdown content
 * @param {string} currentTheme - Current theme
 */
export async function renderCards(container, markdownContent, currentTheme) {
    const { parseMarkdown, splitContentBySeparator } = await import('../parsers/markdown.js');
    
    if (!markdownContent.trim()) {
        container.innerHTML = '';
        return;
    }
    
    const { metadata, body } = parseMarkdown(markdownContent);
    const cardContents = splitContentBySeparator(body);
    
    container.innerHTML = '';
    container.className = `cards-list theme-${currentTheme}`;
    
    if (metadata.title || metadata.emoji) {
        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'card-wrapper';
        coverWrapper.innerHTML = `
            <div class="card-label">封面</div>
            <div class="cover-card">
                ${generateCoverHtml(metadata, currentTheme)}
            </div>
        `;
        container.appendChild(coverWrapper);
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
        container.appendChild(cardWrapper);
    }
    
    // Handle image errors
    container.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            console.warn(`Failed to load image: ${this.src?.substring(0, 100)}...`);
            this.style.display = 'none';
            this.classList.add('image-error');
        };
    });
}

export default { generateCoverHtml, generateCardHtml, renderCards };
