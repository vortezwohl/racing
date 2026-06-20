import MenuScene from "./scenes/MenuScene";

// set up scene
let scene = new MenuScene();

// keep track of time
let currentTime = 0;

// loops updates
function animate(timestamp?: number) {
    let safeTimestamp = timestamp ?? currentTime;
    let dt = safeTimestamp - currentTime;
    currentTime = safeTimestamp;

    scene.camera.updateProjectionMatrix();
    scene.update(dt);
    scene.renderer.render(scene, scene.camera);

    requestAnimationFrame(animate);
}

// runs a continuous animation loop
animate()
