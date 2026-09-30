/**
 * 2025 年 NBA 选秀顺位。
 *
 * **自动生成，不要手改。** 由 `node scripts/import-draft-order.mjs` 从
 * `sources/basketball/nba/2025-draft-order/draft-order.txt` 生成，
 * 原始页面的出处与哈希记在同目录的 README.md 里。
 */

/** 名单对应的选秀年份 */
export const DRAFT_CLASS_YEAR = 2025;

/** 采集日期 */
export const DRAFT_AS_OF = "2026-09-30";

export interface DraftPick {
    pick: number;
    player: string;
    /** 选中球队；被交易时仍是选中球队 */
    team: string;
    school: string;
    /** 选秀夜被交易到的球队；null = 未交易 */
    tradedTo: string | null;
}

export const DRAFT_PICKS_2025: DraftPick[] = [
    { pick: 1, player: "Cooper Flagg", team: "Mavericks", school: "Duke", tradedTo: null },
    { pick: 2, player: "Dylan Harper", team: "Spurs", school: "Rutgers", tradedTo: null },
    { pick: 3, player: "VJ Edgecombe", team: "76ers", school: "Baylor", tradedTo: null },
    { pick: 4, player: "Kon Knueppel", team: "Hornets", school: "Duke", tradedTo: null },
    { pick: 5, player: "Ace Bailey", team: "Jazz", school: "Rutgers", tradedTo: null },
    { pick: 6, player: "Tre Johnson", team: "Wizards", school: "Texas", tradedTo: null },
    { pick: 7, player: "Jeremiah Fears", team: "Pelicans", school: "Oklahoma", tradedTo: null },
    { pick: 8, player: "Egor Demin", team: "Nets", school: "BYU", tradedTo: null },
    { pick: 9, player: "Collin Murray-Boyles", team: "Raptors", school: "South Carolina", tradedTo: null },
    { pick: 10, player: "Khaman Maluach", team: "Rockets", school: "Duke", tradedTo: "Suns" },
    { pick: 11, player: "Cedric Coward", team: "Trail Blazers", school: "Washington State", tradedTo: "Grizzlies" },
    { pick: 12, player: "Noa Essengue", team: "Bulls", school: "Ratiopharm Ulm", tradedTo: null },
    { pick: 13, player: "Derik Queen", team: "Hawks", school: "Maryland", tradedTo: "Pelicans" },
    { pick: 14, player: "Carter Bryant", team: "Spurs", school: "Arizona", tradedTo: null },
    { pick: 15, player: "Thomas Sorber", team: "Thunder", school: "Georgetown", tradedTo: null },
    { pick: 16, player: "Yang Hansen", team: "Grizzlies", school: "Qingdao", tradedTo: "Trail Blazers" },
    { pick: 17, player: "Joan Beringer", team: "Timberwolves", school: "Cedevita Olimpija", tradedTo: null },
    { pick: 18, player: "Walter Clayton Jr.", team: "Wizards", school: "Florida", tradedTo: "Jazz" },
    { pick: 19, player: "Nolan Traoré", team: "Nets", school: "Saint-Quentin BB", tradedTo: null },
    { pick: 20, player: "Kasparas Jakučionis", team: "Heat", school: "Illinois", tradedTo: null },
    { pick: 21, player: "Will Riley", team: "Jazz", school: "Illinois", tradedTo: "Wizards" },
    { pick: 22, player: "Drake Powell", team: "Hawks", school: "North Carolina", tradedTo: "Nets" },
    { pick: 23, player: "Asa Newell", team: "Pelicans", school: "Georgia", tradedTo: "Hawks" },
    { pick: 24, player: "Nique Clifford", team: "Thunder", school: "Colorado State", tradedTo: "Kings" },
    { pick: 25, player: "Jase Richardson", team: "Magic", school: "Michigan State", tradedTo: null },
    { pick: 26, player: "Ben Saraf", team: "Nets", school: "Ratiopharm Ulm", tradedTo: null },
    { pick: 27, player: "Danny Wolf", team: "Nets", school: "Michigan", tradedTo: null },
    { pick: 28, player: "Hugo González", team: "Celtics", school: "Real Madrid", tradedTo: null },
    { pick: 29, player: "Liam McNeeley", team: "Suns", school: "Connecticut", tradedTo: "Hornets" },
    { pick: 30, player: "Yanic Konan Niederhauser", team: "Clippers", school: "Penn State", tradedTo: null },
    { pick: 31, player: "Rasheer Fleming", team: "Timberwolves", school: "St. Joseph's", tradedTo: "Suns" },
    { pick: 32, player: "Noah Penda", team: "Celtics", school: "Le Mans Sarthe Basket", tradedTo: "Magic" },
    { pick: 33, player: "Sion James", team: "Hornets", school: "Duke", tradedTo: null },
    { pick: 34, player: "Ryan Kalkbrenner", team: "Hornets", school: "Creighton", tradedTo: null },
    { pick: 35, player: "Johni Broome", team: "76ers", school: "Auburn", tradedTo: null },
    { pick: 36, player: "Adou Thiero", team: "Nets", school: "Arkansas", tradedTo: "Lakers (via Suns &amp; Wolves)" },
    { pick: 37, player: "Chaz Lanier", team: "Pistons", school: "Tennessee", tradedTo: null },
    { pick: 38, player: "Kam Jones", team: "Spurs", school: "Marquette", tradedTo: "Pacers" },
    { pick: 39, player: "Alijah Martin", team: "Raptors", school: "Florida", tradedTo: null },
    { pick: 40, player: "Micah Peavy", team: "Wizards", school: "Georgetown", tradedTo: "Pelicans" },
    { pick: 41, player: "Koby Brea", team: "Warriors", school: "Kentucky", tradedTo: "Suns" },
    { pick: 42, player: "Maxime Raynaud", team: "Kings", school: "Stanford", tradedTo: null },
    { pick: 43, player: "Jamir Watkins", team: "Wizards", school: "Florida State", tradedTo: null },
    { pick: 44, player: "Brooks Barnhizer", team: "Thunder", school: "Northwestern", tradedTo: null },
    { pick: 45, player: "Rocco Zikarsky", team: "Bulls", school: "Brisbane", tradedTo: "Wolves (via Lakers)" },
    { pick: 46, player: "Amari Williams", team: "Magic", school: "Kentucky", tradedTo: "Celtics" },
    { pick: 47, player: "Bogoljub Marković", team: "Bucks", school: "Mega Basket", tradedTo: null },
    { pick: 48, player: "Javon Small", team: "Grizzlies", school: "West Virginia", tradedTo: null },
    { pick: 49, player: "Tyrese Proctor", team: "Cavaliers", school: "Duke", tradedTo: null },
    { pick: 50, player: "Kobe Sanders", team: "Knicks", school: "Nevada", tradedTo: "Clippers" },
    { pick: 51, player: "Mohamed Diawara", team: "Clippers", school: "Cholet Basket", tradedTo: "Knicks" },
    { pick: 52, player: "Alex Toohey", team: "Suns", school: "Sydney Kings", tradedTo: "Warriors" },
    { pick: 53, player: "John Tonje", team: "Jazz", school: "Wisconsin", tradedTo: null },
    { pick: 54, player: "Taelon Peter", team: "Pacers", school: "Liberty", tradedTo: null },
    { pick: 55, player: "Lachlan Olbrich", team: "Lakers", school: "Illawarra Hawks", tradedTo: "Bulls" },
    { pick: 56, player: "Will Richard", team: "Grizzlies", school: "Florida", tradedTo: "Warriors" },
    { pick: 57, player: "Max Shulga", team: "Magic", school: "VCU", tradedTo: "Celtics" },
    { pick: 58, player: "Saliou Niang", team: "Cavaliers", school: "Trento", tradedTo: null },
    { pick: 59, player: "Jahmai Mashack", team: "Rockets", school: "Tennessee", tradedTo: "Grizzlies (via Warriors &amp; Suns)" },
];
