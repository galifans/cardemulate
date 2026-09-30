/**
 * 2025-26 Topps Basketball —— 盒型定义
 *
 * 配率来源
 * --------
 * 官方 Pack Odds 表（`pack-odds.generated.ts`，17 列渠道）。官方表把零售渠道按区域拆成
 * SE / EA / CEE 三个编号（Value Box、Mega Box）或两个编号（Fat Pack、Display、Hanger），
 * 逐格比对过：同一盒型的三个区域列完全一样，所以每个盒型取其中一列即可。
 * Topps 自 2009-10 之后第一次拿回 NBA 版权，这版是旗舰系列，官方名就叫
 * 「2025-26 Topps Basketball」。
 *
 * 名册来源
 * --------
 * 官方 Checklist 表格版，逐分节搬进 `roster.ts`。普卡 300 张 = BASE CARDS 270 张
 * + COMBO CARDS 30 张（一张卡上两位球员，官方表里是 60 行）。
 *
 * 限量数来源
 * ----------
 * Checklist Insider 的指南页（官方表只给配率、不给限量数），逐行核对过：
 * 官方表在哪一个盒型给了数字，指南页就在那个盒型给了同一个 1:X，没有冲突
 * （抽查 Rainbow Foilboard / Gold / Holo Foil / Aqua Holo Foil / Golden Mirror /
 * MVP Vault / 8-Bit Ballers / Generation Now / Power Players）。指南页按
 * 「Fat Pack / Display / Hanger / Black Friday Target Blaster / Super Box」这套渠道名写，
 * 官方表多出的一列 Fanatics Value Blaster 指南页基本不提。
 *
 * 普卡走残差
 * ----------
 * 官方表里没有一条叫 `BASE` 的行——普卡的配率由 17 条普卡平行行隐含给出，
 * 所以 Base 子集要手动把 `BASE` 这条标签并进来（`extraLabels`），再由每个盒型的
 * `residualLabel: "BASE"` 把残差 `每包张数 - Σ(1/配率)` 指到它身上，这样每包张数
 * 与其余每一档配率同时成立。官方表里 Base 一族没有任何一行是「非平行普卡」，
 * 这也是本模拟器的口径：一包里的普卡一定是某个平行版。
 *
 * 平行分套
 * --------
 * 普卡平行按渠道分四套，两两不重叠：Hobby 的 Victory（1:22）、Jumbo 的 Sandglitter
 * （1:2）与 Blue Sandglitter（1:6）、零售的 Holo Foil 一族、Hanger 的 Diamante 一族、
 * Value Blaster 的 Season Tip-Off 一族、Super Box 的 Crackleboard 一族。
 * 插入卡也分两套：Hobby / Jumbo 走 Rainbow Foilboard 一族，零售与大会渠道走
 * Holo Foil 一族。同一套里的编号档位在两张表里都对得上，所以这里按「套」写。
 *
 * 盒型规格
 * --------
 * 官方只公布了 Hobby（20 张 × 12 包）、Hobby Jumbo（40 张 × 10 包）、
 * Mega（14 张 × 16 包）、Value Blaster（12 张 × 12 包）四种包装规格，
 * 所以只上线这四个盒型。Black Friday Blaster（Target）、Costco Super Box、
 * Fanatics Value Blaster 三种渠道在官方表里都有单独一列配率，但没有对应的
 * 包装张数，配不出权重，暂不收录——它们的专属卡种会落到「本盒不含」里。
 *
 * 补录
 * ----
 * 官方表里有三条子集只有编号平行行、没有普通版那一行，配率按指南页补录：
 * 1980-81 Topps Basketball Triple Autographs（1:172,200 Hobby / 1:42,694 Jumbo）、
 * Flagship Real One Autographs (Spike Lee)（1:344,400 / 1:85,387）、
 * Rookie Photo Shoot Dual Autographs（1:344,400 / 1:85,387）。
 * 后两条的 Value Blaster、Mega 两列没有出处，按同族卡已公布的列间比例折算。
 * 三签卡还有个说法上的坑：官方表里那三条行标签都是编号平行，其中
 * Black Rainbow 行与指南页给子集的配率逐列相同，所以本文件里普通版与
 * Black Rainbow /10 会显示成同一个配率——两边来源就是这样，照录。
 */
import { assembleBoxes, type SubsetPlan, type VariantMeta } from "../shared/assemble";
import { PACK_ODDS, PACK_ODDS_COLUMNS } from "./pack-odds.generated";
import { ROSTER_SECTIONS } from "./roster";

/** 平行名 → 限量数；null = 非编号 */
type Runs = Record<string, number | null>;

/**
 * 把一张「平行名 → 限量数」表铺成 `variantMeta`：键是官方表里的整条行标签
 * （子集前缀 + 平行名），空串那一条就是子集本身的普通版。
 */
const meta = (prefix: string, runs: Runs): Record<string, VariantMeta> =>
    Object.fromEntries(
        Object.entries(runs).map(([suffix, numbered]) => [
            suffix ? `${prefix} ${suffix}` : prefix,
            { numbered },
        ]),
    );

/** 插入卡：Rainbow 一族，带 Purple / Blue 两档（No Limit / Stars of the NBA / Rise to Stardom / MVP Vault） */
const RAINBOW_WIDE: Runs = {
    "": null,
    "RAINBOW FOILBOARD": null,
    "PURPLE RAINBOW": 250,
    "BLUE RAINBOW": 150,
    "GREEN RAINBOW": 99,
    "GOLD RAINBOW": 50,
    "ORANGE RAINBOW": 25,
    "BLACK RAINBOW": 10,
    "RED RAINBOW": 5,
    FOILFRACTOR: 1,
};

/** 插入卡 / 实物卡：Rainbow 一族，从 Green 起编号（Marks 三套、实物卡三套） */
const RAINBOW: Runs = {
    "": null,
    "RAINBOW FOILBOARD": null,
    "GREEN RAINBOW": 99,
    "GOLD RAINBOW": 50,
    "ORANGE RAINBOW": 25,
    "BLACK RAINBOW": 10,
    "RED RAINBOW": 5,
    FOILFRACTOR: 1,
};

/** 插入卡：Rainbow 一族，从 Green 起编号且没有 Foilboard（The Daily Dribble / New School / Levitation） */
const RAINBOW_SHORT: Runs = {
    "": null,
    "GREEN RAINBOW": 99,
    "GOLD RAINBOW": 50,
    "ORANGE RAINBOW": 25,
    "BLACK RAINBOW": 10,
    "RED RAINBOW": 5,
    FOILFRACTOR: 1,
};

/** 零售与大会渠道的 Holo Foil 一族，带 Purple / Blue 两档（四套零售插入卡） */
const HOLO: Runs = {
    "": null,
    "HOLO FOIL": null,
    "PURPLE HOLO FOIL": 250,
    "BLUE HOLO FOIL": 150,
    "GREEN HOLO FOIL": 99,
    "GOLD HOLO FOIL": 50,
    "ORANGE HOLO FOIL": 25,
    "BLACK HOLO FOIL": 10,
    "RED HOLO FOIL": 5,
    "PLATINUM HOLO FOIL": 1,
};

/** Holo Foil 一族，从 Green 起编号（签名卡与实物卡） */
const HOLO_SHORT: Runs = {
    "": null,
    "HOLO FOIL": null,
    "GREEN HOLO FOIL": 99,
    "GOLD HOLO FOIL": 50,
    "ORANGE HOLO FOIL": 25,
    "BLACK HOLO FOIL": 10,
    "RED HOLO FOIL": 5,
    "PLATINUM HOLO FOIL": 1,
};

/** 签名卡：Rainbow 一族，全是有编号的档位 */
const SIGNED: Runs = {
    "": null,
    "GOLD RAINBOW": 50,
    "ORANGE RAINBOW": 25,
    "BLACK RAINBOW": 10,
    "RED RAINBOW": 5,
    FOILFRACTOR: 1,
};

/** Black Friday 盒专属的一套平行，零售专属卡种通用 */
const BLACK_FRIDAY: Runs = {
    "": null,
    SURGE: 99,
    "FLASH DROP": 50,
    "CART LOAD": 25,
    "CYBER CIRCUIT": 5,
    DOORBUSTER: 1,
};

/** 普卡一族：57 条行标签，含 Hobby / Jumbo / 零售 / Hanger / Value Blaster / Black Friday 六套渠道专属平行 */
const BASE: Runs = {
    "": null,
    GOLD: 2025,
    "RAINBOW FOILBOARD": null,
    "PURPLE RAINBOW": 250,
    "BLUE RAINBOW": 150,
    "GREEN RAINBOW": 99,
    "GOLD RAINBOW": 50,
    "ORANGE RAINBOW": 25,
    WOOD: 25,
    "BLACK RAINBOW": 10,
    "RED RAINBOW": 5,
    FOILFRACTOR: 1,
    "FIRST CARD": 1,
    VICTORY: null,
    SANDGLITTER: null,
    "BLUE SANDGLITTER": null,
    "HOLO FOIL": null,
    "PURPLE HOLO FOIL": 250,
    "BLUE HOLO FOIL": 150,
    "GREEN HOLO FOIL": 99,
    "GOLD HOLO FOIL": 50,
    "ORANGE HOLO FOIL": 25,
    "BLACK HOLO FOIL": 10,
    "RED HOLO FOIL": 5,
    "PLATINUM HOLO FOIL": 1,
    DIAMANTE: null,
    "PINK DIAMANTE": null,
    "GOLD DIAMANTE": 50,
    "ORANGE DIAMANTE": 25,
    "BLACK DIAMANTE": 10,
    "RED DIAMANTE": 5,
    "SEASON TIP OFF": null,
    "SEASON TIP OFF GREEN FOILBOARD": 99,
    "SEASON TIP OFF GOLD FOILBOARD": 50,
    "SEASON TIP OFF ORANGE FOILBOARD": 25,
    "SEASON TIP OFF RED FOILBOARD": 5,
    "SEASON TIP OFF BLACK FOILBOARD": 1,
    "TOPPS FOIL PATTERN": null,
    BLACK: 68,
    "AQUA HOLO FOIL": null,
    "PINK HOLO FOIL": null,
    "CRACKLEBOARD FOIL": null,
    "GREEN CRACKLEBOARD FOIL": 99,
    "GOLD CRACKLEBOARD FOIL": 50,
    "ORANGE CRACKLEBOARD FOIL": 25,
    "BLACK CRACKLEBOARD FOIL": 10,
    "RED CRACKLEBOARD FOIL": 5,
    "PLATINUM CRACKLEBOARD FOIL": 1,
    BLACKOUT: null,
    SURGE: 99,
    "FLASH DROP": 50,
    "CART LOAD": 25,
    "CYBER CIRCUIT": 5,
    DOORBUSTER: 1,
};

/**
 * 这两套平行的官方行标签名字里带 FOILBOARD 尾巴，显示名按指南页的写法改回来；
 * 其余档位保持官方表里的原名。
 */
const BASE_NAMES: Record<string, VariantMeta> = {
    "BASE SEASON TIP OFF": { name: "Season Tip-Off", numbered: null },
    "BASE SEASON TIP OFF GREEN FOILBOARD": { name: "Season Tip-Off Green", numbered: 99 },
    "BASE SEASON TIP OFF GOLD FOILBOARD": { name: "Season Tip-Off Gold", numbered: 50 },
    "BASE SEASON TIP OFF ORANGE FOILBOARD": { name: "Season Tip-Off Orange", numbered: 25 },
    "BASE SEASON TIP OFF RED FOILBOARD": { name: "Season Tip-Off Red", numbered: 5 },
    "BASE SEASON TIP OFF BLACK FOILBOARD": { name: "Season Tip-Off Black", numbered: 1 },
    "BASE CRACKLEBOARD FOIL": { name: "Crackleboard", numbered: null },
    "BASE GREEN CRACKLEBOARD FOIL": { name: "Green Crackleboard", numbered: 99 },
    "BASE GOLD CRACKLEBOARD FOIL": { name: "Gold Crackleboard", numbered: 50 },
    "BASE ORANGE CRACKLEBOARD FOIL": { name: "Orange Crackleboard", numbered: 25 },
    "BASE BLACK CRACKLEBOARD FOIL": { name: "Black Crackleboard", numbered: 10 },
    "BASE RED CRACKLEBOARD FOIL": { name: "Red Crackleboard", numbered: 5 },
    "BASE PLATINUM CRACKLEBOARD FOIL": { name: "Platinum Crackleboard", numbered: 1 },
};

/** 官方表里没有普通版那一行、需要补录配率的子集：行标签 → 列 key → 1:X 里的 X */
const MISSING_ROW: Record<string, Partial<Record<string, number>>> = {
    // 三签卡：官方表三条行标签都是编号平行
    "1980-81 TOPPS BASKETBALL TRIPLE AUTOGRAPH": {
        hobby: 172200,
        "hta-jumbo": 42694,
        "value-box-ea": 397320,
        "mega-box-ea": 375702,
    },
    // 只有一位球星，Hobby / Jumbo 之外按同一比例折算
    "FLAGSHIP REAL ONE SPIKE LEE AUTOGRAPH": {
        hobby: 344400,
        "hta-jumbo": 85387,
        "value-box-ea": 794640,
        "mega-box-ea": 751403,
    },
    // 双人签名卡：官方表只有 Red / Platinum 两条行标签
    "ROOKIE PHOTO SHOOT DUAL AUTOGRAPH": {
        hobby: 344400,
        "hta-jumbo": 85387,
        "value-box-ea": 794640,
        "mega-box-ea": 751403,
    },
};

export const SUBSETS: SubsetPlan[] = [
    {
        section: ["BASE CARDS", "COMBO CARDS"],
        label: "BASE",
        name: "Base",
        code: "B",
        kind: "base",
        variantMeta: { ...meta("BASE", BASE), ...BASE_NAMES },
        extraLabels: ["BASE"],
        dropLabels: [
            "BASE GOLDEN MIRROR IMAGE VARIATIONS",
            "BASE CLEAR VARIATION",
            "BASE PLAYER NUMBER VARIATION",
            "BASE TEAM COLOR BORDER VARIATION",
        ],
        note: "300 张：BASE CARDS 270 张 + COMBO CARDS 30 张（一张卡两位球员）。",
    },
    {
        section: ["BASE CARDS", "COMBO CARDS"],
        label: "BASE GOLDEN MIRROR IMAGE VARIATIONS",
        name: "Golden Mirror Image Variations",
        code: "GMI",
        kind: "ssp",
        note: "整套 300 张普卡各有一张镜像变体。",
    },
    {
        section: ["BASE CARDS", "COMBO CARDS"],
        label: "BASE CLEAR VARIATION",
        name: "Clear Variations",
        code: "CVR",
        kind: "ssp",
        note: "整套 300 张普卡。",
    },
    {
        section: ["BASE CARDS", "COMBO CARDS"],
        label: "BASE TEAM COLOR BORDER VARIATION",
        name: "Team Color Border Variations",
        code: "TCB",
        kind: "ssp",
        note: "整套 300 张普卡。",
    },
    {
        section: "BASE PLAYER NUMBER VARIATION",
        label: "BASE PLAYER NUMBER VARIATION",
        name: "Base Player Number Variations",
        code: "PNV",
        kind: "ssp",
        note: "只有 25 名球员，只在 Hobby 出现。",
    },
    {
        section: "THE DAILY DRIBBLE",
        name: "The Daily Dribble",
        code: "TDD",
        kind: "insert",
        variantMeta: meta("THE DAILY DRIBBLE", RAINBOW_SHORT),
        note: "40 张。",
    },
    {
        section: "NEW SCHOOL",
        name: "New School",
        code: "NS",
        kind: "insert",
        variantMeta: meta("NEW SCHOOL", RAINBOW_SHORT),
        note: "40 张。",
    },
    {
        section: "LEVITATION",
        name: "Levitation",
        code: "LEV",
        kind: "insert",
        variantMeta: meta("LEVITATION", RAINBOW_SHORT),
        note: "20 张。",
    },
    {
        section: "NO LIMIT",
        name: "No Limit",
        code: "NL",
        kind: "insert",
        variantMeta: meta("NO LIMIT", RAINBOW_WIDE),
        note: "40 张。",
    },
    {
        section: "STARS OF THE NBA",
        label: "STARS OF NBA",
        name: "Stars of the NBA",
        code: "SNBA",
        kind: "insert",
        variantMeta: meta("STARS OF NBA", RAINBOW_WIDE),
        note: "30 张。",
    },
    {
        section: "RISE TO STARDOM",
        name: "Rise to Stardom",
        code: "RTS",
        kind: "insert",
        variantMeta: meta("RISE TO STARDOM", RAINBOW_WIDE),
        note: "20 张。",
    },
    {
        section: "MVP VAULT",
        name: "MVP Vault",
        code: "MVPV",
        kind: "insert",
        variantMeta: meta("MVP VAULT", RAINBOW_WIDE),
        note: "10 张。",
    },
    {
        section: "COMIC COURT",
        name: "Comic Court",
        code: "COM",
        kind: "insert",
        note: "20 张。",
    },
    {
        section: "HOME COURT",
        name: "Home Court",
        code: "HMC",
        kind: "insert",
        note: "10 张。",
    },
    {
        section: "SONIC BOOM",
        name: "Sonic Boom",
        code: "SNC",
        kind: "insert",
        note: "20 张，只在零售渠道出现。",
    },
    {
        section: "SOLE AMBITION",
        name: "Sole Ambition",
        code: "SOLE",
        kind: "insert",
        note: "10 张，只在零售渠道出现。",
    },
    {
        section: "8 BIT BALLERS",
        name: "8-Bit Ballers",
        code: "8BB",
        kind: "insert",
        variantMeta: meta("8 BIT BALLERS", HOLO),
        note: "40 张，只在零售渠道出现。",
    },
    {
        section: "GENERATION NOW",
        name: "Generation Now",
        code: "GEN",
        kind: "insert",
        variantMeta: meta("GENERATION NOW", HOLO),
        note: "30 张，只在零售渠道出现。",
    },
    {
        section: "POWER PLAYERS",
        name: "Power Players",
        code: "PP",
        kind: "insert",
        variantMeta: meta("POWER PLAYERS", HOLO),
        note: "20 张，只在零售渠道出现。",
    },
    {
        section: "CLUTCH CITY PROSPECTS",
        name: "Clutch City Prospects",
        code: "CCP",
        kind: "insert",
        variantMeta: meta("CLUTCH CITY PROSPECTS", HOLO),
        note: "10 张，只在零售渠道出现。",
    },
    {
        section: "ALL KINGS",
        name: "All Kings",
        code: "AK",
        kind: "insert",
        note: "25 张，只在 Hobby 与 Hobby Jumbo 出现。",
    },
    {
        section: "HARDWOOD STARS",
        name: "Hardwood Stars",
        code: "HWS",
        kind: "insert",
        note: "20 张，只在 Hobby 与 Hobby Jumbo 出现。",
    },
    {
        section: "COMPANION TOPPS CARDS",
        name: "Companion Topps Cards",
        code: "CTC",
        kind: "insert",
        dropLabels: ["COMPANION TOPPS CARDS SP"],
        note: "16 张，只在 Costco Super Box 出现。",
    },
    {
        section: "COMPANION TOPPS CARDS SHORT PRINTS",
        label: "COMPANION TOPPS CARDS SP",
        name: "Companion Topps Cards Short Prints",
        code: "CTSP",
        kind: "ssp",
        note: "5 张，只在 Costco Super Box 出现。",
    },
    {
        section: "OVERSIZED TOPPS CARDS",
        name: "Oversized Topps Cards",
        code: "OTC",
        kind: "insert",
        dropLabels: ["OVERSIZED TOPPS CARDS SP"],
        note: "16 张，只在 Costco Super Box 出现。",
    },
    {
        section: "OVERSIZED TOPPS CARDS SHORT PRINTS",
        label: "OVERSIZED TOPPS CARDS SP",
        name: "Oversized Topps Cards Short Prints",
        code: "OTSP",
        kind: "ssp",
        note: "5 张，只在 Costco Super Box 出现。",
    },
    {
        section: "SCAN AND SLAM",
        name: "Scan and Slam",
        code: "SAS",
        kind: "insert",
        variantMeta: meta("SCAN AND SLAM", BLACK_FRIDAY),
        note: "50 张，只在 Black Friday Blaster 出现。",
    },
    {
        section: "SOCIAL MEDIA FOLLOWBACK REDEMPTION",
        label: "SOCIAL FOLLOWBACK REDEMPTION",
        name: "Social Media Followback Redemption",
        code: "SMF",
        kind: "insert",
        note: "10 张，只在 Hobby、Hobby Jumbo 与两个大会渠道出现。",
    },
    {
        section: "LIMITED STOCK LEGENDS",
        name: "Limited Stock Legends",
        code: "LSL",
        kind: "insert",
        variantMeta: meta("LIMITED STOCK LEGENDS", BLACK_FRIDAY),
        note: "50 张，只在 Black Friday Blaster 出现。",
    },
    {
        section: "CLASS OF 25",
        name: "Class of 2025",
        code: "C25",
        kind: "insert",
        variantMeta: meta("CLASS OF 25", { "": null, "RED FOIL": 5, FOILFRACTOR: 1 }),
        note: "20 张。",
    },
    {
        section: "BIG BOX BALLERS",
        name: "Big Box Ballers",
        code: "BBB",
        kind: "insert",
        note: "50 张，只在 Costco Super Box 出现。",
    },
    {
        section: "1980 81 TOPPS BASKETBALL",
        label: "1980-81 TOPPS BASKETBALL",
        name: "1980-81 Topps Basketball",
        code: "80S",
        kind: "insert",
        variantMeta: meta("1980-81 TOPPS BASKETBALL", {
            "": null,
            PINK: null,
            GREEN: 99,
            GOLD: 50,
            ORANGE: 25,
            BLACK: 10,
            RED: 5,
            PLATINUM: 1,
        }),
        dropLabels: [
            "1980-81 TOPPS BASKETBALL AUTOGRAPH",
            "1980-81 TOPPS BASKETBALL AUTOGRAPH GOLD RAINBOW",
            "1980-81 TOPPS BASKETBALL AUTOGRAPH ORANGE RAINBOW",
            "1980-81 TOPPS BASKETBALL AUTOGRAPH BLACK RAINBOW",
            "1980-81 TOPPS BASKETBALL AUTOGRAPH RED RAINBOW",
            "1980-81 TOPPS BASKETBALL AUTOGRAPH FOILFRACTOR",
            "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH",
            "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH GOLD RAINBOW",
            "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH ORANGE RAINBOW",
            "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH BLACK RAINBOW",
            "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH RED RAINBOW",
            "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH FOILFRACTOR",
            "1980-81 TOPPS BASKETBALL TRIPLE AUTOGRAPH BLACK RAINBOW",
            "1980-81 TOPPS BASKETBALL TRIPLE AUTOGRAPH RED RAINBOW",
            "1980-81 TOPPS BASKETBALL TRIPLE AUTOGRAPH FOILFRACTOR",
        ],
        note: "99 张，复刻 1980-81 年的设计。",
    },
    {
        section: "1980 81 TOPPS BASKETBALL AUTOGRAPHS",
        label: "1980-81 TOPPS BASKETBALL AUTOGRAPH",
        name: "1980-81 Topps Basketball Autographs",
        code: "80SA",
        kind: "auto",
        variantMeta: meta("1980-81 TOPPS BASKETBALL AUTOGRAPH", SIGNED),
        note: "44 张签名卡。",
    },
    {
        section: "1980 81 TOPPS BASKETBALL ROOKIE AUTOGRAPHS",
        label: "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH",
        name: "1980-81 Topps Basketball Rookie Autographs",
        code: "80SR",
        kind: "auto",
        variantMeta: meta("1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH", SIGNED),
        note: "40 张新秀签名卡。",
    },
    {
        section: "1980 81 TOPPS BASKETBALL TRIPLE AUTOGRAPHS",
        label: "1980-81 TOPPS BASKETBALL TRIPLE AUTOGRAPH",
        name: "1980-81 Topps Basketball Triple Autographs",
        code: "80ST",
        kind: "auto",
        variantMeta: meta("1980-81 TOPPS BASKETBALL TRIPLE AUTOGRAPH", {
            "": null,
            "BLACK RAINBOW": 10,
            "RED RAINBOW": 5,
            FOILFRACTOR: 1,
        }),
        extraLabels: ["1980-81 TOPPS BASKETBALL TRIPLE AUTOGRAPH"],
        manual: MISSING_ROW,
        note: "30 张三签卡，官方表里只有编号档位。",
    },
    {
        section: "MARKS OF EXCELLENCE",
        name: "Marks of Excellence",
        code: "MOE",
        kind: "auto",
        variantMeta: meta("MARKS OF EXCELLENCE", RAINBOW),
        note: "38 张签名卡。",
    },
    {
        section: "CONTEMPORARY MARKS",
        name: "Contemporary Marks",
        code: "CTM",
        kind: "auto",
        variantMeta: meta("CONTEMPORARY MARKS", RAINBOW),
        note: "37 张签名卡。",
    },
    {
        section: "HAVOC MARKS",
        name: "Havoc Marks",
        code: "HVM",
        kind: "auto",
        variantMeta: meta("HAVOC MARKS", RAINBOW),
        note: "19 张签名卡。",
    },
    {
        section: "TOPPS NOTCH SIGNATURES",
        name: "Topps Notch Signatures",
        code: "TNS",
        kind: "auto",
        variantMeta: meta("TOPPS NOTCH SIGNATURES", HOLO_SHORT),
        note: "38 张签名卡。",
    },
    {
        section: "NEW APPLICANTS AUTOGRAPHS",
        name: "New Applicants Autographs",
        code: "NAA",
        kind: "auto",
        variantMeta: meta("NEW APPLICANTS AUTOGRAPHS", HOLO_SHORT),
        note: "38 张签名卡。",
    },
    {
        section: "SIGNED AND SEALED",
        name: "Signed and Sealed",
        code: "SS",
        kind: "auto",
        variantMeta: meta("SIGNED AND SEALED", HOLO_SHORT),
        note: "19 张签名卡。",
    },
    {
        section: "ROOKIE PHOTO SHOOT AUTOGRAPHS",
        label: "ROOKIE PHOTO SHOOT AUTOGRAPH",
        name: "Rookie Photo Shoot Autographs",
        code: "RPS",
        kind: "auto",
        variantMeta: meta("ROOKIE PHOTO SHOOT AUTOGRAPH", { "": null, RED: 5, PLATINUM: 1 }),
        note: "40 张新秀签名卡。",
    },
    {
        section: "ROOKIE PHOTO SHOOT DUAL AUTOGRAPH",
        label: "ROOKIE PHOTO SHOOT DUAL AUTOGRAPH",
        name: "Rookie Photo Shoot Dual Autographs",
        code: "RPSD",
        kind: "auto",
        variantMeta: meta("ROOKIE PHOTO SHOOT DUAL AUTOGRAPH", { "": null, RED: 5, PLATINUM: 1 }),
        extraLabels: ["ROOKIE PHOTO SHOOT DUAL AUTOGRAPH"],
        manual: MISSING_ROW,
        note: "20 张双人签名卡，官方表里只有编号档位。",
    },
    {
        section: "FLAGSHIP REAL ONE AUTOGRAPHS",
        label: "FLAGSHIP REAL ONE AUTOGRAPH",
        name: "Flagship Real One Autographs",
        code: "R1A",
        kind: "auto",
        variantMeta: meta("FLAGSHIP REAL ONE AUTOGRAPH", SIGNED),
        note: "42 张签名卡。",
    },
    {
        section: "FLAGSHIP REAL ONE ROOKIE AUTOGRAPHS",
        label: "FLAGSHIP REAL ONE ROOKIE AUTOGRAPH",
        name: "Flagship Real One Rookie Autographs",
        code: "R1RA",
        kind: "auto",
        variantMeta: meta("FLAGSHIP REAL ONE ROOKIE AUTOGRAPH", SIGNED),
        note: "39 张新秀签名卡。",
    },
    {
        section: "FLAGSHIP REAL ONE AUTOGRAPHS SPIKE LEE",
        label: "FLAGSHIP REAL ONE SPIKE LEE AUTOGRAPH",
        name: "Flagship Real One Autographs (Spike Lee)",
        code: "R1SL",
        kind: "auto",
        variantMeta: meta("FLAGSHIP REAL ONE SPIKE LEE AUTOGRAPH", SIGNED),
        extraLabels: ["FLAGSHIP REAL ONE SPIKE LEE AUTOGRAPH"],
        manual: MISSING_ROW,
        note: "只有 1 张，官方表里只有编号档位。",
    },
    {
        section: "RETAIL RUSH SIGNATURES",
        name: "Retail Rush Signatures",
        code: "RRS",
        kind: "auto",
        variantMeta: meta("RETAIL RUSH SIGNATURES", {
            "FLASH DROP": 50,
            "CART LOAD": 25,
            DOORBUSTER: 1,
        }),
        note: "50 张签名卡，只在 Black Friday Blaster 出现。",
    },
    {
        section: "SHOPPING SPREE SIGNATURES",
        name: "Shopping Spree Signatures",
        code: "SPS",
        kind: "auto",
        variantMeta: meta("SHOPPING SPREE SIGNATURES", {
            "FLASH DROP": 50,
            "CART LOAD": 25,
            DOORBUSTER: 1,
        }),
        note: "39 张签名卡，只在 Black Friday Blaster 出现。",
    },
    {
        section: "RISE TO THE OCCASION RELICS",
        name: "Rise to the Occasion Relics",
        code: "RTOR",
        kind: "relic",
        variantMeta: meta("RISE TO THE OCCASION RELICS", RAINBOW),
        note: "39 张实物卡。",
    },
    {
        section: "OWN THE GAME",
        name: "Own the Game Relics",
        code: "OTG",
        kind: "relic",
        variantMeta: meta("OWN THE GAME", RAINBOW),
        note: "40 张实物卡。",
    },
    {
        section: "ROOKIE ROUNDBALL REMNANTS",
        name: "Rookie Roundball Remnants",
        code: "RRR",
        kind: "relic",
        variantMeta: meta("ROOKIE ROUNDBALL REMNANTS", RAINBOW),
        note: "20 张实物卡。",
    },
    {
        section: "FRANCHISE FABRICS",
        name: "Franchise Fabrics",
        code: "FF",
        kind: "relic",
        variantMeta: meta("FRANCHISE FABRICS", HOLO_SHORT),
        note: "39 张实物卡。",
    },
    {
        section: "SWISH AND STITCH RELICS",
        name: "Swish and Stitch Relics",
        code: "SASR",
        kind: "relic",
        variantMeta: meta("SWISH AND STITCH RELICS", HOLO_SHORT),
        note: "40 张实物卡。",
    },
    {
        section: "WOVEN WONDERS RELICS",
        name: "Woven Wonders Relics",
        code: "WWR",
        kind: "relic",
        variantMeta: meta("WOVEN WONDERS RELICS", HOLO_SHORT),
        note: "20 张实物卡。",
    },
    {
        section: "FLAGSHIP REAL ONE RELIC",
        name: "Flagship Real One Relics",
        code: "R1R",
        kind: "relic",
        variantMeta: meta("FLAGSHIP REAL ONE RELIC", SIGNED),
        note: "50 张实物卡。",
    },
    {
        section: "STORE EXCLUSIVE RELICS",
        name: "Store Exclusive Relics",
        code: "SER",
        kind: "relic",
        variantMeta: meta("STORE EXCLUSIVE RELICS", BLACK_FRIDAY),
        note: "50 张实物卡，只在 Black Friday Blaster 出现。",
    },
    {
        section: "RETAIL RIPPER RELICS",
        name: "Retail Ripper Relics",
        code: "RRP",
        kind: "relic",
        variantMeta: meta("RETAIL RIPPER RELICS", BLACK_FRIDAY),
        note: "50 张实物卡，只在 Black Friday Blaster 出现。",
    },
];

const NOTES = [
    "官方给出的是平均配率，按包计算，实际拆盒会有波动。",
    "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
    "普卡平行按渠道分套：Hobby 走 Victory，Hobby Jumbo 走 Sandglitter，零售走 Holo Foil 一族，Hanger 走 Diamante 一族，Value Blaster 走 Season Tip-Off 一族。",
    "普卡不单独给配率，本模拟器按「每包张数 = 各档权重之和」反推它的权重。",
    "本产品只收录 Hobby、Hobby Jumbo、Mega、Value Blaster 四个盒型；Black Friday、Super Box、Fanatics Value Blaster 三种渠道有专属卡种，但官方没有给出对应的包装张数。",
];

export const TBB26_BASKETBALL_BOXES = assembleBoxes({
    productKey: "tbb26-basketball",
    productName: "2025-26 Topps Basketball",
    year: "2025-26",
    releaseDate: "2025-10-23",
    category: "basketball",
    maker: "topps",
    live: true,
    notes: NOTES,
    odds: { columns: PACK_ODDS_COLUMNS, rows: PACK_ODDS },
    sections: ROSTER_SECTIONS,
    subsets: SUBSETS,
    columnNames: {
        hobby: "Hobby",
        "hta-jumbo": "Hobby Jumbo",
        "value-box-se": "Value Blaster",
        "value-box-ea": "Value Blaster",
        "value-box-cee": "Value Blaster",
        "mega-box-se": "Mega",
        "mega-box-ea": "Mega",
        "mega-box-cee": "Mega",
        "fat-pack-se": "Fat Pack",
        "fat-pack-ea": "Fat Pack",
        "display-nt": "Display",
        "display-hh": "Display",
        "hanger-se": "Hanger",
        "hanger-ea": "Hanger",
        "black-friday": "Black Friday",
        "costco-super": "Super Box",
        "fanatics-value": "Fanatics Value Blaster",
    },
    extraAbsent: [
        {
            name: "1980-81 Topps Chrome Basketball",
            code: "80SC",
            count: 100,
            where: "Silver Pack（Hobby 与 Hobby Jumbo 每盒 1 包）",
            kind: "insert",
        },
        {
            name: "1980-81 Topps Chrome Basketball Veteran Autographs",
            code: "80SCV",
            count: 45,
            where: "Silver Pack（Hobby 与 Hobby Jumbo 每盒 1 包）",
            kind: "auto",
        },
        {
            name: "1980-81 Topps Chrome Basketball Rookie Autographs",
            code: "80SCR",
            count: 40,
            where: "Silver Pack（Hobby 与 Hobby Jumbo 每盒 1 包）",
            kind: "auto",
        },
        {
            name: "Fanatics Authentic Redemptions",
            code: "FAR",
            count: 30,
            where: "Fanatics Value Blaster",
            kind: "insert",
        },
        {
            name: "Hidden Gems",
            code: "HG",
            count: 5,
            where: "官方未公布盒型与配率",
            kind: "ssp",
        },
    ],
    boxes: [
        {
            slug: "tbb26-hobby",
            name: "Hobby",
            column: "hobby",
            cardsPerPack: 20,
            packsPerBox: 12,
            boxesPerCase: 12,
            autoGuaranteed: true,
            residualLabel: "BASE",
            boxExclusives: [
                "每盒一张签名卡或实物卡，另有一包 Silver Pack。",
                "Victory 普卡平行只在 Hobby 出现。",
            ],
        },
        {
            slug: "tbb26-hobby-jumbo",
            name: "Hobby Jumbo",
            column: "hta-jumbo",
            cardsPerPack: 40,
            packsPerBox: 10,
            boxesPerCase: 8,
            autoGuaranteed: true,
            residualLabel: "BASE",
            boxExclusives: [
                "每盒一张签名卡与一张实物卡，另有一包 Silver Pack。",
                "Sandglitter 与 Blue Sandglitter 普卡平行只在 Hobby Jumbo 出现。",
            ],
        },
        {
            slug: "tbb26-mega",
            name: "Mega",
            column: "mega-box-ea",
            cardsPerPack: 14,
            packsPerBox: 16,
            boxesPerCase: 20,
            autoGuaranteed: false,
            residualLabel: "BASE",
            boxExclusives: [
                "每盒 4 张普卡平行、8 张 1980-81 Topps 卡。",
                "8-Bit Ballers、Generation Now、Power Players、Clutch City Prospects 这些插入卡只在零售渠道出现。",
            ],
        },
        {
            slug: "tbb26-value-box",
            name: "Value Blaster",
            column: "value-box-ea",
            cardsPerPack: 12,
            packsPerBox: 12,
            boxesPerCase: 0,
            autoGuaranteed: false,
            residualLabel: "BASE",
            boxExclusives: [
                "每盒 5 张普卡平行、4 张 1980-81 Topps 卡。",
                "Season Tip-Off 普卡平行只在 Value Blaster 出现。",
            ],
        },
    ],
});
