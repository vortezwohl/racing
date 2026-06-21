import {
    NpcControlPlan,
    NpcPlanningConfig,
    NpcRouteState,
    RaceSnapshot,
    TrackGraph,
} from "./types";
import { planControl } from "./controlPlanner";
import { planRoute } from "./routePlanner";
import { projectOntoGraph } from "./trackGraph";
import { planTrafficIntent } from "./trafficPlanner";

type SyncNpcPlannerResult = {
    plan: NpcControlPlan;
    routeState: NpcRouteState;
};

const planSyncNpcControl = (
    graph: TrackGraph,
    snapshot: RaceSnapshot,
    selfId: string,
    previousRouteState: NpcRouteState | undefined,
    config: NpcPlanningConfig,
): SyncNpcPlannerResult | undefined => {
    let self = snapshot.vehicles.find((vehicle) => vehicle.id === selfId);
    if (!self || !self.isAlive)
        return undefined;

    let projection = projectOntoGraph(
        graph,
        self.position,
        self.direction,
        previousRouteState?.projection,
        previousRouteState,
    );
    let routeState = planRoute(
        graph,
        config,
        previousRouteState,
        projection,
        snapshot,
    );
    let intent = planTrafficIntent(graph, self, snapshot, routeState, config);
    let plan = planControl(
        graph,
        self,
        routeState,
        intent,
        config,
        snapshot.id,
        snapshot.raceRunningMs,
    );
    plan.telemetry.plannerMode = "sync";

    return {
        plan,
        routeState,
    };
};

export {
    SyncNpcPlannerResult,
    planSyncNpcControl,
};
