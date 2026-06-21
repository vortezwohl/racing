## ADDED Requirements

### Requirement: All race vehicles SHALL synthesize continuous engine audio
The race system SHALL provide continuous synthesized engine audio for the player vehicle and for every active NPC vehicle during the race scene, instead of limiting continuous engine audio to the player only.

#### Scenario: Race scene initializes engine audio for all vehicles
- **WHEN** a race scene creates the player vehicle and its NPC opponents
- **THEN** each active vehicle SHALL initialize an engine audio chain for real-time playback
- **AND** the system SHALL keep resource-based race sound effects separate from this synthesized engine layer

### Requirement: Non-local vehicle engine audio SHALL stay below the player in base loudness
The race system SHALL keep the local player engine audio as the dominant reference voice, while every non-local vehicle starts from a lower base loudness before spatial attenuation is applied.

#### Scenario: Nearby NPC is audible but not louder than the local player by default
- **WHEN** an NPC vehicle is close enough to the player to remain within the active spatial audio range
- **THEN** the NPC engine audio SHALL remain clearly audible
- **AND** its unattenuated base loudness SHALL be lower than the player's base loudness

### Requirement: Engine audio lifecycle SHALL be released for every vehicle
The race system SHALL stop and disconnect synthesized engine audio nodes for the player and every NPC when the race scene is disposed or rebuilt.

#### Scenario: Scene disposal clears all vehicle engine nodes
- **WHEN** the race scene is disposed, restarted, or replaced
- **THEN** synthesized engine audio for the player and every NPC SHALL stop and disconnect cleanly
- **AND** the system SHALL NOT leave stale engine audio continuing after the scene is gone
