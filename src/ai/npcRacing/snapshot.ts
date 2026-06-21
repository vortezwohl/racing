import Vehicle from "../../objects/Vehicle";
import {
    RaceSnapshot,
    RaceVehicleSnapshot,
} from "./types";
import { toNpcVector } from "./math";

type SnapshotVehicleState = {
    id: string;
    isLocalPlayer: boolean;
    vehicle: Vehicle;
};

const buildVehicleSnapshot = (
    state: SnapshotVehicleState,
): RaceVehicleSnapshot => ({
    direction: toNpcVector(state.vehicle.direction),
    draftCharge: state.vehicle.draftCharge,
    id: state.id,
    isAlive: state.vehicle.isAlive,
    isLocalPlayer: state.isLocalPlayer,
    position: toNpcVector(state.vehicle.position),
    speed: state.vehicle.velocity.length(),
    velocity: toNpcVector(state.vehicle.velocity),
});

const buildRaceSnapshot = (
    id: number,
    raceRunningMs: number,
    timestampMs: number,
    vehicleStates: Array<SnapshotVehicleState>,
): RaceSnapshot => ({
    id,
    raceRunningMs,
    timestampMs,
    vehicles: vehicleStates.map(buildVehicleSnapshot),
});

export {
    SnapshotVehicleState,
    buildRaceSnapshot,
    buildVehicleSnapshot,
};
