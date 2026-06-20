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
    fadeEndDistance: 3,
    fadeStartDistance: 8,
    flowSpeed: 0.006,
    glowOpacity: 0.1,
    glowWidth: 1.32,
    maxLength: 42,
    maxMarkerOpacity: 1,
    minLength: 14,
    minMarkerOpacity: 0.04,
    opacity: 0.42,
    sampleCount: 72,
    coreWidth: 0.56,
    wobbleStrength: 0.09,
    zoneRadius: 2.1,
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
