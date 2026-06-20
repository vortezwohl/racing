## 1. Trail Capability Planning

- [x] 1.1 Extend race trail configuration to separate visible cluster spread, cluster density, and draft gameplay width.
- [x] 1.2 Preserve the current effective trail length pipeline so visual length and gameplay length continue sharing one source path.
- [x] 1.3 Review existing ribbon-based trail state shape and identify which mesh-specific fields can be removed or replaced.

## 2. Volume Trail Rendering

- [x] 2.1 Replace ribbon-dominant trail rendering with a volume-cluster renderer based on effective trail sample positions.
- [x] 2.2 Implement per-sample primary glow clusters plus lower-opacity offset sub-clusters to create readable trail volume.
- [x] 2.3 Add a sparse particle layer or equivalent low-cost accent layer to increase fluid motion perception without excessive brightness.
- [x] 2.4 Keep trail visibility scaling with speed by adjusting visible sample count, cluster density, or opacity while respecting the configured maximum length.
- [ ] 2.5 Verify the trail silhouette reads as gas/plasma volume rather than a flat ribbon from multiple camera angles.

## 3. Draft Width Separation

- [x] 3.1 Split the gameplay draft width configuration from the visible trail width configuration.
- [x] 3.2 Update trail draft detection so the player-friendly gameplay width can be slightly wider than the visible trail body.
- [ ] 3.3 Verify trail gameplay length still matches the visible trail length even after width separation.

## 4. Screen-Space Marker System

- [x] 4.1 Introduce a screen-space race marker container or HUD sub-layer for NPC name and triangle overlays.
- [x] 4.2 Replace world-space NPC marker sprites with projected 3D anchor points that drive fixed-size overlay placement.
- [x] 4.3 Keep the local player marker hidden while NPC markers continue to update.
- [x] 4.4 Retune marker typography to a thinner, less stylized style while preserving color identity and readability.

## 5. Marker Visibility Rules

- [x] 5.1 Update marker fade logic so proximity and screen-center suppression modify opacity only and never marker size.
- [x] 5.2 Ensure markers remain visible through world geometry because they render in overlay space.
- [ ] 5.3 Verify clustered race-start scenes still avoid camera obstruction through overlay fade rules.

## 6. Verification

- [x] 6.1 Run `npm run build` and fix any TypeScript or bundling issues introduced by the new trail and overlay marker architecture.
- [ ] 6.2 Manually verify from multiple race camera angles that the new tail reads as a volume particle wake instead of a ribbon strip.
- [ ] 6.3 Manually verify that fixed-size NPC names and triangles remain readable at far distance and do not shrink with perspective.
- [ ] 6.4 Manually verify that the widened gameplay draft width improves trail entry tolerance without making the visual trail look artificially oversized.
