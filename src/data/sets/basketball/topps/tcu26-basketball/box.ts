/**
 * 2025-26 Topps Chrome Updates Basketball —— 四个盒型的卡盒定义
 *
 * 配率（odds）来源：Topps 官方 Pack Odds 表，单位 **1:X 包**。
 * 每个盒型取表里对应的一列（Hobby / Jumbo / Value Box EA / Mega Box EA），
 * 表本身见同目录 pack-odds.generated.ts —— 这里只登记行标签，不抄数字。
 *
 * 各盒规格（官方产品资料）：
 *     Hobby Box   4 张/包 × 20 包 =  80 张，每盒 1 张签名
 *     Jumbo Box  11 张/包 × 12 包 = 132 张，每盒 3 张签名
 *     Value Box   4 张/包 ×  7 包 =  28 张，无签名保证
 *     Mega Box    6 张/包 ×  7 包 =  42 张，无签名保证
 *
 * 拆盒权重模型
 * ------------
 * 官方配率本身是「互斥平均配率」，把一包里所有可出卡种的 1/X 相加即得
 * 「每包预期出的非纯 Base 卡数」，剩余部分由纯 Base 填补：
 *     baseWeight = cardsPerPack - Σ(1/odds)
 * 于是每包若干张 = 同次数「按权重抽样」，期望张数与原版官方配率完全一致。
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
import { PACK_ODDS, PACK_ODDS_COLUMNS, type PackOddsColumn } from "./pack-odds.generated";
import {
    ACTIVATORS,
    ALTER_EGOS,
    AUTOGRAPHS_1980_81,
    BASE_NUMBER_REFS,
    BASE_ROSTER,
    CAPTAINS,
    CELEBRACION,
    CHROMOGRAPHS,
    CHROME_AUTOGRAPHS,
    CLUTCH_CITY,
    CLUTCH_GENE,
    DRUSKI_AUTOGRAPHS,
    FANATICAL,
    FORTUNE_15,
    FUTURE_STARS_AUTOGRAPHS,
    GLASS_CANVAS,
    GO_TIME,
    HAVOC_MARKS,
    HELIX,
    MINIONFRACTOR,
    MOMENT_IN_TIME,
    NBA_DEBUT_PATCH_AUTOGRAPHS,
    NEW_EDITIONS,
    NO_LIMIT,
    PARADOX,
    POWER_PLAYERS,
    RADIATING_ROOKIES,
    ROOKIE_AUTOGRAPHS_LAVA_LAMP,
    SHADOW_ETCH,
    SPIKE_LEE_AUTOGRAPHS,
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

    /* Hobby / Jumbo 专属 Wave 家族 */
    prism: { name: "Prism Refractor", numbered: null },
    negative: { name: "Negative Refractor", numbered: null },
    wave: { name: "Wave Refractor", numbered: null },
    "yellow-wave": { name: "Yellow Wave Refractor", numbered: null },
    "aqua-wave": { name: "Aqua Wave Refractor", numbered: null },
    "blue-wave": { name: "Blue Wave Refractor", numbered: null },
    "green-wave": { name: "Green Wave Refractor", numbered: null },
    "purple-wave": { name: "Purple Wave Refractor", numbered: null },
    "gold-wave": { name: "Gold Wave Refractor", numbered: null },
    "orange-wave": { name: "Orange Wave Refractor", numbered: null },
    "black-wave": { name: "Black Wave Refractor", numbered: null },
    "red-wave": { name: "Red Wave Refractor", numbered: null },

    /* Mega 专属 */
    "x-fractor": { name: "X-Fractor", numbered: null },
    "raywave-yellow": { name: "RayWave Yellow Refractor", numbered: null },
    "raywave-aqua": { name: "RayWave Aqua Refractor", numbered: null },
    "raywave-blue": { name: "RayWave Blue Refractor", numbered: null },
    "raywave-green": { name: "RayWave Green Refractor", numbered: null },
    "raywave-purple": { name: "RayWave Purple Refractor", numbered: null },
    "raywave-gold": { name: "RayWave Gold Refractor", numbered: null },
    "raywave-orange": { name: "RayWave Orange Refractor", numbered: null },
    "raywave-black": { name: "RayWave Black Refractor", numbered: null },
    "raywave-red": { name: "RayWave Red Refractor", numbered: null },
    "raywave-magenta": { name: "RayWave Magenta Refractor", numbered: null },
};

/* ------------------------------------------------------------------ */
/* 子集定义（只登记官方表里的行标签，数字一律查表得来）                     */
/* ------------------------------------------------------------------ */

/** 一个平行：[slug, 官方 Pack Odds 表的行标签]；标签为 null 表示纯 Base，权重由残差决定 */
type VariantSpec = [slug: string, label: string | null];

interface SubsetSpec {
    key: string;
    name: string;
    code?: string;
    kind: GroupKind;
    detailed: boolean;
    /** 顺序即卡种顺序，同时决定拆盒抽样顺序，重排会改变开盒结果 */
    variants: VariantSpec[];
    /** 官方表整行缺失时的补录配率：slug -> 各盒型列的值 */
    manual?: Record<string, Partial<Record<PackOddsColumn, number>>>;
    /** 直接给名册 */
    roster?: RosterRow[];
    /** 或复用 Base 名册的卡号列表 */
    refs?: string[];
    note?: string;
}

const ODDS_BY_LABEL = new Map(PACK_ODDS.map((row) => [row.label, row.odds]));

const columnIndex = (column: PackOddsColumn): number => PACK_ODDS_COLUMNS.indexOf(column);

/** 取某个平行在某个盒型列的配率；null 表示本盒没有这个卡种 */
const oddsAt = (
    spec: SubsetSpec,
    slug: string,
    label: string | null,
    column: PackOddsColumn,
): number | null => {
    const manual = spec.manual?.[slug]?.[column];
    if (manual !== undefined) return manual;
    if (label === null) return 0;
    return ODDS_BY_LABEL.get(label)?.[columnIndex(column)] ?? null;
};

const SPECS: SubsetSpec[] = [
    {
        key: "base",
        name: "Base Set",
        kind: "base",
        detailed: true,
        roster: BASE_ROSTER,
        variants: [
            ["base", null],
            ["refractor", "Base Refractors"],
            ["magenta", "Base Refractors Magenta"],
            ["teal", "Base Refractors Teal"],
            ["yellow", "Base Refractors Yellow"],
            ["aqua", "Base Refractors Aqua"],
            ["blue", "Base Refractors Blue"],
            ["green", "Base Refractors Green"],
            ["purple", "Base Refractors Purple"],
            ["gold", "Base Refractors Gold"],
            ["orange", "Base Refractors Orange"],
            ["black", "Base Refractors Black"],
            ["red", "Base Refractors Red"],
            ["frozenfractor", "Base Frozenfractors"],
            ["superfractor", "Base Superfractors"],
            ["basketball", "Base Refractors Basketball"],
            ["basketball-aqua", "Base Refractors Aqua Basketball"],
            ["basketball-blue", "Base Refractors Blue Basketball"],
            ["basketball-green", "Base Refractors Green Basketball"],
            ["basketball-purple", "Base Refractors Purple Basketball"],
            ["basketball-gold", "Base Refractors Gold Basketball"],
            ["basketball-orange", "Base Refractors Orange Basketball"],
            ["basketball-black", "Base Refractors Black Basketball"],
            ["basketball-red", "Base Refractors Red Basketball"],
            ["rwb", "Base Refractors Red White and Blue"],
            ["raywave", "Base Refractors RayWave"],
            /* Hobby / Jumbo 专属 */
            ["prism", "Base Refractors Prism"],
            ["negative", "Base Refractors Negative"],
            ["wave", "Base Refractors Wave"],
            ["yellow-wave", "Base Refractors Yellow Wave"],
            ["aqua-wave", "Base Refractors Aqua Wave"],
            ["blue-wave", "Base Refractors Blue Wave"],
            ["green-wave", "Base Refractors Green Wave"],
            ["purple-wave", "Base Refractors Purple Wave"],
            ["gold-wave", "Base Refractors Gold Wave"],
            ["orange-wave", "Base Refractors Orange Wave"],
            ["black-wave", "Base Refractors Black Wave"],
            ["red-wave", "Base Refractors Red Wave"],
            /* Mega 专属 */
            ["x-fractor", "Base X-Fractors"],
            ["raywave-yellow", "Base Refractors RayWave Yellow"],
            ["raywave-aqua", "Base Refractors RayWave Aqua"],
            ["raywave-blue", "Base Refractors RayWave Blue"],
            ["raywave-green", "Base Refractors RayWave Green"],
            ["raywave-purple", "Base Refractors RayWave Purple"],
            ["raywave-gold", "Base Refractors RayWave Gold"],
            ["raywave-orange", "Base Refractors RayWave Orange"],
            ["raywave-black", "Base Refractors RayWave Black"],
            ["raywave-red", "Base Refractors RayWave Red"],
            ["raywave-magenta", "Base Refractors RayWave Magenta"],
        ],
        note: "1-140 现役 / 141-150 名宿 / 151-200 新秀。Basketball 彩虹与 Red White and Blue 只在 Value Box，Wave 系列只在 Hobby / Jumbo，RayWave 系列与 X-Fractor 只在 Mega。",
    },
    {
        key: "base-image-variation",
        name: "Base Card Image Variations",
        kind: "base",
        detailed: true,
        refs: BASE_NUMBER_REFS["base-image-variation"],
        variants: [
            ["base", "Base Card Image Variation"],
            ["green-speckle", "Base Card Image Variation Refractors Green Speckle"],
            ["gold-speckle", "Base Card Image Variation Refractors Gold Speckle"],
            ["orange-speckle", "Base Card Image Variation Refractors Orange Speckle"],
            ["black-speckle", "Base Card Image Variation Refractors Black Speckle"],
            ["red-speckle", "Base Card Image Variation Refractors Red Speckle"],
            ["superfractor", "Base Card Image Variation Superfractors"],
        ],
        note: "官方仅公布 50 张变体卡（1-40 球星 + 151-157 / 161 / 163 / 196 新秀）。",
    },
    {
        key: "base-denim-tear",
        name: "Base Cards Denim Tears",
        kind: "ssp",
        detailed: true,
        refs: BASE_NUMBER_REFS["base-denim-tear"],
        variants: [["base", "Base Refractors Denim Tears"]],
        note: "Denim Tears 联名超短印（SSP），共 100 张。",
    },
    {
        key: "clutch-city",
        name: "Clutch City",
        code: "YQ",
        kind: "insert",
        detailed: true,
        roster: CLUTCH_CITY,
        variants: [
            ["base", "Clutch City"],
            ["refractor", "Clutch City Refractors"],
            ["aqua", "Clutch City Refractors Aqua"],
            ["blue", "Clutch City Refractors Blue"],
            ["green", "Clutch City Refractors Green"],
            ["purple", "Clutch City Refractors Purple"],
            ["gold", "Clutch City Refractors Gold"],
            ["orange", "Clutch City Refractors Orange"],
            ["black", "Clutch City Refractors Black"],
            ["red", "Clutch City Refractors Red"],
            ["superfractor", "Clutch City Superfractors"],
        ],
    },
    {
        key: "new-editions",
        name: "New Editions",
        code: "GR",
        kind: "insert",
        detailed: true,
        roster: NEW_EDITIONS,
        variants: [
            ["base", "New Edition"],
            ["refractor", "New Edition Refractors"],
            ["aqua", "New Edition Refractors Aqua"],
            ["blue", "New Edition Refractors Blue"],
            ["green", "New Edition Refractors Green"],
            ["purple", "New Edition Refractors Purple"],
            ["gold", "New Edition Refractors Gold"],
            ["orange", "New Edition Refractors Orange"],
            ["black", "New Edition Refractors Black"],
            ["red", "New Edition Refractors Red"],
            ["superfractor", "New Edition Superfractors"],
        ],
    },
    {
        key: "stratospheric-stars",
        name: "Stratospheric Stars",
        code: "ST",
        kind: "insert",
        detailed: true,
        roster: STRATOSPHERIC_STARS,
        variants: [
            ["base", "Stratospheric Stars"],
            ["refractor", "Stratospheric Stars Refractors"],
            ["aqua", "Stratospheric Stars Refractors Aqua"],
            ["blue", "Stratospheric Stars Refractors Blue"],
            ["green", "Stratospheric Stars Refractors Green"],
            ["purple", "Stratospheric Stars Refractors Purple"],
            ["gold", "Stratospheric Stars Refractors Gold"],
            ["orange", "Stratospheric Stars Refractors Orange"],
            ["black", "Stratospheric Stars Refractors Black"],
            ["red", "Stratospheric Stars Refractors Red"],
            ["superfractor", "Stratospheric Stars Superfractors"],
        ],
    },
    {
        key: "power-players",
        name: "Power Players",
        code: "PP",
        kind: "insert",
        detailed: true,
        roster: POWER_PLAYERS,
        variants: [
            ["base", "Power Players"],
            ["refractor", "Power Players Refractors"],
            ["aqua", "Power Players Refractors Aqua"],
            ["blue", "Power Players Refractors Blue"],
            ["green", "Power Players Refractors Green"],
            ["purple", "Power Players Refractors Purple"],
            ["gold", "Power Players Refractors Gold"],
            ["orange", "Power Players Refractors Orange"],
            ["black", "Power Players Refractors Black"],
            ["red", "Power Players Refractors Red"],
            ["superfractor", "Power Players Superfractors"],
        ],
    },
    {
        key: "fortune-15",
        name: "Fortune 15",
        code: "F15",
        kind: "insert",
        detailed: true,
        roster: FORTUNE_15,
        variants: [
            ["base", "Fortune 15"],
            ["refractor", "Fortune 15 Refractors"],
            ["aqua", "Fortune 15 Refractors Aqua"],
            ["blue", "Fortune 15 Refractors Blue"],
            ["green", "Fortune 15 Refractors Green"],
            ["purple", "Fortune 15 Refractors Purple"],
            ["gold", "Fortune 15 Refractors Gold"],
            ["orange", "Fortune 15 Refractors Orange"],
            ["black", "Fortune 15 Refractors Black"],
            ["red", "Fortune 15 Refractors Red"],
            ["superfractor", "Fortune 15 Superfractors"],
        ],
    },
    {
        key: "go-time",
        name: "Go Time",
        code: "GT",
        kind: "insert",
        detailed: true,
        roster: GO_TIME,
        variants: [
            ["base", "Go Time"],
            ["refractor", "Go Time Refractors"],
            ["aqua", "Go Time Refractors Aqua"],
            ["blue", "Go Time Refractors Blue"],
            ["green", "Go Time Refractors Green"],
            ["purple", "Go Time Refractors Purple"],
            ["gold", "Go Time Refractors Gold"],
            ["orange", "Go Time Refractors Orange"],
            ["black", "Go Time Refractors Black"],
            ["red", "Go Time Refractors Red"],
            ["superfractor", "Go Time Superfractors"],
        ],
    },
    {
        key: "activators",
        name: "Activators",
        code: "AC",
        kind: "insert",
        detailed: true,
        roster: ACTIVATORS,
        variants: [
            ["base", "Activators"],
            ["refractor", "Activators Refractors"],
            ["aqua", "Activators Refractors Aqua"],
            ["blue", "Activators Refractors Blue"],
            ["green", "Activators Refractors Green"],
            ["purple", "Activators Refractors Purple"],
            ["gold", "Activators Refractors Gold"],
            ["orange", "Activators Refractors Orange"],
            ["black", "Activators Refractors Black"],
            ["red", "Activators Refractors Red"],
            ["superfractor", "Activators Superfractors"],
        ],
    },
    {
        key: "clutch-gene",
        name: "Clutch Gene",
        code: "CG",
        kind: "insert",
        detailed: true,
        roster: CLUTCH_GENE,
        variants: [
            ["base", "Clutch Gene"],
            ["refractor", "Clutch Gene Refractors"],
            ["aqua", "Clutch Gene Refractors Aqua"],
            ["blue", "Clutch Gene Refractors Blue"],
            ["green", "Clutch Gene Refractors Green"],
            ["purple", "Clutch Gene Refractors Purple"],
            ["gold", "Clutch Gene Refractors Gold"],
            ["orange", "Clutch Gene Refractors Orange"],
            ["black", "Clutch Gene Refractors Black"],
            ["red", "Clutch Gene Refractors Red"],
            ["superfractor", "Clutch Gene Superfractors"],
        ],
    },
    {
        key: "moment-in-time",
        name: "Moment in Time",
        code: "MT",
        kind: "insert",
        detailed: true,
        roster: MOMENT_IN_TIME,
        variants: [
            ["base", "Moment in Time"],
            ["refractor", "Moment in Time Refractors"],
            ["aqua", "Moment in Time Refractors Aqua"],
            ["blue", "Moment in Time Refractors Blue"],
            ["green", "Moment in Time Refractors Green"],
            ["purple", "Moment in Time Refractors Purple"],
            ["gold", "Moment in Time Refractors Gold"],
            ["orange", "Moment in Time Refractors Orange"],
            ["black", "Moment in Time Refractors Black"],
            ["red", "Moment in Time Refractors Red"],
            ["superfractor", "Moment in Time Superfractors"],
        ],
    },
    {
        key: "no-limit",
        name: "No Limit",
        code: "IP",
        kind: "insert",
        detailed: true,
        roster: NO_LIMIT,
        variants: [
            ["base", "No Limit"],
            ["refractor", "No Limit Refractors"],
            ["aqua", "No Limit Refractors Aqua"],
            ["blue", "No Limit Refractors Blue"],
            ["green", "No Limit Refractors Green"],
            ["purple", "No Limit Refractors Purple"],
            ["gold", "No Limit Refractors Gold"],
            ["orange", "No Limit Refractors Orange"],
            ["black", "No Limit Refractors Black"],
            ["red", "No Limit Refractors Red"],
            ["superfractor", "No Limit Superfractors"],
        ],
    },
    {
        key: "captains",
        name: "Captains",
        code: "SC",
        kind: "insert",
        detailed: true,
        roster: CAPTAINS,
        variants: [
            ["base", "Captains"],
            ["superfractor", "Captains Superfractors"],
        ],
    },
    {
        key: "celebracion",
        name: "Celebracion",
        code: "CB",
        kind: "insert",
        detailed: true,
        roster: CELEBRACION,
        variants: [
            ["base", "Celebracion"],
            ["superfractor", "Celebracion Superfractors"],
        ],
    },
    {
        key: "radiating-rookies",
        name: "Radiating Rookies",
        code: "RR",
        kind: "insert",
        detailed: true,
        roster: RADIATING_ROOKIES,
        variants: [
            ["base", "Radiating Rookies"],
            ["superfractor", "Radiating Rookies Superfractors"],
        ],
    },
    {
        key: "shadow-etch",
        name: "Shadow Etch",
        code: "SE",
        kind: "insert",
        detailed: true,
        roster: SHADOW_ETCH,
        variants: [
            ["base", "Shadow Etch"],
            ["superfractor", "Shadow Etch Superfractors"],
        ],
    },
    {
        key: "helix",
        name: "Helix",
        code: "H",
        kind: "insert",
        detailed: true,
        roster: HELIX,
        variants: [
            ["base", "Helix"],
            ["superfractor", "Helix Superfractors"],
        ],
        note: "超低概率插入卡，仅有普通版与 Superfractor。",
    },
    {
        key: "chromographs",
        name: "Chromographs",
        code: "CH",
        kind: "insert",
        detailed: true,
        roster: CHROMOGRAPHS,
        variants: [
            ["base", "Chromographs"],
            ["refractor", "Chromographs Refractors"],
            ["purple", "Chromographs Refractors Purple"],
            ["gold", "Chromographs Refractors Gold"],
            ["orange", "Chromographs Refractors Orange"],
            ["black", "Chromographs Refractors Black"],
            ["red", "Chromographs Refractors Red"],
            ["superfractor", "Chromographs Superfractors"],
        ],
        note: "零售独占插入卡，名义上不是签名卡，却收录了大量名宿、教练与解说。",
    },
    {
        key: "fanatical",
        name: "Fanatical",
        code: "FAN",
        kind: "insert",
        detailed: true,
        roster: FANATICAL,
        variants: [
            ["base", "Fanatical"],
            ["gold", "Fanatical Refractors Gold"],
            ["orange", "Fanatical Refractors Orange"],
            ["black", "Fanatical Refractors Black"],
            ["red", "Fanatical Refractors Red"],
            ["superfractor", "Fanatical Superfractors"],
        ],
        note: "零售独占短印。",
    },
    {
        key: "glass-canvas",
        name: "Glass Canvas",
        code: "GC",
        kind: "insert",
        detailed: true,
        roster: GLASS_CANVAS,
        variants: [
            ["base", "Glass Canvas"],
            ["superfractor", "Glass Canvas Superfractors"],
        ],
        note: "零售独占短印。",
    },
    {
        key: "paradox",
        name: "Paradox",
        code: "PX",
        kind: "insert",
        detailed: true,
        roster: PARADOX,
        variants: [
            ["base", "Paradox"],
            ["superfractor", "Paradox Superfractors"],
        ],
        note: "零售独占短印。",
    },
    {
        key: "alter-egos",
        name: "Alter Egos",
        code: "AE",
        kind: "ssp",
        detailed: true,
        roster: ALTER_EGOS,
        variants: [
            ["base", "Alter Ego"],
            ["superfractor", "Alter Ego Superfractors"],
        ],
        // 官方表没有 Alter Ego Superfractors 这一行，沿用上线时登记的估值（仅 Value Box）
        manual: { superfractor: { "value-box-ea": 3034584 } },
        note: "超短印（SSP）。",
    },
    {
        key: "minionfractor",
        name: "Minionfractor",
        code: "M",
        kind: "ssp",
        detailed: true,
        roster: MINIONFRACTOR,
        variants: [
            ["base", "Minionfractor"],
            ["red", "Minionfractor Red"],
            ["superfractor", "Minionfractor Superfractors"],
        ],
        note: "Minions 联名超短印（SSP）。",
    },
    {
        key: "topps-chrome-autographs",
        name: "Topps Chrome Autographs",
        code: "TCA",
        kind: "auto",
        detailed: true,
        roster: CHROME_AUTOGRAPHS,
        variants: [
            ["base", "Topps Chrome Autographs"],
            ["refractor", "Topps Chrome Autographs Refractors"],
            ["blue", "Topps Chrome Autographs Refractors Blue"],
            ["green", "Topps Chrome Autographs Refractors Green"],
            ["purple", "Topps Chrome Autographs Refractors Purple"],
            ["gold", "Topps Chrome Autographs Refractors Gold"],
            ["black", "Topps Chrome Autographs Refractors Black"],
            ["orange", "Topps Chrome Autographs Refractors Orange"],
            ["red", "Topps Chrome Autographs Refractors Red"],
            ["superfractor", "Topps Chrome Autographs Superfractors"],
        ],
        note: "本系列的主力签名卡。",
    },
    {
        key: "havoc-marks",
        name: "Havoc Marks",
        code: "HM",
        kind: "auto",
        detailed: true,
        roster: HAVOC_MARKS,
        variants: [
            ["base", "Havoc Marks"],
            ["refractor", "Havoc Marks Refractors"],
            ["blue", "Havoc Marks Refractors Blue"],
            ["green", "Havoc Marks Refractors Green"],
            ["purple", "Havoc Marks Refractors Purple"],
            ["gold", "Havoc Marks Refractors Gold"],
            ["orange", "Havoc Marks Refractors Orange"],
            ["black", "Havoc Marks Refractors Black"],
            ["red", "Havoc Marks Refractors Red"],
            ["superfractor", "Havoc Marks Superfractors"],
        ],
    },
    {
        key: "autographs-1980-81",
        name: "1980-81 Topps Basketball Autographs",
        code: "80TBA",
        kind: "auto",
        detailed: true,
        roster: AUTOGRAPHS_1980_81,
        variants: [
            ["base", "1980-81 Topps Basketball Autographs"],
            ["refractor", "1980-81 Topps Basketball Autographs Refractors"],
            ["blue", "1980-81 Topps Basketball Autographs Refractors Blue"],
            ["green", "1980-81 Topps Basketball Autographs Refractors Green"],
            ["purple", "1980-81 Topps Basketball Autographs Refractors Purple"],
            ["gold", "1980-81 Topps Basketball Autographs Refractors Gold"],
            ["orange", "1980-81 Topps Basketball Autographs Refractors Orange"],
            ["black", "1980-81 Topps Basketball Autographs Refractors Black"],
            ["red", "1980-81 Topps Basketball Autographs Refractors Red"],
            ["superfractor", "1980-81 Topps Basketball Autographs Superfractors"],
        ],
    },
    {
        key: "future-stars-autographs",
        name: "Future Stars Autographs",
        code: "FS",
        kind: "auto",
        detailed: true,
        roster: FUTURE_STARS_AUTOGRAPHS,
        variants: [
            ["base", "Future Stars Autographs"],
            ["refractor", "Future Stars Autographs Refractors"],
            ["blue", "Future Stars Autographs Refractors Blue"],
            ["green", "Future Stars Autographs Refractors Green"],
            ["purple", "Future Stars Autographs Refractors Purple"],
            ["gold", "Future Stars Autographs Refractors Gold"],
            ["orange", "Future Stars Autographs Refractors Orange"],
            ["black", "Future Stars Autographs Refractors Black"],
            ["red", "Future Stars Autographs Refractors Red"],
            ["superfractor", "Future Stars Autographs Superfractors"],
        ],
    },
    {
        key: "druski-autographs",
        name: "Druski Chrome Autographs",
        code: "DA",
        kind: "auto",
        detailed: true,
        roster: DRUSKI_AUTOGRAPHS,
        variants: [
            ["gold", "Topps Chrome Autographs Druski Refractors Gold"],
            ["orange", "Topps Chrome Autographs Druski Refractors Orange"],
            ["black", "Topps Chrome Autographs Druski Refractors Black"],
            ["red", "Topps Chrome Autographs Druski Refractors Red"],
            ["superfractor", "Topps Chrome Autographs Druski Superfractors"],
        ],
    },
    {
        key: "spike-lee-autographs",
        name: "Spike Lee Chrome Autographs",
        code: "SLA",
        kind: "auto",
        detailed: true,
        roster: SPIKE_LEE_AUTOGRAPHS,
        variants: [
            ["orange", "Topps Chrome Autographs Spike Lee Refractors Orange"],
            ["black", "Topps Chrome Autographs Spike Lee Refractors Black"],
            ["red", "Topps Chrome Autographs Spike Lee Refractors Red"],
            ["superfractor", "Topps Chrome Autographs Spike Lee Superfractors"],
        ],
    },
    {
        key: "rookie-autographs-lava-lamp",
        name: "Rookie Autographs",
        code: "RA",
        kind: "auto",
        detailed: true,
        roster: ROOKIE_AUTOGRAPHS_LAVA_LAMP,
        variants: [
            ["lava-blue-green", "Rookie Autographs Lava Lamp Blue/Green"],
            ["lava-green-yellow", "Rookie Autographs Lava Lamp Green/Yellow"],
            ["lava-aqua-blue", "Rookie Autographs Lava Lamp Aqua/Blue"],
            ["lava-magenta-purple", "Rookie Autographs Lava Lamp Magenta/Purple"],
            ["lava-gold-orange", "Rookie Autographs Lava Lamp Gold/Orange"],
            ["lava-orange-black", "Rookie Autographs Lava Lamp Orange/Black"],
            ["lava-black-red", "Rookie Autographs Lava Lamp Black/Red"],
        ],
        note: "Rookie Autographs 各档 Lava Lamp 平行。",
    },
    {
        key: "nba-debut-patch-autographs",
        name: "NBA Debut Patch Autographs",
        code: "DPA",
        kind: "relic",
        detailed: true,
        roster: NBA_DEBUT_PATCH_AUTOGRAPHS,
        variants: [["base", "NBA Debut Patch Autographs"]],
        note: "93 张全部为 1/1 实物 Patch 签名。官方配率存在争议（可能只统计了约 32 张），实际概率或更高。",
    },
];

/* ------------------------------------------------------------------ */
/* 尚未实现的子集                                                       */
/* ------------------------------------------------------------------ */

/**
 * 官方表里能查到、但属于尚未实现的盒型（Delight / Sapphire / Fanatics）的子集，
 * 以及官方表没有单列的非签名实物卡。四个盒型都不含，所以挂在每个盒上。
 */
const EXTRA_ABSENT: AbsentEntry[] = [
    { name: "Sapphire Selections", code: "SS", count: 20, where: "Sapphire", kind: "insert" },
    { name: "Infinite Sapphire", code: "INF", count: 20, where: "Sapphire", kind: "insert" },
    { name: "NBA Debut Patch（非签名）", code: "DP", count: 6, where: "Hobby / Jumbo / Delight", kind: "relic" },
];

/* ------------------------------------------------------------------ */
/* 构造逻辑                                                             */
/* ------------------------------------------------------------------ */

/** 已上线的盒型列，用于推算「某个子集在哪些盒里能开出」 */
const BOX_COLUMNS: PackOddsColumn[] = ["hobby", "jumbo", "value-box-ea", "mega-box-ea"];
const COLUMN_NAME: Record<string, string> = {
    hobby: "Hobby",
    jumbo: "Jumbo",
    "value-box-ea": "Value",
    "mega-box-ea": "Mega",
};

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

/** 子集名册：直接给名册，或按卡号从 Base 名册里取 */
const subjectsOf = (spec: SubsetSpec): Subject[] => {
    const subjects = spec.roster ? toSubjects(spec.roster) : [];
    if (spec.refs) {
        const byNo = new Map(BASE_ROSTER.map((row) => [row[0], row]));
        for (const no of spec.refs) {
            const row = byNo.get(no);
            if (row) subjects.push(...toSubjects([row]));
        }
    }
    return subjects;
};

/** 某子集在某盒型列能开出的卡种；空数组 = 本盒没有这个子集 */
const variantsAt = (spec: SubsetSpec, column: PackOddsColumn): [string, number][] => {
    const rows: [string, number][] = [];
    for (const [slug, label] of spec.variants) {
        const odds = oddsAt(spec, slug, label, column);
        if (odds !== null) rows.push([slug, odds]);
    }
    return rows;
};

interface BoxConfig {
    slug: string;
    name: string;
    /** 官方 Pack Odds 表的列名 */
    column: PackOddsColumn;
    cardsPerPack: number;
    packsPerBox: number;
    /** 官方未公布时留 0，页面上就不显示「盒 / 箱」 */
    boxesPerCase: number;
    autoGuaranteed: boolean;
    boxExclusives: string[];
}

const NOTES = [
    "官方产品名为 Topps Chrome Updates Basketball —— 该系列首个 NBA 版本。",
    "官方配率是「平均配率」，实际开封结果会有波动，且不保证每个卡人都出现在所有平行里。",
    "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
];

const build = (config: BoxConfig): BoxDefinition => {
    const subsets: SubsetDef[] = [];
    const variants: VariantDef[] = [];
    const absent: AbsentEntry[] = [];
    let premiumWeight = 0;

    for (const spec of SPECS) {
        const rows = variantsAt(spec, config.column);

        if (!rows.length) {
            absent.push({
                name: spec.name,
                code: spec.code ?? "",
                count: subjectsOf(spec).length,
                where: BOX_COLUMNS.filter((column) => variantsAt(spec, column).length)
                    .map((column) => COLUMN_NAME[column])
                    .join(" / "),
                kind: spec.kind,
            });
            continue;
        }

        subsets.push({
            key: spec.key,
            name: spec.name,
            code: spec.code,
            kind: spec.kind,
            detailed: spec.detailed,
            inBox: true,
            subjects: subjectsOf(spec),
            note: spec.note,
        });

        for (const [slug, odds] of rows) {
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

    const baseWeight = Math.max(0.5, config.cardsPerPack - premiumWeight);
    for (const v of variants) if (v.odds === 0) v.weight = baseWeight;

    return defineBox({
        slug: config.slug,
        name: config.name,
        category: "basketball",
        maker: "topps",
        productKey: "tcu26-basketball",
        productName: "2025-26 Topps Chrome Updates Basketball",
        live: true,
        releaseDate: "2026-08-06",
        cardsPerPack: config.cardsPerPack,
        packsPerBox: config.packsPerBox,
        boxesPerCase: config.boxesPerCase,
        autoGuaranteed: config.autoGuaranteed,
        boxExclusives: config.boxExclusives,
        notes: NOTES,
        absentSubsets: [...absent, ...EXTRA_ABSENT],
        subsets,
        variants,
        baseWeight,
    });
};

/** 本系列已实现的四个盒型 */
const BOX_CONFIGS: BoxConfig[] = [
    {
        slug: "hobby-box",
        name: "2025-26 Topps Chrome Updates Basketball Hobby Box",
        column: "hobby",
        cardsPerPack: 4,
        packsPerBox: 20,
        boxesPerCase: 0,
        autoGuaranteed: true,
        boxExclusives: [
            "Prism / Negative Refractor（Hobby / Jumbo 专属）",
            "Wave Refractor 家族（Hobby / Jumbo 专属）",
            "专属插入：Captains / Celebracion / Radiating Rookies / Shadow Etch",
            "专属签名：Havoc Marks / 1980-81 Topps Basketball Autographs / Future Stars Autographs / Druski / Spike Lee",
        ],
    },
    {
        slug: "jumbo-box",
        name: "2025-26 Topps Chrome Updates Basketball Jumbo Box",
        column: "jumbo",
        cardsPerPack: 11,
        packsPerBox: 12,
        boxesPerCase: 0,
        autoGuaranteed: true,
        boxExclusives: [
            "Prism / Negative Refractor（Hobby / Jumbo 专属）",
            "Wave Refractor 家族（Hobby / Jumbo 专属）",
            "专属插入：Captains / Celebracion / Radiating Rookies / Shadow Etch",
            "专属签名：Havoc Marks / 1980-81 Topps Basketball Autographs / Future Stars Autographs / Druski / Spike Lee",
        ],
    },
    {
        slug: "value-box",
        name: "2025-26 Topps Chrome Updates Basketball Value Box",
        column: "value-box-ea",
        cardsPerPack: 4,
        packsPerBox: 7,
        boxesPerCase: 40,
        autoGuaranteed: false,
        boxExclusives: [
            "Basketball Refractor 彩虹（Value Box 独占）",
            "Red White and Blue Refractor（1:4）",
            "零售共享短印：Glass Canvas / Paradox / Fanatical / Chromographs",
            "追卡：Denim Tears（SSP）/ Alter Egos（SSP）/ Minionfractor（SSP）",
        ],
    },
    {
        slug: "mega-box",
        name: "2025-26 Topps Chrome Updates Basketball Mega Box",
        column: "mega-box-ea",
        cardsPerPack: 6,
        packsPerBox: 7,
        boxesPerCase: 0,
        autoGuaranteed: false,
        boxExclusives: [
            "X-Fractor（1:1，Mega 独占）",
            "RayWave 彩虹（Mega 独占）",
            "零售共享短印：Glass Canvas / Paradox / Fanatical / Chromographs",
            "追卡：Denim Tears（SSP）/ Alter Egos（SSP）",
        ],
    },
];

/** 本系列已实现的全部盒型 */
export const TCU26_BASKETBALL_BOXES: BoxDefinition[] = BOX_CONFIGS.map((config) => build(config));
