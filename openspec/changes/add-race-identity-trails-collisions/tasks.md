## 1. Baseline Audit And Shared Configuration

- [x] 1.1 Add a shared race performance configuration for baseline acceleration, deceleration, friction, turn rate, roll limit, gravity, and speed ceiling rules.
- [x] 1.2 Update vehicle construction so playable vehicles and CPU vehicles use the shared baseline performance while preserving model path and hitbox dimensions.
- [x] 1.3 Remove CPU random baseline performance variation, including random thrust ceilings that affect race fairness.
- [x] 1.4 Verify all vehicle types instantiate with identical baseline performance values and no CPU random performance advantage.

## 2. Consistent Name Rendering

- [x] 2.1 Ensure the intended name font is explicitly loaded or provide a deterministic local fallback path for canvas text rendering.
- [x] 2.2 Refactor menu vehicle label sizing so labels do not inherit visually inconsistent vehicle model scaling.
- [x] 2.3 Verify all menu vehicle names render with consistent font family and visual text height across all selectable vehicles.

## 3. Race Identity Markers

- [x] 3.1 Add stable race participant identity metadata, including id, display name, identity color, and local-player flag.
- [x] 3.2 Create reusable overhead name sprite and pointer marker visuals that share the participant identity color.
- [x] 3.3 Attach overhead identity markers to NPC vehicles and keep them synchronized with vehicle position during updates.
- [x] 3.4 Hide or skip the local player's own overhead marker during normal racing.
- [x] 3.5 Verify NPC markers are visible, follow vehicles, share colors with identity metadata, and the local player marker is not visible.

## 4. Trail Visual System

- [x] 4.1 Add per-vehicle trail sampling at the vehicle tail using a fixed-size history buffer.
- [x] 4.2 Render short TRON-style additive trails from sampled history using each vehicle's identity color.
- [x] 4.3 Scale visible trail length with speed while enforcing a shared minimum and maximum trail length for all vehicles.
- [x] 4.4 Verify trails appear behind each vehicle, match identity colors, remain below maximum length, and produce equivalent length at equivalent speeds.

## 5. Draft Boost System

- [x] 5.1 Add trail-zone detection based on distance from a vehicle to other vehicles' trail history segments.
- [x] 5.2 Add draft charge accumulation while inside another vehicle's trail and prevent self-trail drafting.
- [x] 5.3 Apply draft charge as temporary acceleration and speed ceiling multipliers without mutating baseline performance.
- [x] 5.4 Add smooth draft charge decay after leaving all trail zones.
- [x] 5.5 Verify draft charge accumulates in other trails, ignores own trail, boosts acceleration and temporary speed ceiling, then decays back to baseline.

## 6. Vehicle Collision System

- [x] 6.1 Add pairwise vehicle hitbox overlap detection for active race vehicles.
- [x] 6.2 Add collision separation so overlapping vehicle hitboxes cannot freely pass through each other.
- [x] 6.3 Add collision slow runtime effect for both collision participants.
- [x] 6.4 Bias collision displacement so faster vehicles push slower vehicles more strongly, while similar-speed vehicles share displacement.
- [x] 6.5 Ensure trail intersection never triggers vehicle collision slow or physical blocking.
- [x] 6.6 Verify hitboxes are fully invisible during normal race and only visible in debug visualization if enabled.

## 7. Dynamic Player Camera FOV

- [x] 7.1 Add configurable low-speed, high-speed, draft bonus, and maximum FOV values for the player camera.
- [x] 7.2 Update player camera movement so target FOV is calculated from local player speed and local draft charge.
- [x] 7.3 Smoothly interpolate camera FOV toward the target and update the projection matrix after changes.
- [x] 7.4 Verify stationary FOV is narrow, high-speed FOV is wider, draft boost adds only a limited bonus, and NPC state does not directly drive the local camera FOV.

## 8. Integrated Verification

- [x] 8.1 Run the project build and fix any TypeScript or bundling errors introduced by the change.
- [ ] 8.2 Manually verify a full race start with player plus NPC vehicles, including countdown, movement, markers, trails, collisions, and finish behavior.
- [ ] 8.3 Manually verify reset/out-of-bounds behavior clears temporary runtime effects or restores safe defaults.
- [x] 8.4 Review final diff for scope control, ensuring no unrelated business logic, assets, dependencies, or build configuration were changed.
