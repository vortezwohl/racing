## 1. Trail Configuration

- [ ] 1.1 Extend race trail configuration with fluid trail sample count, min/max length, core width, glow width, opacity, wobble strength, and flow speed values.
- [ ] 1.2 Add marker proximity fade configuration with full-opacity distance, fade-end distance, and minimum opacity.
- [ ] 1.3 Verify configuration keeps draft, collision, performance, and FOV values unchanged except for trail visual and marker fade settings.

## 2. Fluid Trail Rendering

- [ ] 2.1 Replace the current line-only trail renderer with a per-vehicle fluid trail group.
- [ ] 2.2 Create reusable canvas radial-gradient glow texture for trail glow sprites without adding external assets.
- [ ] 2.3 Build a ribbon mesh from trail sample positions so each trail has visible width and a bright core.
- [ ] 2.4 Add outer glow sprites along trail samples to create volume and plasma/flame-like diffusion.
- [ ] 2.5 Apply deterministic visual wobble to ribbon or glow positions without changing the underlying draft detection sample path.
- [ ] 2.6 Scale trail visible length, width, opacity, and intensity with vehicle speed while enforcing a maximum length.
- [ ] 2.7 Verify fluid trails are clearly visible, longer than the previous line trail, identity-colored, and non-blocking.

## 3. Marker Proximity Fade

- [ ] 3.1 Add helper logic to compute marker opacity from camera distance using configured fade thresholds.
- [ ] 3.2 Apply the same computed opacity to every sprite material inside each NPC marker group.
- [ ] 3.3 Ensure local player marker remains hidden and NPC markers remain fully visible outside the fade range.
- [ ] 3.4 Verify close NPC markers fade smoothly instead of blocking the camera.

## 4. Verification

- [ ] 4.1 Run `npm run build` and fix any TypeScript or bundling errors.
- [ ] 4.2 Run a browser smoke test for the race page and confirm it loads without new Three.js runtime crashes.
- [ ] 4.3 Manually inspect trail visuals in motion and tune fluid parameters if tails are still too subtle or too short.
- [ ] 4.4 Review final diff for scope control, ensuring no unrelated gameplay systems were changed.
