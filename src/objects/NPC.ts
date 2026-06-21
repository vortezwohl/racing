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
import Vehicle from "./Vehicle";
import Track from "./Track";

type NpcRaceContext = {
    draftRelations?: Array<PlannerDraftRelation>;
    raceRunningMs: number;
    selfId?: string;
    vehicleStates?: Array<PlannerTrafficState>;
};

const randomRange = (min: number, max: number): number =>
    min + Math.random() * (max - min);

const npcEngineWaveforms = ["sine", "triangle", "sawtooth", "pulse"] as const;

export default class NPC extends Vehicle {
    currentLaneOffset: number;
    engineWaveform: typeof npcEngineWaveforms[number];
    lastPlan?: NpcTrajectoryPlan;
    pathPointIndex: number;
    previousSteer: number;
    previousSteerError: number;
    profile: PlannerSkillProfile;

    constructor(
        scene: THREE.Scene,
        vehicleData: VehicleData,
        position: THREE.Vector3,
        direction: THREE.Vector3,
        rotation: THREE.Euler,
        checkpoint: Checkpoint,
        debug?: boolean,
    ) {
        super(scene, vehicleData, position, direction, rotation, checkpoint, debug);
        this.currentLaneOffset = 0;
        this.engineWaveform = Vehicle.chooseDistributedEngineWaveform(npcEngineWaveforms);
        this.pathPointIndex = 0;
        this.previousSteer = 0;
        this.previousSteerError = 0;
        this.profile = this.createSkillProfile();
        this.configureEngineAudio({
            baseGain: 0.08,
            baseWaveform: this.engineWaveform,
            harmonicGainAmount: this.engineWaveform === "sawtooth" ? 0.02 : 0.03,
            isLocalSource: false,
        });
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

    buildRaceLineControl(track: Track, dt: number, context?: NpcRaceContext) {
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
