## Why

The current NPC controller can read farther ahead than before, but in practice it still enters corners too fast, does not shed enough speed before turn-in, and can carry aggressive line bias or tactical behavior into sections where simply staying on the track should be the top priority. After the recent global 15% reduction to shared base steering performance, this gap is even more visible: NPCs now need stronger corner-specific braking and steering support to avoid driving off the course.

## What Changes

- Add an immediate-corner risk model that distinguishes the current cornering demand from longer-range future awareness, so NPC braking and steering decisions are driven by the bend it is about to survive rather than by an over-averaged far preview.
- Rework NPC corner speed planning so medium and heavy corners trigger earlier lift-off and meaningful pre-braking instead of maintaining a high throttle floor until the corner is already failing.
- Introduce NPC-only conditional brake assist and steer assist that activate in medium/heavy corners and recovery situations, without changing the shared player/NPC base vehicle physics model.
- Reduce or suppress professional line bias and aggressive tactical offsets when current corner risk or recovery pressure is high, so the controller prioritizes track retention over idealized corner shaping or racecraft.
- Tighten recovery entry so NPCs switch into a conservative stabilization mode earlier, including stronger deceleration bias, safer target positioning, and extra steering support when the current corner attempt is degrading.

## Capabilities

### New Capabilities
- `npc-corner-speed-safety`: Covers immediate-corner risk estimation, earlier throttle lift, pre-braking, and NPC-only braking assist before corner failure.
- `npc-corner-stability-assist`: Covers NPC-only corner steer assist, earlier stabilization / recovery entry, and safer cornering targets when the car is near failure.
- `npc-corner-risk-priority`: Covers suppressing racing-line bias and tactical lateral behavior when current corner risk is high so staying on track takes precedence.

### Modified Capabilities

## Impact

- Primarily affects [NPC.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/NPC.ts) and [raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts).
- Reuses the existing shared [Vehicle.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts) physics path rather than introducing a separate NPC physics model.
- Retunes the NPC controller around the recently lowered shared steering baseline so NPCs can remain competent without restoring player steering strength.
- Does not require new track metadata, new assets, or new runtime dependencies.
