## Context

The current menu is assembled from a small HTML scaffold plus a Three.js scene that only rotates three hard-coded vehicles. Selection is driven by invisible HTML hit areas, the intended menu background style does not apply because the selector does not match the page markup, and the layout assumes a single wide desktop composition. The user wants the menu to feel like a stylized game scene instead: dark space backdrop, 3D stars, a pulsing 3D title, direct clicking on ships, and in-scene selection feedback instead of overlay UI.

The project already contains useful building blocks:
- `MenuScene.ts` controls the title scene and vehicle loading.
- `GameScene.ts` already contains a 3D deep-space background generator via `setupBackgroundEntities(...)`.
- The data layer already distinguishes vehicles in `data/vehicles/`.

Constraints:
- Keep the implementation within the existing Three.js stack.
- Avoid introducing HTML-based selection chrome beyond optional minimal shell content.
- Preserve the current `game.html?speeder=<index>` launch flow.
- Support both desktop and smaller viewport layouts with the same scene logic.

## Goals / Non-Goals

**Goals:**
- Move menu interaction from HTML hit boxes to direct 3D vehicle picking.
- Present all intended selectable vehicles through a single menu-oriented data source.
- Render a space-style background that keeps a dark palette but adds 3D depth and motion.
- Display a pulsing 3D title inside the scene instead of flat HTML headline styling.
- Show selection state through in-scene feedback: ship scale-up plus a small check marker beneath the selected ship.
- Make menu framing responsive by adapting object spacing, camera bounds, and title placement to viewport size.

**Non-Goals:**
- Redesign the in-race HUD or gameplay scene.
- Change vehicle physics, balancing, or race rules.
- Add backend services, save slots, or persistence for menu choices.
- Replace the current route transition into `game.html`.

## Decisions

### 1. Use Three.js raycasting for ship selection
The menu should respond to clicks on actual vehicle meshes, not to HTML overlays. `MenuScene` will keep an array of selectable root groups and use a `THREE.Raycaster` on pointer/touch input to detect which vehicle was clicked.

Why this over HTML overlays:
- It matches the requested “click the ship itself” interaction.
- It keeps selection behavior aligned with what the player visually sees.
- It removes the fragile dependency on manually positioned DOM layers.

Alternative considered:
- Keep HTML buttons aligned over the ships. Rejected because it still breaks immersion and remains difficult to maintain across screen sizes.

### 2. Keep selection feedback entirely inside the Three.js scene
The selected ship will scale up slightly, and a small check marker will appear beneath it as a scene element. The check marker should be rendered via canvas texture or scene geometry/sprite attached to the selected vehicle pedestal area, not by HTML.

Why this over HTML badges:
- It satisfies the “no HTML selection chrome” requirement.
- It keeps all movement, animation, and layout in one rendering system.
- It avoids z-index and responsive alignment issues.

Alternative considered:
- CSS badge below the canvas. Rejected because it conflicts with the requested rendering approach.

### 3. Reuse and adapt the race scene’s space-background pattern
The game scene already has a 3D starfield generator with geometric stars and larger floating background objects. The menu should reuse this pattern, ideally by extracting the background creation into a shared utility or by mirroring the logic in a focused helper used by both menu and race scenes.

Why this over a flat gradient or 2D particle backdrop:
- The user explicitly wants 3D stars and a real space look.
- Reuse reduces implementation risk and keeps the art direction coherent across scenes.
- The existing project already proves this aesthetic can work in the same rendering stack.

Alternative considered:
- A CSS starfield behind the canvas. Rejected because the user asked for 3D stars, not a flat web backdrop.

### 4. Render the title as a Three.js object with a pulsing scale animation
The menu title should move from HTML text into the Three.js scene so it can feel like a game title card. The preferred implementation is a 3D or pseudo-3D title mesh/sprite that sits in menu space and gently scales up and down in a repeating loop.

Why this over styled HTML text:
- It satisfies the request for a 3D title.
- It integrates visually with the camera, bloom, and space setting.
- It allows scene-native animation without CSS syncing issues.

Alternative considered:
- HTML text with transforms. Rejected because it still reads like a web overlay rather than part of the game scene.

### 5. Drive layout from viewport-aware scene parameters
Responsive behavior should come from scene configuration rather than only CSS changes. The menu should compute:
- vehicle count and spacing
- title height/scale
- camera orthographic bounds and position
- selection marker placement

based on viewport width/height breakpoints.

Why this over pure CSS responsiveness:
- Most of the visible menu is inside the canvas, so CSS alone cannot fix framing.
- It prevents clipping, overlapping, and dead click zones when the viewport changes.

Alternative considered:
- Resize the renderer only. Rejected because the current code already shows that renderer resize alone is insufficient.

### 6. Introduce a dedicated `menuVehicles` source of truth
The menu should not depend on a hard-coded `for (let i = 0; i < 3; i++)` loop or on scattered special cases. A single menu-oriented vehicle list should define order, label, accent metadata, and the playable index mapping.

Why this over patching the current `speeders` array:
- The playable menu includes more than the original three speeders.
- It keeps display concerns and selection order explicit.
- It simplifies responsive layout and title/marker metadata later.

Alternative considered:
- Expand the DOM and keep per-index conditionals in `GameScene`. Rejected because it preserves fragmentation.

## Risks / Trade-offs

- **[Raycast selection may hit child meshes inconsistently]** → Normalize selection by walking from the intersected mesh up to a tagged root vehicle group before applying selection.
- **[3D title generation may be asset-sensitive]** → Prefer a light-weight title rendering path that works with existing Three.js capabilities and does not require a large new asset pipeline.
- **[Dense starfields can hurt menu performance on smaller devices]** → Use layered density presets and reduce star count / floating objects on narrow or low-power viewports.
- **[More selectable vehicles may crowd small screens]** → Adjust spacing, scale, and camera framing by breakpoint, and allow a compact composition rather than preserving one fixed horizontal layout.
- **[Scene-only UI can make accessibility weaker than HTML controls]** → Keep minimal supporting text outside the scene only where necessary, but do not reintroduce selection overlays.

## Migration Plan

1. Add or finalize a menu vehicle data source that covers all intended selectable vehicles.
2. Refactor `MenuScene` to create reusable selectable groups and responsive layout calculations.
3. Add the shared or menu-specific 3D starfield/background system.
4. Replace HTML-based selection with raycast picking and in-scene selection feedback.
5. Introduce the pulsing 3D title and remove reliance on styled overlay text for the main title.
6. Verify build, selection flow, and viewport behavior across at least desktop and narrow-screen layouts.

Rollback strategy:
- The change is isolated to menu-related files, so reverting the menu scene, menu stylesheet, and menu vehicle metadata restores the current behavior if needed.

## Open Questions

- Should the 3D title be built from geometry/text assets, or from a stylized sprite/plane with pseudo-3D treatment?
- Should the “Start Race” control remain as a minimal HTML button, or should start confirmation also move fully into the scene?
- How many non-vehicle decorative background objects can be shown while keeping the menu smooth on lower-end devices?
