## Why

The current menu refactor solved the original HTML-overlay issues, but the interaction and presentation still do not match the intended playful arcade tone. The next refinement is needed now because the menu still feels visually harsh, the selection method is more fiddly than desired, and the background does not yet match the geometric space language already established in the race scene.

## What Changes

- Replace direct ship-click selection with a carousel-style selector driven by a left arrow and a right arrow rendered inside the Three.js scene.
- Show one featured vehicle at a time so the menu behaves like a focused vehicle browser instead of a multi-card grid.
- Make the left and right arrow controls pseudo-3D, keep them static at rest, and apply only a short click-scale feedback instead of a breathing animation.
- Normalize menu presentation scale so each vehicle occupies a visually consistent amount of space in the selection scene.
- Remove the circular pedestal and selection plate from beneath the vehicle so the presentation stays cleaner and lighter.
- Simplify menu typography by removing bright glow-heavy white text treatment and using flatter, lower-intensity text rendering.
- Align the menu starfield more closely with the geometric wireframe star style already used in `game.html`.
- Preserve the existing confirmation flow into `game.html?speeder=<index>` while updating the surrounding menu interaction model.

## Capabilities

### New Capabilities
- `space-racer-carousel-menu`: A scene-native vehicle carousel menu with arrow-based navigation, normalized vehicle presentation, reduced text glow, and a geometric deep-space background.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/scenes/MenuScene.ts`, `src/utils/interfaces.ts`, `data/vehicles/vehicles.ts`, `css/menu.css`, and possibly shared menu-facing scene helpers if background logic is extracted.
- Systems: menu rendering, menu input handling, menu layout behavior, background rendering, and menu typography treatment.
- Dependencies: no new runtime dependency is required; the change should remain within the existing Three.js stack.
