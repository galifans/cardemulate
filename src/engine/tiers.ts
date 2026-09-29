/**
 * 稀有度档位的展示元数据：中文名、主色、发光强度。
 * 卡面统一使用 public/card-art.svg，按档位把主色混进去，做出「平行彩虹」的差异。
 */

import type { Tier } from "./types";

export interface TierMeta {
    key: Tier;
    name: string;
    /** 主色（用于标签、边框、光晕、卡图染色） */
    color: string;
    /** 次级色 */
    accent: string;
    /** 卡面叠加强度，0-1 */
    glow: number;
    order: number;
}

export const TIERS: Record<Tier, TierMeta> = {
    common: {
        key: "common",
        name: "普卡",
        color: "#8b95a8",
        accent: "#5b6478",
        glow: 0,
        order: 1,
    },
    uncommon: {
        key: "uncommon",
        name: "反射卡",
        color: "#5fd0a8",
        accent: "#1f7f5f",
        glow: 0.18,
        order: 2,
    },
    rare: {
        key: "rare",
        name: "插入卡",
        color: "#5aa9ff",
        accent: "#1f5fa8",
        glow: 0.3,
        order: 3,
    },
    epic: {
        key: "epic",
        name: "编号平行",
        color: "#b487ff",
        accent: "#6a35c9",
        glow: 0.45,
        order: 4,
    },
    legendary: {
        key: "legendary",
        name: "稀有平行",
        color: "#ffb547",
        accent: "#b06f00",
        glow: 0.62,
        order: 5,
    },
    mythic: {
        key: "mythic",
        name: "超稀有 / 1-of-1",
        color: "#ff5f8d",
        accent: "#a8003a",
        glow: 0.85,
        order: 6,
    },
};

export const TIER_ORDER: Tier[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export const tierName = (tier: Tier): string => TIERS[tier].name;
export const tierColor = (tier: Tier): string => TIERS[tier].color;

/** 卡组大类的中文名 */
export const GROUP_NAMES: Record<string, string> = {
    base: "基础卡",
    parallel: "平行卡",
    insert: "插入卡",
    auto: "签名卡",
    relic: "实物卡",
    ssp: "超短印",
};
