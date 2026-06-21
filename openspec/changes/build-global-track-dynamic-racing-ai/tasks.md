## 1. Global Track Planning Model

- [x] 1.1 Extend `Track` with a full-track planning representation including sampled arc length, tangents, lateral basis, curvature, and a safe planning corridor derived from existing geometry/config.
- [x] 1.2 Add planning-oriented utilities to convert between world-space vehicle state and track-relative planning state.
- [x] 1.3 Expose enough global track context for NPCs to query future segment type, linked-corner context, and long-range planning distances.

## 2. Local Trajectory Search

- [x] 2.1 Introduce local planning data structures for rolling-horizon lattice or beam-search candidates over future `s/l` states.
- [x] 2.2 Generate multiple lateral candidate trajectories over a bounded future horizon instead of a single lane-offset target.
- [x] 2.3 Implement trajectory scoring for progress, smoothness, control demand, corridor safety, and collision risk.
- [x] 2.4 Replace the current local lane-target selection in `NPC` with the chosen local future trajectory from the planner.

## 3. Path-Coupled Speed Planning

- [x] 3.1 Compute curvature-aware speed limits along the selected local trajectory using shared vehicle acceleration, braking, and turning constraints.
- [x] 3.2 Add forward/backward speed-envelope propagation so NPCs plan entry, apex, and exit speed continuously instead of reacting late.
- [x] 3.3 Convert the first part of the trajectory speed plan into throttle/brake outputs that avoid unnecessary stop-turn-stop behavior.
- [x] 3.4 Verify the new speed plan remains compatible with shared `Vehicle.applyControlInput()` execution.

## 4. Dynamic Racecraft Priority System

- [x] 4.1 Convert draft, overtake, block, side-pressure, and recovery priorities into dynamic scoring weights for candidate trajectories.
- [x] 4.2 Make those weights respond to corner severity, overspeed pressure, nearby traffic geometry, and current recovery state.
- [x] 4.3 Preserve only small NPC personality differences so racecraft flavor changes without undermining baseline competence.
- [x] 4.4 Remove or disable legacy post-hoc tactical offsets that conflict with the new unified planner.

## 5. Recovery And Safety Supervision

- [x] 5.1 Add a supervisory recovery mode that can shrink the planning corridor, collapse behavior weights toward safety, and bias the planner toward a stable rejoin line.
- [x] 5.2 Ensure the planner can fall back gracefully when collisions, airborne states, or unstable control demand make the nominal local optimum unsafe.
- [ ] 5.3 Verify track retention remains the highest priority when optimization goals conflict with staying on the course.

## 6. Validation And Tuning

- [x] 6.1 Run `npm run build` and resolve any TypeScript or bundling issues introduced by the planning architecture.
- [ ] 6.2 Manually verify NPCs carry speed more naturally through corners without repeated hesitation or stop-turn behavior.
- [ ] 6.3 Manually verify full-track awareness improves linked-corner planning, braking setup, and exit quality compared with the current heuristic controller.
- [ ] 6.4 Manually verify draft, overtake, attack, and defense behaviors still appear, but now emerge from safe high-scoring trajectories instead of post-hoc overrides.
