/**
 * 读 xlsx 的最小实现，只用 Node 自带模块，不引第三方依赖。
 *
 * xlsx 就是一个 zip 容器，里面的 XML 结构固定：`xl/sharedStrings.xml` 存字符串池，
 * `xl/worksheets/sheetN.xml` 存单元格。这里只解出这两种，够用即可。
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const ZIP_EOCD = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;

/** 解出 zip 里每个条目的内容（只涉及存储与 deflate 两种方式）。 */
export function readZip(buf) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
        if (buf.readUInt32LE(i) === ZIP_EOCD) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) throw new Error("不是合法的 zip 容器");

    const count = buf.readUInt16LE(eocd + 10);
    let off = buf.readUInt32LE(eocd + 16);
    const entries = new Map();

    for (let i = 0; i < count; i++) {
        if (buf.readUInt32LE(off) !== ZIP_CENTRAL) throw new Error("zip 中央目录损坏");
        const method = buf.readUInt16LE(off + 10);
        const compSize = buf.readUInt32LE(off + 20);
        const nameLen = buf.readUInt16LE(off + 28);
        const extraLen = buf.readUInt16LE(off + 30);
        const commentLen = buf.readUInt16LE(off + 32);
        const localOff = buf.readUInt32LE(off + 42);
        const name = buf.toString("utf8", off + 46, off + 46 + nameLen);

        const dataStart = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
        const raw = buf.subarray(dataStart, dataStart + compSize);
        entries.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));

        off += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
}

export const unescapeXml = (s) =>
    s.replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");

export const xmlText = (fragment) =>
    unescapeXml([...fragment.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

/**
 * 按列读出一张工作表：返回 `{ 列字母: 值 }` 的数组。
 * 单元格有「自闭合」与「带体」两种写法，两种都要认。
 */
export function readSheet(xlsxPath, sheetIndex = 1) {
    const zip = readZip(readFileSync(xlsxPath));
    const shared = zip.has("xl/sharedStrings.xml")
        ? [...zip.get("xl/sharedStrings.xml").toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1]))
        : [];

    const preferred = `xl/worksheets/sheet${sheetIndex}.xml`;
    const sheetName = zip.has(preferred)
        ? preferred
        : [...zip.keys()].filter((key) => /^xl\/worksheets\/.*\.xml$/.test(key)).sort()[sheetIndex - 1];
    if (!sheetName) throw new Error("压缩包里没有工作表");

    const rows = [];
    const entry = zip.get(sheetName).toString("utf8");
    for (const row of entry.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = {};
        for (const cell of row[1].matchAll(/<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g)) {
            const attrs = cell[1] ?? cell[2] ?? "";
            const col = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
            if (!col) continue;
            const body = cell[3] ?? "";
            if (/t="inlineStr"/.test(attrs)) {
                const inline = body.match(/<is>([\s\S]*?)<\/is>/);
                cells[col] = inline ? xmlText(inline[1]) : "";
                continue;
            }
            const value = body.match(/<v>([\s\S]*?)<\/v>/);
            if (value) cells[col] = /t="s"/.test(attrs) ? (shared[Number(value[1])] ?? "") : unescapeXml(value[1]);
        }
        if (Object.keys(cells).length) rows.push(cells);
    }
    return rows;
}
