## 1. Menu Data and Scene Structure

- [x] 1.1 Create a single `menuVehicles` source of truth that lists every intended selectable vehicle and its menu metadata
- [x] 1.2 Refactor `MenuScene` so selectable vehicle groups are tracked explicitly instead of relying on hard-coded DOM slots
- [x] 1.3 Remove menu-only HTML selection boxes and keep only the minimal page shell needed around the canvas

## 2. Space Background and Title

- [x] 2.1 Add a menu-compatible 3D space background with layered stars and a small set of distant floating space objects
- [x] 2.2 Reuse or extract shared starfield logic from the race scene where it reduces duplication safely
- [x] 2.3 Implement a scene-native 3D or pseudo-3D menu title with a looping pulse-scale animation

## 3. Direct Vehicle Picking and Selection Feedback

- [x] 3.1 Add raycast-based pointer selection so clicking or tapping a ship selects that ship directly
- [x] 3.2 Normalize raycast hits to the correct root vehicle group so child-mesh hits still select the intended ship
- [x] 3.3 Implement in-scene selection feedback with selected-ship scale-up and a small check marker beneath the selected ship
- [x] 3.4 Preserve the existing game launch flow by starting `game.html?speeder=<index>` from the current selected vehicle

## 4. Responsive Presentation and Verification

- [x] 4.1 Recalculate camera framing, title placement, and vehicle spacing on viewport resize using viewport-aware scene parameters
- [x] 4.2 Tune layout behavior for both desktop and narrow-screen presentations so ships remain visible and selectable
- [x] 4.3 Verify the menu build, selection flow, dark-space background visibility, and responsive behavior after the refactor
