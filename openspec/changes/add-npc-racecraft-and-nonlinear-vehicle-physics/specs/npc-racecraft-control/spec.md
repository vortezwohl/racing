## ADDED Requirements

### Requirement: NPC vehicles SHALL use input-driven movement
NPC vehicles SHALL drive through throttle, brake, and steering controls that feed the shared vehicle movement rules, rather than directly overwriting direction or velocity from track path vectors.

#### Scenario: NPC update computes controls before movement
- **WHEN** an NPC updates during an active race
- **THEN** it SHALL compute throttle, brake, and steering intent before applying shared vehicle movement

#### Scenario: NPC does not directly snap to path direction
- **WHEN** an NPC follows a curved path segment
- **THEN** it SHALL steer toward a target direction through bounded steering input instead of directly replacing its direction with the track path vector

### Requirement: NPC start boost SHALL be temporary and acceleration-only
NPC vehicles SHALL receive an acceleration multiplier of `1.75x` during the first two seconds after the race becomes active, and SHALL lose that multiplier after the duration expires.

#### Scenario: NPC has start boost during first two active race seconds
- **WHEN** less than two seconds have elapsed since vehicles began racing
- **THEN** NPC acceleration input SHALL be multiplied by `1.75`

#### Scenario: NPC start boost expires
- **WHEN** at least two seconds have elapsed since vehicles began racing
- **THEN** NPC acceleration input SHALL use the same base acceleration scale as the player

#### Scenario: NPC start boost does not change non-acceleration parameters
- **WHEN** NPC start boost is active
- **THEN** NPC maximum speed, steering rate, friction, collision response, and draft bonus parameters SHALL remain equal to normal vehicle parameters

### Requirement: NPC vehicles SHALL use per-race skill profiles with small variance
Each NPC SHALL receive a per-race skill profile with small variance that affects cornering behavior, steering noise, recovery, draft preference, and aggression without changing base vehicle performance.

#### Scenario: NPC skill profile is stable during a race
- **WHEN** an NPC skill profile is generated for a race session
- **THEN** that profile SHALL remain stable for the duration of that race session

#### Scenario: NPC skill does not alter base performance
- **WHEN** NPC skill profiles differ between NPC vehicles
- **THEN** their base acceleration, maximum speed, friction, and steering rate SHALL remain governed by the shared vehicle configuration

### Requirement: NPC vehicles SHALL steer toward look-ahead path targets
NPC vehicles SHALL select a look-ahead target on the race path, optionally offset by tactical lane choice, and SHALL steer toward that target through signed steering error.

#### Scenario: NPC selects a forward path target
- **WHEN** an NPC computes race-line steering
- **THEN** it SHALL choose a target point ahead of its current path position based on speed and configured look-ahead distance

#### Scenario: NPC steering is based on signed angle error
- **WHEN** an NPC has a target point ahead of it
- **THEN** it SHALL compute a signed steering error between its current direction and the target direction

### Requirement: NPC cornering SHALL include noise, recovery, and speed management
NPC vehicles SHALL add light steering noise, smooth steering changes, recover from oversteer, and reduce throttle or brake when steering error indicates understeer risk.

#### Scenario: NPC steering includes light noise
- **WHEN** an NPC computes steering intent
- **THEN** it SHALL add a small skill-profile-driven steering noise within configured limits

#### Scenario: NPC smooths steering changes
- **WHEN** an NPC steering target changes from one frame to the next
- **THEN** the applied steering input SHALL move toward the target smoothly instead of snapping instantly

#### Scenario: NPC slows for turn-in understeer
- **WHEN** an NPC steering error is above the configured understeer threshold while speed is high
- **THEN** the NPC SHALL reduce throttle or apply brake to help complete the turn

#### Scenario: NPC recovers from oversteer
- **WHEN** an NPC steering input overshoots the target direction
- **THEN** the NPC SHALL reduce or reverse steering input to return toward the target direction
