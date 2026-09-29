/**
 * 2025-26 Topps Chrome Updates Basketball —— Value Box 卡盒定义
 *
 * 配率（odds）来源：Topps 官方 Pack Odds 表 Value Box EA 列，单位 **1:X 包**
 * （每包 4 张、每盒 7 包 = 28 张）。
 *
 * 拆盒权重模型
 * ------------
 * 官方配率本身是「互斥平均配率」，把一包里所有可出卡种的 1/X 相加即得
 * 「每包预期出的非纯 Base 卡数」，本盒该值约为 0.955。剩余部分由纯 Base 填补：
 *     baseWeight = cardsPerPack - Σ(1/odds)   ≈ 4 - 0.955 = 3.045
 * 于是每包 4 张 = 4 次「按权重抽样」，期望张数与原版官方配率完全一致。
 */

import type {
    AbsentEntry,
    BoxDefinition,
    GroupKind,
    SubsetDef,
    Subject,
    Tier,
    VariantDef,
} from "@/engine/types";
import { defineBox } from "@/catalog/define";
import {
    ACTIVATORS,
    ALTER_EGOS,
    BASE_NUMBER_REFS,
    BASE_ROSTER,
    CHROMOGRAPHS,
    CHROME_AUTOGRAPHS,
    CLUTCH_CITY,
    CLUTCH_GENE,
    FANATICAL,
    FORTUNE_15,
    GLASS_CANVAS,
    GO_TIME,
    HELIX,
    MINIONFRACTOR,
    MOMENT_IN_TIME,
    NBA_DEBUT_PATCH_AUTOGRAPHS,
    NEW_EDITIONS,
    NO_LIMIT,
    PARADOX,
    POWER_PLAYERS,
    ROOKIE_AUTOGRAPHS_LAVA_LAMP,
    STRATOSPHERIC_STARS,
    type RosterRow,
} from "./roster";

/* ------------------------------------------------------------------ */
/* 平行版本元数据                                                       */
/* ------------------------------------------------------------------ */

interface TierMeta {
    /** 平行名（空串 = 子集本身的普通版） */
    name: string;
    /** 限量数；null = 非编号 */
    numbered: number | null;
}

const TIER_META: Record<string, TierMeta> = {
    base: { name: "", numbered: null },
    refractor: { name: "Refractor", numbered: null },
    raywave: { name: "RayWave Refractor", numbered: null },
    "ruby-wave": { name: "Ruby Wave Refractor", numbered: null },
    rwb: { name: "Red White and Blue Refractor", numbered: null },
    frozenfractor: { name: "Frozenfractor", numbered: 5 },
    "frozenfractor-basketball": { name: "Frozenfractor Basketball", numbered: 5 },

    /* 编号彩虹 */
    magenta: { name: "Magenta Refractor", numbered: 399 },
    teal: { name: "Teal Refractor", numbered: 299 },
    yellow: { name: "Yellow Refractor", numbered: 275 },
    aqua: { name: "Aqua Refractor", numbered: 199 },
    blue: { name: "Blue Refractor", numbered: 150 },
    green: { name: "Green Refractor", numbered: 99 },
    purple: { name: "Purple Refractor", numbered: 75 },
    gold: { name: "Gold Refractor", numbered: 50 },
    orange: { name: "Orange Refractor", numbered: 25 },
    black: { name: "Black Refractor", numbered: 10 },
    red: { name: "Red Refractor", numbered: 5 },
    superfractor: { name: "Superfractor", numbered: 1 },

    /* Basketball 彩虹（Value Box 独占） */
    basketball: { name: "Basketball Refractor", numbered: null },
    "basketball-aqua": { name: "Basketball Aqua Refractor", numbered: 199 },
    "basketball-blue": { name: "Basketball Blue Refractor", numbered: 150 },
    "basketball-green": { name: "Basketball Green Refractor", numbered: 99 },
    "basketball-purple": { name: "Basketball Purple Refractor", numbered: 75 },
    "basketball-gold": { name: "Basketball Gold Refractor", numbered: 50 },
    "basketball-orange": { name: "Basketball Orange Refractor", numbered: 25 },
    "basketball-black": { name: "Basketball Black Refractor", numbered: 10 },
    "basketball-red": { name: "Basketball Red Refractor", numbered: 5 },

    /* Image Variation 专用 */
    "green-speckle": { name: "Green Speckle Refractor", numbered: null },
    "gold-speckle": { name: "Gold Speckle Refractor", numbered: null },
    "orange-speckle": { name: "Orange Speckle Refractor", numbered: null },
    "black-speckle": { name: "Black Speckle Refractor", numbered: null },
    "red-speckle": { name: "Red Speckle Refractor", numbered: null },

    /* Rookie Autographs Lava Lamp 专用 */
    "lava-magenta-purple": { name: "Lava Lamp Magenta/Purple", numbered: null },
    "lava-aqua-blue": { name: "Lava Lamp Aqua/Blue", numbered: null },
    "lava-blue-green": { name: "Lava Lamp Blue/Green", numbered: null },
    "lava-green-yellow": { name: "Lava Lamp Green/Yellow", numbered: null },
    "lava-gold-orange": { name: "Lava Lamp Gold/Orange", numbered: null },
    "lava-orange-black": { name: "Lava Lamp Orange/Black", numbered: null },
    "lava-black-red": { name: "Lava Lamp Black/Red", numbered: null },
};

/* ------------------------------------------------------------------ */
/* 子集定义（含官方配率）                                                 */
/* ------------------------------------------------------------------ */

interface SubsetSpec {
    key: string;
    name: string;
    code?: string;
    kind: GroupKind;
    detailed: boolean;
    /** 官方配率：tier slug -> 1:X（base 为 0 表示由残差权重计算） */
    odds: Record<string, number>;
    /** 直接给名册 */
    roster?: RosterRow[];
    /** 或复用 Base 名册的卡号列表 */
    refs?: string[];
    note?: string;
}

const SPECS: SubsetSpec[] = [
    {
        key: "base",
        name: "Base Set",
        kind: "base",
        detailed: true,
        roster: BASE_ROSTER,
        odds: {
            base: 0,
            refractor: 7,
            magenta: 218,
            teal: 291,
            yellow: 316,
            aqua: 437,
            blue: 579,
            green: 877,
            purple: 1158,
            gold: 1737,
            orange: 3474,
            black: 8686,
            red: 17397,
            frozenfractor: 17397,
            superfractor: 87481,
            basketball: 8,
            "basketball-aqua": 238,
            "basketball-blue": 211,
            "basketball-green": 319,
            "basketball-purple": 421,
            "basketball-gold": 632,
            "basketball-orange": 1263,
            "basketball-black": 3157,
            "basketball-red": 6313,
            rwb: 4,
            raywave: 9,
        },
        note: "1-140 现役 / 141-150 名宿 / 151-200 新秀。Basketball 彩虹与 Red White and Blue 为 Value Box 独占。",
    },
    {
        key: "base-image-variation",
        name: "Base Card Image Variations",
        kind: "base",
        detailed: true,
        refs: BASE_NUMBER_REFS["base-image-variation"],
        odds: {
            base: 324,
            "green-speckle": 3263,
            "gold-speckle": 6515,
            "orange-speckle": 13029,
            "black-speckle": 32230,
            "red-speckle": 64459,
            superfractor: 322295,
        },
        note: "官方仅公布 50 张变体卡（1-40 球星 + 151-157 / 161 / 163 / 196 新秀）。",
    },
    {
        key: "base-denim-tear",
        name: "Base Cards Denim Tears",
        kind: "ssp",
        detailed: true,
        refs: BASE_NUMBER_REFS["base-denim-tear"],
        odds: { base: 17365 },
        note: "Denim Tears 联名超短印（SSP），共 100 张。",
    },
    {
        key: "clutch-city",
        name: "Clutch City",
        code: "YQ",
        kind: "insert",
        detailed: true,
        roster: CLUTCH_CITY,
        odds: {
            base: 59,
            refractor: 592,
            aqua: 5415,
            blue: 7188,
            green: 10897,
            purple: 14375,
            gold: 21562,
            orange: 43430,
            black: 109350,
            red: 437400,
            superfractor: 1224721,
        },
    },
    {
        key: "new-editions",
        name: "New Editions",
        code: "GR",
        kind: "insert",
        detailed: true,
        roster: NEW_EDITIONS,
        odds: {
            base: 41,
            refractor: 409,
            aqua: 4061,
            blue: 5386,
            green: 8165,
            purple: 10781,
            gold: 16158,
            orange: 32400,
            black: 218700,
            red: 612361,
            superfractor: 874800,
        },
    },
    {
        key: "stratospheric-stars",
        name: "Stratospheric Stars",
        code: "ST",
        kind: "insert",
        detailed: true,
        roster: STRATOSPHERIC_STARS,
        odds: {
            base: 33,
            refractor: 327,
            aqua: 3223,
            blue: 4310,
            green: 6536,
            purple: 8625,
            gold: 12947,
            orange: 25948,
            black: 81648,
            red: 130290,
            superfractor: 680401,
        },
    },
    {
        key: "power-players",
        name: "Power Players",
        code: "PP",
        kind: "insert",
        detailed: true,
        roster: POWER_PLAYERS,
        odds: {
            base: 33,
            refractor: 327,
            aqua: 3218,
            blue: 4310,
            green: 6536,
            purple: 8625,
            gold: 12947,
            orange: 25948,
            black: 57230,
            red: 127575,
            superfractor: 680401,
        },
    },
    {
        key: "fortune-15",
        name: "Fortune 15",
        code: "F15",
        kind: "insert",
        detailed: true,
        roster: FORTUNE_15,
        odds: {
            base: 55,
            refractor: 545,
            aqua: 5415,
            blue: 7188,
            green: 10897,
            purple: 14375,
            gold: 21562,
            orange: 43430,
            black: 291601,
            red: 218700,
            superfractor: 1224721,
        },
    },
    {
        key: "go-time",
        name: "Go Time",
        code: "GT",
        kind: "insert",
        detailed: true,
        roster: GO_TIME,
        odds: {
            base: 55,
            refractor: 545,
            aqua: 5415,
            blue: 7188,
            green: 10897,
            purple: 14375,
            gold: 21562,
            orange: 43430,
            black: 109350,
            red: 204121,
            superfractor: 1224721,
        },
    },
    {
        key: "activators",
        name: "Activators",
        code: "AC",
        kind: "insert",
        detailed: true,
        roster: ACTIVATORS,
        odds: {
            base: 41,
            refractor: 409,
            aqua: 4061,
            blue: 5386,
            green: 8165,
            purple: 10781,
            gold: 16158,
            orange: 32400,
            black: 218700,
            red: 765450,
            superfractor: 874800,
        },
    },
    {
        key: "clutch-gene",
        name: "Clutch Gene",
        code: "CG",
        kind: "insert",
        detailed: true,
        roster: CLUTCH_GENE,
        odds: {
            base: 28,
            refractor: 273,
            aqua: 2708,
            blue: 3592,
            green: 5444,
            purple: 7188,
            gold: 10781,
            orange: 21562,
            black: 165503,
            red: 153091,
            superfractor: 556691,
        },
    },
    {
        key: "moment-in-time",
        name: "Moment in Time",
        code: "MT",
        kind: "insert",
        detailed: true,
        roster: MOMENT_IN_TIME,
        odds: {
            base: 33,
            refractor: 327,
            aqua: 3249,
            blue: 4310,
            green: 6536,
            purple: 8625,
            gold: 12947,
            orange: 25948,
            black: 81648,
            red: 122473,
            superfractor: 680401,
        },
    },
    {
        key: "no-limit",
        name: "No Limit",
        code: "IP",
        kind: "insert",
        detailed: true,
        roster: NO_LIMIT,
        odds: {
            base: 82,
            refractor: 817,
            aqua: 6628,
            blue: 10781,
            green: 16330,
            purple: 21562,
            gold: 32400,
            orange: 65145,
            black: 765450,
            red: 340201,
            superfractor: 2041200,
        },
    },
    {
        key: "helix",
        name: "Helix",
        code: "H",
        kind: "insert",
        detailed: true,
        roster: HELIX,
        odds: { base: 6991, superfractor: 746667 },
        note: "超低概率插入卡，仅有普通版与 Superfractor。",
    },
    {
        key: "chromographs",
        name: "Chromographs",
        code: "CH",
        kind: "insert",
        detailed: true,
        roster: CHROMOGRAPHS,
        odds: {
            base: 183,
            refractor: 1150,
            purple: 2445,
            gold: 2710,
            orange: 5208,
            black: 12223,
            red: 23828,
            superfractor: 113401,
        },
        note: "零售独占插入卡，名义上不是签名卡，却收录了大量名宿、教练与解说。",
    },
    {
        key: "fanatical",
        name: "Fanatical",
        code: "FAN",
        kind: "insert",
        detailed: true,
        roster: FANATICAL,
        odds: {
            base: 380,
            gold: 9195,
            orange: 18390,
            black: 46043,
            red: 91398,
            superfractor: 437400,
        },
        note: "零售独占短印。",
    },
    {
        key: "glass-canvas",
        name: "Glass Canvas",
        code: "GC",
        kind: "insert",
        detailed: true,
        roster: GLASS_CANVAS,
        odds: { base: 596, superfractor: 437400 },
        note: "零售独占短印。",
    },
    {
        key: "paradox",
        name: "Paradox",
        code: "PX",
        kind: "insert",
        detailed: true,
        roster: PARADOX,
        odds: { base: 596, superfractor: 437400 },
        note: "零售独占短印。",
    },
    {
        key: "alter-egos",
        name: "Alter Egos",
        code: "AE",
        kind: "ssp",
        detailed: true,
        roster: ALTER_EGOS,
        odds: { base: 15386, superfractor: 3034584 },
        note: "超短印（SSP）。",
    },
    {
        key: "minionfractor",
        name: "Minionfractor",
        code: "M",
        kind: "ssp",
        detailed: true,
        roster: MINIONFRACTOR,
        odds: { base: 35073, red: 708750, superfractor: 3402001 },
        note: "Minions 联名超短印（SSP）。",
    },
    {
        key: "topps-chrome-autographs",
        name: "Topps Chrome Autographs",
        code: "TCA",
        kind: "auto",
        detailed: true,
        roster: CHROME_AUTOGRAPHS,
        odds: {
            base: 30619,
            refractor: 61237,
            blue: 61237,
            green: 67293,
            purple: 86248,
            gold: 122473,
            black: 211159,
            orange: 278346,
            red: 1530900,
            superfractor: 3061800,
        },
        note: "Value Box 无签名保证，这是「彩蛋级」概率。",
    },
    {
        key: "rookie-autographs-lava-lamp",
        name: "Rookie Autographs",
        code: "RA",
        kind: "auto",
        detailed: true,
        roster: ROOKIE_AUTOGRAPHS_LAVA_LAMP,
        odds: {
            "lava-blue-green": 37340,
            "lava-green-yellow": 51459,
            "lava-aqua-blue": 61237,
            "lava-magenta-purple": 63788,
            "lava-gold-orange": 95682,
            "lava-orange-black": 291601,
            "lava-black-red": 340201,
        },
        note: "Rookie Autographs 的 Lava Lamp 平行，Value Box 只出 Lava Lamp 版本。",
    },
    {
        key: "nba-debut-patch-autographs",
        name: "NBA Debut Patch Autographs",
        code: "DPA",
        kind: "relic",
        detailed: true,
        roster: NBA_DEBUT_PATCH_AUTOGRAPHS,
        odds: { base: 448000 },
        note: "93 张全部为 1/1 实物 Patch 签名。官方配率存在争议（可能只统计了约 32 张），实际概率或更高。",
    },
];

/* ------------------------------------------------------------------ */
/* 本盒不含的子集（Value Box 无配率）                                     */
/* ------------------------------------------------------------------ */

interface AbsentSubset extends AbsentEntry {}

export const ABSENT_SUBSETS: AbsentSubset[] = [
    { name: "Shadow Etch", code: "SE", count: 15, where: "Hobby / Jumbo / Delight", kind: "insert" },
    { name: "Captains", code: "SC", count: 20, where: "Hobby / Jumbo / Delight", kind: "insert" },
    { name: "Celebracion", code: "CB", count: 15, where: "Hobby / Jumbo / Delight", kind: "insert" },
    { name: "Radiating Rookies", code: "RR", count: 15, where: "Hobby / Jumbo / Delight", kind: "insert" },
    { name: "Havoc Marks", code: "HM", count: 91, where: "Hobby / Jumbo / Delight", kind: "auto" },
    { name: "1980-81 Topps Basketball Autographs", code: "80TBA", count: 50, where: "Hobby / Jumbo / Delight", kind: "auto" },
    { name: "Future Stars Autographs", code: "FS", count: 50, where: "Hobby / Jumbo / Delight", kind: "auto" },
    { name: "Druski & Spike Lee Chrome Autographs", code: "DA / SLA", count: 2, where: "Hobby", kind: "auto" },
    { name: "Sapphire Selections", code: "SS", count: 20, where: "Sapphire", kind: "insert" },
    { name: "Infinite Sapphire", code: "INF", count: 20, where: "Sapphire", kind: "insert" },
    { name: "NBA Debut Patch（非签名）", code: "DP", count: 6, where: "Hobby / Jumbo / Delight", kind: "relic" },
];

/* ------------------------------------------------------------------ */
/* 构造逻辑                                                             */
/* ------------------------------------------------------------------ */

const toSubjects = (rows: RosterRow[]): Subject[] =>
    rows.map((row) => ({
        no: row[0],
        player: row[1],
        team: row[2],
        rookie: row[3] === "R",
    }));

/** 稀有度判定：编号卡按限量数，非编号卡按配率 */
const tierOf = (odds: number, numbered: number | null, kind: GroupKind): Tier => {
    if (kind === "auto" || kind === "relic" || kind === "ssp") {
        return odds > 100000 ? "mythic" : "legendary";
    }
    if (numbered !== null) {
        if (numbered >= 100) return "epic";
        if (numbered >= 20) return "legendary";
        return "mythic";
    }
    if (odds <= 12) return "uncommon";
    if (odds <= 90) return "rare";
    if (odds <= 1500) return "epic";
    if (odds <= 80000) return "legendary";
    return "mythic";
};

const CARDS_PER_PACK = 4;
const PACKS_PER_BOX = 7;

const build = (): BoxDefinition => {
    const subsets: SubsetDef[] = [];
    const variants: VariantDef[] = [];
    let premiumWeight = 0;

    for (const spec of SPECS) {
        const subjects = spec.roster ? toSubjects(spec.roster) : [];
        if (spec.refs) {
            const byNo = new Map(BASE_ROSTER.map((row) => [row[0], row]));
            for (const no of spec.refs) {
                const row = byNo.get(no);
                if (row) subjects.push(...toSubjects([row]));
            }
        }

        subsets.push({
            key: spec.key,
            name: spec.name,
            code: spec.code,
            kind: spec.kind,
            detailed: spec.detailed,
            inBox: true,
            subjects,
            note: spec.note,
        });

        for (const [slug, odds] of Object.entries(spec.odds)) {
            const meta = TIER_META[slug] ?? { name: slug, numbered: null };
            const numbered = meta.numbered;
            // odds === 0 是「普通 Base」占位，权重稍后按残差补
            const weight = odds > 0 ? 1 / odds : 0;
            if (odds > 0) premiumWeight += weight;

            variants.push({
                key: `${spec.key}:${slug}`,
                subset: spec.key,
                subsetName: spec.name,
                variantName: meta.name,
                fullName: meta.name ? `${spec.name} · ${meta.name}` : spec.name,
                group: spec.kind,
                tier: odds > 0 ? tierOf(odds, numbered, spec.kind) : "common",
                odds,
                numbered,
                weight,
            });
        }
    }

    const baseVariants = variants.filter((v) => v.odds === 0);
    const baseWeight = Math.max(0.5, CARDS_PER_PACK - premiumWeight);
    for (const v of baseVariants) v.weight = baseWeight;

    return defineBox({
        slug: "value-box",
        name: "2025-26 Topps Chrome Updates Basketball Value Box",
        category: "basketball",
        maker: "topps",
        productKey: "tcu26-basketball",
        productName: "2025-26 Topps Chrome Updates Basketball",
        live: true,
        releaseDate: "2026-08-06",
        cardsPerPack: CARDS_PER_PACK,
        packsPerBox: PACKS_PER_BOX,
        boxesPerCase: 40,
        autoGuaranteed: false,
        boxExclusives: [
            "Basketball Refractor 彩虹（Value Box 独占）",
            "Red White and Blue Refractor（1:4）",
            "零售独占短印：Glass Canvas / Paradox / Fanatical",
            "零售独占：Chromographs",
            "追卡：Denim Tears（SSP）/ Alter Egos（SSP）/ Minionfractor（SSP）",
        ],
        notes: [
            "官方产品名为 Topps Chrome Updates Basketball —— 该系列首个 NBA 版本。",
            "官方配率是「平均配率」，实际开封结果会有波动，且不保证每个卡人都出现在所有平行里。",
            "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
        ],
        absentSubsets: ABSENT_SUBSETS,
        subsets,
        variants,
        baseWeight,
    });
};

/**
 * 本系列已实现的全部盒型。
 * 后续把 Hobby / Jumbo / Mega 的配率补上后，写成同目录下的 box 数据再 push 进来即可。
 */
export const TCU26_BASKETBALL_BOXES: BoxDefinition[] = [build()];
