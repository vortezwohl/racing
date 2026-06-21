## ADDED Requirements

### Requirement: NPC tactical aggression SHALL yield to cornering load
The race system SHALL reduce or suppress draft, overtake, block, and side-pressure lane bias when previewed cornering demand is high.

#### Scenario: Tactical offset fades in heavy cornering
- **WHEN** an NPC enters a section with high previewed corner load
- **THEN** the effective tactical lane offset SHALL be reduced relative to its straight-line value

#### Scenario: Tactical behavior remains stronger on safer sections
- **WHEN** an NPC is on a low-curvature straight or light bend
- **THEN** the tactical lane offset SHALL be allowed to remain closer to its full configured intent

### Requirement: NPC recovery SHALL override aggressive tactical intents
The race system SHALL let recovery state cancel aggressive tactical behavior completely while the NPC is trying to avoid leaving the safe racing line.

#### Scenario: Recovery cancels overtake pressure
- **WHEN** an NPC enters a recovery state during an active aggressive tactic
- **THEN** the aggressive tactical offset SHALL be suppressed in favor of returning to a safe line

#### Scenario: Recovery restores track-first behavior
- **WHEN** an NPC is recovering from steering saturation or severe cornering error
- **THEN** race-line completion and stability SHALL take precedence over bump, block, side-pressure, or ordinary draft pursuit

### Requirement: NPC baseline competence SHALL stay high across the field
The race system SHALL keep inter-NPC driving variance small so that all NPCs remain broadly strong and the weakest NPC does not look obviously unskilled.

#### Scenario: Skill variance does not degrade baseline control
- **WHEN** multiple NPC skill profiles are generated for a race
- **THEN** baseline track-following and corner completion competence SHALL remain consistently high across the full NPC field

#### Scenario: Differences remain smaller than shared competence
- **WHEN** two NPCs with different profiles drive the same corner sequence
- **THEN** their behavior MAY differ slightly in confidence or aggression, but both SHALL remain capable of completing the sequence without obvious low-skill mistakes under normal race conditions
