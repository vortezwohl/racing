## Context

The current NPC controller already uses shared vehicle physics and no longer snaps direction directly to path vectors, which fixes the most obvious unfairness and self-destructive launch failures. However, the controller still behaves like a local path error follower: it mainly observes one look-ahead point, reacts after steering error appears, and uses conservative throttle cuts or braking when it discovers that a corner is already going wrong.

This creates three visible problems:
- NPCs do not read enough of the upcoming track and therefore turn in too late.
- NPCs lose too much speed from reactive understeer handling instead of professional corner preparation.
- Tactical behaviors such as draft seeking or overtaking still compete with corner completion more than they should.

The design must improve average and minimum NPC quality without changing the shared vehicle physics model, without introducing a new navigation system, and without rewriting track assets or checkpoint logic. The user also explicitly requires that NPCs can see much farther ahead on the race track than they do now.

## Goals / Non-Goals

**Goals:**
- Give NPCs a very long forward view of the track through multi-horizon path preview.
- Make NPCs anticipate corner entry, corner continuation, and corner exit earlier than the current single-point steering loop.
- Replace mostly reactive speed correction with proactive corner speed planning.
- Keep race-line tracking and staying on track above all tactical aggression.
- Raise NPC average level and lower mistake rate while keeping inter-NPC differences small.
- Preserve existing shared player/NPC vehicle physics and reuse current path points, path vectors, and draft/tactical context.

**Non-Goals:**
- Do not add a full external AI pathfinding system, behavior tree framework, or physics engine.
- Do not require new track authoring metadata, ideal-line assets, or explicit apex markers.
- Do not redesign player handling, camera behavior, UI, or menu flow.
- Do not remove tactical behaviors entirely; instead, gate them behind cornering and recovery safety.

## Decisions

### 1. NPC track reading will use very long multi-horizon preview instead of a single look-ahead point

NPCs should no longer choose steering from only one forward target. Instead, each update will sample:
- a near preview point for immediate steering,
- a mid preview point for turn continuation,
- a far preview point for early track awareness,
- and one or more preview directions to estimate future curvature.

Recommended runtime structure:

```ts
type NpcTrackPreview = {
    nearPoint: THREE.Vector3;
    midPoint: THREE.Vector3;
    farPoint: THREE.Vector3;
    nearDirection: THREE.Vector3;
    midDirection: THREE.Vector3;
    farDirection: THREE.Vector3;
    curvatureSign: number;
    curvatureStrength: number;
};
```

The preview distances should be much farther than the current values and should scale strongly with speed. The far preview should reach well beyond the current maximum look-ahead so that NPCs can read track intent before a local steering error becomes large.

Why this approach:
- It satisfies the requirement that NPCs see very far ahead.
- It remains compatible with existing `pathPoints`.
- It gives enough information for proactive steering and speed planning without introducing authored racing-line data.

Alternative considered:
- Use one extremely distant look-ahead point only. This was rejected because it improves anticipation but weakens local precision and still cannot distinguish immediate steering demand from future corner continuation.

### 2. Steering control will become a feedforward-plus-feedback controller

The current steering loop mostly reacts to signed heading error. The upgraded controller should combine:
- near heading error for local line correction,
- mid or far heading error for anticipation,
- and a curvature feedforward term that biases steering before the car has already drifted away from the target line.

Recommended shape:

```text
targetSteer =
    nearHeadingError * nearWeight +
    farHeadingError * farWeight +
    curvatureSign * curvatureStrength * feedforwardWeight
```

This keeps the controller simple and deterministic while producing much more professional turn-in behavior.

Why this approach:
- It reduces late steering corrections.
- It behaves more like a skilled player who prepares for the corner.
- It can be tuned with a few explicit weights instead of adding a more complex planner.

Alternative considered:
- A pure PD/PID controller over current heading error. This was rejected because it still reacts too locally and does not solve the “see much farther ahead” requirement by itself.

### 3. Corner speed planning will be proactive and based on previewed corner load

NPC throttle and brake should no longer rely mainly on “large steering error means cut speed now.” Instead, the controller should estimate corner load before the car is already failing to rotate.

Recommended `cornerLoad` inputs:
- previewed curvature strength,
- normalized near steering demand,
- lane displacement magnitude,
- and optional recovery pressure if previous steering remains saturated.

Recommended output:

```text
targetSpeedScale = lerp(1.0, cornerMinSpeedScale, cornerLoad)
```

Then convert target speed into throttle/brake intent through a bounded tracking rule rather than a binary panic brake rule.

Why this approach:
- It produces earlier, smoother speed preparation.
- It reduces obvious low-skill mistakes while keeping shared vehicle physics intact.
- It preserves the existing understeer checks as a deeper safety layer rather than the primary driver behavior.

Alternative considered:
- Pre-author per-track speed limit tables. This was rejected because the current project does not maintain such metadata and the user wants a general algorithmic improvement.

### 4. NPC line choice will use an inferred racing-line bias instead of centerline-plus-tactics only

The existing lane offset system is useful and should stay, but the baseline target path should gain a professional cornering bias:
- slight outside bias before entry,
- inward bias toward the corner middle,
- outward release toward exit.

This should remain bounded and derived from preview curvature rather than authored apex data. Tactical offsets must be added after this racing-line bias and then filtered by safety gating.

Why this approach:
- It makes NPCs look more intentional and less robotic.
- It improves corner completion without forcing all behavior to stay on exact centerline.
- It integrates naturally with the existing bounded lane offset system.

Alternative considered:
- Keep centerline following and only improve steering gains. This was rejected because it would still leave NPCs looking conservative and unprofessional through the corner arc.

### 5. Tactical intent will be gated by corner load and recovery state

Tactical behaviors must remain secondary to surviving the corner. The upgraded controller should compute a tactical weight from previewed corner load and any active recovery state:

```text
tacticalWeight = 1 - smoothstep(cornerLoad, tacticalFadeStart, tacticalFadeFull)
effectiveTacticalOffset = tacticalOffset * tacticalWeight
```

If recovery is active, tactical weight should collapse to zero and all aggressive intents should yield completely.

Why this approach:
- It keeps draft, overtake, block, and side pressure alive on straights and light bends.
- It prevents tactical behavior from dragging NPCs off the safe line in medium and heavy corners.
- It improves the minimum NPC standard without deleting racecraft features.

Alternative considered:
- Globally lower tactic probabilities further. This was rejected because it only makes NPCs more passive, not more professional.

### 6. Skill variance will remain small and only affect polish, not basic competence

NPC differences should be subtle. Basic track reading, speed planning, and staying on track should be uniformly strong. Skill profile variance should remain narrow and should mainly influence:
- corner confidence,
- steering recovery sharpness,
- and mild aggression preference.

Large variance in control noise, delayed turn-in, or panic braking should not be part of the new baseline.

Why this approach:
- It matches the user’s request that all NPCs be strong and that the weakest NPC not feel obviously bad.
- It makes tuning easier because baseline competence is deterministic.

## Risks / Trade-offs

- [Very long preview may cause over-anticipation on tight geometry] → Blend near, mid, and far horizons rather than steering from the far horizon directly; clamp feedforward contribution.
- [Proactive speed planning may make NPCs too fast and remove overtaking opportunities] → Keep explicit `cornerMinSpeedScale`, `tacticalFade`, and recovery thresholds configurable for tuning.
- [Racing-line bias may combine poorly with tactical offset] → Apply tactical weighting after corner load is known and clamp the final offset before target point generation.
- [More preview sampling could increase per-frame cost] → The race only has a small vehicle count; reuse path index progression and keep preview sampling local to future path segments.
- [Removing mistakes may make NPCs feel too robotic] → Preserve small variance in confidence and aggression, but keep foundational control deterministic and clean.

## Migration Plan

1. Add new preview and curvature configuration to `raceNpc`.
2. Implement a multi-horizon preview builder in `NPC`.
3. Replace the current steering target computation with feedforward-plus-feedback steering.
4. Add target-speed planning from previewed corner load while keeping understeer recovery as a lower-level safety layer.
5. Add inferred racing-line bias and tactical corner gating.
6. Retune profile variance and cornering thresholds.
7. Verify through build and manual race observation that NPCs read far ahead, corner earlier, remain on track, and still resume racecraft behavior on safer sections.

## Open Questions

- Should the far preview distance be fully speed-scaled, or should there also be a large fixed minimum so NPCs always read far even at modest speed?
- Should tactical gating suppress only lateral offset, or should it also reduce aggressive throttle choices during close overtake windows?
- If some tracks later become much narrower or more technical, should `raceNpc` preview and lane-bound parameters become track-specific rather than global?
