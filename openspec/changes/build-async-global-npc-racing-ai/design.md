## Context

The current NPC stack is still centered on synchronous per-frame planning:

- `Track.ts` builds sampled path points by appending every collision-layer curve into one ordered path. This loses topology when the track contains branch/merge sections such as the first split in `track_1.ts`.
- `NPC.ts` calls `buildNpcTrajectoryPlan()` directly during each NPC update, so planning cost is paid on the render/gameplay thread.
- `GameScene.ts` updates all vehicles, draft state, collisions, standings, and HUD on the main thread. NPC planning must therefore avoid blocking frame refresh.
- `racePlanning.ts` contains valuable logic for curvature, speed envelopes, collision risk, draft pursuit, and recovery, but it mixes track projection, route choice, traffic intent, and low-level controls in one synchronous function.

The user wants NPCs that are stronger than skilled players while preserving frame rate:

- hard straight-line acceleration and fast overtakes,
- aggressive blocking and squeezing,
- precise, stable, fast cornering without leaving the track,
- NPC-only assists when needed,
- asynchronous planning that does not block rendering or other NPCs,
- high planning frequency,
- full-track and full-field awareness,
- low runtime complexity.

This design treats the NPC AI as a high-value subsystem and moves it into a dedicated module folder.

## Goals / Non-Goals

**Goals:**

- Create a dedicated `src/ai/npcRacing/` module for new NPC planning code.
- Represent the race track as a graph of edges and nodes, not a single nearest-point path.
- Make fork and merge decisions explicit through route planning.
- Run AI planning asynchronously so the render loop never waits for planner work.
- Use multi-rate planning:
  - control layer at 45 Hz or higher,
  - traffic racecraft layer at 25 Hz or higher,
  - global route strategy layer around 10 Hz.
- Let NPCs use global track topology and all live vehicle positions.
- Keep runtime complexity bounded through precomputation, nearby-vehicle filtering, and limited candidate sets.
- Preserve `Vehicle.applyControlInput()` compatibility while allowing NPC-only control assists.
- Make NPC straight-line, overtake, attack, and cornering behavior stronger and more deliberate.

**Non-Goals:**

- Do not replace the rendering engine, vehicle class hierarchy, or player control model.
- Do not introduce a machine-learning dependency.
- Do not attempt exact mathematical global optimality for all continuous controls and all vehicles. The target is deterministic, bounded, high-quality approximate optimization using full global context.
- Do not rewrite race collision physics as part of the first implementation slice.
- Do not require manual racing-line authoring for every track before the system works. Authored hints can be added later.

## Decisions

### 1. Put NPC AI in a dedicated module folder

Create `src/ai/npcRacing/` with clear submodules:

- `types.ts`: serializable track, vehicle, plan, intent, assist, and worker message types.
- `trackGraph.ts`: graph construction, edge sampling, branch/merge detection, route candidates, projection.
- `routePlanner.ts`: 10 Hz global route strategy.
- `trafficPlanner.ts`: 25 Hz draft, overtake, block, squeeze, and avoidance decisions.
- `controlPlanner.ts`: 45-60 Hz short-horizon throttle/brake/steer planning.
- `assistModel.ts`: NPC-only control assist calculation.
- `snapshot.ts`: main-thread race snapshot extraction and worker-safe serialization.
- `plannerClient.ts`: main-thread worker client, plan buffering, stale-result rejection.
- `plannerWorker.ts`: worker entry and multi-rate scheduler.

Rationale:

- Current NPC planning has become valuable enough to deserve ownership boundaries.
- Keeping AI outside `objects/` and `utils/` reduces coupling and makes later profiling/debugging sane.

Alternative considered:

- Continue extending `racePlanning.ts`. Rejected because it already mixes too many responsibilities and cannot cleanly support worker serialization or track graph state.

### 2. Use `TrackGraph` as the source of truth for NPC route planning

Build a graph from track curve data and collision-layer samples:

- `TrackNode`: start, split, merge, checkpoint-adjacent, edge endpoints.
- `TrackEdge`: sampled centerline, width/corridor, curvature, tangent, lateral vectors, length, slope, segment tags.
- `RouteCandidate`: ordered edge sequence through future branch/merge decisions.
- `EdgeProjection`: `edgeId`, `distanceOnEdge`, `lateralOffset`, `headingError`, `distanceToCenter`.

Branch detection can start from `curveData` sequence and spatial endpoint proximity:

- consecutive single-lane sections become normal edges,
- parallel alternatives with near shared start/end points become branch edges,
- converging endpoints become merge nodes,
- loops are connected through checkpoint/start metadata.

Rationale:

- A fork is a topology decision, not a nearest-point accident.
- Stable `edgeId + distanceOnEdge` prevents branch oscillation at splits.

Alternative considered:

- Keep nearest-point path projection with hysteresis. Rejected because it hides branch semantics and will still fail when two route options are spatially close.

### 3. Use asynchronous worker-backed planning with latest-plan consumption

Main thread responsibilities:

- Build/export static `TrackGraph` once per race load.
- Send immutable graph data to the worker during initialization.
- Every frame, publish a compact `RaceSnapshot` containing:
  - race time,
  - each vehicle id/type,
  - position, direction, velocity, speed, draft state, lap/progress data,
  - latest collision/recovery flags if available.
- Apply the latest completed `NpcControlPlan` for each NPC.
- Never `await` a worker response during rendering or vehicle physics.

Worker responsibilities:

- Maintain planner state per NPC.
- Consume the latest snapshot, dropping older snapshots if behind.
- Run route, traffic, and control layers at configured rates.
- Return plan batches with `snapshotId`, `planVersion`, and per-NPC freshness metadata.

Rationale:

- Rendering stays smooth even if planning momentarily overruns.
- Planning for one NPC cannot block another NPC's control execution on the main thread.

Alternative considered:

- Use `setTimeout` on the main thread. Rejected because it still competes with rendering and physics.

### 4. Use multi-rate layered planning instead of one monolithic optimizer

Layer 1: control planner, 45-60 Hz

- Horizon: roughly 0.5-1.2 seconds or 30-80 meters.
- Inputs: current route edge, traffic intent, speed envelope, assist model.
- Outputs: throttle, brake, steer, target speed, target lane offset, assist scales.
- Candidate space: small beam over lane offset, speed mode, and emergency recovery mode.

Layer 2: traffic planner, 25-30 Hz

- Horizon: nearby vehicles and upcoming route window.
- Inputs: all vehicle snapshots, route-relative projections, draft state, branch options.
- Outputs: draft target, overtake side, block line, squeeze/attack intent, avoidance constraints.
- Filtering: detailed evaluation only for vehicles inside route-relative front/rear windows.

Layer 3: route planner, 8-10 Hz

- Horizon: full track graph or next route cycle.
- Inputs: all route candidates, traffic density, upcoming curvature, branch length, overtake/draft opportunities.
- Outputs: route sequence, branch choice, long-range speed posture, strategic aggression bias.

Rationale:

- High-frequency control remains cheap.
- Lower-frequency global strategy can use richer global information without frame spikes.

Alternative considered:

- Full-lap exhaustive optimization every frame. Rejected because it is too expensive and unnecessary for responsive driving.

### 5. Use global context with bounded local detail

The planner SHALL see the full track graph and all vehicle snapshots. It SHALL NOT run full pairwise deep evaluation for every vehicle every tick.

Use two levels of awareness:

- Global summaries:
  - each vehicle route projection,
  - rank/progress,
  - route occupancy,
  - branch congestion,
  - potential draft chains.
- Detailed windows:
  - vehicles ahead within the attack/overtake horizon,
  - vehicles behind within the block/defense horizon,
  - side-by-side overlaps,
  - branch merge conflicts.

Rationale:

- NPCs make globally informed decisions while keeping complexity near `O(N * M)` where `M` is nearby vehicles, not all vehicles.

Alternative considered:

- Detailed pairwise all-vehicle planning. Rejected because it scales poorly and is not needed for most interactions.

### 6. Make start behavior a special deterministic phase

For the first start window, before the first braking zone or traffic emergency:

- throttle target is full,
- brake target is zero,
- route choice is fixed or preselected,
- lane changes are damped,
- aggressive traffic actions are suppressed or heavily gated,
- avoidance remains active for direct collision risk.

Rationale:

- A start boost does nothing if the planner returns low throttle or brake. Starts need a hard launch policy.

Alternative considered:

- Only increase `accelerationScale`. Rejected because it cannot overcome low planner throttle.

### 7. Express NPC-only buffs as explicit assist outputs

NPC assists should be transparent and tunable:

- `brakeAssistScale`: stronger braking and earlier braking authority.
- `steerAssistScale`: better path tracking in corners.
- `gripAssistScale`: reduced lateral instability and better corner retention.
- `draftAssistScale`: stronger but still idempotent slipstream exploitation.
- `recoveryAssistScale`: emergency rejoin and anti-track-loss correction.
- `racecraftAssistScale`: stronger target selection and attack timing.

These assists are applied through NPC control metadata and execution scaling, not by changing player physics.

Rationale:

- The user explicitly allows NPC buffs.
- Explicit assists are easier to tune and debug than hidden cheats.

Alternative considered:

- Raise global vehicle physics. Rejected because it changes player handling and makes tuning less precise.

### 8. Prefer incremental migration with a compatibility adapter

Implementation should not require a single high-risk replacement:

1. Build `TrackGraph` alongside existing `Track` sampling.
2. Add a synchronous adapter that can produce the same shape of NPC control plan.
3. Move planner logic into `src/ai/npcRacing/`.
4. Add worker client and non-blocking plan buffering.
5. Switch NPC execution to consume async plans.
6. Remove or demote legacy `racePlanning.ts` only after behavior is stable.

Rationale:

- The game is playable and should remain so through the migration.
- Each slice can be built and verified independently.

Alternative considered:

- Big-bang rewrite. Rejected because it would make regressions hard to isolate.

## Risks / Trade-offs

- [Worker bundling complexity] -> Start with a simple worker entry compatible with the existing webpack build; keep message types serializable and avoid passing `THREE.Vector3` instances across the boundary.
- [Stale plans could feel delayed] -> Include snapshot ids and plan ages; main thread discards stale plans and falls back to deterministic emergency control when needed.
- [Route graph inference may misread some tracks] -> Build the first graph from existing `curveData` and endpoint proximity, then add optional authored hints only if inference is insufficient.
- [NPCs could become too strong or unfair] -> Keep assist values in config, expose debug telemetry, and tune by assist category rather than hiding changes in physics.
- [Asynchronous results make debugging harder] -> Add plan debug metadata: selected route, speed mode, racecraft intent, assist activation, planner layer ages, and worker budget usage.
- [Performance could still regress if worker work is too heavy] -> Enforce per-layer budgets, bounded beam widths, candidate caps, and stale snapshot dropping.
- [Traffic aggression could become self-destructive] -> Keep attacker survivability as a hard gate before scoring attack reward.

## Migration Plan

1. Add `src/ai/npcRacing/` with serializable types, configuration mapping, and static graph construction helpers.
2. Build `TrackGraph` from existing track data and expose graph initialization from `Track` or `GameScene`.
3. Replace nearest-point NPC projection with stable graph projection in a compatibility path.
4. Implement route planner at 10 Hz using full graph context and branch/merge route candidates.
5. Implement traffic planner at 25 Hz using global snapshots plus nearby detailed windows.
6. Implement control planner at 45-60 Hz with route-bound lane/speed/control candidates.
7. Add explicit NPC assist model and apply assist outputs through `NPC` control execution.
8. Add worker client and worker scheduler; keep synchronous fallback available during rollout.
9. Switch `GameScene` to publish snapshots and consume latest plan batches without blocking.
10. Add debug telemetry for planner freshness, route choice, traffic intent, and assist activation.
11. Validate build, frame stability, start launch, first fork behavior, heavy corner retention, draft overtakes, side attacks, and recovery behavior.

## Open Questions

- Should track graph branch hints be inferred only from geometry at first, or should `TrackData` gain optional route metadata in the same change?
- Should debug visualization for selected edge, route, speed envelope, and attack target be included in the first implementation or kept behind a follow-up change?
- Should NPC assist presets vary by difficulty later, or should this change only implement a single elite baseline?
