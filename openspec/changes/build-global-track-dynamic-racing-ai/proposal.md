## Why

The current NPC controller is still fundamentally a local heuristic driver: it samples future path points, estimates immediate steering and corner risk, and then reacts with hand-tuned throttle, brake, and tactical offsets. Even after recent long-range preview and corner-safety improvements, this structure cannot deliver the user's target behavior of "fast and stable at the same time" because path choice, speed choice, and racecraft are still not solved together as one rolling optimization problem.

## What Changes

- Build a full-track global race model from the existing `Track.pathPoints` / `pathVectors` data so every NPC can reason over the entire course geometry instead of only a local preview window.
- Add a receding-horizon local path planner that searches multiple future racing-line candidates in track-relative coordinates instead of steering toward a single look-ahead target.
- Add a speed-profile planner that computes the fastest feasible target speed along the planned local path using shared acceleration/braking limits and corner curvature, instead of deciding braking only from late local error.
- Unify draft seeking, overtaking, blocking, and side-pressure behaviors into a dynamic priority system that influences trajectory scoring instead of injecting ad hoc lane offsets after the fact.
- Keep a bounded recovery and safety fallback layer so the planner still collapses to "stay on track first" when the local optimization would otherwise become unstable.

## Capabilities

### New Capabilities
- `npc-global-track-awareness`: Covers full-track geometry preprocessing, track-relative coordinates, and long-range global race context for NPC planning.
- `npc-receding-horizon-race-planning`: Covers rolling local path search on future track segments using multiple candidate lines instead of single-point steering.
- `npc-speed-profile-optimization`: Covers fastest-feasible speed planning along the chosen local path using shared vehicle acceleration/braking limits and curvature-aware speed envelopes.
- `npc-dynamic-racecraft-priority`: Covers dynamic weighting of draft, overtake, block, attack, defense, and recovery priorities inside a unified trajectory scoring model.

### Modified Capabilities

## Impact

- Primarily affects [Track.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Track.ts), [NPC.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/NPC.ts), [Vehicle.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts), [GameScene.ts](/D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts), and [raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts).
- Likely introduces new planning-oriented utility modules for global track modeling, lattice search / beam search, and speed-envelope computation.
- Reuses the existing shared player/NPC vehicle physics execution path instead of adding a separate external solver service or new physics engine.
- Does not require new track assets, authored apex metadata, or external runtime dependencies if implemented with in-repo TypeScript utilities.
