/**
 * Export data queries for skill packages.
 *
 * Returns raw session/block data. Client-side hook handles
 * title extraction, SKILL.md generation, and ZIP packaging.
 */

import { query } from "./_generated/server"
import { v } from "convex/values"
import { canAccessSession, getOptionalUserId } from "./lib/auth"

const blockShape = (b: {
  _id: any
  content: string
  type: string
  zone: string
  position: number
  metadata?: any
}) => ({
  _id: b._id,
  content: b.content,
  type: b.type,
  zone: b.zone,
  position: b.position,
  metadata: b.metadata,
})

const zoneOrder: Record<string, number> = { PERMANENT: 0, STABLE: 1, WORKING: 2 }

function sortBlocks<T extends { zone: string; position: number }>(blocks: T[]): T[] {
  return blocks.sort((a, b) => {
    const za = zoneOrder[a.zone] ?? 1
    const zb = zoneOrder[b.zone] ?? 1
    if (za !== zb) return za - zb
    return a.position - b.position
  })
}

export const getExportData = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const hasAccess = await canAccessSession(ctx, args.sessionId)
    if (!hasAccess) return null

    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_session_zone", (q) => q.eq("sessionId", args.sessionId))
      .collect()

    sortBlocks(blocks)

    return {
      session: {
        _id: session._id,
        name: session.name,
        projectId: session.projectId,
        stepNumber: session.stepNumber,
      },
      blocks: blocks.map(blockShape),
    }
  },
})

/**
 * Get export data for an entire project (all workflow steps).
 * Returns sessions sorted by stepNumber with their blocks.
 */
export const getProjectExportData = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)
    if (!project) return null

    // Auth check: verify user owns this project
    const userId = await getOptionalUserId(ctx)
    if (project.userId && project.userId !== userId) return null

    const workflow = project.workflowId
      ? await ctx.db.get(project.workflowId)
      : null

    // Get all sessions belonging to this project
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()

    // Sort by stepNumber
    sessions.sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0))

    // Get blocks for each session
    const steps = await Promise.all(
      sessions.map(async (session) => {
        const blocks = await ctx.db
          .query("blocks")
          .withIndex("by_session_zone", (q) =>
            q.eq("sessionId", session._id)
          )
          .collect()

        sortBlocks(blocks)

        return {
          session: {
            _id: session._id,
            name: session.name,
            stepNumber: session.stepNumber ?? 0,
          },
          blocks: blocks.map(blockShape),
        }
      })
    )

    return {
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
      },
      workflow: workflow
        ? {
            _id: workflow._id,
            name: workflow.name,
            steps: workflow.steps.map((s) => ({
              name: s.name,
              carryForwardZones: s.carryForwardZones,
            })),
          }
        : null,
      steps,
    }
  },
})
