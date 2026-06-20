## ADDED Requirements

### Requirement: NPC race markers SHALL use fixed-size screen-space overlays
The race scene SHALL render NPC identity markers as screen-space overlay elements driven by projected 3D anchor positions, and the marker size SHALL remain constant in screen pixels regardless of camera distance.

#### Scenario: Distant NPC marker remains readable
- **WHEN** an NPC vehicle is far from the camera but still within marker display conditions
- **THEN** its name text and triangle indicator remain at the configured fixed screen size instead of shrinking with world distance

#### Scenario: Nearby NPC marker does not grow oversized
- **WHEN** an NPC vehicle is close to the camera
- **THEN** its name text and triangle indicator remain at the same configured screen size

### Requirement: Screen-space markers SHALL remain visible through world geometry
The race scene SHALL render NPC identity markers on a HUD overlay layer that is not occluded by track geometry or world objects.

#### Scenario: NPC is behind raised track geometry
- **WHEN** track geometry passes between the camera and an NPC vehicle
- **THEN** the NPC name text and triangle marker remain visible on the overlay

### Requirement: Marker opacity SHALL vary without changing marker size
The race scene SHALL control NPC marker visibility through opacity rules only, while keeping text and triangle size fixed.

#### Scenario: Marker fades near the camera
- **WHEN** an NPC marker enters the configured near-camera fade range
- **THEN** the marker becomes more transparent without changing its screen size

#### Scenario: Marker fades near the screen center
- **WHEN** an NPC marker overlaps the configured camera-center suppression region
- **THEN** the marker becomes more transparent without changing its screen size

### Requirement: Local player SHALL NOT receive a visible self marker
The local player vehicle SHALL NOT render a visible name text or triangle marker on the overlay.

#### Scenario: Local player is active in race
- **WHEN** the race scene updates overlay markers
- **THEN** the local player does not receive a visible self marker while NPC markers continue to render
