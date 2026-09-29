/**
 * 球队展示元数据：官方队标 slug + 缩写 + 主色。
 *
 * 队标图形使用公开图床的图片，`TEAM_LOGO_BASE` 指过去即可；
 * 队标是各队的商标，如需自托管，把这一行改成本地目录（如 `"/teams"`）
 * 并保证文件名等于 slug 即可，组件不用动。
 *
 * slug 用的是公开图床的通行写法，与三字母缩写不总是一致
 * （勇士 `gs` 不是 `gsw`，尼克斯 `ny` 不是 `nyk`，爵士 `utah` 不是 `uta`），
 * 所以两者分开存，不要试图互相推导。
 *
 * 缩写与主色是队标加载不出来时的兜底，因此即使队标可用也要保留。
 */

export interface TeamMeta {
    /** 队标 slug（图床文件名）；空串表示没有队标，直接走兜底 */
    slug: string;
    /** 三字母缩写，队标不可用时的兜底显示 */
    abbr: string;
    /** 主色（十六进制），兜底色块用 */
    color: string;
}

/** 队标图床基地址；末段就是 slug，扩展名 .png */
export const TEAM_LOGO_BASE = "https://a.espncdn.com/i/teamlogos/nba/500";

/** 球队名 -> 元数据。键必须与名册（roster.ts）里的球队字符串完全一致 */
export const TEAM_META: Record<string, TeamMeta> = {
    "Atlanta Hawks": { slug: "atl", abbr: "ATL", color: "#e03a3e" },
    "Boston Celtics": { slug: "bos", abbr: "BOS", color: "#007a33" },
    "Brooklyn Nets": { slug: "bkn", abbr: "BKN", color: "#1a1a1a" },
    "Charlotte Hornets": { slug: "cha", abbr: "CHA", color: "#1d1160" },
    "Chicago Bulls": { slug: "chi", abbr: "CHI", color: "#ce1141" },
    "Cleveland Cavaliers": { slug: "cle", abbr: "CLE", color: "#860038" },
    "Dallas Mavericks": { slug: "dal", abbr: "DAL", color: "#00538c" },
    "Denver Nuggets": { slug: "den", abbr: "DEN", color: "#0e2240" },
    "Detroit Pistons": { slug: "det", abbr: "DET", color: "#c8102e" },
    "Golden State Warriors": { slug: "gs", abbr: "GSW", color: "#1d428a" },
    "Houston Rockets": { slug: "hou", abbr: "HOU", color: "#ce1141" },
    "Indiana Pacers": { slug: "ind", abbr: "IND", color: "#002d62" },
    "Los Angeles Clippers": { slug: "lac", abbr: "LAC", color: "#c8102e" },
    "Los Angeles Lakers": { slug: "lal", abbr: "LAL", color: "#552583" },
    "Memphis Grizzlies": { slug: "mem", abbr: "MEM", color: "#5d76a9" },
    "Miami Heat": { slug: "mia", abbr: "MIA", color: "#98002e" },
    "Milwaukee Bucks": { slug: "mil", abbr: "MIL", color: "#00471b" },
    "Minnesota Timberwolves": { slug: "min", abbr: "MIN", color: "#0c2340" },
    "New Orleans Pelicans": { slug: "no", abbr: "NOP", color: "#0c2340" },
    "New York Knicks": { slug: "ny", abbr: "NYK", color: "#006bb6" },
    "Oklahoma City Thunder": { slug: "okc", abbr: "OKC", color: "#007ac1" },
    "Orlando Magic": { slug: "orl", abbr: "ORL", color: "#0077c0" },
    "Philadelphia 76ers": { slug: "phi", abbr: "PHI", color: "#006bb6" },
    "Phoenix Suns": { slug: "phx", abbr: "PHX", color: "#1d1160" },
    "Portland Trail Blazers": { slug: "por", abbr: "POR", color: "#e03a3e" },
    "Sacramento Kings": { slug: "sac", abbr: "SAC", color: "#5a2d81" },
    "San Antonio Spurs": { slug: "sa", abbr: "SAS", color: "#c4ced4" },
    /** 名宿卡里的历史球队，公开图床没有条目，会落到缩写兜底 */
    "Seattle SuperSonics": { slug: "sea", abbr: "SEA", color: "#00653a" },
    "Toronto Raptors": { slug: "tor", abbr: "TOR", color: "#ce1141" },
    "Utah Jazz": { slug: "utah", abbr: "UTA", color: "#002b5c" },
    "Washington Wizards": { slug: "wsh", abbr: "WAS", color: "#002b5c" },
};

const NEUTRAL = "#5b6478";

/**
 * 查元数据。名册里没有对应球队的（如非球员的 "Entertainer"）退化成首字母色块：
 * slug 留空表示没有队标，用灰色而不是猜一个颜色，漏配的球队一眼就能看出来。
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
    return { slug: "", abbr: abbr || "?", color: NEUTRAL };
};

/** 队标地址；没有 slug（未收录 / 非球队）时返回空串 */
export const teamLogo = (team: string): string => {
    const { slug } = teamMeta(team);
    return slug ? `${TEAM_LOGO_BASE}/${slug}.png` : "";
};
