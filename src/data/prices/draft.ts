/**
 * 选秀顺位 —— 卡价模型里第二个「人物」变量。
 *
 * 为什么要有这一层
 * ----------------
 * 本站名册是 2025-26 赛季的产品，里面有大批**一场 NBA 正式比赛都没打过**的新秀。
 * 他们没有任何历史成交记录可以进档位表，模型原先一律按 1 倍算，等于把状元和落选秀
 * 定成同一个价 —— 而真实市场上同款卡（同系列、同卡类、同印量）能差出好几倍。
 *
 * 这条链路是正交的：只有在球员**没进档位表**时才计价。已经进表的球员（弗拉格、
 * 哈珀、克努佩尔、奎恩……）的顺位价值已经体现在他自己的档位倍率里，再乘一遍就是
 * 同一件事计两次 —— 这正是本项目在编号维度上犯过的错，不要重犯。
 *
 * 实测口径
 * --------
 * 卡淘成交样本（见 `scripts/fit-sales-model.ts` 第六节）抛光掉系列、卡类、印量三个
 * 维度后，未进档位表的球员按顺位分档，相对「非选秀球员」的倍率是：
 *
 *   榜眼–探花 ×5.17、乐透 4-14 ×2.47、首轮末 15-30 ×1.05、次轮 31+ ×0.84
 *
 * 落地的数比实测扁 —— 取了几何平均（平方根收缩）。理由是这个数有三重噪声：
 * 一是样本量小（榜眼–探花 490 条，且集中在两三个人身上）；二是它与「新秀热度」
 * 分不开，而热度是有周期的；三是中文标题里「状元 / 乐透秀」本身就是卖点，
 * 挂牌标题会往上贴词，对不到具体卡上。直接照搬实测值，会让一个次轮秀的卡
 * 和状元差 6 倍，这个精度是样本撑不住的。收缩是个刻意的保守选择，
 * 实测值留在上面这段注释里，复核时对着看。
 *
 * 为什么次轮会比非选秀球员低：非选秀球员那一档里混着大量**老将**，他们的卡
 * 有稳定的收藏盘；而当届次轮秀除了「新秀」两个字什么都没有。这个差值不是笔误。
 */
import { DRAFT_CLASS_YEAR, DRAFT_PICKS_2025 } from "./draft-order.generated";

/** 顺位系数所依据的样本日期 */
export const DRAFT_FACTOR_AS_OF = "2026-10-01";

/** 顺位阶梯。断点与 scripts/lib/polish.ts 的 pickTier 必须一致 */
export const PICK_LADDER: { label: string; maxPick: number; factor: number }[] = [
    { label: "状元", maxPick: 1, factor: 2.2 },
    { label: "榜眼–探花", maxPick: 3, factor: 2.1 },
    { label: "乐透 4–14", maxPick: 14, factor: 1.6 },
    { label: "首轮末 15–30", maxPick: 30, factor: 1.0 },
    { label: "次轮 31+", maxPick: 59, factor: 0.92 },
];

/** 不在本选秀年、也没进档位表的球员：不调价 */
export const UNDRAFTED_FACTOR = 1;

/**
 * 名字骨架。官方 checklist 写作 `VJ Edgecombe`、选秀名单写作 `V.J. Edgecombe`，
 * 中文译名与省略点号的写法都不统一，所以比对前先抹掉大小写、标点与重音符号。
 */
const skeleton = (name: string): string =>
    name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

const PICK_BY_NAME = new Map<string, number>();
for (const row of DRAFT_PICKS_2025) PICK_BY_NAME.set(skeleton(row.player), row.pick);

/** 球员的选秀顺位；不在 `DRAFT_CLASS_YEAR` 那届名单里时为 null */
export function draftPick(player: string): number | null {
    return PICK_BY_NAME.get(skeleton(player)) ?? null;
}

/** 顺位倍率；未进档位表的球员由 card-values.ts 调用 */
export function draftFactor(player: string): number {
    const pick = draftPick(player);
    if (pick === null) return UNDRAFTED_FACTOR;
    for (const step of PICK_LADDER) if (pick <= step.maxPick) return step.factor;
    return UNDRAFTED_FACTOR;
}

/** `DRAFT_CLASS_YEAR` 那一届的球员才有顺位，供校验脚本核对 */
export function isDraftClass(player: string): boolean {
    return PICK_BY_NAME.has(skeleton(player));
}

export { DRAFT_CLASS_YEAR };
