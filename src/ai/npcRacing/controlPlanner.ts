import {
    EdgeProjection,
    NpcControlPlan,
    NpcPlanningConfig,
    NpcRacecraftIntent,
    NpcRouteState,
    RaceVehicleSnapshot,
    TrackGraph,
    TrackGraphEdgeSample,
} from "./types";
import { buildAssistScalars } from "./assistModel";
import { dotNpc } from "./math";
import {
    getConnector,
    getEdge,
    getRouteSamplesAhead,
    getRouteTargetSample,
} from "./trackGraph";

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));
const branchEntryLookAheadDistance = 24;
const branchEntryCommitDistance = 72;
const parallelSplitEntryCommitDistance = 120;
const professionalRecoveryThreshold = 0.72;
const professionalRecoveryFullThreshold = 0.92;

type ControlCandidate = {
    brake: number;
    corridorPenalty: number;
    desiredOffset: number;
    label: string;
    progressReward: number;
    riskPenalty: number;
    score: number;
    steer: number;
    throttle: number;
};

type BranchTransitionProfile = {
    distanceToBranch?: number;
    isParallelSplit: boolean;
    lateralDelta: number;
};

const isApproachingCommittedBranch = (
    routeState: NpcRouteState,
    projection: EdgeProjection | undefined,
): boolean => !!(
    projection &&
    routeState.committedBranchEdgeId &&
    projection.edgeId !== routeState.committedBranchEdgeId &&
    routeState.route.edgeIds.includes(routeState.committedBranchEdgeId)
);

const isApproachingCommittedConnector = (
    routeState: NpcRouteState,
    projection: EdgeProjection | undefined,
): boolean => !!(
    projection &&
    routeState.committedConnector &&
    projection.edgeId === routeState.committedConnector.fromEdgeId &&
    projection.edgeId !== routeState.committedConnector.toEdgeId
);

const getTargetSample = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    projection?: EdgeProjection,
) => getRouteTargetSample(
    graph,
    routeState,
    projection,
    18,
);

const getDistanceToRouteEdgeStart = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    projection: EdgeProjection | undefined,
    targetEdgeId: string | undefined,
): number | undefined => {
    if (!projection || !targetEdgeId)
        return undefined;

    let projectionIndex = routeState.route.edgeIds.findIndex((edgeId) =>
        edgeId === projection.edgeId,
    );
    let targetIndex = routeState.route.edgeIds.findIndex((edgeId) =>
        edgeId === targetEdgeId,
    );
    if (projectionIndex < 0 || targetIndex < 0 || targetIndex < projectionIndex)
        return undefined;

    if (projection.edgeId === targetEdgeId)
        return 0;

    let distance = 0;
    for (let index = projectionIndex; index < targetIndex; index++) {
        let edgeId = routeState.route.edgeIds[index];
        let edge = getEdge(graph, edgeId);
        if (!edge)
            continue;

        distance += index === projectionIndex ?
            Math.max(edge.length - projection.distanceOnEdge, 0) :
            edge.length;
    }

    return distance;
};

const analyzeSpeedEnvelope = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    vehicle: RaceVehicleSnapshot,
    assistGrip: number,
) => {
    let lookAheadDistance = clamp(44 + vehicle.speed * 72, 46, 104);
    let samples = getRouteSamplesAhead(
        graph,
        routeState,
        routeState.projection,
        lookAheadDistance,
        34,
    );
    let minSafeSpeed = 1;
    let maxCurvature = 0;
    let firstHeavyCornerDistance = Infinity;
    let segmentType: "corner" | "hairpin" | "straight" | "sweeper" = "straight";

    for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];
        maxCurvature = Math.max(maxCurvature, sample.curvature);
        minSafeSpeed = Math.min(
            minSafeSpeed,
            clamp(sample.safeSpeedHint * clamp(assistGrip, 1, 1.24), 0.24, 1.04),
        );
        if (
            firstHeavyCornerDistance === Infinity &&
            (sample.segmentType === "corner" || sample.segmentType === "hairpin")
        ) {
            firstHeavyCornerDistance = Math.max(
                4,
                i / Math.max(samples.length, 1) * lookAheadDistance,
            );
            segmentType = sample.segmentType;
        }
        if (sample.segmentType === "hairpin") {
            segmentType = "hairpin";
        } else if (sample.segmentType === "corner" && segmentType !== "hairpin") {
            segmentType = "corner";
        } else if (sample.segmentType === "sweeper" && segmentType === "straight") {
            segmentType = "sweeper";
        }
    }

    let cornerArrivalPressure = firstHeavyCornerDistance === Infinity ?
        0 :
        clamp(1 - firstHeavyCornerDistance / lookAheadDistance, 0, 1);
    let targetSpeed = clamp(
        minSafeSpeed - cornerArrivalPressure * (segmentType === "hairpin" ? 0.08 : 0.035),
        segmentType === "hairpin" ? 0.24 : 0.34,
        1.02,
    );

    return {
        cornerArrivalPressure,
        maxCurvature,
        segmentType,
        targetSpeed,
    };
};

const getRouteLaneTarget = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    projection: EdgeProjection | undefined,
    currentSample: TrackGraphEdgeSample | undefined,
    lookAheadDistance: number,
): number => {
    if (!projection || !currentSample)
        return 0;

    let routeTargetSample = getRouteTargetSample(
        graph,
        routeState,
        projection,
        lookAheadDistance,
    );
    if (!routeTargetSample)
        return 0;

    let routeOffsetDelta = dotNpc(
        {
            x: routeTargetSample.point.x - projection.point.x,
            y: routeTargetSample.point.y - projection.point.y,
            z: routeTargetSample.point.z - projection.point.z,
        },
        currentSample.lateral,
    );
    return clamp(
        projection.lateralOffset + routeOffsetDelta,
        routeTargetSample.legalLateralRange.min,
        routeTargetSample.legalLateralRange.max,
    );
};

const getConnectorLaneTarget = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    currentHalfWidth: number,
): number | undefined => {
    let connectorId = routeState.committedConnector?.connectorId || routeState.activeConnectorId;
    let connector = getConnector(graph, connectorId);
    if (!connector)
        return undefined;

    let firstWindow = connector.windows[0];
    if (!firstWindow)
        return undefined;

    if (routeState.projection?.edgeId === connector.fromEdgeId) {
        return clamp(
            firstWindow.fromLateralRange.min,
            -currentHalfWidth,
            currentHalfWidth,
        );
    }

    return clamp(
        firstWindow.toLateralRange.max,
        -currentHalfWidth,
        currentHalfWidth,
    );
};

const getCommittedBranchLaneTarget = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    projection: EdgeProjection | undefined,
    currentSample: TrackGraphEdgeSample | undefined,
): {
    laneTarget?: number;
    profile: BranchTransitionProfile;
} => {
    let defaultProfile: BranchTransitionProfile = {
        isParallelSplit: false,
        lateralDelta: 0,
    };
    if (!projection || !currentSample || !routeState.committedBranchEdgeId)
        return { profile: defaultProfile };
    if (projection.edgeId === routeState.committedBranchEdgeId)
        return { profile: defaultProfile };

    let distanceToBranch = getDistanceToRouteEdgeStart(
        graph,
        routeState,
        projection,
        routeState.committedBranchEdgeId,
    );
    let branchEdge = getEdge(graph, routeState.committedBranchEdgeId);
    let branchSample = branchEdge?.samples[Math.min(
        3,
        Math.max((branchEdge?.samples.length || 1) - 1, 0),
    )];
    if (!branchSample)
        return { profile: defaultProfile };

    let branchOffsetDelta = dotNpc(
        {
            x: branchSample.point.x - projection.point.x,
            y: branchSample.point.y - projection.point.y,
            z: branchSample.point.z - projection.point.z,
        },
        currentSample.lateral,
    );
    let branchHeadingDot = clamp(
        dotNpc(currentSample.tangent, branchSample.tangent),
        -1,
        1,
    );
    let branchHeadingDelta = Math.acos(branchHeadingDot);
    let isParallelSplit = branchHeadingDelta <= 0.12 &&
        (branchSample.segmentType === "straight" || branchSample.segmentType === "sweeper");
    let entryDistance = isParallelSplit ?
        parallelSplitEntryCommitDistance :
        branchEntryCommitDistance;
    let profile: BranchTransitionProfile = {
        distanceToBranch,
        isParallelSplit,
        lateralDelta: branchOffsetDelta,
    };
    if (distanceToBranch === undefined || distanceToBranch > entryDistance)
        return { profile };

    let branchBias = clamp(1 - distanceToBranch / entryDistance, 0, 1);
    let branchBlend = isParallelSplit ?
        (0.08 + branchBias * 0.28) :
        (0.18 + branchBias * 0.32);
    let branchClampScale = isParallelSplit ? 0.42 : 0.58;
    return {
        laneTarget: clamp(
            projection.lateralOffset + branchOffsetDelta * branchBlend,
            -currentSample.corridorHalfWidth * branchClampScale,
            currentSample.corridorHalfWidth * branchClampScale,
        ),
        profile,
    };
};

const scoreCandidate = (
    candidate: Omit<ControlCandidate, "score">,
): ControlCandidate => ({
    ...candidate,
    score: candidate.progressReward - candidate.corridorPenalty - candidate.riskPenalty,
});

const buildControlCandidates = (
    graph: TrackGraph,
    vehicle: RaceVehicleSnapshot,
    routeState: NpcRouteState,
    intent: NpcRacecraftIntent,
    currentSample: TrackGraphEdgeSample | undefined,
    projection: EdgeProjection | undefined,
    speedEnvelope: ReturnType<typeof analyzeSpeedEnvelope>,
    assistGrip: number,
): Array<ControlCandidate> => {
    if (!currentSample || !projection)
        return [];

    let corridorHalfWidth = currentSample.corridorHalfWidth;
    let branchEntryPhase = isApproachingCommittedBranch(routeState, projection);
    let connectorEntryPhase = isApproachingCommittedConnector(routeState, projection);
    let branchTransition = getCommittedBranchLaneTarget(
        graph,
        routeState,
        projection,
        currentSample,
    );
    let branchLaneTarget = branchTransition.laneTarget;
    let parallelSplitEntry = branchEntryPhase && branchTransition.profile.isParallelSplit;
    let routeLookAheadDistance = connectorEntryPhase ?
        28 :
        parallelSplitEntry ?
            18 :
        branchEntryPhase ?
            branchEntryLookAheadDistance :
            22;
    let routeLaneTarget = getRouteLaneTarget(
        graph,
        routeState,
        projection,
        currentSample,
        routeLookAheadDistance,
    );
    let connectorLaneTarget = getConnectorLaneTarget(
        graph,
        routeState,
        corridorHalfWidth,
    );
    let preferredLaneTarget = branchLaneTarget ??
        connectorLaneTarget ??
        intent.targetLaneOffset ??
        routeLaneTarget;
    let tacticalLaneTarget = connectorLaneTarget ?? preferredLaneTarget;
    let targetOffsets = [
        clamp(routeLaneTarget, -corridorHalfWidth * 0.8, corridorHalfWidth * 0.8),
        clamp(tacticalLaneTarget, -corridorHalfWidth * 0.92, corridorHalfWidth * 0.92),
        clamp(projection.lateralOffset * 0.35, -corridorHalfWidth * 0.55, corridorHalfWidth * 0.55),
    ];
    if (branchEntryPhase && branchLaneTarget !== undefined) {
        targetOffsets[0] = clamp(
            branchLaneTarget,
            -corridorHalfWidth * 0.94,
            corridorHalfWidth * 0.94,
        );
        targetOffsets[1] = clamp(
            tacticalLaneTarget,
            -corridorHalfWidth * 0.94,
            corridorHalfWidth * 0.94,
        );
    }
    let speedGap = speedEnvelope.targetSpeed - vehicle.speed;
    let lateralUsage = Math.abs(projection.lateralOffset) /
        Math.max(corridorHalfWidth, 0.001);

    return targetOffsets.map((desiredOffset, index) => {
        let laneError = desiredOffset - projection.lateralOffset;
        let entryGain = connectorEntryPhase ?
            0.26 :
            parallelSplitEntry ?
                0.16 :
            branchEntryPhase ?
                0.3 :
                0.34;
        let centerRecovery = lateralUsage > 0.62 ?
            -projection.lateralOffset * 0.22 :
            0;
        let curveFeedForward = (currentSample.signedCurvature || 0) *
            (connectorEntryPhase ? 2.2 : parallelSplitEntry ? 0.8 : branchEntryPhase ? 2.1 : 3.6);
        let steerLimit = connectorEntryPhase ?
            0.42 :
            parallelSplitEntry ?
                0.26 :
            branchEntryPhase ?
                0.44 :
                0.92;
        let steer = clamp(
            laneError * entryGain + centerRecovery + curveFeedForward,
            -steerLimit,
            steerLimit,
        );
        let corridorPenalty = clamp(
            Math.abs(desiredOffset) / Math.max(corridorHalfWidth, 0.001),
            0,
            1,
        ) * (connectorEntryPhase ? 0.48 : 0.36);
        let riskPenalty = clamp(
            Math.abs(steer) * 0.22 +
            Math.max(0, vehicle.speed - speedEnvelope.targetSpeed) * 2.8,
            0,
            1.4,
        );
        let throttleBase = speedEnvelope.segmentType === "hairpin" ?
            0.18 :
            speedEnvelope.segmentType === "corner" ?
                0.3 :
                0.7;
        let throttle = clamp(
            throttleBase + speedGap * 2.1 - riskPenalty * 0.18,
            0,
            1,
        );
        let brake = clamp(
            Math.max(0, -speedGap) * 2.6 +
            (connectorEntryPhase ? 0.08 : 0) +
            (branchEntryPhase && !parallelSplitEntry ? clamp(
                Math.abs(laneError) / Math.max(corridorHalfWidth * 0.9, 0.001),
                0,
                1,
            ) * 0.18 : 0) +
            Math.max(0, lateralUsage - 0.72) * 0.4,
            0,
            speedEnvelope.segmentType === "hairpin" ? 0.9 : 0.72,
        );
        let progressReward = connectorEntryPhase && index === 1 ?
            0.18 :
            branchEntryPhase && index === 1 ?
                0.2 :
                branchEntryPhase && index === 0 ?
                    0.22 :
                index === 0 ?
                    0.12 :
                    0.08;

        return scoreCandidate({
            brake,
            corridorPenalty,
            desiredOffset,
            label: index === 0 ? "route" : index === 1 ? "tactical" : "stability",
            progressReward,
            riskPenalty,
            steer,
            throttle,
        });
    });
};

const selectBestCandidate = (
    candidates: Array<ControlCandidate>,
): ControlCandidate | undefined => candidates
    .sort((first, second) => second.score - first.score)[0];

const planControl = (
    graph: TrackGraph,
    vehicle: RaceVehicleSnapshot,
    routeState: NpcRouteState,
    intent: NpcRacecraftIntent,
    config: NpcPlanningConfig,
    snapshotId: number,
    nowMs: number,
): NpcControlPlan => {
    let projection = routeState.projection;
    let branchEntryPhase = isApproachingCommittedBranch(routeState, projection);
    let connectorEntryPhase = isApproachingCommittedConnector(routeState, projection);
    let sample = getTargetSample(graph, routeState, projection);
    let edge = projection ? getEdge(graph, projection.edgeId) : undefined;
    let isOnCommittedBranch = !!(
        projection &&
        routeState.committedBranchEdgeId &&
        projection.edgeId === routeState.committedBranchEdgeId
    );
    let currentSample = projection && edge ?
        edge.samples[projection.sampleIndex] :
        sample;
    let corridorHalfWidth = currentSample?.corridorHalfWidth || 2.4;
    let lateralUsage = projection ?
        Math.abs(projection.lateralOffset) / Math.max(corridorHalfWidth, 0.001) :
        0;
    let isLaunch = intent.mode === "launch" &&
        nowMs <= config.start.fullThrottleMs &&
        (!sample || sample.segmentType === "straight" || sample.segmentType === "sweeper");
    let isRecover = lateralUsage > professionalRecoveryThreshold || intent.mode === "recover";
    let assist = buildAssistScalars(
        isRecover ? { mode: "recover" } : intent,
        config.assist,
    );
    let speedEnvelope = analyzeSpeedEnvelope(graph, routeState, vehicle, assist.grip);
    let overSpeed = vehicle.speed - speedEnvelope.targetSpeed;
    let overSpeedPressure = clamp(overSpeed / 0.22, 0, 1);
    let cornerPressure = clamp(
        speedEnvelope.maxCurvature * 7.5 + speedEnvelope.cornerArrivalPressure * 0.55,
        0,
        1,
    );
    let throttle = isLaunch ? 1 : Math.max(config.start.minThrottle, 0.58);
    let brake = 0;
    let steer = 0;
    let branchTransitionProfile: BranchTransitionProfile = {
        isParallelSplit: false,
        lateralDelta: 0,
    };

    if (currentSample && projection) {
        branchTransitionProfile = getCommittedBranchLaneTarget(
            graph,
            routeState,
            projection,
            currentSample,
        ).profile;
        let candidates = buildControlCandidates(
            graph,
            vehicle,
            routeState,
            intent,
            currentSample,
            projection,
            speedEnvelope,
            assist.grip,
        );
        let bestCandidate = selectBestCandidate(candidates);
        if (bestCandidate) {
            throttle = bestCandidate.throttle;
            brake = bestCandidate.brake;
            steer = bestCandidate.steer;
        }

        if (!isLaunch) {
            throttle = clamp(
                throttle - cornerPressure * 0.08,
                0,
                1,
            );
            brake = clamp(
                brake + overSpeedPressure * 0.18,
                0,
                speedEnvelope.segmentType === "hairpin" ? 0.92 : 0.74,
            );
        }

        if (branchEntryPhase) {
            if (branchTransitionProfile.isParallelSplit) {
                if (overSpeedPressure < 0.2 && lateralUsage < 0.7)
                    throttle = Math.max(throttle, 0.86);
            } else {
                throttle = Math.min(throttle, 0.72 - cornerPressure * 0.12);
                brake = Math.max(
                    brake,
                    0.08 + Math.max(0, lateralUsage - 0.48) * 0.18,
                );
            }
        }

        if (
            (intent.mode === "draft" || intent.mode === "overtake") &&
            overSpeedPressure < 0.18 &&
            lateralUsage < 0.7 &&
            !connectorEntryPhase
        ) {
            throttle = Math.max(throttle, intent.mode === "draft" ? 0.84 : 0.8);
        }
    }

    if (isRecover) {
        throttle = lateralUsage > professionalRecoveryFullThreshold ? 0 : 0.26;
        brake = clamp(
            0.42 + Math.max(0, lateralUsage - 0.62) * 0.95 + overSpeedPressure * 0.34,
            0.44,
            1,
        );
        if (projection) {
            let rawRecoveryTargetOffset = getRouteLaneTarget(
                graph,
                routeState,
                projection,
                currentSample,
                branchEntryPhase || connectorEntryPhase ?
                    Math.max(config.routing.targetLookAheadDistance, 24) :
                    Math.max(config.routing.targetLookAheadDistance * 0.7, 12),
            );
            let centerBias = clamp(0.74 + Math.max(0, lateralUsage - 0.7) * 0.85, 0.74, 0.98);
            let recoveryTargetOffset = rawRecoveryTargetOffset * (1 - centerBias);
            steer = clamp(
                (recoveryTargetOffset - projection.lateralOffset) * 0.48,
                -0.92,
                0.92,
            );
        } else {
            steer = 0;
        }
    }

    if (
        isOnCommittedBranch &&
        projection &&
        edge &&
        !branchTransitionProfile.isParallelSplit
    ) {
        let branchProgress = projection.distanceOnEdge / Math.max(edge.length, 0.001);
        if (branchProgress < 0.42) {
            let branchSafetySpeed = 0.46 + (0.58 - 0.46) * (branchProgress / 0.42);
            if (vehicle.speed > branchSafetySpeed) {
                throttle = Math.min(throttle, 0.36);
                brake = Math.max(
                    brake,
                    0.18 + Math.max(0, vehicle.speed - branchSafetySpeed) * 2.4,
                );
            } else {
                throttle = Math.min(throttle, 0.58);
            }
            steer = clamp(steer, -0.38, 0.38);
        }
    }

    return {
        assist,
        brake,
        brakeScale: assist.brake,
        generatedAtMs: nowMs,
        intent,
        planVersion: routeState.version,
        routeId: routeState.route.id,
        snapshotId,
        steer,
        steerScale: assist.steer,
        telemetry: {
            activeConnectorId: routeState.activeConnectorId,
            assistReason: isRecover ? "recovery" : intent.mode,
            budgetStatus: "ok",
            committedBranchId: routeState.committedBranchId,
            committedConnectorId: routeState.committedConnector?.connectorId,
            connectorReason: connectorEntryPhase ?
                "connector-entry" :
                intent.preferredConnectorId ?
                    `connector-target-${intent.preferredConnectorId}` :
                    undefined,
            controlAgeMs: 0,
            edgeId: projection?.edgeId,
            illegalTransitionRejectCount: routeState.illegalTransitionRejectCount,
            intentReason: intent.reason || intent.mode,
            plannerMode: "sync",
            projectionReason: routeState.projectionReason,
            recoveryReason: isRecover ? "corridor-rejoin" : undefined,
            routeReason: routeState.route.branchReason,
        },
        throttle,
    };
};

export {
    planControl,
};
