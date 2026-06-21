## ADDED Requirements

### Requirement: NPC planning SHALL reject infeasible trajectories before scoring
The race system SHALL discard candidate NPC trajectories that cannot remain inside the safe corridor, cannot satisfy control-demand limits, or cannot meet future braking reachability, instead of merely penalizing them and leaving them eligible.

#### Scenario: Corridor-breaking trajectory is discarded
- **WHEN** a candidate local trajectory leaves the configured safe track corridor at any future planning sample
- **THEN** the planner SHALL reject that candidate before racecraft or progress scoring

#### Scenario: Unbrakeable trajectory is discarded
- **WHEN** a candidate local trajectory requires the vehicle to enter a future corner faster than the reachable braking envelope allows
- **THEN** the planner SHALL reject that candidate before final selection

### Requirement: NPC planning SHALL enforce track-retention-first behavior
The race system SHALL prioritize staying on the course above draft, overtake, attack, or defense rewards whenever those goals conflict.

#### Scenario: Fast but unsafe candidate loses to slower safe candidate
- **WHEN** one candidate offers more short-term progress but creates materially higher track-loss risk than another feasible candidate
- **THEN** the planner SHALL choose the feasible safer candidate instead of the locally faster unsafe one

#### Scenario: Recovery suppresses tactical aggression
- **WHEN** an NPC enters a recovery-oriented state
- **THEN** track retention and stable rejoin behavior SHALL dominate tactical racecraft preferences

### Requirement: Guardian supervision SHALL intervene before full track-loss develops
The race system SHALL activate an earlier supervisory recovery mode when corridor usage, overspeed, instability, or projected edge-loss indicates the nominal plan is no longer robust.

#### Scenario: Guardian activates on dangerous overspeed
- **WHEN** the current vehicle speed materially exceeds the reachable future safe speed for the active planning horizon
- **THEN** Guardian SHALL tighten the planning envelope and raise braking priority before the vehicle has already left the track

#### Scenario: Guardian recenters an edge-running vehicle
- **WHEN** an NPC runs too close to the edge of the safe corridor
- **THEN** Guardian SHALL bias planning toward a more central stable rejoin line and restrict aggressive path options

### Requirement: NPC track-loss performance SHALL remain near-zero in normal racing conditions
The race system SHALL keep NPC track departures extremely rare during normal race flow, including heavy cornering, slipstream approach, and side-by-side traffic, except for extraordinary disturbance cases such as severe collisions or abnormal platform interactions.

#### Scenario: Heavy corner with traffic still remains on track
- **WHEN** an NPC approaches a demanding corner while near other vehicles
- **THEN** the selected plan SHALL still satisfy corridor and braking feasibility rather than choosing a line that is likely to leave the track

#### Scenario: Slipstream approach into braking zone remains recoverable
- **WHEN** an NPC gains speed in a draft before a braking zone
- **THEN** the planner SHALL still select a reachable braking plan instead of carrying an infeasible entry speed into the corner
