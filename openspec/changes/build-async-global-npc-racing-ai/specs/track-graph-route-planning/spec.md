## ADDED Requirements

### Requirement: Track graph SHALL represent branches and merges explicitly
The race system SHALL provide NPC planning with a graph representation of the track containing nodes, edges, branch alternatives, merge points, and edge-local sampled racing data.

#### Scenario: Branching track is loaded
- **WHEN** a track contains two or more route alternatives between nearby split and merge regions
- **THEN** the track graph SHALL represent those alternatives as distinct edges connected through split and merge nodes

#### Scenario: Existing single-path track is loaded
- **WHEN** a track has no branch or merge alternatives
- **THEN** the track graph SHALL still expose a valid route graph with a single primary route cycle

### Requirement: NPC projection SHALL be stable in graph coordinates
NPC route state SHALL use graph coordinates such as `edgeId`, `distanceOnEdge`, and `lateralOffset` instead of relying only on global nearest-point sampling.

#### Scenario: NPC reaches a fork
- **WHEN** an NPC approaches a fork with multiple spatially close branches
- **THEN** its projection SHALL remain on the selected route edge unless a deliberate route transition or valid branch decision occurs

#### Scenario: Nearby branch is spatially closer
- **WHEN** another branch becomes spatially closer but is not the NPC's selected route
- **THEN** the NPC SHALL NOT switch to that branch solely because of nearest-point distance

### Requirement: Route planner SHALL evaluate complete future route options
The NPC route planner SHALL evaluate future route candidates using the full track graph, including branch length, curvature, width, traffic occupancy, draft opportunity, overtake potential, and exit quality.

#### Scenario: Fork has two viable branches
- **WHEN** an NPC approaches a fork with two route candidates
- **THEN** the route planner SHALL score both candidates before the split and commit to one route early enough for stable control

#### Scenario: Branch has heavy traffic
- **WHEN** one branch is shorter but occupied by slower vehicles and another branch is clearer
- **THEN** the route planner SHALL be able to prefer the clearer branch if it yields a better predicted race outcome

### Requirement: Track graph SHALL precompute racing data
The track graph SHALL precompute per-edge data needed for fast planning, including curvature, tangent, lateral, width/corridor, safe speed hints, segment classification, and route distance.

#### Scenario: Planner requests edge data
- **WHEN** a planner layer evaluates a route candidate
- **THEN** it SHALL use cached edge racing data rather than recomputing curvature and corridor information from raw geometry every tick

### Requirement: Route planner SHALL support deterministic race starts
The route planner SHALL provide stable start-phase route and lane guidance so NPCs launch decisively before the first braking or branch decision zone.

#### Scenario: Race starts on a straight
- **WHEN** the race start phase begins and no immediate collision or track-loss risk exists
- **THEN** NPCs SHALL keep a stable launch route and full-throttle-compatible route guidance instead of hesitating due to route ambiguity
