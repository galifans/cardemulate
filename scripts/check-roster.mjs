/**
 * 名册核对：把 `src/data/sets/**​/roster.ts` 逐行对回 `sources/**​/checklist.xlsx`。
 *
 * 为什么需要这个脚本：名册是从官方 Checklist 手工誊抄进 `roster.ts` 的。
 * 誊抄是最容易出错、又最难被发现的一步——卡号错一位、球队记成上一支队伍、
 * 新秀标记漏掉，都不会报错，只会安静地开出一张假卡。
 * 这个脚本让「每次采集后核对一遍」变成一条命令，而不是靠肉眼。
 *
 * 用法：
 *   npm run roster:check                       # 检查全部系列
 *   node scripts/check-roster.mjs <系列目录>    # 只检查一个系列
 *
 * 系列目录指 `src/data/sets/<品类>/<品牌>/<系列>`，原始件按同样的相对路径
 * 去 `sources/` 下找，见 `sources/README.md`。
 *
 * 比对规则：
 * - 卡号 + 人物整体命中才算通过；命中不了再看「人物 + 球队」，
 *   这样能把「卡号抄错」和「这个人根本不在名单里」分开报出来。
 * - 人物、球队比对忽略重音与标点（官方表本身时有时无，
 *   `Jakučionis` 与 `Jakucionis` 视为同一人）。
 * - 官方表里同一卡号出现多次时（源表自己贴重了），任意一条命中即算通过。
 * - 新秀标记按官方表的 `Rookie` 列核对：有标记必须是新秀，反之亦然。
 * - 官方原表自身的缺陷登记在 `SOURCE_DEFECTS` 里，命中时只提示不判失败。
 *
 * 退出码：有出入返回 1。
 */
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { readSheet } from "./lib/xlsx.mjs";

const ROOT = process.cwd();
const SETS_DIR = join(ROOT, "src", "data", "sets");
const SOURCES_DIR = join(ROOT, "sources");
const TMP_DIR = join(ROOT, ".snapshot");

/**
 * 官方原表自身的缺陷：不是誊抄错误，是源表就这么写的。
 * 只登记「已回看原表确认过」的条目，键是系列相对目录。
 */
const SOURCE_DEFECTS = {
    "basketball/topps/tcu26-basketball": [
        {
            no: "DPA-ABAL",
            player: "Adama Bal",
            sheetNo: "DPA-AB",
            reason: "官方表把 NBA Debut Patch Autographs 整份名单贴了两遍，第二遍重复占用了 DPA-AB 卡号；代码里加后缀区分",
        },
        {
            no: "DPA-CJJ",
            player: "Chaney Johnson",
            sheetNo: "DPA-CJ",
            reason: "同上一处重复段，卡号 DPA-CJ 被前一段占用",
        },
    ],
};

/** 折叠成只含字母数字的比对键：忽略重音、标点、大小写。 */
const fold = (s) =>
    String(s ?? "")
        .normalize("NFD")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

// ---------- 读 roster.ts 里的名册 ----------

/** 用 esbuild 把 roster.ts 打成可 import 的 ESM，再取其中的数组导出。 */
async function loadRoster(rosterFile) {
    const esbuild = await import("esbuild");
    mkdirSync(TMP_DIR, { recursive: true });
    const slug = relative(SETS_DIR, rosterFile).split("\\").join("-").replace(/[^\p{L}\p{N}]+/gu, "-");
    const bundlePath = join(TMP_DIR, `roster-${slug}.mjs`);
    await esbuild.build({
        entryPoints: [rosterFile],
        bundle: true,
        platform: "node",
        format: "esm",
        outfile: bundlePath,
        tsconfig: join(ROOT, "tsconfig.json"),
        logLevel: "warning",
    });
    const mod = await import(pathToFileURL(bundlePath).href);
    return Object.entries(mod).filter(([, value]) => Array.isArray(value) && value.length);
}

// ---------- 核对 ----------

/** 把官方表整理成两个索引：卡号+人物，以及人物+球队 → 该人所有卡号。 */
function indexSheet(rows) {
    const byNoName = new Set();
    const byPlayerTeam = new Map();
    for (const row of rows) {
        const no = fold(row.A);
        const player = fold(row.B);
        if (!no || !player) continue;
        byNoName.add(`${no}|${player}`);
        const key = `${player}|${fold(row.C)}`;
        if (!byPlayerTeam.has(key)) byPlayerTeam.set(key, new Set());
        byPlayerTeam.get(key).add(String(row.A).trim());
    }
    return { byNoName, byPlayerTeam };
}

function subdirs(dir) {
    return readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(dir, entry.name));
}

function listSeries() {
    const found = [];
    const walk = (dir, depth) => {
        if (existsSync(join(dir, "roster.ts"))) {
            found.push(dir);
            return;
        }
        if (depth === 0) return;
        for (const child of subdirs(dir)) walk(child, depth - 1);
    };
    for (const category of subdirs(SETS_DIR)) walk(category, 2);
    return found;
}

/**
 * 把 `checklist.txt`（官方 PDF 的文本提取件）按行首卡号建索引。
 * 文本件里的人物与球队之间没有分隔符，所以只拿「卡号 + 人物」做核对，
 * 球队与新手标记交给 xlsx 那一轮。
 */
function indexChecklistText(file) {
    const byNo = new Map();
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
        const line = fold(raw);
        const space = line.indexOf(" ");
        if (space < 1) continue;
        const no = line.slice(0, space);
        if (!byNo.has(no)) byNo.set(no, []);
        byNo.get(no).push(line.slice(space + 1));
    }
    return byNo;
}

async function main() {
    const arg = process.argv[2];
    const seriesDirs = arg ? [join(ROOT, arg)] : listSeries();
    let failed = 0;

    for (const seriesDir of seriesDirs) {
        const rel = relative(SETS_DIR, seriesDir).split("\\").join("/");
        const checklist = join(SOURCES_DIR, rel);
        if (!existsSync(join(checklist, "checklist.xlsx"))) {
            console.log(`[跳过] ${rel}：没有归档 checklist.xlsx`);
            continue;
        }

        const rows = readSheet(join(checklist, "checklist.xlsx"));
        const { byNoName, byPlayerTeam } = indexSheet(rows);
        const defects = SOURCE_DEFECTS[rel] ?? [];
        const textIndex = existsSync(join(checklist, "checklist.txt")) ? indexChecklistText(join(checklist, "checklist.txt")) : null;
        const exports = await loadRoster(join(seriesDir, "roster.ts"));

        const problems = [];
        const known = [];
        let checked = 0;

        for (const [name, list] of exports) {
            for (const [no, player, team, flag] of list) {
                checked++;
                // 源表缺陷的条目：代码里的卡号是加过后缀的，核对时按官方表的原卡号走。
                const defect = defects.find((d) => fold(d.no) === fold(no) && fold(d.player) === fold(player));
                const sourceNo = defect ? defect.sheetNo : no;
                if (defect) known.push(`${name} ${no} ${player} —— 官方表里此人是 ${sourceNo}（${defect.reason}）`);

                const lines = textIndex?.get(fold(sourceNo)) ?? [];
                if (textIndex && !lines.some((rest) => rest === fold(player) || rest.startsWith(`${fold(player)} `))) {
                    problems.push(`PDF 文本件里没有：${name} ${sourceNo} ${player}`);
                }

                const expected = rows.find((row) => fold(row.A) === fold(sourceNo) && fold(row.B) === fold(player));
                if (!expected) {
                    const candidates = [...(byPlayerTeam.get(`${fold(player)}|${fold(team)}`) ?? [])];
                    problems.push(
                        candidates.length
                            ? `卡号对不上：${name} ${sourceNo} ${player} —— 官方表里此人是 ${candidates.join(" / ")}`
                            : `名单里找不到：${name} ${sourceNo} ${player} ${team}`,
                    );
                    continue;
                }
                if (fold(expected.C) !== fold(team)) {
                    problems.push(`球队不一致：${name} ${no} ${player} —— 代码 ${team}，官方表 ${expected.C}`);
                }
                if ((fold(expected.D) === "rookie") !== (flag === "R")) {
                    problems.push(
                        `新秀标记不一致：${name} ${no} ${player} —— 代码${flag === "R" ? "标了" : "没标"}新秀，官方表${fold(expected.D) === "rookie" ? "是" : "不是"}新秀`,
                    );
                }
            }
        }

        const dups = rows.length - byNoName.size;
        console.log(`[${problems.length ? "有出入" : "通过"}] ${rel}：核对 ${checked} 行，官方表 ${byNoName.size} 条${dups > 0 ? ` + ${dups} 条重复卡号` : ""}`);
        for (const text of known) console.log(`    [已知源表缺陷] ${text}`);
        for (const text of problems) console.log(`    ${text}`);
        if (problems.length) failed++;
    }

    if (failed) {
        console.log(`\n${failed} 个系列有出入：逐条回看官方原表——确认是誊抄错误就改 roster.ts，确认是源表缺陷就登记到 SOURCE_DEFECTS。`);
        process.exit(1);
    }
    console.log("\n名册与官方 Checklist 一致。");
}

main();
