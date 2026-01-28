# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npx tsc game.ts        # Compile TypeScript to JavaScript
```

No build step required for development - open `index.html` directly in a browser.

## Architecture

Single-file browser game with no bundler or framework:

- `game.ts` - TypeScript source containing the `Game2048` class with all game logic
- `game.js` - Compiled JavaScript (keep in sync with game.ts)
- `index.html` - Static HTML that loads game.js directly
- `styles.css` - All styling including 20+ visual themes

The `Game2048` class manages:
- 4x4 tile grid with merge mechanics
- Keyboard (arrows/WASD) and touch input handling
- Move animations with CSS transitions
- Undo history (up to 50 states)
- Score persistence via localStorage
- Win/lose detection and game state overlays

Themes are applied via body class (e.g., `theme-neon`) and defined entirely in CSS.
