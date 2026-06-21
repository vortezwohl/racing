## ADDED Requirements

### Requirement: Racecraft behaviors SHALL influence trajectory scoring through dynamic priorities
The race system SHALL express draft seeking, overtaking, blocking, side-pressure, aggression, and recovery as dynamic scoring priorities inside local trajectory planning instead of as isolated post-hoc lane overrides.

#### Scenario: Draft opportunity rewards a trajectory
- **WHEN** a candidate local trajectory can safely enter or maintain a favorable draft position
- **THEN** that candidate SHALL be able to receive a positive draft-related planning reward

#### Scenario: Unsafe aggressive trajectory is penalized
- **WHEN** a candidate local trajectory gains an aggressive racecraft benefit but creates clearly higher safety or collision risk
- **THEN** the planner SHALL be able to penalize that candidate enough to reject it

### Requirement: Racecraft priority SHALL change with corner risk and recovery state
The race system SHALL raise or lower tactical behavior priorities based on current and future corner severity, overspeed pressure, and recovery pressure.

#### Scenario: Heavy corner suppresses attack intent
- **WHEN** an NPC enters a demanding cornering section
- **THEN** aggressive tactical priorities such as side-pressure or block-oriented path bias SHALL be reduced relative to a straight or light bend

#### Scenario: Recovery collapses racecraft priorities toward safety
- **WHEN** an NPC enters a recovery-oriented state
- **THEN** recovery and track safety priorities SHALL dominate draft, overtake, attack, and defense priorities

### Requirement: NPC personality differences SHALL remain smaller than shared competence
The race system SHALL allow minor differences in racecraft preference without letting those differences overwhelm baseline planning competence.

#### Scenario: Two NPCs differ in aggression but remain competent
- **WHEN** two NPCs with different mild racecraft preferences plan the same general racing situation
- **THEN** both SHALL remain capable of selecting viable local trajectories even if one is slightly more attack-oriented

#### Scenario: Personality does not replace planning safety
- **WHEN** a more aggressive NPC faces a high-risk cornering situation
- **THEN** the planner SHALL still prioritize a viable safe trajectory over aggressive behavior
