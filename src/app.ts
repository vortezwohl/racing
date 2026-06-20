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
    menuCanvas: HTMLCanvasElement;
    menuScene: MenuScene;
    menuView: HTMLElement;
    raceUi: RaceUi;
    raceView: HTMLElement;

    constructor() {
        this.currentScene = null;
        this.currentTime = 0;
        this.gameCanvas = this.requireElement<HTMLCanvasElement>("game");
        this.gameScene = null;
        this.menuCanvas = this.requireElement<HTMLCanvasElement>("menu");
        this.menuView = this.requireElement<HTMLElement>("menu-view");
        this.raceView = this.requireElement<HTMLElement>("race-view");
        this.raceUi = {
            backgroundHost: document.body,
            counter: this.requireElement<HTMLElement>("counter"),
            countdown: this.requireElement<HTMLElement>("countdown"),
            curtain: this.requireElement<HTMLElement>("curtain"),
            dashboard: this.requireElement<HTMLElement>("dashboard"),
            finishRank: this.requireElement<HTMLElement>("finish-rank"),
            finishRankSuffix: this.requireElement<HTMLElement>("finish-rank-suffix"),
            finishScreen: this.requireElement<HTMLElement>("finish-screen"),
            finishTime: this.requireElement<HTMLElement>("finish-time"),
            joystick: this.requireElement<HTMLElement>("joystick"),
            knob: this.requireElement<HTMLElement>("knob"),
            markerHost: this.requireElement<HTMLElement>("marker-layer"),
            timer: this.requireElement<HTMLElement>("timer"),
        };
        this.raceUi.curtain.style.position = "fixed";
        this.raceUi.curtain.style.inset = "0";
        this.raceUi.curtain.style.zIndex = "20";
        this.raceUi.markerHost.style.position = "absolute";
        this.raceUi.markerHost.style.inset = "0";
        this.raceUi.markerHost.style.zIndex = "12";
        this.raceUi.markerHost.style.pointerEvents = "none";
        this.raceUi.finishScreen.style.position = "absolute";
        this.raceUi.finishScreen.style.inset = "0";
        this.raceUi.finishScreen.style.zIndex = "30";

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
        if (window.location.hash === "#/menu") {
            this.syncRoute();
            return;
        }

        window.location.hash = "#/menu";
    }

    navigateToRace(speederIndex: number) {
        window.location.hash = `#/race?speeder=${speederIndex}`;
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

    setActiveView(view: "menu" | "race") {
        let showMenu = view === "menu";
        this.menuView.classList.toggle("is-active", showMenu);
        this.menuView.setAttribute("aria-hidden", showMenu ? "false" : "true");
        this.menuView.style.display = showMenu ? "block" : "none";
        this.raceView.classList.toggle("is-active", !showMenu);
        this.raceView.setAttribute("aria-hidden", showMenu ? "true" : "false");
        this.raceView.style.display = showMenu ? "none" : "block";
        this.raceUi.dashboard.style.display = showMenu ? "none" : this.raceUi.dashboard.style.display;
        this.raceUi.joystick.style.display = showMenu ? "none" : this.raceUi.joystick.style.display;
        if (showMenu) {
            this.raceUi.finishScreen.style.display = "none";
            this.raceUi.curtain.classList.remove("fade-in", "fade-to-black", "long-fade-to-black", "scroll-up");
            this.raceUi.curtain.style.opacity = "0";
            this.raceUi.curtain.style.height = "100vh";
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
            this.menuScene.reset();
            this.currentScene = this.menuScene;
            this.setActiveView("menu");
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
