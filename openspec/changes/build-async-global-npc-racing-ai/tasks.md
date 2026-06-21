## 1. NPC Racing Module Foundation

- [x] 1.1 Create `src/ai/npcRacing/` with module entry points for types, graph, route planning, traffic planning, control planning, assist model, snapshots, worker client, and worker entry.
- [x] 1.2 Define serializable planner types for race snapshots, vehicle snapshots, graph nodes/edges, route candidates, traffic intents, control plans, assist scalars, planner telemetry, and worker messages.
- [x] 1.3 Add NPC AI configuration in `raceConfig.ts` for planner rates, stale-plan thresholds, time budgets, candidate caps, route weights, racecraft weights, start behavior, and assist values.
- [x] 1.4 Add lightweight conversion helpers so planner code does not pass `THREE.Vector3` instances across worker message boundaries.

## 2. TrackGraph And Route Projection

- [x] 2.1 Implement `TrackGraph` construction from existing track curve/collision-layer data while preserving current rendered track behavior.
- [x] 2.2 Detect split and merge regions from curve endpoint proximity and create distinct graph edges for branch alternatives.
- [x] 2.3 Precompute per-edge samples for length, tangent, lateral, curvature, corridor width, segment type, safe speed hints, and route distance.
- [x] 2.4 Implement stable graph projection returning `edgeId`, `distanceOnEdge`, `lateralOffset`, `headingError`, and `distanceToCenter`.
- [x] 2.5 Add projection hysteresis so vehicles remain on selected route edges through branch-adjacent spatial ambiguity.
- [x] 2.6 Expose graph initialization from `Track` or `GameScene` without removing legacy path APIs used elsewhere.

## 3. Route Strategy Planner

- [x] 3.1 Implement route candidate generation for primary route, branch alternatives, merge exits, and next-route-cycle continuation.
- [x] 3.2 Implement 10 Hz route scoring using route length, curvature, corridor width, exit speed, traffic occupancy, draft opportunity, overtake potential, and branch merge risk.
- [x] 3.3 Add per-NPC route state containing selected route, committed branch, route progress, route plan version, and replanning cooldown.
- [x] 3.4 Add deterministic start-phase route selection so NPCs launch on a stable route before the first branch decision.
- [x] 3.5 Add route telemetry for selected edge sequence, branch decision, route score, and reason codes.

## 4. Traffic And Racecraft Planner

- [x] 4.1 Implement global race snapshot indexing that projects player and NPC vehicles into graph-route coordinates.
- [x] 4.2 Implement nearby interaction windows for vehicles ahead, behind, side-by-side, and at branch/merge conflict zones.
- [x] 4.3 Implement straight-line draft pursuit and overtake target selection with future braking reachability checks.
- [x] 4.4 Implement defensive blocking when an NPC is being drafted or threatened by a pass.
- [x] 4.5 Implement aggressive squeeze, line-claim, and exit-crowding intents against both player and NPC vehicles.
- [x] 4.6 Add hard survivability gates so attack candidates are rejected if they break the attacker's route corridor, braking envelope, or merge feasibility.
- [x] 4.7 Add bounded complexity controls so detailed racecraft scoring only evaluates nearby relevant vehicles while global summaries remain available.

## 5. High-Frequency Control Planner

- [x] 5.1 Implement route-bound control planning at 45 Hz or higher using selected route, traffic intent, lane candidates, speed modes, and short-horizon speed envelope.
- [x] 5.2 Implement full-throttle start launch behavior unless collision, branch, or track-loss risk requires intervention.
- [x] 5.3 Implement path-coupled speed planning with forward acceleration reachability and backward braking reachability on the selected graph route.
- [x] 5.4 Implement corner entry/apex/exit line selection that uses edge-local corridor and curvature data.
- [x] 5.5 Implement emergency recovery controls that cut throttle, brake decisively, and steer toward a stable route rejoin point.
- [x] 5.6 Preserve compatibility with `Vehicle.applyControlInput()` by outputting throttle, brake, steer, and control scaling fields.

## 6. NPC Assist Model

- [x] 6.1 Implement explicit NPC-only assist scalar generation for braking, steering, grip, draft exploitation, recovery, and racecraft strength.
- [x] 6.2 Apply brake assist and emergency brake assist in NPC control execution without changing player handling.
- [x] 6.3 Apply steering/grip assist so NPCs track feasible high-speed cornering lines more accurately.
- [x] 6.4 Apply draft assist only to valid idempotent slipstream behavior without stacking multiple simultaneous sources.
- [x] 6.5 Add assist telemetry so tuning can identify which assist categories activated per NPC plan.

## 7. Async Worker Runtime

- [x] 7.1 Implement `plannerWorker.ts` with initialization, graph loading, snapshot consumption, and plan-batch output messages.
- [x] 7.2 Implement multi-rate scheduling inside the worker for route, traffic, and control planning layers.
- [x] 7.3 Implement stale snapshot dropping and stale plan rejection using snapshot ids and plan versions.
- [x] 7.4 Implement `plannerClient.ts` on the main thread to publish snapshots, receive plan batches, buffer latest valid plans, and expose plan freshness.
- [x] 7.5 Integrate `GameScene` so it publishes compact race snapshots and never waits for worker responses during update/render.
- [x] 7.6 Integrate `NPC` so it consumes latest async plans with deterministic fallback when plans are missing or stale.
- [x] 7.7 Add cleanup for worker lifecycle during scene deactivate/dispose/restart.

## 8. Legacy Planner Migration

- [ ] 8.1 Move reusable logic from `racePlanning.ts` into the new module where appropriate, including speed limits, collision risk, and recovery helpers.
- [x] 8.2 Keep a synchronous compatibility path for early validation before enabling worker-backed planning by default.
- [x] 8.3 Remove direct per-frame synchronous `buildNpcTrajectoryPlan()` calls from normal NPC updates after async plans are wired.
- [x] 8.4 Ensure existing draft state, collision handling, checkpoint recovery, standings, and HUD behavior remain compatible.

## 9. Validation And Tuning

- [x] 9.1 Run `npm run build` and resolve all TypeScript or bundling issues, including worker bundling.
- [ ] 9.2 Verify the render loop does not await worker planning and remains responsive when worker planning is delayed.
- [ ] 9.3 Verify NPCs launch at full throttle during the opening start phase when no immediate risk exists.
- [ ] 9.4 Verify NPCs choose a stable branch at the first fork and do not oscillate between branch projections.
- [ ] 9.5 Verify NPCs remain strong on straights, pursue draft, and complete fast overtakes when feasible.
- [ ] 9.6 Verify NPCs block, squeeze, and line-claim aggressively against both player and NPC vehicles without self-destructive route loss.
- [ ] 9.7 Verify NPCs brake early enough for heavy corners, hold stable fast racing lines, and avoid leaving the route corridor in normal racing.
- [ ] 9.8 Verify planner telemetry reports route choice, racecraft intent, assist activation, plan freshness, and worker budget status.
- [ ] 9.9 Profile runtime with all NPCs active and confirm planning stays within configured work budgets without reducing frame stability.
