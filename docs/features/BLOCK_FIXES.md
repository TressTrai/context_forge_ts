# Block System Fixes

This document describes four related fixes in the block system: duplicate detection ("Link?"), safe session deletion, and reference block indexing.

---

## 1. contentHash — foundation for duplicate detection

### Problem

The `findDuplicate` function in `convex/blocks.ts` searches for blocks with identical content in the user's other sessions and offers to create a reference ("Link?") instead of an independent copy. The search uses the `contentHash` field (a DJB2 hash of the block's text).

However, `contentHash` was not being set in most block creation paths:

| File | Path |
|---|---|
| `convex/generations.ts` | `saveBrainstormMessage` — blocks saved from Brainstorm |
| `convex/sessions.ts` | Template application, WORKING block copies in `goToNextStep` |
| `convex/workflows.ts` | `startProject`, `advanceStep` — template blocks and WORKING copies |
| `convex/projects.ts` | Template application when creating a session |
| `convex/templates.ts` | Template application |

Without `contentHash`, the lookup against the `by_content_hash` index always returned `null` — "Link?" was never shown.

### Fix

Added `computeContentHash(content)` to every block insert in the files listed above:

```ts
await ctx.db.insert("blocks", {
  // ...
  contentHash: computeContentHash(content),
})
```

---

## 2. findDuplicate — user isolation

### Problem

`findDuplicate` used the `by_content_hash` index and returned the first block with a matching hash. It did not verify that the found block belonged to the current user. If two different users happened to have blocks with the same hash, the system could offer to link to another user's block.

### Fix

After retrieving a candidate from the index, ownership is now verified:

```ts
// Load the candidate's session and compare userId
const candidateSession = await ctx.db.get(candidate.sessionId)
if (candidateSession?.userId !== userId) return null
```

Duplicates are only searched within the current user's own sessions.

---

## 3. by_ref_block index — efficient lookup of reference blocks

### Background

When advancing between workflow steps, blocks from the PERMANENT and STABLE zones are not copied independently into the new session — instead they are created as **references** (`refBlockId` points to the original block). This allows edits to propagate across all steps that share the block.

### Problem

When deleting a session, `promoteReferencesForSession` must find all blocks that reference blocks in the deleted session and replace them with real content (so other sessions do not lose their data).

Previously this was done with a full table scan:

```ts
// Before: full scan
const allBlocks = await ctx.db.query("blocks").collect()
const refs = allBlocks.filter(b => b.refBlockId === targetId)
```

This is expensive and slow on a large database.

### Fix

An index was added to `convex/schema.ts`:

```ts
blocks: defineTable({
  // ...
}).index("by_ref_block", ["refBlockId"])
```

`promoteReferencesForSession` now uses this index for a targeted lookup:

```ts
const refs = await ctx.db
  .query("blocks")
  .withIndex("by_ref_block", (q) => q.eq("refBlockId", blockId))
  .collect()
```

---

## 4. cascadeDeleteSessions — fixing the 16MB error

### Problem

When a session (or a project containing multiple sessions) is deleted, `cascadeDeleteSessions` removes all associated records from the `blocks`, `snapshots`, and `generations` tables.

The old implementation loaded **all** records from each table into memory within a single mutation:

```ts
// Before: three full table scans
const allBlocks = await ctx.db.query("blocks").collect()
const allSnapshots = await ctx.db.query("snapshots").collect()
const allGenerations = await ctx.db.query("generations").collect()
// then filtered in memory
```

Convex limits the amount of data that can be read in a single mutation to 16MB. On a sufficiently large database this caused the error:

```
Uncaught Error: Too many bytes read in a single function execution
```

### Fix

Replaced the global `.collect()` calls with per-session queries using the `by_session` index:

```ts
// After: only records for the target session
for (const sessionId of sessionIds) {
  const blocks = await ctx.db
    .query("blocks")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect()
  // delete them
}
```

Only the records belonging to the sessions being deleted are loaded into memory, not the entire table.
