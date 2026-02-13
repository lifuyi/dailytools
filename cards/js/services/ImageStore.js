/**
 * ImageStore - IndexedDB storage for images
 */

import { IMAGE_STORE_CONFIG, IMAGE_ID_PREFIX } from '../constants.js';

class ImageStore {
    constructor() {
        this.db = null;
        this.dbName = IMAGE_STORE_CONFIG.dbName;
        this.storeName = IMAGE_STORE_CONFIG.storeName;
        this.maxStorageItems = IMAGE_STORE_CONFIG.maxStorageItems;
        this.maxStorageBytes = IMAGE_STORE_CONFIG.maxStorageBytes;
    }

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
    }

    async save(id, data) {
        await this.autoCleanup();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.put({ id, data, timestamp: Date.now() });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async get(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result?.data);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            transaction.objectStore(this.storeName).delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async clear() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getStorageSize() {
        const all = await this.getAll();
        let totalSize = 0;
        for (const item of all) {
            if (item.data) {
                totalSize += item.data.length;
            }
        }
        return { count: all.length, bytes: totalSize };
    }

    async autoCleanup() {
        const storage = await this.getStorageSize();
        
        if (storage.count > this.maxStorageItems || storage.bytes > this.maxStorageBytes) {
            const all = await this.getAll();
            all.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            
            const removeCount = Math.ceil(all.length * 0.2);
            for (let i = 0; i < removeCount; i++) {
                await this.delete(all[i].id);
            }
            console.log(`[ImageStore] Auto-cleanup: removed ${removeCount} old images`);
        }
    }

    generateImageId() {
        return IMAGE_ID_PREFIX + Date.now() + '_' + crypto.randomUUID();
    }
}

export const imageStore = new ImageStore();
export default imageStore;
