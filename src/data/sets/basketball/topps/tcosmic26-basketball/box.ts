/**
 * 2025-26 Topps Cosmic Chrome Basketball —— 盒型定义
 *
 * 配率来源：Topps 官方 Pack Odds 表（1:X 包，单位与 `pack-odds.generated.ts` 一致），
 * 名册来源：官方 Checklist 表格版。子集与平行由 `shared/assemble.ts` 照着上面两张表展开，
 * 这里只写「有哪些子集、各自对应官方表里的哪条行标签」以及盒型规格。
 *
 * 官方只公布一列配率：FDI（First Day Issue）与 Lunar 是首发专供盒型，
 * 它们各自的平行配率官方并进了同一列，所以本系列只上 Hobby 一种盒型。
 *
 * 规格（官方产品资料）：Hobby 4 张/包 × 20 包 = 80 张，每箱 8 盒，签名平均每箱 2 张。
 */

import { assembleBoxes, type SubsetPlan } from "../shared/assemble";
import { PACK_ODDS, PACK_ODDS_COLUMNS } from "./pack-odds.generated";
import { ROSTER_SECTIONS } from "./roster";

/** 基础彩虹的限量数；官方配率表不写限量，取自官方产品页 */
const BASE_PRINT_RUN: Record<string, number> = {
    "Base Aqua Equinox Refractor": 199,
    "Base Purple Nebula Refractor": 150,
    "Base Blue Moon Refractor": 99,
    "Base Green Space Dust Refractor": 75,
    "Base Gold Interstellar Refractor": 50,
    "Base Orange Galactic Refractor": 25,
    "Base Black Eclipse Refractor": 10,
    "Base Red Flare Refractor": 5,
    "Base SuperFractor": 1,
};

const SUBSETS: SubsetPlan[] = [
    {
        // 官方 Checklist 把 200 张 Base 拆成 1-100、101-200 两段，配率表只有一条 Base
        section: ["BASE CARDS", "BASE CARDS II"],
        label: "Base",
        name: "Base Set",
        kind: "base",
        variantMeta: Object.fromEntries(
            Object.entries(BASE_PRINT_RUN).map(([label, numbered]) => [label, { numbered }]),
        ),
        // 官方把三种盒型的平行配率并成了一列：FDI / Lunar 专供的两条平行要剔掉，
        // 否则 Hobby 盒会开出实际不可能出现的卡
        dropLabels: ["Base FDI 1 Refractor", "Base Lunar Refractor"],
        note: "200 张，官方 Checklist 分为 1-100 与 101-200 两段。",
    },
    { section: "GALAXY GREATS", label: "Galaxy Greats" },
    { section: "EXTRATERRESTRIAL TALENT", label: "Extraterrestrial Talent" },
    { section: "PROPULSION", label: "Propulsion" },
    { section: "SPACE WALK", label: "Space Walk" },
    { section: "STARFRACTOR", label: "StarFractor" },
    { section: "RE ENTRY", label: "Re-Entry" },
    { section: "GEOCENTRIC", label: "Geocentric" },
    { section: "FIRST LIGHT", label: "First Light" },
    { section: "HYPER NOVA", label: "HyperNova", note: "箱级短印。" },
    { section: "COSMIC DUST", label: "Cosmic Dust", note: "箱级短印。" },
    {
        section: "PLANETARY PURSUIT",
        label: "Planetary Pursuit",
        note: "官方配率表按天体逐条列出，没有「普通版」一行。",
    },
    {
        section: "COSMIC CHROME AUTOGRAPH VARIATION",
        label: "Cosmic Chrome Autograph Variation",
        // 官方另有同名的 II 系列，行标签以本前缀开头但属于另一段 Checklist
        dropLabels: [
            "Cosmic Chrome Autograph Variation II Refractor",
            "Cosmic Chrome Autograph Variation II Orange Galactic Refractor",
            "Cosmic Chrome Autograph Variation II Black Eclipse Refractor",
            "Cosmic Chrome Autograph Variation II Red Flare Refractor",
            "Cosmic Chrome Autograph Variation II SuperFractor",
        ],
    },
    { section: "SINGULARITY SIGNATURES", label: "Singularity Signatures" },
    { section: "ALIEN AUTOGRAPHS", label: "Alien Autographs" },
    { section: "ELECTRO STATIC SIGNATURES REFRACTOR", label: "Electro-Static Signatures" },
    { section: "FIRST FLIGHT SIGNATURES REFRACTOR", label: "First Flight Signatures" },
    {
        section: "COSMIC CHROME AUTOGRAPH VARIATION II",
        label: "Cosmic Chrome Autograph Variation II",
    },
];

export const TCOSMIC26_BASKETBALL_BOXES = assembleBoxes({
    productKey: "tcosmic26-basketball",
    productName: "2025-26 Topps Cosmic Chrome Basketball",
    year: "2025-26",
    releaseDate: "2026-04-29",
    category: "basketball",
    maker: "topps",
    live: true,
    notes: [
        "官方给出的是平均配率，实际开封会有波动，也不保证每个卡人都出现在所有平行里。",
        "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
        "签名卡全部为手签，平均每箱两张，单盒不保证。",
        "First Day Issue 与 Lunar 是首发专供盒型，暂未上线，其专属平行不在本盒内容里。",
    ],
    odds: { columns: PACK_ODDS_COLUMNS, rows: PACK_ODDS },
    sections: ROSTER_SECTIONS,
    subsets: SUBSETS,
    columnNames: { hobby: "Hobby" },
    boxes: [
        {
            slug: "hobby-box",
            name: "2025-26 Topps Cosmic Chrome Basketball Hobby Box",
            column: "hobby",
            cardsPerPack: 4,
            packsPerBox: 20,
            boxesPerCase: 8,
            autoGuaranteed: false,
            boxExclusives: [
                "每盒平均 2 张 Base Refractor、1 张 Base Nucleus Refractor、3 张其他平行、14 张插入卡",
                "手签：Cosmic Chrome Autographs / Singularity Signatures / Alien Autographs / Electro Static Signatures / First Flight Signatures",
                "箱级短印：Cosmic Dust / HyperNova / Planetary Pursuit",
            ],
        },
    ],
});
