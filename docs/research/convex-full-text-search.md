# Convex Full Text Search — Research Notes

Date: 2025-02-15

## Overview

Convex has built-in full-text search powered by Tantivy (Rust-based search engine, inspired by Lucene). Reactive — always up to date like all Convex queries.

## Search Index Definition

- One search field per index (string field containing indexable content)
- Up to 16 filter fields for equality filtering
- Supports nested document paths (e.g., `properties.name`)
- `staged: true` option for async backfilling on large tables

```typescript
messages: defineTable({
  body: v.string(),
  channel: v.string(),
}).searchIndex("search_body", {
  searchField: "body",
  filterFields: ["channel"],
})
```

## Query API

```typescript
const results = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general")
  )
  .take(10);
```

- Results return in **relevance order only** (BM25 + proximity + exact matches)
- Tie-breaking: newest documents first
- Post-index `.filter()` available but slower — push filters into `.withSearchIndex` when possible

## Constraints

| Constraint | Limit |
|---|---|
| Search fields per index | 1 |
| Filter fields per index | 16 |
| Indexes per table | 32 |
| Terms per search query | 16 |
| Filter expressions per query | 8 |
| Max scanned results | 1024 |
| Max term length | 32 characters |

## Tokenization

- Uses Tantivy's `SimpleTokenizer` — splits on whitespace and punctuation
- Text is lowercased for matching
- Final term gets **prefix matching** (typeahead support)
- No fuzzy matching (deprecated January 2025)

## Language Support

**Latin-script languages**: Work well out of the box. SimpleTokenizer splits on whitespace/punctuation which works for most European languages.

**Non-Latin scripts (Russian, Chinese, Japanese, Korean)**:
- SimpleTokenizer splits on whitespace/punctuation — this works for Russian (Cyrillic) since Russian uses spaces between words
- **CJK languages are problematic** — Chinese/Japanese don't use spaces, so SimpleTokenizer can't split words properly
- Tantivy itself supports 17 languages via stemmers + CJK via plugins (tantivy-jieba, lindera), but **Convex does not expose these** — only SimpleTokenizer is available
- **No stemming** for any language in Convex's implementation

**Practical assessment for Russian**: Should work fine for basic keyword search. "привет мир" would tokenize to ["привет", "мир"] and match correctly. No stemming means "шаблон" won't match "шаблоны" (different word forms), but prefix search on last term helps.

**Workaround for better multilingual support**: Store a `searchText` field with manually added variants/stems, or use client-side filtering on top of broad queries.

## Relevance Ranking

- BM25 scoring + proximity of matches + number of exact matches
- Relevance order is subject to change (Convex may improve algorithm)
- No way to customize ranking or boost fields

## Sources

- [Full Text Search | Convex Developer Hub](https://docs.convex.dev/search/text-search)
- [Full-text search: Convex can do that](https://www.convex.dev/can-do/search)
- [Tantivy GitHub](https://github.com/quickwit-oss/tantivy)
- [Tantivy Language Support Issue #137](https://github.com/tantivy-search/tantivy/issues/137)
