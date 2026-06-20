## ADDED Requirements

### Requirement: Player finish SHALL reliably open the results overlay
The race system SHALL open the results overlay immediately after the player legally completes the final lap, and SHALL NOT require an additional frame-order coincidence to reveal the post-race panel.

#### Scenario: Final lap completion opens results
- **WHEN** the player crosses the start-finish checkpoint and that crossing completes the configured final lap
- **THEN** the race session enters finished state during that completion flow
- **AND** the translucent results overlay becomes visible on the race screen

#### Scenario: Player does not remain in a finished-without-overlay state
- **WHEN** the player has already satisfied the final lap completion condition
- **THEN** the system MUST NOT leave the race in a state where gameplay is marked complete but the results overlay is absent

### Requirement: Finish handling SHALL be idempotent
The race system SHALL treat player finish handling as a single-entry transition, so repeated collision checks or duplicate lap-complete notifications do not produce multiple result transitions.

#### Scenario: Duplicate finish notifications are ignored
- **WHEN** the player finish path is signaled more than once for the same race session
- **THEN** the system applies the result transition only once
- **AND** finish audio, result visibility, and frozen player finish time are not duplicated
