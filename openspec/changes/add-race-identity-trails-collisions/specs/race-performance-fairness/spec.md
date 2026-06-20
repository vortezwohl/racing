## ADDED Requirements

### Requirement: All vehicles share baseline performance
The race system SHALL use the same baseline acceleration, deceleration, friction, turn rate, roll limit, gravity, and speed ceiling rules for every playable and NPC vehicle.

#### Scenario: Different vehicle models use same baseline performance
- **WHEN** vehicles with different models are instantiated for a race
- **THEN** they use the same baseline movement performance values

#### Scenario: Vehicle volume does not change baseline performance
- **WHEN** vehicles have different hitbox dimensions
- **THEN** those dimensions do not change baseline acceleration, deceleration, friction, turn rate, roll limit, gravity, or speed ceiling rules

### Requirement: Temporary effects do not mutate baseline performance
The race system SHALL apply collision slow and draft boost as temporary runtime effects without permanently changing baseline performance values.

#### Scenario: Draft boost ends at baseline
- **WHEN** a vehicle's draft boost fully decays
- **THEN** the vehicle returns to the shared baseline performance values

#### Scenario: Collision slow ends at baseline
- **WHEN** a vehicle's collision slow expires and no other temporary effect is active
- **THEN** the vehicle returns to the shared baseline performance values

### Requirement: CPU vehicles do not receive random performance advantages
The race system SHALL NOT assign random acceleration, thrust, speed ceiling, turn rate, friction, or other baseline performance advantages to CPU vehicles.

#### Scenario: CPU race startup is performance deterministic
- **WHEN** CPU vehicles are created at race startup
- **THEN** they receive the same baseline performance configuration as the local player's vehicle

#### Scenario: CPU variation is limited to driving behavior
- **WHEN** CPU vehicles need behavioral variation
- **THEN** that variation affects driving decisions or path following behavior rather than baseline performance values
