import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { Satellite } from "../decorations/decorations";
import { randomVector } from "../utils/geometry";
import { MenuLayout } from "../utils/interfaces";
import { menuVehicles, MenuVehicle } from "../../data/vehicles/vehicles";

type SelectableVehicle = {
    baseY: number;
    checkMark: THREE.Sprite;
    group: THREE.Group;
    hitArea: THREE.Mesh;
    index: number;
    labelSprite: THREE.Sprite;
    menuVehicle: MenuVehicle;
    pedestal: THREE.Group;
};

export default class MenuScene extends THREE.Scene {
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    filter: UnrealBloomPass;

    selectableVehicles: Array<SelectableVehicle>;
    satellites: Array<Satellite>;
    stars: Array<THREE.Mesh>;

    titleGroup: THREE.Group;
    titleSprite: THREE.Sprite;
    titleShadowSprite: THREE.Sprite;
    subtitleSprite: THREE.Sprite;
    titleBaseScale: THREE.Vector3;
    subtitleBaseScale: THREE.Vector3;
    confirmButtonGroup: THREE.Group;
    confirmButtonSprite: THREE.Sprite;
    confirmButtonShadowSprite: THREE.Sprite;
    confirmButtonBaseScale: THREE.Vector3;

    width: number;
    height: number;

    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    selectedIndex: number;

    sounds: { [key: string]: HTMLAudioElement };

    constructor() {
        super();

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.selectedIndex = 0;
        this.pointer = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.selectableVehicles = [];
        this.satellites = [];
        this.stars = [];

        this.render();

        this.sounds = {
            "vehicle-select": new Audio("./assets/sounds/vehicle-select.wav")
        };

        window.addEventListener("resize", () => this.handleResize(), false);
        window.addEventListener("pointerdown", (event: PointerEvent) => {
            this.handlePointerDown(event.clientX, event.clientY);
        });
        window.addEventListener("touchstart", (event: TouchEvent) => {
            let touch = event.changedTouches[0];
            if (touch)
                this.handlePointerDown(touch.clientX, touch.clientY);
        }, { passive: true });
        window.addEventListener("keydown", (event: KeyboardEvent) => {
            this.handleKeydown(event);
        });
    }

    getLayout(): MenuLayout {
        if (this.width < 640) {
            return {
                vehicleSpacing: 2.8,
                cameraZoom: 0.92,
                titleScale: 2.9,
                titleY: 6.3,
                titleX: 0,
                titleLetterSpacing: 140,
                titlePulseAmplitude: 0.12
            };
        }

        if (this.width < 1024) {
            return {
                vehicleSpacing: 3.15,
                cameraZoom: 0.9,
                titleScale: 3.7,
                titleY: 6.6,
                titleX: 0,
                titleLetterSpacing: 150,
                titlePulseAmplitude: 0.1
            };
        }

        return {
            vehicleSpacing: 3.75,
            cameraZoom: 0.88,
            titleScale: 4.5,
            titleY: 6.9,
            titleX: 0,
            titleLetterSpacing: 160,
            titlePulseAmplitude: 0.08
        };
    }

    createButtonSprite(
        text: string,
        fillStyle: string,
        shadowStyle: string,
        glowStyle: string,
    ): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create button canvas.");

        canvas.width = 900;
        canvas.height = 260;
        context.clearRect(0, 0, canvas.width, canvas.height);

        let radius = 54;
        context.fillStyle = shadowStyle;
        context.beginPath();
        context.moveTo(120 + radius, 56);
        context.lineTo(780 - radius, 56);
        context.quadraticCurveTo(780, 56, 780, 56 + radius);
        context.lineTo(780, 204 - radius);
        context.quadraticCurveTo(780, 204, 780 - radius, 204);
        context.lineTo(120 + radius, 204);
        context.quadraticCurveTo(120, 204, 120, 204 - radius);
        context.lineTo(120, 56 + radius);
        context.quadraticCurveTo(120, 56, 120 + radius, 56);
        context.closePath();
        context.fill();

        context.fillStyle = fillStyle;
        context.beginPath();
        context.moveTo(120 + radius, 38);
        context.lineTo(780 - radius, 38);
        context.quadraticCurveTo(780, 38, 780, 38 + radius);
        context.lineTo(780, 186 - radius);
        context.quadraticCurveTo(780, 186, 780 - radius, 186);
        context.lineTo(120 + radius, 186);
        context.quadraticCurveTo(120, 186, 120, 186 - radius);
        context.lineTo(120, 38 + radius);
        context.quadraticCurveTo(120, 38, 120 + radius, 38);
        context.closePath();
        context.fill();

        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = '900 88px "Trebuchet MS", "Verdana", sans-serif';
        context.lineWidth = 18;
        context.strokeStyle = glowStyle;
        context.strokeText(text, canvas.width / 2, canvas.height / 2 + 4);
        context.fillStyle = "#fff9f1";
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

        let texture = new THREE.CanvasTexture(canvas);
        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        let sprite = new THREE.Sprite(material);
        sprite.scale.set(6.9, 2, 1);
        return sprite;
    }

    createTextSprite(
        text: string,
        fillStyle: string,
        shadowStyle?: string,
        fontSize: number = 112,
        scale: number = 4.5,
        fontWeight: string = "900",
    ): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create canvas text context.");

        canvas.width = 1400;
        canvas.height = 320;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `${fontWeight} ${fontSize}px "Trebuchet MS", "Verdana", sans-serif`;

        if (shadowStyle) {
            context.lineWidth = 30;
            context.strokeStyle = shadowStyle;
            context.strokeText(text, canvas.width / 2, canvas.height / 2);
        }

        context.fillStyle = fillStyle;
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        let texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        let sprite = new THREE.Sprite(material);
        sprite.scale.set(scale * canvas.width / canvas.height, scale, 1);
        return sprite;
    }

    createCheckMark(accentColor: number): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create check mark canvas.");

        canvas.width = 256;
        canvas.height = 256;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#0d1020";
        context.beginPath();
        context.arc(128, 128, 84, 0, Math.PI * 2);
        context.fill();

        context.lineWidth = 20;
        context.strokeStyle = `#${accentColor.toString(16).padStart(6, "0")}`;
        context.beginPath();
        context.moveTo(78, 132);
        context.lineTo(114, 168);
        context.lineTo(182, 94);
        context.stroke();

        let texture = new THREE.CanvasTexture(canvas);
        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        let sprite = new THREE.Sprite(material);
        sprite.scale.set(1.2, 1.2, 1);
        sprite.visible = false;
        return sprite;
    }

    createPedestal(accentColor: number): THREE.Group {
        let group = new THREE.Group();

        let baseGeometry = new THREE.CylinderGeometry(1.5, 1.9, 0.42, 40);
        let baseMaterial = new THREE.MeshBasicMaterial({ color: 0xf8f9ff });
        let base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -1.15;
        group.add(base);

        let rimGeometry = new THREE.TorusGeometry(1.46, 0.14, 18, 50);
        let rimMaterial = new THREE.MeshBasicMaterial({ color: accentColor });
        let rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = -0.92;
        group.add(rim);

        let glowGeometry = new THREE.CircleGeometry(1.45, 32);
        let glowMaterial = new THREE.MeshBasicMaterial({
            color: accentColor,
            transparent: true,
            opacity: 0.38
        });
        let glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = -0.91;
        group.add(glow);

        return group;
    }

    createHitArea(index: number): THREE.Mesh {
        let geometry = new THREE.SphereGeometry(1.95, 18, 18);
        let material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.001,
            depthWrite: false
        });
        let hitArea = new THREE.Mesh(geometry, material);
        hitArea.position.set(0, -0.1, 1.1);
        hitArea.userData.menuVehicleIndex = index;
        return hitArea;
    }

    createVehicleLabel(vehicle: MenuVehicle): THREE.Sprite {
        return this.createTextSprite(
            vehicle.label,
            vehicle.titleColor,
            vehicle.titleShadowColor,
            64,
            2.3,
            "800",
        );
    }

    createTitleGroup() {
        this.titleGroup = new THREE.Group();

        this.titleShadowSprite = this.createTextSprite(
            "Pick Your Racer!",
            "#31134d",
            undefined,
            120,
            6.5,
            "900",
        );
        this.titleShadowSprite.position.set(0.16, -0.12, -0.1);
        this.titleGroup.add(this.titleShadowSprite);

        this.titleSprite = this.createTextSprite(
            "Pick Your Racer!",
            "#ffd07a",
            "#915819",
            120,
            6.5,
            "900",
        );
        this.titleGroup.add(this.titleSprite);
        this.titleBaseScale = this.titleSprite.scale.clone();

        this.subtitleSprite = this.createTextSprite(
            "Tap a ship to choose it.",
            "#b8d7ff",
            "#25314f",
            56,
            2.7,
            "700",
        );
        this.subtitleSprite.position.set(0, -2.1, 0.1);
        this.titleGroup.add(this.subtitleSprite);
        this.subtitleBaseScale = this.subtitleSprite.scale.clone();

        this.add(this.titleGroup);
    }

    createConfirmButton() {
        this.confirmButtonGroup = new THREE.Group();
        this.confirmButtonGroup.position.set(0, this.width < 980 ? -8.2 : -6.55, 0);

        this.confirmButtonShadowSprite = this.createButtonSprite(
            "Confirm",
            "#6f3f0c",
            "#2e1706",
            "#2e1706",
        );
        this.confirmButtonShadowSprite.position.set(0.12, -0.12, -0.1);
        this.confirmButtonGroup.add(this.confirmButtonShadowSprite);

        this.confirmButtonSprite = this.createButtonSprite(
            "Confirm",
            "#f7a840",
            "#9c5b12",
            "#ffd37a",
        );
        this.confirmButtonGroup.add(this.confirmButtonSprite);
        this.confirmButtonBaseScale = this.confirmButtonSprite.scale.clone();

        this.confirmButtonGroup.userData.action = "confirm";
        this.confirmButtonSprite.userData.action = "confirm";
        this.confirmButtonShadowSprite.userData.action = "confirm";

        this.add(this.confirmButtonGroup);
    }

    getContentZoom(layout: MenuLayout): number {
        let halfVisibleWidth = this.width / 180;
        let halfVisibleHeight = this.height / 180;

        let rowSizes = this.getVehicleRowSizes(layout);
        let maxRowWidth = Math.max(...rowSizes.map(row => {
            if (row.count === 0)
                return 0;

            return (row.count - 1) * layout.vehicleSpacing + row.vehicleWidth;
        }));

        let titleWidth = layout.titleScale * 3.7;
        let subtitleWidth = layout.titleScale * 1.32;
        let requiredHalfWidth = Math.max(
            maxRowWidth / 2 + 1.4,
            titleWidth / 2 + 0.9,
            subtitleWidth / 2 + 0.6,
        );

        let useTwoRows = this.shouldUseTwoRows();
        let titleTop = layout.titleY + layout.titleScale / 2;
        let subtitleBottom = layout.titleY - 2.1 - layout.titleScale * 0.18;
        let confirmButtonY = this.width < 980 ? -8.2 : -6.55;
        let bottomY = useTwoRows ? Math.min(-6.6, confirmButtonY - 1.2) : Math.min(-4.6, confirmButtonY - 1.2);
        let requiredHalfHeight = Math.max(
            titleTop + 0.8,
            Math.abs(bottomY) + 1.6,
            Math.abs(subtitleBottom) + 0.8,
        );

        let widthZoom = halfVisibleWidth / requiredHalfWidth;
        let heightZoom = halfVisibleHeight / requiredHalfHeight;
        let safeZoom = Math.min(layout.cameraZoom, widthZoom, heightZoom);
        return Math.max(0.45, safeZoom);
    }

    getVehicleRowSizes(layout: MenuLayout): Array<{ count: number; vehicleWidth: number }> {
        if (this.shouldUseTwoRows()) {
            return [
                { count: 3, vehicleWidth: 2.8 },
                { count: 2, vehicleWidth: 2.8 }
            ];
        }

        return [
            { count: this.selectableVehicles.length, vehicleWidth: 2.8 }
        ];
    }

    shouldUseTwoRows(): boolean {
        return this.width < 980;
    }

    setupBackgroundEntities(number: number = 1800, distance: number = 220, offset: number = 80) {
        this.satellites = [];
        this.stars = [];

        let starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
        let starGeometry = new THREE.SphereGeometry(0.45, 4, 2);
        let starPrototype = new THREE.Mesh(starGeometry, starMaterial);

        for (let i = 0; i < number; i++) {
            let position = randomVector();
            while (position.length() < 0.5 && position.length() > 1)
                position = randomVector();

            position.normalize();
            position.multiplyScalar(distance + Math.random() * offset);

            if (Math.random() < 0.035) {
                let points = Array(Math.ceil(Math.random() * 6) + 8)
                    .fill(0)
                    .map(() => randomVector().multiplyScalar(Math.random() * 5));

                let geometry = new ConvexGeometry(points);
                let direction = randomVector().multiplyScalar(0.012);
                let rotationRate = randomVector().multiplyScalar(0.0006);
                let satellite = new Satellite(geometry, starMaterial, direction, rotationRate);
                satellite.position.copy(position);
                this.satellites.push(satellite);
                this.add(satellite);
            } else {
                let star = starPrototype.clone();
                let scale = 0.7 + Math.random() * 0.8;
                star.position.copy(position);
                star.scale.setScalar(scale);
                this.stars.push(star);
                this.add(star);
            }
        }
    }

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        let layout = this.getLayout();

        this.camera.left = this.width / -180;
        this.camera.right = this.width / 180;
        this.camera.top = this.height / 180;
        this.camera.bottom = this.height / -180;
        this.camera.zoom = this.getContentZoom(layout);
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
        this.filter.setSize(this.width, this.height);
        this.updateLayout();
    }

    handlePointerDown(clientX: number, clientY: number) {
        if (!this.selectableVehicles.length)
            return;

        this.pointer.x = clientX / this.width * 2 - 1;
        this.pointer.y = -(clientY / this.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        let pickTargets = this.selectableVehicles.map(vehicle => vehicle.group);
        if (this.confirmButtonGroup)
            pickTargets.push(this.confirmButtonGroup);

        let intersects = this.raycaster.intersectObjects(pickTargets, true);

        if (!intersects.length)
            return;

        let intersected = intersects[0].object;
        if (intersected.userData.action === "confirm" || intersected.parent?.userData.action === "confirm") {
            this.startGame(this.selectableVehicles[this.selectedIndex].menuVehicle.playableIndex);
            return;
        }

        let group: THREE.Object3D | null = intersected;
        while (group && typeof group.userData.menuVehicleIndex !== "number")
            group = group.parent;

        if (!group || typeof group.userData.menuVehicleIndex !== "number")
            return;

        this.selectVehicle(group.userData.menuVehicleIndex);
    }

    handleKeydown(event: KeyboardEvent) {
        if (!this.selectableVehicles.length)
            return;

        if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
            this.selectVehicle((this.selectedIndex - 1 + this.selectableVehicles.length) % this.selectableVehicles.length);
        }

        if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
            this.selectVehicle((this.selectedIndex + 1) % this.selectableVehicles.length);
        }

        if (event.key === "Enter" || event.key === " ") {
            this.startGame(this.selectableVehicles[this.selectedIndex].menuVehicle.playableIndex);
        }
    }

    async loadVehicleGroup(vehicle: MenuVehicle, index: number, loader: GLTFLoader): Promise<SelectableVehicle> {
        let data = await loader.loadAsync(vehicle.data.modelPath);
        let group = data.scene;
        group.userData.menuVehicleIndex = index;

        let box = new THREE.Box3().setFromObject(group);
        let size = box.getSize(new THREE.Vector3());
        let center = box.getCenter(new THREE.Vector3());
        let maxDimension = Math.max(size.x, size.y, size.z) || 1;
        let scale = 2.55 / maxDimension;

        group.position.sub(center.multiplyScalar(scale));
        group.scale.setScalar(scale);
        group.userData.baseScale = scale;
        group.rotation.y = -Math.PI / 6;

        let pedestal = this.createPedestal(vehicle.accentColor);
        pedestal.userData.menuVehicleIndex = index;
        group.add(pedestal);

        let hitArea = this.createHitArea(index);
        group.add(hitArea);

        let labelSprite = this.createVehicleLabel(vehicle);
        labelSprite.position.set(0, -2.8, 0);
        group.add(labelSprite);

        let checkMark = this.createCheckMark(vehicle.accentColor);
        checkMark.position.set(0, -2.05, 0.3);
        group.add(checkMark);

        return {
            baseY: 0,
            checkMark,
            group,
            hitArea,
            index,
            labelSprite,
            menuVehicle: vehicle,
            pedestal
        };
    }

    async render() {
        this.camera = new THREE.OrthographicCamera(
            this.width / -180,
            this.width / 180,
            this.height / 180,
            this.height / -180,
            0,
            500,
        );
        this.camera.position.set(0, 10, 28);
        this.camera.zoom = this.getContentZoom(this.getLayout());
        this.camera.lookAt(0, 0.6, 0);
        this.camera.updateProjectionMatrix();

        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById("menu") as HTMLCanvasElement,
            alpha: true,
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this, this.camera));
        this.filter = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            1.2,
            0.2,
            0.86,
        );
        this.composer.addPass(this.filter);

        let ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.add(ambientLight);

        let fillLight = new THREE.DirectionalLight(0x9ab8ff, 0.95);
        fillLight.position.set(-8, 10, 8);
        this.add(fillLight);

        let rimLight = new THREE.DirectionalLight(0xffc0d8, 0.65);
        rimLight.position.set(10, 7, 4);
        this.add(rimLight);

        this.setupBackgroundEntities();
        this.createTitleGroup();
        this.createConfirmButton();

        let loader = new GLTFLoader();
        this.selectableVehicles = [];
        for (let i = 0; i < menuVehicles.length; i++) {
            let selectableVehicle = await this.loadVehicleGroup(menuVehicles[i], i, loader);
            this.selectableVehicles.push(selectableVehicle);
            this.add(selectableVehicle.group);
        }

        this.updateLayout();
        this.selectVehicle(0, false);
    }

    selectVehicle(index: number, playSound: boolean = true) {
        if (!this.selectableVehicles.length)
            return;

        this.selectedIndex = index;

        if (playSound)
            this.sounds["vehicle-select"]?.play();

        for (let i = 0; i < this.selectableVehicles.length; i++) {
            let vehicle = this.selectableVehicles[i];
            let baseScale = vehicle.group.userData.baseScale || 1;
            let scale = i === index ? baseScale * 1.12 : baseScale;
            vehicle.group.scale.setScalar(scale);
            vehicle.checkMark.visible = i === index;
            vehicle.labelSprite.position.y = i === index ? -2.55 : -2.8;
        }
    }

    startGame(playableIndex: number) {
        let curtain = document.getElementById("curtain");
        curtain.classList.add("fade-to-black");

        setTimeout(() => {
            window.location.href = `game.html?speeder=${playableIndex}`;
        }, 800);
    }

    updateLayout() {
        let layout = this.getLayout();
        let useTwoRows = this.shouldUseTwoRows();

        this.camera.zoom = this.getContentZoom(layout);
        this.camera.updateProjectionMatrix();

        if (useTwoRows) {
            let topRowCount = 3;
            let bottomRowCount = this.selectableVehicles.length - topRowCount;
            let topStart = -layout.vehicleSpacing * (topRowCount - 1) / 2;
            let bottomStart = -layout.vehicleSpacing * (bottomRowCount - 1) / 2;

            for (let i = 0; i < this.selectableVehicles.length; i++) {
                let selectableVehicle = this.selectableVehicles[i];
                if (i < topRowCount) {
                    selectableVehicle.baseY = -0.2;
                    selectableVehicle.group.position.set(topStart + i * layout.vehicleSpacing, selectableVehicle.baseY, 0);
                } else {
                    selectableVehicle.baseY = -4.1;
                    selectableVehicle.group.position.set(
                        bottomStart + (i - topRowCount) * layout.vehicleSpacing,
                        selectableVehicle.baseY,
                        0,
                    );
                }
            }
        } else {
            let start = -layout.vehicleSpacing * (this.selectableVehicles.length - 1) / 2;

            for (let i = 0; i < this.selectableVehicles.length; i++) {
                let selectableVehicle = this.selectableVehicles[i];
                selectableVehicle.baseY = 0;
                selectableVehicle.group.position.set(start + i * layout.vehicleSpacing, selectableVehicle.baseY, 0);
            }
        }

        if (this.titleGroup) {
            this.titleGroup.position.set(layout.titleX, layout.titleY, 0);
            this.titleSprite.scale.copy(this.titleBaseScale);
            this.titleSprite.scale.multiplyScalar(layout.titleScale / this.titleBaseScale.y);
            this.titleShadowSprite.scale.copy(this.titleSprite.scale);
            this.subtitleSprite.scale.copy(this.subtitleBaseScale);
            this.subtitleSprite.scale.multiplyScalar(
                layout.titleScale * 0.36 / this.subtitleBaseScale.y,
            );
            this.subtitleSprite.position.y = this.width < 640 ? -1.75 : -2.1;
        }

        if (this.confirmButtonGroup) {
            this.confirmButtonGroup.position.set(0, useTwoRows ? -8.2 : -6.55, 0);
            let buttonScale = this.width < 640 ? 0.82 : this.width < 980 ? 0.92 : 1;
            this.confirmButtonSprite.scale.copy(this.confirmButtonBaseScale);
            this.confirmButtonSprite.scale.multiplyScalar(buttonScale);
            this.confirmButtonShadowSprite.scale.copy(this.confirmButtonSprite.scale);
        }
    }

    update(dt: number) {
        let layout = this.getLayout();

        if (this.titleGroup) {
            let pulse = 1 + Math.sin(performance.now() * 0.0026) * layout.titlePulseAmplitude;
            this.titleGroup.scale.setScalar(pulse);
        }

        if (this.confirmButtonGroup) {
            let confirmPulse = 1 + Math.sin(performance.now() * 0.0034) * 0.06;
            this.confirmButtonGroup.scale.setScalar(confirmPulse);
        }

        for (let i = 0; i < this.selectableVehicles.length; i++) {
            let selectableVehicle = this.selectableVehicles[i];
            selectableVehicle.group.rotateY(0.00035 * dt);

            let targetY = selectableVehicle.baseY + (i === this.selectedIndex ? 0.34 : 0);
            selectableVehicle.group.position.y += (targetY - selectableVehicle.group.position.y) * 0.08;
        }

        for (let satellite of this.satellites)
            satellite.update(dt);

        for (let star of this.stars) {
            star.rotation.x += 0.0001 * dt;
            star.rotation.y += 0.00014 * dt;
        }
    }
}
