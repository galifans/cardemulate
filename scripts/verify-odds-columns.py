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

结论行给出核到的格数与不一致数；有不一致时退出码为 1。
"""
import re
import sys

from pypdf import PdfReader

VALUE = re.compile(r"^(?:-|\d+\s*:\s*[\d,.]+|\d+\.\d+|[\d,]{1,9})$")
# 数值被拆块时可能只剩一半，例如 `3:`（左边那半）或 `,259`（右边那半）
FRAGMENT = re.compile(r"^[\d,]*:?[\d,]*$")


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def to_odds(token: str):
    if token == "-":
        return None
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
    cells = {}

    def visit(text, cm, tm, font_dict, font_size, cells=cells):
        if text.strip():
            # 同一条线上的文本块 y 会有零点几个单位的抖动，先粗分再细分
            cells.setdefault(round(tm[5] / 3.0), []).append((tm[4], text.strip()))

    page.extract_text(visitor_text=visit)
    rows = []
    for y in sorted(cells, reverse=True):
        line = sorted(cells[y])
        numbers = []
        for x, text in line:
            if not (VALUE.match(text) or FRAGMENT.match(text)):
                continue
            if numbers and abs(x - numbers[-1][0]) <= 4:
                merged = merge_tokens(numbers[-1][1], text)
                if merged is not None:
                    numbers[-1] = (numbers[-1][0], merged)
                    continue
            if VALUE.match(text):
                numbers.append((x, text))
        if not numbers:
            continue
        label = " ".join(text for x, text in line if x < numbers[0][0])
        rows.append((label, numbers))
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


def compare(mismatches, pageno, name, index, token, columns, odds):
    """比一格的配率，对不上就往 mismatches 里记一条；返回 1 表示比过一格"""
    expected = to_odds(token)
    actual = odds[index]
    if actual is None or (expected is not None and abs(actual - expected) > 0.001):
        mismatches.append(
            f"MISMATCH 第 {pageno} 页 {name} {token}："
            f"PDF 是 {columns[index]} 列，生成文件里是 "
            f"{'null' if actual is None else actual}"
        )
    return 1


def verify_by_order(mismatches, pageno, rows, columns, generated):
    """聚不出列位的页面上的退路：一行里令牌数等于列数时，按令牌顺序逐格核对

    整张表把空格都写成了 `-` 的页面就是这样：空位也有令牌，列位不需要从横坐标推，
    导入脚本也是按顺序摆的。两端对齐的页面（Signature Class）只有一部分行凑巧
    每列都有值，所以退路按**行**走而不是按页走：令牌数少于列数的行没有顺序可言，
    而本页横坐标又不可信，只能跳过。返回核到的格数，一行都核不了时返回 None。
    """
    count = 0
    for label, values in rows:
        if len(values) != len(columns):
            continue
        key = normalize(label)
        if key not in generated:
            continue
        name, odds = generated[key]
        for index, (_, token) in enumerate(values):
            count += compare(mismatches, pageno, name, index, token, columns, odds)
    return count or None


def main() -> int:
    pdf_path, ts_path = sys.argv[1], sys.argv[2]
    columns, generated = parse_generated(ts_path)
    reader = PdfReader(pdf_path)

    mismatches = []
    checked = 0
    skipped_pages = []
    order_pages = []
    unknown = set()

    for pageno, page in enumerate(reader.pages, 1):
        rows = page_rows(page)
        numbers = [(label, x, text) for label, values in rows for x, text in values]
        if not numbers:
            continue
        if len(columns) == 1:
            edges = []
        else:
            centers = clusters([x for _, x, _ in numbers], len(columns))
            if centers is None:
                ordered = verify_by_order(mismatches, pageno, rows, columns, generated)
                if ordered is None:
                    skipped_pages.append(pageno)
                else:
                    order_pages.append(pageno)
                    checked += ordered
                continue
            edges = [(centers[i] + centers[i + 1]) / 2 for i in range(len(centers) - 1)]

        for label, x, token in numbers:
            key = normalize(label)
            if key not in generated:
                if key:
                    unknown.add(label)
                continue
            name, odds = generated[key]
            index = 0
            for i, edge in enumerate(edges):
                if x >= edge:
                    index = i + 1
            checked += compare(mismatches, pageno, name, index, token, columns, odds)

    for line in mismatches:
        print(line)
    if order_pages:
        print(
            f"（第 {'、'.join(str(item) for item in order_pages)} 页里，每列都有值的行按令牌顺序核对："
            "空格写成 `-` 的表整页都是这样；两端对齐的页面只有一部分行凑巧如此，"
            "其余行没做坐标核对）"
        )
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
