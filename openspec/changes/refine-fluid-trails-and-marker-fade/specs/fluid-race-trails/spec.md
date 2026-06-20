## ADDED Requirements

### Requirement: Trails render as fluid-like wake
The race system SHALL render vehicle trails as fluid-like wakes rather than thin line-only visuals.

#### Scenario: Trail has visible width and volume
- **WHEN** a vehicle moves during the race
- **THEN** its trail is rendered with visible width and layered glow
- **AND** the trail is not represented only by a single thin line

#### Scenario: Trail keeps vehicle identity color
- **WHEN** a vehicle trail is visible
- **THEN** the trail color family matches that vehicle's identity color

### Requirement: Trails are longer and speed responsive
The race system SHALL render longer trails than the current line trail while keeping trail length speed-responsive and capped.

#### Scenario: High speed trail is long and visible
- **WHEN** a vehicle reaches high speed
- **THEN** its trail extends toward the configured maximum fluid trail length
- **AND** the trail remains clearly visible behind the vehicle

#### Scenario: Low speed trail remains shorter
- **WHEN** a vehicle moves at low speed
- **THEN** its trail remains shorter and less intense than at high speed

#### Scenario: Trail length remains capped
- **WHEN** a vehicle remains at high speed
- **THEN** its trail length does not exceed the configured maximum fluid trail length

### Requirement: Trails have layered core and glow
The race system SHALL render fluid trails with at least a bright core layer and a softer outer glow layer.

#### Scenario: Layered trail is visible
- **WHEN** a trail is visible
- **THEN** the trail includes a brighter inner region
- **AND** the trail includes a softer translucent outer region

### Requirement: Trail visual disturbance does not change draft logic
The race system SHALL keep visual trail disturbance separate from gameplay draft detection.

#### Scenario: Disturbed visual does not move draft zone
- **WHEN** visual wobble or glow offsets are applied to a trail
- **THEN** draft detection still uses the underlying vehicle trail sample path

### Requirement: Fluid trails remain non-blocking
The race system SHALL keep fluid trails non-blocking and excluded from physical collision resolution.

#### Scenario: Vehicle passes through fluid trail
- **WHEN** a vehicle intersects another vehicle's fluid trail visual
- **THEN** the trail visual does not physically block or push the vehicle
- **AND** the trail visual alone does not trigger collision slow
