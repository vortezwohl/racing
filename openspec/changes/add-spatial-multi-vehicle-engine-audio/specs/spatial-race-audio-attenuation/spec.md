## ADDED Requirements

### Requirement: Vehicle engine audio SHALL attenuate with distance
The race system SHALL reduce non-local engine audio continuously as vehicle distance from the player increases, using a smooth physically inspired attenuation curve rather than an abrupt on/off range gate.

#### Scenario: Farther vehicle sounds quieter
- **WHEN** two otherwise similar non-local vehicles are positioned at different distances from the player
- **THEN** the farther vehicle SHALL play at a lower engine loudness than the nearer vehicle

### Requirement: Vehicle engine audio SHALL reflect front-versus-rear position
The race system SHALL differentiate whether a non-local vehicle is in front of or behind the player, so front-positioned vehicles sound more direct while rear-positioned vehicles sound somewhat softer and less bright.

#### Scenario: Rear vehicle sounds less direct than front vehicle
- **WHEN** one non-local vehicle is in front of the player and another comparable non-local vehicle is behind the player at a similar distance
- **THEN** the front vehicle SHALL preserve a more direct engine presentation
- **AND** the rear vehicle SHALL play with reduced directness through lower effective loudness, lower apparent brightness, or both

### Requirement: Vehicle engine audio SHALL pan with lateral position
The race system SHALL place non-local engine audio left or right in the stereo image according to the vehicle's lateral offset relative to the player's current listening orientation.

#### Scenario: Left-side vehicle pans left
- **WHEN** a non-local vehicle is positioned to the player's left side
- **THEN** that vehicle's engine audio SHALL pan toward the left stereo channel

#### Scenario: Right-side vehicle pans right
- **WHEN** a non-local vehicle is positioned to the player's right side
- **THEN** that vehicle's engine audio SHALL pan toward the right stereo channel
