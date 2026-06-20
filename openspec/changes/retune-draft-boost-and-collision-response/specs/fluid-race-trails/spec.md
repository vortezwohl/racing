## MODIFIED Requirements

### Requirement: Race trails SHALL render as visible fluid wake volumes
The race scene SHALL render each race participant's trail as a visible fluid-like wake with strong volume presence, identity-colored glow, and speed-driven longitudinal growth. The trail SHALL be rendered as a clustered volume particle wake rather than a ribbon-dominant strip, and SHALL remain visually obvious without requiring high brightness. While a vehicle is accumulating trail draft charge, the gameplay boost SHALL use a draft acceleration bonus of `0.5`, a draft maximum speed bonus of `0.25`, and a draft FOV bonus of `8`.

#### Scenario: Trail appears once vehicle gains speed
- **WHEN** a race vehicle exceeds the configured minimum trail display speed
- **THEN** an identity-colored fluid wake becomes visible behind the vehicle along its tail path

#### Scenario: Faster vehicles leave longer wakes
- **WHEN** a race vehicle travels faster than another vehicle under the same trail rules
- **THEN** its visible fluid wake extends farther, up to the configured maximum trail length

#### Scenario: Trail remains visually readable without over-bright bloom
- **WHEN** the trail is rendered in the race scene
- **THEN** its silhouette is primarily defined by cluster shape and volume layering rather than extreme glow intensity

#### Scenario: Draft charge gives stronger speed sensation
- **WHEN** the player accumulates trail draft charge while following another vehicle's wake
- **THEN** the player SHALL receive the configured acceleration, max-speed, and FOV bonuses associated with trail draft
