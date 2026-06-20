## 1. Draft Boost Retuning

- [x] 1.1 Update race draft configuration values so acceleration bonus becomes `0.5`, maximum speed bonus becomes `0.25`, and draft FOV bonus becomes `8`.
- [x] 1.2 Verify the player camera still reads draft FOV from the shared draft charge path without introducing a second draft state.
- [x] 1.3 Run a local build after the draft parameter change to confirm no TypeScript or bundling regressions.

## 2. Directional Collision Classification

- [x] 2.1 Add a directional collision classification step inside `separateCollidingVehicles()` that distinguishes side impacts from front/back impacts using collision normal versus vehicle forward direction.
- [x] 2.2 Add any small helper calculations or config constants needed to keep the collision-type threshold readable and adjustable.

## 3. Side Collision Response

- [x] 3.1 Preserve the existing collision slowdown debuff path for side collisions.
- [x] 3.2 Modify side-collision separation and velocity loss so faster vehicles displace slower vehicles more strongly and slower vehicles lose more speed.
- [ ] 3.3 Verify side collisions still feel stable when vehicles have similar speed and do not over-launch either vehicle.

## 4. Front/Back Rebound Response

- [x] 4.1 Replace front/back collision slowdown behavior with rebound-only response that skips collision debuff and slowdown scaling.
- [x] 4.2 Implement rebound magnitudes so the front vehicle receives `1.15x` the rebound strength of the rear vehicle.
- [ ] 4.3 Verify front/back collisions no longer produce the old slowdown behavior and instead create visible rebound separation.

## 5. Final Verification

- [x] 5.1 Run `npm run build` after the collision response changes and fix any issues introduced by the new branching logic.
- [ ] 5.2 Manually verify that tail drafting now feels faster through stronger FOV and higher top speed without changing the intended acceleration feel beyond the configured retune.
- [ ] 5.3 Manually verify that side collisions still apply slowdown/debuff while front/back collisions rebound without slowdown.
