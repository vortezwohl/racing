## Context

The current menu scene already moved selection into Three.js, added a confirm button, and introduced a responsive two-row layout. However, the latest user feedback changes the desired interaction model again: instead of selecting from multiple visible ships, the menu should act like a carousel with explicit left and right controls. This shifts the problem from multi-item picking to single-item browsing.

The current implementation details that matter:
- `MenuScene.ts` currently renders all menu vehicles at once and uses raycasting for direct ship selection.
- Vehicle scale is normalized by the largest raw model dimension, which is not enough to guarantee consistent perceived size.
- Each displayed vehicle receives a pedestal, label, and optional checkmark.
- Menu text uses bright multi-layered canvas sprites that interact strongly with bloom.
- The menu starfield is similar in concept to `GameScene`, but its parameter tuning does not visually read the same way.

Constraints:
- Stay inside the current Three.js-based menu architecture.
- Keep the existing `game.html?speeder=<index>` launch contract.
- Avoid reintroducing HTML selection controls.
- Keep the implementation friendly to both desktop and narrow screens.

## Goals / Non-Goals

**Goals:**
- Replace direct ship picking with arrow-driven carousel navigation.
- Render a single featured vehicle at a time, with left and right arrow controls inside the scene.
- Make arrow controls feel tactile through short click feedback, not idle breathing animation.
- Normalize menu vehicle presentation so every vehicle appears similarly sized in the menu.
- Remove pedestal geometry and other plate-like decorations under the vehicle.
- Reduce text glare by flattening the title and label rendering treatment.
- Match the menu starfield to the geometric wireframe space style used by `GameScene`.
- Preserve the current confirm-to-start behavior.

**Non-Goals:**
- Redesign the in-race scene or HUD.
- Change vehicle gameplay stats or physics.
- Add persistence, progression, unlock logic, or save data.
- Introduce a new asset pipeline or third-party UI dependency.

## Decisions

### 1. Switch from multi-vehicle picking to a single-vehicle carousel
The menu will show one currently selected vehicle in the center instead of rendering all vehicles as equally interactive choices.

Why this over refining the existing multi-row layout:
- It directly matches the latest requested interaction.
- It removes narrow-screen hit-target ambiguity and spacing pressure.
- It makes consistent scaling much easier because only one vehicle needs to be framed prominently.

Alternative considered:
- Keep multiple visible vehicles and add arrow buttons that only change the selected one. Rejected because it preserves clutter, keeps the old visual hierarchy, and does not fully align with the requested carousel feel.

### 2. Add dedicated left/right scene controls with click feedback
The menu will introduce two arrow controls rendered as scene-native pseudo-3D shapes or canvas-backed sprites. They will remain static at rest and briefly scale up when clicked, then ease back to their base scale.

Why this over breathing arrows:
- The user explicitly asked for click enlargement instead of looping breathing motion.
- Static arrows reduce visual noise and keep focus on the vehicle.

Alternative considered:
- Use keyboard-only or swipe-only navigation. Rejected because the request explicitly calls for clickable left/right controls.

### 3. Normalize vehicle display size using menu-specific presentation scaling
The menu will keep the current model-centering logic but layer a menu-specific presentation scale policy on top of it. This may combine shared normalization with per-vehicle adjustment metadata so the final displayed footprint feels consistent across very different model silhouettes.

Why this over raw bounding-box normalization alone:
- Models with different proportions can have the same largest dimension while still feeling visually mismatched.
- A menu is a presentation surface, so perceptual consistency matters more than pure geometric consistency.

Alternative considered:
- Re-model the vehicles or alter the gameplay assets themselves. Rejected because this is a menu presentation issue, not an asset-authoring issue.

### 4. Remove pedestal and checkmark-driven selection chrome
The carousel will no longer need pedestal plates or a checkmark beneath the selected vehicle. The active state will instead be communicated by the fact that only one vehicle is featured at a time, plus a mild scale emphasis and the active label.

Why this over preserving the pedestal:
- The user explicitly wants the plate removed.
- Removing the pedestal lightens the scene and makes the vehicle read more cleanly.

Alternative considered:
- Keep a subtler pedestal ring. Rejected because it still keeps the same unwanted base treatment.

### 5. Flatten text rendering and reduce bloom interaction
Menu text will be redrawn with lower-contrast fills, little or no glow stroke, and reduced dependence on bloom-enhanced whites. The title can still keep dimensionality through layered color separation, but not through intense white glow.

Why this over only dimming the current colors:
- The current brightness issue comes from both text styling and post-processing interaction.
- A flatter text treatment is more reliable than trying to preserve the same glow-heavy construction with lower values.

Alternative considered:
- Disable bloom globally. Rejected because bloom still helps the broader space-game look and can remain useful if the text itself becomes less emissive in appearance.

### 6. Align menu starfield parameters with the race scene geometry language
The menu background will reuse or more directly mirror the wireframe geometric star style from `GameScene`, with parameter tuning that makes the shapes visibly present behind the menu rather than disappearing into the background.

Why this over keeping the current menu star setup:
- The user explicitly wants the same triangular geometric star feel as `game.html`.
- Visual consistency across menu and gameplay improves the game's identity.

Alternative considered:
- Use a CSS gradient-only backdrop and brighten foreground objects. Rejected because it would again miss the requested geometric space look.

## Risks / Trade-offs

- **[Single-vehicle carousel reduces immediate lineup visibility]** → Keep labels and arrow controls clear so browsing remains fast and understandable.
- **[Per-vehicle menu scale tuning can become ad hoc]** → Centralize any scale overrides in one menu-facing data structure and document that it is presentation-only.
- **[Lower-glow text could lose readability against a dark background]** → Use strong but non-emissive contrast and verify on narrow screens.
- **[Closer alignment with `GameScene` starfield may increase menu rendering cost]** → Tune star density separately for the menu while preserving the same geometric language.
- **[Arrow controls can feel too small on narrow screens]** → Size and place them through viewport-aware layout rules and verify touch usability.

## Migration Plan

1. Refactor the menu layout from multi-vehicle display to single-vehicle carousel display.
2. Add left and right scene controls and remove direct ship-click selection as the primary navigation path.
3. Introduce menu-specific vehicle presentation scaling and remove pedestal/checkmark rendering.
4. Redraw text sprites with a lower-glow treatment and retune menu bloom interaction if needed.
5. Rework the menu starfield so it matches the `GameScene` geometric look more closely.
6. Verify build, arrow navigation, confirm flow, desktop layout, and narrow-screen layout.

Rollback strategy:
- The work remains isolated to menu-specific files, so reverting the menu scene and associated menu assets restores the current selection behavior.

## Open Questions

- Should non-selected vehicles be completely hidden, or should a faint preview of adjacent vehicles remain near the sides?
- Should arrow controls use pure geometry, canvas sprites, or a hybrid pseudo-3D construction?
- Should the confirm button keep its current breathing animation, or should it be toned down once the arrows become the main interaction affordance?
