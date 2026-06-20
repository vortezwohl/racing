## ADDED Requirements

### Requirement: Vehicles have invisible physical hitboxes
The race system SHALL give each active vehicle an invisible hitbox used for vehicle-to-vehicle collision detection.

#### Scenario: Hitbox is invisible during normal race
- **WHEN** the race is running outside debug visualization
- **THEN** vehicle hitboxes are not visible to the player

#### Scenario: Hitbox follows vehicle transform
- **WHEN** a vehicle moves or rotates
- **THEN** its hitbox follows the vehicle position and orientation used by collision logic

### Requirement: Vehicles cannot freely pass through each other
The race system SHALL prevent active vehicles from freely occupying the same physical volume.

#### Scenario: Overlapping vehicles are separated
- **WHEN** two active vehicle hitboxes overlap
- **THEN** the collision system separates the vehicles so they no longer freely pass through each other

### Requirement: Vehicle collisions apply short slow debuff
The race system SHALL apply a short slow debuff to vehicles that collide with another vehicle.

#### Scenario: Collision slows both participants
- **WHEN** two active vehicles collide
- **THEN** both vehicles receive a temporary collision slow effect

#### Scenario: Slow effect expires
- **WHEN** the collision slow duration has elapsed
- **THEN** the affected vehicle returns to its normal non-collision movement behavior unless another effect is active

### Requirement: Faster vehicles push slower vehicles on collision
The race system SHALL bias collision displacement so that a faster vehicle pushes a slower vehicle away from the collision direction.

#### Scenario: Faster vehicle displaces slower vehicle
- **WHEN** a faster vehicle collides with a slower vehicle
- **THEN** the slower vehicle is displaced more strongly away from the faster vehicle's collision direction

#### Scenario: Similar speed vehicles share displacement
- **WHEN** two vehicles collide at similar speeds
- **THEN** the displacement response is shared between the vehicles without one vehicle dominating the response

### Requirement: Trails have no collision hitbox
The race system SHALL NOT include trails in vehicle-to-vehicle physical collision resolution.

#### Scenario: Trail does not trigger collision slow
- **WHEN** a vehicle passes through another vehicle's trail without touching that vehicle's hitbox
- **THEN** no vehicle collision slow is applied because of the trail alone
