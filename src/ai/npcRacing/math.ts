import * as THREE from "three";
import {
    NpcVector3,
    TrackGraphEdgeSample,
} from "./types";

const toNpcVector = (vector: THREE.Vector3): NpcVector3 => ({
    x: vector.x,
    y: vector.y,
    z: vector.z,
});

const fromNpcVector = (vector: NpcVector3): THREE.Vector3 =>
    new THREE.Vector3(vector.x, vector.y, vector.z);

const addNpcVectors = (first: NpcVector3, second: NpcVector3): NpcVector3 => ({
    x: first.x + second.x,
    y: first.y + second.y,
    z: first.z + second.z,
});

const scaleNpcVector = (vector: NpcVector3, scale: number): NpcVector3 => ({
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale,
});

const distanceSqNpc = (first: NpcVector3, second: NpcVector3): number => {
    let dx = first.x - second.x;
    let dy = first.y - second.y;
    let dz = first.z - second.z;
    return dx * dx + dy * dy + dz * dz;
};

const dotNpc = (first: NpcVector3, second: NpcVector3): number =>
    first.x * second.x + first.y * second.y + first.z * second.z;

const normalizeNpc = (vector: NpcVector3): NpcVector3 => {
    let length = Math.sqrt(dotNpc(vector, vector));
    if (length <= 0.0001)
        return { x: 0, y: 0, z: 1 };

    return scaleNpcVector(vector, 1 / length);
};

const cloneSample = (sample: TrackGraphEdgeSample): TrackGraphEdgeSample => ({
    ...sample,
    lateral: { ...sample.lateral },
    point: { ...sample.point },
    tangent: { ...sample.tangent },
});

export {
    addNpcVectors,
    cloneSample,
    distanceSqNpc,
    dotNpc,
    fromNpcVector,
    normalizeNpc,
    scaleNpcVector,
    toNpcVector,
};
