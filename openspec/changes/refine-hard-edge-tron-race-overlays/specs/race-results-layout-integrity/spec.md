## ADDED Requirements

### Requirement: Results overlay SHALL preserve non-overlapping content regions
The race system SHALL render the results overlay using explicit content regions for summary, lap splits, leaderboard, and bottom actions so headings, metrics, and leaderboard rows do not overlap each other.

#### Scenario: Summary and lap split labels do not collide
- **WHEN** the player opens the results overlay after a race
- **THEN** `SUMMARY`, `LAP SPLITS`, and their metric rows occupy distinct vertical space
- **AND** the lap split section does not overlap the leaderboard heading or rows

#### Scenario: Leaderboard status and time remain inside each row
- **WHEN** the leaderboard contains finished and still-racing participants
- **THEN** each row keeps its status text and time text within that row's own layout bounds
- **AND** no finished time text collides with neighboring rows or other summary content

### Requirement: Results overlay SHALL remain readable across supported race viewports
The race system SHALL adapt row spacing and region heights so the results overlay remains readable without text collisions on both standard desktop and narrower race viewports.

#### Scenario: Narrower viewport still avoids overlap
- **WHEN** the results overlay is rendered on a narrower race viewport
- **THEN** row height, spacing, or region sizing adapt to prevent content overlap
- **AND** the leaderboard remains readable without stacked text collisions
