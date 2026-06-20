## ADDED Requirements

### Requirement: Player camera FOV responds to speed
The race system SHALL adjust the local player's camera FOV according to the local player's current speed.

#### Scenario: Stationary FOV is narrow
- **WHEN** the local player's vehicle is stationary or near stationary
- **THEN** the camera uses the configured low-speed FOV

#### Scenario: High speed FOV is wider
- **WHEN** the local player's vehicle reaches high speed
- **THEN** the camera FOV increases toward the configured high-speed FOV

### Requirement: FOV changes are smooth
The race system SHALL interpolate FOV changes smoothly over time rather than jumping instantly.

#### Scenario: Speed change does not cause abrupt FOV jump
- **WHEN** the local player's vehicle speed changes sharply
- **THEN** the camera FOV transitions gradually toward the new target FOV

### Requirement: Draft boost can enhance speed FOV
The race system SHALL allow active draft boost to add a limited extra FOV increase for speed sensation.

#### Scenario: Draft boost increases target FOV within limit
- **WHEN** the local player's vehicle has draft charge
- **THEN** the target FOV can increase by the configured draft FOV bonus
- **AND** the final target FOV does not exceed the configured maximum FOV

### Requirement: Dynamic FOV only affects local player camera
The race system SHALL apply dynamic FOV changes only to the local player's active race camera.

#### Scenario: NPC state does not directly update camera FOV
- **WHEN** an NPC changes speed or draft state
- **THEN** the local player's camera FOV is not directly recalculated from that NPC state
