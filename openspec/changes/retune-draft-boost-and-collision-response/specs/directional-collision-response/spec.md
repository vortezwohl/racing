## ADDED Requirements

### Requirement: Vehicle collisions SHALL use directional response modes
The race scene SHALL classify vehicle-to-vehicle collisions into directional response modes so that side impacts and front/back impacts do not share the same slowdown and debuff behavior.

#### Scenario: Collision is classified before response
- **WHEN** two vehicle hitboxes intersect and collision separation is about to be applied
- **THEN** the system SHALL determine whether the impact is a side collision or a front/back collision before applying velocity response

### Requirement: Side collisions SHALL preserve slowdown debuff behavior
When a collision is classified as a side collision, the system SHALL preserve the existing slowdown debuff semantics while allowing faster vehicles to displace slower vehicles more aggressively.

#### Scenario: Side collision between vehicles of similar speed
- **WHEN** two vehicles collide from the side with similar speed
- **THEN** both vehicles SHALL still receive the existing side-collision slowdown and debuff response

#### Scenario: Faster vehicle side-hits slower vehicle
- **WHEN** a faster vehicle collides with a slower vehicle from the side
- **THEN** the slower vehicle SHALL be displaced more strongly and lose more speed than the faster vehicle

### Requirement: Front/back collisions SHALL use rebound instead of slowdown
When a collision is classified as a front or rear impact, the system SHALL NOT apply the existing slowdown debuff and SHALL instead apply a rebound response to both vehicles.

#### Scenario: Vehicles collide front-to-back
- **WHEN** one vehicle impacts another from the front or rear direction
- **THEN** neither vehicle SHALL receive collision slowdown debuff and both vehicles SHALL rebound apart along the collision response direction

#### Scenario: Front vehicle rebounds more than rear vehicle
- **WHEN** a front/back collision rebound is applied
- **THEN** the front vehicle SHALL receive a rebound magnitude equal to `1.15x` the rear vehicle rebound magnitude
