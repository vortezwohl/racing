## ADDED Requirements

### Requirement: Race roster SHALL contain exactly five vehicles
The race system SHALL create exactly five active race vehicles for every standard race session, counting the local player and all NPC vehicles together.

#### Scenario: Standard race session starts
- **WHEN** the player starts a normal race session
- **THEN** the race scene creates exactly 5 active race vehicles in total

#### Scenario: Player vehicle is included in the total
- **WHEN** the race roster is finalized for a session
- **THEN** the player occupies 1 roster slot and the remaining slots are filled by NPC vehicles until the total reaches 5

### Requirement: NPC selection SHALL prefer unique vehicle choices before repeating
The race system SHALL fill NPC roster slots by preferring non-player vehicle choices that are not yet used in the current session, and SHALL only repeat a vehicle choice when the number of required NPC slots exceeds the number of remaining unique choices.

#### Scenario: Enough unique vehicle choices exist
- **WHEN** the race needs 4 NPC vehicles and at least 4 unique choices are available besides the player's vehicle
- **THEN** all 4 NPC vehicles use different vehicle choices and none of them repeat the player's current vehicle choice

#### Scenario: Unique vehicle choices are insufficient
- **WHEN** the race needs more NPC vehicles than the number of remaining unique vehicle choices
- **THEN** the race system allows repeated vehicle choices only for the overflow slots needed to keep the total roster at 5

### Requirement: Start grid SHALL use a two-front three-back staggered layout
The race system SHALL place the five rostered vehicles onto a fixed start grid that contains 2 front-row slots and 3 back-row slots arranged in a staggered pattern relative to the track start direction.

#### Scenario: Start grid is generated
- **WHEN** the race scene computes start positions for a session
- **THEN** it produces exactly 5 start slots
- **AND** 2 slots belong to the front row
- **AND** 3 slots belong to the back row

#### Scenario: Back row sits behind the front row
- **WHEN** the start grid is projected onto the track start direction
- **THEN** every back-row slot is positioned behind the front-row slots along the race start axis

### Requirement: Vehicle-to-slot assignment SHALL be randomized per session
The race system SHALL randomly assign the finalized five race participants to the five generated start-grid slots for each race session.

#### Scenario: Session roster is mapped to the grid
- **WHEN** the race session finishes preparing the participant roster and start grid
- **THEN** each participant is assigned to exactly one of the 5 slots
- **AND** each slot is occupied by exactly one participant

#### Scenario: Grid geometry remains fixed while occupants vary
- **WHEN** multiple race sessions are started with the same track configuration
- **THEN** the relative geometry of the 5 start slots remains the same
- **AND** the participant-to-slot mapping may differ between sessions

### Requirement: Start positions SHALL avoid initial overlap
The race system SHALL compute start-grid spacing using vehicle dimensions and safety padding so that active race vehicles do not begin the race with overlapping physical volume.

#### Scenario: Initial spawn completes
- **WHEN** all 5 race vehicles are created at their assigned start slots
- **THEN** no pair of active vehicle hitboxes overlaps at race start

#### Scenario: Largest available vehicle participates
- **WHEN** the race roster includes the largest currently supported vehicle dimensions
- **THEN** the start-grid spacing still prevents initial overlap with adjacent slots
