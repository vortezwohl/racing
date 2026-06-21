## ADDED Requirements

### Requirement: NPC planning SHALL use corridor-constrained route state
NPC planning SHALL represent race progress using corridor-aware route state, including current corridor edge, longitudinal progress, lateral position inside the corridor, and active branch or connector commitments.

#### Scenario: NPC approaches a branch
- **WHEN** an NPC nears a legal split region
- **THEN** its route state SHALL commit to a branch early enough for stable control and SHALL preserve that commitment until the legal transition is complete

#### Scenario: NPC enters a legal lane-change connector
- **WHEN** an NPC begins a legal connector transition
- **THEN** its planning state SHALL treat the connector as the active legal route until the transition is completed or safely aborted

### Requirement: Projection SHALL preserve topological continuity
Projection from world position into planner coordinates SHALL prefer the current legal route neighborhood and SHALL NOT jump to unrelated nearby corridors unless a legal graph transition is active.

#### Scenario: Nearby unrelated corridor is spatially closer
- **WHEN** another corridor sample is closer in Euclidean space than the current corridor
- **THEN** projection SHALL remain on the active legal route unless a valid split, merge, or connector transition permits the change

#### Scenario: Recovery begins during branch entry
- **WHEN** an NPC destabilizes while entering a committed branch or connector
- **THEN** projection and recovery SHALL remain tied to that legal route transition instead of snapping toward a generic centerline elsewhere

### Requirement: Control SHALL track corridor-feasible short-horizon trajectories
The high-frequency control layer SHALL follow bounded short-horizon trajectories inside legal corridors rather than steering toward a single target point or offset.

#### Scenario: Branch entry requires lateral movement
- **WHEN** a committed route requires moving from the current corridor center toward a branch or connector
- **THEN** the control planner SHALL generate a smooth feasible lateral entry trajectory instead of a one-frame jump in steering demand

#### Scenario: Candidate trajectory exits legal corridor
- **WHEN** a control candidate leaves the legal corridor or crosses an illegal gap
- **THEN** the control planner SHALL reject that candidate as infeasible

### Requirement: Recovery SHALL return NPCs to the active legal corridor
Recovery behavior SHALL decelerate and steer toward the currently valid corridor or committed connector, not merely toward the nearest generic centerline.

#### Scenario: NPC drifts wide during a legal connector change
- **WHEN** an NPC exceeds its desired lateral envelope while changing corridor through a legal connector
- **THEN** recovery SHALL target the active connector or destination corridor and SHALL NOT redirect the NPC across illegal space

#### Scenario: NPC is outside the legal corridor
- **WHEN** an NPC is projected outside the legal drivable envelope
- **THEN** the planner SHALL cut aggression, apply decisive stabilizing control, and rejoin the nearest valid state on the active legal route
