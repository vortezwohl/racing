## ADDED Requirements

### Requirement: Menu scene SHALL use arrow-based carousel navigation
The menu scene SHALL let the player browse selectable vehicles through an in-scene left arrow and right arrow instead of selecting vehicles by clicking directly on different ships in the lineup.

#### Scenario: Player clicks the left arrow
- **WHEN** the player clicks or taps the left arrow control
- **THEN** the menu SHALL switch to the previous selectable vehicle in the carousel order
- **AND** the left arrow SHALL play a short click-scale feedback animation

#### Scenario: Player clicks the right arrow
- **WHEN** the player clicks or taps the right arrow control
- **THEN** the menu SHALL switch to the next selectable vehicle in the carousel order
- **AND** the right arrow SHALL play a short click-scale feedback animation

#### Scenario: Arrow controls are idle
- **WHEN** the menu scene is visible and no arrow is being clicked
- **THEN** the left and right arrow controls SHALL remain static
- **AND** they SHALL NOT run a continuous breathing animation

### Requirement: Menu scene SHALL feature one primary vehicle at a time
The menu scene SHALL present one currently selected vehicle as the main focus of the carousel instead of relying on a multi-vehicle selection grid as the primary interaction surface.

#### Scenario: Menu scene loads
- **WHEN** the menu scene finishes loading
- **THEN** exactly one selectable vehicle SHALL be presented as the active featured vehicle

#### Scenario: Carousel selection changes
- **WHEN** the player navigates to a different vehicle through the carousel
- **THEN** the newly selected vehicle SHALL become the primary displayed vehicle
- **AND** the previous vehicle SHALL no longer remain the primary featured selection

### Requirement: Menu scene SHALL normalize menu vehicle presentation scale
The menu scene SHALL display each selectable vehicle at a visually consistent presentation size even when the source models have different proportions.

#### Scenario: Different vehicles are browsed
- **WHEN** the player cycles through vehicles with noticeably different shapes
- **THEN** each vehicle SHALL occupy a similar perceived amount of menu space
- **AND** no vehicle SHALL appear disproportionately oversized or undersized relative to the others

### Requirement: Menu scene SHALL remove pedestal-style base decorations
The menu scene SHALL present the featured vehicle without the circular pedestal, plate, or similar base decoration beneath it.

#### Scenario: Featured vehicle is visible
- **WHEN** a vehicle is displayed in the carousel
- **THEN** there SHALL be no circular base platform rendered underneath the vehicle
- **AND** the vehicle label MAY remain visible below the vehicle

### Requirement: Menu scene SHALL use low-glare menu typography
The menu scene SHALL avoid harsh glowing white text and SHALL render menu title and label text with a flatter, lower-intensity treatment.

#### Scenario: Menu title is visible
- **WHEN** the title is rendered in the menu
- **THEN** it SHALL remain readable against the dark background
- **AND** it SHALL NOT rely on bright white glow-heavy styling

#### Scenario: Vehicle label is visible
- **WHEN** the active vehicle label is rendered
- **THEN** the text SHALL use a plain, non-glowing presentation
- **AND** it SHALL avoid bloom-amplified white glare

### Requirement: Menu scene SHALL match the geometric race-scene starfield style
The menu scene SHALL render a dark-space background that visibly uses the same geometric wireframe star language as the race scene instead of reading like a mostly empty black field.

#### Scenario: Menu background is shown
- **WHEN** the menu scene is visible
- **THEN** the background SHALL include clearly visible geometric wireframe stars distributed through depth
- **AND** the scene SHALL preserve a dark outer-space palette

#### Scenario: Race and menu scenes are compared
- **WHEN** the player compares the menu background with the race scene background
- **THEN** both scenes SHALL share a recognizably similar geometric starfield style

### Requirement: Menu scene SHALL preserve game launch confirmation behavior
The menu scene SHALL keep an explicit confirmation action for entering the race with the currently selected vehicle.

#### Scenario: Player confirms after browsing
- **WHEN** the player activates the confirm control
- **THEN** the menu SHALL open `game.html?speeder=<index>` for the currently selected vehicle
