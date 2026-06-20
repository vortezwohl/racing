import GameScene from "./scenes/GameScene";
import MenuScene from "./scenes/MenuScene";
import { RaceUi } from "./utils/interfaces";

type AppRoute =
    | { view: "menu" }
    | { finishPreview?: boolean; speederIndex: number; view: "race" };

type DebugWindow = Window & typeof globalThis & {
    __appShell?: AppShell;
    __gameScene?: GameScene | null;
    __menuScene?: MenuScene;
};

class AppShell {
    currentScene: GameScene | MenuScene | null;
    currentTime: number;
    gameCanvas: HTMLCanvasElement;
    gameScene: GameScene | null;
    isReturningToMenuThroughCurtain: boolean;
    menuCanvas: HTMLCanvasElement;
    menuScene: MenuScene;
    menuView: HTMLElement;
    raceUi: RaceUi;
    raceView: HTMLElement;
    returnToMenuFadeTimeout?: number;
    returnToMenuSwitchTimeout?: number;

    constructor() {
        this.currentScene = null;
        this.currentTime = 0;
        this.gameCanvas = this.requireElement<HTMLCanvasElement>("game");
        this.gameScene = null;
        this.isReturningToMenuThroughCurtain = false;
        this.menuCanvas = this.requireElement<HTMLCanvasElement>("menu");
        this.menuView = this.requireElement<HTMLElement>("menu-view");
        this.raceView = this.requireElement<HTMLElement>("race-view");
        this.raceUi = {
            backgroundHost: document.body,
            curtain: this.requireElement<HTMLElement>("curtain"),
            hudCanvas: this.requireElement<HTMLCanvasElement>("race-hud"),
            joystick: this.requireElement<HTMLElement>("joystick"),
            knob: this.requireElement<HTMLElement>("knob"),
            markerHost: this.requireElement<HTMLElement>("marker-layer"),
        };
        this.raceUi.curtain.style.position = "fixed";
        this.raceUi.curtain.style.inset = "0";
        this.raceUi.curtain.style.zIndex = "20";
        this.raceUi.markerHost.style.position = "absolute";
        this.raceUi.markerHost.style.inset = "0";
        this.raceUi.markerHost.style.zIndex = "12";
        this.raceUi.markerHost.style.pointerEvents = "none";

        this.menuScene = new MenuScene({
            canvas: this.menuCanvas,
            curtain: this.raceUi.curtain,
            onPlay: (speederIndex: number) => {
                this.navigateToRace(speederIndex);
            },
        });
        this.attachDebugRefs();

        window.addEventListener("hashchange", () => {
            this.syncRoute();
        });
    }

    animate(timestamp?: number) {
        let safeTimestamp = timestamp ?? this.currentTime;
        let dt = safeTimestamp - this.currentTime;
        this.currentTime = safeTimestamp;

        if (this.currentScene) {
            this.currentScene.update(dt);
            this.currentScene.camera.updateProjectionMatrix();
            if (this.currentScene instanceof GameScene) {
                this.currentScene.composer.render();
                if (this.currentScene.orbitals)
                    this.currentScene.orbitals.update();
            } else {
                this.currentScene.renderer.render(this.currentScene, this.currentScene.camera);
            }
        }

        requestAnimationFrame((nextTimestamp?: number) => this.animate(nextTimestamp));
    }

    ensureGameScene(speederIndex: number): GameScene {
        if (this.gameScene)
            this.gameScene.dispose();

        this.gameScene = new GameScene({
            canvas: this.gameCanvas,
            finishPreview: false,
            onExitToMenu: () => this.navigateToMenu(),
            onRestartRace: () => this.navigateToRace(speederIndex),
            speederIndex,
            ui: this.raceUi,
        });
        return this.gameScene;
    }

    getRoute(): AppRoute {
        let hash = window.location.hash || "#/menu";
        let [path, queryString] = hash.replace(/^#/, "").split("?");

        if (path === "/race") {
            let parameters = new URLSearchParams(queryString || "");
            let speederIndex = parseInt(parameters.get("speeder") || "0", 10);
            return {
                finishPreview: parameters.get("finishPreview") === "1",
                speederIndex: Number.isNaN(speederIndex) ? 0 : speederIndex,
                view: "race",
            };
        }

        return { view: "menu" };
    }

    navigateToMenu() {
        if (this.currentScene instanceof GameScene) {
            this.beginReturnToMenuTransition();
            return;
        }

        if (window.location.hash === "#/menu") {
            this.syncRoute();
            return;
        }

        window.location.hash = "#/menu";
    }

    navigateToRace(speederIndex: number) {
        let nextHash = `#/race?speeder=${speederIndex}`;
        if (window.location.hash === nextHash) {
            this.syncRoute();
            return;
        }

        window.location.hash = nextHash;
    }

    attachDebugRefs() {
        let debugWindow = window as DebugWindow;
        debugWindow.__appShell = this;
        debugWindow.__menuScene = this.menuScene;
        debugWindow.__gameScene = this.gameScene;
    }

    requireElement<T extends HTMLElement>(id: string): T {
        let element = document.getElementById(id);
        if (!element)
            throw new Error(`Expected element #${id} to exist.`);

        return element as T;
    }

    clearCurtainAnimations() {
        this.raceUi.curtain.classList.remove("fade-in", "fade-to-black", "long-fade-to-black", "scroll-up");
    }

    clearReturnToMenuTimeouts() {
        if (this.returnToMenuFadeTimeout) {
            window.clearTimeout(this.returnToMenuFadeTimeout);
            this.returnToMenuFadeTimeout = undefined;
        }

        if (this.returnToMenuSwitchTimeout) {
            window.clearTimeout(this.returnToMenuSwitchTimeout);
            this.returnToMenuSwitchTimeout = undefined;
        }
    }

    resetCurtain() {
        this.clearCurtainAnimations();
        this.raceUi.curtain.style.opacity = "0";
        this.raceUi.curtain.style.height = "100vh";
    }

    beginReturnToMenuTransition() {
        if (this.isReturningToMenuThroughCurtain)
            return;

        this.isReturningToMenuThroughCurtain = true;
        this.clearReturnToMenuTimeouts();
        this.resetCurtain();
        void this.raceUi.curtain.offsetWidth;
        this.raceUi.curtain.classList.add("long-fade-to-black");
        this.returnToMenuSwitchTimeout = window.setTimeout(() => {
            this.returnToMenuSwitchTimeout = undefined;
            if (window.location.hash === "#/menu")
                this.syncRoute();
            else
                window.location.hash = "#/menu";
        }, 580);
    }

    revealMenuFromCurtain() {
        this.clearReturnToMenuTimeouts();
        this.clearCurtainAnimations();
        this.raceUi.curtain.style.opacity = "1";
        this.raceUi.curtain.style.height = "100vh";
        void this.raceUi.curtain.offsetWidth;
        this.raceUi.curtain.classList.add("fade-in");
        this.returnToMenuFadeTimeout = window.setTimeout(() => {
            this.returnToMenuFadeTimeout = undefined;
            this.isReturningToMenuThroughCurtain = false;
            this.resetCurtain();
        }, 620);
    }

    setActiveView(view: "menu" | "race") {
        let showMenu = view === "menu";
        this.menuView.classList.toggle("is-active", showMenu);
        this.menuView.setAttribute("aria-hidden", showMenu ? "false" : "true");
        this.menuView.style.display = showMenu ? "block" : "none";
        this.raceView.classList.toggle("is-active", !showMenu);
        this.raceView.setAttribute("aria-hidden", showMenu ? "true" : "false");
        this.raceView.style.display = showMenu ? "none" : "block";
        this.raceUi.joystick.style.display = showMenu ? "none" : this.raceUi.joystick.style.display;
        if (showMenu) {
            if (!this.isReturningToMenuThroughCurtain)
                this.resetCurtain();
            this.raceUi.backgroundHost.style.background = "";
        }
    }

    start() {
        if (!window.location.hash)
            window.location.hash = "#/menu";

        this.syncRoute();
        this.animate();
    }

    syncRoute() {
        let route = this.getRoute();

        if (route.view === "menu") {
            if (this.gameScene) {
                this.gameScene.dispose();
                this.gameScene = null;
            }
            this.attachDebugRefs();
            this.menuScene.activate();
            this.menuScene.reset(this.isReturningToMenuThroughCurtain);
            this.currentScene = this.menuScene;
            this.setActiveView("menu");
            if (this.isReturningToMenuThroughCurtain)
                this.revealMenuFromCurtain();
            return;
        }

        this.menuScene.deactivate();
        let gameScene = this.ensureGameScene(route.speederIndex);
        gameScene.finishPreview = !!route.finishPreview;
        this.currentScene = gameScene;
        this.attachDebugRefs();
        this.setActiveView("race");
        gameScene.activate();
    }
}

let app = new AppShell();
app.start();
