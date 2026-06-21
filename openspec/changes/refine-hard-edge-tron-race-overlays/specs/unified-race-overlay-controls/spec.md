## ADDED Requirements

### Requirement: Settings and results SHALL share one action control language
The race system SHALL render settings actions and results actions using one shared visual control language so the player perceives them as part of the same UI system.

#### Scenario: Results actions match settings actions
- **WHEN** the player compares `RESUME / RESTART RACE / EXIT TO MENU` with `BACK / RETRY`
- **THEN** all actions use the same family of control styling
- **AND** the only differences are layout or emphasis appropriate to each overlay

### Requirement: Overlay action controls SHALL provide pressed shape feedback
The race system SHALL provide visible pressed-state shape feedback for settings actions, results actions, and the settings gear icon.

#### Scenario: Action button press produces shape feedback
- **WHEN** the player clicks any overlay action control
- **THEN** the control shows a brief shape change such as scale, inset, or line response
- **AND** the player can perceive that the press was registered

#### Scenario: Gear icon press produces matching feedback
- **WHEN** the player clicks the settings gear icon
- **THEN** the icon shows the same family of pressed feedback as the overlay controls

### Requirement: Settings icon SHALL be clearly recognizable as a gear
The race system SHALL render the settings icon with a more typical mechanical gear silhouette so it is visually identifiable as a settings gear at HUD size.

#### Scenario: Gear icon silhouette reads clearly
- **WHEN** the player views the top-right settings icon in race
- **THEN** the icon shows a recognizable toothed gear outline
- **AND** the icon does not read primarily as a circular dial or abstract ring
