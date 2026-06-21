## Why

Current NPC driving is stable enough to stay on track after the recent steering fix, but it still behaves more like a cautious path follower than a skilled racer. NPCs react too late to corners, lose speed through over-conservative corrections, and do not read enough of the upcoming track to drive with confidence or consistency.

## What Changes

- Upgrade NPC race-line control from single-point steering correction to long-range track preview with near, mid, and far path awareness.
- Add explicit corner-reading logic so NPCs anticipate curvature, prepare for turns earlier, and choose safer, more professional steering and speed adjustments.
- Introduce a professional cornering controller that blends feedforward steering, target-speed planning, and bounded recovery instead of relying mainly on late understeer braking.
- Keep race-line tracking as the highest priority and force draft, overtake, block, and side-pressure tactics to yield when cornering load or recovery risk is high.
- Raise NPC average skill and minimum skill by reducing low-level driving mistakes, tightening profile variance, and removing control noise from the baseline driving path.
- Extend NPC look-ahead distance substantially so NPCs can see very far ahead on the track and react before the car is already in trouble.

## Capabilities

### New Capabilities
- `npc-long-range-track-preview`: Covers very long forward track preview, multi-horizon path sampling, and curvature estimation for NPC driving.
- `npc-professional-cornering-control`: Covers anticipatory steering, corner speed planning, racing-line bias, and bounded recovery behavior for more expert NPC driving.
- `npc-tactical-safety-gating`: Covers deterministic priority rules that suppress aggressive tactics when track-following, cornering, or recovery requires full control authority.

### Modified Capabilities

## Impact

- Primarily affects [NPC.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/NPC.ts), [raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts), and the NPC update context built in [GameScene.ts](/D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts).
- Reuses the existing shared vehicle physics, path points, path vectors, draft relationships, and tactical intent system rather than replacing them.
- Does not require new runtime dependencies, new track assets, or changes to menu, UI, checkpoint rules, or collision primitives.
