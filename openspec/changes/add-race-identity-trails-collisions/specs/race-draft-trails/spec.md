## ADDED Requirements

### Requirement: Vehicles render short TRON-style trails
The race system SHALL render a short TRON-style trail behind each active vehicle.

#### Scenario: Trail appears behind moving vehicle
- **WHEN** a vehicle moves during the race
- **THEN** a visible trail appears behind the vehicle tail
- **AND** the trail color matches that vehicle's identity color

#### Scenario: Trail is not excessively long
- **WHEN** a vehicle reaches high speed
- **THEN** the trail length remains at or below the configured maximum trail length

### Requirement: Trail length scales with speed
The race system SHALL make trail length increase with vehicle speed while applying the same length rules to every vehicle.

#### Scenario: Faster vehicle has longer trail up to limit
- **WHEN** a vehicle moves faster than it did previously
- **THEN** its visible trail length increases toward the configured maximum

#### Scenario: Same speed produces same trail length
- **WHEN** two vehicles move at the same speed
- **THEN** their visible trail lengths are equivalent within the same trail configuration

### Requirement: Trails do not block vehicles
The race system SHALL treat trails as non-blocking visual and draft zones rather than physical hitboxes.

#### Scenario: Vehicle can pass through trail
- **WHEN** a vehicle intersects another vehicle's trail
- **THEN** the trail does not physically block or push the vehicle

### Requirement: Vehicles gain draft boost inside other trails
The race system SHALL let a vehicle accumulate draft boost while it remains inside another vehicle's trail zone.

#### Scenario: Draft charge accumulates while inside trail
- **WHEN** a vehicle remains inside another vehicle's trail zone over time
- **THEN** its draft charge increases up to the configured maximum

#### Scenario: Draft boost improves acceleration and temporary speed ceiling
- **WHEN** a vehicle has accumulated draft charge
- **THEN** its effective acceleration is increased by the draft boost rule
- **AND** its temporary speed ceiling is increased by the draft boost rule

### Requirement: Draft boost decays after leaving trails
The race system SHALL smoothly decay draft boost after a vehicle leaves all other vehicles' trail zones.

#### Scenario: Draft charge decays outside trail
- **WHEN** a vehicle leaves all other vehicles' trail zones
- **THEN** its draft charge gradually decreases toward zero

#### Scenario: Performance returns to baseline after decay
- **WHEN** a vehicle's draft charge has decayed to zero
- **THEN** its effective acceleration and speed ceiling return to the baseline values

### Requirement: Vehicles cannot draft from their own trail
The race system SHALL prevent a vehicle from accumulating draft boost from its own trail.

#### Scenario: Own trail is ignored for draft
- **WHEN** a vehicle intersects its own trail zone
- **THEN** its draft charge does not increase because of that own trail
