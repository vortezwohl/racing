import { VehicleData } from "../../src/utils/interfaces";
import bike from "./bike";
import mustang from "./mustang";
import speeder_1 from "./speeder_1";
import speeder_2 from "./speeder_2";
import speeder_3 from "./speeder_3";

interface MenuVehicle {
    id: string;
    label: string;
    playableIndex: number;
    accentColor: number;
    menuScaleMultiplier: number;
    titleColor: string;
    titleShadowColor: string;
    data: VehicleData;
}

let speeders = [speeder_1, speeder_2, speeder_3];

let menuVehicles: Array<MenuVehicle> = [
    {
        id: "sunbeam",
        label: "Sunbeam",
        playableIndex: 0,
        accentColor: 0xffb347,
        menuScaleMultiplier: 1.04,
        titleColor: "#ffd27a",
        titleShadowColor: "#9f5f16",
        data: speeder_1
    },
    {
        id: "lime-glide",
        label: "Lime Glide",
        playableIndex: 1,
        accentColor: 0xd3f36b,
        menuScaleMultiplier: 1.08,
        titleColor: "#dcff86",
        titleShadowColor: "#4e7320",
        data: speeder_2
    },
    {
        id: "cherry-flash",
        label: "Cherry Flash",
        playableIndex: 2,
        accentColor: 0xff7a90,
        menuScaleMultiplier: 1.11,
        titleColor: "#ffb2c0",
        titleShadowColor: "#8a2d47",
        data: speeder_3
    },
    {
        id: "bunny-bike",
        label: "Bunny Bike",
        playableIndex: 3,
        accentColor: 0x82d7ff,
        menuScaleMultiplier: 1.28,
        titleColor: "#bde8ff",
        titleShadowColor: "#2a5f86",
        data: bike
    },
    {
        id: "sunny-mustang",
        label: "Sunny Mustang",
        playableIndex: 4,
        accentColor: 0xffd86b,
        menuScaleMultiplier: 1.18,
        titleColor: "#ffe6a4",
        titleShadowColor: "#8d6722",
        data: mustang
    }
];

export {
    MenuVehicle,
    bike,
    menuVehicles,
    mustang,
    speeders
}
