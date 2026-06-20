## ADDED Requirements

### Requirement: Stable race identity colors
The race system SHALL assign each participating vehicle a stable identity color for the duration of a race.

#### Scenario: Identity color remains stable during a race
- **WHEN** a race starts and vehicles are created
- **THEN** each vehicle has one identity color that remains unchanged until the race scene is disposed

#### Scenario: Identity color is shared by related visuals
- **WHEN** a vehicle has a name marker, pointer marker, and trail
- **THEN** those visuals use the same identity color for that vehicle

### Requirement: NPC vehicles show overhead identity markers
The race system SHALL show an overhead name marker and same-color pointer marker for every non-local-player vehicle.

#### Scenario: NPC marker is visible above vehicle
- **WHEN** an NPC vehicle is active in the race
- **THEN** the NPC has a visible name marker above its vehicle body
- **AND** the NPC has a same-color pointer marker indicating the vehicle position

#### Scenario: Marker follows vehicle movement
- **WHEN** an NPC vehicle moves or rotates during the race
- **THEN** its name marker and pointer marker remain positioned above that NPC vehicle

### Requirement: Local player overhead marker is hidden
The race system SHALL NOT show the local player's own overhead name marker or pointer marker during normal racing.

#### Scenario: Player marker is hidden
- **WHEN** the local player's vehicle is active in the race
- **THEN** no local-player overhead name marker is visible to the player
- **AND** no local-player overhead pointer marker is visible to the player

### Requirement: Vehicle name rendering is visually consistent
The menu and race identity systems SHALL render vehicle names with consistent font loading, font family, and visual sizing rules.

#### Scenario: Menu vehicle labels have consistent visual size
- **WHEN** the user switches between selectable vehicles in the menu
- **THEN** each vehicle name uses the same intended font family
- **AND** each vehicle name has a consistent visual text height

#### Scenario: Race markers use consistent text styling
- **WHEN** race identity markers are displayed for NPC vehicles
- **THEN** every displayed vehicle name uses the same text styling rules except for identity color
