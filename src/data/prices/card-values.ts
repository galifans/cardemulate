/**
 * 卡价模型 —— 逐张卡算出「这张卡在公开市场上大概值多少 RMB」。
 *
 * 为什么是模型而不是查价
 * ----------------------
 * 逐张联网查价在数据量上不成立：本站在册卡种超过四千个，而公开可访问的
 * 查价站点几乎全部拒绝本机访问（详见 sources/prices/README.md 的实测表）。
 * 所以这里走「少量实测价 + 规则推导」：有实测价的卡（explicit 表）直接用实价，
 * 其余按 档位基准价 × 限量系数 × 人物系数 推导，一律不低于 ¥0.01。
 *
 * 模型必须保持纯函数（无随机、无时间依赖），否则同一个种子重算会得到不同的钱，
 * 「复现这一盒」和「老记录回填」都会失真。
 *
 * 调参方式
 * --------
 * 基准价与系数改动后跑 `npm run prices:check`，它会把每个盒型拆若干盒，
 * 打印平均购入 / 平均售出 / 回本率，回本率落在合理区间外会报警。
 */

import type { GroupKind, PulledCard, Tier } from "@/engine/types";
import {
    ALL_STAR_FACTOR,
    ALL_STARS,
    FIRST_SERIAL_FACTOR,
    LAST_SERIAL_FACTOR,
    ROOKIE_FACTOR,
    SUPERSTAR_FACTOR,
    SUPERSTARS,
} from "./players";
import { productValueFactor } from "./products";
import type { CardValueBreakdown } from "./types";

/** 查不到价格的兜底值（RMB） */
export const FLOOR_VALUE = 0.01;

/**
 * 档位基准价（RMB）：口径是「普通轮换球员、非编号」的一张卡。
 * 表按 大类 × 档位 展开；缺的格子由 fallbackBaseline 逐级兜底。
 */
const BASELINE: Record<GroupKind, Partial<Record<Tier, number>>> = {
    base: { common: 0.35, uncommon: 1.4, rare: 3.5, epic: 9, legendary: 24, mythic: 70 },
    parallel: { common: 0.5, uncommon: 1.7, rare: 4.2, epic: 11, legendary: 28, mythic: 80 },
    insert: { common: 0.35, uncommon: 1.2, rare: 3, epic: 7, legendary: 18, mythic: 55 },
    auto: { common: 22, uncommon: 30, rare: 40, epic: 60, legendary: 100, mythic: 450 },
    relic: { common: 30, uncommon: 38, rare: 52, epic: 75, legendary: 130, mythic: 420 },
    ssp: { common: 45, uncommon: 60, rare: 85, epic: 120, legendary: 200, mythic: 900 },
};

/** 兜底链：本大类本档位 -> 本大类普卡 -> base 同档位 -> base 普卡 */
function fallbackBaseline(group: GroupKind, tier: Tier): number {
    const own = BASELINE[group][tier];
    if (own !== undefined) return own;
    const ownCommon = BASELINE[group].common;
    if (ownCommon !== undefined) return ownCommon;
    const baseTier = BASELINE.base[tier];
    if (baseTier !== undefined) return baseTier;
    return BASELINE.base.common as number;
}

/**
 * 限量系数：编号越小越贵。刻意压平了尾部 —— 现实中 /1 不会比非编号贵出一百倍，
 * 倍率滚得太快会让每个盒型的期望值都被一两张超级卡带飞。
 */
function scarcityFactor(numbered: number | null): number {
    if (!numbered || numbered <= 0) return 1;
    if (numbered <= 1) return 7.5;
    if (numbered <= 9) return 5.8;
    if (numbered <= 24) return 4.2;
    if (numbered <= 49) return 3.1;
    if (numbered <= 99) return 2.4;
    if (numbered <= 199) return 1.8;
    if (numbered <= 299) return 1.45;
    if (numbered <= 399) return 1.2;
    return 1.1;
}

/** 人物系数：顶级 / 全明星 / 新秀 三种加成叠乘 */
function playerFactor(card: PulledCard): number {
    let factor = 1;
    if (SUPERSTARS.includes(card.player)) factor *= SUPERSTAR_FACTOR;
    else if (ALL_STARS.includes(card.player)) factor *= ALL_STAR_FACTOR;
    if (card.rookie) factor *= ROOKIE_FACTOR;
    return factor;
}

/**
 * 有据可查的实测价（RMB）。key 用 `variantKey|球员名`，
 * 只登记能说清来源的少数重点卡；查不到就走模型。
 */
const EXPLICIT: Record<string, number> = {};

/** 保留两位小数：价格是钱，展示与入库都按分对齐 */
const cents = (value: number): number => Math.round(value * 100) / 100;

/** 一张卡的价值明细；productKey 决定系列档次系数 */
export function cardValueBreakdown(card: PulledCard, productKey: string): CardValueBreakdown {
    const explicit = EXPLICIT[`${card.variantKey}|${card.player}`] ?? null;
    if (explicit !== null) {
        return { value: cents(Math.max(FLOOR_VALUE, explicit)), base: explicit, scarcity: 1, player: 1, explicit };
    }

    const series = productValueFactor(productKey);
    const base = fallbackBaseline(card.group, card.tier) * series;
    let scarcity = scarcityFactor(card.numbered);
    if (card.serial !== null && card.numbered) {
        if (card.serial === 1) scarcity *= FIRST_SERIAL_FACTOR;
        else if (card.serial === card.numbered) scarcity *= LAST_SERIAL_FACTOR;
    }
    const player = playerFactor(card);
    const raw = base * scarcity * player;
    return {
        value: cents(Math.max(FLOOR_VALUE, raw)),
        base,
        scarcity,
        player,
        explicit: null,
    };
}

/** 一张卡的价值（RMB） */
export const cardValueRmb = (card: PulledCard, productKey: string): number =>
    cardValueBreakdown(card, productKey).value;

/** 一批卡的总价值（RMB） */
export const sumValueRmb = (cards: PulledCard[], productKey: string): number =>
    cents(cards.reduce((sum, card) => sum + cardValueRmb(card, productKey), 0));
