## ADDED Requirements

### Requirement: Returning to menu SHALL use the curtain black-screen transition
The race system SHALL apply the same curtain-style black-screen transition when returning to the menu from race as the player sees when starting a race from the menu.

#### Scenario: Settings exit returns to menu through black-screen transition
- **WHEN** the player clicks `EXIT TO MENU` from the in-race settings overlay
- **THEN** the curtain first fades the screen to black
- **AND** the menu view is shown only within that black-screen transition
- **AND** the curtain then fades back out to reveal the menu

#### Scenario: Results back returns to menu through black-screen transition
- **WHEN** the player clicks `BACK` from the results overlay
- **THEN** the curtain first fades the screen to black
- **AND** the menu view is shown only within that black-screen transition
- **AND** the curtain then fades back out to reveal the menu

### Requirement: Menu return transition SHALL be centralized
The race system SHALL route all race-to-menu exits through one shared transition path so settings exit, results back, and future direct race-to-menu actions cannot diverge in behavior.

#### Scenario: Menu return behavior stays consistent across entry points
- **WHEN** the player returns to the menu from different race UI entry points
- **THEN** each entry point reuses the same curtain transition sequence
- **AND** the player does not observe one path snapping directly to menu while another path fades through black
