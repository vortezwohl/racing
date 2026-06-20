import * as THREE from "three";
import { TrackData } from "../../src/utils/interfaces";

let track_1: TrackData = {
    startPoint: new THREE.Vector3(0, 0, 0),
    startDirection: new THREE.Vector3(1, 0, 0),
    startRotation: new THREE.Euler(0, Math.PI / 2, 0, "YZX"),
    curveData: [
        {
            points: [[-100, 0, 0], [150, 0, 0]],
            extrudeShapeIndex: 0
        },
        {
            points: [[150, 0, 8], [200, 0, 8], [250, -10, 8],
                [300, 0, 8], [350, 10, 8], [400, 0, 8],
                [450, -10, 8], [500, 0, 8], [550, 0, 8]],
            extrudeShapeIndex: 1,
            extrudeOptions: { steps: 180, bevelEnabled: true }
        },
        {
            points: [[150, 0, -8], [200, 0, -8], [250, 10, -8],
                [300, 0, -8], [350, -10, -8], [400, 0, -8],
                [450, 10, -8], [500, 0, -8], [550, 0, -8]],
            extrudeShapeIndex: 1,
            extrudeOptions: { steps: 180, bevelEnabled: true }
        },
        {
            points: [[550, 0, 50]],
            extrudeShapeIndex: 2,
            ellipse: true,
            radius: [50, 50],
            angles: [3 * Math.PI / 2, 0]
        },
        {
            points: [[600, 0, 50], [600, 0, 100], [550, 8, 200], [480, 8, 220], [400, -16, 200], 
                [200, -24, -120], [120, -20, -150], [100, -12, -150]],
            extrudeShapeIndex: 2,
            extrudeOptions: { steps: 320, bevelEnabled: true }
        },
        {
            points: [[50, -20, -150], [0, -20, -150], [-100, 24, -150], [-150, 24, -150]],
            extrudeShapeIndex: 4
        },
        {
            points: [[-150, 24, -158], [-180, 24, -158], [-210, 24, -160], [-240, 24, -180],
                [-310, 24, -180], [-340, 24, -160], [-370, 24, -158], [-400, 24, -158]],
            extrudeShapeIndex: 3
        },
        {
            points: [[-150, 24, -142], [-180, 24, -142], [-210, 24, -140], [-240, 24, -120],
                [-310, 24, -120], [-340, 24, -140], [-370, 24, -142], [-400, 24, -142]],
            extrudeShapeIndex: 3
        },
        {
            points: [[-400, 24, -75]],
            extrudeShapeIndex: 2,
            ellipse: true,
            radius: [75, 75],
            angles: [-Math.PI / 2, -3 * Math.PI / 2],
            clockwise: true
        },
        {
            points: [[-400, 24, 0], [-320, 24, 0], [-240, 16, 0], [-160, 32, 0]],
            extrudeShapeIndex: 0
        }
    ],
    layerData: [
        {
            shapes: [[[16, 0], [-16, 0]], [[8, 0], [-8, 0]],
                [[0, 16], [0, -16]], [[0, 8], [0, -8]], [[16, 0], [-16, 0]]],
            material: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        },
        {
            shapes: [[[15, -0.4], [16, -0.4]], [[7, -0.4], [8, -0.4]],
                [[0.4, 15], [0.4, 16]], [[0.4, 7], [0.4, 8]], [[15, 0.4], [16, 0.4]]],
            material: new THREE.MeshLambertMaterial({ color: 0xd2f2ff })
        },
        {
            shapes: [[[-15, -0.4], [-16, -0.4]], [[-7, -0.4], [-8, -0.4]],
                [[0.4, -15], [0.4, -16]], [[0.4, -7], [0.4, -8]], [[-15, 0.4], [-16, 0.4]]],
            material: new THREE.MeshStandardMaterial({
                color: 0xb8e6ff,
                emissive: 0x1e4d78,
                emissiveIntensity: 0.18,
                roughness: 0.52,
                metalness: 0.08
            })
        },
        {
            shapes: [[[15, -0.4], [-15, -0.4]], [[7, -0.4], [-7, -0.4]],
                [[0.4, 15], [0.4, -15]], [[0.4, 7], [0.4, -7]], [[15, 0.4], [-15, 0.4]]],
            material: new THREE.MeshLambertMaterial({ color: 0x77ace0, transparent: true, opacity: 0.32 })
        }
    ],
    checkpoints: [
        {
            position: new THREE.Vector3(50, 0, 0),
            resetDirection: new THREE.Vector3(1, 0, 0),
            resetRotation: new THREE.Euler(0, Math.PI / 2, 0, "YZX"),
            height: 100
        },
        {
            position: new THREE.Vector3(550, 0, 0),
            resetDirection: new THREE.Vector3(1, 0, 0),
            resetRotation: new THREE.Euler(0, Math.PI / 2, 0, "YZX"),
        },
        {
            position: new THREE.Vector3(280, -24, 0),
            resetDirection: new THREE.Vector3(-1, 0, -1).normalize(),
            resetRotation: new THREE.Euler(0, 5 * Math.PI / 4, 0, "YZX"),
        },
        {
            position: new THREE.Vector3(-150, 24, -150),
            resetDirection: new THREE.Vector3(-1, 0, 0).normalize(),
            resetRotation: new THREE.Euler(0, -Math.PI / 2, 0, "YZX"),
            height: 100
        },
        {
            position: new THREE.Vector3(-320, 24, 0),
            resetDirection: new THREE.Vector3(1, 0, 0).normalize(),
            resetRotation: new THREE.Euler(0, Math.PI / 2, 0, "YZX"),
        }
    ],
    backgroundColors: ["#03040c", "#05081a", "#020208"],
    backgroundStyle: "radial-gradient(circle at 18% 18%, rgba(72, 112, 196, 0.56), transparent 31%), radial-gradient(circle at 82% 12%, rgba(168, 96, 214, 0.72), transparent 40%), linear-gradient(180deg, #03040c 0%, #091226 52%, #020208 100%)",
    signsPoints: [
        {
            points: [[550, 1, 50]],
            ellipse: true,
            radius: [75, 75],
            angles: [3 * Math.PI / 2, 0],
            extrudeShape: new THREE.Shape([new THREE.Vector2(1, 0), new THREE.Vector2(0, 0)])
        },   
        {
            points: [[-400, 13, -75]],
            ellipse: true,
            radius: [100, 100],
            angles: [-Math.PI / 2, -3 * Math.PI / 2],
            clockwise: true,
            extrudeShape: new THREE.Shape([new THREE.Vector2(1, 0), new THREE.Vector2(0, 0)])
        },
        {
            points: [[-215, 13, -149], [-235, 13, -135]],
            clockwise: true,
            extrudeShape: new THREE.Shape([new THREE.Vector2(1, 0), new THREE.Vector2(0, 0)])
        },
        {
            points: [[-215, 13, -151], [-235, 13, -165]],
            extrudeShape: new THREE.Shape([new THREE.Vector2(1, 0), new THREE.Vector2(0, 0)]),
            textureRotation: Math.PI / 2
        }
    ]
}

export default track_1;
