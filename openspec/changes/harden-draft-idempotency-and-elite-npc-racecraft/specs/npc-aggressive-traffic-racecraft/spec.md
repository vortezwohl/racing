## ADDED Requirements

### Requirement: NPCs SHALL pursue elite straight-line draft and overtake opportunities
The race system SHALL let NPCs strongly prefer high-value draft and overtake paths on straights when those opportunities remain feasible for the next braking zone and corner setup.

#### Scenario: Straight draft path is selected over neutral line
- **WHEN** a feasible local path can safely enter a strong draft position on a straight
- **THEN** the planner SHALL be able to favor that path over a neutral line without draft value

#### Scenario: Overtake window requires braking feasibility after the pass
- **WHEN** an NPC considers a straight-line overtake before the next braking zone
- **THEN** the planner SHALL require that the post-pass line still remains reachable for the upcoming braking and corner entry

### Requirement: NPCs SHALL avoid unnecessary contact through corners while racing closely
The race system SHALL make NPCs traffic-aware enough to preserve a viable line through corners, including side-by-side situations, without choosing avoidable contact when a feasible non-contact alternative exists.

#### Scenario: Side-by-side corner entry respects space limits
- **WHEN** an NPC enters a corner beside another vehicle and one side has insufficient escape space
- **THEN** the planner SHALL account for that space constraint and avoid selecting a line that forces avoidable self-destructive contact

#### Scenario: Claimed apex changes outer-car behavior
- **WHEN** another vehicle has already established the inside line into an apex
- **THEN** the outer-line NPC SHALL be able to choose a viable alternative such as a later cut-back or lift rather than blindly driving into overlap

### Requirement: NPCs SHALL use aggressive actions only within safe attack windows
The race system SHALL allow NPCs to squeeze, claim line, block, or crowd rivals only when those actions preserve the attacker's own corridor and braking feasibility.

#### Scenario: Safe squeeze is allowed
- **WHEN** an NPC is alongside another vehicle in a straight or light-to-medium corner and still has a feasible attacking corridor
- **THEN** the planner SHALL be able to reward a squeezing or line-claim trajectory against that rival

#### Scenario: Unsafe attack is rejected
- **WHEN** an aggressive path would likely force the attacking NPC outside its own feasible corridor or braking envelope
- **THEN** the planner SHALL reject that aggressive option even if it pressures the rival

### Requirement: NPC aggression SHALL target both player and NPC vehicles consistently
The race system SHALL evaluate attack, block, crowding, and avoidance behavior consistently against all nearby vehicles, including the player and other NPCs.

#### Scenario: Player can be pressured like an NPC
- **WHEN** the player occupies a valid aggressive racecraft window
- **THEN** the planner SHALL be able to choose a feasible attack-oriented path against the player just as it would against another NPC

#### Scenario: NPC field still attacks each other
- **WHEN** two NPCs race in a valid aggressive interaction window
- **THEN** the planner SHALL still permit pressure, squeeze, or block behavior between NPCs instead of reserving aggression only for the player
