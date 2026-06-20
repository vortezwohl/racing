## 1. Shared Vehicle Physics

- [x] 1.1 Add race performance configuration for nonlinear acceleration, sustained steering response, high-speed steering damping, and NPC racecraft tuning.
- [x] 1.2 Add shared vehicle control input support for throttle, brake, steer, and optional acceleration scaling.
- [x] 1.3 Implement speed-relative nonlinear acceleration using effective maximum speed, draft acceleration scale, collision slow scale, and the configured acceleration curve.
- [x] 1.4 Implement nonlinear steering with initial response boost, sustained-input falloff, steering hold reset on direction change, and high-speed damping.
- [x] 1.5 Update player input handling to route keyboard and touch controls through the shared vehicle control input path.
- [x] 1.6 Verify player acceleration, draft maximum speed, speed cap, steering response, and existing camera FOV behavior still build and run.

## 2. NPC Input-Driven Race-Line Control

- [x] 2.1 Replace NPC direct direction and velocity assignment with input-driven throttle, brake, and steering output.
- [x] 2.2 Add per-race NPC skill profile generation with small variance for corner confidence, steering noise, recovery, draft preference, and aggression.
- [x] 2.3 Add NPC race timing context and apply the `1.75x` acceleration-only start boost for the first two active race seconds.
- [x] 2.4 Implement NPC nearest path index tracking without snapping direction to path vectors.
- [x] 2.5 Implement speed-based look-ahead target selection from track path points.
- [x] 2.6 Implement signed steering error calculation from NPC direction to the look-ahead target.
- [x] 2.7 Implement smoothed NPC steering intent with profile-based light noise and recovery.
- [x] 2.8 Implement NPC understeer detection with throttle reduction and braking when speed and steering error exceed configured thresholds.
- [x] 2.9 Implement NPC oversteer recovery so steering input retreats or reverses after overshooting the target direction.
- [x] 2.10 Verify NPCs can follow the current track and complete laps without direct path snapping.

## 3. Draft Relationship Context

- [x] 3.1 Extend draft detection to produce drafter-to-source relationships while preserving current draft charge gain and decay behavior.
- [x] 3.2 Include nearest trail distance and nearest trail point in draft relationship data for NPC target selection.
- [x] 3.3 Pass race vehicle states, draft relationships, and active race time into NPC updates without giving NPCs a direct scene dependency.
- [x] 3.4 Verify vehicles still cannot draft from their own trail and existing draft charge behavior remains unchanged.

## 4. NPC Draft Seeking And Overtake Behavior

- [x] 4.1 Implement NPC draft target candidate filtering for player and NPC trails.
- [x] 4.2 Implement draft target scoring using forward alignment, reachability, closing speed, lateral cost, collision risk, and profile draft preference.
- [x] 4.3 Convert selected draft target into a bounded, smoothed lane offset instead of direct lateral movement.
- [x] 4.4 Detect rear-approach opportunity windows when an NPC closes rapidly on a front vehicle.
- [x] 4.5 Implement window-based `20%` deliberate rear-bump selection and prevent per-frame probability re-rolls during the same opportunity.
- [x] 4.6 Implement bounded left/right overtake lane selection for non-bump rear-approach opportunities.
- [ ] 4.7 Verify NPCs can follow another vehicle's trail, then overtake or occasionally bump without constant rear-end collisions.

## 5. NPC Side Pressure And Defensive Blocking

- [x] 5.1 Implement side-by-side opportunity detection using longitudinal gap, lateral gap, and relative speed thresholds.
- [x] 5.2 Implement window-based `30%` side-pressure intent that nudges NPC lane offset toward the parallel vehicle for a bounded duration.
- [x] 5.3 Ensure side pressure cancels or weakens during severe understeer or path recovery.
- [x] 5.4 Implement detection for vehicles drafting from an NPC's own trail.
- [x] 5.5 Implement window-based `40%` defensive block intent when a trailing vehicle threatens an overtake from the NPC's draft.
- [x] 5.6 Bias defensive block lane offset toward the challenger's passing side while keeping offsets within configured bounds.
- [ ] 5.7 Verify NPCs can side-pressure and block without directly teleporting or bypassing collision physics.

## 6. Tactical Priority And Safety Integration

- [x] 6.1 Implement fixed NPC tactical priority ordering for path recovery, rear collision handling, defensive block, side pressure, draft seeking, and normal race-line following.
- [x] 6.2 Ensure high-priority understeer recovery can override aggressive side pressure, defensive block, or draft seeking.
- [x] 6.3 Clamp and smooth all tactical lane offsets before they affect the look-ahead target.
- [x] 6.4 Ensure NPC throttle and brake outputs do not produce contradictory full-throttle/full-brake behavior outside explicit recovery cases.
- [x] 6.5 Verify aggressive intents remain temporary and expire cleanly.

## 7. Verification And Tuning

- [x] 7.1 Run `npm run build` and resolve TypeScript or bundling errors introduced by the change.
- [ ] 7.2 Manually verify player low-speed acceleration is slightly faster and near-maximum acceleration tapers off.
- [ ] 7.3 Manually verify player steering has a sharper initial response, slower sustained response, and usable high-speed control.
- [ ] 7.4 Manually verify NPCs receive the start acceleration boost only during the first two active race seconds.
- [ ] 7.5 Manually verify NPCs show small per-race cornering differences without obvious base speed unfairness.
- [ ] 7.6 Manually verify NPCs pursue player and NPC trails, overtake close front vehicles, and occasionally choose deliberate rear bumps.
- [ ] 7.7 Manually verify side pressure and defensive blocking appear occasionally, stay bounded, and yield to cornering recovery.
- [x] 7.8 Review changed files for scope control, avoiding unrelated UI, menu, track, asset, or checkpoint changes.
