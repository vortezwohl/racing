## Why

Current NPC driving is built around local sampled path following plus short-horizon scoring. That approach breaks down on branch/merge tracks and in dense multi-vehicle racing because NPCs do not have stable track topology, asynchronous global planning, or a clear separation between route strategy, traffic racecraft, and high-frequency control.

This change introduces a dedicated NPC racing AI module that can plan asynchronously, see the full track and all vehicles, choose routes through forks, attack and defend in traffic, and still keep render-frame cost stable.

## What Changes

- Add a dedicated NPC AI module folder for track topology, route strategy, traffic racecraft, high-frequency control, worker messaging, and shared planning types.
- Replace nearest-point-only NPC path reasoning with a `TrackGraph` representation containing edges, nodes, branches, merges, route candidates, arc-length projection, and precomputed racing data.
- Add an asynchronous multi-rate planner:
  - control planning at 45 Hz or higher,
  - traffic/racecraft planning at 25 Hz or higher,
  - global route/strategy planning around 10 Hz.
- Move expensive NPC planning work off the render loop through a worker-backed planner architecture with non-blocking result consumption and stale-plan rejection.
- Add global full-track awareness so NPCs can evaluate complete track topology and all live vehicle positions while still reducing runtime cost through route windows, nearby-vehicle filtering, and cached precomputation.
- Add aggressive but survivable racecraft:
  - straight-line draft pursuit,
  - fast overtake selection,
  - blocking and line-claiming,
  - side squeeze and exit crowding,
  - suppression of attacks that would make the attacker leave its own viable route.
- Add NPC-only assists as explicit, tunable capabilities rather than accidental physics hacks:
  - brake assist,
  - steer/grip assist,
  - recovery assist,
  - draft assist,
  - racecraft assist.
- Preserve player handling and shared vehicle physics compatibility; NPC-only buffs must be applied through AI/control metadata or explicit NPC control scaling.

## Capabilities

### New Capabilities

- `async-npc-planning-runtime`: Covers worker-backed asynchronous NPC planning, multi-rate scheduling, non-blocking render-loop integration, stale result handling, and runtime performance budgets.
- `track-graph-route-planning`: Covers full-track topology modeling, branch/merge route selection, stable edge/progress projection, route scoring, and precomputed racing-line data.
- `npc-global-racecraft`: Covers multi-vehicle global awareness, draft pursuit, overtaking, blocking, squeezing, defensive behavior, and safe attack windows against player and NPC vehicles.
- `npc-elite-assist-model`: Covers NPC-only steering, braking, grip, draft, recovery, and racecraft assists that raise NPC strength while keeping behavior coherent and controllable.

### Modified Capabilities

- None.

## Impact

- Affected source areas:
  - `src/objects/Track.ts` for exposing or feeding track topology data.
  - `src/objects/NPC.ts` for consuming asynchronous plans and applying NPC-only assists.
  - `src/scenes/GameScene.ts` for publishing race snapshots and consuming planner outputs without blocking rendering.
  - `src/utils/racePlanning.ts` as a migration source; substantial logic should move into the new NPC AI module folder.
  - `src/utils/raceConfig.ts` for planner rates, budgets, route/racecraft weights, and assist tuning.
- New module area:
  - `src/ai/npcRacing/` or equivalent dedicated folder for all high-value NPC planning code.
- New runtime surface:
  - A worker entry for asynchronous planning.
  - Typed message contracts for track graph initialization, vehicle snapshots, planner outputs, and debug telemetry.
- Performance impact:
  - Render loop must not wait on planner work.
  - Runtime planning must rely on precomputed track data, bounded candidate counts, nearby-vehicle filtering, and per-layer time budgets.
- Compatibility:
  - Existing player controls remain unchanged.
  - NPC execution must remain compatible with `Vehicle.applyControlInput()`.
