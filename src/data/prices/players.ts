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

/** 顶级档的人物系数 */
export const SUPERSTAR_FACTOR = 4;

/** 全明星档的人物系数 */
export const ALL_STAR_FACTOR = 2;

/** 新秀卡的额外系数（与上面两档叠乘） */
export const ROOKIE_FACTOR = 1.4;

/** 首编（1/N）的额外系数 */
export const FIRST_SERIAL_FACTOR = 1.5;

/** 尾编（N/N）的额外系数 */
export const LAST_SERIAL_FACTOR = 1.3;
