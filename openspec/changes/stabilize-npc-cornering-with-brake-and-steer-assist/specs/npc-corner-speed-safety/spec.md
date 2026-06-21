## ADDED Requirements

### Requirement: NPCs SHALL reduce speed from immediate corner risk instead of waiting for late corner failure
The race system SHALL derive an immediate corner-risk signal from the current near and mid track preview geometry and SHALL use that signal to reduce NPC target speed before severe understeer has already appeared.

#### Scenario: NPC lifts before a heavy corner
- **WHEN** an NPC approaches a corner whose immediate corner-risk signal is meaningfully higher than a nearby straight or light bend
- **THEN** the NPC controller SHALL reduce target throttle before the vehicle reaches the point of obvious corner failure

#### Scenario: Immediate corner risk outweighs distant average path smoothing
- **WHEN** a tight current corner is followed by a longer gentler section farther ahead
- **THEN** the NPC's current braking decision SHALL still reflect the tighter immediate corner rather than being diluted to the gentler average of the farther preview

### Requirement: NPCs SHALL support earlier pre-braking in medium and heavy corners
The race system SHALL let NPCs apply meaningful pre-braking in medium and heavy corners instead of preserving a high throttle floor until the vehicle is already overshooting the line.

#### Scenario: Medium corner triggers lift and light braking
- **WHEN** an NPC enters a medium-risk corner at race speed
- **THEN** the controller SHALL be able to reduce throttle substantially and apply light braking before large steer error is visible

#### Scenario: Heavy corner triggers stronger braking
- **WHEN** an NPC approaches a high-risk corner while still above the safe target speed for that corner
- **THEN** the controller SHALL increase braking authority relative to a low-risk corner so the NPC can shed speed earlier

### Requirement: NPC-only brake assist SHALL remain bounded and situational
The race system SHALL allow additional NPC braking support in dangerous corners or recovery situations, but SHALL keep that support bounded and inactive or weak on safer sections.

#### Scenario: Brake assist rises with current corner danger
- **WHEN** an NPC transitions from a light bend into a heavy corner
- **THEN** any NPC-specific brake assist SHALL increase as current corner danger rises

#### Scenario: Brake assist stays limited on straights
- **WHEN** an NPC is driving on a straight or a very light bend without recovery pressure
- **THEN** any NPC-specific brake assist SHALL remain absent or materially lower than in a heavy corner
