## ADDED Requirements

### Requirement: The project SHALL support unattended NPC race observation validation
The race workflow SHALL include a validation pass that launches a race without player control input and evaluates whether NPCs behave like aggressive professional racers while staying on legal track corridors.

#### Scenario: Observation race is launched
- **WHEN** developers run the defined validation flow for this capability
- **THEN** the race SHALL be observed without active player steering, throttle, or brake control affecting NPC evaluation

#### Scenario: NPC leaves legal track space during observation
- **WHEN** an NPC repeatedly exits legal corridors or attempts illegal shortcuts during the observation run
- **THEN** the validation SHALL be marked as failed

### Requirement: Observation validation SHALL inspect legal aggression and route discipline
Observation validation SHALL explicitly check whether NPCs remain aggressive through drafting, overtakes, blocking, and legal connector usage while still respecting legal route constraints.

#### Scenario: NPC attacks through a legal connector
- **WHEN** an NPC changes corridor to overtake, block, or squeeze another vehicle during observation
- **THEN** that action SHALL count as valid only if it stays within legal corridor and connector definitions

#### Scenario: NPC appears fast but takes illegal shortcut
- **WHEN** an NPC gains time by crossing non-drivable space instead of using a legal route or connector
- **THEN** the observation SHALL classify that behavior as invalid even if the lap time improves

### Requirement: Observation validation SHALL capture trajectory-oriented evidence
The validation workflow SHALL record enough evidence to judge whether NPC trajectories are smooth, corridor-compliant, and tactically strong.

#### Scenario: Validation result is reviewed
- **WHEN** a developer reviews the observation run
- **THEN** the workflow SHALL provide trajectory-relevant evidence such as visible race observation, planner telemetry, or comparable debug traces showing whether NPCs stayed on legal corridors
