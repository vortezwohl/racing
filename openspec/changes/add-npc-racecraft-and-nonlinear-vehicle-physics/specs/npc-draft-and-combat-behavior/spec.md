## ADDED Requirements

### Requirement: Draft relationships SHALL identify drafter and source vehicles
The race system SHALL expose draft relationships that identify which vehicle is receiving draft from which source vehicle while preserving existing draft charge behavior.

#### Scenario: Vehicle inside another vehicle trail creates relation
- **WHEN** a vehicle is within the configured draft zone of another vehicle's effective trail
- **THEN** the race system SHALL record a draft relationship containing the drafter vehicle and the source vehicle

#### Scenario: Draft relationship excludes self draft
- **WHEN** a vehicle intersects its own trail area
- **THEN** the race system SHALL NOT create a draft relationship from that vehicle to itself

### Requirement: NPC vehicles SHALL prefer useful draft targets
NPC vehicles SHALL evaluate player and NPC trails as possible draft targets and SHALL bias their lane choice toward useful draft opportunities when doing so does not conflict with higher-priority safety or cornering behavior.

#### Scenario: NPC pursues a reachable draft target
- **WHEN** another vehicle's trail is reachable ahead of an NPC
- **THEN** the NPC SHALL bias its target lane toward that trail to accumulate draft

#### Scenario: NPC can draft from player
- **WHEN** the player's trail is a reachable draft target for an NPC
- **THEN** the NPC SHALL be allowed to select the player's trail as its draft target

### Requirement: NPC vehicles SHALL avoid rear-end collisions unless choosing a bump intent
NPC vehicles SHALL normally avoid colliding with the rear of a front vehicle by slowing or choosing an overtake lane, but SHALL choose a deliberate rear bump in `20%` of qualifying rear-approach opportunities.

#### Scenario: NPC chooses overtake for most rear-approach opportunities
- **WHEN** an NPC rapidly approaches the rear of a front vehicle and a new rear-approach opportunity begins
- **THEN** the NPC SHALL choose an overtake or avoidance intent unless the deliberate bump probability is selected

#### Scenario: NPC sometimes chooses deliberate rear bump
- **WHEN** an NPC rapidly approaches the rear of a front vehicle and the deliberate bump probability is selected
- **THEN** the NPC SHALL hold a bump intent for that opportunity window

#### Scenario: Rear-approach random choice is window-based
- **WHEN** an NPC remains in the same rear-approach opportunity across multiple frames
- **THEN** the NPC SHALL NOT re-roll the deliberate bump probability every frame

### Requirement: NPC vehicles SHALL perform bounded overtakes
NPC vehicles SHALL choose a left or right overtake lane when approaching a slower front vehicle, while keeping the lateral offset within configured race-line bounds.

#### Scenario: NPC chooses an overtake side
- **WHEN** an NPC chooses an overtake intent
- **THEN** it SHALL select a lateral side based on nearby vehicles, lateral cost, and configured lane offset limits

#### Scenario: NPC overtake remains bounded
- **WHEN** an NPC applies an overtake lane offset
- **THEN** the offset SHALL remain within the configured maximum lane offset

### Requirement: NPC vehicles SHALL sometimes apply side pressure while parallel
NPC vehicles SHALL have a `30%` chance to apply short-lived side pressure when driving in parallel with another vehicle, including the player.

#### Scenario: Parallel opportunity can trigger side pressure
- **WHEN** an NPC and another vehicle are parallel within configured longitudinal and lateral thresholds
- **THEN** the NPC SHALL evaluate a side-pressure opportunity with a `30%` base chance

#### Scenario: Side pressure is temporary
- **WHEN** an NPC side-pressure intent is triggered
- **THEN** the intent SHALL expire after a bounded duration

#### Scenario: Side pressure yields to cornering safety
- **WHEN** an NPC side-pressure intent conflicts with severe understeer or path recovery
- **THEN** the NPC SHALL reduce or cancel side pressure in favor of completing the turn

### Requirement: NPC vehicles SHALL sometimes defend when their draft is used
NPC vehicles SHALL have a `40%` chance to defend when another vehicle, including the player, is using their draft and is close enough to threaten an overtake.

#### Scenario: Draft source NPC can trigger block intent
- **WHEN** another vehicle is drafting from an NPC and is close enough to threaten an overtake
- **THEN** the NPC SHALL evaluate a defensive block opportunity with a `40%` base chance

#### Scenario: Defensive block follows challenger side
- **WHEN** an NPC has an active defensive block intent
- **THEN** it SHALL bias its lane offset toward the side where the drafting vehicle is attempting to pass

#### Scenario: Defensive block can induce rear-end pressure
- **WHEN** a drafting vehicle is close behind an NPC with active defensive block intent
- **THEN** the NPC MAY hold its line or close the lane so that the drafting vehicle must slow, overtake, or risk a rear-end collision

### Requirement: NPC tactical decisions SHALL follow deterministic priority ordering
NPC tactical behavior SHALL resolve competing intents through a fixed priority order so that safety, cornering, collision avoidance, defense, side pressure, draft seeking, and normal race-line following do not produce contradictory controls.

#### Scenario: Cornering safety overrides aggression
- **WHEN** an NPC is both in an aggressive tactical intent and in severe understeer risk
- **THEN** the NPC SHALL prioritize throttle reduction, braking, or path recovery over aggression

#### Scenario: Higher-priority intent overrides lower-priority draft seeking
- **WHEN** an NPC is seeking draft but must avoid an imminent rear-end collision
- **THEN** collision avoidance, overtake, or deliberate bump intent SHALL override ordinary draft seeking
