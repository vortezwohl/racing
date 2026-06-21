## ADDED Requirements

### Requirement: NPCs SHALL choose a local trajectory from multiple future candidates
The race system SHALL let each NPC evaluate multiple future path candidates over a rolling horizon instead of steering only toward one immediate future point.

#### Scenario: Planner evaluates several lateral futures
- **WHEN** an NPC plans the next section of track
- **THEN** the planner SHALL evaluate multiple future lateral trajectory candidates rather than only one centerline-based target

#### Scenario: Chosen output is a short future trajectory
- **WHEN** the local planning step completes
- **THEN** the result SHALL be a selected local trajectory over future track segments rather than a single isolated steering target

### Requirement: Planning SHALL roll forward repeatedly during the race
The race system SHALL recompute NPC local plans during the race so the chosen trajectory can adapt to changing position, speed, and nearby traffic.

#### Scenario: Replanning responds to moving vehicles
- **WHEN** nearby vehicle positions change while the race is running
- **THEN** the NPC planner SHALL be able to choose a different local trajectory on a later update

#### Scenario: Replanning executes only the leading portion of the plan
- **WHEN** an NPC completes one planning update
- **THEN** the controller SHALL execute only the near-term portion of that plan and then re-evaluate on later updates

### Requirement: Local trajectory scoring SHALL balance progress, smoothness, and track safety
The race system SHALL score local path candidates using progress, smoothness, controllability, and staying on the track instead of choosing only the most direct lateral target.

#### Scenario: Unsafe shortcut is rejected
- **WHEN** a candidate path offers strong short-term progress but creates clearly higher track-loss risk
- **THEN** the planner SHALL be able to reject that candidate in favor of a safer trajectory

#### Scenario: Smooth controllable path is preferred
- **WHEN** two candidate paths offer similar forward progress
- **THEN** the planner SHALL be able to favor the path that requires smoother and more controllable transitions
