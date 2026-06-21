## 1. Long-Range Track Preview

- [x] 1.1 Add new `raceNpc` preview configuration for very long near, mid, and far look-ahead distances plus curvature sampling windows.
- [x] 1.2 Implement a multi-horizon track preview builder in `NPC` that returns near, mid, and far preview points from future path segments.
- [x] 1.3 Extend the preview builder to derive preview directions, corner direction sign, and normalized curvature strength from future path geometry.
- [x] 1.4 Replace the single look-ahead distance usage with the new multi-horizon preview structure while keeping path indexing bounded and performant.

## 2. Professional Steering Control

- [x] 2.1 Implement near-error and far-error steering inputs from the new preview result.
- [x] 2.2 Add a curvature feedforward steering term so NPCs begin turn-in before local path error becomes large.
- [x] 2.3 Blend the steering terms into a bounded target steer value and keep smoothing/recovery compatible with the shared control path.
- [ ] 2.4 Verify NPCs turn into visible corners earlier and no longer rely on late reactive steering alone.

## 3. Proactive Corner Speed Planning

- [x] 3.1 Implement a `cornerLoad` estimate using previewed curvature, steering demand, and lateral displacement.
- [x] 3.2 Convert `cornerLoad` into a target speed scale and target throttle/brake plan before severe understeer appears.
- [x] 3.3 Keep existing understeer and oversteer recovery as lower-level safety fallbacks beneath the new speed planner.
- [x] 3.4 Add a bounded professional cornering line bias that shifts NPC target position through entry, middle, and exit phases without leaving safe offset limits.

## 4. Tactical Safety Gating

- [x] 4.1 Gate draft, overtake, block, and side-pressure offsets using previewed corner load so tactics fade in heavier corners.
- [x] 4.2 Ensure any active recovery state suppresses aggressive tactical offsets completely until the NPC returns to a safe line.
- [x] 4.3 Retune NPC skill profile variance so baseline competence stays uniformly high and differences remain small.
- [ ] 4.4 Verify tactical behaviors still appear on straights and light bends but yield reliably during demanding cornering or recovery.

## 5. Validation And Tuning

- [x] 5.1 Run `npm run build` and resolve any TypeScript or bundling issues introduced by the new NPC preview and control model.
- [ ] 5.2 Manually verify NPCs can see and react to the track from much farther ahead than before, especially on long approaches to corners.
- [ ] 5.3 Manually verify NPCs begin corner entry earlier, maintain higher average competence, and make fewer obvious low-skill mistakes.
- [ ] 5.4 Manually verify NPCs remain on track more reliably while still resuming tailgating, overtaking, and defensive tactics on safer sections.
