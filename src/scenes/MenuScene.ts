import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { randomVector } from "../utils/geometry";
import { MenuLayout, MenuSceneOptions } from "../utils/interfaces";
import { menuVehicles, MenuVehicle } from "../../data/vehicles/vehicles";

type SelectableVehicle = {
    baseScale: number;
    group: THREE.Group;
    index: number;
    labelSprite: THREE.Sprite;
    menuVehicle: MenuVehicle;
};

type MenuStar = {
    baseScale: number;
    depth: number;
    driftAmplitude: THREE.Vector2;
    driftPhase: number;
    driftSpeed: number;
    mesh: THREE.Mesh;
    normalizedAnchor: THREE.Vector2;
    origin: THREE.Vector3;
    rotationRate: THREE.Vector3;
};

export default class MenuScene extends THREE.Scene {
    camera: THREE.OrthographicCamera;
    canvas: HTMLCanvasElement;
    active: boolean;
    handleKeydownBound: (event: KeyboardEvent) => void;
    handlePointerDownBound: (event: PointerEvent) => void;
    handleResizeBound: () => void;
    handleTouchStartBound: (event: TouchEvent) => void;
    onPlay?: (speederIndex: number) => void;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    filter: UnrealBloomPass;

    backgroundRoot: THREE.Group;
    selectableVehicles: Array<SelectableVehicle>;
    stars: Array<MenuStar>;

    titleGroup: THREE.Group;
    titleSprite: THREE.Sprite;
    titleShadowSprite: THREE.Sprite;
    subtitleSprite: THREE.Sprite;
    titleBaseScale: THREE.Vector3;
    subtitleBaseScale: THREE.Vector3;
    leftArrowGroup: THREE.Group;
    leftArrowSprite: THREE.Sprite;
    leftArrowBaseScale: THREE.Vector3;
    rightArrowGroup: THREE.Group;
    rightArrowSprite: THREE.Sprite;
    rightArrowBaseScale: THREE.Vector3;
    confirmButtonGroup: THREE.Group;
    confirmButtonSprite: THREE.Sprite;
    confirmButtonShadowSprite: THREE.Sprite;
    confirmButtonBaseScale: THREE.Vector3;

    width: number;
    height: number;
    curtain: HTMLElement | null;

    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    selectedIndex: number;
    leftArrowPressedUntil: number;
    rightArrowPressedUntil: number;
    confirmPressedUntil: number;
    transitionStart: number;
    transitionPlayableIndex: number;

    sounds: { [key: string]: HTMLAudioElement };

    constructor(options: MenuSceneOptions) {
        super();

        this.canvas = options.canvas;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.curtain = options.curtain;
        this.selectedIndex = 0;
        this.pointer = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.active = false;
        this.backgroundRoot = new THREE.Group();
        this.handleKeydownBound = (event: KeyboardEvent) => {
            this.handleKeydown(event);
        };
        this.handlePointerDownBound = (event: PointerEvent) => {
            this.handlePointerDown(event.clientX, event.clientY);
        };
        this.handleResizeBound = () => this.handleResize();
        this.handleTouchStartBound = (event: TouchEvent) => {
            let touch = event.changedTouches[0];
            if (touch)
                this.handlePointerDown(touch.clientX, touch.clientY);
        };
        this.onPlay = options.onPlay;
        this.selectableVehicles = [];
        this.stars = [];
        this.leftArrowPressedUntil = 0;
        this.rightArrowPressedUntil = 0;
        this.confirmPressedUntil = 0;
        this.transitionStart = 0;
        this.transitionPlayableIndex = 0;

        this.render();

        this.sounds = {
            "vehicle-select": new Audio("./assets/sounds/vehicle-select.wav")
        };
        this.activate();
    }

    getLayout(): MenuLayout {
        if (this.width < 640) {
            return {
                cameraZoom: 0.82,
                confirmButtonScale: 0.82,
                confirmY: -7.1,
                labelY: -3.7,
                arrowOffsetX: 4.05,
                arrowScale: 0.56,
                subtitleY: -1.58,
                titleScale: 2.9,
                titleY: 6.6,
                titlePulseAmplitude: 0.08,
                vehicleBaseScale: 1.04,
                vehicleY: 0.5
            };
        }

        if (this.width < 1024) {
            return {
                cameraZoom: 0.84,
                confirmButtonScale: 0.92,
                confirmY: -6.75,
                labelY: -3.62,
                arrowOffsetX: 5.45,
                arrowScale: 0.68,
                subtitleY: -1.82,
                titleScale: 3.7,
                titleY: 6.6,
                titlePulseAmplitude: 0.07,
                vehicleBaseScale: 1.08,
                vehicleY: 0.28
            };
        }

        return {
            cameraZoom: 0.88,
            confirmButtonScale: 1,
            confirmY: -6.25,
            labelY: -3.48,
            arrowOffsetX: 8.15,
            arrowScale: 0.94,
            subtitleY: -2.02,
            titleScale: 4.5,
            titleY: 6.9,
            titlePulseAmplitude: 0.06,
            vehicleBaseScale: 1.18,
            vehicleY: 0.12
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
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.lineCap = "round";

        let radius = 54;
        context.fillStyle = "#07142c";
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

        context.strokeStyle = "rgba(96, 235, 255, 0.42)";
        context.lineWidth = 6;
        context.stroke();

        context.fillStyle = "#0a2455";
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

        context.fillStyle = "#081a38";
        context.fillRect(152, 58, 596, 144);

        context.strokeStyle = "rgba(48, 167, 255, 0.34)";
        context.lineWidth = 2;
        context.strokeRect(160, 66, 580, 128);

        this.drawNeonText(
            context,
            text,
            canvas.width / 2,
            canvas.height / 2 + 4,
            88,
            "900",
            shadowStyle,
            fillStyle,
            glowStyle,
            "#d5fbff",
        );

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

    createTextButtonSprite(
        text: string,
        depthColor: string,
        fillColor: string,
        glowColor: string,
        scale: number,
        fontSize: number,
    ): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create button text context.");

        canvas.width = 1200;
        canvas.height = 320;
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.drawNeonText(
            context,
            text,
            canvas.width / 2,
            canvas.height / 2,
            fontSize,
            "900",
            depthColor,
            fillColor,
            glowColor,
            "#e7feff",
        );

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
        this.drawNeonText(
            context,
            text,
            canvas.width / 2,
            canvas.height / 2,
            fontSize,
            fontWeight,
            shadowStyle || "#0f2d5e",
            fillStyle,
            "#46d8ff",
            "#efffff",
        );

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

    createVehicleLabel(vehicle: MenuVehicle): THREE.Sprite {
        return this.createTextSprite(
            vehicle.label,
            "#4de8ff",
            "#0f2d5e",
            64,
            2.15,
            "800",
        );
    }

    drawNeonText(
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        fontSize: number,
        fontWeight: string,
        depthColor: string,
        fillColor: string,
        glowColor: string,
        highlightColor: string,
    ) {
        let fontFamily = '"Orbitron", "Rajdhani", "Trebuchet MS", "Verdana", sans-serif';
        context.save();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.lineCap = "round";
        context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

        let depthSteps = 7;
        for (let i = depthSteps; i > 0; i--) {
            let offset = i * 1.5;
            context.save();
            context.translate(offset, offset * 0.82);
            context.fillStyle = i > 3 ? "#061327" : depthColor;
            context.strokeStyle = "rgba(8, 24, 54, 0.72)";
            context.lineWidth = Math.max(3, Math.floor(fontSize * 0.06));
            context.fillText(text, x, y);
            context.strokeText(text, x, y);
            context.restore();
        }

        let gradient = context.createLinearGradient(
            x,
            y - fontSize * 0.72,
            x,
            y + fontSize * 0.72,
        );
        gradient.addColorStop(0, highlightColor);
        gradient.addColorStop(0.38, fillColor);
        gradient.addColorStop(1, "#1068ff");

        context.shadowBlur = fontSize * 0.18;
        context.shadowColor = glowColor;
        context.lineWidth = Math.max(3, Math.floor(fontSize * 0.07));
        context.strokeStyle = depthColor;
        context.fillStyle = gradient;
        context.strokeText(text, x, y);
        context.fillText(text, x, y);

        context.shadowBlur = 0;
        context.lineWidth = Math.max(2, Math.floor(fontSize * 0.03));
        context.strokeStyle = "rgba(223, 252, 255, 0.78)";
        context.strokeText(text, x, y);
        context.restore();
    }

    createArrowSprite(
        direction: "left" | "right",
        fillStyle: string,
    ): THREE.Sprite {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create arrow canvas.");

        canvas.width = 420;
        canvas.height = 420;
        context.clearRect(0, 0, canvas.width, canvas.height);

        let horizontalInset = 102;
        let tipOffset = direction === "left" ? -1 : 1;
        let centerX = canvas.width / 2;
        let centerY = canvas.height / 2;

        let drawArrowPath = (tipDistance: number, sideDistance: number, notchDistance: number) => {
            context.beginPath();
            context.moveTo(centerX + tipOffset * tipDistance, centerY);
            context.lineTo(centerX - tipOffset * sideDistance, centerY - 98);
            context.lineTo(centerX - tipOffset * notchDistance, centerY);
            context.lineTo(centerX - tipOffset * sideDistance, centerY + 98);
            context.closePath();
        };

        context.save();
        context.globalCompositeOperation = "lighter";
        context.filter = "blur(26px)";
        context.fillStyle = "rgba(77, 214, 255, 0.46)";
        drawArrowPath(124, horizontalInset + 24, 38);
        context.fill();

        context.filter = "blur(12px)";
        context.fillStyle = "rgba(112, 232, 255, 0.42)";
        drawArrowPath(118, horizontalInset + 14, 48);
        context.fill();
        context.restore();

        context.fillStyle = fillStyle;
        drawArrowPath(108, horizontalInset, 58);
        context.fill();

        let texture = new THREE.CanvasTexture(canvas);
        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        let sprite = new THREE.Sprite(material);
        sprite.scale.set(2.85, 2.85, 1);
        return sprite;
    }

    clamp01(value: number): number {
        return Math.min(Math.max(value, 0), 1);
    }

    easeInCubic(value: number): number {
        return value * value * value;
    }

    easeOutCubic(value: number): number {
        return 1 - Math.pow(1 - value, 3);
    }

    easeInOutCubic(value: number): number {
        return value < 0.5 ?
            4 * value * value * value :
            1 - Math.pow(-2 * value + 2, 3) / 2;
    }

    setCurtainOpacity(opacity: number) {
        if (!this.curtain)
            return;

        this.curtain.style.opacity = `${this.clamp01(opacity)}`;
    }

    setSpriteOpacity(sprite: THREE.Sprite | undefined, opacity: number) {
        if (!sprite)
            return;

        let material = sprite.material as THREE.SpriteMaterial;
        material.opacity = this.clamp01(opacity);
    }

    applyMenuOverlayOpacity(opacity: number) {
        let safeOpacity = this.clamp01(opacity);
        this.setSpriteOpacity(this.titleSprite, safeOpacity);
        this.setSpriteOpacity(this.titleShadowSprite, safeOpacity * 0.82);
        this.setSpriteOpacity(this.subtitleSprite, safeOpacity);
        this.setSpriteOpacity(this.leftArrowSprite, safeOpacity);
        this.setSpriteOpacity(this.rightArrowSprite, safeOpacity);
        this.setSpriteOpacity(this.confirmButtonSprite, safeOpacity);
        this.setSpriteOpacity(this.confirmButtonShadowSprite, safeOpacity * 0.82);

        let selectedVehicle = this.selectableVehicles[this.selectedIndex];
        if (selectedVehicle)
            this.setSpriteOpacity(selectedVehicle.labelSprite, safeOpacity);
    }

    updateTransitionCamera(layout: MenuLayout, progress: number) {
        let cameraProgress = this.easeInOutCubic(this.clamp01(progress));
        let baseZoom = this.getContentZoom(layout);
        let targetZoom = baseZoom * 1.95;
        this.camera.zoom = THREE.MathUtils.lerp(baseZoom, targetZoom, cameraProgress);

        this.camera.position.set(
            THREE.MathUtils.lerp(0, 2.8, cameraProgress),
            THREE.MathUtils.lerp(10, 8.35, cameraProgress),
            THREE.MathUtils.lerp(28, 17.5, cameraProgress),
        );

        this.camera.lookAt(
            THREE.MathUtils.lerp(0, 0.7, cameraProgress),
            THREE.MathUtils.lerp(0.6, layout.vehicleY + 0.18, cameraProgress),
            THREE.MathUtils.lerp(0, 0.2, cameraProgress),
        );
        this.camera.updateProjectionMatrix();
    }

    createTitleGroup() {
        this.titleGroup = new THREE.Group();

        this.titleShadowSprite = this.createTextSprite(
            "SPACE RACER",
            "#0a2b62",
            "#07142c",
            120,
            6.5,
            "900",
        );
        this.titleShadowSprite.position.set(0.12, -0.08, -0.1);
        this.titleGroup.add(this.titleShadowSprite);

        this.titleSprite = this.createTextSprite(
            "SPACE RACER",
            "#62ecff",
            "#0f4ca3",
            120,
            6.5,
            "900",
        );
        this.titleGroup.add(this.titleSprite);
        this.titleBaseScale = this.titleSprite.scale.clone();

        this.subtitleSprite = this.createTextSprite(
            "Use the arrows to browse ships.",
            "#4fd6ff",
            "#10336f",
            56,
            2.7,
            "700",
        );
        this.subtitleSprite.position.set(0, -2.02, 0.1);
        this.titleGroup.add(this.subtitleSprite);
        this.subtitleBaseScale = this.subtitleSprite.scale.clone();

        this.add(this.titleGroup);
    }

    createArrowControls() {
        this.leftArrowGroup = new THREE.Group();
        this.leftArrowSprite = this.createArrowSprite(
            "left",
            "#7ad9ff",
        );
        this.leftArrowGroup.add(this.leftArrowSprite);
        this.leftArrowBaseScale = this.leftArrowSprite.scale.clone();

        this.leftArrowGroup.userData.action = "prev";
        this.leftArrowSprite.userData.action = "prev";
        this.add(this.leftArrowGroup);

        this.rightArrowGroup = new THREE.Group();
        this.rightArrowSprite = this.createArrowSprite(
            "right",
            "#7ad9ff",
        );
        this.rightArrowGroup.add(this.rightArrowSprite);
        this.rightArrowBaseScale = this.rightArrowSprite.scale.clone();

        this.rightArrowGroup.userData.action = "next";
        this.rightArrowSprite.userData.action = "next";
        this.add(this.rightArrowGroup);
    }

    createConfirmButton() {
        this.confirmButtonGroup = new THREE.Group();

        this.confirmButtonShadowSprite = this.createTextSprite(
            "PLAY",
            "#0a2f5f",
            "#061327",
            104,
            4.2,
            "900",
        );
        this.confirmButtonShadowSprite.position.set(0.12, -0.12, -0.1);
        this.confirmButtonGroup.add(this.confirmButtonShadowSprite);

        this.confirmButtonSprite = this.createTextSprite(
            "PLAY",
            "#4de8ff",
            "#0f4ca3",
            104,
            4.2,
            "900",
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
        let titleWidth = layout.titleScale * 3.7;
        let subtitleWidth = layout.titleScale * 1.72;
        let arrowSpread = layout.arrowOffsetX + 1.8;
        let requiredHalfWidth = Math.max(
            arrowSpread + 1.6,
            titleWidth / 2 + 0.9,
            subtitleWidth / 2 + 0.6,
        );

        let titleTop = layout.titleY + layout.titleScale / 2;
        let subtitleBottom = layout.titleY + layout.subtitleY - layout.titleScale * 0.1;
        let bottomY = Math.min(layout.labelY - 0.7, layout.confirmY - 1.2);
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

    getVisibleHalfSize(layout: MenuLayout = this.getLayout()): THREE.Vector2 {
        let zoom = this.getContentZoom(layout);
        return new THREE.Vector2(
            this.width / 180 / zoom,
            this.height / 180 / zoom,
        );
    }

    setupBackgroundEntities(number: number = 180) {
        if (this.backgroundRoot.parent)
            this.backgroundRoot.parent.remove(this.backgroundRoot);

        this.backgroundRoot = new THREE.Group();
        this.backgroundRoot.position.set(0, 0, 0);
        this.backgroundRoot.renderOrder = -10;
        this.add(this.backgroundRoot);

        this.stars = [];

        let starMaterial = new THREE.MeshBasicMaterial({
            color: 0x89a8ff,
            transparent: true,
            opacity: 0.84,
            wireframe: true,
            depthWrite: false,
            depthTest: false
        });
        let starGeometry = new THREE.OctahedronGeometry(0.24, 0);
        let starPrototype = new THREE.Mesh(starGeometry, starMaterial);

        for (let i = 0; i < number; i++) {
            let star = starPrototype.clone();
            let normalizedAnchor = new THREE.Vector2();
            do {
                normalizedAnchor.set(
                    Math.random() * 1.8 - 0.9,
                    Math.random() * 1.6 - 0.8,
                );
            } while (
                (Math.abs(normalizedAnchor.x) < 0.24 && normalizedAnchor.y > 0.18) ||
                (Math.abs(normalizedAnchor.x) < 0.18 && Math.abs(normalizedAnchor.y) < 0.22) ||
                (Math.abs(normalizedAnchor.x) < 0.28 && normalizedAnchor.y < -0.38)
            );

            let baseScale = 0.32 + Math.random() * 0.46;
            star.scale.setScalar(baseScale);
            star.frustumCulled = false;
            star.renderOrder = -10;

            this.stars.push({
                baseScale,
                depth: -8 + Math.random() * 16,
                driftAmplitude: new THREE.Vector2(
                    0.04 + Math.random() * 0.08,
                    0.03 + Math.random() * 0.07,
                ),
                driftPhase: Math.random() * Math.PI * 2,
                driftSpeed: 0.00018 + Math.random() * 0.00024,
                mesh: star,
                normalizedAnchor,
                origin: new THREE.Vector3(),
                rotationRate: new THREE.Vector3(
                    0.00005 + Math.random() * 0.00008,
                    0.00008 + Math.random() * 0.00012,
                    0.00003 + Math.random() * 0.00006,
                ),
            });
            this.backgroundRoot.add(star);
        }

        this.syncBackgroundLayout();
    }

    syncBackgroundLayout(layout: MenuLayout = this.getLayout()) {
        let halfSize = this.getVisibleHalfSize(layout);
        let usableWidth = Math.max(halfSize.x - 0.55, 4.8);
        let usableHeight = Math.max(halfSize.y - 0.8, 4.1);

        for (let star of this.stars) {
            star.origin.set(
                star.normalizedAnchor.x * usableWidth * 1.08,
                star.normalizedAnchor.y * usableHeight * 1.08,
                star.depth,
            );
            star.mesh.position.copy(star.origin);
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
        if (!this.selectableVehicles.length || this.transitionStart)
            return;

        this.pointer.x = clientX / this.width * 2 - 1;
        this.pointer.y = -(clientY / this.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        let pickTargets: Array<THREE.Object3D> = [];
        if (this.leftArrowGroup)
            pickTargets.push(this.leftArrowGroup);
        if (this.rightArrowGroup)
            pickTargets.push(this.rightArrowGroup);
        if (this.confirmButtonGroup)
            pickTargets.push(this.confirmButtonGroup);

        let intersects = this.raycaster.intersectObjects(pickTargets, true);

        if (!intersects.length)
            return;

        let intersected = intersects[0].object;
        let action = intersected.userData.action || intersected.parent?.userData.action;

        if (action === "confirm") {
            this.confirmPressedUntil = performance.now() + 140;
            this.startGame(this.selectableVehicles[this.selectedIndex].menuVehicle.playableIndex);
            return;
        }

        if (action === "prev") {
            this.leftArrowPressedUntil = performance.now() + 180;
            this.selectVehicle((this.selectedIndex - 1 + this.selectableVehicles.length) % this.selectableVehicles.length);
            return;
        }

        if (action === "next") {
            this.rightArrowPressedUntil = performance.now() + 180;
            this.selectVehicle((this.selectedIndex + 1) % this.selectableVehicles.length);
        }
    }

    handleKeydown(event: KeyboardEvent) {
        if (!this.selectableVehicles.length || this.transitionStart)
            return;

        if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
            this.leftArrowPressedUntil = performance.now() + 180;
            this.selectVehicle((this.selectedIndex - 1 + this.selectableVehicles.length) % this.selectableVehicles.length);
        }

        if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
            this.rightArrowPressedUntil = performance.now() + 180;
            this.selectVehicle((this.selectedIndex + 1) % this.selectableVehicles.length);
        }

        if (event.key === "Enter" || event.key === " ") {
            this.confirmPressedUntil = performance.now() + 140;
            this.startGame(this.selectableVehicles[this.selectedIndex].menuVehicle.playableIndex);
        }
    }

    async loadVehicleGroup(vehicle: MenuVehicle, index: number, loader: GLTFLoader): Promise<SelectableVehicle> {
        let data = await loader.loadAsync(vehicle.data.modelPath);
        let group = data.scene;

        let box = new THREE.Box3().setFromObject(group);
        let size = box.getSize(new THREE.Vector3());
        let center = box.getCenter(new THREE.Vector3());
        let maxDimension = Math.max(size.x, size.y, size.z) || 1;
        let scale = 2.55 / maxDimension;
        let baseScale = scale * vehicle.menuScaleMultiplier;

        group.position.sub(center.multiplyScalar(scale));
        group.scale.setScalar(baseScale);
        group.rotation.y = -Math.PI / 6;

        let labelSprite = this.createVehicleLabel(vehicle);
        labelSprite.position.set(0, -3.5, 0.2);
        group.add(labelSprite);
        group.visible = false;

        return {
            baseScale,
            group,
            index,
            labelSprite,
            menuVehicle: vehicle
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
        this.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.background = "transparent";

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

        let starLight = new THREE.DirectionalLight(0xcbd8ff, 0.18);
        starLight.position.set(0, 12, -16);
        this.add(starLight);

        this.setupBackgroundEntities();
        this.createTitleGroup();
        this.createArrowControls();
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
            vehicle.group.visible = i === index;
            vehicle.group.scale.setScalar(vehicle.baseScale);
        }
    }

    startGame(playableIndex: number) {
        if (this.transitionStart)
            return;

        this.transitionStart = performance.now();
        this.transitionPlayableIndex = playableIndex;
        this.setCurtainOpacity(0);
    }

    updateLayout() {
        let layout = this.getLayout();

        this.camera.zoom = this.getContentZoom(layout);
        this.camera.updateProjectionMatrix();

        for (let selectableVehicle of this.selectableVehicles) {
            selectableVehicle.group.position.set(0, layout.vehicleY, 0);
            selectableVehicle.labelSprite.position.set(0, layout.labelY, 0.2);
        }

        if (this.titleGroup) {
            this.titleGroup.position.set(0, layout.titleY, 0);
            this.titleSprite.scale.copy(this.titleBaseScale);
            this.titleSprite.scale.multiplyScalar(layout.titleScale / this.titleBaseScale.y);
            this.titleShadowSprite.scale.copy(this.titleSprite.scale);
            this.subtitleSprite.scale.copy(this.subtitleBaseScale);
            this.subtitleSprite.scale.multiplyScalar(
                layout.titleScale * 0.36 / this.subtitleBaseScale.y,
            );
            this.subtitleSprite.position.y = layout.subtitleY;
        }

        if (this.leftArrowGroup && this.rightArrowGroup) {
            this.leftArrowGroup.position.set(-layout.arrowOffsetX, layout.vehicleY - 0.18, 0);
            this.rightArrowGroup.position.set(layout.arrowOffsetX, layout.vehicleY - 0.18, 0);

            this.leftArrowSprite.scale.copy(this.leftArrowBaseScale);
            this.leftArrowSprite.scale.multiplyScalar(layout.arrowScale);

            this.rightArrowSprite.scale.copy(this.rightArrowBaseScale);
            this.rightArrowSprite.scale.multiplyScalar(layout.arrowScale);
        }

        if (this.confirmButtonGroup) {
            this.confirmButtonGroup.position.set(0, layout.confirmY, 0);
            this.confirmButtonSprite.scale.copy(this.confirmButtonBaseScale);
            this.confirmButtonSprite.scale.multiplyScalar(layout.confirmButtonScale);
            this.confirmButtonShadowSprite.scale.copy(this.confirmButtonSprite.scale);
        }

        this.syncBackgroundLayout(layout);
    }

    update(dt: number) {
        let layout = this.getLayout();
        let now = performance.now();
        let transitionElapsed = this.transitionStart ? now - this.transitionStart : 0;
        let transitionActive = this.transitionStart > 0;

        if (transitionActive) {
            let fadeProgress = this.easeOutCubic(
                this.clamp01((transitionElapsed - 70) / 260),
            );
            let cameraProgress = this.clamp01((transitionElapsed - 120) / 760);
            let blackoutProgress = this.easeInCubic(
                this.clamp01((transitionElapsed - 620) / 300),
            );
            let handoffReady = transitionElapsed >= 1000;

            this.applyMenuOverlayOpacity(1 - fadeProgress);
            this.updateTransitionCamera(layout, cameraProgress);
            this.setCurtainOpacity(blackoutProgress);

            if (this.titleGroup) {
                this.titleGroup.scale.setScalar(1);
                this.titleGroup.position.y = layout.titleY + fadeProgress * 0.18;
            }

            if (handoffReady) {
                this.transitionStart = 0;
                this.onPlay?.(this.transitionPlayableIndex);
                return;
            }
        } else {
            this.applyMenuOverlayOpacity(1);
            this.setCurtainOpacity(0);
        }

        if (this.titleGroup) {
            if (!transitionActive) {
                let pulse = 1 + Math.sin(now * 0.0026) * layout.titlePulseAmplitude;
                this.titleGroup.scale.setScalar(pulse);
            }
        }

        if (this.leftArrowGroup) {
            let pressed = now < this.leftArrowPressedUntil;
            let scale = pressed ? 1.22 : 1;
            this.leftArrowGroup.scale.x += (scale - this.leftArrowGroup.scale.x) * 0.24;
            this.leftArrowGroup.scale.y += (scale - this.leftArrowGroup.scale.y) * 0.24;
            this.leftArrowGroup.scale.z = 1;
        }

        if (this.rightArrowGroup) {
            let pressed = now < this.rightArrowPressedUntil;
            let scale = pressed ? 1.22 : 1;
            this.rightArrowGroup.scale.x += (scale - this.rightArrowGroup.scale.x) * 0.24;
            this.rightArrowGroup.scale.y += (scale - this.rightArrowGroup.scale.y) * 0.24;
            this.rightArrowGroup.scale.z = 1;
        }

        if (this.confirmButtonGroup) {
            if (transitionActive) {
                let transitionScale = THREE.MathUtils.lerp(
                    this.confirmButtonGroup.scale.x,
                    0.92,
                    0.18,
                );
                this.confirmButtonGroup.scale.setScalar(transitionScale);
            } else if (now < this.confirmPressedUntil) {
                let pressScale = 1.18 + Math.sin(now * 0.025) * 0.025;
                this.confirmButtonGroup.scale.setScalar(pressScale);
            } else {
                let confirmPulse = 1 + Math.sin(now * 0.0034) * 0.03;
                this.confirmButtonGroup.scale.setScalar(confirmPulse);
            }
        }

        for (let i = 0; i < this.selectableVehicles.length; i++) {
            let selectableVehicle = this.selectableVehicles[i];
            selectableVehicle.group.rotateY(0.00035 * dt);

            let targetScale = i === this.selectedIndex ?
                selectableVehicle.baseScale * layout.vehicleBaseScale :
                selectableVehicle.baseScale;
            if (transitionActive && i === this.selectedIndex) {
                let zoomFocus = this.easeOutCubic(
                    this.clamp01((transitionElapsed - 150) / 700),
                );
                targetScale *= 1 + zoomFocus * 0.48;
            }
            let currentScale = selectableVehicle.group.scale.x;
            let nextScale = currentScale + (targetScale - currentScale) * 0.08;
            selectableVehicle.group.scale.setScalar(nextScale);
        }

        for (let star of this.stars) {
            star.mesh.position.x = star.origin.x +
                Math.sin(now * star.driftSpeed + star.driftPhase) * star.driftAmplitude.x;
            star.mesh.position.y = star.origin.y +
                Math.cos(now * star.driftSpeed * 0.8 + star.driftPhase * 1.1) * star.driftAmplitude.y;
            star.mesh.position.z = star.origin.z;
            star.mesh.rotation.x += star.rotationRate.x * dt;
            star.mesh.rotation.y += star.rotationRate.y * dt;
            star.mesh.rotation.z += star.rotationRate.z * dt;
            let twinkle = 0.92 + Math.sin(now * star.driftSpeed * 1.8 + star.driftPhase) * 0.18;
            star.mesh.scale.setScalar(star.baseScale * twinkle);
        }
    }

    activate() {
        if (this.active)
            return;

        this.active = true;
        window.addEventListener("resize", this.handleResizeBound, false);
        window.addEventListener("pointerdown", this.handlePointerDownBound);
        window.addEventListener("touchstart", this.handleTouchStartBound, { passive: true });
        window.addEventListener("keydown", this.handleKeydownBound);
    }

    deactivate() {
        if (!this.active)
            return;

        this.active = false;
        window.removeEventListener("resize", this.handleResizeBound, false);
        window.removeEventListener("pointerdown", this.handlePointerDownBound);
        window.removeEventListener("touchstart", this.handleTouchStartBound);
        window.removeEventListener("keydown", this.handleKeydownBound);
    }

    reset() {
        this.transitionStart = 0;
        this.confirmPressedUntil = 0;
        this.leftArrowPressedUntil = 0;
        this.rightArrowPressedUntil = 0;
        this.setCurtainOpacity(0);
        this.selectVehicle(this.selectedIndex, false);
        this.applyMenuOverlayOpacity(1);
        this.updateLayout();
    }

    dispose() {
        this.deactivate();
        this.renderer?.dispose();
    }
}
