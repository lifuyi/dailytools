/**
 * Constants - Application-wide constants
 */

// Image upload constraints
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Debounce delays
export const DEBOUNCE_DELAY = { RENDER: 300 };

// Image ID prefix for IndexedDB
export const IMAGE_ID_PREFIX = 'img_';

// Default card dimensions
export const DEFAULT_CARD_SIZE = { width: 360, height: 480 };

// IndexedDB configuration
export const IMAGE_STORE_CONFIG = {
    dbName: 'CardImagesDB',
    storeName: 'images',
    maxStorageItems: 50,
    maxStorageBytes: 50 * 1024 * 1024 // 50MB
};

// Sample Markdown content
export const SAMPLE_MARKDOWN = `---
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

// Title size calculation based on length
export function calculateTitleSize(titleLen) {
    if (titleLen <= 6) return 52;
    if (titleLen <= 10) return 46;
    if (titleLen <= 18) return 36;
    return 28;
}