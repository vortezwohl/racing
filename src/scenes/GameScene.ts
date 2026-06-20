import * as THREE from "three";
import { GUI } from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry"
import { CPU, Player, Track, Vehicle } from "../objects/objects";
import { Satellite } from "../decorations/decorations";
import { randomVector } from "../utils/geometry";
import { Controls, GameSceneOptions, RaceUi } from "../utils/interfaces";
import {
    raceCollision,
    raceIdentityColors,
    racePerformance,
    raceTrail,
} from "../utils/raceConfig";
import { tracks } from "../../data/tracks/tracks";
import {
    speeders,
    bike,
    mustang,
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

type RaceVehicleState = {
    displayName: string;
    id: string;
    identityColor: number;
    isLocalPlayer: boolean;
    markerGroup?: THREE.Group;
    trailLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
    trailPositions: Array<THREE.Vector3>;
    vehicle: Vehicle;
};

export default class GameScene extends THREE.Scene {
    active: boolean;
    canvas: HTMLCanvasElement;
    debugMode: boolean;
    debugger: GUI;

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
    CPUs: Array<Vehicle>;
    cpuMenuVehicles: Array<MenuVehicle>;
    raceVehicleStates: Array<RaceVehicleState>;

    countdown: number;
    fadeInTimeout?: number;
    finished: boolean;
    finishPreview: boolean;
    finishScreenTimeout?: number;
    handleKeyDownBound: (e: KeyboardEvent) => void;
    handleKeyUpBound: (e: KeyboardEvent) => void;
    handleResizeBound: () => void;
    handleKnobTouchEndBound?: () => void;
    handleKnobTouchMoveBound?: (e: TouchEvent) => void;

    debugState: RaceDebugState;
    sounds: { [key: string]: HTMLAudioElement };
    ui: RaceUi;

    constructor(options: GameSceneOptions) {
        super();

        this.active = false;
        this.canvas = options.canvas;
        this.debugMode = !!options.debug;
        this.ui = options.ui;
        this.userData.raceUi = this.ui;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.floatingClusters = [];
        this.nebulaGlows = [];
        this.raceVehicleStates = [];
        this.cpuMenuVehicles = [];
        this.handleKeyDownBound = (e: KeyboardEvent) => {
            this.keysPressed[e.key.toLowerCase()] = true;
        };
        this.handleKeyUpBound = (e: KeyboardEvent) => {
            this.keysPressed[e.key.toLowerCase()] = false;
        };
        this.handleResizeBound = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
            this.filter.setSize(this.width, this.height);
        };

        this.render(options.speederIndex, options.debug);

        // set up utilities
        // set up controls
        let isTouchDevice = "ontouchstart" in window || 
            navigator.maxTouchPoints > 0;
        this.setupControls(isTouchDevice);

        this.countdown = 0;
        this.finished = false;
        this.finishPreview = !!options.finishPreview;
        this.debugState = {
            laps: 1,
        };

        this.sounds = {
            "countdown": new Audio("./assets/sounds/countdown.wav"),
            "countdown-start": new Audio("./assets/sounds/countdown-start.wav")
        }
    }

    resetUi() {
        this.ui.counter.innerHTML = "Lap 1/2";
        this.ui.countdown.innerHTML = "";
        this.ui.timer.innerHTML = "00:00:00";
        this.ui.dashboard.style.display = "block";
        this.ui.finishScreen.style.display = "none";
        this.ui.finishScreen.style.opacity = "0";
        this.ui.finishRank.innerHTML = "";
        this.ui.finishRankSuffix.innerHTML = "";
        this.ui.finishTime.innerHTML = "";
        this.ui.joystick.style.display = "none";
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
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this, this.camera));
        this.filter = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 1.6, 0.1, 0.9);
        this.composer.addPass(this.filter);

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
        
        if (isNaN(speederIndex))
            speederIndex = 0;

        let playerVehicleData = speederIndex == 3 ? bike : speederIndex == 4 ? mustang : 
            speederIndex > 4 || speederIndex < 0 ? speeders[0] : speeders[speederIndex];

        this.player = new Player(this, this.camera, playerVehicleData, 
            this.track.startPoint.clone(), this.track.startDirection.clone(), 
            this.track.startRotation.clone(), firstCheckpoint, debug, this.orbitals);
        this.player.handleCameraMovement(true, true);

        this.CPUs = [];
        this.cpuMenuVehicles = [];
        let offset = 4;

        for (let i = 0; i < 3; i++) {
            if (i == speederIndex || this.CPUs.length == 3)
                continue;

            let startPoint = new THREE.Vector3(this.track.startPoint.x, 
                this.track.startPoint.y, this.track.startPoint.z + offset);

            this.CPUs.push(new CPU(this, speeders[i], startPoint,
                this.track.startDirection.clone(), 
                this.track.startRotation.clone(), firstCheckpoint, debug));
            this.cpuMenuVehicles.push(menuVehicles[i]);

            offset *= -1;
        }

        this.setupRaceVehicleStates(speederIndex);

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

            const filterGroup = this.debugger.addFolder("Filter");
            filterGroup.add(this.filter, "strength", 0.0, 100.0);
            filterGroup.add(this.filter, "radius", 0.0, 5.0);
            filterGroup.add(this.filter, "threshold", 0.0, 1.0);

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

    createRaceNameSprite(text: string, color: number): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create race name canvas.");

        canvas.width = 512;
        canvas.height = 128;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = '800 48px "RaceName", "Trebuchet MS", "Verdana", sans-serif';
        context.shadowBlur = 16;
        context.shadowColor = this.colorToCss(color);
        context.lineWidth = 8;
        context.strokeStyle = "rgba(0, 8, 22, 0.86)";
        context.fillStyle = this.colorToCss(color);
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        let texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        let sprite = new THREE.Sprite(material);
        sprite.scale.set(3.2, 0.8, 1);
        sprite.renderOrder = 40;
        return sprite;
    }

    createPointerSprite(color: number): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create race pointer canvas.");

        canvas.width = 128;
        canvas.height = 128;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        context.moveTo(64, 108);
        context.lineTo(20, 24);
        context.lineTo(108, 24);
        context.closePath();
        context.shadowBlur = 16;
        context.shadowColor = this.colorToCss(color);
        context.fillStyle = this.colorToCss(color);
        context.fill();

        let texture = new THREE.CanvasTexture(canvas);
        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        let sprite = new THREE.Sprite(material);
        sprite.scale.set(0.55, 0.55, 1);
        sprite.position.y = -0.58;
        sprite.renderOrder = 41;
        return sprite;
    }

    createIdentityMarker(displayName: string, color: number): THREE.Group {
        let marker = new THREE.Group();
        marker.add(this.createRaceNameSprite(displayName, color));
        marker.add(this.createPointerSprite(color));
        marker.renderOrder = 40;
        this.add(marker);
        return marker;
    }

    createTrailLine(color: number): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
        let geometry = new THREE.BufferGeometry();
        let positions = new Float32Array(raceTrail.sampleCount * 3);
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);

        let material = new THREE.LineBasicMaterial({
            blending: THREE.AdditiveBlending,
            color,
            depthWrite: false,
            linewidth: 4,
            opacity: 0.72,
            transparent: true,
        });
        let trailLine = new THREE.Line(geometry, material);
        trailLine.renderOrder = 20;
        this.add(trailLine);
        return trailLine;
    }

    setupRaceVehicleStates(speederIndex: number) {
        let playerMenuVehicle = menuVehicles.find(vehicle =>
            vehicle.playableIndex === speederIndex
        ) || menuVehicles[0];
        let states: Array<RaceVehicleState> = [
            {
                displayName: playerMenuVehicle.label,
                id: "player",
                identityColor: raceIdentityColors[0],
                isLocalPlayer: true,
                trailLine: this.createTrailLine(raceIdentityColors[0]),
                trailPositions: [],
                vehicle: this.player,
            },
        ];

        for (let i = 0; i < this.CPUs.length; i++) {
            let menuVehicle = this.cpuMenuVehicles[i] || menuVehicles[i] ||
                menuVehicles[0];
            let identityColor = raceIdentityColors[(i + 1) % raceIdentityColors.length];
            states.push({
                displayName: menuVehicle.label,
                id: `cpu-${i + 1}`,
                identityColor,
                isLocalPlayer: false,
                markerGroup: this.createIdentityMarker(menuVehicle.label, identityColor),
                trailLine: this.createTrailLine(identityColor),
                trailPositions: [],
                vehicle: this.CPUs[i],
            });
        }

        this.raceVehicleStates = states;
    }

    getVehicleTailPosition(vehicle: Vehicle): THREE.Vector3 {
        return vehicle.position.clone().sub(
            vehicle.direction.clone().normalize().multiplyScalar(vehicle.length * 0.5),
        );
    }

    updateRaceVehicleState(state: RaceVehicleState) {
        let vehicle = state.vehicle;
        if (!vehicle?.hitbox)
            return;

        if (state.markerGroup) {
            state.markerGroup.position.copy(vehicle.position);
            state.markerGroup.position.y += vehicle.height * 0.5 + 1.35;
            state.markerGroup.lookAt(this.camera.position);
        }

        state.trailPositions.unshift(this.getVehicleTailPosition(vehicle));
        if (state.trailPositions.length > raceTrail.sampleCount)
            state.trailPositions.pop();

        let speedRatio = THREE.MathUtils.clamp(
            vehicle.velocity.length() / vehicle.getEffectiveMaxSpeed(),
            0,
            1,
        );
        let visibleCount = Math.max(
            2,
            Math.ceil(THREE.MathUtils.lerp(
                Math.max(2, raceTrail.sampleCount * 0.32),
                raceTrail.sampleCount,
                speedRatio,
            )),
        );
        visibleCount = Math.min(visibleCount, state.trailPositions.length);

        let positionAttribute = state.trailLine.geometry
            .getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < raceTrail.sampleCount; i++) {
            let point = state.trailPositions[i] || state.trailPositions[0] ||
                vehicle.position;
            positionAttribute.setXYZ(i, point.x, point.y, point.z);
        }
        positionAttribute.needsUpdate = true;
        state.trailLine.geometry.setDrawRange(0, visibleCount);
        state.trailLine.visible = visibleCount > 1 && vehicle.velocity.length() > 0.03;
    }

    updateRaceVehicleStates() {
        for (let state of this.raceVehicleStates)
            this.updateRaceVehicleState(state);
    }

    distanceToTrail(point: THREE.Vector3, trailPositions: Array<THREE.Vector3>): number {
        if (trailPositions.length < 2)
            return Infinity;

        let nearestDistance = Infinity;
        let segment = new THREE.Line3();
        let closestPoint = new THREE.Vector3();
        for (let i = 0; i < trailPositions.length - 1; i++) {
            segment.set(trailPositions[i], trailPositions[i + 1]);
            segment.closestPointToPoint(point, true, closestPoint);
            nearestDistance = Math.min(
                nearestDistance,
                closestPoint.distanceTo(point),
            );
        }
        return nearestDistance;
    }

    updateDraftBoosts(dt: number) {
        for (let state of this.raceVehicleStates) {
            let insideTrail = false;
            for (let otherState of this.raceVehicleStates) {
                if (state.id === otherState.id)
                    continue;

                let distance = this.distanceToTrail(
                    state.vehicle.position,
                    otherState.trailPositions,
                );
                if (distance <= raceTrail.zoneRadius) {
                    insideTrail = true;
                    break;
                }
            }

            let delta = insideTrail ?
                racePerformance.draftChargeGainPerMs * dt :
                -racePerformance.draftChargeDecayPerMs * dt;
            state.vehicle.draftCharge = THREE.MathUtils.clamp(
                state.vehicle.draftCharge + delta,
                0,
                1,
            );
        }
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

        first.position.add(normal.clone().multiplyScalar(separation * firstShare));
        second.position.add(normal.clone().multiplyScalar(-separation * secondShare));
        first.velocity.multiplyScalar(firstSpeed >= secondSpeed ? 0.82 : 0.65);
        second.velocity.multiplyScalar(secondSpeed >= firstSpeed ? 0.82 : 0.65);
        first.applyCollisionSlow(raceCollision.slowDurationMs);
        second.applyCollisionSlow(raceCollision.slowDurationMs);
        first.syncTransform();
        second.syncTransform();
    }

    handleVehicleCollisions() {
        for (let i = 0; i < this.raceVehicleStates.length; i++) {
            for (let j = i + 1; j < this.raceVehicleStates.length; j++) {
                let first = this.raceVehicleStates[i].vehicle;
                let second = this.raceVehicleStates[j].vehicle;
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

    handleCountdown() {
        let countdown = this.ui.countdown;
        if (this.countdown < 3000 || this.countdown > 7000)
            return countdown.innerHTML = "";

        let countDownText = this.countdown < 6000 ? 
            Math.ceil((6000 - this.countdown) / 1000).toString() : "GO!";
        
        if (countdown.innerHTML != countDownText) {
            let sound = "countdown" + (countDownText == "GO!" ? "-start" : "");
            this.sounds[sound].play();
            countdown.innerHTML = this.countdown < 6000 ? 
                Math.ceil((6000 - this.countdown) / 1000).toString() : "GO!";
        }
        
    }

    handleRaceFinish() {
        if (!this.finished) {
            this.ui.curtain.classList.add("long-fade-to-black");
            this.debugState.finishHandledAt = performance.now();
            this.debugState.laps = this.player.laps;
            document.body.dataset.raceFinished = "true";
            document.body.dataset.playerLaps = this.player.laps.toString();
            console.info("[finish] handleRaceFinish", {
                laps: this.player.laps,
                timestamp: this.debugState.finishHandledAt,
            });
            
            let rank = 1;
            for (let cpu of this.CPUs)
            if (cpu.laps > 2)
            rank++;
            
            this.ui.dashboard.style.display = "none";
            this.ui.joystick.style.display = "none";
            this.ui.finishScreen.style.display = "flex";
            this.ui.finishScreen.style.opacity = "1";
            this.debugState.finishPanelVisibleAt = performance.now();
            document.body.dataset.finishPanelVisible = "true";
            console.info("[finish] finishScreenVisible", {
                rank,
                timestamp: this.debugState.finishPanelVisibleAt,
                time: this.track.getTimeString(),
            });

            let suffixes = ["st", "nd", "rd"]
            this.ui.finishRank.innerHTML = rank.toString();
            this.ui.finishRankSuffix.innerHTML = suffixes[rank - 1];
            this.ui.finishTime.innerHTML =
                `Time: ${this.track.getTimeString()}`;

            this.player.sounds["complete-race"]?.play();
            try {
                this.player.engineSound.stop();
            } catch (_error) {
                // Avoid blocking the finish overlay if engine audio was already stopped.
            }

            this.finished = true;
        }
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
        this.handleCountdown();
        if (this.countdown < 6000)
            return;

        if (this.finishPreview) {
            this.player.laps = 3;
            this.handleRaceFinish();
            return;
        }

        // race ends after 2 laps
        this.debugState.laps = this.player.laps;
        document.body.dataset.playerLaps = this.player.laps.toString();
        if (this.player.laps > 2)
            this.handleRaceFinish();
        else
            this.track.update(dt);
        
        // update vehicles
        this.player.update(this.track, dt, this.keysPressed);

        for (let cpu of this.CPUs)
            cpu.update(this.track, dt);

        this.updateRaceVehicleStates();
        this.updateDraftBoosts(dt);
        this.handleVehicleCollisions();
    }

    activate() {
        if (this.active)
            return;

        this.active = true;
        this.resetUi();
        if (this.fadeInTimeout)
            window.clearTimeout(this.fadeInTimeout);
        this.fadeInTimeout = window.setTimeout(() => {
            this.ui.curtain.classList.remove("fade-in");
            this.ui.curtain.style.opacity = "0";
        }, 650);
        let isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        this.ui.dashboard.style.display = "block";
        this.ui.joystick.style.display = isTouchDevice ? "block" : "none";
        window.addEventListener("resize", this.handleResizeBound, false);
        window.addEventListener("keydown", this.handleKeyDownBound);
        window.addEventListener("keyup", this.handleKeyUpBound);
    }

    deactivate() {
        if (!this.active)
            return;

        this.active = false;
        this.keysPressed = {};
        this.ui.dashboard.style.display = "none";
        this.ui.joystick.style.display = "none";
        window.removeEventListener("resize", this.handleResizeBound, false);
        window.removeEventListener("keydown", this.handleKeyDownBound);
        window.removeEventListener("keyup", this.handleKeyUpBound);
    }

    dispose() {
        this.deactivate();

        if (this.fadeInTimeout)
            window.clearTimeout(this.fadeInTimeout);
        if (this.finishScreenTimeout)
            window.clearTimeout(this.finishScreenTimeout);
        if (this.handleKnobTouchMoveBound)
            this.ui.knob.removeEventListener("touchmove", this.handleKnobTouchMoveBound, false);
        if (this.handleKnobTouchEndBound)
            this.ui.knob.removeEventListener("touchend", this.handleKnobTouchEndBound, false);

        this.ui.finishScreen.style.display = "none";
        this.ui.finishScreen.style.opacity = "0";
        this.ui.countdown.innerHTML = "";
        this.ui.curtain.classList.remove("fade-in", "fade-to-black", "long-fade-to-black", "scroll-up");
        this.ui.curtain.style.opacity = "0";
        this.ui.curtain.style.height = "100vh";

        this.player?.clearPendingTimeouts();
        this.player?.disposeAudio?.();
        for (let cpu of this.CPUs || [])
            cpu.clearPendingTimeouts();
        Object.values(this.sounds || {}).forEach((sound) => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.orbitals?.dispose();
        this.renderer?.dispose();
        this.clear();
    }
}
