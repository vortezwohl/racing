import * as THREE from "three";

const racePerformance = {
    acceleration: 0.00125,
    collisionSlowScale: 0.62,
    deceleration: 0.00055,
    defaultGravity: new THREE.Vector3(0, -0.01, 0),
    draftAccelerationBonus: 0.45,
    draftChargeDecayPerMs: 0.00045,
    draftChargeGainPerMs: 0.0007,
    draftMaxSpeedBonus: 0.24,
    friction: 0.98,
    maxRoll: 0.36,
    maxSpeed: 0.9,
    turnRate: 0.0007,
};

const raceCamera = {
    draftFovBonus: 4,
    highSpeedFov: 88,
    lowSpeedFov: 68,
    maxFov: 92,
    smoothing: 0.08,
};

const raceTrail = {
    maxLength: 8,
    minLength: 2.5,
    sampleCount: 28,
    zoneRadius: 1.25,
};

const raceCollision = {
    pushStrength: 0.16,
    slowDurationMs: 450,
};

const raceIdentityColors = [
    0xffd166,
    0x06d6a0,
    0x4cc9f0,
    0xf72585,
    0xb8f35a,
    0xff8fab,
];

export {
    raceCamera,
    raceCollision,
    raceIdentityColors,
    racePerformance,
    raceTrail,
};
