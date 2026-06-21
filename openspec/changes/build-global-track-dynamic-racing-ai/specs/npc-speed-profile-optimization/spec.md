## ADDED Requirements

### Requirement: NPC speed planning SHALL be solved along the chosen local path
The race system SHALL compute NPC target speed from the selected local future trajectory rather than from local steering error alone.

#### Scenario: Different paths produce different speed plans
- **WHEN** two candidate local paths have different curvature or lateral demands
- **THEN** the resulting target speed plan SHALL be allowed to differ between those paths

#### Scenario: Path and speed remain coupled
- **WHEN** the planner selects a local trajectory
- **THEN** the corresponding speed plan SHALL reflect the geometry and control demand of that selected trajectory

### Requirement: NPCs SHALL use a fastest-feasible future speed envelope
The race system SHALL derive a feasible future speed profile that respects shared acceleration, braking, and turning constraints instead of waiting for late-corner failure to trigger braking.

#### Scenario: Braking starts before corner failure
- **WHEN** the future path requires a lower speed than the current state can safely carry
- **THEN** the NPC SHALL begin reducing speed before the corner is already failing

#### Scenario: Exit acceleration follows planned path feasibility
- **WHEN** the future path opens up after a corner
- **THEN** the NPC speed plan SHALL allow acceleration to resume according to the feasible future envelope

### Requirement: Control output SHALL avoid stop-turn-stop corner behavior
The race system SHALL generate throttle and brake outputs that preserve continuous cornering flow where feasible instead of degenerating into repeated near-stop corner entries.

#### Scenario: Medium corner keeps rolling speed
- **WHEN** an NPC enters a medium corner that can be safely carried with rolling speed
- **THEN** the control plan SHALL prefer a continuous rolling corner entry over an unnecessary near-stop slowdown

#### Scenario: Heavy corner still uses meaningful deceleration
- **WHEN** an NPC approaches a genuinely heavy corner
- **THEN** the control plan SHALL still be able to decelerate strongly enough to remain on track
