import * as THREE from "three";
import { Checkpoint, VehicleData } from "../utils/interfaces";
import { raceNpc } from "../utils/raceConfig";
import Vehicle from "./Vehicle";
import Track from "./Track";

type NpcSkillProfile = {
    aggression: number;
    cornerConfidence: number;
    draftPreference: number;
    skill: number;
    steerNoise: number;
    steerRecovery: number;
};

type NpcRaceContext = {
    draftRelations?: Array<{
        distanceToTrail: number;
        drafterId: string;
        nearestTrailPoint: THREE.Vector3;
        sourceId: string;
    }>;
    raceRunningMs: number;
    selfId?: string;
    vehicleStates?: Array<{
        id: string;
        isLocalPlayer: boolean;
        vehicle: Vehicle;
    }>;
};

type NpcTimedIntent = {
    mode: "block" | "bump" | "overtake" | "side-pressure";
    offset: number;
    targetId?: string;
    untilMs: number;
};

const randomRange = (min: number, max: number): number =>
    min + Math.random() * (max - min);

export default class NPC extends Vehicle {
    currentLaneOffset: number;
    defensiveIntent?: NpcTimedIntent;
    pathPointIndex: number;
    previousSteer: number;
    previousSteerError: number;
    profile: NpcSkillProfile;
    rearApproachIntent?: NpcTimedIntent;
    sidePressureIntent?: NpcTimedIntent;
    steeringNoisePhase: number;
    
    constructor(scene: THREE.Scene, vehicleData: VehicleData, 
        position: THREE.Vector3, direction: THREE.Vector3,
        rotation: THREE.Euler, checkpoint: Checkpoint, debug?: boolean) {

        super(scene, vehicleData, position, direction, 
            rotation, checkpoint, debug);
        this.currentLaneOffset = 0;
        this.pathPointIndex = 0;
        this.previousSteer = 0;
        this.previousSteerError = 0;
        this.profile = this.createSkillProfile();
        this.steeringNoisePhase = Math.random() * Math.PI * 2;
    }

    createSkillProfile(): NpcSkillProfile {
        return {
            aggression: randomRange(raceNpc.aggressionMin, raceNpc.aggressionMax),
            cornerConfidence: randomRange(
                raceNpc.cornerConfidenceMin,
                raceNpc.cornerConfidenceMax,
            ),
            draftPreference: randomRange(
                raceNpc.draftPreferenceMin,
                raceNpc.draftPreferenceMax,
            ),
            skill: randomRange(raceNpc.skillMin, raceNpc.skillMax),
            steerNoise: randomRange(raceNpc.steerNoiseMin, raceNpc.steerNoiseMax),
            steerRecovery: randomRange(
                raceNpc.steerRecoveryMin,
                raceNpc.steerRecoveryMax,
            ),
        };
    }
    
    nextPointIndex(track: Track): number {
        let nearestDistance = Infinity;
        let nearestIndex = this.pathPointIndex % track.pathPoints.length;
        let searchCount = Math.min(track.pathPoints.length, 80);

        for (let offset = 0; offset < searchCount; offset++) {
            let i = (nearestIndex + offset) % track.pathPoints.length;
            let distance = this.position.distanceToSquared(track.pathPoints[i]);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }

        if (nearestDistance > raceNpc.pathSearchFallbackDistanceSq) {
            for (let i = 0; i < track.pathPoints.length; i++) {
                let distance = this.position.distanceToSquared(track.pathPoints[i]);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }
        }

        return nearestIndex;
    }

    getLookAheadDistance(): number {
        return THREE.MathUtils.lerp(
            raceNpc.minLookAhead,
            raceNpc.maxLookAhead,
            this.getSpeedRatio(),
        ) * this.profile.cornerConfidence;
    }

    getLookAheadPoint(track: Track, startIndex: number): THREE.Vector3 {
        let remainingDistance = this.getLookAheadDistance();
        let previousPoint = track.pathPoints[startIndex].clone();

        for (let offset = 1; offset < track.pathPoints.length; offset++) {
            let index = (startIndex + offset) % track.pathPoints.length;
            let point = track.pathPoints[index].clone();
            let segmentLength = previousPoint.distanceTo(point);
            if (segmentLength >= remainingDistance && segmentLength > 0.0001) {
                let ratio = remainingDistance / segmentLength;
                return previousPoint.lerp(point, ratio);
            }

            remainingDistance -= segmentLength;
            previousPoint = point;
        }

        return previousPoint;
    }

    getPathLateral(track: Track): THREE.Vector3 {
        let pathDirection = track.pathVectors[this.pathPointIndex] ||
            this.direction.clone();
        let lateral = new THREE.Vector3(0, 1, 0)
            .cross(pathDirection.clone().normalize());
        if (lateral.lengthSq() < 0.0001)
            lateral.set(1, 0, 0);
        return lateral.normalize();
    }

    getForwardAndLateralTo(other: Vehicle, lateral: THREE.Vector3) {
        let offset = other.position.clone().sub(this.position);
        let forward = this.direction.clone().normalize();
        return {
            lateralGap: offset.dot(lateral),
            longitudinalGap: offset.dot(forward),
            offset,
        };
    }

    getIntentDuration(context: NpcRaceContext): number {
        return context.raceRunningMs + randomRange(
            raceNpc.intentMinDurationMs,
            raceNpc.intentMaxDurationMs,
        );
    }

    getActiveIntent(intent: NpcTimedIntent | undefined, raceRunningMs: number) {
        if (!intent || intent.untilMs < raceRunningMs)
            return undefined;

        return intent;
    }

    chooseOvertakeOffset(
        context: NpcRaceContext,
        frontVehicle: Vehicle,
        lateral: THREE.Vector3,
    ): number {
        let sideScores = [-1, 1].map(side => {
            let targetOffset = side * raceNpc.overtakeLaneOffset;
            let trafficPenalty = 0;
            for (let state of context.vehicleStates || []) {
                if (state.vehicle === this || state.vehicle === frontVehicle)
                    continue;

                let relation = this.getForwardAndLateralTo(state.vehicle, lateral);
                if (Math.abs(relation.longitudinalGap) < raceNpc.sideBySideLength * 1.4)
                    trafficPenalty += Math.max(
                        0,
                        raceNpc.sidePressureRange - Math.abs(targetOffset - relation.lateralGap),
                    );
            }

            return {
                score: -Math.abs(targetOffset - this.currentLaneOffset) - trafficPenalty,
                targetOffset,
            };
        });
        sideScores.sort((a, b) => b.score - a.score);
        return sideScores[0].targetOffset;
    }

    updateRearApproachIntent(
        context: NpcRaceContext,
        lateral: THREE.Vector3,
    ): NpcTimedIntent | undefined {
        let activeIntent = this.getActiveIntent(
            this.rearApproachIntent,
            context.raceRunningMs,
        );
        if (activeIntent)
            return activeIntent;

        let bestFront: { stateId: string; vehicle: Vehicle } | undefined;
        let bestGap = Infinity;
        for (let state of context.vehicleStates || []) {
            if (state.vehicle === this)
                continue;

            let relation = this.getForwardAndLateralTo(state.vehicle, lateral);
            let closingSpeed = this.velocity.length() - state.vehicle.velocity.length();
            if (relation.longitudinalGap <= 0 ||
                relation.longitudinalGap > raceNpc.overtakeTriggerDistance ||
                Math.abs(relation.lateralGap) > raceNpc.rearCorridorWidth ||
                closingSpeed < raceNpc.minClosingSpeed)
                continue;

            if (relation.longitudinalGap < bestGap) {
                bestFront = {
                    stateId: state.id,
                    vehicle: state.vehicle,
                };
                bestGap = relation.longitudinalGap;
            }
        }

        if (!bestFront)
            return undefined;

        let shouldBump = Math.random() < raceNpc.rearBumpChance * this.profile.aggression;
        let offset = shouldBump ?
            0 :
            this.chooseOvertakeOffset(context, bestFront.vehicle, lateral);
        this.rearApproachIntent = {
            mode: shouldBump ? "bump" : "overtake",
            offset,
            targetId: bestFront.stateId,
            untilMs: this.getIntentDuration(context),
        };
        return this.rearApproachIntent;
    }

    updateSidePressureIntent(
        context: NpcRaceContext,
        lateral: THREE.Vector3,
        understeer: boolean,
    ): NpcTimedIntent | undefined {
        if (understeer)
            return undefined;

        let activeIntent = this.getActiveIntent(
            this.sidePressureIntent,
            context.raceRunningMs,
        );
        if (activeIntent)
            return activeIntent;

        for (let state of context.vehicleStates || []) {
            if (state.vehicle === this)
                continue;

            let relation = this.getForwardAndLateralTo(state.vehicle, lateral);
            let relativeSpeed = Math.abs(
                this.velocity.length() - state.vehicle.velocity.length(),
            );
            if (Math.abs(relation.longitudinalGap) > raceNpc.sideBySideLength ||
                Math.abs(relation.lateralGap) > raceNpc.sidePressureRange ||
                relativeSpeed > raceNpc.sidePressureRelativeSpeed)
                continue;

            if (Math.random() > raceNpc.sidePressureChance * this.profile.aggression)
                return undefined;

            this.sidePressureIntent = {
                mode: "side-pressure",
                offset: Math.sign(relation.lateralGap || 1) * raceNpc.sidePressureOffset,
                targetId: state.id,
                untilMs: this.getIntentDuration(context),
            };
            return this.sidePressureIntent;
        }

        return undefined;
    }

    updateDefensiveIntent(
        context: NpcRaceContext,
        lateral: THREE.Vector3,
        understeer: boolean,
    ): NpcTimedIntent | undefined {
        if (understeer || !context.selfId)
            return undefined;

        let activeIntent = this.getActiveIntent(
            this.defensiveIntent,
            context.raceRunningMs,
        );
        if (activeIntent)
            return activeIntent;

        let relation = (context.draftRelations || []).find(candidate =>
            candidate.sourceId === context.selfId);
        if (!relation)
            return undefined;

        let drafterState = (context.vehicleStates || []).find(state =>
            state.id === relation.drafterId);
        if (!drafterState)
            return undefined;

        let vehicleRelation = this.getForwardAndLateralTo(drafterState.vehicle, lateral);
        if (vehicleRelation.longitudinalGap >= 0 ||
            Math.abs(vehicleRelation.longitudinalGap) > raceNpc.blockAwarenessDistance)
            return undefined;

        if (Math.random() > raceNpc.blockChance * this.profile.aggression)
            return undefined;

        this.defensiveIntent = {
            mode: "block",
            offset: Math.sign(vehicleRelation.lateralGap || 1) * raceNpc.blockOffset,
            targetId: drafterState.id,
            untilMs: this.getIntentDuration(context),
        };
        return this.defensiveIntent;
    }

    getDraftLaneOffset(
        context: NpcRaceContext,
        lateral: THREE.Vector3,
    ): number | undefined {
        let bestScore = -Infinity;
        let bestOffset: number | undefined;
        for (let state of context.vehicleStates || []) {
            if (state.vehicle === this)
                continue;

            let relation = this.getForwardAndLateralTo(state.vehicle, lateral);
            let forwardScore = THREE.MathUtils.clamp(
                relation.longitudinalGap / raceNpc.forwardTargetDistance,
                0,
                1,
            );
            let draftRelation = (context.draftRelations || []).find(candidate =>
                candidate.sourceId === state.id && candidate.drafterId === context.selfId);
            let reachScore = draftRelation ?
                1 :
                Math.max(
                    0,
                    1 - Math.abs(relation.lateralGap) / raceNpc.draftSeekRadius,
                );
            let closingScore = THREE.MathUtils.clamp(
                (this.velocity.length() - state.vehicle.velocity.length()) * 2,
                -1,
                1,
            );
            let collisionRisk = relation.longitudinalGap > 0 &&
                relation.longitudinalGap < raceNpc.overtakeTriggerDistance ?
                1 :
                0;
            let lateralCost = Math.abs(relation.lateralGap) / raceNpc.maxLaneOffset;
            let score = forwardScore +
                reachScore * raceNpc.draftSeekWeight * this.profile.draftPreference +
                closingScore * 0.6 -
                collisionRisk * 1.2 -
                lateralCost * 0.4;

            if (score > bestScore && relation.longitudinalGap > -2) {
                bestScore = score;
                bestOffset = THREE.MathUtils.clamp(
                    relation.lateralGap,
                    -raceNpc.maxLaneOffset,
                    raceNpc.maxLaneOffset,
                );
            }
        }

        return bestScore > 0.35 ? bestOffset : undefined;
    }

    getTacticalLaneOffset(
        context: NpcRaceContext | undefined,
        lateral: THREE.Vector3,
        understeer: boolean,
    ): number {
        if (!context)
            return 0;

        if (context.raceRunningMs < raceNpc.startTacticalSuppressionMs) {
            return (this.getDraftLaneOffset(context, lateral) || 0) *
                raceNpc.startDraftLaneScale;
        }

        let rearApproachIntent = this.updateRearApproachIntent(context, lateral);
        if (rearApproachIntent?.mode === "bump")
            return 0;

        if (rearApproachIntent?.mode === "overtake")
            return rearApproachIntent.offset;

        let defensiveIntent = this.updateDefensiveIntent(context, lateral, understeer);
        if (defensiveIntent)
            return defensiveIntent.offset;

        let sidePressureIntent = this.updateSidePressureIntent(
            context,
            lateral,
            understeer,
        );
        if (sidePressureIntent)
            return sidePressureIntent.offset;

        return this.getDraftLaneOffset(context, lateral) || 0;
    }

    getSignedSteerError(targetPoint: THREE.Vector3): number {
        let targetDirection = targetPoint.clone().sub(this.position);
        if (targetDirection.lengthSq() < 0.0001)
            return 0;

        targetDirection.normalize();
        let currentDirection = this.direction.clone().normalize();
        let angle = currentDirection.angleTo(targetDirection);
        let cross = currentDirection.clone().cross(targetDirection);
        let sign = Math.sign(cross.dot(this.hitbox.up));
        return -angle * (sign || 1);
    }

    smoothSteer(targetSteer: number, dt: number): number {
        let smoothing = THREE.MathUtils.clamp(
            raceNpc.steeringSmoothingBase * this.profile.steerRecovery * dt / 16.67,
            0,
            1,
        );
        return THREE.MathUtils.lerp(this.previousSteer, targetSteer, smoothing);
    }

    buildRaceLineControl(track: Track, dt: number, context?: NpcRaceContext) {
        this.pathPointIndex = this.nextPointIndex(track);
        let lateral = this.getPathLateral(track);
        let baseLookAheadPoint = this.getLookAheadPoint(track, this.pathPointIndex);
        let baseSteerError = this.getSignedSteerError(baseLookAheadPoint);
        let baseUndersteer = Math.abs(baseSteerError) > raceNpc.understeerErrorThreshold &&
            this.getSpeedRatio() > raceNpc.understeerSpeedRatio;
        let targetLaneOffset = this.getTacticalLaneOffset(context, lateral, baseUndersteer);
        targetLaneOffset = THREE.MathUtils.clamp(
            targetLaneOffset,
            -raceNpc.maxLaneOffset,
            raceNpc.maxLaneOffset,
        );
        this.currentLaneOffset = THREE.MathUtils.lerp(
            this.currentLaneOffset,
            targetLaneOffset,
            raceNpc.laneChangeSmoothing,
        );
        let lookAheadPoint = baseLookAheadPoint.clone();
        let targetPoint = lookAheadPoint.add(
            lateral.clone().multiplyScalar(this.currentLaneOffset),
        );
        let steerError = this.getSignedSteerError(targetPoint);
        let noise = Math.sin(
            this.steeringNoisePhase +
            (context?.raceRunningMs || 0) * raceNpc.steeringNoiseSpeed,
        ) * this.profile.steerNoise;
        let targetSteer = THREE.MathUtils.clamp(
            steerError / raceNpc.steerErrorForFullInput + noise,
            -1,
            1,
        );
        let steer = this.smoothSteer(targetSteer, dt);
        let absSteerError = Math.abs(steerError);
        let understeer = absSteerError > raceNpc.understeerErrorThreshold &&
            this.getSpeedRatio() > raceNpc.understeerSpeedRatio;
        let throttle = understeer ?
            raceNpc.understeerThrottleScale / this.profile.skill :
            1;
        let brake = understeer ?
            raceNpc.understeerBrakeScale / this.profile.skill :
            0;

        let rearApproachIntent = this.getActiveIntent(
            this.rearApproachIntent,
            context?.raceRunningMs || 0,
        );
        if (rearApproachIntent?.mode === "bump")
            brake = 0;
        else if (rearApproachIntent?.mode === "overtake")
            throttle = Math.max(throttle, 0.82);

        if (Math.sign(this.previousSteer) != Math.sign(steerError) &&
            Math.abs(this.previousSteer) > 0.2) {
            steer *= raceNpc.oversteerRetreatScale;
        }

        this.previousSteer = steer;
        this.previousSteerError = steerError;

        return { brake, steer, throttle };
    }

    update(track: Track, dt?: number, context?: NpcRaceContext) {
        if (!this.model || !this.hitbox || !track || !dt)
            return;

        let control = this.buildRaceLineControl(track, dt, context);
        let accelerationScale = (context?.raceRunningMs || 0) < raceNpc.startBoostDurationMs ?
            raceNpc.startBoostScale :
            1;
        this.applyControlInput({ ...control, accelerationScale }, dt);

        super.update(track, dt);
    }
}

export {
    NpcRaceContext,
};
