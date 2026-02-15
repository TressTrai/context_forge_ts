import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { requireAuth, getOptionalUserId, canAccessTemplate, canAccessWorkflow } from "./lib/auth"
import { marketplaceTypeValidator } from "./lib/validators"

const SEED_CATEGORIES = [
  { slug: "game-design", label: "Game Design", position: 0 },
  { slug: "project-management", label: "Project Management", position: 1 },
  { slug: "writing", label: "Writing", position: 2 },
  { slug: "coding", label: "Coding", position: 3 },
  { slug: "research", label: "Research", position: 4 },
  { slug: "business", label: "Business", position: 5 },
  { slug: "education", label: "Education", position: 6 },
  { slug: "other", label: "Other", position: 7 },
]

// Seed categories (idempotent — skips if already seeded)
export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("marketplaceCategories").first()
    if (existing) return { seeded: false, message: "Categories already exist" }
    for (const cat of SEED_CATEGORIES) {
      await ctx.db.insert("marketplaceCategories", cat)
    }
    return { seeded: true, message: `Seeded ${SEED_CATEGORIES.length} categories` }
  },
})

// List categories ordered by position
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("marketplaceCategories").withIndex("by_position").collect()
  },
})

// --- Publish ---

export const publishTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const hasAccess = await canAccessTemplate(ctx, args.templateId)
    if (!hasAccess) throw new Error("Template not found or access denied")
    const template = await ctx.db.get(args.templateId)
    if (!template) throw new Error("Template not found")

    const category = await ctx.db
      .query("marketplaceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.category))
      .unique()
    if (!category) throw new Error("Invalid category")

    const user = await ctx.db.get(userId)
    const authorName = user?.email?.split("@")[0] ?? "Anonymous"

    const templateBlocks = template.blocks.map((b) => ({
      content: b.content,
      type: b.type,
      zone: b.zone,
      position: b.position,
      metadata: b.metadata,
    }))

    const now = Date.now()
    const searchText = `${args.name} ${args.description} ${category.label}`

    const marketplaceId = await ctx.db.insert("marketplace", {
      authorId: userId,
      authorName,
      type: "template",
      name: args.name,
      description: args.description,
      category: args.category,
      templateBlocks,
      importCount: 0,
      searchText,
      publishedAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(args.templateId, {
      publishedMarketplaceId: marketplaceId,
      updatedAt: now,
    })

    return marketplaceId
  },
})

export const publishWorkflow = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const hasAccess = await canAccessWorkflow(ctx, args.workflowId)
    if (!hasAccess) throw new Error("Workflow not found or access denied")
    const workflow = await ctx.db.get(args.workflowId)
    if (!workflow) throw new Error("Workflow not found")

    const category = await ctx.db
      .query("marketplaceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.category))
      .unique()
    if (!category) throw new Error("Invalid category")

    const user = await ctx.db.get(userId)
    const authorName = user?.email?.split("@")[0] ?? "Anonymous"

    const workflowSteps = workflow.steps.map((s) => ({
      name: s.name,
      description: s.description,
      carryForwardZones: s.carryForwardZones,
    }))

    const now = Date.now()
    const searchText = `${args.name} ${args.description} ${category.label}`

    const marketplaceId = await ctx.db.insert("marketplace", {
      authorId: userId,
      authorName,
      type: "workflow",
      name: args.name,
      description: args.description,
      category: args.category,
      workflowSteps,
      importCount: 0,
      searchText,
      publishedAt: now,
      updatedAt: now,
    })

    // Store template blocks in separate documents (avoids 1 MiB limit)
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      if (step.templateId) {
        const template = await ctx.db.get(step.templateId)
        if (template) {
          await ctx.db.insert("marketplaceBlocks", {
            marketplaceId,
            stepIndex: i,
            blocks: template.blocks.map((b) => ({
              content: b.content,
              type: b.type,
              zone: b.zone,
              position: b.position,
              metadata: b.metadata,
            })),
          })
        }
      }
    }

    await ctx.db.patch(args.workflowId, {
      publishedMarketplaceId: marketplaceId,
      updatedAt: now,
    })

    return marketplaceId
  },
})

// --- Update / Unpublish ---

export const update = mutation({
  args: {
    id: v.id("marketplace"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const record = await ctx.db.get(args.id)
    if (!record) throw new Error("Marketplace item not found")
    if (record.authorId !== userId) throw new Error("Not the author")

    const category = await ctx.db
      .query("marketplaceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.category))
      .unique()
    if (!category) throw new Error("Invalid category")

    const updates: Record<string, unknown> = {
      name: args.name,
      description: args.description,
      category: args.category,
      searchText: `${args.name} ${args.description} ${category.label}`,
      updatedAt: Date.now(),
    }

    if (record.type === "template") {
      const templates = await ctx.db.query("templates").withIndex("by_user").collect()
      const source = templates.find((t) => t.publishedMarketplaceId === args.id)
      if (source) {
        updates.templateBlocks = source.blocks.map((b) => ({
          content: b.content, type: b.type, zone: b.zone, position: b.position, metadata: b.metadata,
        }))
      }
    } else {
      const workflows = await ctx.db.query("workflows").withIndex("by_user").collect()
      const source = workflows.find((w) => w.publishedMarketplaceId === args.id)
      if (source) {
        updates.workflowSteps = source.steps.map((s) => ({
          name: s.name, description: s.description, carryForwardZones: s.carryForwardZones,
        }))

        // Delete old marketplaceBlocks and re-create
        const oldBlocks = await ctx.db
          .query("marketplaceBlocks")
          .withIndex("by_marketplace", (q) => q.eq("marketplaceId", args.id))
          .collect()
        for (const ob of oldBlocks) {
          await ctx.db.delete(ob._id)
        }
        for (let i = 0; i < source.steps.length; i++) {
          const step = source.steps[i]
          if (step.templateId) {
            const template = await ctx.db.get(step.templateId)
            if (template) {
              await ctx.db.insert("marketplaceBlocks", {
                marketplaceId: args.id,
                stepIndex: i,
                blocks: template.blocks.map((b) => ({
                  content: b.content, type: b.type, zone: b.zone, position: b.position, metadata: b.metadata,
                })),
              })
            }
          }
        }
      }
    }

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

export const unpublish = mutation({
  args: { id: v.id("marketplace") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const record = await ctx.db.get(args.id)
    if (!record) throw new Error("Marketplace item not found")
    if (record.authorId !== userId) throw new Error("Not the author")

    if (record.type === "template") {
      const templates = await ctx.db.query("templates").withIndex("by_user").collect()
      const source = templates.find((t) => t.publishedMarketplaceId === args.id)
      if (source) {
        await ctx.db.patch(source._id, { publishedMarketplaceId: undefined, updatedAt: Date.now() })
      }
    } else {
      const workflows = await ctx.db.query("workflows").withIndex("by_user").collect()
      const source = workflows.find((w) => w.publishedMarketplaceId === args.id)
      if (source) {
        await ctx.db.patch(source._id, { publishedMarketplaceId: undefined, updatedAt: Date.now() })
      }
    }

    // Delete associated marketplaceBlocks
    const blocks = await ctx.db
      .query("marketplaceBlocks")
      .withIndex("by_marketplace", (q) => q.eq("marketplaceId", args.id))
      .collect()
    for (const b of blocks) {
      await ctx.db.delete(b._id)
    }

    await ctx.db.delete(args.id)
  },
})

// --- Queries ---

export const search = query({
  args: {
    searchTerm: v.optional(v.string()),
    category: v.optional(v.string()),
    type: v.optional(marketplaceTypeValidator),
  },
  handler: async (ctx, args) => {
    if (args.searchTerm && args.searchTerm.trim()) {
      const results = await ctx.db
        .query("marketplace")
        .withSearchIndex("search_marketplace", (q) => {
          let sq = q.search("searchText", args.searchTerm!)
          if (args.category) sq = sq.eq("category", args.category)
          if (args.type) sq = sq.eq("type", args.type)
          return sq
        })
        .take(20)
      return results
    }

    if (args.category) {
      const results = await ctx.db
        .query("marketplace")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(50)
      if (args.type) return results.filter((r) => r.type === args.type)
      return results
    }

    const results = await ctx.db.query("marketplace").order("desc").take(50)
    if (args.type) return results.filter((r) => r.type === args.type)
    return results
  },
})

export const get = query({
  args: { id: v.id("marketplace") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const listByAuthor = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx)
    if (!userId) return []
    return await ctx.db
      .query("marketplace")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .order("desc")
      .collect()
  },
})

// --- Import ---

export const importTemplate = mutation({
  args: { id: v.id("marketplace") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const record = await ctx.db.get(args.id)
    if (!record) throw new Error("Marketplace item not found")
    if (record.type !== "template") throw new Error("Not a template")
    if (!record.templateBlocks) throw new Error("No template content")

    const now = Date.now()
    const templateId = await ctx.db.insert("templates", {
      userId,
      name: record.name,
      description: record.description,
      blocks: record.templateBlocks,
      sourceMarketplaceId: args.id,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(args.id, { importCount: record.importCount + 1 })
    return { templateId }
  },
})

export const importWorkflow = mutation({
  args: { id: v.id("marketplace") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const record = await ctx.db.get(args.id)
    if (!record) throw new Error("Marketplace item not found")
    if (record.type !== "workflow") throw new Error("Not a workflow")
    if (!record.workflowSteps) throw new Error("No workflow content")

    const now = Date.now()
    const stepTemplateMap = new Map<number, Id<"templates">>()

    // Read template blocks from separate table
    const marketplaceBlockDocs = await ctx.db
      .query("marketplaceBlocks")
      .withIndex("by_marketplace", (q) => q.eq("marketplaceId", args.id))
      .collect()

    for (const wt of marketplaceBlockDocs) {
      const stepName = record.workflowSteps[wt.stepIndex]?.name ?? `Step ${wt.stepIndex + 1}`
      const templateId = await ctx.db.insert("templates", {
        userId,
        name: `${record.name} - ${stepName}`,
        blocks: wt.blocks,
        createdAt: now,
        updatedAt: now,
      })
      stepTemplateMap.set(wt.stepIndex, templateId)
    }

    const workflowId = await ctx.db.insert("workflows", {
      userId,
      name: record.name,
      description: record.description,
      steps: record.workflowSteps.map((step, i) => ({
        name: step.name,
        description: step.description,
        carryForwardZones: step.carryForwardZones,
        templateId: stepTemplateMap.get(i),
      })),
      sourceMarketplaceId: args.id,
      createdAt: now,
      updatedAt: now,
    })

    for (const [, templateId] of stepTemplateMap) {
      await ctx.db.patch(templateId, { workflowId })
    }

    await ctx.db.patch(args.id, { importCount: record.importCount + 1 })
    return { workflowId }
  },
})
