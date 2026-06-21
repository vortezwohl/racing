import * as THREE from "three";
import Track, {
    TrackFutureContext,
    TrackPlanningSample,
    TrackSegmentType,
} from "../objects/Track";
import Vehicle from "../objects/Vehicle";

type PlannerTrafficState = {
    id: string;
    isLocalPlayer: boolean;
    vehicle: Vehicle;
};

type PlannerDraftRelation = {
    distanceToTrail: number;
    drafterId: string;
    nearestTrailPoint: THREE.Vector3;
    sourceId: string;
};

type PlannerSkillProfile = {
    aggression: number;
    cornerConfidence: number;
    draftPreference: number;
    skill: number;
    steerRecovery: number;
};

type PlannerWeights = {
    attackReward: number;
    blockReward: number;
    collisionPenalty: number;
    controlPenalty: number;
    draftReward: number;
    overtakeReward: number;
    progressReward: number;
    recoveryBias: number;
    smoothnessPenalty: number;
    trackSafetyPenalty: number;
};

type PlannerNode = {
    arcLength: number;
    collisionRisk: number;
    corridorPressure: number;
    cumulativeCurvature: number;
    futureTimeMs: number;
    lateralOffset: number;
    lateralVelocity: number;
    parent?: PlannerNode;
    projectedSpeed: number;
    speedMode: "brake" | "coast" | "throttle";
    samples: Array<PlannedTrajectorySample>;
    score: number;
};

type PlannedTrajectorySample = {
    arcLength: number;
    corridorHalfWidth: number;
    curvature: number;
    futureTimeMs: number;
    lateral: THREE.Vector3;
    lateralOffset: number;
    point: THREE.Vector3;
    segmentType: TrackSegmentType;
    signedCurvature: number;
    tangent: THREE.Vector3;
    speedMode: "brake" | "coast" | "throttle";
    projectedSpeed: number;
    targetSpeed: number;
    worldPoint: THREE.Vector3;
};

type NpcPlannerIntent = {
    mode: "attack" | "block" | "draft" | "overtake" | "recover";
    targetId?: string;
    targetLateralOffset?: number;
};

type NpcTrajectoryPlan = {
    controlDemand: number;
    cornerSeverity: number;
    corridorPressure: number;
    futureContext: TrackFutureContext;
    intent?: NpcPlannerIntent;
    isRecovering: boolean;
    pathPointIndex: number;
    samples: Array<PlannedTrajectorySample>;
    score: number;
    targetBrake: number;
    targetBrakeScale: number;
    targetLaneOffset: number;
    targetSpeed: number;
    targetSteer: number;
    targetSteerScale: number;
    targetThrottle: number;
    trackArcLength: number;
};

type BuildNpcTrajectoryPlanOptions = {
    context?: {
        draftRelations?: Array<PlannerDraftRelation>;
        raceRunningMs: number;
        selfId?: string;
        vehicleStates?: Array<PlannerTrafficState>;
    };
    dt: number;
    pathPointIndex: number;
    previousLaneOffset: number;
    profile: PlannerSkillProfile;
    previousSteer: number;
    previousSteerError: number;
    track: Track;
    vehicle: Vehicle;
    plannerConfig: {
        attackBiasScale: number;
        attackOffset: number;
        beamWidth: number;
        brakingLookAheadSamples: number;
        brakingReserveFactor: number;
        blockBiasScale: number;
        blockLookAheadDistance: number;
        cornerBrakeScale: number;
        cornerCorridorShrink: number;
        cornerEntryOffsetScale: number;
        cornerExitOffsetScale: number;
        cornerRiskFadeFull: number;
        cornerRiskFadeStart: number;
        collisionPenalty: number;
        collisionPredictionLength: number;
        controlPenalty: number;
        corridorPenalty: number;
        draftBiasScale: number;
        draftLookAheadDistance: number;
        emergencyBrakeScale: number;
        emergencySteerDamping: number;
        fallbackBrake: number;
        fallbackThrottle: number;
        guardianBrakeFloor: number;
        guardianCorridorThreshold: number;
        guardianLookAheadDistance: number;
        guardianOverspeedThreshold: number;
        heavyCornerSpeedFloor: number;
        hardCorridorMargin: number;
        horizonDistanceBase: number;
        horizonDistanceMax: number;
        horizonDistanceSpeedScale: number;
        laneCandidates: Array<number>;
        linkedCornerLookAhead: number;
        maxBrakePerMeter: number;
        maxLateralAcceleration: number;
        maxLaneUsage: number;
        maxOverspeedForViablePlan: number;
        mediumCornerSpeedFloor: number;
        minCollisionDistance: number;
        minRollingSpeed: number;
        minSegmentDistance: number;
        overtakeBiasScale: number;
        overtakeLookAheadDistance: number;
        plannerAccelerationScale: number;
        plannerBrakeScale: number;
        plannerCoastScale: number;
        plannerEmergencyBrakeScale: number;
        plannerMaxSpeedSafety: number;
        previewExecutionDistance: number;
        recoveryCenteringGain: number;
        recoveryDistanceLimit: number;
        recoveryThrottleCap: number;
        recoveryTargetOffsetGain: number;
        safetyMargin: number;
        segmentCount: number;
        segmentDistanceMin: number;
        segmentDistanceSpeedScale: number;
        sideAttackChance: number;
        speedModeChangePenalty: number;
        speedBrakeGain: number;
        speedLookAheadBlend: number;
        speedThrottleGain: number;
        steeringGain: number;
        targetSpeedLookAheadIndex: number;
        trackProgressRewardScale: number;
        trackSafetyBias: number;
        transitionPenalty: number;
        viabilityControlDemandLimit: number;
        viabilityPredictionWindow: number;
        guardianFullBrakeOverspeed: number;
        guardianFullBrakeTrackRisk: number;
        brakeExecutionScale: number;
        emergencyBrakeExecutionScale: number;
    };
};

type PlannerTargetContext = {
    attackTarget?: PlannerTrafficState;
    blockTarget?: PlannerTrafficState;
    draftTarget?: PlannerTrafficState;
    futureContext: TrackFutureContext;
    isRecovering: boolean;
    overtakeTarget?: PlannerTrafficState;
    projectedVehicles: Array<{
        id: string;
        isLocalPlayer: boolean;
        lateralOffset: number;
        relativeArcDistance: number;
        speed: number;
        state: PlannerTrafficState;
        trackArcLength: number;
    }>;
    recoveryCenterOffset: number;
    selfLateralOffset: number;
};

const clamp01 = (value: number): number => THREE.MathUtils.clamp(value, 0, 1);

const uniqueRounded = (values: Array<number>, precision: number = 1000): Array<number> => {
    let result: Array<number> = [];
    let seen = new Set<number>();

    for (let value of values) {
        let rounded = Math.round(value * precision);
        if (seen.has(rounded))
            continue;
        seen.add(rounded);
        result.push(rounded / precision);
    }

    return result;
};

const getVehicleTrackProjection = (
    track: Track,
    vehicle: Vehicle,
): { arcLength: number; lateralOffset: number } => {
    let trackPosition = track.worldToTrackPosition(vehicle.position);
    return {
        arcLength: trackPosition.arcLength,
        lateralOffset: trackPosition.lateralOffset,
    };
};

const getSegmentCorridorScale = (
    sample: TrackPlanningSample,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    isRecovering: boolean,
    guardianMode: boolean,
): number => {
    let segmentScale = sample.segmentType === "hairpin" ?
        0.72 :
        sample.segmentType === "corner" ?
            0.8 :
            sample.segmentType === "sweeper" ?
                0.9 :
                1;
    let curvatureScale = THREE.MathUtils.clamp(
        1 - sample.curvature * 2.2,
        0.7,
        1,
    );
    let linkedScale = THREE.MathUtils.lerp(
        1,
        0.9,
        sample.linkedCornerStrength,
    );
    let recoveryScale = isRecovering ? 0.92 : 1;
    let guardianScale = guardianMode ? 0.88 : 1;
    return segmentScale * curvatureScale * linkedScale *
        recoveryScale * guardianScale * plannerConfig.safetyMargin;
};

const getCorridorLimit = (
    sample: TrackPlanningSample,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    isRecovering: boolean,
    guardianMode: boolean,
): number => sample.corridorHalfWidth *
    plannerConfig.maxLaneUsage *
    getSegmentCorridorScale(sample, plannerConfig, isRecovering, guardianMode);

const getSpeedModesForSample = (
    sample: TrackPlanningSample,
    futureContext: TrackFutureContext,
    guardianMode: boolean,
    forceEmergencyBrake: boolean,
): Array<"brake" | "coast" | "throttle"> => {
    if (forceEmergencyBrake)
        return ["brake"];

    if (guardianMode || sample.segmentType === "hairpin")
        return ["coast", "throttle", "brake"];

    if (sample.segmentType === "corner")
        return ["throttle", "coast", "brake"];

    if (futureContext.segmentType === "corner" || futureContext.segmentType === "hairpin")
        return ["coast", "brake", "throttle"];

    return ["throttle", "coast", "brake"];
};

const projectSpeedForMode = (
    currentSpeed: number,
    segmentDistance: number,
    speedMode: "brake" | "coast" | "throttle",
    futureContext: TrackFutureContext,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    maxSpeed: number,
    forceEmergencyBrake: boolean,
): number => {
    let nextSpeed = currentSpeed;
    let curvatureBrakeBias = 1 + futureContext.maxCurvature * 5.5;
    if (speedMode === "throttle") {
        nextSpeed += plannerConfig.plannerAccelerationScale * segmentDistance;
    } else if (speedMode === "coast") {
        nextSpeed -= plannerConfig.maxBrakePerMeter *
            plannerConfig.plannerCoastScale *
            segmentDistance *
            curvatureBrakeBias;
    } else {
        let brakeScale = forceEmergencyBrake ?
            plannerConfig.plannerEmergencyBrakeScale :
            plannerConfig.plannerBrakeScale;
        nextSpeed -= plannerConfig.maxBrakePerMeter *
            brakeScale *
            segmentDistance *
            curvatureBrakeBias;
    }

    return THREE.MathUtils.clamp(
        nextSpeed,
        plannerConfig.minRollingSpeed,
        maxSpeed,
    );
};

const buildPlannerWeights = (
    futureContext: TrackFutureContext,
    overspeedPressure: number,
    isRecovering: boolean,
    profile: PlannerSkillProfile,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
): PlannerWeights => {
    let cornerRisk = clamp01(
        futureContext.maxCurvature * 7 +
        futureContext.linkedCornerStrength * 0.75 +
        overspeedPressure * 0.85,
    );
    let tacticalFreedom = 1 - THREE.MathUtils.smoothstep(
        cornerRisk,
        plannerConfig.cornerRiskFadeStart,
        plannerConfig.cornerRiskFadeFull,
    );
    let recoveryBlend = isRecovering ? 1 : 0;

    return {
        attackReward: plannerConfig.attackBiasScale *
            profile.aggression * tacticalFreedom * (1 - recoveryBlend),
        blockReward: plannerConfig.blockBiasScale *
            profile.aggression * tacticalFreedom * (1 - recoveryBlend * 0.5),
        collisionPenalty: plannerConfig.collisionPenalty *
            (1 + recoveryBlend * 0.9 + cornerRisk * 0.45),
        controlPenalty: plannerConfig.controlPenalty *
            (1 + cornerRisk * 0.6),
        draftReward: plannerConfig.draftBiasScale *
            profile.draftPreference * tacticalFreedom * (1 - recoveryBlend),
        overtakeReward: plannerConfig.overtakeBiasScale *
            profile.aggression * tacticalFreedom * (1 - recoveryBlend * 0.4),
        progressReward: plannerConfig.trackProgressRewardScale *
            (1 + futureContext.straightDistance * 0.006),
        recoveryBias: plannerConfig.recoveryCenteringGain *
            (0.25 + recoveryBlend * 0.75),
        smoothnessPenalty: plannerConfig.transitionPenalty *
            (1 + recoveryBlend * 0.4),
        trackSafetyPenalty: plannerConfig.corridorPenalty *
            (plannerConfig.trackSafetyBias + recoveryBlend * 1.2 + cornerRisk * 0.9),
    };
};

const getRecoveryState = (
    track: Track,
    vehicle: Vehicle,
    trackArcLength: number,
    previousSteer: number,
    previousSteerError: number,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
): { distanceToCenter: number; isRecovering: boolean; recoveryCenterOffset: number } => {
    let relative = track.worldToTrackPosition(vehicle.position);
    let trackSample = track.samplePlanningAtArcLength(trackArcLength);
    let distanceToCenter = Math.abs(relative.lateralOffset);
    let normalizedOffset = distanceToCenter /
        Math.max(trackSample.corridorHalfWidth, 0.0001);
    let airborneBias = vehicle.position.y - trackSample.point.y;
    let controlInstability = Math.abs(previousSteer) * 0.35 + Math.abs(previousSteerError);
    let isRecovering = normalizedOffset > plannerConfig.recoveryDistanceLimit ||
        airborneBias > 2.5 ||
        controlInstability > 0.88;

    return {
        distanceToCenter,
        isRecovering,
        recoveryCenterOffset: THREE.MathUtils.clamp(
            -relative.lateralOffset * 0.7,
            -trackSample.corridorHalfWidth * 0.4,
            trackSample.corridorHalfWidth * 0.4,
        ),
    };
};

const buildProjectedVehicles = (
    track: Track,
    vehicle: Vehicle,
    trackArcLength: number,
    context: BuildNpcTrajectoryPlanOptions["context"],
): PlannerTargetContext["projectedVehicles"] => {
    let projectedVehicles: PlannerTargetContext["projectedVehicles"] = [];
    for (let state of context?.vehicleStates || []) {
        if (state.vehicle === vehicle)
            continue;

        let projection = getVehicleTrackProjection(track, state.vehicle);
        projectedVehicles.push({
            id: state.id,
            isLocalPlayer: state.isLocalPlayer,
            lateralOffset: projection.lateralOffset,
            relativeArcDistance: track.getSignedArcDistance(trackArcLength, projection.arcLength),
            speed: state.vehicle.velocity.length(),
            state,
            trackArcLength: projection.arcLength,
        });
    }

    return projectedVehicles;
};

const chooseRacecraftTargets = (
    track: Track,
    vehicle: Vehicle,
    trackArcLength: number,
    profile: PlannerSkillProfile,
    context: BuildNpcTrajectoryPlanOptions["context"],
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    futureContext: TrackFutureContext,
    isRecovering: boolean,
    recoveryCenterOffset: number,
): PlannerTargetContext => {
    let projectedVehicles = buildProjectedVehicles(track, vehicle, trackArcLength, context);
    let selfProjection = getVehicleTrackProjection(track, vehicle);
    let draftTarget: PlannerTrafficState | undefined;
    let overtakeTarget: PlannerTrafficState | undefined;
    let blockTarget: PlannerTrafficState | undefined;
    let attackTarget: PlannerTrafficState | undefined;
    let bestDraftScore = -Infinity;
    let bestOvertakeGap = Infinity;
    let bestBlockGap = Infinity;
    let sideAttackWindow = plannerConfig.sideAttackChance * profile.aggression;

    for (let projected of projectedVehicles) {
        let lateralGap = Math.abs(projected.lateralOffset - selfProjection.lateralOffset);
        if (projected.relativeArcDistance > 0 &&
            projected.relativeArcDistance < plannerConfig.draftLookAheadDistance) {
            let draftRelation = (context?.draftRelations || []).find((candidate) =>
                candidate.sourceId === projected.id &&
                candidate.drafterId === context?.selfId,
            );
            let score = 1 -
                projected.relativeArcDistance / plannerConfig.draftLookAheadDistance -
                lateralGap * 0.08 +
                (draftRelation ? 0.6 : 0);
            if (score > bestDraftScore) {
                bestDraftScore = score;
                draftTarget = projected.state;
            }
        }

        if (projected.relativeArcDistance > 0 &&
            projected.relativeArcDistance < plannerConfig.overtakeLookAheadDistance &&
            Math.abs(vehicle.velocity.length() - projected.speed) < 0.45) {
            if (projected.relativeArcDistance < bestOvertakeGap) {
                bestOvertakeGap = projected.relativeArcDistance;
                overtakeTarget = projected.state;
            }
        }

        if (projected.relativeArcDistance < 0 &&
            Math.abs(projected.relativeArcDistance) < plannerConfig.blockLookAheadDistance) {
            let relation = (context?.draftRelations || []).find((candidate) =>
                candidate.sourceId === context?.selfId &&
                candidate.drafterId === projected.id,
            );
            if (relation && Math.abs(projected.relativeArcDistance) < bestBlockGap) {
                bestBlockGap = Math.abs(projected.relativeArcDistance);
                blockTarget = projected.state;
            }
        }

        if (!isRecovering &&
            futureContext.segmentType !== "hairpin" &&
            Math.abs(projected.relativeArcDistance) < 5 &&
            lateralGap < plannerConfig.minCollisionDistance * 0.9 &&
            sideAttackWindow > 0.28) {
            attackTarget = projected.state;
        }
    }

    return {
        attackTarget,
        blockTarget,
        draftTarget,
        futureContext,
        isRecovering,
        overtakeTarget,
        projectedVehicles,
        recoveryCenterOffset,
        selfLateralOffset: selfProjection.lateralOffset,
    };
};

const buildLaneTargets = (
    track: Track,
    currentSample: TrackPlanningSample,
    currentLaneOffset: number,
    targetContext: PlannerTargetContext,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
): Array<number> => {
    let corridorHalfWidth = currentSample.corridorHalfWidth *
        plannerConfig.maxLaneUsage;
    let cornerInsideBias = -currentSample.cornerSign *
        corridorHalfWidth * plannerConfig.cornerEntryOffsetScale;
    let cornerExitBias = currentSample.linkedCornerSign *
        corridorHalfWidth * plannerConfig.cornerExitOffsetScale *
        currentSample.linkedCornerStrength;
    let values = [
        currentLaneOffset,
        targetContext.selfLateralOffset,
        0,
        targetContext.recoveryCenterOffset,
        cornerInsideBias,
        cornerExitBias,
    ];

    if (targetContext.draftTarget) {
        let draftProjection = getVehicleTrackProjection(track, targetContext.draftTarget.vehicle);
        values.push(draftProjection.lateralOffset);
    }

    if (targetContext.overtakeTarget) {
        let overtakeProjection = getVehicleTrackProjection(
            track,
            targetContext.overtakeTarget.vehicle,
        );
        values.push(
            THREE.MathUtils.clamp(
                overtakeProjection.lateralOffset + Math.sign(
                    overtakeProjection.lateralOffset || 1,
                ) * corridorHalfWidth * 0.3,
                -corridorHalfWidth,
                corridorHalfWidth,
            ),
        );
        values.push(
            THREE.MathUtils.clamp(
                overtakeProjection.lateralOffset - Math.sign(
                    overtakeProjection.lateralOffset || 1,
                ) * corridorHalfWidth * 0.3,
                -corridorHalfWidth,
                corridorHalfWidth,
            ),
        );
    }

    if (targetContext.blockTarget) {
        let blockProjection = getVehicleTrackProjection(track, targetContext.blockTarget.vehicle);
        values.push(
            THREE.MathUtils.clamp(
                blockProjection.lateralOffset,
                -corridorHalfWidth,
                corridorHalfWidth,
            ),
        );
    }

    if (targetContext.attackTarget) {
        let attackProjection = getVehicleTrackProjection(track, targetContext.attackTarget.vehicle);
        let pressureSide = Math.sign(
            attackProjection.lateralOffset - targetContext.selfLateralOffset,
        ) || 1;
        values.push(
            THREE.MathUtils.clamp(
                attackProjection.lateralOffset + pressureSide * plannerConfig.attackOffset,
                -corridorHalfWidth,
                corridorHalfWidth,
            ),
        );
    }

    for (let ratio of plannerConfig.laneCandidates)
        values.push(corridorHalfWidth * ratio);

    return uniqueRounded(values).map((value) => THREE.MathUtils.clamp(
        value,
        -corridorHalfWidth,
        corridorHalfWidth,
    ));
};

const evaluateCollisionRisk = (
    track: Track,
    sampleArcLength: number,
    worldPoint: THREE.Vector3,
    futureTimeMs: number,
    projectedVehicles: PlannerTargetContext["projectedVehicles"],
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
): number => {
    let highestRisk = 0;
    let futureFrameScale = futureTimeMs / 16.67;

    for (let projected of projectedVehicles) {
        let projectedPosition = projected.state.vehicle.position.clone().add(
            projected.state.vehicle.velocity.clone().multiplyScalar(futureFrameScale),
        );
        let projectedTrack = track.worldToTrackPosition(projectedPosition);
        let arcDistance = Math.abs(
            track.getSignedArcDistance(sampleArcLength, projectedTrack.arcLength),
        );
        if (arcDistance > plannerConfig.collisionPredictionLength)
            continue;

        let spatialDistance = projectedPosition.distanceTo(worldPoint);
        if (spatialDistance > plannerConfig.minCollisionDistance * 2.2)
            continue;

        let longitudinalRisk = 1 - clamp01(
            arcDistance / plannerConfig.collisionPredictionLength,
        );
        let lateralRisk = 1 - clamp01(
            spatialDistance / (plannerConfig.minCollisionDistance * 2.2),
        );
        highestRisk = Math.max(highestRisk, longitudinalRisk * 0.55 + lateralRisk * 0.75);
    }

    return clamp01(highestRisk);
};

const evaluateCornerSpacePenalty = (
    track: Track,
    sampleArcLength: number,
    targetOffset: number,
    targetContext: PlannerTargetContext,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
): { penalty: number; unsafe: boolean } => {
    let futureContext = targetContext.futureContext;
    if (futureContext.segmentType === "straight")
        return { penalty: 0, unsafe: false };

    let penalty = 0;
    let unsafe = false;
    let sample = track.samplePlanningAtArcLength(sampleArcLength);
    let corridorHalfWidth = sample.corridorHalfWidth * plannerConfig.maxLaneUsage;

    for (let projected of targetContext.projectedVehicles) {
        let arcGap = Math.abs(
            track.getSignedArcDistance(sampleArcLength, projected.trackArcLength),
        );
        if (arcGap > plannerConfig.minCollisionDistance * 1.7)
            continue;

        let lateralGap = Math.abs(targetOffset - projected.lateralOffset);
        if (lateralGap > plannerConfig.minCollisionDistance * 1.15)
            continue;

        let closeFactor = 1 - clamp01(
            lateralGap / (plannerConfig.minCollisionDistance * 1.15),
        );
        let arcFactor = 1 - clamp01(
            arcGap / (plannerConfig.minCollisionDistance * 1.7),
        );
        let sideMargin = corridorHalfWidth - Math.max(
            Math.abs(targetOffset),
            Math.abs(projected.lateralOffset),
        );
        penalty = Math.max(
            penalty,
            closeFactor * arcFactor * (futureContext.segmentType === "hairpin" ? 1.1 : 0.8),
        );
        if (sideMargin < 0.45 &&
            lateralGap < plannerConfig.minCollisionDistance * 0.7 &&
            arcGap < plannerConfig.minCollisionDistance * 0.9) {
            unsafe = true;
        }
    }

    return {
        penalty: clamp01(penalty),
        unsafe,
    };
};

const evaluateProjectedTrackRisk = (
    track: Track,
    arcLength: number,
    targetOffset: number,
    lateralVelocity: number,
    projectedSpeed: number,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    profile: PlannerSkillProfile,
    isRecovering: boolean,
    guardianMode: boolean,
): number => {
    let highestRisk = 0;
    let previewSamples = 4;
    let previewDistance = plannerConfig.viabilityPredictionWindow;
    let previousSample: PlannedTrajectorySample | undefined;

    for (let step = 1; step <= previewSamples; step++) {
        let distance = previewDistance * (step / previewSamples);
        let futureSample = track.samplePlanningAtArcLength(arcLength + distance);
        let corridorLimit = getCorridorLimit(
            futureSample,
            plannerConfig,
            isRecovering,
            guardianMode,
        ) * plannerConfig.hardCorridorMargin;
        let driftOffset = targetOffset + lateralVelocity * distance * 0.45;
        let stabilizingOffset = THREE.MathUtils.lerp(
            driftOffset,
            -futureSample.cornerSign * corridorLimit * 0.28,
            0.2,
        );
        let utilization = Math.abs(stabilizingOffset) /
            Math.max(corridorLimit, 0.0001);
        if (utilization > 1)
            return 1;

        let worldPoint = futureSample.point.clone().add(
            futureSample.lateral.clone().multiplyScalar(stabilizingOffset),
        );
        let speedSample: PlannedTrajectorySample = {
            arcLength: futureSample.arcLength,
            corridorHalfWidth: corridorLimit,
            curvature: futureSample.curvature,
            futureTimeMs: 0,
            lateral: futureSample.lateral.clone(),
            lateralOffset: stabilizingOffset,
            point: futureSample.point.clone(),
            projectedSpeed,
            segmentType: futureSample.segmentType,
            signedCurvature: futureSample.signedCurvature,
            speedMode: "coast",
            tangent: futureSample.tangent.clone(),
            targetSpeed: 0,
            worldPoint,
        };
        let safeSpeed = getSampleSpeedLimit(
            speedSample,
            previousSample,
            plannerConfig,
            profile,
            projectedSpeed,
        );
        let overspeedRisk = clamp01((projectedSpeed - safeSpeed) / 0.14);
        let outerEdgeRisk = futureSample.cornerSign !== 0 &&
            Math.sign(stabilizingOffset) === Math.sign(futureSample.cornerSign) ?
            0.18 :
            0;
        highestRisk = Math.max(
            highestRisk,
            clamp01((utilization - 0.7) / 0.3 + overspeedRisk * 0.75 + outerEdgeRisk),
        );
        previousSample = speedSample;
    }

    return highestRisk;
};

const getRacecraftReward = (
    track: Track,
    sampleArcLength: number,
    lateralOffset: number,
    targetContext: PlannerTargetContext,
    weights: PlannerWeights,
): { intent?: NpcPlannerIntent; reward: number } => {
    if (targetContext.isRecovering) {
        return {
            intent: {
                mode: "recover",
                targetLateralOffset: targetContext.recoveryCenterOffset,
            },
            reward: weights.recoveryBias *
                (1 - Math.min(Math.abs(lateralOffset - targetContext.recoveryCenterOffset), 2.5) / 2.5),
        };
    }

    let bestReward = 0;
    let intent: NpcPlannerIntent | undefined;
    let compareOffset = (targetVehicle: PlannerTrafficState) =>
        getVehicleTrackProjection(track, targetVehicle.vehicle).lateralOffset;

    if (targetContext.draftTarget) {
        let targetOffset = compareOffset(targetContext.draftTarget);
        let alignment = 1 - clamp01(Math.abs(lateralOffset - targetOffset) / 3.2);
        let reward = alignment * weights.draftReward;
        if (reward > bestReward) {
            bestReward = reward;
            intent = {
                mode: "draft",
                targetId: targetContext.draftTarget.id,
                targetLateralOffset: targetOffset,
            };
        }
    }

    if (targetContext.overtakeTarget) {
        let targetOffset = compareOffset(targetContext.overtakeTarget);
        let sideOffset = Math.sign(targetOffset - targetContext.selfLateralOffset) || 1;
        let separation = Math.abs(lateralOffset - targetOffset);
        let reward = clamp01((separation - 0.6) / 1.8) * weights.overtakeReward;
        if (reward > bestReward) {
            bestReward = reward;
            intent = {
                mode: "overtake",
                targetId: targetContext.overtakeTarget.id,
                targetLateralOffset: targetOffset + sideOffset * 1.2,
            };
        }
    }

    if (targetContext.blockTarget) {
        let targetOffset = compareOffset(targetContext.blockTarget);
        let alignment = 1 - clamp01(Math.abs(lateralOffset - targetOffset) / 2.4);
        let reward = alignment * weights.blockReward;
        if (reward > bestReward) {
            bestReward = reward;
            intent = {
                mode: "block",
                targetId: targetContext.blockTarget.id,
                targetLateralOffset: targetOffset,
            };
        }
    }

    if (targetContext.attackTarget) {
        let targetOffset = compareOffset(targetContext.attackTarget);
        let lateralPressure = 1 - clamp01(Math.abs(lateralOffset - targetOffset) / 1.8);
        let futureDistance = Math.abs(
            track.getSignedArcDistance(
                sampleArcLength,
                getVehicleTrackProjection(track, targetContext.attackTarget.vehicle).arcLength,
            ),
        );
        let proximity = 1 - clamp01(futureDistance / 6);
        let cornerSuppression = targetContext.futureContext.segmentType === "hairpin" ? 0 : 1;
        let reward = lateralPressure * proximity * weights.attackReward * cornerSuppression;
        if (reward > bestReward) {
            bestReward = reward;
            intent = {
                mode: "attack",
                targetId: targetContext.attackTarget.id,
                targetLateralOffset: targetOffset,
            };
        }
    }

    return { intent, reward: bestReward };
};

const buildTrajectorySamples = (
    node: PlannerNode,
): Array<PlannedTrajectorySample> => node.samples.map((sample) => ({
    ...sample,
    lateral: sample.lateral.clone(),
    point: sample.point.clone(),
    tangent: sample.tangent.clone(),
    worldPoint: sample.worldPoint.clone(),
}));

const getSampleSpeedLimit = (
    sample: PlannedTrajectorySample,
    previous: PlannedTrajectorySample | undefined,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    profile: PlannerSkillProfile,
    maxSpeed: number,
): number => {
    let segmentDistance = Math.max(
        previous ? sample.worldPoint.distanceTo(previous.worldPoint) : plannerConfig.minSegmentDistance,
        plannerConfig.minSegmentDistance,
    );
    let lateralRate = previous ?
        Math.abs(sample.lateralOffset - previous.lateralOffset) / segmentDistance :
        0;
    let curvatureDemand = Math.abs(sample.signedCurvature) +
        lateralRate * 0.16 +
        sample.curvature * 0.48;
    let baseSpeedLimit = Math.sqrt(
        plannerConfig.maxLateralAcceleration /
        Math.max(curvatureDemand, 0.0008),
    ) * profile.cornerConfidence;
    let segmentFloor = sample.segmentType === "hairpin" ?
        plannerConfig.heavyCornerSpeedFloor :
        plannerConfig.mediumCornerSpeedFloor;
    let corridorPressure = clamp01(
        Math.abs(sample.lateralOffset) /
        Math.max(sample.corridorHalfWidth, 0.0001),
    );
    let corridorBuffer = 1 - corridorPressure * 0.24;
    let cornerTypeScale = sample.segmentType === "hairpin" ?
        0.84 :
        sample.segmentType === "corner" ?
            0.9 :
            sample.segmentType === "sweeper" ?
                0.96 :
                1;
    return THREE.MathUtils.clamp(
        Math.min(maxSpeed, baseSpeedLimit * corridorBuffer * cornerTypeScale),
        segmentFloor,
        maxSpeed,
    );
};

const getLookAheadSafeSpeed = (
    track: Track,
    arcLength: number,
    lateralOffset: number,
    previewDistance: number,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    profile: PlannerSkillProfile,
    vehicle: Vehicle,
): number => {
    let maxSpeed = vehicle.getEffectiveMaxSpeed() * plannerConfig.plannerMaxSpeedSafety;
    let safeSpeed = maxSpeed;
    let previousSample: PlannedTrajectorySample | undefined;

    for (let step = 1; step <= plannerConfig.brakingLookAheadSamples; step++) {
        let sampleArcLength = arcLength + previewDistance * (step / plannerConfig.brakingLookAheadSamples);
        let planningSample = track.samplePlanningAtArcLength(sampleArcLength);
        let worldPoint = planningSample.point.clone().add(
            planningSample.lateral.clone().multiplyScalar(lateralOffset),
        );
        let sample: PlannedTrajectorySample = {
            arcLength: planningSample.arcLength,
            corridorHalfWidth: planningSample.corridorHalfWidth,
            curvature: planningSample.curvature,
            futureTimeMs: 0,
            lateral: planningSample.lateral.clone(),
            lateralOffset,
            point: planningSample.point.clone(),
            segmentType: planningSample.segmentType,
            signedCurvature: planningSample.signedCurvature,
            speedMode: "coast",
            projectedSpeed: maxSpeed,
            tangent: planningSample.tangent.clone(),
            targetSpeed: 0,
            worldPoint,
        };
        safeSpeed = Math.min(
            safeSpeed,
            getSampleSpeedLimit(sample, previousSample, plannerConfig, profile, maxSpeed),
        );
        previousSample = sample;
    }

    return safeSpeed;
};

const isCandidateViable = (
    track: Track,
    vehicle: Vehicle,
    arcLength: number,
    targetOffset: number,
    corridorLimit: number,
    segmentDistance: number,
    projectedSpeed: number,
    lateralVelocity: number,
    controlDemand: number,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    profile: PlannerSkillProfile,
    guardianMode: boolean,
): boolean => {
    let safetyCorridor = corridorLimit * plannerConfig.hardCorridorMargin;
    if (Math.abs(targetOffset) > safetyCorridor)
        return false;

    if (!guardianMode && controlDemand > plannerConfig.viabilityControlDemandLimit)
        return false;

    let immediateSafeSpeed = getLookAheadSafeSpeed(
        track,
        arcLength,
        targetOffset,
        plannerConfig.viabilityPredictionWindow,
        plannerConfig,
        profile,
        vehicle,
    );
    let brakingBudget = segmentDistance *
        plannerConfig.maxBrakePerMeter *
        plannerConfig.brakingReserveFactor;
    let allowedEntrySpeed = immediateSafeSpeed + brakingBudget;
    if (projectedSpeed - allowedEntrySpeed > plannerConfig.maxOverspeedForViablePlan)
        return false;

    let projectedTrackRisk = evaluateProjectedTrackRisk(
        track,
        arcLength,
        targetOffset,
        lateralVelocity,
        projectedSpeed,
        plannerConfig,
        profile,
        guardianMode,
        guardianMode,
    );
    if (projectedTrackRisk > 0.56)
        return false;

    return true;
};

const solveSpeedEnvelope = (
    vehicle: Vehicle,
    samples: Array<PlannedTrajectorySample>,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    profile: PlannerSkillProfile,
): Array<number> => {
    if (!samples.length)
        return [];

    let maxSpeed = vehicle.getEffectiveMaxSpeed() * plannerConfig.plannerMaxSpeedSafety;
    let speeds = new Array(samples.length).fill(maxSpeed);

    for (let i = 0; i < samples.length; i++)
        speeds[i] = Math.min(
            getSampleSpeedLimit(
                samples[i],
                i > 0 ? samples[i - 1] : undefined,
                plannerConfig,
                profile,
                maxSpeed,
            ),
            Math.max(samples[i].projectedSpeed, plannerConfig.minRollingSpeed),
        );

    let currentSpeed = vehicle.velocity.length();
    speeds[0] = Math.min(
        Math.max(plannerConfig.minRollingSpeed, currentSpeed),
        speeds[0],
    );

    for (let i = samples.length - 2; i >= 0; i--) {
        let futureCurvature = Math.max(
            samples[i].curvature,
            samples[i + 1].curvature,
        );
        let futureSequencePressure = clamp01(futureCurvature * 8);
        speeds[i] *= THREE.MathUtils.lerp(1, 0.9, futureSequencePressure);
    }

    for (let i = 1; i < samples.length; i++) {
        let segmentDistance = Math.max(
            samples[i].worldPoint.distanceTo(samples[i - 1].worldPoint),
            plannerConfig.minSegmentDistance,
        );
        let accelerationGain = plannerConfig.plannerAccelerationScale * segmentDistance;
        speeds[i] = Math.min(speeds[i], speeds[i - 1] + accelerationGain);
    }

    for (let i = samples.length - 2; i >= 0; i--) {
        let segmentDistance = Math.max(
            samples[i + 1].worldPoint.distanceTo(samples[i].worldPoint),
            plannerConfig.minSegmentDistance,
        );
        let brakingCapacity = plannerConfig.maxBrakePerMeter *
            segmentDistance *
            plannerConfig.brakingReserveFactor;
        speeds[i] = Math.min(speeds[i], speeds[i + 1] + brakingCapacity);
    }

    for (let i = 1; i < samples.length; i++) {
        let segmentDistance = Math.max(
            samples[i].worldPoint.distanceTo(samples[i - 1].worldPoint),
            plannerConfig.minSegmentDistance,
        );
        let accelerationGain = plannerConfig.plannerAccelerationScale * segmentDistance;
        speeds[i] = Math.min(speeds[i], speeds[i - 1] + accelerationGain);
    }

    return speeds;
};

const convertPlanToControls = (
    vehicle: Vehicle,
    samples: Array<PlannedTrajectorySample>,
    speedPlan: Array<number>,
    previousSteer: number,
    profile: PlannerSkillProfile,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
    overspeedPressure: number,
    isRecovering: boolean,
): {
    cornerSeverity: number;
    controlDemand: number;
    corridorPressure: number;
    targetBrake: number;
    targetBrakeScale: number;
    targetLaneOffset: number;
    targetSpeed: number;
    targetSteer: number;
    targetSteerScale: number;
    targetThrottle: number;
} => {
    if (!samples.length) {
        return {
            cornerSeverity: 0,
            controlDemand: 0,
            corridorPressure: 0,
            targetBrake: plannerConfig.fallbackBrake,
            targetBrakeScale: 1,
            targetLaneOffset: 0,
            targetSpeed: vehicle.velocity.length(),
            targetSteer: 0,
            targetSteerScale: 1,
            targetThrottle: plannerConfig.fallbackThrottle,
        };
    }

    let previewIndex = Math.min(
        plannerConfig.targetSpeedLookAheadIndex,
        samples.length - 1,
    );
    let steerSample = samples[Math.min(1, samples.length - 1)];
    let lookAheadSample = samples[previewIndex];
    let toTarget = steerSample.worldPoint.clone().sub(vehicle.position);
    if (toTarget.lengthSq() < 0.0001)
        toTarget.copy(steerSample.tangent);
    toTarget.normalize();

    let currentDirection = vehicle.direction.clone().normalize();
    let angle = currentDirection.angleTo(toTarget);
    let sign = Math.sign(
        currentDirection.clone().cross(toTarget).dot(vehicle.hitbox?.up || new THREE.Vector3(0, 1, 0)),
    ) || 1;
    let feedforward = steerSample.signedCurvature * plannerConfig.steeringGain * 4.6;
    let targetSteer = THREE.MathUtils.clamp(
        (-angle * sign) / plannerConfig.steeringGain + feedforward,
        -1,
        1,
    );
    if (Math.sign(previousSteer) !== Math.sign(targetSteer) && Math.abs(previousSteer) > 0.35)
        targetSteer *= 0.72;

    let currentSpeed = vehicle.velocity.length();
    let immediateWindow = speedPlan.slice(
        0,
        Math.min(previewIndex + 2, speedPlan.length),
    );
    let immediateTargetSpeed = immediateWindow.length ?
        Math.min(...immediateWindow) :
        currentSpeed;
    let targetSpeed = THREE.MathUtils.lerp(
        immediateTargetSpeed,
        speedPlan[previewIndex] || currentSpeed,
        plannerConfig.speedLookAheadBlend * 0.55,
    );
    let speedError = targetSpeed - currentSpeed;
    let cornerSeverity = clamp01(
        steerSample.curvature * 10 +
        lookAheadSample.curvature * 8 +
        Math.abs(targetSteer) * 0.35,
    );
    let controlDemand = clamp01(
        Math.abs(targetSteer) * 0.55 +
        cornerSeverity * 0.35 +
        overspeedPressure * 0.5,
    );
    let corridorPressure = clamp01(
        Math.abs(steerSample.lateralOffset) /
        Math.max(steerSample.corridorHalfWidth, 0.0001),
    );
    let upcomingBrakeDemand = clamp01(
        (currentSpeed - immediateTargetSpeed) / 0.18,
    );
    let branchBrakeBias = steerSample.speedMode === "brake" ? 0.32 :
        steerSample.speedMode === "coast" ? 0.12 :
            0;

    let throttle = clamp01(
        plannerConfig.fallbackThrottle +
        speedError * plannerConfig.speedThrottleGain -
        cornerSeverity * 0.24 -
        upcomingBrakeDemand * 0.34 -
        branchBrakeBias,
    );
    let brake = clamp01(
        -speedError * plannerConfig.speedBrakeGain +
        cornerSeverity * plannerConfig.cornerBrakeScale * overspeedPressure +
        upcomingBrakeDemand * (0.36 + cornerSeverity * 0.22) +
        branchBrakeBias,
    );

    if (speedError < 0)
        throttle *= 1 - clamp01(-speedError * 0.75);
    if (speedError > 0)
        brake *= 1 - clamp01(speedError * 1.5);

    if (isRecovering) {
        throttle = Math.min(throttle, plannerConfig.recoveryThrottleCap);
        brake = Math.max(brake, 0.18 + corridorPressure * 0.3);
    }

    if (brake > 0.8)
        throttle = 0;
    else if (brake > 0.5)
        throttle = Math.min(throttle, 0.12);

    let rollingThrottleFloor = brake > 0.72 ?
        0 :
        cornerSeverity > 0.55 ?
            0.02 :
            plannerConfig.minRollingSpeed * 0.18;
    throttle = Math.max(throttle, rollingThrottleFloor);
    let steerAssist = 1 + cornerSeverity * 0.35 + controlDemand * 0.22;
    let brakeAssist = (
        1 + cornerSeverity * 0.25 + overspeedPressure * 0.42
    ) * plannerConfig.brakeExecutionScale;

    return {
        cornerSeverity,
        controlDemand,
        corridorPressure,
        targetBrake: clamp01(brake),
        targetBrakeScale: brakeAssist,
        targetLaneOffset: steerSample.lateralOffset,
        targetSpeed,
        targetSteer,
        targetSteerScale: steerAssist * profile.steerRecovery,
        targetThrottle: clamp01(throttle),
    };
};

const buildFallbackPlan = (
    track: Track,
    vehicle: Vehicle,
    trackArcLength: number,
    plannerConfig: BuildNpcTrajectoryPlanOptions["plannerConfig"],
): NpcTrajectoryPlan => {
    let sample = track.samplePlanningAtArcLength(trackArcLength);
    let worldPoint = sample.point.clone();
    return {
        controlDemand: 0.25,
        cornerSeverity: sample.curvature * 8,
        corridorPressure: 0,
        futureContext: track.getFutureTrackContext(
            trackArcLength,
            plannerConfig.previewExecutionDistance,
        ),
        isRecovering: true,
        pathPointIndex: sample.index,
        samples: [{
            arcLength: sample.arcLength,
            corridorHalfWidth: sample.corridorHalfWidth,
            curvature: sample.curvature,
            futureTimeMs: 0,
            lateral: sample.lateral.clone(),
            lateralOffset: 0,
            point: sample.point.clone(),
            segmentType: sample.segmentType,
            signedCurvature: sample.signedCurvature,
            speedMode: "brake",
            projectedSpeed: plannerConfig.minRollingSpeed,
            tangent: sample.tangent.clone(),
            targetSpeed: plannerConfig.minRollingSpeed,
            worldPoint,
        }],
        score: -Infinity,
        targetBrake: 1,
        targetBrakeScale: plannerConfig.emergencyBrakeExecutionScale,
        targetLaneOffset: 0,
        targetSpeed: plannerConfig.minRollingSpeed,
        targetSteer: 0,
        targetSteerScale: 1.1,
        targetThrottle: 0,
        trackArcLength,
    };
};

const buildNpcTrajectoryPlan = (
    options: BuildNpcTrajectoryPlanOptions,
): NpcTrajectoryPlan => {
    let {
        context,
        dt,
        pathPointIndex,
        previousLaneOffset,
        profile,
        previousSteer,
        previousSteerError,
        track,
        vehicle,
        plannerConfig,
    } = options;
    let currentTrack = track.worldToTrackPosition(vehicle.position, pathPointIndex);
    let futureContext = track.getFutureTrackContext(
        currentTrack.arcLength,
        plannerConfig.linkedCornerLookAhead,
    );
    let currentSpeed = vehicle.velocity.length();
    let speedRatio = vehicle.getSpeedRatio();
    let overspeedPressure = clamp01(
        currentSpeed / Math.max(vehicle.getEffectiveMaxSpeed(), 0.0001) -
        (1 - futureContext.maxCurvature * 1.8),
    );
    let recoveryState = getRecoveryState(
        track,
        vehicle,
        currentTrack.arcLength,
        previousSteer,
        previousSteerError,
        plannerConfig,
    );
    let weights = buildPlannerWeights(
        futureContext,
        overspeedPressure,
        recoveryState.isRecovering,
        profile,
        plannerConfig,
    );
    let targetContext = chooseRacecraftTargets(
        track,
        vehicle,
        currentTrack.arcLength,
        profile,
        context,
        plannerConfig,
        futureContext,
        recoveryState.isRecovering,
        recoveryState.recoveryCenterOffset,
    );
    let currentSample = track.samplePlanningAtArcLength(currentTrack.arcLength);
    let currentSafeSpeed = getLookAheadSafeSpeed(
        track,
        currentTrack.arcLength,
        currentTrack.lateralOffset,
        plannerConfig.guardianLookAheadDistance,
        plannerConfig,
        profile,
        vehicle,
    );
    let projectedTrackRisk = evaluateProjectedTrackRisk(
        track,
        currentTrack.arcLength,
        currentTrack.lateralOffset,
        0,
        currentSpeed,
        plannerConfig,
        profile,
        recoveryState.isRecovering,
        false,
    );
    let laneTargets = buildLaneTargets(
        track,
        currentSample,
        THREE.MathUtils.lerp(previousLaneOffset, currentTrack.lateralOffset, 0.5),
        targetContext,
        plannerConfig,
    );
    let horizonDistance = THREE.MathUtils.clamp(
        plannerConfig.horizonDistanceBase +
        currentSpeed * plannerConfig.horizonDistanceSpeedScale +
        futureContext.linkedCornerStrength * 24,
        plannerConfig.segmentDistanceMin * plannerConfig.segmentCount,
        plannerConfig.horizonDistanceMax,
    );
    let segmentDistance = THREE.MathUtils.clamp(
        plannerConfig.segmentDistanceMin +
        speedRatio * plannerConfig.segmentDistanceSpeedScale,
        plannerConfig.segmentDistanceMin,
        horizonDistance / plannerConfig.segmentCount,
    );
    let segmentCount = Math.max(
        4,
        Math.round(horizonDistance / Math.max(segmentDistance, 0.0001)),
    );
    let activeCorridorScale = recoveryState.isRecovering ?
        plannerConfig.cornerCorridorShrink :
        1;
    let currentCorridorPressure = Math.abs(currentTrack.lateralOffset) /
        Math.max(currentSample.corridorHalfWidth, 0.0001);
    let speedOvershoot = currentSpeed - currentSafeSpeed;
    let guardianMode = recoveryState.isRecovering ||
        speedOvershoot > plannerConfig.guardianOverspeedThreshold &&
        futureContext.segmentType !== "straight" ||
        overspeedPressure > plannerConfig.guardianOverspeedThreshold &&
        futureContext.segmentType !== "straight" ||
        projectedTrackRisk > 0.4 ||
        currentCorridorPressure > plannerConfig.guardianCorridorThreshold;
    let hardRecoveryMode = guardianMode && (
        speedOvershoot > plannerConfig.guardianFullBrakeOverspeed &&
        futureContext.segmentType !== "straight" ||
        projectedTrackRisk > plannerConfig.guardianFullBrakeTrackRisk ||
        currentCorridorPressure > 0.86
    );
    let initialNode: PlannerNode = {
        arcLength: currentTrack.arcLength,
        collisionRisk: 0,
        corridorPressure: clamp01(
            Math.abs(currentTrack.lateralOffset) /
            Math.max(currentSample.corridorHalfWidth, 0.0001),
        ),
        cumulativeCurvature: 0,
        futureTimeMs: 0,
        lateralOffset: currentTrack.lateralOffset,
        lateralVelocity: 0,
        samples: [],
        score: 0,
        projectedSpeed: currentSpeed,
        speedMode: hardRecoveryMode ? "brake" : "coast",
    };
    let frontier: Array<PlannerNode> = [initialNode];
    let maxPlannerSpeed = vehicle.getEffectiveMaxSpeed() * plannerConfig.plannerMaxSpeedSafety;

    for (let step = 0; step < segmentCount; step++) {
        let nextFrontier: Array<PlannerNode> = [];
        for (let node of frontier) {
            let baseArcLength = node.arcLength + segmentDistance;
            for (let laneTarget of laneTargets) {
                let planningSample = track.samplePlanningAtArcLength(baseArcLength);
                let localFutureContext = track.getFutureTrackContext(
                    planningSample.arcLength,
                    plannerConfig.previewExecutionDistance,
                );
                let corridorLimit = getCorridorLimit(
                    planningSample,
                    plannerConfig,
                    recoveryState.isRecovering,
                    guardianMode,
                ) * activeCorridorScale;
                let forceEmergencyBrake = hardRecoveryMode ||
                    planningSample.segmentType === "hairpin" &&
                    node.projectedSpeed > currentSafeSpeed + 0.08 ||
                    planningSample.segmentType === "corner" &&
                    projectedTrackRisk > 0.72;
                let targetOffset = THREE.MathUtils.clamp(
                    THREE.MathUtils.lerp(
                        node.lateralOffset,
                        hardRecoveryMode ?
                            currentTrack.lateralOffset * (1 - plannerConfig.recoveryTargetOffsetGain) :
                            laneTarget,
                        hardRecoveryMode ? 0.82 :
                            localFutureContext.segmentType === "straight" ? 0.62 : 0.48,
                    ),
                    -corridorLimit,
                    corridorLimit,
                );
                let worldPoint = planningSample.point.clone().add(
                    planningSample.lateral.clone().multiplyScalar(targetOffset),
                );
                let deltaOffset = targetOffset - node.lateralOffset;
                let speedModes = getSpeedModesForSample(
                    planningSample,
                    localFutureContext,
                    guardianMode,
                    forceEmergencyBrake,
                );
                for (let speedMode of speedModes) {
                    let projectedSpeed = projectSpeedForMode(
                        node.projectedSpeed,
                        segmentDistance,
                        speedMode,
                        localFutureContext,
                        plannerConfig,
                        maxPlannerSpeed,
                        forceEmergencyBrake,
                    );
                    let futureTimeMs = node.futureTimeMs +
                        (segmentDistance / Math.max(
                            projectedSpeed,
                            plannerConfig.minRollingSpeed,
                        )) * 16.67;
                    let collisionRisk = evaluateCollisionRisk(
                        track,
                        planningSample.arcLength,
                        worldPoint,
                        futureTimeMs,
                        targetContext.projectedVehicles,
                        plannerConfig,
                    );
                    let corridorPressure = clamp01(
                        Math.abs(targetOffset) /
                        Math.max(corridorLimit * plannerConfig.safetyMargin, 0.0001),
                    );
                    let controlDemand = clamp01(
                        Math.abs(deltaOffset) / Math.max(segmentDistance, 0.0001) * 0.8 +
                        planningSample.curvature * 8,
                    );
                    if (!isCandidateViable(
                        track,
                        vehicle,
                        planningSample.arcLength,
                        targetOffset,
                        corridorLimit,
                        segmentDistance,
                        projectedSpeed,
                        deltaOffset / Math.max(segmentDistance, 0.0001),
                        controlDemand,
                        plannerConfig,
                        profile,
                        guardianMode,
                    )) {
                        continue;
                    }
                    let cornerSpace = evaluateCornerSpacePenalty(
                        track,
                        planningSample.arcLength,
                        targetOffset,
                        targetContext,
                        plannerConfig,
                    );
                    if (cornerSpace.unsafe)
                        continue;
                    let { intent, reward } = getRacecraftReward(
                        track,
                        planningSample.arcLength,
                        targetOffset,
                        targetContext,
                        weights,
                    );
                    let linkedCornerDesiredOffset = -localFutureContext.cornerSign *
                        corridorLimit * plannerConfig.cornerEntryOffsetScale * 0.9;
                    let linkedExitOffset = localFutureContext.linkedCornerSign *
                        corridorLimit * plannerConfig.cornerExitOffsetScale;
                    let lineReferenceOffset = THREE.MathUtils.lerp(
                        linkedCornerDesiredOffset,
                        linkedExitOffset,
                        localFutureContext.linkedCornerStrength * 0.55,
                    );
                    let lineReward = (1 - clamp01(
                        Math.abs(targetOffset - lineReferenceOffset) /
                        Math.max(corridorLimit * 1.15, 0.0001),
                    )) * (
                        planningSample.curvature * 1.2 +
                        localFutureContext.linkedCornerStrength * 0.3 +
                        localFutureContext.straightDistance * 0.01
                    );
                    let progressReward = segmentDistance * weights.progressReward;
                    let smoothnessPenalty = Math.abs(deltaOffset) * weights.smoothnessPenalty;
                    let controlPenalty = controlDemand * weights.controlPenalty;
                    let trackPenalty = corridorPressure * weights.trackSafetyPenalty;
                    let collisionPenalty = (collisionRisk + cornerSpace.penalty * 0.8) *
                        weights.collisionPenalty;
                    let recoveryReward = recoveryState.isRecovering ?
                        weights.recoveryBias * (1 - corridorPressure) :
                        0;
                    let speedModePenalty = speedMode === "brake" ?
                        (
                            localFutureContext.segmentType === "straight" &&
                            corridorPressure < 0.42 &&
                            collisionRisk < 0.22
                        ) ?
                            plannerConfig.speedModeChangePenalty * 1.35 :
                            plannerConfig.speedModeChangePenalty * 0.42 :
                        speedMode === "coast" ?
                            localFutureContext.segmentType === "straight" ?
                                plannerConfig.speedModeChangePenalty * 0.32 :
                                plannerConfig.speedModeChangePenalty * 0.18 :
                            0;
                    let throttleReward = speedMode === "throttle" ?
                        localFutureContext.segmentType === "straight" ?
                            0.08 + Math.max(0, 0.04 - collisionRisk * 0.05) :
                        localFutureContext.segmentType === "sweeper" &&
                            corridorPressure < 0.55 &&
                            projectedSpeed <= currentSafeSpeed + 0.04 ?
                            0.025 :
                            0 :
                        0;
                    let modeTransitionPenalty = speedMode !== node.speedMode ?
                        plannerConfig.speedModeChangePenalty :
                        0;
                    let nodeScore = node.score +
                        progressReward +
                        reward +
                        lineReward +
                        recoveryReward +
                        throttleReward -
                        smoothnessPenalty -
                        controlPenalty -
                        trackPenalty -
                        collisionPenalty -
                        speedModePenalty -
                        modeTransitionPenalty;

                    let sample: PlannedTrajectorySample = {
                        arcLength: planningSample.arcLength,
                        corridorHalfWidth: corridorLimit,
                        curvature: planningSample.curvature,
                        futureTimeMs,
                        lateral: planningSample.lateral.clone(),
                        lateralOffset: targetOffset,
                        point: planningSample.point.clone(),
                        projectedSpeed,
                        segmentType: planningSample.segmentType,
                        signedCurvature: planningSample.signedCurvature,
                        speedMode,
                        tangent: planningSample.tangent.clone(),
                        targetSpeed: 0,
                        worldPoint,
                    };
                    nextFrontier.push({
                        arcLength: planningSample.arcLength,
                        collisionRisk: Math.max(node.collisionRisk, collisionRisk),
                        corridorPressure: Math.max(node.corridorPressure, corridorPressure),
                        cumulativeCurvature: node.cumulativeCurvature + planningSample.curvature,
                        futureTimeMs,
                        lateralOffset: targetOffset,
                        lateralVelocity: deltaOffset / Math.max(segmentDistance, 0.0001),
                        parent: node,
                        projectedSpeed,
                        samples: [...node.samples, sample],
                        score: nodeScore + (intent ? 0.01 : 0),
                        speedMode,
                    });
                }
            }
        }

        nextFrontier.sort((first, second) => second.score - first.score);
        frontier = nextFrontier.slice(0, plannerConfig.beamWidth);
        if (!frontier.length)
            break;
    }

    let bestNode = frontier[0];
    if (!bestNode)
        return buildFallbackPlan(track, vehicle, currentTrack.arcLength, plannerConfig);

    let samples = buildTrajectorySamples(bestNode);
    let speedPlan = solveSpeedEnvelope(vehicle, samples, plannerConfig, profile);
    for (let i = 0; i < samples.length; i++)
        samples[i].targetSpeed = speedPlan[i] || currentSpeed;

    let controls = convertPlanToControls(
        vehicle,
        samples,
        speedPlan,
        previousSteer,
        profile,
        plannerConfig,
        overspeedPressure,
        guardianMode,
    );
    if (guardianMode) {
        controls.targetBrake = Math.max(
            controls.targetBrake,
            plannerConfig.guardianBrakeFloor +
            controls.corridorPressure * 0.2,
        );
        controls.targetThrottle = Math.min(
            controls.targetThrottle,
            plannerConfig.recoveryThrottleCap,
        );
        controls.targetSteer *= plannerConfig.emergencySteerDamping;
        controls.targetBrakeScale *= plannerConfig.emergencyBrakeScale;
    }
    if (hardRecoveryMode) {
        let recenterSample = track.samplePlanningAtArcLength(currentTrack.arcLength);
        let recenterPoint = recenterSample.point.clone().add(
            recenterSample.lateral.clone().multiplyScalar(
                THREE.MathUtils.clamp(
                    recoveryState.recoveryCenterOffset,
                    -recenterSample.corridorHalfWidth * 0.18,
                    recenterSample.corridorHalfWidth * 0.18,
                ),
            ),
        );
        let recenterDirection = recenterPoint.clone().sub(vehicle.position);
        if (recenterDirection.lengthSq() > 0.0001) {
            recenterDirection.normalize();
            let currentDirection = vehicle.direction.clone().normalize();
            let angle = currentDirection.angleTo(recenterDirection);
            let sign = Math.sign(
                currentDirection.clone()
                    .cross(recenterDirection)
                    .dot(vehicle.hitbox?.up || new THREE.Vector3(0, 1, 0)),
            ) || 1;
            controls.targetSteer = THREE.MathUtils.clamp(
                (-angle * sign) / Math.max(plannerConfig.steeringGain * 0.7, 0.0001),
                -1,
                1,
            );
        }
        controls.targetThrottle = 0;
        controls.targetBrake = 1;
        controls.targetBrakeScale = Math.max(
            controls.targetBrakeScale * plannerConfig.emergencyBrakeExecutionScale,
            plannerConfig.emergencyBrakeExecutionScale,
        );
    }
    let leadingSample = samples[Math.min(1, samples.length - 1)] || samples[0];
    let intent = getRacecraftReward(
        track,
        leadingSample?.arcLength || currentTrack.arcLength,
        leadingSample?.lateralOffset || 0,
        targetContext,
        weights,
    ).intent;

    return {
        controlDemand: controls.controlDemand,
        cornerSeverity: controls.cornerSeverity,
        corridorPressure: Math.max(bestNode.corridorPressure, controls.corridorPressure),
        futureContext,
        intent: guardianMode ? { mode: "recover", targetLateralOffset: 0 } : intent,
        isRecovering: guardianMode,
        pathPointIndex: leadingSample?.point ?
            track.findNearestPlanningIndex(leadingSample.point, currentTrack.index) :
            currentTrack.index,
        samples,
        score: bestNode.score,
        targetBrake: controls.targetBrake,
        targetBrakeScale: controls.targetBrakeScale,
        targetLaneOffset: controls.targetLaneOffset,
        targetSpeed: controls.targetSpeed,
        targetSteer: controls.targetSteer,
        targetSteerScale: controls.targetSteerScale,
        targetThrottle: controls.targetThrottle,
        trackArcLength: currentTrack.arcLength,
    };
};

export {
    BuildNpcTrajectoryPlanOptions,
    NpcTrajectoryPlan,
    PlannedTrajectorySample,
    PlannerDraftRelation,
    PlannerSkillProfile,
    PlannerTrafficState,
    buildNpcTrajectoryPlan,
};
