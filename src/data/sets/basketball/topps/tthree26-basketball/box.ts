/**
 * 2025-26 Topps 3 Basketball —— 盒型定义
 *
 * 配率来源：Topps 官方 Pack Odds 表（1:X 包，单位与 `pack-odds.generated.ts` 一致），
 * 名册来源：官方 Checklist 表格版。子集与平行由 `shared/assemble.ts` 照着上面两张表展开，
 * 这里只写「有哪些子集、各自对应官方表里的哪条行标签」以及盒型规格。
 *
 * 只上 Hobby 一种盒型：官方表里 Emerald 与 Holo Gold 两档 Rookie 3 Patch Autographs
 * 平行只写在 FDI 那一列（1:2 / 1:5），而 FDI 盒（首发专供）还没上线。若把这两档按
 * 同一列配率塞进 Hobby 盒，整盒权重会超过 4 张，所以本系列先只做 Hobby。
 *
 * 规格（官方产品资料）：Hobby / FDI 都是 4 张/包 × 1 包 = 4 张，每盒 3 张签名卡
 * （签名与实物签名合计），余下 1 张是普卡或插入卡。每箱盒数官方未公布。
 */

import { assembleBoxes, type SubsetPlan, type VariantMeta } from "../shared/assemble";
import { PACK_ODDS, PACK_ODDS_COLUMNS } from "./pack-odds.generated";
import { ROSTER_SECTIONS } from "./roster";

/**
 * 限量数：指南页把「基础版编号」写在卡数行（`40 cards. /49.`），平行编号写在平行行
 * （`Bronze /25 (1:23 Hobby; 1:23 FDI)`），这里照抄。
 *
 * 抄错一个数字只会影响稀有度配色，不影响配率，但整套编号乘配率应当都落在同一个
 * 「总印量」上，可以拿这个反查。
 */
type Runs = Record<string, number | null>;

/** 行标签 = 子集前缀 + 平行名；空串那条是子集本身的普通版 */
const meta = (prefix: string, runs: Runs): Record<string, VariantMeta> =>
    Object.fromEntries(
        Object.entries(runs).map(([suffix, numbered]) => [
            suffix ? `${prefix} ${suffix}` : prefix,
            { numbered },
        ]),
    );

/** 基础版 /49 + 一整套彩虹（本系列的多数子集都是这一档） */
const TIERED: Runs = { "": 49, Bronze: 25, Blue: 15, Gold: 10, Red: 5, Platinum: 1 };
/** 基础版 /15 + Red /5 + Holo Gold /3 + Platinum 1/1（三张主题的插入卡） */
const SHORT: Runs = { "": 15, Red: 5, "Holo Gold": 3, Platinum: 1 };
/** 基础版 /10 + Holo Gold /3 + Platinum 1/1（编号最狠的那几档签名） */
const HIGH_END: Runs = { "": 10, "Holo Gold": 3, Platinum: 1 };

const SUBSETS: SubsetPlan[] = [
    {
        section: "BASE CARDS",
        label: "Base",
        name: "Base Set",
        kind: "base",
        variantMeta: meta("Base", TIERED),
        note: "100 张，编号到 49。",
    },
    { section: "ICE WATER", label: "Ice Water", variantMeta: meta("Ice Water", TIERED) },
    { section: "FLIGHT PATH", label: "Flight Path", variantMeta: meta("Flight Path", TIERED) },
    { section: "ARCHITECTS", label: "Architects", variantMeta: meta("Architects", TIERED) },
    {
        section: "3 AND D",
        label: "3 and D",
        name: "3&D",
        variantMeta: meta("3 and D", SHORT),
    },
    {
        section: "MONSTERS OF THE DEEP",
        label: "Monsters of the Deep",
        variantMeta: meta("Monsters of the Deep", SHORT),
    },
    { section: "THE PAINT", label: "The Paint", variantMeta: meta("The Paint", SHORT) },
    {
        section: "ROOKIE 3 PATCH AUTOGRAPHS HORIZONTAL",
        label: "Rookie 3 Patch Autographs Horizontal",
        kind: "relic",
        variantMeta: meta("Rookie 3 Patch Autographs Horizontal", TIERED),
        note: "横版。Emerald 与 Holo Gold 两档是首发专供盒型专属。",
    },
    {
        section: "ROOKIE 3 PATCH AUTOGRAPHS VERTICAL",
        label: "Rookie 3 Patch Autographs Vertical",
        kind: "relic",
        variantMeta: meta("Rookie 3 Patch Autographs Vertical", TIERED),
        note: "竖版。Emerald 与 Holo Gold 两档是首发专供盒型专属。",
    },
    {
        section: "RELICS AUTOGRAPHS PRIME",
        label: "Relics Autographs Prime",
        kind: "relic",
        variantMeta: meta("Relics Autographs Prime", TIERED),
    },
    {
        section: "TRIPLE RELICS AUTOGRAPHS",
        label: "Triple Relics Autographs",
        kind: "relic",
        variantMeta: meta("Triple Relics Autographs", { Gold: 10, Red: 5, Platinum: 1 }),
        note: "17 张，官方只给出 Gold / Red / Platinum 三档，没有普通版那一行。",
    },
    {
        section: "ROOKIE RELICS AUTOGRAPHS",
        label: "Rookie Relics Autographs",
        kind: "relic",
        variantMeta: meta("Rookie Relics Autographs", TIERED),
    },
    {
        section: "VETERAN 3 PATCH AUTOGRAPHS",
        label: "Veteran 3 Patch Autographs",
        kind: "relic",
        variantMeta: meta("Veteran 3 Patch Autographs", TIERED),
    },
    {
        section: "FRESH FORCE RELIC AUTOGRAPHS",
        label: "Fresh Force Relic Autographs",
        kind: "relic",
        variantMeta: meta("Fresh Force Relic Autographs", TIERED),
    },
    {
        section: "RAINDROPS SIGNATURES",
        label: "Raindrops Signatures",
        kind: "auto",
        variantMeta: meta("Raindrops Signatures", TIERED),
    },
    {
        section: "SERENDIPITOUS SIGS",
        label: "Serendipitous Sigs",
        kind: "auto",
        variantMeta: meta("Serendipitous Sigs", TIERED),
    },
    {
        section: "REMARKABLE",
        label: "Re-Markable",
        kind: "auto",
        variantMeta: meta("Re-Markable", TIERED),
    },
    {
        section: "FULL COURT SIGNS",
        label: "Full Court Signs",
        kind: "auto",
        variantMeta: meta("Full Court Signs", TIERED),
    },
    {
        section: "HIT THE MARK",
        label: "Hit the Mark",
        kind: "auto",
        variantMeta: meta("Hit the Mark", TIERED),
    },
    {
        section: "TRIPLE POWER AUTOGRAPHS",
        label: "Triple Power Autographs",
        kind: "auto",
        variantMeta: meta("Triple Power Autographs", TIERED),
    },
    {
        section: "ROOKIE AUTOGRAPHS",
        label: "Rookie Autographs",
        kind: "auto",
        variantMeta: meta("Rookie Autographs", TIERED),
    },
    {
        section: "THUNDERDUNK SIGNATURES",
        label: "Thunderdunk Signatures",
        kind: "auto",
        variantMeta: meta("Thunderdunk Signatures", TIERED),
    },
    {
        section: "ROOKIEVERSE AUTOGRAPHS",
        label: "Rookie-verse Autographs",
        name: "RookieVerse Autographs",
        kind: "auto",
        variantMeta: meta("Rookie-verse Autographs", TIERED),
    },
    {
        section: "RIM REAPERS SIGNATURES",
        label: "Rim Reapers Signatures",
        kind: "auto",
        variantMeta: meta("Rim Reapers Signatures", HIGH_END),
    },
    {
        section: "QUEST FOR GLORY AUTOGRAPHS",
        label: "Quest for Glory Autographs",
        kind: "auto",
        variantMeta: meta("Quest for Glory Autographs", HIGH_END),
    },
    {
        section: "CITY DRIP SIGNATURES",
        label: "City Drip Signatures",
        kind: "auto",
        variantMeta: meta("City Drip Signatures", HIGH_END),
    },
    {
        section: "NEXT FEATURE SIGNATURES",
        label: "Next Feature Signatures",
        kind: "auto",
        variantMeta: meta("Next Feature Signatures", TIERED),
    },
    {
        section: "GAME TIME GRAPHS",
        label: "Game Time Graphs",
        kind: "auto",
        variantMeta: meta("Game Time Graphs", TIERED),
    },
];

export const TTHREE26_BASKETBALL_BOXES = assembleBoxes({
    productKey: "tthree26-basketball",
    productName: "2025-26 Topps 3 Basketball",
    year: "2025-26",
    releaseDate: "2026-03-05",
    category: "basketball",
    maker: "topps",
    live: true,
    notes: [
        "官方给出的是平均配率，实际开封会有波动，也不保证每个卡人都出现在所有平行里。",
        "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
        "每盒三张签名卡是官方规格，本模拟器按平均配率抽取，实际张数会有波动。",
        "Emerald 与 Holo Gold 两档 Rookie 3 Patch Autographs 平行是首发专供盒型专属，该盒型暂未上线，不在本盒内容里。",
    ],
    odds: { columns: PACK_ODDS_COLUMNS, rows: PACK_ODDS },
    sections: ROSTER_SECTIONS,
    subsets: SUBSETS,
    // 这盒每包 4 张、官方配率合计 3.773，留给普卡的只剩 0.227，默认下限 0.5 会把
    // 整盒权重顶到 4.273。官方普卡配率是 1:5（每盒 4 张里只有一张非签名卡，
    // 所以普卡平均 5 盒才出一张），残差就该是 0.227。
    minBaseWeight: 0.2,
    columnNames: { hobby: "Hobby", fdi: "FDI" },
    boxes: [
        {
            slug: "hobby-box",
            name: "2025-26 Topps 3 Basketball Hobby Box",
            column: "hobby",
            cardsPerPack: 4,
            packsPerBox: 1,
            boxesPerCase: 0,
            autoGuaranteed: true,
            boxExclusives: [
                "每盒三张签名卡：签名卡与实物签名卡合计三张",
                "每盒一张非签名卡，可能是普卡，也可能是插入卡",
                "普卡编号到 49，平行有 Bronze /25、Blue /15、Gold /10、Red /5、Platinum 1/1",
            ],
        },
    ],
});
