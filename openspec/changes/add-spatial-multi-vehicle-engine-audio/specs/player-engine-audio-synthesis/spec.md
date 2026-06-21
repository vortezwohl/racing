## MODIFIED Requirements

### Requirement: Player engine audio SHALL use a sawtooth-wave synthesis source by default
The race scene SHALL synthesize the player engine audio from a Web Audio oscillator configured as a sawtooth wave by default, while keeping the player engine voice compatible with the project's existing filter, frequency, and smoothing behavior.

#### Scenario: Player race audio starts with sawtooth waveform
- **WHEN** a player vehicle creates its engine audio chain during race scene setup
- **THEN** the base oscillator source used for the player engine SHALL be configured with the `sawtooth` waveform type by default
- **AND** the player engine audio path SHALL continue to use browser-native Web Audio nodes rather than a pre-rendered engine sound file

### Requirement: Player engine pitch SHALL follow a nonlinear speed curve
The player engine oscillator frequency SHALL be driven by the player vehicle speed through a nonlinear positive mapping, where low-speed frequency growth remains slower and high-speed frequency growth becomes faster as the vehicle approaches its effective maximum speed.

#### Scenario: Low-speed pitch growth stays restrained
- **WHEN** the player accelerates from standstill through the lower portion of the speed range
- **THEN** the engine frequency SHALL increase more slowly than a linear speed-to-frequency mapping would increase over the same interval

#### Scenario: High-speed pitch growth becomes more pronounced
- **WHEN** the player accelerates through the upper portion of the speed range toward effective maximum speed
- **THEN** the engine frequency SHALL increase more aggressively than it does in the lower portion of the speed range
- **AND** the resulting pitch contour SHALL preserve a clear sense of end-speed excitement

### Requirement: Player engine tone SHALL use a resonant low-pass filter driven by acceleration
The player engine audio chain SHALL include a low-pass filter with audible but controlled resonance, and the filter cutoff frequency SHALL rise with positive acceleration strength using a mild nonlinear positive mapping.

#### Scenario: Acceleration opens the filter gradually
- **WHEN** the player begins accelerating and positive acceleration strength rises from low to medium values
- **THEN** the low-pass cutoff frequency SHALL increase from a lower base range toward a brighter range
- **AND** the early portion of that increase SHALL stay slightly slower than a linear cutoff response

#### Scenario: Stronger acceleration opens the filter more
- **WHEN** the player applies sustained acceleration and the positive acceleration strength enters the higher portion of its normalized range
- **THEN** the low-pass cutoff frequency SHALL continue rising faster than in the early portion of the curve
- **AND** the filter resonance SHALL remain controlled instead of producing a harsh or piercing tone

### Requirement: Player engine audio SHALL smooth continuous parameter changes
The player engine synthesis chain SHALL smooth real-time updates to frequency and cutoff frequency, so input, speed, and acceleration changes do not create abrupt stepping artifacts or obvious audio clicks.

#### Scenario: Rapid control changes remain sonically smooth
- **WHEN** the player rapidly transitions between throttle, coasting, and braking during live gameplay
- **THEN** the engine pitch and filter cutoff SHALL transition continuously rather than jumping as raw per-frame hard assignments

#### Scenario: Coasting reduces intensity naturally
- **WHEN** the player releases acceleration and vehicle acceleration strength falls back toward zero
- **THEN** the filter cutoff SHALL settle back toward its lower range
- **AND** the engine tone SHALL soften naturally without muting the oscillator abruptly
