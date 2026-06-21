export type NpcVector3 = {
    x: number;
    y: number;
    z: number;
};

export type NpcPlannerRates = {
    controlHz: number;
    routeHz: number;
    trafficHz: number;
};

export type NpcPlannerBudgets = {
    maxControlCandidates: number;
    maxDetailedVehicles: number;
    maxRouteCandidates: number;
    stalePlanMs: number;
    staleSnapshotMs: number;
};

export type NpcPlanningConfig = {
    assist: NpcAssistScalars;
    budgets: NpcPlannerBudgets;
    rates: NpcPlannerRates;
    routing: {
        branchCommitDistance: number;
        targetLookAheadDistance: number;
    };
    start: {
        fullThrottleMs: number;
        minThrottle: number;
        suppressAttackMs: number;
    };
};

export type TrackGraphNodeKind = "branch" | "checkpoint" | "merge" | "normal" | "start";

export type TrackGraphNode = {
    edgeIdsIn: Array<string>;
    edgeIdsOut: Array<string>;
    id: string;
    kind: TrackGraphNodeKind;
    position: NpcVector3;
};

export type CorridorLateralRange = {
    max: number;
    min: number;
};

export type TrackGraphConnectorKind = "authored" | "inferred";

export type TrackGraphConnectorTransitionType = "lane-change" | "merge" | "split";

export type TrackGraphEdgeSample = {
    arcLength: number;
    corridorHalfWidth: number;
    curvature: number;
    distanceOnEdge: number;
    legalLateralRange: CorridorLateralRange;
    lateral: NpcVector3;
    leftBoundary: NpcVector3;
    point: NpcVector3;
    rightBoundary: NpcVector3;
    safeSpeedHint: number;
    segmentType: "corner" | "hairpin" | "straight" | "sweeper";
    signedCurvature: number;
    tangent: NpcVector3;
    width: number;
};

export type TrackGraphConnectorWindow = {
    fromDistanceRange: [number, number];
    fromEdgeId: string;
    fromLateralRange: CorridorLateralRange;
    fromSampleRange: [number, number];
    gapWidth: number;
    headingDelta: number;
    id: string;
    overlapDistance: number;
    toDistanceRange: [number, number];
    toEdgeId: string;
    toLateralRange: CorridorLateralRange;
    toSampleRange: [number, number];
};

export type TrackGraphConnector = {
    fromEdgeId: string;
    id: string;
    isBidirectional: boolean;
    kind: TrackGraphConnectorKind;
    overlapDistance: number;
    preferredSpeedHint: number;
    toEdgeId: string;
    transitionType: TrackGraphConnectorTransitionType;
    windows: Array<TrackGraphConnectorWindow>;
};

export type TrackGraphValidationIssueKind =
    "ambiguous-branch-zone" |
    "disconnected-loop" |
    "illegal-connector-candidate" |
    "missing-legal-transition";

export type TrackGraphValidationIssue = {
    connectorId?: string;
    edgeIds?: Array<string>;
    kind: TrackGraphValidationIssueKind;
    message: string;
    nodeId?: string;
    severity: "error" | "warning";
};

export type TrackGraphValidationReport = {
    hasErrors: boolean;
    issues: Array<TrackGraphValidationIssue>;
};

export type TrackGraphEdge = {
    connectorIdsIn: Array<string>;
    connectorIdsOut: Array<string>;
    endNodeId: string;
    id: string;
    isBranchAlternative: boolean;
    length: number;
    mergeGroupId?: string;
    routeOrder: number;
    samples: Array<TrackGraphEdgeSample>;
    sourceCurveIndex: number;
    splitGroupId?: string;
    startNodeId: string;
};

export type TrackGraph = {
    connectors: Array<TrackGraphConnector>;
    edges: Array<TrackGraphEdge>;
    nodes: Array<TrackGraphNode>;
    primaryRouteEdgeIds: Array<string>;
    totalLength: number;
    validation: TrackGraphValidationReport;
};

export type EdgeProjection = {
    connectorId?: string;
    distanceOnEdge: number;
    distanceToCenter: number;
    edgeId: string;
    headingError: number;
    illegalTransitionRejectCount?: number;
    lateralOffset: number;
    legalLateralRange: CorridorLateralRange;
    point: NpcVector3;
    projectionReason?: string;
    routeDistance: number;
    sampleIndex: number;
    transitionSource?: "branch" | "connector" | "fallback" | "route";
    width: number;
};

export type RouteCandidate = {
    branchEdgeId?: string;
    branchNodeId?: string;
    branchReason: string;
    connectorEntryEdgeId?: string;
    connectorExitEdgeId?: string;
    connectorId?: string;
    edgeIds: Array<string>;
    id: string;
    length: number;
    mergeNodeId?: string;
    score: number;
};

export type NpcConnectorCommitState = {
    connectorId: string;
    fromEdgeId: string;
    progress: number;
    state: "aborted" | "active" | "approach" | "complete";
    toEdgeId: string;
    windowId?: string;
};

export type NpcRouteState = {
    activeConnectorId?: string;
    activeEdgeId?: string;
    branchMergeNodeId?: string;
    committedBranchEdgeId?: string;
    committedBranchId?: string;
    committedConnector?: NpcConnectorCommitState;
    desiredLateralOffset?: number;
    illegalTransitionRejectCount?: number;
    lateralOffsetRate?: number;
    projection?: EdgeProjection;
    projectionReason?: string;
    route: RouteCandidate;
    version: number;
};

export type NpcAssistScalars = {
    brake: number;
    draft: number;
    grip: number;
    racecraft: number;
    recovery: number;
    steer: number;
};

export type NpcRacecraftIntent = {
    mode: "attack" | "block" | "draft" | "launch" | "neutral" | "overtake" | "recover";
    preferredConnectorId?: string;
    reason?: string;
    targetEdgeId?: string;
    targetId?: string;
    targetLaneOffset?: number;
};

export type ProjectedRaceVehicle = {
    lateralGap: number;
    projection: EdgeProjection;
    relativeDistance: number;
    vehicle: RaceVehicleSnapshot;
};

export type NpcTrafficIndex = {
    ahead: Array<ProjectedRaceVehicle>;
    behind: Array<ProjectedRaceVehicle>;
    budgetStatus: "ok" | "truncated";
    projectedVehicles: Array<ProjectedRaceVehicle>;
    sideBySide: Array<ProjectedRaceVehicle>;
};

export type NpcControlPlan = {
    assist: NpcAssistScalars;
    brake: number;
    brakeScale: number;
    generatedAtMs: number;
    intent: NpcRacecraftIntent;
    planVersion: number;
    routeId: string;
    snapshotId: number;
    steer: number;
    steerScale: number;
    telemetry: NpcPlanTelemetry;
    throttle: number;
};

export type NpcPlanTelemetry = {
    activeConnectorId?: string;
    committedBranchId?: string;
    committedConnectorId?: string;
    connectorReason?: string;
    assistReason: string;
    budgetStatus: "ok" | "truncated";
    controlAgeMs: number;
    edgeId?: string;
    illegalTransitionRejectCount?: number;
    intentReason: string;
    plannerMode: "async" | "fallback" | "sync";
    projectionReason?: string;
    recoveryReason?: string;
    routeReason: string;
};

export type RaceVehicleSnapshot = {
    direction: NpcVector3;
    draftCharge: number;
    id: string;
    isAlive: boolean;
    isLocalPlayer: boolean;
    position: NpcVector3;
    speed: number;
    velocity: NpcVector3;
};

export type RaceSnapshot = {
    id: number;
    raceRunningMs: number;
    timestampMs: number;
    vehicles: Array<RaceVehicleSnapshot>;
};

export type NpcPlanBatch = {
    generatedAtMs: number;
    plans: Record<string, NpcControlPlan>;
    snapshotId: number;
};

export type PlannerWorkerRequest =
    | {
        config: NpcPlanningConfig;
        graph: TrackGraph;
        type: "initialize";
    }
    | {
        snapshot: RaceSnapshot;
        type: "snapshot";
    };

export type PlannerWorkerResponse =
    | {
        batch: NpcPlanBatch;
        type: "plan-batch";
    }
    | {
        message: string;
        type: "ready";
    };
