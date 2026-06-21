## Context

The current codebase already contains three important ingredients for a much stronger racing AI:
- `Track.ts` builds a sampled centerline through `pathPoints` and `pathVectors`, which gives a consistent global course backbone.
- `Vehicle.ts` provides a shared physics execution layer with bounded steering, acceleration, braking, draft boost, and recent NPC-only assist hooks (`brakeScale`, `steerScale`).
- `NPC.ts` already collects tactical context from `GameScene.ts`, including nearby vehicles and draft relations.

However, the NPC controller still uses these ingredients in a local, staged way: it chooses a near-term lateral target, computes steering from preview errors, then separately computes throttle/brake from heuristic corner risk, and finally adds tactical offsets after the main line choice is already made. This architecture makes NPCs look reactive, short-sighted, and occasionally indecisive, especially through linked corners and behavior conflicts like "eat draft vs prepare for braking zone."

The user now wants a fundamentally stronger AI: NPCs should understand the full track, jointly plan path and speed, and dynamically balance racecraft behaviors such as draft seeking and aggression instead of bolting them on after the line has already been chosen.

## Goals / Non-Goals

**Goals:**
- Give every NPC a full-track global geometry model derived from the existing track centerline data.
- Move NPC driving from single-target steering to rolling local trajectory planning in track-relative coordinates.
- Jointly solve local path choice and speed choice so the NPC no longer behaves like "stop first, then turn."
- Integrate draft, overtaking, blocking, side-pressure, and recovery into one dynamic trajectory scoring system with priorities that change by situation.
- Preserve shared player/NPC physics execution while making the NPC planner smart enough to use that shared model more effectively.

**Non-Goals:**
- Do not introduce a heavy external optimizer, ML model, or native dependency.
- Do not require hand-authored ideal-line files, apex markers, or per-track speed-limit tables.
- Do not redesign player handling, camera logic, UI, menu flow, or checkpoint rules.
- Do not remove racecraft variety; instead, make it subordinate to planned path safety and progress.

## Decisions

### 1. The planner will use a global track model plus a local rolling horizon, not full-lap optimization every frame

Each track will be preprocessed into a global planning representation containing sampled arc length, tangent, lateral basis, curvature, and a safe planning corridor around the current centerline. NPCs will then plan only over a rolling future horizon (for example, the next 1.2s to 2.0s of travel distance), while still using the full-track model for long-range context.

Why this approach:
- It satisfies the user's requirement that NPCs see the entire track.
- It remains computationally feasible in browser TypeScript for multiple NPCs.
- It prevents short-sighted local control without requiring an intractable full-lap optimization every frame.

Alternative considered:
- Replan across the whole lap every frame. This was rejected because the search space becomes too large and unnecessary; the AI needs full-track awareness, not full-track exhaustive optimization every tick.

### 2. Path planning will use track-relative lattice search / beam search instead of steering directly to sampled points

The local planner will represent future states in a Frenet-like coordinate system:
- `s`: distance along the track centerline
- `l`: lateral offset relative to the centerline

For each forward step in the local horizon, the planner will generate several lateral candidates and score transitions between them. A beam search or dynamic-programming lattice will keep only the best path candidates, producing a full local reference trajectory rather than a single point target.

Why this approach:
- It fits naturally on top of the existing `pathPoints` centerline.
- It jointly reasons about curvature, lane shifts, smoothness, and vehicle interactions.
- It is dramatically easier to implement and tune in the current codebase than continuous nonlinear MPC.

Alternative considered:
- Add more look-ahead points and continue tuning heuristic steering. This was rejected because it still leaves path and speed uncoupled and cannot truly optimize race line choices across linked corners.

### 3. Speed planning will be solved along the chosen path using a curvature-based feasible speed envelope

Once the local path is chosen, the planner will compute a target speed profile along that path:
- derive a safe upper speed bound from path curvature and planned lateral motion,
- run a forward pass with shared acceleration limits,
- run a backward pass with shared braking limits,
- then convert the first part of the resulting speed profile into throttle/brake commands.

Why this approach:
- It produces continuous entry / apex / exit speed planning.
- It matches the user request that steering, acceleration, and braking be solved together.
- It directly addresses the current "walk-stop-turn" behavior by generating a planned cornering speed curve instead of waiting for local failure.

Alternative considered:
- Continue using corner-load heuristics only. This was rejected because heuristics can hint at braking but cannot produce a smooth fastest-feasible speed plan over several linked future segments.

### 4. Racecraft behaviors will become dynamic scoring terms instead of post-hoc lane-offset overrides

Draft, overtaking, blocking, side-pressure, and recovery will be encoded as weighted reward / penalty terms inside trajectory scoring. Their weights will be recomputed each update from:
- current and future corner severity,
- speed surplus / recovery state,
- nearby vehicle geometry,
- draft opportunity quality,
- and mild NPC personality differences.

This means the planner will not "decide to attack first" and then force a lane offset. Instead, it will score candidate trajectories, where some candidates naturally gain draft reward, some gain overtake reward, and others incur high safety or collision penalties.

Why this approach:
- It resolves the current conflict between planned cornering and tactical lateral offsets.
- It keeps racecraft alive without letting it override track safety arbitrarily.
- It produces more human-looking decisions because behavior emerges from the chosen path instead of from a late override.

Alternative considered:
- Keep the current random-intent system and just gate it harder. This was rejected because hard-gated offsets still fight the main path logic and cannot express nuanced tradeoffs between progress, safety, and opportunity.

### 5. Recovery will remain as a bounded fallback layer outside the optimizer

Even with better planning, a browser racing game still needs a conservative fallback. Recovery will therefore stay as a supervisory layer that can:
- shrink the planner corridor,
- collapse behavior weights toward safety,
- reduce the horizon aggressiveness,
- and bias toward a stable rejoin line when predicted future states become unsafe.

Why this approach:
- It prevents the new planner from becoming brittle in collisions, airborne states, or unusual geometry.
- It reuses the current project's strong emphasis on "stay on track first" when things go wrong.

Alternative considered:
- Let the optimizer handle all edge cases with no explicit fallback. This was rejected because the current game includes collisions, draft perturbations, and moving platforms; a bounded supervisory safety mode is a more robust fit.

## Risks / Trade-offs

- [The planner could be too expensive for browser frame budgets] → Use beam search, small discrete lateral sets, fixed horizon lengths, and per-frame reuse of global track data.
- [A corridor derived only from centerline plus config might be too conservative on wide sections or too loose on narrow sections] → Start with safe configurable corridor widths and leave room for later track-specific corridor refinement.
- [Joint trajectory scoring can become hard to tune] → Keep reward/penalty groups explicit in config and expose debug overlays for chosen path, rejected path, and target speed envelope.
- [Behavior weighting could make NPCs feel robotic if safety always dominates] → Use dynamic weights so aggression and draft seeking still rise on straights and safe zones, while heavy corners bias toward safety.
- [The new planner could destabilize current unfinished NPC changes] → Build it as a replacement-ready planning layer with clear boundaries rather than blending unlimited heuristic patches into the existing controller.

## Migration Plan

1. Extend `Track.ts` with a global planning model built from the existing centerline samples.
2. Introduce planner data structures and utilities for track-relative coordinates, candidate lattice generation, and beam search.
3. Replace the current single-lane-offset race-line choice in `NPC.ts` with rolling local path planning driven by global track context.
4. Add path-based speed-envelope planning and convert the first planning step into throttle/brake outputs through the shared `Vehicle.applyControlInput()` interface.
5. Re-express draft, overtake, attack, defense, and recovery as dynamic scoring weights instead of post-hoc offsets.
6. Validate with build and in-race observation that NPCs carry speed more naturally, stop hesitating mid-corner, and still show racecraft on safe sections.

## Open Questions

- Should the first implementation derive the planning corridor purely from existing `maxLaneOffset` style bounds, or add optional track-segment width hints in `TrackData` for more accurate local envelopes?
- Should tactical scoring use deterministic weights only, or retain a small bounded random seed per NPC to keep the field from feeling overly identical?
- For debugging and tuning, should the first rollout include an in-scene overlay of chosen lattice path and target speed profile, or keep visualization for a follow-up change?
