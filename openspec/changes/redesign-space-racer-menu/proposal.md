## Why

The current menu feels like a temporary prototype instead of a polished game screen: selection relies on HTML overlays, the background falls back to flat black, and the layout does not adapt well to different viewport sizes. The project needs a cohesive menu scene now because the vehicle-selection screen is the first impression players get, and the current version conflicts with the intended space-game tone.

## What Changes

- Replace the HTML overlay selection boxes with direct 3D vehicle selection inside the menu canvas.
- Add a space-themed menu backdrop with layered 3D stars and distant floating space objects so a dark background still feels alive.
- Add in-scene selection feedback: the selected vehicle slightly enlarges and shows a small check mark beneath it without using HTML overlays.
- Introduce a pulsing 3D title that fits the game-like presentation better than flat page text.
- Make the menu composition responsive so vehicle spacing, camera framing, and title placement adapt to desktop and smaller viewports.
- Expand the menu to present all intended player-selectable vehicles through a single menu-focused data source instead of hard-coded DOM slots.

## Capabilities

### New Capabilities
- `space-racer-menu`: A fully in-scene vehicle-selection menu with 3D title, space background, direct vehicle picking, and responsive presentation.

### Modified Capabilities
- None.

## Impact

- Affected code: `index.html`, `css/menu.css`, `css/styles.css`, `src/index.ts`, `src/scenes/MenuScene.ts`, `data/vehicles/vehicles.ts`
- Systems: menu rendering, menu input handling, vehicle presentation data, camera/layout behavior
- Dependencies: no new runtime dependency is required if the scene reuses existing Three.js utilities already present in the project
