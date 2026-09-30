/**
 * 把官方 Pack Odds 表的文本提取件转成 `pack-odds.generated.ts`。
 *
 * 为什么不能手工誊抄：一张表动辄几百行、十几列，抄错一位就是把 1:1509 变成 1:1590，
 * 页面上完全看不出来。所以配率只从这张表来，由脚本转换，再由 `npm run boxes:check` 兜底。
 *
 * 表的结构与「为什么必须用布局模式提取」
 * ------------------------------------
 * 官方表都是「左侧一列标签 + 右侧若干列渠道」。渠道名写在表头行里，正文行只写有值的
 * 列——**空格子会被整段丢掉**，所以不能按「从左往右数第几个」来填列，那样一旦中间
 * 少一列，后面全部左移。本脚本改用横向位置定位：先按表头算出每一列的起始字符位，
 * 再把每个配率归到它左边最近的那一列。因此 `pack-odds.txt` 必须用布局模式提取
 * （见 `scripts/extract-pdf-text.py`），否则列位置不存在，脚本会直接报错退出。
 *
 * 配率有两种写法，统一换算成「平均多少包出一张」：
 * - `1:X`  → X（1 包里出 1 张）
 * - `A:B`  → B / A（A 包里出 B 张）
 * 例如 `4:1` 是每包 4 张，换成 0.25；`1:7` 是 7 包一张，换成 7。
 *
 * 个别 PDF 的**标签列是两端对齐的**（Signature Class 就是这样）：排版器会在字符之间
 * 塞进单空格，把 `Veteran` 拉成 `Ve t e r a n`，连数值都被塞成 `1: 407`。这种文件加
 * `--relaxed`：只用「连续两个以上空格」当格子边界，格子内部的单空格一律丢掉。
 * 表头同样被拉开，所以宽松模式下的表头匹配也先去掉空格再找。
 * 标签这么处理会得到 `VeteranClassBaseRedLava` 这种连成一串的东西——不是能写进代码的
 * 名字，所以还要用 `--labels=<plain.txt>` 拿同样这份 PDF 的**普通模式**提取件当词典：
 * 普通模式不排版、标签是干净的，两边各自去掉空格后按行对上，就能把标签换回官方写法。
 *
 * 用法：
 *   node scripts/import-pack-odds.mjs <pack-odds.txt> <输出 .ts> "渠道1,渠道2,..." [--relaxed] [--labels=plain.txt]
 *
 * 渠道名按官方表**从左到右**列出，脚本用它算列位并由此生成列 id（小写连字符）。
 * 认不出来的行会打印出来，**必须逐条人工核对**，不能放着警告往下走。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";

/**
 * 官方表自身的缺陷：个别行在 PDF 里少印了几列。这种地方宁可写死在脚本里，
 * 也不要让导入器「猜」——猜错了配率就悄悄错了。键是产品目录名，值是整行覆盖。
 */
const ROW_PATCHES = {
    "tcu26-basketball": {
        "Alter Ego": [6818, 3065, 2155, null, 15386, 15386, 15386, 10821, 10821, 10821, 3571, null],
    },
    "tthree26-basketball": {
        // 见 LABEL_PATCHES：这三行的第一列配率被挤进了行标签，表格里那一格是空的
        "Rookie 3 Patch Autographs Horizontal Bronze": [23, 23],
        "Rookie 3 Patch Autographs Horizontal Platinum": [554, 554],
        "Rookie 3 Patch Autographs Vertical Platinum": [554, 554],
    },
};

/**
 * 官方表的另一种笔误：行标签太宽，第一列配率紧贴在标签后面（中间没有空格），
 * 例如 `Rookie 3 Patch Autographs Horizontal Bronze1:23`。这类行按原样导出会多出
 * 一个假平行，所以在导入前先把标签改回官方本来的写法。
 *
 * 键是产品目录名，值是「表里的错标签 → 正确标签」。
 */
const LABEL_PATCHES = {
    "tthree26-basketball": {
        "Rookie 3 Patch Autographs Horizontal Bronze1:23":
            "Rookie 3 Patch Autographs Horizontal Bronze",
        "Rookie 3 Patch Autographs Horizontal Platinum1:554":
            "Rookie 3 Patch Autographs Horizontal Platinum",
        "Rookie 3 Patch Autographs Vertical Platinum1:554":
            "Rookie 3 Patch Autographs Vertical Platinum",
    },
};

const PAGE_RE = /^=+ PAGE \d+ =+$/;
/**
 * 官方声明，整段按版面折行，所以逐行匹配时要把折出来的半句也认出来，
 * 否则每次生成都会多出几条「没有配率」的无用提醒。
 */
const DISCLAIMER_RE =
    /checklists? and odds provided by topps|actual contents and odds may vary|does not guarantee|configuration of that product|time of production|will appear in every (parallel|variation)|inclusion of a subject|^\*+$/i;
/** 同一套声明在宽松模式下也是被拉开的，去掉全部空格后再匹配一份对应的写法 */
const DISCLAIMER_TIGHT_RE = new RegExp(DISCLAIMER_RE.source.replace(/ /g, ""), DISCLAIMER_RE.flags);

/** 一个配率令牌：`-`（空）、`1:X`、`A:B`、或者没有冒号的数字（异常，必须人工看） */
const VALUE_RE = /^(?:-|\d+\s*:\s*[\d,.]+|\d+\.\d+)$/;

const slugify = (name) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

/** 把 `1:X` / `A:B` / 裸数字换算成「平均多少包出一张」 */
const toOdds = (token) => {
    if (token === "-") return null;
    const parts = token.split(":").map((part) => part.trim());
    if (parts.length === 2) {
        const left = Number(parts[0].replace(/,/g, ""));
        const right = Number(parts[1].replace(/,/g, ""));
        if (!left || !right) return null;
        return right / left;
    }
    return Number(token.replace(/,/g, ""));
};

/** 在一行里找出所有配率令牌及其位置（`at` 起始位，`end` 结束位，`center` 中心位） */
const valueTokens = (line) => {
    const found = [];
    for (const match of line.matchAll(/\S+/g)) {
        if (!VALUE_RE.test(match[0])) continue;
        const at = match.index;
        const end = at + match[0].length;
        found.push({ at, end, center: (at + end) / 2, text: match[0] });
    }
    return found;
};

/**
 * 宽松模式的令牌：只有连续两个以上空格才算分隔，格子内部的单空格当成噪声抹掉。
 * 标签列被两端对齐撑开时，字与字之间是**单**空格，而列与列之间是很宽的空档，
 * 这条界线是唯一还站得住的信息。抹掉单空格后 `1: 407` 会还原成 `1:407`。
 */
const relaxedTokens = (line) => {
    const found = [];
    for (const match of line.matchAll(/\S+(?: \S+)*/g)) {
        const at = match.index;
        const end = at + match[0].length;
        found.push({ at, end, center: (at + end) / 2, text: match[0].replace(/ /g, "") });
    }
    return found;
};

/** 一行里所有配率令牌（宽松模式下先取得原始格子、再筛出配率） */
const tokensOf = (line, relaxed) =>
    relaxed ? relaxedTokens(line).filter((cell) => VALUE_RE.test(cell.text)) : valueTokens(line);

/** 去掉全部空格并记下每个字符在原文里的位置，便于把「挤掉空格后」的下标映射回原下标 */
const compact = (line) => {
    const map = [];
    let text = "";
    for (let i = 0; i < line.length; i++) {
        if (line[i] === " ") continue;
        map.push(i);
        text += line[i];
    }
    return { text, map };
};

/** 表头行：请求的渠道名都能按从左到右的顺序在里面找到；返回各列的起始位 */
const headerOffsets = (line, columns, relaxed) => {
    if (!columns.length) return null;
    if (!relaxed) {
        let from = 0;
        const offsets = [];
        for (const name of columns) {
            const at = line.indexOf(name, from);
            if (at < 0) return null;
            offsets.push(at);
            from = at + name.length;
        }
        return offsets;
    }

    // 宽松模式：表头本身也被拉开，先整行去掉空格，再按顺序找，最后映射回原下标。
    const { text, map } = compact(line);
    const haystack = text.toLowerCase();
    let from = 0;
    const offsets = [];
    for (const name of columns) {
        const needle = name.replace(/ /g, "").toLowerCase();
        const at = haystack.indexOf(needle, from);
        if (at < 0) return null;
        offsets.push(map[at]);
        from = at + needle.length;
    }
    return offsets;
};

const findHeader = (lines, columns, relaxed) => {
    for (let i = 0; i < lines.length; i++) {
        const offsets = headerOffsets(lines[i], columns, relaxed);
        if (offsets) return { index: i, offsets };
    }
    return null;
};

const looksLikeHeader = (line, columns, relaxed) => {
    const haystack = relaxed ? compact(line).text : line;
    return columns.filter((name) => haystack.includes(name.replace(/ /g, ""))).length >= Math.min(2, columns.length);
};

/**
 * 从普通模式提取件里收集「干净标签」词典。
 * 普通模式不做两端对齐，标签是原样的，但同一行里只剩单空格、列与列也分不开，
 * 所以只拿它当词典用：键是标签去掉空格后的样子，值是可以写进代码的官方名。
 */
const labelDictionary = (plainText) => {
    const dictionary = new Map();
    for (const line of plainText.split(/\r?\n/)) {
        const at = line.search(/\d[\d,]*\s*:\s*[\d,.]/);
        if (at < 0) continue;
        const label = line.slice(0, at).trim().replace(/[-\s]+$/, "");
        if (!label) continue;
        const key = label.replace(/\s+/g, "");
        if (!dictionary.has(key)) dictionary.set(key, label);
    }
    return dictionary;
};

/**
 * 把数值归到某一列。
 *
 * 官方表分两种写法，必须分别对待：
 * - 空格写成 `-` 的表（TCU26 就是这样），每一行的令牌个数刚好等于列数，按顺序摆放就是对的。
 * - 空格是真的空着的表（后面几套系列都是这样），令牌个数少于列数，只能靠水平位置判断。
 *
 * 位置判断取数值的**中心**，列边界取相邻表头的**中间位**。不能直接拿表头位置当左边界：
 * 表头文字左对齐、数值居中，窄数值的结束位会落在下一列表头的左边而被归错列。
 */
const columnOf = (offsets, token) => {
    const point = (token.at + token.end) / 2;
    let index = 0;
    for (let i = 0; i + 1 < offsets.length; i++) {
        if (point >= (offsets[i] + offsets[i + 1]) / 2) index = i + 1;
    }
    return index;
};

const parse = (text, columns, options = {}) => {
    const { relaxed = false, dictionary = null } = options;
    const lines = text.split(/\r?\n/);
    const header = findHeader(lines, columns, relaxed);
    if (columns.length >= 2 && !header) {
        throw new Error(
            "没能在文本里找到表头行。确认传进来的渠道名与官方表一致，且 pack-odds.txt 是用布局模式提取的。",
        );
    }

    // 一份文件里可能有好几张表（分页会重排行位），所以列位要跟着当前表走。
    let offsets = header?.offsets ?? [0];
    const rows = [];
    const warnings = [];
    const unknownLabels = new Set();
    let lastLabel = null;

    for (const line of lines) {
        if (!line.trim()) continue;
        if (PAGE_RE.test(line.trim()) || /^PAGES:/.test(line)) continue;
        if (relaxed ? DISCLAIMER_TIGHT_RE.test(compact(line).text) : DISCLAIMER_RE.test(line)) continue;

        const nextOffsets = headerOffsets(line, columns, relaxed);
        if (nextOffsets) {
            offsets = nextOffsets;
            continue;
        }

        const tokens = tokensOf(line, relaxed);
        if (!tokens.length) {
            if (!looksLikeHeader(line, columns, relaxed)) warnings.push(`没有配率，已跳过：${line.trim()}`);
            continue;
        }

        let label = line.slice(0, tokens[0].at).trim();
        if (!label) {
            if (lastLabel) warnings.push(`有配率但没标签，已忽略：${line.trim()}`);
            continue;
        }
        if (dictionary) {
            // 宽松模式下标签是被拉开的，靠词典换回官方写法；查不到就原样保留并记下来。
            const key = label.replace(/\s+/g, "");
            const clean = dictionary.get(key);
            if (clean) label = clean;
            else if (relaxed && !unknownLabels.has(key)) unknownLabels.add(key);
        }
        lastLabel = label;

        const odds = columns.map(() => null);
        if (tokens.length === columns.length) {
            tokens.forEach((token, index) => (odds[index] = toOdds(token.text)));
        } else {
            for (const token of tokens) odds[columnOf(offsets, token)] = toOdds(token.text);
        }
        rows.push({ label, odds });
    }

    if (unknownLabels.size) {
        warnings.push(
            `词典里没有这些标签，已按原样保留，请人工核对：${[...unknownLabels].join(" / ")}`,
        );
    }

    return { rows, warnings };
};

const render = (rows, columns, sourceName, extraArgs = "", fixes = []) => {
    const ids = columns.map(slugify);
    const out = [];

    out.push("/**");
    out.push(" * 发行商官方 Pack Odds 表（自动生成，请勿手工编辑）。");
    out.push(" *");
    out.push(` * 来源：${sourceName}（Topps 官方 Pack Odds PDF 的文本提取件）。`);
    out.push(` * 重新生成：node scripts/import-pack-odds.mjs <${sourceName}> <本文件> "${columns.join(",")}"${extraArgs}`);
    out.push(" *");
    out.push(" * odds 是「平均多少包出一张」：官方表的 `1:X` 直接取 X，`A:B` 取 B / A。");
    out.push(" * null 表示官方表里这一格是空的——即该渠道没有这个卡种。");
    if (fixes.length) {
        out.push(" *");
        out.push(" * 已修正官方原表的缺陷——改在 import-pack-odds.mjs 的补丁表里，不在本文件手改：");
        for (const fix of fixes) out.push(` *   ${fix}`);
    }
    out.push(" */");
    out.push("");
    out.push("/** 官方表的列顺序，索引与 PackOddsRow.odds 一一对应 */");
    out.push("export const PACK_ODDS_COLUMNS = [");
    for (const id of ids) out.push(`    ${JSON.stringify(id)},`);
    out.push("] as const;");
    out.push("");
    out.push("export type PackOddsColumn = (typeof PACK_ODDS_COLUMNS)[number];");
    out.push("");
    out.push("/** 一行 = 官方表里的一个卡种；odds 是各渠道的 1:X，null 表示该渠道没有 */");
    out.push("export interface PackOddsRow {");
    out.push("    label: string;");
    out.push("    odds: (number | null)[];");
    out.push("}");
    out.push("");
    out.push("export const PACK_ODDS: PackOddsRow[] = [");
    for (const row of rows) {
        const odds = row.odds.map((value) => (value === null ? "null" : String(value))).join(", ");
        out.push(`    { label: ${JSON.stringify(row.label)}, odds: [${odds}] },`);
    }
    out.push("];");
    out.push("");

    return out.join("\n");
};

const main = () => {
    const args = process.argv.slice(2);
    const flags = args.filter((arg) => arg.startsWith("--"));
    const [source, target, columnArg] = args.filter((arg) => !arg.startsWith("--"));
    if (!source || !target || !columnArg) {
        console.error(
            '用法：node scripts/import-pack-odds.mjs <pack-odds.txt> <输出 .ts> "渠道1,渠道2,..." [--relaxed] [--labels=plain.txt]',
        );
        process.exit(1);
    }

    const relaxed = flags.includes("--relaxed");
    const labelsArg = flags.find((flag) => flag.startsWith("--labels="));
    const columns = columnArg
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    const sourcePath = resolve(source);
    const productKey = dirname(sourcePath).split(sep).pop();

    const dictionary = labelsArg
        ? labelDictionary(readFileSync(resolve(labelsArg.slice("--labels=".length)), "utf8"))
        : null;
    if (labelsArg && !dictionary.size) {
        console.error("传递的词典文件里没找到任何标签，检查它是不是普通模式提取件。");
        process.exit(1);
    }

    const parsed = parse(readFileSync(sourcePath, "utf8"), columns, { relaxed, dictionary });

    const renames = LABEL_PATCHES[productKey] ?? {};
    for (const row of parsed.rows) {
        const fixed = renames[row.label];
        if (fixed) row.label = fixed;
    }
    for (const [bad, good] of Object.entries(renames)) {
        if (!parsed.rows.some((row) => row.label === good)) {
            parsed.warnings.push(`脚本里登记的黏连标签「${bad}」没在表里找到，可能官方表已修订。`);
        }
    }

    const patches = ROW_PATCHES[productKey] ?? {};
    for (const row of parsed.rows) {
        if (patches[row.label]) row.odds = [...patches[row.label]];
    }
    for (const label of Object.keys(patches)) {
        if (!parsed.rows.some((row) => row.label === label)) {
            parsed.warnings.push(`脚本里登记的覆盖行「${label}」没在表里找到，可能官方表已修订。`);
        }
    }

    const extraArgs = flags.length ? ` ${flags.join(" ")}` : "";
    const fixes = [
        ...Object.entries(renames).map(([bad, good]) => `黏连标签 ${bad} → ${good}`),
        ...Object.keys(patches).map((label) => `行覆盖 ${label}`),
    ];
    const outputPath = resolve(target);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(
        outputPath,
        render(parsed.rows, columns, basename(source), extraArgs, fixes),
        "utf8",
    );

    console.log(`已生成 ${outputPath}`);
    console.log(`共 ${parsed.rows.length} 行配率，${columns.length} 列：${columns.join(" / ")}`);
    if (relaxed) console.log(`宽松模式：${dictionary ? "已用词典清理标签" : "未提供词典，标签可能是被拉开的写法"}`);
    if (parsed.warnings.length) {
        console.log(`需要留意 ${parsed.warnings.length} 条：`);
        for (const warning of parsed.warnings) console.log(`  - ${warning}`);
    } else {
        console.log("没有需要留意的行。");
    }
};

main();
