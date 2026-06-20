## MODIFIED Requirements

### Requirement: NPC race markers SHALL fade by proximity while preserving fixed screen size
The race scene SHALL render NPC overhead identity markers as fixed-size screen-space marker elements and SHALL apply proximity-based or screen-center-based fading by adjusting opacity only. Marker readability SHALL NOT depend on world-distance scaling.

#### Scenario: Close marker fades without shrinking
- **WHEN** an NPC marker moves into the configured close-camera fade zone
- **THEN** the marker becomes more transparent while keeping the configured text size and triangle size unchanged

#### Scenario: Distant marker keeps the same configured size
- **WHEN** an NPC marker is far from the camera and outside the fade suppression regions
- **THEN** it remains visible at the configured fixed screen size

#### Scenario: Marker remains usable through occluding track geometry
- **WHEN** track geometry lies between the camera and the NPC
- **THEN** the marker remains visible and subject only to overlay fade rules rather than world-depth occlusion
