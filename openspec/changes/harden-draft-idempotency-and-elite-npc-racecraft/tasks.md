## 1. Draft State Hardening

- [x] 1.1 Add a single resolved draft-state model that selects at most one valid slipstream source per vehicle per update.
- [x] 1.2 Update draft qualification to reject self-trail, invalid source-relative direction, and near-tail false positives.
- [x] 1.3 Clear trail history on reset, respawn, checkpoint recovery, and other teleport-like repositioning paths.
- [x] 1.4 Update `GameScene` draft bookkeeping so overlapping trail hits remain idempotent and only one source is recorded.

## 2. Draft Retuning

- [x] 2.1 Retune draft acceleration, top-speed, gain, and decay values to the new bounded target range.
- [ ] 2.2 Verify multi-source trail contact still produces the same boost effect as a single valid source.
- [ ] 2.3 Verify invalid near-source and stale-trail cases no longer produce draft gain.

## 3. Hard-Safe NPC Planning

- [x] 3.1 Strengthen track corridor modeling and safety margins used by NPC feasibility checks.
- [x] 3.2 Upgrade candidate validation so trajectories that leave the corridor, exceed control-demand limits, or fail braking reachability are discarded before scoring.
- [x] 3.3 Add stronger projected track-loss and unstable-rejoin rejection for short-horizon future states.
- [x] 3.4 Strengthen Guardian activation thresholds and recovery behavior so destabilized NPCs are pulled back to a stable rejoin line earlier.

## 4. Elite Cornering And Speed Planning

- [x] 4.1 Upgrade path-coupled speed planning to use stronger backward braking reachability and forward acceleration reachability on candidate lines.
- [x] 4.2 Improve linked-corner and exit-priority scoring so NPCs optimize combined sequences instead of only the first local apex.
- [x] 4.3 Tune corner entry, rolling mid-corner speed, and exit acceleration behavior to remove stop-turn-stop degradation while preserving heavy-corner braking authority.
- [x] 4.4 Ensure the stronger cornering model remains compatible with shared `Vehicle.applyControlInput()` execution.

## 5. Aggressive Traffic Racecraft

- [x] 5.1 Strengthen straight-line draft pursuit and overtake scoring so NPCs aggressively exploit valid slipstream opportunities.
- [x] 5.2 Add stronger side-by-side corner space management so NPCs avoid unnecessary self-destructive contact through corners.
- [x] 5.3 Implement safe-window aggressive actions such as squeeze, line claim, block, and exit crowding against both player and NPC vehicles.
- [x] 5.4 Ensure aggressive racecraft is suppressed whenever it would violate the attacker's own corridor or braking feasibility.

## 6. Validation And Tuning

- [x] 6.1 Run `npm run build` and resolve all TypeScript or bundling issues introduced by the change.
- [ ] 6.2 Manually verify a vehicle can no longer gain draft from its own trail or from overlapping multi-trail stacking.
- [ ] 6.3 Manually verify NPCs remain on track through heavy corners, slipstream approaches, and side-by-side traffic far more reliably than before.
- [ ] 6.4 Manually verify NPCs remain elite at cornering and straight-line overtakes while still showing aggressive but survivable attack behavior.
