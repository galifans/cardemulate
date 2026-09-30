/**
 * 量出来的球员倍率 —— 每个球员自己一条，不再归到某个梯队。
 *
 * **自动生成，不要手改。** 由 `node scripts/import-player-factors.ts` 从
 * `.snapshot/card-sales.jsonl`（卡淘成交样本）生成；采样口径与复现步骤见 PROGRESS.md。
 *
 * 1.0 是什么
 * ----------
 * 两个口径各自以「(未识别球员)」为 1.0，也就是**卡淘上一张认不出主角的卡的价位**。
 * 这与模型里 `playerTier()` 返回 1 的「未列入档位表」是同一个参照点，所以这张表
 * 可以直接替代梯队倍率，不需要再乘任何校正。`premium` 用于签名卡 / 实物卡 / 超短印，
 * `plain` 用于普卡 / 平行卡 / 插入卡 —— 同一球员两个口径能差一个数量级，见脚本注释。
 *
 * 没量到的球员
 * ------------
 * 这张表不是全集：签字卡不足 12 条或普卡不足 20 条的球员这里没有，
 * 由 `players.ts` 的梯队表兜底。表内球员的倍率一律以实测为准，梯队表不再参与。
 */

/** 量出这张表时样本截止的日期 */
export const PLAYER_FACTORS_AS_OF = "2026-10-01";

export interface PlayerFactor {
    /** 签名卡 / 实物卡 / 超短印卡用的倍率 */
    premium: number;
    /** 普卡 / 平行卡 / 插入卡用的倍率 */
    plain: number;
    /** 量这两个数各用了多少条成交（0 = 没量到，不会出现在表里） */
    autoRows: number;
    plainRows: number;
}

export const PLAYER_FACTORS: Readonly<Record<string, PlayerFactor>> = {
    "Cooper Flagg": { premium: 84.411, plain: 10.391, autoRows: 61, plainRows: 854 },
    "Dylan Harper": { premium: 30.78, plain: 4.778, autoRows: 59, plainRows: 435 },
    "Kon Knueppel": { premium: 15.411, plain: 2.205, autoRows: 64, plainRows: 376 },
    "Stephon Castle": { premium: 5.856, plain: 4.076, autoRows: 13, plainRows: 34 },
    "Ace Bailey": { premium: 5.357, plain: 1.901, autoRows: 74, plainRows: 150 },
    "James Harden": { premium: 4.26, plain: 1.199, autoRows: 20, plainRows: 60 },
    "Kevin Durant": { premium: 4.238, plain: 1.484, autoRows: 13, plainRows: 63 },
    "Tyrese Haliburton": { premium: 3.301, plain: 1.234, autoRows: 43, plainRows: 74 },
    "Tracy McGrady": { premium: 3.04, plain: 1.152, autoRows: 22, plainRows: 23 },
    "Tyrese Maxey": { premium: 2.93, plain: 0.844, autoRows: 30, plainRows: 37 },
    "Yang Hansen": { premium: 2.828, plain: 0.998, autoRows: 66, plainRows: 58 },
    "Brandon Miller": { premium: 2.481, plain: 0.836, autoRows: 40, plainRows: 31 },
    "Donovan Mitchell": { premium: 2.186, plain: 0.819, autoRows: 16, plainRows: 50 },
    "Cedric Coward": { premium: 2.141, plain: 1.07, autoRows: 59, plainRows: 66 },
    "Chet Holmgren": { premium: 1.903, plain: 0.805, autoRows: 27, plainRows: 29 },
    "Collin Murray-Boyles": { premium: 1.884, plain: 1.509, autoRows: 73, plainRows: 55 },
    "Dwyane Wade": { premium: 1.645, plain: 0.954, autoRows: 12, plainRows: 30 },
    "Derik Queen": { premium: 1.531, plain: 1.042, autoRows: 41, plainRows: 83 },
    "Alex Sarr": { premium: 1.443, plain: 0.897, autoRows: 24, plainRows: 24 },
    "Khaman Maluach": { premium: 1.096, plain: 0.725, autoRows: 55, plainRows: 43 },
    "Will Riley": { premium: 1.096, plain: 0.445, autoRows: 31, plainRows: 24 },
    "Joan Beringer": { premium: 0.962, plain: 0.595, autoRows: 45, plainRows: 27 },
    "Asa Newell": { premium: 0.921, plain: 0.413, autoRows: 32, plainRows: 33 },
    "Lauri Markkanen": { premium: 0.893, plain: 0.373, autoRows: 23, plainRows: 26 },
    "Thomas Sorber": { premium: 0.68, plain: 0.446, autoRows: 32, plainRows: 43 },
    "Nique Clifford": { premium: 0.662, plain: 0.352, autoRows: 49, plainRows: 23 },
    "Walter Clayton Jr.": { premium: 0.621, plain: 0.409, autoRows: 34, plainRows: 32 },
    "Noa Essengue": { premium: 0.592, plain: 0.549, autoRows: 58, plainRows: 39 },
    "Danny Wolf": { premium: 0.566, plain: 0.355, autoRows: 27, plainRows: 32 },
    "Drake Powell": { premium: 0.498, plain: 0.294, autoRows: 58, plainRows: 29 },
    "Johni Broome": { premium: 0.445, plain: 0.268, autoRows: 32, plainRows: 23 },
    "Nolan Traore": { premium: 0.444, plain: 0.293, autoRows: 49, plainRows: 33 },
    "Adou Thiero": { premium: 0.443, plain: 0.468, autoRows: 52, plainRows: 24 },
    "Jase Richardson": { premium: 0.388, plain: 0.333, autoRows: 36, plainRows: 21 },
    "Zach Lavine": { premium: 0.348, plain: 0.306, autoRows: 24, plainRows: 32 },
    "Micah Peavy": { premium: 0.337, plain: 0.233, autoRows: 49, plainRows: 20 },
    "Rasheer Fleming": { premium: 0.325, plain: 0.294, autoRows: 43, plainRows: 29 },
    "Ben Saraf": { premium: 0.286, plain: 0.334, autoRows: 38, plainRows: 21 },
    "Liam McNeeley": { premium: 0.26, plain: 0.284, autoRows: 43, plainRows: 29 },
    "Chaz Lanier": { premium: 0.253, plain: 0.268, autoRows: 48, plainRows: 22 },
    "Kam Jones": { premium: 0.232, plain: 0.223, autoRows: 48, plainRows: 24 },
};
