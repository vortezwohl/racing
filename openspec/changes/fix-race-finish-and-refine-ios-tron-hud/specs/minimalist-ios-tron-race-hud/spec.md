## ADDED Requirements

### Requirement: Race HUD SHALL use a minimalist iOS-inspired visual style
The race HUD SHALL present race information with a lightweight, modern visual language inspired by iPhone / iOS UI, while preserving only a restrained amount of Tron-style blue glow.

#### Scenario: Top HUD prioritizes typography over framed panels
- **WHEN** the player is in an active race session
- **THEN** the top-left lap and position, top-center timer, and top-right speed display are rendered primarily as lightweight typography
- **AND** the HUD MUST NOT rely on large heavy bordered boxes as the dominant visual treatment

#### Scenario: HUD typography remains compact and readable
- **WHEN** the HUD is visible during gameplay
- **THEN** primary race text uses smaller, lighter white typography
- **AND** any blue glow or highlight remains subtle enough that the information still reads clearly over the track background

### Requirement: Race HUD SHALL preserve the requested information layout
The race HUD SHALL continue to keep lap and position at the top-left, timer at the top-center, and speed at the top-right after the visual refinement.

#### Scenario: Minimal redesign keeps semantic layout
- **WHEN** the refined HUD is rendered in race
- **THEN** lap and position remain grouped at the top-left
- **AND** timer remains centered at the top
- **AND** speed remains grouped at the top-right
