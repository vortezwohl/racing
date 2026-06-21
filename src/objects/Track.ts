import * as THREE from "three";
import { toVectorArray, toShapeArray } from "../utils/geometry";
import {
    CurveData,
    LayerData,
    Platform,
    CheckpointData,
    Checkpoint,
    TrackData,
} from "../utils/interfaces";
import { debugAxes, debugPoints, debugLine, debugVector } from "../utils/debug";
import { Sign, StartLine } from "../decorations/decorations";

type TrackSegmentType = "corner" | "hairpin" | "straight" | "sweeper";

type TrackPlanningSample = {
    arcLength: number;
    corridorHalfWidth: number;
    cornerSign: number;
    curvature: number;
    headingChange: number;
    index: number;
    lateral: THREE.Vector3;
    linkedCornerSign: number;
    linkedCornerStrength: number;
    point: THREE.Vector3;
    segmentType: TrackSegmentType;
    signedCurvature: number;
    tangent: THREE.Vector3;
    up: THREE.Vector3;
};

type TrackRelativePosition = {
    arcLength: number;
    corridorHalfWidth: number;
    curvature: number;
    distanceToCenter: number;
    index: number;
    lateral: THREE.Vector3;
    lateralOffset: number;
    point: THREE.Vector3;
    signedCurvature: number;
    tangent: THREE.Vector3;
};

type TrackFutureContext = {
    averageCurvature: number;
    cornerSign: number;
    linkedCornerSign: number;
    linkedCornerStrength: number;
    maxCurvature: number;
    segmentType: TrackSegmentType;
    straightDistance: number;
};

export default class Track {
    startPoint: THREE.Vector3;
    startDirection: THREE.Vector3;
    startRotation: THREE.Euler;

    body: THREE.Mesh;
    checkpoints: Array<Checkpoint>;
    movingPlatforms: Array<Platform>;
    elapsedTime: number;

    pathPoints: Array<THREE.Vector3>;
    pathVectors: Array<THREE.Vector3>;
    pathArcLengths: Array<number>;
    pathCurvatures: Array<number>;
    pathLaterals: Array<THREE.Vector3>;
    pathPlanningSamples: Array<TrackPlanningSample>;
    pathSegmentTypes: Array<TrackSegmentType>;
    pathCorridorHalfWidths: Array<number>;
    totalPathLength: number;

    constructor(scene: THREE.Scene, trackData: TrackData, debug?: boolean) {
        this.startPoint = trackData.startPoint;
        this.startDirection = trackData.startDirection;
        this.startRotation = trackData.startRotation;

        this.elapsedTime = 0;

        this.pathPoints = [];
        this.pathVectors = [];
        this.pathArcLengths = [];
        this.pathCurvatures = [];
        this.pathLaterals = [];
        this.pathPlanningSamples = [];
        this.pathSegmentTypes = [];
        this.pathCorridorHalfWidths = [];
        this.totalPathLength = 0;

        this.createCheckpoints(trackData.checkpoints, scene, debug);
        this.render(scene, trackData, debug);
    }

    createCheckpoints(
        checkpointData: Array<CheckpointData>,
        scene: THREE.Scene,
        debug?: boolean,
    ) {
        this.checkpoints = [];

        let material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            side: THREE.DoubleSide,
            transparent: !debug,
            opacity: 0,
        });

        for (let i = 0; i < checkpointData.length; i++) {
            let data = checkpointData[i];
            let width = data.width || 48;
            let height = data.height || 8;

            let geometry = new THREE.PlaneGeometry(width, height);
            let mesh = new THREE.Mesh(geometry, material);

            mesh.position.set(data.position.x, data.position.y, data.position.z);
            mesh.setRotationFromEuler(data.resetRotation);
            scene.add(mesh);

            let checkpoint: Checkpoint = {
                mesh,
                resetDirection: data.resetDirection,
                resetRotation: data.resetRotation,
                index: i + 1,
            };

            this.checkpoints.push(checkpoint);
        }
    }

    resetPathData() {
        this.pathPoints = [];
        this.pathVectors = [];
        this.pathArcLengths = [];
        this.pathCurvatures = [];
        this.pathLaterals = [];
        this.pathPlanningSamples = [];
        this.pathSegmentTypes = [];
        this.pathCorridorHalfWidths = [];
        this.totalPathLength = 0;
    }

    createPathVectors(
        points: Array<THREE.Vector3>,
        divisions: number,
        debug?: boolean,
        scene?: THREE.Scene,
        capturePath: boolean = true,
    ) {
        for (let i = 0; i < divisions - 1; i++) {
            let p1 = points[i].clone();
            let p2 = points[i + 1].clone();

            let directionVector = p2.clone().sub(p1.clone());
            directionVector.normalize();

            if (capturePath) {
                this.pathPoints.push(p1.clone());
                this.pathVectors.push(directionVector.clone());
            }

            if (debug) {
                let origin = p1.clone();
                origin.y += 0.5;
                debugVector(scene, directionVector, origin, 2, 0x00ff00);
            }
        }
    }

    createCatmullRom(
        points: Array<THREE.Vector3>,
        closed: boolean,
        divisions: number,
        extrudeShape: THREE.Shape,
        extrudeOptions: THREE.ExtrudeGeometryOptions,
        material: THREE.Material,
        debug?: boolean,
        scene?: THREE.Scene,
        capturePath: boolean = true,
    ): THREE.Mesh {
        if (debug && scene)
            debugPoints(scene, points, 0x00ffff);

        let curve = new THREE.CatmullRomCurve3(points, closed);
        points = curve.getPoints(divisions);
        this.createPathVectors(points, divisions, debug, scene, capturePath);

        if (debug && scene)
            debugLine(scene, points, 0x00ffff);

        extrudeOptions.extrudePath = curve;

        let geometry = new THREE.ExtrudeGeometry(extrudeShape, extrudeOptions);
        let mesh = new THREE.Mesh(geometry, material);

        return mesh;
    }

    createEllipse(
        origin: THREE.Vector3,
        radius: [x: number, y: number],
        angles: [start: number, end: number],
        clockwise: boolean,
        divisions: number,
        extrudeShape: THREE.Shape,
        extrudeOptions: THREE.ExtrudeGeometryOptions,
        material: THREE.Material,
        debug?: boolean,
        scene?: THREE.Scene,
        capturePath: boolean = true,
    ): THREE.Mesh {
        if (debug && scene)
            debugPoints(scene, [origin], 0x00ffff);

        let ellipse = new THREE.EllipseCurve(
            origin.x,
            origin.z,
            radius[0],
            radius[1],
            angles[0],
            angles[1],
            clockwise,
            0,
        );

        let curve = new THREE.CurvePath<THREE.Vector3>();
        let points = ellipse.getPoints(divisions).map((point) =>
            new THREE.Vector3(point.x, origin.y, point.y),
        );
        this.createPathVectors(points, divisions, debug, scene, capturePath);

        if (debug && scene)
            debugLine(scene, points, 0x00ffff);

        for (let i = 0; i < divisions; i++)
            curve.add(new THREE.LineCurve3(points[i], points[i + 1]));

        extrudeOptions.extrudePath = curve;

        let geometry = new THREE.ExtrudeGeometry(extrudeShape, extrudeOptions);
        let mesh = new THREE.Mesh(geometry, material);

        return mesh;
    }

    createPlatform(mesh: THREE.Mesh, data: CurveData) {
        let platform: Platform = {
            mesh,
            origin: mesh.position.clone(),
            movingDirection: data.movingDirection,
            period: data.period,
            phase: data.phase,
        };

        this.movingPlatforms.push(platform);
    }

    createTrack(
        curveData: Array<CurveData>,
        layer: LayerData,
        debug?: boolean,
        scene?: THREE.Scene,
        capturePath: boolean = false,
    ): THREE.Mesh {
        let meshes: Array<THREE.Mesh> = [];

        let extrudeShapes = toShapeArray(layer.shapes);
        let defaultExtrudeOptions = { steps: 100, bevelEnabled: true };

        for (let data of curveData) {
            let mesh: THREE.Mesh;

            let points = toVectorArray(data.points);
            let divisions = data.divisions || 100;
            let extrudeShape = extrudeShapes[data.extrudeShapeIndex];
            let extrudeOptions = data.extrudeOptions || defaultExtrudeOptions;
            let material = layer.material;

            if (data.ellipse) {
                mesh = this.createEllipse(
                    points[0],
                    data.radius,
                    data.angles,
                    data.clockwise,
                    divisions,
                    extrudeShape,
                    extrudeOptions,
                    material,
                    debug,
                    scene,
                    capturePath,
                );
            } else {
                let closed = data.closed || false;
                mesh = this.createCatmullRom(
                    points,
                    closed,
                    divisions,
                    extrudeShape,
                    extrudeOptions,
                    material,
                    debug,
                    scene,
                    capturePath,
                );
            }

            if (data.moving)
                this.createPlatform(mesh, data);
            else
                meshes.push(mesh);
        }

        let track = meshes.shift();
        for (let mesh of meshes)
            track.add(mesh);

        return track;
    }

    wrapPathIndex(index: number): number {
        let count = this.pathPoints.length;
        if (!count)
            return 0;

        return ((index % count) + count) % count;
    }

    getPlanningCorridorHalfWidth(point: THREE.Vector3): number {
        let checkpointWidth = this.checkpoints.reduce((maxWidth, checkpoint) => {
            let geometry = checkpoint.mesh.geometry;
            geometry.computeBoundingBox();
            let checkpointWidth = geometry.boundingBox ?
                geometry.boundingBox.max.x - geometry.boundingBox.min.x :
                0;
            return Math.max(maxWidth, checkpointWidth);
        }, 0);
        let inferredWidth = checkpointWidth > 0 ? checkpointWidth * 0.18 : 2.8;
        let altitudeFactor = THREE.MathUtils.clamp(1 - point.y * 0.008, 0.72, 1.05);
        return inferredWidth * altitudeFactor;
    }

    classifySegment(curvature: number): TrackSegmentType {
        if (curvature > 0.12)
            return "hairpin";
        if (curvature > 0.05)
            return "corner";
        if (curvature > 0.015)
            return "sweeper";
        return "straight";
    }

    buildPlanningSamples() {
        let count = this.pathPoints.length;
        if (!count) {
            this.totalPathLength = 0;
            return;
        }

        this.pathArcLengths = new Array(count).fill(0);
        this.pathCurvatures = new Array(count).fill(0);
        this.pathLaterals = new Array(count).fill(new THREE.Vector3(1, 0, 0));
        this.pathSegmentTypes = new Array(count).fill("straight");
        this.pathCorridorHalfWidths = new Array(count).fill(0);
        this.pathPlanningSamples = new Array(count);

        let cumulativeLength = 0;
        for (let i = 1; i < count; i++) {
            cumulativeLength += this.pathPoints[i - 1].distanceTo(this.pathPoints[i]);
            this.pathArcLengths[i] = cumulativeLength;
        }
        this.totalPathLength = cumulativeLength +
            this.pathPoints[count - 1].distanceTo(this.pathPoints[0]);

        for (let i = 0; i < count; i++) {
            let previousIndex = this.wrapPathIndex(i - 1);
            let nextIndex = this.wrapPathIndex(i + 1);
            let previousPoint = this.pathPoints[previousIndex];
            let currentPoint = this.pathPoints[i];
            let nextPoint = this.pathPoints[nextIndex];
            let previousTangent = this.pathVectors[previousIndex].clone().normalize();
            let tangent = this.pathVectors[i].clone().normalize();
            let nextTangent = this.pathVectors[nextIndex].clone().normalize();
            let up = new THREE.Vector3(0, 1, 0);
            let lateral = up.clone().cross(tangent);
            if (lateral.lengthSq() < 0.0001)
                lateral.set(1, 0, 0);
            lateral.normalize();

            let directionDelta = previousTangent.angleTo(nextTangent);
            let deltaCross = previousTangent.clone().cross(nextTangent);
            let sign = Math.sign(deltaCross.dot(up)) || 0;
            let averageSegmentLength = Math.max(
                previousPoint.distanceTo(currentPoint) +
                currentPoint.distanceTo(nextPoint),
                0.0001,
            );
            let signedCurvature = sign * directionDelta / averageSegmentLength;
            let curvature = Math.abs(signedCurvature);
            let corridorHalfWidth = this.getPlanningCorridorHalfWidth(currentPoint);

            this.pathLaterals[i] = lateral.clone();
            this.pathCurvatures[i] = curvature;
            this.pathCorridorHalfWidths[i] = corridorHalfWidth;
            this.pathSegmentTypes[i] = this.classifySegment(curvature);
            this.pathPlanningSamples[i] = {
                arcLength: this.pathArcLengths[i],
                corridorHalfWidth,
                cornerSign: sign,
                curvature,
                headingChange: directionDelta,
                index: i,
                lateral: lateral.clone(),
                linkedCornerSign: 0,
                linkedCornerStrength: 0,
                point: currentPoint.clone(),
                segmentType: this.pathSegmentTypes[i],
                signedCurvature,
                tangent: tangent.clone(),
                up: up.clone(),
            };
        }

        let linkedWindow = Math.max(6, Math.floor(count * 0.015));
        for (let i = 0; i < count; i++) {
            let weightedSign = 0;
            let weightedCurvature = 0;
            for (let offset = 1; offset <= linkedWindow; offset++) {
                let sample = this.pathPlanningSamples[this.wrapPathIndex(i + offset)];
                let weight = 1 - offset / (linkedWindow + 1);
                weightedSign += sample.cornerSign * sample.curvature * weight;
                weightedCurvature += sample.curvature * weight;
            }

            this.pathPlanningSamples[i].linkedCornerSign = Math.sign(weightedSign) || 0;
            this.pathPlanningSamples[i].linkedCornerStrength = THREE.MathUtils.clamp(
                weightedCurvature * 18,
                0,
                1,
            );
        }

        for (let i = 0; i < count; i++) {
            let sample = this.pathPlanningSamples[i];
            let segmentScale = sample.segmentType === "hairpin" ?
                0.76 :
                sample.segmentType === "corner" ?
                    0.84 :
                    sample.segmentType === "sweeper" ?
                        0.92 :
                        1;
            let curvatureScale = THREE.MathUtils.clamp(
                1 - sample.curvature * 2.6,
                0.72,
                1,
            );
            let linkedScale = THREE.MathUtils.lerp(
                1,
                0.88,
                sample.linkedCornerStrength,
            );
            sample.corridorHalfWidth *= segmentScale * curvatureScale * linkedScale;
            this.pathCorridorHalfWidths[i] = sample.corridorHalfWidth;
        }
    }

    getPlanningSample(index: number): TrackPlanningSample {
        return this.pathPlanningSamples[this.wrapPathIndex(index)];
    }

    findPathIndexAtArcLength(arcLength: number): number {
        if (!this.pathArcLengths.length || this.totalPathLength <= 0)
            return 0;

        let wrappedArcLength = this.normalizeArcLength(arcLength);
        for (let i = 0; i < this.pathArcLengths.length - 1; i++) {
            if (wrappedArcLength >= this.pathArcLengths[i] &&
                wrappedArcLength < this.pathArcLengths[i + 1]) {
                return i;
            }
        }
        return this.pathArcLengths.length - 1;
    }

    normalizeArcLength(arcLength: number): number {
        if (this.totalPathLength <= 0)
            return 0;

        return ((arcLength % this.totalPathLength) + this.totalPathLength) %
            this.totalPathLength;
    }

    getPlanningDistance(fromArcLength: number, toArcLength: number): number {
        if (this.totalPathLength <= 0)
            return 0;

        let from = this.normalizeArcLength(fromArcLength);
        let to = this.normalizeArcLength(toArcLength);
        let distance = to - from;
        if (distance < 0)
            distance += this.totalPathLength;
        return distance;
    }

    getSignedArcDistance(fromArcLength: number, toArcLength: number): number {
        if (this.totalPathLength <= 0)
            return 0;

        let distance = this.getPlanningDistance(fromArcLength, toArcLength);
        if (distance > this.totalPathLength * 0.5)
            distance -= this.totalPathLength;
        return distance;
    }

    samplePlanningAtArcLength(arcLength: number): TrackPlanningSample {
        if (!this.pathPlanningSamples.length) {
            return {
                arcLength: 0,
                corridorHalfWidth: 0,
                cornerSign: 0,
                curvature: 0,
                headingChange: 0,
                index: 0,
                lateral: new THREE.Vector3(1, 0, 0),
                linkedCornerSign: 0,
                linkedCornerStrength: 0,
                point: new THREE.Vector3(),
                segmentType: "straight",
                signedCurvature: 0,
                tangent: new THREE.Vector3(0, 0, 1),
                up: new THREE.Vector3(0, 1, 0),
            };
        }

        let wrappedArcLength = this.normalizeArcLength(arcLength);
        let currentIndex = this.findPathIndexAtArcLength(wrappedArcLength);
        let nextIndex = this.wrapPathIndex(currentIndex + 1);
        let current = this.pathPlanningSamples[currentIndex];
        let next = this.pathPlanningSamples[nextIndex];
        let segmentLength = this.getPlanningDistance(current.arcLength, next.arcLength);
        let localDistance = this.getPlanningDistance(current.arcLength, wrappedArcLength);
        let ratio = segmentLength > 0.0001 ? localDistance / segmentLength : 0;
        let tangent = current.tangent.clone().lerp(next.tangent, ratio).normalize();
        let lateral = current.lateral.clone().lerp(next.lateral, ratio);
        if (lateral.lengthSq() < 0.0001)
            lateral.copy(current.lateral);
        lateral.normalize();

        return {
            arcLength: wrappedArcLength,
            corridorHalfWidth: THREE.MathUtils.lerp(
                current.corridorHalfWidth,
                next.corridorHalfWidth,
                ratio,
            ),
            cornerSign: current.cornerSign || next.cornerSign,
            curvature: THREE.MathUtils.lerp(current.curvature, next.curvature, ratio),
            headingChange: THREE.MathUtils.lerp(
                current.headingChange,
                next.headingChange,
                ratio,
            ),
            index: currentIndex,
            lateral,
            linkedCornerSign: current.linkedCornerSign || next.linkedCornerSign,
            linkedCornerStrength: THREE.MathUtils.lerp(
                current.linkedCornerStrength,
                next.linkedCornerStrength,
                ratio,
            ),
            point: current.point.clone().lerp(next.point, ratio),
            segmentType: current.segmentType,
            signedCurvature: THREE.MathUtils.lerp(
                current.signedCurvature,
                next.signedCurvature,
                ratio,
            ),
            tangent,
            up: current.up.clone(),
        };
    }

    findNearestPlanningIndex(
        position: THREE.Vector3,
        previousIndex: number = 0,
        searchCount: number = 80,
        fallbackDistanceSq: number = 196,
    ): number {
        if (!this.pathPoints.length)
            return 0;

        let nearestDistance = Infinity;
        let nearestIndex = this.wrapPathIndex(previousIndex);
        let boundedSearchCount = Math.min(this.pathPoints.length, searchCount);

        for (let offset = 0; offset < boundedSearchCount; offset++) {
            let index = this.wrapPathIndex(nearestIndex + offset);
            let distance = position.distanceToSquared(this.pathPoints[index]);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        }

        if (nearestDistance > fallbackDistanceSq) {
            for (let index = 0; index < this.pathPoints.length; index++) {
                let distance = position.distanceToSquared(this.pathPoints[index]);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            }
        }

        return nearestIndex;
    }

    worldToTrackPosition(
        position: THREE.Vector3,
        previousIndex: number = 0,
    ): TrackRelativePosition {
        let index = this.findNearestPlanningIndex(position, previousIndex);
        let sample = this.getPlanningSample(index);
        let offset = position.clone().sub(sample.point);

        return {
            arcLength: sample.arcLength,
            corridorHalfWidth: sample.corridorHalfWidth,
            curvature: sample.curvature,
            distanceToCenter: offset.length(),
            index,
            lateral: sample.lateral.clone(),
            lateralOffset: offset.dot(sample.lateral),
            point: sample.point.clone(),
            signedCurvature: sample.signedCurvature,
            tangent: sample.tangent.clone(),
        };
    }

    trackToWorldPosition(arcLength: number, lateralOffset: number): THREE.Vector3 {
        let sample = this.samplePlanningAtArcLength(arcLength);
        return sample.point.clone().add(
            sample.lateral.clone().multiplyScalar(lateralOffset),
        );
    }

    getFutureTrackContext(
        arcLength: number,
        previewDistance: number,
    ): TrackFutureContext {
        if (!this.pathPlanningSamples.length) {
            return {
                averageCurvature: 0,
                cornerSign: 0,
                linkedCornerSign: 0,
                linkedCornerStrength: 0,
                maxCurvature: 0,
                segmentType: "straight",
                straightDistance: 0,
            };
        }

        let start = this.normalizeArcLength(arcLength);
        let maxCurvature = 0;
        let curvatureAccumulator = 0;
        let weightAccumulator = 0;
        let strongestSignValue = 0;
        let straightDistance = 0;
        let sampleCount = 10;

        for (let step = 1; step <= sampleCount; step++) {
            let distance = previewDistance * (step / sampleCount);
            let sample = this.samplePlanningAtArcLength(start + distance);
            let weight = 1 - (step - 1) / sampleCount;
            maxCurvature = Math.max(maxCurvature, sample.curvature);
            curvatureAccumulator += sample.curvature * weight;
            weightAccumulator += weight;
            strongestSignValue += sample.signedCurvature * weight;

            if (sample.segmentType === "straight" || sample.segmentType === "sweeper")
                straightDistance = distance;
        }

        let referenceSample = this.samplePlanningAtArcLength(start + previewDistance * 0.35);
        let averageCurvature = weightAccumulator > 0 ?
            curvatureAccumulator / weightAccumulator :
            0;

        return {
            averageCurvature,
            cornerSign: Math.sign(strongestSignValue) || referenceSample.cornerSign,
            linkedCornerSign: referenceSample.linkedCornerSign,
            linkedCornerStrength: referenceSample.linkedCornerStrength,
            maxCurvature,
            segmentType: this.classifySegment(maxCurvature),
            straightDistance,
        };
    }

    render(scene: THREE.Scene, trackData: TrackData, debug?: boolean) {
        if (debug)
            debugAxes(scene);

        let background = trackData.backgroundStyle ||
            `linear-gradient(${trackData.backgroundColors.join(", ")})`;
        let raceUi = scene.userData.raceUi;
        if (raceUi?.backgroundHost)
            raceUi.backgroundHost.style.background = background;

        if (trackData.gridColor) {
            let grid = new THREE.GridHelper(
                1000,
                1000,
                trackData.gridColor,
                trackData.gridColor,
            );
            scene.add(grid);
        }

        this.movingPlatforms = [];
        this.resetPathData();

        let [collisionLayer, ...visibleLayers] = trackData.layerData;
        this.body = this.createTrack(
            trackData.curveData,
            collisionLayer,
            debug,
            scene,
            true,
        );
        this.buildPlanningSamples();
        scene.add(this.body);

        for (let layerData of visibleLayers) {
            let layer = this.createTrack(
                trackData.curveData,
                layerData,
                debug,
                scene,
                false,
            );
            scene.add(layer);
        }

        for (let platform of this.movingPlatforms)
            scene.add(platform.mesh);

        new StartLine(
            this.checkpoints[0].mesh.position,
            this.checkpoints[0].mesh.rotation,
            scene,
        );

        for (let signPoints of trackData.signsPoints || [])
            new Sign(signPoints, scene);
    }

    getTimeString() {
        let minutes = this.elapsedTime / 60000;
        let seconds = (this.elapsedTime % 60000) / 1000;
        let centiseconds = (this.elapsedTime / 10) % 100;

        let timeUnitStrings = [minutes, seconds, centiseconds]
            .map((t) => Math.floor(t).toString().padStart(2, "0"));
        return timeUnitStrings.join(":");
    }

    update(dt?: number) {
        if (!dt)
            return;

        this.elapsedTime += dt;

        for (let platform of this.movingPlatforms) {
            let time = (this.elapsedTime + platform.phase) % platform.period;
            let phase = 2 * Math.PI * (time / platform.period);

            let offset = platform.movingDirection.clone()
                .multiplyScalar(Math.sin(phase));

            let position = platform.origin.clone()
                .add(offset);

            platform.mesh.position.set(position.x, position.y, position.z);
        }
    }
}

export {
    TrackFutureContext,
    TrackPlanningSample,
    TrackRelativePosition,
    TrackSegmentType,
};
