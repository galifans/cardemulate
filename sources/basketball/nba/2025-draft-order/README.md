# 2025 年 NBA 选秀顺位 —— 采集记录

| 项 | 值 |
| --- | --- |
| 来源页面 | https://www.nba.com/news/2025-nba-draft-order |
| 页面里的字段 | `application/ld+json` 的 `articleBody` |
| 采集日期 | 2026-09-30 |
| `draft-order.txt` 的 SHA-256 | `990bdeb1243e606ad84c819870289f3160129bbf8be8b663af0e471add6b2cd8` |
| 解出的顺位 | 59 个（第 1 轮 30 个 + 第 2 轮 29 个） |

## 为什么来源只有这一个

选秀名单是「选秀排名」这一维度的唯一依据，所以采集前把常见来源逐个穿刺过一遍
（方法：Node 24 内置 fetch，15 秒超时，Chrome 桌面版 UA，看状态码与响应里有没有
当届球员名）。结果：

| 来源 | 结果 |
| --- | --- |
| `www.nba.com/news/2025-nba-draft-order` | **200，正文含全部 59 个顺位** |
| `www.nba.com/draft/2025` | 200，但只是新闻聚合页，没有逐顺位名单 |
| `www.nba.com/draft/2025/round/1` | 404 |
| `en.wikipedia.org` / `zh.wikipedia.org` / wikidata / dbpedia | 连不上（本机网络到不了） |
| `www.basketball-reference.com/draft` | 403 |
| `basketball.realgm.com` | 403 |
| `www.espn.com/nba/draft` | 202，空响应 |
| `www.statmuse.com` | 422 |
| `tankathon.com` | 404 |
| `www.sports-reference.com` | 403 |

## `draft-order.txt` 是什么

是 `articleBody` 的**原文**，未做任何加工，逐行形如：

```
1. Mavericks draft Cooper Flagg (Duke)

2. Spurs draft Dylan Harper (Rutgers)
```

交易附注（`- Traded to Suns`）留在行尾。派生的
`src/data/prices/draft-order.generated.ts` 由
`node scripts/import-draft-order.mjs` 生成，重新生成时先比对这份哈希。
