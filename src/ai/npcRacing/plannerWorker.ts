import {
    NpcPlanBatch,
    NpcPlanningConfig,
    NpcRouteState,
    PlannerWorkerRequest,
    PlannerWorkerResponse,
    RaceSnapshot,
    TrackGraph,
} from "./types";
import { planControl } from "./controlPlanner";
import { planRoute } from "./routePlanner";
import { projectOntoGraph } from "./trackGraph";
import { planTrafficIntent } from "./trafficPlanner";

let graph: TrackGraph | undefined;
let config: NpcPlanningConfig | undefined;
let latestSnapshotId = 0;
let routeStates: Record<string, NpcRouteState> = {};
let trafficIntents: Record<string, ReturnType<typeof planTrafficIntent>> = {};
let lastRoutePlanMs: Record<string, number> = {};
let lastTrafficPlanMs: Record<string, number> = {};
let planVersion = 0;

let postPlannerMessage = (message: PlannerWorkerResponse) => {
    if (typeof self !== "undefined" && "postMessage" in self)
        self.postMessage(message);
};

const buildPlanBatch = (snapshot: RaceSnapshot): NpcPlanBatch | undefined => {
    if (!graph || !config)
        return undefined;

    let generatedAtMs = snapshot.timestampMs;
    let routeIntervalMs = 1000 / Math.max(config.rates.routeHz, 1);
    let trafficIntervalMs = 1000 / Math.max(config.rates.trafficHz, 1);
    let plans: NpcPlanBatch["plans"] = {};

    for (let vehicle of snapshot.vehicles) {
        if (vehicle.isLocalPlayer || !vehicle.isAlive)
            continue;

        let projection = projectOntoGraph(
            graph,
            vehicle.position,
            vehicle.direction,
            routeStates[vehicle.id]?.projection,
            routeStates[vehicle.id],
        );
        if (
            !routeStates[vehicle.id] ||
            generatedAtMs - (lastRoutePlanMs[vehicle.id] || 0) >= routeIntervalMs
        ) {
            routeStates[vehicle.id] = planRoute(
                graph,
                config,
                routeStates[vehicle.id],
                projection,
                snapshot,
            );
            lastRoutePlanMs[vehicle.id] = generatedAtMs;
        } else {
            routeStates[vehicle.id] = {
                ...routeStates[vehicle.id],
                projection,
            };
        }

        let routeState = routeStates[vehicle.id];
        if (!routeState)
            continue;

        if (
            !trafficIntents[vehicle.id] ||
            generatedAtMs - (lastTrafficPlanMs[vehicle.id] || 0) >= trafficIntervalMs
        ) {
            trafficIntents[vehicle.id] = planTrafficIntent(
                graph,
                vehicle,
                snapshot,
                routeState,
                config,
            );
            lastTrafficPlanMs[vehicle.id] = generatedAtMs;
        }

        let plan = planControl(
            graph,
            vehicle,
            routeState,
            trafficIntents[vehicle.id],
            config,
            snapshot.id,
            snapshot.raceRunningMs,
        );
        plans[vehicle.id] = {
            ...plan,
            generatedAtMs,
            planVersion: ++planVersion,
            telemetry: {
                ...plan.telemetry,
                plannerMode: "async",
            },
        };
    }

    return {
        generatedAtMs,
        plans,
        snapshotId: snapshot.id,
    };
};

if (typeof self !== "undefined") {
    self.onmessage = (event: MessageEvent<PlannerWorkerRequest>) => {
        if (event.data.type === "initialize") {
            graph = event.data.graph;
            config = event.data.config;
            routeStates = {};
            trafficIntents = {};
            lastRoutePlanMs = {};
            lastTrafficPlanMs = {};
            latestSnapshotId = 0;
            planVersion = 0;
            postPlannerMessage({
                message: "npc-planner-ready",
                type: "ready",
            });
            return;
        }

        if (event.data.type === "snapshot") {
            let snapshot = event.data.snapshot;
            if (snapshot.id <= latestSnapshotId)
                return;

            latestSnapshotId = snapshot.id;
            let batch = buildPlanBatch(snapshot);
            if (batch) {
                postPlannerMessage({
                    batch,
                    type: "plan-batch",
                });
            }
        }
    };
}

export {};
