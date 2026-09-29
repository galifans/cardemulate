/**
 * 发行商官方 Pack Odds 表（自动生成，请勿手工编辑）。
 *
 * 来源：pack-odds.txt（Topps 官方 Pack Odds PDF 的文本提取件）。
 * 重新生成：node scripts/import-pack-odds.mjs <pack-odds.txt> <本文件> "Odds"
 *
 * odds 是「平均多少包出一张」：官方表的 `1:X` 直接取 X，`A:B` 取 B / A。
 * null 表示官方表里这一格是空的——即该渠道没有这个卡种。
 */

/** 官方表的列顺序，索引与 PackOddsRow.odds 一一对应 */
export const PACK_ODDS_COLUMNS = [
    "odds",
] as const;

export type PackOddsColumn = (typeof PACK_ODDS_COLUMNS)[number];

/** 一行 = 官方表里的一个卡种；odds 是各渠道的 1:X，null 表示该渠道没有 */
export interface PackOddsRow {
    label: string;
    odds: (number | null)[];
}

export const PACK_ODDS: PackOddsRow[] = [
    { label: "Base", odds: [0.25] },
    { label: "Base White", odds: [7] },
    { label: "Base Refractor", odds: [10] },
    { label: "Base LogoFractor", odds: [20] },
    { label: "Base Teal Speckle Refractor", odds: [26] },
    { label: "Base Pink Refractor", odds: [31] },
    { label: "Base Aqua Shimmer", odds: [38] },
    { label: "Base Lasers", odds: [44] },
    { label: "Base Blue Refractor", odds: [51] },
    { label: "Base Sonar", odds: [61] },
    { label: "Base Green Refractor", odds: [77] },
    { label: "Base Purple Mini-Diamond", odds: [101] },
    { label: "Base Gold Refractor", odds: [151] },
    { label: "Base Cactus Jack Refractor", odds: [184] },
    { label: "Base Orange Refractor", odds: [302] },
    { label: "Base Black Refractor", odds: [754] },
    { label: "Base Red Refractor", odds: [1509] },
    { label: "Base Red Mini-Diamond Refractor", odds: [1509] },
    { label: "Base SuperFractor", odds: [7575] },
    { label: "Utopia Highlights", odds: [8] },
    { label: "Jacked Up", odds: [8] },
    { label: "LA Flame Legends", odds: [15] },
    { label: "Utopia Highlights Blue Refractor", odds: [126] },
    { label: "Jacked Up Blue Refractor", odds: [126] },
    { label: "LA Flame Legends Blue Refractor", odds: [252] },
    { label: "Utopia Highlights Green Refractor", odds: [191] },
    { label: "Jacked Up Green Refractor", odds: [191] },
    { label: "LA Flame Legends Green Refractor", odds: [381] },
    { label: "Utopia Highlights Purple Mini-Diamond", odds: [252] },
    { label: "Jacked Up Purple Mini-Diamond", odds: [252] },
    { label: "LA Flame Legends Purple Mini-Diamond", odds: [503] },
    { label: "Utopia Highlights Gold Refractor", odds: [377] },
    { label: "Jacked Up Gold Refractor", odds: [377] },
    { label: "LA Flame Legends Gold Refractor", odds: [754] },
    { label: "Utopia Highlights Orange Refractor", odds: [754] },
    { label: "Jacked Up Orange Refractor", odds: [754] },
    { label: "LA Flame Legends Orange Refractor", odds: [1509] },
    { label: "Utopia Highlights Black Refractor", odds: [1884] },
    { label: "Jacked Up Black Refractor", odds: [1884] },
    { label: "LA Flame Legends Black Refractor", odds: [3768] },
    { label: "Utopia Highlights Red Refractor", odds: [3768] },
    { label: "Jacked Up Red Refractor", odds: [3768] },
    { label: "LA Flame Legends Red Refractor", odds: [7575] },
    { label: "Utopia Highlights SuperFractor", odds: [19137] },
    { label: "Jacked Up SuperFractor", odds: [19137] },
    { label: "LA Flame Legends SuperFractor", odds: [38274] },
    { label: "Astrovision", odds: [305] },
    { label: "Cactus Mode", odds: [1200] },
    { label: "Astrovision SuperFractor", odds: [42777] },
    { label: "Cactus Mode SuperFractor", odds: [42777] },
    { label: "Base Autograph Variation", odds: [208] },
    { label: "Cactus Ink", odds: [208] },
    { label: "Base Autograph Variation Orange Refractor", odds: [1064] },
    { label: "Cactus Ink Orange Refractor", odds: [1064] },
    { label: "Base Autograph Variation Black Refractor", odds: [2664] },
    { label: "Cactus Ink Black Refractor", odds: [2664] },
    { label: "Base Autograph Variation Red Refractor", odds: [5348] },
    { label: "Cactus Ink Red Refractor", odds: [5348] },
    { label: "Base Autograph Variation SuperFractor", odds: [26934] },
    { label: "Cactus Ink SuperFractor", odds: [26934] },
];
