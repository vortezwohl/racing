## ADDED Requirements

### Requirement: NPC racecraft SHALL use global vehicle awareness
NPC traffic planning SHALL use the current positions, velocities, route projections, and relevant states of the player and all NPC vehicles.

#### Scenario: All vehicles are present in snapshot
- **WHEN** the planner receives a race snapshot
- **THEN** it SHALL know the route-relative position and speed of the player and every NPC that is alive or race-relevant

#### Scenario: Distant vehicles are not interaction-critical
- **WHEN** vehicles are far outside the active interaction windows
- **THEN** the planner SHALL preserve them in global summaries while avoiding expensive detailed pairwise planning for them

### Requirement: NPCs SHALL be strong on straights and overtakes
NPC traffic planning SHALL aggressively exploit straights, draft opportunities, and feasible overtake windows while respecting future braking reachability.

#### Scenario: Valid draft opportunity exists
- **WHEN** an NPC can enter a valid slipstream on a straight and still brake for the next corner
- **THEN** the planner SHALL favor a draft pursuit line over a neutral line

#### Scenario: Overtake lane is open
- **WHEN** an NPC closes on a slower vehicle and a side route remains feasible after the pass
- **THEN** the planner SHALL select an overtake intent and provide the control planner with a clear pass-side target

### Requirement: NPCs SHALL attack and defend aggressively
NPC traffic planning SHALL allow blocking, squeezing, line claiming, and exit crowding against both the player and other NPCs when the attacker remains viable.

#### Scenario: NPC is alongside another vehicle
- **WHEN** an NPC is side-by-side with another vehicle and has enough safe corridor for pressure
- **THEN** the planner SHALL be able to select a squeeze or line-claim intent

#### Scenario: NPC is being drafted
- **WHEN** another vehicle is using an NPC's slipstream and a defensive line is feasible
- **THEN** the planner SHALL be able to select a block or defensive weave intent within configured limits

#### Scenario: Player occupies attack window
- **WHEN** the player is in a valid attack window
- **THEN** the NPC planner SHALL consider the player as a valid attack or block target, not only other NPCs

### Requirement: Aggressive racecraft SHALL be gated by attacker survivability
The planner SHALL suppress or reject aggressive actions that would make the attacking NPC leave its safe route corridor or miss a required braking window.

#### Scenario: Squeeze would force attacker off route
- **WHEN** a squeeze candidate pressures another vehicle but pushes the attacker beyond its own feasible route corridor
- **THEN** the planner SHALL reject that candidate

#### Scenario: Overtake compromises next braking zone
- **WHEN** an overtake candidate gains position but cannot brake for the next corner or merge
- **THEN** the planner SHALL reject or downgrade that overtake candidate

### Requirement: NPC traffic planning SHALL remain bounded in complexity
The racecraft layer SHALL use route-relative windows and global summaries so detailed interactions scale with nearby relevant vehicles instead of all vehicles.

#### Scenario: Many vehicles exist
- **WHEN** the race has multiple vehicles but only a subset are near an NPC's active route window
- **THEN** detailed racecraft scoring SHALL be limited to the nearby relevant subset while global summaries remain available
