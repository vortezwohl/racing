import * as THREE from "three";
import { Checkpoint, VehicleData } from "../utils/interfaces";
import { raceNpc } from "../utils/raceConfig";
import {
    buildNpcTrajectoryPlan,
    NpcTrajectoryPlan,
    PlannerDraftRelation,
    PlannerSkillProfile,
    PlannerTrafficState,
} from "../utils/racePlanning";
import { buildRaceSnapshot } from "../ai/npcRacing/snapshot";
import { planSyncNpcControl } from "../ai/npcRacing/synchronousPlanner";
import { getEdge, projectOntoGraph } from "../ai/npcRacing/trackGraph";
import {
    EdgeProjection,
    NpcControlPlan,
    NpcRouteState,
} from "../ai/npcRacing/types";
import Vehicle from "./Vehicle";
import Track from "./Track";

type NpcRaceContext = {
    asyncPlan?: NpcControlPlan;
    draftRelations?: Array<PlannerDraftRelation>;
    raceRunningMs: number;
    selfId?: string;
    vehicleStates?: Array<PlannerTrafficState>;
};

const randomRange = (min: number, max: number): number =>
    min + Math.random() * (max - min);

const npcEngineWaveforms = ["sine", "triangle", "sawtooth", "pulse"] as const;

type NpcCorridorReference = {
    altitudeGap: number;
    corridorHalfWidth: number;
    corridorUsage: number;
    lateralVector: THREE.Vector3;
    lateralOffset: number;
    projection?: EdgeProjection;
    tangent?: THREE.Vector3;
    targetPoint: THREE.Vector3;
};

export default class NPC extends Vehicle {
    currentLaneOffset: number;
    engineWaveform: typeof npcEngineWaveforms[number];
    graphRouteState?: NpcRouteState;
    graphPlan?: NpcControlPlan;
    lastPlan?: NpcTrajectoryPlan;
    lowSpeedRecoveryMs: number;
    severeOffTrackRecoveryMs: number;
    pathPointIndex: number;
    previousSteer: number;
    previousSteerError: number;
    profile: PlannerSkillProfile;
    audioEnabled: boolean;

    constructor(
        scene: THREE.Scene,
        vehicleData: VehicleData,
        position: THREE.Vector3,
        direction: THREE.Vector3,
        rotation: THREE.Euler,
        checkpoint: Checkpoint,
        debug?: boolean,
        audioEnabled: boolean = true,
    ) {
        super(scene, vehicleData, position, direction, rotation, checkpoint, debug);
        this.currentLaneOffset = 0;
        this.audioEnabled = audioEnabled;
        this.engineWaveform = Vehicle.chooseDistributedEngineWaveform(npcEngineWaveforms);
        this.graphRouteState = undefined;
        this.graphPlan = undefined;
        this.pathPointIndex = 0;
        this.lowSpeedRecoveryMs = 0;
        this.severeOffTrackRecoveryMs = 0;
        this.previousSteer = 0;
        this.previousSteerError = 0;
        this.profile = this.createSkillProfile();
        this.configureEngineAudio({
            baseGain: 0.08,
            baseWaveform: this.engineWaveform,
            harmonicGainAmount: this.engineWaveform === "sawtooth" ? 0.02 : 0.03,
            isLocalSource: false,
        });
        if (this.audioEnabled)
            this.initializeEngineAudio();
    }

    createSkillProfile(): PlannerSkillProfile {
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
            steerRecovery: randomRange(
                raceNpc.steerRecoveryMin,
                raceNpc.steerRecoveryMax,
            ),
        };
    }

    nextPointIndex(track: Track): number {
        return track.findNearestPlanningIndex(
            this.position,
            this.pathPointIndex,
            80,
            raceNpc.pathSearchFallbackDistanceSq,
        );
    }

    smoothSteer(targetSteer: number, dt: number): number {
        let smoothing = THREE.MathUtils.clamp(
            raceNpc.steeringSmoothingBase * this.profile.steerRecovery * dt / 16.67,
            0,
            1,
        );
        return THREE.MathUtils.lerp(this.previousSteer, targetSteer, smoothing);
    }

    getSteerErrorFromPlan(plan: NpcTrajectoryPlan): number {
        let targetSample = plan.samples[Math.min(1, plan.samples.length - 1)] || plan.samples[0];
        if (!targetSample)
            return 0;

        let targetDirection = targetSample.worldPoint.clone().sub(this.position);
        if (targetDirection.lengthSq() < 0.0001)
            return 0;

        targetDirection.normalize();
        let currentDirection = this.direction.clone().normalize();
        let angle = currentDirection.angleTo(targetDirection);
        let cross = currentDirection.clone().cross(targetDirection);
        let sign = Math.sign(cross.dot(this.hitbox?.up || new THREE.Vector3(0, 1, 0)));
        return -angle * (sign || 1);
    }

    buildCorridorReference(track: Track): NpcCorridorReference {
        let graphProjection = track.npcTrackGraph ?
            projectOntoGraph(
                track.npcTrackGraph,
                {
                    x: this.position.x,
                    y: this.position.y,
                    z: this.position.z,
                },
                {
                    x: this.direction.x,
                    y: this.direction.y,
                    z: this.direction.z,
                },
                this.graphRouteState?.projection,
                this.graphRouteState,
            ) :
            undefined;

        if (graphProjection) {
            let corridorHalfWidth = Math.max(graphProjection.width * 0.5, 0.001);
            let graphEdge = track.npcTrackGraph ?
                getEdge(track.npcTrackGraph, graphProjection.edgeId) :
                undefined;
            let graphSample = graphEdge?.samples[graphProjection.sampleIndex];
            return {
                altitudeGap: Math.abs(this.position.y - graphProjection.point.y),
                corridorHalfWidth,
                corridorUsage: Math.abs(graphProjection.lateralOffset) / corridorHalfWidth,
                lateralVector: graphSample ?
                    new THREE.Vector3(
                        graphSample.lateral.x,
                        graphSample.lateral.y,
                        graphSample.lateral.z,
                    ) :
                    new THREE.Vector3(1, 0, 0),
                lateralOffset: graphProjection.lateralOffset,
                projection: graphProjection,
                tangent: graphSample ?
                    new THREE.Vector3(
                        graphSample.tangent.x,
                        graphSample.tangent.y,
                        graphSample.tangent.z,
                    ) :
                    this.direction.clone(),
                targetPoint: new THREE.Vector3(
                    graphProjection.point.x,
                    graphProjection.point.y,
                    graphProjection.point.z,
                ),
            };
        }

        let currentTrackPosition = track.worldToTrackPosition(
            this.position,
            this.pathPointIndex,
        );
        let trackSample = track.samplePlanningAtArcLength(currentTrackPosition.arcLength);
        return {
            altitudeGap: Math.abs(this.position.y - trackSample.point.y),
            corridorHalfWidth: Math.max(currentTrackPosition.corridorHalfWidth, 0.001),
            corridorUsage: Math.abs(currentTrackPosition.lateralOffset) /
                Math.max(currentTrackPosition.corridorHalfWidth, 0.001),
            lateralVector: currentTrackPosition.lateral.clone(),
            lateralOffset: currentTrackPosition.lateralOffset,
            projection: undefined,
            tangent: trackSample.tangent.clone(),
            targetPoint: track.trackToWorldPosition(currentTrackPosition.arcLength, 0),
        };
    }

    applyTrackAdhesionAssist(track: Track): boolean {
        let corridorReference = this.buildCorridorReference(track);
        let isRecoverableTrackDrift = !!(
            corridorReference.projection &&
            corridorReference.corridorUsage <= 1.55 &&
            (corridorReference.altitudeGap > 1.5 || corridorReference.corridorUsage > 0.96)
        );
        if (!isRecoverableTrackDrift)
            return false;

        let laneClampOffset = THREE.MathUtils.clamp(
            corridorReference.lateralOffset,
            -corridorReference.corridorHalfWidth * 0.68,
            corridorReference.corridorHalfWidth * 0.68,
        );
        let constrainedTrackPoint = corridorReference.targetPoint.clone().add(
            corridorReference.lateralVector.clone().multiplyScalar(laneClampOffset),
        );

        if (corridorReference.altitudeGap > 8) {
            this.position.copy(constrainedTrackPoint);
            if (corridorReference.tangent && corridorReference.tangent.lengthSq() > 0.0001) {
                let tangent = corridorReference.tangent.clone().normalize();
                let forwardSpeed = Math.max(this.velocity.dot(tangent), 0.42);
                this.direction.copy(tangent);
                this.velocity.copy(tangent.multiplyScalar(forwardSpeed));
            } else {
                this.velocity.y = 0;
            }
            this.syncTransform();
            return true;
        }

        let snapStrength = THREE.MathUtils.clamp(
            corridorReference.altitudeGap > 8 ?
                1 :
                corridorReference.altitudeGap / 8,
            0.32,
            1,
        );
        let corridorClampStrength = corridorReference.corridorUsage > 1 ?
            0.68 :
            0.42;
        this.position.lerp(
            constrainedTrackPoint,
            Math.max(snapStrength * corridorClampStrength, 0.24),
        );
        this.position.y = THREE.MathUtils.lerp(
            this.position.y,
            constrainedTrackPoint.y,
            snapStrength,
        );
        this.velocity.y = Math.max(this.velocity.y, 0);
        this.velocity.multiplyScalar(0.98);
        if (corridorReference.tangent && corridorReference.tangent.lengthSq() > 0.0001) {
            this.direction.lerp(corridorReference.tangent.clone().normalize(), 0.08);
            this.direction.normalize();
        }
        this.syncTransform();
        return true;
    }

    sanitizeRaceContext(context?: NpcRaceContext): NpcRaceContext | undefined {
        if (!context)
            return undefined;

        if (context.raceRunningMs >= raceNpc.startTacticalSuppressionMs)
            return context;

        return {
            ...context,
            draftRelations: [],
            vehicleStates: (context.vehicleStates || []).filter((state) =>
                state.vehicle === this,
            ),
        };
    }

    buildGraphRaceControl(track: Track, dt: number, context?: NpcRaceContext) {
        if (context?.asyncPlan) {
            let plan = context.asyncPlan;
            this.graphPlan = plan;
            this.previousSteer = this.smoothSteer(plan.steer, dt);
            this.previousSteerError = Math.abs(plan.steer);
            return {
                brake: plan.brake,
                brakeScale: plan.brakeScale,
                steer: this.previousSteer,
                steerScale: plan.steerScale,
                throttle: plan.throttle,
            };
        }

        if (!track.npcTrackGraph || !context?.selfId || !context.vehicleStates)
            return undefined;

        let snapshot = buildRaceSnapshot(
            Math.floor(context.raceRunningMs),
            context.raceRunningMs,
            performance.now(),
            context.vehicleStates,
        );
        let result = planSyncNpcControl(
            track.npcTrackGraph,
            snapshot,
            context.selfId,
            this.graphRouteState,
            raceNpc.asyncPlanner,
        );
        if (!result)
            return undefined;

        this.graphRouteState = result.routeState;
        this.graphPlan = result.plan;
        this.previousSteer = this.smoothSteer(result.plan.steer, dt);
        this.previousSteerError = Math.abs(result.plan.steer);

        return {
            brake: result.plan.brake,
            brakeScale: result.plan.brakeScale,
            steer: this.previousSteer,
            steerScale: result.plan.steerScale,
            throttle: result.plan.throttle,
        };
    }

    buildRaceLineControl(track: Track, dt: number, context?: NpcRaceContext) {
        let graphControl = this.buildGraphRaceControl(track, dt, context);
        if (graphControl)
            return graphControl;

        this.pathPointIndex = this.nextPointIndex(track);
        let plannerContext = this.sanitizeRaceContext(context);
        let plan = buildNpcTrajectoryPlan({
            context: plannerContext,
            dt,
            pathPointIndex: this.pathPointIndex,
            plannerConfig: raceNpc.dynamicPlanner,
            previousLaneOffset: this.currentLaneOffset,
            previousSteer: this.previousSteer,
            previousSteerError: this.previousSteerError,
            profile: this.profile,
            track,
            vehicle: this,
        });
        this.lastPlan = plan;
        this.pathPointIndex = plan.pathPointIndex;

        let laneBlend = plan.isRecovering ?
            raceNpc.recoveryLaneOffsetBlend :
            raceNpc.dynamicLaneOffsetBlend;
        let targetLaneOffset = THREE.MathUtils.clamp(
            plan.targetLaneOffset,
            -raceNpc.maxLaneOffset,
            raceNpc.maxLaneOffset,
        );
        if ((context?.raceRunningMs || 0) < raceNpc.startTacticalSuppressionMs) {
            targetLaneOffset *= raceNpc.startDraftLaneScale;
        }
        this.currentLaneOffset = THREE.MathUtils.lerp(
            this.currentLaneOffset,
            targetLaneOffset,
            laneBlend,
        );

        let steer = this.smoothSteer(plan.targetSteer, dt);
        let throttle = plan.targetThrottle;
        let brake = plan.targetBrake;
        if (plan.isRecovering) {
            throttle = Math.min(throttle, raceNpc.dynamicPlanner.recoveryThrottleCap);
            brake = Math.max(brake, 0.2 + plan.corridorPressure * 0.2);
        }
        if (!plan.isRecovering &&
            plan.futureContext.segmentType === "straight" &&
            plan.corridorPressure < 0.42 &&
            brake < 0.28) {
            throttle = Math.max(throttle, 0.38);
        }

        this.previousSteer = steer;
        this.previousSteerError = this.getSteerErrorFromPlan(plan);

        return {
            brake,
            brakeScale: plan.targetBrakeScale,
            steer,
            steerScale: plan.targetSteerScale,
            throttle,
        };
    }

    update(track: Track, dt?: number, context?: NpcRaceContext) {
        if (!this.model || !this.hitbox || !track || !dt)
            return;

        this.applyTrackAdhesionAssist(track);
        let corridorReference = this.buildCorridorReference(track);
        let corridorUsage = corridorReference.corridorUsage;
        let currentSpeed = this.velocity.length();
        let altitudeGap = corridorReference.altitudeGap;
        let hasRecoverableTrackDrift = !!(
            corridorReference.projection &&
            corridorUsage <= 1.55 &&
            altitudeGap <= 18
        );
        let isBranchApproachLocked = !!(
            this.graphRouteState?.committedBranchEdgeId &&
            corridorReference.projection &&
            corridorReference.projection.edgeId !== this.graphRouteState.committedBranchEdgeId &&
            this.graphRouteState.route.edgeIds.includes(this.graphRouteState.committedBranchEdgeId) &&
            corridorUsage <= 0.96 &&
            altitudeGap <= 4
        );
        let branchApproachRecoveryShield = isBranchApproachLocked && currentSpeed < 0.28;
        let isBadlyStalled = corridorUsage > 0.78 && currentSpeed < 0.12;
        let isSeverelyOffTrack = corridorUsage > 1.18 ||
            altitudeGap > 5.5 && !hasRecoverableTrackDrift;
        if (branchApproachRecoveryShield)
            isBadlyStalled = false;
        this.lowSpeedRecoveryMs = isBadlyStalled ?
            this.lowSpeedRecoveryMs + dt :
            0;
        this.severeOffTrackRecoveryMs = isSeverelyOffTrack ?
            this.severeOffTrackRecoveryMs + dt :
            0;

        if (this.lowSpeedRecoveryMs > 1400 || this.severeOffTrackRecoveryMs > 500) {
            console.info(`[npc-reset] ${JSON.stringify({
                altitudeGap: Number(altitudeGap.toFixed(3)),
                corridorUsage: Number(corridorUsage.toFixed(3)),
                lastCheckpointIndex: this.lastCheckpointIndex,
                lowSpeedRecoveryMs: Math.round(this.lowSpeedRecoveryMs),
                npcLabel: this.model?.name || "npc",
                projectionEdgeId: corridorReference.projection?.edgeId,
                projectionReason: corridorReference.projection?.projectionReason,
                severeOffTrackRecoveryMs: Math.round(this.severeOffTrackRecoveryMs),
                speed: Number(currentSpeed.toFixed(3)),
            })}`);
            this.resetToCheckpoint(this.checkpoint);
            this.lowSpeedRecoveryMs = 0;
            this.severeOffTrackRecoveryMs = 0;
            this.currentLaneOffset = 0;
            this.graphPlan = undefined;
            this.graphRouteState = undefined;
            this.lastPlan = undefined;
            this.previousSteer = 0;
            this.previousSteerError = 0;
            return;
        }

        let control = this.buildRaceLineControl(track, dt, context);
        if (corridorUsage > 0.9 && !isBranchApproachLocked) {
            let targetDirection = corridorReference.targetPoint.clone()
                .sub(this.position.clone());
            if (targetDirection.lengthSq() > 0.0001) {
                targetDirection.normalize();
                let currentDirection = this.direction.clone().normalize();
                let angle = currentDirection.angleTo(targetDirection);
                let sign = Math.sign(
                    currentDirection.clone()
                        .cross(targetDirection)
                        .dot(this.hitbox.up.clone().normalize()),
                ) || 1;
                let recoverySteer = THREE.MathUtils.clamp((-angle * sign) / 0.58, -1, 1);
                let recoveryStrength = THREE.MathUtils.clamp(
                    (corridorUsage - 0.9) / 0.4,
                    0,
                    1,
                );
                control.steer = THREE.MathUtils.lerp(
                    control.steer,
                    recoverySteer,
                    0.68 + recoveryStrength * 0.22,
                );
                control.steerScale = Math.max(
                    control.steerScale,
                    1.18 + recoveryStrength * 0.28,
                );
            }
            control.throttle = Math.min(
                control.throttle,
                corridorUsage > 1.05 ? 0.16 : 0.24,
            );
            control.brake = Math.max(
                control.brake,
                0.34 + Math.max(0, corridorUsage - 0.9) * 0.8,
            );
            control.brakeScale = Math.max(control.brakeScale, 1.08);
        }
        if (branchApproachRecoveryShield) {
            control.throttle = Math.max(control.throttle, 0.52);
            control.brake = Math.min(control.brake, 0.12);
            control.brakeScale = Math.min(control.brakeScale, 1);
            control.steerScale = Math.min(control.steerScale, 1.08);
        }
        let accelerationScale = (context?.raceRunningMs || 0) < raceNpc.startBoostDurationMs ?
            raceNpc.startBoostScale :
            1;
        this.applyControlInput({ ...control, accelerationScale }, dt);

        super.update(track, dt);
        this.applyTrackAdhesionAssist(track);
    }
}

export {
    NpcRaceContext,
};
