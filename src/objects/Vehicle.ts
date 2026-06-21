import * as THREE from "three";
import Track from "./Track";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DynamicDebugVector } from "../utils/debug";
import { Checkpoint, VehicleData } from "../utils/interfaces";
import { racePerformance } from "../utils/raceConfig";

type VehicleControlInput = {
    accelerationScale?: number;
    brake?: number;
    brakeScale?: number;
    steer?: number;
    steerScale?: number;
    throttle?: number;
};

type EngineWaveform = "sine" | "triangle" | "sawtooth" | "pulse";

type EngineAudioListenerState = {
    forward: THREE.Vector3;
    position: THREE.Vector3;
    right: THREE.Vector3;
};

export default class Vehicle {
    static activeEngineAudioUsers: number = 0;
    static engineWaveformUsage: Record<EngineWaveform, number> = {
        pulse: 0,
        sawtooth: 0,
        sine: 0,
        triangle: 0,
    };
    static sharedEngineAudioContext?: AudioContext;
    static sharedPulseWave?: PeriodicWave;
    static sharedPulseWaveContext?: AudioContext;
    static engineAudioEnabled: boolean = true;

    acceleration: number;
    deceleration: number;
    friction: number;
    turnRate: number;
    maxRoll: number;
    defaultGravity: THREE.Vector3;
    
    position: THREE.Vector3;
    direction: THREE.Vector3;
    rotation: THREE.Euler;
    gravity: THREE.Vector3;
    velocity: THREE.Vector3;
    thrust: number;
    collisionSlowUntil: number;
    draftCharge: number;
    maxSpeed: number;
    lastSteerSign: number;
    steerHoldMs: number;

    width: number;
    height: number;
    checkpointHitboxScale: number;
    hitboxScale: number;
    length: number;

    checkpointHitboxGeometry: THREE.BoxGeometry;
    model: THREE.Group;
    hitbox: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
    outOfBoundsRecoverTimeout?: number;
    outOfBoundsScrollTimeout?: number;

    isAlive: boolean;

    checkpoint: Checkpoint;
    lastCheckpointIndex: number;
    laps: number;

    sounds: { [key: string]: HTMLAudioElement };

    directionDebug?: DynamicDebugVector;
    normalDebug?: DynamicDebugVector;
    upDebug?: DynamicDebugVector;

    engineAudioContext?: AudioContext;
    engineAudioInitialized: boolean;
    engineBaseGain: number;
    engineBaseWaveform: EngineWaveform;
    engineCutoffExponent: number;
    engineDistanceReference: number;
    engineFilter?: BiquadFilterNode;
    engineFilterQ: number;
    engineFilterSmoothing: number;
    engineFrequencySmoothing: number;
    engineFrontCutoffScale: number;
    engineFrontGainScale: number;
    engineHarmonicFrequencyRatio: number;
    engineHarmonicGain?: GainNode;
    engineHarmonicGainAmount: number;
    engineHarmonicSound?: OscillatorNode;
    engineIdleFrequency: number;
    engineIdleGainScale: number;
    engineIsLocalSource: boolean;
    engineMaxCutoffFrequency: number;
    engineMaxFrequency: number;
    engineMinCutoffFrequency: number;
    engineOutputGain?: GainNode;
    enginePanScale: number;
    engineRearCutoffScale: number;
    engineRearGainScale: number;
    engineReferenceAcceleration: number;
    engineSound?: OscillatorNode;
    engineSpeedExponent: number;
    engineStereoPanner?: StereoPannerNode;
    engineWaveformUsageReserved: boolean;
    previousEngineSpeed: number;

    constructor(scene: THREE.Scene, vehicleData: VehicleData, 
        position: THREE.Vector3, direction: THREE.Vector3,
        rotation: THREE.Euler, checkpoint: Checkpoint, debug?: boolean) {

        this.acceleration = racePerformance.acceleration;
        this.deceleration = racePerformance.deceleration;
        this.friction = racePerformance.friction;
        this.turnRate = racePerformance.turnRate;
        this.maxRoll = racePerformance.maxRoll;
        this.defaultGravity = racePerformance.defaultGravity.clone();

        this.position = position;
        this.direction = direction;
        this.rotation = rotation;
        this.gravity = this.defaultGravity;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.thrust = 1;
        this.collisionSlowUntil = 0;
        this.draftCharge = 0;
        this.maxSpeed = racePerformance.maxSpeed;
        this.lastSteerSign = 0;
        this.steerHoldMs = 0;

        this.width = vehicleData.width;
        this.height = vehicleData.height;
        this.checkpointHitboxScale = 1.0;
        this.hitboxScale = 0.5;
        this.length = vehicleData.length;
        this.checkpointHitboxGeometry = new THREE.BoxGeometry(
            this.width * this.checkpointHitboxScale,
            this.height * this.checkpointHitboxScale,
            this.length * this.checkpointHitboxScale,
        );

        this.render(scene, vehicleData.modelPath, debug);

        this.isAlive = true;

        this.checkpoint = checkpoint;
        this.lastCheckpointIndex = 1;
        this.laps = 1;

        this.sounds = {};
        this.engineAudioInitialized = false;
        this.engineBaseGain = 0.08;
        this.engineBaseWaveform = "sine";
        this.engineCutoffExponent = 1.1;
        this.engineDistanceReference = 28;
        this.engineFilterQ = 1.9;
        this.engineFilterSmoothing = 0.05;
        this.engineFrequencySmoothing = 0.045;
        this.engineFrontCutoffScale = 1.04;
        this.engineFrontGainScale = 1;
        this.engineHarmonicFrequencyRatio = 2;
        this.engineHarmonicGainAmount = 0.02;
        this.engineIdleFrequency = 74;
        this.engineIdleGainScale = 0.55;
        this.engineIsLocalSource = false;
        this.engineMaxCutoffFrequency = 2200;
        this.engineMaxFrequency = 285;
        this.engineMinCutoffFrequency = 320;
        this.enginePanScale = 0.85;
        this.engineRearCutoffScale = 0.68;
        this.engineRearGainScale = 0.72;
        this.engineReferenceAcceleration = Math.max(this.acceleration * 0.72, 0.0001);
        this.engineSpeedExponent = 1.75;
        this.engineWaveformUsageReserved = false;
        this.previousEngineSpeed = 0;
    }

    static getSharedEngineAudioContext(): AudioContext {
        if (!Vehicle.engineAudioEnabled)
            throw new Error("Engine audio is disabled.");

        if (!Vehicle.sharedEngineAudioContext ||
            Vehicle.sharedEngineAudioContext.state === "closed") {
            Vehicle.sharedEngineAudioContext = new AudioContext();
            Vehicle.sharedPulseWave = undefined;
            Vehicle.sharedPulseWaveContext = undefined;
        }

        return Vehicle.sharedEngineAudioContext;
    }

    static getSharedPulseWave(context: AudioContext): PeriodicWave {
        if (!Vehicle.sharedPulseWave || Vehicle.sharedPulseWaveContext !== context) {
            let harmonicCount = 32;
            let real = new Float32Array(harmonicCount + 1);
            let imag = new Float32Array(harmonicCount + 1);
            let pulseWidth = 0.28;

            for (let harmonic = 1; harmonic <= harmonicCount; harmonic++) {
                let damping = Math.exp(-harmonic / 7);
                imag[harmonic] = (2 / (harmonic * Math.PI)) *
                    Math.sin(harmonic * Math.PI * pulseWidth) * damping;
            }

            Vehicle.sharedPulseWave = context.createPeriodicWave(real, imag);
            Vehicle.sharedPulseWaveContext = context;
        }

        return Vehicle.sharedPulseWave;
    }

    static chooseDistributedEngineWaveform(
        waveforms: ReadonlyArray<EngineWaveform>,
    ): EngineWaveform {
        let usageEntries = waveforms.map((waveform) => ({
            count: Vehicle.engineWaveformUsage[waveform] || 0,
            waveform,
        }));
        let minimumCount = Math.min(...usageEntries.map((entry) => entry.count));
        let candidates = usageEntries
            .filter((entry) => entry.count === minimumCount)
            .map((entry) => entry.waveform);

        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    configureEngineAudio(options: {
        baseGain?: number;
        baseWaveform?: EngineWaveform;
        harmonicGainAmount?: number;
        isLocalSource?: boolean;
    } = {}) {
        let previousWaveform = this.engineBaseWaveform;
        this.engineBaseGain = options.baseGain ?? this.engineBaseGain;
        this.engineBaseWaveform = options.baseWaveform ?? this.engineBaseWaveform;
        this.engineHarmonicGainAmount =
            options.harmonicGainAmount ?? this.engineHarmonicGainAmount;
        this.engineIsLocalSource = options.isLocalSource ?? this.engineIsLocalSource;

        if (this.engineWaveformUsageReserved &&
            previousWaveform !== this.engineBaseWaveform) {
            Vehicle.engineWaveformUsage[previousWaveform] = Math.max(
                Vehicle.engineWaveformUsage[previousWaveform] - 1,
                0,
            );
            Vehicle.engineWaveformUsage[this.engineBaseWaveform] += 1;
        }
    }

    reserveEngineWaveformUsage() {
        if (this.engineWaveformUsageReserved)
            return;

        Vehicle.engineWaveformUsage[this.engineBaseWaveform] += 1;
        this.engineWaveformUsageReserved = true;
    }

    releaseEngineWaveformUsage() {
        if (!this.engineWaveformUsageReserved)
            return;

        Vehicle.engineWaveformUsage[this.engineBaseWaveform] = Math.max(
            Vehicle.engineWaveformUsage[this.engineBaseWaveform] - 1,
            0,
        );
        this.engineWaveformUsageReserved = false;
    }

    createEngineOscillator(
        context: AudioContext,
        waveform: EngineWaveform,
    ): OscillatorNode {
        let oscillator = context.createOscillator();
        if (waveform === "pulse")
            oscillator.setPeriodicWave(Vehicle.getSharedPulseWave(context));
        else
            oscillator.type = waveform;

        return oscillator;
    }

    initializeEngineAudio() {
        if (this.engineAudioInitialized || !Vehicle.engineAudioEnabled)
            return;

        this.reserveEngineWaveformUsage();
        this.engineAudioContext = Vehicle.getSharedEngineAudioContext();
        Vehicle.activeEngineAudioUsers++;

        // 所有载具共用控制模型，但保留每车独立的波形、总音量和声像节点
        this.engineSound = this.createEngineOscillator(
            this.engineAudioContext,
            this.engineBaseWaveform,
        );
        this.engineHarmonicSound = this.engineAudioContext.createOscillator();
        this.engineHarmonicGain = this.engineAudioContext.createGain();
        this.engineFilter = this.engineAudioContext.createBiquadFilter();
        this.engineOutputGain = this.engineAudioContext.createGain();
        this.engineStereoPanner = this.engineAudioContext.createStereoPanner();
        this.engineHarmonicSound.type = "sine";
        this.engineHarmonicGain.gain.value = this.engineHarmonicGainAmount;
        this.engineFilter.type = "lowpass";
        this.engineFilter.frequency.value = this.engineMinCutoffFrequency;
        this.engineFilter.Q.value = this.engineFilterQ;
        this.engineOutputGain.gain.value = this.engineBaseGain;
        this.engineStereoPanner.pan.value = 0;

        this.engineSound.connect(this.engineFilter);
        this.engineHarmonicSound.connect(this.engineHarmonicGain);
        this.engineHarmonicGain.connect(this.engineFilter);
        this.engineFilter.connect(this.engineOutputGain);
        this.engineOutputGain.connect(this.engineStereoPanner);
        this.engineStereoPanner.connect(this.engineAudioContext.destination);

        this.engineSound.frequency.value = this.engineIdleFrequency;
        this.engineHarmonicSound.frequency.value =
            this.engineIdleFrequency * this.engineHarmonicFrequencyRatio;
        this.engineSound.start();
        this.engineHarmonicSound.start();
        this.engineAudioInitialized = true;

        if (this.engineAudioContext.state === "suspended")
            void this.engineAudioContext.resume();
    }

    createEngineAudioListenerState(): EngineAudioListenerState {
        let forward = new THREE.Vector3(this.direction.x, 0, this.direction.z);
        if (forward.lengthSq() < 0.0001)
            forward.set(0, 0, 1);
        else
            forward.normalize();

        let right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        if (right.lengthSq() < 0.0001)
            right.set(1, 0, 0);
        else
            right.normalize();

        return {
            forward,
            position: this.position.clone(),
            right,
        };
    }

    getEngineSpatialMix(listenerState?: EngineAudioListenerState) {
        if (!listenerState || this.engineIsLocalSource) {
            return {
                cutoffScale: 1,
                gainScale: 1,
                pan: 0,
            };
        }

        let toVehicle = this.position.clone().sub(listenerState.position);
        let distance = toVehicle.length();
        let distanceGain = 1 / (1 + Math.pow(distance / this.engineDistanceReference, 1.1));

        let planarDirection = new THREE.Vector3(toVehicle.x, 0, toVehicle.z);
        if (planarDirection.lengthSq() < 0.0001) {
            return {
                cutoffScale: 1,
                gainScale: distanceGain,
                pan: 0,
            };
        }

        planarDirection.normalize();
        let frontFactor = THREE.MathUtils.clamp(
            listenerState.forward.dot(planarDirection),
            -1,
            1,
        );
        let frontMix = (frontFactor + 1) * 0.5;
        let gainScale = distanceGain * THREE.MathUtils.lerp(
            this.engineRearGainScale,
            this.engineFrontGainScale,
            frontMix,
        );
        let cutoffScale = THREE.MathUtils.lerp(
            this.engineRearCutoffScale,
            this.engineFrontCutoffScale,
            frontMix,
        );
        let pan = THREE.MathUtils.clamp(
            listenerState.right.dot(planarDirection) * this.enginePanScale,
            -1,
            1,
        );

        return {
            cutoffScale,
            gainScale,
            pan,
        };
    }

    updateEngineAudio(dt: number, listenerState?: EngineAudioListenerState) {
        if (!this.engineAudioInitialized || !this.engineAudioContext ||
            !this.engineSound || !this.engineHarmonicSound || !this.engineFilter ||
            !this.engineOutputGain || !this.engineStereoPanner)
            return;

        let currentSpeed = this.velocity.length();
        let maxSpeed = Math.max(this.getEffectiveMaxSpeed(), 0.0001);
        let speedRatio = THREE.MathUtils.clamp(currentSpeed / maxSpeed, 0, 1);
        let speedCurve = Math.pow(speedRatio, this.engineSpeedExponent);
        let idleGainBlend = THREE.MathUtils.lerp(
            this.engineIdleGainScale,
            1,
            Math.pow(speedRatio, 0.65),
        );
        let targetFrequency = THREE.MathUtils.lerp(
            this.engineIdleFrequency,
            this.engineMaxFrequency,
            speedCurve,
        );

        let positiveAcceleration = Math.max(currentSpeed - this.previousEngineSpeed, 0) /
            Math.max(dt, 0.0001);
        let accelerationRatio = THREE.MathUtils.clamp(
            positiveAcceleration / this.engineReferenceAcceleration,
            0,
            1,
        );
        let cutoffCurve = Math.pow(accelerationRatio, this.engineCutoffExponent);
        let spatialMix = this.getEngineSpatialMix(listenerState);
        let targetCutoff = THREE.MathUtils.lerp(
            this.engineMinCutoffFrequency,
            this.engineMaxCutoffFrequency,
            cutoffCurve,
        ) * spatialMix.cutoffScale;

        let now = this.engineAudioContext.currentTime;
        this.engineSound.frequency.setTargetAtTime(
            targetFrequency,
            now,
            this.engineFrequencySmoothing,
        );
        this.engineHarmonicSound.frequency.setTargetAtTime(
            targetFrequency * this.engineHarmonicFrequencyRatio,
            now,
            this.engineFrequencySmoothing,
        );
        this.engineFilter.frequency.setTargetAtTime(
            targetCutoff,
            now,
            this.engineFilterSmoothing,
        );
        this.engineFilter.Q.setTargetAtTime(
            this.engineFilterQ,
            now,
            this.engineFilterSmoothing,
        );
        this.engineOutputGain.gain.setTargetAtTime(
            this.engineBaseGain * spatialMix.gainScale * idleGainBlend,
            now,
            this.engineFilterSmoothing,
        );
        this.engineStereoPanner.pan.setTargetAtTime(
            spatialMix.pan,
            now,
            this.engineFilterSmoothing,
        );

        this.previousEngineSpeed = currentSpeed;
    }

    disposeAudio() {
        if (!this.engineAudioInitialized)
            return;

        try {
            this.engineSound?.stop();
            this.engineHarmonicSound?.stop();
        } catch (_error) {
            // repeated disposal may stop oscillators more than once
        }

        try {
            this.engineSound?.disconnect();
            this.engineHarmonicSound?.disconnect();
            this.engineHarmonicGain?.disconnect();
            this.engineFilter?.disconnect();
            this.engineOutputGain?.disconnect();
            this.engineStereoPanner?.disconnect();
        } catch (_error) {
            // repeated disposal may reach already disconnected nodes
        }

        this.engineAudioInitialized = false;
        this.engineSound = undefined;
        this.engineHarmonicSound = undefined;
        this.engineHarmonicGain = undefined;
        this.engineFilter = undefined;
        this.engineOutputGain = undefined;
        this.engineStereoPanner = undefined;
        this.engineAudioContext = undefined;
        this.releaseEngineWaveformUsage();

        Vehicle.activeEngineAudioUsers = Math.max(Vehicle.activeEngineAudioUsers - 1, 0);
        if (Vehicle.activeEngineAudioUsers === 0 && Vehicle.sharedEngineAudioContext &&
            Vehicle.sharedEngineAudioContext.state !== "closed") {
            void Vehicle.sharedEngineAudioContext.close();
            Vehicle.sharedEngineAudioContext = undefined;
            Vehicle.sharedPulseWave = undefined;
            Vehicle.sharedPulseWaveContext = undefined;
        }
    }

    loadGLTF(scene: THREE.Scene, data: GLTF) {
        this.model = data.scene;
        this.model.position.set(this.position.x, this.position.y, this.position.z);
        this.stripInjectedSprites(this.model);

        // check for and enable transparent materials
        for (let mesh of this.model.children) {
            // the model itself is a THREE.Group
            if (mesh.name == "body") {

                // the model contains an array of THREE.Mesh,
                // but the compiler thinks it's an array of
                // THREE.Object3d<THREE.Event>, 
                // so the type errors have been silenced
                for (let material of mesh.children) {
                    // @ts-ignore
                    if (material.material.name == "transparent") {
                        // @ts-ignore
                        material.material.transparent = true;
                        // @ts-ignore
                        material.material.opacity = 0.2;
                    }
                }
            }
        }

        scene.add(this.model);
    }

    stripInjectedSprites(root: THREE.Object3D) {
        let staleSprites: Array<THREE.Object3D> = [];
        root.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Sprite)
                staleSprites.push(child);
        });

        for (let sprite of staleSprites)
            sprite.parent?.remove(sprite);
    }

    async render(scene: THREE.Scene, modelPath: string, debug?: boolean) {
        // async render model
        let loader = new GLTFLoader();
        await loader.loadAsync(modelPath)
            .then(data => this.loadGLTF(scene, data));
        this.model.setRotationFromEuler(this.rotation.clone());

        // vehicle hitbox
        let geometry = new THREE.BoxGeometry(
            this.width * this.hitboxScale,
            this.height * this.hitboxScale,
            this.length * this.hitboxScale,
        );
        let material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            depthWrite: false,
            wireframe: true,
            transparent: !debug,
            opacity: 0
        });

        this.hitbox = new THREE.Mesh(geometry, material);
        this.hitbox.position.set(this.position.x, this.position.y, this.position.z);
        this.hitbox.setRotationFromEuler(this.rotation.clone());
        scene.add(this.hitbox);

        if (debug) {
            this.directionDebug = new DynamicDebugVector(scene, this.direction, this.position);
            this.normalDebug = new DynamicDebugVector(scene, this.direction, this.position);
            this.upDebug = new DynamicDebugVector(scene, this.direction, this.position, 3, 0x00ff00);
        }
    }

    handleTrackCollision(track: Track, player?: boolean) {
        let currentPosition = this.position.clone();

        let handledCollision = false;
        let handledCheckpoint = false;

        // use raycasting to check for collison with track
        for (let i = 0; i < this.hitbox.geometry.attributes.position.count; i++) {
            let localVertex = new THREE.Vector3(
                this.hitbox.geometry.attributes.position.array[i * 3],
                this.hitbox.geometry.attributes.position.array[i * 3 + 1],
                this.hitbox.geometry.attributes.position.array[i * 3 + 2]
            );

            let globalVertex = localVertex.applyMatrix4(this.hitbox.matrix);
            let directionVector = globalVertex.sub(this.hitbox.position);

            let ray = new THREE.Raycaster(currentPosition, directionVector.clone().normalize());

            let trackMeshes = [track.body];
            for (let platform of track.movingPlatforms)
                trackMeshes.push(platform.mesh);

            let collisionResults = ray.intersectObjects(trackMeshes);
            if (collisionResults.length > 0 &&
                collisionResults[0].distance < directionVector.length()) {

                // stop model from clipping through
                this.gravity = new THREE.Vector3(0, 0, 0);

                let collision = collisionResults[0].point;
                if (this.position.y < collision.y)
                    this.position.y = collision.y;
                    
                let surfaceNormal = collisionResults[0].face.normal.clone();
                if (this.normalDebug)
                    this.normalDebug.update(surfaceNormal.clone(), this.position.clone());

                // ensure surfaceNormal always points upwards
                // to prevent flipping
                if (surfaceNormal.y < 0) 
                    surfaceNormal.negate();

                // get component of surface normal along the vehicle's direction
                let planeNormal = this.hitbox.up.clone().cross(this.direction.clone());
                let normalAlongDirection = surfaceNormal.clone().projectOnPlane(planeNormal);
                let angle = normalAlongDirection.angleTo(this.hitbox.up)

                // set the direction to be along the track
                this.direction = normalAlongDirection.cross(planeNormal)
                    .negate().normalize();

                // rotate in other direction if vehicle going up slope
                if (this.direction.y >= 0)
                    angle *= -1;

                // pitch
                this.rotation.x = angle;

                handledCollision = true;
            }

            // use raycasting to handle collision with checkpoint planes too
            if (!handledCheckpoint) {
                let checkpointLocalVertex = new THREE.Vector3(
                    this.checkpointHitboxGeometry.attributes.position.array[i * 3],
                    this.checkpointHitboxGeometry.attributes.position.array[i * 3 + 1],
                    this.checkpointHitboxGeometry.attributes.position.array[i * 3 + 2],
                );
                let checkpointGlobalVertex = checkpointLocalVertex.applyMatrix4(this.hitbox.matrix);
                let checkpointDirectionVector = checkpointGlobalVertex.sub(this.hitbox.position);
                let checkpointRay = new THREE.Raycaster(
                    currentPosition,
                    checkpointDirectionVector.clone().normalize(),
                );

                for (let checkpoint of track.checkpoints) {
                    let checkpointResult = checkpointRay.intersectObject(checkpoint.mesh);
                    let nextCheckpointIndex =
                        this.lastCheckpointIndex % track.checkpoints.length + 1;

                    if (checkpointResult.length > 0 &&
                        checkpointResult[0].distance < checkpointDirectionVector.length()) {

                        // 只接受当前顺序中的下一个 checkpoint，
                        // 避免绕场时被其他 checkpoint 提前截获导致圈数错乱。
                        if (checkpoint.index == nextCheckpointIndex) {
                            if (checkpoint.index == 1) {
                                this.laps++;
                                document.body.dataset.playerLaps = this.laps.toString();

                                if (player)
                                    this.sounds["complete-lap"]?.play();

                                let onVehicleLapAdvance = track.body.parent?.userData.onVehicleLapAdvance;
                                if (typeof onVehicleLapAdvance === "function")
                                    onVehicleLapAdvance(this, this.laps);
                            }
                            
                            this.lastCheckpointIndex = checkpoint.index;
                            this.checkpoint = checkpoint;
                            document.body.dataset.lastCheckpointIndex = this.lastCheckpointIndex.toString();
                            console.info("[checkpoint] passed", {
                                checkpointIndex: checkpoint.index,
                                laps: this.laps,
                            });
                            handledCheckpoint = true;
                            break;
                        }
                    }
                }
            }

            if (handledCollision && handledCheckpoint)
                return;
        }

        // if the vehicle is airborne, rotate it back to be
        // perpendicular to the y axis
        if (!handledCollision)
            this.rotation.x *= 0.99;
    }

    turn(angle: number) {
        // yaw
        this.rotation.y += angle;
        
        // roll
        let roll = this.rotation.z - angle;
        this.rotation.z = angle < 0 ? Math.min(roll, this.maxRoll) :
            Math.max(roll, -this.maxRoll);

        this.direction.applyAxisAngle(this.hitbox.up, angle);
    }

    updateSteeringHold(steer: number, dt: number): number {
        let steerSign = Math.sign(steer);
        if (steerSign == 0) {
            this.steerHoldMs = 0;
            this.lastSteerSign = 0;
            return 0;
        }

        if (steerSign != this.lastSteerSign)
            this.steerHoldMs = 0;
        else
            this.steerHoldMs += dt;

        this.lastSteerSign = steerSign;
        return this.steerHoldMs;
    }

    getSteeringScale(steer: number, dt: number): number {
        let steerHoldMs = this.updateSteeringHold(steer, dt);
        if (steer == 0)
            return 0;

        let holdRatio = THREE.MathUtils.clamp(
            steerHoldMs / racePerformance.turnSustainMs,
            0,
            1,
        );
        let holdScale = THREE.MathUtils.lerp(
            racePerformance.turnInitialBoost,
            racePerformance.turnSustainScale,
            Math.pow(holdRatio, 0.85),
        );
        let speedScale = 1 - racePerformance.highSpeedTurnDamping *
            Math.pow(this.getSpeedRatio(), 1.2);
        return holdScale * speedScale;
    }

    getDraftAccelerationScale(): number {
        return 1 + this.draftCharge * racePerformance.draftAccelerationBonus;
    }

    getDraftMaxSpeedScale(): number {
        return 1 + this.draftCharge * racePerformance.draftMaxSpeedBonus;
    }

    getCollisionSlowScale(now: number = performance.now()): number {
        return now < this.collisionSlowUntil ? racePerformance.collisionSlowScale : 1;
    }

    getEffectiveAcceleration(now: number = performance.now()): number {
        return this.acceleration * this.getDraftAccelerationScale() *
            this.getCollisionSlowScale(now);
    }

    getSpeedRatio(): number {
        let maxSpeed = Math.max(this.getEffectiveMaxSpeed(), 0.0001);
        return THREE.MathUtils.clamp(this.velocity.length() / maxSpeed, 0, 1);
    }

    getAccelerationCurveScale(): number {
        let curveProgress = Math.pow(
            1 - this.getSpeedRatio(),
            racePerformance.accelerationCurveExponent,
        );
        return THREE.MathUtils.lerp(
            racePerformance.minAccelerationScale,
            racePerformance.lowSpeedAccelerationScale,
            curveProgress,
        );
    }

    getCurvedAcceleration(
        inputScale: number = 1,
        now: number = performance.now(),
    ): number {
        return this.getEffectiveAcceleration(now) *
            this.getAccelerationCurveScale() *
            inputScale;
    }

    getEffectiveMaxSpeed(): number {
        return this.maxSpeed * this.getDraftMaxSpeedScale();
    }

    applyControlInput(input: VehicleControlInput, dt: number) {
        let throttle = THREE.MathUtils.clamp(input.throttle || 0, 0, 1);
        let brake = THREE.MathUtils.clamp(input.brake || 0, 0, 1);
        let brakeScale = input.brakeScale || 1;
        let steer = THREE.MathUtils.clamp(input.steer || 0, -1, 1);
        let steerScale = input.steerScale || 1;
        let accelerationScale = input.accelerationScale || 1;

        if (throttle > 0) {
            this.velocity.add(this.direction.clone().multiplyScalar(
                this.getCurvedAcceleration(accelerationScale) * this.thrust * throttle * dt,
            ));
        }

        if (brake > 0) {
            this.velocity.sub(this.direction.clone().multiplyScalar(
                this.deceleration * this.thrust * brake * brakeScale * dt,
            ));
        }

        if (steer != 0) {
            let steeringScale = this.getSteeringScale(steer, dt);
            this.turn(-steer * this.turnRate * steeringScale * steerScale * dt);
        } else {
            this.updateSteeringHold(0, dt);
        }
    }

    applySpeedLimit() {
        let maxSpeed = this.getEffectiveMaxSpeed();
        if (this.velocity.length() > maxSpeed)
            this.velocity.setLength(maxSpeed);
    }

    applyCollisionSlow(durationMs: number) {
        this.collisionSlowUntil = Math.max(
            this.collisionSlowUntil,
            performance.now() + durationMs,
        );
    }

    syncTransform() {
        this.model.position.set(this.position.x, this.position.y, this.position.z);
        this.hitbox.position.set(this.position.x, this.position.y, this.position.z);
        this.model.setRotationFromEuler(this.rotation.clone());
        this.hitbox.setRotationFromEuler(this.rotation.clone());
    }

    handleVehicleMovement() {
        // friction
        this.velocity.multiplyScalar(this.friction);

        // gravity
        this.velocity.add(this.gravity);
        this.applySpeedLimit();

        // position
        this.position.add(this.velocity);
        this.syncTransform();

        if (this.directionDebug)
            this.directionDebug.update(this.direction.clone(), this.position.clone());

        if (this.upDebug)
            this.upDebug.update(this.hitbox.up, this.position.clone());
    }

    handleOutOfBounds(track: Track, player?: boolean) {
        // reset vehicle to last checkpoint if it falls out of bounds        
        if (this.position.y < -30 || !this.isAlive) {            
            let raceUi = track.body.parent?.userData.raceUi;
            let curtain = raceUi?.curtain;
            if (player && curtain)
                curtain.classList.add("fade-to-black");

            if (this.isAlive) {
                this.isAlive = false;

                this.sounds["out-of-bounds"]?.play();

                this.outOfBoundsRecoverTimeout = window.setTimeout(() => {
                    this.resetToCheckpoint(this.checkpoint);
                    this.isAlive = true;

                    if (player && curtain) {
                        curtain.classList.remove("fade-to-black");
                        curtain.style.opacity = "1";
                        curtain.style.height = "100vh";
                        curtain.classList.add("scroll-up");
                    }
                    
                    this.outOfBoundsScrollTimeout = window.setTimeout(() => {
                        if (player && curtain) {
                            curtain.classList.remove("scroll-up");
                            curtain.style.opacity = "0";
                            curtain.style.height = "100vh";
                        }
                    }, 1000);
                }, 900);
            } 
        }
    }

    clearPendingTimeouts() {
        if (this.outOfBoundsRecoverTimeout) {
            window.clearTimeout(this.outOfBoundsRecoverTimeout);
            this.outOfBoundsRecoverTimeout = undefined;
        }

        if (this.outOfBoundsScrollTimeout) {
            window.clearTimeout(this.outOfBoundsScrollTimeout);
            this.outOfBoundsScrollTimeout = undefined;
        }
    }

    resetToCheckpoint(checkpoint: Checkpoint) {
        this.position = checkpoint.mesh.position.clone();
        this.direction = checkpoint.resetDirection.clone();
        this.rotation = checkpoint.resetRotation.clone();
        
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.thrust = 1;
        this.collisionSlowUntil = 0;
        this.draftCharge = 0;
        this.lastSteerSign = 0;
        this.steerHoldMs = 0;
        this.syncTransform();
    }

    update(track: Track,  dt?: number) {
        if (!this.model || !this.hitbox || !track || !dt)
            return;
    
        this.gravity = this.defaultGravity;
        this.handleTrackCollision(track);        
        this.handleVehicleMovement();
        this.handleOutOfBounds(track);
    }
}

export {
    EngineAudioListenerState,
    EngineWaveform,
    VehicleControlInput,
};
