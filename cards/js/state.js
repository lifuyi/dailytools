/**
 * State Management - Application state
 */

import { DEFAULT_CARD_SIZE } from './constants.js';

// Theme configurations with gradients and colors
export const themeConfig = {
    'default': { titleGradient: 'linear-gradient(180deg, #111827 0%, #4B5563 100%)', solidColor: '#1F2937' },
    'playful-geometric': { titleGradient: 'linear-gradient(180deg, #7C3AED 0%, #F472B6 100%)', solidColor: '#7C3AED' },
    'neo-brutalism': { titleGradient: 'linear-gradient(180deg, #000000 0%, #FF4757 100%)', solidColor: '#000000' },
    'botanical': { titleGradient: 'linear-gradient(180deg, #1F2937 0%, #4A7C59 100%)', solidColor: '#1F2937' },
    'professional': { titleGradient: 'linear-gradient(180deg, #1E3A8A 0%, #2563EB 100%)', solidColor: '#1E3A8A' },
    'retro': { titleGradient: 'linear-gradient(180deg, #8B4513 0%, #D35400 100%)', solidColor: '#8B4513' },
    'terminal': { titleGradient: 'linear-gradient(180deg, #39D353 0%, #58A6FF 100%)', solidColor: '#39D353' },
    'sketch': { titleGradient: 'linear-gradient(180deg, #111827 0%, #6B7280 100%)', solidColor: '#111827' }
};

// Cover gradients for different themes
export const themeCoverGradients = {
    'default': 'linear-gradient(180deg, #f3f3f3 0%, #f9f9f9 100%)',
    'playful-geometric': 'linear-gradient(135deg, #8B5CF6 0%, #F472B6 100%)',
    'neo-brutalism': 'linear-gradient(135deg, #FF4757 0%, #FECA57 100%)',
    'botanical': 'linear-gradient(135deg, #4A7C59 0%, #8FBC8F 100%)',
    'professional': 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
    'retro': 'linear-gradient(135deg, #D35400 0%, #F39C12 100%)',
    'terminal': 'linear-gradient(135deg, #0D1117 0%, #161B22 100%)',
    'sketch': 'linear-gradient(135deg, #555555 0%, #888888 100%)'
};

// Content card background colors
export const themeBgColors = {
    'default': '#ffffff',
    'playful-geometric': '#ffffff',
    'neo-brutalism': '#ffffff',
    'botanical': '#ffffff',
    'professional': '#ffffff',
    'retro': '#ffffff',
    'terminal': '#ffffff',
    'sketch': '#ffffff'
};

// Helper to get title gradient from themeConfig
export const themeTitleGradients = {};
for (const [key, config] of Object.entries(themeConfig)) {
    themeTitleGradients[key] = config.titleGradient;
}

// Application state
const state = {
    currentTheme: 'default',
    customBackground: {
        enabled: false,
        color1: '#6366f1',
        color2: '#8b5cf6',
        direction: '135deg'
    },
    cardSize: { ...DEFAULT_CARD_SIZE }
};

// State getters and setters
export const appState = {
    getState: () => ({ ...state }),
    
    getTheme: () => state.currentTheme,
    setTheme: (theme) => { state.currentTheme = theme; },
    
    getCustomBackground: () => ({ ...state.customBackground }),
    setCustomBackground: (bg) => { state.customBackground = { ...bg }; },
    
    getCardSize: () => ({ ...state.cardSize }),
    setCardSize: (size) => { state.cardSize = { ...size }; },
    
    resetCustomBackground: () => {
        state.customBackground = {
            enabled: false,
            color1: '#6366f1',
            color2: '#8b5cf6',
            direction: '135deg'
        };
    },
    
    resetCardSize: () => {
        state.cardSize = { ...DEFAULT_CARD_SIZE };
    }
};

export { state };
