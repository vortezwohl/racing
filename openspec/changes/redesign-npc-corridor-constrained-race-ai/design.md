## Context

The project already has a dedicated `src/ai/npcRacing/` module, worker-backed planning, graph-based branch selection, and stronger NPC assists, but the current behavior is still dominated by centerline projection and target-point following. The user wants elite NPCs that attack aggressively, draft intelligently, and remain on the intended race surface, while still allowing legal short lane changes across small parallel gaps that are part of the track design.

The current implementation is failing at that boundary because it does not model the drivable surface as a constrained corridor system. `TrackGraph` stores centerline samples and heuristic widths, but does not distinguish legal lateral transitions from illegal space. Control and recovery still collapse toward target offsets derived from forward samples, so route commitment, branch entry, and recovery fight each other in dense split and merge zones. This change crosses `Track`, `NPC`, planner runtime, track data, and validation workflows, so a design document is warranted.

## Goals / Non-Goals

**Goals:**
- Represent race tracks as legal drivable corridors with explicit width, left/right boundaries, and legal split/merge/lane-change connectivity.
- Ensure NPC route projection and planning remain topologically continuous and cannot jump across illegal non-track space just because another sample is geometrically closer.
- Allow NPCs to use legal connector changes for aggression, overtakes, defense, and shorter valid race lines.
- Replace point-chasing control with corridor-constrained short-horizon trajectory tracking.
- Keep the existing async planner architecture and preserve main-thread responsiveness.
- Add a final observation-based validation pass that launches a race without player control and checks whether NPCs look like aggressive professional racers while staying on legal track corridors.

**Non-Goals:**
- This change does not rewrite the vehicle physics model or the player handling model.
- This change does not introduce machine learning, full continuous MPC over the entire lap, or exact multi-agent game-theoretic optimization.
- This change does not require every track to be manually annotated from scratch before the system can run; inferred defaults remain supported with optional explicit connector metadata where needed.
- This change does not attempt to make NPCs polite or fair; aggression is allowed as long as it remains legal and survivable within the track system.

## Decisions

### 1. Promote TrackGraph from centerline graph to corridor graph

The graph SHALL store legal drivable corridors, not just center samples. Each edge will expose per-sample center, left boundary, right boundary, half width, tangent, curvature, safe speed, and legal lateral ranges. Parallel routes and split/merge regions will remain graph edges, but valid lateral transitions between nearby corridors will be modeled as explicit connector edges.

Rationale:
- The user's core requirement is "plan by track width, not by target points."
- Explicit boundaries let us reject illegal shortcut candidates as infeasible instead of merely penalizing them.

Alternatives considered:
- Keep heuristic `corridorHalfWidth` only and increase penalties for off-track movement. Rejected because it still allows illegal geometric shortcut impulses and does not identify where a small cross-gap lane change is actually legal.

### 2. Introduce explicit legal connector metadata with inferred fallback

Tracks SHALL support optional connector hints for legal lane changes and branch-adjacent crossover zones. Where no authored hints exist, the graph builder may infer candidate connectors between nearby parallel corridors only if they satisfy gap, heading, and overlap thresholds.

Rationale:
- The user explicitly allows crossing small gaps between parallel roads.
- Connectors must be explicit or inferred under strict rules; otherwise NPCs will invent illegal shortcuts.

Alternatives considered:
- Ban all lateral cross-gap motion. Rejected because it would block the desired aggressive change-lane attacks and shortest legal route selection.
- Allow any geometrically short lateral move. Rejected because that recreates the current illegal shortcut problem.

### 3. Use corridor state instead of nearest-point-only state

NPC state SHALL be tracked in corridor coordinates:
- current route edge
- longitudinal progress `s`
- lateral offset `l`
- lateral rate / smoothing state
- branch commit
- connector commit

Projection SHALL prefer continuity within the committed route and connector neighborhood. It SHALL NOT jump to unrelated nearby corridors unless a legal connector or split transition is active.

Rationale:
- This removes split dithering, route snapping, and recovery fighting route commitment.

Alternatives considered:
- Keep world-space nearest-point projection with larger hysteresis. Rejected because hysteresis alone does not encode which cross-gap moves are legal.

### 4. Replace target-point steering with corridor-constrained trajectory tracking

The control layer SHALL stop treating the forward sample as a single steering target. Instead, it will evaluate a bounded set of short-horizon trajectory candidates in corridor coordinates, including:
- stay in current corridor lane
- commit into selected branch
- traverse a legal connector
- defend, draft, or overtake within a legal corridor
- recover into the active legal corridor

Each candidate will be scored against:
- corridor legality
- braking reachability
- lateral feasibility
- collision risk
- progress reward
- aggression reward

Rationale:
- The current "desired offset + feedforward" model is what causes midpoint dithering and over-rotation at branch entry.

Alternatives considered:
- Keep target-point steering and tune gains. Rejected because the user has already exposed that the failure mode is structural, not merely parametric.

### 5. Keep multi-rate async planning, but change what each layer plans

The worker architecture remains, but the layers will operate on corridor primitives:
- route layer: choose corridor routes and legal connectors
- traffic layer: choose aggressive intents that respect connector legality and survivability
- control layer: choose corridor-feasible short-horizon trajectories

Fallback synchronous planning remains available during rollout and debugging.

Rationale:
- The async runtime already exists and should be preserved.
- The redesign is about planning semantics, not abandoning the architecture that keeps frame time stable.

Alternatives considered:
- Collapse everything into one synchronous planner for simplicity. Rejected because it would regress frame stability and violate prior user requirements.

### 6. Add explicit unattended race observation validation

Validation SHALL include launching a race with no player control input and observing whether NPCs:
- stay on legal track corridors
- use legal branch or connector changes
- remain aggressive in traffic
- avoid routine track exits

This may be implemented as a manual validation script, a dev observation mode, or a documented QA flow with telemetry capture.

Rationale:
- The user explicitly wants the final judgment to come from watching a race, not only from code structure or unit tests.

Alternatives considered:
- Rely only on build success and static telemetry. Rejected because the desired behavior is visual and emergent.

## Risks / Trade-offs

- [Connector inference is too permissive] → Mitigation: require heading alignment, bounded gap width, overlap distance, and optionally authored track hints for ambiguous sections.
- [Connector inference is too strict] → Mitigation: allow per-track connector metadata overrides for sections like `track_1` where legal parallel crossings matter.
- [Trajectory tracking costs more than point chasing] → Mitigation: use bounded candidate sets, fixed horizons, and keep heavy route and tactical work in lower-frequency layers.
- [Over-constrained legality makes NPCs passive] → Mitigation: treat legal connectors as first-class attack and overtake tools so aggression remains available without illegal shortcuts.
- [Recovery may still fight tactical intent] → Mitigation: recovery always targets the active legal corridor first, and tactical intent is suppressed until stability is restored.
- [Existing tracks may expose missing topology data] → Mitigation: add graph validation and debug output that identifies disconnected loops, ambiguous connectors, and unmodeled lateral transitions early.

## Migration Plan

1. Extend track graph types to store corridor boundaries, legal lateral windows, and connector edges.
2. Add optional track metadata or inferred connector generation for legal parallel-lane transitions.
3. Replace projection and route commitment with corridor-continuous state and connector-aware legality checks.
4. Refactor traffic planner to choose only legal aggressive lane changes and attack lines.
5. Refactor control planner to evaluate corridor-feasible short-horizon trajectories instead of chasing target offsets.
6. Keep synchronous fallback available while wiring the new corridor semantics into the worker runtime.
7. Run unattended race observation validation and only then retire legacy point-chasing assumptions from normal NPC updates.

Rollback strategy:
- Keep the current sync fallback and current graph planner code path behind flags during migration.
- If corridor planning destabilizes a track, fall back to the previous planner while retaining graph instrumentation for debugging.

## Open Questions

- Should connector metadata live directly in `TrackData`, or should the graph builder derive a normalized connector layer from a higher-level track annotation format?
- Do we want an explicit debug overlay for corridor bounds and legal connector windows during rollout?
- Should unattended race observation eventually produce structured telemetry artifacts, or is a manual dev-mode observation pass sufficient for the first iteration?
