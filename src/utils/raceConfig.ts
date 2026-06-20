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
    draftFovBonus: 6,
    highSpeedFov: 94,
    lowSpeedFov: 64,
    maxFov: 100,
    smoothing: 0.08,
};

const raceTrail = {
    centerFadeRadiusPx: 240,
    fadeEndDistance: 5.5,
    fadeStartDistance: 11,
    flowSpeed: 0.006,
    glowOpacity: 0.1,
    glowWidth: 1.32,
    markerCountdownFadeScale: 0.18,
    maxLength: 58,
    maxMarkerOpacity: 1,
    minDisplayLength: 2.4,
    minDisplaySpeed: 0.08,
    minLength: 12,
    minMarkerOpacity: 0,
    opacity: 0.42,
    sampleCount: 72,
    coreWidth: 0.42,
    lengthExponent: 1.9,
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
