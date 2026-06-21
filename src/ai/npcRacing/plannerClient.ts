import {
    NpcControlPlan,
    NpcPlanBatch,
    NpcPlanningConfig,
    PlannerWorkerResponse,
    RaceSnapshot,
    TrackGraph,
} from "./types";

class NpcPlannerClient {
    config: NpcPlanningConfig;
    graph?: TrackGraph;
    latestBatch?: NpcPlanBatch;
    latestSnapshotId: number;
    worker?: Worker;

    constructor(config: NpcPlanningConfig) {
        this.config = config;
        this.latestSnapshotId = 0;
    }

    initialize(graph: TrackGraph) {
        this.graph = graph;
        if (typeof Worker === "undefined")
            return;

        try {
            this.worker = new Worker("./npcPlannerWorker.bundle.js");
            this.worker.onmessage = (event: MessageEvent<PlannerWorkerResponse>) => {
                if (event.data.type === "plan-batch")
                    this.acceptPlanBatch(event.data.batch);
            };
            this.worker.postMessage({
                config: this.config,
                graph,
                type: "initialize",
            });
        } catch (error) {
            this.worker = undefined;
        }
    }

    publishSnapshot(snapshot: RaceSnapshot) {
        this.latestSnapshotId = Math.max(this.latestSnapshotId, snapshot.id);
        if (this.worker) {
            this.worker.postMessage({
                snapshot,
                type: "snapshot",
            });
        }
    }

    acceptPlanBatch(batch: NpcPlanBatch) {
        if (batch.snapshotId < this.latestSnapshotId - 1)
            return;

        if (this.latestBatch && batch.snapshotId < this.latestBatch.snapshotId)
            return;

        this.latestBatch = batch;
    }

    getPlan(vehicleId: string, nowMs: number): NpcControlPlan | undefined {
        let plan = this.latestBatch?.plans[vehicleId];
        if (!plan)
            return undefined;

        if (nowMs - plan.generatedAtMs > this.config.budgets.stalePlanMs)
            return undefined;

        return plan;
    }

    getDebugSnapshot() {
        return {
            latestBatch: this.latestBatch,
            latestSnapshotId: this.latestSnapshotId,
            validation: this.graph?.validation,
        };
    }

    dispose() {
        this.worker?.terminate();
        this.worker = undefined;
        this.latestBatch = undefined;
        this.graph = undefined;
    }
}

export default NpcPlannerClient;
