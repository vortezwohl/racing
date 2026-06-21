import {
    NpcAssistScalars,
    NpcRacecraftIntent,
} from "./types";

const neutralAssists: NpcAssistScalars = {
    brake: 1,
    draft: 1,
    grip: 1,
    racecraft: 1,
    recovery: 1,
    steer: 1,
};

const buildAssistScalars = (
    intent: NpcRacecraftIntent,
    configured: NpcAssistScalars = neutralAssists,
): NpcAssistScalars => {
    let recoveryBoost = intent.mode === "recover" ? configured.recovery : 1;
    let racecraftBoost = (
        intent.mode === "attack" ||
        intent.mode === "block" ||
        intent.mode === "overtake"
    ) ? configured.racecraft : 1;
    let draftBoost = intent.mode === "draft" ? configured.draft : 1;

    return {
        brake: configured.brake * recoveryBoost,
        draft: draftBoost,
        grip: configured.grip * recoveryBoost,
        racecraft: racecraftBoost,
        recovery: recoveryBoost,
        steer: configured.steer * recoveryBoost,
    };
};

export {
    buildAssistScalars,
    neutralAssists,
};
