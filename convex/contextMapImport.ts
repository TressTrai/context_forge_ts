/**
 * Import a multi-context skill as a project with workflow.
 *
 * When a skill package includes context-map.yaml with multiple contexts,
 * this mutation creates:
 * 1. Skill block + first context's files in the current session
 * 2. Templates for remaining contexts
 * 3. A workflow linking all steps
 * 4. A project wrapping the workflow
 */

import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireSessionAccess, getOptionalUserId } from "./lib/auth"
import { insertSkillBlock, insertReferenceBlock } from "./skills"

const contextArg = v.object({
  key: v.string(),
  label: v.string(),
  permanent: v.array(v.string()),
  stable: v.array(v.string()),
  working: v.array(v.string()),
})

const fileArg = v.object({
  path: v.string(),
  content: v.string(),
})

export const importAsProject = mutation({
  args: {
    sessionId: v.id("sessions"),
    skillName: v.string(),
    skillDescription: v.optional(v.string()),
    skillContent: v.string(),
    contexts: v.array(contextArg),
    files: v.array(fileArg),
    sourceType: v.union(v.literal("local"), v.literal("upload"), v.literal("url")),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSessionAccess(ctx, args.sessionId)

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error("Session not found")

    const userId = await getOptionalUserId(ctx)
    const now = Date.now()

    // Build file lookup
    const fileMap = new Map(args.files.map((f) => [f.path, f.content]))

    const firstContext = args.contexts[0]
    if (!firstContext) throw new Error("No contexts provided")

    // 1. Insert skill block into current session
    await insertSkillBlock(ctx, {
      sessionId: args.sessionId,
      content: args.skillContent,
      metadata: {
        skillName: args.skillName,
        skillDescription: args.skillDescription,
        sourceType: args.sourceType,
        sourceRef: args.sourceRef,
      },
    })

    // 2. Import first context's files into current session
    await importContextFiles(ctx, {
      sessionId: args.sessionId,
      context: firstContext,
      fileMap,
      skillName: args.skillName,
      sourceType: args.sourceType,
    })

    // 3. Create templates for contexts 2..N
    const templateIds: string[] = []
    for (let i = 1; i < args.contexts.length; i++) {
      const context = args.contexts[i]
      const blocks = buildTemplateBlocks(context, fileMap, args.skillName, args.sourceType)

      const templateId = await ctx.db.insert("templates", {
        userId: userId ?? undefined,
        name: context.label,
        description: `Step ${i + 1}: ${context.label}`,
        blocks,
        createdAt: now,
        updatedAt: now,
      })
      templateIds.push(templateId)
    }

    // 4. Create workflow
    const steps = args.contexts.map((context, i) => ({
      templateId: i === 0 ? undefined : (templateIds[i - 1] as any),
      name: context.label,
      description: undefined as string | undefined,
      // PERMANENT + WORKING carry forward; STABLE resets per step
      carryForwardZones: ["PERMANENT", "WORKING"] as ("PERMANENT" | "STABLE" | "WORKING")[],
    }))

    const workflowId = await ctx.db.insert("workflows", {
      userId: userId ?? undefined,
      name: `${args.skillName} Workflow`,
      description: args.skillDescription,
      steps,
      createdAt: now,
      updatedAt: now,
    })

    // 5. Create project
    const projectId = await ctx.db.insert("projects", {
      userId: userId ?? undefined,
      name: args.skillName,
      description: args.skillDescription,
      workflowId,
      currentStep: 0,
      createdAt: now,
      updatedAt: now,
    })

    // 6. Link current session to project
    await ctx.db.patch(args.sessionId, {
      projectId,
      stepNumber: 0,
      updatedAt: now,
    })

    return { projectId, workflowId, templateCount: templateIds.length }
  },
})

/**
 * Import a context's files into a session as reference blocks.
 */
async function importContextFiles(
  ctx: any,
  args: {
    sessionId: any
    context: { permanent: string[]; stable: string[]; working: string[] }
    fileMap: Map<string, string>
    skillName: string
    sourceType: string
  }
) {
  const zones = [
    { zone: "PERMANENT" as const, files: args.context.permanent },
    { zone: "STABLE" as const, files: args.context.stable },
    { zone: "WORKING" as const, files: args.context.working },
  ]

  for (const { zone, files } of zones) {
    for (const filePath of files) {
      const content = args.fileMap.get(filePath)
      if (!content) continue
      const filename = filePath.split("/").pop() || filePath

      await insertReferenceBlock(ctx, {
        sessionId: args.sessionId,
        content,
        filename,
        zone,
        relativePath: filePath,
        parentSkillName: args.skillName,
        sourceType: args.sourceType as "local" | "upload" | "url",
      })
    }
  }
}

/**
 * Build template block snapshots from a context's file assignments.
 */
function buildTemplateBlocks(
  context: { permanent: string[]; stable: string[]; working: string[] },
  fileMap: Map<string, string>,
  skillName: string,
  sourceType: string
) {
  const blocks: Array<{
    content: string
    type: string
    zone: "PERMANENT" | "STABLE" | "WORKING"
    position: number
    metadata?: {
      skillName: string
      parentSkillName: string
      sourceType: "local" | "upload" | "url"
      sourceRef: string
    }
  }> = []

  const zones = [
    { zone: "PERMANENT" as const, files: context.permanent },
    { zone: "STABLE" as const, files: context.stable },
    { zone: "WORKING" as const, files: context.working },
  ]

  let position = 0
  for (const { zone, files } of zones) {
    for (const filePath of files) {
      const content = fileMap.get(filePath)
      if (!content) continue
      const filename = filePath.split("/").pop() || filePath

      blocks.push({
        content,
        type: "reference",
        zone,
        position: position++,
        metadata: {
          skillName: filename,
          parentSkillName: skillName,
          sourceType: sourceType as "local" | "upload" | "url",
          sourceRef: filePath,
        },
      })
    }
  }

  return blocks
}
