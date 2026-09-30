/**
 * 2025-26 Topps Finest Basketball —— 盒型定义
 *
 * 配率来源：Topps 官方 Pack Odds 表（`pack-odds.generated.ts`），名册来源：官方
 * Checklist 表格版。子集与平行由 `shared/assemble.ts` 照着这两张表展开，这里只写
 * 「有哪些子集、各自对应官方表里的哪条行标签」以及盒型规格。
 *
 * 限量数来源：Checklist Insider 指南页的平行列表（官方表不含编号）。指南页把赔率写在
 * 每条平行后面（`Blue Refractor /99 (1:118 Hobby)`），已逐行与官方表核对，两边一致。
 *
 * 两种盒型都做，因为官方两列配率各自都能落到包厚以内：
 *   Hobby Box          10 张/包 × 6 包 = 60 张，每箱 8 盒，每盒 2 张签名
 *   Breaker Delight    10 张/包 × 1 包 = 10 张，每箱 8 盒，每盒 3 张签名
 * 官方表里 `Base Common 5:1` 是「每包 5 张」的意思，与 `1/0.2` 同口径，正好等于残差
 * （普卡走残差，所以这一行在两种盒型里都不参与求和）。
 *
 * 拆卡盒的普卡只有几何折射版（官方表 Breaker 列里 `Base Common` 是空的），所以那个
 * 盒型的残差要指到 `Base Common Geometric` 这一条平行上。
 */

import { assembleBoxes, type SubsetPlan, type VariantMeta } from "../shared/assemble";
import { PACK_ODDS, PACK_ODDS_COLUMNS } from "./pack-odds.generated";
import { ROSTER_SECTIONS } from "./roster";

/** 限量数：指南页写在平行名后面（`Sky Blue Refractor /350`），`null` = 非编号 */
type Runs = Record<string, number | null>;

/** 行标签 = 子集前缀 + 平行名；空串那条是子集本身的普通版 */
const meta = (prefix: string, runs: Runs): Record<string, VariantMeta> =>
    Object.fromEntries(
        Object.entries(runs).map(([suffix, numbered]) => [
            suffix ? `${prefix} ${suffix}` : prefix,
            { numbered },
        ]),
    );

/* 普卡三档各一套折射彩虹，编号越深的一档印量越小 */
const COMMON_REFRACTORS: Runs = {
    Refractor: null,
    "Oil Spill": null,
    Xfractor: null,
    "Sky Blue": 350,
    Purple: 250,
    Blue: 200,
    "Purple Xfractor": 150,
    "Blue Xfractor": 125,
    Green: 75,
    Gold: 50,
    Orange: 25,
    Black: 15,
    Red: 10,
    SuperFractor: 1,
};
const UNCOMMON_REFRACTORS: Runs = {
    Refractor: null,
    "Oil Spill": null,
    Xfractor: null,
    "Sky Blue": 250,
    Purple: 200,
    Blue: 150,
    "Purple Xfractor": 99,
    "Blue Xfractor": 75,
    Green: 35,
    Gold: 25,
    Orange: 20,
    Black: 10,
    Red: 5,
    SuperFractor: 1,
};
const RARE_REFRACTORS: Runs = {
    Refractor: null,
    "Oil Spill": null,
    Xfractor: null,
    "Sky Blue": 150,
    Blue: 99,
    "Purple Xfractor": 75,
    "Blue Xfractor": 49,
    Green: 25,
    Gold: 20,
    Orange: 15,
    Black: 5,
    Red: 3,
    SuperFractor: 1,
};

/* 普卡三档的几何折射版：只在拆卡盒里出 */
const COMMON_GEOMETRIC: Runs = {
    Geometric: null,
    "Purple Geometric": 100,
    "Blue Geometric": 75,
    "Gold Geometric": 50,
    "Red/Black Geometric": 25,
    "Red Geometric": 10,
    "Black Geometric": 1,
};
const UNCOMMON_GEOMETRIC: Runs = {
    Geometric: null,
    "Purple Geometric": 75,
    "Blue Geometric": 50,
    "Gold Geometric": 25,
    "Red/Black Geometric": 10,
    "Red Geometric": 5,
    "Black Geometric": 1,
};
const RARE_GEOMETRIC: Runs = {
    Geometric: null,
    "Purple Geometric": 50,
    "Blue Geometric": 25,
    "Gold Geometric": 10,
    "Red/Black Geometric": 5,
    "Red Geometric": 3,
    "Black Geometric": 1,
};

/* 四档插入卡共用同一套印量（指南页给四档写的编号一样） */
const INSERT_REFRACTORS: Runs = {
    Refractor: null,
    Xfractor: null,
    "Sky Blue": 150,
    Purple: 125,
    Blue: 99,
    "Die Cut": 75,
    Gold: 50,
    Orange: 25,
    Red: 5,
    SuperFractor: 1,
};
const INSERT_GEOMETRIC: Runs = {
    Geometric: null,
    "Blue Geometric": 75,
    "Gold Geometric": 50,
    "Red/Black Geometric": 25,
    "Red Geometric": 10,
    "Black Geometric": 1,
};

/* 四档签名共用同一套彩虹；两档拆卡盒专属签名再多一档 SuperFractor */
const AUTO_REFRACTORS: Runs = {
    Refractors: null,
    "Blue Xfractor": 99,
    Gold: 50,
    Orange: 25,
    "Red/Black Vapor": 10,
    Red: 5,
    SuperFractor: 1,
};
const AUTO_GEOMETRIC: Runs = {
    "Green Geometric": 75,
    "Gold Geometric": 50,
    "Yellow Geometric": 35,
    "Black Geometric": 25,
    "Orange Geometric": 15,
    "Red/Black Geometric": 10,
    "Red Geometric": 5,
};
const EXCLUSIVE_AUTO_GEOMETRIC: Runs = {
    ...AUTO_GEOMETRIC,
    SuperFractor: 1,
};

const SUBSETS: SubsetPlan[] = [
    {
        section: ["BASE COMMON", "BASE UNCOMMON", "BASE RARE"],
        label: "Base",
        name: "Base Set",
        kind: "base",
        variantMeta: {
            ...meta("Base Common", COMMON_REFRACTORS),
            ...meta("Base Common", COMMON_GEOMETRIC),
            ...meta("Base Uncommon", UNCOMMON_REFRACTORS),
            ...meta("Base Uncommon", UNCOMMON_GEOMETRIC),
            ...meta("Base Rare", RARE_REFRACTORS),
            ...meta("Base Rare", RARE_GEOMETRIC),
        },
        note: "300 张：Common / Uncommon / Rare 各 100 张。",
    },
    {
        section: "ARRIVALS",
        label: "Arrivals",
        variantMeta: { ...meta("Arrivals", INSERT_REFRACTORS), ...meta("Arrivals", INSERT_GEOMETRIC) },
        note: "30 张。",
    },
    {
        section: "FIRST",
        label: "First",
        variantMeta: { ...meta("First", INSERT_REFRACTORS), ...meta("First", INSERT_GEOMETRIC) },
        note: "30 张。",
    },
    {
        section: "FINISHERS",
        label: "Finishers",
        variantMeta: {
            ...meta("Finishers", INSERT_REFRACTORS),
            ...meta("Finishers", INSERT_GEOMETRIC),
        },
        note: "10 张。",
    },
    {
        section: "PULSE",
        label: "Pulse",
        note: "20 张。官方表只有一条普通版行标签，没有平行。",
    },
    {
        section: "THE MAN",
        label: "The Man",
        note: "20 张。官方表只有一条普通版行标签，没有平行。",
    },
    {
        section: "HEADLINERS",
        label: "Headliners",
        variantMeta: meta("Headliners", { SuperFractor: 1 }),
        note: "15 张，平行只有 SuperFractor 1/1。",
    },
    {
        section: "MUSE",
        label: "Muse",
        variantMeta: { ...meta("Muse", INSERT_REFRACTORS), ...meta("Muse", INSERT_GEOMETRIC) },
        note: "30 张。",
    },
    {
        section: "AURA",
        label: "Aura",
        variantMeta: meta("Aura", { SuperFractor: 1 }),
        note: "20 张，平行只有 SuperFractor 1/1。",
    },
    {
        section: "AUTOGRAPH CARDS",
        label: "Autographs",
        name: "Finest Autographs",
        kind: "auto",
        variantMeta: { ...meta("Autographs", AUTO_REFRACTORS), ...meta("Autographs", AUTO_GEOMETRIC) },
        note: "54 张。",
    },
    {
        section: "ROOKIE AUTOGRAPHS",
        label: "Rookie Autographs",
        name: "Rookies Finest Autographs",
        kind: "auto",
        variantMeta: {
            ...meta("Rookie Autographs", AUTO_REFRACTORS),
            ...meta("Rookie Autographs", AUTO_GEOMETRIC),
        },
        note: "40 张。",
    },
    {
        section: "BASELINE AUTOGRAPHS",
        label: "Baseline Autographs",
        kind: "auto",
        variantMeta: {
            ...meta("Baseline Autographs", AUTO_REFRACTORS),
            ...meta("Baseline Autographs", AUTO_GEOMETRIC),
        },
        note: "50 张。",
    },
    {
        section: "MASTERS AUTOGRAPHS",
        label: "Masters Autographs",
        kind: "auto",
        variantMeta: {
            ...meta("Masters Autographs", AUTO_REFRACTORS),
            ...meta("Masters Autographs", AUTO_GEOMETRIC),
        },
        note: "47 张。",
    },
    {
        section: "ELECTRIFYING SIGNATURES",
        label: "Electrifying Signatures",
        kind: "auto",
        variantMeta: meta("Electrifying Signatures", EXCLUSIVE_AUTO_GEOMETRIC),
        note: "49 张。拆卡盒专属。",
    },
    {
        section: "COLOSSAL SHOTS AUTOGRAPHS",
        label: "Colossal Shots Autographs",
        kind: "auto",
        variantMeta: meta("Colossal Shots Autographs", EXCLUSIVE_AUTO_GEOMETRIC),
        note: "49 张。拆卡盒专属。",
    },
];

export const TFINEST26_BASKETBALL_BOXES = assembleBoxes({
    productKey: "tfinest26-basketball",
    productName: "2025-26 Topps Finest Basketball",
    year: "2025-26",
    releaseDate: "2026-02-26",
    category: "basketball",
    maker: "topps",
    live: true,
    notes: [
        "官方给出的是平均配率，实际开封会有波动，也不保证每个卡人都出现在所有平行里。",
        "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
        "每盒两张签名卡（拆卡盒三张）是官方规格，本模拟器按平均配率抽取，实际张数会有波动。",
        "两种盒型的普卡平行不通用：Hobby 盒出普通折射版，拆卡盒出几何折射版。",
        "Arrivals、First、Finishers、Muse 四档插入卡的 SuperFractor 只在 Hobby 盒里出。",
    ],
    odds: { columns: PACK_ODDS_COLUMNS, rows: PACK_ODDS },
    sections: ROSTER_SECTIONS,
    subsets: SUBSETS,
    columnNames: { hobby: "Hobby", breaker: "Breaker Delight" },
    boxes: [
        {
            slug: "hobby-box",
            name: "2025-26 Topps Finest Basketball Hobby Box",
            column: "hobby",
            cardsPerPack: 10,
            packsPerBox: 6,
            boxesPerCase: 8,
            autoGuaranteed: true,
            boxExclusives: [
                "每盒两张签名卡",
                "每盒十张插入卡或箱级短印卡",
                "普卡每盒 28 张 Common、6 张 Uncommon、2 张 Rare",
                "每盒十二张普卡平行",
                "普卡出普通折射版，其中 Refractor / Oil Spill / Xfractor 不编号",
            ],
        },
        {
            slug: "breaker-delight-box",
            name: "2025-26 Topps Finest Basketball Breaker Delight Box",
            column: "breaker",
            cardsPerPack: 10,
            packsPerBox: 1,
            boxesPerCase: 8,
            autoGuaranteed: true,
            residualLabel: "Base Common Geometric",
            boxExclusives: [
                "每盒三张签名卡",
                "每盒五张几何折射版普卡",
                "每盒两张几何折射版插入卡或箱级短印卡",
                "普卡只出几何折射版，不出普通折射版",
                "Electrifying Signatures 与 Colossal Shots Autographs 是这个盒型专属",
            ],
        },
    ],
});
