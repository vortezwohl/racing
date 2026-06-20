## 1. Carousel Interaction

- [x] 1.1 Refactor `MenuScene` from direct ship picking to a single-featured-vehicle carousel model
- [x] 1.2 Add scene-native left and right arrow controls with click-triggered scale feedback and no idle breathing animation
- [x] 1.3 Keep keyboard left/right navigation aligned with the new carousel order and preserve confirm-to-start behavior

## 2. Vehicle Presentation

- [x] 2.1 Remove pedestal, plate, and checkmark selection chrome from the menu vehicle presentation
- [x] 2.2 Introduce menu-specific vehicle presentation scaling so every selectable vehicle appears visually consistent in size
- [x] 2.3 Update vehicle label placement for the single-featured-vehicle layout on both desktop and narrow screens

## 3. Visual Tone

- [x] 3.1 Rework menu text sprite styling so the title and labels use a lower-glare, non-glowing treatment
- [x] 3.2 Align the menu starfield rendering with the geometric wireframe style used by `GameScene`
- [x] 3.3 Retune menu layout and camera framing so the carousel, arrows, labels, and confirm button remain balanced across viewport sizes

## 4. Verification

- [x] 4.1 Verify the webpack build after the carousel refactor
- [x] 4.2 Verify arrow navigation, confirm launch mapping, and current-vehicle display behavior in the browser
- [x] 4.3 Verify desktop and narrow-screen menu presentation for readable text, visible geometric stars, and consistent vehicle scale
