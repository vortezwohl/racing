## ADDED Requirements

### Requirement: High current corner risk SHALL suppress professional line bias
The race system SHALL reduce or suppress NPC professional corner line bias when the current corner is risky enough that staying on track matters more than shaping an ideal line.

#### Scenario: Overspeed heavy corner collapses line bias
- **WHEN** an NPC enters a heavy corner with high current corner risk or overspeed
- **THEN** the effective corner line bias SHALL be reduced relative to a stable low-risk corner

#### Scenario: Recovery removes aggressive line shaping
- **WHEN** an NPC is in recovery during a corner
- **THEN** the controller SHALL suppress aggressive line shaping in favor of a safer target line

### Requirement: High current corner risk SHALL suppress tactical lateral behavior before track loss
The race system SHALL reduce or suppress tactical lateral behavior when the current cornering situation is unsafe, so racecraft yields before the NPC leaves the track.

#### Scenario: Corner danger fades tactical lane offset
- **WHEN** an NPC is in a medium or heavy corner with elevated current corner risk
- **THEN** the effective tactical lateral offset SHALL be smaller than on a straight or light bend

#### Scenario: Recovery cancels tactical behavior completely
- **WHEN** an NPC enters recovery while a tactical lateral behavior is active
- **THEN** the tactical lateral behavior SHALL be suppressed until the controller returns to a safe state

### Requirement: Track retention SHALL outrank polish behaviors
The race system SHALL prioritize staying on the track and finishing the corner above professional line bias or aggressive racecraft whenever those goals conflict.

#### Scenario: Safe line beats polished line
- **WHEN** the controller cannot both preserve an idealized line shape and keep the NPC safely on track
- **THEN** it SHALL choose the safer track-following line

#### Scenario: Safe corner completion beats attack intent
- **WHEN** the controller cannot both preserve an aggressive tactic and keep a safe corner trajectory
- **THEN** it SHALL prioritize safe corner completion over the aggressive tactic
