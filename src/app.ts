import { RaceUi } from "./utils/interfaces";
import type GameScene from "./scenes/GameScene";
import type MenuScene from "./scenes/MenuScene";

type AppRoute =
    | { view: "menu" }
    | {
        disableAudio?: boolean;
        disablePostProcessing?: boolean;
        finishPreview?: boolean;
        observeMode?: boolean;
        safeMode?: boolean;
        speederIndex: number;
        view: "race";
    };

type BootState =
    | "booting"
    | "loading-modules"
    | "constructing-shell"
    | "starting"
    | "syncing-route"
    | "running"
    | "failed";

type GameSceneClass = typeof import("./scenes/GameScene").default;
type MenuSceneClass = typeof import("./scenes/MenuScene").default;

type DebugWindow = Window & typeof globalThis & {
    __appShell?: AppShell;
    __bootError?: {
        message: string;
        stack?: string;
        state: BootState;
        timestamp: string;
    };
    __bootState?: BootState;
    __gameScene?: GameScene | null;
    __menuScene?: MenuScene;
    __npcPlannerDebug?: unknown;
};

const getDebugWindow = (): DebugWindow => window as DebugWindow;

const setBootState = (state: BootState) => {
    getDebugWindow().__bootState = state;
};

const normalizeError = (error: unknown): Error => {
    if (error instanceof Error)
        return error;

    if (typeof error === "string")
        return new Error(error);

    return new Error("Unknown boot error.");
};

const renderBootErrorPanel = (error: Error) => {
    let existing = document.getElementById("boot-error-panel");
    if (existing)
        existing.remove();

    let panel = document.createElement("section");
    panel.id = "boot-error-panel";
    panel.setAttribute("role", "alert");
    panel.style.position = "fixed";
    panel.style.inset = "0";
    panel.style.zIndex = "9999";
    panel.style.padding = "24px";
    panel.style.overflow = "auto";
    panel.style.background =
        "linear-gradient(180deg, rgba(7,11,20,0.98) 0%, rgba(3,6,12,0.98) 100%)";
    panel.style.color = "#d8f3ff";
    panel.style.fontFamily = "\"Trebuchet MS\", \"Verdana\", sans-serif";

    let title = document.createElement("h1");
    title.textContent = "启动失败";
    title.style.margin = "0 0 12px";
    title.style.fontSize = "28px";
    panel.appendChild(title);

    let summary = document.createElement("p");
    summary.textContent = error.message || "Unknown boot error.";
    summary.style.margin = "0 0 16px";
    summary.style.fontSize = "16px";
    summary.style.lineHeight = "1.5";
    panel.appendChild(summary);

    let hint = document.createElement("p");
    hint.textContent =
        "请检查 window.__bootState 和 window.__bootError，或使用 safeMode/observe 参数重试。";
    hint.style.margin = "0 0 16px";
    hint.style.color = "#8ad8ff";
    panel.appendChild(hint);

    let pre = document.createElement("pre");
    pre.textContent = error.stack || error.message;
    pre.style.margin = "0";
    pre.style.padding = "16px";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-word";
    pre.style.border = "1px solid rgba(120, 210, 255, 0.25)";
    pre.style.background = "rgba(10, 21, 40, 0.72)";
    pre.style.borderRadius = "12px";
    panel.appendChild(pre);

    document.body.appendChild(panel);
};

const reportBootError = (error: unknown) => {
    let normalizedError = normalizeError(error);
    let debugWindow = getDebugWindow();
    let state = debugWindow.__bootState || "failed";
    debugWindow.__bootState = "failed";
    debugWindow.__bootError = {
        message: normalizedError.message,
        stack: normalizedError.stack,
        state,
        timestamp: new Date().toISOString(),
    };
    console.error("[boot] failed", normalizedError);
    renderBootErrorPanel(normalizedError);
};

window.addEventListener("error", (event: ErrorEvent) => {
    reportBootError(event.error || event.message);
});

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    reportBootError(event.reason);
});

class AppShell {
    GameSceneClass: GameSceneClass;
    MenuSceneClass: MenuSceneClass;
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
    runtimeRoute: AppRoute;

    constructor(sceneConstructors: {
        GameScene: GameSceneClass;
        MenuScene: MenuSceneClass;
    }) {
        setBootState("constructing-shell");
        this.GameSceneClass = sceneConstructors.GameScene;
        this.MenuSceneClass = sceneConstructors.MenuScene;
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
        this.runtimeRoute = this.getRoute();
        this.raceUi.curtain.style.position = "fixed";
        this.raceUi.curtain.style.inset = "0";
        this.raceUi.curtain.style.zIndex = "20";
        this.raceUi.markerHost.style.position = "absolute";
        this.raceUi.markerHost.style.inset = "0";
        this.raceUi.markerHost.style.zIndex = "12";
        this.raceUi.markerHost.style.pointerEvents = "none";

        this.menuScene = new this.MenuSceneClass({
            canvas: this.menuCanvas,
            curtain: this.raceUi.curtain,
            disableAudio: this.runtimeRoute.view === "race" ?
                !!this.runtimeRoute.disableAudio :
                false,
            disablePostProcessing: this.runtimeRoute.view === "race" ?
                !!this.runtimeRoute.disablePostProcessing :
                false,
            onPlay: (speederIndex: number) => {
                this.navigateToRace(speederIndex);
            },
            safeMode: this.runtimeRoute.view === "race" ?
                !!this.runtimeRoute.safeMode :
                false,
        });
        this.attachDebugRefs();

        window.addEventListener("hashchange", () => {
            this.syncRoute();
        });
    }

    animate(timestamp?: number) {
        let safeTimestamp = timestamp ?? this.currentTime;
        let dt = 0;
        if (this.currentTime > 0)
            dt = Math.min(Math.max(safeTimestamp - this.currentTime, 0), 33.34);
        this.currentTime = safeTimestamp;

        if (this.currentScene) {
            this.currentScene.update(dt);
            this.currentScene.camera.updateProjectionMatrix();
            if (this.currentScene instanceof this.GameSceneClass) {
                if (this.currentScene.composer)
                    this.currentScene.composer.render();
                else
                    this.currentScene.renderer.render(
                        this.currentScene,
                        this.currentScene.camera,
                    );
                if (this.currentScene.orbitals)
                    this.currentScene.orbitals.update();
            } else {
                if (this.currentScene.composer)
                    this.currentScene.composer.render();
                else
                    this.currentScene.renderer.render(
                        this.currentScene,
                        this.currentScene.camera,
                    );
            }
        }

        requestAnimationFrame((nextTimestamp?: number) => this.animate(nextTimestamp));
    }

    ensureGameScene(speederIndex: number): GameScene {
        if (this.gameScene)
            this.gameScene.dispose();

        let route = this.runtimeRoute.view === "race" ?
            this.runtimeRoute :
            {
                disableAudio: false,
                disablePostProcessing: false,
                finishPreview: false,
                observeMode: false,
                safeMode: false,
                speederIndex,
                view: "race" as const,
            };
        this.gameScene = new this.GameSceneClass({
            canvas: this.gameCanvas,
            disableAudio: !!route.disableAudio,
            disablePostProcessing: !!route.disablePostProcessing,
            finishPreview: !!route.finishPreview,
            observeMode: !!route.observeMode,
            onExitToMenu: () => this.navigateToMenu(),
            onRestartRace: () => this.navigateToRace(speederIndex),
            safeMode: !!route.safeMode,
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
            let safeMode = parameters.get("safeMode") === "1";
            let observeMode = parameters.get("observe") === "1" ||
                parameters.get("observeMode") === "1";
            let disableAudio = safeMode || parameters.get("disableAudio") === "1";
            let disablePostProcessing = safeMode ||
                parameters.get("disablePostProcessing") === "1";
            return {
                disableAudio,
                disablePostProcessing,
                finishPreview: parameters.get("finishPreview") === "1",
                observeMode,
                safeMode,
                speederIndex: Number.isNaN(speederIndex) ? 0 : speederIndex,
                view: "race",
            };
        }

        return { view: "menu" };
    }

    navigateToMenu() {
        if (this.currentScene instanceof this.GameSceneClass) {
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
        let route = this.runtimeRoute.view === "race" ?
            this.runtimeRoute :
            undefined;
        let parameters = new URLSearchParams();
        parameters.set("speeder", `${speederIndex}`);
        if (route?.finishPreview)
            parameters.set("finishPreview", "1");
        if (route?.safeMode)
            parameters.set("safeMode", "1");
        if (route?.observeMode)
            parameters.set("observe", "1");
        if (route?.disableAudio)
            parameters.set("disableAudio", "1");
        if (route?.disablePostProcessing)
            parameters.set("disablePostProcessing", "1");
        let nextHash = `#/race?${parameters.toString()}`;
        if (window.location.hash === nextHash) {
            this.syncRoute();
            return;
        }

        window.location.hash = nextHash;
    }

    attachDebugRefs() {
        let debugWindow = getDebugWindow();
        debugWindow.__appShell = this;
        debugWindow.__menuScene = this.menuScene;
        debugWindow.__gameScene = this.gameScene;
        debugWindow.__npcPlannerDebug = this.gameScene?.npcPlannerClient?.getDebugSnapshot();
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

    syncActiveSceneViewport() {
        window.requestAnimationFrame(() => {
            if (this.currentScene instanceof this.GameSceneClass)
                this.currentScene.syncViewport();
            else if (this.currentScene instanceof this.MenuSceneClass)
                this.currentScene.syncViewport();
        });
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

        this.syncActiveSceneViewport();
    }

    start() {
        setBootState("starting");
        if (!window.location.hash)
            window.location.hash = "#/menu";

        this.syncRoute();
        this.animate();
        setBootState("running");
    }

    syncRoute() {
        setBootState("syncing-route");
        let route = this.getRoute();
        this.runtimeRoute = route;

        if (route.view === "menu") {
            this.menuScene.disableAudio = false;
            this.menuScene.disablePostProcessing = false;
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

        this.menuScene.disableAudio = !!route.disableAudio;
        this.menuScene.disablePostProcessing = !!route.disablePostProcessing;
        this.menuScene.deactivate();
        let gameScene = this.ensureGameScene(route.speederIndex);
        this.currentScene = gameScene;
        this.attachDebugRefs();
        this.setActiveView("race");
        gameScene.activate();
    }
}

setBootState("booting");

async function bootstrapApp() {
    try {
        setBootState("loading-modules");
        let [{ default: GameSceneModule }, { default: MenuSceneModule }] = await Promise.all([
            import("./scenes/GameScene"),
            import("./scenes/MenuScene"),
        ]);
        let app = new AppShell({
            GameScene: GameSceneModule,
            MenuScene: MenuSceneModule,
        });
        app.start();
    } catch (error) {
        reportBootError(error);
    }
}

void bootstrapApp();
