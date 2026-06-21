## 1. Immediate Corner Risk Model

- [x] 1.1 Add new `raceNpc` configuration for immediate-corner weighting, future-awareness weighting, earlier braking thresholds, and bounded NPC brake/steer assist scales.
- [x] 1.2 Refactor the current preview interpretation in `NPC` so immediate corner strength is derived mainly from near/mid geometry while far preview remains a separate future-awareness signal.
- [x] 1.3 Rework `cornerLoad` inputs so current corner severity and overspeed pressure contribute more strongly than distant averaged path shape.

## 2. Earlier Braking And NPC Brake Assist

- [x] 2.1 Replace the current high throttle-floor corner planner with earlier lift-off behavior for medium and heavy corners.
- [x] 2.2 Add pre-braking output that can activate from immediate corner risk before obvious understeer appears.
- [x] 2.3 Implement bounded NPC-only brake assist for heavy corners and recovery situations without changing player braking behavior.
- [ ] 2.4 Verify the resulting throttle/brake plan can meaningfully slow NPCs before the corner is already failing.

## 3. NPC Corner Steer Assist And Earlier Recovery

- [x] 3.1 Add bounded NPC-only corner steer assist that scales with immediate corner demand and remains limited on straights or light bends.
- [x] 3.2 Retune recovery entry so overspeed, high immediate corner risk, and near-saturated steering can trigger stabilization earlier.
- [x] 3.3 Update recovery behavior so it coordinates lower throttle, stronger braking support, safer targets, and extra steering support while active.
- [ ] 3.4 Verify NPCs recover earlier instead of waiting until they are already far off the safe line.

## 4. Safe-Line Priority Over Bias And Tactics

- [x] 4.1 Reduce professional corner line bias as current corner risk or overspeed rises, and collapse it further during recovery.
- [x] 4.2 Strengthen tactical gating so draft, overtake, block, and side-pressure lateral offsets fade earlier in risky corners and fully suppress during recovery.
- [x] 4.3 Retune NPC competence parameters so the field remains uniformly strong while prioritizing staying on track over polished aggression.
- [ ] 4.4 Verify safe corner completion consistently outranks aggressive line shaping and racecraft in risky corners.

## 5. Validation And Tuning

- [x] 5.1 Run `npm run build` and resolve any TypeScript or bundling issues introduced by the new corner safety logic.
- [ ] 5.2 Manually verify NPCs lift and brake earlier on medium and heavy corners instead of carrying high throttle into turn-in.
- [ ] 5.3 Manually verify NPCs stay on track more reliably after the shared 15% steering reduction.
- [ ] 5.4 Manually verify NPC-only brake/steer assist feels situational and bounded rather than like a constant all-condition physics cheat.
