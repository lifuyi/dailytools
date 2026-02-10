# Draft: Blank PNG Export Issue

## Issue Summary
User reports that downloaded PNG files are blank when exporting rendered HTML cards to PNG.

## Context from Code Analysis
**Export Mechanism** (app.js lines 424-550):
- Uses `html2canvas` as primary renderer with `dom-to-image` as fallback
- Creates hidden export container off-screen
- Clones card elements and applies CSS variables
- Handles images from IndexedDB storage

**Potential Causes Identified**:
1. **Timing Issues**: Wait times might be insufficient for:
   - Images loaded from IndexedDB
   - Fonts ready (only waits for `document.fonts.ready`)
   - CSS animations/rendering completion
2. **CSS Cloning Problems**: CSS variables and theme classes might not fully transfer
3. **Hidden Container Issues**: Off-screen rendering might cause canvas blankness
4. **Image Source Issues**: IndexedDB images with data URLs might not render properly
5. **CORS/taint Issues**: `allowTaint: true` and `useCORS: true` set, but might not be sufficient

## Technical Details from Code
```javascript
// Lines 505-514: html2canvas config
const canvas = await html2canvas(exportContainer, {
    backgroundColor: null,
    scale: 2,
    width: width,
    height: height,
    useCORS: true,
    allowTaint: true,
    imageTimeout: 15000,
    logging: false
});

// Lines 525-529: dom-to-image fallback
const dataUrl = await domToImage.toPng(exportContainer, {
    quality: 1,
    width: width,
    height: height
});
```

## Open Questions
- When does blank PNG occur? (always/sometimes/specific content)
- Is console showing any errors?
- Does it affect all cards or specific ones?
- What browser is being used?
- Are images from IndexedDB being exported correctly?
