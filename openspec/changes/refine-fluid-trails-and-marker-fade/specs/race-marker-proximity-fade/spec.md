## ADDED Requirements

### Requirement: Markers fade near camera
The race system SHALL fade NPC overhead markers when they are too close to the local player's camera.

#### Scenario: Marker is opaque at safe distance
- **WHEN** an NPC overhead marker is at or beyond the configured full-opacity distance from the camera
- **THEN** the marker is fully visible

#### Scenario: Marker fades at close distance
- **WHEN** an NPC overhead marker moves between the configured fade start and fade end distances
- **THEN** the marker opacity decreases smoothly as it gets closer to the camera

#### Scenario: Marker is nearly transparent very close
- **WHEN** an NPC overhead marker is at or below the configured near-hidden distance from the camera
- **THEN** the marker is nearly transparent or hidden

### Requirement: Name and pointer fade together
The race system SHALL apply proximity fade to both the overhead name and pointer marker as one visual group.

#### Scenario: Entire marker group fades
- **WHEN** proximity fade changes marker opacity
- **THEN** the name sprite opacity changes
- **AND** the pointer sprite opacity changes by the same fade rule

### Requirement: Proximity fade does not change marker ownership
The race system SHALL keep existing marker ownership rules while applying proximity fade.

#### Scenario: Local player marker remains hidden
- **WHEN** proximity fade is active
- **THEN** the local player's own overhead marker remains hidden

#### Scenario: NPC marker remains distance-readable
- **WHEN** an NPC marker is not near the camera
- **THEN** the marker remains visible according to existing NPC identity marker rules
