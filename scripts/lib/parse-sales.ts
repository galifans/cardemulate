/**
 * 卡淘成交标题 → 模型维度的解析器。
 *
 * 为什么需要它
 * ------------
 * 卡淘的成交记录只有两样可用信息：一串标题和一个成交价。标题是卖家自己写的，
 * 没有结构化的卡种 / 平行 / 限量字段（见 sources/prices/README.md）。所以要把
 * 成交价拿来做标定，只能从标题里把维度抠出来 —— 这是卡淘口径下唯一的身份线索。
 *
 * 抠不准的地方一律返回 null，不用猜测值兜底：宁可让某个维度覆盖率低，
 * 也不能让「猜出来的维度」进标定表。
 *
 * 已知的抠不出来：
 *   · 卡种归属（这张卡属于在册目录里的哪一个 subset）—— 标题里没有卡号
 *   · 平行色名与印量的对应关系 —— 同名平行在不同系列里的印量不同
 *   · 签字是卡签还是贴签 —— 中文标题几乎不写，英文写法也不统一
 *   · 品相等级 —— 卡淘记录里没有分级字段
 */

/**
 * 整盒 / 整包在转售，不是单卡成交；这类记录会把价格分布整个带偏。
 *
 * 「原封」必须带上盒 / 箱 / 包 —— 单写「原封」会把 **原封夹**（装在原厂壳里的单卡）
 * 与 **原封砖**（Topps 出厂封装砖里的单卡）一起剔掉。这两类共 2,951 条，中位
 * ¥209～1101、最高 ¥90,250，是整个样本里最贵的一批单卡；曾经把它们当成整盒之后，
 * 模型自始至终没见过价格分布的右尾，高价卡一律估低好几倍。
 */
const PACK_PATTERN =
    /肥包|原包|单包|拆包|散包|整盒|原盒|原封(盒|箱|包)|单盒|一盒|拆盒|博一博|回盒|盒卡|空盒|盒装|原箱|整箱/;

/**
 * 多张卡打包成一条成交。
 *
 * 卡淘上这类记录占比不小（28,422 条里 5,265 条，18.5%），而且成交价集中在低价段
 * （中位 ¥16，单卡中位 ¥33），因为一个价买的是好几张。它们不是「这张卡值多少钱」
 * 的观测值：卡价模型的每一条格子都假设「一条记录 = 一张卡」，混进来之后
 * 「未编号普卡中位 ¥18」这种格子其实有一大截是「一图打包不保卡品」的批货。
 *
 * 为什么可以只认「打包」两个字：抽查了 1,707 条写着「打包」却没写张数的标题，
 * 全部是「一图打包不保卡品」「好人打包」「新秀 rc 打包」这类多卡批次，
 * 没有一条是「打包发货」那种单卡用法。再加上极少见的英文 lot。
 */
const LOT_PATTERN = /打包|\blot\b/i;

/**
 * 签名类写法：中英文混着来。
 *
 * 「签」这个字本身最全 —— 签字 / 签名 / 卡签 / 贴签 / 铭文签 / 背号签 / 新秀签 / 精英签…
 * 卡淘上写「卡签」（on-card 亲签）而不写「签字」的标题有两千多条，只收「签字|签名|亲签」
 * 会把它们整批算进普卡档（见 PROGRESS.md 里 Topps Chrome Updates 那张哈珀 50 编）。
 *
 * 排除三类「签」：印签（印刷签名，不是签名卡）、标签 / 书签 / 抽签（与签名无关）。
 * 用后行断言而不是把「印签」写成黑名单，是因为「铭文印签」「红印签」也要一起排掉。
 */
const AUTO_PATTERN = /签字|签名|亲签|(?<!印|标|书|抽)签|auto|autograph|\brpa\b|\bra\b|\bau\b/i;

/**
 * 实物 / 物料卡。刻意不收「球衣」两个字：中文标题里「球衣编号 / 球衣号」
 * 指的是编号等于球衣号，与物料卡无关，放开会把它误判成实物卡。
 */
const RELIC_PATTERN = /实物|切割|布片|球衣卡|球衣切|patch\b|logoman|game\s*used|jersey\s*card/i;

/** 新秀写法 */
const ROOKIE_PATTERN = /新秀|\brc\b|rookie|rc\s*卡|rookie\s*card/i;

/** 分级 / 评级卡 */
const GRADE_PATTERN = /\b(psa|bgs|cgc|sgc)\b|评级|鉴定/i;

/** 超短印 */
const SSP_PATTERN = /超短印|\bssp\b|super\s*short|短印/i;

/** 常见印量：只有落在这一串里的数字才被当成编号 */
const PRINT_RUNS = new Set([
    1, 2, 3, 4, 5, 6, 8, 9, 10, 15, 20, 25, 30, 35, 40, 49, 50, 60, 70, 75, 99, 100, 125, 150, 175, 199, 200, 225,
    249, 250, 275, 299, 300, 325, 350, 399, 400, 499, 500, 599, 699, 750, 799, 999,
]);

/** 系列 → 在册产品 key；只登记有系列系数的那八个 */
const SERIES_RULES: { key: string; pattern: RegExp }[] = [
    { key: "tcu26-basketball", pattern: /chrome\s*update/i },
    { key: "tfinest26-basketball", pattern: /topps\s*finest|finest\b/i },
    { key: "tcosmic26-basketball", pattern: /cosmic\s*chrome/i },
    { key: "tsig26-basketball", pattern: /signature\s*class/i },
    { key: "tccj26-basketball", pattern: /cactus\s*jack/i },
    { key: "tthree26-basketball", pattern: /topps\s*three/i },
    { key: "thoops26-basketball", pattern: /\bhoops\b/i },
    { key: "tbb26-basketball", pattern: /topps\s*basketball/i },
];

export type CardKind = "auto" | "relic" | "ssp" | "base";

export interface ParsedSale {
    /** 卡片性质；一个标题同时命中签字与实物时按签字算（RPA 两头都占） */
    kind: CardKind;
    /** 限量编号，null = 没写或没解析出来 */
    numbered: number | null;
    /** 带分数写法（014/150）时的分子 */
    serial: number | null;
    rookie: boolean;
    graded: boolean;
    /** 系列 key；不在册的系列返回 null */
    series: string | null;
    /** 赛季起始年，如 2025-26 记 2025；解析不出来返回 null */
    year: number | null;
    /** 整盒 / 整包转售，标定时应剔除 */
    pack: boolean;
    /** 多张卡打包成一条成交，标定时应剔除 */
    lot: boolean;
    /** 命中的球员名（取最长匹配），名单由调用方给出 */
    player: string | null;
}

/**
 * 从标题里抠限量编号。
 *
 * 顺序很重要：先认 `1/1`（superfractor），再认「N 编」这种中文写法，
 * 最后认 `n/d` 分式。卡片编号 `BKR-CF`、赛季 `2025-26`、日期都不会命中，
 * 因为印量必须落在 PRINT_RUNS 里。
 */
function parseNumbering(title: string): { numbered: number | null; serial: number | null } {
    if (/1\s*\/\s*1(?!\d)/.test(title)) return { numbered: 1, serial: 1 };

    /* 「10 编」「/75 编」「限量 99」 */
    for (const match of title.matchAll(/(\d{1,4})\s*(?:编|限量)/g)) {
        const value = Number(match[1]);
        if (PRINT_RUNS.has(value)) return { numbered: value, serial: null };
    }

    /* 「014/150」「/ 99」这两种分式写法 */
    for (const match of title.matchAll(/(\d{1,4})\s*\/\s*(\d{1,4})/g)) {
        const left = Number(match[1]);
        const right = Number(match[2]);
        if (!PRINT_RUNS.has(right)) continue;
        return { numbered: right, serial: left > 0 && left <= right ? left : null };
    }

    return { numbered: null, serial: null };
}

/** 赛季年份：`2025-26`、`2025/26`、`2025-2026` 都算 2025 */
function parseYear(title: string): number | null {
    const season = title.match(/\b(19\d{2}|20\d{2})\s*[-–/]\s*\d{2,4}\b/);
    if (season) {
        const start = Number(season[1]);
        if (start >= 1948 && start <= 2027) return start;
    }
    const single = title.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
    if (single) {
        const value = Number(single[1]);
        if (value >= 1950 && value <= 2027) return value;
    }
    return null;
}

/**
 * 解一个标题。`names` 是在册球员名（按写法原样），用来抠人物维度。
 * 名字取最长匹配：标题里同时出现「Cooper」与「Cooper Flagg」时选后者。
 */
export function parseSale(title: string, names: string[]): ParsedSale {
    const auto = AUTO_PATTERN.test(title);
    const relic = RELIC_PATTERN.test(title);
    const kind: CardKind = auto ? "auto" : relic ? "relic" : SSP_PATTERN.test(title) ? "ssp" : "base";
    const year = parseYear(title);

    /*
     * 系列只在赛季对得上时才认。这一步不能省：Topps Finest、NBA Hoops、
     * Topps Basketball 都是上世纪就在出的牌子，1993 年的 Finest 标题里
     * 同样写着 "Topps Finest"，不加年份闸门就会被算成本系列的 2026 年盒。
     * 曾经因此把系列系数与年代系数搅在一起，两个维度都读不出真值。
     */
    let series: string | null = null;
    if (year === 2025 || year === 2026) {
        for (const rule of SERIES_RULES) {
            if (rule.pattern.test(title)) {
                series = rule.key;
                break;
            }
        }
    }

    let player: string | null = null;
    for (const name of names) {
        if (name.length > (player?.length ?? 0) && title.toLowerCase().includes(name.toLowerCase())) {
            player = name;
        }
    }

    const { numbered, serial } = parseNumbering(title);
    return {
        kind,
        numbered,
        serial,
        rookie: ROOKIE_PATTERN.test(title),
        graded: GRADE_PATTERN.test(title),
        series,
        year,
        pack: PACK_PATTERN.test(title),
        lot: LOT_PATTERN.test(title),
        player,
    };
}

/**
 * 出价次数下限。卡淘上一口价直接成交的记录出价次数是 0，
 * 而「￥1 起拍、只有 1 个人出价」的流拍尾货会把中位数拉到地板上，
 * 所以标定只看出价 ≥2 次的记录 —— 这与上一轮标定的口径一致。
 */
export const MIN_BIDS = 2;

export const median = (values: number[]): number => {
    if (values.length === 0) return Number.NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
