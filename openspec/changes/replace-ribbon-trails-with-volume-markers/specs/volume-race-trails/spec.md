## ADDED Requirements

### Requirement: Race trails SHALL use volume particle clusters instead of ribbon-dominant geometry
The race scene SHALL render each vehicle trail as a volume-style particle trail built from effective trail sample positions, and SHALL NOT rely on ribbon mesh as the primary visible trail form.

#### Scenario: Trail is visible behind a moving vehicle
- **WHEN** a race vehicle moves fast enough for its trail to become visible
- **THEN** the trail is rendered as a chain of volume-like glow clusters and particles along the effective trail path

#### Scenario: Ribbon is not the primary silhouette
- **WHEN** the trail is viewed from different camera angles
- **THEN** the dominant visible shape remains clustered volume glow rather than a flat ribbon band

### Requirement: Trail visual length SHALL match trail gameplay length
The system SHALL continue using a single effective trail path for both trail rendering length and draft gameplay detection length.

#### Scenario: Player reaches the visible tail end
- **WHEN** a player enters the tail end of another vehicle's visible trail
- **THEN** draft gameplay detection remains active through the same longitudinal extent

#### Scenario: Player leaves the visible trail end
- **WHEN** a player moves beyond the visible end of another vehicle's trail
- **THEN** the player no longer receives trail-based draft detection from that vehicle's trail length beyond that point

### Requirement: Trail gameplay width SHALL be configurable independently from visual width
The system SHALL provide separate configuration for visible trail cluster spread and trail draft detection width.

#### Scenario: Draft zone is wider than the visible trail
- **WHEN** the configured draft detection width is greater than the visible trail width
- **THEN** a vehicle can still receive trail draft while slightly outside the visible trail body

#### Scenario: Visual tuning does not force gameplay width changes
- **WHEN** the visible cluster spread is reduced for visual clarity
- **THEN** the trail draft detection width can remain unchanged

### Requirement: Trail density and length SHALL continue scaling with speed
The system SHALL continue scaling effective trail length with vehicle speed and SHALL vary visible cluster density or intensity with speed so low speed trails remain shorter and high speed trails remain longer and more legible.

#### Scenario: Low speed trail stays restrained
- **WHEN** a vehicle is moving near the minimum trail display speed
- **THEN** the visible trail remains short and lower density

#### Scenario: High speed trail becomes fuller
- **WHEN** a vehicle approaches its effective maximum speed
- **THEN** the visible trail becomes longer and visually fuller without exceeding the configured maximum length
