## ADDED Requirements

### Requirement: NPCs SHALL change lane only through legal connectors
NPC lateral transitions between nearby corridors SHALL occur only through explicit or inferred legal connector regions that belong to the track system.

#### Scenario: Legal connector is available
- **WHEN** an NPC needs to move from one corridor to a nearby parallel corridor
- **THEN** the planner SHALL use a legal connector transition instead of crossing arbitrary space between them

#### Scenario: No legal connector exists
- **WHEN** two nearby corridors are separated by non-drivable or unconnected space
- **THEN** the planner SHALL reject lane changes between them as infeasible

### Requirement: Legal connectors SHALL support tactical racing behavior
Legal connector transitions SHALL be available to the tactical planner for overtaking, blocking, drafting, squeezing, and shorter valid route selection when survivability remains acceptable.

#### Scenario: NPC sees a faster legal crossover attack
- **WHEN** an NPC identifies a legal connector that improves its pass, block, or route outcome
- **THEN** the tactical planner SHALL be allowed to choose that connector as part of the active plan

#### Scenario: Connector change would break braking viability
- **WHEN** a legal connector exists but using it would cause the NPC to miss a required braking or merge window
- **THEN** the planner SHALL reject or downgrade that connector transition

### Requirement: Illegal cross-gap shortcuts SHALL remain forbidden even during aggression
Aggressive racecraft SHALL NOT authorize NPCs to cross non-drivable space outside legal connectors, even if that move would reduce route length or produce contact pressure.

#### Scenario: Attack line crosses illegal gap
- **WHEN** an attack, squeeze, or shortcut candidate leaves the legal corridor and does not follow a connector edge
- **THEN** the planner SHALL mark that candidate infeasible

#### Scenario: Shortest Euclidean route is illegal
- **WHEN** the shortest world-space line to a target corridor crosses non-track space
- **THEN** the planner SHALL prefer a longer legal connector route over the illegal shortcut
