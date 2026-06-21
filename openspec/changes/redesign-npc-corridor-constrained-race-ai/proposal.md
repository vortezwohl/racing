## Why

The current NPC racing AI still behaves like a target-point follower layered on top of a track graph, which causes centerline dithering, oversteer at split entry, illegal shortcut attempts across non-drivable gaps, and recovery behavior that fights route commitment. We need to move from "nearest sample and steer toward it" to "plan inside a track corridor with explicit legal connectors" so NPCs can drive like aggressive professional racers without leaving the intended race surface.

## What Changes

- Replace centerline-only NPC path reasoning with corridor-aware track topology that models drivable width, left/right boundaries, and legal lane-change or split/merge connectors.
- Add explicit legality rules for lateral movement so NPCs may change lane across small allowed gaps, attack or defend through valid connectors, and seek shorter legal race lines without crossing non-track space.
- Redesign NPC projection, route commitment, and control planning around route-continuous corridor coordinates instead of nearest-point-only target chasing.
- Upgrade short-horizon control from point tracking to corridor-constrained trajectory tracking with branch-entry smoothing, connector commitment, and recovery that returns to the active legal corridor instead of snapping toward a generic centerline.
- Extend racecraft planning so draft pursuit, overtakes, blocking, squeezing, and connector changes are all filtered through legal corridor transitions and survivability checks.
- Add a final validation flow that launches a race with no player control input and observes whether NPC trajectories stay on legal track corridors, retain aggressive professional behavior, and avoid falling off the track.

## Capabilities

### New Capabilities
- `corridor-track-topology`: Represent track edges as drivable corridors with width, boundaries, and legal split/merge/lane-change connectivity instead of centerline-only edges.
- `legal-lane-change-connectors`: Define when NPCs may laterally transition between nearby track corridors and prohibit illegal cross-gap shortcuts.
- `corridor-constrained-npc-planning`: Plan NPC route strategy, racecraft, recovery, and low-level control inside legal track corridors rather than steering toward unstable target points.
- `npc-race-observation-validation`: Validate NPC race behavior through an unattended race observation pass focused on aggressive professionalism, legal lane usage, and no routine track exits.

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `src/ai/npcRacing/trackGraph.ts`
  - `src/ai/npcRacing/routePlanner.ts`
  - `src/ai/npcRacing/trafficPlanner.ts`
  - `src/ai/npcRacing/controlPlanner.ts`
  - `src/ai/npcRacing/types.ts`
  - `src/ai/npcRacing/plannerWorker.ts`
  - `src/ai/npcRacing/synchronousPlanner.ts`
  - `src/objects/Track.ts`
  - `src/objects/NPC.ts`
  - `src/scenes/GameScene.ts`
  - `src/utils/raceConfig.ts`
- Track content may need optional connector metadata or legal transition hints for branch-adjacent and parallel-lane sections such as `data/tracks/track_1.ts`.
- Runtime behavior changes will affect route projection, lateral planning, attack lines, recovery, and final NPC race validation workflows.
