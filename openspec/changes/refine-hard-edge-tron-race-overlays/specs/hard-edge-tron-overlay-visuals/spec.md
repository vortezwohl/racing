## ADDED Requirements

### Requirement: Race overlays SHALL use hard-edge Tron-style masking
The race system SHALL render both the settings overlay and the results overlay as hard-edge, semi-transparent dark masks with only restrained blue Tron glow, and SHALL NOT rely on large rounded corners or obvious glass-card gradients as the primary visual treatment.

#### Scenario: Settings overlay uses hard-edge Tron panel styling
- **WHEN** the player opens the in-race settings overlay
- **THEN** the overlay is rendered as a dark translucent panel with hard edges or minimal cut edges
- **AND** the visual treatment does not depend on large rounded corners or strong gradient fills

#### Scenario: Results overlay matches the same hard-edge style
- **WHEN** the player views the race results overlay
- **THEN** the results panel uses the same hard-edge translucent style language as settings
- **AND** only subtle blue glow is used to reinforce the Tron tone

### Requirement: Overlay actions SHALL avoid soft iOS capsule styling
The race system SHALL avoid large pill-shaped action surfaces for settings and results overlays when rendering their primary action controls.

#### Scenario: Overlay controls no longer look like rounded capsules
- **WHEN** the player compares actions in settings and results overlays
- **THEN** the controls are rendered using angular or hard-edged shapes
- **AND** the controls no longer resemble large rounded iOS-style capsules
