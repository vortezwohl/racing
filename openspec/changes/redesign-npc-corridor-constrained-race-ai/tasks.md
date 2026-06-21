## 1. Corridor Track Data Model

- [x] 1.1 Extend `src/ai/npcRacing/types.ts` to represent corridor boundaries, legal lateral ranges, connector edges, connector windows, and corridor-state planning fields.
- [x] 1.2 Refactor `src/ai/npcRacing/trackGraph.ts` to build corridor-aware edges with center samples, left/right boundaries, width, curvature, and safe-speed data.
- [x] 1.3 Add legal connector generation support in `trackGraph.ts`, including strict inferred fallback rules for nearby parallel corridors.
- [x] 1.4 Add optional connector metadata support to track data structures in `src/utils/interfaces.ts` and populate `data/tracks/track_1.ts` if inference alone is ambiguous.
- [x] 1.5 Add graph validation helpers that detect disconnected loops, illegal connector candidates, ambiguous branch zones, and missing legal transitions.

## 2. Route State And Projection Continuity

- [x] 2.1 Replace nearest-sample route projection with corridor-continuous projection that prefers the active route, branch, and connector neighborhood.
- [x] 2.2 Add explicit branch commitment and connector commitment state to NPC route planning and preserve commitment until the legal transition completes.
- [x] 2.3 Prevent projection from jumping to unrelated nearby corridors unless a legal split, merge, or connector transition is active.
- [x] 2.4 Update route candidate generation to include legal connector-based shorter valid routes while excluding illegal shortcut candidates.
- [x] 2.5 Add route and projection telemetry that identifies active corridor edge, branch commit, connector commit, and illegal transition rejections.

## 3. Tactical Racecraft On Legal Connectors

- [x] 3.1 Update traffic indexing to reason in corridor coordinates and connector neighborhoods instead of purely geometric proximity.
- [x] 3.2 Allow draft pursuit, overtakes, blocks, and squeeze actions to choose legal connector transitions where they improve tactical outcome.
- [x] 3.3 Reject attack, block, or shortcut candidates that cross non-drivable space or violate braking and survivability constraints.
- [x] 3.4 Add connector-aware tactical suppression and recovery gating so unstable NPCs stop attacking until they return to a valid corridor state.
- [x] 3.5 Expose tactical telemetry for legal connector usage, rejected illegal shortcuts, and active aggressive intent.

## 4. Corridor-Constrained Control Planning

- [x] 4.1 Replace target-point steering in `src/ai/npcRacing/controlPlanner.ts` with bounded short-horizon trajectory candidates in corridor coordinates.
- [x] 4.2 Score control candidates by corridor legality, braking reachability, lateral feasibility, collision risk, progress reward, and aggression reward.
- [x] 4.3 Implement smooth branch-entry and connector-entry trajectory shaping so NPCs stop dithering or over-rotating at split and lane-change regions.
- [x] 4.4 Rework recovery so it rejoins the active legal corridor or connector instead of snapping toward a generic centerline.
- [x] 4.5 Preserve compatibility with `Vehicle.applyControlInput()` while ensuring illegal cross-gap steering targets are never emitted.

## 5. Async Runtime Integration

- [x] 5.1 Update `plannerWorker.ts`, `plannerClient.ts`, and `synchronousPlanner.ts` to carry corridor-state, connector-state, and legality-aware plan data.
- [x] 5.2 Keep the multi-rate worker architecture while switching route, tactical, and control layers to corridor-constrained planning semantics.
- [x] 5.3 Maintain deterministic fallback behavior during rollout if corridor planning state is missing or stale.
- [x] 5.4 Add planner debug hooks or lightweight diagnostics for corridor projection, connector legality, and recovery causes.

## 6. Validation And Observation

- [x] 6.1 Run `npx tsc --noEmit` and `npm run build`, resolving corridor-planning and worker integration issues.
- [ ] 6.2 Verify on `track_1` that NPCs do not cross illegal non-track gaps when choosing routes or attacking.
- [ ] 6.3 Verify NPCs can use legal small-gap parallel-lane changes when overtaking, defending, or seeking shorter valid lines.
- [ ] 6.4 Verify NPCs no longer dither at the first branch and instead enter legal branches or connectors smoothly.
- [ ] 6.5 Launch a full race with no player control input and observe whether NPCs behave like aggressive professional racers while remaining on legal track corridors and avoiding routine track exits.
