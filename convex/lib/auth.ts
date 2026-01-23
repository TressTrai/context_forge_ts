/**
 * Auth helper functions for access control
 */
import { QueryCtx, MutationCtx } from "../_generated/server"
import { Id } from "../_generated/dataModel"
import { getAuthUserId } from "../auth"

/**
 * Get the authenticated user ID or null if not authenticated.
 * Use this for queries that should show different data based on auth status.
 */
export async function getOptionalUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx)
}

/**
 * Require authentication and return the user ID.
 * Throws if the user is not authenticated.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error("Unauthorized: You must be logged in to perform this action")
  }
  return userId
}

/**
 * Check if a session belongs to the current user.
 * Returns true if the session has no userId (legacy data) or belongs to the current user.
 */
export async function canAccessSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">
): Promise<boolean> {
  const userId = await getOptionalUserId(ctx)
  const session = await ctx.db.get(sessionId)

  if (!session) {
    return false
  }

  // Allow access to sessions without userId (legacy/unauthenticated data)
  if (!session.userId) {
    return true
  }

  // Require matching userId for owned sessions
  return session.userId === userId
}

/**
 * Require access to a session, throwing if not permitted.
 */
export async function requireSessionAccess(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">
): Promise<void> {
  const hasAccess = await canAccessSession(ctx, sessionId)
  if (!hasAccess) {
    throw new Error("Unauthorized: You do not have access to this session")
  }
}

/**
 * Check if a template belongs to the current user.
 */
export async function canAccessTemplate(
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"templates">
): Promise<boolean> {
  const userId = await getOptionalUserId(ctx)
  const template = await ctx.db.get(templateId)

  if (!template) {
    return false
  }

  // Allow access to templates without userId (legacy/unauthenticated data)
  if (!template.userId) {
    return true
  }

  return template.userId === userId
}

/**
 * Check if a project belongs to the current user.
 */
export async function canAccessProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">
): Promise<boolean> {
  const userId = await getOptionalUserId(ctx)
  const project = await ctx.db.get(projectId)

  if (!project) {
    return false
  }

  if (!project.userId) {
    return true
  }

  return project.userId === userId
}

/**
 * Check if a workflow belongs to the current user.
 */
export async function canAccessWorkflow(
  ctx: QueryCtx | MutationCtx,
  workflowId: Id<"workflows">
): Promise<boolean> {
  const userId = await getOptionalUserId(ctx)
  const workflow = await ctx.db.get(workflowId)

  if (!workflow) {
    return false
  }

  if (!workflow.userId) {
    return true
  }

  return workflow.userId === userId
}
