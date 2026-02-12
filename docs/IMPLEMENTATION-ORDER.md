# Implementation Order & Triage

## Overview

Prioritized implementation order for ContextForgeTS tasks and bugs based on:
- **Impact**: User-facing severity, data loss potential
- **Dependencies**: Tasks that unblock others
- **Effort**: Estimated complexity
- **User Value**: Direct improvement to user experience

---

## Task Inventory

### Documented Items

| ID | Type | Name | Priority | Effort | Status |
|----|------|------|----------|--------|--------|
| BUG-001 | Bug | Drag-drop reordering | Low | Medium | Speculative |
| BUG-002 | Bug | Brainstorm input blocked | High | Low | ✅ **Completed** |
| BUG-003 | Bug | Test connection before save | Low | Low | Documented |
| BUG-004 | Bug | Save dropdown positioning | Medium | Low | ✅ **Completed** |
| TASK-001 | Feature | Public templates & workflows | Low | High | Documented |
| TASK-002 | Feature | Delete confirmation dialogs | **Critical** | Low | ✅ **Completed** |
| TASK-003 | Feature | Session deletion | Medium | Low | Documented |
| TASK-004 | Feature | Block editor improvements | High | Medium | ⚡ **Partial** (PR #1) |
| TASK-005 | Feature | Block title extraction | Medium | Low | Documented |
| TASK-006 | Feature | Zone move from editor | Medium | Low | Documented |
| TASK-007 | Feature | Keyboard shortcuts system | Low | High | Documented |
| TASK-008 | Feature | Brainstorm input sizing | Medium | Low | ✅ **Completed** |
| TASK-009 | Feature | Unsaved brainstorm warning | High | Medium | ✅ **Completed** |
| TASK-010 | Feature | Compression system | Medium | High | ✅ **Completed** |
| TASK-011 | Design | Interface design enhancement | Low | High | Documented |
| TASK-012 | Feature | SKILL.md import system | **High** | Medium | Designed |

### Design Documents (Not Implementation Tasks)

| ID | Name | Purpose |
|----|------|---------|
| DESIGN-brainstorm-questioning | Brainstorm questioning modes | Future feature design |
| DESIGN-compression-system | Compression architecture | Reference for TASK-010 |
| DESIGN-block-type-usage | Block type documentation | User guidance |
| DESIGN-skill-import | SKILL.md import system | Design for TASK-012 |

### Pending Bug Report Items (23-29)

| Item | Issue | Type | Priority | Status |
|------|-------|------|----------|--------|
| 23 | Export individual notes | Feature | Low | Pending |
| 24 | Individual note MD export | Feature | Low | Pending |
| 25 | AI asking questions | Feature | Low | Pending |
| 26 | Quote/highlight for feedback | Feature | Medium | Pending |
| 27 | Cascading document changes | Feature | Low | Pending |
| 28 | Add button not disabled | Bug | High | ✅ **Completed** |
| 29 | Generator missing OpenRouter | Bug | Medium | Pending |

---

## Priority Definitions

| Level | Criteria |
|-------|----------|
| **Critical** | Data loss, blocking user workflows, production broken |
| **High** | Significantly impacts usability, common user friction |
| **Medium** | Improves experience, requested by users |
| **Low** | Nice to have, future enhancements |

---

## Recommended Implementation Order

### Sprint 1: Critical Fixes (Data Loss & Blocking Issues)

These must be fixed first — they cause data loss or block core functionality.

| Order | Task | Rationale | Effort |
|-------|------|-----------|--------|
| **1.1** | TASK-002: Delete confirmation dialogs | Prevents accidental data deletion | Low |
| **1.2** | BUG-002: Brainstorm input blocked | Users can't use brainstorm without workaround | Low |
| **1.3** | Item 28: Add button not disabled (debounce) | Prevents duplicate block creation | Low |
| **1.4** | TASK-009: Unsaved brainstorm warning | Prevents conversation data loss | Medium |

**Sprint 1 Total Effort**: Low-Medium (~2-3 days)

---

### Sprint 2: Core Usability Fixes

Fix the most frustrating UX issues reported by users.

| Order | Task | Rationale | Effort |
|-------|------|-----------|--------|
| **2.1** | BUG-001: Drag-drop reordering | Core feature "doesn't work at all" | Medium |
| **2.2** | TASK-004: Block editor improvements | ⚡ Partially done (PR #1: markdown view, edit toggle, larger textarea). Remaining: split-pane, keyboard shortcuts, full-height | Medium |
| **2.3** | BUG-004: Save dropdown positioning | Easy fix, improves save UX | Low |
| **2.4** | TASK-008: Brainstorm input sizing | Quick win, part of TASK-004 scope | Low |

**Sprint 2 Total Effort**: Medium (~3-4 days)

---

### Sprint 3: SKILL.md Import System

SKILL.md compatibility for the growing Agent Skills ecosystem. No dependencies on Sprint 2 bugs — can start immediately after Sprint 2. Design: [2026-02-11-skill-import-design.md](./plans/2026-02-11-skill-import-design.md)

| Order | Task | Rationale | Effort |
|-------|------|-----------|--------|
| **3.1** | TASK-012a: Schema + parser | Add `skill` block type, metadata field, SKILL.md parser (zero deps) | Low |
| **3.2** | TASK-012b: Convex mutation + Node action | `skills.importSkill` mutation, local folder scan action (feature-flagged) | Low |
| **3.3** | TASK-012c: Client-side handlers | File upload (.md/.zip) and URL import with client-side parsing | Medium |
| **3.4** | TASK-012d: UI — import modal + skill block card | "Import Skill" in Add Block menu, skill block rendering with name/icon/provenance | Medium |

**Sprint 3 Total Effort**: Medium (~3-5 days)

---

### Sprint 4: Feature Completeness

Fill gaps in existing features.

| Order | Task | Rationale | Effort |
|-------|------|-----------|--------|
| **4.1** | Item 29: Generator missing OpenRouter | Feature parity between Generate and Brainstorm | Low |
| **4.2** | TASK-005: Block title extraction | Improves block identification | Low |
| **4.3** | TASK-006: Zone move from editor | Workflow improvement | Low |
| **4.4** | TASK-003: Session deletion | Users need to manage sessions | Low |
| **4.5** | BUG-003: Test connection before save | Better settings UX | Low |

**Sprint 4 Total Effort**: Low-Medium (~2-3 days)

---

### Sprint 5: Major Features

Significant new functionality.

| Order | Task | Rationale | Effort |
|-------|------|-----------|--------|
| **5.1** | TASK-010: Compression system | Token management for large sessions | High |
| **5.2** | Item 26: Quote/highlight feedback | Improves brainstorm iteration | Medium |

**Sprint 5 Total Effort**: High (~5-7 days)

---

### Sprint 6: Polish & Design

Visual and interaction improvements.

| Order | Task | Rationale | Effort |
|-------|------|-----------|--------|
| **6.1** | TASK-011: Interface design enhancement | Phases 1-4 (tokens, surfaces, typography, spacing) | Medium |
| **6.2** | TASK-007: Keyboard shortcuts system | Power user productivity | High |

**Sprint 6 Total Effort**: High (~5-7 days)

---

### Backlog (Low Priority / Future)

Not scheduled — implement when time permits or user demand increases.

| Task | Rationale for Deferral |
|------|----------------------|
| TASK-001: Public templates | Nice to have, not blocking |
| Item 23/24: Export individual notes | Low demand, workaround exists |
| Item 25: AI asking questions | Vague requirement |
| Item 27: Cascading changes | Major feature, needs design |
| DESIGN-brainstorm-questioning | Future feature, not critical |

---

## Dependencies

```
TASK-002 (Confirm dialogs)
    ↓
TASK-003 (Session deletion) — needs confirm dialog

TASK-004 (Editor improvements)
    ↓
TASK-008 (Input sizing) — subset of TASK-004

BUG-002 (Input blocked) — standalone, no deps

TASK-010 (Compression)
    ↓
TASK-011 (Design) Phase 5 — block card badges for compression

TASK-012 (Skill import) — standalone, no deps on open bugs
    ↓
TASK-012a (Schema + parser) → TASK-012b (Convex) → TASK-012c (Client) → TASK-012d (UI)
    Internal ordering: sequential (schema first, UI last)
```

---

## Quick Wins (< 1 hour each)

These can be done opportunistically:

1. **BUG-002**: Brainstorm input blocked — likely state initialization fix
2. **BUG-004**: Save dropdown — swap to Radix DropdownMenu
3. **Item 28**: Add button disabled — add loading state
4. **TASK-008**: Input sizing — CSS adjustment

---

## High-Risk Items

Tasks requiring careful implementation:

| Task | Risk | Mitigation |
|------|------|-----------|
| BUG-001: Drag-drop | Complex interaction, may have edge cases | Thorough testing |
| TASK-010: Compression | LLM integration, data transformation | Phase incrementally |
| TASK-011: Design | Many file changes, visual regression | Per-phase review |
| TASK-012: Skill import | Schema change, Convex runtime constraints | Parser is zero-dep pure function; keep mutations dependency-free |

---

## Summary

### Current Priorities
1. ~~TASK-002: Delete confirmation dialogs~~ ✅
2. ~~BUG-002: Brainstorm input blocked~~ ✅
3. ~~Item 28: Add button disabled~~ ✅
4. ~~TASK-009: Unsaved brainstorm warning~~ ✅

### Next Up: Sprint 2 (Core Usability)
5. BUG-001: Drag-drop reordering
6. TASK-004: Block editor improvements (remaining)
7. BUG-004: Save dropdown positioning
8. TASK-008: Brainstorm input sizing

### Then: Sprint 3 (SKILL.md Import)
9. TASK-012: SKILL.md import system (schema → parser → handlers → UI)

### Total Documented Work
- **4 Bugs** documented (BUG-001 to BUG-004)
- **12 Tasks** documented (TASK-001 to TASK-012)
- **2 Pending bugs** from report (Items 28, 29)
- **5 Pending features** from report (Items 23-27)

---

## Tracking

Update this section as work progresses:

| Task | Started | Completed | Notes |
|------|---------|-----------|-------|
| Items 11, 12 | - | ✅ | Fixed with vercel.json |
| **Sprint 1** | 2026-02-01 | ✅ 2026-02-01 | **All tasks completed** |
| TASK-002 | 2026-02-01 | ✅ | Delete confirmations with ConfirmDialog + useConfirmDelete |
| BUG-002 | 2026-02-01 | ✅ | Brainstorm input - optimistic health checks |
| Item 28 | 2026-02-01 | ✅ | Button debouncing (300-500ms) on all critical actions |
| TASK-009 | 2026-02-01 | ✅ | Unsaved brainstorm warnings (close/navigate/refresh) |
| TASK-010 | 2026-01-30 | ✅ | Compression system with multi-provider support |
| TASK-004 | 2026-02-11 | ⚡ Partial | PR #1: markdown rendering, view/edit toggle, larger textarea. Remaining: split-pane, keyboard shortcuts |
| | | | |
