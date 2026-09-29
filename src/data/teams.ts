/**
 * 球队展示元数据：缩写 + 主色。
 *
 * 刻意不使用球队徽标图形——徽标是各队的商标，且视觉规范随时会更新，
 * 自绘一套「主色色块 + 三字母缩写」既能一眼分辨，也不涉及授权问题。
 * 色值取各队公开主色；深浅衬字由 TeamIcon 按底色亮度自动决定，
 * 所以这里不必再配一份文字色。
 */

export interface TeamMeta {
    /** 三字母缩写，如 "LAL" */
    abbr: string;
    /** 主色（十六进制） */
    color: string;
}

/** 球队名 -> 元数据。键必须与名册（roster.ts）里的球队字符串完全一致 */
export const TEAM_META: Record<string, TeamMeta> = {
    "Atlanta Hawks": { abbr: "ATL", color: "#e03a3e" },
    "Boston Celtics": { abbr: "BOS", color: "#007a33" },
    "Brooklyn Nets": { abbr: "BKN", color: "#1a1a1a" },
    "Charlotte Hornets": { abbr: "CHA", color: "#1d1160" },
    "Chicago Bulls": { abbr: "CHI", color: "#ce1141" },
    "Cleveland Cavaliers": { abbr: "CLE", color: "#860038" },
    "Dallas Mavericks": { abbr: "DAL", color: "#00538c" },
    "Denver Nuggets": { abbr: "DEN", color: "#0e2240" },
    "Detroit Pistons": { abbr: "DET", color: "#c8102e" },
    "Golden State Warriors": { abbr: "GSW", color: "#1d428a" },
    "Houston Rockets": { abbr: "HOU", color: "#ce1141" },
    "Indiana Pacers": { abbr: "IND", color: "#002d62" },
    "Los Angeles Clippers": { abbr: "LAC", color: "#c8102e" },
    "Los Angeles Lakers": { abbr: "LAL", color: "#552583" },
    "Memphis Grizzlies": { abbr: "MEM", color: "#5d76a9" },
    "Miami Heat": { abbr: "MIA", color: "#98002e" },
    "Milwaukee Bucks": { abbr: "MIL", color: "#00471b" },
    "Minnesota Timberwolves": { abbr: "MIN", color: "#0c2340" },
    "New Orleans Pelicans": { abbr: "NOP", color: "#0c2340" },
    "New York Knicks": { abbr: "NYK", color: "#006bb6" },
    "Oklahoma City Thunder": { abbr: "OKC", color: "#007ac1" },
    "Orlando Magic": { abbr: "ORL", color: "#0077c0" },
    "Philadelphia 76ers": { abbr: "PHI", color: "#006bb6" },
    "Phoenix Suns": { abbr: "PHX", color: "#1d1160" },
    "Portland Trail Blazers": { abbr: "POR", color: "#e03a3e" },
    "Sacramento Kings": { abbr: "SAC", color: "#5a2d81" },
    "San Antonio Spurs": { abbr: "SAS", color: "#c4ced4" },
    /** 名宿卡里的历史球队 */
    "Seattle SuperSonics": { abbr: "SEA", color: "#00653a" },
    "Toronto Raptors": { abbr: "TOR", color: "#ce1141" },
    "Utah Jazz": { abbr: "UTA", color: "#002b5c" },
    "Washington Wizards": { abbr: "WAS", color: "#002b5c" },
};

const NEUTRAL = "#5b6478";

/**
 * 查元数据。名册里没有对应球队的（如非球员的 "Entertainer"）退化成首字母色块，
 * 用灰色而不是猜一个颜色，漏配的球队在页面上一眼就能看出来。
 */
export const teamMeta = (team: string): TeamMeta => {
    const meta = TEAM_META[team];
    if (meta) return meta;
    const abbr = team
        .split(/\s+/)
        .map((word) => word.slice(0, 1))
        .join("")
        .slice(0, 3)
        .toUpperCase();
    return { abbr: abbr || "?", color: NEUTRAL };
};
