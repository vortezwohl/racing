## Context

The current race implementation already contains three useful building blocks: sampled track-relative planning data in `Track.ts`, shared vehicle execution physics in `Vehicle.ts`, and a receding-horizon NPC planner in `racePlanning.ts`. However, two important weaknesses remain:

- The draft system is still fundamentally distance-to-trail driven. It can admit ambiguous hits near the source vehicle, stale trail hits after resets, or overlapping multi-trail situations that feel like stacked or self-generated draft.
- The NPC planner has improved global awareness, but it is still too optimistic in the presence of heavy cornering, high slipstream speed, and nearby traffic. It treats some dangerous trajectories as "bad but still eligible" instead of "physically or strategically invalid."

The user now wants a much stricter and more professional result:

- Slipstream must be clean, idempotent, and directionally correct.
- NPCs must almost never leave the track under normal racing conditions.
- NPCs must still be elite at cornering, drafting, overtaking, and pressuring opponents.
- NPCs should avoid wasteful contact in corners, but should still attack players and other NPCs when a safe aggressive window exists.

This is a cross-cutting change because it touches trail bookkeeping, race-state queries, candidate trajectory generation, path-speed feasibility checks, and aggressive traffic behavior scoring.

## Goals / Non-Goals

**Goals:**
- Make draft qualification single-source and idempotent per vehicle per frame.
- Prevent self-trail, near-source, stale-trail, and overlapping-trail false positives.
- Retune draft gains so slipstream remains strong without causing unrealistic instant overspeed.
- Upgrade NPC planning from soft safety preference to feasibility-gated planning.
- Enforce stronger corridor, braking, and recovery guarantees so the planner rejects trajectories that are not realistically survivable.
- Improve linked-corner, entry/apex/exit, and straight-line overtake behavior so NPCs remain very fast.
- Add stronger traffic-aware avoidance and safe-window aggression against both the player and NPC field.

**Non-Goals:**
- Do not add a new physics engine, ML driver model, or external optimization dependency.
- Do not require authored ideal-line files or per-track manually painted race lines.
- Do not redesign player handling, HUD, or overall race progression systems.
- Do not guarantee a formal mathematical proof of "never leaves the track" under arbitrary collisions or platform anomalies; the target is near-zero track-loss in normal racing conditions plus strong recovery under disturbances.

## Decisions

### 1. Draft will become a single resolved state, not a count of trail contacts

Each vehicle will compute a single `DraftState` per update:
- `active`
- `sourceId`
- `distanceToTrail`
- `nearestTrailPoint`

The evaluator may inspect many candidate trail sources, but it will keep only the best valid source. The final acceleration and top-speed behavior will be based only on whether that resolved state is active.

Why this approach:
- It satisfies the new idempotency requirement directly.
- It prevents overlapping trails from behaving like stacked boosts.
- It gives the NPC planner one clean slipstream opportunity signal instead of a noisy collection of hits.

Alternative considered:
- Allow multiple trail hits but cap the final buff at one source. Rejected because it still leaves ambiguous state downstream and makes tuning harder.

### 2. Draft qualification will require directional and source-distance validity, not only geometric proximity

Draft eligibility will require all of the following:
- The drafter is behind the source vehicle in source-relative coordinates.
- The nearest valid trail point lies beyond a minimum tail exclusion distance from the source.
- The trail segment is recent and forward-consistent enough to behave like a real wake line.
- The source and drafter are not the same vehicle.
- Trail history is cleared when vehicles are reset or teleported.

Why this approach:
- The current pure nearest-distance query is too permissive around trail heads, crossovers, and stale history.
- Directional filtering is the most robust way to eliminate self-like wake hits.

Alternative considered:
- Only shorten trail length or reduce draft radius. Rejected because it weakens the mechanic without fixing the logical false positives.

### 3. NPC planning will use a two-stage "feasible first, score second" pipeline

Candidate trajectories will first pass a feasibility gate before they are scored for speed or racecraft. A candidate is invalid if it fails corridor, controllability, braking reachability, or unrecoverable-edge checks.

Feasibility checks will include:
- Hard corridor containment with a stronger inward safety margin.
- Peak lateral demand versus allowed cornering limit.
- Backward braking reachability against future path speed limits.
- Short-horizon projected edge-loss and unstable-rejoin rejection.

Why this approach:
- The planner must stop treating dangerous trajectories as merely low-score options.
- The user explicitly wants track retention to dominate even while the NPC remains very fast.

Alternative considered:
- Keep the current beam search but continue increasing penalties. Rejected because dangerous paths can still remain in the candidate set and win when other rewards are high.

### 4. Speed planning will be upgraded from local optimism to path-coupled reachable envelopes

For each candidate path:
1. Compute curvature- and lateral-transition-based local safe speed limits.
2. Run a backward pass so the current plan respects future braking requirements.
3. Run a forward pass so acceleration remains physically reachable from the current state.
4. Derive the near-term control command from the first executed portion of that envelope.

This turns "can I carry this corner?" into a path-specific reachable-speed question instead of a late local steering reaction.

Why this approach:
- It is the cleanest way to strengthen corner entry timing and exit preparation.
- It directly supports stronger slipstream straights without making the next braking zone impossible.

Alternative considered:
- Increase emergency brake gain only. Rejected because it improves rescue behavior but does not reliably improve line-speed planning.

### 5. Guardian will become an earlier supervisory controller, not only a late recovery patch

Guardian mode will trigger earlier based on:
- Corridor utilization
- Overspeed versus reachable future speed
- repeated instability indicators
- unsafe side-by-side corner geometry
- projected short-horizon track-loss risk

When active, Guardian will:
- shrink usable corridor width,
- suppress aggressive racecraft,
- raise minimum braking,
- limit throttle and steering demand,
- bias toward a stable center-weighted rejoin line.

Why this approach:
- The planner needs a strong lower-bound safety mode to achieve the user's "do not leave the track" requirement.
- Early intervention is more effective than trying to recover once the vehicle is already departing the corridor.

Alternative considered:
- Keep a late-only recovery mode. Rejected because late rescue still allows too many edge states to develop.

### 6. Traffic-aware racecraft will operate only inside the feasible set

The planner will evaluate traffic-aware rewards and penalties only after safety feasibility is satisfied. The scoring model will include:
- draft alignment reward,
- straight-line overtake reward,
- corner setup reward,
- collision and overlap penalties,
- side-by-side space penalties,
- safe-window attack reward,
- defensive block reward.

Aggressive actions such as squeeze, line claim, and exit crowding are allowed only when:
- the attacking vehicle stays feasible,
- braking reachability remains valid,
- the maneuver does not force the attacker outside the safe corridor,
- the corner class and positional geometry support meaningful pressure.

Why this approach:
- The user wants very aggressive NPCs, but not suicidal ones.
- Racecraft must emerge from planner choice, not from a post-hoc offset override.

Alternative considered:
- Reintroduce explicit tactical intent offsets after planning. Rejected because that would again fight the main path-speed planner.

### 7. Whole-track context will be used in layers rather than as a single undifferentiated horizon

The planner will distinguish:
- near field: immediate control execution,
- mid field: corner entry/apex/exit setup,
- far field: linked-corner and straight-exit value.

The full track remains visible to the planner, but only the relevant subset of context influences each decision layer.

Why this approach:
- It preserves the benefit of full-track awareness without making every control update noisy or over-coupled.

Alternative considered:
- Full-lap exhaustive optimization every frame. Rejected as too expensive and unnecessary for this game.

## Risks / Trade-offs

- [Over-tightening feasibility could make NPCs too conservative] → Tune corridor, lateral-demand, and braking-reachability thresholds separately for normal mode and Guardian mode so elite pace is preserved when risk is low.
- [Aggressive attacks could still produce unnatural contact if windows are too permissive] → Gate attack rewards by corner class, overlap geometry, and attacker survivability.
- [Draft correction could make slipstream feel weaker than expected] → Retune gain/decay after logical validation so the mechanic remains noticeable but clean.
- [Per-frame feasibility work may increase CPU cost] → Keep the planner discrete, retain beam search, reuse track sampling, and resolve only one draft source per vehicle.
- [Crossing tracks and moving platforms can still create difficult edge cases] → Use trail clearing on resets and prefer short-horizon projected survivability checks over only local geometry.

## Migration Plan

1. Replace raw multi-hit draft interpretation with a resolved single-source `DraftState`.
2. Add tail exclusion, directional validation, and reset-time trail clearing.
3. Retune draft gain/decay/top-speed values to the new target range.
4. Strengthen planning feasibility checks and Guardian thresholds in `racePlanning.ts`.
5. Upgrade speed-envelope reachability and linked-corner valuation.
6. Update aggressive traffic scoring so it operates only within the feasible set.
7. Validate with build and in-race observation on straights, heavy braking zones, linked corners, side-by-side corner entries, and reset scenarios.

## Open Questions

- Should the first rollout expose any debug overlay for resolved draft source, feasible corridor, and guardian activation, or keep visualization for a follow-up change?
- Do any existing tracks need authored local corridor hints after the first stricter rollout, or is geometric inference sufficient?
- Should aggressive behavior be slightly weaker for the first 1-2 seconds after the start, or should opening-lap suppression stay limited to tactical draft pressure only?
