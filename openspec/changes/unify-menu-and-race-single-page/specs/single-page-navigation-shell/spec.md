## ADDED Requirements

### Requirement: Application SHALL host menu and race views inside a single page shell
The application SHALL render the menu experience and the race experience inside one HTML document and one application runtime, without using full-page navigation between them.

#### Scenario: Initial load shows menu view in single-page shell
- **WHEN** the application loads without a race route
- **THEN** the menu view SHALL be visible inside the single-page shell
- **AND** the race view SHALL not be active
- **AND** no browser full-page navigation SHALL be required to reach the menu

#### Scenario: Starting race does not reload browser page
- **WHEN** the player starts a race from the menu
- **THEN** the application SHALL switch from menu view to race view inside the same page
- **AND** the transition SHALL complete without assigning `window.location.href` to a different HTML file

### Requirement: Application SHALL provide in-page routing for menu and race states
The application SHALL expose routable menu and race states through an in-page routing mechanism so that navigation is represented in browser history without full-page page changes.

#### Scenario: Route represents menu state
- **WHEN** the application is in menu state
- **THEN** the active route SHALL resolve to the menu view

#### Scenario: Route represents race state and selected vehicle
- **WHEN** the player starts a race with a selected vehicle
- **THEN** the active route SHALL resolve to the race view
- **AND** the route SHALL preserve the selected vehicle identifier needed to construct the race session

#### Scenario: Browser back returns from race to menu
- **WHEN** the player is in race state and activates browser back navigation
- **THEN** the application SHALL return to menu state inside the same page
- **AND** the race view SHALL be deactivated

### Requirement: Application SHALL centralize shell-level UI ownership
The application shell SHALL own the visibility and base state of global UI layers shared by menu and race, including the curtain layer and view containers.

#### Scenario: Shell controls menu and race container visibility
- **WHEN** the route changes between menu and race
- **THEN** the application shell SHALL update which view container is active
- **AND** it SHALL not rely on separate HTML files to create or remove those containers

#### Scenario: Shell initializes shared curtain layer
- **WHEN** the application bootstraps
- **THEN** the shared curtain layer SHALL exist once in the single-page shell
- **AND** both menu and race flows SHALL operate against that shared layer instead of creating separate page-level curtains
