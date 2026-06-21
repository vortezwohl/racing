## ADDED Requirements

### Requirement: NPC cornering SHALL optimize linked-corner and exit quality, not only the current apex
The race system SHALL let NPC local planning favor trajectories that improve combined corner sequences and exit acceleration, even when those trajectories are not the most locally aggressive line for the first corner alone.

#### Scenario: First corner sacrifices local apex for better second corner
- **WHEN** a corner immediately links into a second corner
- **THEN** the planner SHALL be able to prefer a line that improves the combined sequence rather than maximizing only the first apex

#### Scenario: Straight exit rewards strong corner release
- **WHEN** a corner exits into a meaningful acceleration section
- **THEN** the planner SHALL value exit posture and reachable exit speed strongly enough to prefer a better release line over a poorer-exit local alternative

### Requirement: NPC speed planning SHALL use a path-coupled reachable envelope
The race system SHALL compute NPC target speed from the chosen path using curvature, lateral transition demand, backward braking reachability, and forward acceleration reachability.

#### Scenario: Different lines produce different feasible speeds
- **WHEN** two feasible local lines have different curvature and lateral-transition demand
- **THEN** the planner SHALL be able to produce different speed envelopes for those lines

#### Scenario: Future braking need changes current target speed
- **WHEN** a future section of the chosen line requires deeper braking than the current segment alone suggests
- **THEN** the current target speed SHALL already reflect that future braking need

### Requirement: NPCs SHALL preserve rolling corner flow whenever feasible
The race system SHALL prefer continuous cornering flow and early setup over stop-turn-stop behavior in corners that are physically carryable.

#### Scenario: Medium corner keeps meaningful roll speed
- **WHEN** a medium corner is safely carryable with a rolling line and reachable speed envelope
- **THEN** the NPC SHALL maintain meaningful rolling speed instead of degenerating into an unnecessary near-stop entry

#### Scenario: Genuine heavy corner still brakes hard enough
- **WHEN** a corner genuinely requires large deceleration to stay feasible
- **THEN** the NPC SHALL still brake strongly enough to remain inside the safe track corridor

### Requirement: NPC baseline skill SHALL remain extremely high across the field
The race system SHALL keep NPC cornering competence consistently strong, with only small personality-level differences rather than large competence swings.

#### Scenario: Two NPCs stay similarly strong through the same corner
- **WHEN** two NPCs with slightly different racecraft preferences enter the same cornering situation
- **THEN** both SHALL still choose strong feasible lines and speed plans rather than one degrading into obviously weak low-skill cornering
