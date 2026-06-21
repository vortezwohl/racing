## ADDED Requirements

### Requirement: NPC steering SHALL combine preview anticipation with local correction
The race system SHALL compute NPC steering from both immediate track-following error and longer-range preview information so that NPCs begin turning before reactive error grows too large.

#### Scenario: NPC uses local and future steering cues
- **WHEN** an NPC computes steering for an approaching corner
- **THEN** the steering target SHALL blend immediate path-following correction with future preview-based anticipation

#### Scenario: NPC begins corner entry before severe path error
- **WHEN** an NPC approaches a visible future corner while still close to the current line
- **THEN** the NPC SHALL begin steering for the corner before the immediate path-following error reaches its severe correction threshold

### Requirement: NPC speed planning SHALL be proactive for corners
The race system SHALL choose NPC throttle and brake using previewed corner load instead of relying mainly on late reactive understeer reduction.

#### Scenario: NPC lifts before entering a stronger corner
- **WHEN** previewed corner load rises ahead of the NPC
- **THEN** the NPC SHALL reduce target throttle or prepare braking before the turn is already failing

#### Scenario: Stronger corners require lower target speed
- **WHEN** the NPC compares a shallow bend and a tighter bend at similar entry speed
- **THEN** the tighter bend SHALL result in a lower target speed scale than the shallow bend

### Requirement: NPC line choice SHALL include a professional cornering bias
The race system SHALL bias NPC target positioning toward a professional cornering line rather than following only the track centerline.

#### Scenario: NPC adjusts line through a corner
- **WHEN** an NPC enters and traverses a meaningful corner
- **THEN** its target path SHALL shift with a bounded cornering bias instead of remaining locked to the centerline alone

#### Scenario: Cornering bias remains bounded
- **WHEN** the NPC applies a professional cornering bias
- **THEN** the resulting lateral target SHALL remain within configured safe offset bounds for the track-following system

### Requirement: NPC recovery SHALL remain available as a safety fallback
The race system SHALL retain recovery behavior for oversteer, understeer, and saturation cases even after proactive cornering control is introduced.

#### Scenario: Recovery overrides failing corner attempt
- **WHEN** an NPC continues to accumulate severe steering error or saturated steering despite proactive corner preparation
- **THEN** the recovery behavior SHALL take control and prioritize finishing the corner safely
