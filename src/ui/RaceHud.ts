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
        let leftY = compactMode ? margin + 38 : margin + 44;
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
            this.drawText(
                this.state.countdownText,
                this.width / 2,
                this.height * 0.22,
                {
                    align: "center",
                    blur: 18,
                    color: "#fbfdff",
                    font: `600 ${this.clamp(this.width * 0.068, 46, 96)}px "Segoe UI", "Helvetica Neue", "Trebuchet MS", sans-serif`,
                    glow: "rgba(98, 216, 255, 0.52)",
                },
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
        this.drawText(
            label,
            anchorX,
            labelY,
            {
                align,
                blur: 6,
                color: "rgba(226, 245, 255, 0.82)",
                font: `500 ${Math.max(11, Math.round(options.valueSize * 0.38))}px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(88, 206, 255, 0.18)",
            },
        );
        this.drawText(
            value,
            anchorX,
            valueY,
            {
                align,
                blur: 10,
                color: "#f8fbff",
                font: `300 ${options.valueSize}px "Segoe UI", "Helvetica Neue", "Trebuchet MS", sans-serif`,
                glow: "rgba(88, 206, 255, 0.3)",
            },
        );
    }

    drawGearButton(x: number, y: number, size: number) {
        let context = this.context;
        let now = performance.now();
        let pressed = now < this.state.gearPressedUntilMs;
        let scale = pressed ? 0.9 : 1;
        let centerX = x + size / 2;
        let centerY = y + size / 2;
        let outerRadius = size * 0.42;
        let innerRadius = size * 0.15;

        context.save();
        context.translate(centerX, centerY);
        context.scale(scale, scale);
        context.strokeStyle = pressed ? "#f8fcff" : "rgba(238, 248, 255, 0.9)";
        context.lineWidth = 1.7;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.shadowColor = pressed ?
            "rgba(126, 224, 255, 0.5)" :
            "rgba(98, 210, 255, 0.28)";
        context.shadowBlur = pressed ? 12 : 8;

        for (let index = 0; index < 8; index++) {
            let angle = index * Math.PI / 4;
            let startRadius = size * 0.21;
            let endRadius = size * 0.31;
            context.beginPath();
            context.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
            context.lineTo(Math.cos(angle) * endRadius, Math.sin(angle) * endRadius);
            context.stroke();
        }

        context.beginPath();
        context.arc(0, 0, outerRadius - size * 0.12, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.arc(0, 0, innerRadius, 0, Math.PI * 2);
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
        let width = Math.min(this.width * 0.52, compactMode ? 330 : 400);
        let height = compactMode ? 256 : 276;
        let x = (this.width - width) / 2;
        let y = (this.height - height) / 2;
        let buttonHeight = compactMode ? 46 : 50;
        let buttonGap = 12;
        let buttonWidth = width - 44;
        let buttonX = x + 22;
        let firstButtonY = y + 86;
        let titleSize = compactMode ? 22 : 24;

        this.drawScreenTint("rgba(3, 8, 18, 0.18)");
        this.drawGlassCard(x, y, width, height);
        this.modalBounds = { height, width, x, y };

        this.drawText(
            "SETTINGS",
            x + width / 2,
            y + 42,
            {
                align: "center",
                blur: 12,
                color: "#fbfdff",
                font: `500 ${titleSize}px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(84, 205, 255, 0.22)",
            },
        );
        this.drawText(
            "Resume, restart or leave the race",
            x + width / 2,
            y + 64,
            {
                align: "center",
                blur: 6,
                color: "rgba(231, 244, 255, 0.6)",
                font: `400 ${compactMode ? 11 : 12}px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(84, 205, 255, 0.08)",
            },
        );

        this.drawOverlayActionButton(buttonX, firstButtonY, buttonWidth, buttonHeight, "RESUME");
        this.drawOverlayActionButton(
            buttonX,
            firstButtonY + buttonHeight + buttonGap,
            buttonWidth,
            buttonHeight,
            "RESTART RACE",
        );
        this.drawOverlayActionButton(
            buttonX,
            firstButtonY + (buttonHeight + buttonGap) * 2,
            buttonWidth,
            buttonHeight,
            "EXIT TO MENU",
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
        let compactMode = this.width < 860;
        let width = Math.min(this.width * 0.84, 920);
        let height = Math.min(this.height * 0.74, compactMode ? 720 : 640);
        let x = (this.width - width) / 2;
        let y = (this.height - height) / 2;
        let padding = compactMode ? 24 : 30;
        let headerBottom = y + 74;
        let actionsY = y + height - 42;
        let summaryWidth = compactMode ? width - padding * 2 : width * 0.35;
        let leaderboardX = compactMode ? x + padding : x + padding + summaryWidth + 26;
        let leaderboardWidth = compactMode ?
            width - padding * 2 :
            width - padding * 2 - summaryWidth - 26;
        let summaryX = x + padding;
        let summaryY = headerBottom + 18;
        let summaryHeight = compactMode ? 196 : height - 166;
        let leaderboardY = compactMode ? summaryY + summaryHeight + 24 : summaryY;
        let leaderboardHeight = compactMode ?
            height - (leaderboardY - y) - 88 :
            height - 166;
        let backX = x + width * 0.38;
        let retryX = x + width * 0.62;

        this.drawScreenTint("rgba(3, 7, 16, 0.12)");
        this.drawGlassCard(x, y, width, height);

        this.drawText(
            "RACE RESULTS",
            x + padding,
            y + 38,
            {
                align: "left",
                blur: 12,
                color: "#fbfdff",
                font: `500 ${compactMode ? 24 : 28}px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(85, 204, 255, 0.24)",
            },
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

        this.drawSummarySection(summaryX, summaryY, summaryWidth, summaryHeight, compactMode);
        if (!compactMode)
            this.drawHairline(leaderboardX - 14, summaryY, leaderboardX - 14, y + height - 78);
        this.drawLeaderboardSection(
            leaderboardX,
            leaderboardY,
            leaderboardWidth,
            leaderboardHeight,
            compactMode,
        );

        this.drawTextAction(backX, actionsY, "BACK");
        this.drawTextAction(retryX, actionsY, "RETRY");
        this.hitRegions.push(
            {
                action: "results-back",
                height: 30,
                width: 88,
                x: backX - 44,
                y: actionsY - 20,
            },
            {
                action: "results-retry",
                height: 30,
                width: 92,
                x: retryX - 46,
                y: actionsY - 20,
            },
        );
    }

    drawSummarySection(
        x: number,
        y: number,
        width: number,
        height: number,
        compactMode: boolean,
    ) {
        let statSpacing = compactMode ? 54 : 62;
        let labelsX = x;
        let statTop = y;
        let splitsTop = y + statSpacing * 3 + (compactMode ? 24 : 18);
        let lapTimes = this.state.lapTimes.length ?
            this.state.lapTimes :
            Array.from({ length: this.state.totalLaps }, () => "--:--:--");

        this.drawSectionHeading("SUMMARY", x, y - 2);
        this.drawSummaryMetric(labelsX, statTop + 28, "FINAL POSITION", `#${this.state.position}`);
        this.drawSummaryMetric(
            labelsX,
            statTop + 28 + statSpacing,
            "AVERAGE SPEED",
            `${this.state.averageSpeedKmh} KM/H`,
        );
        this.drawSummaryMetric(
            labelsX,
            statTop + 28 + statSpacing * 2,
            "FINISH TIME",
            this.state.finishTimeText,
        );

        this.drawSectionHeading("LAP SPLITS", x, splitsTop);
        for (let index = 0; index < lapTimes.length; index++) {
            let rowY = splitsTop + 28 + index * 32;
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

        if (lapTimes.length === 0) {
            this.drawText(
                "No laps recorded",
                x,
                splitsTop + 32,
                {
                    align: "left",
                    blur: 4,
                    color: "rgba(228, 243, 255, 0.56)",
                    font: `400 13px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(83, 203, 255, 0.08)",
                },
            );
        }

        void height;
    }

    drawLeaderboardSection(
        x: number,
        y: number,
        width: number,
        height: number,
        compactMode: boolean,
    ) {
        let entries = this.state.leaderboardEntries;
        let availableHeight = height - 36;
        let rowHeight = Math.max(28, Math.min(44, availableHeight / Math.max(entries.length, 5)));

        this.drawSectionHeading("LEADERBOARD", x, y - 2);
        for (let index = 0; index < entries.length; index++) {
            let entry = entries[index];
            let rowY = y + 30 + index * rowHeight;
            this.drawHairline(x, rowY + 18, x + width, rowY + 18);
            this.drawText(
                `${entry.place}`,
                x,
                rowY,
                {
                    align: "left",
                    blur: 4,
                    color: "rgba(248, 252, 255, 0.84)",
                    font: `500 ${compactMode ? 16 : 17}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(83, 203, 255, 0.12)",
                },
            );
            this.drawText(
                entry.label,
                x + 28,
                rowY,
                {
                    align: "left",
                    blur: entry.isPlayer ? 8 : 5,
                    color: entry.color,
                    font: `500 ${compactMode ? 15 : 16}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: entry.isPlayer ? `${entry.color}33` : `${entry.color}22`,
                },
            );
            this.drawText(
                entry.statusText,
                x + width,
                rowY - 2,
                {
                    align: "right",
                    blur: 4,
                    color: "rgba(223, 241, 255, 0.7)",
                    font: `500 ${compactMode ? 10 : 11}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(83, 203, 255, 0.08)",
                },
            );
            this.drawText(
                entry.timeText,
                x + width,
                rowY + 13,
                {
                    align: "right",
                    blur: 5,
                    color: "#f8fbff",
                    font: `400 ${compactMode ? 13 : 14}px "Segoe UI", "Helvetica Neue", sans-serif`,
                    glow: "rgba(83, 203, 255, 0.12)",
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
                blur: 4,
                color: "rgba(228, 243, 255, 0.68)",
                font: `500 12px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(83, 203, 255, 0.08)",
            },
        );
        this.drawText(
            value,
            x,
            y + 26,
            {
                align: "left",
                blur: 8,
                color: "#f8fbff",
                font: `300 24px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(83, 203, 255, 0.18)",
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
                blur: 6,
                color: "rgba(236, 246, 255, 0.84)",
                font: `500 14px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(83, 203, 255, 0.12)",
            },
        );
    }

    drawOverlayActionButton(x: number, y: number, width: number, height: number, label: string) {
        this.drawSoftPill(x, y, width, height);
        this.drawText(
            label,
            x + width / 2,
            y + height / 2 + 5,
            {
                align: "center",
                blur: 7,
                color: "#f8fbff",
                font: `500 15px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(83, 203, 255, 0.14)",
            },
        );
    }

    drawTextAction(centerX: number, centerY: number, text: string) {
        this.drawText(
            text,
            centerX,
            centerY,
            {
                align: "center",
                blur: 8,
                color: "#fbfdff",
                font: `500 22px "Segoe UI", "Helvetica Neue", sans-serif`,
                glow: "rgba(83, 203, 255, 0.2)",
            },
        );
    }

    drawGlassCard(x: number, y: number, width: number, height: number) {
        let context = this.context;
        let gradient = context.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, "rgba(18, 24, 34, 0.78)");
        gradient.addColorStop(1, "rgba(8, 14, 24, 0.68)");

        context.save();
        context.shadowColor = "rgba(29, 110, 168, 0.18)";
        context.shadowBlur = 28;
        context.fillStyle = gradient;
        context.strokeStyle = "rgba(235, 247, 255, 0.14)";
        context.lineWidth = 1;
        this.traceRoundedRect(x, y, width, height, 28);
        context.fill();
        context.stroke();

        context.strokeStyle = "rgba(108, 208, 255, 0.12)";
        this.traceRoundedRect(x + 1.5, y + 1.5, width - 3, height - 3, 26);
        context.stroke();

        let shine = context.createLinearGradient(x, y, x + width, y + height * 0.34);
        shine.addColorStop(0, "rgba(255, 255, 255, 0.12)");
        shine.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.fillStyle = shine;
        this.traceRoundedRect(x + 1, y + 1, width - 2, height * 0.46, 26);
        context.fill();
        context.restore();
    }

    drawSoftPill(x: number, y: number, width: number, height: number) {
        let context = this.context;
        let gradient = context.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.08)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.03)");

        context.save();
        context.fillStyle = gradient;
        context.strokeStyle = "rgba(235, 247, 255, 0.1)";
        context.lineWidth = 1;
        this.traceRoundedRect(x, y, width, height, height / 2);
        context.fill();
        context.stroke();
        context.restore();
    }

    drawHairline(startX: number, startY: number, endX: number, endY: number) {
        let context = this.context;
        context.save();
        context.strokeStyle = "rgba(236, 247, 255, 0.12)";
        context.lineWidth = 1;
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

    traceRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
        let context = this.context;
        let safeRadius = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + safeRadius, y);
        context.lineTo(x + width - safeRadius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        context.lineTo(x + width, y + height - safeRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        context.lineTo(x + safeRadius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        context.lineTo(x, y + safeRadius);
        context.quadraticCurveTo(x, y, x + safeRadius, y);
        context.closePath();
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
