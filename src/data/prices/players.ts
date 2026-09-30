/**
 * 球员分级 —— 卡价模型里唯一的「人物」变量。
 *
 * 分级依据是公开市场的成交档位，不是球队地位：顶级档是「一张普通非编号卡
 * 也有人抢」的球员，全明星档是「主流收藏会有稳定接盘」的球员，其余按 1 倍算。
 * 名字必须与名册里的写法完全一致（含变音符号），`npm run prices:check` 会核对。
 *
 * 新增盒型时如果名册里有分级表里没有的球员，默认按 1 倍处理，不影响运行，
 * 但 prices:check 会提示「未分级」人数，看到提示再补进下面的表里即可。
 */

/** 顶级档：一票难求级别的球星 */
export const SUPERSTARS: string[] = [
    "LeBron James",
    "Stephen Curry",
    "Kevin Durant",
    "Giannis Antetokounmpo",
    "Nikola Jokić",
    "Luka Dončić",
    "Victor Wembanyama",
    "Jayson Tatum",
    "Shai Gilgeous-Alexander",
    "Anthony Edwards",
    "Joel Embiid",
    "Ja Morant",
    "Damian Lillard",
    "Anthony Davis",
    "Jimmy Butler III",
    "Kawhi Leonard",
    "James Harden",
    "Devin Booker",
    "Kyrie Irving",
    "Donovan Mitchell",
    "Jalen Brunson",
    "Paolo Banchero",
    "Cade Cunningham",
    "Tyrese Haliburton",
];

/** 全明星档：主流收藏会有稳定接盘的球员 */
export const ALL_STARS: string[] = [
    "Jaylen Brown",
    "Jalen Williams",
    "Jamal Murray",
    "Draymond Green",
    "Karl-Anthony Towns",
    "Evan Mobley",
    "Pascal Siakam",
    "Jaren Jackson Jr.",
    "De'Aaron Fox",
    "Chet Holmgren",
    "Darius Garland",
    "Domantas Sabonis",
    "Bam Adebayo",
    "Trae Young",
    "Alperen Sengun",
    "Franz Wagner",
    "Derrick White",
    "Tyrese Maxey",
    "OG Anunoby",
    "Amen Thompson",
    "Aaron Gordon",
    "Scottie Barnes",
    "Desmond Bane",
    "Jalen Johnson",
    "LaMelo Ball",
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
    "Kristaps Porzingis",
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
    "Cooper Flagg",
];

/**
 * 顶级档的人物系数。
 *
 * 标定依据：卡淘「Topps NBA Hoops」按球员分组后，出价 ≥2 次的成交价中位数
 * 从 ￥2.55（全明星档）到 ￥13.55（顶级档）铺开，而普通球员基本贴着 ￥1~2。
 * 也就是说顶级档对普通球员的溢价是 5~10 倍，不是 4 倍。取 6 倍是这条区间的
 * 下沿，宁少不多 —— 系数再往上抬会同时抬高每个盒型的平均售出额。
 */
export const SUPERSTAR_FACTOR = 6;

/**
 * 全明星档的人物系数。
 *
 * 同一份样本里，全明星档内部从 ￥1 到 ￥9 都有，中位数只有普通球员的两倍不到，
 * 所以从 2 下调到 1.5。
 *
 * 这一档和顶级档的系数是**一起**动的：24 位顶级 + 72 位全明星 + 528 位其余，
 * 平均系数从 ×4/×2 的 1.231 变成 ×6/×1.5 的 1.250，几乎不变。但每个盒型的
 * 名册构成不一样，实测整体卡价水位还是会往上走几个百分点，这个差额由
 * products.ts 的系列系数一并收回 —— 两处系数不要分开调。
 */
export const ALL_STAR_FACTOR = 1.5;

/** 新秀卡的额外系数（与上面两档叠乘） */
export const ROOKIE_FACTOR = 1.4;

/** 首编（1/N）的额外系数 */
export const FIRST_SERIAL_FACTOR = 1.5;

/** 尾编（N/N）的额外系数 */
export const LAST_SERIAL_FACTOR = 1.3;
