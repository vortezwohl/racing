import * as THREE from "three";
import Track from "./Track";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Controls, Checkpoint, VehicleData } from "../utils/interfaces";
import { raceCamera } from "../utils/raceConfig";
import Vehicle from "./Vehicle";

export default class Player extends Vehicle {
    camera: THREE.PerspectiveCamera;
    manualCamera: boolean = false;
    orbitals?: OrbitControls;
    audioEnabled: boolean;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera,
        vehicleData: VehicleData, position: THREE.Vector3, direction: THREE.Vector3,
        rotation: THREE.Euler, checkpoint: Checkpoint,
        debug?: boolean, orbitals?: OrbitControls, audioEnabled: boolean = true) {

        super(scene, vehicleData, position, direction, 
            rotation, checkpoint, debug);
        this.camera = camera;
        this.orbitals = orbitals;
        this.audioEnabled = audioEnabled;

        this.sounds = {};
        if (this.audioEnabled) {
            this.sounds = {
                "complete-lap": new Audio("./assets/sounds/complete-lap.wav"),
                "complete-race": new Audio("./assets/sounds/complete-race.wav"),
                "out-of-bounds": new Audio("./assets/sounds/out-of-bounds.wav")
            };
            this.sounds["complete-lap"].volume = 0.12;
            this.sounds["complete-race"].volume = 0.12;
            this.sounds["out-of-bounds"].volume = 0.12;
        }

        this.configureEngineAudio({
            baseGain: 0.08,
            baseWaveform: "sawtooth",
            harmonicGainAmount: 0.08,
            isLocalSource: true,
        });
        if (this.audioEnabled)
            this.initializeEngineAudio();
    }

    handleCameraMovement(forward: boolean, follow: boolean = true) {
        if (this.orbitals)
            this.orbitals.enabled = this.manualCamera;

        if (this.manualCamera)
            return;

        let targetPosition = this.position.clone();

        // the camera will only follow the vehicle if it is in bounds
        if (follow) {
            let cameraPosition = this.position.clone();
            let facingDirection = new THREE.Vector3(this.direction.x, 
                0, this.direction.z).normalize();

            if (!forward)
                facingDirection.negate();

            // set the camera to look further in front of the vehicle 
            targetPosition.add(facingDirection);

            // set camera behind and above vehicle
            let positionOffset = facingDirection.clone().multiplyScalar(3);
            cameraPosition.sub(positionOffset);
            cameraPosition.y += 1.5;
            this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        }

        this.camera.lookAt(targetPosition);
    }

    updateCameraFov() {
        let speedRatio = THREE.MathUtils.clamp(
            this.velocity.length() / this.getEffectiveMaxSpeed(),
            0,
            1,
        );
        let targetFov = THREE.MathUtils.lerp(
            raceCamera.lowSpeedFov,
            raceCamera.highSpeedFov,
            speedRatio,
        );
        targetFov += this.draftCharge * raceCamera.draftFovBonus;
        targetFov = Math.min(targetFov, raceCamera.maxFov);

        this.camera.fov = THREE.MathUtils.lerp(
            this.camera.fov,
            targetFov,
            raceCamera.smoothing,
        );
        this.camera.updateProjectionMatrix();
    }
    
    handleTrackCollision(track: Track) {
        super.handleTrackCollision(track, true);
    }

    handleInput(keysPressed: Controls, dt: number) {
        let throttle = keysPressed["w"] ? 1 : 0;
        let brake = keysPressed["s"] || keysPressed["shift"] ? 1 : 0;
        let steer = 0;
        if (keysPressed["d"])
            steer += 1;
            
        if (keysPressed["a"])
            steer -= 1;

        this.applyControlInput({ brake, steer, throttle }, dt);

        // reset roll
        if (!(keysPressed["a"] || keysPressed["d"]))
            this.rotation.z *= 0.8;            
    }

    handleOutOfBounds(track: Track) {
        if (this.laps > 2)
            return;

        super.handleOutOfBounds(track, true);
    }

    update(track: Track, dt?: number, keysPressed?: Controls) {
        if (!this.model || !this.hitbox || !track || !dt)
            return;
        
        this.handleInput(keysPressed, dt);
        super.update(track, dt);
        this.handleCameraMovement(!keysPressed["r"], this.isAlive);
        this.updateCameraFov();
    }
}
