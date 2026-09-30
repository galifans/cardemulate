"""拿官方 PDF 里每个文本块的**真实横坐标**当基准，逐格核对
`pack-odds.generated.ts` 里的配率是不是落在正确的列上。

为什么需要它：布局模式提取件把横坐标折成了字符下标，而两端对齐的页面（Signature Class
就是）里每一行是按自己的标签宽度排位的，同一列在不同行能差十几个字符——只按字符下标归列
会偶尔差一列，而且不会报错。表头文字在 PDF 里是另一层内容，提取器读不到，所以列位只能从
数据自身的横坐标聚类得到。

用法：
    python scripts/verify-odds-columns.py <原件.pdf> <生成的 .ts>

以 `MISMATCH` 开头的行是问题。核对分两条路：

- 横坐标能聚出列数的页面，逐格与生成文件比对；
- 聚不出列位的页面报 `SKIP`：一张纸印好几张表、列数太多、标签被两端对齐撑开的页面都会这样。
  这类页面上**每列都有值**的行仍按令牌顺序核对（令牌数等于列数，位置没有别的可能），
  其余行改看导入脚本的「贴着列边界」报告——没有一格贴着列边界，位置判断就是稳的。

官方表**印坏**的格子（数字被重复印了一位）登记在 `KNOWN_DEFECTS` 里，核对时印一行说明、
不算不一致；生成文件里那些格子的值是按同族同渠道的比例还原过的。

结论行给出核到的格数与不一致数；有不一致时退出码为 1。
"""
import re
import sys

from pypdf import PdfReader

# `01:11:00`、`4.4444444444444446E-2` 是官方表把「比率」存成时间值/天数序列值的坏格子，
# 也是配率（换算见 `to_odds`），不能当成标签文字丢掉。
# 末尾那条裸数字是「数值被拆成两块、冒号那半没跟上」时的兜底，与 `merge_tokens` 同一口径。
VALUE = re.compile(
    r"^(?:-|\d+\s*:\s*[\d,.]+|\d+\.\d+|\d{1,2}:\d{2}:\d{2}|\d+(?:\.\d+)?[eE]-\d+|\d[\d,]{0,8})$"
)
# 数值被拆块时可能只剩一半，例如 `3:`（左边那半）或 `,259`（右边那半）
FRAGMENT = re.compile(r"^[\d,]*:?[\d,]*$")

# 同一格里被拆开的文本块紧挨着；列与列之间隔着五六十个单位。但块与块的**起点**距离
# 说明不了问题（`01:` 宽 10 个单位、与 `04:` 起点只差 11），所以按「上一块估算的右端」
# 再加一点空档判：一个字符占多少单位按数值字号估，宽了不会误拼，窄了会退回按块读。
CHAR_W = 4.5
SLACK = 3
# 单块续拼用的空档（`1:` + `20` 这种两块一格）
SAME_CELL = 4

# 官方表**印坏**的格子：数字被重复印了一位（`1:6,632` 印成 `1:6,6632`、`1:15,282` 印成
# `1:15.282`）。生成文件里这些格子的值是按同族同渠道的比例还原过的（改在
# `scripts/import-pack-odds.mjs` 的 `ROW_PATCHES` 里），跟 PDF 的印值必然对不上，
# 所以在这里登记成已知缺陷：核对时印一行说明，不算不一致。
# 键是（生成文件里的行名，列 id），值是还原后的配率。
KNOWN_DEFECTS = {
    ("POWER PLAYERS BLUE HOLO FOIL", "fat-pack-se"): 5016,
    ("POWER PLAYERS BLUE HOLO FOIL", "fat-pack-ea"): 5016,
    ("TOPPS NOTCH SIGNATURES HOLO FOIL", "fat-pack-se"): 1304,
    ("TOPPS NOTCH SIGNATURES HOLO FOIL", "fat-pack-ea"): 1304,
    ("TOPPS NOTCH SIGNATURES GOLD HOLO FOIL", "value-box-se"): 15282,
    ("TOPPS NOTCH SIGNATURES GOLD HOLO FOIL", "value-box-ea"): 15282,
    ("TOPPS NOTCH SIGNATURES GOLD HOLO FOIL", "value-box-cee"): 15282,
    ("1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH GOLD RAINBOW", "value-box-se"): 19956,
    ("1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH GOLD RAINBOW", "value-box-ea"): 19956,
    ("1980-81 TOPPS BASKETBALL ROOKIE AUTOGRAPH GOLD RAINBOW", "value-box-cee"): 19956,
    ("ALL KINGS", "display-nt"): 6632,
    ("ALL KINGS", "display-hh"): 6632,
}


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def to_odds(token: str):
    if token == "-":
        return None
    time = re.fullmatch(r"(\d{1,2}):(\d{2}):(\d{2})", token)
    if time:
        # 表格把比率存成了时间值：`01:11:00` 的本意是 `1:11`
        hours, minutes = int(time.group(1)), int(time.group(2))
        return minutes / hours if hours else None
    serial = re.fullmatch(r"(\d+(?:\.\d+)?)[eE]-(\d+)", token)
    if serial:
        # 同一格的另一种导出：天数序列值，`4.4444444444444446E-2` 是 1 小时 4 分
        seconds = round(float(f"{serial.group(1)}e-{serial.group(2)}") * 86400)
        return to_odds(f"{seconds // 3600}:{(seconds % 3600) // 60:02d}:00")
    parts = re.split(r"\s*:\s*", token.replace(",", ""))
    if len(parts) == 2:
        left, right = float(parts[0]), float(parts[1])
        if not left or not right:
            return None
        return right / left
    return float(token.replace(",", ""))


def parse_generated(path: str):
    text = open(path, encoding="utf-8").read()
    columns = re.findall(r'"([a-z0-9-]+)",', text.split("] as const;")[0])
    rows = {}
    for match in re.finditer(r'\{ label: "((?:[^"\\]|\\.)*)", odds: \[([^\]]*)\] \}', text):
        label = match.group(1).replace('\\"', '"')
        values = []
        for item in match.group(2).split(","):
            item = item.strip()
            values.append(None if item == "null" else float(item))
        rows[normalize(label)] = (label, values)
    return columns, rows


def merge_tokens(a: str, b: str):
    """把 `3:` + `1` 这种被拆成两个块的数值合回一个，合不了返回 None

    PDF 里的数值不保证是一个文本块：`1:20` 常常是 `1:` 与 `20` 两块，
    而且两块在内容流里可能反序。按 x 相近先归到一处，再挑能拼成数值的那种拼法。
    """
    for candidate in (a + b, b + a):
        joined = candidate.replace(" ", "")
        if re.fullmatch(r"[\d,]+:[\d,]+|[\d,]{1,9}", joined):
            return joined
    return None


def page_rows(page):
    """把一页读成「标签 + 每格令牌」的行

    标签在 PDF 里常常折成好几行印（`BASE BLACK` 一行、`RAINBOW` 一行），
    折出来的续篇自己那行没有数字，要并回上一行去，否则 `BASE BLACK RAINBOW`
    会跟 `BASE BLACK` 撞名，比对时拿错行、报出一堆假不一致。
    """
    cells = {}

    def visit(text, cm, tm, font_dict, font_size, cells=cells):
        if text.strip():
            # 同一条线上的文本块 y 会有零点几个单位的抖动，先粗分再细分
            cells.setdefault(round(tm[5] / 3.0), []).append((tm[4], text.strip()))

    page.extract_text(visitor_text=visit)
    lines = []
    for y in sorted(cells, reverse=True):
        line = sorted(cells[y])
        # 先把同一个格子里被拆开的块拼回去：数值在 PDF 里常是 `1:` + `20` 两块，官方表
        # 自己坏掉的格子甚至是三块（`01:04:00`）或拆成 `4.4444444444444446E-` + `2` 两块。
        # 判据见 `CHAR_W`；拼出来**能当配率用**才算拼，拼不出来的（`1980-` + `81` 这类标签词）
        # 原样拆回去按块读，行为与不拼时一致。
        parts = []
        for x, text in line:
            if parts and x <= parts[-1][-1][0] + len(parts[-1][-1][1]) * CHAR_W + SLACK:
                parts[-1].append((x, text))
            else:
                parts.append([(x, text)])
        blocks = []
        for part in parts:
            joined = "".join(text for _, text in part)
            if len(part) > 1 and VALUE.match(joined):
                blocks.append((part[0][0], joined))
            else:
                blocks.extend(part)

        numbers = []
        for x, text in blocks:
            if not (VALUE.match(text) or FRAGMENT.match(text)):
                continue
            if numbers and abs(x - numbers[-1][0]) <= SAME_CELL:
                merged = merge_tokens(numbers[-1][1], text)
                if merged is not None:
                    numbers[-1] = (numbers[-1][0], merged)
                    continue
            if VALUE.match(text):
                numbers.append((x, text))
        if numbers:
            label = " ".join(text for x, text in line if x < numbers[0][0])
            lines.append((label, numbers))
        else:
            lines.append((" ".join(text for x, text in line), None))

    rows = []
    for label, numbers in lines:
        if numbers is not None:
            rows.append((label, numbers))
            continue
        if not rows:
            continue
        # 折行续篇：短、没有句读的才当标签，免责声明与页眉页脚直接丢
        if not label or len(label) > 40 or "." in label:
            continue
        rows[-1] = (f"{rows[-1][0]} {label}".strip(), rows[-1][1])
    return rows


def clusters(xs, count):
    """把横坐标聚成 count 个格子，返回每个格子的中心（升序）；聚不出来返回 None"""
    groups = []
    for x in sorted(xs):
        if groups and x - groups[-1][-1] <= 30:
            groups[-1].append(x)
        else:
            groups.append([x])
    if len(groups) != count:
        return None
    return [sum(group) / len(group) for group in groups]


def resolve(key, generated):
    """行标签在 PDF 里被排版拆散时的补救：去掉开头的编号后按后缀找唯一的行

    官方表里 `1980-81 TOPPS BASKETBALL …` 这一族被排成散块，读出来的标签是
    `1980- BASKETBALL …`（中间少了 `81 TOPPS`），跟生成文件里的行名对不上。
    去掉开头的编号再拿后缀去找，只命中一行时就用它；命中多行说明分不清，
    仍然算没核到，不能猜。后缀太短的也不认：`Card`、`HOLO FOIL` 这种碎片词
    会碰上正文里某一行，认错了比不认更糟。
    """
    if key in generated:
        return key
    tail = re.sub(r"^\d+", "", key)
    if len(tail) < 10:
        return None
    hits = [candidate for candidate in generated if candidate.endswith(tail)]
    return hits[0] if len(hits) == 1 else None


def compare(mismatches, defects, pageno, name, index, token, columns, odds):
    """比一格的配率，对不上就往 mismatches 里记一条；返回 1 表示比过一格"""
    expected = to_odds(token)
    actual = odds[index]
    if expected is None:
        # PDF 这一格印的是 `-`，也就是**空格子**，与生成文件里的 null 是一回事，
        # 不算不一致；反过来，PDF 空着而生成文件里有数才是问题。
        if actual is not None:
            mismatches.append(
                f"MISMATCH 第 {pageno} 页 {name} {token}："
                f"PDF 的 {columns[index]} 列是空格子，生成文件里却是 {actual}"
            )
        return 1
    if actual is None or abs(actual - expected) > 0.001:
        restored = KNOWN_DEFECTS.get((name, columns[index]))
        if restored is not None and actual is not None and abs(actual - restored) < 0.001:
            defects.append(
                f"（已知缺陷）{name} 的 {columns[index]} 列在官方表里印成 {token}，"
                f"生成文件里按同族比例还原为 1:{actual}"
            )
            return 1
        mismatches.append(
            f"MISMATCH 第 {pageno} 页 {name} {token}："
            f"PDF 是 {columns[index]} 列，生成文件里是 "
            f"{'null' if actual is None else actual}"
        )
    return 1


def row_keys(rows, columns, generated, order, pageno, repaired, aligned):
    """给一页里每一行找出它在生成文件里的行名，找不出给 None

    三条路：标签直接对上；去掉开头编号后按后缀认出（`1980- BASKETBALL RED` 这种）；
    以及——前后两行都认出来了、中间空出来的行数刚好等于生成文件里夹在它们之间的
    行数——按位置对齐。第三条是给「子集名被排到另一个 y 上、整块标签读没了」的
    家族用的（8 BIT BALLERS 那一族在提取件里只剩版本名）：官方表的行序和生成文件
    一致，中间空几行、生成文件里就正好是那几行，位置对不上时不会硬套。
    """
    keys = [resolve(normalize(label), generated) for label, _ in rows]
    for index, (label, _) in enumerate(rows):
        if keys[index] is not None and keys[index] != normalize(label):
            repaired.append(f"第 {pageno} 页「{label}」按后缀认成 {keys[index]}")

    position = {key: index for index, key in enumerate(order)}
    index = 0
    while index < len(keys):
        if keys[index] is not None:
            index += 1
            continue
        end = index
        while end < len(keys) and keys[end] is None:
            end += 1
        before = position.get(keys[index - 1]) if index else None
        after = position.get(keys[end]) if end < len(keys) else None
        if before is not None and after is not None and after - before - 1 == end - index:
            for offset in range(index, end):
                keys[offset] = order[before + 1 + offset - index]
                aligned.append(
                    f"第 {pageno} 页第 {offset + 1} 行「{rows[offset][0]}」按位置对齐成 {keys[offset]}"
                )
        index = end
    return keys


def verify_by_order(mismatches, defects, missed, pageno, rows, keys, columns, generated):
    """聚不出列位的页面上的退路：一行里令牌数等于列数时，按令牌顺序逐格核对

    整张表把空格都写成了 `-` 的页面就是这样：空位也有令牌，列位不需要从横坐标推，
    导入脚本也是按顺序摆的。两端对齐的页面（Signature Class）只有一部分行凑巧
    每列都有值，所以退路按**行**走而不是按页走：令牌数少于列数的行没有顺序可言，
    而本页横坐标又不可信，只能跳过。核不到的行丢进 `missed`——这种行在退路里是
    静默跳过的，不登记出来就会被「不一致 0 格」盖过去。返回核到的格数，一行都
    核不了时返回 None。
    """
    count = 0
    for index, (label, values) in enumerate(rows):
        if len(values) != len(columns):
            missed.append(f"第 {pageno} 页「{label}」一行有 {len(values)} 个令牌、列数是 {len(columns)}，顺序核对跳过")
            continue
        if keys[index] is None:
            missed.append(f"第 {pageno} 页的行标签读出来是「{label}」，在生成文件里找不到，顺序核对跳过")
            continue
        name, odds = generated[keys[index]]
        for position, (_, token) in enumerate(values):
            count += compare(mismatches, defects, pageno, name, position, token, columns, odds)
    return count or None


def main() -> int:
    pdf_path, ts_path = sys.argv[1], sys.argv[2]
    columns, generated = parse_generated(ts_path)
    reader = PdfReader(pdf_path)

    mismatches = []
    defects = []
    missed = []
    repaired = []
    aligned = []
    checked = 0
    skipped_pages = []
    order_pages = []
    unknown = set()
    order = list(generated)

    for pageno, page in enumerate(reader.pages, 1):
        rows = page_rows(page)
        # 标签被排版拆成 `1980-` + `81` + `TOPS` 的页面：`81` 是标签碎片却被当成一格
        # 配率，行里就多出一个令牌。多出来的位置只能是最前面，而且没有冒号——真坏掉的
        # 格子是**替格**不是插格，令牌数不会多。去掉的对不上时减几行会整页报错，藏不住。
        for index, (label, values) in enumerate(rows):
            if len(values) == len(columns) + 1 and ":" not in values[0][1]:
                rows[index] = (label, values[1:])
                repaired.append(f"第 {pageno} 页「{label}」行首多出一个标签碎片 {values[0][1]}")
        keys = row_keys(rows, columns, generated, order, pageno, repaired, aligned)
        numbers = [(index, x, text) for index, (_, values) in enumerate(rows) for x, text in values]
        if not numbers:
            continue
        if len(columns) == 1:
            edges = []
        else:
            centers = clusters([x for _, x, _ in numbers], len(columns))
            if centers is None:
                ordered = verify_by_order(mismatches, defects, missed, pageno, rows, keys, columns, generated)
                if ordered is None:
                    skipped_pages.append(pageno)
                else:
                    order_pages.append(pageno)
                    checked += ordered
                continue
            edges = [(centers[i] + centers[i + 1]) / 2 for i in range(len(centers) - 1)]

        for row, x, token in numbers:
            if keys[row] is None:
                if normalize(rows[row][0]):
                    unknown.add(rows[row][0])
                continue
            name, odds = generated[keys[row]]
            index = 0
            for i, edge in enumerate(edges):
                if x >= edge:
                    index = i + 1
            checked += compare(mismatches, defects, pageno, name, index, token, columns, odds)

    for line in mismatches:
        print(line)
    for line in sorted(set(defects)):
        print(line)
    if order_pages:
        print(
            f"（第 {'、'.join(str(item) for item in order_pages)} 页里，每列都有值的行按令牌顺序核对："
            "空格写成 `-` 的表整页都是这样；两端对齐的页面只有一部分行凑巧如此，"
            "其余行没做坐标核对）"
        )
    if missed:
        print(
            f"（按令牌顺序核对的页面里有 {len(missed)} 行没核到，列的归属改看导入脚本的「贴着列边界」报告）"
        )
        for line in sorted(set(missed))[:8]:
            print(f"  {line}")
    if repaired:
        print(f"（{len(repaired)} 行的标签被排版拆散，修好后照常核对）")
        for line in sorted(set(repaired))[:8]:
            print(f"  {line}")
    if aligned:
        print(f"（{len(aligned)} 行的标签整块读不出来，按页内位置对齐核对）")
        for line in aligned:
            print(f"  {line}")
    for pageno in skipped_pages:
        print(
            f"SKIP 第 {pageno} 页：横坐标聚不出 {len(columns)} 个格子，本页没做坐标核对。"
            "一张纸印好几张表、列数太多、标签被两端对齐撑开的页面都会这样，"
            "改用导入脚本的「贴着列边界」报告兜底：它必须报「没有需要留意的行」。"
        )
    if unknown:
        print(f"（跳过 {len(unknown)} 个表里有、生成文件里没有的行：{' / '.join(sorted(unknown)[:6])}）")
    print(
        f"核到 {checked} 格（其中 {len(order_pages)} 页按令牌顺序核），"
        f"不一致 {len(mismatches)} 格，跳过 {len(skipped_pages)} 页"
    )
    return 1 if mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
