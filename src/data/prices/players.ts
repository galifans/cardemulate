/**
 * 球员分级 —— 卡价模型里唯一的「人物」变量。
 *
 * 分档依据是**公开市场的成交档位**，不是球队地位。所以 2026-10 这一轮重新标定
 * 时换了取样市场：上一版是用「Topps NBA Hoops 非编号卡」的成交价定的（普通球员
 * ￥1~2、顶级档 ￥13.55，得出 5~10 倍）—— 那张表描述的是**普卡市场**；而本站在册
 * 的贵卡几乎全是签名卡与低编平行卡，同一批球员在**签名卡市场**上的差距要大一个
 * 数量级（实测普通球员签名卡中位 ￥140，库里 ￥8,711，相差 62 倍）。
 * 把普卡市场的倍数套到签名卡上，就是「10 编签字只值 ￥1,500」的由来。
 *
 * 名字必须与名册里的写法完全一致（含变音符号），`npm run prices:check` 会核对。
 * 未列入三张表的球员按 1 倍算，不影响运行，但 prices:check 会提示「未分级」人数。
 *
 * 档位只是**倍率**，真正乘到价格上时还要按卡的大类加权 —— 见 card-values.ts 的
 * playerFactor：签名卡/实物卡/超短印吃满倍率，普卡/平行卡/插入卡只吃一小部分。
 * 这一层是必须的，因为真实市场里人物溢价本来就随卡的档次放大。
 */

/** 分档所依据的样本采集日期（卡淘「已售出」成交价，见 TIER_EVIDENCE） */
export const PLAYER_TIERS_AS_OF = "2026-10-01";

/**
 * 超巨档：卡淘签名卡成交价中位在 ￥6,000 以上，或市场共识明显属于这一层。
 * 实测：库里 ￥8,711（n=7）、爱德华兹 ￥8,228（n=4）、SGA ￥6,577（n=2）、
 * 库珀弗拉格 ￥9,034（n=5，2025 年状元）。
 */
export const SUPERSTARS: string[] = [
    "LeBron James",
    "Stephen Curry",
    "Kevin Durant",
    "Giannis Antetokounmpo",
    "Nikola Jokić",
    "Luka Dončić",
    "Victor Wembanyama",
    "Shai Gilgeous-Alexander",
    "Anthony Edwards",
    "Jayson Tatum",
    "Cooper Flagg",
];

/**
 * 巨星档：卡淘签名卡成交价中位在 ￥600~￥2,900 之间。
 * 实测：利拉德 ￥545（n=8）、安东尼戴维斯 ￥613（n=26）、恩比德 ￥887（n=3）、
 * 米切尔 ￥927（n=10）、布克 ￥963（n=3）、欧文 ￥1,117（n=4）、
 * 布伦森 ￥2,881（n=2）、约基奇 ￥2,153（n=8）。
 */
export const ELITES: string[] = [
    "Joel Embiid",
    "Ja Morant",
    "Anthony Davis",
    "Kawhi Leonard",
    "James Harden",
    "Jimmy Butler III",
    "Devin Booker",
    "Kyrie Irving",
    "Donovan Mitchell",
    "Jalen Brunson",
    "Paolo Banchero",
    "Cade Cunningham",
    "Tyrese Haliburton",
    "Damian Lillard",
    "Jaylen Brown",
    "Tyrese Maxey",
    "Trae Young",
    "LaMelo Ball",
    "Scottie Barnes",
    "Evan Mobley",
    "De'Aaron Fox",
    "Jalen Williams",
    "Chet Holmgren",
    "Alperen Sengun",
    "Pascal Siakam",
    "Kristaps Porzingis",
];

/**
 * 球星档：主流收藏会有稳定接盘，但签名卡中位只有普通球员的数倍。
 * 实测：内姆哈德 ￥140（n=102）—— 这一档内部方差很大（￥140 到 ￥2,900），
 * 所以只给中等倍率、不再细分；再往细里切就不是样本能支撑的精度了。
 */
export const ALL_STARS: string[] = [
    "Jamal Murray",
    "Draymond Green",
    "Karl-Anthony Towns",
    "Jaren Jackson Jr.",
    "Darius Garland",
    "Domantas Sabonis",
    "Bam Adebayo",
    "Franz Wagner",
    "Derrick White",
    "OG Anunoby",
    "Amen Thompson",
    "Aaron Gordon",
    "Desmond Bane",
    "Jalen Johnson",
    "Tyler Herro",
    "Julius Randle",
    "Lauri Markkanen",
    "Austin Reaves",
    "Rudy Gobert",
    "Trey Murphy III",
    "Jarrett Allen",
    "Norman Powell",
    "Dyson Daniels",
    "Mikal Bridges",
    "Ivica Zubac",
    "Dejounte Murray",
    "Brandon Miller",
    "Coby White",
    "Josh Giddey",
    "Jalen Green",
    "Fred VanVleet",
    "DeMar DeRozan",
    "Jrue Holiday",
    "Brandon Ingram",
    "Paul George",
    "Bradley Beal",
    "Chris Paul",
    "CJ McCollum",
    "Anfernee Simons",
    "Zach Lavine",
    "Myles Turner",
    "Josh Hart",
    "RJ Barrett",
    "De'Andre Hunter",
    "Michael Porter Jr.",
    "Keegan Murray",
    "Jabari Smith Jr.",
    "Walker Kessler",
    "Shaedon Sharpe",
    "Andrew Nembhard",
    "Stephon Castle",
    "Naz Reid",
    "Jordan Poole",
    "Cameron Johnson",
    "Herbert Jones",
    "Jalen Suggs",
    "Tari Eason",
    "Ausar Thompson",
    "Derik Queen",
];

/**
 * 档位倍率。倍率只在**签名卡/实物卡/超短印**上吃满，普卡类会被 card-values.ts
 * 压到七分之一左右 —— 真实市场里「库里普卡 vs 普通球员普卡」只差 3~5 倍，
 * 「库里签字 vs 普通球员签字」差 50 倍以上，同一个倍率不可能同时说对两头。
 *
 * 三个数字是一组，改动前先看 TIER_EVIDENCE 的实测值；改完跑 `npm run prices:check`，
 * 它会核算档位之间的比值有没有落在实测区间内。档位整体抬高会把每个盒型的平均
 * 售出额一起抬高，多出来的部分由 products.ts 的系列系数收回 —— 两处不要分开调。
 */
export const SUPERSTAR_TIER = 30;
export const ELITE_TIER = 7;
export const ALL_STAR_TIER = 2.5;

/** 新秀卡的额外系数（与上面三档叠乘） */
export const ROOKIE_FACTOR = 1.4;

/** 首编（1/N）的额外系数 */
export const FIRST_SERIAL_FACTOR = 1.5;

/** 尾编（N/N）的额外系数 */
export const LAST_SERIAL_FACTOR = 1.3;

/** 三张分档表的合并视图，供查表与校验使用 */
export const PLAYER_TIERS: { tier: number; names: string[] }[] = [
    { tier: SUPERSTAR_TIER, names: SUPERSTARS },
    { tier: ELITE_TIER, names: ELITES },
    { tier: ALL_STAR_TIER, names: ALL_STARS },
];

/** 一个球员的档位倍率；未分级一律 1 */
export function playerTier(player: string): number {
    for (const level of PLAYER_TIERS) {
        if (level.names.includes(player)) return level.tier;
    }
    return 1;
}

/**
 * 分档的实测存证（卡淘「已售出」成交价中位数，出价 ≥2 次，2026-09 采集）。
 *
 * 这张表**不参与计算**，它只是把「分档为什么这么定」写进仓库 —— 换档位之前先看这里。
 * `autoMedian` 是签名卡，`baseMedian` 是非签名卡（含平行卡与插入卡），单位 RMB。
 * 样本量差异很大（内姆哈德 102 条、布伦森 2 条），所以只看量级，不要抠小数。
 */
export const TIER_EVIDENCE: { player: string; tier: string; autoMedian: number; baseMedian: number; n: number }[] = [
    { player: "Cooper Flagg", tier: "超巨", autoMedian: 9034, baseMedian: 62, n: 5 },
    { player: "Stephen Curry", tier: "超巨", autoMedian: 8711, baseMedian: 35, n: 7 },
    { player: "Anthony Edwards", tier: "超巨", autoMedian: 8228, baseMedian: 11, n: 4 },
    { player: "Shai Gilgeous-Alexander", tier: "超巨", autoMedian: 6577, baseMedian: 16, n: 2 },
    { player: "Nikola Jokić", tier: "超巨", autoMedian: 2153, baseMedian: 19, n: 8 },
    { player: "Jalen Brunson", tier: "巨星", autoMedian: 2881, baseMedian: 11, n: 2 },
    { player: "Kyrie Irving", tier: "巨星", autoMedian: 1117, baseMedian: 33, n: 4 },
    { player: "Jayson Tatum", tier: "超巨", autoMedian: 1113, baseMedian: 10, n: 1 },
    { player: "Ja Morant", tier: "巨星", autoMedian: 1027, baseMedian: 11, n: 2 },
    { player: "Devin Booker", tier: "巨星", autoMedian: 963, baseMedian: 24, n: 3 },
    { player: "Donovan Mitchell", tier: "巨星", autoMedian: 927, baseMedian: 18, n: 10 },
    { player: "Joel Embiid", tier: "巨星", autoMedian: 887, baseMedian: 6, n: 3 },
    { player: "Anthony Davis", tier: "巨星", autoMedian: 613, baseMedian: 65, n: 26 },
    { player: "Damian Lillard", tier: "巨星", autoMedian: 545, baseMedian: 16, n: 8 },
    { player: "Andrew Nembhard", tier: "球星", autoMedian: 140, baseMedian: 11, n: 102 },
];
