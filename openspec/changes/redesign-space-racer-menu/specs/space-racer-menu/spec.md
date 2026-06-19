## ADDED Requirements

### Requirement: Menu scene SHALL support direct 3D vehicle selection
The menu scene SHALL allow the player to select a vehicle by clicking or tapping the rendered vehicle itself instead of interacting with HTML overlay boxes.

#### Scenario: Player clicks a visible vehicle
- **WHEN** the player clicks or taps on a rendered selectable vehicle in the menu scene
- **THEN** the system selects that vehicle through scene-based hit detection

#### Scenario: Player clicks empty scene space
- **WHEN** the player clicks or taps on background space that does not intersect a selectable vehicle
- **THEN** the system SHALL keep the current selection unchanged

### Requirement: Menu scene SHALL show in-scene selection feedback
The menu scene SHALL indicate the active vehicle selection inside the rendered scene by slightly enlarging the selected vehicle and showing a small check marker beneath it, without relying on HTML selection boxes.

#### Scenario: Vehicle becomes selected
- **WHEN** a vehicle becomes the active selection
- **THEN** that vehicle SHALL scale up relative to unselected vehicles
- **AND** a check marker SHALL appear beneath the selected vehicle

#### Scenario: Selection moves to a different vehicle
- **WHEN** the player selects a different vehicle
- **THEN** the previously selected vehicle SHALL return to its unselected presentation
- **AND** the newly selected vehicle SHALL receive the enlarged state and check marker

### Requirement: Menu scene SHALL present a dark space backdrop with 3D stars
The menu scene SHALL keep a dark space-like visual base while rendering a layered 3D starfield and additional distant space objects so the background feels like outer space rather than a flat black screen.

#### Scenario: Menu scene loads
- **WHEN** the menu scene finishes loading
- **THEN** the rendered background SHALL include 3D stars distributed through scene depth

#### Scenario: Dark palette is preserved
- **WHEN** the menu scene is visible
- **THEN** the overall backdrop MAY remain dark
- **AND** it MUST include visible spatial detail beyond a flat solid-black fill

### Requirement: Menu scene SHALL render a pulsing 3D title
The menu scene SHALL display its primary title as a 3D or scene-native title element that repeatedly scales up and down in a loop.

#### Scenario: Menu title is displayed
- **WHEN** the menu scene is visible
- **THEN** the title SHALL appear as part of the rendered scene rather than only as flat HTML text

#### Scenario: Title animation loops
- **WHEN** the menu scene remains idle on screen
- **THEN** the title SHALL continue a repeating pulse animation by scaling up and down

### Requirement: Menu scene SHALL expose all intended selectable vehicles through one menu data source
The menu scene SHALL derive its selectable vehicle set from a single menu-focused configuration so that every intended player-selectable vehicle appears consistently in the menu.

#### Scenario: Menu initializes selectable vehicles
- **WHEN** the menu scene builds its selectable content
- **THEN** it SHALL use one menu-specific vehicle list as the source of truth

#### Scenario: Menu displays vehicle lineup
- **WHEN** the menu scene is presented to the player
- **THEN** every intended playable menu vehicle SHALL appear in the selection lineup

### Requirement: Menu scene SHALL adapt layout responsively
The menu scene SHALL adjust camera framing, vehicle spacing, and title placement for different viewport sizes so the menu remains usable on both desktop and narrower screens.

#### Scenario: Viewport is resized
- **WHEN** the viewport dimensions change
- **THEN** the menu scene SHALL recalculate its presentation layout and camera framing

#### Scenario: Narrow viewport presentation
- **WHEN** the menu scene is shown on a narrow screen
- **THEN** selectable vehicles and title elements SHALL remain visible without relying on fixed desktop-only spacing
