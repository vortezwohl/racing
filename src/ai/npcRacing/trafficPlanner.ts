import {
    EdgeProjection,
    NpcPlanningConfig,
    NpcRacecraftIntent,
    NpcRouteState,
    NpcTrafficIndex,
    ProjectedRaceVehicle,
    RaceSnapshot,
    RaceVehicleSnapshot,
    TrackGraph,
} from "./types";
import {
    distanceSqNpc,
    dotNpc,
} from "./math";
import {
    getConnector,
    getEdge,
    getNode,
    getRouteSamplesAhead,
    getSignedRouteDistance,
    projectOntoGraph,
} from "./trackGraph";

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const getProjectionCorridorHalfWidth = (
    graph: TrackGraph,
    projection?: EdgeProjection,
): number => {
    if (!projection)
        return 2.4;

    let edge = getEdge(graph, projection.edgeId);
    return edge?.samples[projection.sampleIndex]?.corridorHalfWidth || 2.4;
};

const getForwardFallbackDistance = (
    self: RaceVehicleSnapshot,
    other: RaceVehicleSnapshot,
): number => {
    let dx = other.position.x - self.position.x;
    let dy = other.position.y - self.position.y;
    let dz = other.position.z - self.position.z;
    return dotNpc({ x: dx, y: dy, z: dz }, self.direction);
};

const findNearbyVehicles = (
    self: RaceVehicleSnapshot,
    snapshot: RaceSnapshot,
    maxDistance: number,
): Array<RaceVehicleSnapshot> => {
    let maxDistanceSq = maxDistance * maxDistance;
    return snapshot.vehicles
        .filter((vehicle) => vehicle.id !== self.id && vehicle.isAlive)
        .filter((vehicle) =>
            distanceSqNpc(self.position, vehicle.position) <= maxDistanceSq,
        );
};

const isProjectionInConnectorNeighborhood = (
    routeState: NpcRouteState,
    projection: EdgeProjection,
): boolean => {
    let committed = routeState.committedConnector;
    if (!committed)
        return false;

    return projection.edgeId === committed.fromEdgeId ||
        projection.edgeId === committed.toEdgeId;
};

const isLegalTrafficNeighbor = (
    routeState: NpcRouteState,
    selfProjection: EdgeProjection,
    otherProjection: EdgeProjection,
): boolean => {
    if (selfProjection.edgeId === otherProjection.edgeId)
        return true;
    if (routeState.route.edgeIds.includes(otherProjection.edgeId))
        return true;
    if (selfProjection.connectorId && selfProjection.connectorId === otherProjection.connectorId)
        return true;
    if (isProjectionInConnectorNeighborhood(routeState, otherProjection))
        return true;
    return false;
};

const buildTrafficIndex = (
    graph: TrackGraph,
    self: RaceVehicleSnapshot,
    snapshot: RaceSnapshot,
    routeState: NpcRouteState,
    config: NpcPlanningConfig,
): NpcTrafficIndex => {
    let selfProjection = routeState.projection;
    let projectedVehicles: Array<ProjectedRaceVehicle> = [];

    for (let vehicle of snapshot.vehicles) {
        if (vehicle.id === self.id || !vehicle.isAlive)
            continue;

        let projection = projectOntoGraph(
            graph,
            vehicle.position,
            vehicle.direction,
            undefined,
            routeState,
        );
        if (!projection || !selfProjection)
            continue;
        if (!isLegalTrafficNeighbor(routeState, selfProjection, projection))
            continue;

        let routeDistance = getSignedRouteDistance(
            graph,
            routeState,
            selfProjection,
            projection,
        );
        let relativeDistance = routeDistance === undefined ?
            getForwardFallbackDistance(self, vehicle) :
            routeDistance;

        projectedVehicles.push({
            lateralGap: Math.abs(projection.lateralOffset - selfProjection.lateralOffset),
            projection,
            relativeDistance,
            vehicle,
        });
    }

    let detailed = projectedVehicles
        .sort((first, second) =>
            Math.abs(first.relativeDistance) - Math.abs(second.relativeDistance),
        )
        .slice(0, config.budgets.maxDetailedVehicles);

    return {
        ahead: detailed
            .filter((vehicle) =>
                vehicle.relativeDistance > 0 && vehicle.relativeDistance <= 42,
            )
            .sort((first, second) => first.relativeDistance - second.relativeDistance),
        behind: detailed
            .filter((vehicle) =>
                vehicle.relativeDistance < 0 && vehicle.relativeDistance >= -28,
            )
            .sort((first, second) =>
                Math.abs(first.relativeDistance) - Math.abs(second.relativeDistance),
            ),
        budgetStatus: projectedVehicles.length > detailed.length ? "truncated" : "ok",
        projectedVehicles,
        sideBySide: detailed.filter((vehicle) =>
            Math.abs(vehicle.relativeDistance) <= 5.8 && vehicle.lateralGap <= 3.3,
        ),
    };
};

const canReachNextBrakeWindow = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    self: RaceVehicleSnapshot,
): boolean => {
    let samples = getRouteSamplesAhead(graph, routeState, routeState.projection, 76, 26);
    if (!samples.length)
        return true;

    let minSafeSpeed = samples.reduce(
        (minSpeed, sample) => Math.min(minSpeed, sample.safeSpeedHint),
        1,
    );
    let heavyCornerDistance = samples.find((sample) =>
        sample.segmentType === "corner" || sample.segmentType === "hairpin",
    )?.distanceOnEdge;

    if (heavyCornerDistance === undefined)
        return true;

    return self.speed <= minSafeSpeed + 0.24;
};

const choosePassOffset = (
    graph: TrackGraph,
    projection: EdgeProjection | undefined,
    target: ProjectedRaceVehicle,
): number => {
    let corridorHalfWidth = getProjectionCorridorHalfWidth(graph, projection) * 0.74;
    let side = target.projection.lateralOffset <= 0 ? 1 : -1;
    return clamp(
        target.projection.lateralOffset + side * 1.55,
        -corridorHalfWidth,
        corridorHalfWidth,
    );
};

const chooseConnectorForTarget = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    target: ProjectedRaceVehicle | undefined,
): string | undefined => {
    if (!target || !routeState.projection)
        return undefined;

    let currentEdge = routeState.projection.edgeId;
    let targetEdge = target.projection.edgeId;
    if (currentEdge === targetEdge)
        return undefined;

    return graph.connectors.find((connector) =>
        connector.fromEdgeId === currentEdge && connector.toEdgeId === targetEdge,
    )?.id;
};

const getDistanceToEdgeEnd = (
    graph: TrackGraph,
    projection: EdgeProjection | undefined,
): number | undefined => {
    if (!projection)
        return undefined;

    let edge = getEdge(graph, projection.edgeId);
    if (!edge)
        return undefined;

    return Math.max(edge.length - projection.distanceOnEdge, 0);
};

const getUpcomingBranchProfile = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    config: NpcPlanningConfig,
): {
    approaching: boolean;
    isParallelSplit: boolean;
} => {
    let projection = routeState.projection;
    if (!projection)
        return {
            approaching: false,
            isParallelSplit: false,
        };
    if (routeState.committedBranchEdgeId)
        return {
            approaching: false,
            isParallelSplit: false,
        };

    let edge = getEdge(graph, projection.edgeId);
    let endNode = edge ? getNode(graph, edge.endNodeId) : undefined;
    let distanceToEdgeEnd = getDistanceToEdgeEnd(graph, projection);
    let branchEdges = (endNode?.edgeIdsOut || [])
        .map((edgeId) => getEdge(graph, edgeId))
        .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate);
    let isParallelSplit = false;

    for (let i = 0; i < branchEdges.length; i++) {
        for (let j = i + 1; j < branchEdges.length; j++) {
            let firstSample = branchEdges[i].samples[0];
            let secondSample = branchEdges[j].samples[0];
            if (!firstSample || !secondSample)
                continue;

            let headingDelta = Math.acos(clamp(
                dotNpc(firstSample.tangent, secondSample.tangent),
                -1,
                1,
            ));
            if (
                headingDelta <= 0.12 &&
                firstSample.segmentType === "straight" &&
                secondSample.segmentType === "straight"
            ) {
                isParallelSplit = true;
                break;
            }
        }
        if (isParallelSplit)
            break;
    }

    let approachDistance = isParallelSplit ?
        Math.max(config.routing.branchCommitDistance + 12, 72) :
        44;

    return {
        approaching: !!(
        endNode &&
        endNode.edgeIdsOut.length > 1 &&
        distanceToEdgeEnd !== undefined &&
        distanceToEdgeEnd <= approachDistance
        ),
        isParallelSplit,
    };
};

const isStabilizingAfterBranchCommit = (
    graph: TrackGraph,
    routeState: NpcRouteState,
): boolean => {
    let projection = routeState.projection;
    if (!projection || !routeState.committedBranchEdgeId)
        return false;
    if (projection.edgeId !== routeState.committedBranchEdgeId)
        return false;

    let edge = getEdge(graph, projection.edgeId);
    let sample = edge?.samples[projection.sampleIndex];
    if (!sample)
        return false;

    let lateralUsage = Math.abs(projection.lateralOffset) /
        Math.max(sample.corridorHalfWidth, 0.001);
    return projection.distanceOnEdge <= 44 || lateralUsage > 0.52;
};

const planTrafficIntent = (
    graph: TrackGraph,
    self: RaceVehicleSnapshot,
    snapshot: RaceSnapshot,
    routeState: NpcRouteState,
    config: NpcPlanningConfig,
): NpcRacecraftIntent => {
    let projection = routeState.projection;
    if (!projection) {
        return {
            mode: "neutral",
            reason: "no-route-projection",
        };
    }

    if (snapshot.raceRunningMs < config.start.suppressAttackMs) {
        return {
            mode: "launch",
            reason: "start-tactical-suppression",
        };
    }

    let traffic = buildTrafficIndex(graph, self, snapshot, routeState, config);
    let brakeReachable = canReachNextBrakeWindow(graph, routeState, self);
    let corridorHalfWidth = getProjectionCorridorHalfWidth(graph, projection);
    let safeLaneLimit = corridorHalfWidth * (brakeReachable ? 0.78 : 0.5);
    let sideThreat = traffic.sideBySide[0];
    let branchProfile = getUpcomingBranchProfile(graph, routeState, config);
    let approachingBranchDecision = branchProfile.approaching;
    let branchStabilizing = isStabilizingAfterBranchCommit(graph, routeState);

    if (branchProfile.isParallelSplit && approachingBranchDecision) {
        return {
            mode: snapshot.raceRunningMs < config.start.fullThrottleMs ?
                "launch" :
                "neutral",
            reason: "parallel-branch-stabilize",
            targetEdgeId: routeState.activeEdgeId,
        };
    }

    if (Math.abs(projection.lateralOffset) > corridorHalfWidth * 0.86) {
        return {
            mode: "recover",
            reason: "outside-route-corridor",
            targetEdgeId: routeState.activeEdgeId,
        };
    }

    if (sideThreat &&
        brakeReachable &&
        !approachingBranchDecision &&
        !branchStabilizing) {
        let pressureSide = Math.sign(
            sideThreat.projection.lateralOffset - projection.lateralOffset,
        ) || 1;
        return {
            mode: "attack",
            preferredConnectorId: chooseConnectorForTarget(graph, routeState, sideThreat),
            reason: "side-by-side-line-claim",
            targetEdgeId: sideThreat.projection.edgeId,
            targetId: sideThreat.vehicle.id,
            targetLaneOffset: clamp(
                sideThreat.projection.lateralOffset + pressureSide * 0.68,
                -safeLaneLimit,
                safeLaneLimit,
            ),
        };
    }

    let draftingThreat = traffic.behind.find((vehicle) =>
        vehicle.lateralGap < 2.4 &&
        Math.abs(vehicle.relativeDistance) < 18 &&
        (vehicle.vehicle.speed >= self.speed * 0.92 || vehicle.vehicle.draftCharge > 0.2),
    );
    if (draftingThreat &&
        brakeReachable &&
        !approachingBranchDecision &&
        !branchStabilizing) {
        return {
            mode: "block",
            preferredConnectorId: chooseConnectorForTarget(graph, routeState, draftingThreat),
            reason: "defend-drafting-threat",
            targetEdgeId: draftingThreat.projection.edgeId,
            targetId: draftingThreat.vehicle.id,
            targetLaneOffset: clamp(
                draftingThreat.projection.lateralOffset,
                -safeLaneLimit,
                safeLaneLimit,
            ),
        };
    }

    let ahead = traffic.ahead.find((vehicle) => vehicle.lateralGap < 3.4);
    if (!ahead) {
        return {
            mode: "neutral",
            reason: traffic.budgetStatus,
            targetEdgeId: routeState.activeEdgeId,
        };
    }

    let closingSpeed = self.speed - ahead.vehicle.speed;
    if (closingSpeed > 0.03 && ahead.relativeDistance < 24 && brakeReachable) {
        if (branchStabilizing) {
            return {
                mode: "neutral",
                reason: "branch-stabilizing",
                targetEdgeId: routeState.activeEdgeId,
            };
        }
        return {
            mode: "overtake",
            preferredConnectorId: chooseConnectorForTarget(graph, routeState, ahead),
            reason: "closing-with-brake-reachability",
            targetEdgeId: ahead.projection.edgeId,
            targetId: ahead.vehicle.id,
            targetLaneOffset: choosePassOffset(graph, projection, ahead),
        };
    }

    if (branchStabilizing) {
        return {
            mode: "neutral",
            reason: "branch-stabilizing",
            targetEdgeId: routeState.activeEdgeId,
        };
    }

    return {
        mode: "draft",
        preferredConnectorId: chooseConnectorForTarget(graph, routeState, ahead),
        reason: brakeReachable ? "straight-draft-pursuit" : "draft-with-corner-gate",
        targetEdgeId: ahead.projection.edgeId,
        targetId: ahead.vehicle.id,
        targetLaneOffset: clamp(
            ahead.projection.lateralOffset,
            -safeLaneLimit,
            safeLaneLimit,
        ),
    };
};

export {
    buildTrafficIndex,
    findNearbyVehicles,
    planTrafficIntent,
};
