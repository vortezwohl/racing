## ADDED Requirements

### Requirement: NPC planning SHALL run without blocking the render loop
The race system SHALL execute expensive NPC planning work asynchronously so rendering and vehicle physics do not wait for AI planner completion.

#### Scenario: Render loop continues while planner is busy
- **WHEN** the NPC planner is still computing a new plan batch
- **THEN** the main game update SHALL continue rendering and simulating vehicles using the latest available non-stale plan or a deterministic fallback control

#### Scenario: Worker result is consumed only after completion
- **WHEN** a worker returns a completed plan batch
- **THEN** the main thread SHALL apply it on a later update without awaiting it during the frame that requested planning

### Requirement: NPC planning SHALL use multi-rate scheduling
The NPC AI runtime SHALL schedule control, traffic, and route planning at separate target frequencies appropriate to their complexity.

#### Scenario: Control planning frequency
- **WHEN** a race is running and the planner is healthy
- **THEN** NPC control planning SHALL target at least 45 Hz per active NPC or equivalent batched control updates

#### Scenario: Traffic planning frequency
- **WHEN** a race is running and the planner is healthy
- **THEN** NPC traffic and racecraft planning SHALL target at least 25 Hz for active NPCs

#### Scenario: Route strategy frequency
- **WHEN** a race is running and the planner is healthy
- **THEN** NPC global route strategy planning SHALL target approximately 10 Hz unless the system is over budget

### Requirement: NPC planning SHALL reject stale asynchronous results
The main thread SHALL identify stale or out-of-order planner results and avoid applying them over newer race state.

#### Scenario: Older plan arrives after newer plan
- **WHEN** a plan batch with an older snapshot id arrives after a newer accepted plan
- **THEN** the main thread SHALL discard the older plan batch

#### Scenario: Plan exceeds freshness budget
- **WHEN** a plan for an NPC is older than the configured freshness budget
- **THEN** the NPC SHALL use the newest valid fallback or emergency-safe control instead of applying the stale plan blindly

### Requirement: NPC planning SHALL have bounded runtime budgets
The NPC AI runtime SHALL enforce per-layer time or work budgets so planning remains stable under dense traffic and multiple NPCs.

#### Scenario: Worker falls behind
- **WHEN** the worker receives snapshots faster than it can process them
- **THEN** it SHALL drop obsolete snapshots and continue from the latest snapshot rather than accumulating an unbounded queue

#### Scenario: Candidate budget is reached
- **WHEN** a planning layer reaches its configured candidate or time budget
- **THEN** it SHALL return the best currently available result with budget telemetry instead of continuing unbounded search

### Requirement: NPC planning SHALL expose debug telemetry
The NPC AI runtime SHALL expose enough telemetry to diagnose planner freshness, selected route, traffic intent, assist activation, and budget usage.

#### Scenario: Debug telemetry is requested
- **WHEN** debug mode or planner diagnostics are enabled
- **THEN** each NPC plan SHALL include planner layer ages, route id, racecraft intent, emergency state, assist scalars, and worker budget status
