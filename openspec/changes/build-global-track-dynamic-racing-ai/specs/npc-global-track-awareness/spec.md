## ADDED Requirements

### Requirement: NPCs SHALL maintain a full-track planning representation
The race system SHALL preprocess the full race track into a planning representation that NPCs can use for long-range reasoning instead of depending only on a local look-ahead point or short preview window.

#### Scenario: NPC accesses track context beyond its local horizon
- **WHEN** an NPC is planning through a current section of track
- **THEN** the planner SHALL be able to reference geometry information from the full race track rather than only from a short local sample

#### Scenario: Global planning data remains tied to the actual track path
- **WHEN** the track planning representation is built
- **THEN** it SHALL be derived from the existing track path geometry rather than from a separate authored ideal-line asset

### Requirement: NPC planning SHALL use track-relative coordinates
The race system SHALL represent NPC planning states in a track-relative coordinate system that separates progress along the course from lateral offset across it.

#### Scenario: Local state is expressed relative to track progress
- **WHEN** an NPC evaluates future candidate trajectories
- **THEN** those candidates SHALL be representable by forward progress along the track and lateral displacement relative to the track reference line

#### Scenario: Track-relative planning supports lateral alternatives
- **WHEN** an NPC compares multiple future racing-line choices
- **THEN** the planner SHALL be able to distinguish those alternatives as different lateral positions on the same future track segments

### Requirement: Global track context SHALL inform local planning priorities
The race system SHALL let future track context influence local planning so NPCs do not optimize only for the next few meters in isolation.

#### Scenario: Linked corners affect local line choice
- **WHEN** a current corner leads directly into a different follow-up corner
- **THEN** the local planner SHALL be able to favor a path that improves the combined sequence rather than only the first corner in isolation

#### Scenario: Long straight opportunity affects local preparation
- **WHEN** a local corner exits into a longer acceleration section
- **THEN** the planner SHALL be able to value exit quality and future progress more than a locally attractive but slower-exit alternative
