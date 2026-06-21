## ADDED Requirements

### Requirement: NPCs SHALL preview the track across multiple forward horizons
The race system SHALL let each NPC read the upcoming track from multiple forward preview horizons instead of only one immediate look-ahead point.

#### Scenario: NPC samples near, mid, and far preview targets
- **WHEN** an NPC computes its race-line control during an active race
- **THEN** the system SHALL produce at least near, mid, and far preview targets from future path points ahead of the NPC's current path index

#### Scenario: Preview remains tied to the race track
- **WHEN** an NPC computes forward preview targets
- **THEN** every preview target SHALL be derived from the track path data rather than from the finish line, world origin, or another non-track navigation anchor

### Requirement: NPC far preview SHALL be very long and speed aware
The race system SHALL let NPCs see much farther ahead on the track than the current short look-ahead behavior, with far preview distance scaling strongly with speed.

#### Scenario: Far preview exceeds immediate steering horizon
- **WHEN** an NPC is driving at race speed on a straight or approach segment
- **THEN** its far preview distance SHALL extend materially beyond the near preview distance used for immediate steering correction

#### Scenario: Higher speed increases far preview distance
- **WHEN** an NPC computes preview at low speed and again at high speed
- **THEN** the high-speed far preview distance SHALL be greater than the low-speed far preview distance

### Requirement: NPC preview SHALL estimate future curvature
The race system SHALL derive future corner direction and curvature strength from upcoming path segments so that NPCs can prepare for turns before large local steering error appears.

#### Scenario: Preview identifies corner direction
- **WHEN** the future path bends predominantly left or right
- **THEN** the preview result SHALL expose the corresponding corner direction sign for the NPC controller

#### Scenario: Preview identifies corner intensity
- **WHEN** the future path contains a shallow bend and a tighter bend
- **THEN** the tighter bend SHALL yield a higher curvature strength estimate than the shallow bend
