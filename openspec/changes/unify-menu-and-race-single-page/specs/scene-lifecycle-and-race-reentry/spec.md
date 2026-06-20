## ADDED Requirements

### Requirement: Scenes SHALL support explicit lifecycle transitions
Menu and race scenes SHALL support explicit activation and disposal boundaries so that repeated entry and exit do not depend on browser page reloads.

#### Scenario: Menu scene reactivates after leaving race
- **WHEN** the player leaves the race and returns to the menu
- **THEN** the menu scene SHALL become active again without requiring a full-page reload
- **AND** menu input handlers SHALL work exactly once per interaction

#### Scenario: Race scene can be disposed after leaving race
- **WHEN** the player leaves the race view
- **THEN** the active race scene SHALL release its event listeners and runtime hooks
- **AND** it SHALL not continue responding to keyboard, pointer, or animation updates after deactivation

### Requirement: Starting a new race SHALL create a clean race session
Each new race entry from the menu SHALL start from a clean race session state, even when the player has previously finished, abandoned, or restarted a race during the same page lifetime.

#### Scenario: Starting race after returning to menu resets countdown and HUD
- **WHEN** the player returns to the menu and starts another race
- **THEN** the new race session SHALL reset countdown state, lap state, timer state, finish-screen state, and HUD visibility
- **AND** stale values from the previous race SHALL not remain visible

#### Scenario: Starting race after previous finish resets finish state
- **WHEN** the player has completed a race and starts a new race again
- **THEN** the finish screen SHALL be hidden at the start of the new race
- **AND** the new race SHALL begin from its normal pre-race countdown flow

### Requirement: Menu start transition SHALL hand off to race session without page navigation
The menu start flow SHALL preserve the existing menu-to-race transition feel while handing off into the race session inside the same page runtime.

#### Scenario: Menu transition hands off to in-page race route
- **WHEN** the player clicks `PLAY` from the menu
- **THEN** the menu transition SHALL complete before the race session becomes active
- **AND** the handoff SHALL activate the race route in-page instead of opening a separate HTML page

### Requirement: Race recovery and black-screen effects SHALL continue to function after single-page migration
Race-only UI flows, including out-of-bounds recovery and race-finish black-screen sequences, SHALL continue to work after migrating to the single-page shell.

#### Scenario: Out-of-bounds recovery still drives curtain flow
- **WHEN** the player vehicle goes out of bounds during a race
- **THEN** the race flow SHALL still use the shared curtain layer to perform the recovery transition
- **AND** the vehicle SHALL be restored to the correct checkpoint afterwards

#### Scenario: Finishing race still drives end-of-race curtain flow
- **WHEN** the player completes the race
- **THEN** the end-of-race curtain animation SHALL still execute
- **AND** the finish information SHALL be shown without requiring a page reload
