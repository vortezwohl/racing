## ADDED Requirements

### Requirement: Track graph SHALL represent legal drivable corridors
The race system SHALL model each NPC-plannable track segment as a legal drivable corridor with center samples, drivable width, and left/right boundaries instead of relying only on a centerline and heuristic nearest-point behavior.

#### Scenario: Corridor edge is requested for planning
- **WHEN** the NPC planner evaluates a track edge
- **THEN** the graph SHALL provide center samples, corridor width or boundaries, tangent, curvature, and safe-speed-related data for that edge

#### Scenario: Parallel lanes exist
- **WHEN** two nearby routes are both part of the intended track system
- **THEN** the graph SHALL represent them as distinct drivable corridors rather than collapsing them into a single nearest-point path

### Requirement: Track graph SHALL encode legal split, merge, and lane-change connectivity
The track graph SHALL distinguish normal forward progression from split/merge transitions and legal lateral connector transitions between nearby corridors.

#### Scenario: Track contains a fork
- **WHEN** a track has two legal route alternatives through a split region
- **THEN** the graph SHALL expose those alternatives as distinct forward corridor choices connected through a split node

#### Scenario: Track contains a legal small-gap crossover
- **WHEN** two nearby corridors may legally be crossed between by design or validated inference
- **THEN** the graph SHALL expose that movement as a legal connector transition instead of requiring the planner to invent an off-graph shortcut

### Requirement: Track graph SHALL reject illegal shortcut space as non-drivable
The graph SHALL distinguish legal race surface from nearby non-track or non-drivable gaps so the planner cannot treat empty space as a valid shortcut merely because it is geometrically short.

#### Scenario: Empty gap lies between two unrelated corridors
- **WHEN** a shorter Euclidean path crosses space that is not marked as a legal corridor or connector
- **THEN** that path SHALL be treated as infeasible for NPC planning

#### Scenario: Unrelated nearby edge is spatially closer
- **WHEN** an unrelated corridor sample is closer in world space than the current route corridor
- **THEN** the graph SHALL still identify the unrelated corridor as illegal to enter unless a legal graph connection exists
