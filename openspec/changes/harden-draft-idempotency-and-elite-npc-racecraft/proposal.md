## Why

The current race systems still allow two classes of behavior that directly conflict with the user's target driving feel: the draft system can produce overly strong or ambiguous boost states, and the NPC controller can still choose trajectories that are fast-looking but not robust enough to stay on the track through heavy cornering and traffic. The next change needs to harden both systems together so NPCs become extremely strong, stable, and aggressively race-aware without self-destructive mistakes.

## What Changes

- Harden the draft system so it behaves as a single, idempotent slipstream state per vehicle, never stacks across multiple overlapping trails, and no longer allows self-trail or near-source false positives.
- Retune draft acceleration, top-speed, gain, and decay so slipstream remains valuable for straights and overtakes without causing unrealistic instant overspeed into braking zones.
- Upgrade NPC planning from "safe by penalty" to "safe by feasibility," where trajectories that cannot stay inside the track corridor, cannot brake to future corner limits, or cannot avoid unrecoverable edge states are discarded before scoring.
- Strengthen the NPC planner's cornering model so it jointly optimizes line choice, braking reachability, linked-corner setup, and exit speed, producing much stronger and more professional corner performance.
- Add stronger traffic-aware planning so NPCs avoid unnecessary contact through corners, aggressively seek slipstream and overtake opportunities on straights, and can deliberately squeeze, claim line, or crowd rivals only when those attacks remain safe for the attacking vehicle.
- Strengthen the guardian / recovery layer so destabilized NPCs are pulled back into a stable rejoin line before they leave the track, while preserving elite baseline pace once risk subsides.

## Capabilities

### New Capabilities
- `draft-idempotent-slipstream`: Covers single-source slipstream qualification, self-trail rejection, overlapping-trail idempotency, and retuned draft gain behavior.
- `npc-hard-safe-race-planning`: Covers feasibility-gated track-relative planning, corridor enforcement, braking reachability, guardian intervention, and track-retention-first behavior.
- `npc-elite-cornering-and-speed-planning`: Covers linked-corner line optimization, path-coupled speed envelopes, early braking setup, and strong exit-speed-biased corner execution.
- `npc-aggressive-traffic-racecraft`: Covers traffic-aware avoidance, draft pursuit, straight-line overtaking, and safe-window aggressive actions against both player and NPC vehicles.

### Modified Capabilities

## Impact

- Primarily affects [GameScene.ts](/D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts), [Track.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Track.ts), [NPC.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/NPC.ts), [racePlanning.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/racePlanning.ts), [Vehicle.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts), and [raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts).
- Expands the planner contract between traffic geometry, draft state selection, candidate trajectory feasibility checks, and control output generation.
- Does not require new native dependencies or authored ideal-line data, but it does require stricter planning state, tuning parameters, and race-state bookkeeping inside the existing TypeScript runtime.
