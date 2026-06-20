## ADDED Requirements

### Requirement: Settings overlay SHALL provide resume alongside restart and exit
The in-race settings overlay SHALL provide `RESUME`, `RESTART RACE`, and `EXIT TO MENU` actions.

#### Scenario: Resume closes settings and returns to live HUD
- **WHEN** the player clicks `RESUME` in the settings overlay
- **THEN** the settings overlay closes
- **AND** the race HUD returns to its normal in-race state without restarting or exiting the session

#### Scenario: Restart and exit remain available
- **WHEN** the player opens the settings overlay
- **THEN** `RESTART RACE` remains available to create a fresh race session
- **AND** `EXIT TO MENU` remains available to leave the current race session

### Requirement: Settings button SHALL use a frameless gear with press feedback
The in-race settings entry point SHALL be rendered as a frameless gear icon and SHALL provide a visible pressed response when clicked.

#### Scenario: Gear icon is visually minimal
- **WHEN** the player views the top-right HUD controls
- **THEN** the settings entry is shown as a simple gear icon without an enclosing heavy frame

#### Scenario: Clicking gear produces pressed feedback
- **WHEN** the player clicks the gear icon
- **THEN** the icon shows a brief pressed-state reaction such as a small scale-down or comparable tap feedback
- **AND** the settings overlay opens from that interaction

### Requirement: Opening settings SHALL NOT pause the race
The race system SHALL continue simulation while the settings overlay is visible, including after the new `RESUME` action is introduced.

#### Scenario: Race simulation continues behind settings
- **WHEN** the player opens the settings overlay during an active race
- **THEN** race timing and vehicle simulation continue updating in the background
