## ADDED Requirements

### Requirement: NPCs SHALL support explicit assist scalars
NPC control execution SHALL support explicit NPC-only assist scalars for braking, steering, grip, draft exploitation, recovery, and racecraft decision strength.

#### Scenario: NPC control plan includes assists
- **WHEN** an NPC control plan is applied
- **THEN** NPC-only assist scalars SHALL modify NPC execution without changing player control behavior

#### Scenario: Assist values are disabled
- **WHEN** assist scalars are configured to neutral values
- **THEN** NPC control execution SHALL remain compatible with the shared vehicle control model

### Requirement: NPC brake assist SHALL improve corner entry and emergency recovery
NPC brake assist SHALL allow NPCs to brake harder or earlier than baseline player controls when the planner requires corner entry control or track-loss prevention.

#### Scenario: Heavy corner approaches
- **WHEN** an NPC approaches a heavy corner at high speed
- **THEN** brake assist SHALL allow the NPC to meet the planned speed envelope more reliably than baseline braking alone

#### Scenario: Emergency track retention activates
- **WHEN** an NPC is projected to leave the safe corridor
- **THEN** recovery or brake assist SHALL support decisive deceleration and rejoin control

### Requirement: NPC steering and grip assists SHALL improve fast stable cornering
NPC steering and grip assists SHALL help NPCs hold precise racing lines through corners without destabilizing or leaving the route corridor.

#### Scenario: NPC takes a high-speed corner
- **WHEN** an NPC follows a feasible high-speed cornering line
- **THEN** steering and grip assists SHALL improve line tracking while keeping the vehicle inside the safe route corridor

### Requirement: NPC draft assist SHALL strengthen straight-line race pace
NPC draft assist SHALL let NPCs exploit valid slipstream opportunities more effectively while preserving draft idempotency and future braking feasibility.

#### Scenario: NPC enters valid slipstream
- **WHEN** an NPC enters one or more valid slipstream regions
- **THEN** draft assist SHALL improve pursuit or overtake execution without stacking multiple simultaneous draft sources

### Requirement: NPC assists SHALL be tunable and observable
NPC assist behavior SHALL be controlled by configuration and exposed through debug telemetry.

#### Scenario: Debug telemetry is enabled
- **WHEN** an NPC uses an assist during a plan
- **THEN** debug telemetry SHALL identify which assist category activated and the scalar applied

#### Scenario: Tuning changes assist config
- **WHEN** assist configuration values are changed
- **THEN** NPC behavior SHALL adjust without requiring changes to player physics constants
