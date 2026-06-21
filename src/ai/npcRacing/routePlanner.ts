import {
    EdgeProjection,
    NpcConnectorCommitState,
    NpcPlanningConfig,
    NpcRouteState,
    RaceSnapshot,
    RouteCandidate,
    TrackGraph,
    TrackGraphConnector,
    TrackGraphEdge,
    TrackGraphNode,
} from "./types";
import {
    getConnector,
    getEdge,
} from "./trackGraph";

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const getNode = (graph: TrackGraph, nodeId: string): TrackGraphNode | undefined =>
    graph.nodes.find((node) => node.id === nodeId);

const sortEdgesByRouteOrder = (
    graph: TrackGraph,
    edgeIds: Array<string>,
): Array<TrackGraphEdge> => edgeIds
    .map((edgeId) => getEdge(graph, edgeId))
    .filter((edge): edge is TrackGraphEdge => !!edge)
    .sort((first, second) => first.routeOrder - second.routeOrder);

const getNextEdgeByRouteOrder = (
    graph: TrackGraph,
    edge: TrackGraphEdge | undefined,
    visited: Set<string>,
    lockedSplitGroupId?: string,
): TrackGraphEdge | undefined => {
    if (!edge || !graph.edges.length)
        return undefined;

    for (let offset = 1; offset <= graph.edges.length; offset++) {
        let nextRouteOrder = (edge.routeOrder + offset) % graph.edges.length;
        let candidate = graph.edges.find((currentEdge) =>
            currentEdge.routeOrder === nextRouteOrder,
        );
        if (!candidate)
            continue;
        if (visited.has(candidate.id))
            continue;

        let sameSplitGroup = edge.splitGroupId &&
            candidate.splitGroupId === edge.splitGroupId &&
            candidate.id !== edge.id;
        let sameMergeGroup = edge.mergeGroupId &&
            candidate.mergeGroupId === edge.mergeGroupId &&
            candidate.id !== edge.id;
        let violatesLockedSplitGroup = !!(
            lockedSplitGroupId &&
            candidate.splitGroupId === lockedSplitGroupId &&
            candidate.id !== edge.id
        );
        if (sameSplitGroup || sameMergeGroup || violatesLockedSplitGroup)
            continue;

        return candidate;
    }

    return undefined;
};

const walkRouteEdges = (
    graph: TrackGraph,
    startEdge: TrackGraphEdge,
    stopEdgeIds: Set<string> = new Set<string>(),
): Array<TrackGraphEdge> => {
    let routeEdges: Array<TrackGraphEdge> = [];
    let visited = new Set<string>();
    let current: TrackGraphEdge | undefined = startEdge;
    let maxSteps = Math.max(graph.edges.length + 2, 1);
    let lockedSplitGroupId = startEdge.splitGroupId;

    for (let step = 0; current && step < maxSteps; step++) {
        if (visited.has(current.id))
            break;

        routeEdges.push(current);
        visited.add(current.id);

        let endNode = getNode(graph, current.endNodeId);
        let nextEdges = sortEdgesByRouteOrder(graph, endNode?.edgeIdsOut || [])
            .filter((edge) => !visited.has(edge.id));
        if (lockedSplitGroupId && endNode?.id === lockedSplitGroupId)
            nextEdges = [];
        if (nextEdges.length) {
            current = nextEdges[0];
            continue;
        }

        let nextRouteEdge = getNextEdgeByRouteOrder(
            graph,
            current,
            visited,
            lockedSplitGroupId,
        );
        if (nextRouteEdge && stopEdgeIds.has(nextRouteEdge.id))
            break;
        current = nextRouteEdge;
    }

    return routeEdges.length ? routeEdges : [startEdge];
};

const uniqueRouteEdges = (edges: Array<TrackGraphEdge>): Array<TrackGraphEdge> => {
    let seen = new Set<string>();
    return edges.filter((edge) => {
        if (seen.has(edge.id))
            return false;
        seen.add(edge.id);
        return true;
    });
};

const createBranchCandidate = (
    graph: TrackGraph,
    prefixEdges: Array<TrackGraphEdge>,
    branchEdge: TrackGraphEdge,
): RouteCandidate => {
    let branchRouteEdges = walkRouteEdges(
        graph,
        branchEdge,
        new Set(prefixEdges.map((edge) => edge.id)),
    );
    let routeEdges = uniqueRouteEdges([...prefixEdges, ...branchRouteEdges]);

    return {
        branchEdgeId: branchEdge.id,
        branchNodeId: branchEdge.splitGroupId || branchEdge.startNodeId,
        branchReason: `branch-${branchEdge.splitGroupId || branchEdge.startNodeId}`,
        edgeIds: routeEdges.map((edge) => edge.id),
        id: `route-branch-${branchEdge.id}`,
        length: routeEdges.reduce((total, edge) => total + edge.length, 0),
        mergeNodeId: branchEdge.mergeGroupId,
        score: 0,
    };
};

const createConnectorCandidate = (
    graph: TrackGraph,
    prefixEdges: Array<TrackGraphEdge>,
    connector: TrackGraphConnector,
): RouteCandidate | undefined => {
    let entryEdge = getEdge(graph, connector.fromEdgeId);
    let exitEdge = getEdge(graph, connector.toEdgeId);
    if (!entryEdge || !exitEdge)
        return undefined;

    let connectorRoute = walkRouteEdges(
        graph,
        exitEdge,
        new Set(prefixEdges.map((edge) => edge.id)),
    );
    let routeEdges = uniqueRouteEdges([...prefixEdges, entryEdge, ...connectorRoute]);

    return {
        branchReason: `connector-${connector.id}`,
        connectorEntryEdgeId: entryEdge.id,
        connectorExitEdgeId: exitEdge.id,
        connectorId: connector.id,
        edgeIds: routeEdges.map((edge) => edge.id),
        id: `route-connector-${connector.id}`,
        length: routeEdges.reduce((total, edge) => total + edge.length, 0),
        score: 0,
    };
};

const buildRouteCandidates = (
    graph: TrackGraph,
    projection?: EdgeProjection,
): Array<RouteCandidate> => {
    if (!graph.edges.length)
        return [];

    let startEdge = projection ?
        getEdge(graph, projection.edgeId) || graph.edges[0] :
        graph.edges[0];

    let primaryRouteEdges = walkRouteEdges(graph, startEdge);
    let candidates: Array<RouteCandidate> = [];

    let startNode = getNode(graph, startEdge.startNodeId);
    let firstBranchIndex = primaryRouteEdges.findIndex((edge) =>
        (getNode(graph, edge.startNodeId)?.edgeIdsOut.length || 0) > 1,
    );
    let firstBranchNode = firstBranchIndex >= 0 ?
        getNode(graph, primaryRouteEdges[firstBranchIndex].startNodeId) :
        undefined;
    let branchNode = firstBranchNode || startNode;
    let prefixEdges = firstBranchIndex >= 0 ?
        primaryRouteEdges.slice(0, firstBranchIndex) :
        [];
    let primaryEdgeIds = new Set(primaryRouteEdges.map((edge) => edge.id));

    let branchEdges = sortEdgesByRouteOrder(graph, branchNode?.edgeIdsOut || []);
    if (branchNode?.edgeIdsOut.length && (branchNode.kind === "branch" || branchEdges.length > 1)) {
        for (let edge of branchEdges)
            candidates.push(createBranchCandidate(graph, prefixEdges, edge));
    } else {
        candidates.push({
            branchReason: "primary-route",
            edgeIds: primaryRouteEdges.map((edge) => edge.id),
            id: `route-primary-${startEdge.id}`,
            length: primaryRouteEdges.reduce((total, edge) => total + edge.length, 0),
            score: 0,
        });
    }

    let connectorCandidates = graph.connectors
        .filter((connector) =>
            connector.fromEdgeId === startEdge.id,
        )
        .map((connector) =>
            createConnectorCandidate(graph, prefixEdges, connector),
        )
        .filter((candidate): candidate is RouteCandidate => !!candidate);
    candidates.push(...connectorCandidates);

    return candidates;
};

const getRouteEdgeIndex = (
    route: RouteCandidate,
    edgeId: string,
): number => route.edgeIds.findIndex((candidateEdgeId) => candidateEdgeId === edgeId);

const getDistanceToRouteEdgeStart = (
    graph: TrackGraph,
    route: RouteCandidate,
    projection: EdgeProjection | undefined,
    targetEdgeId: string | undefined,
): number | undefined => {
    if (!projection || !targetEdgeId)
        return undefined;

    let projectionIndex = getRouteEdgeIndex(route, projection.edgeId);
    let targetIndex = getRouteEdgeIndex(route, targetEdgeId);
    if (projectionIndex < 0 || targetIndex < 0 || targetIndex < projectionIndex)
        return undefined;

    if (projection.edgeId === targetEdgeId)
        return 0;

    let distance = 0;
    for (let index = projectionIndex; index < targetIndex; index++) {
        let edgeId = route.edgeIds[index];
        let edge = getEdge(graph, edgeId);
        if (!edge)
            continue;

        distance += index === projectionIndex ?
            Math.max(edge.length - projection.distanceOnEdge, 0) :
            edge.length;
    }

    return distance;
};

const isCommittedBranchActive = (
    graph: TrackGraph,
    previous: NpcRouteState | undefined,
    projection: EdgeProjection | undefined,
): boolean => {
    if (!previous?.committedBranchEdgeId)
        return false;

    if (!projection)
        return true;

    if (projection.edgeId === previous.committedBranchEdgeId)
        return true;

    let projectionEdge = getEdge(graph, projection.edgeId);
    if (!projectionEdge)
        return false;

    if (
        previous.branchMergeNodeId &&
        projectionEdge.startNodeId === previous.branchMergeNodeId
    ) {
        return false;
    }

    return previous.route.edgeIds.includes(projection.edgeId);
};

const isCommittedConnectorActive = (
    graph: TrackGraph,
    previous: NpcRouteState | undefined,
    projection: EdgeProjection | undefined,
): boolean => {
    let commit = previous?.committedConnector;
    if (!commit)
        return false;

    let connector = getConnector(graph, commit.connectorId);
    if (!connector)
        return false;

    if (!projection)
        return true;

    if (projection.edgeId === connector.fromEdgeId || projection.edgeId === connector.toEdgeId)
        return true;

    return false;
};

const selectCandidate = (
    graph: TrackGraph,
    candidates: Array<RouteCandidate>,
    previous: NpcRouteState | undefined,
    projection: EdgeProjection | undefined,
    config: NpcPlanningConfig,
): RouteCandidate | undefined => {
    if (!candidates.length)
        return undefined;

    if (isCommittedConnectorActive(graph, previous, projection)) {
        return candidates.find((candidate) =>
            candidate.connectorId === previous?.committedConnector?.connectorId,
        ) || previous?.route || candidates[0];
    }

    if (isCommittedBranchActive(graph, previous, projection)) {
        return candidates.find((candidate) =>
            candidate.branchEdgeId === previous?.committedBranchEdgeId,
        ) || previous?.route || candidates[0];
    }

    if (previous?.route) {
        let stableCandidate = candidates.find((candidate) =>
            candidate.id === previous.route.id ||
            candidate.branchEdgeId === previous.committedBranchEdgeId ||
            candidate.connectorId === previous.committedConnector?.connectorId,
        );
        if (stableCandidate) {
            let bestCandidate = candidates[0];
            let hasCommittedTransition = !!previous.committedBranchEdgeId ||
                !!previous.committedConnector;
            let scoreDelta = (bestCandidate?.score || -Infinity) - stableCandidate.score;
            if (hasCommittedTransition || scoreDelta < 0.08)
                return stableCandidate;
        }
    }

    let bestCandidate = candidates[0];
    if (!projection)
        return bestCandidate;

    let connectorCommitCandidate = candidates.find((candidate) => {
        if (!candidate.connectorId || !candidate.connectorEntryEdgeId)
            return false;

        let distanceToConnector = getDistanceToRouteEdgeStart(
            graph,
            candidate,
            projection,
            candidate.connectorEntryEdgeId,
        );
        return distanceToConnector !== undefined &&
            distanceToConnector <= config.routing.branchCommitDistance * 0.9;
    });
    if (connectorCommitCandidate)
        return connectorCommitCandidate;

    let branchCommitCandidate = candidates.find((candidate) => {
        if (!candidate.branchEdgeId)
            return false;

        let distanceToBranch = getDistanceToRouteEdgeStart(
            graph,
            candidate,
            projection,
            candidate.branchEdgeId,
        );
        return distanceToBranch !== undefined &&
            distanceToBranch <= config.routing.branchCommitDistance;
    });

    return branchCommitCandidate || bestCandidate;
};

const scoreRouteCandidate = (
    graph: TrackGraph,
    candidate: RouteCandidate,
    projection?: EdgeProjection,
    snapshot?: RaceSnapshot,
): RouteCandidate => {
    let curvatureCost = 0;
    let branchBonus = candidate.branchReason.startsWith("branch") ? 0.08 : 0;
    let connectorBonus = candidate.connectorId ? 0.06 : 0;
    let alignmentPenalty = 0;
    let branchSidePenalty = 0;
    let firstEdges = candidate.edgeIds.slice(0, 4);

    for (let edgeId of firstEdges) {
        let edge = getEdge(graph, edgeId);
        if (!edge)
            continue;
        curvatureCost += edge.samples.reduce(
            (total, sample) => total + sample.curvature,
            0,
        ) / Math.max(edge.samples.length, 1);
    }

    let trafficCost = 0;
    if (snapshot)
        trafficCost = Math.min(snapshot.vehicles.length * 0.004, 0.05);

    if (projection) {
        let projectionRouteIndex = candidate.edgeIds.findIndex((edgeId) =>
            edgeId === projection.edgeId,
        );
        let upcomingEdgeId = projectionRouteIndex >= 0 ?
            candidate.edgeIds[projectionRouteIndex + 1] :
            undefined;
        let alignmentEdgeId = candidate.branchEdgeId ||
            candidate.connectorEntryEdgeId ||
            upcomingEdgeId ||
            candidate.edgeIds[Math.max(projectionRouteIndex, 0)] ||
            candidate.edgeIds[0];
        let alignmentEdge = alignmentEdgeId ? getEdge(graph, alignmentEdgeId) : undefined;
        let alignmentSample = alignmentEdge?.samples[Math.min(
            3,
            Math.max((alignmentEdge?.samples.length || 1) - 1, 0),
        )];
        let projectionEdge = getEdge(graph, projection.edgeId);
        let projectionSample = projectionEdge?.samples[projection.sampleIndex];

        if (alignmentSample && projectionSample) {
            let dx = alignmentSample.point.x - projection.point.x;
            let dy = alignmentSample.point.y - projection.point.y;
            let dz = alignmentSample.point.z - projection.point.z;
            let lateralGap = Math.abs(
                dx * projectionSample.lateral.x +
                dy * projectionSample.lateral.y +
                dz * projectionSample.lateral.z,
            );
            let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            alignmentPenalty =
                clamp(lateralGap * 0.042, 0, 0.34) +
                clamp(distance * 0.0035, 0, 0.18);

            if (candidate.branchEdgeId) {
                let expectedBranchOffset =
                    dx * projectionSample.lateral.x +
                    dy * projectionSample.lateral.y +
                    dz * projectionSample.lateral.z;
                let currentOffset = projection.lateralOffset;
                let offsetMismatch = Math.abs(currentOffset - expectedBranchOffset);
                let wrongSidePenalty = Math.sign(currentOffset || expectedBranchOffset) !==
                    Math.sign(expectedBranchOffset) ?
                    0.18 :
                    0;
                branchSidePenalty =
                    clamp(offsetMismatch * 0.03, 0, 0.42) +
                    wrongSidePenalty;
            }
        }
    }

    return {
        ...candidate,
        score: -candidate.length * 0.0002 - curvatureCost * 0.18 -
            trafficCost - alignmentPenalty - branchSidePenalty +
            branchBonus * 0.25 + connectorBonus,
    };
};

const buildConnectorCommitState = (
    graph: TrackGraph,
    selected: RouteCandidate,
    projection: EdgeProjection | undefined,
    previous?: NpcRouteState,
): NpcConnectorCommitState | undefined => {
    if (!selected.connectorId || !selected.connectorEntryEdgeId || !selected.connectorExitEdgeId)
        return undefined;

    let connector = getConnector(graph, selected.connectorId);
    if (!connector)
        return undefined;

    let progress = 0;
    let state: NpcConnectorCommitState["state"] = "approach";
    if (projection?.edgeId === connector.fromEdgeId) {
        state = "active";
        let edge = getEdge(graph, connector.fromEdgeId);
        progress = edge && edge.length > 0 ?
            projection.distanceOnEdge / edge.length :
            0;
    } else if (projection?.edgeId === connector.toEdgeId) {
        state = "complete";
        progress = 1;
    } else if (previous?.committedConnector?.connectorId === selected.connectorId) {
        progress = previous.committedConnector.progress;
        state = previous.committedConnector.state;
    }

    return {
        connectorId: connector.id,
        fromEdgeId: connector.fromEdgeId,
        progress,
        state,
        toEdgeId: connector.toEdgeId,
        windowId: connector.windows[0]?.id,
    };
};

const planRoute = (
    graph: TrackGraph,
    config: NpcPlanningConfig,
    previous: NpcRouteState | undefined,
    projection: EdgeProjection | undefined,
    snapshot?: RaceSnapshot,
): NpcRouteState => {
    let candidates = buildRouteCandidates(graph, projection)
        .map((candidate) => scoreRouteCandidate(graph, candidate, projection, snapshot))
        .sort((first, second) => second.score - first.score);
    let fallback = previous?.route || candidates[0] || {
        branchReason: "empty-graph",
        edgeIds: [],
        id: "route-empty",
        length: 0,
        score: -Infinity,
    };
    let selected = selectCandidate(
        graph,
        candidates,
        previous,
        projection,
        config,
    ) || fallback;
    let committedBranchEdgeId = previous?.committedBranchEdgeId;
    let branchMergeNodeId = previous?.branchMergeNodeId;
    let committedBranchId = previous?.committedBranchId;
    let committedConnector = previous?.committedConnector;
    let activeConnectorId = previous?.activeConnectorId;

    if (!isCommittedBranchActive(graph, previous, projection)) {
        committedBranchEdgeId = undefined;
        branchMergeNodeId = undefined;
        committedBranchId = undefined;
    }

    if (!isCommittedConnectorActive(graph, previous, projection)) {
        committedConnector = undefined;
        activeConnectorId = undefined;
    }

    if (selected.branchEdgeId) {
        let distanceToBranch = getDistanceToRouteEdgeStart(
            graph,
            selected,
            projection,
            selected.branchEdgeId,
        );
        if (
            projection?.edgeId === selected.branchEdgeId ||
            distanceToBranch !== undefined &&
            distanceToBranch <= config.routing.branchCommitDistance
        ) {
            committedBranchEdgeId = selected.branchEdgeId;
            branchMergeNodeId = selected.mergeNodeId;
            committedBranchId = selected.branchReason;
        }
    }

    if (selected.connectorId) {
        committedConnector = buildConnectorCommitState(
            graph,
            selected,
            projection,
            previous,
        );
        activeConnectorId = committedConnector?.connectorId;
    }

    return {
        activeConnectorId,
        activeEdgeId: projection?.edgeId || selected.edgeIds[0],
        branchMergeNodeId,
        committedBranchEdgeId,
        committedBranchId: committedBranchId || selected.branchReason,
        committedConnector,
        desiredLateralOffset: projection?.lateralOffset,
        illegalTransitionRejectCount: projection?.illegalTransitionRejectCount || 0,
        lateralOffsetRate: previous?.projection && projection ?
            projection.lateralOffset - previous.projection.lateralOffset :
            0,
        projection,
        projectionReason: projection?.projectionReason || "route-continuity",
        route: selected,
        version: (previous?.version || 0) + 1,
    };
};

export {
    buildRouteCandidates,
    planRoute,
};
