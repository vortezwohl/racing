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
    clusterOpacity: 0.3,
    clusterScale: 1.04,
    clusterSpread: 0.82,
    draftZoneRadius: 2.6,
    fadeEndDistance: 5.5,
    fadeStartDistance: 11,
    flowSpeed: 0.006,
    haloOpacity: 0.16,
    haloScale: 1.86,
    markerCountdownFadeScale: 0.18,
    markerFontMinPx: 11,
    markerFontScaleVw: 0.9,
    markerFontSizePx: 16,
    markerPointerHeightPx: 11,
    markerPointerWidthPx: 6,
    markerWorldOffset: 1.35,
    maxLength: 58,
    maxMarkerOpacity: 1,
    minDisplayLength: 2.4,
    minDisplaySpeed: 0.08,
    minLength: 12,
    minMarkerOpacity: 0,
    opacity: 0.42,
    particleOpacity: 0.18,
    particleScale: 0.48,
    particleSpread: 0.52,
    sampleCount: 72,
    lengthExponent: 1.9,
    wobbleStrength: 0.09,
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
