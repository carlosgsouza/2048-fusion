# 2048 Fusion - Application Specifications

## Overview

2048 Fusion is a browser-based implementation of the classic 2048 puzzle game. It features multiple visual themes, undo functionality, score tracking, and Progressive Web App (PWA) support for installation on mobile and desktop devices.

## Game Rules

### Objective
Combine tiles with the same numbers to create larger numbers. The goal is to create a tile with the value **2048**.

### Gameplay Mechanics

1. **Grid**: The game is played on a 4x4 grid (16 cells total)
2. **Starting State**: A new game begins with 2 tiles randomly placed on the grid
3. **Tile Values**: Tiles start as either 2 (90% probability) or 4 (10% probability)
4. **Movement**: All tiles slide in the chosen direction (up, down, left, or right) until they hit the edge or another tile
5. **Merging**: When two tiles with the same value collide during a move, they merge into one tile with double the value
6. **Merge Rules**:
   - Each tile can only merge once per move
   - When multiple merges are possible in a row/column, the merge happens with the furthest tile in the direction of movement
7. **New Tile Spawn**: After each valid move, a new tile (2 or 4) appears in a random empty cell
8. **Scoring**: When tiles merge, their combined value is added to the score
9. **Win Condition**: Creating a 2048 tile triggers a win message, but players can continue playing
10. **Lose Condition**: The game ends when no valid moves are available (grid is full and no adjacent tiles can merge)

### Controls

#### Desktop
- **Arrow Keys**: Move tiles (Up, Down, Left, Right)
- **WASD Keys**: Alternative movement controls (W=Up, A=Left, S=Down, D=Right)
- **Ctrl+Z / Cmd+Z**: Undo last move
- **Z key** (without Shift): Undo last move

#### Mobile/Touch
- **Swipe**: Swipe in any direction to move tiles (minimum 50px swipe distance)

## Features

### Core Features

1. **Undo System**
   - Stores up to 50 previous game states
   - Allows undoing moves even after a game over
   - Undo button is disabled when no history is available
   - Invalid moves (where no tiles moved) are not added to history

2. **Score System**
   - **Current Score**: Points accumulated in the current game
   - **Best Score**: Highest score achieved, persisted in localStorage
   - Score increases only when tiles merge (by the merged tile's value)

3. **Win/Lose Overlays**
   - **Win**: Shows "You Win!" with "Keep Playing" button
   - **Lose**: Shows "Game Over!" with "Try Again" button
   - Overlay prevents further moves until dismissed

4. **Keep Playing Mode**
   - After winning, players can continue to achieve higher scores
   - Game can continue until the lose condition is met
   - Tiles beyond 2048 (4096, 8192, etc.) are displayed with a special "super" style

### Visual Features

1. **Themes**: 16 unique visual themes organized into categories:
   - **Classic**: Original 2048 color scheme
   - **Modern**: Neon (default), Vice (Vaporwave), Glassmorphism, Aurora
   - **Retro**: Minesweeper, Terminal
   - **Artistic**: Kindergarten, Blueprint, Whiteboard, Cherry Blossom
   - **Nature**: Ocean, Forest, Sunset, Lavender

2. **Animations**
   - Tile slide animation (150ms cubic-bezier transition)
   - New tile appear animation (scale from 0 with bounce)
   - Merge animation (pop/scale effect)
   - Invalid move shake animation (horizontal or vertical based on direction)

3. **Theme Persistence**
   - Selected theme is saved to localStorage
   - Theme can be set via URL parameter (`?theme=themename`)
   - Default theme is "neon"

### PWA Features

1. **Installable**: Can be installed on iOS, Android, and desktop browsers
2. **Offline Support**: Service worker caches all assets for offline play
3. **Safe Area Support**: Handles notched phones with viewport-fit=cover

### Debug Features

1. **Debug Mode**: Activated via URL parameter `?debug=true`
   - Updates URL with encoded game state after each move
   - Allows sharing specific game states

2. **Predefined Scenarios**: Load specific game states via `?state=scenarioName`
   - `64`, `128`, `256`, `512`, `1024`, `2048`, `4096`, `8192`: Near-merge scenarios
   - `win`: Complex board state for testing
   - `lose`: Board state that triggers game over after one move

3. **Custom State Loading**: Load any game state via encoded string
   - Format: `score_base36-grid_hex` (e.g., `2s-0000000000005500`)
   - Each hex digit represents log2 of tile value (0=empty, 1=2, 2=4, etc.)

## Technical Architecture

### File Structure
- `index.html` - Main HTML structure
- `styles.css` - All CSS including themes
- `game.ts` - TypeScript source code
- `game.js` - Compiled JavaScript
- `manifest.json` - PWA manifest
- `sw.js` - Service worker for offline support
- `icons/` - App icons (192x192 and 512x512)

### Data Structures

```typescript
interface GameState {
    grid: number[][];  // 4x4 array of tile values (0 for empty)
    score: number;
}

interface Tile {
    id: number;           // Unique identifier
    value: number;        // Tile value (2, 4, 8, etc.)
    row: number;          // Current row position
    col: number;          // Current column position
    previousRow: number | null;  // Position before move
    previousCol: number | null;
    mergedFrom: Tile[] | null;   // Source tiles if merged
    isNew: boolean;       // True if just spawned
}
```

### Storage
- `localStorage['2048-best-score']` - Best score (integer as string)
- `localStorage['2048-theme']` - Selected theme name

---

## Test Cases

### 1. New Game Initialization

#### TC1.1: Fresh Start
1. Open the application with no localStorage data
2. **Expected**:
   - Grid displays with exactly 2 tiles
   - Both tiles are either 2 or 4
   - Score shows 0
   - Best score shows 0
   - Undo button is disabled
   - Default theme (Neon) is applied

#### TC1.2: Start with Existing Best Score
1. Set localStorage `2048-best-score` to "5000"
2. Refresh the page
3. **Expected**:
   - Score shows 0
   - Best score shows 5000

#### TC1.3: New Game Button
1. Play several moves to build up a score
2. Click "New Game" button
3. **Expected**:
   - Grid resets to 2 random tiles
   - Score resets to 0
   - Best score remains unchanged
   - Undo history is cleared (button disabled)

### 2. Tile Movement

#### TC2.1: Basic Left Movement
1. Load state: `?state=0-0000000000002200` (two 4-tiles in bottom right)
2. Press Left arrow
3. **Expected**:
   - Tiles move to the left edge
   - A new tile appears in an empty cell
   - Score remains 0 (no merge occurred)

#### TC2.2: Basic Right Movement
1. Load state: `?state=0-2200000000000000` (two 4-tiles in top left)
2. Press Right arrow
3. **Expected**:
   - Tiles move to the right edge
   - A new tile appears

#### TC2.3: Basic Up Movement
1. Load state: `?state=0-0000000020000020` (two 4-tiles in bottom row)
2. Press Up arrow
3. **Expected**:
   - Tiles move to top row
   - A new tile appears

#### TC2.4: Basic Down Movement
1. Load state: `?state=0-2000002000000000` (two 4-tiles in top row)
2. Press Down arrow
3. **Expected**:
   - Tiles move to bottom row
   - A new tile appears

#### TC2.5: WASD Controls
1. Start new game
2. Test W, A, S, D keys
3. **Expected**: Same behavior as arrow keys (Up, Left, Down, Right respectively)

#### TC2.6: Invalid Move (No Tiles Can Move)
1. Load state where all tiles are against the edge you're pressing toward
2. Press that direction
3. **Expected**:
   - Grid shakes in that direction
   - No new tile appears
   - Score unchanged
   - Undo history unchanged

### 3. Tile Merging

#### TC3.1: Simple Merge
1. Load state: `?state=0-1100000000000000` (two 2-tiles adjacent)
2. Press Left arrow
3. **Expected**:
   - Tiles merge into a single 4 tile
   - Score increases by 4
   - Merge animation plays

#### TC3.2: Chain of Same Values
1. Load state: `?state=0-1111000000000000` (four 2-tiles in a row)
2. Press Left arrow
3. **Expected**:
   - Two 4-tiles result (leftmost pair merges, rightmost pair merges)
   - Score increases by 8 (4 + 4)

#### TC3.3: Multiple Merges in Same Move
1. Load state with multiple merge opportunities in different rows
2. Make a move
3. **Expected**: All valid merges occur simultaneously, score reflects total

#### TC3.4: Merge Priority (Direction Matters)
1. Load state: `?state=0-1110000000000000` (three 2-tiles in a row)
2. Press Left arrow
3. **Expected**:
   - Leftmost two tiles merge into 4
   - Rightmost tile moves but doesn't merge
   - Result: one 4-tile on left, one 2-tile next to it

#### TC3.5: Same Test, Opposite Direction
1. Load same state as TC3.4
2. Press Right arrow
3. **Expected**:
   - Rightmost two tiles merge into 4
   - Leftmost tile moves but doesn't merge
   - Result: one 2-tile, one 4-tile on right

#### TC3.6: No Double Merge
1. Load state: `?state=0-2222000000000000` (four 4-tiles in a row)
2. Press Left arrow
3. **Expected**:
   - Result is two 8-tiles (not one 16-tile)
   - Score increases by 16 (8 + 8)

### 4. Scoring

#### TC4.1: Score Calculation
1. Create merge scenarios and verify score matches sum of merged values
2. **Expected**: Score = sum of all merged tile values

#### TC4.2: Best Score Update
1. Start with best score of 100
2. Play until current score exceeds 100
3. **Expected**: Best score updates in real-time as current score exceeds it

#### TC4.3: Best Score Persistence
1. Achieve a new best score
2. Refresh the page
3. **Expected**: Best score is preserved

#### TC4.4: Best Score Not Decreased
1. Have a best score of 1000
2. Play a game with score of 500
3. Click New Game
4. **Expected**: Best score still shows 1000

### 5. Undo Functionality

#### TC5.1: Basic Undo
1. Make a move that changes the board
2. Note the score and board state
3. Press Ctrl+Z
4. **Expected**: Board and score return to previous state

#### TC5.2: Multiple Undos
1. Make 5 moves
2. Press Ctrl+Z 5 times
3. **Expected**: Board returns to initial state after new game

#### TC5.3: Undo Limit (50 moves)
1. Make 55 moves
2. Try to undo all of them
3. **Expected**: Can only undo 50 moves, then button becomes disabled

#### TC5.4: Undo Button State
1. Start new game
2. **Expected**: Undo button is disabled
3. Make one move
4. **Expected**: Undo button is enabled
5. Undo the move
6. **Expected**: Undo button is disabled again

#### TC5.5: Undo After Game Over
1. Play until game over
2. Press Undo
3. **Expected**: Game resumes, game over overlay disappears

#### TC5.6: Invalid Move Doesn't Add to History
1. Make a valid move
2. Attempt an invalid move (tiles against edge)
3. Press Undo
4. **Expected**: Undoes the valid move, not the invalid attempt

#### TC5.7: Alternative Undo Keys
1. Test Ctrl+Z, Cmd+Z (Mac), and Z key alone
2. **Expected**: All trigger undo

### 6. Win Condition

#### TC6.1: Win Detection
1. Load state: `?state=2048` (near 2048 scenario)
2. Make the move that creates 2048 tile
3. **Expected**:
   - "You Win!" overlay appears
   - "Keep Playing" button is shown
   - Cannot make moves while overlay is shown

#### TC6.2: Keep Playing
1. Win the game (TC6.1)
2. Click "Keep Playing"
3. **Expected**:
   - Overlay disappears
   - Can continue making moves
   - Can create tiles beyond 2048

#### TC6.3: Win Only Once
1. Win and keep playing
2. Create another 2048 tile
3. **Expected**: No second win message

### 7. Lose Condition

#### TC7.1: Game Over Detection
1. Load state: `?state=lose`
2. Make any move
3. **Expected**:
   - "Game Over!" overlay appears
   - "Try Again" button is shown

#### TC7.2: Try Again
1. Trigger game over (TC7.1)
2. Click "Try Again"
3. **Expected**: New game starts

#### TC7.3: Full Board Not Game Over
1. Fill board with tiles that have adjacent matches
2. **Expected**: Game continues, no game over

### 8. Theme System

#### TC8.1: Theme Selection
1. Select each theme from dropdown
2. **Expected**: Visual style changes immediately for each theme

#### TC8.2: Theme Persistence
1. Select "Ocean" theme
2. Refresh page
3. **Expected**: Ocean theme is still applied

#### TC8.3: Theme via URL
1. Navigate to `?theme=terminal`
2. **Expected**: Terminal theme is applied

#### TC8.4: URL Theme Priority
1. Set localStorage theme to "ocean"
2. Navigate to `?theme=terminal`
3. **Expected**: Terminal theme is applied (URL overrides localStorage)

#### TC8.5: Default Theme
1. Clear localStorage
2. Navigate without theme parameter
3. **Expected**: Neon theme is applied

#### TC8.6: Theme Dropdown Blur
1. Select a theme from dropdown
2. **Expected**: Dropdown loses focus after selection

### 9. Touch Controls (Mobile)

#### TC9.1: Swipe Left
1. On touch device, swipe left on grid
2. **Expected**: Tiles move left

#### TC9.2: Swipe Right
1. Swipe right on grid
2. **Expected**: Tiles move right

#### TC9.3: Swipe Up
1. Swipe up on grid
2. **Expected**: Tiles move up

#### TC9.4: Swipe Down
1. Swipe down on grid
2. **Expected**: Tiles move down

#### TC9.5: Minimum Swipe Distance
1. Make a very short swipe (< 50px)
2. **Expected**: No movement occurs

#### TC9.6: Diagonal Swipe
1. Swipe diagonally
2. **Expected**: Movement occurs in the dominant direction (horizontal or vertical)

### 10. Animations

#### TC10.1: Tile Slide Animation
1. Make a move
2. **Expected**: Tiles smoothly animate to new positions (150ms)

#### TC10.2: New Tile Animation
1. Make a move
2. **Expected**: New tile appears with scale-up animation

#### TC10.3: Merge Animation
1. Create a merge
2. **Expected**: Merged tile shows pop/bounce effect

#### TC10.4: Invalid Move Animation
1. Attempt invalid move
2. **Expected**: Grid shakes in the attempted direction

#### TC10.5: Animation Blocking
1. Rapidly press movement keys
2. **Expected**: Inputs during animation are ignored, no state corruption

### 11. Debug Mode

#### TC11.1: Enable Debug Mode
1. Navigate to `?debug=true`
2. Make a move
3. **Expected**: URL updates with encoded state

#### TC11.2: State Encoding
1. In debug mode, note the URL state
2. Copy URL and open in new tab
3. **Expected**: Exact same game state loads

#### TC11.3: Named Scenarios
1. Navigate to `?state=2048`
2. **Expected**: Near-win state loads

#### TC11.4: All Predefined Scenarios
Test each: `64`, `128`, `256`, `512`, `1024`, `2048`, `4096`, `8192`, `win`, `lose`
**Expected**: Each loads appropriate test state

### 12. PWA Functionality

#### TC12.1: Service Worker Registration
1. Open browser dev tools > Application > Service Workers
2. Load the app
3. **Expected**: Service worker is registered

#### TC12.2: Offline Mode
1. Load the app
2. Go offline (Network tab > Offline)
3. Refresh the page
4. **Expected**: App loads from cache

#### TC12.3: Install Prompt (Desktop Chrome)
1. Load app in Chrome
2. Look for install icon in address bar
3. **Expected**: Install option available

#### TC12.4: Install Prompt (Android)
1. Load app in Chrome on Android
2. Open browser menu
3. **Expected**: "Install app" or "Add to Home Screen" option available

#### TC12.5: iOS Add to Home Screen
1. Load app in Safari on iOS
2. Tap Share button
3. **Expected**: "Add to Home Screen" option available

### 13. Responsive Design

#### TC13.1: Desktop Layout
1. View on desktop (> 520px width)
2. **Expected**:
   - Full "Undo" text visible
   - Theme label visible
   - Desktop instructions shown

#### TC13.2: Mobile Layout
1. View on mobile (< 520px width)
2. **Expected**:
   - Undo shows icon only
   - Theme label hidden
   - Mobile instructions shown

#### TC13.3: Grid Scaling
1. Resize window
2. **Expected**: Grid and tiles scale proportionally

### 14. Edge Cases

#### TC14.1: Rapid Input
1. Press arrow keys rapidly
2. **Expected**: No state corruption, each valid move processes correctly

#### TC14.2: Simultaneous Keys
1. Press two arrow keys at once
2. **Expected**: Only one direction processes

#### TC14.3: Very Long Game
1. Play for extended period, creating many high-value tiles
2. **Expected**: No performance degradation

#### TC14.4: localStorage Full
1. Fill localStorage near capacity
2. Try to save best score/theme
3. **Expected**: Graceful handling (game continues, may not persist)

#### TC14.5: Invalid State in URL
1. Navigate to `?state=invalid`
2. **Expected**: New game starts, console error logged

#### TC14.6: Large Tile Values
1. Continue playing past 2048 to create 4096, 8192, etc.
2. **Expected**: Tiles display correctly with "super" styling

### 15. Theme-Specific Tests

#### TC15.1: Neon Theme
1. Select Neon theme
2. **Expected**:
   - Neon glow effects on tiles
   - Flicker animation on title
   - Tilt Neon font on tiles and scores

#### TC15.2: Terminal Theme
1. Select Terminal theme
2. **Expected**:
   - Green monospace text
   - $ prefix on title
   - // prefix on "Fusion"

#### TC15.3: Glass Theme
1. Select Glassmorphism theme
2. **Expected**: Blur effects, semi-transparent tiles

#### TC15.4: Cherry Blossom Theme
1. Select Cherry Blossom theme
2. **Expected**: Circular tiles, flower decorations on buttons

#### TC15.5: Blueprint Theme 2048 Tile
1. Load `?state=2048` with Blueprint theme
2. Create 2048 tile
3. **Expected**: 2048 tile text is visible (dark on light background)

#### TC15.6: Terminal Theme 2048 Tile
1. Load `?state=2048` with Terminal theme
2. Create 2048 tile
3. **Expected**: 2048 tile text is visible (dark on bright green)

### 16. Accessibility

#### TC16.1: Keyboard Navigation
1. Navigate entire app using only keyboard
2. **Expected**: All interactive elements are accessible

#### TC16.2: Button Focus States
1. Tab through buttons
2. **Expected**: Clear focus indication on each button

#### TC16.3: Color Contrast
1. Check each theme for text readability
2. **Expected**: All text is readable in all themes

### 17. State Persistence

#### TC17.1: Page Refresh Mid-Game
1. Play several moves
2. Refresh page
3. **Expected**: New game starts (game state is not persisted, only best score and theme)

#### TC17.2: Browser Close and Reopen
1. Achieve best score, close browser
2. Reopen browser and navigate to app
3. **Expected**: Best score is preserved

### 18. Multi-Tab Behavior

#### TC18.1: Multiple Tabs Same URL
1. Open app in two tabs
2. Play in tab 1, achieve new best score
3. Start new game in tab 2
4. **Expected**: Tab 2 may not see updated best score until refresh (localStorage timing)

### 19. Special Tile Displays

#### TC19.1: Tile Values 2-2048
1. Create tiles of each power of 2 up to 2048
2. **Expected**: Each has distinct color per theme

#### TC19.2: Super Tiles (4096+)
1. Create 4096 tile
2. **Expected**: Uses same styling as 2048 tile (tile-super class)

#### TC19.3: Tile Font Sizes
1. Create tiles with 4+ digits (1024, 2048, etc.)
2. **Expected**: Font size reduces to fit

### 20. URL Handling

#### TC20.1: Clean URL on Default Theme
1. With Neon theme selected, check URL
2. **Expected**: No `?theme=` parameter in URL

#### TC20.2: Theme in URL for Non-Default
1. Select Ocean theme
2. **Expected**: URL shows `?theme=ocean`

#### TC20.3: Combined URL Parameters
1. Navigate to `?theme=terminal&debug=true&state=2048`
2. **Expected**: Terminal theme, debug mode enabled, near-win state loaded
