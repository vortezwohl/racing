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
import { Controls } from "../utils/interfaces";
import { tracks } from "../../data/tracks/tracks";
import { speeders, bike, mustang } from "../../data/vehicles/vehicles";

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

export default class GameScene extends THREE.Scene {
    debugger: GUI;

    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    filter: UnrealBloomPass;

    orbitals: OrbitControls;

    width: number;
    height: number;

    keysPressed: Controls;

    track: Track;
    nebulaGlows: Array<NebulaGlow>;
    satellites: Array<Satellite>;
    
    player: Player;
    CPUs: Array<Vehicle>;

    countdown: number;
    finished: boolean;

    sounds: { [key: string]: HTMLAudioElement };

    constructor(speederIndex: number, debug?: boolean) {
        super();

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.nebulaGlows = [];

        this.render(speederIndex, debug);

        // set up utilities
        // set up controls
        let isTouchDevice = "ontouchstart" in window || 
            navigator.maxTouchPoints > 0;
        this.setupControls(isTouchDevice);

        // set up window resizing
        window.addEventListener("resize", () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
            this.filter.setSize(this.width, this.height);
        }, false);

        this.countdown = 0;
        this.finished = false;

        this.sounds = {
            "countdown": new Audio("./assets/sounds/countdown.wav"),
            "countdown-start": new Audio("./assets/sounds/countdown-start.wav")
        }

        setTimeout(() => {
            document.getElementById("curtain").classList.remove("fade-in");
        }, 5000);
    }

    setupBackgroundEntities(number: number = 5000, 
        distance: number = 1000, offset: number = 200) {
        
        this.satellites = [];
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
            if (Math.random() < 0.014) {
                // create a convex hull from a random set of points
                let points = Array(Math.ceil(Math.random() * 8) + 8).fill(0)
                    .map(_ => randomVector().multiplyScalar(6 + Math.random() * 8));
            
                let geometry = new ConvexGeometry(points);
                let direction = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.018,
                    (Math.random() - 0.5) * 0.012,
                    (Math.random() - 0.5) * 0.006,
                );
                let rotationRate = randomVector().multiplyScalar(0.00035);
                let satellite = new Satellite(geometry, clusterMaterial, direction, rotationRate);
                satellite.position.set(
                    (Math.random() - 0.5) * 2200,
                    120 + Math.random() * 360,
                    -720 - Math.random() * 1280,
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

        let glowSpecs = [
            {
                color: "rgba(164, 106, 255, 0.52)",
                haloColor: "rgba(104, 178, 255, 0.2)",
                position: new THREE.Vector3(-980, 250, -1520),
                scale: new THREE.Vector2(620, 520),
            },
            {
                color: "rgba(128, 96, 246, 0.48)",
                haloColor: "rgba(96, 160, 255, 0.18)",
                position: new THREE.Vector3(-420, 150, -1280),
                scale: new THREE.Vector2(540, 460),
            },
            {
                color: "rgba(174, 116, 255, 0.42)",
                haloColor: "rgba(108, 182, 255, 0.14)",
                position: new THREE.Vector3(60, 280, -1760),
                scale: new THREE.Vector2(760, 640),
            },
            {
                color: "rgba(106, 170, 255, 0.34)",
                haloColor: "rgba(182, 118, 255, 0.16)",
                position: new THREE.Vector3(420, 190, -1360),
                scale: new THREE.Vector2(520, 440),
            },
            {
                color: "rgba(162, 96, 255, 0.36)",
                haloColor: "rgba(106, 178, 255, 0.16)",
                position: new THREE.Vector3(920, 130, -1260),
                scale: new THREE.Vector2(560, 460),
            },
            {
                color: "rgba(182, 116, 255, 0.4)",
                haloColor: "rgba(118, 196, 255, 0.18)",
                position: new THREE.Vector3(-60, 100, -1080),
                scale: new THREE.Vector2(420, 360),
            },
            {
                color: "rgba(166, 96, 255, 0.34)",
                haloColor: "rgba(104, 170, 255, 0.16)",
                position: new THREE.Vector3(-740, 110, -980),
                scale: new THREE.Vector2(400, 340),
            },
            {
                color: "rgba(124, 176, 255, 0.3)",
                haloColor: "rgba(182, 118, 255, 0.14)",
                position: new THREE.Vector3(700, 260, -1680),
                scale: new THREE.Vector2(520, 420),
            },
        ];

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
                    30 + Math.random() * 26,
                    16 + Math.random() * 14,
                    8 + Math.random() * 10,
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

        drawNebulaPatch(330, 330, 160, haloColor, 0.56, -0.34);
        drawNebulaPatch(560, 360, 190, color, 0.64, 0.2);
        drawNebulaPatch(455, 580, 210, haloColor, 0.42, 0.58);
        drawNebulaPatch(700, 600, 145, color, 0.42, -0.18);
        drawNebulaPatch(265, 640, 125, "rgba(116, 188, 255, 0.42)", 0.34, 0.14);

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
            sparkleGradient.addColorStop(0, "rgba(212, 236, 255, 0.5)");
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
            depthWrite: false,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
        });
        let sprite = new THREE.Sprite(material);
        sprite.renderOrder = -20;
        return sprite;
    }

    render(speederIndex: number, debug?: boolean) {
        // set up camera
        this.camera = new THREE.PerspectiveCamera(80, 
            this.width / this.height, 0.1, 3200);

        // set up renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById("game") as HTMLCanvasElement,
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
        let offset = 4;

        for (let i = 0; i < 3; i++) {
            if (i == speederIndex || this.CPUs.length == 3)
                continue;

            let startPoint = new THREE.Vector3(this.track.startPoint.x, 
                this.track.startPoint.y, this.track.startPoint.z + offset);

            this.CPUs.push(new CPU(this, speeders[i], startPoint,
                this.track.startDirection.clone(), 
                this.track.startRotation.clone(), firstCheckpoint, debug));

            offset *= -1;
        }

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

    setupControls(isTouchDevice?: boolean) {
        // set up keyboard controls
        this.keysPressed = {};

        window.addEventListener("keydown", (e: KeyboardEvent) => {
            this.keysPressed[e.key.toLowerCase()] = true;
        });

        window.addEventListener("keyup", (e: KeyboardEvent) => {
            this.keysPressed[e.key.toLowerCase()] = false;
        });

        window.addEventListener("wheel", (e: WheelEvent) => {
            this.keysPressed[`arrow${e.deltaY < 0 ? "up" : "down"}`] = true;
        });

        // hide joystick if not touch device
        if (!isTouchDevice) {
            document.getElementById("joystick").style.display = "none";
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
        let controlKeys = ["w", "a", "s", "d", "shift", "arrowup", "arrowdown"];
        
        let knob = document.getElementById("knob");
        knob.addEventListener("touchmove", (e: TouchEvent) => {
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
            
            document.getElementById("knob").style.top = top;
            document.getElementById("knob").style.left = left;
        }, false);

        // reset knob position
        knob.addEventListener("touchend", () => {
            for (let key of controlKeys)
                this.keysPressed[key] = false;

            document.getElementById("knob").style.top = "5vw";
            document.getElementById("knob").style.left = "5vw";
        }, false);
        

        // set up touch thrust gauge
        let gauge = document.getElementById("gauge");
        let gaugeFill = document.getElementById("gauge-fill");
        gauge.addEventListener("touchmove", (e: TouchEvent) => {
            e.preventDefault();

            let gaugeTouch = e.targetTouches[0];

            let currentHeight = 50 * vh + parseInt(gaugeFill.style.top) * vh;
            let direction = gaugeTouch.clientY <= currentHeight ? "up" : "down";
            this.keysPressed[`arrow${direction}`] = true;
        });
    }

    handleCountdown() {
        let countdown = document.getElementById("countdown");
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
            document.getElementById("curtain").classList.add("long-fade-to-black");
            
            let rank = 1;
            for (let cpu of this.CPUs)
            if (cpu.laps > 2)
            rank++;
            
            ["dashboard", "joystick", "gauge"].forEach((id: string) => {
                document.getElementById(id).style.display = "none";
            });
            
            setTimeout(() => {            
                this.player.sounds["complete-race"]?.play();
                this.player.engineSound.stop();
                
                document.getElementById("finish-screen").style.display = "flex";

                let suffixes = ["st", "nd", "rd"]
                document.getElementById("finish-rank").innerHTML = rank.toString();
                document.getElementById("finish-rank-suffix").innerHTML = suffixes[rank - 1];

                document.getElementById("finish-time").innerHTML = 
                    `Time: ${this.track.getTimeString()}`;
            }, 3200);

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

        // race ends after 2 laps
        if (this.player.laps > 2)
            this.handleRaceFinish();
        else
            this.track.update(dt);
        
        // update vehicles
        this.player.update(this.track, dt, this.keysPressed);

        for (let cpu of this.CPUs)
            cpu.update(this.track, dt);
    }
}
