import * as THREE from "three";
import { GUI } from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry"
import { NPC, Player, Track, Vehicle } from "../objects/objects";
import { Satellite } from "../decorations/decorations";
import { randomVector } from "../utils/geometry";
import { Controls, GameSceneOptions, RaceUi } from "../utils/interfaces";
import RaceHud, {
    RaceHudAction,
    RaceHudLeaderboardEntry,
    RaceHudState,
} from "../ui/RaceHud";
import {
    raceCollision,
    raceIdentityColors,
    raceNpc,
    racePerformance,
    raceTrail,
} from "../utils/raceConfig";
import NpcPlannerClient from "../ai/npcRacing/plannerClient";
import { buildRaceSnapshot } from "../ai/npcRacing/snapshot";
import { tracks } from "../../data/tracks/tracks";
import {
    menuVehicles,
    MenuVehicle,
} from "../../data/vehicles/vehicles";

type NebulaGlow = {
    baseScale: THREE.Vector2;
    driftAmplitude: THREE.Vector3;
    driftPhase: number;
    driftSpeed: number;
    origin: THREE.Vector3;
    pulseAmplitude: number;
    pulseSpeed: number;
    sprite: THREE.Sprite;
};

type FloatingCluster = {
    driftAmplitude: THREE.Vector3;
    driftPhase: number;
    driftSpeed: number;
    mesh: THREE.Group;
    origin: THREE.Vector3;
    pieces: Array<{
        driftAmplitude: THREE.Vector3;
        driftPhase: number;
        driftSpeed: number;
        mesh: THREE.Group;
        origin: THREE.Vector3;
        pulseAmplitude: number;
        pulseSpeed: number;
        rotationRate: THREE.Vector3;
    }>;
    rotationRate: THREE.Vector3;
};

type RaceDebugState = {
    finishHandledAt?: number;
    finishPanelVisibleAt?: number;
    laps: number;
};

type RaceMarkerElements = {
    label: HTMLDivElement;
    pointer: HTMLDivElement;
    root: HTMLDivElement;
};

type TrailClusterSet = {
    halo: THREE.Sprite;
    primary: THREE.Sprite;
    secondary: Array<THREE.Sprite>;
    spark: THREE.Sprite;
};

type DraftRelation = {
    distanceToTrail: number;
    drafterId: string;
    nearestTrailPoint: THREE.Vector3;
    sourceId: string;
};

type DraftState = {
    active: boolean;
    distanceToTrail?: number;
    nearestTrailPoint?: THREE.Vector3;
    sourceId?: string;
};

type RaceVehicleState = {
    displayName: string;
    draftState?: DraftState;
    effectiveTrailPositions: Array<THREE.Vector3>;
    trailClusters: Array<TrailClusterSet>;
    id: string;
    identityColor: number;
    isLocalPlayer: boolean;
    markerElements?: RaceMarkerElements;
    progressIndex: number;
    trailPositions: Array<THREE.Vector3>;
    vehicle: Vehicle;
    wobblePhase: number;
};

type StartGridSlot = {
    position: THREE.Vector3;
    rotation: THREE.Euler;
};

type RaceStanding = {
    finishTimeMs?: number;
    progressScore: number;
    state: RaceVehicleState;
};

const raceStartGrid = {
    backRowOffsets: [-1, 0, 1],
    frontRowOffsets: [-0.5, 0.5],
    rowPadding: 1.8,
    sidePadding: 1.4,
    totalVehicles: 5,
};

export default class GameScene extends THREE.Scene {
    active: boolean;
    audioEnabled: boolean;
    canvas: HTMLCanvasElement;
    debugMode: boolean;
    debugger: GUI;
    disablePostProcessing: boolean;

    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    filter: UnrealBloomPass;

    orbitals: OrbitControls;

    width: number;
    height: number;

    keysPressed: Controls;

    floatingClusters: Array<FloatingCluster>;
    track: Track;
    nebulaGlows: Array<NebulaGlow>;
    satellites: Array<Satellite>;
    
    player: Player;
    npcs: Array<NPC>;
    npcMenuVehicles: Array<MenuVehicle>;
    npcPlannerClient?: NpcPlannerClient;
    npcSnapshotId: number;
    raceVehicleStates: Array<RaceVehicleState>;
    draftRelations: Array<DraftRelation>;

    countdown: number;
    fadeInTimeout?: number;
    finished: boolean;
    finishPreview: boolean;
    handleKeyDownBound: (e: KeyboardEvent) => void;
    handlePointerDownBound: (e: PointerEvent) => void;
    handleKeyUpBound: (e: KeyboardEvent) => void;
    handleResizeBound: () => void;
    handleKnobTouchEndBound?: () => void;
    handleKnobTouchMoveBound?: (e: TouchEvent) => void;

    debugState: RaceDebugState;
    finishTimes: Map<string, number>;
    hud: RaceHud;
    hudState: RaceHudState;
    hudActionTimeoutId?: number;
    isTouchDevice: boolean;
    lastCountdownText: string;
    lastPlayerLap: number;
    observeMode: boolean;
    onExitToMenu?: () => void;
    onRestartRace?: () => void;
    playerAverageSpeedDistance: number;
    playerAverageSpeedSampleMs: number;
    playerFinishRank?: number;
    playerFinishTimeMs?: number;
    playerLapStartTimeMs: number;
    playerLapTimesMs: Array<number>;
    sounds: { [key: string]: HTMLAudioElement };
    ui: RaceUi;

    constructor(options: GameSceneOptions) {
        super();

        this.active = false;
        this.audioEnabled = !options.disableAudio && !options.observeMode;
        this.canvas = options.canvas;
        this.debugMode = !!options.debug;
        this.disablePostProcessing =
            !!options.disablePostProcessing || !!options.safeMode || !!options.observeMode;
        this.observeMode = !!options.observeMode;
        this.ui = options.ui;
        this.userData.raceUi = this.ui;
        this.userData.onVehicleLapAdvance = (vehicle: Vehicle, laps: number) => {
            this.handleVehicleLapAdvance(vehicle, laps);
        };
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.floatingClusters = [];
        this.finishTimes = new Map();
        this.hud = new RaceHud(this.ui.hudCanvas);
        this.hudState = this.hud.createDefaultState();
        this.isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        this.lastCountdownText = "";
        this.lastPlayerLap = 1;
        this.nebulaGlows = [];
        this.onExitToMenu = options.onExitToMenu;
        this.onRestartRace = options.onRestartRace;
        this.playerAverageSpeedDistance = 0;
        this.playerAverageSpeedSampleMs = 0;
        this.playerLapStartTimeMs = 0;
        this.playerLapTimesMs = [];
        this.raceVehicleStates = [];
        this.draftRelations = [];
        this.npcMenuVehicles = [];
        this.npcPlannerClient = undefined;
        this.npcSnapshotId = 0;
        this.handleKeyDownBound = (e: KeyboardEvent) => {
            if (this.finished)
                return;
            this.keysPressed[e.key.toLowerCase()] = true;
        };
        this.handleKeyUpBound = (e: KeyboardEvent) => {
            if (this.finished)
                return;
            this.keysPressed[e.key.toLowerCase()] = false;
        };
        this.handleResizeBound = () => {
            this.syncViewport();
        };
        this.handlePointerDownBound = (e: PointerEvent) => {
            this.handlePointerDown(e);
        };

        Vehicle.engineAudioEnabled = this.audioEnabled;
        this.render(options.speederIndex, options.debug);

        // set up utilities
        // set up controls
        this.setupControls(this.isTouchDevice);
        this.hud.resize(this.width, this.height);

        this.countdown = 0;
        this.finished = false;
        this.finishPreview = !!options.finishPreview;
        this.debugState = {
            laps: 1,
        };

        this.sounds = {};
        if (this.audioEnabled) {
            this.sounds = {
                "countdown": new Audio("./assets/sounds/countdown.wav"),
                "countdown-start": new Audio("./assets/sounds/countdown-start.wav")
            };
            this.sounds["countdown"].volume = 0.2;
            this.sounds["countdown-start"].volume = 0.24;
        }

        this.resetUi();
    }

    resetUi() {
        this.countdown = 0;
        this.finished = false;
        this.finishTimes.clear();
        this.hudState = this.hud.createDefaultState();
        this.hudState.totalVehicles = raceStartGrid.totalVehicles;
        this.userData.totalLaps = this.hudState.totalLaps;
        this.lastCountdownText = "";
        this.lastPlayerLap = 1;
        this.playerAverageSpeedDistance = 0;
        this.playerAverageSpeedSampleMs = 0;
        this.playerFinishRank = undefined;
        this.playerFinishTimeMs = undefined;
        this.playerLapStartTimeMs = 0;
        this.playerLapTimesMs = [];
        this.track.elapsedTime = 0;
        this.clearAllTrailStates();
        this.updateJoystickVisibility();
        this.debugState.finishHandledAt = undefined;
        this.debugState.finishPanelVisibleAt = undefined;
        this.debugState.laps = 1;
        document.body.dataset.raceFinished = "false";
        document.body.dataset.finishPanelVisible = "false";
        document.body.dataset.playerLaps = "1";
        this.ui.curtain.classList.remove("fade-to-black", "long-fade-to-black", "scroll-up");
        this.ui.curtain.classList.add("fade-in");
        this.ui.curtain.style.opacity = "1";
        this.ui.curtain.style.height = "100vh";
        this.ui.knob.style.top = "5vw";
        this.ui.knob.style.left = "5vw";
        this.renderHud();
    }

    setupBackgroundEntities(number: number = 5000, 
        distance: number = 1000, offset: number = 200) {
        
        this.satellites = [];
        this.floatingClusters = [];
        this.nebulaGlows = [];

        let starMaterial = new THREE.MeshBasicMaterial({
            color: 0x89a8ff,
            wireframe: true,
            transparent: true,
            opacity: 0.84
        });
        let clusterMaterial = new THREE.MeshBasicMaterial({
            color: 0x58c4ff,
            wireframe: true,
            transparent: true,
            opacity: 0.92
        });
        let geometry = new THREE.OctahedronGeometry(1, 0);
        let mesh = new THREE.Mesh(geometry, starMaterial);

        for (let i = 0; i < number; i++) {
            let position = randomVector();
            
            // distribute stars in a spherical manner
            // prevent stars from concentrating around the corners of a cube
            while (position.length() < 0.5 && position.length() > 1)
                position = randomVector();

            position.normalize();
            position.multiplyScalar(distance + Math.random() * offset);

            // small chance to create a bigger geometry
            if (Math.random() < 0.024) {
                // create a convex hull from a random set of points
                let points = Array(Math.ceil(Math.random() * 8) + 8).fill(0)
                    .map(_ => randomVector().multiplyScalar(3.2 + Math.random() * 5.4));
            
                let geometry = new ConvexGeometry(points);
                let direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.018,
                    (Math.random() - 0.5) * 0.012,
                    (Math.random() - 0.5) * 0.006,
                );
                let rotationRate = randomVector().multiplyScalar(0.00035);
                let satellite = new Satellite(geometry, clusterMaterial, direction, rotationRate);
                satellite.position.set(
                    760 + Math.random() * 1540,
                    100 + Math.random() * 420,
                    (Math.random() - 0.5) * 2400,
                );

                // store satellites separetely so they can be updated
                this.satellites.push(satellite);
                this.add(satellite);
            } else {
                // standard star is a diamond shape
                let star = mesh.clone();
                let scale = 0.65 + Math.random() * 0.7;
                star.position.set(position.x, position.y, position.z);
                star.scale.setScalar(scale);
                this.add(star);
            }
        }

        let baseClusterSpecs = [
            {
                color: 0x8ac8ff,
                opacity: 0.28,
                pointCount: 5,
                position: new THREE.Vector3(780, 220, -1180),
                scale: 26,
            },
            {
                color: 0xc48fff,
                opacity: 0.3,
                pointCount: 5,
                position: new THREE.Vector3(980, 170, -760),
                scale: 24,
            },
            {
                color: 0x8db8ff,
                opacity: 0.27,
                pointCount: 5,
                position: new THREE.Vector3(1240, 250, -260),
                scale: 25,
            },
            {
                color: 0xb388ff,
                opacity: 0.28,
                pointCount: 6,
                position: new THREE.Vector3(1120, 150, 180),
                scale: 22,
            },
            {
                color: 0x82c4ff,
                opacity: 0.26,
                pointCount: 5,
                position: new THREE.Vector3(920, 220, 860),
                scale: 24,
            },
            {
                color: 0xc596ff,
                opacity: 0.27,
                pointCount: 5,
                position: new THREE.Vector3(1460, 180, 900),
                scale: 22,
            },
            {
                color: 0x89c7ff,
                opacity: 0.24,
                pointCount: 5,
                position: new THREE.Vector3(1720, 280, 420),
                scale: 20,
            },
            {
                color: 0xb78cff,
                opacity: 0.25,
                pointCount: 5,
                position: new THREE.Vector3(1620, 260, -520),
                scale: 20,
            },
            {
                color: 0x93cfff,
                opacity: 0.22,
                pointCount: 5,
                position: new THREE.Vector3(1380, 120, 40),
                scale: 18,
            },
            {
                color: 0xc8a2ff,
                opacity: 0.24,
                pointCount: 5,
                position: new THREE.Vector3(1840, 220, -980),
                scale: 21,
            },
            {
                color: 0x9bd5ff,
                opacity: 0.22,
                pointCount: 4,
                position: new THREE.Vector3(1280, 110, 620),
                scale: 17,
            },
            {
                color: 0xd2aeff,
                opacity: 0.24,
                pointCount: 4,
                position: new THREE.Vector3(1500, 130, -760),
                scale: 17,
            },
        ];

        let expandedClusterSpecs = baseClusterSpecs.flatMap(clusterSpec => {
            let sourceCount = 2 + Math.floor(Math.random() * 2);
            return Array(sourceCount).fill(0).map(() => ({
                color: clusterSpec.color,
                opacity: Math.min(clusterSpec.opacity * (0.9 + Math.random() * 0.22), 0.34),
                pointCount: Math.max(2, clusterSpec.pointCount - 2 + Math.floor(Math.random() * 2)),
                position: clusterSpec.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 220,
                    (Math.random() - 0.5) * 120,
                    (Math.random() - 0.5) * 240,
                )),
                scale: clusterSpec.scale * (0.52 + Math.random() * 0.28),
            }));
        });

        for (let clusterSpec of expandedClusterSpecs) {
            let cluster = this.createFloatingCluster(
                clusterSpec.color,
                clusterSpec.opacity,
                clusterSpec.pointCount,
                clusterSpec.scale,
            );
            cluster.position.copy(clusterSpec.position);
            this.floatingClusters.push({
                driftAmplitude: new THREE.Vector3(
                    8 + Math.random() * 10,
                    4 + Math.random() * 7,
                    4 + Math.random() * 8,
                ),
                driftPhase: Math.random() * Math.PI * 2,
                driftSpeed: 0.00014 + Math.random() * 0.00018,
                mesh: cluster,
                origin: clusterSpec.position.clone(),
                pieces: cluster.userData.pieces,
                rotationRate: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.00008,
                    (Math.random() - 0.5) * 0.00012,
                    (Math.random() - 0.5) * 0.00006,
                ),
            });
            this.add(cluster);
        }

        const rgbaFromColor = (hex: number, alpha: number, brighten: number) => {
            let sourceColor = new THREE.Color(hex).lerp(new THREE.Color(0xffffff), brighten);
            let red = Math.round(sourceColor.r * 255);
            let green = Math.round(sourceColor.g * 255);
            let blue = Math.round(sourceColor.b * 255);
            return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        };

        let glowSpecs = expandedClusterSpecs.map(clusterSpec => ({
            color: rgbaFromColor(clusterSpec.color, 0.28 + Math.random() * 0.16, 0.34),
            haloColor: rgbaFromColor(clusterSpec.color, 0.14 + Math.random() * 0.1, 0.58),
            position: clusterSpec.position.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 42,
                (Math.random() - 0.5) * 28,
                (Math.random() - 0.5) * 42,
            )),
            scale: new THREE.Vector2(
                clusterSpec.scale * (9.2 + Math.random() * 3.4),
                clusterSpec.scale * (7.6 + Math.random() * 2.8),
            ),
        }));

        for (let glowSpec of glowSpecs) {
            let glow = this.createGlowSprite(
                glowSpec.color,
                glowSpec.haloColor,
            );
            glow.position.copy(glowSpec.position);
            glow.scale.set(glowSpec.scale.x, glowSpec.scale.y, 1);
            this.nebulaGlows.push({
                baseScale: glowSpec.scale.clone(),
                driftAmplitude: new THREE.Vector3(
                    46 + Math.random() * 36,
                    26 + Math.random() * 22,
                    10 + Math.random() * 12,
                ),
                driftPhase: Math.random() * Math.PI * 2,
                driftSpeed: 0.00008 + Math.random() * 0.00012,
                origin: glowSpec.position.clone(),
                pulseAmplitude: 0.045 + Math.random() * 0.035,
                pulseSpeed: 0.00042 + Math.random() * 0.0004,
                sprite: glow,
            });
            this.add(glow);
        }
    }

    createGlowSprite(color: string, haloColor: string): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create glow canvas.");

        canvas.width = 1024;
        canvas.height = 1024;

        const drawNebulaPatch = (
            centerX: number,
            centerY: number,
            radius: number,
            fillColor: string,
            alphaScale: number,
            rotation: number,
        ) => {
            context.save();
            context.translate(centerX, centerY);
            context.rotate(rotation);
            context.scale(1.18, 0.76);
            context.beginPath();
            for (let i = 0; i < 10; i++) {
                let angle = i / 10 * Math.PI * 2;
                let wobble = radius * (
                    0.46 +
                    Math.sin(i * 1.7 + rotation * 4) * 0.16 +
                    Math.cos(i * 0.9 - rotation * 3.2) * 0.18 +
                    Math.random() * 0.08
                );
                let x = Math.cos(angle) * wobble;
                let y = Math.sin(angle) * wobble;
                if (i === 0)
                    context.moveTo(x, y);
                else
                    context.lineTo(
                        x,
                        y,
                    );
            }
            context.closePath();
            context.fillStyle = fillColor;
            context.globalAlpha = alphaScale;
            context.shadowBlur = radius * 0.42;
            context.shadowColor = fillColor;
            context.fill();
            context.restore();
        };

        drawNebulaPatch(330, 330, 180, haloColor, 0.62, -0.34);
        drawNebulaPatch(560, 360, 205, color, 0.72, 0.2);
        drawNebulaPatch(455, 580, 220, haloColor, 0.5, 0.58);
        drawNebulaPatch(700, 600, 155, color, 0.48, -0.18);
        drawNebulaPatch(265, 640, 135, "rgba(156, 214, 255, 0.56)", 0.42, 0.14);

        context.save();
        context.globalCompositeOperation = "lighter";
        for (let i = 0; i < 8; i++) {
            let sparkleX = 160 + Math.random() * 700;
            let sparkleY = 160 + Math.random() * 700;
            let sparkleRadius = 10 + Math.random() * 18;
            let sparkleGradient = context.createRadialGradient(
                sparkleX,
                sparkleY,
                0,
                sparkleX,
                sparkleY,
                sparkleRadius,
            );
            sparkleGradient.addColorStop(0, "rgba(236, 244, 255, 0.72)");
            sparkleGradient.addColorStop(0.35, haloColor);
            sparkleGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
            context.fillStyle = sparkleGradient;
            context.beginPath();
            context.arc(sparkleX, sparkleY, sparkleRadius, 0, Math.PI * 2);
            context.fill();
        }
        context.restore();

        let texture = new THREE.CanvasTexture(canvas);
        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            opacity: 0.96,
            blending: THREE.AdditiveBlending,
        });
        let sprite = new THREE.Sprite(material);
        sprite.renderOrder = -20;
        return sprite;
    }

    createFloatingCluster(
        color: number,
        opacity: number,
        pointCount: number,
        scale: number,
    ): THREE.Group {
        let cluster = new THREE.Group();
        let pieces: Array<{
            driftAmplitude: THREE.Vector3;
            driftPhase: number;
            driftSpeed: number;
            mesh: THREE.Group;
            origin: THREE.Vector3;
            pulseAmplitude: number;
            pulseSpeed: number;
            rotationRate: THREE.Vector3;
        }> = [];

        let variant = Math.floor(Math.random() * 4);
        let pieceCount = pointCount + Math.floor(Math.random() * 3);
        let spreadX = scale * (2.2 + Math.random() * 1.8);
        let spreadY = scale * (1.2 + Math.random() * 1.2);
        let spreadZ = scale * (1.4 + Math.random() * 1.8);

        for (let i = 0; i < pieceCount; i++) {
            let hullPointCount = 5 + Math.floor(Math.random() * 5) + variant;
            let points = Array(hullPointCount).fill(0)
                .map(_ => {
                    let point = randomVector();
                    let localScaleX = 0.6 + Math.random() * (1.6 + variant * 0.22);
                    let localScaleY = 0.45 + Math.random() * (1.2 + variant * 0.18);
                    let localScaleZ = 0.3 + Math.random() * (1.4 + variant * 0.26);
                    point.set(
                        point.x * localScaleX,
                        point.y * localScaleY,
                        point.z * localScaleZ,
                    );
                    return point;
                });
            let geometry = new ConvexGeometry(points);

            let glowColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.16);
            let emissiveColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.28);

            let solidMaterial = new THREE.MeshBasicMaterial({
                color: glowColor,
                transparent: true,
                opacity: opacity,
                depthTest: false,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            let wireMaterial = new THREE.MeshBasicMaterial({
                color: emissiveColor,
                wireframe: true,
                transparent: true,
                opacity: 0.92,
                depthTest: false,
                depthWrite: false,
            });

            let solidMesh = new THREE.Mesh(geometry, solidMaterial);
            let wireMesh = new THREE.Mesh(geometry, wireMaterial);
            let piece = new THREE.Group();
            piece.add(solidMesh);
            piece.add(wireMesh);

            let ringAngle = Math.random() * Math.PI * 2;
            let ringRadius = (0.28 + Math.random() * 0.72) * spreadX;
            piece.position.set(
                Math.cos(ringAngle) * ringRadius,
                (Math.random() - 0.5) * spreadY,
                Math.sin(ringAngle) * spreadZ,
            );
            piece.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
            );
            let pieceScale = 0.48 + Math.random() * 0.92;
            piece.scale.setScalar(pieceScale);
            cluster.add(piece);
            pieces.push({
                driftAmplitude: new THREE.Vector3(
                    10 + Math.random() * 20,
                    6 + Math.random() * 12,
                    8 + Math.random() * 18,
                ),
                driftPhase: Math.random() * Math.PI * 4,
                driftSpeed: 0.00042 + Math.random() * 0.00084,
                mesh: piece,
                origin: piece.position.clone(),
                pulseAmplitude: 0.04 + Math.random() * 0.06,
                pulseSpeed: 0.00034 + Math.random() * 0.00048,
                rotationRate: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.0011,
                    (Math.random() - 0.5) * 0.0015,
                    (Math.random() - 0.5) * 0.0009,
                ),
            });
        }

        cluster.userData.pieces = pieces;
        return cluster;
    }

    shuffleItems<T>(items: Array<T>): Array<T> {
        let shuffled = items.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            let randomIndex = Math.floor(Math.random() * (i + 1));
            let currentItem = shuffled[i];
            shuffled[i] = shuffled[randomIndex];
            shuffled[randomIndex] = currentItem;
        }
        return shuffled;
    }

    getPlayerMenuVehicle(speederIndex: number): MenuVehicle {
        let normalizedIndex = Number.isNaN(speederIndex) ? 0 : speederIndex;
        return menuVehicles.find(vehicle => vehicle.playableIndex === normalizedIndex) ||
            menuVehicles[0];
    }

    buildNpcMenuVehicles(playerMenuVehicle: MenuVehicle): Array<MenuVehicle> {
        let targetNpcCount = raceStartGrid.totalVehicles - 1;
        let availableUniqueVehicles = this.shuffleItems(
            menuVehicles.filter(vehicle => vehicle.playableIndex !== playerMenuVehicle.playableIndex),
        );
        let npcVehicles = availableUniqueVehicles.slice(0, targetNpcCount);

        while (npcVehicles.length < targetNpcCount) {
            let duplicatePool = this.shuffleItems(menuVehicles);
            let nextVehicle = duplicatePool[(npcVehicles.length - availableUniqueVehicles.length) % duplicatePool.length];
            npcVehicles.push(nextVehicle);
        }

        return npcVehicles;
    }

    createStartGridSlots(participants: Array<MenuVehicle>): Array<StartGridSlot> {
        let maxVehicleWidth = participants.reduce((largestWidth, participant) =>
            Math.max(largestWidth, participant.data.width), 0);
        let maxVehicleLength = participants.reduce((largestLength, participant) =>
            Math.max(largestLength, participant.data.length), 0);
        let rowSpacing = maxVehicleLength + raceStartGrid.rowPadding;
        let lateralSpacing = maxVehicleWidth + raceStartGrid.sidePadding;
        let startDirection = this.track.startDirection.clone().normalize();
        let lateralDirection = new THREE.Vector3().crossVectors(
            new THREE.Vector3(0, 1, 0),
            startDirection,
        );
        if (lateralDirection.lengthSq() < 0.0001)
            lateralDirection.set(1, 0, 0);
        else
            lateralDirection.normalize();

        let frontRowBase = this.track.startPoint.clone();
        let backRowBase = frontRowBase.clone().add(
            startDirection.clone().multiplyScalar(-rowSpacing),
        );
        let rotation = this.track.startRotation.clone();
        let slots: Array<StartGridSlot> = [];

        for (let offset of raceStartGrid.frontRowOffsets) {
            slots.push({
                position: frontRowBase.clone().add(
                    lateralDirection.clone().multiplyScalar(offset * lateralSpacing),
                ),
                rotation: rotation.clone(),
            });
        }

        for (let offset of raceStartGrid.backRowOffsets) {
            slots.push({
                position: backRowBase.clone().add(
                    lateralDirection.clone().multiplyScalar(offset * lateralSpacing),
                ),
                rotation: rotation.clone(),
            });
        }

        return slots;
    }

    formatTimeMs(timeMs: number): string {
        let safeTimeMs = Math.max(0, timeMs);
        let minutes = safeTimeMs / 60000;
        let seconds = (safeTimeMs % 60000) / 1000;
        let centiseconds = (safeTimeMs / 10) % 100;

        return [minutes, seconds, centiseconds]
            .map(unit => Math.floor(unit).toString().padStart(2, "0"))
            .join(":");
    }

    getDisplaySpeedKmh(vehicle: Vehicle): number {
        return Math.round(THREE.MathUtils.lerp(0, 420, vehicle.getSpeedRatio()));
    }

    getCountdownText(): string {
        if (this.countdown < 3000 || this.countdown > 7000)
            return "";

        return this.countdown < 6000 ?
            Math.ceil((6000 - this.countdown) / 1000).toString() :
            "GO!";
    }

    updateJoystickVisibility() {
        this.ui.joystick.style.display = this.isTouchDevice && !this.finished ? "block" : "none";
    }

    clearPlayerInputs() {
        this.keysPressed = {};
        this.ui.knob.style.top = "5vw";
        this.ui.knob.style.left = "5vw";
    }

    syncViewport() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        if (this.composer)
            this.composer.setSize(this.width, this.height);
        if (this.filter)
            this.filter.setSize(this.width, this.height);
        this.hud.resize(this.width, this.height);
        this.renderHud();
    }

    handlePointerDown(event: PointerEvent) {
        if (!this.active)
            return;

        let action = this.hud.hitTest(event.clientX, event.clientY);
        if (!action) {
            if (this.hudState.showSettings &&
                !this.hud.isPointInsideModal(event.clientX, event.clientY)) {
                this.hudState.showSettings = false;
                this.renderHud();
            }
            return;
        }

        this.handleHudAction(action);
    }

    handleHudAction(action: RaceHudAction) {
        this.hud.pressAction(action);
        switch (action) {
            case "toggle-settings":
                this.hudState.gearPressedUntilMs = performance.now() + 140;
                this.hudState.showSettings = !this.hudState.showSettings;
                this.renderHud();
                return;
            case "settings-resume":
                this.runHudActionAfterFeedback(() => {
                    this.hudState.showSettings = false;
                    this.renderHud();
                });
                return;
            case "settings-exit":
            case "results-back":
                this.runHudActionAfterFeedback(() => {
                    this.hudState.showSettings = false;
                    this.onExitToMenu?.();
                });
                return;
            case "settings-restart":
            case "results-retry":
                this.runHudActionAfterFeedback(() => {
                    this.hudState.showSettings = false;
                    this.onRestartRace?.();
                });
                return;
            default:
                return;
        }
    }

    runHudActionAfterFeedback(callback: () => void, delayMs = 90) {
        if (this.hudActionTimeoutId)
            window.clearTimeout(this.hudActionTimeoutId);

        this.renderHud();
        this.hudActionTimeoutId = window.setTimeout(() => {
            this.hudActionTimeoutId = undefined;
            callback();
        }, delayMs);
    }

    syncCountdownState() {
        let countdownText = this.getCountdownText();
        if (countdownText && countdownText !== this.lastCountdownText) {
            let sound = `countdown${countdownText === "GO!" ? "-start" : ""}`;
            this.sounds[sound]?.play();
        }

        this.lastCountdownText = countdownText;
        this.hudState.countdownText = countdownText;
    }

    recordPlayerTelemetry(dt: number) {
        if (this.finished || this.countdown < 6000)
            return;

        this.playerAverageSpeedDistance += this.getDisplaySpeedKmh(this.player) * dt;
        this.playerAverageSpeedSampleMs += dt;
    }

    getAverageSpeedKmh(): number {
        if (this.playerAverageSpeedSampleMs <= 0)
            return 0;

        return Math.round(this.playerAverageSpeedDistance / this.playerAverageSpeedSampleMs);
    }

    findNearestTrackIndex(position: THREE.Vector3, previousIndex: number = 0): number {
        if (!this.track.pathPoints.length)
            return 0;

        let nearestDistance = Infinity;
        let nearestIndex = previousIndex % this.track.pathPoints.length;
        let searchCount = Math.min(this.track.pathPoints.length, 80);

        for (let offset = 0; offset < searchCount; offset++) {
            let index = (nearestIndex + offset) % this.track.pathPoints.length;
            let distance = position.distanceToSquared(this.track.pathPoints[index]);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        }

        if (nearestDistance > 196) {
            for (let index = 0; index < this.track.pathPoints.length; index++) {
                let distance = position.distanceToSquared(this.track.pathPoints[index]);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            }
        }

        return nearestIndex;
    }

    getVehicleProgressScore(state: RaceVehicleState): number {
        if (state.isLocalPlayer) {
            state.progressIndex = this.findNearestTrackIndex(
                state.vehicle.position,
                state.progressIndex,
            );
        } else {
            let npc = state.vehicle as NPC;
            state.progressIndex = Number.isFinite(npc.pathPointIndex) ?
                npc.pathPointIndex :
                this.findNearestTrackIndex(state.vehicle.position, state.progressIndex);
        }

        return (state.vehicle.laps - 1) * this.track.pathPoints.length + state.progressIndex;
    }

    buildStandings(): Array<RaceStanding> {
        return this.raceVehicleStates
            .map(state => ({
                finishTimeMs: this.finishTimes.get(state.id),
                progressScore: this.getVehicleProgressScore(state),
                state,
            }))
            .sort((first, second) => {
                if (first.finishTimeMs !== undefined && second.finishTimeMs !== undefined)
                    return first.finishTimeMs - second.finishTimeMs;

                if (first.finishTimeMs !== undefined)
                    return -1;

                if (second.finishTimeMs !== undefined)
                    return 1;

                return second.progressScore - first.progressScore;
            });
    }

    getPlayerStandingPosition(): number {
        let standings = this.buildStandings();
        let playerIndex = standings.findIndex(standing => standing.state.isLocalPlayer);
        return playerIndex >= 0 ? playerIndex + 1 : 1;
    }

    buildLeaderboardEntries(): Array<RaceHudLeaderboardEntry> {
        return this.buildStandings().map((standing, index) => {
            let finishTimeMs = this.finishTimes.get(standing.state.id);
            return {
                color: this.colorToCss(standing.state.identityColor),
                id: standing.state.id,
                isPlayer: standing.state.isLocalPlayer,
                label: standing.state.displayName,
                place: index + 1,
                statusText: finishTimeMs !== undefined ? "FINISHED" : "RACING",
                timeText: finishTimeMs !== undefined ?
                    this.formatTimeMs(finishTimeMs) :
                    `LAP ${Math.min(standing.state.vehicle.laps, this.hudState.totalLaps)}/${this.hudState.totalLaps}`,
            };
        });
    }

    captureNpcFinishers() {
        for (let index = 0; index < this.npcs.length; index++) {
            let npc = this.npcs[index];
            let state = this.raceVehicleStates[index + 1];
            if (!state || npc.laps <= this.hudState.totalLaps || this.finishTimes.has(state.id))
                continue;

            this.finishTimes.set(state.id, this.track.elapsedTime);
        }
    }

    handleVehicleLapAdvance(vehicle: Vehicle, laps: number) {
        if (vehicle === this.player) {
            this.capturePlayerLapProgress();
            this.debugState.laps = laps;
            document.body.dataset.playerLaps = laps.toString();
            if (laps > this.hudState.totalLaps)
                this.handleRaceFinish();
            return;
        }

        let standing = this.raceVehicleStates.find(state => state.vehicle === vehicle);
        if (!standing || laps <= this.hudState.totalLaps || this.finishTimes.has(standing.id))
            return;

        this.finishTimes.set(standing.id, this.track.elapsedTime);
    }

    capturePlayerLapProgress() {
        if (this.player.laps <= this.lastPlayerLap)
            return;

        for (let lap = this.lastPlayerLap + 1; lap <= this.player.laps; lap++) {
            let splitTime = Math.max(0, this.track.elapsedTime - this.playerLapStartTimeMs);
            this.playerLapTimesMs.push(splitTime);
            this.playerLapStartTimeMs = this.track.elapsedTime;
        }

        this.lastPlayerLap = this.player.laps;
    }

    updateHudState() {
        let finishTimeMs = this.playerFinishTimeMs ?? this.track.elapsedTime;
        this.hudState.averageSpeedKmh = this.getAverageSpeedKmh();
        this.hudState.currentLap = Math.min(this.player.laps, this.hudState.totalLaps);
        this.hudState.finishTimeText = this.formatTimeMs(finishTimeMs);
        this.hudState.lapTimes = this.playerLapTimesMs.map(timeMs => this.formatTimeMs(timeMs));
        this.hudState.leaderboardEntries = this.buildLeaderboardEntries();
        if (this.finished && !this.playerFinishRank)
            this.playerFinishRank = this.getPlayerStandingPosition();
        this.hudState.position = this.finished && this.playerFinishRank ?
            this.playerFinishRank :
            this.getPlayerStandingPosition();
        this.hudState.resultsSubtitle = this.finished && this.playerFinishRank ?
            `FINAL POSITION #${this.playerFinishRank}` :
            "TRACKING FINISHERS";
        this.hudState.speedKmh = this.getDisplaySpeedKmh(this.player);
        this.hudState.timerText = this.finished && this.playerFinishTimeMs !== undefined ?
            this.formatTimeMs(this.playerFinishTimeMs) :
            this.track.getTimeString();
        this.hudState.totalVehicles = this.raceVehicleStates.length || raceStartGrid.totalVehicles;
    }

    renderHud() {
        this.hud.setState(this.hudState);
        this.hud.render();
    }

    render(speederIndex: number, debug?: boolean) {
        // set up camera
        this.camera = new THREE.PerspectiveCamera(80, 
            this.width / this.height, 0.1, 3200);

        // set up renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true
        });

        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.background = "transparent";

        // set up camera orbital controls
        if (debug)
            this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);

        // set up glowing postprocessing
        if (!this.disablePostProcessing) {
            this.composer = new EffectComposer(this.renderer);
            this.composer.addPass(new RenderPass(this, this.camera));
            this.filter = new UnrealBloomPass(
                new THREE.Vector2(this.width, this.height),
                1.6,
                0.1,
                0.9,
            );
            this.composer.addPass(this.filter);
        }

        // set objects in the scene
        let light = new THREE.AmbientLight(0xbdd6ff, 0.72);
        this.add(light);

        let blueFillLight = new THREE.DirectionalLight(0x78beff, 0.52);
        blueFillLight.position.set(-220, 180, 120);
        this.add(blueFillLight);

        let violetFillLight = new THREE.DirectionalLight(0x845cc7, 0.34);
        violetFillLight.position.set(240, 120, -140);
        this.add(violetFillLight);

        let trackData = tracks[0];
        this.track = new Track(this, trackData, debug);
        let firstCheckpoint = this.track.checkpoints[0];

        if (!trackData.gridColor)
            this.setupBackgroundEntities();

        let playerMenuVehicle = this.getPlayerMenuVehicle(speederIndex);
        let npcMenuVehicles = this.buildNpcMenuVehicles(playerMenuVehicle);
        let participantVehicles = [playerMenuVehicle, ...npcMenuVehicles];
        let startGridSlots = this.shuffleItems(
            this.createStartGridSlots(participantVehicles),
        );

        this.player = new Player(this, this.camera, playerMenuVehicle.data,
            startGridSlots[0].position.clone(), this.track.startDirection.clone(),
            startGridSlots[0].rotation.clone(), firstCheckpoint, debug, this.orbitals,
            this.audioEnabled);
        this.player.handleCameraMovement(true, true);

        this.npcs = [];
        this.npcMenuVehicles = npcMenuVehicles;

        for (let i = 0; i < this.npcMenuVehicles.length; i++) {
            let startGridSlot = startGridSlots[i + 1];
            let npcMenuVehicle = this.npcMenuVehicles[i];
            this.npcs.push(new NPC(this, npcMenuVehicle.data, startGridSlot.position.clone(),
                this.track.startDirection.clone(),
                startGridSlot.rotation.clone(), firstCheckpoint, debug, this.audioEnabled));
        }

        this.setupRaceVehicleStates(playerMenuVehicle);
        this.setupNpcPlannerClient();

        if (debug) {
            // set up debugger
            this.debugger = new GUI();
    
            const cameraGroup = this.debugger.addFolder("Camera");
            cameraGroup.add(this.camera, "fov", 0, 120);
            cameraGroup.add(this.camera, "zoom", 0, 1);
            cameraGroup.add(this.player, "manualCamera");
    
            const vehicleGroup = this.debugger.addFolder("Vehicle");
            vehicleGroup.add(this.player.position, "x", -100, 100);
            vehicleGroup.add(this.player.position, "y", -100, 100);
            vehicleGroup.add(this.player.position, "z", -100, 100);
            
            const lightingGroup = this.debugger.addFolder("Lighting");
            lightingGroup.add(light, "intensity", 0, 2.0);

            if (this.filter) {
                const filterGroup = this.debugger.addFolder("Filter");
                filterGroup.add(this.filter, "strength", 0.0, 100.0);
                filterGroup.add(this.filter, "radius", 0.0, 5.0);
                filterGroup.add(this.filter, "threshold", 0.0, 1.0);
            }

            this.debugger.close();
        }
    }

    colorToCss(color: number): string {
        let parsedColor = new THREE.Color(color);
        let red = Math.round(parsedColor.r * 255);
        let green = Math.round(parsedColor.g * 255);
        let blue = Math.round(parsedColor.b * 255);
        return `rgb(${red}, ${green}, ${blue})`;
    }

    clearRaceIdentityMarkers() {
        this.ui.markerHost.innerHTML = "";
    }

    createTrailGlowTexture(): THREE.CanvasTexture {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create trail glow texture.");

        canvas.width = 160;
        canvas.height = 160;

        const paintSoftBlob = (
            centerX: number,
            centerY: number,
            radiusX: number,
            radiusY: number,
            rotation: number,
            alpha: number,
        ) => {
            context.save();
            context.translate(centerX, centerY);
            context.rotate(rotation);
            context.scale(radiusX / radiusY, 1);
            let gradient = context.createRadialGradient(0, 0, radiusY * 0.18, 0, 0, radiusY);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.34})`);
            gradient.addColorStop(0.32, `rgba(255, 255, 255, ${alpha * 0.18})`);
            gradient.addColorStop(0.72, `rgba(255, 255, 255, ${alpha * 0.09})`);
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(0, 0, radiusY, 0, Math.PI * 2);
            context.fill();
            context.restore();
        };

        paintSoftBlob(80, 80, 56, 40, 0.22, 0.78);
        paintSoftBlob(58, 74, 34, 26, -0.52, 0.52);
        paintSoftBlob(104, 88, 30, 22, 0.46, 0.46);
        paintSoftBlob(78, 104, 26, 18, -0.16, 0.32);

        context.save();
        context.globalCompositeOperation = "screen";
        for (let i = 0; i < 5; i++) {
            let sparkleX = 42 + Math.random() * 76;
            let sparkleY = 44 + Math.random() * 72;
            let sparkleRadius = 7 + Math.random() * 7;
            let sparkle = context.createRadialGradient(
                sparkleX,
                sparkleY,
                0,
                sparkleX,
                sparkleY,
                sparkleRadius,
            );
            sparkle.addColorStop(0, "rgba(255, 255, 255, 0.12)");
            sparkle.addColorStop(0.48, "rgba(255, 255, 255, 0.05)");
            sparkle.addColorStop(1, "rgba(255, 255, 255, 0)");
            context.fillStyle = sparkle;
            context.beginPath();
            context.arc(sparkleX, sparkleY, sparkleRadius, 0, Math.PI * 2);
            context.fill();
        }
        context.restore();

        let texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createRaceMarker(displayName: string, color: number): RaceMarkerElements {
        let marker = document.createElement("div");
        marker.className = "race-marker";
        let cssColor = this.colorToCss(color);
        marker.style.setProperty("--marker-color", cssColor);

        let label = document.createElement("div");
        label.className = "race-marker__label";
        label.textContent = displayName;
        label.style.color = cssColor;
        label.style.fontSize = `clamp(${raceTrail.markerFontMinPx}px, ${raceTrail.markerFontScaleVw}vw, ${raceTrail.markerFontSizePx}px)`;

        let pointer = document.createElement("div");
        pointer.className = "race-marker__pointer";
        pointer.style.borderTopColor = cssColor;
        pointer.style.borderLeftWidth = `${raceTrail.markerPointerWidthPx}px`;
        pointer.style.borderRightWidth = `${raceTrail.markerPointerWidthPx}px`;
        pointer.style.borderTopWidth = `${raceTrail.markerPointerHeightPx}px`;

        marker.append(label, pointer);
        this.ui.markerHost.appendChild(marker);

        return {
            label,
            pointer,
            root: marker,
        };
    }

    createFluidTrailState(color: number): Pick<
        RaceVehicleState,
        "trailClusters" | "wobblePhase"
    > {
        let glowTexture = this.createTrailGlowTexture();
        let createSprite = (
            opacity: number,
            scale: number,
            renderOrder: number,
            colorOffset: number = 0,
        ) => {
            let sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture,
                color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), colorOffset),
                transparent: true,
                opacity,
                blending: THREE.NormalBlending,
                depthWrite: false,
                depthTest: false,
            }));
            sprite.scale.setScalar(scale);
            sprite.renderOrder = renderOrder;
            sprite.visible = false;
            this.add(sprite);
            return sprite;
        };

        let trailClusters = Array(raceTrail.sampleCount).fill(0).map(() => ({
            halo: createSprite(raceTrail.haloOpacity, raceTrail.haloScale, 19, 0.12),
            primary: createSprite(raceTrail.clusterOpacity, raceTrail.clusterScale, 21, 0.06),
            secondary: Array(3).fill(0).map((_, index) =>
                createSprite(
                    raceTrail.clusterOpacity * (0.64 - index * 0.1),
                    raceTrail.clusterScale * (0.68 - index * 0.08),
                    20,
                    0.08 + index * 0.04,
                )),
            spark: createSprite(raceTrail.particleOpacity, raceTrail.particleScale, 22, 0.2),
        }));

        return {
            trailClusters,
            wobblePhase: Math.random() * Math.PI * 2,
        };
    }

    setMarkerOpacity(markerElements: RaceMarkerElements | undefined, opacity: number) {
        if (!markerElements)
            return;
        markerElements.root.style.opacity = `${THREE.MathUtils.clamp(opacity, 0, 1)}`;
    }

    getMarkerOpacity(position: THREE.Vector3): number {
        return raceTrail.maxMarkerOpacity;
    }

    setupRaceVehicleStates(playerMenuVehicle: MenuVehicle) {
        this.clearRaceIdentityMarkers();
        let states: Array<RaceVehicleState> = [
            {
                displayName: playerMenuVehicle.label,
                draftState: {
                    active: false,
                },
                effectiveTrailPositions: [],
                ...this.createFluidTrailState(raceIdentityColors[0]),
                id: "player",
                identityColor: raceIdentityColors[0],
                isLocalPlayer: true,
                markerElements: undefined,
                progressIndex: 0,
                trailPositions: [],
                vehicle: this.player,
            },
        ];

        for (let i = 0; i < this.npcs.length; i++) {
            let menuVehicle = this.npcMenuVehicles[i] || menuVehicles[i] ||
                menuVehicles[0];
            let identityColor = raceIdentityColors[(i + 1) % raceIdentityColors.length];
            states.push({
                displayName: menuVehicle.label,
                draftState: {
                    active: false,
                },
                effectiveTrailPositions: [],
                ...this.createFluidTrailState(identityColor),
                id: `npc-${i + 1}`,
                identityColor,
                isLocalPlayer: false,
                markerElements: this.createRaceMarker(menuVehicle.label, identityColor),
                progressIndex: 0,
                trailPositions: [],
                vehicle: this.npcs[i],
            });
        }

        this.raceVehicleStates = states;
    }

    setupNpcPlannerClient() {
        this.npcPlannerClient?.dispose();
        this.npcPlannerClient = undefined;
        this.npcSnapshotId = 0;

        if (!this.track.npcTrackGraph)
            return;

        this.npcPlannerClient = new NpcPlannerClient(raceNpc.asyncPlanner);
        this.npcPlannerClient.initialize(this.track.npcTrackGraph);
        this.userData.npcPlannerValidation = this.track.npcTrackGraph.validation;
    }

    publishNpcPlannerSnapshot(raceRunningMs: number): number {
        if (!this.npcPlannerClient)
            return performance.now();

        let timestampMs = performance.now();
        let snapshot = buildRaceSnapshot(
            ++this.npcSnapshotId,
            raceRunningMs,
            timestampMs,
            this.raceVehicleStates,
        );
        this.npcPlannerClient.publishSnapshot(snapshot);
        this.userData.npcPlannerSnapshotId = this.npcSnapshotId;
        return timestampMs;
    }

    getVehicleTailPosition(vehicle: Vehicle): THREE.Vector3 {
        return vehicle.position.clone().sub(
            vehicle.direction.clone().normalize().multiplyScalar(vehicle.length * 0.5),
        );
    }

    getVehicleDraftProbePoint(vehicle: Vehicle): THREE.Vector3 {
        return vehicle.position.clone().add(
            vehicle.direction.clone().normalize().multiplyScalar(
                vehicle.length * raceTrail.draftProbeForwardOffset,
            ),
        );
    }

    clearTrailState(state: RaceVehicleState) {
        state.trailPositions = [];
        state.effectiveTrailPositions = [];
        state.draftState = {
            active: false,
        };
    }

    clearAllTrailStates() {
        for (let state of this.raceVehicleStates || [])
            this.clearTrailState(state);
    }

    buildEffectiveTrailPositions(
        trailPositions: Array<THREE.Vector3>,
        targetLength: number,
    ): Array<THREE.Vector3> {
        if (trailPositions.length < 2)
            return trailPositions.slice();

        let effectiveTrail = [trailPositions[0].clone()];
        let remainingLength = targetLength;

        for (let i = 0; i < trailPositions.length - 1; i++) {
            let start = trailPositions[i];
            let end = trailPositions[i + 1];
            let segmentLength = start.distanceTo(end);
            if (segmentLength <= 0.0001)
                continue;

            if (segmentLength <= remainingLength) {
                effectiveTrail.push(end.clone());
                remainingLength -= segmentLength;
                continue;
            }

            let ratio = remainingLength / segmentLength;
            effectiveTrail.push(start.clone().lerp(end, ratio));
            break;
        }

        return effectiveTrail;
    }

    updateMarkerPlacement(state: RaceVehicleState, markerPosition: THREE.Vector3) {
        if (!state.markerElements)
            return;

        this.camera.updateMatrixWorld();
        let markerBounds = this.ui.markerHost.getBoundingClientRect();
        let projected = markerPosition.clone().project(this.camera);
        let cameraForward = this.camera.getWorldDirection(new THREE.Vector3());
        let toMarker = markerPosition.clone().sub(this.camera.position);
        let isInFrontOfCamera = toMarker.dot(cameraForward) >= 0;
        let screenX = (projected.x * 0.5 + 0.5) * markerBounds.width;
        let screenY = (-projected.y * 0.5 + 0.5) * markerBounds.height;
        if (!isInFrontOfCamera) {
            screenX = markerBounds.width - screenX;
            screenY = markerBounds.height - screenY;
        }
        let edgePadding = 18;
        let clampedX = THREE.MathUtils.clamp(
            screenX,
            edgePadding,
            markerBounds.width - edgePadding,
        );
        let clampedY = THREE.MathUtils.clamp(
            screenY,
            edgePadding,
            markerBounds.height - edgePadding,
        );
        state.markerElements.root.style.transform =
            `translate(${clampedX}px, ${clampedY}px) translate(-50%, -100%)`;
        state.markerElements.root.style.display = "flex";
    }

    updateRaceVehicleState(state: RaceVehicleState) {
        let vehicle = state.vehicle;
        if (!vehicle?.hitbox)
            return;

        if (state.isLocalPlayer) {
            if (state.markerElements) {
                this.setMarkerOpacity(state.markerElements, 0);
                state.markerElements.root.style.display = "none";
            }
        } else if (state.markerElements) {
            let validMarkerOwner = this.raceVehicleStates.some(otherState =>
                !otherState.isLocalPlayer &&
                otherState.markerElements === state.markerElements,
            );
            if (!validMarkerOwner) {
                this.setMarkerOpacity(state.markerElements, 0);
                state.markerElements.root.style.display = "none";
                return;
            }
            let markerPosition = vehicle.model?.position.clone() || vehicle.position.clone();
            let anchorLift = vehicle.hitbox.up.clone().normalize()
                .multiplyScalar(vehicle.height * 0.5 + raceTrail.markerWorldOffset);
            markerPosition.add(anchorLift);
            this.updateMarkerPlacement(state, markerPosition);
            this.setMarkerOpacity(
                state.markerElements,
                this.getMarkerOpacity(markerPosition),
            );
        }

        let tailPosition = this.getVehicleTailPosition(vehicle);
        if (!vehicle.isAlive) {
            this.clearTrailState(state);
        } else if (
            state.trailPositions.length > 0 &&
            state.trailPositions[0].distanceTo(tailPosition) >
            raceTrail.draftTrailResetDistance
        ) {
            this.clearTrailState(state);
        }

        state.trailPositions.unshift(tailPosition);
        if (state.trailPositions.length > raceTrail.sampleCount)
            state.trailPositions.pop();

        let speedRatio = THREE.MathUtils.clamp(
            vehicle.velocity.length() / vehicle.getEffectiveMaxSpeed(),
            0,
            1,
        );
        let lengthRatio = Math.pow(
            speedRatio,
            raceTrail.lengthExponent,
        );
        let targetLength = THREE.MathUtils.lerp(
            raceTrail.minLength,
            raceTrail.maxLength,
            lengthRatio,
        );
        state.effectiveTrailPositions = this.buildEffectiveTrailPositions(
            state.trailPositions,
            targetLength,
        );
        let effectiveCount = state.effectiveTrailPositions.length;
        let effectiveLength = 0;
        for (let i = 0; i < effectiveCount - 1; i++)
            effectiveLength += state.effectiveTrailPositions[i].distanceTo(
                state.effectiveTrailPositions[i + 1],
            );
        let trailVisible = effectiveCount >= 2 &&
            vehicle.velocity.length() >= raceTrail.minDisplaySpeed &&
            effectiveLength >= raceTrail.minDisplayLength;
        let visibleCount = trailVisible ?
            Math.min(effectiveCount, raceTrail.sampleCount) :
            0;
        let wobbleTime = performance.now() * raceTrail.flowSpeed + state.wobblePhase;
        for (let i = 0; i < raceTrail.sampleCount; i++) {
            let point = state.effectiveTrailPositions[i];
            let nextPoint = state.effectiveTrailPositions[i + 1];
            let previousPoint = i > 0 ? state.effectiveTrailPositions[i - 1] : undefined;
            let cluster = state.trailClusters[i];
            if (!point) {
                cluster.halo.visible = false;
                cluster.primary.visible = false;
                cluster.spark.visible = false;
                for (let sprite of cluster.secondary)
                    sprite.visible = false;
                continue;
            }
            let trailDirection = nextPoint ?
                point.clone().sub(nextPoint).normalize() :
                previousPoint ?
                    previousPoint.clone().sub(point).normalize() :
                    vehicle.direction.clone().negate().normalize();
            let widthProgress = visibleCount > 1 ?
                1 - i / (visibleCount - 1) :
                1;
            let shapeFade = THREE.MathUtils.lerp(0.82, 1, widthProgress);
            let stableUp = vehicle.hitbox.up.clone().normalize();
            if (stableUp.lengthSq() < 0.0001)
                stableUp = new THREE.Vector3(0, 1, 0);
            let lateral = stableUp.clone().cross(trailDirection).normalize();
            if (lateral.lengthSq() < 0.0001)
                lateral = new THREE.Vector3(0, 1, 0).cross(trailDirection).normalize();
            if (lateral.lengthSq() < 0.0001)
                lateral = new THREE.Vector3(1, 0, 0);
            let viewUp = trailDirection.clone().cross(lateral).normalize();
            if (viewUp.lengthSq() < 0.0001)
                viewUp = stableUp.clone();
            let sideWave = Math.sin(wobbleTime + i * 0.22) *
                raceTrail.wobbleStrength *
                widthProgress;
            let liftWave = Math.cos(wobbleTime * 0.78 + i * 0.16) *
                raceTrail.wobbleStrength *
                widthProgress *
                0.45;
            let shellOffset = lateral.clone().multiplyScalar(sideWave * 0.18)
                .add(viewUp.clone().multiplyScalar(liftWave * 0.46));
            let coreOffset = lateral.clone().multiplyScalar(sideWave * 0.04 * raceTrail.clusterSpread)
                .add(viewUp.clone().multiplyScalar(liftWave * 0.18));
            let clusterScale = THREE.MathUtils.lerp(
                raceTrail.clusterScale * 0.45,
                raceTrail.clusterScale * 1.18,
                widthProgress,
            );
            let clusterVisible = trailVisible && i < visibleCount;
            let basePosition = point.clone().add(shellOffset.multiplyScalar(0.42));
            cluster.primary.position.copy(basePosition.clone().add(coreOffset));
            cluster.primary.scale.set(clusterScale * 1.18, clusterScale * 0.72, 1);
            (cluster.primary.material as THREE.SpriteMaterial).opacity =
                raceTrail.clusterOpacity * shapeFade;
            cluster.primary.visible = clusterVisible;

            cluster.halo.position.copy(basePosition);
            cluster.halo.scale.set(
                clusterScale * raceTrail.haloScale * 1.28,
                clusterScale * raceTrail.haloScale * 0.94,
                1,
            );
            (cluster.halo.material as THREE.SpriteMaterial).opacity =
                raceTrail.haloOpacity * shapeFade;
            cluster.halo.visible = clusterVisible;

            for (let j = 0; j < cluster.secondary.length; j++) {
                let offsetDirection = j % 2 === 0 ? 1 : -1;
                let liftDirection = j === 2 ? -1 : 1;
                let secondaryOffset = lateral.clone().multiplyScalar(
                    raceTrail.clusterSpread * (0.24 + j * 0.08) * offsetDirection * widthProgress,
                ).add(viewUp.clone().multiplyScalar(
                    raceTrail.clusterSpread * 0.18 * liftDirection * widthProgress,
                ));
                let secondarySprite = cluster.secondary[j];
                secondarySprite.position.copy(basePosition.clone().add(secondaryOffset));
                secondarySprite.scale.set(
                    clusterScale * (0.68 - j * 0.08),
                    clusterScale * (0.46 - j * 0.05),
                    1,
                );
                (secondarySprite.material as THREE.SpriteMaterial).opacity =
                    raceTrail.clusterOpacity * (0.52 - j * 0.06) * shapeFade;
                secondarySprite.visible = clusterVisible;
            }

            cluster.spark.position.copy(
                basePosition.clone().add(
                    lateral.clone().multiplyScalar(
                        Math.sin(wobbleTime + i * 0.3) *
                        raceTrail.particleSpread *
                        widthProgress,
                    ),
                ),
            );
            cluster.spark.scale.setScalar(
                raceTrail.particleScale * (0.7 + widthProgress * 0.9),
            );
            (cluster.spark.material as THREE.SpriteMaterial).opacity =
                raceTrail.particleOpacity * shapeFade;
            cluster.spark.visible = clusterVisible && i % 3 === 0;
        }
        for (let i = visibleCount; i < state.trailClusters.length; i++) {
            let cluster = state.trailClusters[i];
            cluster.halo.visible = false;
            cluster.primary.visible = false;
            cluster.spark.visible = false;
            for (let sprite of cluster.secondary)
                sprite.visible = false;
        }
    }

    updateRaceVehicleStates() {
        for (let state of this.raceVehicleStates)
            this.updateRaceVehicleState(state);
    }

    getTrailQuery(
        point: THREE.Vector3,
        trailPositions: Array<THREE.Vector3>,
    ): { distance: number; nearestPoint: THREE.Vector3 } {
        if (trailPositions.length < 2) {
            return {
                distance: Infinity,
                nearestPoint: point.clone(),
            };
        }

        let nearestDistance = Infinity;
        let nearestPoint = point.clone();
        let segment = new THREE.Line3();
        let closestPoint = new THREE.Vector3();
        for (let i = 0; i < trailPositions.length - 1; i++) {
            segment.set(trailPositions[i], trailPositions[i + 1]);
            segment.closestPointToPoint(point, true, closestPoint);
            let distance = closestPoint.distanceTo(point);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPoint.copy(closestPoint);
            }
        }
        return {
            distance: nearestDistance,
            nearestPoint,
        };
    }

    distanceToTrail(point: THREE.Vector3, trailPositions: Array<THREE.Vector3>): number {
        return this.getTrailQuery(point, trailPositions).distance;
    }

    getValidDraftQuery(
        drafterPoint: THREE.Vector3,
        sourceState: RaceVehicleState,
    ): { distance: number; nearestPoint: THREE.Vector3 } | undefined {
        let trailPositions = sourceState.effectiveTrailPositions;
        if (trailPositions.length < 2)
            return undefined;

        let sourceVehicle = sourceState.vehicle;
        let sourceDirection = sourceVehicle.direction.clone().normalize();
        let toDrafter = drafterPoint.clone().sub(sourceVehicle.position);
        if (toDrafter.dot(sourceDirection) > -raceTrail.draftBehindDistance)
            return undefined;

        let excludedDistance = raceTrail.draftHeadExclusionDistance;
        let nearestDistance = Infinity;
        let nearestPoint: THREE.Vector3 | undefined;
        let segment = new THREE.Line3();
        let closestPoint = new THREE.Vector3();

        for (let i = 0; i < trailPositions.length - 1; i++) {
            let rawStart = trailPositions[i];
            let rawEnd = trailPositions[i + 1];
            let segmentLength = rawStart.distanceTo(rawEnd);
            if (segmentLength <= 0.0001)
                continue;

            let start = rawStart.clone();
            let end = rawEnd.clone();
            if (excludedDistance > 0) {
                if (segmentLength <= excludedDistance) {
                    excludedDistance -= segmentLength;
                    continue;
                }

                let ratio = excludedDistance / segmentLength;
                start.lerp(end, ratio);
                excludedDistance = 0;
            }

            segment.set(start, end);
            segment.closestPointToPoint(drafterPoint, true, closestPoint);
            let pointBehindSource = closestPoint.clone().sub(sourceVehicle.position)
                .dot(sourceDirection);
            if (pointBehindSource > -raceTrail.draftBehindDistance)
                continue;

            let distance = closestPoint.distanceTo(drafterPoint);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPoint = closestPoint.clone();
            }
        }

        if (!nearestPoint)
            return undefined;

        return {
            distance: nearestDistance,
            nearestPoint,
        };
    }

    resolveDraftState(state: RaceVehicleState): DraftState {
        let drafterPoint = this.getVehicleDraftProbePoint(state.vehicle);
        let bestState: DraftState = {
            active: false,
        };

        for (let otherState of this.raceVehicleStates) {
            if (state.id === otherState.id)
                continue;

            let trailQuery = this.getValidDraftQuery(drafterPoint, otherState);
            if (!trailQuery || trailQuery.distance > raceTrail.draftZoneRadius)
                continue;

            if (!bestState.active ||
                trailQuery.distance < (bestState.distanceToTrail || Infinity)) {
                bestState = {
                    active: true,
                    distanceToTrail: trailQuery.distance,
                    nearestTrailPoint: trailQuery.nearestPoint.clone(),
                    sourceId: otherState.id,
                };
            }
        }

        return bestState;
    }

    updateDraftBoosts(dt: number): Array<DraftRelation> {
        let draftRelations: Array<DraftRelation> = [];
        for (let state of this.raceVehicleStates) {
            let draftState = this.resolveDraftState(state);
            state.draftState = draftState;
            if (draftState.active) {
                draftRelations.push({
                    distanceToTrail: draftState.distanceToTrail || 0,
                    drafterId: state.id,
                    nearestTrailPoint: draftState.nearestTrailPoint?.clone() ||
                        state.vehicle.position.clone(),
                    sourceId: draftState.sourceId || "",
                });
            }

            let delta = draftState.active ?
                racePerformance.draftChargeGainPerMs * dt :
                -racePerformance.draftChargeDecayPerMs * dt;
            state.vehicle.draftCharge = THREE.MathUtils.clamp(
                state.vehicle.draftCharge + delta,
                0,
                1,
            );
        }
        this.draftRelations = draftRelations;
        return draftRelations;
    }

    separateCollidingVehicles(first: Vehicle, second: Vehicle) {
        let firstBox = new THREE.Box3().setFromObject(first.hitbox);
        let secondBox = new THREE.Box3().setFromObject(second.hitbox);
        if (!firstBox.intersectsBox(secondBox))
            return;

        let firstCenter = firstBox.getCenter(new THREE.Vector3());
        let secondCenter = secondBox.getCenter(new THREE.Vector3());
        let normal = firstCenter.clone().sub(secondCenter);
        if (normal.lengthSq() < 0.0001)
            normal.copy(first.direction).negate();
        normal.normalize();

        let overlapX = Math.min(firstBox.max.x, secondBox.max.x) -
            Math.max(firstBox.min.x, secondBox.min.x);
        let overlapY = Math.min(firstBox.max.y, secondBox.max.y) -
            Math.max(firstBox.min.y, secondBox.min.y);
        let overlapZ = Math.min(firstBox.max.z, secondBox.max.z) -
            Math.max(firstBox.min.z, secondBox.min.z);
        let separation = Math.max(
            Math.min(overlapX, overlapY, overlapZ),
            0.02,
        ) + raceCollision.pushStrength;

        let firstSpeed = first.velocity.length();
        let secondSpeed = second.velocity.length();
        let totalSpeed = firstSpeed + secondSpeed;
        let firstShare = totalSpeed > 0 ? secondSpeed / totalSpeed : 0.5;
        let secondShare = totalSpeed > 0 ? firstSpeed / totalSpeed : 0.5;
        let firstForwardDot = Math.abs(normal.dot(first.direction.clone().normalize()));
        let secondForwardDot = Math.abs(normal.dot(second.direction.clone().normalize()));
        let isFrontBackCollision = Math.max(firstForwardDot, secondForwardDot) >=
            raceCollision.frontBackThreshold;

        if (isFrontBackCollision) {
            first.position.add(normal.clone().multiplyScalar(separation * firstShare));
            second.position.add(normal.clone().multiplyScalar(-separation * secondShare));
            let relativeSpeed = first.velocity.clone().sub(second.velocity).dot(normal);
            let reboundMagnitude = Math.max(
                Math.abs(relativeSpeed) * 0.5,
                raceCollision.frontBackReboundBase,
            );
            let firstIsFront = first.position.clone().sub(second.position)
                .dot(first.direction.clone().normalize()) > 0;
            let frontVehicle = firstIsFront ? first : second;
            let rearVehicle = firstIsFront ? second : first;
            let frontPushDirection = frontVehicle.position.clone()
                .sub(rearVehicle.position)
                .normalize();
            if (frontPushDirection.lengthSq() < 0.0001)
                frontPushDirection.copy(frontVehicle.direction).normalize();
            let rearPushDirection = frontPushDirection.clone().negate();

            frontVehicle.velocity.add(
                frontPushDirection.multiplyScalar(
                    reboundMagnitude * raceCollision.frontBackReboundFrontScale,
                ),
            );
            rearVehicle.velocity.add(
                rearPushDirection.multiplyScalar(
                    reboundMagnitude * raceCollision.frontBackReboundRearScale,
                ),
            );
        } else {
            let speedGap = Math.min(
                Math.abs(firstSpeed - secondSpeed) *
                raceCollision.sideImpactSpeedBiasScale,
                raceCollision.sideImpactSpeedBiasCap,
            );
            let firstIsSlower = firstSpeed <= secondSpeed;
            let slowerVehicle = firstIsSlower ? first : second;
            let fasterVehicle = firstIsSlower ? second : first;
            let slowerShare = Math.min(
                (firstIsSlower ? firstShare : secondShare) + speedGap,
                0.92,
            );
            let fasterShare = Math.max(1 - slowerShare, 0.08);

            slowerVehicle.position.add(
                normal.clone().multiplyScalar(
                    slowerVehicle === first ? separation * slowerShare : -separation * slowerShare,
                ),
            );
            fasterVehicle.position.add(
                normal.clone().multiplyScalar(
                    fasterVehicle === first ? separation * fasterShare : -separation * fasterShare,
                ),
            );

            first.velocity.multiplyScalar(
                firstIsSlower ?
                    raceCollision.sideImpactSlowSlowScale :
                    raceCollision.sideImpactSlowFastScale,
            );
            second.velocity.multiplyScalar(
                firstIsSlower ?
                    raceCollision.sideImpactSlowFastScale :
                    raceCollision.sideImpactSlowSlowScale,
            );
            first.applyCollisionSlow(raceCollision.slowDurationMs);
            second.applyCollisionSlow(raceCollision.slowDurationMs);
        }

        first.syncTransform();
        second.syncTransform();
    }

    handleVehicleCollisions() {
        let collisionStates = this.finished ?
            this.raceVehicleStates.filter(state => !state.isLocalPlayer) :
            this.raceVehicleStates;

        for (let i = 0; i < collisionStates.length; i++) {
            for (let j = i + 1; j < collisionStates.length; j++) {
                let first = collisionStates[i].vehicle;
                let second = collisionStates[j].vehicle;
                if (!first.hitbox || !second.hitbox)
                    continue;

                this.separateCollidingVehicles(first, second);
            }
        }
    }

    setupControls(isTouchDevice?: boolean) {
        // set up keyboard controls
        this.keysPressed = {};

        // hide joystick if not touch device
        if (!isTouchDevice) {
            this.ui.joystick.style.display = "none";
            return;
        }

        // set up touch joystick
        let vw = 0.01 * this.width;
        let vh = 0.01 * this.height;        
        let joystickRadius = 10 * vw;
        let joystickThreshold = 0.5 * joystickRadius;
        
        // get origin for joystick in px
        let x0 = 10 * vw + joystickRadius;
        let y0 = 50 * vh + joystickRadius;
        
        // keep track of all keys so they can be reset in the touch handler
        let controlKeys = ["w", "a", "s", "d", "shift"];
        
        let knob = this.ui.knob;
        this.handleKnobTouchMoveBound = (e: TouchEvent) => {
            e.preventDefault();
            
            for (let key of controlKeys)
                this.keysPressed[key] = false;

            let knobTouch = e.targetTouches[0];

            let dx = knobTouch.clientX - x0;
            let dy = knobTouch.clientY - y0;

            // mimic wasd controls with the joystick
            if (dy < -joystickThreshold)
                this.keysPressed["w"] = true;
            
            if (dx < -joystickThreshold)
                this.keysPressed["a"] = true;

            if (dy > joystickThreshold)
                this.keysPressed["s"] = true;
            
            if (dx > joystickThreshold)
                this.keysPressed["d"] = true;

            // clamp the displacement of the knob from the origin
            let r = Math.min(Math.sqrt(dx ** 2 + dy ** 2), joystickRadius);
            let a = Math.atan2(dy, dx);
            
            // add back 5vw offset to center 
            let top = 5 + r * Math.sin(a) / vw + "vw";
            let left = 5 + r * Math.cos(a) / vw + "vw";
            
            this.ui.knob.style.top = top;
            this.ui.knob.style.left = left;
        };
        knob.addEventListener("touchmove", this.handleKnobTouchMoveBound, false);

        // reset knob position
        this.handleKnobTouchEndBound = () => {
            for (let key of controlKeys)
                this.keysPressed[key] = false;

            this.ui.knob.style.top = "5vw";
            this.ui.knob.style.left = "5vw";
        };
        knob.addEventListener("touchend", this.handleKnobTouchEndBound, false);
        
    }

    handleRaceFinish() {
        if (this.finished)
            return;

        this.captureNpcFinishers();
        this.playerFinishTimeMs = this.track.elapsedTime;
        this.finishTimes.set("player", this.playerFinishTimeMs);
        this.playerFinishRank = undefined;
        this.debugState.finishHandledAt = performance.now();
        this.debugState.finishPanelVisibleAt = performance.now();
        this.debugState.laps = this.player.laps;
        this.finished = true;
        this.clearPlayerInputs();
        this.hudState.showResults = true;
        this.hudState.showSettings = false;
        document.body.dataset.raceFinished = "true";
        document.body.dataset.finishPanelVisible = "true";
        document.body.dataset.playerLaps = this.player.laps.toString();
        this.updateJoystickVisibility();

        this.player.sounds["complete-race"]?.play();
    }

    // update game objects
    update(dt?: number) {
        if (!dt)
            return;

        // scene decorations
        if (this.satellites)
            for (let satellite of this.satellites)
                satellite.update(dt);

        let now = performance.now();
        for (let cluster of this.floatingClusters) {
            cluster.mesh.position.x = cluster.origin.x +
                Math.sin(now * cluster.driftSpeed + cluster.driftPhase) * cluster.driftAmplitude.x;
            cluster.mesh.position.y = cluster.origin.y +
                Math.cos(now * cluster.driftSpeed * 0.84 + cluster.driftPhase * 1.08) * cluster.driftAmplitude.y;
            cluster.mesh.position.z = cluster.origin.z +
                Math.sin(now * cluster.driftSpeed * 0.62 + cluster.driftPhase * 0.72) * cluster.driftAmplitude.z;
            cluster.mesh.rotateX(cluster.rotationRate.x * dt);
            cluster.mesh.rotateY(cluster.rotationRate.y * dt);
            cluster.mesh.rotateZ(cluster.rotationRate.z * dt);

            for (let piece of cluster.pieces) {
                piece.mesh.position.x = piece.origin.x +
                    Math.sin(now * piece.driftSpeed + piece.driftPhase) * piece.driftAmplitude.x;
                piece.mesh.position.y = piece.origin.y +
                    Math.cos(now * piece.driftSpeed * 0.74 + piece.driftPhase * 1.24) * piece.driftAmplitude.y;
                piece.mesh.position.z = piece.origin.z +
                    Math.sin(now * piece.driftSpeed * 0.56 + piece.driftPhase * 0.68) * piece.driftAmplitude.z;
                let pulse = 1 + Math.sin(now * piece.pulseSpeed + piece.driftPhase) * piece.pulseAmplitude;
                piece.mesh.scale.setScalar(pulse);
                piece.mesh.rotateX(piece.rotationRate.x * dt);
                piece.mesh.rotateY(piece.rotationRate.y * dt);
                piece.mesh.rotateZ(piece.rotationRate.z * dt);
            }
        }

        for (let glow of this.nebulaGlows) {
            glow.sprite.position.x = glow.origin.x +
                Math.sin(now * glow.driftSpeed + glow.driftPhase) * glow.driftAmplitude.x;
            glow.sprite.position.y = glow.origin.y +
                Math.cos(now * glow.driftSpeed * 0.82 + glow.driftPhase * 1.12) * glow.driftAmplitude.y;
            glow.sprite.position.z = glow.origin.z +
                Math.sin(now * glow.driftSpeed * 0.58 + glow.driftPhase * 0.74) * glow.driftAmplitude.z;
            let pulse = 1 + Math.sin(now * glow.pulseSpeed + glow.driftPhase) * glow.pulseAmplitude;
            glow.sprite.scale.set(
                glow.baseScale.x * pulse,
                glow.baseScale.y * pulse,
                1,
            );
        }

        // wait 3 seconds for fade in
        // wait 3 seconds for countdown
        this.countdown += dt;
        this.syncCountdownState();
        if (this.countdown < 6000) {
            this.updateRaceVehicleStates();
            this.updateHudState();
            this.renderHud();
            return;
        }

        if (this.finishPreview) {
            this.player.laps = 3;
            this.capturePlayerLapProgress();
            this.handleRaceFinish();
            this.finishPreview = false;
        }

        this.track.update(dt);

        let raceRunningMs = Math.max(0, this.countdown - 6000);
        let playerControls = this.finished ? {} : this.keysPressed;
        this.player.update(this.track, dt, playerControls);
        let listenerState = this.audioEnabled ?
            this.player.createEngineAudioListenerState() :
            undefined;
        if (this.audioEnabled)
            this.player.updateEngineAudio(dt, listenerState);
        let plannerNowMs = this.publishNpcPlannerSnapshot(raceRunningMs);

        for (let i = 0; i < this.npcs.length; i++) {
            let npc = this.npcs[i];
            let npcState = this.raceVehicleStates[i + 1];
            npc.update(this.track, dt, {
                asyncPlan: npcState ?
                    this.npcPlannerClient?.getPlan(npcState.id, plannerNowMs) :
                    undefined,
                draftRelations: this.draftRelations,
                raceRunningMs,
                selfId: npcState?.id,
                vehicleStates: this.raceVehicleStates,
            });
            if (this.audioEnabled)
                npc.updateEngineAudio(dt, listenerState);
        }

        this.recordPlayerTelemetry(dt);
        this.captureNpcFinishers();
        this.capturePlayerLapProgress();
        this.debugState.laps = this.player.laps;
        document.body.dataset.playerLaps = this.player.laps.toString();
        if (!this.finished && this.player.laps > this.hudState.totalLaps)
            this.handleRaceFinish();

        this.updateRaceVehicleStates();
        this.updateDraftBoosts(dt);
        this.handleVehicleCollisions();
        this.updateHudState();
        this.renderHud();
    }

    activate() {
        if (this.active)
            return;

        this.active = true;
        this.resetUi();
        if (!this.npcPlannerClient)
            this.setupNpcPlannerClient();
        if (this.fadeInTimeout)
            window.clearTimeout(this.fadeInTimeout);
        this.fadeInTimeout = window.setTimeout(() => {
            this.ui.curtain.classList.remove("fade-in");
            this.ui.curtain.style.opacity = "0";
        }, 650);
        this.updateJoystickVisibility();
        window.addEventListener("resize", this.handleResizeBound, false);
        window.addEventListener("keydown", this.handleKeyDownBound);
        window.addEventListener("keyup", this.handleKeyUpBound);
        window.addEventListener("pointerdown", this.handlePointerDownBound, false);
        this.renderHud();
    }

    deactivate() {
        if (!this.active)
            return;

        this.active = false;
        if (this.hudActionTimeoutId) {
            window.clearTimeout(this.hudActionTimeoutId);
            this.hudActionTimeoutId = undefined;
        }
        this.keysPressed = {};
        this.ui.joystick.style.display = "none";
        this.npcPlannerClient?.dispose();
        this.npcPlannerClient = undefined;
        window.removeEventListener("resize", this.handleResizeBound, false);
        window.removeEventListener("keydown", this.handleKeyDownBound);
        window.removeEventListener("keyup", this.handleKeyUpBound);
        window.removeEventListener("pointerdown", this.handlePointerDownBound, false);
    }

    dispose() {
        this.deactivate();
        this.clearRaceIdentityMarkers();

        if (this.fadeInTimeout)
            window.clearTimeout(this.fadeInTimeout);
        if (this.handleKnobTouchMoveBound)
            this.ui.knob.removeEventListener("touchmove", this.handleKnobTouchMoveBound, false);
        if (this.handleKnobTouchEndBound)
            this.ui.knob.removeEventListener("touchend", this.handleKnobTouchEndBound, false);

        this.ui.curtain.classList.remove("fade-in", "fade-to-black", "long-fade-to-black", "scroll-up");
        this.ui.curtain.style.opacity = "0";
        this.ui.curtain.style.height = "100vh";
        this.hudState = this.hud.createDefaultState();
        this.renderHud();

        this.player?.clearPendingTimeouts();
        this.player?.disposeAudio?.();
        for (let npc of this.npcs || []) {
            npc.clearPendingTimeouts();
            npc.disposeAudio?.();
        }
        Object.values(this.sounds || {}).forEach((sound) => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.orbitals?.dispose();
        this.renderer?.dispose();
        for (let state of this.raceVehicleStates || []) {
            state.markerElements?.root.remove();
            for (let cluster of state.trailClusters || []) {
                this.remove(cluster.halo);
                this.remove(cluster.primary);
                this.remove(cluster.spark);
                for (let sprite of cluster.secondary)
                    this.remove(sprite);
            }
        }
        this.clear();
    }
}
