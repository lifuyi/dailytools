/**
 * Markdown Parser - Parse and convert Markdown content
 */

import { IMAGE_ID_PREFIX } from '../constants.js';
import imageStore from '../services/ImageStore.js';

// HTML Sanitization (XSS Prevention)
function sanitizeText(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

/**
 * Parse YAML frontmatter from Markdown content
 * @param {string} content - Full Markdown content
 * @returns {Object} { metadata, body }
 */
export function parseMarkdown(content) {
    const yamlPattern = /^---([\s\S]*?)---/;
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

/**
 * Parse simple YAML content
 * @param {string} content - YAML content string
 * @returns {Object} Parsed YAML object
 */
export function parseYaml(content) {
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

/**
 * Split content by separator
 * @param {string} body - Markdown body content
 * @returns {string[]} Array of card contents
 */
export function splitContentBySeparator(body) {
    return body.split(/\n---+/).map(p => p.trim()).filter(p => p);
}

/**
 * Convert Markdown to HTML with image and tag support
 * @param {string} mdContent - Markdown content
 * @returns {Promise<string>} HTML content
 */
export async function convertMarkdownToHtml(mdContent) {
    // Process IndexedDB image references ![img:id]
    const imagePattern = new RegExp(`!\\[${IMAGE_ID_PREFIX}:([^\\]]+)\\]`, 'g');
    const imageMatches = [];
    
    let match;
    while ((match = imagePattern.exec(mdContent)) !== null) {
        imageMatches.push(match[1]);
    }
    
    // Load all images
    for (const id of imageMatches) {
        const src = await imageStore.get(id);
        if (src) {
            mdContent = mdContent.replace(`![${IMAGE_ID_PREFIX}:${id}]`, `![图片](${src})`);
        } else {
            mdContent = mdContent.replace(`![${IMAGE_ID_PREFIX}:${id}]`, '');
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
                tagsHtml += `<span class="tag">${sanitizeText(tag)}</span>`;
            });
            tagsHtml += '</div>';
        }
        mdContent = mdContent.slice(0, tagsMatch.index).trim();
    }
    
    const html = marked.parse(mdContent, { breaks: true, gfm: true });
    return html + tagsHtml;
}

export { sanitizeText, sanitizeHtml };
