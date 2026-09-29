"""
把官方 PDF 原始件转成可复现的文本件。

为什么要指定脚本、指定参数：配率表是**分列**的，空单元格在普通提取模式下会被
整段丢掉，于是「第 3 列有值、第 2 列空着」会塌成「第 2 列有值」，导入脚本照着
从左往右填就会把配率填错列。布局模式按字符的横向位置还原空格，列的位置因此
保留下来，导入脚本才能按横坐标把每个配率归回它自己的列。

所以配率表一律用布局模式提取；名单用普通模式即可（单列文字，不需要对齐）。

用法：
    python scripts/extract-pdf-text.py <原件.pdf> <输出.txt> [--plain]

输出以 `PAGES: n` 开头，接着是 `===== PAGE i =====` 分段。
"""
import sys

from pypdf import PdfReader


def main() -> int:
    args = sys.argv[1:]
    mode = "layout"
    if "--plain" in args:
        args = [a for a in args if a != "--plain"]
        mode = "plain"
    if len(args) != 2:
        print(__doc__.strip(), file=sys.stderr)
        return 1

    src, dst = args
    reader = PdfReader(src)

    out = [f"PAGES: {len(reader.pages)}"]
    for i, page in enumerate(reader.pages):
        if mode == "layout":
            text = page.extract_text(extraction_mode="layout") or ""
        else:
            text = page.extract_text() or ""
        out.append(f"===== PAGE {i + 1} =====")
        out.append(text)

    with open(dst, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))
    print(f"ok {dst}（{mode} 模式）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
