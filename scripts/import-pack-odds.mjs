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
 * 例外：有些表把空格子写成 `-`（Chrome Update 就是这样），一行里令牌数刚好等于列数，
 * 位置就不再是唯一线索——那一行走「令牌按顺序对号入座」的直路，不靠位置。
 *
 * 位置归列不能只看这份提取件：提取件把横坐标折成了字符下标，而两端对齐的页面里每一行
 * 按自己的标签宽度排位，同一列在不同行能差十几个字符，按下标归列会偶尔差一列而且不报错。
 * 所以每张表都要拿官方 PDF 里每个文本块的**真实横坐标**再核一遍，命令见
 * `scripts/verify-odds-columns.py`，要求「不一致 0 格」。核出来对不上的行写进下面的
 * `ROW_PATCHES`，**不要**改归列规则去凑。
 *
 * 配率有两种写法，统一换算成「平均多少包出一张」：
 * - `1:X`  → X（1 包里出 1 张）
 * - `A:B`  → B / A（A 包里出 B 张）
 * 例如 `4:1` 是每包 4 张，换成 0.25；`1:7` 是 7 包一张，换成 7。
 *
 * 个别格子是官方表自己坏掉的：比率被**存成了时间值**，PDF 里印成 `01:11:00`（本意 `1:11`），
 * 或者干脆印成天数序列值 `4.4444444444444446E-2`（＝0.0444 天＝1 小时 4 分＝`1:04`）。
 * 两种都按「时:分」还原成配率；一张表里只会有零星几格，但漏认就会让整行左移一列。
 *
 * 个别 PDF 的**标签列是两端对齐的**（Signature Class 就是这样）：排版器会在字符之间
 * 塞进单空格，把 `Veteran` 拉成 `Ve t e r a n`，连数值都被塞成 `1: 407`。这种文件加
 * `--relaxed`：只用「连续两个以上空格」当格子边界，格子内部的单空格一律丢掉。
 * 数值里被塞进两个以上空格时（`5:  1`）这条边界会把数值切成两半，所以分词前先按
 * `joinValues` 把数值内部的空格抹掉，那一行再按「令牌数等于列数」的顺序路归列。
 * 表头同样被拉开，所以宽松模式下的表头匹配也先去掉空格再找。
 * 标签这么处理会得到 `VeteranClassBaseRedLava` 这种连成一串的东西——不是能写进代码的
 * 名字，所以还要用 `--labels=<plain.txt>` 拿同样这份 PDF 的**普通模式**提取件当词典：
 * 普通模式不排版、标签是干净的，两边各自去掉空格后按行对上，就能把标签换回官方写法。
 *
 * 用法：
 *   node scripts/import-pack-odds.mjs <pack-odds.txt> <输出 .ts> "渠道1,渠道2,..." [--relaxed] [--labels=plain.txt] [--from=说明]
 *
 * `--from=<说明>` 会在生成文件的注释里多写一行「预处理」，给那些要先过
 * `scripts/prepare-pack-odds.mjs`（多行表头、折行标签、超宽标签）的表用。
 *
 * 渠道名按官方表**从左到右**列出，脚本用它算列位并由此生成列 id（小写连字符）。
 * 认不出来的行会打印出来，**必须逐条人工核对**，不能放着警告往下走。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";

/**
 * 官方表自身的缺陷：个别行在 PDF 里少印了几列，或者某一格的数字被印重复了一位
 * （`1:6,632` 印成 `1:6,6632`、`1:15,282` 印成 `1:15.282`）。这种地方宁可写死在
 * 脚本里，也不要让导入器「猜」——猜错了配率就悄悄错了。键是产品目录名，值是整行覆盖。
 *
 * 被印重复的数字没有唯一读法（重复的那一位在哪、要不要一起丢都可能），所以每一格都
 * 拿同族同渠道的比例定过来再写进这里：同一子集里按编号递进的平行行之间比例很稳，
 * 一个子集里多行比值一致就能反推坏格。
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
    "tsig26-basketball": {
        // 提取件里每一行按自己的标签宽度排位，这两行的数值整列前移了一格，只有靠原件的
        // 真实横坐标才看得出来（1:25 与 1:71 在 Value Box 列下，1:15 与 1:44 在 Mega Box 列下）
        "Rookie Class Chrome Base Pandora": [null, null, 25, 15],
        "Rookie Class Chrome Base Pandora Yellow": [null, null, 71, 44],
    },
    "tfinest26-basketball": {
        // 四档插入卡的 SuperFractor 只在 Hobby 盒里出（盒型规格如此），提取件却把它们摆到了
        // 拆卡盒列；拿原件的真实横坐标核对，这四行的数值确实在 Hobby 列下。
        "Arrivals SuperFractor": [12495, null],
        "Muse SuperFractor": [12495, null],
        "First SuperFractor": [12495, null],
        "Finishers SuperFractor": [48192, null],
    },
    "tbb26-basketball": {
        // 五格的数字被印重复了一位。还原值都由同族同渠道的比例定：
        // Power Players 蓝 /150 的 Fat 与 /250 那两列的 Fat 比值一致（1:5,016）；
        // Notch 未编号 Holo Foil 的 Fat 是绿平行 Fat 的 0.343 倍（1:1,304）；
        // Notch 金 /50 的 Value Blaster 是 Mega 的 1.082 倍（1:15,282）；
        // 1980-81 Rookie Autograph 金彩虹的取景列比值与非新秀那行逐列相同（1:19,956）；
        // All Kings 普卡的 Display 是 Holo Foil 平行行的 1.6 倍（1:6,632）。
        "POWER PLAYERS BLUE HOLO FOIL": [null, null, 9881, 9881, 9881, 9409, 9409, 9409, 5016, 5016, 9881, 9881, 3185, 3185, 8823, 9393, 4147],
        "TOPPS NOTCH SIGNATURES HOLO FOIL": [null, null, 1975, 1975, 1975, 2503, 2503, 2503, 1304, 1304, 3072, 3072, 849, 849, 6250, 2565, 1122],
        "TOPPS NOTCH SIGNATURES GOLD HOLO FOIL": [null, null, 15282, 15282, 15282, 14125, 14125, 14125, 7359, 7359, 17335, 17335, 4787, 4787, 13343, 13265, 6329],
        "1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH GOLD RAINBOW": [8649, 2145, 19956, 19956, 19956, 18870, 18870, 18870, 9709, 9709, 24814, 24814, 6853, 6853, 17363, 18989, 9059],
        "ALL KINGS": [2864, 727, 6640, 6640, 6640, 6325, 6325, 6325, 3369, 3369, 6632, 6632, 2138, 2138, 5923, 6301, 2786],
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

/**
 * 一个配率令牌：`-`（空）、`1:X`、`A:B`、或者没有冒号的数字（异常，必须人工看）。
 *
 * 后面两条是官方表自己的毛病（见 `toOdds`）：表格把「比率」存成了时间值，导出到 PDF
 * 里就成了 `01:11:00`；同一格的另一种导出是天数序列值 `4.4444444444444446E-2`。
 * 这两种形状都得先算「是配率」，否则会被当成标签文字粘回左邻的标签上，整行左移一列。
 */
const VALUE_RE = /^(?:-|\d+\s*:\s*[\d,.]+|\d+\.\d+|\d{1,2}:\d{2}:\d{2}|\d+(?:\.\d+)?[eE]-\d+)$/;

const slugify = (name) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

/** 时间形状的坏格子：`01:11:00` 意思是 `1:11`（表格把比率存成了时间值） */
const TIME_RE = /^(\d{1,2}):(\d{2}):(\d{2})$/;
/** 天数序列值的坏格子：`4.4444444444444446E-2` 是 0.0444 天，也就是同上的 1 小时 4 分 */
const SERIAL_RE = /^(\d+(?:\.\d+)?)[eE]-(\d+)$/;

/** 时间（小时:分）还原成配率：`1:11` 是 11 包出一张 */
const timeToOdds = (hours, minutes) => (hours ? minutes / hours : null);

/** 把 `1:X` / `A:B` / 裸数字换算成「平均多少包出一张」 */
const toOdds = (token) => {
    if (token === "-") return null;
    // 表格里个别配率被存成了时间值，PDF 里印出来就是一串 `时:分:秒`。
    // 换算回 `时:分` 才是原本的比率：`01:11:00` → `1:11` → 11 包一张。
    const time = TIME_RE.exec(token);
    if (time) return timeToOdds(Number(time[1]), Number(time[2]));
    const serial = SERIAL_RE.exec(token);
    if (serial) {
        const seconds = Math.round(Number(`${serial[1]}e-${serial[2]}`) * 86400);
        return timeToOdds(Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60));
    }
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

/**
 * 官方提取件在数值**内部**也会塞空格：`1: 407`、`2. 1`，个别行甚至塞了两个以上
 * （Signature Class 的 `Veteran Class Base` 印成了 `5:  1`）。宽松模式拿「连续两个
 * 以上空格」当格子边界，这种格子会被切成两半，其中一半不是数值、直接丢掉，后面的
 * 数值跟着左移，而且一声不响——Signature Class 的普卡配率就是这么丢掉两列的。
 * 所以在分词之前先把「数字 - 冒号 - 数字」和「数字 - 点 - 数字」中间的空格抹掉，
 * 让一个配率永远是一个格子。
 *
 * 必须在分词**之前**对整行做，表头与正文用同一份处理过的行算下标，否则字符位与列位
 * 会对不上。只认「冒号或小数点紧跟在数字后面」这一种形状，官方表里没有别的场合会
 * 出现它，所以对其他几套提取件是空操作。
 */
const joinValues = (line) =>
    line.replace(/(\d)\s*:\s*([\d,.]+)/g, "$1:$2").replace(/(\d)\.\s+(\d)/g, "$1.$2");

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

/** 数值起点离下一列列头不到这么多字符，就当它贴着列边界，交人工核对 */
const CLOSE_MARGIN = 2;

/**
 * 把数值归到某一列，并给出它离列边界还有几个字符。
 *
 * 官方表分两种写法，必须分别对待：
 * - 空格写成 `-` 的表（TCU26 就是这样），每一行的令牌个数刚好等于列数，按顺序摆放就是对的。
 * - 空格是真的空着的表（后面几套系列都是这样），令牌个数少于列数，只能靠水平位置判断。
 *
 * 位置判断取数值的**起始位**：列头左对齐，数值也左对齐、贴着列头再往右一点点，
 * 所以「起始位不小于列头位」的最右一列就是它的列。同一列里数值长短不一时起点不变，
 * 中心点却会随数值长度往右漂（Finest 的 `Arrivals SuperFractor 1:12495` 七位数值
 * 起点在 Hobby 列，中心却越过了 Hobby 与 Breaker 的中点，被推进 Breaker 列）。
 * 也试过「离列头最近」的口径，它会把 Signature Class 里标签短的行的数值推后一列：
 * 那种表是两端对齐的，提取件里每一行按自己的标签宽度排位，同一列在不同行里的下标
 * 能差十几个字符，只有「不小于列头位」这个判断还站得住。
 *
 * 归列本身没法自证对错：先用 `sources/README.md` 里记的核对办法拿官方原件对一遍，
 * 对不上的行登记到 `ROW_PATCHES` 里，别改这条规则去凑。脚本自己只能报「贴着列边界」的格子。
 */
const columnOf = (offsets, token) => {
    let index = 0;
    for (let i = 0; i < offsets.length; i++) {
        if (token.at >= offsets[i]) index = i;
    }
    const after = index + 1 < offsets.length ? offsets[index + 1] - token.at : Infinity;
    return { index, margin: after };
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
    /** 夹在两列中间的格子，调用方核对补丁后决定要不要报出来 */
    const ambiguous = [];
    const unknownLabels = new Set();
    let lastLabel = null;

    for (const rawLine of lines) {
        const line = joinValues(rawLine);
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
            for (const token of tokens) {
                const { index, margin } = columnOf(offsets, token);
                if (margin <= CLOSE_MARGIN) {
                    ambiguous.push({
                        label,
                        text: token.text,
                        column: columns[index],
                        margin,
                    });
                }
                odds[index] = toOdds(token.text);
            }
        }
        rows.push({ label, odds });
    }

    if (unknownLabels.size) {
        warnings.push(
            `词典里没有这些标签，已按原样保留，请人工核对：${[...unknownLabels].join(" / ")}`,
        );
    }

    return { rows, warnings, ambiguous };
};

const render = (rows, columns, sourceName, extraArgs = "", fixes = [], origin = null) => {
    const ids = columns.map(slugify);
    const out = [];

    out.push("/**");
    out.push(" * 发行商官方 Pack Odds 表（自动生成，请勿手工编辑）。");
    out.push(" *");
    out.push(` * 来源：${sourceName}（Topps 官方 Pack Odds PDF 的文本提取件）。`);
    if (origin) out.push(` * 预处理：${origin}`);
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
            '用法：node scripts/import-pack-odds.mjs <pack-odds.txt> <输出 .ts> "渠道1,渠道2,..." [--relaxed] [--labels=plain.txt] [--from=说明]',
        );
        process.exit(1);
    }

    const relaxed = flags.includes("--relaxed");
    const labelsArg = flags.find((flag) => flag.startsWith("--labels="));
    const fromArg = flags.find((flag) => flag.startsWith("--from="));
    const columns = columnArg
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    const sourcePath = resolve(source);
    // 补丁表按产品目录名索引，取输出文件的目录名：提取件有时是 `.snapshot/` 里的中间件，
    // 按它的目录名找不到产品，而输出文件总是落在产品目录下。
    const productKey = dirname(resolve(target)).split(sep).pop();

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

    // 贴着列边界的格子：数值起点离**下一列**列头只有一两个字符，差一点点就换列，必须人工看
    // 一眼。贴着自己那列的列头是正常的左对齐，不用报。已经登记了行覆盖的标签也不用再提示，
    // 覆盖值本身就是核对过的结论。
    const ambiguous = parsed.ambiguous.filter((item) => !patches[item.label]);
    if (ambiguous.length) {
        parsed.warnings.push(
            "这些格子贴着列边界，脚本按数值起点归列，请人工核对：" +
                ambiguous
                    .map(
                        (item) =>
                            `${item.label} ${item.text}（在 ${item.column} 列边缘，差 ${item.margin}）`,
                    )
                    .join("；"),
        );
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
        render(
            parsed.rows,
            columns,
            basename(source),
            extraArgs,
            fixes,
            fromArg ? fromArg.slice("--from=".length) : null,
        ),
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
