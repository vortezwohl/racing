## ADDED Requirements

### Requirement: Vehicle acceleration SHALL follow a nonlinear speed-relative curve
The race system SHALL compute forward acceleration from the vehicle's current speed relative to its effective maximum speed so that low-speed acceleration is stronger and acceleration near effective maximum speed is reduced.

#### Scenario: Low-speed acceleration is stronger than near-limit acceleration
- **WHEN** a vehicle applies full throttle at low speed and later applies full throttle near its effective maximum speed
- **THEN** the acceleration magnitude near effective maximum speed SHALL be lower than the acceleration magnitude at low speed

#### Scenario: Vehicle remains capped by effective maximum speed
- **WHEN** a vehicle accelerates beyond its configured effective maximum speed
- **THEN** the movement system SHALL clamp the vehicle velocity to the effective maximum speed

### Requirement: Draft boost SHALL raise maximum speed while preserving nonlinear acceleration falloff
The race system SHALL keep draft boost capable of increasing a vehicle's effective maximum speed, and SHALL still reduce acceleration as the vehicle approaches that draft-adjusted maximum speed.

#### Scenario: Draft increases effective maximum speed
- **WHEN** a vehicle has positive draft charge
- **THEN** its effective maximum speed SHALL be higher than its base maximum speed according to the configured draft maximum speed bonus

#### Scenario: Draft acceleration falls off near draft maximum speed
- **WHEN** a drafted vehicle approaches its draft-adjusted effective maximum speed
- **THEN** its acceleration SHALL decrease relative to its lower-speed drafted acceleration

### Requirement: Vehicle steering SHALL use nonlinear response over sustained input
The race system SHALL make steering response stronger at the beginning of a continuous steering input and slightly weaker after that steering input has been held.

#### Scenario: Initial steering responds faster than sustained steering
- **WHEN** a vehicle begins steering in one direction and continues holding that same steering direction
- **THEN** the initial steering response SHALL be stronger than the sustained steering response after the configured hold duration

#### Scenario: Steering hold resets when direction changes
- **WHEN** a vehicle switches from steering left to steering right or from steering right to steering left
- **THEN** the steering response SHALL be treated as a new initial steering input

### Requirement: High-speed steering SHALL be damped without disabling control
The race system SHALL reduce steering efficiency at high speed while still allowing vehicles to steer.

#### Scenario: High-speed steering is reduced
- **WHEN** a vehicle applies the same steering input at low speed and high speed
- **THEN** the high-speed steering angle per frame SHALL be lower than the low-speed steering angle per frame

#### Scenario: High-speed vehicle can still turn
- **WHEN** a vehicle applies steering input near maximum speed
- **THEN** the vehicle SHALL still rotate in the requested steering direction
