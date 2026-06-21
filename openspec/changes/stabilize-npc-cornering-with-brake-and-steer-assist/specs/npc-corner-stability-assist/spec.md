## ADDED Requirements

### Requirement: NPCs SHALL receive bounded corner steer assist under high corner demand
The race system SHALL allow NPCs to receive additional steering authority when immediate corner demand or recovery pressure is high, while keeping the assist bounded so NPCs do not gain an all-condition turning advantage.

#### Scenario: Steer assist activates in a demanding corner
- **WHEN** an NPC enters a corner with high immediate steering demand
- **THEN** the controller SHALL increase NPC steering support relative to a straight or light bend

#### Scenario: Steer assist remains limited on safe sections
- **WHEN** an NPC is driving on a straight or low-risk bend without recovery pressure
- **THEN** any NPC-specific steer assist SHALL be absent or materially smaller than in a demanding corner

### Requirement: NPC recovery SHALL start before near-total corner failure
The race system SHALL let NPCs enter a conservative stabilization mode before the corner attempt is already obviously lost.

#### Scenario: Overspeed corner entry triggers early stabilization
- **WHEN** an NPC approaches a current corner with both high immediate corner risk and clear overspeed relative to the safe target
- **THEN** the controller SHALL be able to enter a stabilization-oriented state before severe off-line drift is already visible

#### Scenario: Saturated steering demand triggers conservative recovery
- **WHEN** an NPC accumulates large near steer error or repeated near-saturated steering demand
- **THEN** the controller SHALL switch to a more conservative recovery behavior rather than continuing the same aggressive corner plan

### Requirement: Recovery mode SHALL favor braking, steering support, and safe targeting together
The race system SHALL coordinate NPC recovery so throttle is reduced, braking support rises, steer assist rises, and the target path becomes safer while recovery is active.

#### Scenario: Recovery reduces attack behavior
- **WHEN** an NPC enters recovery during a corner
- **THEN** the controller SHALL lower throttle intent and increase stabilizing control support compared with the non-recovery state

#### Scenario: Recovery promotes safe corner completion
- **WHEN** recovery remains active during a corner attempt
- **THEN** the controller SHALL prefer the safest available track-following target over preserving the previous aggressive corner shape
