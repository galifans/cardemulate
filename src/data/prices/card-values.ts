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
 * 各维度的系数不是拍脑袋定的：卡淘「已售出」成交样本（两万条量级）抛光电系列 /
 * 人物 / 卡类 / 印量五个维度后再标定，量法与校验分别在 scripts/fit-sales-model.ts
 * 与 scripts/check-sales-fit.ts。改系数前先看那边的实测值。
 *
 * 调参方式
 * --------
 * 基准价与系数改动后跑 `npm run prices:check`，它会把每个盒型拆若干盒，
 * 打印平均购入 / 平均售出 / 回本率，回本率落在合理区间外会报警。
 */

import type { GroupKind, PulledCard, Tier } from "@/engine/types";
import { draftFactor } from "./draft";
import { FIRST_SERIAL_FACTOR, LAST_SERIAL_FACTOR, ROOKIE_FACTOR, measuredFactor, playerTier } from "./players";
import { productValueFactor } from "./products";
import type { CardValueBreakdown } from "./types";

/** 查不到价格的兜底值（RMB） */
export const FLOOR_VALUE = 0.01;

/**
 * 档位基准价（RMB）：口径是「普通轮换球员、非编号」的一张卡。
 * 表按 大类 × 档位 展开；缺的格子由 fallbackBaseline 逐级兜底。
 *
 * 各大类的相对高低不是拍的：`npm run prices:audit` 会把「签字卡 ÷ 普卡」这类
 * 倍数在模型侧和实测侧并排打印。曾经实物卡的基准价定在签字卡之上（30 vs 22），
 * 实测却是签字 ×7.9、实物 ×2.4 —— 一张球衣卡比一张签字卡贵，市场里不存在这种事，
 * 那一栏整整高了 5.8 倍。签字卡本身也偏高约 2 倍，一并按实测收下来了。
 */
const BASELINE: Record<GroupKind, Partial<Record<Tier, number>>> = {
    base: { common: 0.44, uncommon: 1.75, rare: 4.4, epic: 11.3, legendary: 30, mythic: 88 },
    parallel: { common: 0.63, uncommon: 2.13, rare: 5.3, epic: 13.8, legendary: 35, mythic: 100 },
    insert: { common: 0.44, uncommon: 1.5, rare: 3.8, epic: 8.8, legendary: 22.5, mythic: 69 },
    auto: { common: 13.8, uncommon: 19, rare: 25, epic: 37.5, legendary: 62.5, mythic: 280 },
    relic: { common: 6.5, uncommon: 8.3, rare: 11.3, epic: 16.3, legendary: 27.5, mythic: 90 },
    ssp: { common: 26, uncommon: 36, rare: 50, epic: 71, legendary: 119, mythic: 540 },
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
 * 限量系数：编号越小越贵。
 *
 * 数是从成交样本里量出来的 —— 把系列、人物、印量、新秀四个维度抛光后，相对非编号：
 * 普卡 /50-99 ×3.0、/25-49 ×7.4、/10-24 ×22.7、/2-9 ×36.7、/1 ×214；
 * 签字卡 /50-99 ×2.0、/25-49 ×3.1、/10-24 ×4.0、/2-9 ×8.1（/1 样本不足）。
 *
 * 但这里不能照搬 —— 目录给编号平行卡分配的档位（/150~/399 归 epic、/50~/99 归
 * legendary、/25 以下归 mythic）本身已经带了一大截印量溢价，两处叠起来才是市场价。
 * 所以有效值要从「实测值 ÷ 档位已经给过的那一截」倒算，这也让 /100~/399 这两档算出了
 * 小于 1 的数 —— 它们的档位（epic / legendary）比非编号那整池的均值高得多，实测却
 * 只比非编号贵几倍，超出部分要在这里收回去。**这不是「编号越大越便宜」。**
 *
 * /2-9 那一档从 17 收到 7：抛光之后，模型在 /2-9 上比实测高 2.4 倍，而 /10-24、
 * /25-49 都在 ×0.9~1.1，/50-99 已经对齐 —— 也就是说写错的只是这一格，
 * 不是整条阶梯的斜率。同类修正对签字卡也是 ÷2.4，所以这一格不是普卡专属。
 *
 * 有效值怎么核：`npm run prices:audit` 会把模型隐含的印量阶梯与实测阶梯并列打印。
 */
function scarcityFactor(numbered: number | null): number {
    if (!numbered || numbered <= 0) return 1;
    if (numbered <= 1) return 42;
    if (numbered <= 9) return 7;
    if (numbered <= 24) return 4.6;
    if (numbered <= 49) return 4;
    if (numbered <= 99) return 1.7;
    if (numbered <= 199) return 0.62;
    if (numbered <= 299) return 0.55;
    if (numbered <= 399) return 0.45;
    return 0.4;
}

/** 吃满人物倍率的大类：签名卡 / 实物卡 / 超短印 */
const PREMIUM_GROUPS: ReadonlySet<GroupKind> = new Set<GroupKind>(["auto", "relic", "ssp"]);

/** 普卡类（base / parallel / insert）只吃这个比例的人物倍率 */
const CARD_GROUP_SPREAD = 0.15;

/**
 * 人物系数。
 *
 * 两条路：
 *
 * 1. 实测表里有这个人（41 人）—— 直接用 `PLAYER_FACTORS` 的倍率，签名卡/
 *    实物卡/超短印用 `premium`，普卡/平行卡/插入卡用 `plain`。两个口径是分开量的，
 *    所以这里**不再打折**。为什么不接着用梯队：同一个「巨星」档里实测签字卡倍率
 *    从 × 5.36（贝利）到 × 30.78（哈珀）差五倍多，一个数字就表示不了。
 * 2. 没量到 —— 回落到梯队倍率，且只按卡的大类打折：签名卡/实物卡/超短印吃满，
 *    普卡/平行卡/插入卡只吃 CARD_GROUP_SPREAD 那一小份。
 *
 * 为什么要打折：真实市场里同一位球员在不同档次卡上的溢价差一个数量级 ——
 * 库里签名卡中位 ￥8,711 而普卡中位 ￥35（相差 250 倍），普通球员签名卡 ￥140
 * 而普卡 ￥11（相差 13 倍）。也就是说「人物」这个变量本身就被卡的档次放大了。
 *
 * 梯表与顺位表都查不到的人（主要是当年新秀）改看**选秀顺位**，见 draft.ts。两套只在
 * 其中一套上计价：梯表里已经有这个人的话，他的顺位价值已经写在档位倍率里了，
 * 再乘一遍就是同一件事计两次。
 */
function playerFactor(card: PulledCard): number {
    const measured = measuredFactor(card.player);
    let factor: number;
    if (measured !== null) {
        factor = PREMIUM_GROUPS.has(card.group) ? measured.premium : measured.plain;
    } else {
        const tier = playerTier(card.player);
        if (tier === 1) {
            factor = draftFactor(card.player);
        } else {
            const spread = PREMIUM_GROUPS.has(card.group) ? 1 : CARD_GROUP_SPREAD;
            factor = 1 + (tier - 1) * spread;
        }
    }
    if (card.rookie) factor *= ROOKIE_FACTOR;
    return factor;
}

/**
 * 有据可查的实测价（RMB）。key 用 `系列|卡种|球员名`，只登记能说清来源的重点卡。
 *
 * 为什么 key 里要带系列：卡种 key 是 `${subset.key}:${slug}`，不含系列名，
 * 不同系列都有 `base:superfractor` 这种组合，少一层系列就把两个系列的价串起来了。
 *
 * 这张表目前是空的：卡淘的成交记录只有一串塞满关键词的标题，没有结构化的
 * 卡种/平行字段，把 ￥24,250 这条对上「哪一张在册卡」只能靠猜，宁可不登记。
 * 现在扛事的是 players.ts 的分档表（它按签名卡市场重新标定过）。
 */
const EXPLICIT: Record<string, number> = {};

/** 保留两位小数：价格是钱，展示与入库都按分对齐 */
const cents = (value: number): number => Math.round(value * 100) / 100;

/** 一张卡的价值明细；productKey 决定系列档次系数 */
export function cardValueBreakdown(card: PulledCard, productKey: string): CardValueBreakdown {
    const explicit = EXPLICIT[`${productKey}|${card.variantKey}|${card.player}`] ?? null;
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
