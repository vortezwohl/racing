import * as THREE from "three";
import Track from "./Track";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Controls, Checkpoint, VehicleData } from "../utils/interfaces";
import Vehicle from "./Vehicle";

export default class Player extends Vehicle {
    camera: THREE.PerspectiveCamera;
    manualCamera: boolean = false;
    orbitals?: OrbitControls;

    engineSound: OscillatorNode;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera,
        vehicleData: VehicleData, position: THREE.Vector3, direction: THREE.Vector3,
        rotation: THREE.Euler, checkpoint: Checkpoint,
        debug?: boolean, orbitals?: OrbitControls) {

        super(scene, vehicleData, position, direction, 
            rotation, checkpoint, debug);
        this.camera = camera;
        this.orbitals = orbitals;

        this.sounds = {
            "complete-lap": new Audio("./assets/sounds/complete-lap.wav"),
            "complete-race": new Audio("./assets/sounds/complete-race.wav"),
            "out-of-bounds": new Audio("./assets/sounds/out-of-bounds.wav")
        };

        // map engine sound frequency based on velocity
        let context = new AudioContext();
        this.engineSound = context.createOscillator();
        this.engineSound.type = "triangle";
        this.engineSound.connect(context.destination);
        this.engineSound.frequency.value = 0;
        this.engineSound.start();
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
    
    handleTrackCollision(track: Track) {
        super.handleTrackCollision(track, true);
    }

    handleInput(keysPressed: Controls, dt: number) {
        // acceleration
        if (keysPressed["w"])
            this.velocity.add(this.direction.clone()
                .multiplyScalar(this.acceleration * this.thrust * dt));

        // deceleration
        if (keysPressed["s"] || keysPressed["shift"])
            this.velocity.sub(this.direction.clone()
                .multiplyScalar(this.deceleration * this.thrust * dt));

        if (keysPressed["w"] || keysPressed["s"] || keysPressed["shift"])
            this.engineSound.frequency.value = 50 + this.velocity.length() * 100;
        else
            this.engineSound.frequency.value *= 0.96;

        // turning
        if (keysPressed["d"])
            this.turn(-this.turnRate * dt);
            
        if (keysPressed["a"])
            this.turn(this.turnRate * dt);

        // reset roll
        if (!(keysPressed["a"] || keysPressed["d"]))
            this.rotation.z *= 0.8;            
    }

    handleOutOfBounds() {
        if (this.laps > 2)
            return;

        super.handleOutOfBounds(true);
    }

    update(track: Track, dt?: number, keysPressed?: Controls) {
        if (!this.model || !this.hitbox || !track || !dt)
            return;
        
        this.handleInput(keysPressed, dt);        
        super.update(track, dt);
        this.handleCameraMovement(!keysPressed["r"], this.isAlive);
    }
}
