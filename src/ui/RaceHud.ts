import * as THREE from "three";

type RaceHudAction =
    | "results-back"
    | "results-retry"
    | "settings-exit"
    | "settings-restart"
    | "settings-resume"
    | "toggle-settings";

type RaceHudClickRegion = {
    action: RaceHudAction;
    height: number;
    width: number;
    x: number;
    y: number;
};

type RaceHudLeaderboardEntry = {
    color: string;
    id: string;
    isPlayer: boolean;
    label: string;
    place: number;
    statusText: string;
    timeText: string;
};

type RaceHudState = {
    averageSpeedKmh: number;
    countdownText: string;
    currentLap: number;
    finishTimeText: string;
    gearPressedUntilMs: number;
    lapTimes: Array<string>;
    leaderboardEntries: Array<RaceHudLeaderboardEntry>;
    pressedAction: RaceHudAction | null;
    pressedUntilMs: number;
    position: number;
    resultsSubtitle: string;
    showResults: boolean;
    showSettings: boolean;
    speedKmh: number;
    timerText: string;
    totalLaps: number;
    totalVehicles: number;
};

export default class RaceHud {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    devicePixelRatio: number;
    height: number;
    hitRegions: Array<RaceHudClickRegion>;
    modalBounds?: { height: number; width: number; x: number; y: number; };
    state: RaceHudState;
    width: number;

    constructor(canvas: HTMLCanvasElement) {
        let context = canvas.getContext("2d");
        if (!context)
            throw new Error("Unable to create race HUD canvas context.");

        this.canvas = canvas;
        this.context = context;
        this.devicePixelRatio = 1;
        this.height = 0;
        this.hitRegions = [];
        this.state = this.createDefaultState();
        this.width = 0;
    }

    createDefaultState(): RaceHudState {
        return {
            averageSpeedKmh: 0,
            countdownText: "",
            currentLap: 1,
            finishTimeText: "00:00:00",
            gearPressedUntilMs: 0,
            lapTimes: [],
            leaderboardEntries: [],
            pressedAction: null,
            pressedUntilMs: 0,
            position: 1,
            resultsSubtitle: "RACE COMPLETE",
            showResults: false,
            showSettings: false,
            speedKmh: 0,
            timerText: "00:00:00",
            totalLaps: 2,
            totalVehicles: 5,
        };
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.devicePixelRatio = Math.max(window.devicePixelRatio || 1, 1);
        this.canvas.width = Math.floor(width * this.devicePixelRatio);
        this.canvas.height = Math.floor(height * this.devicePixelRatio);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }

    setState(state: RaceHudState) {
        this.state = state;
    }

    pressAction(action: RaceHudAction, durationMs = 120) {
        this.state.pressedAction = action;
        this.state.pressedUntilMs = performance.now() + durationMs;
    }

    hitTest(clientX: number, clientY: number): RaceHudAction | undefined {
        let bounds = this.canvas.getBoundingClientRect();
        let localX = clientX - bounds.left;
        let localY = clientY - bounds.top;

        for (let index = this.hitRegions.length - 1; index >= 0; index--) {
            let region = this.hitRegions[index];
            let withinX = localX >= region.x && localX <= region.x + region.width;
            let withinY = localY >= region.y && localY <= region.y + region.height;
            if (withinX && withinY)
                return region.action;
        }

        return undefined;
    }

    isPointInsideModal(clientX: number, clientY: number): boolean {
        if (!this.modalBounds)
            return false;

        let bounds = this.canvas.getBoundingClientRect();
        let localX = clientX - bounds.left;
        let localY = clientY - bounds.top;
        return localX >= this.modalBounds.x &&
            localX <= this.modalBounds.x + this.modalBounds.width &&
            localY >= this.modalBounds.y &&
            localY <= this.modalBounds.y + this.modalBounds.height;
    }

    render() {
        let context = this.context;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.setTransform(
            this.devicePixelRatio,
            0,
            0,
            this.devicePixelRatio,
            0,
            0,
        );

        this.hitRegions = [];
        this.modalBounds = undefined;

        if (!this.width || !this.height)
            return;

        this.drawHudFrame();

        if (this.state.showResults)
            this.drawResultsOverlay();

        if (this.state.showSettings)
            this.drawSettingsOverlay();
    }

    drawHudFrame() {
        let compactMode = this.width < 640;
        let margin = this.clamp(this.width * 0.035, 22, 38);
        let topBandHeight = compactMode ? 108 : 124;
        let gearSize = compactMode ? 26 : 30;
        let timerY = compactMode ? margin + 6 : margin + 8;
        let leftGap = compactMode ? 48 : 56;
        let speedY = margin + gearSize + (compactMode ? 32 : 38);

        this.drawTopAtmosphere(topBandHeight);
        this.drawMetricCluster(
            margin,
            timerY,
            "TIME",
            this.state.timerText,
            "left",
            {
                valueSize: compactMode ? 20 : 24,
            },
        );
        this.drawMetricCluster(
            margin,
            timerY + leftGap,
            "LAP",
            `${Math.min(this.state.currentLap, this.state.totalLaps)}/${this.state.totalLaps}`,
            "left",
            {
                valueSize: compactMode ? 24 : 28,
            },
        );
        this.drawMetricCluster(
            margin,
            timerY + leftGap * 2,
            "POS",
            `${Math.max(this.state.position, 1)}/${this.state.totalVehicles}`,
            "left",
            {
                valueSize: compactMode ? 20 : 24,
            },
        );
        this.drawGearButton(this.width - margin - gearSize, margin, gearSize);
        this.drawMetricCluster(
            this.width - margin,
            speedY,
            "KM/H",
            `${this.state.speedKmh}`,
            "right",
            {
                labelAbove: false,
                valueSize: compactMode ? 28 : 36,
            },
        );

        if (this.state.countdownText) {
            this.drawNeonCountdownText(
                this.state.countdownText,
                this.width / 2,
                this.height * 0.19,
                this.clamp(this.width * 0.068, 46, 96),
            );
        }
    }

    drawTopAtmosphere(height: number) {
        let context = this.context;
        let gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "rgba(6, 12, 22, 0.34)");
        gradient.addColorStop(0.6, "rgba(6, 12, 22, 0.12)");
        gradient.addColorStop(1, "rgba(6, 12, 22, 0)");

        context.save();
        context.fillStyle = gradient;
        context.fillRect(0, 0, this.width, height);
        context.restore();
    }

    drawMetricCluster(
        anchorX: number,
        anchorY: number,
        label: string,
        value: string,
        align: CanvasTextAlign,
        options: {
            labelAbove?: boolean;
            valueSize: number;
        },
    ) {
        let labelAbove = options.labelAbove !== false;
        let hairlineWidth = Math.max(56, options.valueSize * 2.1);
        let lineY = labelAbove ? anchorY + 10 : anchorY - 12;
        let labelY = labelAbove ? anchorY : anchorY + 20;
        let valueY = labelAbove ? anchorY + 30 : anchorY;
        let lineStartX = align === "right" ? anchorX - hairlineWidth :
            align === "center" ? anchorX - hairlineWidth / 2 :
                anchorX;
        let lineEndX = lineStartX + hairlineWidth;

        this.drawHairline(lineStartX, lineY, lineEndX, lineY);
        this.drawNeonHudText(
            label,
            anchorX,
            labelY,
            Math.max(11, Math.round(options.valueSize * 0.34)),
            align,
            "label",
        );
        this.drawNeonHudText(
            value,
            anchorX,
            valueY,
            options.valueSize,
            align,
            "value",
        );
    }

    drawGearButton(x: number, y: number, size: number) {
        let context = this.context;
        let now = performance.now();
        let pressed = now < this.state.gearPressedUntilMs;
        let scale = pressed ? 0.88 : 1;
        let centerX = x + size / 2;
        let centerY = y + size / 2;
        let toothCount = 6;
        let toothOuterRadius = size * 0.46;
        let toothInnerRadius = size * 0.32;
        let toothHalfAngle = Math.PI / 14;
        let innerRingRadius = size * 0.215;

        context.save();
        context.translate(centerX, centerY);
        context.scale(scale, scale);
        context.lineCap = "round";
        context.lineJoin = "round";

        context.beginPath();
        for (let index = 0; index < toothCount; index++) {
            let angle = -Math.PI / 2 + index * Math.PI * 2 / toothCount;
            let startAngle = angle - toothHalfAngle;
            let endAngle = angle + toothHalfAngle;
            let innerStartX = Math.cos(startAngle) * toothInnerRadius;
            let innerStartY = Math.sin(startAngle) * toothInnerRadius;
            let outerStartX = Math.cos(startAngle) * toothOuterRadius;
            let outerStartY = Math.sin(startAngle) * toothOuterRadius;
            let outerEndX = Math.cos(endAngle) * toothOuterRadius;
            let outerEndY = Math.sin(endAngle) * toothOuterRadius;
            let innerEndX = Math.cos(endAngle) * toothInnerRadius;
            let innerEndY = Math.sin(endAngle) * toothInnerRadius;

            if (!index)
                context.moveTo(innerStartX, innerStartY);
            else
                context.lineTo(innerStartX, innerStartY);

            context.lineTo(outerStartX, outerStartY);
            context.lineTo(outerEndX, outerEndY);
            context.lineTo(innerEndX, innerEndY);
        }
        context.closePath();

        context.shadowBlur = 0;
        context.lineWidth = 3;
        context.strokeStyle = "#0b2f62";
        context.stroke();

        context.beginPath();
        context.arc(0, 0, innerRingRadius, 0, Math.PI * 2);
        context.lineWidth = 2.4;
        context.strokeStyle = "#0b2f62";
        context.stroke();

        context.beginPath();
        for (let index = 0; index < toothCount; index++) {
            let angle = -Math.PI / 2 + index * Math.PI * 2 / toothCount;
            let startAngle = angle - toothHalfAngle;
            let endAngle = angle + toothHalfAngle;
            let innerStartX = Math.cos(startAngle) * toothInnerRadius;
            let innerStartY = Math.sin(startAngle) * toothInnerRadius;
            let outerStartX = Math.cos(startAngle) * toothOuterRadius;
            let outerStartY = Math.sin(startAngle) * toothOuterRadius;
            let outerEndX = Math.cos(endAngle) * toothOuterRadius;
            let outerEndY = Math.sin(endAngle) * toothOuterRadius;
            let innerEndX = Math.cos(endAngle) * toothInnerRadius;
            let innerEndY = Math.sin(endAngle) * toothInnerRadius;

            if (!index)
                context.moveTo(innerStartX, innerStartY);
            else
                context.lineTo(innerStartX, innerStartY);

            context.lineTo(outerStartX, outerStartY);
            context.lineTo(outerEndX, outerEndY);
            context.lineTo(innerEndX, innerEndY);
        }
        context.closePath();
        context.shadowColor = pressed ?
            "rgba(104, 228, 255, 0.5)" :
            "rgba(88, 214, 255, 0.34)";
        context.shadowBlur = pressed ? 18 : 12;
        context.lineWidth = 1.35;
        context.strokeStyle = "#63e9ff";
        context.stroke();

        context.beginPath();
        context.arc(0, 0, innerRingRadius, 0, Math.PI * 2);
        context.lineWidth = 1.25;
        context.strokeStyle = "#63e9ff";
        context.stroke();
        context.restore();

        this.hitRegions.push({
            action: "toggle-settings",
            height: size + 18,
            width: size + 18,
            x: x - 9,
            y: y - 9,
        });
    }

    drawSettingsOverlay() {
        let compactMode = this.width < 640;
        let width = Math.min(this.width * 0.52, compactMode ? 332 : 392);
        let height = compactMode ? 250 : 270;
        let x = (this.width - width) / 2;
        let y = (this.height - height) / 2;
        let buttonHeight = compactMode ? 40 : 42;
        let buttonGap = 14;
        let buttonWidth = width - 44;
        let buttonX = x + 22;
        let firstButtonY = y + 96;
        let titleSize = compactMode ? 22 : 24;

        this.drawScreenTint("rgba(3, 8, 18, 0)");
        this.drawGlassCard(x, y, width, height);
        this.modalBounds = { height, width, x, y };

        this.drawNeonHeadlineText(
            "SETTINGS",
            x + width / 2,
            y + 36,
            titleSize,
            "center",
        );
        this.drawHairline(x + 24, y + 54, x + width - 24, y + 54);
        this.drawText(
            "Resume, restart or leave the race",
            x + width / 2,
            y + 74,
            {
                align: "center",
                blur: 6,
                color: "rgba(231, 244, 255, 0.6)",
                font: `400 ${compactMode ? 11 : 12}px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(84, 205, 255, 0.08)",
            },
        );

        this.drawOverlayActionButton(
            buttonX,
            firstButtonY,
            buttonWidth,
            buttonHeight,
            "RESUME",
            "settings-resume",
        );
        this.drawOverlayActionButton(
            buttonX,
            firstButtonY + buttonHeight + buttonGap,
            buttonWidth,
            buttonHeight,
            "RESTART RACE",
            "settings-restart",
        );
        this.drawOverlayActionButton(
            buttonX,
            firstButtonY + (buttonHeight + buttonGap) * 2,
            buttonWidth,
            buttonHeight,
            "EXIT TO MENU",
            "settings-exit",
        );

        this.hitRegions.push(
            {
                action: "settings-resume",
                height: buttonHeight,
                width: buttonWidth,
                x: buttonX,
                y: firstButtonY,
            },
            {
                action: "settings-restart",
                height: buttonHeight,
                width: buttonWidth,
                x: buttonX,
                y: firstButtonY + buttonHeight + buttonGap,
            },
            {
                action: "settings-exit",
                height: buttonHeight,
                width: buttonWidth,
                x: buttonX,
                y: firstButtonY + (buttonHeight + buttonGap) * 2,
            },
        );
    }

    drawResultsOverlay() {
        let compactMode = this.width < 900;
        let width = Math.min(this.width * (compactMode ? 0.92 : 0.84), compactMode ? 700 : 940);
        let height = Math.min(this.height * 0.8, compactMode ? 760 : 650);
        let x = (this.width - width) / 2;
        let y = (this.height - height) / 2;
        let padding = compactMode ? 24 : 30;
        let headerBottom = y + 72;
        let buttonWidth = compactMode ? Math.min(170, (width - padding * 2 - 24) / 2) : 186;
        let buttonHeight = compactMode ? 44 : 46;
        let buttonGap = 24;
        let footerY = y + height - buttonHeight - 26;
        let contentTop = headerBottom + 20;
        let contentBottom = footerY - 34;
        let summaryWidth = compactMode ? width - padding * 2 : Math.min(292, width * 0.33);
        let columnGap = compactMode ? 0 : 28;
        let leaderboardX = compactMode ? x + padding : x + padding + summaryWidth + columnGap;
        let leaderboardWidth = compactMode ?
            width - padding * 2 :
            width - padding * 2 - summaryWidth - columnGap;
        let summaryX = x + padding;
        let summaryY = contentTop;
        let backX = x + width / 2 - buttonGap / 2 - buttonWidth;
        let retryX = x + width / 2 + buttonGap / 2;
        let summaryMetricsHeight = compactMode ? 188 : 198;
        let lapRowHeight = compactMode ? 30 : 32;
        let splitsHeight = 44 + Math.max(this.state.lapTimes.length, this.state.totalLaps) * lapRowHeight;
        let summaryBottom = summaryY + summaryMetricsHeight;
        let splitsY = summaryBottom + 18;
        let leaderboardY = compactMode ? splitsY + splitsHeight + 34 : contentTop;
        let leaderboardHeight = Math.max(150, contentBottom - leaderboardY);

        this.drawScreenTint("rgba(3, 7, 16, 0)");
        this.drawGlassCard(x, y, width, height);

        this.drawNeonHeadlineText(
            "RACE RESULTS",
            x + padding,
            y + 31,
            compactMode ? 24 : 28,
            "left",
        );
        this.drawText(
            this.state.resultsSubtitle,
            x + width - padding,
            y + 40,
            {
                align: "right",
                blur: 7,
                color: "rgba(231, 244, 255, 0.7)",
                font: `400 ${compactMode ? 12 : 13}px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(85, 204, 255, 0.12)",
            },
        );
        this.drawHairline(x + padding, headerBottom, x + width - padding, headerBottom);

        this.drawSummarySection(summaryX, summaryY, summaryWidth, compactMode);
        this.drawLapSplitsSection(
            summaryX,
            splitsY,
            summaryWidth,
            compactMode,
            Math.max(this.state.lapTimes.length, this.state.totalLaps),
        );
        if (!compactMode)
            this.drawHairline(leaderboardX - 14, summaryY, leaderboardX - 14, contentBottom);
        this.drawLeaderboardSection(
            leaderboardX,
            leaderboardY,
            leaderboardWidth,
            leaderboardHeight,
            compactMode,
        );

        this.drawOverlayActionButton(
            backX,
            footerY,
            buttonWidth,
            buttonHeight,
            "BACK",
            "results-back",
        );
        this.drawOverlayActionButton(
            retryX,
            footerY,
            buttonWidth,
            buttonHeight,
            "RETRY",
            "results-retry",
        );
        this.hitRegions.push(
            {
                action: "results-back",
                height: buttonHeight,
                width: buttonWidth,
                x: backX,
                y: footerY,
            },
            {
                action: "results-retry",
                height: buttonHeight,
                width: buttonWidth,
                x: retryX,
                y: footerY,
            },
        );
    }

    drawSummarySection(
        x: number,
        y: number,
        width: number,
        compactMode: boolean,
    ) {
        let statSpacing = compactMode ? 52 : 56;
        this.drawSectionHeading("SUMMARY", x, y - 2);
        this.drawSummaryMetric(x, y + 26, "FINAL POSITION", `#${this.state.position}`);
        this.drawSummaryMetric(
            x,
            y + 26 + statSpacing,
            "AVERAGE SPEED",
            `${this.state.averageSpeedKmh} KM/H`,
        );
        this.drawSummaryMetric(
            x,
            y + 26 + statSpacing * 2,
            "FINISH TIME",
            this.state.finishTimeText,
        );
        this.drawHairline(x, y + 26 + statSpacing * 3 + 2, x + width - 8, y + 26 + statSpacing * 3 + 2);
    }

    drawLapSplitsSection(
        x: number,
        y: number,
        width: number,
        compactMode: boolean,
        rowCount: number,
    ) {
        let lapTimes = this.state.lapTimes.length ?
            this.state.lapTimes :
            Array.from({ length: rowCount }, () => "--:--:--");

        this.drawSectionHeading("LAP SPLITS", x, y - 2);
        for (let index = 0; index < lapTimes.length; index++) {
            let rowY = y + 28 + index * (compactMode ? 30 : 32);
            this.drawHairline(x, rowY + 10, x + width - 10, rowY + 10);
            this.drawText(
                `LAP ${index + 1}`,
                x,
                rowY,
                {
                    align: "left",
                    blur: 4,
                    color: "rgba(228, 243, 255, 0.72)",
                    font: `500 ${compactMode ? 12 : 13}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(83, 203, 255, 0.08)",
                },
            );
            this.drawText(
                lapTimes[index],
                x + width - 12,
                rowY,
                {
                    align: "right",
                    blur: 6,
                    color: "#f8fbff",
                    font: `400 ${compactMode ? 16 : 18}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(83, 203, 255, 0.14)",
                },
            );
        }
    }

    drawLeaderboardSection(
        x: number,
        y: number,
        width: number,
        height: number,
        compactMode: boolean,
    ) {
        let entries = this.state.leaderboardEntries;
        let rowGap = compactMode ? 6 : 8;
        let availableHeight = Math.max(0, height - 34);
        let minRowHeight = compactMode ? 30 : 34;
        let maxRowHeight = compactMode ? 52 : 60;
        let rowHeight = entries.length ?
            Math.min(
                maxRowHeight,
                Math.max(minRowHeight, (availableHeight - rowGap * (entries.length - 1)) / entries.length),
            ) :
            minRowHeight;
        let statusColumnWidth = compactMode ? 108 : 126;
        let labelX = x + 34;
        let labelWidth = Math.max(72, width - statusColumnWidth - 42);

        this.drawSectionHeading("LEADERBOARD", x, y - 2);
        for (let index = 0; index < entries.length; index++) {
            let entry = entries[index];
            let rowY = y + 28 + index * (rowHeight + rowGap);
            this.drawOverlayRow(x, rowY - 16, width, rowHeight);
            this.drawText(
                `${entry.place}`,
                x + 2,
                rowY + 7,
                {
                    align: "left",
                    blur: 6,
                    color: "rgba(236, 251, 255, 0.92)",
                    font: `500 ${compactMode ? 16 : 17}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(96, 222, 255, 0.28)",
                },
            );
            this.drawText(
                this.fitText(entry.label, labelWidth, `500 ${compactMode ? 15 : 16}px "Segoe UI", "Helvetica Neue", sans-serif`),
                labelX,
                rowY + 7,
                {
                    align: "left",
                    blur: entry.isPlayer ? 10 : 7,
                    color: entry.color,
                    font: `500 ${compactMode ? 15 : 16}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: entry.isPlayer ? `${entry.color}55` : `${entry.color}33`,
                },
            );
            this.drawText(
                this.fitText(
                    entry.statusText,
                    statusColumnWidth,
                    `500 ${compactMode ? 10 : 11}px "Segoe UI", "Helvetica Neue", sans-serif`,
                ),
                x + width,
                rowY - 1,
                {
                    align: "right",
                    blur: 5,
                    color: "rgba(218, 246, 255, 0.76)",
                    font: `500 ${compactMode ? 10 : 11}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(96, 222, 255, 0.16)",
                },
            );
            this.drawText(
                this.fitText(
                    entry.timeText,
                    statusColumnWidth,
                    `400 ${compactMode ? 13 : 14}px "Segoe UI", "Helvetica Neue", sans-serif`,
                ),
                x + width,
                rowY + 18,
                {
                    align: "right",
                    blur: 8,
                    color: "#effcff",
                    font: `400 ${compactMode ? 13 : 14}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(96, 222, 255, 0.24)",
                },
            );
        }
    }

    drawSummaryMetric(x: number, y: number, label: string, value: string) {
        this.drawText(
            label,
            x,
            y,
            {
                align: "left",
                blur: 5,
                color: "rgba(212, 246, 255, 0.72)",
                font: `500 12px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(94, 220, 255, 0.14)",
            },
        );
        this.drawText(
            value,
            x,
            y + 26,
            {
                align: "left",
                blur: 10,
                color: "#effcff",
                font: `300 24px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(94, 220, 255, 0.26)",
            },
        );
    }

    drawSectionHeading(text: string, x: number, y: number) {
        this.drawText(
            text,
            x,
            y,
            {
                align: "left",
                blur: 8,
                color: "rgba(228, 250, 255, 0.9)",
                font: `500 14px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(96, 222, 255, 0.24)",
            },
        );
    }

    drawOverlayActionButton(
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        action: RaceHudAction,
    ) {
        let pressed = this.isActionPressed(action);
        this.drawHardEdgeButton(x, y, width, height, pressed);
        this.drawNeonActionText(
            label,
            x + width / 2,
            y + height / 2 + 1,
            pressed ? 18 : 17,
            pressed,
        );
    }

    drawGlassCard(x: number, y: number, width: number, height: number) {
        let context = this.context;
        context.save();
        context.shadowColor = "rgba(92, 220, 255, 0.3)";
        context.shadowBlur = 42;
        context.fillStyle = "rgba(52, 128, 186, 0.5)";
        context.strokeStyle = "rgba(126, 228, 255, 0.28)";
        context.lineWidth = 1.4;
        this.traceCutCornerRect(x, y, width, height, 12);
        context.fill();
        context.stroke();

        context.shadowColor = "rgba(86, 218, 255, 0.42)";
        context.shadowBlur = 28;
        context.strokeStyle = "rgba(116, 226, 255, 0.18)";
        context.lineWidth = 4;
        this.traceCutCornerRect(x, y, width, height, 12);
        context.stroke();

        context.strokeStyle = "rgba(176, 244, 255, 0.34)";
        context.shadowBlur = 20;
        context.lineWidth = 1.6;
        context.beginPath();
        context.moveTo(x + 22, y + 2);
        context.lineTo(x + width - 22, y + 2);
        context.stroke();

        context.beginPath();
        context.moveTo(x + 10, y + height - 8);
        context.lineTo(x + 36, y + height - 8);
        context.moveTo(x + width - 36, y + height - 8);
        context.lineTo(x + width - 10, y + height - 8);
        context.stroke();
        context.restore();
    }

    drawHardEdgeButton(x: number, y: number, width: number, height: number, pressed: boolean) {
        let context = this.context;
        let centerX = x + width / 2;
        let centerY = y + height / 2;

        context.save();
        context.translate(centerX, centerY);
        context.scale(pressed ? 0.962 : 1, pressed ? 0.94 : 1);
        context.translate(-centerX, -centerY);
        context.fillStyle = pressed ? "rgba(82, 203, 255, 0.24)" : "rgba(82, 203, 255, 0.17)";
        context.shadowColor = pressed ? "rgba(114, 228, 255, 0.42)" : "rgba(92, 214, 255, 0.3)";
        context.shadowBlur = pressed ? 34 : 24;
        this.traceCutCornerRect(x, y, width, height, 8);
        context.fill();

        context.strokeStyle = pressed ? "rgba(124, 232, 255, 0.34)" : "rgba(112, 224, 255, 0.24)";
        context.lineWidth = 1.4;
        context.shadowColor = pressed ? "rgba(120, 230, 255, 0.4)" : "rgba(94, 216, 255, 0.28)";
        context.shadowBlur = pressed ? 22 : 16;
        context.stroke();

        context.fillStyle = pressed ? "rgba(196, 248, 255, 0.16)" : "rgba(196, 248, 255, 0.11)";
        context.beginPath();
        context.moveTo(x + 18, y + 8);
        context.lineTo(x + width - 18, y + 8);
        context.lineTo(x + width - 30, y + 12);
        context.lineTo(x + 30, y + 12);
        context.closePath();
        context.fill();
        context.restore();
    }

    drawOverlayRow(x: number, y: number, width: number, height: number) {
        let context = this.context;
        context.save();
        context.shadowColor = "rgba(88, 210, 255, 0.14)";
        context.shadowBlur = 14;
        context.fillStyle = "rgba(98, 206, 255, 0.07)";
        this.traceCutCornerRect(x, y, width, height, 7);
        context.fill();

        context.shadowBlur = 0;
        context.fillStyle = "rgba(210, 248, 255, 0.08)";
        context.beginPath();
        context.moveTo(x + 14, y + 6);
        context.lineTo(x + width - 14, y + 6);
        context.lineTo(x + width - 24, y + 9);
        context.lineTo(x + 24, y + 9);
        context.closePath();
        context.fill();
        context.restore();
    }

    drawHairline(startX: number, startY: number, endX: number, endY: number) {
        let context = this.context;
        context.save();
        context.strokeStyle = "rgba(128, 224, 255, 0.18)";
        context.lineWidth = 1;
        context.shadowColor = "rgba(96, 222, 255, 0.16)";
        context.shadowBlur = 8;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
        context.restore();
    }

    drawText(
        text: string,
        x: number,
        y: number,
        options: {
            align: CanvasTextAlign;
            blur: number;
            color: string;
            font: string;
            glow: string;
        },
    ) {
        let context = this.context;
        context.save();
        context.textAlign = options.align;
        context.textBaseline = "alphabetic";
        context.font = options.font;
        context.fillStyle = options.color;
        context.shadowColor = options.glow;
        context.shadowBlur = options.blur;
        context.fillText(text, x, y);
        context.restore();
    }

    drawScreenTint(fill: string) {
        let context = this.context;
        context.save();
        context.fillStyle = fill;
        context.fillRect(0, 0, this.width, this.height);
        context.restore();
    }

    traceCutCornerRect(x: number, y: number, width: number, height: number, cut: number) {
        let context = this.context;
        let safeCut = Math.min(cut, width / 3, height / 3);
        context.beginPath();
        context.moveTo(x + safeCut, y);
        context.lineTo(x + width - safeCut, y);
        context.lineTo(x + width, y + safeCut);
        context.lineTo(x + width, y + height - safeCut);
        context.lineTo(x + width - safeCut, y + height);
        context.lineTo(x + safeCut, y + height);
        context.lineTo(x, y + height - safeCut);
        context.lineTo(x, y + safeCut);
        context.closePath();
    }

    drawNeonActionText(
        text: string,
        x: number,
        y: number,
        fontSize: number,
        pressed: boolean,
    ) {
        let context = this.context;
        let fillColor = pressed ? "#86f4ff" : "#58e7ff";
        let glowColor = pressed ? "#9af7ff" : "#4edcff";
        let highlightColor = "#f1ffff";

        context.save();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.lineCap = "round";
        context.font = `900 ${fontSize}px "Segoe UI", "Helvetica Neue", "Trebuchet MS", sans-serif`;

        let gradient = context.createLinearGradient(
            x,
            y - fontSize * 0.8,
            x,
            y + fontSize * 0.8,
        );
        gradient.addColorStop(0, highlightColor);
        gradient.addColorStop(0.36, fillColor);
        gradient.addColorStop(1, "#109cff");

        context.shadowBlur = 0;
        context.lineWidth = Math.max(3.5, Math.ceil(fontSize * 0.2));
        context.strokeStyle = "#0b2f62";
        context.strokeText(text, x, y);

        context.shadowBlur = pressed ? fontSize * 0.72 : fontSize * 0.56;
        context.shadowColor = glowColor;
        context.fillStyle = "rgba(112, 236, 255, 0.36)";
        context.fillText(text, x, y);

        context.shadowBlur = pressed ? fontSize * 0.48 : fontSize * 0.38;
        context.shadowColor = pressed ? "#a7fbff" : "#78efff";
        context.lineWidth = Math.max(1.6, Math.floor(fontSize * 0.06));
        context.strokeStyle = "rgba(138, 233, 255, 0.24)";
        context.fillStyle = gradient;
        context.fillText(text, x, y);
        context.strokeText(text, x, y);

        context.shadowBlur = 0;
        context.restore();
    }

    drawNeonHeadlineText(
        text: string,
        x: number,
        y: number,
        fontSize: number,
        align: CanvasTextAlign,
    ) {
        let context = this.context;
        let fillColor = "#5ae8ff";
        let glowColor = "#66e7ff";
        let highlightColor = "#f4ffff";

        context.save();
        context.textAlign = align;
        context.textBaseline = "top";
        context.lineJoin = "round";
        context.lineCap = "round";
        context.font = `900 ${fontSize}px "Segoe UI", "Helvetica Neue", "Trebuchet MS", sans-serif`;

        let gradient = context.createLinearGradient(
            x,
            y,
            x,
            y + fontSize * 1.2,
        );
        gradient.addColorStop(0, highlightColor);
        gradient.addColorStop(0.34, fillColor);
        gradient.addColorStop(1, "#109cff");

        context.shadowBlur = 0;
        context.lineWidth = Math.max(3.5, Math.ceil(fontSize * 0.18));
        context.strokeStyle = "#0b2f62";
        context.strokeText(text, x, y);

        context.shadowBlur = fontSize * 0.5;
        context.shadowColor = glowColor;
        context.fillStyle = "rgba(122, 238, 255, 0.28)";
        context.fillText(text, x, y);

        context.shadowBlur = fontSize * 0.34;
        context.shadowColor = "#7ceeff";
        context.lineWidth = Math.max(1.5, Math.floor(fontSize * 0.06));
        context.strokeStyle = "rgba(170, 241, 255, 0.2)";
        context.fillStyle = gradient;
        context.fillText(text, x, y);
        context.strokeText(text, x, y);
        context.restore();
    }

    drawNeonHudText(
        text: string,
        x: number,
        y: number,
        fontSize: number,
        align: CanvasTextAlign,
        variant: "label" | "value",
    ) {
        let context = this.context;
        let isLabel = variant === "label";
        let fillColor = isLabel ? "#8feeff" : "#66e8ff";
        let glowColor = isLabel ? "#5ddcff" : "#67e6ff";
        let highlightColor = "#f4ffff";
        let weight = isLabel ? "700" : "400";

        context.save();
        context.textAlign = align;
        context.textBaseline = "alphabetic";
        context.lineJoin = "round";
        context.lineCap = "round";
        context.font = `${weight} ${fontSize}px "Segoe UI", "Helvetica Neue", "Trebuchet MS", sans-serif`;

        let gradient = context.createLinearGradient(
            x,
            y - fontSize,
            x,
            y + fontSize * 0.35,
        );
        gradient.addColorStop(0, highlightColor);
        gradient.addColorStop(0.34, fillColor);
        gradient.addColorStop(1, "#109cff");

        context.shadowBlur = 0;
        context.lineWidth = Math.max(1.2, fontSize * (isLabel ? 0.14 : 0.11));
        context.strokeStyle = isLabel ? "rgba(11, 47, 98, 0.86)" : "rgba(11, 47, 98, 0.92)";
        context.strokeText(text, x, y);

        context.shadowBlur = fontSize * (isLabel ? 0.42 : 0.34);
        context.shadowColor = glowColor;
        context.fillStyle = isLabel ? "rgba(132, 238, 255, 0.16)" : "rgba(122, 238, 255, 0.22)";
        context.fillText(text, x, y);

        context.shadowBlur = fontSize * (isLabel ? 0.28 : 0.24);
        context.shadowColor = isLabel ? "#63e4ff" : "#7ceeff";
        context.lineWidth = Math.max(0.8, fontSize * (isLabel ? 0.05 : 0.04));
        context.strokeStyle = isLabel ? "rgba(160, 241, 255, 0.14)" : "rgba(170, 241, 255, 0.18)";
        context.fillStyle = gradient;
        context.fillText(text, x, y);
        context.strokeText(text, x, y);
        context.restore();
    }

    drawNeonCountdownText(text: string, x: number, y: number, fontSize: number) {
        let context = this.context;
        let gradient = context.createLinearGradient(
            x,
            y - fontSize,
            x,
            y + fontSize,
        );
        gradient.addColorStop(0, "#fbffff");
        gradient.addColorStop(0.32, "#7cebff");
        gradient.addColorStop(1, "#149cff");

        context.save();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.lineCap = "round";
        context.font = `800 ${fontSize}px "Segoe UI", "Helvetica Neue", "Trebuchet MS", sans-serif`;

        context.shadowBlur = 0;
        context.lineWidth = Math.max(4, fontSize * 0.16);
        context.strokeStyle = "#0b2f62";
        context.strokeText(text, x, y);

        context.shadowBlur = fontSize * 0.62;
        context.shadowColor = "#67e7ff";
        context.fillStyle = "rgba(128, 238, 255, 0.28)";
        context.fillText(text, x, y);

        context.shadowBlur = fontSize * 0.4;
        context.shadowColor = "#92f5ff";
        context.lineWidth = Math.max(1.5, fontSize * 0.05);
        context.strokeStyle = "rgba(176, 244, 255, 0.18)";
        context.fillStyle = gradient;
        context.fillText(text, x, y);
        context.strokeText(text, x, y);
        context.restore();
    }

    isActionPressed(action: RaceHudAction): boolean {
        return this.state.pressedAction === action && performance.now() < this.state.pressedUntilMs;
    }

    fitText(text: string, maxWidth: number, font: string): string {
        let context = this.context;
        context.save();
        context.font = font;
        if (context.measureText(text).width <= maxWidth) {
            context.restore();
            return text;
        }

        let ellipsis = "...";
        let ellipsisWidth = context.measureText(ellipsis).width;
        let trimmed = text;
        while (trimmed.length > 1 && context.measureText(trimmed).width + ellipsisWidth > maxWidth)
            trimmed = trimmed.slice(0, -1);

        context.restore();
        return `${trimmed}${ellipsis}`;
    }

    clamp(value: number, min: number, max: number): number {
        return THREE.MathUtils.clamp(value, min, max);
    }
}

export {
    RaceHudAction,
    RaceHudLeaderboardEntry,
    RaceHudState,
};
