## Context

The current NPC controller already has long-range preview, feedforward steering, corner load estimation, and tactical safety gates, but the behavior still fails at the most basic requirement: surviving corners consistently. In practice the controller is over-reading the distant track, under-reacting to the immediate corner, and keeping too much throttle into medium and heavy bends. The existing professional line bias and tactical logic also remain active too long when the car should instead be focused on staying on the road.

This problem became more visible after the shared base steering rate for all vehicles was reduced by 15%. That global change is intentional for overall handling feel, so the fix should not undo it for the player. Instead, the NPC controller needs targeted cornering support that activates only when the current cornering risk justifies it.

The design must keep shared vehicle physics intact, avoid new authored track metadata, and preserve the general direction of the current NPC controller. The goal is not to replace the controller, but to make it safer and more competent by changing how it interprets corner risk and how it scales braking, steering, line bias, and recovery.

## Goals / Non-Goals

**Goals:**
- Separate immediate corner risk from long-range corner awareness so NPCs respond to the bend they are about to enter rather than to an over-averaged far preview.
- Make NPCs lift and brake meaningfully before corner failure rather than keeping a high throttle floor into medium and heavy corners.
- Add NPC-only conditional brake assist and steer assist for medium/heavy corners and recovery situations without changing player physics.
- Push professional line bias and tactical lateral behavior behind track retention whenever current corner risk or recovery pressure is high.
- Enter recovery earlier so NPCs switch into a conservative stabilization mode before they are already far off the safe line.

**Non-Goals:**
- Do not create a separate NPC physics engine or vehicle class hierarchy.
- Do not modify player-only handling rules, checkpoints, camera, UI, or track data.
- Do not add authored apex markers, per-track speed maps, or external pathfinding assets.
- Do not remove NPC racecraft entirely; the change only suppresses it in risky cornering situations.

## Decisions

### 1. Immediate corner strength will be computed separately from far-range corner awareness

The current long-range preview is useful for anticipation, but it should not dominate the current corner safety calculation. The controller will therefore derive two distinct signals:
- `immediateCornerStrength`: based mainly on near/mid preview geometry and used for braking, assist activation, and recovery entry.
- `futureCornerAwareness`: based on far preview geometry and used only to bias early preparation, not to dilute the current-corner severity estimate.

Why this approach:
- It preserves the user's requirement that NPCs can see very far ahead.
- It prevents far preview smoothing from hiding the severity of the corner that the NPC must survive now.
- It keeps the implementation compatible with the existing multi-horizon preview data in `NPC.ts`.

Alternative considered:
- Shrink far preview globally. This was rejected because the user explicitly wants very long track awareness; the issue is not that the NPC sees too far, but that far awareness is currently weighted incorrectly in the current-corner model.

### 2. Corner speed planning will become a true pre-braking controller rather than a throttle-floor controller

The next revision should let NPCs meaningfully reduce throttle and add light braking before the car is already over target speed inside the corner. The target speed planner will:
- lower the heavy-corner target speed scale,
- remove or sharply reduce the current heavy throttle floor,
- add a corner-risk brake component that can activate before severe understeer is already visible,
- and add extra braking support when the NPC is still clearly too fast for the current corner.

Why this approach:
- It addresses the direct symptom the user sees: NPCs carrying too much speed into corners and driving off the road.
- It works within the shared `Vehicle.applyControlInput()` flow instead of requiring a new braking subsystem.
- It gives braking more authority in the situations where steering alone cannot save the car.

Alternative considered:
- Increase only the generic understeer brake fallback. This was rejected because understeer happens too late; the desired change is to slow down before that failure mode appears.

### 3. NPCs will receive conditional corner brake assist and steer assist instead of full-time physics buffs

NPCs need extra help after the recent global steering reduction, but the help should only activate in high-corner-load or recovery scenarios. Two bounded assists will therefore be added:
- `cornerBrakeAssist`: increases effective braking / deceleration authority as current corner risk rises.
- `cornerSteerAssist`: increases effective steering authority when immediate corner demand or recovery pressure is high.

Both assists must be:
- gated by immediate corner strength, corner load, or recovery state,
- clamped to avoid making NPCs look like they have impossible all-speed grip,
- and lower or absent on straights and light bends.

Why this approach:
- It gives NPCs the support they need exactly where the player is observing failure.
- It avoids making NPCs feel unnaturally advantaged in all conditions.
- It keeps player and NPC base physics unified while allowing the NPC controller to compensate contextually.

Alternative considered:
- Restore or raise shared base steering / braking for all vehicles. This was rejected because the player explicitly asked to lower global steering and because the fix is NPC-cornering competence, not a wholesale vehicle physics rollback.

### 4. High corner risk will suppress line bias before it suppresses only tactics

The current controller already suppresses tactical offsets in heavier corners, but the professional line bias can still push the target path away from the safest line while the car is too fast. The revised priority stack will be:
1. stay on the track,
2. finish the corner,
3. choose a nicer line,
4. resume tactics.

Implementation-wise:
- line bias will scale down as immediate corner risk rises,
- high overspeed or early recovery will collapse line bias further toward a safe centerline target,
- full recovery will zero aggressive line shaping entirely.

Why this approach:
- It directly reduces the cases where the NPC is still trying to shape an ideal line while already entering the corner too fast.
- It aligns with the user's repeated requirement that the race line should remain subordinate to simply following the track safely.

Alternative considered:
- Leave line bias unchanged and only raise braking. This was rejected because excessive bias at the wrong time still increases lateral excursion and exit risk.

### 5. Recovery will start earlier and switch the controller into a conservative stabilization mode

Recovery should not wait for near-failure. The controller will enter a conservative state earlier based on combinations of:
- large near steer error,
- high target steer demand,
- high immediate corner strength combined with clear overspeed,
- and persistent saturation / failed correction.

Once active, recovery will:
- reduce throttle aggressively,
- raise brake support,
- enable stronger steer assist,
- suppress tactical offsets,
- and collapse corner line bias toward the safest track-following target.

Why this approach:
- It better matches how a skilled driver abandons attack plans once the car is clearly too fast or too wide for the corner.
- It lowers the chance of cascading failures where one bad entry becomes a complete off-track excursion.

Alternative considered:
- Keep recovery as a late fallback only. This was rejected because the current late reaction is one of the main reasons NPCs still leave the track.

## Risks / Trade-offs

- [NPC braking could become overly conservative and make them too slow] → Keep assist strength and target-speed floors configurable; validate on both heavy corners and flowing sections.
- [Steer assist could create twitchy or unnatural high-speed corrections] → Gate the assist by immediate corner risk and clamp the maximum contribution, especially outside recovery.
- [Line-bias suppression could make NPCs look less polished in moderate corners] → Fade bias progressively instead of collapsing it immediately except during full recovery.
- [Immediate-corner emphasis could reduce the benefit of very long preview] → Preserve far preview as a separate early-awareness signal so anticipation remains while current-corner safety becomes more accurate.
- [Context-specific NPC assist may feel unfair if pushed too far] → Keep the assists bounded and limited to dangerous cornering situations, rather than giving NPCs a blanket all-speed advantage.

## Migration Plan

1. Add new `raceNpc` parameters for immediate-corner weighting, early braking, NPC brake assist, NPC steer assist, line-bias suppression, and earlier recovery thresholds.
2. Refactor the current preview interpretation so immediate corner strength is derived mainly from near/mid geometry and separated from far-range awareness.
3. Replace the current throttle-floor-heavy speed planner with an earlier lift / pre-brake planner that can reduce speed before obvious understeer.
4. Add NPC-only conditional brake assist and steer assist driven by corner load and recovery state.
5. Gate corner line bias and tactical offsets more aggressively under overspeed, high corner risk, and recovery.
6. Run build validation, then manually observe heavy corners, medium bends, and recovery cases to ensure NPCs brake earlier and remain on track more reliably.

## Open Questions

- Should the NPC brake assist be implemented purely in the controller output, or should a small NPC-only multiplier be applied just before `Vehicle.applyControlInput()` to keep the planner simpler?
- Should recovery entry use a single combined `cornerRiskScore`, or remain a small set of explicit triggers for easier tuning?
- If the new corner safety logic works well, should the unfinished manual-validation tasks in the long-range preview change be closed from the same playtest session or kept separate?
