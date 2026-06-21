## ADDED Requirements

### Requirement: Draft qualification SHALL resolve to a single valid slipstream source per vehicle
The race system SHALL resolve at most one active draft source for a vehicle on each update, even when multiple trail volumes overlap or several valid trail candidates are nearby.

#### Scenario: Multiple overlapping trails remain idempotent
- **WHEN** a vehicle is simultaneously inside the valid trail regions of multiple other vehicles
- **THEN** the race system SHALL resolve only one effective draft source and SHALL apply the same boost state as if only that single source had been hit

#### Scenario: No draft source yields no boost
- **WHEN** a vehicle is not inside any valid draft region
- **THEN** the race system SHALL resolve no active draft source and SHALL not apply draft gain for that update

### Requirement: Draft qualification SHALL reject self-trail and near-source false positives
The race system SHALL reject draft hits that come from the vehicle's own trail history, from trail segments too close to the source vehicle's tail, or from stale trail geometry after a reset or teleport.

#### Scenario: Self-trail is never a valid source
- **WHEN** a vehicle queries draft against available trail histories
- **THEN** its own trail history SHALL never be eligible as a draft source

#### Scenario: Tail exclusion zone blocks near-source fake draft
- **WHEN** a trailing vehicle is geometrically close to another vehicle's trail head but still inside the excluded near-tail distance
- **THEN** the system SHALL reject that hit and SHALL not treat it as valid draft

#### Scenario: Reset clears stale trail influence
- **WHEN** a vehicle is reset, respawned, or teleported to a checkpoint
- **THEN** its previous trail history SHALL no longer be eligible to grant draft to any vehicle

### Requirement: Draft qualification SHALL require source-relative directional validity
The race system SHALL require the drafter to occupy a valid behind-the-source relationship before a trail hit can count as active draft.

#### Scenario: Vehicle beside or ahead of source does not qualify
- **WHEN** a vehicle is close to a source trail but is not located behind that source in source-relative coordinates
- **THEN** the trail hit SHALL be rejected as invalid draft

#### Scenario: Crossed or looping trail does not override direction logic
- **WHEN** track geometry causes historical trail points to pass near another vehicle from the side or front
- **THEN** the system SHALL still require behind-the-source validation before granting draft

### Requirement: Draft gain SHALL remain valuable but no longer over-amplify acceleration and top speed
The race system SHALL keep draft useful for straights and overtakes while reducing its peak acceleration and top-speed amplification relative to the current overtuned state.

#### Scenario: Draft helps but does not instantly explode speed
- **WHEN** a vehicle enters a valid draft region on a straight
- **THEN** its acceleration and top-speed benefit SHALL increase noticeably but SHALL remain bounded enough to avoid unrealistic instant overspeed growth

#### Scenario: Leaving draft sheds advantage quickly
- **WHEN** a vehicle exits a valid draft region
- **THEN** its draft state SHALL decay fast enough that the residual advantage does not linger like a long stacked buff
