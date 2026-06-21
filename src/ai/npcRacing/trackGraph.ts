import * as THREE from "three";
import {
    CurveData,
    TrackConnectorData,
    TrackData,
} from "../../utils/interfaces";
import {
    CorridorLateralRange,
    EdgeProjection,
    NpcRouteState,
    NpcVector3,
    TrackGraph,
    TrackGraphConnector,
    TrackGraphConnectorWindow,
    TrackGraphEdge,
    TrackGraphEdgeSample,
    TrackGraphNode,
    TrackGraphValidationIssue,
    TrackGraphValidationReport,
} from "./types";
import {
    distanceSqNpc,
    dotNpc,
    fromNpcVector,
    toNpcVector,
} from "./math";

const endpointMergeDistance = 22;
const endpointMergeDistanceSq = endpointMergeDistance * endpointMergeDistance;
const inferredConnectorGapLimit = 18;
const inferredConnectorHeadingLimit = 0.2;
const inferredConnectorOverlapMin = 110;
const inferredConnectorSampleRadius = 18;
const routeSwitchPenalty = 64;
const illegalTransitionPenalty = 180;
const branchProjectionActivationDistance = 26;
const routeProjectionFallbackThreshold = 1.15;

type ConnectorBuildWindow = {
    fromSampleStart: number;
    fromSampleEnd: number;
    toSampleStart: number;
    toSampleEnd: number;
};

type ConnectorBuildOptions = {
    bidirectional: boolean;
    kind: "authored" | "inferred";
    transitionType: "lane-change" | "merge" | "split";
};

type RouteEdgeNeighborhood = {
    activeConnector?: TrackGraphConnector;
    branchEdge?: TrackGraphEdge;
    nextRouteEdge?: TrackGraphEdge;
    previousEdge?: TrackGraphEdge;
    previousProjection?: EdgeProjection;
    routeEdges: Array<TrackGraphEdge>;
};

const inferBaseCorridorHalfWidth = (trackData: TrackData): number => {
    let collisionLayer = trackData.layerData[0];
    if (!collisionLayer?.shapes?.length)
        return 12;

    let maxExtent = collisionLayer.shapes.reduce((layerExtent, shape) => {
        let shapeExtent = shape.reduce((pointExtent, point) =>
            Math.max(pointExtent, Math.abs(point[0]), Math.abs(point[1])), 0);
        return Math.max(layerExtent, shapeExtent);
    }, 0);

    return Math.max(maxExtent * 0.92, 12);
};

const classifySegment = (curvature: number): TrackGraphEdgeSample["segmentType"] => {
    if (curvature > 0.12)
        return "hairpin";
    if (curvature > 0.05)
        return "corner";
    if (curvature > 0.015)
        return "sweeper";
    return "straight";
};

const getCurvePoints = (data: CurveData): Array<THREE.Vector3> => {
    let divisions = data.divisions || data.extrudeOptions?.steps || 100;
    let points = data.points.map((point) =>
        new THREE.Vector3(point[0], point[1], point[2]),
    );

    if (data.ellipse) {
        let origin = points[0];
        let ellipse = new THREE.EllipseCurve(
            origin.x,
            origin.z,
            data.radius[0],
            data.radius[1],
            data.angles[0],
            data.angles[1],
            data.clockwise,
            0,
        );
        return ellipse.getPoints(divisions).map((point) =>
            new THREE.Vector3(point.x, origin.y, point.y),
        );
    }

    return new THREE.CatmullRomCurve3(points, data.closed || false)
        .getPoints(divisions);
};

const makeLateralRange = (corridorHalfWidth: number): CorridorLateralRange => ({
    max: corridorHalfWidth,
    min: -corridorHalfWidth,
});

const findOrCreateNode = (
    nodes: Array<TrackGraphNode>,
    position: NpcVector3,
    preferredKind: TrackGraphNode["kind"] = "normal",
): TrackGraphNode => {
    let existing = nodes.find((node) =>
        distanceSqNpc(node.position, position) <= endpointMergeDistanceSq,
    );
    if (existing) {
        if (
            preferredKind === "start" ||
            preferredKind === "branch" ||
            preferredKind === "merge"
        ) {
            existing.kind = preferredKind;
        }
        return existing;
    }

    let node: TrackGraphNode = {
        edgeIdsIn: [],
        edgeIdsOut: [],
        id: `node-${nodes.length}`,
        kind: preferredKind,
        position,
    };
    nodes.push(node);
    return node;
};

const buildEdgeSamples = (
    points: Array<THREE.Vector3>,
    edgeArcOffset: number,
    baseCorridorHalfWidth: number,
): { length: number; samples: Array<TrackGraphEdgeSample> } => {
    let samples: Array<TrackGraphEdgeSample> = [];
    let length = 0;

    for (let i = 0; i < points.length - 1; i++) {
        let point = points[i];
        let next = points[i + 1];
        let previous = points[Math.max(i - 1, 0)];
        let afterNext = points[Math.min(i + 2, points.length - 1)];
        let segmentLength = point.distanceTo(next);
        let tangent = next.clone().sub(point);
        if (tangent.lengthSq() < 0.0001)
            tangent.set(0, 0, 1);
        tangent.normalize();

        let previousTangent = point.clone().sub(previous);
        let nextTangent = afterNext.clone().sub(next);
        if (previousTangent.lengthSq() < 0.0001)
            previousTangent.copy(tangent);
        if (nextTangent.lengthSq() < 0.0001)
            nextTangent.copy(tangent);
        previousTangent.normalize();
        nextTangent.normalize();

        let up = new THREE.Vector3(0, 1, 0);
        let lateral = up.clone().cross(tangent);
        if (lateral.lengthSq() < 0.0001)
            lateral.set(1, 0, 0);
        lateral.normalize();

        let headingChange = previousTangent.angleTo(nextTangent);
        let sign = Math.sign(previousTangent.clone().cross(nextTangent).dot(up)) || 0;
        let curvature = headingChange / Math.max(segmentLength * 2, 0.0001);
        let segmentType = classifySegment(curvature);
        let corridorHalfWidth = segmentType === "hairpin" ?
            baseCorridorHalfWidth * 0.68 :
            segmentType === "corner" ?
                baseCorridorHalfWidth * 0.76 :
                segmentType === "sweeper" ?
                    baseCorridorHalfWidth * 0.84 :
                    baseCorridorHalfWidth * 0.92;
        let leftBoundary = point.clone().addScaledVector(lateral, corridorHalfWidth);
        let rightBoundary = point.clone().addScaledVector(lateral, -corridorHalfWidth);

        samples.push({
            arcLength: edgeArcOffset + length,
            corridorHalfWidth,
            curvature,
            distanceOnEdge: length,
            legalLateralRange: makeLateralRange(corridorHalfWidth),
            lateral: toNpcVector(lateral),
            leftBoundary: toNpcVector(leftBoundary),
            point: toNpcVector(point),
            rightBoundary: toNpcVector(rightBoundary),
            safeSpeedHint: Math.max(
                0.22,
                Math.min(0.98, Math.sqrt(0.12 / Math.max(curvature, 0.0008))),
            ),
            segmentType,
            signedCurvature: curvature * sign,
            tangent: toNpcVector(tangent),
            width: corridorHalfWidth * 2,
        });

        length += segmentLength;
    }

    if (!samples.length && points.length) {
        let point = points[0];
        let tangent = new THREE.Vector3(0, 0, 1);
        let lateral = new THREE.Vector3(1, 0, 0);
        let leftBoundary = point.clone().addScaledVector(lateral, baseCorridorHalfWidth);
        let rightBoundary = point.clone().addScaledVector(lateral, -baseCorridorHalfWidth);
        samples.push({
            arcLength: edgeArcOffset,
            corridorHalfWidth: baseCorridorHalfWidth,
            curvature: 0,
            distanceOnEdge: 0,
            legalLateralRange: makeLateralRange(baseCorridorHalfWidth),
            lateral: toNpcVector(lateral),
            leftBoundary: toNpcVector(leftBoundary),
            point: toNpcVector(point),
            rightBoundary: toNpcVector(rightBoundary),
            safeSpeedHint: 0.9,
            segmentType: "straight",
            signedCurvature: 0,
            tangent: toNpcVector(tangent),
            width: baseCorridorHalfWidth * 2,
        });
    }

    return { length, samples };
};

const assignBranchGroups = (
    nodes: Array<TrackGraphNode>,
    edges: Array<TrackGraphEdge>,
) => {
    for (let node of nodes) {
        if (node.edgeIdsOut.length > 1) {
            node.kind = "branch";
            for (let edgeId of node.edgeIdsOut) {
                let edge = edges.find((candidate) => candidate.id === edgeId);
                if (edge) {
                    edge.isBranchAlternative = true;
                    edge.splitGroupId = node.id;
                }
            }
        }
        if (node.edgeIdsIn.length > 1) {
            node.kind = node.kind === "branch" ? "branch" : "merge";
            for (let edgeId of node.edgeIdsIn) {
                let edge = edges.find((candidate) => candidate.id === edgeId);
                if (edge)
                    edge.mergeGroupId = node.id;
            }
        }
    }
};

const clampConnectorWindowRatios = (
    windowRatioRange?: [number, number],
): [number, number] => {
    if (!windowRatioRange)
        return [0.08, 0.92];

    let start = THREE.MathUtils.clamp(windowRatioRange[0], 0, 0.98);
    let end = THREE.MathUtils.clamp(windowRatioRange[1], start + 0.01, 1);
    return [start, end];
};

const getConnectorSampleWindow = (
    fromEdge: TrackGraphEdge,
    toEdge: TrackGraphEdge,
    windowRatioRange?: [number, number],
): ConnectorBuildWindow | undefined => {
    if (!fromEdge.samples.length || !toEdge.samples.length)
        return undefined;

    let [startRatio, endRatio] = clampConnectorWindowRatios(windowRatioRange);
    let fromStart = Math.min(
        fromEdge.samples.length - 1,
        Math.floor((fromEdge.samples.length - 1) * startRatio),
    );
    let fromEnd = Math.max(
        fromStart + 1,
        Math.min(
            fromEdge.samples.length - 1,
            Math.floor((fromEdge.samples.length - 1) * endRatio),
        ),
    );
    let toStart = Math.min(
        toEdge.samples.length - 1,
        Math.floor((toEdge.samples.length - 1) * startRatio),
    );
    let toEnd = Math.max(
        toStart + 1,
        Math.min(
            toEdge.samples.length - 1,
            Math.floor((toEdge.samples.length - 1) * endRatio),
        ),
    );

    return {
        fromSampleEnd: fromEnd,
        fromSampleStart: fromStart,
        toSampleEnd: toEnd,
        toSampleStart: toStart,
    };
};

const computeConnectorStats = (
    fromEdge: TrackGraphEdge,
    toEdge: TrackGraphEdge,
    sampleWindow: ConnectorBuildWindow,
): {
    gapWidth: number;
    headingDelta: number;
    overlapDistance: number;
    windows: Array<TrackGraphConnectorWindow>;
} | undefined => {
    let fromStartSample = fromEdge.samples[sampleWindow.fromSampleStart];
    let fromEndSample = fromEdge.samples[sampleWindow.fromSampleEnd];
    let toStartSample = toEdge.samples[sampleWindow.toSampleStart];
    let toEndSample = toEdge.samples[sampleWindow.toSampleEnd];
    if (!fromStartSample || !fromEndSample || !toStartSample || !toEndSample)
        return undefined;

    let gapAccumulator = 0;
    let headingAccumulator = 0;
    let pairCount = 0;
    let pairWindows: Array<TrackGraphConnectorWindow> = [];

    for (let fromIndex = sampleWindow.fromSampleStart; fromIndex <= sampleWindow.fromSampleEnd; fromIndex++) {
        let fromSample = fromEdge.samples[fromIndex];
        if (!fromSample)
            continue;

        let fromPoint = fromNpcVector(fromSample.point);
        let fromTangent = fromNpcVector(fromSample.tangent).normalize();
        let nearestToIndex = -1;
        let nearestDistanceSq = Infinity;

        for (let toIndex = sampleWindow.toSampleStart; toIndex <= sampleWindow.toSampleEnd; toIndex++) {
            let toSample = toEdge.samples[toIndex];
            if (!toSample)
                continue;

            let distanceSq = distanceSqNpc(fromSample.point, toSample.point);
            if (distanceSq < nearestDistanceSq) {
                nearestDistanceSq = distanceSq;
                nearestToIndex = toIndex;
            }
        }

        if (nearestToIndex < 0)
            continue;

        let toSample = toEdge.samples[nearestToIndex];
        let toPoint = fromNpcVector(toSample.point);
        let toTangent = fromNpcVector(toSample.tangent).normalize();
        let gapWidth = fromPoint.distanceTo(toPoint);
        let headingDelta = fromTangent.angleTo(toTangent);

        if (gapWidth > inferredConnectorSampleRadius || headingDelta > Math.PI * 0.28)
            continue;

        gapAccumulator += gapWidth;
        headingAccumulator += headingDelta;
        pairCount += 1;
        pairWindows.push({
            fromDistanceRange: [
                fromSample.distanceOnEdge,
                fromSample.distanceOnEdge,
            ],
            fromEdgeId: fromEdge.id,
            fromLateralRange: {
                max: Math.min(fromSample.legalLateralRange.max, fromSample.corridorHalfWidth),
                min: Math.max(fromSample.legalLateralRange.min, fromSample.corridorHalfWidth * 0.35),
            },
            fromSampleRange: [fromIndex, fromIndex],
            gapWidth,
            headingDelta,
            id: `${fromEdge.id}-${toEdge.id}-window-${pairWindows.length}`,
            overlapDistance: 0,
            toDistanceRange: [
                toSample.distanceOnEdge,
                toSample.distanceOnEdge,
            ],
            toEdgeId: toEdge.id,
            toLateralRange: {
                max: Math.min(toSample.legalLateralRange.max, -toSample.corridorHalfWidth * 0.35),
                min: Math.max(toSample.legalLateralRange.min, -toSample.corridorHalfWidth),
            },
            toSampleRange: [nearestToIndex, nearestToIndex],
        });
    }

    if (!pairCount)
        return undefined;

    let overlapDistance = Math.min(
        fromEndSample.distanceOnEdge - fromStartSample.distanceOnEdge,
        toEndSample.distanceOnEdge - toStartSample.distanceOnEdge,
    );

    return {
        gapWidth: gapAccumulator / pairCount,
        headingDelta: headingAccumulator / pairCount,
        overlapDistance,
        windows: pairWindows.map((window, index) => ({
            ...window,
            id: `${fromEdge.id}-${toEdge.id}-window-${index}`,
            overlapDistance,
        })),
    };
};

const buildConnectorFromEdges = (
    connectors: Array<TrackGraphConnector>,
    edges: Array<TrackGraphEdge>,
    fromEdge: TrackGraphEdge,
    toEdge: TrackGraphEdge,
    sampleWindow: ConnectorBuildWindow | undefined,
    options: ConnectorBuildOptions,
): TrackGraphConnector | undefined => {
    if (!sampleWindow)
        return undefined;

    let stats = computeConnectorStats(fromEdge, toEdge, sampleWindow);
    if (!stats)
        return undefined;

    let connector: TrackGraphConnector = {
        fromEdgeId: fromEdge.id,
        id: `connector-${connectors.length}`,
        isBidirectional: options.bidirectional,
        kind: options.kind,
        overlapDistance: stats.overlapDistance,
        preferredSpeedHint: Math.max(0.3, 1 - stats.headingDelta * 0.8),
        toEdgeId: toEdge.id,
        transitionType: options.transitionType,
        windows: stats.windows,
    };
    connectors.push(connector);
    fromEdge.connectorIdsOut.push(connector.id);
    toEdge.connectorIdsIn.push(connector.id);
    return connector;
};

const addAuthoredConnectors = (
    trackData: TrackData,
    edges: Array<TrackGraphEdge>,
    connectors: Array<TrackGraphConnector>,
) => {
    for (let metadata of trackData.connectors || []) {
        let fromEdge = edges.find((edge) => edge.sourceCurveIndex === metadata.fromCurveIndex);
        let toEdge = edges.find((edge) => edge.sourceCurveIndex === metadata.toCurveIndex);
        if (!fromEdge || !toEdge)
            continue;

        let sampleWindow = getConnectorSampleWindow(
            fromEdge,
            toEdge,
            metadata.windowRatioRange,
        );
        let connector = buildConnectorFromEdges(
            connectors,
            edges,
            fromEdge,
            toEdge,
            sampleWindow,
            {
                bidirectional: metadata.bidirectional !== false,
                kind: "authored",
                transitionType: metadata.transitionType || "lane-change",
            },
        );
        if (!connector)
            continue;

        if (metadata.bidirectional !== false) {
            let reverseWindow = getConnectorSampleWindow(
                toEdge,
                fromEdge,
                metadata.windowRatioRange,
            );
            buildConnectorFromEdges(
                connectors,
                edges,
                toEdge,
                fromEdge,
                reverseWindow,
                {
                    bidirectional: true,
                    kind: "authored",
                    transitionType: metadata.transitionType || "lane-change",
                },
            );
        }
    }
};

const hasExistingConnector = (
    connectors: Array<TrackGraphConnector>,
    fromEdgeId: string,
    toEdgeId: string,
): boolean => connectors.some((connector) =>
    connector.fromEdgeId === fromEdgeId && connector.toEdgeId === toEdgeId,
);

const edgesMaySupportInferredConnector = (
    first: TrackGraphEdge,
    second: TrackGraphEdge,
): boolean => {
    if (first.id === second.id)
        return false;
    if (!first.samples.length || !second.samples.length)
        return false;
    if (first.sourceCurveIndex === second.sourceCurveIndex)
        return false;
    return Math.abs(first.routeOrder - second.routeOrder) <= 2 ||
        first.splitGroupId === second.splitGroupId ||
        first.mergeGroupId === second.mergeGroupId;
};

const addInferredConnectors = (
    edges: Array<TrackGraphEdge>,
    connectors: Array<TrackGraphConnector>,
) => {
    for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
            let first = edges[i];
            let second = edges[j];
            if (!edgesMaySupportInferredConnector(first, second))
                continue;
            if (hasExistingConnector(connectors, first.id, second.id) ||
                hasExistingConnector(connectors, second.id, first.id)) {
                continue;
            }

            let sampleWindow = getConnectorSampleWindow(first, second);
            let stats = sampleWindow ?
                computeConnectorStats(first, second, sampleWindow) :
                undefined;
            if (!stats)
                continue;
            if (stats.gapWidth > inferredConnectorGapLimit ||
                stats.headingDelta > inferredConnectorHeadingLimit ||
                stats.overlapDistance < inferredConnectorOverlapMin) {
                continue;
            }

            buildConnectorFromEdges(
                connectors,
                edges,
                first,
                second,
                sampleWindow,
                {
                    bidirectional: true,
                    kind: "inferred",
                    transitionType: "lane-change",
                },
            );
            let reverseWindow = getConnectorSampleWindow(second, first);
            buildConnectorFromEdges(
                connectors,
                edges,
                second,
                first,
                reverseWindow,
                {
                    bidirectional: true,
                    kind: "inferred",
                    transitionType: "lane-change",
                },
            );
        }
    }
};

const validateGraph = (
    graph: Omit<TrackGraph, "validation">,
    trackData: TrackData,
): TrackGraphValidationReport => {
    let issues: Array<TrackGraphValidationIssue> = [];
    let reachableEdgeIds = new Set<string>();
    let queue = [...graph.primaryRouteEdgeIds];

    while (queue.length) {
        let edgeId = queue.shift();
        if (!edgeId || reachableEdgeIds.has(edgeId))
            continue;
        reachableEdgeIds.add(edgeId);

        let edge = graph.edges.find((candidate) => candidate.id === edgeId);
        if (!edge)
            continue;

        let endNode = graph.nodes.find((node) => node.id === edge.endNodeId);
        for (let nextEdgeId of endNode?.edgeIdsOut || []) {
            if (!reachableEdgeIds.has(nextEdgeId))
                queue.push(nextEdgeId);
        }
        for (let connectorId of edge.connectorIdsOut) {
            let connector = graph.connectors.find((candidate) => candidate.id === connectorId);
            if (connector && !reachableEdgeIds.has(connector.toEdgeId))
                queue.push(connector.toEdgeId);
        }
    }

    for (let edge of graph.edges) {
        if (!reachableEdgeIds.has(edge.id)) {
            issues.push({
                edgeIds: [edge.id],
                kind: "disconnected-loop",
                message: `边 ${edge.id} 未从主赛道连通图可达`,
                severity: "error",
            });
        }
    }

    for (let connector of graph.connectors) {
        let gapWidth = connector.windows.reduce(
            (sum, window) => sum + window.gapWidth,
            0,
        ) / Math.max(connector.windows.length, 1);
        let headingDelta = connector.windows.reduce(
            (sum, window) => sum + window.headingDelta,
            0,
        ) / Math.max(connector.windows.length, 1);
        if (
            connector.kind === "inferred" &&
            (gapWidth > inferredConnectorGapLimit || headingDelta > inferredConnectorHeadingLimit)
        ) {
            issues.push({
                connectorId: connector.id,
                edgeIds: [connector.fromEdgeId, connector.toEdgeId],
                kind: "illegal-connector-candidate",
                message: `推断连接器 ${connector.id} 过宽或夹角过大，平均 gap=${gapWidth.toFixed(2)} heading=${headingDelta.toFixed(3)}`,
                severity: "warning",
            });
        }
    }

    for (let node of graph.nodes) {
        if (node.edgeIdsOut.length > 1) {
            let branchEdges = node.edgeIdsOut
                .map((edgeId) => graph.edges.find((edge) => edge.id === edgeId))
                .filter((edge): edge is TrackGraphEdge => !!edge);
            let sameHeadingBranchCount = 0;
            for (let i = 0; i < branchEdges.length; i++) {
                for (let j = i + 1; j < branchEdges.length; j++) {
                    let firstSample = branchEdges[i].samples[0];
                    let secondSample = branchEdges[j].samples[0];
                    if (!firstSample || !secondSample)
                        continue;
                    let delta = fromNpcVector(firstSample.tangent)
                        .angleTo(fromNpcVector(secondSample.tangent));
                    if (delta < 0.1)
                        sameHeadingBranchCount += 1;
                }
            }

            if (sameHeadingBranchCount > 0) {
                issues.push({
                    edgeIds: branchEdges.map((edge) => edge.id),
                    kind: "ambiguous-branch-zone",
                    message: `分支节点 ${node.id} 的多个出口航向过近，可能导致进入岔路犹豫`,
                    nodeId: node.id,
                    severity: "warning",
                });
            }
        }
    }

    for (let metadata of trackData.connectors || []) {
        let fromEdge = graph.edges.find((edge) => edge.sourceCurveIndex === metadata.fromCurveIndex);
        let toEdge = graph.edges.find((edge) => edge.sourceCurveIndex === metadata.toCurveIndex);
        if (!fromEdge || !toEdge)
            continue;

        let hasLegalTransition = graph.connectors.some((connector) =>
            connector.fromEdgeId === fromEdge.id &&
            connector.toEdgeId === toEdge.id,
        );
        if (!hasLegalTransition) {
            issues.push({
                edgeIds: [fromEdge.id, toEdge.id],
                kind: "missing-legal-transition",
                message: `赛道显式声明的连接器 ${metadata.fromCurveIndex}->${metadata.toCurveIndex} 未成功生成`,
                severity: "error",
            });
        }
    }

    return {
        hasErrors: issues.some((issue) => issue.severity === "error"),
        issues,
    };
};

const buildTrackGraph = (trackData: TrackData): TrackGraph => {
    let nodes: Array<TrackGraphNode> = [];
    let edges: Array<TrackGraphEdge> = [];
    let connectors: Array<TrackGraphConnector> = [];
    let totalLength = 0;
    let baseCorridorHalfWidth = inferBaseCorridorHalfWidth(trackData);

    for (let i = 0; i < trackData.curveData.length; i++) {
        let points = getCurvePoints(trackData.curveData[i]);
        if (points.length < 2)
            continue;

        let startNode = findOrCreateNode(
            nodes,
            toNpcVector(points[0]),
            i === 0 ? "start" : "normal",
        );
        let endNode = findOrCreateNode(nodes, toNpcVector(points[points.length - 1]));
        let { length, samples } = buildEdgeSamples(
            points,
            totalLength,
            baseCorridorHalfWidth,
        );
        let edge: TrackGraphEdge = {
            connectorIdsIn: [],
            connectorIdsOut: [],
            endNodeId: endNode.id,
            id: `edge-${edges.length}`,
            isBranchAlternative: false,
            length,
            routeOrder: edges.length,
            samples,
            sourceCurveIndex: i,
            startNodeId: startNode.id,
        };
        edges.push(edge);
        startNode.edgeIdsOut.push(edge.id);
        endNode.edgeIdsIn.push(edge.id);
        totalLength += length;
    }

    assignBranchGroups(nodes, edges);
    addAuthoredConnectors(trackData, edges, connectors);
    addInferredConnectors(edges, connectors);

    let partialGraph = {
        connectors,
        edges,
        nodes,
        primaryRouteEdgeIds: edges.map((edge) => edge.id),
        totalLength,
    };

    return {
        ...partialGraph,
        validation: validateGraph(partialGraph, trackData),
    };
};

const getEdge = (graph: TrackGraph, edgeId: string): TrackGraphEdge | undefined =>
    graph.edges.find((edge) => edge.id === edgeId);

const getNextEdgeByRouteOrder = (
    graph: TrackGraph,
    edge: TrackGraphEdge | undefined,
): TrackGraphEdge | undefined => {
    if (!edge || !graph.edges.length)
        return undefined;

    let nextRouteOrder = (edge.routeOrder + 1) % graph.edges.length;
    return graph.edges.find((candidate) => candidate.routeOrder === nextRouteOrder);
};

const getConnector = (
    graph: TrackGraph,
    connectorId: string | undefined,
): TrackGraphConnector | undefined => {
    if (!connectorId)
        return undefined;
    return graph.connectors.find((connector) => connector.id === connectorId);
};

const getNode = (graph: TrackGraph, nodeId: string): TrackGraphNode | undefined =>
    graph.nodes.find((node) => node.id === nodeId);

const getRouteLength = (graph: TrackGraph, routeState: NpcRouteState): number =>
    routeState.route.edgeIds.reduce((total, edgeId) => {
        let edge = getEdge(graph, edgeId);
        return total + (edge?.length || 0);
    }, 0);

const getProjectionRouteProgress = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    projection: EdgeProjection,
): number | undefined => {
    let progress = 0;
    for (let edgeId of routeState.route.edgeIds) {
        let edge = getEdge(graph, edgeId);
        if (!edge)
            continue;

        if (edgeId === projection.edgeId)
            return progress + Math.min(projection.distanceOnEdge, edge.length);

        progress += edge.length;
    }

    return undefined;
};

const getSignedRouteDistance = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    fromProjection: EdgeProjection,
    toProjection: EdgeProjection,
): number | undefined => {
    let routeLength = getRouteLength(graph, routeState);
    if (routeLength <= 0)
        return undefined;

    let fromProgress = getProjectionRouteProgress(graph, routeState, fromProjection);
    let toProgress = getProjectionRouteProgress(graph, routeState, toProjection);
    if (fromProgress === undefined || toProgress === undefined)
        return undefined;

    let distance = toProgress - fromProgress;
    if (distance > routeLength * 0.5)
        distance -= routeLength;
    if (distance < -routeLength * 0.5)
        distance += routeLength;

    return distance;
};

const getRouteSamplesAhead = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    projection: EdgeProjection | undefined,
    maxDistance: number,
    maxSamples: number = 32,
): Array<TrackGraphEdgeSample> => {
    if (!projection || maxDistance <= 0 || maxSamples <= 0)
        return [];

    let samples: Array<TrackGraphEdgeSample> = [];
    let startProgress = getProjectionRouteProgress(graph, routeState, projection);
    if (startProgress === undefined)
        return samples;

    let routeLength = Math.max(getRouteLength(graph, routeState), 0.0001);
    let progress = 0;

    for (let edgeId of routeState.route.edgeIds) {
        let edge = getEdge(graph, edgeId);
        if (!edge)
            continue;

        for (let sample of edge.samples) {
            let sampleProgress = progress + sample.distanceOnEdge;
            let distanceAhead = sampleProgress - startProgress;
            if (distanceAhead < 0)
                distanceAhead += routeLength;
            if (distanceAhead <= 0.1 || distanceAhead > maxDistance)
                continue;

            samples.push(sample);
            if (samples.length >= maxSamples)
                return samples;
        }

        progress += edge.length;
    }

    return samples;
};

const getRouteTargetSample = (
    graph: TrackGraph,
    routeState: NpcRouteState,
    projection: EdgeProjection | undefined,
    targetDistance: number,
): TrackGraphEdgeSample | undefined => {
    let projectionProgress = projection ?
        getProjectionRouteProgress(graph, routeState, projection) :
        undefined;
    if (projectionProgress === undefined)
        return undefined;

    let routeLength = Math.max(getRouteLength(graph, routeState), 0.0001);
    let bestSample: TrackGraphEdgeSample | undefined;
    let bestDistanceError = Infinity;
    let progress = 0;

    for (let edgeId of routeState.route.edgeIds) {
        let edge = getEdge(graph, edgeId);
        if (!edge)
            continue;

        for (let sample of edge.samples) {
            let sampleProgress = progress + sample.distanceOnEdge;
            let distanceAhead = sampleProgress - projectionProgress;
            if (distanceAhead < 0)
                distanceAhead += routeLength;
            if (distanceAhead <= 0.1)
                continue;

            let distanceError = Math.abs(distanceAhead - targetDistance);
            if (distanceError < bestDistanceError) {
                bestDistanceError = distanceError;
                bestSample = sample;
            }
        }

        progress += edge.length;
    }

    return bestSample;
};

const getCandidateNeighborhood = (
    graph: TrackGraph,
    previous: EdgeProjection | undefined,
    routeState: NpcRouteState | undefined,
): RouteEdgeNeighborhood => {
    let previousEdge = previous ? getEdge(graph, previous.edgeId) : undefined;
    let routeEdges = routeState?.route.edgeIds.length ?
        routeState.route.edgeIds
            .map((edgeId) => getEdge(graph, edgeId))
            .filter((edge): edge is TrackGraphEdge => !!edge) :
        graph.edges;
    let activeConnector = getConnector(graph, routeState?.committedConnector?.connectorId);
    let branchEdge = routeState?.committedBranchEdgeId ?
        getEdge(graph, routeState.committedBranchEdgeId) :
        undefined;
    let nextRouteEdge = getNextEdgeByRouteOrder(graph, previousEdge);

    return {
        activeConnector,
        branchEdge,
        nextRouteEdge,
        previousEdge,
        previousProjection: previous,
        routeEdges,
    };
};

const selectCandidateEdges = (
    graph: TrackGraph,
    neighborhood: RouteEdgeNeighborhood,
): Array<TrackGraphEdge> => {
    let {
        activeConnector,
        branchEdge,
        nextRouteEdge,
        previousEdge,
        previousProjection,
        routeEdges,
    } = neighborhood;
    let candidateEdges = previousEdge ?
        routeEdges.filter((edge) =>
            edge.id === previousEdge.id ||
            edge.id === nextRouteEdge?.id ||
            edge.startNodeId === previousEdge.endNodeId ||
            edge.endNodeId === previousEdge.endNodeId ||
            edge.routeOrder === previousEdge.routeOrder + 1,
        ) :
        routeEdges;

    if (branchEdge) {
        let branchTransitionReady = !!(
            previousEdge &&
            previousProjection &&
            previousEdge.id !== branchEdge.id &&
            previousProjection.edgeId === previousEdge.id &&
            previousEdge.endNodeId === branchEdge.startNodeId &&
            previousEdge.length - previousProjection.distanceOnEdge <=
                branchProjectionActivationDistance
        );
        if (!branchTransitionReady &&
            previousEdge &&
            previousEdge.id !== branchEdge.id) {
            candidateEdges = candidateEdges.filter((edge) =>
                edge.id === previousEdge.id,
            );
        }

        candidateEdges = candidateEdges.filter((edge) =>
            edge.id === branchEdge.id ||
            edge.id === previousEdge?.id ||
            edge.id === nextRouteEdge?.id ||
            edge.startNodeId === branchEdge.startNodeId ||
            edge.startNodeId === previousEdge?.endNodeId ||
            edge.startNodeId === branchEdge.endNodeId ||
            edge.routeOrder === ((previousEdge?.routeOrder ?? -1) + 1),
        );
    }

    if (activeConnector) {
        let connectorEdgeIds = new Set([
            activeConnector.fromEdgeId,
            activeConnector.toEdgeId,
            previousEdge?.id,
        ].filter((edgeId): edgeId is string => !!edgeId));
        candidateEdges = routeEdges.filter((edge) => connectorEdgeIds.has(edge.id));
    }

    if (!candidateEdges.length)
        candidateEdges = routeEdges.length ? routeEdges : graph.edges;

    return candidateEdges;
};

const getConnectorForTransition = (
    graph: TrackGraph,
    fromEdgeId: string | undefined,
    toEdgeId: string,
): TrackGraphConnector | undefined => {
    if (!fromEdgeId)
        return undefined;
    return graph.connectors.find((connector) =>
        connector.fromEdgeId === fromEdgeId && connector.toEdgeId === toEdgeId,
    );
};

const projectOntoEdges = (
    graph: TrackGraph,
    position: NpcVector3,
    direction: NpcVector3 | undefined,
    previous: EdgeProjection | undefined,
    routeState: NpcRouteState | undefined,
    candidateEdges: Array<TrackGraphEdge>,
): EdgeProjection | undefined => {
    let bestProjection: EdgeProjection | undefined;
    let bestScore = Infinity;
    let illegalTransitionRejectCount = 0;

    for (let edge of candidateEdges) {
        for (let i = 0; i < edge.samples.length; i++) {
            let sample = edge.samples[i];
            let distanceSq = distanceSqNpc(position, sample.point);
            let headingPenalty = 0;
            if (direction) {
                let directionVector = fromNpcVector(direction).normalize();
                let tangent = fromNpcVector(sample.tangent).normalize();
                headingPenalty = (1 - directionVector.dot(tangent)) * 18;
            }

            let offset = new THREE.Vector3(
                position.x - sample.point.x,
                position.y - sample.point.y,
                position.z - sample.point.z,
            );
            let lateralOffset = dotNpc(toNpcVector(offset), sample.lateral);
            let transitionConnector = getConnectorForTransition(
                graph,
                previous?.edgeId,
                edge.id,
            );
            let edgeIsOnRoute = routeState?.route.edgeIds.includes(edge.id) ?? true;
            let routePenalty = previous && edge.id !== previous.edgeId ? routeSwitchPenalty : 0;
            let illegalTransition = !!(
                previous &&
                previous.edgeId !== edge.id &&
                !transitionConnector &&
                !edgeIsOnRoute &&
                !routeState?.committedConnector &&
                !routeState?.committedBranchEdgeId
            );
            if (illegalTransition)
                illegalTransitionRejectCount += 1;
            let score = distanceSq + headingPenalty + routePenalty +
                (illegalTransition ? illegalTransitionPenalty : 0);
            if (score >= bestScore)
                continue;

            let transitionSource: EdgeProjection["transitionSource"] = "route";
            let projectionReason = "route-continuity";
            if (transitionConnector) {
                transitionSource = "connector";
                projectionReason = `connector-${transitionConnector.id}`;
            } else if (
                routeState?.committedBranchEdgeId &&
                edge.id === routeState.committedBranchEdgeId
            ) {
                transitionSource = "branch";
                projectionReason = `branch-${routeState.committedBranchId || edge.id}`;
            } else if (!edgeIsOnRoute) {
                transitionSource = "fallback";
                projectionReason = "fallback-nearest";
            }
            bestScore = score;
            bestProjection = {
                connectorId: transitionConnector?.id || routeState?.committedConnector?.connectorId,
                distanceOnEdge: sample.distanceOnEdge,
                distanceToCenter: Math.sqrt(distanceSq),
                edgeId: edge.id,
                headingError: headingPenalty,
                illegalTransitionRejectCount,
                lateralOffset,
                legalLateralRange: { ...sample.legalLateralRange },
                point: sample.point,
                projectionReason,
                routeDistance: sample.arcLength,
                sampleIndex: i,
                transitionSource,
                width: sample.width,
            };
        }
    }

    return bestProjection;
};

const projectOntoGraph = (
    graph: TrackGraph,
    position: NpcVector3,
    direction?: NpcVector3,
    previous?: EdgeProjection,
    routeState?: NpcRouteState,
): EdgeProjection | undefined => {
    let neighborhood = getCandidateNeighborhood(graph, previous, routeState);
    let candidateEdges = selectCandidateEdges(graph, neighborhood);
    let constrainedProjection = projectOntoEdges(
        graph,
        position,
        direction,
        previous,
        routeState,
        candidateEdges,
    );
    if (
        constrainedProjection &&
        constrainedProjection.distanceToCenter <=
            constrainedProjection.width * routeProjectionFallbackThreshold
    ) {
        return constrainedProjection;
    }

    let fallbackProjection = projectOntoEdges(
        graph,
        position,
        direction,
        previous,
        undefined,
        graph.edges,
    );
    if (!fallbackProjection)
        return constrainedProjection;
    if (!constrainedProjection)
        return fallbackProjection;

    return fallbackProjection.distanceToCenter + 0.75 < constrainedProjection.distanceToCenter ?
        fallbackProjection :
        constrainedProjection;
};

export {
    buildTrackGraph,
    getConnector,
    getEdge,
    getNode,
    getProjectionRouteProgress,
    getRouteLength,
    getRouteSamplesAhead,
    getRouteTargetSample,
    getSignedRouteDistance,
    projectOntoGraph,
    validateGraph,
};
