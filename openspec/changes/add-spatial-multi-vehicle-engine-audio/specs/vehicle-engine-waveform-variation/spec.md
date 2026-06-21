## ADDED Requirements

### Requirement: Player engine audio SHALL default to a sawtooth base waveform
The race system SHALL use `sawtooth` as the default base waveform for the player's synthesized engine voice.

#### Scenario: Player race vehicle starts with sawtooth base waveform
- **WHEN** the player vehicle initializes its engine synthesis chain for a race
- **THEN** the base oscillator waveform for the player SHALL default to `sawtooth`

### Requirement: NPC engine audio SHALL randomize across the supported waveform set
The race system SHALL assign each NPC a base waveform chosen from the supported set of `sine`, `triangle`, `sawtooth`, and `pulse`, and that choice SHALL remain stable for that NPC during the race session.

#### Scenario: NPC waveform remains stable after assignment
- **WHEN** an NPC vehicle is created at race start
- **THEN** the system SHALL assign exactly one supported base waveform to that NPC
- **AND** the assigned waveform SHALL remain unchanged until the race scene ends or is rebuilt

### Requirement: Pulse waveform SHALL be provided through a custom waveform definition
The race system SHALL implement `pulse` through a custom waveform definition compatible with Web Audio, instead of assuming `pulse` exists as a native oscillator type.

#### Scenario: Pulse waveform uses custom synthesis definition
- **WHEN** the system assigns `pulse` as an NPC base waveform
- **THEN** the engine synthesis chain SHALL create that pulse-like tone through a custom waveform construction path
- **AND** the implementation SHALL NOT rely on a nonexistent native `OscillatorNode.type = \"pulse\"`

### Requirement: Waveform variation SHALL preserve the existing engine modulation model
The race system SHALL keep waveform variation compatible with the existing nonlinear frequency mapping, acceleration-driven filter opening, and smoothing behavior rather than replacing those modulation rules with waveform-specific one-off logic.

#### Scenario: Different waveform still follows shared engine control curve
- **WHEN** two vehicles with different base waveforms accelerate under similar motion conditions
- **THEN** both vehicles SHALL continue to follow the shared nonlinear engine control model
- **AND** their audible difference SHALL primarily come from waveform identity and spatial presentation rather than from a completely different control law
