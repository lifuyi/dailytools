# Blank PNG Export Fix - Work Plan

## TL;DR

> **Quick Summary**: Fix the HTML-to-PNG export function in 小红书卡片渲染器 where exported PNGs are always blank due to rendering issues with the hidden export container.
>
> **Deliverables**:
> - Updated `app.js` export function that produces non-blank PNGs
> - Enabled debugging to diagnose any future issues
> - Comprehensive error handling and validation
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential fixes
> **Critical Path**: Fix visibility → Enable logging → Add validation → Test

---

## Context

### Original Issue
User reports that downloaded PNG files are blank when exporting rendered HTML cards to PNG using the web-based 小红书卡片渲染器.

### Interview Summary
**User Confirmed**:
- Blank PNG occurs **always** (reproducible)
- Using **Desktop Browser** environment
- **No console errors** visible during export

**Research Findings**:
- Code uses `html2canvas@1.4.1` with `dom-to-image@2.6.0` fallback
- Export creates hidden container at `-9999px` left position
- `visibility:hidden` on export container prevents rendering entirely
- Logging is disabled in html2canvas config

### Metis Review
**Critical Issues Identified**:
1. `visibility:hidden` prevents ANY rendering - the canvas is blank by design
2. `-9999px` positioning combined with hidden visibility blocks html2canvas
3. CSS variables may not transfer correctly to cloned elements
4. Logging disabled hides debugging information
5. No canvas content validation before saving

---

## Work Objectives

### Core Objective
Fix the HTML-to-PNG export functionality so that exported cards contain visible content (text, images, backgrounds, themes) instead of blank PNGs.

### Concrete Deliverables
- Updated `app.js` with working export function
- Enabled html2canvas logging for debugging
- Fixed export container visibility/positioning
- Added canvas content validation
- Comprehensive error handling with specific error messages

### Definition of Done
- [ ] Exported PNG files contain visible card content
- [ ] PNG file size indicates actual content (>1KB for typical cards)
- [ ] No console errors during export
- [ ] All themes export correctly (default, playful-geometric, neo-brutalism, botanical, professional, retro, terminal, sketch)
- [ ] Both cover cards and content cards export correctly
- [ ] Custom backgrounds and gradients render properly
- [ ] Text, images, and visual elements all present in export

### Must Have
- Working PNG export with visible content
- Debug logging enabled for troubleshooting
- Error handling with specific messages
- Canvas validation before download

### Must NOT Have (Guardrails)
- `visibility:hidden` on export container (blocks rendering)
- Disabled logging during export (hides issues)
- Silent failures (blank PNGs with no error indication)
- Removed or broken image handling
- Broken theme/CSS application

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL verification steps MUST be executable without human action. No "user manually verifies" or "user checks visually".

### Test Decision
- **Infrastructure exists**: YES (existing project)
- **Automated tests**: NO - manual verification via browser
- **Framework**: N/A

### Agent-Executed QA Scenarios (MANDATORY)

**Type**: Frontend/UI Verification via Playwright
**Tool**: Playwright (playwright skill)

#### Precondition
- Dev server running on localhost (or static HTML file loaded)
- Sample markdown content loaded in editor
- Export button visible and clickable

#### Scenarios

**Scenario: Export default theme produces non-blank PNG**
```
Scenario: Export default theme card and verify PNG has content
  Tool: Playwright (playwright skill)
  Preconditions: Browser open at index.html, sample markdown loaded
  Steps:
    1. Click: button#download-btn
    2. Wait: 3 seconds for download to complete
    3. Run Bash: ls -la ~/Downloads/*.png 2>/dev/null | head -5
    4. Assert: At least one PNG file exists in Downloads
    5. Assert: PNG file size > 1024 bytes (1KB)
    6. Run Bash: file ~/Downloads/*.png | grep -E "PNG|image"
    7. Assert: File is recognized as PNG
  Expected Result: PNG file created with actual content
  Evidence: File listing and file type output
```

**Scenario: Export with custom background produces non-blank PNG**
```
Scenario: Export card with custom gradient background
  Tool: Playwright (playwright skill)
  Preconditions: Browser open, default theme selected
  Steps:
    1. Set: input#bg-color-1 = "#FF2442"
    2. Set: input#bg-color-2 = "#FF6B81"
    3. Click: button#apply-bg-btn
    4. Click: button#download-btn
    5. Wait: 3 seconds
    6. Run Bash: ls -la ~/Downloads/*.png 2>/dev/null | tail -1
    7. Assert: Most recent PNG file size > 1024 bytes
  Expected Result: Custom background renders in exported PNG
  Evidence: File size and download confirmation
```

**Scenario: Export different themes all produce content**
```
Scenario: Export cards with different themes
  Tool: Playwright (playwright skill)
  Preconditions: Browser open, sample content loaded
  Steps:
    1. Loop through themes: default, playful-geometric, neo-brutalism, botanical, professional, retro, terminal, sketch
    2. For each theme:
      a. Select: select#theme-select = theme
      3. Wait: 0.5s for render
      4. Click: button#download-btn
      5. Wait: 2s
      6. Run Bash: ls ~/Downloads/封面_*.png 2>/dev/null | wc -l
    7. Assert: Count >= 1 (at least one exported)
  Expected Result: All themes export successfully
  Evidence: Export count verification
```

**Scenario: Export with console logging enabled**
```
Scenario: Export and verify console logs html2canvas activity
  Tool: Playwright (playwright skill)
  Preconditions: Browser open, DevTools console captured
  Steps:
    1. Enable console logging in Playwright
    2. Click: button#download-btn
    3. Wait: 3 seconds
    4. Read: console logs
    5. Assert: Contains "html2canvas" or canvas-related logs
    6. Assert: No errors or warnings about blank canvas
  Expected Result: html2canvas logs indicate successful rendering
  Evidence: Console log capture
```

**Scenario: Multi-card export produces all cards**
```
Scenario: Export multiple cards separated by ---
  Tool: Playwright (playwright skill)
  Preconditions: Browser open with multi-card markdown (sampleMarkdown)
  Steps:
    1. Click: button#download-btn
    2. Wait: 5 seconds (for multiple cards)
    3. Run Bash: ls ~/Downloads/*.png 2>/dev/null | wc -l
    4. Assert: Count >= 3 (cover + 2 content cards from sample)
  Expected Result: All cards exported
  Evidence: File count verification
```

**Scenario: Canvas dimensions verification**
```
Scenario: Verify exported PNG has correct dimensions
  Tool: Playwright (playwright skill)
  Preconditions: Browser open, card size set to 360x480
  Steps:
    1. Set: input#card-width = 360
    2. Set: input#card-height = 480
    3. Click: button#apply-size-btn
    4. Click: button#download-btn
    5. Wait: 3 seconds
    6. Run Bash: sips -g pixelWidth -g pixelHeight ~/Downloads/封面_*.png 2>/dev/null
    7. Assert: pixelWidth >= 360
    8. Assert: pixelHeight >= 480
  Expected Result: PNG dimensions match card size (times scale factor)
  Evidence: Image dimension output
```

**Failure Scenario: Handle missing images gracefully**
```
Scenario: Export card with broken image reference
  Tool: Playwright (playwright skill)
  Preconditions: Browser open, manually insert broken image markdown
  Steps:
    1. Fill: textarea#markdown-input with markdown containing broken image
    2. Click: button#refresh-btn
    3. Wait: 1s
    4. Click: button#download-btn
    5. Wait: 3 seconds
    6. Run Bash: ls ~/Downloads/*.png 2>/dev/null | wc -l
    7. Assert: PNG file still created (error handling works)
  Expected Result: Export succeeds even with broken images
  Evidence: File creation confirmation
```

### Evidence to Capture
- [ ] PNG file listings in Downloads folder
- [ ] PNG file sizes (should be >1KB)
- [ ] PNG file type verification
- [ ] Image dimensions
- [ ] Console logs during export
- [ ] Evidence paths: `.sisyphus/evidence/task-1-*.png`, `.sisyphus/evidence/task-*-console.txt`

---

## Execution Strategy

### Sequential Execution (Single Wave)

All tasks must be completed in order since each fix builds on the previous one:

```
1. Fix visibility → Enables rendering
2. Enable logging → Helps debug
3. Add validation → Confirms content
4. Test and verify → Final confirmation
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4 | None (must go first) |
| 2 | 1 | 3, 4 | None |
| 3 | 2 | 4 | None |
| 4 | 1, 2, 3 | None | Final verification |

---

## TODOs

> Every task includes: Implementation + Test + Verification

- [ ] 1. Fix export container visibility and positioning

  **What to do**:
  - Change `visibility:hidden` to `visibility:visible` on export container (line 468 in app.js)
  - Change `position:fixed;left:-9999px` to `position:fixed;left:0;top:0;z-index:-9999` (line 468)
  - This allows html2canvas to render while keeping container off-screen from user view
  - Keep `overflow:hidden` to contain content
  - Add `background:transparent` to avoid unwanted background

  **Must NOT do**:
  - Remove the container entirely (needed for rendering context)
  - Use `display:none` (completely removes from DOM)
  - Change positioning to visible viewport area (user would see flicker)

  **Recommended Agent Profile**:
  - **Category**: quick
    - Reason: Single file, targeted fix, well-understood issue
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - N/A - straightforward CSS change

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None (can start immediately)

  **References**:
  - `app.js:468-469` - Current problematic container styles
  - `app.js:505-514` - html2canvas call that needs working container
  - `app.js:525-529` - dom-to-image fallback

  **Acceptance Criteria**:

  - [ ] File edited: app.js line 468
  - [ ] Grep: `position:fixed` in export container → `position:fixed;left:0;top:0;z-index:-9999`
  - [ ] Grep: `visibility:hidden` in export container → `visibility:visible`
  - [ ] File check: `app.js:468` contains updated positioning code

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify export container CSS is fixed
    Tool: Bash
    Preconditions: None
    Steps:
      1. Grep app.js for 'position:fixed;left:-9999px' → should NOT exist
      2. Grep app.js for 'position:fixed;left:0;top:0;z-index:-9999' → should exist
      3. Grep app.js for 'visibility:hidden' in export container → should NOT exist
      4. Grep app.js for 'visibility:visible' → should exist
    Expected Result: All CSS patterns updated correctly
    Evidence: Grep output
  ```

- [ ] 2. Enable html2canvas logging and add debug output

  **What to do**:
  - Change `logging: false` to `logging: true` in html2canvas config (line 513)
  - Add `onclone` callback to verify clone has content before canvas creation
  - Add `ignoreElements` callback to skip problematic elements if needed
  - Add console.log statements for:
    - Container dimensions before html2canvas call
    - Clone verification after creation
    - Canvas dimensions after creation
    - Data URL length (indicates content presence)

  **Must NOT do**:
  - Remove any existing error handling
  - Disable the fallback to dom-to-image
  - Add excessive logging that floods console

  **Recommended Agent Profile**:
  - **Category**: quick
    - Reason: Single file, add logging statements, well-defined scope
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - N/A - straightforward code addition

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: Task 1

  **References**:
  - `app.js:505-514` - html2canvas config to modify
  - html2canvas docs: logging option enables console output
  - `app.js:524` - Fallback start point

  **Acceptance Criteria**:

  - [ ] File edited: app.js line 513 - logging set to true
  - [ ] File has: console.log for container dimensions
  - [ ] File has: console.log for canvas dimensions
  - [ ] File has: console.log for data URL length
  - [ ] Grep: `logging: true` in html2canvas config exists

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify logging is enabled in html2canvas
    Tool: Bash
    Preconditions: None
    Steps:
      1. Grep app.js for 'logging: true' in html2canvas config → should exist
      2. Grep app.js for 'logging: false' → should NOT exist
      3. Grep app.js for 'console.log.*dimensions' → should have at least 2 matches
      4. Grep app.js for 'console.log.*canvas' → should have at least 1 match
    Expected Result: All logging changes present
    Evidence: Grep output
  ```

- [ ] 3. Add canvas content validation before download

  **What to do**:
  - After html2canvas completes, check `canvas.width` and `canvas.height`
  - Verify `canvas.toDataURL().length > some_threshold` (e.g., >1000 bytes)
  - Add explicit error if canvas is blank: "Export produced blank canvas"
  - Add explicit error if dimensions are wrong: "Canvas dimensions incorrect"
  - Update dom-to-image fallback to also validate output
  - Add user-facing error messages for specific failure types

  **Must NOT do**:
  - Proceed with download if canvas is blank
  - Overwrite the original file without validation
  - Throw generic errors without context

  **Recommended Agent Profile**:
  - **Category**: quick
    - Reason: Single file, add validation logic, well-understood requirements
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - N/A - straightforward validation code

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `app.js:505-514` - html2canvas completion point
  - `app.js:516-519` - Current download logic
  - `app.js:524-537` - dom-to-image fallback

  **Acceptance Criteria**:

  - [ ] File has: canvas.width > 0 validation
  - [ ] File has: canvas.height > 0 validation
  - [ ] File has: toDataURL().length > 1000 validation
  - [ ] File has: specific error messages for blank canvas
  - [ ] File has: validation also for dom-to-image fallback
  - [ ] Grep: 'blank canvas' or similar error message exists

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify canvas validation code exists
    Tool: Bash
    Preconditions: None
    Steps:
      1. Grep app.js for 'canvas.width' → should exist
      2. Grep app.js for 'canvas.height' → should exist
      3. Grep app.js for 'toDataURL' → should exist (at least 2 occurrences)
      4. Grep app.js for 'blank' (case insensitive, error message) → should exist
    Expected Result: All validation code present
    Evidence: Grep output
  ```

- [ ] 4. Test and verify PNG exports work correctly

  **What to do**:
  - Open index.html in browser
  - Click "截图下载" (Export) button
  - Verify downloaded PNGs:
    - File size > 1KB
    - File type is PNG
    - Contains visible card content (open and verify)
  - Test with multiple themes
  - Verify console shows html2canvas logs
  - Report pass/fail for each test

  **Must NOT do**:
  - Skip verification - must confirm actual fix works
  - Only check file existence - must verify content
  - Test only one theme - must test multiple

  **Recommended Agent Profile**:
  - **Category**: visual-engineering
    - Reason: Browser-based verification, UI testing
  - **Skills**: [`playwright`]
    - `playwright`: Browser automation for export verification
  - **Skills Evaluated but Omitted**:
    - N/A - this is verification-only task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `index.html:101` - Download button element
  - Playwright docs for file download verification
  - Sample markdown in `app.js:96-125`

  **Acceptance Criteria**:

  - [ ] Playwright test: PNG exported with size > 1KB
  - [ ] Playwright test: PNG file type verification
  - [ ] Playwright test: Console shows html2canvas logs
  - [ ] Playwright test: At least 3 themes export successfully
  - [ ] All scenarios pass from Verification Strategy section

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Comprehensive export verification
    Tool: task(category="visual-engineering", load_skills=["playwright"], prompt="Open index.html in browser, click export button, and verify PNGs are non-blank:\n\n1. Navigate to file:///Users/eyeopen/Downloads/projects/dailytools/cards/index.html\n2. Wait for page to load (DOMContentLoaded)\n3. Click #download-btn button\n4. Wait 5 seconds for downloads\n5. Check Downloads folder for PNG files:\n   - ls ~/Downloads/*.png | head -10\n   - file ~/Downloads/*.png\n   - sips -g pixelWidth -g pixelHeight ~/Downloads/*.png | head -5\n6. Assert: At least one PNG exists\n7. Assert: PNG file size > 1024 bytes\n8. Assert: file command shows \"PNG image\"\n9. Capture evidence to .sisyphus/evidence/\n\nReport: Which PNG files were downloaded, their sizes, dimensions, and whether they contain content.", run_in_background=false)
  ```

  **Evidence to Capture**:
  - [ ] PNG files in Downloads: `.sisyphus/evidence/export-*.png`
  - [ ] File listing: `.sisyphus/evidence/file-listing.txt`
  - [ ] File info: `.sisyphus/evidence/file-info.txt`
  - [ ] Dimensions: `.sisyphus/evidence/dimensions.txt`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix: enable export container visibility for html2canvas` | app.js | Grep verification |
| 2 | `feat: enable html2canvas logging for debugging` | app.js | Grep verification |
| 3 | `feat: add canvas content validation before download` | app.js | Grep verification |
| 4 | `test: verify PNG exports produce non-blank images` | app.js (no changes, just testing) | Playwright verification |

---

## Success Criteria

### Verification Commands
```bash
# Check file was edited
grep -n "position:fixed;left:0;top:0;z-index:-9999" app.js
grep -n "visibility:visible" app.js
grep -n "logging: true" app.js

# Check PNG exports
ls -la ~/Downloads/*.png 2>/dev/null | grep -E "\.png$"
file ~/Downloads/*.png 2>/dev/null | grep PNG
```

### Final Checklist
- [ ] `visibility:hidden` replaced with `visibility:visible` in export container
- [ ] Export container positioned with `z-index:-9999` instead of off-screen
- [ ] html2canvas logging enabled
- [ ] Canvas content validation added
- [ ] Exported PNG files have size > 1KB
- [ ] Exported PNG files are valid PNG format
- [ ] All themes export successfully
- [ ] No console errors during export
